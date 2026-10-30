import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { kundeSagtZu, kundeWuenscht } from "@/lib/termin-antwort";
import { ladeVorschlag } from "@/lib/termin-kunde";

export const runtime = "nodejs";

// Antwort des Kunden auf einen Terminvorschlag (Seite agentsgilt.com/t/...):
// entweder "Passt" oder ein anderer Wunsch. Das Ergebnis wird in die
// Discord-Meldung geschrieben, damit das Team es dort sieht und weitermacht.

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

  if (body.action === "accept") {
    const r = await kundeSagtZu(v);
    return r.ok ? NextResponse.json({ ok: true, termin: r.termin }) : NextResponse.json({ error: r.fehler }, { status: r.status });
  }

  if (body.action === "wish") {
    const r = await kundeWuenscht(v, String(body.datum ?? ""), String(body.uhrzeit ?? ""));
    return r.ok ? NextResponse.json({ ok: true, termin: r.termin }) : NextResponse.json({ error: r.fehler }, { status: r.status });
  }

  return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
}
