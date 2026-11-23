// Chat-Schutz (Prompt 17, 23.11.2026): Spam-Sperre für den Chat der Website. Reine Regeln ohne Netz und
// ohne React, damit Browser (components/chat/useChat.ts), Server (/api/chat, /api/support) und Tests
// (tests/chat-schutz.test.ts) dieselben Regeln benutzen.
//
// Spam ist eins von dreien:
// 1. zu viele Nachrichten in 60 s (Chatbot mehr als 8, Ticket mehr als 10),
// 2. dreimal hintereinander dieselbe oder fast dieselbe Nachricht,
// 3. vier unverständliche Nachrichten in 60 s („asdfasdf“).
// Zwei Zusätze, damit normales Schreiben nie sperrt (Regeln angepasst, siehe docs/funktionen.md):
// Sehr kurze Wiederholungen („ja“, „ok“) zählen nur innerhalb von 20 s, und die drei gleichen
// Nachrichten müssen innerhalb von 2 Minuten kommen (wer nach zwei Antworten des Assistenten noch einmal
// „Danke“ schreibt, ist kein Spammer).
//
// Der Chatbot sperrt 5 Minuten (Restzeit im Browser, der Server sperrt dieselbe Adresse mit), das
// Support-Ticket sperrt, bis das Team in Discord entsperrt (Stand an der Ticket-Karte, lib/support.ts).
// Kein Redis und keine Datenbank: Der Server merkt sich alles nur im Speicher seiner Instanz.
import { CHAT_DAUER_MS, type Speicher } from "./chat-speicher.ts";

export interface Eintrag {
  zeit: number;
  text: string;
}

export interface SpamRegeln {
  /** Mehr als so viele Nachrichten in 60 s sind Spam. */
  maxProMinute: number;
  /** Drei gleiche Nachrichten zählen nur, wenn sie innerhalb dieser Zeit kommen (ms). */
  wiederholungMs: number;
}

// Im Support-Chat wartet der Kunde oft auf das Team und fragt zwischendurch „Hallo?“: Dort zählen drei
// gleiche Nachrichten nur innerhalb von 30 s (Spam kommt in Sekunden), beim Assistenten innerhalb von 2 Minuten.
export const REGELN_CHATBOT: SpamRegeln = { maxProMinute: 8, wiederholungMs: 2 * 60_000 };
export const REGELN_TICKET: SpamRegeln = { maxProMinute: 10, wiederholungMs: 30_000 };

export const MINUTE_MS = 60_000;
/** Drei gleiche Nachrichten zählen nur, wenn sie innerhalb von 2 Minuten kommen. */
export const WIEDERHOLUNG_FENSTER_MS = 2 * MINUTE_MS;
/** Sehr kurze Nachrichten („ja“, „ok“) gelten nur innerhalb von 20 s als Wiederholung. */
export const KURZ_FENSTER_MS = 20_000;
export const WIEDERHOLUNGEN = 3;
export const KAUDERWELSCH_GRENZE = 4;
/** So lange sperrt der Chatbot. */
export const SPERRE_CHATBOT_MS = 5 * MINUTE_MS;
/** Was der Besucher im Support-Chat innerhalb von 3 s schreibt, geht als eine Nachricht nach Discord. */
export const BUENDEL_MS = 3000;
/** So lange steht „Du kannst wieder schreiben.“ über dem Eingabefeld. */
export const WIEDER_FREI_MS = 6000;

export type SpamArt = "menge" | "wiederholung" | "kauderwelsch" | "beleidigung";
export interface SpamTreffer {
  art: Exclude<SpamArt, "beleidigung">;
  anzahl: number;
  /** Kurz, steht so in der Sperr-Karte in Discord („12 Nachrichten in 1 Minute“). */
  grund: string;
}

// ------------------------------------------------------------------ gleich und fast gleich

/** Vergleichsform: klein, ohne Satzzeichen und Leerraum, doppelte Buchstaben einfach („Hallooo!!“ = „hallo“). */
export function vergleichsForm(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .replace(/(.)\1+/gu, "$1");
}

