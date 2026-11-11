// Tests für das Team-Register (Plan 4, Etappe 1): `npm test`. Reine Logik, nichts geht an Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import { aktive, leseRegister, mitglied, namen, setzeTeam, START, team, zeileTeam } from "../lib/team.ts";
import { pruefeAuswahl, notionIdFuer, alsMentions } from "../lib/zustaendige.ts";
import { rechneStatistik } from "../lib/statistik.ts";

const DAVID = "806859236768088114";
const JAKOB = "523479048727560205";
const MIJO = "1363529531939492133";
const OSKAR = "999000111222333444";

test("ohne Einträge gilt die Startliste: David, Jakob und Mijo im Team", () => {
  const r = leseRegister([]);
  assert.deepEqual(r.map((m) => [m.name, m.status]), [["David", "team"], ["Jakob", "team"], ["Mijo", "team"]]);
  assert.deepEqual(START.map((m) => m.discord), [DAVID, JAKOB, MIJO]);
});

test("Einträge im Register: neu, Pause, Austritt; der neueste Eintrag je Person gilt", () => {
  const zeilen = [
    zeileTeam({ discord: OSKAR, name: "Oskar", status: "anwaerter", notion: "", figur: "braun", seit: "2026-11-10" }),
    zeileTeam({ discord: JAKOB, name: "Jakob", status: "pause", notion: "405d872b-594c-814f-92f2-00022b1d1178", figur: "blond", seit: "2026-11-01" }),
    "irgendwas anderes",
    zeileTeam({ discord: OSKAR, name: "Oskar", status: "team", notion: "abc", figur: "braun", seit: "2026-11-10" }),
  ].map((content) => ({ content }));
  const r = leseRegister(zeilen);
  assert.deepEqual(r.map((m) => [m.name, m.status]), [["David", "team"], ["Jakob", "pause"], ["Mijo", "team"], ["Oskar", "team"]]);
  assert.equal(r.find((m) => m.name === "Oskar")?.notion, "abc");
  assert.equal(r.find((m) => m.name === "Oskar")?.figur, "braun");
});

test("David bleibt immer im Team, auch wenn das Register etwas anderes sagt", () => {
  const r = leseRegister([{ content: zeileTeam({ discord: DAVID, name: "David", status: "ausgetreten", notion: "", figur: "", seit: "" }) }]);
  assert.equal(r[0].status, "team");
});

test("aktiv sind nur Leute mit Status Team; Namen gibt es auch für Ausgetretene (Verlauf)", () => {
  setzeTeam(
    leseRegister(
      [
        zeileTeam({ discord: JAKOB, name: "Jakob", status: "ausgetreten", notion: "405d872b-594c-814f-92f2-00022b1d1178", figur: "blond", seit: "" }),
        zeileTeam({ discord: OSKAR, name: "Oskar", status: "anwaerter", notion: "", figur: "", seit: "" }),
      ].map((content) => ({ content })),
    ),
  );
  assert.deepEqual(aktive().map((m) => m.name), ["David", "Mijo"]);
  assert.equal(mitglied(JAKOB)?.name, "Jakob");
  assert.equal(namen()[OSKAR], "Oskar");
  assert.equal(team().length, 4);
  setzeTeam(START);
});

test("Zuständig kann nur sein, wer gerade im Team ist (nicht in Pause, nicht Anwärter)", () => {
  setzeTeam(leseRegister([{ content: zeileTeam({ discord: JAKOB, name: "Jakob", status: "pause", notion: "405d872b-594c-814f-92f2-00022b1d1178", figur: "", seit: "" }) }]));
  assert.deepEqual(pruefeAuswahl([MIJO]), { ok: true, ids: [MIJO] });
  const p = pruefeAuswahl([JAKOB]);
  assert.equal(p.ok, false);
  assert.doesNotMatch(p.ok ? "" : p.grund, /Jakob/, "keine festen Namen im Text");
  assert.ok(notionIdFuer(JAKOB), "alte Zuordnungen bleiben lesbar");
  assert.equal(alsMentions([MIJO, JAKOB]), `<@${JAKOB}> <@${MIJO}>`, "Reihenfolge wie im Register");
  setzeTeam(START);
});

test("Statistik je Person: Team und Pause, keine Anwärter und Ausgetretenen", () => {
  setzeTeam(
    leseRegister(
      [
        zeileTeam({ discord: JAKOB, name: "Jakob", status: "ausgetreten", notion: "", figur: "", seit: "" }),
        zeileTeam({ discord: OSKAR, name: "Oskar", status: "anwaerter", notion: "", figur: "", seit: "" }),
      ].map((content) => ({ content })),
    ),
  );
  const s = rechneStatistik([], [], Date.parse("2026-11-09T12:00:00Z"));
  assert.deepEqual(s.personen.map((p) => p.name), ["David", "Mijo"]);
  setzeTeam(START);
});

