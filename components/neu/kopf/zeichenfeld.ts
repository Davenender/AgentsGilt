// Der Name aus Zeichen-Teilchen (vordere Ebene des Kopfbereichs).
//
// „AGENTS GILT“ besteht aus tausenden winzigen Schriftzeichen, dicht wie ein
// Druckraster. An den Rändern lockern sich die Buchstaben zu feinen
// Zeichen-Strahlen auf. Das Licht dahinter strahlt die Zeichen an: nahe an den
// Balken golden, nahe am Stern hell-cremig, sonst grau. Die Zeichen weichen
// dem Zeiger aus und fließen zurück; ein Klick schickt eine Welle hindurch.
//
// Gebaut als 2D-Zeichenfläche: Jedes Zeichen liegt einmal fertig gefärbt in
// einem kleinen Vorrat (Atlas) und wird von dort aufs Bild kopiert. Gezeichnet
// wird nur, solange sich etwas bewegt oder das Licht wandert.
import { abstandZumBalken } from "./licht";

export type FeldMasse = {
  /** Größe der Zeichenfläche in CSS-Pixeln. */
  breite: number;
  hoehe: number;
  /** Kasten, in dem der Name steht. */
  name: { x: number; y: number; b: number; h: number };
  /** Mitte und halbe Breite des Licht-Logos. */
  logo: { x: number; y: number; r: number };
  /** Schrift des Namens und der kleinen Zeichen (font-family). */
  schrift: string;
  mono: string;
  text: string;
};

export type FeldLicht = {
  /** Lage des Sterns in CSS-Pixeln der Zeichenfläche. */
  sternX: number;
  sternY: number;
  sternHell: number;
  /** Helligkeit der vier Balken: oben links, oben rechts, unten links, unten rechts. */
  balken: readonly number[];
};

export type Zeiger = { x: number; y: number; aktiv: boolean };

export type Zeichenfeld = {
  bauen: (m: FeldMasse, sichtbar: boolean) => void;
  /** Ein Schritt: bewegen und zeichnen. Meldet, ob sich noch etwas bewegt. */
  schritt: (dt: number, licht: FeldLicht, zeiger: Zeiger, lichtWandert: boolean) => boolean;
  /** Startanimation: Die Zeichen sammeln sich zum Namen. */
  sammeln: () => void;
  welle: (x: number, y: number) => void;
};

// # = + - : · und zwei kleine Blöcke (die Blöcke werden gezeichnet, nicht gesetzt).
const ZEICHEN = ["#", "=", "+", "-", ":", "·", "", ""];
const BLOCK_HOCH = 6;
const BLOCK_KLEIN = 7;
const GOLD_STUFEN = 6;
const CREME_STUFEN = 6;

const GRAU = [118, 130, 176];
const GOLD = [255, 222, 138];
const CREME = [255, 250, 236];

const FEDER = 26;
const DAEMPFUNG = 6.2;
const WELLEN_TEMPO = 1500;
const SAMMEL_DAUER = 0.95;

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

