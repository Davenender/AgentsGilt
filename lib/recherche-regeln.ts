// Recherche-Mappe (Etappe 3, 16.11.2026): Regeln ohne Netz. Tests: tests/recherche-regeln.test.ts.
// Google-Bewertungen gehören zur Stufe „Place Details Enterprise + Atmosphere“: 1.000 Abrufe im Monat sind
// kostenlos (geprüft am 16.11.2026), danach 25 $ je 1.000. Wir bleiben mit höchstens 500 sicher darunter.

export const BEWERTUNGEN_MAX = 500;
export const bewertungenErlaubt = (zaehler: number) => zaehler < BEWERTUNGEN_MAX;

/** „JJJJ-MM“ nach deutscher Zeit: Der Zähler beginnt jeden Monat neu. */
export function monatSchluessel(d: Date): string {
  const teile = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).formatToParts(d);
  const jahr = teile.find((t) => t.type === "year")?.value ?? "0000";
  const monat = teile.find((t) => t.type === "month")?.value ?? "00";
  return `${jahr}-${monat}`;
}

const PRAEFIX = "bewertungen";
export const zaehlerZeile = (monat: string, n: number) => `${PRAEFIX}|${monat}|${n}`;

export function leseZaehler(zeilen: string[], monat: string): number {
  for (const z of zeilen) {
    const [p, m, n] = z.split("|");
    if (p === PRAEFIX && m === monat) return Number.isInteger(Number(n)) ? Number(n) : 0;
  }
  return 0;
}
