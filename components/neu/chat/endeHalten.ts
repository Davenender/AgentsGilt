// Den Chat-Verlauf am Ende halten (Feinschliff-Runde 1, Punkt 4; in Prompt 18 neu gefasst). Ohne React und ohne
// Browser, damit der Test (tests/chat-ende.test.ts) den Ablauf mit einer nachgestellten Liste prüfen kann.
//
// Regel (Davids Vorgabe, Prompt 18): Kommt etwas Neues (Antwort des Assistenten, Team-Nachricht, eigene Nachricht,
// Karte, Folgefragen, Hinweis), steht der Chat immer ganz unten, auch während die Antwort noch wächst oder sich
// der Text aus Zeichen aufbaut. Wird die Liste selbst kleiner (Eingabefeld wächst, Tastatur am Handy), rückt sie
// nach. Ausnahme: Der Besucher scrollt gerade selbst (eine Eingabe in den letzten 2 s: Mausrad nach oben, Finger,
// Tasten, Scrollbalken). Dann zieht der Chat nicht dagegen; kam in der Zeit etwas Neues, geht es danach ans Ende.
//
// Die Ursache des alten Fehlers (gefunden am 23.11.2026): Jedes Scroll-Ereignis, das nicht genau auf unserem
// eigenen Ziel lag, galt als „Besucher hat hochgescrollt“, sobald die Liste mehr als 48 px vom Ende stand. Ab da
// zog nichts mehr nach, bis er selbst etwas schrieb: Die Antwort blieb mittendrin stehen. Ein Scroll-Ereignis sagt
// aber nicht, wer gescrollt hat (der Browser begrenzt die Lage, wenn der Inhalt kurz kleiner wird; ein Trackpad
// scrollt nach; ein kurzer Wisch, während der Assistent nachdenkt). Jetzt zählen nur Eingaben, und nur 2 s lang.

/** Was wir von der Liste brauchen (im Browser: das Element `.ag-cf__liste`). */
export type Liste = { scrollTop: number; readonly scrollHeight: number; readonly clientHeight: number };

/** So lange nach einer Eingabe gilt: Der Besucher scrollt gerade selbst. */
export const SELBST_MS = 2000;

export function erstelleEndeHalter(uhr: () => number = () => Date.now()) {
  // Bis dahin scrollt der Besucher selbst; kam in der Zeit Neues, geht es danach ans Ende.
  let selbstBis = 0;
  let ausstehend = false;
  const nachUnten = (el: Liste) => {
    el.scrollTop = el.scrollHeight;
  };
  const jetztSelbst = () => uhr() < selbstBis;
  return {
    /** Scrollt der Besucher gerade selbst (Eingabe in den letzten 2 s)? */
    get selbst() {
      return jetztSelbst();
    },
    nachUnten,
    /** Eine Eingabe des Besuchers, mit der er selbst scrollt (auch ein Scroll-Ereignis, solange er noch scrollt). */
    eingabe() {
      selbstBis = uhr() + SELBST_MS;
    },
    /** Inhalt oder Liste haben ihre Größe geändert. */
    groesse(el: Liste) {
      if (jetztSelbst()) ausstehend = true;
      else nachUnten(el);
    },
    /**
     * Etwas Neues im Verlauf. `sofort`: Der Besucher hat selbst geschrieben, das Formular für den Mitarbeiter
     * geöffnet oder das Fenster geöffnet: gleich ans Ende, auch wenn er eben noch gescrollt hat.
     */
    neu(el: Liste, sofort: boolean) {
      if (sofort) selbstBis = 0;
      if (jetztSelbst()) ausstehend = true;
      else nachUnten(el);
    },
    /** Nach den 2 s (Zeitgeber im Fenster): Kam in der Zeit Neues, jetzt ans Ende. */
    pruefe(el: Liste) {
      if (jetztSelbst() || !ausstehend) return;
      ausstehend = false;
      nachUnten(el);
    },
  };
}

export type EndeHalter = ReturnType<typeof erstelleEndeHalter>;
