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
//
// Leistung: Die Werte des Sterns hängen nur an den Teilen, die ihn zeichnen (nicht an der ganzen
// Karte), und geschrieben wird nur, was sich geändert hat.
//
// Der Stern bricht sich im Glas (seit 14.11.2026), wie echtes Licht hinter echtem Glas:
//   1. Lichtkreuz: Aus dem Stern ziehen vier dünne Lichtstreifen waagerecht und senkrecht bis an
//      die Kartenränder (Stylesheet, über --sx, --sy und --sd; nur Verschieben und Deckkraft).
//   2. Klares Glas: In einem weichen Kreis um den Stern ist das Glas klarer (eine zweite
//      Glas-Ebene mit weniger Unschärfe, mit einer Maske an der Stelle des Sterns freigestellt);
//      der Text darüber wird dort etwas heller. Nur solange ein Stern in der Karte ist (`data-stern`).
//   3. Brechung an der Kante: Wo Stern oder Lichtstreifen eine Kante treffen, liegt dort ein
//      heller Saum. Gesetzt wird je Kante seine Stärke: --bl, --br, --bo, --bu (links, rechts,
//      oben, unten; 0 bis 1): stark, wenn der Stern nah an dieser Kante ist.
//   4. Das Licht fällt auf die Nachbarkarten: Der Rand der Nachbarkarte glimmt an der
//      gegenüberliegenden Stelle mit auf (über den gemeinsamen Glimmrand, glimmrand.ts), schwächer,
//      je weiter der Stern von der Kante weg ist, und kurz stärker, wenn er zu ihr hinausgleitet.
// Sparstufen: Stockt die Bildfolge, solange ein Stern leuchtet, fällt zuerst das Licht auf den
// Nachbarkarten weg, dann das klare Glas (auch gleich von Anfang an, wenn die Seite im sparsamen
// Modus ist: Dann zeichnet Glas ohnehin nichts weich).
import { glimmLicht } from "../glimmrand.ts";

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
/** Der Text leuchtet auch um den Stern etwas auf: Umkreis in Pixeln und höchste Helligkeit. */
const STERN_UMKREIS = 170;
const STERN_TEXT = 0.42;
/** So hell glimmt der Rand der Nachbarkarte höchstens mit (0 bis 1). */
const NACHBAR = 0.78;
/** Ein Bild gilt als stockend, wenn es länger als so viele Sekunden auf sich warten ließ. */
const STOCKT = 0.03;

type Wort = { el: HTMLElement; x: number; y: number; h: number; gemalt: number };
type Karte = {
  /** Das Listenelement: Es nimmt die Maus an und trägt die Werte. */
  el: HTMLElement;
  /** Die sichtbare Karte (sie hebt sich unter der Maus leicht an). */
  flaeche: HTMLElement;
  /** Ihr Rand (das Teil mit `data-glimm`): Auf ihn fällt das Licht des Sterns der Nachbarkarte. */
  rand: HTMLElement;
  /**
   * Die Teile, die den Stern zeichnen (er selbst mit Lichtkreuz, mattes und klares Glas, Rand, Saum).
   * Nur sie bekommen seine Werte: Hingen die Werte an der ganzen Karte, rechnete der Browser je
   * Bild auch jedes Wort des Textes neu.
   */
  teile: HTMLElement[];
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
  /** Lage im Fenster beim letzten Vermessen (für die Nachbarn). */
  l: number;
  t: number;
  /** Die Karten daneben und darunter/darüber (auf deren Rand das Licht fällt). */
  links: Karte | null;
  rechts: Karte | null;
  oben: Karte | null;
  unten: Karte | null;
  /** Leuchtet gerade ein Stern in der Karte? Und scheint er gerade auf Nachbarn? */
  stern: boolean;
  scheint: boolean;
  /** Was zuletzt gesetzt wurde (nur Geändertes wird geschrieben). */
  gesetzt: string;
};

export type Glaskarten = {
  /** Die Karten schweben jetzt ein (nach `warten` ms). Erst danach zieht am Handy der Stern durch. */
  zeigen: (warten?: number) => void;
  ende: () => void;
};

const weich = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const klemme = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x);

