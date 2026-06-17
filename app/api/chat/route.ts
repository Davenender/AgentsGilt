import Anthropic from "@anthropic-ai/sdk";
import { AGENTS_GILT_SYSTEM_PROMPT } from "@/lib/chatbot-knowledge";

export const runtime = "nodejs";

const MAX_MESSAGES = 24; // Rate-Limit pro Session
const MAX_MESSAGE_LENGTH = 1200;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  let payload: { messages?: ChatMessage[] };
  try {
    payload = await request.json();
  } catch {
    return jsonError("Ungültige Anfrage", 400);
  }

  const messages = payload?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError("Keine Nachrichten", 400);
  }

  if (messages.length > MAX_MESSAGES) {
    return jsonError(
      "Diese Unterhaltung ist ganz schön lang geworden. Lade die Seite neu oder schreib uns direkt über das Kontaktformular weiter unten.",
      429,
    );
  }

  // Sanitize: nur role + content, gekürzt
  const safeMessages = messages
    .filter(
      (m): m is ChatMessage =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }));

  if (
    safeMessages.length === 0 ||
    safeMessages[safeMessages.length - 1].role !== "user"
  ) {
    return jsonError("Letzte Nachricht muss vom User sein", 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(
      "Der Chat ist gerade nicht verfügbar. Schreib uns gern direkt über das Kontaktformular weiter unten.",
      503,
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiStream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 600,
          system: AGENTS_GILT_SYSTEM_PROMPT,
          messages: safeMessages,
        });

        for await (const event of apiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`,
              ),
            );
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
        controller.close();
      } catch (err) {
        console.error("[chat] Anthropic error:", err);
        const message =
          err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
