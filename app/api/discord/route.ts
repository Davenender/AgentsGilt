import { after, NextResponse } from "next/server";
import {
  editInteractionOriginal,
  followupPrivate,
  getMessage,
  verifyDiscordSignature,
} from "@/lib/discord";
import {
  applyAction,
  callComponents,
  CALL_CUSTOM_ID_PREFIX,
  confirmedByUs,
  currentAppointment,
  hasWish,
  originalWish,
  PROPOSAL_MODAL_PREFIX,
  proposalModal,
  proposedByUs,
  resolveMobile,
  stateOf,
  type CallAction,
  type EmbedLike,
} from "@/lib/discord-calls";
import { bestaetigeKalender } from "@/lib/google-calendar";
import { sendSms, smsBestaetigung, smsConfigured, smsVorschlag } from "@/lib/sms";
import { linkSecret, terminAusEingabe, terminLink } from "@/lib/termin";

export const runtime = "nodejs";

// Discord ruft diese Adresse bei jedem Knopfdruck unter einer Anruf-Meldung auf
// und wenn jemand das Fenster für einen Terminvorschlag abschickt.
//
// In Discord eintragen unter developers/applications -> Anwendung ->
// General Information -> "Interactions Endpoint URL":
//   https://agentsgilt.com/api/discord
//
// Env-Vars (Vercel, Production):
//   DISCORD_PUBLIC_KEY        Public Key der Anwendung (prüft, dass der Aufruf von Discord kommt)
//   DISCORD_BOT_TOKEN         Token des Bots
//   DISCORD_CHANNEL_ANRUFE    Kanal-ID von #anrufe
//   LINK_SECRET               optional, Schlüssel für die Links in den SMS (sonst aus dem Bot-Token)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN   für die SMS (sonst wird nichts gesendet)
//
// Wer klicken darf, regelt der Server selbst: Der Bot ist privat und nur auf
// dem eigenen Server, die Knöpfe stehen in einem Kanal, den nur das Team sieht.

interface Interaction {
  type: number;
  id?: string;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: {
    custom_id?: string;
    components?: { components?: { custom_id: string; value?: string }[] }[];
  };
  member?: {
    nick?: string | null;
    user?: { id: string; username?: string; global_name?: string | null };
  };
  message?: { id: string; embeds?: EmbedLike[] };
}

function ephemeral(content: string) {
  // Flag 64 = nur für den sehen, der geklickt hat
  return NextResponse.json({ type: 4, data: { content, flags: 64 } });
}

const DEFERRED_UPDATE = { type: 6 };

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

/**
 * Prüft vor dem Senden alles, was schiefgehen kann, damit der Klick sofort eine
 * verständliche Antwort bekommt. Gibt entweder die Handynummer oder den Fehlertext zurück.
 */
function bereitFuerSms(embed: EmbedLike): { mobile: string } | { fehler: string } {
  if (!smsConfigured()) {
    return { fehler: "Der SMS-Versand ist noch nicht eingerichtet (Twilio-Zugang fehlt bei Vercel)." };
  }
  if (!linkSecret()) {
    return { fehler: "Der Schlüssel für die Links fehlt (DISCORD_BOT_TOKEN bei Vercel)." };
  }
  const { mobile, seen } = resolveMobile(embed);
  if (!mobile) {
    return {
      fehler: seen.length
        ? `Unter ${seen.join(" / ")} geht keine SMS, das ist keine Handynummer. Bitte den Kunden anrufen.`
        : "In der Meldung steht keine Rufnummer. Bitte den Kunden anrufen.",
    };
  }
  return { mobile };
}