// ------------------------------------------------------------ Etappe 2: Telefon, Rufgruppe, Übersicht, Befehle

import { mitRegister, teamKarte, befehlAus, darfHandeln, findeMitglied } from "../lib/team.ts";

test("Telefon steht im Register; alte Zeilen ohne Telefon bleiben gültig", () => {
  const r = leseRegister([
    { content: zeileTeam({ discord: OSKAR, name: "Oskar", status: "team", notion: "", figur: "blond", seit: "2026-11-10", telefon: "+49 151 1234567" }) },
    { content: "team · 523479048727560205 · Jakob · pause · 405d · blond · 2026-11-01" },
  ]);
  assert.equal(r.find((m) => m.name === "Oskar")?.telefon, "+49 151 1234567");
  assert.equal(r.find((m) => m.name === "Jakob")?.telefon, "");
});

test("Rufgruppe: Register gilt vor den Vercel-Nummern; Pause und Ausgetretene klingeln nicht", () => {
  const env = [
    { name: "Mijo", roh: "+49 160 1111111" },
    { name: "Jakob", roh: "+49 160 2222222" },
    { name: null, roh: "+49 160 3333333" },
  ];
  const liste = leseRegister(
    [
      zeileTeam({ discord: JAKOB, name: "Jakob", status: "pause", notion: "", figur: "", seit: "", telefon: "" }),
      zeileTeam({ discord: OSKAR, name: "Oskar", status: "team", notion: "", figur: "", seit: "", telefon: "+49 151 4444444" }),
      zeileTeam({ discord: MIJO, name: "Mijo", status: "team", notion: "", figur: "", seit: "", telefon: "+49 160 9999999" }),
    ].map((content) => ({ content })),
  );
  const r = mitRegister(env, liste);
  assert.deepEqual(r, [
    { name: "Mijo", roh: "+49 160 9999999" },
    { name: null, roh: "+49 160 3333333" },
    { name: "Oskar", roh: "+49 151 4444444" },
  ]);
  const anwaerter = leseRegister([{ content: zeileTeam({ discord: OSKAR, name: "Oskar", status: "anwaerter", notion: "", figur: "", seit: "", telefon: "+49 151 4444444" }) }]);
  assert.ok(!mitRegister(env, anwaerter).some((e) => e.name === "Oskar"), "Anwärter klingeln nicht");
});

test("Übersichtskarte zeigt alle mit Stand, Telefon und Notion", () => {
  const liste = leseRegister([{ content: zeileTeam({ discord: OSKAR, name: "Oskar", status: "pause", notion: "", figur: "blond", seit: "2026-11-10", telefon: "+49 151 4444444" }) }]);
  const k = teamKarte(liste);
  const d = k.embeds[0].description ?? "";
  assert.match(d, /Oskar/);
  assert.match(d, /⏸️/);
  assert.match(d, /\+49 151 4444444/);
  assert.match(d, /Notion fehlt/);
  assert.match(k.embeds[0].title ?? "", /Team/);
});

test("Befehl /team lesen: Unterbefehl, Person, Angaben", () => {
  const b = befehlAus({ name: "team", options: [{ name: "aufnehmen", type: 1, options: [{ name: "person", value: OSKAR }, { name: "name", value: " Oskar " }, { name: "figur", value: "blond" }] }] });
  assert.deepEqual(b, { aktion: "aufnehmen", person: OSKAR, name: "Oskar", figur: "blond", telefon: "", notion: "", zustand: "", kennung: "" });
  assert.equal(befehlAus({ name: "team", options: [] }), null);
});

test("Wer in Pause oder Anwärter ist, darf außerhalb der Akademie nichts auslösen", () => {
  const liste = leseRegister(
    [
      zeileTeam({ discord: JAKOB, name: "Jakob", status: "pause", notion: "", figur: "", seit: "", telefon: "" }),
      zeileTeam({ discord: OSKAR, name: "Oskar", status: "anwaerter", notion: "", figur: "", seit: "", telefon: "" }),
    ].map((content) => ({ content })),
  );
  setzeTeam(liste);
  assert.equal(darfHandeln(JAKOB, "lead:uebernehmen"), false);
  assert.equal(darfHandeln(OSKAR, "anf:x"), false);
  assert.equal(darfHandeln(OSKAR, "ak:weiter"), true, "Akademie geht immer");
  assert.equal(darfHandeln(JAKOB, "befehl:a"), true, "/a in der Übung geht immer");
  assert.equal(darfHandeln(MIJO, "lead:uebernehmen"), true);
  assert.equal(darfHandeln("123456789012", "lead:x"), true, "Unbekannte regelt der Rest wie bisher");
  setzeTeam(START);
});

// ------------------------------------------------------------ Etappe 2b: Austritt

