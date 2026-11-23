// Chat-Schutz im Support-Ticket (Prompt 17, 23.11.2026): Sperren, Entsperren, Beleidigungen, Bündeln
// und Schnellantworten. Reine Regeln ohne Netz, damit Server (lib/support.ts, lib/ticket-handler.ts) und
// Tests (tests/support-sperre.test.ts) sie direkt nutzen.
//
// Der Stand steht an der Ticket-Karte selbst (erste Nachricht im Kanal, Embed): im Feld „Sperre“
// („Gesperrt – 12 Nachrichten in 1 Minute“ oder „Entsperrt von … um …“) und im Feld „Beleidigungen“
// (Anzahl). Nicht im Kanalnamen oder Thema: Die darf Discord nur zweimal in 10 Minuten ändern.
// Gesperrt wird automatisch (Spam, zweite Beleidigung) oder von Hand („🔒 Sperren“). Dann steht im
// Ticket eine Sperr-Karte mit „Entsperren“ und „Chat beenden“; erst nach dem Entsperren kann der Kunde
// wieder schreiben.
//
// Runde 2 (Prompt 18):
// - Wer im Assistenten-Chat gesperrt ist (5 Minuten), bleibt es im Ticket. Das Feld trägt dann das Ende als
//   Discord-Zeitangabe („Gesperrt bis <t:…:t> – Beleidigung (aus dem Assistenten-Chat)“); die Sperr-Karte hat
//   zusätzlich „Dauerhaft sperren“. Ist die Zeit um, ist der Kunde frei („Sperre abgelaufen um …“).
// - Von Hand sperrt der Bot nur mit Beleg: Grund wählen, die KI sucht die Stelle im Chat (lib/sperr-beleg.ts).
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

/** Ein Feld entfernen. */
export const ohneFeld = (felder: Feld[] | undefined, name: string): Feld[] => (felder ?? []).filter((f) => f.name !== name);

// ------------------------------------------------------------------ Zeitangaben

/** Discord-Zeitangabe: Discord zeigt sie in der Uhrzeit des Lesers („21:40“, bei „R“ als „in 3 Minuten“). */
export const discordZeit = (ms: number, art: "t" | "T" | "R" = "t") => `<t:${Math.floor(ms / 1000)}:${art}>`;

/** Die erste Discord-Zeitangabe in einem Text, in Millisekunden. */
export function zeitAusTag(text: string): number | null {
  const m = text.match(/<t:(\d{9,11}):[tTdDfFR]>/);
  return m ? Number(m[1]) * 1000 : null;
}

// ------------------------------------------------------------------ Sperre an der Karte

/** Die Arten der Sperre aus dem Assistenten-Chat (wie in lib/chat-schutz.ts) und wie sie in Discord heißen. */
export type SperrArt = "menge" | "wiederholung" | "kauderwelsch" | "beleidigung";
export const SPERR_GRUND: Record<SperrArt, string> = {
  menge: "Zu viele Nachrichten",
  wiederholung: "Gleiche Nachricht zu oft",
  kauderwelsch: "Zeichensalat",
  beleidigung: "Beleidigung",
};
export const istSperrArt = (x: unknown): x is SperrArt => x === "menge" || x === "wiederholung" || x === "kauderwelsch" || x === "beleidigung";
const AUS_ASSISTENT = "(aus dem Assistenten-Chat)";

/**
 * Was der Kunde im Chat lesen soll (Davids Variante A, 23.11.2026): Die Art der Sperre. Bei der Sperre aus dem
 * Assistenten-Chat die Art von dort; sonst aus dem Grund an der Karte (Spam, Beleidigung, Drohung, Sonstiges).
 */
export type KundenArt = SperrArt | "spam" | "drohung" | "sonstiges";

export interface SperrStand {
  gesperrt: boolean;
  wert: string;
  /** Ende einer Sperre mit Uhr (aus dem Assistenten-Chat); sonst null. */
  bis: number | null;
  /** Die Uhr ist abgelaufen, an der Karte steht aber noch „Gesperrt bis …“ (muss noch vermerkt werden). */
  abgelaufen: boolean;
  /** Wie der Chat des Kunden die Sperre nennt; null, wenn nicht gesperrt. */
  art: KundenArt | null;
}

/** Woran der Chat die Art erkennt: am Text des Grunds (Sperr-Karte und Feld nennen ihn gleich). */
export function kundenArtAusWert(wert: string): KundenArt {
  for (const [art, name] of Object.entries(SPERR_GRUND) as [SperrArt, string][]) if (wert.includes(name)) return art;
  if (/Beleidigung/.test(wert)) return "beleidigung";
  if (/Nachrichten in 1 Minute|unverständliche/.test(wert)) return wert.includes("unverständliche") ? "kauderwelsch" : "menge";
  if (/-mal dieselbe Nachricht/.test(wert)) return "wiederholung";
  if (/Spam/.test(wert)) return "spam";
  if (/Drohung/.test(wert)) return "drohung";
  return "sonstiges";
}

