// Prompt 18b: die Lavalampe hinter der Sperr-Karte (components/neu/chat/lava.ts). Bewegung und Abläufe wie im
// Probelauf (~/Desktop/Status/probe-sperrkarte.html): dieselben Werte, gleiche Zeiten für Venom und Rückzug.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ABFALL, ANSTIEG, TIPP_MS, kreise, neueLava, schritt, zeichne } from "../components/neu/chat/lava.ts";

const lauf = (l: ReturnType<typeof neueLava>, sek: number, ruhig = false) => {
  for (let t = 0; t < sek; t += 1 / 60) schritt(l, 1 / 60, ruhig);
};

test("Werte wie im Probelauf: Kugeln, Tempo, Anstieg dt·9, Abfall dt·3,2, Tippen 1,6 s", () => {
  const l = neueLava(360, 58);
  assert.deepEqual(
    l.kugeln.map((k) => [k.x, k.y, k.vx, k.vy, k.r].map((x) => Math.round(x * 1000) / 1000)),
    [
      [70, 28, 22, 9, 19],
      [250, 30, -18, -8, 22],
    ],
  );
  assert.equal(l.ranken.length, 12);
  assert.equal(ANSTIEG, 9);
  assert.equal(ABFALL, 3.2);
  assert.equal(TIPP_MS, 1600);
  // Der Probelauf steht im Kopf von lava.ts als Quelle.
  assert.match(readFileSync(new URL("../components/neu/chat/lava.ts", import.meta.url), "utf8"), /probe-sperrkarte\.html/);
});

test("Venom: in etwa 0,33 s fast ganz da, Rückzug in etwa 0,7 s (die Ranken sind dann weg)", () => {
  const l = neueLava(360, 58);
  l.ziel = 1;
  lauf(l, 0.2);
  assert.ok(l.f > 0.8 && l.f < 0.9, String(l.f));
  lauf(l, 0.15);
  assert.ok(l.f > 0.95, String(l.f));
  l.ziel = 0;
  lauf(l, 0.5);
  assert.ok(l.f > 0.1, "nach 0,5 s noch nicht ganz zurück");
  lauf(l, 0.25);
  assert.ok(l.f < 0.1, String(l.f));
  // Die Ranken sind dann nur noch Pünktchen (unter 2 px), die das Feld der Kugeln nicht mehr erreicht.
  assert.ok(Math.max(...kreise(l, 1).kreise.slice(2).map((k) => k.r), 0) < 2, "Ranken weg");
});

test("Die Kugeln bleiben in der Karte, prallen ab und voneinander; beim Aufprall werden sie kurz flacher", () => {
  const l = neueLava(360, 58);
  let stoesse = 0;
  for (let i = 0; i < 60 * 40; i++) {
    const vorher = l.kugeln.map((k) => k.druck);
    schritt(l, 1 / 60);
    l.kugeln.forEach((k, n) => {
      assert.ok(k.x >= k.r * 0.6 - 1e-9 && k.x <= 360 - k.r * 0.6 + 1e-9);
      assert.ok(k.y >= k.r * 0.35 - 1e-9 && k.y <= 58 - k.r * 0.35 + 1e-9);
      if (k.druck > vorher[n] + 0.01) stoesse++;
    });
  }
  assert.ok(stoesse > 5, String(stoesse));
  const [a, b] = l.kugeln;
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) >= (a.r + b.r) * 0.78 - 1e-6, "nie tiefer ineinander als im Probelauf");
});

test("Weniger Bewegung: nichts bewegt sich", () => {
  const l = neueLava(360, 58);
  const vorher = JSON.stringify(l.kugeln);
  lauf(l, 2, true);
  assert.equal(JSON.stringify(l.kugeln), vorher);
});

test("Bild: in Ruhe zwei Kugeln (ein kleiner Teil der Karte), beim Venom die ganze Karte", () => {
  const gw = 180;
  const gh = 29;
  const bild = new Uint8ClampedArray(gw * gh * 4);
  const anteil = () => {
    let n = 0;
    for (let i = 3; i < bild.length; i += 4) if (bild[i] > 120) n++;
    return n / (gw * gh);
  };
  const l = neueLava(360, 58);
  zeichne(l, 0, bild, gw, gh, 2);
  assert.ok(anteil() > 0.05 && anteil() < 0.4, String(anteil()));
  l.f = 1;
  zeichne(l, 0, bild, gw, gh, 2);
  assert.ok(anteil() > 0.97, String(anteil()));
  // Ein Bild kostet wenig (gemessen am Mac etwa 0,2 ms, auch mit Venom und 14 Kreisen). Hier großzügig, weil die
  // Tests gleichzeitig laufen: 200 Bilder in unter einer Sekunde.
  const t = performance.now();
  for (let i = 0; i < 200; i++) zeichne(l, i / 60, bild, gw, gh, 2);
  assert.ok(performance.now() - t < 1000, `${(performance.now() - t).toFixed(0)} ms`);
});
