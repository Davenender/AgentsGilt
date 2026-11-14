// Tests für den Namen aus Zeichen (Kopfbereich): Nach der Startanimation reagiert er immer auf die
// Maus. `npm test`. Die Zeichenfläche des Browsers ist nachgestellt: Sie merkt sich nur, wohin
// jedes Zeichen gezeichnet wurde.
import assert from "node:assert/strict";
import { test } from "node:test";
import { rollStand } from "../components/neu/kopf/startlogik.ts";
import { erzeugeZeichenname, type NameMasse } from "../components/neu/kopf/zeichenname.ts";

// ── Nachgestellter Browser: Zeit, Bilder und Zeichenflächen.
type Aufruf = (jetzt: number) => void;
let zeit = 1000;
let wartend: Aufruf[] = [];
const lauscher = new Set<() => void>();
const dokument = {
  hidden: false,
  createElement: () => flaeche(),
  addEventListener: (_art: string, wie: () => void) => void lauscher.add(wie),
  removeEventListener: (_art: string, wie: () => void) => void lauscher.delete(wie),
};
Object.assign(globalThis, {
  window: { devicePixelRatio: 1, setTimeout: () => 0, clearTimeout: () => undefined },
  document: dokument,
  requestAnimationFrame: (wie: Aufruf) => wartend.push(wie),
  cancelAnimationFrame: () => undefined,
});

/** Eine Zeichenfläche, die Text als gefülltes Rechteck „zeichnet“ und jedes Zeichnen eines Bildes notiert. */
function flaeche() {
  const gezeichnet: { quelle: unknown; x: number; y: number }[] = [];
  // Ganze Bilder, die auf diese Fläche gelegt wurden (so kommt das ruhende Bild des Namens auf die Fläche).
  const ganz: unknown[] = [];
  const text: { x0: number; y0: number; x1: number; y1: number }[] = [];
  let tx = 0;
  let ty = 0;
  let zug = 1;
  const stapel: [number, number, number][] = [];
  const nichts = () => undefined;
  const stift = {
    font: "",
    gezeichnet,
    ganz,
    measureText: (t: string) => ({ width: t.length * 60 }),
    save: () => void stapel.push([tx, ty, zug]),
    restore: () => void ([tx, ty, zug] = stapel.pop() ?? [0, 0, 1]),
    translate: (x: number, y: number) => void ((tx += x), (ty += y)),
    scale: (x: number) => void (zug *= x),
    // Der Text füllt seinen Kasten ganz: So gibt es überall im Namen Zeichen.
    fillText: (t: string, x: number, y: number) => void text.push({ x0: tx + x * zug, y0: ty, x1: tx + (x + t.length * 60) * zug, y1: ty + y }),
    getImageData: (_x: number, _y: number, b: number, h: number) => {
      const data = new Uint8ClampedArray(b * h * 4);
      for (const k of text) for (let y = Math.max(0, k.y0 | 0); y < Math.min(h, k.y1); y++) for (let x = Math.max(0, k.x0 | 0); x < Math.min(b, k.x1); x++) data[(y * b + x) * 4 + 3] = 255;
      return { data };
    },
    createLinearGradient: () => ({ addColorStop: nichts }),
    drawImage: (quelle: unknown, ...a: number[]) => {
      // Ein Zeichen aus dem Vorrat: neun Zahlen (Ausschnitt, dann Ort und Größe). Sonst ein ganzes Bild.
      if (a.length === 8) gezeichnet.push({ quelle, x: a[4] + a[6] / 2, y: a[5] + a[7] / 2 });
      else ganz.push(quelle);
    },
    setTransform: nichts, clearRect: nichts, fillRect: nichts, strokeText: nichts, beginPath: nichts, moveTo: nichts, lineTo: nichts, stroke: nichts, rect: nichts, clip: nichts,
  };
  return { width: 0, height: 0, style: {} as Record<string, string>, getContext: () => stift, stift };
}

/** So viele Millisekunden vergehen lassen, in Bildern von 16,7 ms. Im verdeckten Tab kommen keine Bilder. */
function laufen(ms: number) {
  for (let t = 0; t < ms; t += 16.7) {
    zeit += 16.7;
    if (dokument.hidden) continue;
    const dran = wartend;
    wartend = [];
    for (const wie of dran) wie(zeit);
  }
}
function tabWechsel(verdeckt: boolean) {
  dokument.hidden = verdeckt;
  for (const wie of lauscher) wie();
}

const MASSE: NameMasse = { breite: 1440, hoehe: 900, name: { x: 170, y: 520, b: 1100, h: 230 }, zelle: 6.5, schrift: "Probe", mono: "Mono", zeilen: ["AGENTS GILT"], fein: false, dichteMax: 2, schirm: 1440, ueberhang: 810 };
const LAGE = { mitteX: 720, mitteY: 300, radius: 120, kippX: 0, kippY: 0, hell: 1 };
// Eine Stelle mitten im Namen.
const MAUS = { x: 720, y: 640 };

