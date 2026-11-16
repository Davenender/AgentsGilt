// Davids Wunsch 16.11.2026: Auf der Anruf-Karte in #anrufe den Namen des Anrufers per Knopf korrigieren (z. B. Mark → Marc).
// SMS (kundenName) und Rückruf (karteZuAnruf) lesen das Feld „Anrufer“ der Karte, also gilt der neue Name dort sofort. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mitAnruferName, nameFenster, nameKnopf, NAME_FENSTER_PREFIX, NAME_KNOPF_ID, pruefeAnruferName } from "../lib/anrufer-name.ts";

test("Name prüfen: Buchstaben, Leerzeichen, Bindestrich, Apostroph, Punkt; bis 40 Zeichen", () => {
  assert.equal(pruefeAnruferName("  Marc   Müller "), "Marc Müller");
  assert.equal(pruefeAnruferName("Jean-Luc O'Neill"), "Jean-Luc O'Neill");
  assert.equal(pruefeAnruferName("Dr. Özdemir"), "Dr. Özdemir");
  assert.equal(pruefeAnruferName(""), null);
  assert.equal(pruefeAnruferName("   "), null);
  assert.equal(pruefeAnruferName("Marc123"), null, "keine Ziffern");
  assert.equal(pruefeAnruferName("<@123>"), null, "keine Erwähnungen oder Zeichen für Discord");
  assert.equal(pruefeAnruferName("a".repeat(41)), null);
});

test("Feld „Anrufer“ ersetzen oder vorne anlegen, alles andere bleibt", () => {
  const felder = [
    { name: "Anrufer", value: "Mark", inline: true },
    { name: "Terminwunsch", value: "Mi 18.11., 19 Uhr", inline: true },
  ];
  assert.deepEqual(mitAnruferName(felder, "Marc"), [
    { name: "Anrufer", value: "Marc", inline: true },
    { name: "Terminwunsch", value: "Mi 18.11., 19 Uhr", inline: true },
  ]);
  assert.equal(felder[0].value, "Mark", "das Original bleibt unverändert");
  assert.deepEqual(mitAnruferName([{ name: "Zeitpunkt", value: "heute", inline: true }], "Marc"), [
    { name: "Anrufer", value: "Marc", inline: true },
    { name: "Zeitpunkt", value: "heute", inline: true },
  ]);
  assert.deepEqual(mitAnruferName(undefined, "Marc"), [{ name: "Anrufer", value: "Marc", inline: true }]);
});

test("Knopf und Fenster: jetziger Name steht schon drin", () => {
  assert.deepEqual(nameKnopf(), { type: 2, style: 2, label: "✏️ Name", custom_id: NAME_KNOPF_ID });
  const f = nameFenster("999", "Mark");
  assert.equal(f.custom_id, `${NAME_FENSTER_PREFIX}999`);
  const feld = f.components[0].components[0];
  assert.equal(feld.custom_id, "name");
  assert.equal(feld.value, "Mark");
  assert.equal(feld.max_length, 40);
  assert.equal(nameFenster("999", "").components[0].components[0].value, undefined, "leer: kein Vorschlag");
  assert.equal(nameFenster("999", "unbekannt").components[0].components[0].value, undefined, "„unbekannt“ nicht vorschlagen");
});
