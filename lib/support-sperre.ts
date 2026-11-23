// Chat-Schutz im Support-Ticket (Prompt 17, 23.11.2026): Sperren, Entsperren, Beleidigungen, Bündeln
// und Schnellantworten. Reine Regeln ohne Netz, damit Server (lib/support.ts, /api/discord) und Tests
// (tests/support-sperre.test.ts) sie direkt nutzen.
//
// Der Stand steht an der Ticket-Karte selbst (erste Nachricht im Kanal, Embed): im Feld „Sperre“
// („Gesperrt – 12 Nachrichten in 1 Minute“ oder „Entsperrt von … um …“) und im Feld „Beleidigungen“
// (Anzahl). Nicht im Kanalnamen oder Thema: Die darf Discord nur zweimal in 10 Minuten ändern.
// Gesperrt wird automatisch (Spam, zweite Beleidigung) oder von Hand („🔒 Sperren“). Dann steht im
// Ticket eine Sperr-Karte mit „Entsperren“ und „Chat beenden“; erst nach dem Entsperren kann der Kunde
// wieder schreiben.
import { SCHNELLANTWORTEN } from "./chat-schnellantworten.ts";

export interface Feld {
  name: string;
  value: string;
  inline?: boolean;
}

export const SPERRE_FELD = "Sperre";
export const BELEIDIGUNG_FELD = "Beleidigungen";
const GESPERRT = "Gesperrt";

export const BESUCHER = "🗨️ **Besucher:**";
export const BELEIDIGUNG_ANFANG = "⚠️ **Beleidigung** – ";

/** Ein Feld setzen (ersetzen oder hinten anhängen). */
export function mitFeld(felder: Feld[] | undefined, name: string, value: string): Feld[] {
  const liste = felder ?? [];
  return liste.some((f) => f.name === name) ? liste.map((f) => (f.name === name ? { ...f, value } : f)) : [...liste, { name, value }];
}

export function sperreDerKarte(felder: Feld[] | undefined): { gesperrt: boolean; wert: string } {
  const wert = felder?.find((f) => f.name === SPERRE_FELD)?.value ?? "";
  return { gesperrt: wert.startsWith(GESPERRT), wert };
}

export const gesperrtWert = (grund: string) => `${GESPERRT} – ${grund}`;
/** Von Hand gesperrt („🔒 Sperren“ an der Karte). */
export const gesperrtVonWert = (wer: string, zeit: string) => `${GESPERRT} von ${wer} um ${zeit}`;
export const entsperrtWert = (wer: string, zeit: string) => `Entsperrt von ${wer} um ${zeit}`;

export function beleidigungenDerKarte(felder: Feld[] | undefined): number {
  const n = Number(felder?.find((f) => f.name === BELEIDIGUNG_FELD)?.value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Welche Knöpfe die Karte gerade trägt (aus dem Feld „Status“). */
export function zustandDerKarte(felder: Feld[] | undefined): "open" | "claimed" | "closed" {
  const status = felder?.find((f) => f.name === "Status")?.value ?? "";
  if (status.startsWith("Geschlossen")) return "closed";
  if (status.startsWith("Übernommen")) return "claimed";
  return "open";
}

// ------------------------------------------------------------------ Sperr-Karte

const SPERR_ZEILE = "-# Der Kunde kann erst wieder schreiben, wenn ihr entsperrt. Was er bis dahin schickt, kommt hier nicht an.";

/** Die Sperr-Karte im Ticket: automatisch mit Grund, von Hand mit „gesperrt von …“. */
export function sperrNachricht(anlass: { grund: string } | { von: string }): string {
  const was = "grund" in anlass ? anlass.grund : `gesperrt von ${anlass.von}`;
  return `🔒 **Besucher gesperrt** – ${was}\n${SPERR_ZEILE}`;
}

export function sperrKomponenten() {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Entsperren", emoji: { name: "🔓" }, custom_id: "ticket:entsperren" },
        { type: 2, style: 2, label: "Chat beenden", custom_id: "ticket:beenden" },
      ],
    },
  ];
}

const ersteZeile = (inhalt: string) => inhalt.split("\n")[0] || "🔒 **Besucher gesperrt**";

/** Nach „Entsperren“: Grund bleibt stehen, darunter wer und wann. Ohne Knöpfe. */
export function entsperrtNachricht(inhalt: string, wer: string, zeit: string): string {
  return `${ersteZeile(inhalt)}\n${entsperrtWert(wer, zeit)}`;
}