function aufbau(masse: NameMasse = MASSE) {
  wartend = [];
  dokument.hidden = false;
  const leinwand = flaeche();
  const feld = erzeugeZeichenname(leinwand as unknown as HTMLCanvasElement, false);
  assert.ok(feld, "Der Name lässt sich anlegen");
  const anzahl = feld.bauen(masse, LAGE);
  assert.ok(anzahl > 500, `Der Name besteht aus vielen Zeichen (${anzahl})`);
  return { feld, leinwand };
}

/**
 * Die Maus fährt mitten in den Namen. Reagiert er, weichen die Zeichen aus: Dann steht nach kurzer
 * Zeit kein Zeichen mehr näher als 8,5 px an der Maus (ohne Ausweichen wären es höchstens 5 px).
 */
function reagiertAufMaus(feld: NonNullable<ReturnType<typeof erzeugeZeichenname>>, leinwand: ReturnType<typeof flaeche>) {
  feld.zeiger(MAUS.x - 60, MAUS.y - 20, true);
  laufen(60);
  feld.zeiger(MAUS.x, MAUS.y, true);
  laufen(500);
  // Das letzte ganze Bild: alle Zeichen, die im letzten Durchgang einzeln gezeichnet wurden.
  leinwand.stift.gezeichnet.length = 0;
  feld.zeiger(MAUS.x + 0.01, MAUS.y, true);
  laufen(40);
  const orte = leinwand.stift.gezeichnet;
  if (orte.length < 500) return { reagiert: false, naechstes: 0, gezeichnet: orte.length };
  const naechstes = Math.min(...orte.map((o) => Math.hypot(o.x - MAUS.x, o.y - MAUS.y)));
  return { reagiert: naechstes > 8.5, naechstes, gezeichnet: orte.length };
}

/** Der Startflug bis zur Landung; meldet, wie oft „gelandet“ gemeldet wurde. */
function starten(feld: NonNullable<ReturnType<typeof erzeugeZeichenname>>) {
  const stand = { gelandet: 0 };
  feld.starten(() => (stand.gelandet += 1));
  return stand;
}

test("Nach dem Startflug weichen die Zeichen der Maus aus", () => {
  const { feld, leinwand } = aufbau();
  const stand = starten(feld);
  laufen(2600);
  assert.equal(stand.gelandet, 1);
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Im Flug reagiert der Name noch nicht (die Zeichen sind unterwegs), nach der Landung sofort", () => {
  const { feld, leinwand } = aufbau();
  starten(feld);
  laufen(300);
  feld.zeiger(MAUS.x, MAUS.y, true);
  laufen(2400);
  // Die Maus stand die ganze Zeit dort: Jetzt, wo der Name gelandet ist, sind die Zeichen ausgewichen.
  leinwand.stift.gezeichnet.length = 0;
  feld.zeiger(MAUS.x + 0.01, MAUS.y, true);
  laufen(40);
  const naechstes = Math.min(...leinwand.stift.gezeichnet.map((o) => Math.hypot(o.x - MAUS.x, o.y - MAUS.y)));
  assert.ok(naechstes > 8.5, `nächstes Zeichen ${naechstes.toFixed(1)} px`);
  feld.ende();
});

test("Später Licht-Start: Erst 8 s Probe und Warten, dann der Flug, dann spätes Licht – der Name reagiert", () => {
  const { feld, leinwand } = aufbau();
  // Solange alles lädt, läuft die Probe (fast unsichtbare Bilder wie mitten im Flug).
  feld.probe(true);
  for (let t = 0; t < 8000; t += 16.7) {
    feld.probeBild();
    laufen(16.7);
  }
  feld.probe(false);
  const stand = starten(feld);
  laufen(2600);
  assert.equal(stand.gelandet, 1);
  // Das Licht kommt erst jetzt und wird in Stufen heller.
  for (let hell = 0; hell <= 1; hell += 0.1) {
    feld.licht({ ...LAGE, hell, kippX: 0.02 * hell });
    laufen(120);
  }
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Tab-Wechsel während des Starts: Der Flug läuft danach zu Ende, der Name reagiert", () => {
  const { feld, leinwand } = aufbau();
  const stand = starten(feld);
  laufen(700);
  tabWechsel(true);
  laufen(3000);
  assert.equal(stand.gelandet, 0, "Im verdeckten Tab landet nichts");
  tabWechsel(false);
  laufen(2600);
  assert.equal(stand.gelandet, 1);
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Tab-Wechsel nach dem Start: Der Name reagiert danach wieder", () => {
  const { feld, leinwand } = aufbau();
  starten(feld);
  laufen(2600);
  tabWechsel(true);
  feld.zeiger(-9999, -9999, false);
  laufen(5000);
  tabWechsel(false);
  laufen(100);
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Runter- und wieder hochscrollen, auch nicht ganz bis zum Anfang: Der Name reagiert", () => {
  for (const rest of [0, 3, 10, 24]) {
    const { feld, leinwand } = aufbau();
    starten(feld);
    laufen(2600);
    // Hinunter: Die Zeichen fliegen auseinander. Dann wieder hoch, bis auf einen kleinen Rest.
    for (let y = 0; y <= 1800; y += 60) {
      feld.rollen(rollStand(y, 900), y, 900);
      laufen(16.7);
    }
    laufen(600);
    for (let y = 1800; y >= rest; y -= 60) {
      feld.rollen(rollStand(Math.max(rest, y), 900), Math.max(rest, y), 900);
      laufen(16.7);
    }
    feld.rollen(rollStand(rest, 900), rest, 900);
    laufen(900);
    const ergebnis = reagiertAufMaus(feld, leinwand);
    assert.equal(ergebnis.reagiert, true, `Rest ${rest} px: nächstes Zeichen ${ergebnis.naechstes.toFixed(1)} px`);
    feld.ende();
  }
});

