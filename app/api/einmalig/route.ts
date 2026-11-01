import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { absender } from "@/lib/rufgruppe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: ruft David an und spielt denselben Satz mit verschiedenen Twilio-Stimmen vor. Nach Gebrauch wieder löschen.
const KEY_HASH = "db188ae14dc83affc396970bcbc8ddda0a75170b5d3ba3dbc2e998901e060c21";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}

const SATZ = "Guten Tag, hier ist Agents Gilt. Sie haben uns wegen Ihres Termins zurückgerufen. Wir rufen Sie jetzt sofort an, damit wir Ihren Termin mit Ihnen bestätigen können.";
const STIMMEN: [string, string][] = [
  ["Polly.Vicki-Neural", "eins, Polly Vicki Neural"],
  ["Polly.Daniel-Neural", "zwei, Polly Daniel Neural, eine männliche Stimme"],
  ["Polly.Vicki-Generative", "drei, Polly Vicki Generative"],
  ["Google.de-DE-Chirp3-HD-Aoede", "vier, Google Aoede, weiblich"],
  ["Google.de-DE-Chirp3-HD-Charon", "fünf, Google Charon, männlich"],
];

function twiml(): string {
  const teile = STIMMEN.map(
    ([stimme, name]) =>
      `<Say language="de-DE" voice="${stimme}">Stimme ${name}.</Say><Pause length="1"/><Say language="de-DE" voice="${stimme}">${SATZ}</Say><Pause length="2"/>`,
  ).join("");
  return `<Response><Say language="de-DE" voice="Polly.Vicki">Hallo, das ist der Stimmen-Test. Ich spiele fünf Stimmen vor.</Say><Pause length="1"/>${teile}<Say language="de-DE" voice="Polly.Vicki">Das war es. Vielen Dank.</Say><Hangup/></Response>`;
}

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const { nummer } = (await request.json()) as { nummer: string };
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return NextResponse.json({ error: "Twilio fehlt" }, { status: 500 });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: nummer, From: absender(), Twiml: twiml() }),
  });
  const body = (await res.json().catch(() => ({}))) as { sid?: string; status?: string; message?: string; code?: number };
  return NextResponse.json({ status: res.status, sid: body.sid, callStatus: body.status, fehler: body.message, code: body.code });
}
