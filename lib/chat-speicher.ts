// Wo der Website-Chat seinen Stand merkt (Etappe 1, 16.11.2026, Davids Entscheidung):
// Verlauf, laufendes Support-Ticket und „Besucher war weg“ bleiben 24 Stunden nach der letzten
// Nachricht im Browser (localStorage), auch wenn der Tab zu ist. Danach beginnt der Chat leer.
// Reine Logik ohne Browser, damit sie getestet werden kann: tests/chat-speicher.test.ts.
import type { Message, Ticket } from "./chat-text.ts";

export const CHAT_DAUER_MS = 24 * 60 * 60 * 1000;

export type Speicher = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const K_MESSAGES = "ag-assistant-messages";
const K_TICKET = "ag-support-ticket";
const K_LEFT = "ag-support-left";
const K_ZULETZT = "ag-chat-zuletzt";
const MAX_MESSAGES = 30;

const leer = () => ({ messages: null, ticket: null, verlassen: false });

function istNachricht(m: unknown): m is Message {
  if (!m || typeof m !== "object") return false;
  const x = m as Message;
  return (x.role === "user" || x.role === "assistant" || x.role === "team") && typeof x.content === "string";
}

function lies<T>(s: Speicher, k: string): T | null {
  try {
    const raw = s.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Liest den gemerkten Stand. Ist die letzte Nachricht älter als 24 Stunden, wird alles gelöscht. */
export function ladeVerlauf(s: Speicher, jetzt: number): { messages: Message[] | null; ticket: Ticket | null; verlassen: boolean } {
  const zuletzt = Number(s.getItem(K_ZULETZT));
  if (!zuletzt || jetzt - zuletzt > CHAT_DAUER_MS) {
    vergissVerlauf(s);
    return leer();
  }
  const roh = lies<unknown>(s, K_MESSAGES);
  const liste = Array.isArray(roh) ? roh.filter(istNachricht) : [];
  const t = lies<Ticket>(s, K_TICKET);
  return {
    messages: liste.length > 0 ? liste : null,
    ticket: t && typeof t.token === "string" ? t : null,
    verlassen: s.getItem(K_LEFT) === "1",
  };
}

/** Merkt den Verlauf (die letzten 30 Nachrichten) und den Zeitpunkt der letzten Nachricht. */
export function merkeVerlauf(s: Speicher, messages: Message[], jetzt: number): void {
  try {
    s.setItem(K_MESSAGES, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    s.setItem(K_ZULETZT, String(jetzt));
  } catch {
    /* Speicher voll oder gesperrt – der Chat läuft trotzdem weiter */
  }
}

export function merkeTicket(s: Speicher, t: Ticket | null): void {
  try {
    if (t) s.setItem(K_TICKET, JSON.stringify(t));
    else s.removeItem(K_TICKET);
  } catch {
    /* nicht schlimm */
  }
}

export function merkeVerlassen(s: Speicher, ja: boolean): void {
  try {
    if (ja) s.setItem(K_LEFT, "1");
    else s.removeItem(K_LEFT);
  } catch {
    /* nicht schlimm */
  }
}

export function vergissVerlauf(s: Speicher): void {
  for (const k of [K_MESSAGES, K_TICKET, K_LEFT, K_ZULETZT]) {
    try {
      s.removeItem(k);
    } catch {
      /* nicht schlimm */
    }
  }
}
