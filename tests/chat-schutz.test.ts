// Chat-Schutz (Prompt 17): Spam-Regeln, Countdown, Speicher der Sperre, Wächter auf dem Server.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  REGELN_CHATBOT,
  REGELN_TICKET,
  SPERRE_CHATBOT_MS,
  Waechter,
  fastGleich,
  istKauderwelsch,
  ladeSchutz,
  leererSchutz,
  merkeSchutz,
  pruefeSpam,
  restText,
  type Eintrag,
} from "../lib/chat-schutz.ts";

/** Schickt Nachrichten nacheinander und gibt den ersten Treffer zurück (mit der Nummer der Nachricht). */
function schreibe(texte: string[], abstandMs: number, regeln = REGELN_CHATBOT, start = 1_000_000) {
  const log: Eintrag[] = [];
  for (let i = 0; i < texte.length; i++) {
    const neu = { zeit: start + i * abstandMs, text: texte[i] };
    const treffer = pruefeSpam(log, neu, regeln);
    if (treffer) return { nr: i + 1, ...treffer };
    log.push(neu);
  }
  return null;
}

const verschieden = (n: number) => Array.from({ length: n }, (_, i) => `Frage Nummer ${i + 1} zu euren Leistungen`);

test("Regel 1, Chatbot: die 9. Nachricht in 60 s sperrt, 8 nicht", () => {
  assert.equal(schreibe(verschieden(8), 7000), null);
  const t = schreibe(verschieden(9), 7000);
  assert.equal(t?.nr, 9);
  assert.equal(t?.art, "menge");
  assert.equal(t?.grund, "9 Nachrichten in 1 Minute");
  // Über mehr als eine Minute verteilt ist es kein Spam.
  assert.equal(schreibe(verschieden(12), 8000), null);
});

test("Regel 1, Ticket: erst die 11. Nachricht in 60 s sperrt", () => {
  assert.equal(schreibe(verschieden(10), 5000, REGELN_TICKET), null);
  const t = schreibe(verschieden(11), 5000, REGELN_TICKET);
  assert.equal(t?.nr, 11);
  assert.equal(t?.grund, "11 Nachrichten in 1 Minute");
});

test("Regel 2: dreimal (fast) dieselbe Nachricht hintereinander", () => {
  const t = schreibe(["Hallo, ist da jemand?", "hallo ist da jemand", "Hallo!! Ist da jemand???"], 4000);
  assert.equal(t?.nr, 3);
  assert.equal(t?.art, "wiederholung");
  assert.equal(t?.grund, "3-mal dieselbe Nachricht");
  // Ein Tippfehler macht es nicht zu einer anderen Nachricht.
  assert.equal(schreibe(["Was kostet ein Chatbot?", "Was kostet ein Chatbot?", "Was kosted ein Chatbot?"], 3000)?.nr, 3);
  // Dazwischen etwas anderes: keine Wiederholung hintereinander.
  assert.equal(schreibe(["Hallo?", "Hallo?", "Was kostet das?", "Hallo?"], 3000), null);
  // Zwei gleiche sind erlaubt.
  assert.equal(schreibe(["Hallo?", "Hallo?"], 2000), null);
  // Ähnliche, aber andere Fragen sind keine Wiederholung.
  assert.equal(schreibe(["Wie teuer ist ein Chatbot?", "Wie teuer ist eine Website?", "Wie teuer ist ein Telefon-Assistent?"], 4000), null);
});

test("Regel 2 mit Spielraum: kurze Antworten nur innerhalb von 20 s, alles nur innerhalb von 2 Minuten", () => {
  // „ja“ auf drei Fragen des Assistenten ist normal.
  assert.equal(schreibe(["ja", "ja", "ja"], 15_000), null);
  assert.equal(schreibe(["ja", "ja", "ja"], 3000)?.art, "wiederholung");
  // Dreimal „Danke“ über mehrere Minuten ist kein Spam.
  assert.equal(schreibe(["Danke!", "Danke!", "Danke!"], 70_000), null);
  // Andere Zahlen sind eine andere Nachricht.
  assert.equal(fastGleich("Wir haben 2 Standorte", "Wir haben 3 Standorte"), false);
});

test("Regel 2 im Support-Chat: wer auf das Team wartet und „Hallo?“ fragt, wird nicht gesperrt", () => {
  // Alle 20 s „Hallo?“ (wartet auf eine Antwort): keine Sperre.
  assert.equal(schreibe(["Hallo?", "Hallo?", "Hallo?"], 20_000, REGELN_TICKET), null);
  // Dreimal in wenigen Sekunden ist Spam.
  assert.equal(schreibe(["Hallo?", "Hallo?", "Hallo?"], 4000, REGELN_TICKET)?.art, "wiederholung");
  // Beim Assistenten (der jedes Mal antwortet) zählen 2 Minuten.
  assert.equal(schreibe(["Hallo?", "Hallo?", "Hallo?"], 20_000, REGELN_CHATBOT)?.art, "wiederholung");
});

