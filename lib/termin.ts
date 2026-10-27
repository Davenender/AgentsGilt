import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Hilfen für den Termin-Ablauf nach einem Anruf: Datum und Uhrzeit lesen,
// hübsch ausgeben, Handynummern erkennen und den kurzen Link für Kunden
// erzeugen und prüfen.

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export interface Termin {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Heutiges Datum in Berlin (Server laufen in UTC). */
export function berlinNow(now = new Date()): Termin {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function weekday(t: Pick<Termin, "year" | "month" | "day">): number {
  return new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay();
}

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Liest "28.10.", "28.10.2026", "28.10.26" oder "2026-10-28" (so liefert es
 * das Datumsfeld im Browser). Ohne Jahr gilt das nächste passende Datum.
 */
export function parseDatum(
  raw: string,
  now = berlinNow(),
): Pick<Termin, "year" | "month" | "day"> | null {
  const s = raw.trim();

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return isRealDate(y, m, d) ? { year: y, month: m, day: d } : null;
  }

  const de = s.match(/^(\d{1,2})\.\s?(\d{1,2})\.?(?:\s?(\d{2}|\d{4}))?$/);
  if (!de) return null;
  const d = Number(de[1]);
  const m = Number(de[2]);
  let y = de[3] ? Number(de[3]) : now.year;
  if (de[3] && de[3].length === 2) y += 2000;
  if (!isRealDate(y, m, d)) return null;

  if (!de[3]) {
    const heute = Date.UTC(now.year, now.month - 1, now.day);
    if (Date.UTC(y, m - 1, d) < heute) y += 1;
    if (!isRealDate(y, m, d)) return null;
  }
  return { year: y, month: m, day: d };
}

/** Liest "10:00", "10.30", "10 30", "1030", "10", "10 Uhr" oder "10 Uhr 15". */
export function parseUhrzeit(raw: string): { hour: number; minute: number } | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const m =
    s.match(/^(\d{1,2})\s?uhr\s?(\d{1,2})$/) ??
    s.match(/^(\d{1,2})(?:[:. ]?(\d{2}))?\s?(?:uhr)?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Termine gibt es nur werktags, Beginn zwischen 9 und 17 Uhr, nicht in der Vergangenheit. */
export function pruefeTermin(t: Termin, now = berlinNow()): string | null {
  const wd = weekday(t);
  if (wd === 0 || wd === 6) return "Das ist ein Wochenende. Termine gibt es nur werktags.";
  if (t.hour < 9 || t.hour > 17 || (t.hour === 17 && t.minute > 0)) {
    return "Termine beginnen zwischen 9:00 und 17:00 Uhr.";
  }
  const key = (x: Termin) =>
    ((x.year * 100 + x.month) * 100 + x.day) * 10000 + x.hour * 100 + x.minute;
  if (key(t) <= key(now)) return "Dieser Zeitpunkt liegt in der Vergangenheit.";
  return null;
}

/** "Mi, 28.10., 10:00 Uhr" – so steht der Termin in SMS und Discord. */
export function formatTermin(t: Termin): string {
  return `${WOCHENTAGE[weekday(t)]}, ${pad(t.day)}.${pad(t.month)}., ${pad(t.hour)}:${pad(t.minute)} Uhr`;
}

/** Datum und Uhrzeit als Text aus zwei Eingaben (Discord-Fenster, Kundenseite). */
export function terminAusEingabe(
  datum: string,
  uhrzeit: string,
): { ok: true; termin: Termin; text: string } | { ok: false; fehler: string } {
  const d = parseDatum(datum);
  if (!d) return { ok: false, fehler: "Das Datum habe ich nicht verstanden. Bitte so: 28.10. oder 28.10.2026." };
  const u = parseUhrzeit(uhrzeit);
  if (!u) return { ok: false, fehler: "Die Uhrzeit habe ich nicht verstanden. Bitte so: 10:00." };
  const termin: Termin = { ...d, ...u };
  const fehler = pruefeTermin(termin);
  if (fehler) return { ok: false, fehler };
  return { ok: true, termin, text: formatTermin(termin) };
}

// ---------------------------------------------------------------- Rufnummern

/** Macht aus "0171 1234567", "+49 171 ..." oder "0049..." eine Nummer im Format +49171.... */
export function toE164(raw: string): string | null {
  let s = raw.replace(/\(0\)/g, "").replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("0")) s = `+49${s.slice(1)}`;
  else if (!s.startsWith("+") && s.startsWith("49")) s = `+${s}`;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

/** Deutsche Handynummern beginnen mit +4915, +4916 oder +4917. */
export function isGermanMobile(e164: string): boolean {
  return /^\+491[567]\d{8,9}$/.test(e164);
}

// ---------------------------------------------------------------------- Link

const SITE = "https://agentsgilt.com";

/**
 * Schlüssel für die Prüfsumme im Link. Eigene Variable LINK_SECRET, wenn
 * gesetzt; sonst abgeleitet aus dem Bot-Token, das ohnehin geheim bei Vercel
 * liegt. Wird das Bot-Token erneuert, werden alte Links ungültig.
 */
export function linkSecret(): string | null {
  if (process.env.LINK_SECRET) return process.env.LINK_SECRET;
  const bot = process.env.DISCORD_BOT_TOKEN;
  return bot ? createHash("sha256").update(`agentsgilt-termin-link:${bot}`).digest("hex") : null;
}

function signatur(messageId: string, secret: string): string {
  return createHmac("sha256", secret).update(`termin:${messageId}`).digest("hex").slice(0, 12);
}

/** Kurzer Link für den Kunden: Nummer der Discord-Meldung plus Prüfsumme. */
export function terminLink(messageId: string, secret: string): string {
  return `${process.env.SITE_URL || SITE}/t/${messageId}-${signatur(messageId, secret)}`;
}

/** Gibt die Nachrichten-Nummer zurück, wenn die Prüfsumme stimmt. */
export function pruefeCode(code: string, secret: string): string | null {
  const m = code.match(/^(\d{5,25})-([0-9a-f]{12})$/);
  if (!m) return null;
  const erwartet = Buffer.from(signatur(m[1], secret));
  const gegeben = Buffer.from(m[2]);
  if (erwartet.length !== gegeben.length) return null;
  return timingSafeEqual(erwartet, gegeben) ? m[1] : null;
}
