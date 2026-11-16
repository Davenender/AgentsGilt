// Der gültige Stand eines Kunden als Discord-Karte (Etappe 6): Titel = KND-Nr., Beschreibung = JSON.
// Rein, ohne Netz (tests/kunden-stand.test.ts). Lesen und Schreiben im Kanal: lib/kunden-stand.ts.
import type { Stand } from "./notion-sperre.ts";

/** Discord erlaubt 4096 Zeichen in der Beschreibung, mit etwas Luft. */
export const STAND_MAX = 4000;

export type StandKarte = { title: string; description: string; color: number; footer: { text: string } };

/**
 * Baut die Karte. Ist der Stand zu lang, fallen die längsten Felder ganz weg (nie gekürzt: ein gekürzter Wert
 * würde beim Zurücksetzen echte Daten überschreiben). Weggelassene Felder sind dann nicht geschützt.
 */
export function standKarte(nr: string, stand: Stand): StandKarte {
  const s: Stand = { ...stand };
  const w: string[] = [];
  const json = () => JSON.stringify({ s, w });
  while (json().length > STAND_MAX && Object.keys(s).length) {
    const laengstes = Object.keys(s).reduce((a, b) => (JSON.stringify(s[b]).length > JSON.stringify(s[a]).length ? b : a));
    delete s[laengstes];
    w.push(laengstes);
  }
  return { title: nr, description: json(), color: 0x6b7280, footer: { text: `Gültiger Stand in Notion · ${Object.keys(s).length} Felder${w.length ? ` · ${w.length} zu lang, nicht geschützt` : ""}` } };
}

/** Liest eine Stand-Karte. null, wenn es keine ist oder das JSON kaputt ist. */
export function leseStandKarte(e: { title?: string; description?: string } | undefined): { nr: string; stand: Stand; weggelassen: string[] } | null {
  const nr = e?.title?.trim() ?? "";
  if (!/^KND-\d+$/.test(nr)) return null;
  try {
    const roh = JSON.parse(e?.description ?? "") as { s?: unknown; w?: unknown };
    if (!roh || typeof roh.s !== "object" || roh.s === null || Array.isArray(roh.s)) return null;
    const stand: Stand = {};
    for (const [k, v] of Object.entries(roh.s as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length === 2 && typeof v[0] === "string") stand[k] = [v[0], v[1]];
    }
    const weggelassen = Array.isArray(roh.w) ? roh.w.filter((x): x is string => typeof x === "string") : [];
    return { nr, stand, weggelassen };
  } catch {
    return null;
  }
}