test("lange Bündel bremsen die Prüfung nicht aus", () => {
  const w = new Waechter();
  const lang = Array.from({ length: 30 }, (_, i) => `${"Das ist ein sehr langer Absatz mit vielen Wörtern. ".repeat(30)}${i}`);
  const t0 = performance.now();
  w.pruefeAlle("ticket:1", lang, REGELN_TICKET, 1000, 5000);
  assert.ok(performance.now() - t0 < 300, `${Math.round(performance.now() - t0)} ms`);
});

test("Regel 3: vier unverständliche Nachrichten in 60 s", () => {
  const t = schreibe(["asdfasdf", "jkjkjkjk", "sdkjfhskdjf", "qweqwe"], 5000);
  assert.equal(t?.nr, 4);
  assert.equal(t?.art, "kauderwelsch");
  assert.equal(t?.grund, "4 unverständliche Nachrichten in 1 Minute");
  assert.equal(schreibe(["asdfasdf", "jkjkjkjk", "sdkjfhskdjf"], 5000), null);
  // Mit mehr als einer Minute Abstand zählt es nicht zusammen.
  assert.equal(schreibe(["asdfasdf", "jkjkjkjk", "sdkjfhskdjf", "qweqwe"], 25_000), null);
});

test("normales schnelles Tippen sperrt nicht (5 kurze verschiedene Nachrichten in 20 s)", () => {
  assert.equal(schreibe(["Hi", "ich hab eine Frage", "zum Chatbot", "für meine Praxis", "was kostet der?"], 4000), null);
  assert.equal(schreibe(["ok", "danke", "und die Website?", "wie lange dauert das", "super"], 4000, REGELN_TICKET), null);
  // Acht Nachrichten in einer halben Minute gehen beim Chatbot gerade noch.
  assert.equal(schreibe(verschieden(8), 4000), null);
});

test("Kauderwelsch: Tastengewirr ja, echte Sätze nein", () => {
  for (const wirr of ["asdfasdf", "asdf", "jkjkjkjk", "sdkjfhskdjf", "fdjskl", "qweqwe", "xcvbnm", "lkjhg", "asdasdasd", "ölkjh", "hjkl"]) {
    assert.equal(istKauderwelsch(wirr), true, wirr);
  }
  const echt = [
    "Hallo, ich hätte gern einen Chatbot für meine Physiotherapie-Praxis.",
    "Was kostet das ungefähr?",
    "Strumpf, Pflicht, Schrank, falls, Ausdruck, Aufgabe, Herbstschnee",
    "Das ist echt krass gut!",
    "hahaha",
    "hahah lol",
    "lalala",
    "Mehrwert und Wertvoll",
    "https://agentsgilt.com/kontakt",
    "meine Nummer ist 0151 2345678",
    "WhatsApp, Notion, Discord, Twilio, Vapi",
    "Rhythmus",
    "Tschüss!",
    "hmm",
    "ok",
    "🙂🙂🙂",
    "Bitte ruft mich an",
    "xD",
    "Ich will meine Termine nicht mehr verschlampen",
  ];
  for (const satz of echt) assert.equal(istKauderwelsch(satz), false, satz);
});

test("fast gleich: Satzzeichen, Groß/klein und Dehnungen zählen nicht", () => {
  assert.equal(fastGleich("Hallo", "hallo!!!"), true);
  assert.equal(fastGleich("Halloooo", "Hallo"), true);
  assert.equal(fastGleich("ja", "nein"), false);
  assert.equal(fastGleich("🙂", "🙂"), true);
  assert.equal(fastGleich("🙂", "😡"), false);
});

test("Countdown: Restzeit in Minuten und Sekunden, aufgerundet", () => {
  assert.equal(restText(SPERRE_CHATBOT_MS), "5:00");
  assert.equal(restText(272_000), "4:32");
  assert.equal(restText(271_100), "4:32");
  assert.equal(restText(59_000), "0:59");
  assert.equal(restText(400), "0:01");
  assert.equal(restText(0), "0:00");
  assert.equal(restText(-5000), "0:00");
});

function speicher() {
  const daten = new Map<string, string>();
  return {
    getItem: (k: string) => daten.get(k) ?? null,
    setItem: (k: string, v: string) => void daten.set(k, v),
    removeItem: (k: string) => void daten.delete(k),
  };
}

