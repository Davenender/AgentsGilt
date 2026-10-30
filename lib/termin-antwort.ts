import { editMessage, replyTo } from "@/lib/discord";
import {
  callComponents,
  confirmedByCustomer,
  customerWish,
  originalWish,
  ownerId,
  OWNER_FIELD,
} from "@/lib/discord-calls";
import { bestaetigeKalender, pruefeFrei } from "@/lib/google-calendar";
import { terminAusEingabe } from "@/lib/termin";
import type { Vorschlag } from "@/lib/termin-kunde";

// Die Antwort eines Kunden auf einen Terminvorschlag: Zusage oder anderer Wunsch.
// Gleiche Logik für die Seite agentsgilt.com/t/... und für den Telefon-Assistenten.

type Geladen = Extract<Vorschlag, { ok: true }>;
export type Weg = "link" | "telefon";

export type Antwort =
  | { ok: true; termin: string }
  | { ok: false; status: number; fehler: string };

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function wer(v: Geladen) {
  const owner = v.embed.fields?.find((f) => f.name === OWNER_FIELD)?.value;
  const anrufer = v.embed.fields?.find((f) => f.name === "Anrufer")?.value;
  return {
    bearbeiter: owner ? ` (${owner})` : "",
    kunde: anrufer ? `Der Kunde ${anrufer}` : "Der Kunde",
  };
}

export async function kundeSagtZu(v: Geladen, weg: Weg): Promise<Antwort> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ANRUFE;
  const { bearbeiter, kunde } = wer(v);

  const kal = await bestaetigeKalender(originalWish(v.embed), v.termin, {
    messageId: v.messageId,
    ownerId: ownerId(v.embed),
  });
  const ok = await editMessage(token, channelId, v.messageId, {
    embeds: [confirmedByCustomer(v.embed, uhrzeit(), kal.text, weg === "telefon" ? "per Anruf" : undefined)],
    components: callComponents("confirmed"),
  });
  if (!ok) return { ok: false, status: 502, fehler: "Das hat leider nicht geklappt. Bitte rufen Sie uns an." };
  const wo = weg === "telefon" ? " am Telefon" : "";
  await replyTo(token, channelId, v.messageId, `✅ ${kunde} hat den Termin${wo} bestätigt: ${v.termin}${bearbeiter}`);
  return { ok: true, termin: v.termin };
}

export async function kundeWuenscht(v: Geladen, datum: string, zeit: string, weg: Weg): Promise<Antwort> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ANRUFE;
  const { bearbeiter, kunde } = wer(v);

  const eingabe = terminAusEingabe(datum, zeit);
  if (!eingabe.ok) return { ok: false, status: 400, fehler: eingabe.fehler };

  // Gleich sagen, wenn der Wunsch schon vergeben ist (ohne zu verraten, wer dort einen Termin hat).
  const frei = await pruefeFrei(eingabe.text, originalWish(v.embed));
  if (frei.belegt) {
    return { ok: false, status: 409, fehler: "Zu dieser Zeit sind wir leider nicht frei. Bitte wählen Sie eine andere Zeit." };
  }

  const ok = await editMessage(token, channelId, v.messageId, {
    embeds: [customerWish(v.embed, eingabe.text, uhrzeit(), weg === "telefon" ? "per Anruf" : undefined)],
    components: callComponents("customer_alt", Boolean(ownerId(v.embed))),
  });
  if (!ok) return { ok: false, status: 502, fehler: "Das hat leider nicht geklappt. Bitte rufen Sie uns an." };
  const wo = weg === "telefon" ? " am Telefon" : "";
  await replyTo(token, channelId, v.messageId, `🕒 ${kunde} wünscht${wo} stattdessen: ${eingabe.text}${bearbeiter}`);
  return { ok: true, termin: eingabe.text };
}
