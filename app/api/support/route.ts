import { after, NextResponse } from "next/server";
import { messageLink } from "@/lib/discord";
import { escapeHtml, getMailEnv, sendMail, shell } from "@/lib/mail";
import { pushe } from "@/lib/ntfy";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { ladeTeam } from "@/lib/team-daten";
import { pruefeBeleidigung } from "@/lib/chat-beleidigung";
import { chat as chatTexte } from "@/lib/inhalt-neu";
import { REGELN_TICKET, Waechter, grundText } from "@/lib/chat-schutz";
import {
  checkTicketToken,
  hinweisBeiAnrufwunsch,
  meldeBeleidigung,
  openTicket,
  postFromVisitor,
  postPresence,
  relayMessages,
  sperreTicket,
  ticketClosed,
  ticketStand,
} from "@/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Nach der Antwort läuft noch die Beleidigungs-Prüfung (KI bis 5 s) samt Markierung in Discord.
export const maxDuration = 60;

// Support-Chat der Website: Ticket eröffnen (POST open), Nachricht senden
// (POST send) und neue Antworten des Teams abholen (GET). Alles landet im
// Discord-Kanal ticket-XXXX unter SUPPORT, siehe lib/support.ts.

const MAX_TEXT = 1500;
// Was der Besucher innerhalb von 3 s schreibt, schickt der Chat gebündelt (höchstens so viele Zeilen).
const MAX_ZEILEN = 30;
// Chat-Schutz (Prompt 17): Der Server zählt je Ticket mit (nur im Speicher dieser Instanz). Gebündelte
// Nachrichten kommen bis zu 3 s später an als getippt, darum 5 s Spielraum: nie strenger als der Browser.
const waechter = new Waechter();
const SPIELRAUM_MS = 5000;
const GESPERRT = chatTexte.schutz.gesperrtTeam;

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
  await ladeTeam(bot);
  if (!bot) return fehler("Der Support-Chat ist gerade nicht verfügbar. Bitte nutze das Kontaktformular.", 503);
  const ip = getClientIp(request);

  // ---------------------------------------------------------------- eröffnen
  if (body.action === "open") {
    // Verstecktes Feld: Menschen lassen es leer, einfache Bots füllen es aus.
    if (text(body.website, 100)) return NextResponse.json({ ok: true });

    const rl = rateLimit(`support-open:${ip}`, 5, 60 * 60_000);
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

    // Push aufs Handy (ntfy): ein Besucher möchte mit einem Mitarbeiter sprechen. Läuft nach der Antwort, der Besucher wartet nicht darauf.
    after(async () => {
      await pushe("💬 Neues Support-Ticket", `ticket-${ticket.nummer}: ${name} möchte mit einem Mitarbeiter sprechen`, messageLink(ticket.channelId, ticket.cardId));
    });
    // Möchte der Kunde schon in seiner Frage (oder vorher im Chat) sprechen, einen Termin, ein
    // Erstgespräch oder einen Preis: Hinweis nur fürs Team mit „Anruf anbieten“.
    const vomKunden = [frage, ...verlauf.filter((m) => m.role === "user").map((m) => m.content).reverse()].join("\n");
    after(async () => {
      await hinweisBeiAnrufwunsch(bot, ticket.channelId, vomKunden);
    });

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

    // Eine Nachricht (text) oder ein Bündel (texts): Was der Besucher in 3 s schreibt, kommt zusammen.
    const roh = Array.isArray(body.texts) ? (body.texts as unknown[]) : [body.text];
    const zeilen = roh.map((t) => text(t, MAX_TEXT)).filter(Boolean).slice(0, MAX_ZEILEN);
    if (zeilen.length === 0) return fehler("Leere Nachricht", 400);

    const stand = await ticketStand(bot, channelId);
    if (stand === null) return fehler("Das hat leider nicht geklappt. Bitte versuch es gleich nochmal.", 502);
    if (stand.closed) return NextResponse.json({ error: "Der Chat wurde beendet.", closed: true }, { status: 409 });
    // Gesperrt: Was jetzt kommt, geht nicht nach Discord.
    if (stand.gesperrt) return NextResponse.json({ error: GESPERRT, gesperrt: true }, { status: 423 });

    // Spam, den der Browser nicht abgefangen hat (z. B. ohne die Seite geschickt): sperren statt posten.
    const jetzt = Date.now();
    const spam = waechter.pruefeAlle(`ticket:${channelId}`, zeilen, REGELN_TICKET, jetzt, SPIELRAUM_MS);
    if (spam) {
      // Nach dem Entsperren beginnt die Zählung neu (sonst sperrte die nächste Nachricht gleich wieder).
      waechter.leere(`ticket:${channelId}`);
      await sperreTicket(bot, channelId, spam.grund);
      return NextResponse.json({ error: GESPERRT, gesperrt: true }, { status: 423 });
    }

    const ids = await postFromVisitor(bot, channelId, zeilen);
    if (!ids) return fehler("Die Nachricht ist nicht angekommen.", 502);
    waechter.merke(`ticket:${channelId}`, zeilen, jetzt);
    const alles = zeilen.join("\n");
    // Möchte der Kunde sprechen, einen Termin, ein Erstgespräch oder einen Preis: Hinweis nur fürs
    // Team mit „Anruf anbieten“. Läuft nach der Antwort; beim Kunden erscheint dadurch nichts.
    after(async () => {
      await hinweisBeiAnrufwunsch(bot, channelId, alles);
    });
    // Beleidigung? Prüft die KI (Haiku) im Hintergrund; die Nachricht ist schon da, ⚠️ und Hinweis folgen.
    after(async () => {
      const p = await pruefeBeleidigung(alles);
      if (p.beleidigung) await meldeBeleidigung(bot, channelId, ids, p.grund);
    });
    return NextResponse.json({ ok: true });
  }

  // ------------------------------------------- der Browser hat Spam erkannt: sperren
  if (body.action === "sperre") {
    const channelId = checkTicketToken(text(body.token, 100));
    if (!channelId) return fehler("Diese Verbindung ist nicht mehr gültig.", 401);
    const rl = rateLimit(`support-sperre:${channelId}`, 3, 10 * 60_000);
    if (!rl.ok) return NextResponse.json({ ok: true, gesperrt: (await ticketStand(bot, channelId))?.gesperrt === true });
    // Den Grund setzt der Server selbst zusammen, der Browser nennt nur Art und Anzahl.
    const art = body.art === "menge" || body.art === "wiederholung" || body.art === "kauderwelsch" ? body.art : null;
    const anzahl = Math.max(1, Math.min(99, Math.floor(Number(body.anzahl) || 0)));
    if (!art) return fehler("Ungültige Anfrage", 400);
    const stand = await ticketStand(bot, channelId);
    if (!stand || stand.closed) return NextResponse.json({ ok: true, gesperrt: false });
    waechter.leere(`ticket:${channelId}`);
    const gesperrt = stand.gesperrt || (await sperreTicket(bot, channelId, grundText(art, anzahl)));
    return NextResponse.json({ ok: true, gesperrt });
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
  await ladeTeam(bot);
  if (!bot) return fehler("Nicht verfügbar", 503);

  const url = new URL(request.url);
  const channelId = checkTicketToken(url.searchParams.get("t") ?? "");
  const after = url.searchParams.get("after") ?? "";
  if (!channelId || !/^\d{5,25}$/.test(after)) return fehler("Ungültig", 401);

  const rl = rateLimit(`support-poll:${getClientIp(request)}`, 90, 60_000);
  if (!rl.ok) return fehler("Zu viele Anfragen", 429);

  const [relay, stand] = await Promise.all([
    relayMessages(bot, channelId, after),
    ticketStand(bot, channelId),
  ]);
  if (!relay) return fehler("Nicht erreichbar", 502);

  return NextResponse.json({
    messages: relay.messages,
    last: relay.last,
    closed: stand?.closed === true,
    // Chat-Schutz: Gesperrt, bis das Team in Discord entsperrt. Der Chat merkt es bei diesem Abruf, ohne neu zu laden.
    // Antwortete Discord nicht, fehlt der Wert, und der Chat behält seinen Stand.
    ...(stand ? { gesperrt: stand.gesperrt } : {}),
  });
}
