import { createHmac, timingSafeEqual } from "node:crypto";
import { findChannelId, postText } from "@/lib/discord";
import { linkSecret, toE164 } from "@/lib/termin";

// Rufgruppe. Ablauf:
//  1. Twilio nimmt jeden Anruf auf +49 6108 9694027 zuerst selbst an (Voice-Adresse
//     /api/rufgruppe?a=eingang) und reicht ihn per SIP an den Vapi-Assistenten weiter.
//     Der Anruf bleibt damit bei uns: Vapi kann ihn nicht auflegen.
//  2. Verlangt der Anrufer ausdrücklich einen Mitarbeiter, ruft der Assistent das
//     Werkzeug "mitarbeiter_verbinden" auf (/api/vapi). Wir leiten den Anruf per
//     Twilio-API auf /api/rufgruppe?a=ring um (die SIP-Verbindung zu Vapi endet dabei).
//  3. Dort klingeln die Handys des Teams gleichzeitig. Wer abnimmt, muss zusätzlich
// die 1 drücken (damit weder eine Mailbox noch der iPhone-Anruffilter den Anruf
// "annehmen"). Nimmt niemand an, hört der Anrufer eine Ansage, und der Bot meldet es
// in #anrufe.
//
// Einstellungen (Vercel, Production):
//   RUFGRUPPE_NUMMERN   Handynummern des Teams, durch Komma getrennt (weitere: RUFGRUPPE_NUMMERN_2)
//   RUFGRUPPE_ABSENDER  Nummer, die auf den Handys erscheint (Standard +49 6108 9694027)
//   RUFGRUPPE_ZEITEN    optional, z.B. "Mo-Fr 15:00-20:00; Sa-So 10:00-18:00"
//                       (ohne Angabe: immer)
//   RUFGRUPPE_SEKUNDEN  optional, wie lange es klingelt (Standard 25)
//   VAPI_SIP_URI        SIP-Adresse des Assistenten bei Vapi (sip:...@sip.vapi.ai)
//   RUFGRUPPE_EINGANG   unsere Nummer, auf der Anrufe ankommen (Standard +49 6108 9694027)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  (wie bei den SMS)

export const ANSAGE =
  "Im Moment ist leider niemand aus unserem Team erreichbar. Bitte rufen Sie später noch einmal an oder sprechen Sie mit unserem KI-Assistenten, der hilft Ihnen auch jetzt gern weiter.";
export const ANNAHME_TEXT = "Anruf von Agents Gilt. Drücken Sie die 1, um das Gespräch anzunehmen.";

const SITE = process.env.SITE_URL || "https://agentsgilt.com";

export function nummern(): string[] {
  // Zweite Variable für weitere Nummern, falls die erste nicht mehr einsehbar ist.
  return `${process.env.RUFGRUPPE_NUMMERN ?? ""},${process.env.RUFGRUPPE_NUMMERN_2 ?? ""}`
    .split(/[,;\n]/)
    .map((n) => toE164(n.trim()))
    .filter((n): n is string => Boolean(n));
}

export const absender = () => toE164(process.env.RUFGRUPPE_ABSENDER ?? "") ?? "+4961089694027";
export const eingangsnummer = () => toE164(process.env.RUFGRUPPE_EINGANG ?? "") ?? "+4961089694027";
export const vapiSip = () => process.env.VAPI_SIP_URI?.trim() || null;
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

export const adresse = (aktion: "ring" | "annahme" | "ende" | "weiter") =>
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

function dialKlingeln(): string {
  const ziele = nummern()
    .map((n) => `<Number url="${esc(adresse("annahme"))}" method="POST">${n}</Number>`)
    .join("");
  return `<Dial callerId="${absender()}" timeout="${sekunden()}" answerOnBridge="true" action="${esc(adresse("ende"))}" method="POST">${ziele}</Dial>`;
}

export const twimlKlingeln = (): string => xml(dialKlingeln());

