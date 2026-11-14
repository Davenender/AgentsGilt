// Glaskarten unter der ersten Aussage (Aussage.tsx): der Stern hinter dem Glas und das Mauslicht.
//
// Hinter jeder Karte wartet unsichtbar ein goldener Stern (das Bild des leichten Sterns, kleiner).
// Kommt die Maus auf die Karte, gleitet er von der Seite, von der sie kam, hinter das Glas und folgt
// ihr weich mit etwas Verzögerung; geht sie weg, gleitet er dort hinaus, wo sie die Karte verlassen
// hat, und verblasst. Gesetzt werden je Karte drei Werte: --sx und --sy (Ort des Sterns in der
// Karte) und --sd (Deckkraft). Dieselben Werte lassen Lichtkante und Goldrand der Karte dort
// aufglimmen, wo der Stern gerade ist (Stylesheet).
//
// Mauslicht: Der Text der Karten steht gedämpft da. Wörter im Umkreis von 120 px um die Maus
// leuchten warm auf (--h je Wort, 0 bis 1) und klingen weich wieder ab.
//
// Am Handy (ohne Maus) zieht der Stern einmal von links nach rechts hinter dem Glas durch, sobald
// eine Karte gut zur Hälfte im Bild ist; der Text leuchtet dabei ganz auf und bleibt hell.

/** Mauslicht: Wörter in diesem Umkreis um die Maus leuchten auf (Pixel). */
export const UMKREIS = 120;
/** So schnell zieht der Stern der Maus nach (je Sekunde): weich, mit etwas Verzögerung. */
const FOLGE = 5.5;
/** Wörter werden schnell hell und klingen weich wieder ab (je Sekunde). */
const AUF = 14;
const AB = 2.6;
/** Handy: Dauer des Durchzugs in Sekunden. */
const DURCHZUG = 1.9;
/** Die Karten schweben nacheinander ein: Abstand und Dauer in Millisekunden (wie im Stylesheet). */
const VERSATZ = 120;
const EINSCHWEBEN = 520;
/** So weit außerhalb der Karte (Anteil der Kantenlänge des Bildes) ist vom Stern nichts mehr zu sehen. */
const AUSSEN = 0.36;

type Wort = { el: HTMLElement; x: number; y: number; h: number; gemalt: number };
type Karte = {
  /** Das Listenelement: Es nimmt die Maus an und trägt die Werte. */
  el: HTMLElement;
  /** Die sichtbare Karte (sie hebt sich unter der Maus leicht an). */
  flaeche: HTMLElement;
  b: number;
  h: number;
  /** Kantenlänge des Stern-Bildes. */
  gross: number;
  drin: boolean;
  x: number;
  y: number;
  zx: number;
  zy: number;
  deck: number;
  zdeck: number;
  /** Handy: gut zur Hälfte im Bild? */
  imBild: boolean;
  /** Handy: -1 = noch nicht, 0 bis 1 = der Stern zieht durch, 2 = fertig. */
  zug: number;
  woerter: Wort[];
};

export type Glaskarten = {
  /** Die Karten schweben jetzt ein (nach `warten` ms). Erst danach zieht am Handy der Stern durch. */
  zeigen: (warten?: number) => void;
  ende: () => void;
};

const weich = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Die nächste Kante eines Feldes (b × h) zu einer Stelle: ein Punkt `weg` Pixel außerhalb davon. */
export function ausserhalb(b: number, h: number, x: number, y: number, weg: number): { x: number; y: number } {
  const nah = Math.min(x, b - x, y, h - y);
  if (nah === x) return { x: -weg, y };
  if (nah === b - x) return { x: b + weg, y };
  if (nah === y) return { x, y: -weg };
  return { x, y: h + weg };
}

/** So hell leuchtet ein Wort im Abstand `abstand` zur Maus (0 bis 1). */
export function wortLicht(abstand: number): number {
  return weich(1 - abstand / UMKREIS);
}

/**
 * Richtet Stern und Mauslicht für alle Karten (`.ag-gk`) unter „reihe“ ein.
 * Nicht aufrufen bei „weniger Bewegung“: Dann stehen die Karten einfach da, der Text ist hell.
 */
