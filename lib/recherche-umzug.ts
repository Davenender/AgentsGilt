// Recherche-Thread bei Statuswechseln (16.11.2026, Davids Wunsch):
// - Zurück auf „Offen“: Thread einklappen (nicht löschen, die Mappe hat Zeit und KI-Geld gekostet).
// - Wieder „In Arbeit“: derselbe Thread geht auf; ist die Mappe älter als 30 Tage, baut der Takt eine neue.
// - „Lead aktiv“: Mappe und Fragen/Antworten kommen auf die Notion-Seite und als gesperrter Thread „🔎 Recherche“
//   in den Kundenkanal (Discord kann Threads nicht verschieben, und der Original-Thread ist privat).
// Reine Regeln, ohne Netz: tests/recherche-umzug.test.ts. Netz: lib/recherche-handlers.ts.
import type { EmbedLike } from "./discord-calls.ts";
import { F_RECHERCHE, rechercheThread, schonNachgehakt } from "./lead-arbeit.ts";
import { zeitAusId } from "./team-takt-regeln.ts";

export const PLATZHALTER = "Ich stelle dir die Mappe zusammen";
export const FEHLVERSUCH = "⚠️ Die Mappe hat diesmal nicht geklappt";
export const MAPPE_TAGE = 30;
export const NEUE_MAPPE = `🔄 Die Mappe ist älter als ${MAPPE_TAGE} Tage`;

export const mappeVeraltet = (mappeId: string | null, jetzt: number) =>
  !mappeId || jetzt - zeitAusId(mappeId) >= MAPPE_TAGE * 24 * 60 * 60 * 1000;

/** Nachrichten in zeitlicher Reihenfolge. Zählt nur, was nach dem letzten Neuaufbau-Hinweis kam. */
export function aktuelleMappe(msgs: { id: string; mappe: boolean; text: string }[]): { mappeId: string | null; fehlversuche: number } {
  let ab = 0;
  msgs.forEach((m, i) => {
    if (m.text.startsWith(NEUE_MAPPE)) ab = i + 1;
  });
  const rest = msgs.slice(ab);
  const mappen = rest.filter((m) => m.mappe);
  return { mappeId: mappen.at(-1)?.id ?? null, fehlversuche: rest.filter((m) => m.text.startsWith(FEHLVERSUCH)).length };
}

const istHinweis = (t: string) =>
  t.includes(PLATZHALTER) || t.startsWith(FEHLVERSUCH) || t.startsWith(NEUE_MAPPE) || t.startsWith("👥") || schonNachgehakt([t]);

/** Fragen und Antworten aus dem Thread (zeitliche Reihenfolge), ohne die Hinweise des Bots. */
export function verlaufZeilen(msgs: { bot: boolean; name: string; text: string }[]): string[] {
  return msgs
    .map((m) => ({ ...m, text: m.text.trim() }))
    .filter((m) => m.text && !(m.bot && istHinweis(m.text)))
    .map((m) => `${m.name}: ${m.text}`);
}

/** Zeilen zu Nachrichten von höchstens `max` Zeichen zusammenfassen (zu lange Zeilen werden geteilt). */
export function teileText(zeilen: string[], max = 1900): string[] {
  const out: string[] = [];
  let akt = "";
  for (const z of zeilen.flatMap((z) => (z.length > max ? z.match(new RegExp(`[\\s\\S]{1,${max}}`, "g")) ?? [] : [z]))) {
    if (akt && akt.length + 1 + z.length > max) {
      out.push(akt);
      akt = z;
    } else akt = akt ? `${akt}\n${z}` : z;
  }
  if (akt) out.push(akt);
  return out;
}

const UMZUG = "📦";

/** Auf der Lead-Karte vermerken, dass die Recherche im Kundenkanal liegt. */
export function mitUmzug(e: EmbedLike, kanalThread: string): EmbedLike {
  const thread = rechercheThread(e);
  return {
    ...e,
    fields: (e.fields ?? []).map((f) => (f.name === F_RECHERCHE ? { ...f, value: `<#${thread}> · ${UMZUG} Kopie im Kundenkanal: <#${kanalThread}>` } : f)),
  };
}

export const istUmgezogen = (e: EmbedLike) => (e.fields?.find((f) => f.name === F_RECHERCHE)?.value ?? "").includes(UMZUG);

export const kundenNrAus = (e: EmbedLike): string | null => e.fields?.find((f) => f.name === "Notion")?.value.match(/\b(KND-\d{3,})\b/)?.[1] ?? null;

/** Lead aktiv, Thread vorhanden, Kundennummer bekannt und noch nicht kopiert. */
export const umzugFaellig = (e: EmbedLike, status: string) =>
  status === "Lead aktiv" && Boolean(rechercheThread(e)) && !istUmgezogen(e) && Boolean(kundenNrAus(e));
