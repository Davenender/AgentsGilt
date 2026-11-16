// Den Chat-Verlauf am Ende halten (Feinschliff-Runde 1, Punkt 4). Ohne React und ohne Browser, damit
// der Test (tests/chat-ende.test.ts) den Ablauf mit einer nachgestellten Liste prüfen kann.
//
// Regel: Neue Nachrichten (Assistent, Team, eigene) und alles, was danach noch wächst (die Blase,
// Karten darunter), halten die Liste am Ende. Wird die Liste selbst kleiner (Eingabefeld wächst,
// Tastatur am Handy), rückt sie nach. Hat der Besucher selbst hochgescrollt, bleibt sie stehen, bis
// er selbst etwas schreibt.
//
// Die Ursache des alten Fehlers: Jedes Scroll-Ereignis wurde bewertet, auch das zu unserem eigenen
// Nachziehen. Es kommt ein Bild später und wurde gegen die dann schon gewachsene Höhe gemessen.
// Wuchs der Inhalt dazwischen um mehr als 48 px (lange Antwort, Anruf-Karte), galt der Besucher als
// hochgescrollt, und nichts zog mehr nach. Jetzt zählt nur Scrollen, das nicht von uns kommt.

/** Was wir von der Liste brauchen (im Browser: das Element `.ag-cf__liste`). */
export type Liste = { scrollTop: number; readonly scrollHeight: number; readonly clientHeight: number };

/** Näher als so viele Pixel am Ende gilt als „am Ende“. */
export const AM_ENDE_PX = 48;

export function erstelleEndeHalter() {
  let amEnde = true;
  // Wohin wir zuletzt selbst gescrollt haben: Das Scroll-Ereignis dazu sagt nichts über den Besucher.
  let eigenesZiel = -1;
  const nachUnten = (el: Liste) => {
    el.scrollTop = el.scrollHeight;
    eigenesZiel = el.scrollTop;
  };
  return {
    get amEnde() {
      return amEnde;
    },
    nachUnten,
    /** Scroll-Ereignis der Liste. */
    gescrollt(el: Liste) {
      if (Math.abs(el.scrollTop - eigenesZiel) < 2) return;
      amEnde = el.scrollHeight - el.scrollTop - el.clientHeight < AM_ENDE_PX;
    },
    /** Inhalt oder Liste haben ihre Größe geändert. */
    groesse(el: Liste) {
      if (amEnde) nachUnten(el);
    },
    /**
     * Etwas Neues im Verlauf. `zurueck`: Der Besucher hat selbst geschrieben, das Formular für den
     * Mitarbeiter geöffnet oder das Fenster geöffnet: dann wieder ans Ende, auch wenn er hochgescrollt war.
     */
    neu(el: Liste, zurueck: boolean) {
      if (zurueck) amEnde = true;
      if (amEnde) nachUnten(el);
    },
  };
}

export type EndeHalter = ReturnType<typeof erstelleEndeHalter>;
