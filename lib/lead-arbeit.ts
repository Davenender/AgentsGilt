// Leads „In Arbeit“ (Etappe 3, 16.11.2026, Davids Regeln). Reine Logik: tests/lead-arbeit.test.ts.
// - Reihenfolge Offen → In Arbeit → Kontaktiert („Kontaktiert“ erst nach „In Arbeit“), zurück auf Offen geht immer.
// - Pro Person nur eine Firma gleichzeitig „In Arbeit“ (In Arbeit = sich über die Firma informieren).
// - Liegt ein Lead 2 Tage „In Arbeit“, fragt der Bot im Recherche-Thread einmal nach.

export type LeadSchritt = "open" | "work" | "contacted";

export const kontaktiertErlaubt = (status: string) => status === "In Arbeit" || status === "Kontaktiert";

/** null = erlaubt, sonst der Satz für die private Meldung. */
export function pruefeSchritt(alt: string, neu: LeadSchritt): string | null {
  if (neu === "contacted" && !kontaktiertErlaubt(alt)) return "Erst auf „In Arbeit“ setzen, dann „Kontaktiert“.";
  return null;
}

/** Hat diese Person schon eine andere Firma „In Arbeit“? Dann deren Name, sonst null. */
export function andererInArbeit(
  karten: { id: string; firma: string; besitzer: string | null; status: string }[],
  userId: string,
  eigeneId: string,
): string | null {
  return karten.find((k) => k.id !== eigeneId && k.besitzer === userId && k.status === "In Arbeit")?.firma ?? null;
}

export const NACHHAKEN_MS = 2 * 24 * 60 * 60 * 1000;
export const nachhakenFaellig = (seit: number, jetzt: number, schonGefragt: boolean) =>
  !schonGefragt && seit > 0 && jetzt - seit >= NACHHAKEN_MS;