import { ersetzeIn, uebergabeNachrichten, ziele, austrittKnopf, knopfAus } from "../lib/team.ts";

test("Übergabe: die alte Person wird ersetzt, niemand doppelt, Reihenfolge bleibt", () => {
  assert.deepEqual(ersetzeIn([DAVID, JAKOB], JAKOB, MIJO), [DAVID, MIJO]);
  assert.deepEqual(ersetzeIn([JAKOB, MIJO], JAKOB, MIJO), [MIJO]);
  assert.deepEqual(ersetzeIn([MIJO], JAKOB, DAVID), [MIJO], "nichts zu ersetzen");
});

test("Wer übernehmen kann: alle im Team außer der Person, die geht", () => {
  setzeTeam(leseRegister([{ content: zeileTeam({ discord: OSKAR, name: "Oskar", status: "team", notion: "", figur: "", seit: "", telefon: "" }) }]));
  assert.deepEqual(ziele(JAKOB).map((o) => o.label), ["David", "Mijo", "Oskar"]);
  setzeTeam(START);
});

test("Übergabe-Nachrichten: je Fall eine Auswahl, höchstens 4 je Nachricht, kurze Kennungen", () => {
  const faelle = Array.from({ length: 6 }, (_, i) => ({ art: i < 4 ? ("k" as const) : ("l" as const), ref: String(1000000000000000000n + BigInt(i)), titel: `Fall ${i}` }));
  const n = uebergabeNachrichten(JAKOB, "Jakob", faelle, [{ label: "Mijo", value: MIJO }]);
  assert.equal(n.length, 2);
  assert.equal(n[0].components.length, 4);
  assert.equal(n[1].components.length, 2);
  const sel = n[0].components[0].components[0] as { custom_id: string; options: { value: string }[] };
  assert.match(sel.custom_id, /^tm:ue:523479048727560205:k:\d+$/);
  assert.ok(sel.custom_id.length <= 100);
  assert.deepEqual(sel.options.map((o) => o.value), [MIJO]);
  assert.match(n[0].embeds[0].description ?? "", /Fall 0/);
  assert.equal(knopfAus(sel.custom_id)?.art, "k");
  assert.equal(knopfAus(sel.custom_id)?.aus, JAKOB);
  assert.equal(knopfAus("tm:aus:" + JAKOB)?.aktion, "aus");
  assert.equal(knopfAus("lead:x"), null);
});

test("Austritt-Knopf ist rot und fragt nach", () => {
  const k = austrittKnopf(JAKOB, false)[0].components;
  assert.equal(k[0].style, 4);
  assert.equal(k[0].custom_id, `tm:aus:${JAKOB}`);
  const ja = austrittKnopf(JAKOB, true)[0].components;
  assert.deepEqual(ja.map((b) => b.custom_id), [`tm:ausja:${JAKOB}`, `tm:ausnein:${JAKOB}`]);
});

// ------------------------------------------------------------ Etappe 3: Schalter Aufnahmetest

import { leseEinstellungen, zeileEinstellung } from "../lib/team.ts";

test("Schalter Aufnahmetest: aus, bis David ihn einschaltet; die neueste Zeile gilt", () => {
  assert.equal(leseEinstellungen([]).aufnahmetest, false);
  assert.equal(zeileEinstellung("aufnahmetest", true), "einstellung · aufnahmetest · an");
  const e = leseEinstellungen([{ content: zeileEinstellung("aufnahmetest", true) }, { content: "team · 1 · x · team" }]);
  assert.equal(e.aufnahmetest, true);
  assert.equal(leseEinstellungen([{ content: zeileEinstellung("aufnahmetest", true) }, { content: zeileEinstellung("aufnahmetest", false) }]).aufnahmetest, false);
  assert.match(teamKarte(START, { aufnahmetest: true }).embeds[0].description ?? "", /Aufnahmetest: an/);
  assert.match(teamKarte(START).embeds[0].description ?? "", /Aufnahmetest: aus/);
});

test("/team austritt ohne Person: Kennung aus dem Register (Nummer oder Name) reicht", () => {
  const b = befehlAus({ name: "team", options: [{ name: "austritt", type: 1, options: [{ name: "kennung", value: " 523479048727560205 " }] }] });
  assert.equal(b?.person, "");
  assert.equal(b?.kennung, "523479048727560205");
  setzeTeam(START);
  assert.equal(findeMitglied("", JAKOB)?.name, "Jakob");
  assert.equal(findeMitglied("", `<@${JAKOB}>`)?.name, "Jakob");
  assert.equal(findeMitglied("", "jakob")?.discord, JAKOB);
  assert.equal(findeMitglied(MIJO, "Jakob")?.name, "Mijo", "eine gewählte Person geht vor");
  assert.equal(findeMitglied("", "Niemand"), null);
  assert.equal(findeMitglied("", ""), null);
});