export function richteGlaskartenEin(reihe: HTMLElement): Glaskarten {
  const mitMaus = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const karten: Karte[] = Array.from(reihe.querySelectorAll<HTMLElement>(".ag-gk")).map((el) => ({
    el,
    flaeche: el.querySelector<HTMLElement>(".ag-gk__karte") ?? el,
    b: 1,
    h: 1,
    gross: 480,
    drin: false,
    x: 0,
    y: 0,
    zx: 0,
    zy: 0,
    deck: 0,
    zdeck: 0,
    imBild: false,
    zug: -1,
    woerter: [],
  }));
  let vorbei = false;
  let rahmen = 0;
  let zuletzt = 0;
  let maus: { x: number; y: number } | null = null;
  /** Ab wann die erste Karte dasteht (Zeit des Browsers). */
  let stehtAb = Infinity;
  const uhren: number[] = [];
  const abbau: (() => void)[] = [];

  /** Größen und die Mitten der Wörter merken (bezogen auf ihre Karte). */
  const vermessen = () => {
    for (const k of karten) {
      const r = k.flaeche.getBoundingClientRect();
      k.b = Math.max(1, r.width);
      k.h = Math.max(1, r.height);
      k.gross = k.el.querySelector<HTMLElement>(".ag-gk__stern")?.offsetWidth || 480;
      const alt = k.woerter;
      k.woerter = Array.from(k.el.querySelectorAll<HTMLElement>(".ag-gk__wort")).map((el, i) => {
        const w = el.getBoundingClientRect();
        return { el, x: w.left + w.width / 2 - r.left, y: w.top + w.height / 2 - r.top, h: alt[i]?.h ?? 0, gemalt: alt[i]?.gemalt ?? -1 };
      });
    }
  };

  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei) return;
    const dt = zuletzt ? Math.min(0.05, (jetzt - zuletzt) / 1000) : 1 / 60;
    zuletzt = jetzt;
    let weiter = false;
    const zugStern = 1 - Math.exp(-dt * FOLGE);
    for (const k of karten) {
      // ── Der Stern.
      if (k.zug >= 0 && k.zug < 1) {
        // Handy: einmal von links nach rechts hinter dem Glas durch.
        k.zug = Math.min(1, k.zug + dt / DURCHZUG);
        const weg = k.gross * AUSSEN;
        k.x = -weg + (k.b + 2 * weg) * weich(k.zug);
        k.y = k.h * 0.42;
        k.deck = Math.pow(Math.sin(Math.PI * k.zug), 0.55);
        if (k.zug >= 1) {
          k.zug = 2;
          k.deck = 0;
          k.el.dataset.gelesen = "1";
        }
        weiter = true;
      } else if (k.zug < 0) {
        k.x += (k.zx - k.x) * zugStern;
        k.y += (k.zy - k.y) * zugStern;
        k.deck += (k.zdeck - k.deck) * (1 - Math.exp(-dt * (k.zdeck > k.deck ? 9 : 3.4)));
        if (Math.abs(k.zx - k.x) > 0.4 || Math.abs(k.zy - k.y) > 0.4 || Math.abs(k.zdeck - k.deck) > 0.004) weiter = true;
        else {
          k.x = k.zx;
          k.y = k.zy;
          k.deck = k.zdeck;
        }
      }
      k.el.style.setProperty("--sx", `${k.x.toFixed(1)}px`);
      k.el.style.setProperty("--sy", `${k.y.toFixed(1)}px`);
      k.el.style.setProperty("--sd", k.deck.toFixed(3));
      // ── Das Licht auf dem Text: unter der Maus, am Handy unter dem durchziehenden Stern.
      const r = maus && k.zug < 0 ? k.flaeche.getBoundingClientRect() : null;
      for (const w of k.woerter) {
        let ziel = 0;
        if (k.zug === 2) ziel = 1;
        else if (k.zug >= 0) ziel = w.x < k.x + 30 ? 1 : 0;
        else if (maus && r) ziel = wortLicht(Math.hypot(maus.x - r.left - w.x, maus.y - r.top - w.y));
        if (ziel !== w.h) {
          w.h += (ziel - w.h) * (1 - Math.exp(-dt * (ziel > w.h ? AUF : AB)));
          if (Math.abs(ziel - w.h) < 0.004) w.h = ziel;
          else weiter = true;
        }
        if (w.h !== w.gemalt && (Math.abs(w.h - w.gemalt) > 0.004 || w.h === ziel)) {
          w.gemalt = w.h;
          w.el.style.setProperty("--h", w.h.toFixed(3));
        }
      }
    }
    if (weiter) wecken();
    else zuletzt = 0;
  };
  const wecken = () => {
    if (!rahmen && !vorbei) rahmen = requestAnimationFrame(bild);
  };

  vermessen();
  const groesse = new ResizeObserver(() => {
    vermessen();
    wecken();
  });
  groesse.observe(reihe);
  for (const k of karten) groesse.observe(k.flaeche);
  abbau.push(() => groesse.disconnect());
  // Die Schrift bestimmt, wo die Wörter stehen.
  document.fonts?.ready
    .then(() => {
      if (!vorbei) vermessen();
    })
    .catch(() => undefined);

  let zeigen: Glaskarten["zeigen"] = () => {};

  if (mitMaus) {
    // ── Maus: Stern und Mauslicht.
    reihe.dataset.licht = "maus";
    const ort = (k: Karte, ev: PointerEvent) => {
      const r = k.flaeche.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    for (const k of karten) {
      const hinein = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse") return;
        const o = ort(k, ev);
        // Er beginnt an der Seite, von der die Maus kam (war er noch unterwegs, zieht er einfach weiter).
        if (k.deck < 0.05) {
          const a = ausserhalb(k.b, k.h, o.x, o.y, k.gross * AUSSEN);
          k.x = a.x;
          k.y = a.y;
        }
        k.drin = true;
        k.zx = o.x;
        k.zy = o.y;
        k.zdeck = 1;
        k.el.dataset.an = "1";
        wecken();
      };
      const darin = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse") return;
        if (!k.drin) return hinein(ev);
        const o = ort(k, ev);
        k.zx = o.x;
        k.zy = o.y;
        wecken();
      };
      const hinaus = (ev: PointerEvent) => {
        if (!k.drin) return;
        k.drin = false;
        // Er gleitet dort hinaus, wo die Maus die Karte verlassen hat, und verblasst.
        const o = ort(k, ev);
        const a = ausserhalb(k.b, k.h, Math.min(k.b, Math.max(0, o.x)), Math.min(k.h, Math.max(0, o.y)), k.gross * AUSSEN);
        k.zx = a.x;
        k.zy = a.y;
        k.zdeck = 0;
        delete k.el.dataset.an;
        wecken();
      };
      k.el.addEventListener("pointerenter", hinein);
      k.el.addEventListener("pointermove", darin, { passive: true });
      k.el.addEventListener("pointerleave", hinaus);
      abbau.push(() => {
        k.el.removeEventListener("pointerenter", hinein);
        k.el.removeEventListener("pointermove", darin);
        k.el.removeEventListener("pointerleave", hinaus);
      });
    }
    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = reihe.getBoundingClientRect();
      const nah = ev.clientX > r.left - UMKREIS && ev.clientX < r.right + UMKREIS && ev.clientY > r.top - UMKREIS && ev.clientY < r.bottom + UMKREIS;
      if (!nah && !maus) return;
      maus = nah ? { x: ev.clientX, y: ev.clientY } : null;
      wecken();
    };
    const fort = () => {
      if (!maus) return;
      maus = null;
      wecken();
    };
    // Beim Scrollen wandert die Seite unter der ruhenden Maus weiter: Das Licht klingt ab.
    window.addEventListener("pointermove", bewegt, { passive: true });
    window.addEventListener("scroll", fort, { passive: true });
    document.documentElement.addEventListener("pointerleave", fort);
    abbau.push(() => {
      window.removeEventListener("pointermove", bewegt);
      window.removeEventListener("scroll", fort);
      document.documentElement.removeEventListener("pointerleave", fort);
    });
  } else {
    // ── Handy: Kommt eine Karte gut zur Hälfte ins Bild, zieht ihr Stern einmal durch.
    reihe.dataset.licht = "finger";
    const pruefen = () => {
      if (vorbei) return;
      const jetzt = performance.now();
      karten.forEach((k, i) => {
        if (k.zug !== -1 || !k.imBild) return;
        // Erst wenn die Karte auch wirklich dasteht (sie schwebt mit den anderen ein).
        const ab = stehtAb + i * VERSATZ + EINSCHWEBEN;
        if (jetzt >= ab) {
          k.zug = 0;
          waechter.unobserve(k.el);
          wecken();
        } else if (Number.isFinite(ab)) uhren.push(window.setTimeout(pruefen, ab - jetzt + 20));
      });
    };
    const waechter = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          const k = karten.find((karte) => karte.el === e.target);
          if (k) k.imBild = e.intersectionRatio >= 0.55;
        }
        pruefen();
      },
      { threshold: [0, 0.55, 0.9] },
    );
    for (const k of karten) waechter.observe(k.el);
    abbau.push(() => waechter.disconnect());
    zeigen = (warten = 0) => {
      stehtAb = Math.min(stehtAb, performance.now() + warten);
      pruefen();
    };
  }

  return {
    zeigen,
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      uhren.forEach((u) => window.clearTimeout(u));
      for (const wie of abbau) wie();
      delete reihe.dataset.licht;
      for (const k of karten) {
        delete k.el.dataset.an;
        delete k.el.dataset.gelesen;
        for (const eigenschaft of ["--sx", "--sy", "--sd"]) k.el.style.removeProperty(eigenschaft);
        for (const w of k.woerter) w.el.style.removeProperty("--h");
      }
    },
  };
}
