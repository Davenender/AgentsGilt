// Kontaktformular der neuen Seite: Es öffnet sich nur, wenn aus dem Chat wirklich etwas übernommen wurde.
import assert from "node:assert/strict";
import { test } from "node:test";
import { uebernimm, type AnfrageFelder } from "../lib/anfrage-uebernahme.ts";

const LEER: AnfrageFelder = { name: "", email: "", company: "", service: "", message: "" };
const LEISTUNGEN = ["Websites & Landingpages", "KI-Chatbots", "Sonstiges"];

test("Angaben aus dem Chat füllen leere Felder: Das Formular öffnet sich", () => {
  const e = uebernimm(LEER, { name: " Erika Muster ", email: "erika@beispiel.de", company: "Salon Erika", service: "KI-Chatbots", message: "Chatbot für Termine" }, LEISTUNGEN);
  assert.equal(e.gefuellt, true);
  assert.deepEqual(e.felder, { name: "Erika Muster", email: "erika@beispiel.de", company: "Salon Erika", service: "KI-Chatbots", message: "Chatbot für Termine" });
});

test("eine leere Übergabe öffnet nichts", () => {
  for (const angaben of [null, undefined, {}, { name: "" }, { name: "   ", email: "" }]) {
    const e = uebernimm(LEER, angaben, LEISTUNGEN);
    assert.equal(e.gefuellt, false, JSON.stringify(angaben));
    assert.deepEqual(e.felder, LEER);
  }
});

test("eine Leistung, die es in der Auswahl nicht gibt, zählt nicht", () => {
  const e = uebernimm(LEER, { service: "Raketenbau" }, LEISTUNGEN);
  assert.equal(e.gefuellt, false);
  assert.equal(e.felder.service, "");
});

test("was der Besucher selbst getippt hat, bleibt; bringt die Übergabe nichts Neues, öffnet sie nichts", () => {
  const getippt: AnfrageFelder = { ...LEER, name: "Erika", email: "e@b.de" };
  const gleich = uebernimm(getippt, { name: "Jemand anders", email: "x@y.de" }, LEISTUNGEN);
  assert.equal(gleich.gefuellt, false);
  assert.deepEqual(gleich.felder, getippt);
  // Ein einziges neues Feld genügt.
  const dazu = uebernimm(getippt, { name: "Jemand anders", message: "Ich möchte einen Chatbot." }, LEISTUNGEN);
  assert.equal(dazu.gefuellt, true);
  assert.equal(dazu.felder.name, "Erika");
  assert.equal(dazu.felder.message, "Ich möchte einen Chatbot.");
});

test("die Felder der Vorlage werden nicht verändert", () => {
  const vorher = { ...LEER };
  uebernimm(LEER, { name: "Erika" }, LEISTUNGEN);
  assert.deepEqual(LEER, vorher);
});
