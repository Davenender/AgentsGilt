// Leads „In Arbeit“ (Etappe 3, 16.11.2026, Davids Regeln). Reine Logik: tests/lead-arbeit.test.ts.
// - Reihenfolge Offen → In Arbeit → Kontaktiert („Kontaktiert“ erst nach „In Arbeit“), zurück auf Offen geht immer.
// - Pro Person nur eine Firma gleichzeitig „In Arbeit“ (In Arbeit = sich über die Firma informieren).
// - Liegt ein Lead 2 Tage „In Arbeit“, fragt der Bot im Recherche-Thread einmal nach.

import type { EmbedLike } from "./discord-calls.ts";

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

// ------------------------------------------------------------------ Recherche-Thread (Task 3.3)

export const F_RECHERCHE = "🔎 Recherche";

/** Trägt den Recherche-Thread auf der Lead-Karte ein (ein Feld, ersetzt ein altes). */
export function mitRecherche(e: EmbedLike, threadId: string): EmbedLike {
  const fields = (e.fields ?? []).filter((f) => f.name !== F_RECHERCHE);
  return { ...e, fields: [...fields, { name: F_RECHERCHE, value: `<#${threadId}>`, inline: false }] };
}

export const ohneRecherche = (e: EmbedLike): EmbedLike => ({ ...e, fields: (e.fields ?? []).filter((f) => f.name !== F_RECHERCHE) });

export const rechercheThread = (e: EmbedLike | null | undefined): string | null =>
  e?.fields?.find((f) => f.name === F_RECHERCHE)?.value.match(/<#(\d+)>/)?.[1] ?? null;

/** Fragen im Thread, die noch keine Antwort haben: Nachrichten von Menschen nach der letzten des Bots (älteste zuerst). */
export function offeneFragen(nachrichten: { id: string; autorId: string; bot: boolean; text: string }[], botId: string): { id: string; text: string }[] {
  let letzteBot = -1;
  nachrichten.forEach((n, i) => {
    if (n.bot || n.autorId === botId) letzteBot = i;
  });
  return nachrichten
    .slice(letzteBot + 1)
    .filter((n) => !n.bot && n.autorId !== botId && n.text.trim())
    .map((n) => ({ id: n.id, text: n.text.trim() }));
}

const NACHHAK = "Wie weit bist du mit";
export const nachhakText = (firma: string, besitzer: string) =>
  `<@${besitzer}> ${NACHHAK} **${firma}**? Setz den Lead auf Kontaktiert oder Offen.`;
export const schonNachgehakt = (texte: string[]) => texte.some((t) => t.includes(NACHHAK));
