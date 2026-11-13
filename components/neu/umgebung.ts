// Kleine Helfer, die mehrere Bauteile der neuen Welt brauchen.

/**
 * Vorschau-Modus (?vorschau=1): Die Übersichtsseite zeigt die Varianten in
 * kleinen Rahmen nebeneinander. Dort laufen weder Ladebildschirm noch
 * Dauer-Animationen, damit drei Seiten gleichzeitig leicht bleiben.
 */
export function istVorschau(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("vorschau");
}

export function willWenigerBewegung(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Der Ladebildschirm meldet sich so ab; Texte im Kopfbereich warten darauf. */
export const INTRO_FERTIG = "ag:intro-fertig";
export const INTRO_FERTIG_KLASSE = "ag-intro-fertig";

/**
 * „Laden fertig“: Alles ist geladen, das Licht geht an. (In den älteren Varianten: Der
 * Ladebildschirm hat das Bild freigegeben und die Schriften sind da.) Darauf wartet die
 * Sprechblase des Chat-Knopfs.
 */
export const LADEN_FERTIG = "ag:laden-fertig";
export const LADEN_FERTIG_KLASSE = "ag-laden-fertig";

/**
 * „Start fertig“: Die Startanimation ist durch (das Licht ist an, der Name steht) oder wurde
 * übersprungen. Darauf wartet der Scroll-Hinweis.
 */
export const START_FERTIG = "ag:start-fertig";
export const START_FERTIG_KLASSE = "ag-start-fertig";

/**
 * „Start frei“: Die Startanimation ist ganz vorbei (Name gelandet, Welle durch) oder es gab keine.
 * Ab jetzt kann man scrollen.
 */
export const START_FREI = "ag:start-frei";
export const START_FREI_KLASSE = "ag-start-frei";

/** Gleichbleibende Zufallszahlen, damit Server und Browser dasselbe zeichnen. */
export function zufall(saat: number) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Weiches Scrollen zu einem Ziel auf der Seite. Der Rahmen meldet hier sein weiches Scrollen
 * (Lenis) an; ohne das scrollt der Browser selbst (bei „weniger Bewegung“ ohne Animation).
 */
let weichZu: ((ziel: HTMLElement) => void) | undefined;
export const scrollZiel = {
  melde: (wie: ((ziel: HTMLElement) => void) | undefined) => {
    weichZu = wie;
  },
  zu: (ziel: HTMLElement) => {
    if (weichZu) weichZu(ziel);
    else ziel.scrollIntoView({ behavior: willWenigerBewegung() ? "auto" : "smooth", block: "start" });
  },
};

/**
 * Scroll-Sperre: Während der Startanimation steht die Seite oben (kein Mausrad, kein Wischen, keine
 * Tasten, kein Scrollbalken). Das Stylesheet sperrt das gewöhnliche Scrollen über die Klasse am
 * <html>; das weiche Scrollen (Lenis) meldet sich hier an und hält so lange an.
 *
 * „Fest“ heißt: Die Seite ist dazu nur so hoch wie das Bild, es gibt gar nichts, wohin sie scrollen
 * könnte (auch nicht durch die Tab-Taste oder ein Skript). Das gilt erst, wenn der Browser keine
 * frühere Lage mehr wiederherstellen muss (siehe kopf/LichtName.tsx).
 */
const SPERRE_KLASSE = "ag-scroll-gesperrt";
const FEST_KLASSE = "ag-scroll-fest";
let gesperrt = false;
let beiSperre: ((an: boolean) => void) | undefined;
export const scrollSperre = {
  melde: (wie: ((an: boolean) => void) | undefined) => {
    beiSperre = wie;
    wie?.(gesperrt);
  },
  setze: (an: boolean, fest = false) => {
    gesperrt = an;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle(SPERRE_KLASSE, an);
      document.documentElement.classList.toggle(FEST_KLASSE, an && fest);
    }
    beiSperre?.(an);
  },
  /** Die laufende Sperre fest machen (die Seite ist dann nur so hoch wie das Bild). */
  fest: () => {
    if (gesperrt && typeof document !== "undefined") document.documentElement.classList.add(FEST_KLASSE);
  },
};
