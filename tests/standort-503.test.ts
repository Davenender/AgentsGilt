// Davids Standort kam am 25./26.11.2026 stundenlang zu spät: OwnTracks schickt je Aufwachen 3–5 Meldungen in Sekunden, die
// 4./5. bekam 503 (Discord bremst mit 429 beim Speichern), danach hielt das iPhone den Rest bis zur nächsten Bewegung zurück
// (die Ankunft zu Hause um 21:10 kam erst am nächsten Morgen um 09:47). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mitWarten } from "../lib/discord-warten.ts";
import { LEERER_SPEICHER, neuerStand, schreibenNoetig, standortText, type StandortSpeicher } from "../lib/standort-logik.ts";

const antwort = (status: number, body: object = {}) => new Response(JSON.stringify(body), { status });

test("Discord bremst (429): warten, wie Discord sagt, und erneut versuchen", async () => {
  const antworten = [antwort(429, { retry_after: 0.01 }), antwort(429, { retry_after: 0.01 }), antwort(200, { ok: true })];
  const gewartet: number[] = [];
  let aufrufe = 0;
  const res = await mitWarten(async () => antworten[aufrufe++]!, { warte: async (ms) => void gewartet.push(ms) });
  assert.equal(res.status, 200);
  assert.equal(aufrufe, 3);
  assert.equal(gewartet.length, 2);
});

test("höchstens 4 Sekunden je Wartezeit und höchstens 3 Versuche", async () => {
  const gewartet: number[] = [];
  let aufrufe = 0;
  const res = await mitWarten(async () => (aufrufe++, antwort(429, { retry_after: 30 })), { warte: async (ms) => void gewartet.push(ms) });
  assert.equal(res.status, 429);
  assert.equal(aufrufe, 3);
  assert.ok(gewartet.every((ms) => ms <= 4100));
});

test("andere Fehler: kein Warten", async () => {
  let aufrufe = 0;
  const res = await mitWarten(async () => (aufrufe++, antwort(500)), { warte: async () => assert.fail("nicht warten") });
  assert.equal(res.status, 500);
  assert.equal(aufrufe, 1);
});

test("nichts Neues (nachgereichte ältere Meldung, doppelter Übergang): nicht in Discord schreiben", () => {
  const alt: StandortSpeicher = { ...LEERER_SPEICHER, standort: { lat: 50.1, lon: 8.8, tst: 2000 }, orte: [{ name: "Zuhause", lat: 50.1, lon: 8.8, rad: 120 }], drin: ["Zuhause"], ereignisse: [{ art: "ankunft", ort: "Zuhause", tst: 1990 }] };
  assert.equal(schreibenNoetig(alt, neuerStand(alt, { art: "ort", standort: { lat: 50.2, lon: 8.9, tst: 1500 } })), false);
  assert.equal(schreibenNoetig(alt, neuerStand(alt, { art: "uebergang", ereignis: { art: "ankunft", ort: "Zuhause", tst: 1995 } })), false);
  assert.equal(schreibenNoetig(alt, neuerStand(alt, { art: "ort", standort: { lat: 50.1, lon: 8.8, tst: 2600 } })), true);
  assert.equal(schreibenNoetig({ ...alt, orteNeu: true }, alt), true);
});

test("Luca am Telefon zweifelt einen älteren Standort nicht an", () => {
  const t = standortText({ lat: 50, lon: 8, tst: 1_000_000, ort: "Mühlheim" }, new Date((1_000_000 + 13 * 3600) * 1000));
  assert.doesNotMatch(t, /frag ihn/i);
  assert.match(t, /meldet sich nur, wenn er sich bewegt/);
});

test("28.11.: mit Zeitgrenze (bis) wird nicht mehr gewartet, wenn die Zeit nicht reicht – Vercel bricht nach 30 s ab", async () => {
  let uhr = 1_000_000;
  let aufrufe = 0;
  const gewartet: number[] = [];
  // 5 s Rest: einmal 4,1 s warten geht nicht (4,1 + 1 s Puffer > 5 s) – gleich zurück
  const res = await mitWarten(async () => (aufrufe++, antwort(429, { retry_after: 30 })), { bis: uhr + 5000, jetzt: () => uhr, warte: async (ms) => void ((uhr += ms), gewartet.push(ms)) });
  assert.equal(res.status, 429);
  assert.equal(aufrufe, 1);
  assert.deepEqual(gewartet, []);
  // genug Zeit für einen, nicht für zwei Versuche
  aufrufe = 0;
  const r2 = await mitWarten(async () => (aufrufe++, antwort(429, { retry_after: 2 })), { bis: uhr + 4000, jetzt: () => uhr, warte: async (ms) => void ((uhr += ms), gewartet.push(ms)) });
  assert.equal(r2.status, 429);
  assert.equal(aufrufe, 2);
  assert.deepEqual(gewartet, [2100]);
});