/**
 * So stark bricht sich das Licht an einer Kante: `nah` ist, wie nah der Stern ihr ist (1 = an der
 * Kante, 0 = an der gegenüberliegenden), `deck` seine Deckkraft. Nahe der Kante kräftig, zur
 * Mitte der Karte hin schnell schwächer.
 */
export function kantenLicht(nah: number, deck: number): number {
  const n = klemme(nah);
  return klemme(deck) * (0.08 + 0.92 * n * n * n);
}

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
    rand: el.querySelector<HTMLElement>(".ag-gk__glas") ?? el,
    teile: Array.from(el.querySelectorAll<HTMLElement>(".ag-gk__hinten, .ag-gk__matt, .ag-gk__klar, .ag-gk__glas, .ag-gk__saum")),
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
    l: 0,
    t: 0,
    links: null,
    rechts: null,
    oben: null,
    unten: null,
    stern: false,
    scheint: false,
    gesetzt: "",
  }));
  // Sparstufe: 0 = alles, 1 = ohne Licht auf den Nachbarkarten, 2 = auch ohne klares Glas.
  let stufe = document.documentElement.classList.contains("ag-sparsam") ? 2 : 0;
  let stockend = 0;
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
      k.l = r.left;
      k.t = r.top;
      k.gross = k.el.querySelector<HTMLElement>(".ag-gk__stern")?.offsetWidth || 480;
      const alt = k.woerter;
      k.woerter = Array.from(k.el.querySelectorAll<HTMLElement>(".ag-gk__wort")).map((el, i) => {
        const w = el.getBoundingClientRect();
        return { el, x: w.left + w.width / 2 - r.left, y: w.top + w.height / 2 - r.top, h: alt[i]?.h ?? 0, gemalt: alt[i]?.gemalt ?? -1 };
      });
    }
    // Wer liegt neben wem? Nebeneinander (breit) oder untereinander (schmal).
    for (const k of karten) {
      k.links = k.rechts = k.oben = k.unten = null;
      for (const a of karten) {
        if (a === k) continue;
        const gleicheZeile = a.t < k.t + k.h - 4 && a.t + a.h > k.t + 4;
        const gleicheSpalte = a.l < k.l + k.b - 4 && a.l + a.b > k.l + 4;
        if (gleicheZeile && a.l >= k.l + k.b - 4 && (!k.rechts || a.l < k.rechts.l)) k.rechts = a;
        if (gleicheZeile && a.l + a.b <= k.l + 4 && (!k.links || a.l > k.links.l)) k.links = a;
        if (gleicheSpalte && a.t >= k.t + k.h - 4 && (!k.unten || a.t < k.unten.t)) k.unten = a;
        if (gleicheSpalte && a.t + a.h <= k.t + 4 && (!k.oben || a.t > k.oben.t)) k.oben = a;
      }
    }
  };
  /** Das Licht einer Karte fällt nicht mehr auf ihre Nachbarn. */
  const dunkel = (k: Karte) => {
    if (!k.scheint) return;
    k.scheint = false;
    for (const n of [k.links, k.rechts, k.oben, k.unten]) if (n) glimmLicht(n.rand, null, !mitMaus);
  };

  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei) return;
    const dt = zuletzt ? Math.min(0.05, (jetzt - zuletzt) / 1000) : 1 / 60;
    zuletzt = jetzt;
    let weiter = false;
    const zugStern = 1 - Math.exp(-dt * FOLGE);
    // Sparstufen: Stockt die Bildfolge, solange ein Stern leuchtet, fällt erst das Licht auf den
    // Nachbarkarten weg, dann das klare Glas.
    if (stufe < 2 && karten.some((k) => k.stern)) {
      stockend = dt > STOCKT ? stockend + 1 : Math.max(0, stockend - 0.5);
      if (stockend > 18) {
        stufe += 1;
        stockend = 0;
        for (const k of karten) dunkel(k);
      }
    }
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
      // ── Der Stern bricht sich im Glas: Wie stark an welcher Kante? (Nah an der Kante stark.)
      const an = k.deck > 0.004;
      const u = k.x / k.b;
      const v = k.y / k.h;
      const bl = an ? kantenLicht(1 - u, k.deck) : 0;
      const br = an ? kantenLicht(u, k.deck) : 0;
      const bo = an ? kantenLicht(1 - v, k.deck) : 0;
      const bu = an ? kantenLicht(v, k.deck) : 0;
      // Nur schreiben, was sich geändert hat (eine ruhende Karte wird nicht angefasst).
      const neu = `${k.x.toFixed(1)}|${k.y.toFixed(1)}|${k.deck.toFixed(3)}`;
      if (neu !== k.gesetzt) {
        k.gesetzt = neu;
        const sx = `${k.x.toFixed(1)}px`;
        const sy = `${k.y.toFixed(1)}px`;
        const sd = k.deck.toFixed(3);
        for (const teil of k.teile) {
          teil.style.setProperty("--sx", sx);
          teil.style.setProperty("--sy", sy);
          teil.style.setProperty("--sd", sd);
        }
        // Die Stärke je Kante braucht nur der Saum (das letzte Teil).
        const saum = k.teile[k.teile.length - 1];
        if (saum) {
          saum.style.setProperty("--bl", bl.toFixed(3));
          saum.style.setProperty("--br", br.toFixed(3));
          saum.style.setProperty("--bo", bo.toFixed(3));
          saum.style.setProperty("--bu", bu.toFixed(3));
        }
      }
      // Das klare Glas um den Stern gibt es nur, solange er leuchtet (und nicht in Sparstufe 2).
      const klar = an && stufe < 2;
      if (klar !== k.stern) {
        k.stern = klar;
        if (klar) k.el.dataset.stern = "1";
        else delete k.el.dataset.stern;
      }
      // ── Das Licht fällt auf die Nachbarkarten: Ihr Rand glimmt an der gegenüberliegenden Stelle
      // mit auf. Gleitet der Stern zur Nachbarkarte hinaus (er ist schon über die Kante), bleibt
      // ihr Rand kurz stärker hell, obwohl der Stern selbst schon verblasst.
      if (an && stufe < 1) {
        k.scheint = true;
        // Am Handy zieht der Stern auf fester Höhe durch: Dort glimmt die Nachbarkarte einfach kurz mit auf.
        const kraft = (nah: number, draussen: boolean) => (k.zug >= 0 ? 0.62 * k.deck : NACHBAR * kantenLicht(nah, draussen ? Math.sqrt(k.deck) : k.deck));
        if (k.rechts) glimmLicht(k.rechts.rand, { x: 0, y: k.y + k.t - k.rechts.t, n: kraft(u, u > 1) }, !mitMaus);
        if (k.links) glimmLicht(k.links.rand, { x: k.links.b, y: k.y + k.t - k.links.t, n: kraft(1 - u, u < 0) }, !mitMaus);
        if (k.unten) glimmLicht(k.unten.rand, { x: k.x + k.l - k.unten.l, y: 0, n: kraft(v, v > 1) }, !mitMaus);
        if (k.oben) glimmLicht(k.oben.rand, { x: k.x + k.l - k.oben.l, y: k.oben.h, n: kraft(1 - v, v < 0) }, !mitMaus);
      } else dunkel(k);
      // ── Das Licht auf dem Text: unter der Maus und (schwächer) um den Stern; am Handy unter dem
      // durchziehenden Stern.
      const r = maus && k.zug < 0 ? k.flaeche.getBoundingClientRect() : null;
      for (const w of k.woerter) {
        let ziel = 0;
        if (k.zug === 2) ziel = 1;
        else if (k.zug >= 0) ziel = w.x < k.x + 30 ? 1 : 0;
        else {
          if (maus && r) ziel = wortLicht(Math.hypot(maus.x - r.left - w.x, maus.y - r.top - w.y));
          // Um den Stern ist das Glas klarer: Der Text darüber wird dort etwas heller.
          if (klar) ziel = Math.max(ziel, STERN_TEXT * k.deck * weich(1 - Math.hypot(k.x - w.x, k.y - w.y) / STERN_UMKREIS));
        }
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
        dunkel(k);
        delete k.el.dataset.an;
        delete k.el.dataset.gelesen;
        delete k.el.dataset.stern;
        for (const teil of k.teile) for (const eigenschaft of ["--sx", "--sy", "--sd", "--bl", "--br", "--bo", "--bu"]) teil.style.removeProperty(eigenschaft);
        for (const w of k.woerter) w.el.style.removeProperty("--h");
      }
    },
  };
}
