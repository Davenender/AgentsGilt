// Das Chat-Fenster wird zur Kugel und zurück: die Form je Zeitpunkt (components/neu/chat/kugel.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { DAUER, ECKE, KREIS, PHASEN, RECHTECK, SCHLIESSEN, STUETZEN, formAnteil, formBei, hebung, inhaltAnteil, innen, teileVon, zeitleiste, type Masse } from "../components/neu/chat/kugel.ts";

// Fenster 404 × 660, der Chat-Knopf (64 px) sitzt unten rechts, 40 px vom Rand des Rahmens.
const RECHNER: Masse = { b: 404, h: 660, kx: 364, ky: 620, d: 64, handy: false };
const HANDY: Masse = { b: 375, h: 763, kx: 323, ky: 731, d: 64, handy: true };

test("Öffnen dauert rund 1,1 s, Schließen rund 0,6 s", () => {
  assert.equal(DAUER, 1100);
  assert.equal(SCHLIESSEN, 600);
});

test("am Anfang ist die Form genau der Chat-Knopf: ein Kreis an seiner Stelle", () => {
  for (const m of [RECHNER, HANDY]) {
    const k = formBei(0, m);
    assert.deepEqual({ b: k.b, h: k.h }, { b: m.d, h: m.d });
    assert.ok(Math.abs(k.x + k.b / 2 - m.kx) < 1e-9 && Math.abs(k.y + k.h / 2 - m.ky) < 1e-9, "Mitte auf dem Knopf");
    assert.equal(k.oben, m.d / 2);
    assert.equal(k.unten, m.d / 2);
  }
});

test("am Ende ist sie genau das Fenster: volle Größe, Ecken 26 px (am Handy unten eckig)", () => {
  const k = formBei(1, RECHNER);
  assert.deepEqual({ x: k.x, y: k.y, b: k.b, h: k.h }, { x: 0, y: 0, b: 404, h: 660 });
  assert.ok(Math.abs(k.oben - ECKE) < 1e-9 && Math.abs(k.unten - ECKE) < 1e-9);
  const h = formBei(1, HANDY);
  assert.deepEqual({ b: h.b, h: h.h }, { b: 375, h: 763 });
  assert.ok(Math.abs(h.oben - ECKE) < 1e-9);
  assert.equal(h.unten, 0);
});

test("dazwischen wächst die Form stetig und wird immer eckiger (rückwärts: schrumpft und wird immer runder)", () => {
  let vorher = formBei(PHASEN.form[0], RECHNER);
  // Bis kurz vor die leichte Feder am Ende.
  for (let u = PHASEN.form[0] + 0.01; u <= 0.4; u += 0.01) {
    const k = formBei(u, RECHNER);
    assert.ok(k.b >= vorher.b - 1e-9 && k.h >= vorher.h - 1e-9, `wächst bei ${u.toFixed(2)}`);
    const rund = k.oben / (Math.min(k.b, k.h) / 2);
    const rundVorher = vorher.oben / (Math.min(vorher.b, vorher.h) / 2);
    assert.ok(rund <= rundVorher + 1e-9, `eckiger bei ${u.toFixed(2)}`);
    // Nie runder als ein Kreis, nie über die Form hinaus.
    assert.ok(k.oben <= Math.min(k.b, k.h) / 2 + 1e-9);
    vorher = k;
  }
});

test("eine leichte Feder am Ende: höchstens gut 3 % über die Größe hinaus, dann genau das Fenster", () => {
  let hoechstens = 0;
  for (let u = 0; u <= 1; u += 0.002) hoechstens = Math.max(hoechstens, formAnteil(u));
  assert.ok(hoechstens > 1.005 && hoechstens < 1.04, String(hoechstens));
  assert.equal(formAnteil(1), 1);
  assert.equal(formAnteil(PHASEN.form[0]), 0);
});

test("die Kugel hebt sich am Anfang leicht und liegt wieder, wenn sie sich dehnt", () => {
  assert.equal(hebung(0), 0);
  assert.ok(hebung(0.13) > 0.95);
  assert.equal(hebung(0.5), 0);
  // Angehoben ist sie eine Spur größer und sitzt höher.
  const k = formBei(0.13, RECHNER);
  assert.ok(k.b > 64 && k.b < 70);
  assert.ok(k.y + k.h / 2 < RECHNER.ky);
});

test("der Inhalt kommt erst, wenn die Form fast steht; das echte Glas blendet erst am Ende ein", () => {
  assert.equal(inhaltAnteil(PHASEN.inhalt[0]), 0);
  assert.equal(inhaltAnteil(PHASEN.inhalt[1]), 1);
  assert.ok(formAnteil(PHASEN.inhalt[0]) > 0.9, "die Form steht fast, wenn der Inhalt beginnt");
  assert.ok(formAnteil(PHASEN.glas[0]) > 0.97, "das Glas (mit seiner Unschärfe) erst bei voller Größe");
  // Die Kugel deckt den Chat-Knopf, bevor der verschwindet (rückwärts: Er ist da, bevor sie vergeht).
  assert.ok(PHASEN.decken[1] < PHASEN.knopfWeg);
  // Rückwärts gelesen: erst der Stern, dann die Balken.
  assert.ok(PHASEN.stern[1] > PHASEN.balken[1]);
  // Kein Licht wandert: Das Logo der Kugel ist ganz ausgeblendet, bevor die Form sich dehnt.
  assert.ok(PHASEN.stern[1] <= PHASEN.form[0]);
  assert.ok(PHASEN.balken[1] <= PHASEN.form[0]);
});

