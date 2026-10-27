import { NextResponse } from "next/server";
import { editMessage, replyTo } from "@/lib/discord";
import {
  callComponents,
  confirmedByCustomer,
  customerWish,
  originalWish,
  OWNER_FIELD,
} from "@/lib/discord-calls";
import { bestaetigeKalender } from "@/lib/google-calendar";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { terminAusEingabe } from "@/lib/termin";
import { ladeVorschlag } from "@/lib/termin-kunde";

export const runtime = "nodejs";

// Antwort des Kunden auf einen Terminvorschlag (Seite agentsgilt.com/t/...):
// entweder "Passt" oder ein anderer Wunsch. Das Ergebnis wird in die
// Discord-Meldung geschrieben, damit das Team es dort sieht und weitermacht.

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export async function POST(request: Request) {
  const limit = rateLimit(`termin:${getClientIp(request)}`, 12, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte rufen Sie uns kurz an." },
      { status: 429 },
    );
  }

  let body: { code?: string; action?: string; datum?: string; uhrzeit?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const v = await ladeVorschlag(String(body.code ?? ""));
  if (!v.ok) {
    return NextResponse.json({ error: "Dieser Link ist ungültig." }, { status: 404 });
  }
  // Nur solange wir auf die Antwort warten. Danach ist der Vorschlag erledigt.
  if (v.state !== "proposed") {
    return NextResponse.json(
      { error: "Dieser Vorschlag ist nicht mehr aktuell. Bitte rufen Sie uns an." },
      { status: 409 },
    );
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ANRUFE;
  const owner = v.embed.fields?.find((f) => f.name === OWNER_FIELD)?.value;
  const wer = owner ? ` (${owner})` : "";
  // Name des Anrufers mit in die Antwort, damit klar ist, zu welchem Anruf sie gehört.
  const anrufer = v.embed.fields?.find((f) => f.name === "Anrufer")?.value;
  const kunde = anrufer ? `Der Kunde ${anrufer}` : "Der Kunde";
  const time = uhrzeit();

  if (body.action === "accept") {
    const kal = await bestaetigeKalender(originalWish(v.embed), v.termin);
    const ok = await editMessage(token, channelId, v.messageId, {
      embeds: [confirmedByCustomer(v.embed, time, kal.text)],
      components: callComponents("confirmed"),
    });
    if (!ok) return NextResponse.json({ error: "Das hat leider nicht geklappt. Bitte rufen Sie uns an." }, { status: 502 });
    await replyTo(token, channelId, v.messageId, `✅ ${kunde} hat den Termin bestätigt: ${v.termin}${wer}`);
    return NextResponse.json({ ok: true, termin: v.termin });
  }

  if (body.action === "wish") {
    const eingabe = terminAusEingabe(String(body.datum ?? ""), String(body.uhrzeit ?? ""));
    if (!eingabe.ok) return NextResponse.json({ error: eingabe.fehler }, { status: 400 });

    const ok = await editMessage(token, channelId, v.messageId, {
      embeds: [customerWish(v.embed, eingabe.text, time)],
      components: callComponents("customer_alt"),
    });
    if (!ok) return NextResponse.json({ error: "Das hat leider nicht geklappt. Bitte rufen Sie uns an." }, { status: 502 });
    await replyTo(token, channelId, v.messageId, `🕒 ${kunde} wünscht stattdessen: ${eingabe.text}${wer}`);
    return NextResponse.json({ ok: true, termin: eingabe.text });
  }

  return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
}
