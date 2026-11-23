// Discord bremst: Mehr als etwa 5 Nachrichten in 5 Sekunden in denselben Kanal beantwortet es mit
// HTTP 429 und sagt in `retry_after` (Sekunden), wann es wieder geht. Bis Prompt 17 (23.11.2026) gab
// lib/support.ts bei 429 sofort auf; am 23.11. um 16:08 kamen so 15 Kundennachrichten in 10 s nicht an.
// Seitdem: warten, so lange Discord sagt, und höchstens zweimal neu versuchen, alles zusammen höchstens
// 5 Sekunden. Reicht das nicht, gilt die Nachricht als nicht angekommen (der Chat bietet „Nochmal senden“).
// Ohne Pfad-Kürzel (@/…), damit tests/discord-wiederholen.test.ts die Datei direkt laden kann.

export interface WiederholOptionen {
  /** So oft wird nach einem 429 neu versucht. */
  weitere?: number;
  /** Höchstens so lange darf alles zusammen dauern (ms). */
  gesamtMs?: number;
  warte?: (ms: number) => Promise<void>;
  jetzt?: () => number;
}

export const WEITERE_VERSUCHE = 2;
export const GESAMT_MS = 5000;

const schlafe = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Wie lange Discord warten lässt (ms): `retry_after` aus der Antwort, sonst der Kopf Retry-After, sonst 1 s. */
export async function warteZeit(res: Response): Promise<number> {
  let sekunden: number | undefined;
  try {
    const daten = (await res.clone().json()) as { retry_after?: unknown };
    if (typeof daten?.retry_after === "number") sekunden = daten.retry_after;
  } catch {
    /* keine JSON-Antwort */
  }
  if (sekunden === undefined) {
    const kopf = Number(res.headers.get("retry-after") ?? res.headers.get("x-ratelimit-reset-after") ?? NaN);
    if (Number.isFinite(kopf)) sekunden = kopf;
  }
  return Math.max(0, Math.ceil((sekunden ?? 1) * 1000));
}

/** Schickt die Anfrage; bei 429 wartet es `retry_after` ab und versucht es erneut (höchstens 2-mal, höchstens 5 s). */
export async function mitWiederholung(senden: () => Promise<Response>, opt: WiederholOptionen = {}): Promise<Response> {
  const weitere = opt.weitere ?? WEITERE_VERSUCHE;
  const gesamt = opt.gesamtMs ?? GESAMT_MS;
  const warte = opt.warte ?? schlafe;
  const jetzt = opt.jetzt ?? Date.now;
  const start = jetzt();
  let res = await senden();
  for (let i = 0; i < weitere && res.status === 429; i++) {
    const ms = await warteZeit(res);
    // Würde das Warten die 5 Sekunden sprengen, lieber gleich aufgeben: Der Chat bietet „Nochmal senden“.
    if (jetzt() - start + ms > gesamt) break;
    await warte(ms);
    res = await senden();
  }
  return res;
}
