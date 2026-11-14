// Der Name aus Zeichen-Teilchen (vordere Ebene des Kopfbereichs).
//
// So ist er gebaut:
//   1. „AGENTS GILT“ wird unsichtbar als Graustufenbild gezeichnet: unsere
//      schmale, fette Schrift, dazu ein paar feine Strahlen nach außen (wie
//      spritzende Tinte).
//   2. Das Bild wird in ein Raster aus Zellen zerlegt (Computer 6,5 px breit,
//      Handy 5 px). Je Zelle zählt die Abdeckung: unter 8 % fällt die Zelle weg.
//      Die Dichte ist round(Grundwert × (0,45 + 0,55 × min(1, 1,6 × Abdeckung))),
//      begrenzt auf 1 bis 9. Der Grundwert ist 9 × die Stärke der Tinte in der
//      Zelle (Buchstaben voll, Strahlen laufen aus). Die Deckkraft ist
//      Dichte/9 × 0,7. Die dichtesten Stellen bestehen aus den Block-Zeichen ▓ und ▒
//      (daraus entstehen die „Kacheln“), dazu #; nach außen folgen + - = und zuletzt
//      . : ·. Am Handy gilt derselbe Zeichensatz.
//   3. Jedes Zeichen liegt einmal fertig gezeichnet in einem Vorrat (Atlas), in jeder
//      Färbung und mit 1,8-facher Pixeldichte: So bleibt es auch im Flug scharf. Das
//      ruhende Bild liegt als fertiges Bild im Zwischenspeicher; neu gezeichnet wird
//      nur, solange sich etwas bewegt.
//
// Start: Die Zeichen fliegen von außerhalb des Bildes an ihren Platz
// (2,2 Sekunden, am Anfang sehr schnell, am Ende weich; die Mitte des Namens
// landet zuerst). Unterwegs sind sie größer, haben das Hellgrau des Namens (nur
// leicht wärmer, Deckkraft mindestens 0,22) und wechseln ihr Zeichen; golden
// werden sie nur unter dem Licht.
//
// Leben: Alle 140 ms tauschen rund 0,4 % der Zellen für einen Takt ihr Zeichen.
// Die Zeichen weichen dem Zeiger aus (Umkreis 40 px, bis 10 px) und federn zurück.
// Ein Klick schickt einen Ring durch den Namen (1150 px/s, schiebt bis 40 px
// nach außen, klingt in 1,3 s ab); getroffene Zeichen werden kräftiger und
// wechseln ihr Zeichen. Das Licht des Logos färbt die Zeichen: im Licht golden,
// nahe am Stern einen Hauch heller, sonst grau. Alle Bewegungen rechnen mit der
// vergangenen Zeit und laufen auf jedem Bildschirm gleich schnell.
import type { LichtLage } from "./lichtszene";

// Mittellinie der Balken-Öffnung im rechten oberen Viertel des Logos, so wie die Licht-Szene sie
// zeichnet (Außenmaß des Logos = 1, y nach oben); die drei anderen sind gespiegelt.
const SPLITTER = [0.1299, 0.8743, 0.8758, 0.1342];

/** Abstand eines Punktes (in Logo-Halbmessern) zur Mittellinie der nächsten der vier Balken-Öffnungen. */
function abstandZumBalken(x: number, y: number): number {
  const wx = Math.abs(x) - SPLITTER[0];
  const wy = Math.abs(y) - SPLITTER[1];
  const ex = SPLITTER[2] - SPLITTER[0];
  const ey = SPLITTER[3] - SPLITTER[1];
  const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
  return Math.hypot(wx - ex * t, wy - ey * t);
}

export type NameMasse = {
  /** Größe der Zeichenfläche in CSS-Pixeln. */
  breite: number;
  hoehe: number;
  /** Kasten, in dem der Name steht. */
  name: { x: number; y: number; b: number; h: number };
  /** Breite einer Rasterzelle (Computer 6,5 px, Handy 5 px). */
  zelle: number;
  schrift: string;
  mono: string;
  /** Die Zeilen des Namens: am Computer eine, am Handy zwei übereinander. */
  zeilen: string[];
  /**
   * Handy: Der Name ist klein. Die Striche der Buchstaben werden etwas kräftiger gerastert, das
   * Grau ist heller, und die Strahlen nach unten sind nur halb so lang. (Der Zeichensatz ist
   * überall derselbe.)
   */
  fein?: boolean;
  /** Höchste Pixeldichte der Zeichenfläche (Computer 2, Handy 1,5). */
  dichteMax: number;
  /** Die größere Seite des Bildschirms: Sie bestimmt, von wie weit außen die Zeichen anfliegen. */
  schirm: number;
  /**
   * Wie weit die Zeichenfläche unter den Kopfbereich hinausreicht (CSS-Pixel). Beim Scrollen
   * fliegen die Zeichen auseinander; so sind sie auch unterhalb des Kopfbereichs noch zu sehen.
   */
  ueberhang?: number;
  /** Dauer des Startflugs in Sekunden (Kopfbereich 2,2; im Fuß kürzer). */
  flugDauer?: number;
};

export type Zeichenname = {
  /** Baut das Raster neu auf und meldet, wie viele Zeichen es hat. */
  bauen: (m: NameMasse, lage: LichtLage) => number;
  /** Das Licht hat sich bewegt: Schimmer neu berechnen (nur wenn es sich sichtbar geändert hat). */
  licht: (lage: LichtLage) => void;
  zeiger: (x: number, y: number, aktiv: boolean) => void;
  /** Welle an dieser Stelle. Meldet, ob sie ausgelöst wurde (nur im Bereich des Namens, nicht im Startflug). */
  welle: (x: number, y: number) => boolean;
  /** Welle aus der Mitte des Namens. */
  welleMitte: () => void;
  /** Startflug: Die Zeichen fliegen von außen an ihren Platz. Danach wird „danach“ einmal aufgerufen. */
  starten: (danach?: () => void) => void;
  /**
   * Probe vor dem Start: Solange sie an ist, ist die Fläche fast unsichtbar; probeBild() zeichnet
   * dann ein Bild wie mitten im Flug (so ist auch das Auseinanderfliegen beim ersten Scrollen
   * vorbereitet). Beim Ausschalten wird die Fläche wieder geleert.
   */
  probe: (an: boolean) => void;
  probeBild: () => void;
  /** Überspringen: Der Name steht sofort an seinem Platz (kein Flug, keine Welle danach). */
  sofort: () => void;
  /**
   * Scrollen: Fortschritt 0 bis 1 (scrollY ÷ 0,9 × Bildschirmhöhe). Die Zeichen fliegen auf den
   * Bahnen des Startflugs wieder nach außen, die Ränder zuerst, die Mitte zuletzt; beim
   * Hochscrollen setzt sich der Name genauso wieder zusammen. „oben“ und „hoch“ sagen, welcher
   * Teil der Zeichenfläche gerade im Bild ist (nur dort wird gezeichnet).
   */
  rollen: (fortschritt: number, oben: number, hoch: number) => void;
  sichtbar: (ja: boolean) => void;
  ende: () => void;
};

