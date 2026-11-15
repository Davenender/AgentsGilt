// Das Chat-Fenster wird zur Kugel und wieder zurück: die Form je Zeitpunkt, als reine Rechnung
// (ohne Browser, mit Tests: tests/chat-kugel.test.ts).
//
// Es gibt eine Zeitleiste von 0 (die Kugel sitzt auf dem Chat-Knopf) bis 1 (das Fenster steht
// offen). Öffnen spielt sie in 1,1 s vorwärts, Schließen in 0,6 s rückwärts; ein Klick mitten in
// der Bewegung dreht nur die Richtung um, es springt nichts.
//
// Damit das auch auf schwachen Geräten flüssig läuft, zeichnet der Browser während der Bewegung
// nichts neu: Die Form ist aus sieben einfachen Teilen zusammengesetzt (drei Rechtecke, vier
// Kreise), die nur verschoben und skaliert werden. Rechtecke bleiben dabei Rechtecke und Kreise
// Kreise; so kann die Ecke jeden Radius annehmen, ohne dass `border-radius` je Bild neu gezeichnet
// wird. Ein zweiter Satz derselben Teile, rundum 1 px größer und golden, liegt dahinter: der feine
// Goldrand. Das echte Glas (mit Unschärfe) blendet erst ein, wenn das Fenster seine Größe hat.

/** Dauer des Öffnens und des Schließens in Millisekunden. */
export const DAUER = 1100;
export const SCHLIESSEN = 600;
/** Eckenradius des offenen Fensters und Durchmesser des Chat-Knopfs (wie im Stylesheet). */
export const ECKE = 26;
export const KUGEL = 64;
/** Kantenlänge der Grundformen im Stylesheet: Rechteck und Kreis. */
export const RECHTECK = 100;
export const KREIS = 200;
/**
 * So viele Stützstellen hat die Zeitleiste (alle 50 ms eine). Dazwischen blendet der Browser
 * gleichmäßig über; weil alle Teile dieselben Stützstellen haben, passen sie auch dazwischen genau
 * zusammen. Weniger Stützstellen heißen weniger Arbeit im Klick, der die Bewegung startet.
 */
export const STUETZEN = 22;

/**
 * Wann was geschieht (Anteile der Zeitleiste, vorwärts gelesen; rückwärts läuft alles umgekehrt):
 * Die Kugel deckt den Knopf, hebt sich leicht, ihr Logo blendet aus (erst die Balken nacheinander,
 * dann der Stern); die Kugel dehnt sich zum Fenster; das echte Glas blendet ein; der Inhalt baut
 * sich auf.
 *
 * Kein Licht bewegt sich dabei (seit dem 15.11.2026): Das Logo ist ganz weg, bevor die Form sich
 * rührt (`stern` endet vor `form`), es schrumpft nicht zu einem Punkt und wandert nicht mit. Den
 * goldenen Schein in der Mitte der Form, der vom Knopf zur Fenstermitte wanderte, gibt es nicht mehr.
 */
export const PHASEN = {
  decken: [0, 0.07],
  knopfWeg: 0.08,
  balken: [0.02, 0.11],
  stern: [0.08, 0.135],
  form: [0.14, 0.6],
  glas: [0.56, 0.68],
  teileWeg: [0.6, 0.72],
  inhalt: [0.5, 0.78],
} as const;

/** Maße in Pixeln, bezogen auf den Rahmen des Fensters: seine Größe, Mitte und Durchmesser des Chat-Knopfs. */
export type Masse = { b: number; h: number; kx: number; ky: number; d: number; handy: boolean };
/** Eine Form: Lage, Größe, Eckenradius oben und unten. */
export type Kasten = { x: number; y: number; b: number; h: number; oben: number; unten: number };

const klemme = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x);
const weich = (x: number) => {
  const k = klemme(x);
  return k * k * (3 - 2 * k);
};
const stueck = (u: number, [von, bis]: readonly [number, number]) => klemme((u - von) / (bis - von));

/** Wie weit die Form ist: 0 Kugel, 1 Fenster. Weich auslaufend, mit einer leichten Feder am Ende (bis rund 1,03). */
export function formAnteil(u: number): number {
  const p = stueck(u, PHASEN.form);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const s = 0.9;
  return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
}

/** Die Kugel hebt sich am Anfang leicht an (0 bis 1) und senkt sich, während sie sich dehnt. */
export function hebung(u: number): number {
  const auf = 1 - Math.pow(1 - stueck(u, [0, 0.13]), 2);
  return auf * (1 - weich(stueck(u, [0.14, 0.4])));
}

/** Wie weit der Inhalt da ist (0 aufgelöst, 1 da). */
export function inhaltAnteil(u: number): number {
  return weich(stueck(u, PHASEN.inhalt));
}

