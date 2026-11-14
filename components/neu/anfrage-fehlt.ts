// Fehlende Pflichtfelder im Anfrage-Formular der neuen Seite: reine Regeln, ohne Browser.
// Geprüft wird weiter vom Browser (required, type="email"); hier steht nur, welcher Satz unter
// welchem Feld erscheint und wie lange er gilt. Tests: tests/anfrage-fehlt.test.ts.

export type Pflichtfeld = "name" | "email" | "message";

export type FehlSaetze = { name: string; email: string; emailFalsch: string; message: string };

/** Ist das ein Pflichtfeld mit eigener Anzeige? */
export function istPflichtfeld(name: string): name is Pflichtfeld {
  return name === "name" || name === "email" || name === "message";
}

/**
 * Der Satz unter einem Feld, das der Browser beim Absenden als ungültig meldet.
 * `leer`: Das Feld ist leer (sonst ist es ausgefüllt, aber ungültig: Das gibt es nur bei der E-Mail).
 */
export function fehlSatz(feld: Pflichtfeld, leer: boolean, saetze: FehlSaetze): string {
  return feld === "email" && !leer ? saetze.emailFalsch : saetze[feld];
}

/**
 * Gilt eine Meldung noch? „Fehlt“ gilt nur, solange das Feld leer ist: Füllt es jemand anders aus
 * als der Besucher selbst (Übernahme aus dem Chat), verschwindet der rote Schein auch ohne Tippen.
 * „Bitte prüfen“ (E-Mail ausgefüllt, aber ungültig) gilt, bis das Feld beim Tippen gültig wird;
 * das räumt das Formular selbst ab.
 */
export function meldungGilt(feld: Pflichtfeld, meldung: string | undefined, wert: string, saetze: FehlSaetze): boolean {
  if (!meldung) return false;
  if (feld === "email" && meldung === saetze.emailFalsch) return true;
  return wert === "";
}
