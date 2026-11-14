import { aiHistory, type Message } from "@/lib/chat-text";

// So lange wartet das Formular höchstens auf die Zusammenfassung (Millisekunden).
const ZEITGRENZE = 6000;

/**
 * Holt die KI-Zusammenfassung des bisherigen Chats für das Formular „Mit einem Mitarbeiter
 * schreiben“ (app/api/chat/zusammenfassung). Es geht nur der Verlauf hinaus, den die KI ohnehin
 * sehen darf (aiHistory), nichts aus dem Formular. Jeder Fehler, eine Ablehnung und die
 * Zeitgrenze von 6 s ergeben einfach einen leeren Text: Dann bleibt das Feld leer, nichts hängt.
 */
export async function holeZusammenfassung(messages: Message[], abbruch?: AbortSignal): Promise<string> {
  const verlauf = aiHistory(messages).slice(-24);
  if (!verlauf.some((m) => m.role === "user")) return "";
  const grenze = new AbortController();
  const uhr = window.setTimeout(() => grenze.abort(), ZEITGRENZE);
  const stopp = () => grenze.abort();
  abbruch?.addEventListener("abort", stopp);
  try {
    const res = await fetch("/api/chat/zusammenfassung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: verlauf }),
      signal: grenze.signal,
    });
    if (!res.ok) return "";
    const daten = (await res.json().catch(() => ({}))) as { text?: unknown };
    return typeof daten.text === "string" ? daten.text.trim().slice(0, 1000) : "";
  } catch {
    return "";
  } finally {
    window.clearTimeout(uhr);
    abbruch?.removeEventListener("abort", stopp);
  }
}
