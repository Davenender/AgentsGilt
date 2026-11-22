// Tests für die Lesesperre im Lernpfad (22.11.2026): „Weiter ▶“ und „✅ Gelesen“ erst nach kurzer Lesezeit.
// Nur reine Logik. Der Lesestand steckt im Knopf, der Merkzettel bleibt unverändert.
import assert from "node:assert/strict";
import { test } from "node:test";
import { blaettern, freiAb, gelesenKnopf, gelesenPruefen, leseKnopf, lektionsAnsicht, sperrSekunden, type Lektion } from "../lib/akademie.ts";

const woerter = (n: number) => Array.from({ length: n }, (_, i) => `wort${i}`).join(" ");
const S500 = woerter(500); // Sperre 60 s
const S200 = woerter(200); // Sperre 20 s
const S10 = woerter(10); // Sperre 5 s
const L: Lektion = { id: "id-1.1", nr: "1.1", titel: "Lektion 1.1", einheit: 1, einheitName: "Einheit 1", reihenfolge: 1, fuer: ["Team"], minuten: 6, freigegeben: true };
const ids = (a: ReturnType<typeof lektionsAnsicht>) => a.components[0].components.map((c) => c.custom_id);

test("Sperrzeit: 300 Wörter pro Minute, davon 40 % ab (mindestens 20 s), 5 s bis 3 Min.", () => {
  assert.equal(sperrSekunden(S500), 60, "volle Seite: 100 s → 60 s");
  assert.equal(sperrSekunden(woerter(300)), 36, "60 s → 36 s");
  assert.equal(sperrSekunden(woerter(250)), 30, "50 s → 30 s");
  assert.equal(sperrSekunden(S200), 20, "40 s → 20 s (20 s ab)");
  assert.equal(sperrSekunden(S10), 5, "kurze Seite: mindestens 5 s");
  assert.equal(sperrSekunden(""), 5, "leere Seite: 5 s");
  assert.equal(sperrSekunden(woerter(2000)), 180, "höchstens 3 Min.");
  assert.equal(sperrSekunden("**Wort** — • --- 12 € ✅ Wort"), sperrSekunden(woerter(3)), "nur Wörter und Zahlen zählen");
});

test("freiAb: Zeit der weitesten Seite plus deren Sperre", () => {
  assert.equal(freiAb([S500, S200], { f: 0, t: 1000 }), 1060);
  assert.equal(freiAb([S500, S200], { f: 1, t: 1000 }), 1020);
  assert.equal(freiAb([S500, S200], { f: 7, t: 1000 }), 1020, "Lektion kürzer geworden: letzte Seite zählt");
});

test("Blättern: neue Seite erst nach der Sperre, sonst bleibt die Seite stehen", () => {
  const s = [S500, S200, S10];
  assert.deepEqual(blaettern(s, 1, { f: 0, t: 1000 }, 1059), { seite: 0, stand: { f: 0, t: 1000 }, zuFrueh: true });
  assert.deepEqual(blaettern(s, 1, { f: 0, t: 1000 }, 1060), { seite: 1, stand: { f: 1, t: 1060 }, zuFrueh: false });
});

test("Blättern: zurück und wieder vor auf gesehene Seiten ohne Warten", () => {
  const s = [S500, S200, S10];
  assert.deepEqual(blaettern(s, 0, { f: 1, t: 1060 }, 1061), { seite: 0, stand: { f: 1, t: 1060 }, zuFrueh: false });
  assert.deepEqual(blaettern(s, 1, { f: 1, t: 1060 }, 1062), { seite: 1, stand: { f: 1, t: 1060 }, zuFrueh: false }, "Zeit der weitesten Seite bleibt");
  assert.deepEqual(blaettern(s, 2, { f: 1, t: 1060 }, 1062), { seite: 1, stand: { f: 1, t: 1060 }, zuFrueh: true }, "die Sperre läuft weiter");
});

test("Blättern: höchstens eine neue Seite auf einmal (Doppelklick, alter Knopf)", () => {
  const s = [S500, S200, S10];
  assert.deepEqual(blaettern(s, 2, { f: 0, t: 1000 }, 5000), { seite: 1, stand: { f: 1, t: 5000 }, zuFrueh: false });
});

test("Blättern: alte Knöpfe ohne Zeit gehen ohne Sperre, die Zeit beginnt auf der neuen Seite", () => {
  assert.deepEqual(blaettern([S500, S200], 1, null, 7000), { seite: 1, stand: { f: 1, t: 7000 }, zuFrueh: false });
});