/** Die Form zum Zeitpunkt u: von der Kugel auf dem Knopf zum Fenster; die Ecken werden dabei immer eckiger (rückwärts: immer runder). */
export function formBei(u: number, m: Masse): Kasten {
  const f = formAnteil(u);
  const f01 = klemme(f);
  const hebt = hebung(u) * (1 - f01);
  const d = m.d * (1 + 0.07 * hebt);
  const b = d + (m.b - d) * f;
  const h = d + (m.h - d) * f;
  // Die Mitte wandert von der Mitte des Knopfs zur Mitte des Fensters.
  const cx = m.kx + (m.b / 2 - m.kx) * f;
  const ky = m.ky - 6 * hebt;
  const cy = ky + (m.h / 2 - ky) * f;
  // Vom Kreis zum Radius des Fensters.
  const oben = (Math.min(b, h) / 2) * (1 - (1 - ECKE / (Math.min(m.b, m.h) / 2)) * f01);
  // Am Handy ist das offene Blatt unten eckig.
  const unten = m.handy ? oben * (1 - weich(f01)) : oben;
  return { x: cx - b / 2, y: cy - h / 2, b, h, oben, unten };
}

/** Dieselbe Form, rundum um `rand` Pixel kleiner (die Fläche innerhalb des Goldrands). */
export function innen(k: Kasten, rand = 1): Kasten {
  return { x: k.x + rand, y: k.y + rand, b: Math.max(0, k.b - 2 * rand), h: Math.max(0, k.h - 2 * rand), oben: Math.max(0, k.oben - rand), unten: Math.max(0, k.unten - rand) };
}

const zahl = (x: number) => (Math.abs(x) < 0.005 ? "0" : x.toFixed(2));
const mass = (x: number) => Math.max(0, x).toFixed(5);

/**
 * Die sieben Teile einer Form als `transform` (Grundformen: Rechteck 100 × 100 px und Kreis
 * 200 × 200 px, beide oben links verankert): das breite Mittelstück, der Streifen oben, der
 * Streifen unten, die vier Eck-Kreise (oben links, oben rechts, unten links, unten rechts).
 */
export function teileVon(k: Kasten): string[] {
  const o = Math.min(k.oben, k.b / 2, k.h / 2);
  const u = Math.min(k.unten, k.b / 2, k.h - o);
  const rechteck = (x: number, y: number, b: number, h: number) => `translate(${zahl(x)}px, ${zahl(y)}px) scale(${mass(b / RECHTECK)}, ${mass(h / RECHTECK)})`;
  const kreis = (cx: number, cy: number, r: number) => `translate(${zahl(cx - r)}px, ${zahl(cy - r)}px) scale(${mass((2 * r) / KREIS)})`;
  return [
    // Das Mittelstück greift oben und unten einen halben Pixel über: keine Haarlinie zwischen den Teilen.
    rechteck(k.x, k.y + o - 0.5, k.b, k.h - o - u + 1),
    rechteck(k.x + o, k.y, k.b - 2 * o, o),
    rechteck(k.x + u, k.y + k.h - u, k.b - 2 * u, u),
    kreis(k.x + o, k.y + o, o),
    kreis(k.x + k.b - o, k.y + o, o),
    kreis(k.x + u, k.y + k.h - u, u),
    kreis(k.x + k.b - u, k.y + k.h - u, u),
  ];
}

export type Bild = { offset: number; transform?: string; opacity?: number };

/**
 * Die ganze Zeitleiste für die bewegten Teile, in gleichmäßigen Stützstellen:
 * `rand` und `flaeche` je sieben Teile (Goldrand und Fläche) und `logo` (das Logo in der Kugel: Es
 * sitzt auf der Mitte der Kugel und bleibt dort; `zug` ist sein Versatz, solange der Magnet den
 * Knopf zieht). Dehnt sich die Form zum Fenster, ist das Logo schon ausgeblendet und steht still.
 */
export function zeitleiste(m: Masse, zug = { x: 0, y: 0 }): { rand: Bild[][]; flaeche: Bild[][]; logo: Bild[] } {
  const rand: Bild[][] = Array.from({ length: 7 }, () => []);
  const flaeche: Bild[][] = Array.from({ length: 7 }, () => []);
  const logo: Bild[] = [];
  for (let i = 0; i <= STUETZEN; i++) {
    const offset = i / STUETZEN;
    const k = formBei(offset, m);
    teileVon(k).forEach((transform, n) => rand[n].push({ offset, transform }));
    teileVon(innen(k)).forEach((transform, n) => flaeche[n].push({ offset, transform }));
    // Das Logo sitzt auf der Mitte der Kugel und wächst mit ihr, solange sie sich hebt (im
    // Stylesheet um seine Mitte skaliert). Sobald die Form sich dehnt, bleibt es stehen, wo die
    // Kugel war (es ist dann unsichtbar): Es wandert nicht mit der Form.
    const alsKugel = Math.min(offset, PHASEN.form[0]);
    const kugel = formBei(alsKugel, m);
    const lx = kugel.x + kugel.b / 2 + zug.x;
    const ly = kugel.y + kugel.h / 2 + zug.y;
    const groesse = (m.d / KUGEL) * (1 + 0.07 * hebung(alsKugel));
    logo.push({ offset, transform: `translate(${zahl(lx - KUGEL / 2)}px, ${zahl(ly - KUGEL / 2)}px) scale(${mass(groesse)})` });
  }
  return { rand, flaeche, logo };
}
