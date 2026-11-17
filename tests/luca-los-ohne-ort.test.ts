import assert from "node:assert/strict";
import { test } from "node:test";
import { losSatz } from "../lib/luca-unterwegs.ts";
import { setzeOrteNoetig } from "../lib/standort-logik.ts";

// 17.11.2026, Test-Anruf 18:52: „Wann muss ich morgen zur Tanzschule los?“ – Im Kalender steht nur „Tanzschule“ ohne Ort,
// Luca fragte dreimal „Wohin genau?“. Dabei kennt er die Tanzschule aus Davids Orten (Adressbuch).
const JETZT = new Date("2026-11-17T18:00:00.000Z");
const tst = Math.floor(JETZT.getTime() / 1000) - 120;
const welt = {
  standort: { lat: 50.109955, lon: 8.843467, tst, ort: "Zuhause" },
  orte: [
    { name: "Zuhause", lat: 50.109955, lon: 8.843467, rad: 120 },
    { name: "Schule", lat: 50.1229, lon: 8.8427, rad: 200 },
    { name: "Tanzschule", lat: 50.104623, lon: 8.759126, rad: 150, auch: ["Tanzen"] },
    { name: "Gym", lat: 50.117971, lon: 8.859322, rad: 150, auch: ["Pumpstation"] },
  ],
  jetzt: JETZT,
};
const netz = (aufrufe: string[] = []) =>
  (async (u: string | URL) => {
    aufrufe.push(String(u));
    return new Response(JSON.stringify({ code: "Ok", routes: [{ duration: 960 }] }), { status: 200 });
  }) as typeof fetch;
const morgen = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 18, h - 1, m)).toISOString();

test("Termin ohne Ort, aber mit bekanntem Ort im Titel: Luca rechnet zur Tanzschule", async () => {
  const aufrufe: string[] = [];
  const t = await losSatz([{ titel: "Tanzschule", start: morgen(17, 30), ganztags: false }], welt, JETZT, netz(aufrufe));
  assert.match(t, /^Nächster Termin: Tanzschule, Mittwoch um 17:30 Uhr/);
  assert.match(t, /Fahrt etwa 16 Minuten/);
  assert.match(t, /muss um 17:04 Uhr los/);
  assert.ok(aufrufe.some((u) => u.includes("8.759126,50.104623")), "rechnet bis zu den Koordinaten der Tanzschule");
});

test("„Schule“ steckt nicht in „Tanzschule“; Pumpstation zählt fürs Gym", async () => {
  const t = await losSatz([{ titel: "Training Pumpstation", start: morgen(16), ganztags: false }], welt, JETZT, netz());
  assert.match(t, /Training Pumpstation, Mittwoch um 16:00 Uhr, Gym/);
  const nichts = await losSatz([{ titel: "Zahnarzt", start: morgen(9), ganztags: false }], welt, JETZT, netz());
  assert.match(nichts, /kein Termin mit Ort/);
});

test("Mit Ziel: genau dieser Termin, auch wenn vorher ein anderer kommt", async () => {
  const termine = [
    { titel: "Mathe-Nachhilfe", start: morgen(15), ganztags: false, ort: "Bahnhofstraße 1, Mühlheim" },
    { titel: "Tanzschule", start: morgen(17, 30), ganztags: false },
  ];
  assert.match(await losSatz(termine, welt, JETZT, netz(), "Tanzschule"), /^Nächster Termin: Tanzschule, Mittwoch um 17:30 Uhr/);
  assert.match(await losSatz(termine, welt, JETZT, netz(), "tanzen"), /^Nächster Termin: Tanzschule/);
  assert.match(await losSatz(termine, welt, JETZT, netz(), "Kino"), /kein Termin „Kino“/);
});

test("OwnTracks: Orte noch einmal schicken, wenn sie gleich sind, nur mit „erneut“", () => {
  const orte = [{ name: "Zuhause", lat: 1, lon: 2, rad: 100 }];
  assert.equal(setzeOrteNoetig(orte, orte, false), false);
  assert.equal(setzeOrteNoetig(orte, orte, true), true);
  assert.equal(setzeOrteNoetig(orte, [{ ...orte[0], rad: 150 }], false), true);
});