export function erzeugeZeichenfeld(leinwand: HTMLCanvasElement): Zeichenfeld | null {
  const ctx = leinwand.getContext("2d");
  if (!ctx) return null;
  const atlas = document.createElement("canvas");

  let breite = 0;
  let hoehe = 0;
  let dichte = 1;
  let n = 0;
  // Heimat, Lage, Tempo je Zeichen
  let hx = new Float32Array(0);
  let hy = new Float32Array(0);
  let x = new Float32Array(0);
  let y = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);
  // Start der Sammel-Bewegung und Verzug
  let sx = new Float32Array(0);
  let sy = new Float32Array(0);
  let verzug = new Float32Array(0);
  let deckung = new Float32Array(0);
  let goldNah = new Float32Array(0);
  let glyphe = new Uint8Array(0);
  let viertel = new Uint8Array(0);
  let getroffen = new Int32Array(0);

  let kastenB = 0;
  let kastenH = 0;
  let sternWeite = 100;
  let zeigerWeite = 110;
  let zustand: "verborgen" | "sammeln" | "frei" = "verborgen";
  let sammelZeit = 0;
  let wellen: { nr: number; x: number; y: number; t: number }[] = [];
  let wellenNr = 0;
  let schonGezeichnet = false;

  const bauen = (m: FeldMasse, sichtbar: boolean) => {
    breite = m.breite;
    hoehe = m.hoehe;
    dichte = Math.min(window.devicePixelRatio || 1, 2);
    if (breite * hoehe * dichte * dichte > 6.5e6) dichte = 1;
    leinwand.width = Math.round(breite * dichte);
    leinwand.height = Math.round(hoehe * dichte);

    // Größe eines Rasterfelds: am Computer gut 8 px breit, am Handy kleiner.
    const zb = Math.max(4.4, Math.min(8.4, m.name.b / 132));
    const zh = zb * 1.22;
    sternWeite = m.logo.r * 0.52;
    zeigerWeite = Math.max(70, Math.min(120, m.name.h * 0.5));

    // 1) Den Namen unsichtbar aufzeichnen und abtasten: Wo ist Schrift?
    const rb = Math.max(1, Math.ceil(m.name.b));
    const rh = Math.max(1, Math.ceil(m.name.h));
    const raster = document.createElement("canvas");
    raster.width = rb;
    raster.height = rh;
    const rc = raster.getContext("2d", { willReadFrequently: true });
    if (!rc) return;
    // Gleiche Maße wie der Schriftzug im SVG: Schriftgröße 285 auf 212 Höhe, auf volle Breite gezogen.
    rc.font = `800 ${(rh * 285) / 212}px ${m.schrift}`;
    rc.textBaseline = "alphabetic";
    const natur = rc.measureText(m.text).width || 1;
    rc.setTransform(rb / natur, 0, 0, 1, 0, 0);
    rc.fillStyle = "#fff";
    rc.fillText(m.text, 0, (rh * 205) / 212);
    const daten = rc.getImageData(0, 0, rb, rh).data;
    const schrift = (px: number, py: number) =>
      px < 0 || py < 0 || px >= rb || py >= rh ? 0 : daten[((py | 0) * rb + (px | 0)) * 4 + 3] / 255;
    // Mittlere Deckung im Umkreis: 1 tief im Buchstaben, um 0,5 am Rand.
    const umkreis = (px: number, py: number) => {
      let s = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += schrift(px + i * zb * 0.95, py + j * zh * 0.95);
      return s / 9;
    };

    const rnd = zufall(20261111);
    const wahl = (liste: number[]) => liste[Math.floor(rnd() * liste.length)];
    const teile: number[] = []; // x, y, Zeichen, Deckung je Teilchen
    const dazu = (px: number, py: number, g: number, d: number) => teile.push(px, py, g, d);

    const spalten = Math.floor(m.name.b / zb);
    const zeilen = Math.floor(m.name.h / zh);
    const randX = (m.name.b - spalten * zb) / 2;
    const randY = (m.name.h - zeilen * zh) / 2;
    const oben = new Int16Array(spalten).fill(-1);
    const unten = new Int16Array(spalten).fill(-1);

    for (let j = 0; j < zeilen; j++) {
      for (let i = 0; i < spalten; i++) {
        const lx = randX + (i + 0.5) * zb;
        const ly = randY + (j + 0.5) * zh;
        const a = schrift(lx, ly);
        const c = umkreis(lx, ly);
        if (a > 0.5) {
          if (oben[i] < 0) oben[i] = j;
          unten[i] = j;
          // Innen dicht (# = + und Blöcke), zum Rand hin lockerer.
          if (c > 0.9) dazu(lx, ly, wahl([0, 0, 0, 0, BLOCK_HOCH, BLOCK_HOCH, 1, 1, 2]), 1);
          else if (c > 0.62) dazu(lx, ly, wahl([0, 0, 1, 1, 2, 2, BLOCK_KLEIN]), 1);
          else if (rnd() < 0.84) dazu(lx, ly, wahl([2, 3, 3, 4, BLOCK_KLEIN]), 0.92);
        } else if (c > 0.1 && rnd() < c * 1.05) {
          // Knapp außerhalb: vereinzelte leichte Zeichen.
          dazu(lx, ly, wahl([4, 5, 5, 3]), 0.5 + c * 0.5);
        }
      }
    }

    // 2) Zeichen-Strahlen, wie spritzende Tinte: von den Ober- und Unterkanten
    //    der Buchstaben nach außen, zur Seite hin stärker geneigt.
    const strahl = (px: number, py: number, winkel: number, laenge: number) => {
      const dx = Math.cos(winkel);
      const dy = Math.sin(winkel);
      for (let k = 1; k <= laenge; k++) {
        if (rnd() < 0.14) continue;
        const f = 1 - k / (laenge + 1);
        dazu(
          px + dx * k * zh * 0.94 + (rnd() - 0.5) * 1.2,
          py + dy * k * zh * 0.94 + (rnd() - 0.5) * 1.2,
          k <= 2 ? wahl([2, 4, 3]) : wahl([4, 5, 5, 3]),
          0.14 + 0.8 * Math.pow(f, 0.8),
        );
      }
    };
    for (let i = 0; i < spalten; i++) {
      if (oben[i] < 0) continue;
      const lx = randX + (i + 0.5) * zb;
      const seite = (lx / m.name.b) * 2 - 1;
      const neigung = seite * 0.6;
      if (rnd() < 0.4) strahl(lx, randY + (oben[i] + 0.5) * zh, -Math.PI / 2 + neigung + (rnd() - 0.5) * 0.4, 2 + Math.pow(rnd(), 1.7) * 11);
      if (rnd() < 0.4) strahl(lx, randY + (unten[i] + 0.5) * zh, Math.PI / 2 - neigung + (rnd() - 0.5) * 0.4, 2 + Math.pow(rnd(), 1.7) * 11);
    }
    // Auch an den beiden Enden des Namens zur Seite hinaus.
    for (let j = 0; j < zeilen; j++) {
      const ly = randY + (j + 0.5) * zh;
      const hoch = (ly / m.name.h) * 2 - 1;
      for (const links of [true, false]) {
        if (rnd() > 0.34) continue;
        let i = links ? 0 : spalten - 1;
        while (i >= 0 && i < spalten && schrift(randX + (i + 0.5) * zb, ly) <= 0.5) i += links ? 1 : -1;
        if (i < 0 || i >= spalten || (links ? i > spalten * 0.12 : i < spalten * 0.88)) continue;
        strahl(randX + (i + 0.5) * zb, ly, (links ? Math.PI : 0) + hoch * 0.5 * (links ? -1 : 1) + (rnd() - 0.5) * 0.3, 2 + Math.pow(rnd(), 1.7) * 9);
      }
    }

    // 3) Teilchen anlegen.
    n = teile.length / 4;
    hx = new Float32Array(n);
    hy = new Float32Array(n);
    x = new Float32Array(n);
    y = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    sx = new Float32Array(n);
    sy = new Float32Array(n);
    verzug = new Float32Array(n);
    deckung = new Float32Array(n);
    goldNah = new Float32Array(n);
    glyphe = new Uint8Array(n);
    viertel = new Uint8Array(n);
    getroffen = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      // Auf ganze Bildpunkte legen, damit die Zeichen in Ruhe scharf sind.
      const px = Math.round((m.name.x + teile[k * 4]) * dichte) / dichte;
      const py = Math.round((m.name.y + teile[k * 4 + 1]) * dichte) / dichte;
      hx[k] = x[k] = px;
      hy[k] = y[k] = py;
      glyphe[k] = teile[k * 4 + 2];
      deckung[k] = teile[k * 4 + 3];
      // Wie stark strahlt der nächste Balken dieses Zeichen an?
      const ux = (px - m.logo.x) / m.logo.r;
      const uy = -(py - m.logo.y) / m.logo.r;
      goldNah[k] = Math.exp(-abstandZumBalken(ux, uy) * 6.5);
      viertel[k] = ux < 0 ? (uy > 0 ? 0 : 2) : uy > 0 ? 1 : 3;
      // Sammeln: Start weit verstreut, Ankunft von links nach rechts leicht versetzt.
      const w = rnd() * Math.PI * 2;
      const weit = (0.5 + rnd()) * Math.max(180, m.name.h * 1.5);
      sx[k] = px + Math.cos(w) * weit * 1.6;
      sy[k] = py + Math.sin(w) * weit;
      verzug[k] = rnd() * 0.4 + (teile[k * 4] / m.name.b) * 0.25;
    }
    kastenB = Math.ceil(zb + 5);
    kastenH = Math.ceil(zh + 5);

    // 4) Vorrat: jedes Zeichen in jeder Färbung einmal fertig gezeichnet.
    atlas.width = ZEICHEN.length * kastenB * dichte;
    atlas.height = GOLD_STUFEN * CREME_STUFEN * kastenH * dichte;
    const ac = atlas.getContext("2d");
    if (!ac) return;
    ac.setTransform(dichte, 0, 0, dichte, 0, 0);
    ac.clearRect(0, 0, atlas.width, atlas.height);
    ac.font = `${(zh * 1.28).toFixed(2)}px ${m.mono}, ui-monospace, Menlo, monospace`;
    ac.textAlign = "center";
    ac.textBaseline = "middle";
    ac.lineJoin = "round";
    // Die Schreibmaschinen-Schrift ist fein: eine dünne Kontur macht die Zeichen
    // kräftiger. Darunter liegt ein dunkler Saum, damit die Zeichen auch vor
    // dem hellen Licht lesbar bleiben (vor dem dunklen Grund sieht man ihn nicht).
    const kontur = Math.max(0.5, zb * 0.085);
    const saum = zb * 0.5;
    const dunkel = "rgba(7, 9, 20, 0.55)";
    for (let g = 0; g < GOLD_STUFEN; g++) {
      for (let c = 0; c < CREME_STUFEN; c++) {
        const go = Math.pow(g / (GOLD_STUFEN - 1), 0.85);
        const cr = c / (CREME_STUFEN - 1);
        const kanal = (i: number) => Math.round((GRAU[i] + (GOLD[i] - GRAU[i]) * go) * (1 - cr) + CREME[i] * cr);
        const farbe = `rgb(${kanal(0)}, ${kanal(1)}, ${kanal(2)})`;
        const zeile = (g * CREME_STUFEN + c) * kastenH;
        for (let z = 0; z < ZEICHEN.length; z++) {
          const mx = z * kastenB + kastenB / 2;
          const my = zeile + kastenH / 2;
          ac.fillStyle = farbe;
          if (z === BLOCK_HOCH || z === BLOCK_KLEIN) {
            const bb = z === BLOCK_HOCH ? zb * 0.54 : zb * 0.46;
            const bh = z === BLOCK_HOCH ? zh * 0.72 : zb * 0.46;
            ac.fillStyle = dunkel;
            ac.fillRect(mx - bb / 2 - saum / 2, my - bh / 2 - saum / 2, bb + saum, bh + saum);
            ac.fillStyle = farbe;
            ac.fillRect(mx - bb / 2, my - bh / 2, bb, bh);
          } else {
            ac.strokeStyle = dunkel;
            ac.lineWidth = saum;
            ac.strokeText(ZEICHEN[z], mx, my + 0.5);
            ac.strokeStyle = farbe;
            ac.lineWidth = kontur;
            ac.fillText(ZEICHEN[z], mx, my + 0.5);
            ac.strokeText(ZEICHEN[z], mx, my + 0.5);
          }
        }
      }
    }

    zustand = sichtbar ? "frei" : "verborgen";
    wellen = [];
    schonGezeichnet = false;
  };

  const schritt = (dt: number, licht: FeldLicht, zeiger: Zeiger, lichtWandert: boolean) => {
    if (!n) return false;
    if (zustand === "verborgen") {
      if (!schonGezeichnet) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, leinwand.width, leinwand.height);
        schonGezeichnet = true;
      }
      return false;
    }

    let bewegt = false;
    const sammelt = zustand === "sammeln";
    if (sammelt) sammelZeit += dt;

    // Wellen laufen als Ring nach außen.
    for (const w of wellen) w.t += dt;
    const weit = Math.hypot(breite, hoehe);
    wellen = wellen.filter((w) => w.t * WELLEN_TEMPO < weit + 200);
    if (wellen.length) bewegt = true;

    const zr = zeigerWeite;
    const zr2 = zr * zr;
    const sw2 = sternWeite * sternWeite;
    const zeichnen = bewegt || sammelt || lichtWandert || zeiger.aktiv || !schonGezeichnet;

    // Erst rechnen …
    let nochUnterwegs = false;
    if (sammelt) {
      let alleDa = true;
      for (let k = 0; k < n; k++) {
        const u = (sammelZeit - verzug[k]) / SAMMEL_DAUER;
        if (u >= 1) {
          x[k] = hx[k];
          y[k] = hy[k];
        } else {
          alleDa = false;
          const e = u <= 0 ? 0 : 1 - Math.pow(1 - u, 4);
          x[k] = sx[k] + (hx[k] - sx[k]) * e;
          y[k] = sy[k] + (hy[k] - sy[k]) * e;
        }
      }
      if (alleDa) zustand = "frei";
      nochUnterwegs = true;
    } else {
      for (let k = 0; k < n; k++) {
        let ax = (hx[k] - x[k]) * FEDER - vx[k] * DAEMPFUNG;
        let ay = (hy[k] - y[k]) * FEDER - vy[k] * DAEMPFUNG;
        // Dem Zeiger ausweichen.
        if (zeiger.aktiv) {
          const dx = x[k] - zeiger.x;
          const dy = y[k] - zeiger.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < zr2) {
            const d = Math.sqrt(d2) || 0.001;
            const f = 1 - d / zr;
            ax += (dx / d) * f * f * 5200;
            ay += (dy / d) * f * f * 5200;
          }
        }
        // Trifft die Wellenfront, stiebt das Zeichen davon.
        for (const w of wellen) {
          if (getroffen[k] >= w.nr) continue;
          const dx = hx[k] - w.x;
          const dy = hy[k] - w.y;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d > w.t * WELLEN_TEMPO) continue;
          getroffen[k] = w.nr;
          const kraft = 980 / (1 + d / 360);
          const wirr = Math.random() * Math.PI * 2;
          vx[k] += (dx / d) * kraft * (0.5 + Math.random() * 0.9) + Math.cos(wirr) * kraft * 0.55;
          vy[k] += (dy / d) * kraft * (0.5 + Math.random() * 0.9) + Math.sin(wirr) * kraft * 0.55;
        }
        vx[k] += ax * dt;
        vy[k] += ay * dt;
        x[k] += vx[k] * dt;
        y[k] += vy[k] * dt;
        const ex = hx[k] - x[k];
        const ey = hy[k] - y[k];
        if (ex * ex + ey * ey < 0.01 && vx[k] * vx[k] + vy[k] * vy[k] < 1) {
          // Angekommen: genau auf den Platz setzen, damit das Zeichen scharf steht.
          x[k] = hx[k];
          y[k] = hy[k];
          vx[k] = 0;
          vy[k] = 0;
        } else {
          nochUnterwegs = true;
        }
      }
    }

    if (!(zeichnen || nochUnterwegs)) return false;

    // … dann zeichnen.
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
    ctx.clearRect(0, 0, breite, hoehe);
    const ab = kastenB * dichte;
    const ah = kastenH * dichte;
    let alpha = 1;
    ctx.globalAlpha = 1;
    for (let k = 0; k < n; k++) {
      let d = deckung[k];
      if (sammelt) {
        const u = (sammelZeit - verzug[k]) / SAMMEL_DAUER;
        if (u <= 0) continue;
        if (u < 0.4) d *= u / 0.4;
      }
      const gold = Math.min(1, goldNah[k] * licht.balken[viertel[k]]);
      const dx = x[k] - licht.sternX;
      const dy = y[k] - licht.sternY;
      const creme = Math.min(1, licht.sternHell * Math.exp(-(dx * dx + dy * dy) / sw2) * 1.15);
      const stufe = Math.round(gold * (GOLD_STUFEN - 1)) * CREME_STUFEN + Math.round(creme * (CREME_STUFEN - 1));
      if (d !== alpha) {
        alpha = d;
        ctx.globalAlpha = d;
      }
      ctx.drawImage(atlas, glyphe[k] * ab, stufe * ah, ab, ah, x[k] - kastenB / 2, y[k] - kastenH / 2, kastenB, kastenH);
    }
    ctx.globalAlpha = 1;
    schonGezeichnet = true;
    return nochUnterwegs || bewegt;
  };

  return {
    bauen,
    schritt,
    sammeln: () => {
      if (zustand !== "verborgen") return;
      zustand = "sammeln";
      sammelZeit = 0;
    },
    welle: (wx, wy) => {
      if (zustand !== "frei") return;
      wellenNr += 1;
      wellen.push({ nr: wellenNr, x: wx, y: wy, t: 0 });
      if (wellen.length > 3) wellen.shift();
    },
  };
}
