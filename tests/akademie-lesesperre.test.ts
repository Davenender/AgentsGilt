// Tests für die Lesesperre im Lernpfad (22.11.2026): „Weiter ▶“ und „✅ Gelesen“ erst nach kurzer Lesezeit.
// Nur reine Logik. Der Lesestand steckt im Knopf, der Merkzettel bleibt unverändert.
import assert from "node:assert/strict";
import { test } from "node:test";
import { blaettern, countdown, countdownText, freiAb, gelesenKnopf, gelesenPruefen, leseKnopf, lektionsAnsicht, sperrSekunden, type Lektion } from "../lib/akademie.ts";
import { zaehleRunter, zeigtKnopf, type PatchAntwort } from "../lib/akademie-countdown.ts";

const woerter = (n: number) => Array.from({ length: n }, (_, i) => `wort${i}`).join(" ");
const S500 = woerter(500); // Sperre 85 s
const S200 = woerter(200); // Sperre 34 s
const S10 = woerter(10); // Sperre 5 s
const L: Lektion = { id: "id-1.1", nr: "1.1", titel: "Lektion 1.1", einheit: 1, einheitName: "Einheit 1", reihenfolge: 1, fuer: ["Team"], minuten: 6, freigegeben: true };
const ids = (a: ReturnType<typeof lektionsAnsicht>) => a.components[0].components.map((c) => c.custom_id);

test("Sperrzeit: 300 Wörter pro Minute, davon 15 % ab, 5 s bis 3 Min.", () => {
  assert.equal(sperrSekunden(S500), 85, "volle Seite: 100 s → 85 s");
  assert.equal(sperrSekunden(woerter(300)), 51, "60 s → 51 s");
  assert.equal(sperrSekunden(woerter(240)), 41, "48 s → 41 s");
  assert.equal(sperrSekunden(S200), 34, "40 s → 34 s");
  assert.equal(sperrSekunden(S10), 5, "kurze Seite: mindestens 5 s");
  assert.equal(sperrSekunden(""), 5, "leere Seite: 5 s");
  assert.equal(sperrSekunden(woerter(2000)), 180, "höchstens 3 Min.");
  assert.equal(sperrSekunden("**Wort** — • --- 12 € ✅ Wort"), sperrSekunden(woerter(3)), "nur Wörter und Zahlen zählen");
});

test("freiAb: Zeit der weitesten Seite plus deren Sperre", () => {
  assert.equal(freiAb([S500, S200], { f: 0, t: 1000 }), 1085);
  assert.equal(freiAb([S500, S200], { f: 1, t: 1000 }), 1034);
  assert.equal(freiAb([S500, S200], { f: 7, t: 1000 }), 1034, "Lektion kürzer geworden: letzte Seite zählt");
});

test("Blättern: neue Seite erst nach der Sperre, sonst bleibt die Seite stehen", () => {
  const s = [S500, S200, S10];
  assert.deepEqual(blaettern(s, 1, { f: 0, t: 1000 }, 1084), { seite: 0, stand: { f: 0, t: 1000 }, zuFrueh: true });
  assert.deepEqual(blaettern(s, 1, { f: 0, t: 1000 }, 1085), { seite: 1, stand: { f: 1, t: 1085 }, zuFrueh: false });
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
  assert.deepEqual(gelesenPruefen(s, { f: 1, t: 1000 }, 1033), { ok: false, seite: 1, stand: { f: 1, t: 1000 } });
  assert.deepEqual(gelesenPruefen(s, { f: 1, t: 1000 }, 1034), { ok: true });
  assert.deepEqual(gelesenPruefen(s, { f: 9, t: 1000 }, 1034), { ok: true }, "Lektion kürzer geworden: letzte Seite zählt");
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
  assert.equal(a.content, "⏳ Weiter frei in 85 Sek.");
  const z = lektionsAnsicht(L, [S500, S200], 1, false, "lernen", { stand: { f: 1, t: 2000 }, jetzt: 2000 });
  assert.deepEqual(ids(z), ["ak:s:id-1.1:0:1:2000", "ak:g:id-1.1:1:2000"]);
  assert.equal(z.content, "⏳ Gelesen frei in 34 Sek.");
});

test("Ansicht mit Sperre: Hinweis bei zu frühem Klick", () => {
  const a = lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 0, t: 1000 }, jetzt: 1030, zuFrueh: true });
  assert.equal(a.content, "⏳ Noch zu früh. Weiter frei in 55 Sek.");
});

test("Ansicht mit Sperre: kein Countdown auf gesehenen Seiten und nach Ablauf", () => {
  assert.equal(lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 1, t: 2000 }, jetzt: 2001 }).content, "");
  assert.equal(lektionsAnsicht(L, [S500, S200], 0, false, "lernen", { stand: { f: 0, t: 1000 }, jetzt: 1085 }).content, "");
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

// ------------------------------------------------ Countdown jede Sekunde (22.11. abends)

test("Countdown-Text: Sekunden bis frei, leer wenn frei", () => {
  assert.equal(countdownText("Weiter", 12), "⏳ Weiter frei in 12 Sek.");
  assert.equal(countdownText("Gelesen", 1), "⏳ Gelesen frei in 1 Sek.");
  assert.equal(countdownText("Weiter", 12, true), "⏳ Noch zu früh. Weiter frei in 12 Sek.");
  assert.equal(countdownText("Weiter", 0), "");
  assert.equal(countdownText("Weiter", -3, true), "");
});

