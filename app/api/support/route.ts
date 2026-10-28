import { NextResponse } from "next/server";
import { escapeHtml, getMailEnv, sendMail, shell } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  checkTicketToken,
  openTicket,
  postFromVisitor,
  postPresence,
  relayMessages,
  ticketClosed,
} from "@/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Support-Chat der Website: Ticket eröffnen (POST open), Nachricht senden
// (POST send) und neue Antworten des Teams abholen (GET). Alles landet im
// Discord-Kanal ticket-XXXX unter SUPPORT, siehe lib/support.ts.

const MAX_TEXT = 1500;

const fehler = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fehler("Ungültige Anfrage", 400);
  }

  const bot = process.env.DISCORD_BOT_TOKEN;
  if (!bot) return fehler("Der Support-Chat ist gerade nicht verfügbar. Bitte nutze das Kontaktformular.", 503);
  const ip = getClientIp(request);

  // ---------------------------------------------------------------- eröffnen
  if (body.action === "open") {
    // Verstecktes Feld: Menschen lassen es leer, einfache Bots füllen es aus.
    if (text(body.website, 100)) return NextResponse.json({ ok: true });

    const rl = rateLimit(`support-open:${ip}`, 3, 60 * 60_000);
    if (!rl.ok) {
      return fehler("Du hast schon mehrere Anfragen geschickt. Bitte schreib uns kurz über das Kontaktformular.", 429);
    }

    const name = text(body.name, 80);
    const kontakt = text(body.kontakt, 120);
    const frage = text(body.frage, 1000);
    if (name.length < 2) return fehler("Bitte gib deinen Namen an.", 400);
    if (kontakt.length < 3) return fehler("Bitte gib eine E-Mail-Adresse oder Telefonnummer an.", 400);
    if (!frage) return fehler("Bitte beschreib kurz dein Anliegen.", 400);

    const verlauf = Array.isArray(body.verlauf)
      ? (body.verlauf as { role?: unknown; content?: unknown }[])
          .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .slice(-8)
          .map((m) => ({ role: String(m.role), content: String(m.content).slice(0, 400) }))
      : [];

    const ticket = await openTicket(bot, { name, kontakt, frage, verlauf });
    if (!ticket) return fehler("Das hat leider nicht geklappt. Bitte nutze das Kontaktformular.", 502);

    // Zusätzlich eine Mail, falls im Discord niemand hinschaut.
    try {
      const { to } = getMailEnv();
      await sendMail({
        to,
        subject: `Support-Anfrage ticket-${ticket.nummer} von ${name}`,
        html: shell(
          "Neue Support-Anfrage",
          `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(kontakt)}) möchte mit einem Mitarbeiter sprechen.</p>
           <p style="background:#faf9f6;padding:14px 16px;border-radius:10px;white-space:pre-wrap;">${escapeHtml(frage)}</p>
           <p>Antworten geht im Discord-Kanal <strong>ticket-${ticket.nummer}</strong> unter SUPPORT.</p>`,
        ),
        replyTo: kontakt.includes("@") ? kontakt : undefined,
      });
    } catch (err) {
      console.error("[support] Mail fehlgeschlagen:", err);
    }

    return NextResponse.json({ ok: true, token: ticket.token, nummer: ticket.nummer, after: ticket.cardId });
  }

  // ----------------------------------------------------------------- senden
  if (body.action === "send") {
    const channelId = checkTicketToken(text(body.token, 100));
    if (!channelId) return fehler("Diese Verbindung ist nicht mehr gültig.", 401);
    const rl = rateLimit(`support-send:${channelId}`, 20, 5 * 60_000);
    if (!rl.ok) return fehler("Bitte einen Moment warten, bevor du weiterschreibst.", 429);

    const msg = text(body.text, MAX_TEXT);
    if (!msg) return fehler("Leere Nachricht", 400);

    const closed = await ticketClosed(bot, channelId);
    if (closed) return NextResponse.json({ error: "Der Chat wurde beendet.", closed: true }, { status: 409 });
    if (closed === null) return fehler("Das hat leider nicht geklappt. Bitte versuch es gleich nochmal.", 502);

    const ok = await postFromVisitor(bot, channelId, msg);
    return ok ? NextResponse.json({ ok: true }) : fehler("Die Nachricht ist nicht angekommen.", 502);
  }

  // ------------------------------------------------- Besucher geht / kommt zurück
  if (body.action === "presence") {
    const channelId = checkTicketToken(text(body.token, 100));
    if (!channelId) return fehler("Ungültig", 401);
    const state = body.state === "left" ? "left" : body.state === "back" ? "back" : null;
    if (!state) return fehler("Ungültige Anfrage", 400);
    const rl = rateLimit(`support-presence:${channelId}`, 10, 5 * 60_000);
    if (!rl.ok) return NextResponse.json({ ok: true });
    if ((await ticketClosed(bot, channelId)) !== false) return NextResponse.json({ ok: true });
    await postPresence(bot, channelId, state);
    return NextResponse.json({ ok: true });
  }

  return fehler("Ungültige Anfrage", 400);
}

export async function GET(request: Request) {
  const bot = process.env.DISCORD_BOT_TOKEN;
  if (!bot) return fehler("Nicht verfügbar", 503);

  const url = new URL(request.url);
  const channelId = checkTicketToken(url.searchParams.get("t") ?? "");
  const after = url.searchParams.get("after") ?? "";
  if (!channelId || !/^\d{5,25}$/.test(after)) return fehler("Ungültig", 401);

  const rl = rateLimit(`support-poll:${getClientIp(request)}`, 90, 60_000);
  if (!rl.ok) return fehler("Zu viele Anfragen", 429);

  const [relay, closed] = await Promise.all([
    relayMessages(bot, channelId, after),
    ticketClosed(bot, channelId),
  ]);
  if (!relay) return fehler("Nicht erreichbar", 502);

  return NextResponse.json({
    messages: relay.messages,
    last: relay.last,
    closed: closed === true,
  });
}
