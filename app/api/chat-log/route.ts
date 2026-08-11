import { NextResponse } from "next/server";
import { escapeHtml, getMailEnv, sendMail, shell } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Wenn jemand im Chat Fragen stellt und dann geht, ohne eine Anfrage zu
// schicken, war das bisher unsichtbar. Diese Route bekommt beim Verlassen der
// Seite den Gesprächsverlauf und mailt ihn — damit David sieht, was Leute
// wirklich fragen und welche Interessenten abspringen.
//
// Bewusst KEINE Datenbank: Für die aktuelle Besucherzahl reicht das Postfach.

const MIN_USER_MESSAGES = 2; // darunter ist es kein Gespräch, sondern ein Klick
const MAX_MESSAGES = 40;
const MAX_CONTENT = 1500;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  // Großzügiger als das Kontaktformular (ein Besucher kann mehrere Seiten
  // besuchen), aber eng genug, dass niemand das Postfach flutet.
  const rl = rateLimit(`chatlog:${getClientIp(request)}`, 6, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ ok: true, skipped: "rate-limit" });

  let payload: { messages?: ChatMessage[]; contacted?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const safe = messages
    .filter(
      (m): m is ChatMessage =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }));

  const userCount = safe.filter((m) => m.role === "user").length;
  if (userCount < MIN_USER_MESSAGES) {
    return NextResponse.json({ ok: true, skipped: "zu kurz" });
  }

  const { to } = getMailEnv();
  const erste = safe.find((m) => m.role === "user")?.content ?? "";

  const verlauf = safe
    .map((m) => {
      const wer = m.role === "user" ? "Besucher" : "Assistent";
      const farbe = m.role === "user" ? "#0c0e14" : "#8a8579";
      return `<p style="margin:0 0 10px;"><strong style="color:${farbe};">${wer}:</strong> ${escapeHtml(m.content)}</p>`;
    })
    .join("");

  await sendMail({
    to,
    subject: payload?.contacted
      ? `Chat (Anfrage abgeschickt): ${erste.slice(0, 50)}`
      : `Chat ohne Anfrage: ${erste.slice(0, 50)}`,
    html: shell(
      payload?.contacted ? "Chat mit Anfrage" : "Chat ohne Anfrage",
      `
      <p style="margin:0 0 16px;color:#8a8579;">
        ${
          payload?.contacted
            ? "Der Besucher hat im Anschluss das Kontaktformular geöffnet."
            : "Der Besucher hat gefragt, aber keine Anfrage geschickt — hier siehst du, woran es lag."
        }
        ${userCount} Frage${userCount === 1 ? "" : "n"} insgesamt.
      </p>
      <div style="background:#faf9f6;padding:16px 18px;border-radius:10px;font-size:14px;line-height:1.6;">
        ${verlauf}
      </div>
      `,
    ),
  });

  return NextResponse.json({ ok: true });
}
