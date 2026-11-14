// Glaskarten unter der ersten Aussage: woher der Stern kommt und wie das Mauslicht abklingt.
import assert from "node:assert/strict";
import { test } from "node:test";
import { UMKREIS, ausserhalb, wortLicht } from "../components/neu/seite/glaskarten.ts";

test("der Stern beginnt außerhalb der Kante, über die die Maus kam", () => {
  // Karte 376 × 295, der Stern wartet 170 px außerhalb.
  assert.deepEqual(ausserhalb(376, 295, 2, 150, 170), { x: -170, y: 150 }, "von links");
  assert.deepEqual(ausserhalb(376, 295, 374, 150, 170), { x: 546, y: 150 }, "von rechts");
  assert.deepEqual(ausserhalb(376, 295, 180, 1, 170), { x: 180, y: -170 }, "von oben");
  assert.deepEqual(ausserhalb(376, 295, 180, 294, 170), { x: 180, y: 465 }, "von unten");
});

test("der Stern verlässt die Karte an der nächsten Kante, auch aus der Mitte heraus", () => {
  // Näher an der rechten als an jeder anderen Kante.
  assert.deepEqual(ausserhalb(376, 295, 300, 150, 100), { x: 476, y: 150 });
  // In der Ecke gewinnt eine Kante eindeutig (kein schräger Sprung).
  const ecke = ausserhalb(376, 295, 0, 0, 100);
  assert.ok((ecke.x === -100 && ecke.y === 0) || (ecke.x === 0 && ecke.y === -100));
});

test("das Mauslicht: unter der Maus ganz hell, im Umkreis von 120 px weich auf null", () => {
  assert.equal(UMKREIS, 120);
  assert.equal(wortLicht(0), 1);
  assert.equal(wortLicht(UMKREIS), 0);
  assert.equal(wortLicht(UMKREIS + 50), 0, "außerhalb bleibt der Text gedämpft");
  assert.equal(wortLicht(60), 0.5, "auf halbem Weg halb hell");
  // Es klingt gleichmäßig ab, ohne Stufe.
  let vorher = 1;
  for (let a = 0; a <= UMKREIS; a += 5) {
    const h = wortLicht(a);
    assert.ok(h <= vorher && h >= 0, `Abstand ${a}`);
    vorher = h;
  }
});
