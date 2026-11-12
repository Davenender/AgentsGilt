// Zeichen-Bild: eine Form (eine Nummer, ein Strahl) aus kleinen Schriftzeichen, die sich aus
// Staub zusammensetzt, beim Wechsel umfliegt und unter der Maus kurz verwürfelt.
// Die Zahlen stammen aus dem Vorbild ksenpanchenko.com („Selected work“), die Umsetzung ist eigene.
//
// Bild bauen:
//   - Die Form wird unsichtbar gezeichnet und in Zellen von 7 × 11 px zerlegt.
//   - Je Zelle hängt das Zeichen an der Abdeckung: über 0,75 „▓ # %“, über 0,5 „# % = ▒“,
//     über 0,28 „= * + /“, sonst „+ :“; unter 0,1 bleibt die Zelle leer.
//   - Drei Tonstufen mit Deckkraft 1 / 0,9 / 0,62.
// Teilchen:
//   - 1,25-mal so viele wie Zellen der größten Form. Überzählige schweben als Staub
//     (: + . · -, Deckkraft 0,35) zufällig im Feld; jedes dritte bleibt nahe an der Form (±20 / ±18 px).
// Wechsel:
//   - Jedes Teilchen fliegt auf einer quadratischen Bézier-Kurve zu seiner neuen Zelle. Der
//     Kontrollpunkt liegt in der Mitte plus Zufall ±70 / ±55 px. Verzögerung 0–380 ms, Dauer
//     650–1100 ms, Kurve 1 − (1 − t)³. Unterwegs wechselt das Zeichen mit 35 % pro Bild, am Ziel
//     steht das richtige.
// Maus:
//   - Zeichen im Umkreis von 34 px verwürfeln sich (45 % pro Bild) und rasten nach
//     380 + (1 − Abstand/34) × 520 + 0–260 ms wieder ein.
// „Pro Bild“ gilt für 60 Bilder je Sekunde; alles läuft auf jedem Bildschirm gleich schnell.

/** Die Zeichen. Die beiden Block-Zeichen werden als Punktraster gezeichnet (wie im Namen). */
const ZEICHEN = ["▓", "#", "%", "=", "▒", "*", "+", "/", ":", ".", "·", "-"];
const Z = { dicht: 0, raute: 1, prozent: 2, gleich: 3, mittel: 4, stern: 5, plus: 6, schraeg: 7, doppel: 8, punkt: 9, mitte: 10, strich: 11 };
// Je Abdeckung die möglichen Zeichen.
const STUFEN: [ab: number, zeichen: number[], ton: number][] = [
  [0.75, [Z.dicht, Z.raute, Z.prozent], 0],
  [0.5, [Z.raute, Z.prozent, Z.gleich, Z.mittel], 1],
  [0.28, [Z.gleich, Z.stern, Z.plus, Z.schraeg], 2],
  [0.1, [Z.plus, Z.doppel], 2],
];
const STAUB = [Z.doppel, Z.plus, Z.punkt, Z.mitte, Z.strich];
// Deckkraft der drei Tonstufen und des Staubs.
const TON = [1, 0.9, 0.62, 0.35];
const STAUB_TON = 3;
const WIRR_UMKREIS = 34;

export type ZeichenbildWahl = {
  /** Zelle in CSS-Pixeln (Breite, Höhe). Vorbild: 7 × 11. */
  zelle?: [number, number];
  /** Farbe der Form und des Staubs (r, g, b). */
  farbe?: [number, number, number];
  staubFarbe?: [number, number, number];
  /** Schrift der Zeichen (JetBrains Mono). */
  mono: string;
  /** Wie viele Teilchen mehr als Zellen der größten Form (1,25). Staub nur aus dem Überschuss. */
  ueberschuss?: number;
  /** Bei „weniger Bewegung“: Die Form steht einfach da, nichts fliegt. */
  still?: boolean;
};

/** Zeichnet die Form in Weiß auf die unsichtbare Fläche (Breite und Höhe in CSS-Pixeln). */
export type FormMaler = (c: CanvasRenderingContext2D, breite: number, hoehe: number) => void;

export type Zeichenbild = {
  /** Größe der Zeichenfläche (CSS-Pixel) und die Formen, die vorkommen (die größte bestimmt die Teilchenzahl). */
  einrichten: (breite: number, hoehe: number, formen: FormMaler[]) => void;
  /** Zeigt die Form mit dieser Nummer: Die Teilchen fliegen um. `sofort`: ohne Flug. */
  zeige: (nr: number, sofort?: boolean) => void;
  /** Alles zerfällt zu Staub. */
  zerfalle: () => void;
  /** Maus über dem Bild (Koordinaten der Zeichenfläche); `aktiv = false`, wenn sie weg ist. */
  zeiger: (x: number, y: number, aktiv: boolean) => void;
  sichtbar: (ja: boolean) => void;
  ende: () => void;
};

