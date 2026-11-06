// Tests für Davids Standort (OwnTracks): `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { abstandM, entschluessele, LEERER_SPEICHER, leseOwnTracks, neuerStand, owntracksKonfig, owntracksLink, standortText, verschluessele, wegpunkteBefehl, type StandortSpeicher } from "../lib/standort-logik.ts";

const TST = 1793913600; // 05.11.2026
const ort = (lat: number, lon: number, tst = TST, mehr: Record<string, unknown> = {}) => ({ _type: "location", lat, lon, tst, tid: "DH", acc: 20, ...mehr });
const ZUHAUSE = { name: "Zuhause", lat: 50.12, lon: 8.83, rad: 120 };
const SCHULE = { name: "Schule", lat: 50.123, lon: 8.843, rad: 150 };

test("OwnTracks: Standort wird gelesen, Unsinn und Fremdes nicht", () => {
  assert.deepEqual(leseOwnTracks(ort(50.1, 8.8, TST, { vel: 30, batt: 80 })), { art: "ort", standort: { lat: 50.1, lon: 8.8, tst: TST, acc: 20, vel: 30, batt: 80 } });
  assert.equal(leseOwnTracks({ _type: "location", lat: 999, lon: 8, tst: TST }), null);
  assert.equal(leseOwnTracks({ _type: "location", lat: 50, lon: 8 }), null);
  assert.equal(leseOwnTracks({ _type: "waypoints", waypoints: [] }), null);
  assert.equal(leseOwnTracks(null), null);
  assert.deepEqual(leseOwnTracks({ _type: "transition", event: "enter", desc: "Zuhause", tst: TST, wtst: 1, acc: 10, tid: "DH" }), { art: "uebergang", ereignis: { art: "ankunft", ort: "Zuhause", tst: TST } });
  assert.deepEqual(leseOwnTracks({ _type: "transition", event: "leave", desc: "Schule", tst: TST, wtst: 1, acc: 10, tid: "DH" }), { art: "uebergang", ereignis: { art: "abfahrt", ort: "Schule", tst: TST } });
});

test("Ankunft und Abfahrt erkennt der Server auch selbst – ohne Flattern am Rand", () => {
  let s: StandortSpeicher = { ...LEERER_SPEICHER, orte: [ZUHAUSE] };
  const schritt = (lat: number, lon: number, tst: number) => (s = neuerStand(s, { art: "ort", standort: { lat, lon, tst } }));
  schritt(50.2, 8.9, TST); // weit weg
  assert.deepEqual(s.ereignisse, []);
  schritt(50.12, 8.83, TST + 600); // angekommen
  assert.deepEqual(s.ereignisse.map((e) => [e.art, e.ort]), [["ankunft", "Zuhause"]]);
  // knapp außerhalb des Kreises: noch nicht „weg“
  schritt(50.12 + 170 / 111_000, 8.83, TST + 900);
  assert.equal(s.ereignisse.length, 1);
  schritt(50.2, 8.9, TST + 1500);
  assert.deepEqual(s.ereignisse.map((e) => e.art), ["ankunft", "abfahrt"]);
});

test("Meldet die App denselben Übergang auch noch selbst, zählt er nur einmal", () => {
  let s: StandortSpeicher = { ...LEERER_SPEICHER, orte: [ZUHAUSE] };
  s = neuerStand(s, { art: "ort", standort: { lat: 50.2, lon: 8.9, tst: TST } });
  s = neuerStand(s, { art: "ort", standort: { lat: 50.12, lon: 8.83, tst: TST + 60 } });
  s = neuerStand(s, { art: "uebergang", ereignis: { art: "ankunft", ort: "Zuhause", tst: TST + 70 } });
  assert.equal(s.ereignisse.length, 1);
  // die App meldet zuerst: der Server zählt danach nicht nochmal
  let t: StandortSpeicher = { ...LEERER_SPEICHER, orte: [SCHULE] };
  t = neuerStand(t, { art: "uebergang", ereignis: { art: "ankunft", ort: "Schule", tst: TST } });
  t = neuerStand(t, { art: "ort", standort: { lat: 50.123, lon: 8.843, tst: TST + 30 } });
  assert.equal(t.ereignisse.length, 1);
});

test("Ältere, nachgereichte Standorte überschreiben den neuesten nicht; ungenaue zählen nicht für Ankunft", () => {
  let s: StandortSpeicher = { ...LEERER_SPEICHER, orte: [ZUHAUSE] };
  s = neuerStand(s, { art: "ort", standort: { lat: 50.2, lon: 8.9, tst: TST } });
  s = neuerStand(s, { art: "ort", standort: { lat: 50.3, lon: 8.9, tst: TST - 500 } });
  assert.equal(s.standort?.lat, 50.2);
  s = neuerStand(s, { art: "ort", standort: { lat: 50.12, lon: 8.83, tst: TST + 10, acc: 3000 } });
  assert.deepEqual(s.ereignisse, []);
});

