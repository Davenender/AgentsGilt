// Der Name aus Zeichen-Teilchen (vordere Ebene des Kopfbereichs).
//
// So ist er gebaut:
//   1. „AGENTS GILT“ wird unsichtbar als Graustufenbild gezeichnet: unsere
//      schmale, fette Schrift, am Rand weich, dazu ein paar feine Strahlen
//      nach außen (wie spritzende Tinte).
//   2. Das Bild wird in ein Raster aus Zellen zerlegt. Jede Zelle bekommt eine
//      Dichte von 1 bis 9. Zellen mit weniger als 8 % Abdeckung fallen weg.
//      Aus der Dichte folgen Deckkraft (Dichte/9) und Zeichen: innen dichte
//      Zeichen wie # und %, am Rand lockere wie · . :
//   3. Jedes Zeichen liegt einmal fertig gezeichnet in einem Vorrat (Atlas),
//      in jeder Dichte und Färbung. Gezeichnet wird nur, wenn sich etwas
//      bewegt; in Ruhe bleibt das Bild einfach stehen.
//
// Leben: Alle 140 ms tauschen rund 0,4 % der Zellen kurz ihr Zeichen. Die
// Zeichen weichen dem Zeiger aus (Umkreis 70 px, bis 18 px) und federn zurück.
// Ein Klick schickt einen Ring durch den Namen (1150 px/s, 90 px breit, schiebt
// bis 56 px nach außen, klingt in 1,3 s ab); getroffene Zeichen leuchten kurz
// heller und wechseln ihr Zeichen. Das Licht des Logos färbt die Zeichen:
// in den Strahlen golden, nahe am Stern hell-cremig, sonst grau.
import type { LichtLage } from "./lichtszene";

export type NameMasse = {
  /** Größe der Zeichenfläche in CSS-Pixeln. */
  breite: number;
  hoehe: number;
  /** Kasten, in dem der Name steht. */
  name: { x: number; y: number; b: number; h: number };
  /** Breite einer Rasterzelle (Computer etwa 6,5 px, Handy 5 px). */
  zelle: number;
  schrift: string;
  mono: string;
  /** Die Zeilen des Namens: am Computer eine, am Handy zwei übereinander. */
  zeilen: string[];
};

export type Zeichenname = {
  /** Baut das Raster neu auf und meldet, wie viele Zeichen es hat. */
  bauen: (m: NameMasse, lage: LichtLage, sichtbar: boolean) => number;
  /** Das Licht hat sich bewegt: Schimmer neu berechnen. */
  licht: (lage: LichtLage) => void;
  zeiger: (x: number, y: number, aktiv: boolean) => void;
  welle: (x: number, y: number) => void;
  /** Auftritt: Der Name blendet von der Mitte nach außen ein. Danach wird „danach“ einmal aufgerufen. */
  einblenden: (danach?: () => void) => void;
  sichtbar: (ja: boolean) => void;
  ende: () => void;
};

// Von locker nach dicht.
const ZEICHEN = ["·", ".", ":", "-", "=", "+", "*", "/", "%", "#"];
// Welche Zeichen zu welcher Dichte passen (Index 1 bis 9).
const NACH_DICHTE = [[0], [0, 1], [1, 0, 2], [2, 1, 3], [3, 2, 4], [4, 5, 3], [5, 6, 4], [6, 7, 5], [8, 7, 9], [9, 9, 8]];
const GOLD_STUFEN = 6;
const CREME_STUFEN = 5;
const GRAU = [124, 130, 152];
const GOLD = [240, 196, 104];
const CREME = [255, 244, 218];

const FLIMMER_TAKT = 0.14;
const FLIMMER_ANTEIL = 0.004;
const MAUS_UMKREIS = 70;
const MAUS_SCHUB = 18;
const WELLE_TEMPO = 1150;
const WELLE_BAND = 45; // halbe Breite des weichen Bandes
const WELLE_SCHUB = 56;
const WELLE_DAUER = 1.3;
const EINBLEND_DAUER = 1.1;

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

