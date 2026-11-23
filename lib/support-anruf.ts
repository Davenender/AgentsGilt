// Anruf anbieten im Support-Chat (Feinschliff-Runde 1, 16.11.2026). Reine Regeln ohne Netz und
// ohne React, damit sie Server (Discord, /api/support) und Chat gleichermaßen nutzen und die Tests
// sie direkt prüfen können (tests/support-anruf.test.ts).
//
// Ablauf: An der Ticket-Karte in Discord steht „Anruf anbieten“. Ein Klick öffnet ein Fenster mit
// einem fertigen Satz an den Kunden, der zur Lage passt; das Team kann ihn ändern. Abgeschickt
// steht er im Ticket mit einer kleinen Zeile darunter (ANRUF_ZEILE). Daran erkennt die Weitergabe
// an die Website (lib/support.ts), dass der Kunde unter der Nachricht die Anruf-Karte sieht.
// Schreibt der Kunde, dass er sprechen, einen Termin, ein Erstgespräch oder einen Preis möchte,
// schreibt der Bot einen Hinweis nur fürs Team mit demselben Knopf. Beim Kunden erscheint nichts,
// solange niemand aus dem Team klickt.
//
// Seit Prompt 18 (23.11.2026) entscheidet das die KI (lib/chat-beleidigung.ts, pruefeTicket), und nur an dem,
// was der Kunde NACH dem Wechsel zum Team schreibt. Die Muster unten (erkenneAnliegen) nutzt noch der
// Assistent auf der Website für seine Anruf-Karte (lib/chat-text.ts); im Ticket gibt es ohne KI keinen Hinweis.

export type Anliegen = "erstgespraech" | "termin" | "preis" | "sprechen";

/**
 * Woran wir erkennen, was der Kunde möchte. Reihenfolge = Vorrang („Was kostet ein Erstgespräch?“
 * ist ein Erstgespräch). Bewusst eng gefasst: Fragen nach unserem Produkt („Kann euer
 * Telefon-Assistent Anrufe annehmen?“) sollen keinen Hinweis auslösen.
 */
const MUSTER: [Anliegen, RegExp][] = [
  ["erstgespraech", /erst[\s-]?gespr(?:ä|ae)ch|kennenlern|kennen\s?zu\s?lernen/i],
  // Nicht bei unserer Leistung „Online-Terminbuchung“ und Verwandtem (Fragen zum Produkt).
  ["termin", /\btermin(?!buch|verwalt|system|erinner|vergabe|planung|kalender|-?tool|software|manag)/i],
  [
    "preis",
    /preis|\bkostet\b|\bkosten\b|was (?:zahl|bezahl|nehmt|verlangt)|\bbudget\b|\bteuer|kostenvoranschlag|\bein angebot\b|angebot (?:für|machen|erstellen|schicken|bekommen|haben)|\d\s?(?:€|euro\b)/i,
  ],
  [
    "sprechen",
    /\btelefonier|\b(?:sprechen|reden)\b|r(?:ü|ue)ckruf|ruf(?:t|en)? (?:mich|uns) (?:mal |kurz |bitte )?an\b|(?:euch|dich|jemanden) (?:mal |kurz )?anrufen|gespr(?:ä|ae)ch/i,
  ],
];

/** Was der Kunde in diesem Text möchte, oder null. */
export function erkenneAnliegen(text: string): Anliegen | null {
  const t = text.normalize("NFC");
  for (const [anliegen, muster] of MUSTER) if (muster.test(t)) return anliegen;
  return null;
}

/** Der Hinweis im Ticket, nur fürs Team (ohne 💬 davor, darum geht er nie an den Kunden). */
export const HINWEIS_ANFANG = "📞 **Der Kunde";
const HINWEIS_LAGE: Record<Anliegen, string> = {
  sprechen: "Der Kunde möchte sprechen.",
  erstgespraech: "Der Kunde möchte ein Erstgespräch.",
  termin: "Der Kunde möchte einen Termin.",
  preis: "Der Kunde fragt nach dem Preis.",
};
export function hinweisText(anliegen: Anliegen): string {
  return `📞 **${HINWEIS_LAGE[anliegen]}** Anruf anbieten?\n-# Nur fürs Team, der Kunde sieht das nicht. Erst nach dem Klick bekommt er eine Nachricht.`;
}

/** Der fertige Satz an den Kunden: kurz, im Du, ohne Emoji, mit dem Telefon-Assistenten. */
const SAETZE: Record<Anliegen | "allgemein", string> = {
  preis:
    "Den genauen Preis legen wir am besten in einem kurzen Gespräch fest, dann passt er genau zu dir. Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen Termin ein.",
  erstgespraech:
    "Sehr gern! Ruf uns für das Erstgespräch einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen passenden Termin ein.",
  termin: "Gern! Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und findet mit dir direkt einen passenden Termin.",
  sprechen:
    "Klar, lass uns sprechen! Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen Termin ein, an dem wir uns Zeit für dich nehmen.",
  allgemein:
    "Am besten besprechen wir das kurz am Telefon. Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen Termin ein.",
};
export function angebotsSatz(anliegen: Anliegen | null): string {
  return SAETZE[anliegen ?? "allgemein"];
}

/**
 * Die kleine Zeile unter der Nachricht im Ticket (Discord zeigt „-#“ als graue Kleinschrift).
 * Steht sie da, sieht der Kunde unter der Nachricht die Anruf-Karte mit „Jetzt anrufen“.
 */
