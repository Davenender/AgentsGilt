import { createHmac, timingSafeEqual } from "node:crypto";
import { findChannelId, postText } from "@/lib/discord";
import { linkSecret, toE164 } from "@/lib/termin";

// Rufgruppe: Verlangt ein Anrufer beim KI-Assistenten ausdrücklich einen Mitarbeiter,
// holt unser Server den laufenden Anruf bei Twilio aus der Verbindung mit Vapi heraus
// und lässt die Handys des Teams gleichzeitig klingeln. Wer abnimmt, muss zusätzlich
// die 1 drücken (damit weder eine Mailbox noch der iPhone-Anruffilter den Anruf
// "annehmen"). Nimmt niemand an, hört der Anrufer eine Ansage, und der Bot meldet es
// in #anrufe.
//
// Einstellungen (Vercel, Production):
//   RUFGRUPPE_NUMMERN   Handynummern des Teams, durch Komma getrennt
//   RUFGRUPPE_ABSENDER  Nummer, die auf den Handys erscheint (Standard +49 6108 9694027)
//   RUFGRUPPE_ZEITEN    optional, z.B. "Mo-Fr 15:00-20:00; Sa-So 10:00-18:00"
//                       (ohne Angabe: immer)
//   RUFGRUPPE_SEKUNDEN  optional, wie lange es klingelt (Standard 25)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  (wie bei den SMS)

export const ANSAGE =
  "Im Moment ist leider niemand aus unserem Team erreichbar. Bitte rufen Sie später noch einmal an oder sprechen Sie mit unserem KI-Assistenten, der hilft Ihnen auch jetzt gern weiter.";
export const ANNAHME_TEXT = "Anruf von Agents Gilt. Drücken Sie die 1, um das Gespräch anzunehmen.";

const SITE = process.env.SITE_URL || "https://agentsgilt.com";

export function nummern(): string[] {
  return (process.env.RUFGRUPPE_NUMMERN ?? "")
    .split(/[,;\n]/)
    .map((n) => toE164(n.trim()))
    .filter((n): n is string => Boolean(n));
}

export const absender = () => toE164(process.env.RUFGRUPPE_ABSENDER ?? "") ?? "+4961089694027";
export const sekunden = () => Math.min(60, Math.max(10, Number(process.env.RUFGRUPPE_SEKUNDEN) || 25));

// ------------------------------------------------------------------ Schlüssel

/** Die Twilio-Adressen sind öffentlich; dieser Schlüssel in der Adresse hält Fremde fern. */
export function schluessel(): string | null {
  const s = linkSecret();
  return s ? createHmac("sha256", s).update("rufgruppe").digest("hex").slice(0, 24) : null;
}

export function schluesselOk(given: string | null): boolean {
  const k = schluessel();
  if (!k || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(k);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const adresse = (aktion: "ring" | "annahme" | "ende") =>
  `${SITE}/api/rufgruppe?a=${aktion}&k=${schluessel() ?? ""}`;

// ---------------------------------------------------------------- Zeitfenster

const TAGE: Record<string, number> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 7 };

/** Ist jetzt (Berliner Zeit) eine Zeit, zu der durchgestellt werden darf? Ohne Einstellung: immer. */
export function imZeitfenster(jetzt = new Date()): boolean {
  const roh = process.env.RUFGRUPPE_ZEITEN?.trim();
  if (!roh) return true;
  const teile = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(jetzt);
  const wt = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[
    teile.find((p) => p.type === "weekday")?.value ?? ""
  ];
  const min =
    Number(teile.find((p) => p.type === "hour")?.value) * 60 + Number(teile.find((p) => p.type === "minute")?.value);

  for (const block of roh.split(";")) {
    const m = block.trim().match(/^([a-zäöü]{2})(?:\s*-\s*([a-zäöü]{2}))?\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/i);
    if (!m) continue;
    const von = TAGE[m[1].toLowerCase()];
    const bis = TAGE[(m[2] ?? m[1]).toLowerCase()];
    if (!von || !bis || !wt) continue;
    const tagOk = von <= bis ? wt >= von && wt <= bis : wt >= von || wt <= bis;
    const start = Number(m[3]) * 60 + Number(m[4]);
    const ende = Number(m[5]) * 60 + Number(m[6]);
    if (tagOk && min >= start && min < ende) return true;
  }
  return false;
}

// ---------------------------------------------------------------------- TwiML

const xml = (inhalt: string) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inhalt}</Response>`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function twimlKlingeln(): string {
  const ziele = nummern()
    .map((n) => `<Number url="${esc(adresse("annahme"))}" method="POST">${n}</Number>`)
    .join("");
  return xml(
    `<Dial callerId="${absender()}" timeout="${sekunden()}" answerOnBridge="true" action="${esc(adresse("ende"))}" method="POST">${ziele}</Dial>`,
  );
}

/** Läuft auf dem Handy dessen, der abgenommen hat: nur nach Druck auf die 1 wird verbunden. */
export function twimlAnnahme(digits: string | null): string {
  if (digits === "1") return xml(""); // leer = Anruf wird verbunden
  if (digits) return xml("<Hangup/>");
  return xml(
    `<Gather numDigits="1" timeout="8" action="${esc(adresse("annahme"))}" method="POST"><Say language="de-DE" voice="Polly.Vicki">${esc(ANNAHME_TEXT)}</Say></Gather><Hangup/>`,
  );
}

export function twimlEnde(dialStatus: string | null): string {
  if (dialStatus === "completed" || dialStatus === "answered") return xml("<Hangup/>");
  return xml(`<Say language="de-DE" voice="Polly.Vicki">${esc(ANSAGE)}</Say><Hangup/>`);
}

// --------------------------------------------------------------------- Twilio

/** Leitet den laufenden Anruf (weg von Vapi) auf unsere Rufgruppe um. */
export async function leiteUm(callSid: string): Promise<{ ok: true } | { ok: false; grund: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return { ok: false, grund: "Twilio-Zugang fehlt" };
  if (!/^CA[0-9a-f]{32}$/i.test(callSid)) return { ok: false, grund: "Anruf-ID von Twilio fehlt" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls/${callSid}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Url: adresse("ring"), Method: "POST" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
      console.error(`[rufgruppe] Umleiten fehlgeschlagen: HTTP ${res.status}, Code ${err.code ?? "?"}: ${err.message ?? ""}`);
      return { ok: false, grund: `Twilio ${res.status}${err.code ? ` / ${err.code}` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[rufgruppe] Umleiten fehlgeschlagen:", err);
    return { ok: false, grund: "Verbindung zu Twilio fehlgeschlagen" };
  }
}

export async function meldeInDiscord(text: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const kanal = process.env.DISCORD_CHANNEL_ANRUFE || (await findChannelId(token, "anrufe"));
  if (token && kanal) await postText(token, kanal, text);
}
