// Chat der Website: Marker des Assistenten (unverändert aus dem bisherigen Fenster) und die
// Text-Regeln des neuen Glasfensters (Wörter, Takt, Links, Telefonnummern).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  GREETING,
  STARTER_QUESTIONS,
  WANTS_HUMAN,
  aiHistory,
  parseDaten,
  reichTeile,
  stripMarkers,
  woerter,
  wortTakt,
  type Message,
} from "../lib/chat-text.ts";

test("Marker des Assistenten erscheinen nie im Text, auch nicht halb angekommen", () => {
  assert.equal(stripMarkers("Das klären wir persönlich. [KONTAKT] [MITARBEITER]"), "Das klären wir persönlich.");
  assert.equal(stripMarkers('Gern. [DATEN]{"name":"Erika"}[/DATEN]'), "Gern.");
  // Mitten im Stream: Der Marker ist erst zum Teil da.
  assert.equal(stripMarkers("Gern. [KONT"), "Gern.");
  assert.equal(stripMarkers('Gern. [DATEN]{"na'), "Gern.");
  assert.equal(stripMarkers("Gern. ["), "Gern.");
  // Gewöhnlicher Text bleibt, wie er ist.
  assert.equal(stripMarkers("Wir bauen Websites [auch große]."), "Wir bauen Websites [auch große].");
});

test("Angaben aus dem Gespräch: nur bekannte Felder, kaputtes JSON scheitert still", () => {
  assert.deepEqual(parseDaten('x [DATEN]{"name":" Erika ","email":"e@b.de","fremd":"x","company":""}[/DATEN]'), { name: "Erika", email: "e@b.de" });
  assert.equal(parseDaten("x [DATEN]{kaputt[/DATEN]"), null);
  assert.equal(parseDaten("ohne Marker"), null);
  assert.equal(parseDaten("x [DATEN]{}[/DATEN]"), null);
});

test("der KI-Assistent sieht weder Team-Antworten noch Hinweise des Support-Chats", () => {
  const verlauf: Message[] = [
    GREETING,
    { role: "user", content: "Hallo" },
    { role: "assistant", content: "Übergeben.", noAi: true },
    { role: "team", content: "Hier ist Jakob.", von: "Jakob" },
    { role: "user", content: "Danke", noAi: true },
    { role: "assistant", content: "Gern." },
  ];
  assert.deepEqual(aiHistory(verlauf).map((m) => m.content), [GREETING.content, "Hallo", "Gern."]);
});

test("wer einen Menschen verlangt, bekommt den Mitarbeiter-Knopf auch ohne Marker", () => {
  for (const satz of ["Kann ich mit einem Mitarbeiter sprechen?", "Ich will einen Menschen", "eine echte Person bitte", "jemand vom Team"]) assert.ok(WANTS_HUMAN.test(satz), satz);
  assert.ok(!WANTS_HUMAN.test("Was kostet eine Website?"));
});

test("die drei Vorschläge fragen nicht nach dem Preis", () => {
  assert.equal(STARTER_QUESTIONS.length, 3);
  for (const frage of STARTER_QUESTIONS) assert.ok(!/preis|kostet/i.test(frage), frage);
});

test("Wörter und Leerräume: zusammengesetzt ergibt sich wieder genau der Text", () => {
  const text = "Hey! 👋 Ich bin\nder  Assistent.";
  const teile = woerter(text);
  assert.equal(teile.map((t) => t.text).join(""), text);
  assert.deepEqual(teile.filter((t) => !t.leer).map((t) => t.text), ["Hey!", "👋", "Ich", "bin", "der", "Assistent."]);
  assert.deepEqual(woerter(""), []);
});