test("Nur der letzte Standort bleibt, kein Verlauf; Ereignisse höchstens 20", () => {
  let s: StandortSpeicher = { ...LEERER_SPEICHER, orte: [ZUHAUSE] };
  for (let i = 0; i < 30; i++) {
    s = neuerStand(s, { art: "ort", standort: { lat: i % 2 ? 50.12 : 50.3, lon: 8.83, tst: TST + i * 3000 } });
  }
  assert.ok(s.ereignisse.length <= 20);
  assert.ok(!("verlauf" in s));
  assert.equal(typeof s.standort?.lat, "number");
});

test("Der Ortsname bleibt, solange David in der Nähe ist, und fällt weg, wenn er sich bewegt", () => {
  let s: StandortSpeicher = { ...LEERER_SPEICHER, standort: { lat: 50.2, lon: 8.9, tst: TST, ort: "Bahnhofstraße, Offenbach" } };
  s = neuerStand(s, { art: "ort", standort: { lat: 50.2005, lon: 8.9, tst: TST + 60 } });
  assert.equal(s.standort?.ort, "Bahnhofstraße, Offenbach");
  s = neuerStand(s, { art: "ort", standort: { lat: 50.3, lon: 8.9, tst: TST + 120 } });
  assert.equal(s.standort?.ort, undefined);
});

test("Text für Luca: wo und wie alt; zu alt wird ehrlich gesagt", () => {
  const jetzt = new Date((TST + 180) * 1000);
  assert.match(standortText({ lat: 50, lon: 8, tst: TST, ort: "Bahnhofstraße, Offenbach" }, jetzt), /Bahnhofstraße, Offenbach.*vor 3 Minuten/);
  assert.match(standortText({ lat: 50, lon: 8, tst: TST - 3 * 3600 }, jetzt), /letzter bekannter Standort/i);
  assert.match(standortText(null, jetzt), /nicht bekannt/);
});

test("Verschlüsselt: ohne Schlüssel unlesbar, mit Schlüssel wieder da, kaputt → null", () => {
  const g = verschluessele({ lat: 50.12345, lon: 8.1 }, "geheim");
  assert.ok(!g.includes("50.12"));
  assert.deepEqual(entschluessele(g, "geheim"), { lat: 50.12345, lon: 8.1 });
  assert.equal(entschluessele(g, "falsch"), null);
  assert.equal(entschluessele("kaputt", "geheim"), null);
});

test("App-Einrichtung per Link: HTTP-Modus, Passwort, sparsame Ortung, Orte als Regionen", () => {
  const k = owntracksKonfig({ url: "https://agentsgilt.com/api/standort", benutzer: "david", passwort: "pw", orte: [ZUHAUSE] }, TST);
  assert.equal(k._type, "configuration");
  assert.equal(k.mode, 3);
  assert.equal(k.auth, true);
  assert.equal(k.monitoring, 1);
  assert.equal(k.tid, "DH");
  assert.equal(k.cmd, true);
  assert.deepEqual(k.waypoints, [{ _type: "waypoint", desc: "Zuhause", lat: 50.12, lon: 8.83, rad: 120, tst: TST }]);
  const l = owntracksLink(k);
  assert.ok(l.startsWith("owntracks:///config?inline="));
  assert.equal(JSON.parse(Buffer.from(decodeURIComponent(l.split("inline=")[1]), "base64").toString()).url, "https://agentsgilt.com/api/standort");
});

test("Neue Orte kommen als Befehl zur App, die Region bleibt stabil", () => {
  const b = wegpunkteBefehl([ZUHAUSE], TST);
  assert.equal(b._type, "cmd");
  assert.equal(b.action, "setWaypoints");
  assert.equal(b.waypoints.waypoints[0].desc, "Zuhause");
  assert.equal(abstandM({ lat: 50, lon: 8 }, { lat: 50, lon: 8 }), 0);
  assert.ok(Math.abs(abstandM({ lat: 50, lon: 8 }, { lat: 50.01, lon: 8 }) - 1112) < 5);
});

test("Speicher passt immer in eine Nachricht: Erst fällt das Älteste, dann die zweiten Namen", async () => {
  const { passendKlein } = await import("../lib/standort-logik.ts");
  const orte = [{ name: "Relax Fit", lat: 1, lon: 2, rad: 100, auch: ["A".repeat(500)] }];
  const ereignisse = Array.from({ length: 8 }, (_, i) => ({ art: "ankunft" as const, ort: "x".repeat(100), tst: i }));
  const s = { standort: null, orte, drin: [], ereignisse };
  const laenge = (x: unknown) => JSON.stringify(x).length;
  const mitte = passendKlein(s, laenge, 800);
  assert.ok(mitte && laenge(mitte) <= 800);
  assert.equal(mitte.ereignisse.at(-1)?.tst, 7);
  assert.equal(mitte.orte[0].auch?.length, 1);
  const klein = passendKlein(s, laenge, 200);
  assert.ok(klein);
  assert.equal(klein.ereignisse.length, 0);
  assert.equal(klein.orte[0].auch, undefined);
  assert.equal(passendKlein(s, laenge, 10), null);
});
