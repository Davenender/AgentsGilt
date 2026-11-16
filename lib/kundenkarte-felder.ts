// Kundenkarte: Knöpfe statt Notion (Etappe 4, 16.11.2026, Davids Wunsch). Reine Logik ohne Netz:
// tests/kundenkarte-felder.test.ts. Die Knöpfe stehen in lib/kundenablauf.ts, die Handler in lib/kunden-handlers.ts.
import type { EmbedLike } from "./discord-calls.ts";

/** Die Checkliste: Notion-Name und kurzer Name für die Auswahl in Discord. */
export const CHECKLISTE = [
  ["Angebot raus", "Angebot raus"],
  ["Vertrag unterschrieben", "Vertrag"],
  ["AVV unterschrieben", "AVV"],
  ["Anzahlung erhalten", "Anzahlung"],
  ["Material erhalten", "Material"],
  ["Abnahme erfolgt", "Abnahme"],
  ["Live / Übergeben", "Live"],
] as const;

export type KartenStand = { checkliste: Record<string, boolean>; live: boolean };
export const LEERER_STAND: KartenStand = { checkliste: {}, live: false };

/** Stand der Checkliste aus der Karte (Feld „Checkliste“, Zeilen „✅ …“ oder „⬜ …“). */
export function standAusKarte(e: EmbedLike | null | undefined): KartenStand {
  const zeilen = (e?.fields?.find((f) => f.name === "Checkliste")?.value ?? "").split("\n");
  const checkliste: Record<string, boolean> = {};
  for (const [name] of CHECKLISTE) checkliste[name] = zeilen.some((z) => z.trim() === `✅ ${name}`);
  return { checkliste, live: checkliste["Live / Übergeben"] === true };
}

/** Notion-Eigenschaften für die Auswahl: alle sieben, die gewählten an. */
export function checklisteProps(gewaehlt: string[]): Record<string, { checkbox: boolean }> {
  const props: Record<string, { checkbox: boolean }> = {};
  for (const [name] of CHECKLISTE) props[name] = { checkbox: gewaehlt.includes(name) };
  return props;
}

const iso = (j: number, m: number, t: number) => `${j}-${String(m).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
const gibtEs = (j: number, m: number, t: number) => {
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
};

/**
 * Datum aus „TT.MM.JJJJ“, „TT.MM.JJ“ oder „TT.MM.“ (dann das nächste passende Jahr). null bei Unsinn
 * oder einem Tag in der Vergangenheit. heute als „JJJJ-MM-TT“ (deutsche Zeit).
 */
export function leseDatum(s: string, heute: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})?$/);
  if (!m) return null;
  const tag = Number(m[1]);
  const monat = Number(m[2]);
  const jahrHeute = Number(heute.slice(0, 4));
  if (m[3]) {
    const jahr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (!gibtEs(jahr, monat, tag)) return null;
    const d = iso(jahr, monat, tag);
    return d >= heute ? d : null;
  }
  for (const jahr of [jahrHeute, jahrHeute + 1]) {
    if (gibtEs(jahr, monat, tag) && iso(jahr, monat, tag) >= heute) return iso(jahr, monat, tag);
  }
  return null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** E-Mail und Telefon prüfen (eins von beiden reicht). Leere Felder bleiben in Notion unverändert. */
export function pruefeKontakt(email: string, telefon: string): { ok: true; props: Record<string, unknown> } | { ok: false; grund: string } {
  const e = email.trim().toLowerCase();
  const t = telefon.trim();
  if (!e && !t) return { ok: false, grund: "Bitte E-Mail oder Telefon angeben." };
  if (e && !EMAIL.test(e)) return { ok: false, grund: "Die E-Mail-Adresse sieht nicht richtig aus." };
  if (t && (!/^[+\d][\d\s/()-]*$/.test(t) || t.replace(/\D/g, "").length < 6)) return { ok: false, grund: "Die Telefonnummer sieht nicht richtig aus." };
  return { ok: true, props: { ...(e ? { "E-Mail": { email: e } } : {}), ...(t ? { Telefon: { phone_number: t } } : {}) } };
}

/** „⭐⭐⭐ 3“ usw., wie die Notion-Optionen. */
export const sterneName = (n: number) => `${"⭐".repeat(n)} ${n}`;

export function feedbackProps(sterne: 1 | 2 | 3 | 4 | 5 | null, referenz: boolean | null): Record<string, unknown> {
  return {
    ...(sterne ? { Zufriedenheit: { select: { name: sterneName(sterne) } } } : {}),
    ...(referenz === null ? {} : { "Referenz erlaubt": { checkbox: referenz } }),
  };
}
