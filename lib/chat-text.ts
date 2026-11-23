// Chat der Website: reine Regeln für Texte, ohne Browser und ohne React.
//
// Der erste Teil ist unverändert aus components/ChatWidget.tsx übernommen (Marker des
// Assistenten, Verlauf für die KI). Der zweite Teil gehört zum Fenster der neuen Seite
// (components/neu/chat): Wörter für das Entschlüsseln, Links und Telefonnummern in Antworten.
// Tests: tests/chat-text.test.ts.
import type { PrefillContactDetail } from "./events";
import { erkenneAnliegen } from "./support-anruf.ts";

export interface Message {
  // "team" sind Antworten eines Mitarbeiters aus dem Support-Chat.
  role: "user" | "assistant" | "team";
  content: string;
  von?: string;
  // Gehört nicht ins Gespräch mit dem KI-Assistenten (Support-Chat, Hinweise).
  // Sonst glaubt er z.B., die Übergabe an einen Mitarbeiter laufe noch.
  noAi?: boolean;
  // Was der Assistent unter dieser Antwort anbietet (aus seinen Markern, seit 14.11.2026):
  // die Anruf-Karte bzw. den Knopf zum Mitarbeiter. Angezeigt wird es unter der Nachricht.
  anrufen?: boolean;
  mitarbeiter?: boolean;
  // Chat-Schutz (Prompt 17): Nachrichten an das Team gehen gebündelt (paket); kam ein Bündel nicht an,
  // steht darunter „nicht angekommen · Nochmal senden“ (status). Ein Hinweis („Bitte bleib freundlich.“)
  // steht als ruhige Zeile im Verlauf, nicht als Antwort.
  paket?: string;
  status?: "fehlt" | "sendet";
  hinweis?: boolean;
}

// Ein laufender Support-Chat: der Schlüssel des Tickets und die letzte Nachricht,
// die der Besucher schon gesehen hat.
export interface Ticket {
  token: string;
  after: string;
  nummer: string;
  closed?: boolean;
}

/** Der Verlauf, den der KI-Assistent sehen darf. */
export function aiHistory(messages: Message[]) {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m.noAi)
    .map((m) => ({ role: m.role, content: m.content }));
}

// Verlangt der Besucher ausdrücklich einen Menschen, zeigen wir den Knopf
// sofort, auch falls der Assistent den Marker vergisst.
export const WANTS_HUMAN = /mitarbeiter|mensch|echte[nr]? person|jemand(en)? vom team|support/i;

export const KONTAKT_MARKER = "[KONTAKT]";
// Der Assistent setzt ihn bei Terminen: Unter der Antwort erscheint der Weg zum Anrufen
// (am Telefon macht der KI-Telefonassistent direkt einen Termin aus).
export const ANRUFEN_MARKER = "[ANRUFEN]";
// Der Assistent setzt ihn, wenn er nicht weiterkommt (Preis, Sonderwunsch,
// Beschwerde) oder der Besucher einen Menschen verlangt.
export const MITARBEITER_MARKER = "[MITARBEITER]";
// Der Assistent hängt hier Angaben an, die der Besucher im Gespräch genannt
// hat. Sie werden nie angezeigt, sondern nur ins Kontaktformular übernommen.
export const DATEN_REGEX = /\[DATEN\]([\s\S]*?)\[\/DATEN\]/;

export const GREETING: Message = {
  role: "assistant",
  content:
    "Hey! Ich bin der KI-Assistent von Agents Gilt. Bei Fragen zu unseren Leistungen helfe ich dir gern weiter!",
};

// Einstiegsfragen. Vor einem leeren Eingabefeld zu sitzen ist die größte
// Hürde — ein Klick ist leichter als ein erster Satz.
//
// Bewusst nur Fragen, die der Assistent aus seinem Wissen wirklich beantworten
// kann und bei denen sich eine Rückfrage anbietet. Nach dem Preis wird hier
// nicht gefragt: Darauf darf er keine Zahl nennen, das wäre eine Sackgasse
// direkt zu Beginn.
export const STARTER_QUESTIONS = [
  "Was macht ihr genau?",
  "Wie läuft die Zusammenarbeit ab?",
  "Was braucht ihr von mir?",
];

