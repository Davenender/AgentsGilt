// Mails des Teams an Kunden, erst nach Davids Freigabe (Etappe 2, 16.11.2026, Davids Entscheidungen):
// - Das Team sieht nach „Senden“ nur „📧 Mail geht raus“, danach „✅ Mail gesendet um …“ oder
//   „❌ Mail konnte nicht abgeschickt werden: <Grund>“. Davids Name und seine Änderungen sieht es nie.
// - Die Freigabe-Karte (in #posteingang) trägt alles, was zum Senden nötig ist: Felder und Fußzeile.
// Reine Logik ohne Netz: tests/mail-antwort.test.ts.
import type { EmbedLike } from "./discord-calls.ts";
import { escapeHtml, shell } from "./mail.ts";

export type MailOrt = "ticket" | "anfrage" | "kundenmail" | "kunde";
export type FreigabeZustand = "offen" | "gesendet" | "abgelehnt";

export interface MailAuftrag {
  ort: MailOrt;
  /** Kanal, in dem der Knopf gedrückt wurde (dort stehen die Zeilen fürs Team). */
  kanal: string;
  /** Nachricht, an der der Knopf hing (Karte, Kundenmail, Hinweis). */
  quelleId: string;
  an: string;
  betreff: string;
  /** Die Frage oder Mail des Kunden, sie steht unter der Antwort. */
  frage: string;
  /** Discord-Kennung des Schreibers. */
  autor: string;
}

export interface Freigabe extends MailAuftrag {
  zustand: FreigabeZustand;
  zeilenId: string;
  text: string;
  erinnert: boolean;
}

const STUNDE = 60 * 60 * 1000;
export const STILLE_MS = 3 * STUNDE;

export const ZEILE_RAUS = "📧 Mail geht raus";
export const zeileGesendet = (uhr: string) => `✅ Mail gesendet um ${uhr}`;
export const zeileAbgelehnt = (grund: string) => `❌ Mail konnte nicht abgeschickt werden: ${grund}`;

export const MAIL_HINWEIS = "📧 Der Kunde schreibt seit 3 Stunden nicht mehr. Ihr könnt ihm per Mail antworten.";
export const KEIN_EMAIL = "📧 Kein E-Mail-Kontakt, bitte über die Nummer in der Karte melden.";

export const GRUENDE = [
  "Inhalt passt noch nicht",
  "Preise und Angebote bitte vorher absprechen",
  "Ton passt nicht",
  "Kunde wurde schon anders erreicht",
  "Falscher Empfänger",
  "Anderer Grund",
] as const;

export const istEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

const BESUCHER = "🗨️ **Besucher:**";

/**
 * Soll im Ticket der Mail-Knopf erscheinen? Nur wenn jemand übernommen hat und der Kunde seit 3 Stunden
 * nichts mehr geschrieben hat (ohne Nachricht von ihm zählt die Karte). Steht der Knopf oder der Hinweis
 * schon da, kommt nichts mehr. Ist der Kontakt keine Mail-Adresse, gibt es einmal einen Hinweis.
 */
export function mailKnopfFaellig(
  t: { status: string; kontakt: string; kartenZeit: string; nachrichten: { zeit: string; bot: boolean; text: string }[] },
  jetzt: number,
): "knopf" | "kein-email" | null {
  if (!/^Übernommen/.test(t.status.trim())) return null;
  if (t.nachrichten.some((n) => n.bot && (n.text.startsWith(MAIL_HINWEIS) || n.text.startsWith(KEIN_EMAIL)))) return null;
  const zeiten = [t.kartenZeit, ...t.nachrichten.filter((n) => n.bot && n.text.startsWith(BESUCHER)).map((n) => n.zeit)]
    .map((z) => Date.parse(z))
    .filter((z) => !Number.isNaN(z));
  if (zeiten.length === 0 || jetzt - Math.max(...zeiten) < STILLE_MS) return null;
  return istEmail(t.kontakt) ? "knopf" : "kein-email";
}

// ------------------------------------------------------------------ Freigabe-Karte

const F_VON = "Von";
const F_AN = "An";
const F_BETREFF = "Betreff";
const F_FRAGE = "Frage des Kunden";
const F_ORT = "Ort";
const F_ERLEDIGT = "Erledigt";
const FUSS = "freigabe";
const FARBE: Record<FreigabeZustand, number> = { offen: 0xd4a23c, gesendet: 0x22c55e, abgelehnt: 0x6b7280 };
const ORTE: Record<MailOrt, string> = { ticket: "Support-Ticket", anfrage: "Anfrage", kundenmail: "Kundenmail", kunde: "Kundenkanal" };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function fuss(f: { zustand: FreigabeZustand; ort: MailOrt; kanal: string; zeilenId: string; autor: string; quelleId: string; erinnert: boolean }) {
  return [FUSS, f.zustand, f.ort, f.kanal, f.zeilenId, f.autor, f.quelleId, f.erinnert ? "1" : "0"].join("|");
}

