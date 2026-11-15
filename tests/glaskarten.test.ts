// Glaskarten unter der ersten Aussage: wie das Mauslicht abklingt, und dass der Stern nur noch ein- und ausgeschaltet wird.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { GEHT, NACHEINANDER, STRAHLT, strahlKnick, UMKREIS, wortLicht } from "../components/neu/seite/glaskarten.ts";

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

test("am Handy strahlt der Stern kurz (2 bis 3 s) und bleibt dann ruhig stehen", () => {
  assert.ok(STRAHLT >= 2000 && STRAHLT <= 3000);
  // Mehrere Karten zugleich im Bild: Die Sterne kommen nacheinander, aber ohne lange Pause.
  assert.ok(NACHEINANDER >= 300 && NACHEINANDER <= 700);
});

test("der Stern der Glaskarten ist reines Stylesheet: kein Skript je Bild, nichts folgt der Maus, keine Rechnung für Nachbarkarten", () => {
  const skript = readFileSync(new URL("../components/neu/seite/glaskarten.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  // Das Skript schaltet nur ein und aus.
  assert.ok(skript.includes("dataset.an"));
  for (const alt of ["--sx", "--sy", "--sd", "--bl", "glimmLicht", "kantenLicht", "ausserhalb"]) assert.ok(!skript.includes(alt), `${alt} ist weg`);
  const stil = readFileSync(new URL("../components/neu/seite/seite.css", import.meta.url), "utf8");
  // Die alten Ebenen aus Prompt 10 sind entfernt, nicht nur ausgeblendet.
  for (const alt of ["ag-gk__kreuz", "ag-gk__klar", "ag-gk__matt", "ag-gk__hinten", "--sx", "--sd"]) assert.ok(!stil.includes(alt), `${alt} ist weg`);
  // Je Karte ein eigenes Strahlenbild mit eigenem Takt; die Bewegung läuft nur unter der Maus.
  for (const nr of [0, 1, 2]) assert.ok(stil.includes(`.ag-gk[data-bild="${nr}"]`), `Karte ${nr}`);
  assert.ok(/\.ag-gk\[data-an\] \.ag-gk__rad \{[^}]*animation-play-state: running/.test(stil));
  // In Ruhe gibt es weder Animationen noch sichtbare Teile (sonst hielte der Browser dafür Ebenen bereit).
  const rad = /\n\.ag-gk__rad \{([^}]*)\}/.exec(stil)?.[1] ?? "";
  assert.ok(rad.includes("visibility: hidden") && !rad.includes("animation"), "das Rad ruht ohne Animation");
  assert.ok(/\.ag-gk:not\(\[data-an\], \[data-geht\], \[data-steht\]\) \.ag-gk__stern \*,[^{]*\{[^}]*animation: none !important/.test(stil), "der Stern ruht ohne Animation");
  assert.ok(GEHT >= 550 && GEHT <= 900, "nach dem Verlassen blendet er erst aus, dann ist er weg");
  // Bewegt wird nur mit Drehen und Deckkraft.
  const bilder = [...stil.matchAll(/@keyframes (ag-gk-[a-z]+) \{([\s\S]*?)\n\}/g)];
  assert.ok(bilder.length >= 1);
  // Je Karte bewegt sich nur das Rad als Ganzes: Die einzelnen Strahlen haben keine eigene Animation.
  assert.ok(!/\.ag-gk__rad[^{]*(i|b)[^{]*\{[^}]*animation:/.test(stil), "kein Strahl hat eine eigene Animation");
  for (const [, name, inhalt] of bilder) {
    const eigenschaften = [...inhalt.matchAll(/^\s+([a-z-]+):/gm)].map((m) => m[1]);
    for (const e of eigenschaften) assert.ok(["transform", "opacity"].includes(e), `${name}: ${e}`);
  }
});

test("ein Strahl trifft den Rand seiner Karte und knickt dort von der Kante weg ab", () => {
  const nah = (a: number, b: number, genau = 0.01) => assert.ok(Math.abs(a - b) < genau, `${a} ≈ ${b}`);
  // Karte 380 × 250: genau nach rechts sind es 190 px, genau nach unten 125 px.
  nah(strahlKnick(0, 380, 250).weit, 190);
  nah(strahlKnick(180, 380, 250).weit, 190);
  nah(strahlKnick(90, 380, 250).weit, 125);
  nah(strahlKnick(-90, 380, 250).weit, 125);
  // Schräg: bis zur Kante, die zuerst kommt (hier die rechte: 190 / cos 20°; dort die untere: 125 / sin 60°).
  nah(strahlKnick(20, 380, 250).weit, 190 / Math.cos((20 * Math.PI) / 180));
  nah(strahlKnick(60, 380, 250).weit, 125 / Math.sin((60 * Math.PI) / 180));
  // Der Strahl endet immer auf dem Rand.
  for (let w = -180; w <= 180; w += 7) {
    const { weit } = strahlKnick(w, 380, 250);
    const x = Math.abs(weit * Math.cos((w * Math.PI) / 180));
    const y = Math.abs(weit * Math.sin((w * Math.PI) / 180));
    assert.ok(Math.abs(x - 190) < 0.01 || Math.abs(y - 125) < 0.01, `Winkel ${w}: (${x}, ${y})`);
    assert.ok(x <= 190.01 && y <= 125.01);
  }
  // Der Knick führt von der Senkrechten zur Kante weg: rechts nach unten gerichtet weiter nach
  // unten (im Uhrzeigersinn), rechts nach oben gerichtet weiter nach oben; links gespiegelt.
  assert.ok(strahlKnick(20, 380, 250).knick > 0);
  assert.ok(strahlKnick(-20, 380, 250).knick < 0);
  assert.ok(strahlKnick(160, 380, 250).knick < 0);
  assert.ok(strahlKnick(-160, 380, 250).knick > 0);
  // Oben: nach rechts geneigt weiter nach rechts (im Uhrzeigersinn); unten umgekehrt.
  assert.ok(strahlKnick(-70, 380, 250).knick > 0);
  assert.ok(strahlKnick(-110, 380, 250).knick < 0);
  assert.ok(strahlKnick(70, 380, 250).knick < 0);
  assert.ok(strahlKnick(110, 380, 250).knick > 0);
  // Dezent: zwischen 2 und 7 Grad, bei flachem Auftreffen mehr als bei steilem.
  for (let w = -175; w <= 180; w += 5) {
    const k = Math.abs(strahlKnick(w, 380, 250).knick);
    assert.ok(k >= 2 && k <= 7, `Winkel ${w}: ${k}`);
  }
  assert.ok(Math.abs(strahlKnick(30, 380, 250).knick) > Math.abs(strahlKnick(8, 380, 250).knick));
});