export function sperreDerKarte(felder: Feld[] | undefined, jetzt = Date.now()): SperrStand {
  const wert = felder?.find((f) => f.name === SPERRE_FELD)?.value ?? "";
  if (!wert.startsWith(GESPERRT)) return { gesperrt: false, wert, bis: null, abgelaufen: false, art: null };
  const bis = wert.startsWith(`${GESPERRT} bis`) ? zeitAusTag(wert) : null;
  const abgelaufen = bis !== null && bis <= jetzt;
  return { gesperrt: !abgelaufen, wert, bis, abgelaufen, art: abgelaufen ? null : kundenArtAusWert(wert) };
}

export const gesperrtWert = (grund: string) => `${GESPERRT} – ${grund}`;
/** Von Hand gesperrt („🔒 Sperren“ an der Karte), seit Prompt 18 immer mit Grund. */
export const gesperrtVonWert = (wer: string, zeit: string, grund?: string) => `${GESPERRT} von ${wer} um ${zeit}${grund ? ` – ${grund}` : ""}`;
/** Entsperrt: mit der Zeit als Discord-Zeitangabe (Prompt 18b), damit der Server weiß, ob eine Sperre danach kam. */
export const entsperrtWert = (wer: string, zeit: string | number) => `Entsperrt von ${wer} um ${typeof zeit === "number" ? discordZeit(zeit) : zeit}`;
/** Wann entsperrt wurde (ms), wenn das Feld es sagt. */
export const entsperrtZeit = (wert: string) => (wert.startsWith("Entsperrt") ? zeitAusTag(wert) : null);
/** Die Sperre aus dem Assistenten-Chat geht mit ins Ticket: mit Uhr. */
export const gesperrtBisWert = (art: SperrArt, bis: number) => `${GESPERRT} bis ${discordZeit(bis)} – ${SPERR_GRUND[art]} ${AUS_ASSISTENT}`;
/** „Dauerhaft sperren“: dieselbe Sperre ohne Uhr, bis jemand entsperrt. */
export function dauerhaftWert(wert: string, wer: string, zeit: string): string {
  const grund = wert.replace(/^Gesperrt(?: bis <t:\d+:t>)? – /, "").replace(/, dauerhaft von .*$/, "");
  return `${GESPERRT} – ${grund}, dauerhaft von ${wer} um ${zeit}`;
}
export const abgelaufenWert = (bis: number) => `Sperre abgelaufen um ${discordZeit(bis)}`;

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
const UHR_ZEILE = "-# Läuft die Zeit ab, kann der Kunde wieder schreiben. „Dauerhaft sperren“ hält die Sperre ohne Uhr, bis ihr entsperrt.";

export type SperrAnlass =
  | { grund: string }
  | { von: string }
  | { von: string; grund: string; stelle: string; erklaerung?: string }
  | { assistent: SperrArt; bis: number };

/**
 * Die Sperr-Karte im Ticket: automatisch mit Grund; von Hand mit Grund, der gefundenen Stelle und „gesperrt von …“;
 * aus dem Assistenten-Chat mit Uhr („frei in 3 Minuten“, als Discord-Zeitangabe, die von selbst weiterläuft).
 */
export function sperrNachricht(anlass: SperrAnlass): string {
  if ("assistent" in anlass) return `🔒 **Gesperrt** – ${SPERR_GRUND[anlass.assistent]} ${AUS_ASSISTENT.slice(0, -1)}, frei ${discordZeit(anlass.bis, "R")})\n${UHR_ZEILE}`;
  if ("stelle" in anlass) {
    const stelle = anlass.stelle.replace(/\s+/g, " ").trim().slice(0, 200);
    const warum = anlass.erklaerung?.replace(/\s+/g, " ").trim().slice(0, 150);
    return `🔒 **Besucher gesperrt** – ${anlass.grund}, gesperrt von ${anlass.von}\n> „${stelle}“${warum ? `\n-# Erkannt von der KI: ${warum}` : ""}\n${SPERR_ZEILE}`;
  }
  const was = "grund" in anlass ? anlass.grund : `gesperrt von ${anlass.von}`;
  return `🔒 **Besucher gesperrt** – ${was}\n${SPERR_ZEILE}`;
}

export const ENTSPERREN_ID = "ticket:entsperren";
export const DAUERHAFT_ID = "ticket:dauerhaft";
export const BEENDEN_ID = "ticket:beenden";

/** Knöpfe der Sperr-Karte; mit Uhr zusätzlich „Dauerhaft sperren“. */
export function sperrKomponenten(mitUhr = false) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Entsperren", emoji: { name: "🔓" }, custom_id: ENTSPERREN_ID },
        ...(mitUhr ? [{ type: 2, style: 4, label: "Dauerhaft sperren", emoji: { name: "🔒" }, custom_id: DAUERHAFT_ID }] : []),
        { type: 2, style: 2, label: "Chat beenden", custom_id: BEENDEN_ID },
      ],
    },
  ];
}

/** Erste Zeile der Sperr-Karte, ohne die laufende Uhr („frei in …“): Die stimmt danach nicht mehr. */
const ersteZeile = (inhalt: string) => (inhalt.split("\n")[0] || "🔒 **Besucher gesperrt**").replace(/, frei <t:\d+:R>\)/, ")");