export function beendetNachricht(inhalt: string, wer: string, zeit: string): string {
  return `${ersteZeile(inhalt)}\nChat beendet von ${wer} um ${zeit}`;
}

// ------------------------------------------------------------------ Hinweis an den Kunden

/**
 * Kleine Zeile unter einem automatischen Hinweis an den Kunden („Bitte bleib freundlich.“). Daran
 * erkennt die Weitergabe an die Website, dass der Chat ihn als ruhigen Hinweis zeigt, nicht als
 * Nachricht eines Mitarbeiters.
 */
export const HINWEIS_ZEILE = "-# Automatischer Hinweis an den Kunden (Chat-Schutz).";
export const mitHinweisZeile = (text: string) => `${text.trim()}\n${HINWEIS_ZEILE}`;
export function trenneHinweisZeile(text: string): { text: string; hinweis: boolean } {
  const i = text.lastIndexOf(HINWEIS_ZEILE);
  if (i === -1) return { text, hinweis: false };
  return { text: (text.slice(0, i) + text.slice(i + HINWEIS_ZEILE.length)).trim(), hinweis: true };
}

// ------------------------------------------------------------------ Beleidigung

/** Markiert die Nachricht des Besuchers im Ticket; der Grund der KI steht nur fürs Team darunter. */
export function beleidigungsNachricht(inhalt: string, grund: string): string {
  if (inhalt.startsWith(BELEIDIGUNG_ANFANG)) return inhalt;
  const zeile = `-# Nur fürs Team: ${grund.replace(/\s+/g, " ").trim().slice(0, 150) || "Beleidigung erkannt"}`;
  const neu = `${BELEIDIGUNG_ANFANG}${inhalt}`;
  // Discord erlaubt 2000 Zeichen je Nachricht.
  return `${neu.length + zeile.length + 1 > 2000 ? `${neu.slice(0, 1995 - zeile.length)}…` : neu}\n${zeile}`;
}

// ------------------------------------------------------------------ Bündeln

const MAX_NACHRICHT = 1900;

/**
 * Was der Besucher innerhalb von 3 s schreibt, geht als EINE Nachricht ins Ticket, Zeilen untereinander.
 * Wird es zu lang für Discord (2000 Zeichen), dann in mehreren, ohne dass etwas verloren geht.
 */
export function besucherNachrichten(zeilen: string[]): string[] {
  const out: string[] = [];
  let teil: string[] = [];
  const laenge = (z: string[]) => BESUCHER.length + 1 + z.join("\n").length;
  for (const roh of zeilen) {
    const zeile = roh.trim();
    if (!zeile) continue;
    if (teil.length > 0 && laenge([...teil, zeile]) > MAX_NACHRICHT) {
      out.push(`${BESUCHER} ${teil.join("\n")}`);
      teil = [];
    }
    teil.push(zeile.slice(0, MAX_NACHRICHT - BESUCHER.length - 1));
  }
  if (teil.length > 0) out.push(`${BESUCHER} ${teil.join("\n")}`);
  return out;
}

// ------------------------------------------------------------------ Schnellantwort

export const SCHNELL_WAHL = "ticket:schnellwahl";
export const SCHNELL_FENSTER = "ticket:schnellsend";

/** Die Auswahl (nur für den, der geklickt hat): die fertigen Sätze aus lib/chat-schnellantworten.ts. */
export function schnellAuswahl() {
  return {
    content: "💬 Welche Schnellantwort? Du kannst den Satz danach noch ändern.",
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: SCHNELL_WAHL,
            placeholder: "Satz auswählen …",
            options: SCHNELLANTWORTEN.map((satz, i) => ({ label: satz.slice(0, 100), value: String(i) })),
          },
        ],
      },
    ],
  };
}

/** Das Fenster mit dem gewählten Satz zum Ändern (wie „Anruf anbieten“). */
export function schnellFenster(wahl: string | undefined) {
  const satz = SCHNELLANTWORTEN[Number(wahl)] ?? SCHNELLANTWORTEN[0];
  return {
    custom_id: SCHNELL_FENSTER,
    title: "Schnellantwort",
    components: [
      {
        type: 1,
        components: [
          { type: 4, custom_id: "text", label: "Nachricht an den Kunden (änderbar)", style: 2, required: true, max_length: 1500, value: satz },
        ],
      },
    ],
  };
}