/**
 * Entfernt die Steuer-Marker aus dem Antworttext. Läuft auch währenddessen
 * beim Streamen, wo ein Marker erst halb angekommen sein kann ("[DAT",
 * "[DATEN]{\"na") — der Besucher soll davon nie ein Zeichen sehen.
 */
export function stripMarkers(text: string): string {
  let out = text
    .replace(DATEN_REGEX, "")
    .replace(KONTAKT_MARKER, "")
    .replace(ANRUFEN_MARKER, "")
    .replace(MITARBEITER_MARKER, "");

  // Angefangener Daten-Block: alles ab dort abschneiden.
  const datenStart = out.indexOf("[DATEN]");
  if (datenStart !== -1) out = out.slice(0, datenStart);

  // Angefangene eckige Klammer am Ende (z.B. "[KONT") – die gehört zu einem
  // Marker, der gleich vollständig wird.
  const lastOpen = out.lastIndexOf("[");
  if (lastOpen !== -1 && !out.slice(lastOpen).includes("]")) {
    out = out.slice(0, lastOpen);
  }

  return out.trimEnd();
}

/**
 * Liest die Angaben aus dem [DATEN]-Marker. Der Inhalt kommt aus einem
 * Sprachmodell, ist also nicht garantiert gültiges JSON — deshalb still
 * scheitern statt den Chat abbrechen.
 */
