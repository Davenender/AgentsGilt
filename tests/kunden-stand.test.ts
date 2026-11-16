// Etappe 6: gültiger Stand je Kunde als JSON in einer Discord-Karte. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { leseStandKarte, STAND_MAX, standKarte } from "../lib/kunden-stand-zeile.ts";
import type { Stand } from "../lib/notion-sperre.ts";

test("Stand mit Umlauten und Links kommt unverändert zurück und bleibt unter 4096 Zeichen", () => {
  const stand: Stand = {
    Name: ["title", "Bäckerei Größe & Söhne"],
    "Angebot (Link)": ["url", "https://agentsgilt.com/angebot/größe?x=1&y=ü"],
    "Angebot raus": ["checkbox", true],
    "Setup-Preis (€)": ["number", 1500],
    "Nächstes Follow-up": ["date", { start: "2026-11-20", end: null }],
    Telefon: ["phone_number", null],
  };
  const k = standKarte("KND-003", stand);
  assert.ok(k.description.length < 4096);
  assert.equal(k.title, "KND-003");
  const zurueck = leseStandKarte(k);
  assert.equal(zurueck?.nr, "KND-003");
  assert.deepEqual(zurueck?.stand, stand);
  assert.deepEqual(zurueck?.weggelassen, []);
});

test("Zu langer Stand: die längsten Felder fallen weg (nie gekürzt), der Rest bleibt", () => {
  const stand: Stand = {
    Status: ["select", "Lead"],
    "Nächster Schritt": ["rich_text", "a".repeat(3000)],
    "Domain / Anbieter": ["rich_text", "b".repeat(2500)],
    Telefon: ["phone_number", "+49 170 0000000"],
  };
  const k = standKarte("KND-007", stand);
  assert.ok(k.description.length <= STAND_MAX);
  const z = leseStandKarte(k)!;
  assert.equal(z.stand["Nächster Schritt"], undefined, "längstes Feld fehlt ganz");
  assert.deepEqual(z.stand["Domain / Anbieter"], ["rich_text", "b".repeat(2500)], "nicht gekürzt");
  assert.deepEqual(z.stand.Status, ["select", "Lead"]);
  assert.deepEqual(z.weggelassen, ["Nächster Schritt"]);
});

test("Fremde oder kaputte Karten werden nicht gelesen", () => {
  assert.equal(leseStandKarte({ title: "KND-003", description: "kein json" }), null);
  assert.equal(leseStandKarte({ title: "Irgendwas", description: "{}" }), null);
  assert.equal(leseStandKarte(undefined), null);
  assert.equal(leseStandKarte({ title: "KND-003", description: '{"Status":"kaputt"}' })?.stand.Status, undefined, "nur [Typ, Wert]-Paare");
});
