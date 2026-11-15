// Glaskarten unter der ersten Aussage: Mauslicht, Hervorhebung (nur der Stern hinter Milchglas), erst nach dem Einschweben.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { EINSCHWEBEN, eingeschwebtAb, GEHT, UMKREIS, VERSATZ, wortLicht } from "../components/neu/seite/glaskarten.ts";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");

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

test("eine Karte leuchtet erst, wenn sie ganz eingeschwebt ist (auch wenn die Maus schon darauf liegt)", () => {
  const stil = lies("components/neu/seite/seite.css");
  // Dieselben Zeiten wie im Stylesheet: 1 s Einschweben, je Karte 120 ms später.
  assert.match(stil, /\.ag-aussage\[data-an\] \.ag-gk \{\s*translate: 0 30px;\s*transition: translate 1s/);
  assert.match(stil, /transition-delay: calc\(0\.65s \+ var\(--i, 0\) \* 0\.12s\)/);
  assert.equal(EINSCHWEBEN, 1000);
  assert.equal(VERSATZ, 120);
  // Die erste Karte schwebt ab t ein und steht bei t + 1 s, die dritte 240 ms später.
  assert.equal(eingeschwebtAb(5000, 0), 6000);
  assert.equal(eingeschwebtAb(5000, 2), 6240);
  // Solange die Karten noch gar nicht losgeschwebt sind, leuchtet keine.
  assert.equal(eingeschwebtAb(Infinity, 0), Infinity);
  // Stehen sie schon (Seite weiter unten geladen), sofort.
  assert.equal(eingeschwebtAb(-Infinity, 2), -Infinity);
  assert.ok(GEHT >= 550 && GEHT <= 900, "nach dem Verlassen blendet der Stern erst aus, dann ist er weg");
});

test("nur der Stern hinter Milchglas: keine Strahlen mehr (Code, Bilder und Stile entfernt)", () => {
  const skript = lies("components/neu/seite/glaskarten.ts").replace(/\/\/.*$/gm, "");
  const aussage = lies("components/neu/seite/Aussage.tsx");
  const stil = lies("components/neu/seite/seite.css");
  for (const alt of ["strahlKnick", "STRAHLT", "--d", "--k", "ag-gk__rad"]) assert.ok(!skript.includes(alt), `Skript: ${alt} ist weg`);
  for (const alt of ["STRAHLEN", "function Rad", "ag-gk__saum", "ag-gk__aussen"]) assert.ok(!aussage.includes(alt), `Aussage: ${alt} ist weg`);
  for (const alt of ["ag-gk__rad", "ag-gk__saum", "ag-gk__aussen", "ag-gk-schwenk", "ag-gk-strahl", "data-steht", ".ag-gk[data-bild"]) assert.ok(!stil.includes(alt), `Stylesheet: ${alt} ist weg`);
  for (const bild of ["kern-klar", "strahlen-1-klar", "strahlen-3-klar"]) assert.ok(!existsSync(new URL(`../public/stern/${bild}.webp`, import.meta.url)), `${bild}.webp ist weg`);
  // Der Stern ist weich: Seine Bilder sind schon weichgezeichnet; der Browser rechnet keine Unschärfe je Bild.
  assert.ok(aussage.includes("<Leuchtstern milchig />"));
  for (const bild of ["kern-milch", "strahlen-1-milch", "strahlen-3-milch"]) assert.ok(existsSync(new URL(`../public/stern/${bild}.webp`, import.meta.url)), `${bild}.webp ist da`);
  const block = stil.slice(stil.indexOf("/* ── Die hervorgehobene Karte"), stil.indexOf(".ag-gk__inhalt {"));
  assert.ok(block.length > 200);
  assert.ok(!/filter\s*:\s*blur|backdrop-filter/.test(block), "keine Unschärfe, die je Bild neu gerechnet wird");
  // Übergänge nur auf Deckkraft und Größe (scale), nichts, was neu gezeichnet werden muss.
  for (const [, wert] of block.matchAll(/transition:\s*([^;]+);/g)) {
    const eigenschaften = wert.split(",").map((t) => t.trim().split(/\s+/)[0]);
    for (const e of eigenschaften) assert.ok(["opacity", "scale"].includes(e), `Übergang auf ${e}`);
  }
  // In Ruhe hat der Stern weder Animationen noch eigene Ebenen.
  assert.match(stil, /\.ag-gk:not\(\[data-an\], \[data-geht\]\) \.ag-gk__stern \*,[^{]*\{[^}]*animation: none !important/);
  // Die Glasfläche wird nur über einen Schleier heller (Deckkraft), nicht über ihren Schatten.
  assert.ok(!/\.ag-gk\[data-an\] \.ag-gk__glas/.test(stil));
});

test("am Handy leuchtet die Karte in der Mitte des Bildschirms", () => {
  const skript = lies("components/neu/seite/glaskarten.ts");
  assert.match(skript, /beobachteMitte\(/);
  assert.ok(!skript.includes("intersectionRatio >= 0.55"));
});