export const ANRUF_ZEILE = "-# 📞 Darunter sieht der Kunde die Anruf-Karte mit „Jetzt anrufen“.";
export function mitAnrufZeile(text: string): string {
  return `${text.trim()}\n${ANRUF_ZEILE}`;
}
export function trenneAnrufZeile(text: string): { text: string; anrufen: boolean } {
  const i = text.lastIndexOf(ANRUF_ZEILE);
  if (i === -1) return { text, anrufen: false };
  return { text: (text.slice(0, i) + text.slice(i + ANRUF_ZEILE.length)).trim(), anrufen: true };
}

/**
 * Liest eine Nachricht des Bots an den Kunden (ohne das 💬 davor): „**David:** Text“ oder
 * „**David** Text“ → Absender und Text; ohne Namen ist der Absender „Agents Gilt“. Steht die kleine
 * Zeile darunter, zeigt der Chat die Anruf-Karte. (Bis Runde 1 blieb der Doppelpunkt am Namen hängen.)
 */
export function leseKundenNachricht(inhalt: string): { von: string; text: string; anrufen: boolean } {
  const { text: body, anrufen } = trenneAnrufZeile(inhalt.trim());
  const named = body.match(/^\*\*(.+?)\*\*:?\s*([\s\S]*)$/);
  if (named && named[2]) return { von: named[1].replace(/:\s*$/, "").trim(), text: named[2].trim(), anrufen };
  return { von: "Agents Gilt", text: body.replace(/\*\*/g, ""), anrufen };
}

/** Steht in den letzten Nachrichten schon ein offener Hinweis oder ein Angebot? Dann kein neuer Hinweis. */
export function hinweisNoetig(letzte: { content?: string; author?: { bot?: boolean }; components?: unknown[] }[]): boolean {
  return !letzte.some(
    (m) =>
      m.author?.bot &&
      ((m.content?.startsWith(HINWEIS_ANFANG) && (m.components?.length ?? 0) > 0) || m.content?.includes(ANRUF_ZEILE)),
  );
}

// Bis Prompt 18 wählte der Knopf an der Karte den Satz nach Frage und „Chat davor“ (anliegenDerKarte). Seit dem
// 23.11.2026 zählt der Verlauf aus dem Assistenten-Chat nicht mehr: Der Knopf an der Karte nimmt den allgemeinen
// Satz, der Knopf am Hinweis den Satz zum erkannten Anliegen.

// ------------------------------------------------------------------ Knöpfe und Fenster

const ANLIEGEN: Anliegen[] = ["erstgespraech", "termin", "preis", "sprechen"];
const istAnliegen = (s: string): s is Anliegen => (ANLIEGEN as string[]).includes(s);

/** Der Knopf „Anruf anbieten“. Am Hinweis steht das erkannte Anliegen in der Kennung. */
function anrufKnopf(anliegen?: Anliegen) {
  return { type: 2, style: 1, label: "Anruf anbieten", emoji: { name: "📞" }, custom_id: anliegen ? `ticket:call:${anliegen}` : "ticket:call" };
}

/**
 * Die Knöpfe der Ticket-Karte: offen „Übernehmen“, „Anruf anbieten“, „Schnellantwort“, „Sperren“,
 * „Ticket schließen“ (mehr als fünf gehen in Discord nicht in eine Reihe); übernommen ohne „Übernehmen“.
 * Schnellantwort und Sperren seit Prompt 17 (23.11.2026, lib/support-sperre.ts).
 */
export function ticketComponents(state: "open" | "claimed" | "closed") {
  const button = (label: string, id: string, style: 1 | 2 | 3 | 4, emoji?: string) => ({
    type: 2,
    label,
    style,
    ...(emoji ? { emoji: { name: emoji } } : {}),
    custom_id: `ticket:${id}`,
  });
  if (state === "closed") return [];
  const schnell = button("Schnellantwort", "schnell", 2, "💬");
  const sperren = button("Sperren", "sperren", 4, "🔒");
  return [
    {
      type: 1,
      components:
        state === "open"
          ? [button("Übernehmen", "claim", 3), anrufKnopf(), schnell, sperren, button("Ticket schließen", "close", 2)]
          : [anrufKnopf(), schnell, sperren, button("Ticket schließen", "close", 2)],
    },
  ];
}

export function hinweisKomponenten(anliegen: Anliegen) {
  return [{ type: 1, components: [anrufKnopf(anliegen)] }];
}

/** Liest die Kennung eines Klicks auf „Anruf anbieten“: woher (Karte oder Hinweis) und welches Anliegen. */
export function leseAnrufKnopf(customId: string): { quelle: "karte" | "hinweis"; anliegen: Anliegen | null } | null {
  if (customId === "ticket:call") return { quelle: "karte", anliegen: null };
  const m = customId.match(/^ticket:call:([a-z]+)$/);
  return m && istAnliegen(m[1]) ? { quelle: "hinweis", anliegen: m[1] } : null;
}

export const ANRUF_FENSTER = "ticket:callsend:";

/** Das Fenster mit dem fertigen Satz (Discord-Modal). Der Satz steht schon drin und lässt sich ändern. */
export function anrufFenster(quelle: "karte" | "hinweis", anliegen: Anliegen | null) {
  return {
    custom_id: `${ANRUF_FENSTER}${quelle}`,
    title: "Anruf anbieten",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "text",
            label: "Nachricht an den Kunden (änderbar)",
            style: 2,
            required: true,
            min_length: 10,
            max_length: 1000,
            value: angebotsSatz(anliegen),
          },
        ],
      },
    ],
  };
}