type Zelle = { x: number; y: number; zeichen: number; ton: number };

export function erzeugeZeichenbild(leinwand: HTMLCanvasElement, wahl: ZeichenbildWahl): Zeichenbild | null {
  const ctx = leinwand.getContext("2d");
  if (!ctx) return null;
  const [zb, zh] = wahl.zelle ?? [7, 11];
  const farbe = wahl.farbe ?? [243, 210, 122];
  const staubFarbe = wahl.staubFarbe ?? [154, 160, 181];
  const still = Boolean(wahl.still);
  const atlas = document.createElement("canvas");
  const rnd = Math.random;

  let breite = 1;
  let hoehe = 1;
  let dichte = 1;
  let kb = 9;
  let kh = 13;
  let formen: Zelle[][] = [];
  let aktuell = -1;
  // Teilchen: Lage, Flug (Start, Kontrollpunkt, Ziel, Beginn, Dauer), Zeichen und Ton.
  let n = 0;
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let ax = new Float32Array(0);
  let ay = new Float32Array(0);
  let kx = new Float32Array(0);
  let ky = new Float32Array(0);
  let zx = new Float32Array(0);
  let zy = new Float32Array(0);
  let ab = new Float64Array(0);
  let dauer = new Float32Array(0);
  let zeichen = new Uint8Array(0);
  let zeigt = new Uint8Array(0);
  let ton = new Uint8Array(0);
  let tonVon = new Uint8Array(0);
  // Bis wann ein Teilchen unter der Maus verwürfelt ist (Zeitstempel).
  let wirrBis = new Float64Array(0);
  const maus = { x: -9999, y: -9999, aktiv: false };
  let rahmen = 0;
  let letzte = 0;
  let imBild = true;
  let vorbei = false;

  /** Formen in Zellen zerlegen. */
  const zerlegen = (maler: FormMaler): Zelle[] => {
    const bild = document.createElement("canvas");
    bild.width = Math.max(1, Math.ceil(breite));
    bild.height = Math.max(1, Math.ceil(hoehe));
    const bc = bild.getContext("2d", { willReadFrequently: true });
    if (!bc) return [];
    bc.fillStyle = "#fff";
    bc.strokeStyle = "#fff";
    maler(bc, breite, hoehe);
    const roh = bc.getImageData(0, 0, bild.width, bild.height).data;
    const spalten = Math.floor(breite / zb);
    const zeilen = Math.floor(hoehe / zh);
    const x0 = (breite - spalten * zb) / 2;
    const y0 = (hoehe - zeilen * zh) / 2;
    const zellen: Zelle[] = [];
    for (let j = 0; j < zeilen; j++) {
      for (let i = 0; i < spalten; i++) {
        // Abdeckung: Anteil der bedeckten Bildpunkte in der Zelle (4 × 5 Proben).
        let summe = 0;
        for (let v = 0; v < 5; v++) {
          for (let u = 0; u < 4; u++) {
            const sx = Math.min(bild.width - 1, Math.floor(x0 + (i + (u + 0.5) / 4) * zb));
            const sy = Math.min(bild.height - 1, Math.floor(y0 + (j + (v + 0.5) / 5) * zh));
            summe += roh[(sy * bild.width + sx) * 4 + 3] / 255;
          }
        }
        const cov = summe / 20;
        const stufe = STUFEN.find(([abWert]) => cov > abWert);
        if (!stufe) continue;
        const wahlZeichen = stufe[1];
        zellen.push({ x: x0 + (i + 0.5) * zb, y: y0 + (j + 0.5) * zh, zeichen: wahlZeichen[Math.floor(rnd() * wahlZeichen.length)], ton: stufe[2] });
      }
    }
    return zellen;
  };

  /** Vorrat: jedes Zeichen in Formfarbe und Staubfarbe einmal fertig gezeichnet. */
  const vorratBauen = () => {
    kb = Math.ceil(zb + 2);
    kh = Math.ceil(zh + 2);
    atlas.width = Math.ceil(ZEICHEN.length * kb * dichte);
    atlas.height = Math.ceil(2 * kh * dichte);
    const ac = atlas.getContext("2d");
    if (!ac) return;
    ac.setTransform(dichte, 0, 0, dichte, 0, 0);
    ac.clearRect(0, 0, atlas.width, atlas.height);
    const groesse = zb * 1.55;
    ac.font = `500 ${groesse.toFixed(2)}px ${wahl.mono}, ui-monospace, Menlo, monospace`;
    ac.textAlign = "center";
    ac.textBaseline = "middle";
    const punkt = zb / 6;
    [farbe, staubFarbe].forEach((f, reihe) => {
      ac.fillStyle = `rgb(${f[0]}, ${f[1]}, ${f[2]})`;
      const my = reihe * kh + kh / 2;
      ZEICHEN.forEach((z, i) => {
        const mx = i * kb + kb / 2;
        if (i === Z.dicht || i === Z.mittel) {
          // Block-Zeichen als Punktraster über die ganze Zelle: ▒ Schachbrett, ▓ drei von vier Punkten.
          const reihen = Math.round(zh / punkt);
          const hoch = zh / reihen;
          for (let v = 0; v < reihen; v++) {
            for (let u = 0; u < 6; u++) {
              const an = i === Z.dicht ? !(u % 2 === 1 && v % 2 === 1) : (u + v) % 2 === 0;
              if (an) ac.fillRect(mx - zb / 2 + u * punkt, my - zh / 2 + v * hoch, punkt, hoch);
            }
          }
        } else ac.fillText(z, mx, my + 0.5);
      });
    });
  };

  const staubOrt = (k: number, form: Zelle[] | undefined) => {
    // Jedes dritte Staubteilchen bleibt nahe an der Form (±20 / ±18 px), die anderen schweben frei im Feld.
    if (form?.length && k % 3 === 0) {
      const z = form[Math.floor(rnd() * form.length)];
      return [z.x + (rnd() * 2 - 1) * 20, z.y + (rnd() * 2 - 1) * 18];
    }
    return [zb + rnd() * (breite - 2 * zb), zh + rnd() * (hoehe - 2 * zh)];
  };

  /** Neue Ziele verteilen: Die ersten Teilchen bilden die Form, der Rest wird Staub. */
  const verteile = (form: Zelle[] | undefined, sofort: boolean) => {
    const jetzt = performance.now();
    // Welche Teilchen die Form bilden, wechselt: So fliegt beim Wechsel wirklich alles um.
    const reihenfolge = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [reihenfolge[i], reihenfolge[j]] = [reihenfolge[j], reihenfolge[i]];
    }
    reihenfolge.forEach((k, stelle) => {
      const zelle = form && stelle < form.length ? form[stelle] : undefined;
      let tx: number;
      let ty: number;
      tonVon[k] = ton[k];
      if (zelle) {
        tx = zelle.x;
        ty = zelle.y;
        zeichen[k] = zelle.zeichen;
        ton[k] = zelle.ton;
      } else {
        [tx, ty] = staubOrt(k, form);
        zeichen[k] = STAUB[Math.floor(rnd() * STAUB.length)];
        ton[k] = STAUB_TON;
      }
      ax[k] = px[k];
      ay[k] = py[k];
      zx[k] = tx;
      zy[k] = ty;
      // Kontrollpunkt der Bézier-Kurve: Mitte zwischen Start und Ziel plus Zufall ±70 / ±55 px.
      kx[k] = (ax[k] + tx) / 2 + (rnd() * 2 - 1) * 70;
      ky[k] = (ay[k] + ty) / 2 + (rnd() * 2 - 1) * 55;
      ab[k] = jetzt + rnd() * 380;
      dauer[k] = 650 + rnd() * 450;
      if (sofort || still) {
        px[k] = tx;
        py[k] = ty;
        zeigt[k] = zeichen[k];
        tonVon[k] = ton[k];
        ab[k] = 0;
        dauer[k] = 0;
      }
    });
    wecken();
  };

  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei || !n) return;
    const dt = letzte ? Math.min(100, jetzt - letzte) : 16.7;
    letzte = jetzt;
    const bilder = dt / (1000 / 60);
    const wechselFlug = 1 - Math.pow(0.65, bilder);
    const wechselWirr = 1 - Math.pow(0.55, bilder);
    let fliegt = false;
    let wirr = false;
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
    ctx.clearRect(0, 0, breite, hoehe);
    for (let k = 0; k < n; k++) {
      let deck = TON[ton[k]];
      if (dauer[k] > 0) {
        const t = (jetzt - ab[k]) / dauer[k];
        if (t >= 1) {
          px[k] = zx[k];
          py[k] = zy[k];
          zeigt[k] = zeichen[k];
          dauer[k] = 0;
        } else {
          fliegt = true;
          if (t > 0) {
            // Kurve 1 − (1 − t)³, Bahn: quadratische Bézier-Kurve über den Kontrollpunkt.
            const e = 1 - (1 - t) * (1 - t) * (1 - t);
            const u = 1 - e;
            px[k] = u * u * ax[k] + 2 * u * e * kx[k] + e * e * zx[k];
            py[k] = u * u * ay[k] + 2 * u * e * ky[k] + e * e * zy[k];
            // Unterwegs wechselt das Zeichen mit 35 % pro Bild.
            if (rnd() < wechselFlug) zeigt[k] = Math.floor(rnd() * ZEICHEN.length);
            deck = TON[tonVon[k]] + (TON[ton[k]] - TON[tonVon[k]]) * e;
          } else deck = TON[tonVon[k]];
        }
      }
      // Maus: Zeichen der Form im Umkreis von 34 px verwürfeln sich und rasten danach wieder ein.
      if (maus.aktiv && dauer[k] === 0 && ton[k] !== STAUB_TON) {
        const d = Math.hypot(px[k] - maus.x, py[k] - maus.y);
        if (d < WIRR_UMKREIS) wirrBis[k] = Math.max(wirrBis[k], jetzt + 380 + (1 - d / WIRR_UMKREIS) * 520 + rnd() * 260);
      }
      if (wirrBis[k] > 0) {
        if (jetzt < wirrBis[k]) {
          wirr = true;
          if (rnd() < wechselWirr) zeigt[k] = Math.floor(rnd() * ZEICHEN.length);
        } else {
          wirrBis[k] = 0;
          zeigt[k] = zeichen[k];
        }
      }
      const istStaub = ton[k] === STAUB_TON && (dauer[k] === 0 || tonVon[k] === STAUB_TON);
      ctx.globalAlpha = deck;
      ctx.drawImage(atlas, zeigt[k] * kb * dichte, (istStaub ? kh : 0) * dichte, kb * dichte, kh * dichte, px[k] - kb / 2, py[k] - kh / 2, kb, kh);
    }
    ctx.globalAlpha = 1;
    if (fliegt || wirr || maus.aktiv) wecken();
    else letzte = 0;
  };

  const wecken = () => {
    if (rahmen || vorbei || !imBild || document.hidden) return;
    rahmen = requestAnimationFrame(bild);
  };
  const wiederDa = () => {
    letzte = 0;
    wecken();
  };
  document.addEventListener("visibilitychange", wiederDa);

  return {
    einrichten: (b, h, maler) => {
      breite = Math.max(1, b);
      hoehe = Math.max(1, h);
      dichte = Math.min(window.devicePixelRatio || 1, 2);
      leinwand.width = Math.round(breite * dichte);
      leinwand.height = Math.round(hoehe * dichte);
      formen = maler.map(zerlegen);
      vorratBauen();
      const groesste = Math.max(1, ...formen.map((f) => f.length));
      n = Math.round(groesste * (wahl.ueberschuss ?? 1.25));
      px = new Float32Array(n);
      py = new Float32Array(n);
      ax = new Float32Array(n);
      ay = new Float32Array(n);
      kx = new Float32Array(n);
      ky = new Float32Array(n);
      zx = new Float32Array(n);
      zy = new Float32Array(n);
      ab = new Float64Array(n);
      dauer = new Float32Array(n);
      zeichen = new Uint8Array(n);
      zeigt = new Uint8Array(n);
      ton = new Uint8Array(n).fill(STAUB_TON);
      tonVon = new Uint8Array(n).fill(STAUB_TON);
      wirrBis = new Float64Array(n);
      // Zu Beginn ist alles Staub, zufällig im Feld (nach einer Größenänderung steht die Form sofort wieder).
      for (let k = 0; k < n; k++) {
        const [sx, sy] = staubOrt(k, undefined);
        px[k] = sx;
        py[k] = sy;
        zeichen[k] = zeigt[k] = STAUB[Math.floor(rnd() * STAUB.length)];
      }
      const zuvor = aktuell;
      verteile(zuvor >= 0 ? formen[zuvor] : undefined, true);
    },
    zeige: (nr, sofort = false) => {
      if (nr === aktuell && !sofort) return;
      aktuell = nr;
      verteile(formen[nr], sofort);
    },
    zerfalle: () => {
      if (aktuell < 0) return;
      aktuell = -1;
      verteile(undefined, false);
    },
    zeiger: (x, y, aktiv) => {
      if (still) return;
      maus.x = x;
      maus.y = y;
      maus.aktiv = aktiv;
      wecken();
    },
    sichtbar: (ja) => {
      imBild = ja;
      letzte = 0;
      wecken();
    },
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      document.removeEventListener("visibilitychange", wiederDa);
    },
  };
}