test("Mitten im Auseinanderfliegen reagiert der Name nicht auf die Maus (so ist es gewollt)", () => {
  const { feld, leinwand } = aufbau();
  starten(feld);
  laufen(2600);
  feld.rollen(rollStand(200, 900), 200, 900);
  laufen(400);
  assert.equal(reagiertAufMaus(feld, leinwand).reagiert, false);
  feld.ende();
});

test("Die Fenstergröße ändert sich während des Starts: Der Flug übersteht den Neuaufbau, der Name reagiert", () => {
  const { feld, leinwand } = aufbau();
  const stand = starten(feld);
  laufen(800);
  // Schmaleres Fenster: Der Name wird neu vermessen und neu aufgebaut.
  feld.bauen({ ...MASSE, breite: 1180, hoehe: 820, name: { x: 140, y: 470, b: 900, h: 190 }, schirm: 1180, ueberhang: 738 }, { ...LAGE, mitteX: 590 });
  laufen(900);
  // Und zurück.
  feld.bauen(MASSE, LAGE);
  laufen(2600);
  assert.equal(stand.gelandet, 1, "„Gelandet“ kommt genau einmal");
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Die Fenstergröße ändert sich nach dem Start: Der Name reagiert weiter", () => {
  const { feld, leinwand } = aufbau();
  starten(feld);
  laufen(2600);
  feld.bauen({ ...MASSE, hoehe: 820, ueberhang: 738 }, LAGE);
  laufen(200);
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Ohne Startflug (neu eingerichtet, der Name steht sofort): Der Name reagiert", () => {
  const { feld, leinwand } = aufbau();
  feld.sofort();
  laufen(100);
  assert.deepEqual(reagiertAufMaus(feld, leinwand).reagiert, true);
  feld.ende();
});

test("Ruht die Maus im Namen, bleibt das Loch offen: Kein Bild zeigt den Namen ohne Loch", () => {
  const { feld, leinwand } = aufbau();
  starten(feld);
  laufen(2600);
  assert.equal(reagiertAufMaus(feld, leinwand).reagiert, true);
  // Die Maus ruht, die Zeichen stehen neben ihrem Platz, nichts bewegt sich mehr.
  laufen(600);
  leinwand.stift.ganz.length = 0;
  leinwand.stift.gezeichnet.length = 0;
  // Bilder, in denen sich nichts ändert: weder Maus noch Licht, und das Flimmern ist noch nicht
  // wieder dran (hier geweckt wie nach einem Tab-Wechsel; im Browser kommt so ein Bild auch, wenn
  // der Zeitgeber des Flimmerns einen Augenblick zu früh weckt).
  for (let i = 0; i < 8; i++) {
    tabWechsel(false);
    laufen(17);
  }
  assert.equal(leinwand.stift.ganz.length, 0, "das ruhende Bild (der Name ohne Loch) kommt nicht auf die Fläche, solange die Maus dort ruht");
  // Und die Zeichen stehen weiter neben ihrem Platz: Die nächste Bewegung der Maus findet das Loch vor.
  leinwand.stift.gezeichnet.length = 0;
  feld.zeiger(MAUS.x + 0.02, MAUS.y, true);
  laufen(40);
  const orte = leinwand.stift.gezeichnet;
  assert.ok(orte.length > 500);
  assert.ok(Math.min(...orte.map((o) => Math.hypot(o.x - MAUS.x, o.y - MAUS.y))) > 8.5);
  feld.ende();
});