/** Nach „Entsperren“: Grund bleibt stehen, darunter wer und wann. Ohne Knöpfe. */
export function entsperrtNachricht(inhalt: string, wer: string, zeit: string | number): string {
  return `${ersteZeile(inhalt)}\n${entsperrtWert(wer, zeit)}`;
}

export function beendetNachricht(inhalt: string, wer: string, zeit: string): string {
  return `${ersteZeile(inhalt)}\nChat beendet von ${wer} um ${zeit}`;
}

/** „Dauerhaft sperren“ an der Sperr-Karte aus dem Assistenten-Chat: ohne Uhr, Knöpfe Entsperren und Chat beenden. */
export function dauerhaftNachricht(inhalt: string, wer: string, zeit: string): string {
  return `${ersteZeile(inhalt)}\nDauerhaft gesperrt von ${wer} um ${zeit}\n${SPERR_ZEILE}`;
}

/** Die Uhr ist abgelaufen: Der Kunde ist frei, die Karte sagt seit wann. Ohne Knöpfe. */
export function abgelaufenNachricht(inhalt: string, bis: number): string {
  return `${ersteZeile(inhalt)}\n${abgelaufenWert(bis)}`;
}

// ------------------------------------------------------------------ Sperren von Hand: nur mit Beleg

export const SPERR_GRUND_WAHL = "ticket:sperrgrund";
export const SPERR_GRUND_FENSTER = "ticket:sperrtext";
export const TROTZDEM_BEENDEN_ID = "ticket:trotzdembeenden";

export const HAND_GRUENDE = { beleidigung: "Beleidigung", spam: "Spam", drohung: "Drohung", sonstiges: "Sonstiges" } as const;
export type HandGrund = keyof typeof HAND_GRUENDE;
export const istHandGrund = (x: unknown): x is HandGrund => typeof x === "string" && x in HAND_GRUENDE;

/** Die Auswahl des Grunds (nur für den, der „🔒 Sperren“ gedrückt hat). */
export function grundAuswahl() {
  return {
    content: "🔒 **Warum sperren?** Danach prüft die KI den ganzen Chat des Kunden. Ohne passende Stelle wird nicht gesperrt.",
    flags: 64,
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: SPERR_GRUND_WAHL,
            placeholder: "Grund auswählen …",
            options: (Object.entries(HAND_GRUENDE) as [HandGrund, string][]).map(([value, label]) => ({
              label,
              value,
              ...(value === "sonstiges" ? { description: "Kurz beschreiben, was los ist" } : {}),
            })),
          },
        ],
      },
    ],
  };
}

/** „Sonstiges“: kurzer Text ist Pflicht. */
export function grundFenster() {
  return {
    custom_id: SPERR_GRUND_FENSTER,
    title: "Sperren: Was ist los?",
    components: [
      {
        type: 1,
        components: [{ type: 4, custom_id: "text", label: "Grund (kurz)", style: 1, required: true, min_length: 3, max_length: 100 }],
      },
    ],
  };
}

export const pruefeText = (grund: string) => `🔎 Die KI prüft den Chat auf „${grund}“ …`;
export const KEIN_BELEG = "Sperre nicht möglich: kein Grund im Chat gefunden.";
export const PRUEFUNG_AUS = "Prüfung gerade nicht möglich, versuch es gleich nochmal.";
export const MIT_BELEG_GESPERRT = "Gesperrt. Die Sperr-Karte mit der gefundenen Stelle steht im Ticket.";
export const SCHON_GESPERRT = "Der Kunde ist schon gesperrt. Entsperren geht an der Sperr-Karte im Ticket.";

/**
 * Kein Grund gefunden (Davids Entscheidung, 23.11.2026): Darunter steht „Chat trotzdem beenden“, damit das Team
 * nicht im Abschluss-Ablauf festhängt, wenn ein Kunde stört, ohne dass die KI etwas Eindeutiges findet.
 */
export function keinBelegAntwort() {
  return {
    content: `${KEIN_BELEG}\n-# Stört der Kunde trotzdem und ihr wollt nicht weiterschreiben, beendet „Chat trotzdem beenden“ den Chat ohne Sperre und ohne Abschluss-Satz. Für alles andere: weiter normal antworten.`,
    components: [{ type: 1, components: [{ type: 2, style: 2, label: "Chat trotzdem beenden", custom_id: TROTZDEM_BEENDEN_ID }] }],
  };
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

/**
 * Der Text einer Nachricht des Besuchers ohne das, was der Bot dazugeschrieben hat („🗨️ **Besucher:**“,
 * „⚠️ **Beleidigung** – “, die Zeile „Nur fürs Team“). Für die KI-Prüfungen; null, wenn es keine ist.
 */
export function besucherText(inhalt: string): string | null {
  let t = inhalt.startsWith(BELEIDIGUNG_ANFANG) ? inhalt.slice(BELEIDIGUNG_ANFANG.length) : inhalt;
  if (!t.startsWith(BESUCHER)) return null;
  t = t.slice(BESUCHER.length).replace(/\n-# Nur fürs Team:[^\n]*$/, "");
  return t.trim();
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
