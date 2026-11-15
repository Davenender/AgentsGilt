// Am Handy: Welche Karte steht in der Mitte des Bildschirms? (components/neu/mitte.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { karteInDerMitte, MITTE_BAND } from "../components/neu/mitte.ts";

const H = 800; // Bildhöhe: Mitte bei 400, Bereich ±48 px (12 %)

test("die Karte, die die Mittellinie überdeckt, gilt", () => {
  assert.equal(MITTE_BAND, 0.12);
  const karten = [
    { top: -300, bottom: 250 },
    { top: 280, bottom: 700 },
    { top: 730, bottom: 1200 },
  ];
  assert.equal(karteInDerMitte(karten, H), 1);
});

test("höchstens eine Karte: Steht der Spalt in der Mitte, gilt die nähere, solange sie im schmalen Bereich liegt", () => {
  // Spalt von 390 bis 420: Die obere ist 10 px weg, die untere 20 px.
  assert.equal(karteInDerMitte([{ top: 0, bottom: 390 }, { top: 420, bottom: 900 }], H), 0);
  assert.equal(karteInDerMitte([{ top: 0, bottom: 370 }, { top: 395, bottom: 900 }], H), 1);
  // Großer Spalt: keine Karte.
  assert.equal(karteInDerMitte([{ top: 0, bottom: 300 }, { top: 500, bottom: 900 }], H), -1);
});

test("weiterscrollen: erst Karte 1, dann keine, dann Karte 2, und zurück wieder Karte 1", () => {
  const karte = (top: number) => ({ top, bottom: top + 500 });
  const lage = (y: number) => karteInDerMitte([karte(600 - y), karte(1200 - y)], H);
  assert.equal(lage(0), -1, "Karte 1 noch unter dem Bereich");
  assert.equal(lage(300), 0);
  assert.equal(lage(700), 0);
  assert.equal(lage(750), -1, "mitten im Spalt zwischen den Karten");
  assert.equal(lage(760), 1, "die nächste Karte ist schon im schmalen Bereich");
  assert.equal(lage(900), 1);
  assert.equal(lage(400), 0, "zurück: wieder Karte 1");
});

test("keine Karten, kein Ergebnis", () => {
  assert.equal(karteInDerMitte([], H), -1);
});
