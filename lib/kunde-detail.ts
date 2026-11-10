// Kundendetails für den Baukasten (Plan 3A, Etappe 2) über die Helfer-Brücke: GET /api/helfer?bereich=kunde&nr=KND-003.
// Nur lesen. Branche, Ansprechpartner und Adresse stehen nicht als Notion-Eigenschaften, sondern als Zeilen
// („Branche: …“) im Seitentext, den die Lead-Analyse schreibt. Fehlt etwas, bleibt es null – nichts wird erfunden.
import { bloeckeAlsText, type RohBlock } from "./gespraech.ts";
import type { KundeKurz } from "./notion-api.ts";
import { kanalName } from "./notion-kunden.ts";

export const MAX_SEITENTEXT = 20_000;

export interface KundeDetail {
  nr: string;
  name: string;
  status: string | null;
  website: string | null;
  demoStatus: string | null;
  demoLink: string | null;
  notionUrl: string | null;
  kanal: string;
  branche: string | null;
  ansprechpartner: string | null;
  adresse: string | null;
  ort: string | null;
  seitentext: string | null;
}

/** Nur echte Kundennummern (KND- und mindestens drei Ziffern), sonst nichts – auch keine angehängten Zeichen. */
export function pruefeKundenNr(nr: string | null | undefined): nr is string {
  return typeof nr === "string" && /^KND-\d{3,}$/.test(nr);
}

/** Website aus dem Feld „Domain / Anbieter“ (z. B. „relax-fit.de bei IONOS“ → https://relax-fit.de). */
export function alsWebsite(text?: string | null): string | null {
  const m = (text ?? "").match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s]*)?/i);
  return m ? `https://${m[1].toLowerCase()}` : null;
}

/** Ort hinter der Postleitzahl: „Hauptstraße 1, 63179 Obertshausen“ → „Obertshausen“. */
export function ortAusAdresse(adresse: string | null | undefined): string | null {
  const m = (adresse ?? "").match(/\b\d{5}\s+([^,\n]+)/);
  return m ? m[1].trim() : null;
}

function zeileMit(text: string, schluessel: string): string | null {
  const m = text.match(new RegExp(`^\\s*(?:[-•]\\s*)?${schluessel}:\\s*(.+)$`, "mi"));
  const wert = m?.[1].trim();
  return wert && !/^nicht gefunden$/i.test(wert) ? wert : null;
}

export function kundeAusSeite(k: KundeKurz, bloecke: RohBlock[] | null): KundeDetail {
  const text = bloecke ? bloeckeAlsText(bloecke) : null;
  const adresse = text ? zeileMit(text, "Adresse") : null;
  return {
    nr: k.nr,
    name: k.name,
    status: k.status || null,
    website: alsWebsite(k.domain),
    demoStatus: k.demoStatus ?? null,
    demoLink: k.demoLink ?? null,
    notionUrl: k.notionUrl ?? null,
    kanal: kanalName(k.nr),
    branche: text ? zeileMit(text, "Branche") : null,
    ansprechpartner: text ? zeileMit(text, "Ansprechpartner") : null,
    adresse,
    ort: ortAusAdresse(adresse),
    seitentext: text === null ? null : text.slice(0, MAX_SEITENTEXT),
  };
}
