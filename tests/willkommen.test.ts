// Tests für die Anleitungen in #willkommen: `npm test`. Nur reine Logik.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANLEITUNGEN, alsEmbed, planePlaetze, planeReihenfolge, planeWillkommen, gleich, pruefeLaengen, type Anleitung } from "../lib/willkommen.ts";

const a = (titel: string, sucht: string[] = [], nurWennDa = false): Anleitung => ({ titel, sucht, text: "x", nurWennDa });

test("vorhandene Bot-Nachricht wird über den Titelanfang gefunden und geändert", () => {
  const plan = planeWillkommen(
    [{ id: "1", bot: true, titel: "📖 Anleitung: Anrufe (Karten in #anrufe)" }],
    [a("📖 Anleitung: Anrufe", ["📖 Anleitung: Anrufe"])],
  );
  assert.deepEqual(plan, [{ art: "aendern", id: "1", titel: "📖 Anleitung: Anrufe" }]);
});

test("fehlende Anleitung wird neu angelegt, außer sie soll nur geändert werden", () => {
  const plan = planeWillkommen([], [a("📖 Neu"), a("📖 Lead-Suche", ["📖 Anleitung: Lead-Suche"], true)]);
  assert.deepEqual(plan, [
    { art: "neu", titel: "📖 Neu" },
    { art: "auslassen", titel: "📖 Lead-Suche" },
  ]);
});

test("Nachrichten von Menschen werden nie angefasst", () => {
  const plan = planeWillkommen([{ id: "1", bot: false, titel: "📖 Neu" }], [a("📖 Neu")]);
  assert.deepEqual(plan, [{ art: "neu", titel: "📖 Neu" }]);
});

test("jede Nachricht wird höchstens einmal benutzt, Groß-/Kleinschreibung egal", () => {
  const plan = planeWillkommen(
    [{ id: "1", bot: true, titel: "Die wichtigsten Kanäle" }],
    [a("Die wichtigsten Kanäle", ["die WICHTIGSTEN kanäle"]), a("Kanäle 2", ["Die wichtigsten"])],
  );
  assert.deepEqual(plan, [
    { art: "aendern", id: "1", titel: "Die wichtigsten Kanäle" },
    { art: "neu", titel: "Kanäle 2" },
  ]);
});

test("der eigene Titel zählt immer als Suchwort", () => {
  const plan = planeWillkommen([{ id: "9", bot: true, titel: "📖 Anleitung: Akademie" }], [a("📖 Anleitung: Akademie")]);
  assert.equal(plan[0].art, "aendern");
});

test("Längenprüfung meldet zu lange Texte und Felder", () => {
  const lang: Anleitung = { titel: "T", sucht: [], text: "x".repeat(4097) };
  const feld: Anleitung = { titel: "F", sucht: [], felder: [{ name: "n", value: "y".repeat(1025) }] };
  assert.equal(pruefeLaengen([lang, feld]).length, 2);
});

test("alle echten Anleitungen passen in Discord-Grenzen und haben eindeutige Titel", () => {
  assert.deepEqual(pruefeLaengen(ANLEITUNGEN), []);
  const titel = ANLEITUNGEN.map((x) => x.titel);
  assert.equal(new Set(titel).size, titel.length);
  assert.ok(ANLEITUNGEN.length >= 8);
});

test("die Anleitungen nennen die aktuellen Fakten", () => {
  const alles = ANLEITUNGEN.map((x) => `${x.text ?? ""} ${(x.felder ?? []).map((f) => f.value).join(" ")}`).join(" ");
  assert.match(alles, /Handys des Teams/);
  assert.doesNotMatch(alles, /Mijo|Jakob/, "keine festen Namen (Team-Register, Plan 4)");
  assert.doesNotMatch(alles, /noch nicht automatisiert/);
  assert.match(alles, /Stripe/);
  assert.match(alles, /Gesprächsbogen/);
  assert.match(alles, /Akademie/);
  assert.match(alles, /#statistik/);
  assert.match(alles, /name:/);
});

test("alsEmbed baut ein Embed mit Titel, Text, Feldern und Farbe", () => {
  const e = alsEmbed({ titel: "T", sucht: [], text: "t", felder: [{ name: "n", value: "v" }] }, 1);
  assert.deepEqual(e, { title: "T", description: "t", color: 1, fields: [{ name: "n", value: "v", inline: false }] });
  assert.deepEqual(alsEmbed({ titel: "T", sucht: [], text: "t" }, 2), { title: "T", description: "t", color: 2 });
});

test("Reihenfolge: vorhandene Nachrichten werden der Reihe nach neu belegt, der Rest kommt hinten dazu", () => {
  const nachrichten = [
    { id: "1", bot: true, titel: "A" },
    { id: "x", bot: false, titel: "von David" },
    { id: "2", bot: true, titel: "C" },
  ];
  const plan = planeReihenfolge(nachrichten, [a("A"), a("B"), a("C")]);
  assert.deepEqual(plan, [
    { art: "aendern", id: "1", titel: "A" },
    { art: "aendern", id: "2", titel: "B" },
    { art: "neu", titel: "C" },
  ]);
});

test("Reihenfolge verweigert, wenn eine Bot-Nachricht zu keiner Anleitung gehört", () => {
  assert.equal(planeReihenfolge([{ id: "1", bot: true, titel: "Fremd" }], [a("A")]), null);
});

test("Reihenfolge lässt Anleitungen aus, die nur geändert werden sollen und fehlen", () => {
  const plan = planeReihenfolge([{ id: "1", bot: true, titel: "A" }], [a("A"), a("L", [], true), a("B")]);
  assert.deepEqual(plan, [
    { art: "aendern", id: "1", titel: "A" },
    { art: "auslassen", titel: "L" },
    { art: "neu", titel: "B" },
  ]);
});

test("Plätze: Bot-Nachrichten werden streng der Reihe nach belegt, auch bei doppelten Titeln", () => {
  const n = [
    { id: "1", bot: true, titel: "A" },
    { id: "2", bot: true, titel: "A" },
    { id: "m", bot: false, titel: "Mensch" },
    { id: "3", bot: true, titel: "Z" },
  ];
  assert.deepEqual(planePlaetze(n, [a("A"), a("B"), a("C"), a("D")]), [
    { art: "aendern", id: "1", titel: "A" },
    { art: "aendern", id: "2", titel: "B" },
    { art: "aendern", id: "3", titel: "C" },
    { art: "neu", titel: "D" },
  ]);
});

test("Plätze verweigert, wenn es mehr Bot-Nachrichten als Anleitungen gibt", () => {
  assert.equal(planePlaetze([{ id: "1", bot: true, titel: "A" }, { id: "2", bot: true, titel: "B" }], [a("A")]), null);
});

test("gleich erkennt, ob eine Nachricht schon den gewünschten Inhalt hat", () => {
  const soll = { title: "T", description: "d", color: 1, fields: [{ name: "n", value: "v", inline: false }] };
  assert.equal(gleich({ title: "T", description: "d", fields: [{ name: "n", value: "v" }] }, soll), true);
  assert.equal(gleich({ title: "T", description: "anders" }, soll), false);
  assert.equal(gleich({ title: "T", description: "d" }, { title: "T", description: "d", color: 1 }), true);
});