export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.error("[discord] DISCORD_PUBLIC_KEY fehlt, Aufruf abgewiesen");
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 500 });
  }

  // Discord verlangt, dass wir die Signatur prüfen. Es testet das sogar
  // absichtlich mit falschen Signaturen, bevor es die Adresse akzeptiert.
  const body = await request.text();
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  if (!verifyDiscordSignature(body, signature, timestamp, publicKey)) {
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 401 });
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  // 1 = PING (Discord prüft damit die Adresse)
  if (interaction.type === 1) return NextResponse.json({ type: 1 });

  // 3 = Klick auf einen Knopf, 5 = abgeschicktes Fenster
  if (interaction.type !== 3 && interaction.type !== 5) return NextResponse.json({ ok: true });

  const user = interaction.member?.user;
  if (!user) return ephemeral("Das geht nur im Server, nicht per Direktnachricht.");
  const who = interaction.member?.nick || user.global_name || user.username || "Unbekannt";
  const customId = interaction.data?.custom_id ?? "";
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = interaction.channel_id ?? process.env.DISCORD_CHANNEL_ANRUFE;

  // ---------------------------------------------------- Fenster abgeschickt
  if (interaction.type === 5) {
    if (!customId.startsWith(PROPOSAL_MODAL_PREFIX)) return NextResponse.json({ ok: true });
    const messageId = customId.slice(PROPOSAL_MODAL_PREFIX.length);

    const values: Record<string, string> = {};
    for (const row of interaction.data?.components ?? []) {
      for (const c of row.components ?? []) values[c.custom_id] = c.value ?? "";
    }
    const eingabe = terminAusEingabe(values.datum ?? "", values.uhrzeit ?? "");
    if (!eingabe.ok) return ephemeral(`${eingabe.fehler} Bitte nochmal auf „Anderen Termin vorschlagen“ klicken.`);

    // Die Nachricht kommt beim Klick mit; sonst holen wir sie über die Nummer im Fenster.
    const embed =
      interaction.message?.embeds?.[0] ??
      (await getMessage(token, channelId, messageId))?.embeds?.[0];
    if (!embed) return ephemeral("Diese Meldung ist nicht mehr aktuell.");
    const state = stateOf(embed);
    if (state === "confirmed" || state === "done") return ephemeral("Dieser Anruf ist schon abgeschlossen.");

    const bereit = bereitFuerSms(embed);
    if ("fehler" in bereit) return ephemeral(bereit.fehler);

    const appId = interaction.application_id;
    const itoken = interaction.token;
    if (!appId || !itoken) return ephemeral("Discord hat keine Antwortadresse mitgeschickt.");

    const link = terminLink(messageId, linkSecret()!);
    const text = smsVorschlag(eingabe.text, link, hasWish(embed));
    const time = uhrzeit();

    after(async () => {
      const res = await sendSms(bereit.mobile, text);
      if (!res.ok) {
        await followupPrivate(appId, itoken, `Die SMS konnte nicht gesendet werden (${res.reason}). Es wurde nichts geändert.`);
        return;
      }
      console.log(`[discord] Terminvorschlag per SMS von ${who}`);
      const updated = proposedByUs(embed, eingabe.text, who, time);
      await editInteractionOriginal(appId, itoken, {
        embeds: [updated],
        components: callComponents("proposed"),
      });
    });
    return NextResponse.json(DEFERRED_UPDATE);
  }

  // -------------------------------------------------------- Knopf geklickt
  if (!customId.startsWith(CALL_CUSTOM_ID_PREFIX) || customId.startsWith(PROPOSAL_MODAL_PREFIX)) {
    return NextResponse.json({ ok: true });
  }
  const action = customId.slice(CALL_CUSTOM_ID_PREFIX.length) as CallAction;
  if (!["claim", "confirm", "propose", "done"].includes(action)) return NextResponse.json({ ok: true });

  const embed = interaction.message?.embeds?.[0];
  const messageId = interaction.message?.id;
  if (!embed || !messageId) return ephemeral("Diese Meldung ist nicht mehr aktuell.");
  const state = stateOf(embed);

  if (action === "claim" || action === "done") {
    const { embed: updated, state: next } = applyAction(embed, action, who, uhrzeit());
    console.log(`[discord] Anruf-Knopf "${action}" von ${who}`);
    // 7 = die bestehende Nachricht aktualisieren
    return NextResponse.json({
      type: 7,
      data: {
        embeds: [updated],
        components: callComponents(next),
        allowed_mentions: { parse: [] },
      },
    });
  }

  if (state === "confirmed" || state === "done") return ephemeral("Dieser Anruf ist schon abgeschlossen.");

  // 9 = Fenster öffnen
  if (action === "propose") {
    return NextResponse.json({ type: 9, data: proposalModal(messageId) });
  }

  // action === "confirm"
  const termin = currentAppointment(embed);
  if (!termin) {
    return ephemeral("In der Meldung steht kein Termin. Bitte über „Anderen Termin vorschlagen“ einen Termin senden.");
  }
  const bereit = bereitFuerSms(embed);
  if ("fehler" in bereit) return ephemeral(bereit.fehler);

  const appId = interaction.application_id;
  const itoken = interaction.token;
  if (!appId || !itoken) return ephemeral("Discord hat keine Antwortadresse mitgeschickt.");
  const time = uhrzeit();

  after(async () => {
    const res = await sendSms(bereit.mobile, smsBestaetigung(termin));
    if (!res.ok) {
      await followupPrivate(appId, itoken, `Die SMS konnte nicht gesendet werden (${res.reason}). Es wurde nichts geändert.`);
      return;
    }
    console.log(`[discord] Termin bestätigt per SMS von ${who}`);
    const kal = await bestaetigeKalender(originalWish(embed), termin);
    await editInteractionOriginal(appId, itoken, {
      embeds: [confirmedByUs(embed, termin, who, time, kal.text)],
      components: callComponents("confirmed"),
    });
  });
  return NextResponse.json(DEFERRED_UPDATE);
}