function abstand(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let vorher = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const jetzt = [i];
    for (let j = 1; j <= y.length; j++) {
      jetzt[j] = Math.min(vorher[j] + 1, jetzt[j - 1] + 1, vorher[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    vorher = jetzt;
  }
  return vorher[y.length];
}

/** Gleich oder fast gleich: bis auf Satzzeichen, Groß- und Kleinschreibung und einen Tippfehler je fünf Zeichen. */
export function fastGleich(a: string, b: string): boolean {
  // Lange Nachrichten: die ersten 400 Zeichen reichen zum Vergleich (sonst rechnet ein großes Bündel ewig).
  const x = vergleichsForm(a.slice(0, 600)).slice(0, 400);
  const y = vergleichsForm(b.slice(0, 600)).slice(0, 400);
  // Nur Emojis oder Zeichen: dann zählt der Text selbst.
  if (!x || !y) return !x && !y && a.trim() === b.trim() && a.trim() !== "";
  if (x === y) return true;
  // Andere Zahlen sind eine andere Nachricht („2 Standorte“ und „3 Standorte“).
  const zahlen = (t: string) => (t.match(/\d+/g) ?? []).join(",");
  if (zahlen(a) !== zahlen(b)) return false;
  const lx = [...x].length;
  const ly = [...y].length;
  const laenge = Math.max(lx, ly);
  if (laenge < 6) return false;
  // Schon der Längenunterschied ist zu groß: gar nicht erst rechnen.
  if (Math.abs(lx - ly) / laenge > 0.2) return false;
  return abstand(x, y) / laenge <= 0.2;
}

// ------------------------------------------------------------------ Kauderwelsch

const VOKAL = /[aeiouyäöü]/;
const TASTEN_REIHEN = ["qwertzuiopü", "asdfghjklöä", "yxcvbnm"];
// Buchstabenpaare, die es in deutschen (und englischen) Wörtern praktisch nicht gibt.
const UNMOEGLICH = new Set(
  (
    "bx cj cv cx dx fq fx gj gq gx hj hx jb jc jd jf jg jh jk jl jm jn jp jq jr js jt jv jw jx jy jz kj kq kx " +
    "mx pq px qb qc qd qf qg qh qj qk ql qm qn qp qr qs qt qv qw qx qy qz sx tq tx vb vc vf vg vh vj vk vm vn " +
    "vp vq vt vw vx vz wq wx xb xd xf xg xj xk xm xn xq xr xv xw xz yq zj zq zx"
  ).split(" "),
);
// Lachen und Singen („hahaha“, „lalala“, „lolol“): eine Silbe aus Mitlaut und Selbstlaut, wiederholt.
const SILBE = /^([^aeiouyäöü])([aeiouyäöü])(?:\1\2)+\1?$/;

/** Vier Tasten nebeneinander („asdf“, „jklö“), in der oberen Reihe fünf („qwert“; „Wert“ ist ein Wort). */
function tastenfolge(wort: string): boolean {
  return TASTEN_REIHEN.some((reihe, i) => {
    const laenge = i === 0 ? 5 : 4;
    return [reihe, [...reihe].reverse().join("")].some((r) => {
      for (let k = 0; k + laenge <= r.length; k++) if (wort.includes(r.slice(k, k + laenge))) return true;
      return false;
    });
  });
}

/** Ein kurzes Stück immer wieder („asdasdasd“, „jkjkjk“). */
function wiederholtesStueck(wort: string): boolean {
  for (let n = 2; n <= 4; n++) {
    if (wort.length < n * 2 || wort.length < 6) continue;
    const stueck = wort.slice(0, n);
    if (stueck.repeat(Math.ceil(wort.length / n)).slice(0, wort.length) !== wort) continue;
    // Mit Selbstlaut erst ab drei Wiederholungen („tamtam“ ist ein Wort, „asdasdasd“ nicht).
    if (!VOKAL.test(stueck) || wort.length >= n * 3) return true;
  }
  return false;
}

function wortIstKauderwelsch(roh: string): boolean {
  // Links, Adressen, Zahlen und Abkürzungen mit Zeichen prüfen wir nicht.
  if (/[0-9@/:._#]/.test(roh)) return false;
  const wort = roh.toLowerCase().replace(/[^a-zäöüß]/g, "");
  if (wort.length < 4) return false;
  if (SILBE.test(wort)) return false;
  const einfach = wort.replace(/(.)\1+/g, "$1");
  if (tastenfolge(wort)) return true;
  if (wiederholtesStueck(wort)) return true;
  if (einfach.length >= 5 && !VOKAL.test(einfach)) return true;
  let paare = 0;
  for (let i = 0; i + 1 < wort.length; i++) if (UNMOEGLICH.has(wort.slice(i, i + 2))) paare++;
  if (paare >= 2) return true;
  // Nur Tasten der mittleren Reihe, sechs und mehr („asdkjfh“).
  return wort.length >= 6 && /^[asdfghjklöä]+$/.test(wort);
}

/** Unverständlich: mindestens die Hälfte der Wörter (ab drei Buchstaben) ist Tastengewirr. */
export function istKauderwelsch(text: string): boolean {
  const woerter = text
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((w) => w.length >= 3);
  if (woerter.length === 0) return false;
  const wirr = woerter.filter(wortIstKauderwelsch).length;
  return wirr > 0 && wirr * 2 >= woerter.length;
}

// ------------------------------------------------------------------ die Prüfung

/** Der Grund für die Sperr-Karte, aus Art und Anzahl (auch, wenn der Browser die Sperre meldet). */
export function grundText(art: Exclude<SpamArt, "beleidigung">, anzahl: number): string {
  if (art === "menge") return `${anzahl} Nachrichten in 1 Minute`;
  if (art === "wiederholung") return `${anzahl}-mal dieselbe Nachricht`;
  return `${anzahl} unverständliche Nachrichten in 1 Minute`;
}

/**
 * Wäre die neue Nachricht Spam? `vorher` sind die bisherigen Nachrichten desselben Chats (älteste zuerst).
 * `spielraumMs` verkürzt die Zeitfenster auf dem Server: Dort kommen gebündelte Nachrichten bis zu 3 s
 * später an als getippt, der Server soll aber nie strenger zählen als der Browser.
 */
export function pruefeSpam(vorher: Eintrag[], neu: Eintrag, regeln: SpamRegeln, spielraumMs = 0): SpamTreffer | null {
  const minute = vorher.filter((e) => neu.zeit - e.zeit < MINUTE_MS - spielraumMs);
  const anzahl = minute.length + 1;
  if (anzahl > regeln.maxProMinute) return { art: "menge", anzahl, grund: grundText("menge", anzahl) };

  const letzte = vorher.slice(-(WIEDERHOLUNGEN - 1));
  if (letzte.length === WIEDERHOLUNGEN - 1 && letzte.every((e) => fastGleich(e.text, neu.text))) {
    const kurz = [...vergleichsForm(neu.text)].length < 4;
    const fenster = (kurz ? Math.min(KURZ_FENSTER_MS, regeln.wiederholungMs) : regeln.wiederholungMs) - spielraumMs;
    if (neu.zeit - letzte[0].zeit < fenster) return { art: "wiederholung", anzahl: WIEDERHOLUNGEN, grund: grundText("wiederholung", WIEDERHOLUNGEN) };
  }

  if (istKauderwelsch(neu.text)) {
    const wirr = minute.filter((e) => istKauderwelsch(e.text)).length + 1;
    if (wirr >= KAUDERWELSCH_GRENZE) return { art: "kauderwelsch", anzahl: wirr, grund: grundText("kauderwelsch", wirr) };
  }
  return null;
}

/** Nur behalten, was für die Prüfung noch zählt (2 Minuten, höchstens 20 Nachrichten). */
export function kuerzeLog(log: Eintrag[], jetzt: number): Eintrag[] {
  return log.filter((e) => jetzt - e.zeit < WIEDERHOLUNG_FENSTER_MS).slice(-20);
}

/** Die Restzeit für den Countdown, auf volle Sekunden aufgerundet: „4:32“. */
export function restText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ Stand im Browser

/**
 * Was der Browser sich merkt (localStorage): die Sperre des Chatbots (bis wann, warum), die letzten
 * Nachrichten für die Zählung (Chatbot und Ticket getrennt) und wie oft die KI eine Beleidigung gemeldet
 * hat. Neu laden hebt die Sperre darum nicht auf. Nach 24 Stunden ohne Nachricht beginnt alles neu,
 * wie der Verlauf (lib/chat-speicher.ts).
 */
export interface SchutzStand {
  sperreBis: number;
  grund: string;
  log: Eintrag[];
  logTicket: Eintrag[];
  beleidigungen: number;
  zuletzt: number;
}

const K_SCHUTZ = "ag-chat-schutz";

export const leererSchutz = (): SchutzStand => ({ sperreBis: 0, grund: "", log: [], logTicket: [], beleidigungen: 0, zuletzt: 0 });

const istLog = (x: unknown): x is Eintrag[] =>
  Array.isArray(x) && x.every((e) => e && typeof e === "object" && typeof (e as Eintrag).zeit === "number" && typeof (e as Eintrag).text === "string");

export function ladeSchutz(s: Speicher, jetzt: number): SchutzStand {
  try {
    const roh = JSON.parse(s.getItem(K_SCHUTZ) ?? "null") as Partial<SchutzStand> | null;
    if (!roh || typeof roh !== "object") return leererSchutz();
    const stand: SchutzStand = {
      sperreBis: typeof roh.sperreBis === "number" ? roh.sperreBis : 0,
      grund: typeof roh.grund === "string" ? roh.grund : "",
      log: istLog(roh.log) ? kuerzeLog(roh.log, jetzt) : [],
      logTicket: istLog(roh.logTicket) ? kuerzeLog(roh.logTicket, jetzt) : [],
      beleidigungen: typeof roh.beleidigungen === "number" ? roh.beleidigungen : 0,
      zuletzt: typeof roh.zuletzt === "number" ? roh.zuletzt : 0,
    };
    // Eine laufende Sperre bleibt immer; die Zahl der Beleidigungen gilt nur für denselben Chat (24 Stunden).
    if (jetzt - stand.zuletzt > CHAT_DAUER_MS) return { ...leererSchutz(), sperreBis: stand.sperreBis > jetzt ? stand.sperreBis : 0, grund: stand.sperreBis > jetzt ? stand.grund : "" };
    if (stand.sperreBis <= jetzt) return { ...stand, sperreBis: 0, grund: "" };
    return stand;
  } catch {
    return leererSchutz();
  }
}

export function merkeSchutz(s: Speicher, stand: SchutzStand): void {
  try {
    s.setItem(K_SCHUTZ, JSON.stringify(stand));
  } catch {
    /* Speicher voll oder gesperrt: dann zählt nur der Server */
  }
}

// ------------------------------------------------------------------ Wächter auf dem Server

/**
 * Der Server zählt mit (je Instanz im Speicher, ohne Datenbank): je Schlüssel (Adresse beim Chatbot,
 * Kanal beim Ticket) die letzten Nachrichten, eine laufende Sperre und die Beleidigungen.
 */
export class Waechter {
  private logs = new Map<string, Eintrag[]>();
  private sperren = new Map<string, { bis: number; grund: string }>();
  private beleidigungen = new Map<string, { anzahl: number; zuletzt: number }>();

  private readonly maxSchluessel: number;

  constructor(maxSchluessel = 5000) {
    this.maxSchluessel = maxSchluessel;
  }

  /** Die laufende Sperre (Restzeit in ms) oder null. */
  sperre(schluessel: string, jetzt: number): { rest: number; grund: string } | null {
    const s = this.sperren.get(schluessel);
    if (!s) return null;
    if (s.bis <= jetzt) {
      this.sperren.delete(schluessel);
      return null;
    }
    return { rest: s.bis - jetzt, grund: s.grund };
  }

  sperreSetzen(schluessel: string, grund: string, jetzt: number, dauer = SPERRE_CHATBOT_MS): { rest: number; grund: string } {
    const laufend = this.sperre(schluessel, jetzt);
    if (laufend) return laufend;
    this.aufraeumen(jetzt);
    this.sperren.set(schluessel, { bis: jetzt + dauer, grund });
    this.logs.delete(schluessel);
    return { rest: dauer, grund };
  }

  /** Prüft die neue Nachricht und merkt sie sich, wenn sie kein Spam ist. */
  pruefe(schluessel: string, text: string, regeln: SpamRegeln, jetzt: number, spielraumMs = 0): SpamTreffer | null {
    const treffer = this.pruefeAlle(schluessel, [text], regeln, jetzt, spielraumMs);
    if (!treffer) this.merke(schluessel, [text], jetzt);
    return treffer;
  }

  /**
   * Prüft mehrere Nachrichten (ein Bündel aus dem Ticket) der Reihe nach, ohne sie sich zu merken. Gemerkt
   * wird erst mit merke(), wenn sie angekommen sind: Sonst zählte „Nochmal senden“ als Wiederholung.
   */
  pruefeAlle(schluessel: string, texte: string[], regeln: SpamRegeln, jetzt: number, spielraumMs = 0): SpamTreffer | null {
    const log = kuerzeLog(this.logs.get(schluessel) ?? [], jetzt);
    for (const text of texte) {
      const treffer = pruefeSpam(log, { zeit: jetzt, text }, regeln, spielraumMs);
      if (treffer) return treffer;
      log.push({ zeit: jetzt, text });
    }
    return null;
  }

  /** Vergisst die gezählten Nachrichten (beim Sperren: Nach dem Entsperren beginnt die Zählung neu). */
  leere(schluessel: string): void {
    this.logs.delete(schluessel);
  }

  /** Nimmt eine gemerkte Nachricht zurück, wenn die Antwort ausfiel (sonst zählte der nächste Versuch als Wiederholung). */
  vergiss(schluessel: string, text: string, zeit: number): void {
    const log = this.logs.get(schluessel);
    if (log) this.logs.set(schluessel, log.filter((e) => !(e.zeit === zeit && e.text === text)));
  }

  merke(schluessel: string, texte: string[], jetzt: number): void {
    this.aufraeumen(jetzt);
    this.logs.set(schluessel, kuerzeLog([...(this.logs.get(schluessel) ?? []), ...texte.map((text) => ({ zeit: jetzt, text }))], jetzt));
  }

  /** Zählt eine Beleidigung. `mindestens`: so viele kennt der Browser schon (andere Instanz). */
  zaehleBeleidigung(schluessel: string, jetzt: number, mindestens = 0): number {
    const alt = this.beleidigungen.get(schluessel);
    const bisher = alt && jetzt - alt.zuletzt < CHAT_DAUER_MS ? alt.anzahl : 0;
    const anzahl = Math.max(bisher, mindestens) + 1;
    this.beleidigungen.set(schluessel, { anzahl, zuletzt: jetzt });
    return anzahl;
  }

  private aufraeumen(jetzt: number) {
    if (this.logs.size + this.sperren.size + this.beleidigungen.size < this.maxSchluessel) return;
    for (const [k, v] of this.logs) if (!v.some((e) => jetzt - e.zeit < WIEDERHOLUNG_FENSTER_MS)) this.logs.delete(k);
    for (const [k, v] of this.sperren) if (v.bis <= jetzt) this.sperren.delete(k);
    for (const [k, v] of this.beleidigungen) if (jetzt - v.zuletzt > CHAT_DAUER_MS) this.beleidigungen.delete(k);
  }
}

/**
 * Was nach einer Beleidigung passiert (Davids Regel): beim ersten Mal im selben Chat einmal „Bitte bleib
 * freundlich.“, ab dem zweiten Mal die Sperre (Chatbot 5 Minuten, Ticket bis das Team entsperrt).
 */
export function folgeDerBeleidigung(anzahl: number): "hinweis" | "sperre" {
  return anzahl >= 2 ? "sperre" : "hinweis";
}
