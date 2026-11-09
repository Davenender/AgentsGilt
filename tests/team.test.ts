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
