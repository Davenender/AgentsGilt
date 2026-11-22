import { countdownText } from "./akademie.ts";

// Countdown über einer Lesekarte (22.11.2026): Solange „Weiter ▶“ / „✅ Gelesen“ gesperrt ist, schreibt der Bot
// jede volle Sekunde nur den Text über der Karte neu (Karte und Knöpfe bleiben). Discord selbst zeigt nur
// „in ein paar Sekunden“. Uhr, Schlafen und Discord kommen von außen, damit es getestet werden kann.

export type PatchAntwort = { status: number; nachricht?: unknown; retryAfter?: number };

export interface CountdownHelfer {
  /** Jetzt in Millisekunden. */
  jetzt: () => number;
  schlafe: (ms: number) => Promise<void>;
  /** Nur den Text über der Karte ersetzen; null = kein Netz. */
  patch: (text: string) => Promise<PatchAntwort | null>;
}

/** Zeigt die Karte (laut Antwort von Discord) noch den Knopf, für den wir zählen? */
export function zeigtKnopf(nachricht: unknown, knopfId: string): boolean {
  const reihen = (nachricht as { components?: unknown } | null)?.components;
  if (!Array.isArray(reihen)) return false;
  return reihen.some((r) => Array.isArray((r as { components?: unknown }).components) && (r as { components: { custom_id?: string }[] }).components.some((c) => c?.custom_id === knopfId));
}

/**
 * Zählt bis `frei` (Unix-Sekunden) herunter. Hört auf, wenn der Knopf frei ist, die Person weitergeblättert hat
 * (dann kommt die eigene Zeile wieder weg), die Karte weg ist, das Netz dreimal fehlt oder `bisMs` erreicht ist.
 */
export async function zaehleRunter(
  h: CountdownHelfer,
  o: { knopf: "Weiter" | "Gelesen"; knopfId: string; frei: number; bisMs: number },
): Promise<"frei" | "geblaettert" | "weg" | "fehler" | "zeit"> {
  let fehler = 0;
  for (;;) {
    const jetzt = h.jetzt();
    const warte = 1000 - (jetzt % 1000);
    if (jetzt + warte > o.bisMs) return "zeit";
    await h.schlafe(warte);
    const rest = o.frei - Math.floor(h.jetzt() / 1000);
    const a = await h.patch(countdownText(o.knopf, rest));
    if (!a) {
      if (++fehler >= 3) return "fehler";
      continue;
    }
    if (a.status === 429) {
      await h.schlafe(Math.max(1, a.retryAfter ?? 1) * 1000);
      continue;
    }
    if (a.status < 200 || a.status >= 300) return "weg";
    if (rest <= 0) return "frei";
    if (!zeigtKnopf(a.nachricht, o.knopfId)) {
      await h.patch("");
      return "geblaettert";
    }
  }
}
