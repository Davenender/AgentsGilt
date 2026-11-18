import assert from "node:assert/strict";
import { test } from "node:test";
import { lageTermine, losSatz, mischeTermine } from "../lib/luca-unterwegs.ts";
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

// Zweiter Test-Anruf 19:33: wann_muss_ich_los(ziel Tanzschule) → „kein Termin“. Die Tanzschule steht in Davids
// Privatkalender, der Server liest nur den Geschäftskalender. Die Zentrale schreibt beide in den Lagebericht.
const LAGE = {
  stand: "2026-11-17T18:30:00.000Z",
  text: "Schule morgen: …\n\nTermine (Geschäft und privat):\n- heute 21:00 Abendessen\n- morgen 17:30 Tanzschule\n- morgen ganztags Feiertag\n- morgen 09:00 Zahnarzt (Bahnhofstraße 1)\n\nKunden: …",
};

test("Termine aus dem Lagebericht (auch privat) mit Berliner Uhrzeit", () => {
  assert.deepEqual(lageTermine(LAGE), [
    { titel: "Abendessen", start: "2026-11-17T20:00:00.000Z", ganztags: false },
    { titel: "Tanzschule", start: "2026-11-18T16:30:00.000Z", ganztags: false },
    { titel: "Feiertag", start: "2026-11-18", ganztags: true },
    { titel: "Zahnarzt", start: "2026-11-18T08:00:00.000Z", ganztags: false, ort: "Bahnhofstraße 1" },
  ]);
  assert.deepEqual(lageTermine({ stand: "x", text: "Termine heute und morgen: keine." }), []);
  assert.deepEqual(lageTermine(null), []);
});

test("Geschäfts- und Privattermine zusammen, ohne Doppelte; Tanzschule wird gefunden", async () => {
  // Google liefert die Zeit mit Versatz (+01:00), der Lagebericht in UTC: trotzdem derselbe Termin
  const geschaeft = [{ titel: "Zahnarzt", start: "2026-11-18T09:00:00+01:00", ganztags: false, ort: "Bahnhofstraße 1, 63165 Mühlheim" }];
  const alle = mischeTermine(geschaeft, lageTermine(LAGE));
  assert.equal(alle!.filter((t) => t.titel === "Zahnarzt").length, 1);
  assert.equal(alle!.find((t) => t.titel === "Zahnarzt")!.ort, "Bahnhofstraße 1, 63165 Mühlheim", "der Geschäftskalender hat den vollen Ort");
  assert.equal(mischeTermine(null, []), null, "ohne beides: Kalender antwortet nicht");
  assert.equal(mischeTermine(null, lageTermine(LAGE))!.length, 4);
  assert.match(await losSatz(alle, welt, JETZT, netz(), "Tanzschule"), /^Nächster Termin: Tanzschule, Mittwoch um 17:30 Uhr/);
});

// 18.11. 07:32: „Wann muss ich morgen los?“ – das Werkzeug nahm den nächsten Termin (heute 08:00 Schule) statt morgen.
test("Mit tag „morgen“: nur Termine von morgen (heute früh zählt nicht)", async () => {
  const jetzt = new Date("2026-11-18T06:32:00Z"); // Mi 07:32
  const termine = [
    { titel: "Schule: 1. Stunde Geschichte", start: "2026-11-18T07:00:00.000Z", ganztags: false },
    { titel: "Schule: 3. Stunde Deutsch", start: "2026-11-19T08:55:00.000Z", ganztags: false },
  ];
  const w = { ...welt, jetzt };
  assert.match(await losSatz(termine, w, jetzt, netz(), undefined, "morgen"), /^Nächster Termin: Schule: 3\. Stunde Deutsch, Donnerstag um 09:55 Uhr/);
  assert.match(await losSatz(termine, w, jetzt, netz(), "Schule", "morgen"), /Donnerstag um 09:55 Uhr/);
  assert.match(await losSatz(termine, w, jetzt, netz(), undefined, "heute"), /Mittwoch um 08:00 Uhr/);
  assert.match(await losSatz(termine, w, jetzt, netz()), /Mittwoch um 08:00 Uhr/);
});