/** Karte für David: alles, was er zum Prüfen und Senden braucht. */
export function freigabeKarte(a: MailAuftrag, text: string, zeilenId: string): EmbedLike {
  return {
    title: "📧 Mail zur Freigabe",
    description: clip(text, 4000),
    color: FARBE.offen,
    fields: [
      { name: F_VON, value: `<@${a.autor}>`, inline: true },
      { name: F_AN, value: clip(a.an, 200), inline: true },
      { name: F_ORT, value: `${ORTE[a.ort]} · <#${a.kanal}>`, inline: true },
      { name: F_BETREFF, value: clip(a.betreff || "(ohne Betreff)", 200), inline: false },
      { name: F_FRAGE, value: clip(a.frage || "–", 1000), inline: false },
    ],
    footer: { text: fuss({ zustand: "offen", ort: a.ort, kanal: a.kanal, zeilenId, autor: a.autor, quelleId: a.quelleId, erinnert: false }) },
  };
}

const feld = (e: EmbedLike, name: string) => e.fields?.find((f) => f.name === name)?.value ?? "";

export function leseFreigabe(e: EmbedLike | null | undefined): Freigabe | null {
  const teile = e?.footer?.text?.split("|") ?? [];
  if (!e || teile[0] !== FUSS || teile.length < 8) return null;
  const [, zustand, ort, kanal, zeilenId, autor, quelleId, erinnert] = teile;
  if (!["offen", "gesendet", "abgelehnt"].includes(zustand) || !(ort in ORTE)) return null;
  const betreff = feld(e, F_BETREFF);
  const frage = feld(e, F_FRAGE);
  return {
    zustand: zustand as FreigabeZustand,
    ort: ort as MailOrt,
    kanal,
    zeilenId,
    autor,
    quelleId,
    erinnert: erinnert === "1",
    an: feld(e, F_AN),
    betreff: betreff === "(ohne Betreff)" ? "" : betreff,
    frage: frage === "–" ? "" : frage,
    text: e.description ?? "",
  };
}

/** Karte nach dem Senden oder Ablehnen: andere Farbe, Zeile „Erledigt“, keine Knöpfe mehr. */
export function mitZustand(e: EmbedLike, zustand: "gesendet" | "abgelehnt", notiz: string): EmbedLike {
  const f = leseFreigabe(e);
  if (!f) return e;
  return {
    ...e,
    title: zustand === "gesendet" ? "📧 Mail gesendet" : "📧 Mail nicht gesendet",
    color: FARBE[zustand],
    fields: [...(e.fields ?? []).filter((x) => x.name !== F_ERLEDIGT), { name: F_ERLEDIGT, value: clip(notiz, 1000), inline: false }],
    footer: { text: fuss({ ...f, zustand }) },
  };
}

/** Merkt, dass David schon an diese Freigabe erinnert wurde. */
export function mitErinnert(e: EmbedLike): EmbedLike {
  const f = leseFreigabe(e);
  return f ? { ...e, footer: { text: fuss({ ...f, erinnert: true }) } } : e;
}

/** Neuer Text (David hat geändert): bleibt offen, bis er sendet. */
export const mitText = (e: EmbedLike, text: string): EmbedLike => ({ ...e, description: clip(text, 4000) });

export function freigabeKnoepfe(zustand: FreigabeZustand) {
  if (zustand !== "offen") return [];
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: "Senden", emoji: { name: "✅" }, custom_id: "mail:ok" },
        { type: 2, style: 2, label: "Ändern", emoji: { name: "✏️" }, custom_id: "mail:aendern" },
        { type: 2, style: 4, label: "Nicht senden", emoji: { name: "❌" }, custom_id: "mail:nein" },
      ],
    },
  ];
}

// ------------------------------------------------------------------ Mail selbst

/** Inhalt der Mail im Design der Bestätigungsmails: die Antwort, darunter grau die Nachricht des Kunden. */
export function mailInhalt(text: string, frage: string): { html: string; text: string } {
  const absaetze = text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 14px;">${escapeHtml(p.trim()).replace(/\n/g, "<br />")}</p>`)
    .join("");
  const f = frage.trim().slice(0, 1000);
  const zitat = f
    ? `<div style="margin-top:22px;padding:14px 16px;background:#f7f5ef;border-radius:10px;border:1px solid #efece4;">` +
      `<div style="font-size:12px;color:#8a8579;margin-bottom:6px;">Deine Nachricht:</div>` +
      `<div style="font-size:14px;line-height:1.5;color:#3a3d45;">${escapeHtml(f).replace(/\n/g, "<br />")}</div></div>`
    : "";
  return {
    html: shell("Antwort von Agents Gilt", absaetze + zitat),
    text: f ? `${text.trim()}\n\n— Deine Nachricht —\n${f}` : text.trim(),
  };
}
