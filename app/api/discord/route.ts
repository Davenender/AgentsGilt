import { NextResponse } from "next/server";
import { createThread, verifyDiscordSignature } from "@/lib/discord";
import {
  applyAction,
  callComponents,
  CALL_CUSTOM_ID_PREFIX,
  parseAllowedIds,
  type CallAction,
  type EmbedLike,
} from "@/lib/discord-calls";

export const runtime = "nodejs";

// Discord ruft diese Adresse bei jedem Knopfdruck unter einer Anruf-Meldung auf.
//
// In Discord eintragen unter developers/applications -> Anwendung ->
// General Information -> "Interactions Endpoint URL":
//   https://agentsgilt.com/api/discord
//
// Env-Vars (Vercel, Production):
//   DISCORD_PUBLIC_KEY        Public Key der Anwendung (prüft, dass der Aufruf von Discord kommt)
//   DISCORD_BOT_TOKEN         Token des Bots (legt Fäden an)
//   DISCORD_ALLOWED_USER_IDS  Discord-Nutzer-IDs, die Anrufe übernehmen dürfen, kommagetrennt

interface Interaction {
  type: number;
  id?: string;
  channel_id?: string;
  data?: { custom_id?: string };
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

  // 3 = Klick auf einen Knopf
  if (interaction.type !== 3) return NextResponse.json({ ok: true });

  const customId = interaction.data?.custom_id ?? "";
  if (!customId.startsWith(CALL_CUSTOM_ID_PREFIX)) return NextResponse.json({ ok: true });
  const action = customId.slice(CALL_CUSTOM_ID_PREFIX.length) as CallAction;
  if (!["claim", "nodate", "done"].includes(action)) return NextResponse.json({ ok: true });

  const user = interaction.member?.user;
  if (!user) return ephemeral("Das geht nur im Server, nicht per Direktnachricht.");

  const allowed = parseAllowedIds(process.env.DISCORD_ALLOWED_USER_IDS);
  if (!allowed.has(user.id)) {
    return ephemeral("Anrufe übernehmen dürfen nur die Kolleginnen und Kollegen im Kundenkontakt.");
  }

  const embed = interaction.message?.embeds?.[0];
  if (!embed) return ephemeral("Diese Meldung ist nicht mehr aktuell.");

  const who =
    interaction.member?.nick || user.global_name || user.username || "Unbekannt";
  const time = new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  const { embed: updated, state } = applyAction(embed, action, who, time);

  // Bei "Termin nicht möglich" gleich einen Faden aufmachen, in dem der neue
  // Termin abgesprochen wird. Scheitert das, bleibt der Statuswechsel trotzdem.
  if (action === "nodate" && interaction.channel_id && interaction.message?.id) {
    const anrufer = embed.fields?.find((f) => f.name === "Anrufer")?.value;
    await createThread(
      process.env.DISCORD_BOT_TOKEN,
      interaction.channel_id,
      interaction.message.id,
      `Neuer Termin${anrufer ? `: ${anrufer}` : ""}`,
    );
  }

  console.log(`[discord] Anruf-Knopf "${action}" von ${who}`);

  // 7 = die bestehende Nachricht aktualisieren
  return NextResponse.json({
    type: 7,
    data: {
      embeds: [updated],
      components: callComponents(state),
      allowed_mentions: { parse: [] },
    },
  });
}