test("das Logo der Kugel bleibt stehen, wo die Kugel war: Es wandert nicht mit der Form", () => {
  const z = zeitleiste(RECHNER);
  const ort = (i: number) => maße(z.logo[i].transform ?? "");
  const amStart = ort(0);
  const letzte = ort(STUETZEN);
  // Nur das leichte Anheben der Kugel (höchstens 6 px, eine Spur größer), kein Weg zur Fenstermitte.
  for (let i = 0; i <= STUETZEN; i++) {
    const o = ort(i);
    assert.ok(Math.abs(o.x - amStart.x) < 4 && Math.abs(o.y - amStart.y) < 10, `Stützstelle ${i}: ${JSON.stringify(o)}`);
  }
  // Ab dem Beginn der Formveränderung steht es ganz still.
  const ab = Math.ceil(PHASEN.form[0] * STUETZEN);
  for (let i = ab; i <= STUETZEN; i++) assert.deepEqual(ort(i), letzte);
});

const maße = (transform: string) => {
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)(?:, ([\d.]+))?\)/.exec(transform);
  assert.ok(m, transform);
  return { x: Number(m[1]), y: Number(m[2]), sx: Number(m[3]), sy: Number(m[4] ?? m[3]) };
};

test("sieben Teile ergeben zusammen genau die Form: drei Rechtecke und vier Kreise, nur verschoben und skaliert", () => {
  for (const u of [0, 0.2, 0.33, 0.5, 1]) {
    for (const m of [RECHNER, HANDY]) {
      const k = formBei(u, m);
      const teile = teileVon(k).map(maße);
      assert.equal(teile.length, 7);
      // Die Rechtecke reichen links und rechts bis an die Form, oben und unten ebenso.
      const [mitte, oben, unten, ...kreise] = teile;
      assert.ok(Math.abs(mitte.x - k.x) < 0.01 && Math.abs(mitte.sx * RECHTECK - k.b) < 0.01, `Mittelstück über die ganze Breite (u=${u})`);
      assert.ok(Math.abs(oben.y - k.y) < 0.01, "der obere Streifen beginnt an der Oberkante");
      assert.ok(Math.abs(unten.y + unten.sy * RECHTECK - (k.y + k.h)) < 0.01, "der untere Streifen endet an der Unterkante");
      // Die Kreise sitzen in den Ecken und sind echte Kreise (eine Größe für beide Richtungen).
      for (const kreis of kreise) assert.equal(kreis.sx, kreis.sy);
      assert.ok(Math.abs(kreise[0].x - k.x) < 0.01 && Math.abs(kreise[0].y - k.y) < 0.01, "Kreis oben links in der Ecke");
      assert.ok(Math.abs(kreise[3].x + kreise[3].sx * KREIS - (k.x + k.b)) < 0.01, "Kreis unten rechts schließt rechts ab");
      assert.ok(Math.abs(kreise[0].sx * KREIS - 2 * k.oben) < 0.01, "Radius der oberen Ecken");
      assert.ok(Math.abs(kreise[2].sx * KREIS - 2 * k.unten) < 0.01, "Radius der unteren Ecken");
    }
  }
});

test("der Goldrand ist rundum 1 px: Die Fläche liegt 1 px innerhalb der Form", () => {
  const k = formBei(0.4, RECHNER);
  const f = innen(k);
  assert.deepEqual({ x: f.x - k.x, y: f.y - k.y, b: k.b - f.b, h: k.h - f.h }, { x: 1, y: 1, b: 2, h: 2 });
  assert.ok(Math.abs(k.oben - f.oben - 1) < 1e-9);
});

test("die Zeitleiste hat für jedes Teil gleich viele Stützstellen von 0 bis 1", () => {
  const z = zeitleiste(RECHNER);
  assert.equal(z.rand.length, 7);
  assert.equal(z.flaeche.length, 7);
  for (const reihe of [...z.rand, ...z.flaeche, z.logo]) {
    assert.equal(reihe.length, STUETZEN + 1);
    assert.equal(reihe[0].offset, 0);
    assert.equal(reihe[reihe.length - 1].offset, 1);
    for (const bild of reihe) assert.ok(typeof bild.transform === "string" && !/NaN|Infinity/.test(bild.transform), bild.transform);
  }
  // Kein Licht in der Form: Den goldenen Schein, der mit der Form vom Knopf zur Fenstermitte wanderte, gibt es nicht mehr.
  assert.ok(!("glut" in z));
  // Das Logo beginnt genau auf dem Knopf (in seiner Größe), auch wenn der Magnet es gerade verschiebt.
  const mitZug = zeitleiste(RECHNER, { x: 4, y: -2 });
  assert.deepEqual(maße(mitZug.logo[0].transform ?? ""), { x: 364 - 32 + 4, y: 620 - 32 - 2, sx: 1, sy: 1 });
});