export function erzeugeZeichenname(leinwand: HTMLCanvasElement, still: boolean): Zeichenname | null {
  const ctx = leinwand.getContext("2d");
  if (!ctx) return null;
  const atlas = document.createElement("canvas");

  let breite = 0;
  let hoehe = 0;
  let dichte = 1;
  let n = 0;
  let zb = 6.5;
  let zh = 8.5;
  let kb = 9;
  let kh = 11;
  // Je Zelle: Platz, Dichte, Zeichen und die festen Anteile des Lichts.
  let hx = new Float32Array(0);
  let hy = new Float32Array(0);
  let staerke = new Uint8Array(0);
  let glyphe = new Uint8Array(0);
  let cosW = new Float32Array(0);
  let sinW = new Float32Array(0);
  let fern = new Float32Array(0);
  let innen = new Float32Array(0);
  let kern = new Float32Array(0);
  let abstand = new Float32Array(0);
  // Bewegung
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let hell = new Float32Array(0);
  let ersatz = new Int8Array(0);
  let ersatzBis = new Float32Array(0);
  let getroffen = new Int32Array(0);
  let flimmert = new Uint8Array(0);

  const lage: LichtLage = { mitteX: 0, mitteY: 0, radius: 1, winkel: [-Math.PI / 2, Math.PI / 2, Math.PI, 0], hell: 1 };
  const strahlCos = [0, 0, 0, 0];
  const strahlSin = [0, 0, 0, 0];
  const maus = { x: -9999, y: -9999, aktiv: false };
  // Hat sich der Zeiger seit dem letzten Bild bewegt? Ein ruhender Zeiger kostet nichts.
  let mausNeu = false;
  let nachEinblenden: (() => void) | undefined;
  let wellen: { nr: number; x: number; y: number; t: number }[] = [];
  let wellenNr = 0;
  let flimmernde: number[] = [];
  let zeit = 0;
  let flimmerUhr = 0;
  let letzte = 0;
  let rahmen = 0;
  let imBild = true;
  let vorbei = false;
  let zustand: "verborgen" | "einblenden" | "da" = "verborgen";
  let einblendZeit = 0;
  let allesNeu = true;
  let unruhe = false;
  // Stehen gerade Zeichen neben ihrem Platz (ruhender Zeiger)?
  let verschoben = false;

  const rnd = Math.random;

  const bauen = (m: NameMasse, neueLage: LichtLage, gleichDa: boolean) => {
    breite = m.breite;
    hoehe = m.hoehe;
    dichte = Math.min(window.devicePixelRatio || 1, 2);
    if (breite * hoehe * dichte * dichte > 7e6) dichte = 1;
    leinwand.width = Math.round(breite * dichte);
    leinwand.height = Math.round(hoehe * dichte);
    zb = m.zelle;
    zh = m.zelle * 1.3;
    Object.assign(lage, neueLage, { winkel: [...neueLage.winkel] });

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
      const lang = m.name.h * (0.2 + Math.pow(saat(), 1.6) * 0.72);
      const ex = px + Math.cos(winkel) * lang;
      const ey = py + Math.sin(winkel) * lang;
      const verlauf = bc.createLinearGradient(px, py, ex, ey);
      verlauf.addColorStop(0, "rgba(255,255,255,1)");
      verlauf.addColorStop(0.55, "rgba(255,255,255,0.55)");
      verlauf.addColorStop(1, "rgba(255,255,255,0)");
      bc.strokeStyle = verlauf;
      bc.lineWidth = m.zelle * (0.9 + saat() * 0.9);
      bc.beginPath();
      bc.moveTo(px, py);
      bc.lineTo(ex, ey);
      bc.stroke();
    }

    // Weicher Rand: leicht weichzeichnen.
    const mitStrahlen = bc.getImageData(0, 0, rb, rh).data;
    const grau = new Float32Array(rb * rh);
    for (let i = 0; i < grau.length; i++) grau[i] = mitStrahlen[i * 4 + 3] / 255;
    weichzeichnen(grau, rb, rh, m.zelle * 0.42);

    // 2) Raster: mittlere Abdeckung je Zelle → Dichte 1 bis 9.
    const spalten = Math.floor(rb / zb);
    const zeilen = Math.floor(rh / zh);
    const x0 = m.name.x - randX + (rb - spalten * zb) / 2;
    const y0 = m.name.y - randY + (rh - zeilen * zh) / 2;
    const teile: number[] = [];
    for (let j = 0; j < zeilen; j++) {
      for (let i = 0; i < spalten; i++) {
        let summe = 0;
        for (let sy = 0; sy < 3; sy++) {
          for (let sx = 0; sx < 3; sx++) {
            const px = Math.min(rb - 1, Math.floor((rb - spalten * zb) / 2 + (i + (sx + 0.5) / 3) * zb));
            const py = Math.min(rh - 1, Math.floor((rh - zeilen * zh) / 2 + (j + (sy + 0.5) / 3) * zh));
            summe += grau[py * rb + px];
          }
        }
        const deckung = summe / 9;
        if (deckung < 0.08) continue;
        const d = Math.max(1, Math.min(9, Math.round(deckung * 9)));
        const wahl = NACH_DICHTE[d];
        teile.push(x0 + (i + 0.5) * zb, y0 + (j + 0.5) * zh, d, wahl[Math.floor(saat() * wahl.length)]);
      }
    }

    // 3) Zellen anlegen, mit den festen Anteilen des Lichts (Lage zur Logo-Mitte).
    n = teile.length / 4;
    hx = new Float32Array(n);
    hy = new Float32Array(n);
    staerke = new Uint8Array(n);
    glyphe = new Uint8Array(n);
    cosW = new Float32Array(n);
    sinW = new Float32Array(n);
    fern = new Float32Array(n);
    innen = new Float32Array(n);
    kern = new Float32Array(n);
    abstand = new Float32Array(n);
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    hell = new Float32Array(n);
    ersatz = new Int8Array(n).fill(-1);
    ersatzBis = new Float32Array(n);
    getroffen = new Int32Array(n);
    flimmert = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      // Auf ganze Bildpunkte legen, damit die Zeichen scharf stehen.
      const px = Math.round(teile[k * 4] * dichte) / dichte;
      const py = Math.round(teile[k * 4 + 1] * dichte) / dichte;
      hx[k] = px;
      hy[k] = py;
      staerke[k] = teile[k * 4 + 2];
      glyphe[k] = teile[k * 4 + 3];
      const dx = px - lage.mitteX;
      const dy = py - lage.mitteY;
      const r = Math.hypot(dx, dy) || 0.001;
      const rr = r / lage.radius;
      abstand[k] = r;
      cosW[k] = dx / r;
      sinW[k] = dy / r;
      fern[k] = Math.exp(-rr * 1.05);
      innen[k] = 0.42 * Math.exp(-(rr / 0.75) * (rr / 0.75));
      kern[k] = Math.exp(-(rr / 0.3) * (rr / 0.3));
    }

    // 4) Vorrat: jedes Zeichen in jeder Dichte und Färbung einmal fertig gezeichnet.
    kb = Math.ceil(zb + 2);
    kh = Math.ceil(zh + 2);
    atlas.width = ZEICHEN.length * 9 * kb * dichte;
    atlas.height = GOLD_STUFEN * CREME_STUFEN * kh * dichte;
    const ac = atlas.getContext("2d");
    if (!ac) return 0;
    ac.setTransform(dichte, 0, 0, dichte, 0, 0);
    ac.clearRect(0, 0, atlas.width, atlas.height);
    ac.font = `500 ${(zh * 1.04).toFixed(2)}px ${m.mono}, ui-monospace, Menlo, monospace`;
    ac.textAlign = "center";
    ac.textBaseline = "middle";
    ac.lineJoin = "round";
    const kontur = Math.max(0.35, zb * 0.06);
    for (let g = 0; g < GOLD_STUFEN; g++) {
      for (let c = 0; c < CREME_STUFEN; c++) {
        const go = Math.pow(g / (GOLD_STUFEN - 1), 0.85);
        const cr = c / (CREME_STUFEN - 1);
        const kanal = (i: number) => Math.round((GRAU[i] + (GOLD[i] - GRAU[i]) * go) * (1 - cr) + CREME[i] * cr);
        const zeile = (g * CREME_STUFEN + c) * kh;
        for (let d = 1; d <= 9; d++) {
          // Deckkraft folgt der Dichte; angestrahlte Zeichen dürfen etwas kräftiger sein.
          const deck = Math.min(1, (d / 9) * (1 + 0.5 * Math.max(go, cr)));
          const farbe = `rgba(${kanal(0)}, ${kanal(1)}, ${kanal(2)}, ${deck.toFixed(3)})`;
          // Angestrahlte Zeichen bekommen einen dunklen Saum: So bleiben sie auch
          // direkt vor dem Licht lesbar. Vor dem dunklen Grund sieht man ihn nicht.
          const saum = Math.min(0.9, Math.max(go, cr) * (0.35 + (d / 9) * 0.65) * 1.1);
          ac.fillStyle = farbe;
          for (let z = 0; z < ZEICHEN.length; z++) {
            const mx = ((d - 1) * ZEICHEN.length + z) * kb + kb / 2;
            const my = zeile + kh / 2;
            if (saum > 0.05) {
              ac.strokeStyle = `rgba(5, 7, 16, ${saum.toFixed(3)})`;
              ac.lineWidth = zb * 0.5;
              ac.strokeText(ZEICHEN[z], mx, my + 0.5);
            }
            ac.fillText(ZEICHEN[z], mx, my + 0.5);
            // Dichte Zeichen etwas kräftiger: Der Name soll innen gefüllt wirken.
            if (d >= 6) {
              ac.strokeStyle = farbe;
              ac.lineWidth = kontur;
              ac.strokeText(ZEICHEN[z], mx, my + 0.5);
            }
          }
        }
      }
    }

    wellen = [];
    flimmernde = [];
    verschoben = false;
    // Aufbau und Auftritt sind getrennt: Ein laufendes Einblenden (samt dem, was
    // danach kommen soll) übersteht einen Neuaufbau, etwa nach einer Größenänderung
    // oder wenn die Schrift erst spät geladen ist.
    if (still) zustand = "da";
    else if (zustand === "verborgen" && gleichDa) zustand = "da";
    allesNeu = true;
    licht(lage);
    wecken();
    return n;
  };

  // Richtungen der vier Strahlen merken.
  const licht = (neu: LichtLage) => {
    lage.hell = neu.hell;
    for (let i = 0; i < 4; i++) {
      lage.winkel[i] = neu.winkel[i];
      strahlCos[i] = Math.cos(neu.winkel[i]);
      strahlSin[i] = Math.sin(neu.winkel[i]);
    }
    allesNeu = true;
    wecken();
  };

  /** Zeichnet eine Zelle an ihrer aktuellen Stelle. */
  const zeichne = (k: number, deckkraft: number) => {
    // Wie stark trifft einer der vier Strahlen diese Zelle?
    let strahl = 0;
    for (let i = 0; i < 4; i++) {
      const c = cosW[k] * strahlCos[i] + sinW[k] * strahlSin[i];
      if (c > 0) {
        const c2 = c * c;
        const c8 = c2 * c2 * c2 * c2;
        const s = c8 * c8 * c2 * c2; // hoch 20: ein schmaler Strahl
        if (s > strahl) strahl = s;
      }
    }
    const blitz = hell[k];
    const gold = Math.min(1, lage.hell * (fern[k] * (0.16 + 1.55 * strahl) + innen[k]) + blitz * 0.55);
    const creme = Math.min(1, lage.hell * kern[k] + blitz * 0.5);
    const stufe = Math.round(gold * (GOLD_STUFEN - 1)) * CREME_STUFEN + Math.round(creme * (CREME_STUFEN - 1));
    const d = blitz > 0.3 ? Math.min(9, staerke[k] + 3) : staerke[k];
    const z = ersatz[k] >= 0 ? ersatz[k] : glyphe[k];
    if (deckkraft !== 1) ctx.globalAlpha = deckkraft;
    ctx.drawImage(
      atlas,
      ((d - 1) * ZEICHEN.length + z) * kb * dichte,
      stufe * kh * dichte,
      kb * dichte,
      kh * dichte,
      hx[k] + ox[k] - kb / 2,
      hy[k] + oy[k] - kh / 2,
      kb,
      kh,
    );
    if (deckkraft !== 1) ctx.globalAlpha = 1;
  };

  const bildSchritt = (jetzt: number) => {
    rahmen = 0;
    if (vorbei || !n) return;
    const dt = letzte ? Math.min(0.05, (jetzt - letzte) / 1000) : 0.016;
    letzte = jetzt;
    zeit += dt;

    if (zustand === "verborgen") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, leinwand.width, leinwand.height);
      allesNeu = false;
      return;
    }

    let weiter = false;
    let voll = allesNeu;
    allesNeu = false;

    let reichweite = Infinity;
    if (zustand === "einblenden") {
      einblendZeit += dt;
      // Von der Mitte nach außen, wie Licht, das sich ausbreitet.
      const weit = Math.hypot(breite, hoehe) * 0.62;
      const f = Math.min(1, einblendZeit / EINBLEND_DAUER);
      reichweite = (1 - Math.pow(1 - f, 2.2)) * (weit + 160);
      if (f >= 1) {
        zustand = "da";
        // Erst jetzt steht der Name wirklich: Was danach kommen soll, kommt genau einmal.
        const danach = nachEinblenden;
        nachEinblenden = undefined;
        danach?.();
      }
      voll = true;
      weiter = true;
    }

    if (!still) {
      // Wellen laufen als Ring nach außen.
      for (const w of wellen) w.t += dt;
      wellen = wellen.filter((w) => w.t < WELLE_DAUER);
      // Gerechnet wird nur, wenn sich wirklich etwas ändert: eine Welle läuft, der
      // Zeiger hat sich bewegt oder Zeichen sind noch unterwegs.
      const bewegung = wellen.length > 0 || mausNeu || unruhe;
      mausNeu = false;
      if (bewegung) {
        const zug = 1 - Math.pow(0.75, dt * 60);
        let nochUnruhe = false;
        let nebenPlatz = false;
        for (let k = 0; k < n; k++) {
          let tx = 0;
          let ty = 0;
          if (maus.aktiv) {
            const dx = hx[k] - maus.x;
            const dy = hy[k] - maus.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < MAUS_UMKREIS * MAUS_UMKREIS) {
              const d = Math.sqrt(d2) || 0.001;
              const f = 1 - d / MAUS_UMKREIS;
              const schub = MAUS_SCHUB * f * f * (3 - 2 * f);
              tx += (dx / d) * schub;
              ty += (dy / d) * schub;
            }
          }
          for (const w of wellen) {
            const dx = hx[k] - w.x;
            const dy = hy[k] - w.y;
            const d = Math.hypot(dx, dy) || 0.001;
            const zurFront = (d - w.t * WELLE_TEMPO) / WELLE_BAND;
            if (zurFront > 3 || zurFront < -3) continue;
            const band = Math.exp(-zurFront * zurFront);
            const schub = WELLE_SCHUB * band * Math.pow(1 - w.t / WELLE_DAUER, 1.2);
            tx += (dx / d) * schub;
            ty += (dy / d) * schub;
            if (band > 0.5 && getroffen[k] !== w.nr) {
              // Getroffen: kurz heller, und das Zeichen wechselt.
              getroffen[k] = w.nr;
              hell[k] = 1;
              ersatz[k] = Math.floor(rnd() * ZEICHEN.length);
              ersatzBis[k] = zeit + 0.16 + rnd() * 0.22;
            }
          }
          // Noch auf dem Weg zum Ziel? (Ein ruhender Zeiger hält Zeichen verschoben, aber still.)
          if (Math.abs(tx - ox[k]) > 0.05 || Math.abs(ty - oy[k]) > 0.05) {
            ox[k] += (tx - ox[k]) * zug;
            oy[k] += (ty - oy[k]) * zug;
            nochUnruhe = true;
          } else {
            ox[k] = tx;
            oy[k] = ty;
          }
          if (ox[k] !== 0 || oy[k] !== 0) nebenPlatz = true;
          if (hell[k] > 0) {
            hell[k] = Math.max(0, hell[k] - dt / 0.5);
            nochUnruhe = true;
          }
          if (ersatz[k] >= 0 && !flimmert[k]) {
            if (zeit > ersatzBis[k]) ersatz[k] = -1;
            nochUnruhe = true;
          }
        }
        unruhe = nochUnruhe;
        verschoben = nebenPlatz;
        voll = true;
        weiter = weiter || nochUnruhe || wellen.length > 0;
      }
    }

    // Ruhe-Flimmern: Ein paar Zellen tauschen kurz ihr Zeichen. Getauscht und
    // zurückgetauscht wird nur im Takt (alle 140 ms), dazwischen bleibt das Bild stehen.
    const einzeln: number[] = [];
    if (!still && zustand === "da") {
      flimmerUhr += dt;
      if (flimmerUhr >= FLIMMER_TAKT) {
        flimmerUhr = 0;
        for (let i = flimmernde.length - 1; i >= 0; i--) {
          const k = flimmernde[i];
          if (zeit >= ersatzBis[k]) {
            ersatz[k] = -1;
            flimmert[k] = 0;
            flimmernde.splice(i, 1);
            einzeln.push(k);
          }
        }
        const viele = Math.max(1, Math.round(n * FLIMMER_ANTEIL));
        for (let i = 0; i < viele; i++) {
          const k = Math.floor(rnd() * n);
          if (ersatz[k] >= 0) continue;
          // Ein anderes Zeichen ähnlicher Dichte, damit der Name lesbar bleibt.
          const wahl = NACH_DICHTE[staerke[k]];
          let neues = wahl[Math.floor(rnd() * wahl.length)];
          if (neues === glyphe[k]) neues = glyphe[k] > 0 ? glyphe[k] - 1 : 1;
          ersatz[k] = neues;
          // Bleibt einen oder zwei Takte stehen.
          ersatzBis[k] = zeit + FLIMMER_TAKT * (rnd() < 0.5 ? 0.9 : 1.9);
          flimmert[k] = 1;
          flimmernde.push(k);
          einzeln.push(k);
        }
      }
      weiter = true; // Die Uhr fürs Flimmern läuft weiter, gezeichnet wird nur das Nötige.
    }

    // Stehen Zeichen neben ihrem Platz, überlappen sie Nachbarn: Dann wird beim
    // Flimmern das ganze Bild gezeichnet statt einzelner Zellen (nur im Flimmer-Takt).
    if (!voll && einzeln.length > 0 && verschoben) voll = true;

    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
    if (voll) {
      ctx.clearRect(0, 0, breite, hoehe);
      if (reichweite === Infinity) {
        for (let k = 0; k < n; k++) zeichne(k, 1);
      } else {
        for (let k = 0; k < n; k++) {
          const a = (reichweite - abstand[k]) / 160;
          if (a > 0) zeichne(k, a > 1 ? 1 : a);
        }
      }
    } else {
      // Nur die Zellen, die ihr Zeichen getauscht haben.
      for (const k of einzeln) {
        ctx.clearRect(hx[k] - zb / 2, hy[k] - zh / 2, zb, zh);
        zeichne(k, 1);
      }
    }

    if (weiter) wecken();
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
      if (still || zustand !== "da") return;
      wellenNr += 1;
      wellen.push({ nr: wellenNr, x, y, t: 0 });
      // Höchstens vier Wellen gleichzeitig.
      if (wellen.length > 4) wellen.shift();
      unruhe = true;
      wecken();
    },
    einblenden: (danach) => {
      if (zustand !== "verborgen") return;
      nachEinblenden = danach;
      zustand = "einblenden";
      einblendZeit = 0;
      allesNeu = true;
      wecken();
    },
    sichtbar: (ja) => {
      imBild = ja;
      letzte = 0;
      if (ja) allesNeu = true;
      wecken();
    },
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      document.removeEventListener("visibilitychange", wiederDa);
    },
  };
}
