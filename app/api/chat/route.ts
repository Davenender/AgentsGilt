import Anthropic from "@anthropic-ai/sdk";
import { AGENTS_GILT_SYSTEM_PROMPT } from "@/lib/chatbot-knowledge";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

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
  // Rate-Limit gegen Missbrauch (Kosten): max. 30 Anfragen / 5 Min pro IP
  const rl = rateLimit(`chat:${getClientIp(request)}`, 30, 5 * 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({
        error:
          "Zu viele Anfragen in kurzer Zeit. Bitte warte einen Moment – oder schreib uns über das Kontaktformular weiter unten.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfter),
        },
      },
    );
  }

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
        // Sonnet 5.5: "low" ist für Chat gedacht (denkt bei einfachen Fragen kaum, antwortet schnell). Das Denken zählt
        // zu max_tokens, deshalb etwas Luft. Lehnt das Modell aus Sicherheitsgründen ab, springt die API selbst auf ein
        // passendes Ausweichmodell ("default"); das SDK kennt diese Form noch nicht, daher die Typ-Umwandlung.
        const params = {
          model: "claude-sonnet-5-5",
          max_tokens: 1500,
          output_config: { effort: "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: AGENTS_GILT_SYSTEM_PROMPT,
          messages: safeMessages,
        };
        const apiStream = anthropic.beta.messages.stream(
          params as unknown as Parameters<typeof anthropic.beta.messages.stream>[0],
        );

        let textGesendet = false;
        let stopReason: string | null = null;
        for await (const event of apiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            textGesendet = true;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`,
              ),
            );
          } else if (event.type === "message_delta") {
            stopReason = event.delta.stop_reason ?? stopReason;
          }
        }
        // Ganz abgelehnt (auch vom Ausweichmodell): freundlich auf den Kontakt verweisen statt leer zu bleiben.
        if (stopReason === "refusal") {
          console.warn("[chat] Anfrage vom Modell abgelehnt");
          const hinweis = "Dabei kann ich leider nicht helfen. Schreib uns gern über das Kontaktformular, dann meldet sich unser Team.";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: textGesendet ? `\n\n${hinweis}` : hinweis })}\n\n`,
            ),
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
        controller.close();
      } catch (err) {
        console.error("[chat] Anthropic error:", err);
        // Interne Fehlertexte (z. B. von der API) nicht an Besucher weitergeben.
        const message =
          "Der Chat hat gerade ein Problem. Bitte versuch es gleich noch einmal oder schreib uns über das Kontaktformular.";
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