test("Blättern: Seitenzahl außerhalb (Lektion in Notion kürzer geworden) wird begrenzt", () => {
  assert.deepEqual(blaettern([S500, S200], 6, { f: 5, t: 1000 }, 1001), { seite: 1, stand: { f: 1, t: 1000 }, zuFrueh: false });
  assert.deepEqual(blaettern([S500, S200], -3, { f: 1, t: 1000 }, 1001), { seite: 0, stand: { f: 1, t: 1000 }, zuFrueh: false });
  assert.deepEqual(blaettern([S500, S200], 9, null, 1001), { seite: 1, stand: { f: 1, t: 1001 }, zuFrueh: false });
});

test("Gelesen: erst nach der Sperre der letzten Seite", () => {
  const s = [S500, S200];
  assert.deepEqual(gelesenPruefen(s, { f: 1, t: 1000 }, 1019), { ok: false, seite: 1, stand: { f: 1, t: 1000 } });
  assert.deepEqual(gelesenPruefen(s, { f: 1, t: 1000 }, 1020), { ok: true });
  assert.deepEqual(gelesenPruefen(s, { f: 9, t: 1000 }, 1020), { ok: true }, "Lektion kürzer geworden: letzte Seite zählt");
});

test("Gelesen: noch nicht auf der letzten Seite (Lektion länger geworden) → zurück auf die weiteste Seite", () => {
  assert.deepEqual(gelesenPruefen([S500, S200, S10], { f: 1, t: 1000 }, 9999), { ok: false, seite: 1, stand: { f: 1, t: 1000 } });
});

test("Gelesen: alter Knopf ohne Zeit geht wie bisher", () => {
  assert.deepEqual(gelesenPruefen([S500], null, 1), { ok: true });
});

test("Knöpfe lesen: alte und neue Form", () => {
  assert.deepEqual(leseKnopf("s:abc-123:2"), { lid: "abc-123", ziel: 2, stand: null });
  assert.deepEqual(leseKnopf("s:abc-123:2:1:1763800000"), { lid: "abc-123", ziel: 2, stand: { f: 1, t: 1763800000 } });
  assert.deepEqual(leseKnopf("s:abc-123:x"), { lid: "abc-123", ziel: 0, stand: null });
  assert.deepEqual(leseKnopf("s:abc-123:2:x:y"), { lid: "abc-123", ziel: 2, stand: null }, "kaputter Stand = alter Knopf");
  assert.deepEqual(gelesenKnopf("g:abc-123"), { lid: "abc-123", stand: null });
  assert.deepEqual(gelesenKnopf("g:abc-123:1:1763800000"), { lid: "abc-123", stand: { f: 1, t: 1763800000 } });
});

test("Ansicht mit Sperre: Knöpfe tragen den Stand, oben steht der Countdown", () => {
  const a = lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 0, t: 1000 }, jetzt: 1000 });
  assert.deepEqual(ids(a), ["ak:s:id-1.1:0:0:1000", "ak:s:id-1.1:1:0:1000"]);
  assert.equal(a.content, "⏳ Weiter frei <t:1060:R>");
  const z = lektionsAnsicht(L, [S500, S200], 1, false, "lernen", { stand: { f: 1, t: 2000 }, jetzt: 2000 });
  assert.deepEqual(ids(z), ["ak:s:id-1.1:0:1:2000", "ak:g:id-1.1:1:2000"]);
  assert.equal(z.content, "⏳ Gelesen frei <t:2020:R>");
});

test("Ansicht mit Sperre: Hinweis bei zu frühem Klick", () => {
  const a = lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 0, t: 1000 }, jetzt: 1030, zuFrueh: true });
  assert.equal(a.content, "⏳ Noch zu früh. Lies in Ruhe, frei <t:1060:R>.");
});

test("Ansicht mit Sperre: kein Countdown auf gesehenen Seiten und nach Ablauf", () => {
  assert.equal(lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 1, t: 2000 }, jetzt: 2001 }).content, "");
  assert.equal(lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 0, t: 1000 }, jetzt: 1060 }).content, "");
});

test("Ansicht ohne Sperre (Nachlesen) bleibt wie bisher", () => {
  const n = lektionsAnsicht(L, [S500, S200], 0, false, "lesen");
  assert.deepEqual(ids(n), ["ak:z:id-1.1:0", "ak:z:id-1.1:1"]);
  assert.equal(n.content, undefined);
});

test("Knöpfe bleiben unter 100 Zeichen (echte Notion-ID, viele Seiten)", () => {
  const lang: Lektion = { ...L, id: "1a2b3c4d-1234-5678-9abc-def012345678" };
  const s = Array.from({ length: 100 }, () => S10);
  for (const i of [0, 98, 99]) {
    const a = lektionsAnsicht(lang, s, i, false, "lernen", { stand: { f: 99, t: 1763800000 }, jetzt: 1763800000 });
    for (const id of ids(a)) assert.ok(id.length <= 100, `${id} (${id.length})`);
  }
});
