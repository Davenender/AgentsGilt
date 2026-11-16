// Finanzen A2 (16.11.2026, Davids Wunsch): Einnahmen von selbst in Notion „Rechnungen“, Stripe-Gebühren in „Ausgaben“,
// beides mit dem Finanzjahr verknüpft. Überweisungen trägt David über eine Karte in #posteingang ein.
// Reine Logik ohne Netz: tests/finanzen.test.ts. Notion und Stripe: lib/finanzen.ts.
import type { EmbedLike } from "./discord-calls.ts";

export type Zahlungsart = "Stripe" | "Überweisung" | "Bar";
export type Einnahme = {
  betragCent: number;
  /** Tag der Zahlung, JJJJ-MM-TT */
  datum: string;
  rechnungsNr: string;
  typ: string;
  zahlungsart: Zahlungsart;
  kundeSeite: string | null;
  jahrSeite: string | null;
  gebuehrCent: number | null;
  link: string | null;
  /** Enthält bei Stripe die Ereignis-Kennung (gegen doppeltes Buchen) */
  notiz: string;
};

const euro = (cent: number) => Math.round(cent) / 100;
const text = (s: string) => [{ type: "text", text: { content: s.slice(0, 2000) } }];

/** Die Nummer der Stripe-Rechnung, sonst „ST-JJJJMMTT-xxxxxx“ (Ende der Zahlungskennung). */
export function rechnungsNummer(stripeNr: string | null, datum: string, zahlungId: string | null): string {
  if (stripeNr?.trim()) return stripeNr.trim();
  const tag = `ST-${datum.replace(/-/g, "")}`;
  return zahlungId ? `${tag}-${zahlungId.slice(-6)}` : tag;
}

/** Abo = Retainer; erste Zahlung (Status vorher Lead oder Angebot gesendet) = Anzahlung; danach Schlussrechnung. */
export function typFuer(abo: boolean, statusVorher: string | null | undefined): string {
  if (abo) return "Retainer";
  if (!statusVorher) return "Sonstiges";
  return statusVorher === "Lead" || statusVorher === "Angebot gesendet" ? "Anzahlung" : "Schlussrechnung";
}

/** Notion-Eigenschaften für eine Zeile in „Rechnungen“. Unbekanntes bleibt weg. */
export function einnahmeProps(e: Einnahme): Record<string, unknown> {
  return {
    "Rechnungsnr.": { title: text(e.rechnungsNr) },
    "Betrag (€)": { number: euro(e.betragCent) },
    Rechnungsdatum: { date: { start: e.datum } },
    "Bezahlt am": { date: { start: e.datum } },
    Typ: { select: { name: e.typ } },
    Zahlungsart: { select: { name: e.zahlungsart } },
    ...(e.kundeSeite ? { Kunde: { relation: [{ id: e.kundeSeite }] } } : {}),
    ...(e.jahrSeite ? { Finanzjahr: { relation: [{ id: e.jahrSeite }] } } : {}),
    ...(e.gebuehrCent !== null ? { "Stripe-Gebühr (€)": { number: euro(e.gebuehrCent) } } : {}),
    ...(e.link ? { Stripe: { url: e.link } } : {}),
    ...(e.notiz ? { Notiz: { rich_text: text(e.notiz) } } : {}),
  };
}

/** Notion-Eigenschaften für die Stripe-Gebühr in „Ausgaben“ (Zahlungsdienst, kein Reverse Charge). */
export function gebuehrProps(g: { betragCent: number; datum: string; wofuer: string; link: string | null; jahrSeite: string | null }): Record<string, unknown> {
  return {
    Was: { title: text(`Stripe-Gebühr · ${g.wofuer}`) },
    Anbieter: { select: { name: "Stripe" } },
    "Betrag (€)": { number: euro(g.betragCent) },
    "Betrag original": { number: euro(g.betragCent) },
    Währung: { select: { name: "EUR" } },
    Datum: { date: { start: g.datum } },
    Kategorie: { select: { name: "Gebühren" } },
    Monatlich: { checkbox: false },
    "Reverse Charge": { checkbox: false },
    ...(g.link ? { "Beleg-Link": { url: g.link } } : {}),
    Notiz: { rich_text: text("automatisch aus Stripe") },
    ...(g.jahrSeite ? { Finanzjahr: { relation: [{ id: g.jahrSeite }] } } : {}),
  };
}

/** Tag eines Unix-Zeitstempels nach deutscher Zeit, JJJJ-MM-TT. */
export const datumAusUnix = (sek: number) => new Date(sek * 1000).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });

/** „1.500,00“, „1500“, „12,5“, „750 €“ → Cent. null bei Unsinn, 0 oder weniger. */
export function leseBetrag(s: string): number | null {
  const t = s.replace(/€|eur/gi, "").replace(/\s/g, "");
  let zahl: number | null = null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) zahl = Number(t.replace(/\./g, "").replace(",", "."));
  else if (/^\d+(,\d{1,2})?$/.test(t)) zahl = Number(t.replace(",", "."));
  else if (/^\d+\.\d{1,2}$/.test(t)) zahl = Number(t);
  return zahl !== null && Number.isFinite(zahl) && zahl > 0 ? Math.round(zahl * 100) : null;
}

/** Tag der Überweisung: leer = heute, „TT.MM.JJJJ“, „TT.MM.JJ“ oder „TT.MM.“ (dieses Jahr). Nie in der Zukunft. */
export function leseZahltag(s: string, heute: string): string | null {
  const t = s.trim();
  if (!t) return heute;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?$/);
  if (!m) return null;
  const jahr = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : Number(heute.slice(0, 4));
  const d = new Date(Date.UTC(jahr, Number(m[2]) - 1, Number(m[1])));
  if (d.getUTCFullYear() !== jahr || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[1])) return null;
  const iso = d.toISOString().slice(0, 10);
  return iso <= heute ? iso : null;
}

export const betragText = (cent: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);

// ------------------------------------------------------------ Karte in #posteingang (Überweisung)

const TITEL = /^💶 (KND-\d+) · (.+): Anzahlung abgehakt$/;

/** Hakt jemand „Anzahlung“ ab, fragt diese Karte David nach dem Betrag (nur bei Überweisung nötig). */
export function anzahlungKarte(k: { nr: string; name: string; kanalId: string | null; notionUrl: string | null }): EmbedLike & { color: number } {
  return {
    title: `💶 ${k.nr} · ${k.name}: Anzahlung abgehakt`,
    description: "Kam das Geld per Überweisung? Dann trag den Betrag ein, er landet in Notion unter „Rechnungen“. Zahlungen über Stripe trägt der Bot von selbst ein.",
    color: 0x22c55e,
    fields: [
      ...(k.kanalId ? [{ name: "Kunde", value: `<#${k.kanalId}>`, inline: true }] : []),
      ...(k.notionUrl ? [{ name: "Notion", value: `[Kundenseite](${k.notionUrl})`, inline: true }] : []),
    ],
    footer: { text: `Finanzen · ${k.nr}` },
  };
}

export function leseAnzahlungKarte(e: EmbedLike | undefined | null): { nr: string; name: string; notionUrl: string | null; erledigt: boolean } | null {
  const m = e?.title?.match(TITEL);
  if (!m) return null;
  const notionUrl = e?.fields?.find((f) => f.name === "Notion")?.value.match(/\((https:\/\/[^)\s]+)\)/)?.[1] ?? null;
  return { nr: m[1], name: m[2], notionUrl, erledigt: Boolean(e?.fields?.some((f) => f.name === "Erledigt")) };
}