test("eine normale Antwort steht nach etwa 1 s, keine entschlüsselt sich langsamer, als man liest", () => {
  // 45 Wörter (drei, vier Sätze): alle Wörter sind nach unter einer Sekunde gestartet.
  assert.ok(wortTakt(45) * 45 <= 900);
  // Kurze Antwort: höchstens 45 ms je Wort (über 20 Wörter je Sekunde, schneller als Lesen).
  assert.equal(wortTakt(5), 45);
  // Sehr lange Antwort: nie schneller als 12 ms je Wort, damit man das Einrasten noch sieht.
  assert.equal(wortTakt(400), 12);
  assert.equal(wortTakt(0), 45);
});

test("Telefonnummern werden zum Anruf-Chip, mit der Nummer als tel-Verweis", () => {
  const teile = reichTeile("Ruf einfach an unter +49 6108 9694027. Dort nimmt der Assistent ab.");
  assert.deepEqual(teile, [
    { art: "text", text: "Ruf einfach an unter " },
    { art: "tel", text: "+49 6108 9694027", href: "tel:+4961089694027" },
    { art: "text", text: ". Dort nimmt der Assistent ab." },
  ]);
  assert.deepEqual(reichTeile("06108 9694027")[0], { art: "tel", text: "06108 9694027", href: "tel:061089694027" });
});

test("Jahreszahlen, Mengen und Uhrzeiten sind keine Telefonnummern", () => {
  for (const satz of ["Seit 2024 bauen wir Websites.", "In 3 bis 5 Tagen fertig.", "Um 10:30 Uhr.", "Das sind 100 % Einsatz.", "0 Aufwand für dich."]) {
    assert.ok(reichTeile(satz).every((t) => t.art === "text"), satz);
  }
});

test("E-Mail-Adressen und Adressen im Netz werden Links, Satzzeichen bleiben Text", () => {
  const teile = reichTeile("Schreib an kontakt@agentsgilt.com, oder schau auf agentsgilt.com.");
  assert.deepEqual(teile, [
    { art: "text", text: "Schreib an " },
    { art: "mail", text: "kontakt@agentsgilt.com", href: "mailto:kontakt@agentsgilt.com" },
    { art: "text", text: ", oder schau auf " },
    { art: "netz", text: "agentsgilt.com", href: "https://agentsgilt.com" },
    { art: "text", text: "." },
  ]);
  assert.deepEqual(reichTeile("https://agentsgilt.com/datenschutz")[0], { art: "netz", text: "https://agentsgilt.com/datenschutz", href: "https://agentsgilt.com/datenschutz" });
  // Kein Link aus einem Satzende ohne Leerzeichen.
  assert.ok(reichTeile("Das ist die Website.Dann geht es weiter.").every((t) => t.art === "text"));
  // Zusammengesetzt bleibt der Text derselbe.
  const text = "Mehr auf agentsgilt.com. Anruf: +49 6108 9694027!";
  assert.equal(reichTeile(text).map((t) => t.text).join(""), text);
});

test("das Wissen des Assistenten: Termine per Anruf, WhatsApp kein Kontaktweg, Marker unverändert", () => {
  const wissen = readFileSync(new URL("../lib/chatbot-knowledge.ts", import.meta.url), "utf8");
  assert.ok(wissen.includes("Termin ausmachen: immer anrufen"));
  assert.ok(wissen.includes("+49 6108 9694027"));
  // WhatsApp steht nur noch in der Regel, was bei ausdrücklicher Nachfrage zu sagen ist.
  assert.ok(!/auch per WhatsApp erreichbar|Per WhatsApp \(Button/.test(wissen));
  assert.ok(wissen.includes("du nennst nie eine WhatsApp-Nummer"));
  assert.ok(!/wa\.me|4916098427943/.test(wissen), "keine WhatsApp-Nummer im Wissen");
  for (const marker of ["[KONTAKT]", "[MITARBEITER]", "[DATEN]"]) assert.ok(wissen.includes(marker), marker);
  // Preise bleiben tabu.
  assert.ok(wissen.includes("NIEMALS eine Zahl nennen"));
});