// Von locker nach dicht; die letzten beiden sind die Block-Zeichen für die dichtesten Stellen
// (aus ihnen entstehen die „Kacheln“).
const ZEICHEN = ["·", ".", ":", "-", "=", "+", "*", "/", "%", "#", "▒", "▓"];
// Zufallszeichen fürs Flimmern, im Flug und in der Welle: die ersten zehn, ohne die Block-Zeichen.
const ZUFALL = 10;
const BLOCK_MITTEL = 10;
const BLOCK_DICHT = 11;
// Welche Zeichen zu welcher Dichte gehören (Index 1 bis 9), jeweils mit ihrem Anteil. So ist es
// in der Zeichen-Grafik des Vorbilds gezählt. Je Zelle wird einmal fest gewählt: Das Bild steht ruhig.
const NACH_DICHTE: [zeichen: number, anteil: number][][] = [
  [[0, 1]],
  [[0, 0.5], [1, 0.5]],
  [[0, 0.5], [1, 0.5]],
  [[1, 1 / 3], [0, 1 / 3], [2, 1 / 3]],
  [[1, 1 / 3], [0, 1 / 3], [2, 1 / 3]],
  [[1, 0.25], [2, 0.25], [3, 0.25], [5, 0.25]],
  [[1, 0.25], [2, 0.25], [3, 0.25], [5, 0.25]],
  [[5, 0.5], [3, 0.25], [4, 0.25]],
  [[9, 0.45], [BLOCK_MITTEL, 0.25], [4, 0.2], [5, 0.1]],
  [[BLOCK_DICHT, 0.5], [BLOCK_MITTEL, 0.3], [9, 0.2]],
];
/** Wählt ein Zeichen für die Dichte, nach den Anteilen. */
function waehle(dichte: number, zufallszahl: number): number {
  const wahl = NACH_DICHTE[dichte];
  let rest = zufallszahl;
  for (const [zeichen, anteil] of wahl) {
    rest -= anteil;
    if (rest < 0) return zeichen;
  }
  return wahl[wahl.length - 1][0];
}
const GOLD_STUFEN = 6;
const CREME_STUFEN = 5;
// Schärfe: Jedes Zeichen wird einmal mit 1,8-facher Pixeldichte vorgerendert und verkleinert
// gezeichnet. So bleibt es auch im Flug scharf, wenn es bis zu 1,8-fach groß ist.
const VORRAT_SCHARF = 1.8;
// Die Farbe ist heller angesetzt, als sie am Ende wirkt: Die dichtesten Zeichen decken nur zu
// 70 %, davor steht also höchstens 70 % dieses Tons (ein kühles Hellgrau, im Licht Gold).
const GRAU = [210, 218, 246];
const GRAU_HANDY = [236, 240, 255];
// Die Farben des Lichts: Gold, nahe am Stern nur einen Hauch heller. Kein Weiß.
const GOLD = [255, 190, 78];
const CREME = [255, 220, 140];

const FLIMMER_TAKT = 140; // ms
const FLIMMER_ANTEIL = 0.004;
// Maus und Welle: Tempo und Dauer wie beim Vorbild. Umkreis und Ausschlag sind kleiner, weil die
// Zeichen bei uns in einer dichten Fläche stehen und nicht in dünnen Strahlen.
const MAUS_UMKREIS = 40;
const MAUS_SCHUB = 10;
const WELLE_TEMPO = 1150;
const WELLE_BAND = 80;
const WELLE_SCHUB = 40;
const WELLE_DAUER = 1.3;
const FLUG_DAUER = 2.2;
// Unterwegs: Mindest-Deckkraft der fliegenden Zeichen. Sie haben das Hellgrau des Namens, nur
// leicht wärmer (eine Stufe); golden werden sie nur, wo sie unter dem Licht durchfliegen.
const FLUG_BODEN = 0.22;
const FLUG_WAERME = 0.25;
const BLENDE_DAUER = 0.6;

/** Gleichbleibende Zufallszahlen: Der Name sieht bei jedem Aufbau gleich aus. */
function zufall(saat: number) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weichzeichner für das Graustufenbild (zweimal waagrecht und senkrecht gemittelt). */
function weichzeichnen(werte: Float32Array, b: number, h: number, radius: number) {
  const r = Math.max(1, Math.round(radius));
  const puffer = new Float32Array(werte.length);
  const lauf = (quelle: Float32Array, zielFeld: Float32Array, laenge: number, schritt: number, reihen: number, reihenSchritt: number) => {
    for (let j = 0; j < reihen; j++) {
      const start = j * reihenSchritt;
      let summe = 0;
      for (let i = -r; i <= r; i++) summe += quelle[start + Math.min(laenge - 1, Math.max(0, i)) * schritt];
      for (let i = 0; i < laenge; i++) {
        zielFeld[start + i * schritt] = summe / (2 * r + 1);
        summe += quelle[start + Math.min(laenge - 1, i + r + 1) * schritt] - quelle[start + Math.max(0, i - r) * schritt];
      }
    }
  };
  for (let n = 0; n < 2; n++) {
    lauf(werte, puffer, b, 1, h, b);
    lauf(puffer, werte, h, b, b, 1);
  }
}

/** Der Schein des Lichts in einem Abstand (in Logo-Halbmessern): läuft bis etwa drei Halbmesser aus. */
function schein(rr: number): number {
  return rr > 0.85 ? 0.85 * Math.exp(-(rr - 0.85) * 1.05) : 0.85;
}

