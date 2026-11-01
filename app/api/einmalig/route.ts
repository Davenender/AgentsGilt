import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { absender } from "@/lib/rufgruppe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: ruft David an und spielt Aussprache-Varianten von "Agents Gilt" vor. Nach Gebrauch wieder löschen.
const KEY_HASH = "ace6bd61deb8cf69a1936aedb905125d05a1f469fbe4033f4075db94f94884b2";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}

const say = (inhalt: string) => `<Say language="de-DE" voice="Polly.Vicki">${inhalt}</Say><Pause length="2"/>`;
const satz = (name: string) => `Hier ist ${name}. Wir rufen Sie gleich zurück, damit wir Ihren Termin bestätigen können.`;

function twiml(): string {
  const runde =
    say(`Variante null, so klingt es heute. ${satz("Agents Gilt")}`) +
    say(`Variante eins. ${satz('<sub alias="Ejdschents Gilt">Agents Gilt</sub>')}`) +
    say(`Variante zwei. ${satz('<sub alias="Äidschents Gilt">Agents Gilt</sub>')}`) +
    say(`Variante drei. ${satz('<phoneme alphabet="ipa" ph="ˈeɪdʒənts">Agents</phoneme> Gilt')}`);
  return `<Response>${say("Hallo, das ist der Aussprache-Test. Ich spiele vier Varianten vor, dann noch einmal alle.")}${runde}${say("Und jetzt alle noch einmal.")}${runde}${say("Das war es. Vielen Dank.")}<Hangup/></Response>`;
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