export function parseDaten(text: string): PrefillContactDetail | null {
  const match = text.match(DATEN_REGEX);
  if (!match) return null;
  try {
    const raw: unknown = JSON.parse(match[1].trim());
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const out: PrefillContactDetail = {};
    for (const key of [
      "name",
      "email",
      "company",
      "service",
      "message",
    ] as const) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        out[key] = value.trim().slice(0, 500);
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Was der Assistent mit seinen Markern unter einer Antwort anbietet. `mitarbeiter` gilt auch,
 * wenn der Besucher ausdrücklich einen Menschen verlangt hat (falls der Assistent den Marker
 * vergisst) und beim älteren Marker [KONTAKT]. `anrufen` gilt auch, wenn der Besucher nach dem
 * Preis, einem Erstgespräch, einem Termin oder einem Gespräch fragt (dieselbe Erkennung wie im
 * Support-Chat, lib/support-anruf.ts): Dann soll daraus über den Telefon-Assistenten ein Termin werden.
 */
export function angebote(antwort: string, frage: string): { anrufen: boolean; mitarbeiter: boolean } {
  return {
    anrufen: antwort.includes(ANRUFEN_MARKER) || erkenneAnliegen(frage) !== null,
    mitarbeiter: antwort.includes(KONTAKT_MARKER) || antwort.includes(MITARBEITER_MARKER) || WANTS_HUMAN.test(frage),
  };
}

// ───────────── Für das Fenster der neuen Seite ─────────────

/** Die Zufallszeichen, aus denen sich Antworten entschlüsseln (in JetBrains Mono). */
export const CHAT_ZEICHEN = ["▓", "#", "%", "=", "▒", "+", ":", "/"];

export type Wort = { text: string; leer: boolean };

/** Zerlegt einen Text in Wörter und die Leerräume dazwischen (Zeilenumbrüche bleiben erhalten). */
export function woerter(text: string): Wort[] {
  const teile = text.match(/\s+|\S+/g) ?? [];
  return teile.map((t) => ({ text: t, leer: /^\s+$/.test(t) }));
}

/**
 * Die Welle, in der sich eine Antwort entschlüsselt (alle Zeiten in Millisekunden):
 * Die Wörter tauchen nacheinander als Zufallszeichen auf (`takt` Abstand), jedes bleibt
 * `zeichenzeit` lang Zeichen und rastet dann ein. So läuft die Welle des Einrastens der Welle der
 * Zeichen mit festem Abstand hinterher. `gesamt`: wann das letzte Wort eingerastet ist.
 *
 * Gewöhnlich: Jedes Wort bleibt 0,6 s Zeichen. Eine kurze Antwort steht nach etwa 2 s, eine
 * normale nach 2,5 bis 3 s, keine braucht länger als 3,5 s: Bei langen Antworten wird der Takt
 * schneller, die Zeichenzeit bleibt. Ganz kurze Texte (ein paar Wörter) sind früher fertig, damit
 * nicht ein Wort eine Sekunde allein dasteht.
 * `zuegig` (die Zusammenfassung im Formular): alles in etwa 1 s.
 */
export function wellenPlan(anzahl: number, zuegig = false): { takt: number; zeichenzeit: number; gesamt: number } {
  const zeichenzeit = zuegig ? 320 : 600;
  const n = Math.max(1, anzahl);
  const ziel = zuegig ? 1000 : Math.max(2000, Math.min(3500, 1700 + 28 * n));
  const takt = n === 1 ? 0 : Math.min(zuegig ? 60 : 120, (ziel - zeichenzeit) / (n - 1));
  return { takt, zeichenzeit, gesamt: Math.round((n - 1) * takt + zeichenzeit) };
}

/** So oft wechseln die Zufallszeichen eines Wortes (Millisekunden): ruhig, nicht hektisch. */
export const ZEICHEN_WECHSEL = 80;

export type ReichTeil =
  | { art: "text"; text: string }
  | { art: "tel"; text: string; href: string }
  | { art: "mail"; text: string; href: string }
  | { art: "netz"; text: string; href: string };

// Telefonnummer: +49 … oder 0…, mit Leerzeichen, Bindestrichen oder Schrägstrich, mindestens 7 Ziffern.
const TEL = /(?:\+\d{2}|\b0)\d?(?:[ \-/]?\d){6,14}/;
const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// Adressen im Netz: mit https:// oder als „name.de/…“ (nur gängige Endungen, damit kein Satzende
// wie „Website.Dann“ zum Link wird).
const NETZ = /(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|de|net|org|io|eu|info)(?:\/[^\s<>"']*)?/;
const ALLE = new RegExp(`(${MAIL.source})|(${TEL.source})|(${NETZ.source})`, "g");

/**
 * Teilt den Text einer Antwort in gewöhnlichen Text, Telefonnummern (als `tel:`-Verweis),
 * E-Mail-Adressen und Adressen im Netz. Satzzeichen am Ende gehören zum Text.
 */
export function reichTeile(text: string): ReichTeil[] {
  const teile: ReichTeil[] = [];
  let ab = 0;
  const schieb = (t: string) => {
    if (!t) return;
    const letzter = teile[teile.length - 1];
    if (letzter?.art === "text") letzter.text += t;
    else teile.push({ art: "text", text: t });
  };
  for (const m of text.matchAll(ALLE)) {
    let treffer = m[0];
    const start = m.index ?? 0;
    // Satzzeichen am Ende gehören nicht zur Adresse oder Nummer.
    const ende = treffer.match(/[.,;:!?)]+$/);
    if (ende) treffer = treffer.slice(0, -ende[0].length);
    schieb(text.slice(ab, start));
    if (m[1]) teile.push({ art: "mail", text: treffer, href: `mailto:${treffer}` });
    else if (m[2]) {
      const ziffern = treffer.replace(/[^\d+]/g, "");
      // Zu kurz für eine Telefonnummer (etwa eine Jahreszahl mit Vorwahl-Null): gewöhnlicher Text.
      if (ziffern.replace(/\D/g, "").length < 7) schieb(treffer);
      else teile.push({ art: "tel", text: treffer.trim(), href: `tel:${ziffern}` });
    } else teile.push({ art: "netz", text: treffer, href: /^https?:\/\//.test(treffer) ? treffer : `https://${treffer}` });
    ab = start + treffer.length;
  }
  schieb(text.slice(ab));
  return teile;
}