export function erzeugeZeichenname(leinwand: HTMLCanvasElement, still: boolean): Zeichenname | null {
  const ctx = leinwand.getContext("2d");
  if (!ctx) return null;
  const atlas = document.createElement("canvas");
  // Das ruhende Bild als fertiges Bild im Zwischenspeicher.
  const ruhe = document.createElement("canvas");
  const ruheCtx = ruhe.getContext("2d");
  if (!ruheCtx) return null;

  let breite = 0;
  let hoehe = 0;
  // Höhe der Zeichenfläche: der Kopfbereich plus der Überhang darunter (dorthin fliegen die Zeichen
  // beim Scrollen). Sie wird einmal beim Aufbau angelegt, nicht erst beim ersten Scrollen: So
  // ruckelt dort nichts.
  let flaecheH = 0;
  let flugDauer = FLUG_DAUER;
  // Probe vor dem Start (siehe probe()).
  let probeAn = false;
  let probeNr = 0;
  let deckVorProbe = "";
  let dichte = 1;
  // Scrollen: Fortschritt 0 bis 1 und der Teil der Fläche, der gerade im Bild ist.
  let rollS = 0;
  let rollGemalt = 0;
  let rollZuletzt = 0;
  let sichtOben = 0;
  let sichtHoch = Infinity;
  let n = 0;
  let zb = 6.5;
  let zh = 8.5;
  let kb = 9;
  let kh = 11;
  // Maßstab des Vorrats (Pixeldichte × 1,8).
  let vorratMass = 1.8;
  // Der Kasten des Namens: Mitte für Flug und Welle, Bereich für den Klick.
  const kasten = { x: 0, y: 0, b: 1, h: 1 };
  // Je Zelle: Platz, Dichte, Zeichen und die festen Anteile des Lichts.
  let hx = new Float32Array(0);
  let hy = new Float32Array(0);
  let staerke = new Uint8Array(0);
  let glyphe = new Uint8Array(0);
  // Deckkraft in Ruhe: Dichte/9 × 0,7.
  let ruheDeck = new Float32Array(0);
  let cosW = new Float32Array(0);
  let sinW = new Float32Array(0);
  let goldRuhe = new Float32Array(0);
  let kern = new Float32Array(0);
  // Startflug: Versatz des Startpunkts und die Schwelle, ab der das Zeichen losfliegt.
  let sx = new Float32Array(0);
  let sy = new Float32Array(0);
  let schwelle = new Float32Array(0);
  // Bewegung: Ausweichen vor dem Zeiger, getauschte Zeichen (Flug und Welle), Flimmern.
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let tausch = new Int8Array(0);
  let flimmer = new Int8Array(0);
  // Wo jede Zelle im Raster sitzt (zum Flicken einzelner Zellen samt ihrer Nachbarn).
  let spalte = new Int16Array(0);
  let reihe = new Int16Array(0);
  let gitter = new Int32Array(0);
  let gSpalten = 0;
  let gZeilen = 0;

  const lage: LichtLage = { mitteX: 0, mitteY: 0, radius: 1, kippX: 0, kippY: 0, hell: 1 };
  // So stand das Licht, als das Bild zuletzt gezeichnet wurde.
  const gemalt = { kippX: 0, kippY: 0, hell: -1 };
  const maus = { x: -9999, y: -9999, aktiv: false };
  // Hat sich der Zeiger seit dem letzten Bild bewegt? Ein ruhender Zeiger kostet nichts.
  let mausNeu = false;
  let nachFlug: (() => void) | undefined;
  let wellen: { x: number; y: number; t: number }[] = [];
  let flimmernde: number[] = [];
  let flimmerZuletzt = 0;
  let letzte = 0;
  let rahmen = 0;
  let uhr = 0;
  let imBild = true;
  let vorbei = false;
  let zustand: "verborgen" | "flug" | "blende" | "da" = "verborgen";
  let flugZeit = 0;
  let blendZeit = 0;
  // Hat sich das Licht geändert, seit die Fläche zuletzt gezeichnet wurde?
  let lichtNeu = true;
  // Stimmt der Zwischenspeicher nicht mehr mit dem ruhenden Bild überein?
  let speicherAlt = true;
  // Rahmen um alle Zeichen: Ein Zeiger weit daneben kostet nichts.
  const rand = { x0: 0, y0: 0, x1: 0, y1: 0 };
  // Zeigt die Zeichenfläche gerade etwas anderes als das ruhende Bild?
  let bewegtBild = true;
  // Sind Zeichen noch auf dem Weg (Ausweichen, Zurückfedern, getauschte Zeichen)?
  let unruhe = false;
  // Stehen gerade Zeichen neben ihrem Platz (ruhender Zeiger)?
  let verschoben = false;

  const rnd = Math.random;

  const bauen = (m: NameMasse, neueLage: LichtLage) => {
    breite = m.breite;
    hoehe = m.hoehe;
    dichte = Math.min(window.devicePixelRatio || 1, m.dichteMax);
    if (breite * hoehe * dichte * dichte > 7e6) dichte = 1;
    flaecheH = hoehe + Math.max(0, m.ueberhang ?? 0);
    flugDauer = m.flugDauer ?? FLUG_DAUER;
    leinwand.width = Math.round(breite * dichte);
    leinwand.height = Math.round(flaecheH * dichte);
    leinwand.style.height = `${flaecheH}px`;
    // Das ruhende Bild braucht nur den Kopfbereich selbst.
    ruhe.width = leinwand.width;
    ruhe.height = Math.round(hoehe * dichte);
    zb = m.zelle;
    zh = m.zelle * 1.3;
    Object.assign(kasten, m.name);
    Object.assign(lage, neueLage);

    // 1) Graustufenbild: der Name, mit Platz für die Strahlen rundherum.
    const randX = Math.round(Math.min(m.name.x, m.name.b * 0.06));
    const randY = Math.round(Math.min(m.name.y, m.name.h * 0.85));
    const rb = Math.ceil(m.name.b + randX * 2);
    const rh = Math.ceil(m.name.h + randY * 2);
    const bild = document.createElement("canvas");
    bild.width = rb;
    bild.height = rh;
    const bc = bild.getContext("2d", { willReadFrequently: true });
    if (!bc) return 0;
    // Gleiche Maße wie der Schriftzug im SVG: Schriftgröße 285 auf 212 Höhe; die
    // breiteste Zeile füllt die volle Breite, weitere Zeilen stehen mittig darunter.
    const anzahlZeilen = m.zeilen.length;
    const luecke = anzahlZeilen > 1 ? m.name.h * 0.045 : 0;
    const zeilenHoehe = (m.name.h - luecke * (anzahlZeilen - 1)) / anzahlZeilen;
    bc.font = `800 ${(zeilenHoehe * 285) / 212}px ${m.schrift}`;
    bc.textBaseline = "alphabetic";
    bc.fillStyle = "#fff";
    const breiten = m.zeilen.map((z) => bc.measureText(z).width || 1);
    const zug = m.name.b / Math.max(...breiten);
    m.zeilen.forEach((zeile, i) => {
      bc.save();
      bc.translate(randX + (m.name.b - breiten[i] * zug) / 2, randY + i * (zeilenHoehe + luecke));
      bc.scale(zug, 1);
      bc.fillText(zeile, 0, (zeilenHoehe * 205) / 212);
      // Am Handy sind die Striche der Buchstaben nur zwei, drei Zellen breit: Dort werden sie um
      // knapp eine halbe Zelle je Seite kräftiger gezeichnet. So erreichen mehr Zellen die volle
      // Dichte (die Block-Zeichen), und die Buchstaben wirken geschlossen.
      if (m.fein) {
        bc.strokeStyle = "#fff";
        bc.lineJoin = "round";
        bc.lineWidth = m.zelle * 0.9;
        bc.strokeText(zeile, 0, (zeilenHoehe * 205) / 212);
      }
      bc.restore();
    });
    const roh = bc.getImageData(0, 0, rb, rh).data;
    const fest = (px: number, py: number) => (px < 0 || py < 0 || px >= rb || py >= rh ? 0 : roh[((py | 0) * rb + (px | 0)) * 4 + 3]);

    // Ein paar feine Strahlen von den Ober- und Unterkanten der Buchstaben nach außen.
    const saat = zufall(20261112);
    bc.lineCap = "round";
    const anzahl = Math.round(m.name.b / 19);
    for (let k = 0; k < anzahl; k++) {
      const px = randX + saat() * m.name.b;
      const nachOben = saat() < 0.5;
      // Kante suchen: von außen auf die Schrift zu.
      let py = nachOben ? randY : randY + m.name.h;
      const schritt = nachOben ? 2 : -2;
      let gefunden = false;
      for (let s = 0; s < m.name.h * 0.5; s += 2) {
        if (fest(px, py) > 128) {
          gefunden = true;
          break;
        }
        py += schritt;
      }
      if (!gefunden) continue;
      const seite = ((px - randX) / m.name.b) * 2 - 1;
      const winkel = (nachOben ? -Math.PI / 2 : Math.PI / 2) + seite * 0.75 * (nachOben ? 1 : -1) + (saat() - 0.5) * 0.3;
      // Am Handy laufen die Strahlen nach unten nur etwa halb so weit aus.
      const lang = m.name.h * (0.2 + Math.pow(saat(), 1.6) * 0.72) * (m.fein && !nachOben ? 0.5 : 1);
      const dick = m.zelle * (0.9 + saat() * 0.9);
      const ex = px + Math.cos(winkel) * lang;
      const ey = py + Math.sin(winkel) * lang;
      const verlauf = bc.createLinearGradient(px, py, ex, ey);
      verlauf.addColorStop(0, "rgba(255,255,255,1)");
      verlauf.addColorStop(0.55, "rgba(255,255,255,0.55)");
      verlauf.addColorStop(1, "rgba(255,255,255,0)");
      bc.strokeStyle = verlauf;
      bc.lineWidth = dick;
      bc.beginPath();
      bc.moveTo(px, py);
      bc.lineTo(ex, ey);
      bc.stroke();
    }

    // Kanten leicht weichzeichnen, damit die Ränder der Buchstaben nicht stufig werden.
    const mitStrahlen = bc.getImageData(0, 0, rb, rh).data;
    const grau = new Float32Array(rb * rh);
    for (let i = 0; i < grau.length; i++) grau[i] = mitStrahlen[i * 4 + 3] / 255;
    weichzeichnen(grau, rb, rh, m.zelle * 0.3);

    // 2) Raster: Abdeckung und Tinte je Zelle → Dichte 1 bis 9.
    const spalten = Math.max(12, Math.floor(rb / zb));
    const zeilen = Math.max(1, Math.floor(rh / zh));
    const x0 = m.name.x - randX + (rb - spalten * zb) / 2;
    const y0 = m.name.y - randY + (rh - zeilen * zh) / 2;
    const teile: number[] = [];
    for (let j = 0; j < zeilen; j++) {
      for (let i = 0; i < spalten; i++) {
        let bedeckt = 0;
        let tinte = 0;
        for (let py2 = 0; py2 < 4; py2++) {
          for (let px2 = 0; px2 < 4; px2++) {
            const px = Math.min(rb - 1, Math.max(0, Math.floor((rb - spalten * zb) / 2 + (i + (px2 + 0.5) / 4) * zb)));
            const py = Math.min(rh - 1, Math.max(0, Math.floor((rh - zeilen * zh) / 2 + (j + (py2 + 0.5) / 4) * zh)));
            const wert = grau[py * rb + px];
            if (wert > 0.1) {
              bedeckt += 1;
              tinte += wert;
            }
          }
        }
        const cov = bedeckt / 16;
        if (cov < 0.08) continue;
        // Grundwert: 9 × Stärke der Tinte (Buchstaben voll, Strahlen laufen aus).
        const grundwert = 9 * (tinte / bedeckt);
        const d = Math.max(1, Math.min(9, Math.round(grundwert * (0.45 + 0.55 * Math.min(1, 1.6 * cov)))));
        teile.push(x0 + (i + 0.5) * zb, y0 + (j + 0.5) * zh, d, waehle(d, saat()), i, j);
      }
    }

    // 3) Zellen anlegen, mit den festen Anteilen des Lichts (Lage zur Logo-Mitte) und dem Startflug.
    n = teile.length / 6;
    gSpalten = spalten;
    gZeilen = zeilen;
    gitter = new Int32Array(spalten * zeilen).fill(-1);
    spalte = new Int16Array(n);
    reihe = new Int16Array(n);
    hx = new Float32Array(n);
    hy = new Float32Array(n);
    staerke = new Uint8Array(n);
    glyphe = new Uint8Array(n);
    ruheDeck = new Float32Array(n);
    cosW = new Float32Array(n);
    sinW = new Float32Array(n);
    goldRuhe = new Float32Array(n);
    kern = new Float32Array(n);
    sx = new Float32Array(n);
    sy = new Float32Array(n);
    schwelle = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    tausch = new Int8Array(n).fill(-1);
    flimmer = new Int8Array(n).fill(-1);
    // Mitte des Namens für den Flug: 50 % der Breite, 42 % der Höhe.
    const mx = m.name.x + m.name.b * 0.5;
    const my = m.name.y + m.name.h * 0.42;
    const u = 0.75 * m.schirm;
    rand.x0 = rand.y0 = Infinity;
    rand.x1 = rand.y1 = -Infinity;
    for (let k = 0; k < n; k++) {
      // Auf ganze Bildpunkte legen, damit die Zeichen scharf stehen.
      const px = Math.round(teile[k * 6] * dichte) / dichte;
      const py = Math.round(teile[k * 6 + 1] * dichte) / dichte;
      spalte[k] = teile[k * 6 + 4];
      reihe[k] = teile[k * 6 + 5];
      gitter[reihe[k] * spalten + spalte[k]] = k;
      hx[k] = px;
      hy[k] = py;
      if (px < rand.x0) rand.x0 = px;
      if (px > rand.x1) rand.x1 = px;
      if (py < rand.y0) rand.y0 = py;
      if (py > rand.y1) rand.y1 = py;
      staerke[k] = teile[k * 6 + 2];
      glyphe[k] = teile[k * 6 + 3];
      ruheDeck[k] = Math.min(1, (staerke[k] / 9) * 0.7);
      const dx = px - lage.mitteX;
      const dy = py - lage.mitteY;
      const r = Math.hypot(dx, dy) || 0.001;
      const rr = r / lage.radius;
      cosW[k] = dx / r;
      sinW[k] = dy / r;
      // Gold: direkt an den Balken am stärksten, dazu der Schein, der von ihnen nach außen strahlt.
      const amBalken = Math.exp(-abstandZumBalken(dx / lage.radius, -dy / lage.radius) * 5.5);
      goldRuhe[k] = Math.max(amBalken, schein(rr));
      // Ein Hauch helleres Gold: nahe am Stern in der Mitte.
      kern[k] = Math.exp(-(rr / 0.45) * (rr / 0.45));
      // Startpunkt: in der Richtung von der Namensmitte zum Platz (± 0,8 im Bogenmaß), 0,5 bis
      // 1,4 × u weit draußen, dazu bis 0,25 × u nach oben versetzt.
      const winkel = Math.atan2(py - my, px - mx) + (rnd() * 2 - 1) * 0.8;
      const weite = (0.5 + rnd() * 0.9) * u;
      sx[k] = Math.cos(winkel) * weite;
      sy[k] = Math.sin(winkel) * weite - rnd() * 0.25 * u;
      // Reihenfolge: Die Mitte des Namens landet zuerst, die Ränder zuletzt.
      const abstandMitte = Math.hypot((px - mx) / m.name.b, (py - my) / m.name.h);
      schwelle[k] = Math.max(0, Math.min(0.45, (0.62 - abstandMitte) * 0.5 + 0.22 * rnd()));
    }

    // 4) Vorrat: jedes Zeichen in jeder Färbung einmal fertig gezeichnet, mit 1,8-facher
    // Pixeldichte (die Deckkraft kommt erst beim Zeichnen dazu).
    kb = Math.ceil(zb + 2);
    kh = Math.ceil(zh + 2);
    vorratMass = dichte * VORRAT_SCHARF;
    atlas.width = Math.ceil(ZEICHEN.length * kb * vorratMass);
    atlas.height = Math.ceil(GOLD_STUFEN * CREME_STUFEN * kh * vorratMass);
    const ac = atlas.getContext("2d");
    if (!ac) return 0;
    ac.setTransform(vorratMass, 0, 0, vorratMass, 0, 0);
    ac.clearRect(0, 0, atlas.width, atlas.height);
    // Monospace (JetBrains Mono), Stärke 500, gezeichnet mit 1,25 × Zellbreite.
    const schriftGroesse = zb * 1.25;
    ac.font = `500 ${schriftGroesse.toFixed(2)}px ${m.mono}, ui-monospace, Menlo, monospace`;
    ac.textAlign = "center";
    ac.textBaseline = "middle";
    // Die Block-Zeichen ▒ und ▓ werden als Raster gezeichnet, so wie sie in einer Monospace-Schrift
    // aussehen: ein Feld in Zeichenbreite (0,6 der Schriftgröße) über die ganze Zeilenhöhe, zur
    // Hälfte bzw. zu drei Vierteln mit Punkten gefüllt; übereinander schließen sie zu Streifen. So
    // sehen sie auf jedem Gerät gleich aus (die Web-Fassung von JetBrains Mono liefert diese beiden
    // Zeichen nicht mit; sonst spränge je Gerät eine andere, viel breitere Ersatzschrift ein).
    const blockB = schriftGroesse * 0.6;
    const blockH = zh;
    const punkt = blockB / 6;
    const block = (mx2: number, my2: number, dicht: boolean) => {
      const links = mx2 - blockB / 2;
      const oben = my2 - blockH / 2;
      const reihen = Math.round(blockH / punkt);
      const hoch = blockH / reihen;
      for (let j = 0; j < reihen; j++) {
        for (let i = 0; i < 6; i++) {
          // ▒: Schachbrett (jeder zweite Punkt). ▓: drei von vier Punkten.
          const an = dicht ? !(i % 2 === 1 && j % 2 === 1) : (i + j) % 2 === 0;
          if (an) ac.fillRect(links + i * punkt, oben + j * hoch, punkt, hoch);
        }
      }
    };
    // Am Handy ist der Name klein: Dort steht er in einem helleren Grau, damit er gut lesbar bleibt.
    const grundGrau = m.fein ? GRAU_HANDY : GRAU;
    for (let g = 0; g < GOLD_STUFEN; g++) {
      for (let c = 0; c < CREME_STUFEN; c++) {
        const go = Math.pow(g / (GOLD_STUFEN - 1), 0.85);
        const cr = c / (CREME_STUFEN - 1);
        const kanal = (i: number) => Math.round((grundGrau[i] + (GOLD[i] - grundGrau[i]) * go) * (1 - cr) + CREME[i] * cr);
        ac.fillStyle = `rgb(${kanal(0)}, ${kanal(1)}, ${kanal(2)})`;
        const my2 = (g * CREME_STUFEN + c) * kh + kh / 2;
        for (let z = 0; z < ZEICHEN.length; z++) {
          const mx2 = z * kb + kb / 2;
          if (z === BLOCK_MITTEL || z === BLOCK_DICHT) block(mx2, my2, z === BLOCK_DICHT);
          else ac.fillText(ZEICHEN[z], mx2, my2 + 0.5);
        }
      }
    }

    wellen = [];
    flimmernde = [];
    verschoben = false;
    unruhe = false;
    // Aufbau und Auftritt sind getrennt: Ein laufender Startflug (samt dem, was danach kommen
    // soll) übersteht einen Neuaufbau, etwa nach einer Größenänderung. Bei „weniger Bewegung“
    // blendet der Name beim ersten Aufbau einfach ein.
    if (still && zustand === "verborgen") {
      zustand = "blende";
      blendZeit = 0;
    }
    lichtNeu = true;
    speicherAlt = true;
    bewegtBild = true;
    wecken();
    return n;
  };

  // Helligkeit und Kipprichtung des Lichts merken. Neu gezeichnet wird nur, wenn man es sähe.
  const licht = (neu: LichtLage) => {
    lage.hell = neu.hell;
    lage.kippX = neu.kippX;
    lage.kippY = neu.kippY;
    // (Das leichte Atmen des Lichts, ± 2 %, zählt nicht; ein Kippen ab gut einem Hundertstel schon.)
    if (Math.abs(lage.hell - gemalt.hell) > 0.03 || Math.abs(lage.kippX - gemalt.kippX) > 0.012 || Math.abs(lage.kippY - gemalt.kippY) > 0.012) {
      lichtNeu = true;
      wecken();
    }
  };

  /** Zeichnet eine Zelle: Stelle, Größe, Deckkraft und wie weit sie noch fliegt (0 = am Platz). */
  let deckJetzt = 1;
  const male = (c: CanvasRenderingContext2D, k: number, x: number, y: number, groesse: number, deck: number, flug: number) => {
    // Kippt das Licht zur Maus, bekommt die Seite in dieser Richtung mehr ab, die Gegenseite weniger.
    let kegel = 1 + 3.2 * (cosW[k] * lage.kippX + sinW[k] * lage.kippY);
    if (kegel < 0.04) kegel = 0.04;
    else if (kegel > 2.2) kegel = 2.2;
    let gold = lage.hell * goldRuhe[k] * kegel;
    let creme = lage.hell * kern[k] * 0.85;
    if (flug > 0) {
      // Unterwegs haben die Zeichen das Hellgrau des Namens, nur leicht wärmer. Golden werden sie
      // nur, wo sie unter dem Licht durchfliegen. Im letzten Fünftel des Wegs gleicht sich die
      // Farbe der ihres Platzes an.
      const anteil = flug > 0.2 ? 1 : flug * 5;
      const unterLicht = lage.hell * schein(Math.hypot(x - lage.mitteX, y - lage.mitteY) / lage.radius) * 0.8;
      gold += (unterLicht - gold) * anteil;
      creme += (FLUG_WAERME - creme) * anteil;
    }
    if (gold > 1) gold = 1;
    if (creme > 1) creme = 1;
    const stufe = Math.round(gold * (GOLD_STUFEN - 1)) * CREME_STUFEN + Math.round(creme * (CREME_STUFEN - 1));
    const z = tausch[k] >= 0 ? tausch[k] : flimmer[k] >= 0 ? flimmer[k] : glyphe[k];
    if (deck !== deckJetzt) {
      c.globalAlpha = deck;
      deckJetzt = deck;
    }
    c.drawImage(atlas, z * kb * vorratMass, stufe * kh * vorratMass, kb * vorratMass, kh * vorratMass, x - (kb * groesse) / 2, y - (kh * groesse) / 2, kb * groesse, kh * groesse);
  };

  /** Merken, in welchem Licht die Fläche zuletzt gezeichnet wurde. */
  const lichtGemalt = () => {
    gemalt.hell = lage.hell;
    gemalt.kippX = lage.kippX;
    gemalt.kippY = lage.kippY;
    lichtNeu = false;
  };

  /** Das ruhende Bild neu in den Zwischenspeicher zeichnen: alle Zeichen am Platz, im jetzigen Licht. */
  const ruheZeichnen = () => {
    ruheCtx.setTransform(dichte, 0, 0, dichte, 0, 0);
    ruheCtx.clearRect(0, 0, breite, hoehe);
    deckJetzt = 1;
    ruheCtx.globalAlpha = 1;
    for (let k = 0; k < n; k++) male(ruheCtx, k, hx[k], hy[k], 1, ruheDeck[k], 0);
    lichtGemalt();
    speicherAlt = false;
  };

  /**
   * Eine einzelne Zelle neu zeichnen (ihr Zeichen hat gewechselt). Ein Zeichen ragt etwas über
   * seine Zelle hinaus: Deshalb wird genau sein Feld geleert und alles, was hineinragt
   * (die Zelle selbst und ihre Nachbarn), in der ursprünglichen Reihenfolge neu gezeichnet. So
   * bleiben keine Reste stehen, auch nach beliebig vielen Wechseln.
   */
  const flicke = (c: CanvasRenderingContext2D, k: number) => {
    // Das Feld auf ganze Bildpunkte legen, damit Leeren und Zeichnen sich genau decken.
    const xa = Math.floor((hx[k] - kb / 2) * dichte) / dichte;
    const ya = Math.floor((hy[k] - kh / 2) * dichte) / dichte;
    const xb = Math.ceil((hx[k] + kb / 2) * dichte) / dichte;
    const yb = Math.ceil((hy[k] + kh / 2) * dichte) / dichte;
    c.save();
    c.beginPath();
    c.rect(xa, ya, xb - xa, yb - ya);
    c.clip();
    c.clearRect(xa, ya, xb - xa, yb - ya);
    c.globalAlpha = 1;
    deckJetzt = 1;
    for (let j = reihe[k] - 1; j <= reihe[k] + 1; j++) {
      if (j < 0 || j >= gZeilen) continue;
      for (let i = spalte[k] - 1; i <= spalte[k] + 1; i++) {
        if (i < 0 || i >= gSpalten) continue;
        const q = gitter[j * gSpalten + i];
        if (q >= 0) male(c, q, hx[q], hy[q], 1, ruheDeck[q], 0);
      }
    }
    c.restore();
    deckJetzt = 1;
  };

  /** Den Zwischenspeicher auf die Zeichenfläche legen. */
  const ruheZeigen = (deck: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, leinwand.width, leinwand.height);
    ctx.globalAlpha = deck;
    ctx.drawImage(ruhe, 0, 0);
    ctx.globalAlpha = 1;
  };

  const bildSchritt = (jetzt: number) => {
    rahmen = 0;
    if (vorbei || !n) return;
    // Steht die Seite mitten im Auseinanderfliegen still, genügt ein neues Bild alle 80 ms
    // (nur die Zeichen wechseln noch).
    if (rollS > 0 && rollS < 1 && zustand === "da" && letzte && jetzt - rollZuletzt > 250 && jetzt - letzte < 80) return wecken();
    // Gerechnet wird mit der wirklich vergangenen Zeit: Flug und Welle dauern auch auf langsamen
    // Geräten so lange wie vorgesehen (2,2 s und 1,3 s). Pausen zählen nicht mit: Nach einer Ruhe,
    // einem verdeckten Fenster oder wenn der Kopfbereich aus dem Bild war, beginnt die Uhr neu.
    const dt = letzte ? Math.min(1, (jetzt - letzte) / 1000) : 1 / 60;
    letzte = jetzt;
    // Wahrscheinlichkeiten „pro Bild“ gelten für 60 Bilder je Sekunde.
    const bilder = dt * 60;

    if (zustand === "verborgen") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, leinwand.width, leinwand.height);
      return;
    }

    if (zustand === "blende") {
      // „Weniger Bewegung“: Der Name blendet einfach ein.
      blendZeit += dt;
      const f = Math.min(1, blendZeit / BLENDE_DAUER);
      if (speicherAlt || lichtNeu) ruheZeichnen();
      ruheZeigen(f * f * (3 - 2 * f));
      bewegtBild = false;
      if (f >= 1) zustand = "da";
      else wecken();
      return;
    }

    let imFlug = zustand === "flug";
    let a = 0;
    let gelandet = false;
    if (imFlug) {
      flugZeit += dt;
      const fort = Math.min(1, flugZeit / flugDauer);
      // Restweg: am Anfang sehr schnell, am Ende weich landend.
      a = (1 - fort) * (1 - fort) * (1 - fort);
      if (fort >= 1) {
        imFlug = false;
        gelandet = true;
        zustand = "da";
        tausch.fill(-1);
      }
    }

    // Gemeinsamer Antrieb von Startflug und Scrollen: l = max(Scroll-Fortschritt, Restweg des Flugs).
    const l = Math.max(rollS, a);
    const unterwegs = l > 0;
    const rollNeu = rollS !== rollGemalt;
    // Ganz weggescrollt: Alle Zeichen sind draußen, es gibt nichts mehr zu zeichnen.
    const allesWeg = !imFlug && rollS >= 1;

    const hatteWellen = wellen.length > 0;
    for (const w of wellen) w.t += dt;
    if (hatteWellen) wellen = wellen.filter((w) => w.t < WELLE_DAUER);
    const mitWellen = wellen.length > 0;

    // Ruhe-Flimmern: Alle 140 ms wechseln ein paar Zellen ihr Zeichen und beim nächsten Takt zurück.
    const einzeln: number[] = [];
    if (!still && zustand === "da" && rollS <= 0 && jetzt - flimmerZuletzt >= FLIMMER_TAKT) {
      flimmerZuletzt = jetzt;
      for (const k of flimmernde) {
        flimmer[k] = -1;
        einzeln.push(k);
      }
      flimmernde = [];
      const viele = Math.max(1, Math.round(n * FLIMMER_ANTEIL));
      for (let i = 0; i < viele; i++) {
        const k = Math.floor(rnd() * n);
        if (flimmer[k] >= 0) continue;
        // Für einen Takt ein anderes Zeichen (aus den zehn Zufallszeichen).
        let neues = Math.floor(rnd() * ZUFALL);
        if (neues === glyphe[k]) neues = (neues + 1) % ZUFALL;
        flimmer[k] = neues;
        flimmernde.push(k);
        einzeln.push(k);
      }
    }

    // Gerechnet wird nur, wenn sich wirklich etwas ändert: Die Zeichen fliegen, eine Welle läuft,
    // der Zeiger hat sich bewegt oder Zeichen sind noch unterwegs. Stehen Zeichen neben ihrem Platz
    // (ruhender Zeiger), wird auch dann alles gezeichnet, wenn sich nur das Licht oder ein Zeichen ändert.
    const mausNah = maus.aktiv && maus.x > rand.x0 - MAUS_UMKREIS && maus.x < rand.x1 + MAUS_UMKREIS && maus.y > rand.y0 - MAUS_UMKREIS && maus.y < rand.y1 + MAUS_UMKREIS;
    const rechnen =
      imFlug || gelandet || hatteWellen || unruhe || rollNeu || (rollS > 0 && !allesWeg) || (mausNeu && (mausNah || verschoben)) || (verschoben && (lichtNeu || einzeln.length > 0));
    mausNeu = false;
    let weiter = imFlug || mitWellen || (rollS > 0 && !allesWeg);

    if (rechnen) {
      const zug = 1 - Math.pow(0.75, bilder);
      const wechselFlug = 1 - Math.pow(0.93, bilder);
      const wechselWelle = 1 - Math.pow(0.75, bilder);
      let nochUnruhe = false;
      let nebenPlatz = false;
      ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
      ctx.clearRect(0, 0, breite, flaecheH);
      deckJetzt = 1;
      ctx.globalAlpha = 1;
      rollGemalt = rollS;
      // Gezeichnet wird nur, was im Bild ist (plus 40 px Rand).
      const untenRand = Math.min(flaecheH, sichtOben + sichtHoch) + 40;
      const obenRand = sichtOben - 40;
      for (let k = 0; k < (allesWeg ? 0 : n); k++) {
        // Eigener Fortschritt im Flug: 1 = ganz außen, 0 = gelandet.
        let f = 0;
        if (unterwegs) {
          const q = (l - schwelle[k]) / 0.55;
          f = q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q);
        }
        // Maus und Welle wirken erst, wenn das Zeichen gelandet ist, und nicht beim Scrollen.
        const amPlatz = f < 0.05 && rollS <= 0;
        let tx = 0;
        let ty = 0;
        if (amPlatz && maus.aktiv) {
          const dx = hx[k] - maus.x;
          const dy = hy[k] - maus.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAUS_UMKREIS * MAUS_UMKREIS) {
            const d = Math.sqrt(d2) || 0.001;
            const schub = (1 - d / MAUS_UMKREIS) * MAUS_SCHUB;
            tx = (dx / d) * schub;
            ty = (dy / d) * schub;
          }
        }
        // Jedes Bild 25 % zum Ziel hin; kleinste Reste unter 0,05 px fallen weg.
        if (ox[k] !== tx || oy[k] !== ty) {
          ox[k] += (tx - ox[k]) * zug;
          oy[k] += (ty - oy[k]) * zug;
          if (Math.abs(tx - ox[k]) < 0.05 && Math.abs(ty - oy[k]) < 0.05) {
            ox[k] = tx;
            oy[k] = ty;
          } else {
            nochUnruhe = true;
          }
        }
        if (ox[k] !== 0 || oy[k] !== 0) nebenPlatz = true;
        let wx = 0;
        let wy = 0;
        let ausschlag = 0;
        if (mitWellen && amPlatz) {
          for (const w of wellen) {
            const dx = hx[k] - w.x;
            const dy = hy[k] - w.y;
            const d = Math.hypot(dx, dy) || 0.001;
            const zurFront = (d - WELLE_TEMPO * w.t) / WELLE_BAND;
            if (zurFront > 3 || zurFront < -3) continue;
            const rest = 1 - w.t / WELLE_DAUER;
            const schub = WELLE_SCHUB * Math.exp(-zurFront * zurFront) * rest * rest;
            wx += (dx / d) * schub;
            wy += (dy / d) * schub;
            ausschlag += schub;
          }
          // Mehrere Wellen addieren sich, zusammen aber höchstens 40 px.
          if (ausschlag > WELLE_SCHUB) {
            const laenge = Math.hypot(wx, wy);
            if (laenge > WELLE_SCHUB) {
              wx *= WELLE_SCHUB / laenge;
              wy *= WELLE_SCHUB / laenge;
            }
            ausschlag = WELLE_SCHUB;
          }
        }
        // Zeichenwechsel: unterwegs mit 7 % je Bild, von einer Welle getroffen (ab 7 px) mit 25 % je Bild.
        if (f > 0.02 && f < 0.98) {
          if (rnd() < wechselFlug) tausch[k] = Math.floor(rnd() * ZUFALL);
        } else if (ausschlag >= 7) {
          if (rnd() < wechselWelle) tausch[k] = Math.floor(rnd() * ZUFALL);
        } else if (tausch[k] >= 0) {
          // Am Ziel steht immer das richtige Zeichen.
          tausch[k] = -1;
        }
        if (f >= 0.995) continue;
        const x = hx[k] + sx[k] * f + ox[k] + wx;
        const y = hy[k] + sy[k] * f + oy[k] + wy;
        // Zeichen außerhalb des Bildes (mehr als 40 px über den Rand) werden nicht gezeichnet.
        if (x < -40 || y < obenRand || x > breite + 40 || y > untenRand) continue;
        // Deckkraft: in Ruhe Dichte/9 × 0,7. Unterwegs × (1 − f)^0,8, mindestens 0,22, sobald das
        // Zeichen losgeflogen und im Bild ist. Von einer Welle getroffen × (1 + Ausschlag/28),
        // höchstens ganz deckend.
        let deck = ruheDeck[k];
        if (f > 0) {
          deck *= Math.pow(1 - f, 0.8);
          if (f > 0.05) deck = Math.max(deck, FLUG_BODEN * Math.min(1, (f - 0.05) / 0.15) * Math.min(1, (1 - f) / 0.03));
        }
        if (ausschlag > 0) deck = Math.min(1, deck * (1 + ausschlag / 28));
        male(ctx, k, x, y, 1 + 0.8 * f, deck, f);
      }
      ctx.globalAlpha = 1;
      unruhe = nochUnruhe;
      verschoben = nebenPlatz;
      weiter = weiter || nochUnruhe;
      lichtGemalt();
      // Steht jetzt wieder alles am Platz, zeigt die Fläche das ruhende Bild: Es wandert so, wie
      // es ist, in den Zwischenspeicher.
      bewegtBild = imFlug || mitWellen || nebenPlatz || rollS > 0;
      speicherAlt = bewegtBild;
      if (!bewegtBild) {
        ruheCtx.setTransform(1, 0, 0, 1, 0, 0);
        ruheCtx.clearRect(0, 0, ruhe.width, ruhe.height);
        ruheCtx.drawImage(leinwand, 0, 0);
      }
    } else if ((lichtNeu || bewegtBild) && rollS <= 0 && !verschoben) {
      // Nichts bewegt sich, aber das Licht hat sich geändert: ruhendes Bild neu, dann als Ganzes zeigen.
      // Nicht, solange Zeichen neben ihrem Platz stehen (die Maus ruht im Namen): Das ruhende Bild
      // zeigt den Namen ohne Loch. Die Fläche bleibt dann, wie sie ist, bis sich wieder etwas ändert.
      if (speicherAlt || lichtNeu) ruheZeichnen();
      ruheZeigen(1);
      bewegtBild = false;
    } else if (einzeln.length > 0 && rollS <= 0) {
      // Nur die Zellen, die ihr Zeichen getauscht haben: auf der Fläche und im Zwischenspeicher.
      for (const c of speicherAlt ? [ctx] : [ctx, ruheCtx]) {
        c.setTransform(dichte, 0, 0, dichte, 0, 0);
        for (const k of einzeln) flicke(c, k);
      }
    }

    if (gelandet) {
      // Erst jetzt steht der Name wirklich: Was danach kommen soll, kommt genau einmal.
      const danach = nachFlug;
      nachFlug = undefined;
      danach?.();
    }

    // In Ruhe steht die Uhr: Das nächste bewegte Bild beginnt mit einem frischen Zeitschritt.
    if (!weiter) letzte = 0;
    if (weiter) wecken();
    else if (!still && zustand === "da") {
      // Nur das Flimmern braucht noch die Uhr: zum nächsten Takt wieder melden.
      window.clearTimeout(uhr);
      uhr = window.setTimeout(wecken, Math.max(16, FLIMMER_TAKT - (performance.now() - flimmerZuletzt)));
    }
  };

  const wecken = () => {
    if (rahmen || vorbei || !imBild || document.hidden) return;
    rahmen = requestAnimationFrame(bildSchritt);
  };
  const wiederDa = () => {
    letzte = 0;
    wecken();
  };
  document.addEventListener("visibilitychange", wiederDa);

  const welleBei = (x: number, y: number) => {
    wellen.push({ x, y, t: 0 });
    // Höchstens vier Wellen gleichzeitig.
    if (wellen.length > 4) wellen.shift();
    letzte = 0;
    wecken();
  };

  return {
    bauen,
    licht,
    zeiger: (x, y, aktiv) => {
      if (still) return;
      if (x === maus.x && y === maus.y && aktiv === maus.aktiv) return;
      maus.x = x;
      maus.y = y;
      maus.aktiv = aktiv;
      mausNeu = true;
      wecken();
    },
    welle: (x, y) => {
      // Nur im Bereich des Namens (plus 40 px Rand) und nicht während des Startflugs.
      if (still || zustand !== "da" || !n || rollS > 0) return false;
      if (x < kasten.x - 40 || x > kasten.x + kasten.b + 40 || y < kasten.y - 40 || y > kasten.y + kasten.h + 40) return false;
      welleBei(x, y);
      return true;
    },
    welleMitte: () => {
      if (still || zustand !== "da" || !n || rollS > 0) return;
      welleBei(kasten.x + kasten.b * 0.5, kasten.y + kasten.h * 0.42);
    },
    starten: (danach) => {
      if (still || zustand !== "verborgen") return;
      nachFlug = danach;
      zustand = "flug";
      flugZeit = 0;
      letzte = 0;
      wecken();
    },
    probe: (an) => {
      if (vorbei || still || !n) return;
      if (an) {
        if (zustand !== "verborgen" || probeAn) return;
        probeAn = true;
        // Fast unsichtbar (0,5 % Deckkraft: unter einer halben Stufe von 255), damit der Browser die Bilder wirklich zeichnet.
        deckVorProbe = leinwand.style.opacity;
        leinwand.style.opacity = "0.005";
        return;
      }
      if (!probeAn) return;
      probeAn = false;
      tausch.fill(-1);
      if (zustand === "verborgen") {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, leinwand.width, leinwand.height);
      }
      leinwand.style.opacity = deckVorProbe;
    },
    probeBild: () => {
      if (vorbei || !probeAn || zustand !== "verborgen") return;
      probeNr += 1;
      ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
      ctx.clearRect(0, 0, breite, flaecheH);
      deckJetzt = 1;
      // Jedes Zeichen ein Stück vor seinem Platz, vergrößert und mit wechselnden Zeichen: wie mitten im Flug.
      const f = 0.1 + 0.05 * (probeNr % 3);
      for (let k = 0; k < n; k++) {
        tausch[k] = (k + probeNr) % ZUFALL;
        const x = hx[k] + sx[k] * f;
        const y = hy[k] + sy[k] * f;
        if (x < -40 || y < -40 || x > breite + 40 || y > flaecheH + 40) continue;
        male(ctx, k, x, y, 1.4, 0.5, 0.5);
      }
      ctx.globalAlpha = 1;
    },
    sofort: () => {
      if (zustand !== "verborgen" && zustand !== "flug") return;
      zustand = "da";
      nachFlug = undefined;
      tausch.fill(-1);
      speicherAlt = true;
      bewegtBild = true;
      letzte = 0;
      wecken();
    },
    rollen: (fortschritt, oben, hoch) => {
      if (still) return;
      const wert = fortschritt <= 0 ? 0 : fortschritt >= 1 ? 1 : fortschritt;
      sichtOben = oben;
      sichtHoch = hoch;
      if (wert === rollS) return;
      rollS = wert;
      rollZuletzt = performance.now();
      wecken();
    },
    sichtbar: (ja) => {
      imBild = ja;
      letzte = 0;
      wecken();
    },
    ende: () => {
      // Lief gerade eine Probe, gehört die Deckkraft der Fläche wieder dem Stylesheet.
      if (probeAn) {
        probeAn = false;
        leinwand.style.opacity = deckVorProbe;
      }
      vorbei = true;
      cancelAnimationFrame(rahmen);
      window.clearTimeout(uhr);
      document.removeEventListener("visibilitychange", wiederDa);
    },
  };
}