test("countdown: nur auf der weitesten Seite, solange gesperrt", () => {
  assert.deepEqual(countdown(L, [S500, S200], 0, { stand: { f: 0, t: 1000 }, jetzt: 1000 }), { frei: 1085, knopf: "Weiter", knopfId: "ak:s:id-1.1:1:0:1000" });
  assert.deepEqual(countdown(L, [S500, S200], 1, { stand: { f: 1, t: 2000 }, jetzt: 2019 }), { frei: 2034, knopf: "Gelesen", knopfId: "ak:g:id-1.1:1:2000" });
  assert.equal(countdown(L, [S500, S200], 0, { stand: { f: 1, t: 2000 }, jetzt: 2001 }), null, "gesehene Seite");
  assert.equal(countdown(L, [S500, S200], 0, { stand: { f: 0, t: 1000 }, jetzt: 1085 }), null, "schon frei");
});

test("zeigtKnopf: erkennt, ob die Karte noch dieselbe Seite zeigt", () => {
  const msg = { components: [{ components: [{ custom_id: "ak:s:id-1.1:0:0:1000" }, { custom_id: "ak:s:id-1.1:1:0:1000" }] }] };
  assert.equal(zeigtKnopf(msg, "ak:s:id-1.1:1:0:1000"), true);
  assert.equal(zeigtKnopf(msg, "ak:s:id-1.1:2:1:1060"), false);
  assert.equal(zeigtKnopf(null, "x"), false);
  assert.equal(zeigtKnopf({ components: "kaputt" }, "x"), false);
});

/** Uhr und Discord zum Testen: schlafen schiebt die Uhr vor, patch merkt sich den Text. */
function bauHelfer(startMs: number, antworten: (n: number, text: string) => PatchAntwort | null = () => ({ status: 200, nachricht: MSG })) {
  let uhr = startMs;
  const texte: string[] = [];
  const schlaf: number[] = [];
  return {
    texte,
    schlaf,
    deps: {
      jetzt: () => uhr,
      schlafe: async (ms: number) => {
        schlaf.push(ms);
        uhr += ms;
      },
      patch: async (text: string) => {
        texte.push(text);
        return antworten(texte.length, text);
      },
    },
  };
}
const KNOPF = "ak:s:id-1.1:1:0:1000";
const MSG = { components: [{ components: [{ custom_id: "ak:s:id-1.1:0:0:1000" }, { custom_id: KNOPF }] }] };

test("zaehleRunter: jede volle Sekunde neu, am Ende verschwindet die Zeile", async () => {
  const h = bauHelfer(1_000_400);
  const ende = await zaehleRunter(h.deps, { knopf: "Weiter", knopfId: KNOPF, frei: 1003, bisMs: 2_000_000 });
  assert.equal(ende, "frei");
  assert.deepEqual(h.texte, ["⏳ Weiter frei in 2 Sek.", "⏳ Weiter frei in 1 Sek.", ""]);
  assert.deepEqual(h.schlaf, [600, 1000, 1000], "immer bis zur nächsten vollen Sekunde");
});

test("zaehleRunter: Person hat geblättert → eigene Zeile wieder weg, Schluss", async () => {
  const h = bauHelfer(1_000_000, (n) => ({ status: 200, nachricht: n === 1 ? { components: [{ components: [{ custom_id: "ak:s:id-1.1:1:1:1001" }] }] } : MSG }));
  assert.equal(await zaehleRunter(h.deps, { knopf: "Weiter", knopfId: KNOPF, frei: 1010, bisMs: 2_000_000 }), "geblaettert");
  assert.deepEqual(h.texte, ["⏳ Weiter frei in 9 Sek.", ""]);
});

test("zaehleRunter: Karte weg (verworfen, abgelaufen) → Schluss", async () => {
  const h = bauHelfer(1_000_000, () => ({ status: 404 }));
  assert.equal(await zaehleRunter(h.deps, { knopf: "Weiter", knopfId: KNOPF, frei: 1010, bisMs: 2_000_000 }), "weg");
  assert.equal(h.texte.length, 1);
});

test("zaehleRunter: Discord bremst (429) → warten und weiterzählen", async () => {
  const h = bauHelfer(1_000_000, (n) => (n === 1 ? { status: 429, retryAfter: 2 } : { status: 200, nachricht: MSG }));
  assert.equal(await zaehleRunter(h.deps, { knopf: "Weiter", knopfId: KNOPF, frei: 1005, bisMs: 2_000_000 }), "frei");
  assert.deepEqual(h.texte, ["⏳ Weiter frei in 4 Sek.", "⏳ Weiter frei in 1 Sek.", ""]);
});

test("zaehleRunter: hört vor dem Zeitlimit der Funktion auf", async () => {
  const h = bauHelfer(1_000_000);
  assert.equal(await zaehleRunter(h.deps, { knopf: "Weiter", knopfId: KNOPF, frei: 1100, bisMs: 1_003_500 }), "zeit");
  assert.deepEqual(h.texte, ["⏳ Weiter frei in 99 Sek.", "⏳ Weiter frei in 98 Sek.", "⏳ Weiter frei in 97 Sek."]);
});

test("zaehleRunter: dreimal kein Netz → Schluss", async () => {
  const h = bauHelfer(1_000_000, () => null);
  assert.equal(await zaehleRunter(h.deps, { knopf: "Weiter", knopfId: KNOPF, frei: 1100, bisMs: 2_000_000 }), "fehler");
  assert.equal(h.texte.length, 3);
});
