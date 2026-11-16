// Discord-Durchsicht 16.11.2026: Rund 30 Stellen lesen die Kanalliste des Servers (GET /guilds/{id}/channels) einzeln,
// oft mehrmals je Minute (Team-Takt, Luca-Briefkasten, Übungen, Abgleich). Discord bremst dann (HTTP 429), und Teile
// melden „Kanal nicht gefunden“. Ein gemeinsamer Zwischenspeicher in `call` (lib/leads.ts) und in lib/discord.ts:
// 15 s gültig, geleert, sobald der Bot selbst Kanäle anlegt, ändert, verschiebt, löscht oder Rechte setzt.
// Reine Logik: tests/kanalliste.test.ts.

export const KANALLISTE_MS = 15_000;

/** Liest dieser Aufruf die ganze Kanalliste des Servers? */
export const istKanallisteAbruf = (method: string, pfad: string) => method.toUpperCase() === "GET" && /^\/guilds\/\d+\/channels$/.test(pfad);

/** Ändert dieser Aufruf Kanäle (dann ist die gemerkte Liste veraltet)? Nachrichten, Pins und Threads-Mitglieder nicht. */
export function leertKanalliste(method: string, pfad: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET") return false;
  if (/^\/guilds\/\d+\/channels$/.test(pfad)) return true;
  return /^\/channels\/\d+(\/permissions\/\d+)?$/.test(pfad);
}

export class Kanalliste<T = unknown> {
  private liste: T[] | null = null;
  private seit = 0;

  hole(jetzt = Date.now()): T[] | undefined {
    // Eine Kopie, damit kein Aufrufer die gemerkte Liste verändert (z. B. durch Sortieren).
    return this.liste && jetzt - this.seit < KANALLISTE_MS ? this.liste.slice() : undefined;
  }

  merke(liste: T[] | null, jetzt = Date.now()): void {
    if (!liste) return;
    this.liste = liste;
    this.seit = jetzt;
  }

  leere(): void {
    this.liste = null;
  }
}

/** Ein Speicher für den ganzen Server-Prozess (alle Routen teilen ihn). */
export const kanalliste = new Kanalliste();
