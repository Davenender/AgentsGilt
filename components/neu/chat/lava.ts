// Die Lavalampe hinter der Sperr-Karte (Prompt 18b, 23.11.2026). Bewegung und Abläufe wie im Probelauf aus der
// Zentrale-Sitzung (~/Desktop/Status/probe-sperrkarte.html): zwei rote Kugeln schweben, prallen von den Wänden
// und voneinander ab, verschmelzen; beim Darüberfahren wachsen sie in ~0,33 s mit Ranken über die ganze Karte
// („Venom“) und ziehen sich danach in ~0,7 s zurück. Gleiche Werte: Geschwindigkeiten, Abprallen, Stoß, Atmen,
// Ranken, Anstieg dt·9, Abfall dt·3,2.
//
// Anders als im Probelauf (Licht, Glas, Leistung): Statt eines SVG-Filters (Weichzeichnen und Schwelle, bei jedem
// Bild neu) rechnet eine kleine Leinwand ein Metaball-Feld (ein Bildpunkt je 2 × 2 CSS-Pixel, also ~180 × 29 bei
// der Karte); der Browser zieht es weich auf die Kartengröße, das wirkt wie hinter Milchglas. Farben wie im
// Probelauf (Kern hell, Rand tief), beim Venom helle und dunkle Flecken. Kurzes Zusammendrücken beim Aufprall.
//
// Ohne DOM, damit tests/lava.test.ts die Bewegung direkt prüfen kann.

export interface Kugel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ph: number;
  /** Zusammendrücken nach einem Aufprall (1 = gerade aufgeprallt, klingt ab) und seine Richtung. */
  druck: number;
  nx: number;
  ny: number;
}
interface Ranke {
  a: number;
  d: number;
  r: number;
  j: number;
  von: number;
}
export interface Lava {
  w: number;
  h: number;
  kugeln: Kugel[];
  ranken: Ranke[];
  /** 0 = ruhig, 1 = Venom (die Karte voll). */
  f: number;
  ziel: number;
}