/** Neuer Anruf: an den Vapi-Assistenten weiterreichen. Ohne SIP-Adresse klingelt gleich das Team. */
export function twimlEingang(): string {
  const sip = vapiSip();
  if (!sip) return twimlKlingeln();
  return xml(
    `<Dial answerOnBridge="true" timeout="40" action="${esc(adresse("weiter"))}" method="POST"><Sip>${esc(sip)}</Sip></Dial>`,
  );
}

/** Der Assistent hat das Gespräch beendet (normal) oder war nicht erreichbar (dann klingelt das Team). */
export function twimlWeiter(dialStatus: string | null): string {
  if (!dialStatus || dialStatus === "completed" || dialStatus === "answered") return xml("<Hangup/>");
  return xml(
    `<Say language="de-DE" voice="Polly.Vicki">Unser Assistent ist gerade nicht erreichbar. Wir verbinden Sie mit unserem Team.</Say>${dialKlingeln()}`,
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

/**
 * Prüft die Signatur, mit der Twilio jeden Aufruf unterschreibt (X-Twilio-Signature):
 * HMAC-SHA1 über Adresse plus alle Formularfelder, geschlüsselt mit dem Auth-Token.
 */
export function twilioSignaturOk(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token || !signature) return false;
  const daten = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const erwartet = createHmac("sha1", token).update(daten, "utf8").digest("base64");
  const a = Buffer.from(erwartet);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type AnrufSuche = { ok: true; sid: string } | { ok: false; grund: string };

const twilioAuth = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  return sid && token ? { sid, header: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` } : null;
};

const ziffern = (n: string | undefined | null) => (n ?? "").replace(/\D/g, "").slice(-9);

/** Sucht den laufenden Anruf des Anrufers (Twilio-Anruf-ID) unter den Anrufen auf unserer Nummer. */
export async function findeAnruf(kunde?: string | null): Promise<AnrufSuche> {
  const auth = twilioAuth();
  if (!auth) return { ok: false, grund: "Twilio-Zugang fehlt" };
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${auth.sid}/Calls.json?To=${encodeURIComponent(eingangsnummer())}&Status=in-progress&PageSize=20`,
      { headers: { Authorization: auth.header }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return { ok: false, grund: `Twilio HTTP ${res.status}` };
    const data = (await res.json()) as { calls?: { sid: string; from?: string; parent_call_sid?: string | null }[] };
    const offen = (data.calls ?? []).filter((c) => !c.parent_call_sid);
    if (offen.length === 0) return { ok: false, grund: "kein laufender Anruf gefunden" };
    const passend = kunde ? offen.find((c) => ziffern(c.from) === ziffern(kunde) && ziffern(kunde)) : undefined;
    if (passend) return { ok: true, sid: passend.sid };
    if (offen.length === 1) return { ok: true, sid: offen[0].sid };
    return { ok: true, sid: offen[0].sid }; // mehrere gleichzeitig und keiner passt: der neueste
  } catch (err) {
    return { ok: false, grund: err instanceof Error ? err.message : "Twilio nicht erreichbar" };
  }
}

/** Holt den laufenden Anruf vom Assistenten weg und lässt die Handys klingeln. */
export async function leiteUm(sid: string): Promise<{ ok: true } | { ok: false; grund: string }> {
  const auth = twilioAuth();
  if (!auth) return { ok: false, grund: "Twilio-Zugang fehlt" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${auth.sid}/Calls/${sid}.json`, {
      method: "POST",
      headers: { Authorization: auth.header, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ Url: adresse("ring"), Method: "POST" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, grund: `Twilio HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, grund: err instanceof Error ? err.message : "Twilio nicht erreichbar" };
  }
}

export async function meldeInDiscord(text: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const kanal = process.env.DISCORD_CHANNEL_ANRUFE || (await findChannelId(token, "anrufe"));
  if (token && kanal) await postText(token, kanal, text);
}
