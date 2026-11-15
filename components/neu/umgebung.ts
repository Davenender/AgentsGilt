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

/**
 * „Vor dem Start“: Die Seite hat die Startanimation, ihr Skript läuft aber noch nicht. Die Klasse
 * setzt ein winziges Skript ganz am Anfang der Seite (app/layout.tsx, nur auf der neuen Seite);
 * das Stylesheet hält die Seite damit oben, bis das Skript der Startanimation übernimmt (welt.css).
 */
export const VORSTART_KLASSE = "ag-vorstart";

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
 *
 * Solange die Seite gesperrt ist (Startanimation), merkt sie sich das Ziel nur: das Ziel in der
 * Adresse (#kontakt) oder einen Klick auf „Anrufen“. Mit der Freigabe scrollt sie dorthin; das
 * zuletzt gewünschte Ziel zählt.
 */
let weichZu: ((ziel: HTMLElement) => void) | undefined;
let gemerkt: HTMLElement | undefined;
export const scrollZiel = {
  melde: (wie: ((ziel: HTMLElement) => void) | undefined) => {
    weichZu = wie;
  },
  zu: (ziel: HTMLElement) => {
    if (gesperrt) {
      gemerkt = ziel;
      return;
    }
    // Liegt ein Blatt über der Seite, schließt es sich erst und scrollt dann dorthin (scrollRuhe).
    if (ruht && zielInRuhe) return zielInRuhe(ziel);
    if (weichZu) weichZu(ziel);
    else ziel.scrollIntoView({ behavior: willWenigerBewegung() ? "auto" : "smooth", block: "start" });
  },
  /** Ein gemerktes Ziel verwerfen (die Seite wird abgebaut). */
  vergiss: () => {
    gemerkt = undefined;
  },
};

/**
 * Scroll-Sperre: Während der Startanimation steht die Seite oben (kein Mausrad, kein Wischen, keine
 * Tasten, kein Scrollbalken). Das Stylesheet sperrt das gewöhnliche Scrollen über die Klasse am
 * <html>; das weiche Scrollen (Lenis) meldet sich hier an und hält so lange an.
 *
 * „Fest“ heißt: Die Seite ist dazu nur so hoch wie das Bild, es gibt gar nichts, wohin sie scrollen
 * könnte (auch nicht durch die Tab-Taste, ein Skript oder einen Sprung des Browsers zu einem Ziel
 * in der Adresse). Die Startanimation sperrt immer fest (kopf/LichtName.tsx).
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
  /** Sperren oder freigeben. Gibt zurück, ob die Seite mit der Freigabe zu einem gemerkten Ziel scrollt. */
  setze: (an: boolean, fest = false): boolean => {
    // Eine neue Sperre beginnt ohne Ziel.
    if (an && !gesperrt) gemerkt = undefined;
    const warGesperrt = gesperrt;
    gesperrt = an;
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle(SPERRE_KLASSE, an);
      document.documentElement.classList.toggle(FEST_KLASSE, an && fest);
    }
    beiSperre?.(an);
    // Steht ein Ziel in der Adresse (#kontakt) und lädt die Seite noch, stellt der Browser sie
    // selbst dorthin, sobald sie wieder scrollen kann: ein Sprung, von dem das weiche Scrollen
    // nichts weiß (es setzte die Seite danach zurück auf Anfang). Ein eigener kleiner Schritt
    // beendet diesen Sprung des Browsers für immer, und die Seite steht wie zuvor ganz oben. Von
    // dort scrollt sie weich zum gemerkten Ziel. Alles im selben Augenblick: Zu sehen ist nichts.
    if (!an && warGesperrt && typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 1, behavior: "instant" });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    if (an || !gemerkt) return false;
    const ziel = gemerkt;
    gemerkt = undefined;
    if (!ziel.isConnected) return false;
    scrollZiel.zu(ziel);
    return true;
  },
};

/**
 * Ruhe: Über der Seite liegt ein Blatt (Impressum, Datenschutz: recht/RechtBlatt.tsx). Die Seite
 * darunter scrollt so lange nicht und bleibt genau dort stehen, wo sie ist; anders als bei der
 * Sperre der Startanimation springt beim Freigeben nichts. Das Stylesheet nimmt ihr den
 * Scrollbalken und hält sie dabei genau so breit wie zuvor (dafür wird seine Breite hier gemessen
 * und als --rollbalken mitgegeben: recht.css), das weiche Scrollen (Lenis) meldet sich hier an und
 * hält so lange an.
 */
const RUHE_KLASSE = "ag-seite-ruht";
let ruht = false;
let beiRuhe: ((an: boolean) => void) | undefined;
let zielInRuhe: ((ziel: HTMLElement) => void) | undefined;
export const scrollRuhe = {
  /** Was geschieht, wenn in der Ruhe jemand zu einem Ziel der Seite will (das Blatt meldet sich hier an). */
  beiZiel: (wie: ((ziel: HTMLElement) => void) | undefined) => {
    zielInRuhe = wie;
  },
  melde: (wie: ((an: boolean) => void) | undefined) => {
    beiRuhe = wie;
    if (ruht) wie?.(true);
  },
  setze: (an: boolean) => {
    if (an === ruht) return;
    ruht = an;
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      // So breit ist der Scrollbalken der Seite (0, wo er über dem Inhalt schwebt: Handy, Mac).
      if (an && typeof window !== "undefined") html.style.setProperty("--rollbalken", `${Math.max(0, window.innerWidth - html.clientWidth)}px`);
      html.classList.toggle(RUHE_KLASSE, an);
      if (!an) html.style.removeProperty("--rollbalken");
    }
    beiRuhe?.(an);
  },
};