/** Immer dieselben „Zufallszahlen“ (die Ranken sehen bei jedem Laden gleich aus, Tests sind stabil). */
function zufall(saat: number) {
  let s = saat >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const PROBE_BREITE = 360;
export const ANSTIEG = 9;
export const ABFALL = 3.2;
/** So lange bleibt das Venom nach einem Tippen am Handy. */
export const TIPP_MS = 1600;

export function neueLava(w: number, h: number): Lava {
  const z = zufall(18_2);
  // Startpunkte wie im Probelauf (bei 360 px Breite x = 70 und 250), auf die echte Breite umgerechnet.
  const k = w / PROBE_BREITE;
  const kugeln: Kugel[] = [
    { x: 70 * k, y: h * (28 / 58), vx: 22, vy: 9, r: 19, ph: 0, druck: 0, nx: 1, ny: 0 },
    { x: 250 * k, y: h * (30 / 58), vx: -18, vy: -8, r: 22, ph: 2, druck: 0, nx: 1, ny: 0 },
  ];
  const ranken: Ranke[] = Array.from({ length: 12 }, (_, i) => ({ a: z() * Math.PI * 2, d: 50 + z() * 130, r: 10 + z() * 16, j: z() * 6, von: i % 2 }));
  return { w, h, kugeln, ranken, f: 0, ziel: 0 };
}

const stoss = (k: Kugel, nx: number, ny: number) => {
  k.druck = 1;
  k.nx = nx;
  k.ny = ny;
};

/** Ein Schritt der Bewegung (dt in Sekunden, höchstens 0,05 wie im Probelauf). */
export function schritt(l: Lava, dtRoh: number, ruhig = false): void {
  const dt = Math.min(0.05, Math.max(0, dtRoh));
  l.f += (l.ziel - l.f) * (l.ziel > l.f ? Math.min(1, dt * ANSTIEG) : Math.min(1, dt * ABFALL));
  if (ruhig) return;
  const { w, h } = l;
  for (const b of l.kugeln) {
    b.x += b.vx * dt * (1 - l.f * 0.7);
    b.y += b.vy * dt * (1 - l.f * 0.7);
    if (b.x < b.r * 0.6) {
      b.x = b.r * 0.6;
      b.vx = Math.abs(b.vx);
      stoss(b, 1, 0);
    }
    if (b.x > w - b.r * 0.6) {
      b.x = w - b.r * 0.6;
      b.vx = -Math.abs(b.vx);
      stoss(b, 1, 0);
    }
    if (b.y < b.r * 0.35) {
      b.y = b.r * 0.35;
      b.vy = Math.abs(b.vy);
      stoss(b, 0, 1);
    }
    if (b.y > h - b.r * 0.35) {
      b.y = h - b.r * 0.35;
      b.vy = -Math.abs(b.vy);
      stoss(b, 0, 1);
    }
    b.druck *= Math.exp(-dt * 6);
  }
  const [a, b] = l.kugeln;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const min = (a.r + b.r) * 0.78;
  if (d < min) {
    const nx = dx / d;
    const ny = dy / d;
    const va = a.vx * nx + a.vy * ny;
    const vb = b.vx * nx + b.vy * ny;
    if (va - vb > 0) {
      a.vx += (vb - va) * nx;
      a.vy += (vb - va) * ny;
      b.vx += (va - vb) * nx;
      b.vy += (va - vb) * ny;
      stoss(a, nx, ny);
      stoss(b, nx, ny);
    }
    const ue = (min - d) / 2;
    a.x -= nx * ue;
    a.y -= ny * ue;
    b.x += nx * ue;
    b.y += ny * ue;
  }
}

/** Alles, was ein Bild braucht, für den Zeitpunkt s (Sekunden): Kreise mit Größe, Zusammendrücken und Atmen. */
export interface Kreis {
  x: number;
  y: number;
  r: number;
  /** Stauchung entlang (nx, ny): < 1 flacher, quer dazu > 1. */
  sn: number;
  st: number;
  nx: number;
  ny: number;
}
export function kreise(l: Lava, s: number): { kreise: Kreis[]; atem: number; deckung: number; schein: number } {
  const out: Kreis[] = [];
  let atem = 0;
  for (const b of l.kugeln) {
    const r = b.r * (1 - l.f) + l.w * 0.55 * l.f;
    const sn = 1 - 0.2 * b.druck;
    out.push({ x: b.x, y: b.y, r: r * (0.96 + 0.05 * Math.sin(s * 2.1 + b.ph)), sn, st: 1 / Math.sqrt(sn), nx: b.nx, ny: b.ny });
    atem += (0.82 + 0.18 * Math.sin(s * 1.3 + b.ph)) / l.kugeln.length;
  }
  const k = Math.max(0, Math.min(1, (l.f - 0.05) * 1.4));
  if (k > 0) {
    for (const q of l.ranken) {
      const b = l.kugeln[q.von];
      const w = q.a + 0.25 * Math.sin(s * 1.7 + q.j);
      const dd = q.d * k * (0.9 + 0.1 * Math.sin(s * 3 + q.j));
      const r = q.r * k * (0.85 + 0.2 * Math.sin(s * 2.4 + q.j));
      if (r > 0.5) out.push({ x: b.x + Math.cos(w) * dd, y: b.y + Math.sin(w) * dd * 0.55, r, sn: 1, st: 1, nx: 1, ny: 0 });
    }
  }
  return {
    kreise: out,
    atem,
    // Deckkraft der Kugeln (Probelauf: .58 + .08·sin(1,1 s) + f·.22) und Stärke des Scheins drumherum.
    deckung: Math.min(1, 0.58 + 0.08 * Math.sin(s * 1.1) + l.f * 0.22),
    schein: (0.22 + 0.18 * atem) * (1 - l.f * 0.3),
  };
}

// Farben wie der Verlauf jeder Kugel im Probelauf (Mitte #ff7a62, bei 60 % #d23a32, Rand #8f1c1c), dazu der Schein.
const RAND = [143, 28, 28];
const MITTE = [210, 58, 50];
const KERN = [255, 122, 98];
const SCHEIN = [236, 70, 58];

/** Eine kleine Zahlenreihe (je Spalte oder Zeile ein Wert). */
function tabelle(n: number, f: (i: number) => number): Float64Array {
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = f(i);
  return t;
}

/**
 * Das Bild der Lavalampe in `bild` (RGBA, gw × gh Bildpunkte, je `zelle` CSS-Pixel). Die Form: Metaball-Feld (Summe
 * r²/d² je Kreis; ab 1 ist man in der Kugel, mit weichem Rand), darunter der Schein. Die Farbe: wie im Probelauf
 * hat jede Kugel ihren eigenen Verlauf (Mitte hell, Rand tief); es zählt die Kugel, in deren Mitte man am tiefsten
 * steht. Beim Venom kommen helle und dunkle Flecken dazu, die langsam wandern.
 */
export function zeichne(l: Lava, s: number, bild: Uint8ClampedArray, gw: number, gh: number, zelle: number): void {
  const { kreise: ks, atem, deckung, schein } = kreise(l, s);
  const n = ks.length;
  const flecken = 0.06 + 0.14 * l.f;
  // Beim Venom sind die Kugeln riesig (fast die ganze Karte liegt nah an einer Mitte): etwas zum satten Rot hin.
  const tiefe = 1 - 0.35 * l.f;
  // Die Flecken als Tabellen je Spalte und Zeile (kein Sinus je Bildpunkt): sin(a + b) = sin a·cos b + cos a·sin b.
  const sx = tabelle(gw, (i) => Math.sin((i + 0.5) * zelle * 0.045 + s * 0.9));
  const sxa = tabelle(gw, (i) => Math.sin((i + 0.5) * zelle * 0.028 + s * 0.5));
  const cxa = tabelle(gw, (i) => Math.cos((i + 0.5) * zelle * 0.028 + s * 0.5));
  const sy = tabelle(gh, (j) => Math.sin((j + 0.5) * zelle * 0.11 - s * 0.7));
  const syb = tabelle(gh, (j) => Math.sin((j + 0.5) * zelle * 0.028));
  const cyb = tabelle(gh, (j) => Math.cos((j + 0.5) * zelle * 0.028));
  const hellBasis = 0.9 + 0.1 * atem;
  let p = 0;
  for (let j = 0; j < gh; j++) {
    const y = (j + 0.5) * zelle;
    for (let i = 0; i < gw; i++) {
      const x = (i + 0.5) * zelle;
      let v = 0;
      let t = 0;
      for (let q = 0; q < n; q++) {
        const k = ks[q];
        const dx = x - k.x;
        const dy = y - k.y;
        let d2: number;
        if (k.sn === 1) d2 = dx * dx + dy * dy;
        else {
          const a = (dx * k.nx + dy * k.ny) / k.sn;
          const b = (-dx * k.ny + dy * k.nx) / k.st;
          d2 = a * a + b * b;
        }
        const r2 = k.r * k.r;
        v += r2 / (d2 + 1);
        // Wie tief in dieser Kugel (0 am Rand, 1 in der Mitte): nur prüfen, wenn man drin ist.
        if (d2 < r2) {
          const tief = 1 - Math.sqrt(d2 / r2);
          if (tief > t) t = tief;
        }
      }
      // Weicher Rand der Kugel (etwa eine Zelle breit). Der Schein liegt wie im Probelauf auch unter der Kugel
      // (dort eine weichgezeichnete, größere Kopie): Er macht sie satter und läuft außen sanft aus.
      const u0 = (v - 0.9) / 0.1;
      const innen = v >= 1 ? 1 : v <= 0.9 ? 0 : u0 * u0 * (3 - 2 * u0);
      const ab = innen * deckung;
      const vm = v < 1 ? v : 1;
      const g = vm * vm * schein;
      const a = ab + g * (1 - ab);
      if (a < 0.004) {
        bild[p] = bild[p + 1] = bild[p + 2] = bild[p + 3] = 0;
        p += 4;
        continue;
      }
      // Flecken: zwei langsame Wellen übereinander.
      const fl = 1 + flecken * (sx[i] * sy[j] + 0.6 * (sxa[i] * cyb[j] + cxa[i] * syb[j]));
      const hell = hellBasis * fl;
      t *= tiefe;
      let r: number, gr: number, b: number;
      if (t < 0.4) {
        const u = t / 0.4;
        r = RAND[0] + (MITTE[0] - RAND[0]) * u;
        gr = RAND[1] + (MITTE[1] - RAND[1]) * u;
        b = RAND[2] + (MITTE[2] - RAND[2]) * u;
      } else {
        const u = (t - 0.4) / 0.6;
        r = MITTE[0] + (KERN[0] - MITTE[0]) * u;
        gr = MITTE[1] + (KERN[1] - MITTE[1]) * u;
        b = MITTE[2] + (KERN[2] - MITTE[2]) * u;
      }
      const wk = ab / a;
      bild[p] = Math.min(255, r * hell * wk + SCHEIN[0] * (1 - wk)) | 0;
      bild[p + 1] = Math.min(255, gr * hell * wk + SCHEIN[1] * (1 - wk)) | 0;
      bild[p + 2] = Math.min(255, b * hell * wk + SCHEIN[2] * (1 - wk)) | 0;
      bild[p + 3] = (a * 255) | 0;
      p += 4;
    }
  }
}