test("Neu laden während der Sperre: Restzeit bleibt im Browser, nach 5 Minuten ist sie weg", () => {
  const s = speicher();
  const start = 2_000_000;
  merkeSchutz(s, { ...leererSchutz(), sperreBis: start + SPERRE_CHATBOT_MS, grund: "9 Nachrichten in 1 Minute", zuletzt: start });
  // 28 s später neu geladen: noch 4:32.
  const nachher = ladeSchutz(s, start + 28_000);
  assert.equal(nachher.sperreBis, start + SPERRE_CHATBOT_MS);
  assert.equal(restText(nachher.sperreBis - (start + 28_000)), "4:32");
  // Nach Ablauf: frei.
  assert.equal(ladeSchutz(s, start + SPERRE_CHATBOT_MS + 1).sperreBis, 0);
  // Kaputter Eintrag: leer statt Absturz.
  s.setItem("ag-chat-schutz", "{kaputt");
  assert.deepEqual(ladeSchutz(s, start), leererSchutz());
});

test("Beleidigungen zählen nur im selben Chat (24 Stunden)", () => {
  const s = speicher();
  merkeSchutz(s, { ...leererSchutz(), beleidigungen: 1, zuletzt: 1000 });
  assert.equal(ladeSchutz(s, 1000 + 60_000).beleidigungen, 1);
  assert.equal(ladeSchutz(s, 1000 + 25 * 60 * 60 * 1000).beleidigungen, 0);
});

test("Wächter auf dem Server: sperrt 5 Minuten, zählt mit Spielraum nie strenger als der Browser", () => {
  const w = new Waechter();
  const ip = "chat:1.2.3.4";
  let t = 5_000_000;
  for (let i = 0; i < 8; i++) assert.equal(w.pruefe(ip, `Frage ${i} zum Angebot`, REGELN_CHATBOT, (t += 5000)), null);
  const treffer = w.pruefe(ip, "noch eine Frage", REGELN_CHATBOT, (t += 5000));
  assert.equal(treffer?.art, "menge");
  w.sperreSetzen(ip, treffer!.grund, t);
  assert.equal(w.sperre(ip, t + 1000)?.rest, SPERRE_CHATBOT_MS - 1000);
  assert.equal(w.sperre(ip, t + SPERRE_CHATBOT_MS), null);
  // Eine zweite Sperre während der ersten verlängert nicht.
  w.sperreSetzen(ip, "x", t);
  assert.equal(w.sperreSetzen(ip, "y", t + 60_000).rest, SPERRE_CHATBOT_MS - 60_000);

  // Gebündelt kommen 11 Nachrichten, die im Browser 61 s auseinander lagen, in 58 s an: mit Spielraum kein Spam.
  const k = "ticket:42";
  const v = new Waechter();
  v.pruefe(k, "erste", REGELN_TICKET, 0, 5000);
  for (let i = 0; i < 10; i++) assert.equal(v.pruefe(k, `Nachricht ${i}`, REGELN_TICKET, 58_000 - (9 - i) * 100, 5000), null);
});

test("nach dem Entsperren beginnt die Zählung neu (die nächste Nachricht sperrt nicht gleich wieder)", () => {
  const w = new Waechter();
  const k = "ticket:7";
  for (let i = 0; i < 10; i++) assert.equal(w.pruefe(k, `Nachricht Nummer ${i} an euch`, REGELN_TICKET, 1000 + i * 100, 5000), null);
  assert.equal(w.pruefe(k, "die elfte", REGELN_TICKET, 2500, 5000)?.art, "menge");
  w.leere(k);
  assert.equal(w.pruefe(k, "Okay, sorry, jetzt in Ruhe: Was kostet das?", REGELN_TICKET, 20_000, 5000), null);
  // Im Browser ebenso: Die Sperre leert die Zählung des Tickets.
  const src = readFileSync(new URL("../components/chat/useChat.ts", import.meta.url), "utf8");
  assert.match(src, /merkeStand\(\(s\) => \(\{ \.\.\.s, logTicket: \[\] \}\)\);/);
  const route = readFileSync(new URL("../app/api/support/route.ts", import.meta.url), "utf8");
  assert.equal(route.split("waechter.leere(`ticket:${channelId}`);").length - 1, 2);
});

test("Wächter: Fällt die Antwort aus, zählt die Frage nicht (kein Sperren beim dritten Versuch)", () => {
  const w = new Waechter();
  for (const t of [1000, 2000]) {
    assert.equal(w.pruefe("a", "Was kostet ein Chatbot?", REGELN_CHATBOT, t), null);
    w.vergiss("a", "Was kostet ein Chatbot?", t);
  }
  assert.equal(w.pruefe("a", "Was kostet ein Chatbot?", REGELN_CHATBOT, 3000), null);
});

test("Wächter: Beleidigungen zählen weiter, auch wenn der Browser schon mehr kennt", () => {
  const w = new Waechter();
  assert.equal(w.zaehleBeleidigung("a", 0), 1);
  assert.equal(w.zaehleBeleidigung("a", 1000), 2);
  assert.equal(w.zaehleBeleidigung("b", 0, 1), 2);
});
