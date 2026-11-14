// Anfrage-Formular der neuen Seite: welcher Satz unter einem fehlenden Pflichtfeld steht und wie lange er gilt.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fehlSatz, istPflichtfeld, meldungGilt } from "../components/neu/anfrage-fehlt.ts";

// Die Sätze der Seite (lib/inhalt-neu.ts, kontakt.formular.fehlt). Die Datei selbst lässt sich hier
// nicht laden (sie hängt an Pfad-Kürzeln von Next); ein Test unten prüft, dass sie genau so darin stehen.
const t = {
  name: "Bitte tragen Sie Ihren Namen ein.",
  email: "Bitte tragen Sie Ihre E-Mail-Adresse ein.",
  emailFalsch: "Bitte prüfen Sie die E-Mail-Adresse.",
  message: "Bitte schreiben Sie kurz, worum es geht.",
};

test("die Sätze stehen genau so in den Texten der Seite", () => {
  const texte = readFileSync(new URL("../lib/inhalt-neu.ts", import.meta.url), "utf8");
  for (const [feld, satz] of Object.entries(t)) assert.ok(texte.includes(`${feld}: "${satz}"`), `${feld}: ${satz}`);
});

test("nur Name, E-Mail und Nachricht sind Pflichtfelder mit eigener Anzeige", () => {
  assert.ok(istPflichtfeld("name"));
  assert.ok(istPflichtfeld("email"));
  assert.ok(istPflichtfeld("message"));
  assert.ok(!istPflichtfeld("company"), "Firma ist freiwillig");
  assert.ok(!istPflichtfeld("service"), "Leistung ist freiwillig");
  assert.ok(!istPflichtfeld("website"), "das unsichtbare Feld gegen Roboter bekommt nie eine Meldung");
});

test("unter einem leeren Pflichtfeld steht, was fehlt", () => {
  assert.equal(fehlSatz("name", true, t), t.name);
  assert.equal(fehlSatz("email", true, t), t.email);
  assert.equal(fehlSatz("message", true, t), t.message);
});

test("eine ausgefüllte, aber ungültige E-Mail bekommt einen eigenen Satz", () => {
  assert.equal(fehlSatz("email", false, t), t.emailFalsch);
  assert.notEqual(t.emailFalsch, t.email);
});

test("alle Sätze sind gesiezt, kurz und verschieden", () => {
  const saetze = [t.name, t.email, t.emailFalsch, t.message];
  assert.equal(new Set(saetze).size, 4);
  for (const s of saetze) {
    assert.match(s, /^Bitte .*(Sie|Ihre[nr]?) /, s);
    assert.ok(s.length <= 48, `kurz: ${s}`);
  }
});

test("„fehlt“ gilt nur, solange das Feld leer ist (auch wenn der Chat es ausfüllt)", () => {
  assert.equal(meldungGilt("name", t.name, "", t), true);
  assert.equal(meldungGilt("name", t.name, "Erika Beispiel", t), false);
  assert.equal(meldungGilt("message", t.message, "Wir brauchen eine neue Website.", t), false);
  assert.equal(meldungGilt("email", t.email, "erika@beispiel.de", t), false);
  assert.equal(meldungGilt("email", t.email, "", t), true);
});

test("„bitte prüfen“ bleibt, bis das Formular die E-Mail beim Tippen als gültig erkennt", () => {
  assert.equal(meldungGilt("email", t.emailFalsch, "erika@", t), true);
  assert.equal(meldungGilt("email", t.emailFalsch, "erika@beispiel", t), true);
});

test("ohne Meldung gilt nichts", () => {
  assert.equal(meldungGilt("name", undefined, "", t), false);
  assert.equal(meldungGilt("email", undefined, "x", t), false);
});
