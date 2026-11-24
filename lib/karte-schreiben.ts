// Die Ticket-Karte sicher ändern (Prompt 18c, 24.11.2026). An die Karte schreiben mehrere: der Abruf des Kunden
// („Zuletzt zugestellt“), der Minutentakt (Sperre abgelaufen, frei), die Knöpfe (Übernehmen, Freigeben, Schließen).
// Discord kennt kein „nur ändern, wenn sich nichts geändert hat“: Wer eine Karte von vorhin zurückschreibt, löscht,
// was ein anderer dazwischen geschrieben hat. Darum: direkt vor dem Schreiben frisch lesen, nur die eigenen Felder
// ändern, und kurz danach nachsehen, ob die eigene Änderung noch steht; sonst noch einmal (frisch gelesen).
//
// Ohne Netz (Lesen, Schreiben und Warten kommen von außen), damit tests/chat-schutz-18c.test.ts das Zusammenfallen
// zweier Schreibvorgänge genau nachstellen kann.

export interface KartenZugriff<K> {
  lese(): Promise<K | null>;
  schreibe(k: K): Promise<boolean>;
  warte(ms: number): Promise<void>;
}

/** So lange nach dem Schreiben nachsehen, ob die Änderung noch steht (ein Abruf des Kunden dauert unter einer Sekunde). */
export const NACHSEHEN_MS = 1200;

/**
 * Liest frisch, ändert (`aendern` gibt null zurück, wenn nichts zu tun ist, z. B. weil schon ein anderer übernommen
 * hat), schreibt, wartet kurz und prüft mit `steht`, ob die Änderung noch da ist. Ist sie weg (ein anderer schrieb
 * eine ältere Karte zurück), noch einmal, höchstens `versuche`-mal.
 * „ok“: steht. „nichts“: `aendern` wollte nichts ändern. „fehler“: nicht lesbar, nicht schreibbar oder nach allen
 * Versuchen nicht da.
 */
export async function aendereGeprueft<K>(
  z: KartenZugriff<K>,
  aendern: (k: K) => K | null,
  steht: (k: K) => boolean,
  versuche = 3,
  nachsehenMs = NACHSEHEN_MS,
): Promise<"ok" | "nichts" | "fehler"> {
  for (let i = 0; i < versuche; i++) {
    const k = await z.lese();
    if (!k) return "fehler";
    if (i > 0 && steht(k)) return "ok";
    const neu = aendern(k);
    if (!neu) return i === 0 ? "nichts" : steht(k) ? "ok" : "nichts";
    if (!(await z.schreibe(neu))) return "fehler";
    await z.warte(nachsehenMs);
    const danach = await z.lese();
    if (danach && steht(danach)) return "ok";
  }
  return "fehler";
}
