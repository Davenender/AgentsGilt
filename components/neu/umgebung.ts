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
