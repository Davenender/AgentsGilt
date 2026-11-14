import Anthropic from "@anthropic-ai/sdk";
import { ZUSAMMENFASSUNG_SYSTEM, gespraechAlsText, saeubereVerlauf, saeubereZusammenfassung } from "@/lib/chat-zusammenfassung";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Fasst den bisherigen Chat in 2 bis 3 Sätzen zusammen, für das Nachrichtenfeld des Formulars
// „Mit einem Mitarbeiter schreiben“ im Chat-Fenster der neuen Seite. Es kommt nur der Verlauf an,
// den die KI ohnehin sehen darf (aiHistory in lib/chat-text.ts), nichts aus dem Formular.
// Antwort: { text } (leer, wenn es nichts zusammenzufassen gab oder das Modell ablehnt). Das
// Fenster wartet höchstens 6 s und lässt das Feld sonst leer: Nichts hängt von dieser Antwort ab.

function antwort(inhalt: Record<string, unknown>, status = 200, kopf: Record<string, string> = {}) {
  return new Response(JSON.stringify(inhalt), { status, headers: { "Content-Type": "application/json", ...kopf } });
}

export async function POST(request: Request) {
  // Bremse gegen Missbrauch (Kosten), wie beim Chat: hier höchstens 12 Zusammenfassungen in 5 Minuten je IP.
  const rl = rateLimit(`chat-zf:${getClientIp(request)}`, 12, 5 * 60_000);
  if (!rl.ok) return antwort({ error: "Zu viele Anfragen in kurzer Zeit." }, 429, { "Retry-After": String(rl.retryAfter) });

  let roh: { messages?: unknown };
  try {
    roh = await request.json();
  } catch {
    return antwort({ error: "Ungültige Anfrage" }, 400);
  }
  const verlauf = saeubereVerlauf(roh?.messages);
  if (!verlauf) return antwort({ error: "Kein Gespräch" }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return antwort({ error: "Gerade nicht verfügbar." }, 503);

  try {
    const anthropic = new Anthropic({ apiKey });
    // Haiku 5.5 denkt von sich aus nach, und das Nachdenken zählt zu max_tokens: Für zwei, drei
    // Sätze ist es abgeschaltet, sonst bliebe von den 200 Tokens nichts für den Text. Ein
    // Ausweichmodell gibt es für Haiku nicht; lehnt es ab, bleibt das Feld leer.
    const ergebnis = await anthropic.messages.create(
      {
        model: "claude-haiku-5-5",
        max_tokens: 200,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        system: ZUSAMMENFASSUNG_SYSTEM,
        messages: [{ role: "user", content: gespraechAlsText(verlauf) }],
      },
      // Das Fenster wartet 6 s; länger zu rechnen (oder es noch einmal zu versuchen) nützt niemandem.
      { timeout: 6000, maxRetries: 0 },
    );
    if (ergebnis.stop_reason === "refusal") return antwort({ text: "" });
    let text = "";
    for (const block of ergebnis.content) if (block.type === "text") text += block.text;
    return antwort({ text: saeubereZusammenfassung(text) });
  } catch (err) {
    console.error("[chat-zusammenfassung] Anthropic error:", err instanceof Anthropic.APIError ? `${err.status} ${err.name}` : err);
    return antwort({ error: "Gerade nicht verfügbar." }, 502);
  }
}
