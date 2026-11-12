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
