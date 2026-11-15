// Übernahme von Angaben aus dem Chat ins Kontaktformular der neuen Seite (components/neu/Anfrage.tsx):
// reine Regel, damit Formular und Tests dasselbe benutzen. Tests: tests/anfrage-uebernahme.test.ts.
import type { PrefillContactDetail } from "./events";

export type AnfrageFelder = { name: string; email: string; company: string; service: string; message: string };

/**
 * Trägt Angaben aus dem Chat in die Felder ein. Es gilt wie bisher: Nur leere Felder werden
 * gefüllt (was der Besucher selbst getippt hat, bleibt), und eine Leistung nur, wenn es sie in der
 * Auswahl wirklich gibt.
 *
 * `gefuellt` sagt, ob dabei mindestens ein Feld wirklich einen Wert bekommen hat. Nur dann öffnet
 * sich das Formular: Eine leere Übergabe (oder eine, die nichts Neues bringt) öffnet nichts.
 */
export function uebernimm(felder: AnfrageFelder, angaben: PrefillContactDetail | null | undefined, leistungen: readonly string[]): { felder: AnfrageFelder; gefuellt: boolean } {
  const neu = { ...felder };
  let gefuellt = false;
  if (!angaben || typeof angaben !== "object") return { felder: neu, gefuellt };
  for (const feld of ["name", "email", "company", "message"] as const) {
    const wert = angaben[feld];
    if (typeof wert !== "string" || !wert.trim() || neu[feld].trim()) continue;
    neu[feld] = wert.trim();
    gefuellt = true;
  }
  const leistung = angaben.service;
  if (typeof leistung === "string" && leistungen.includes(leistung) && !neu.service) {
    neu.service = leistung;
    gefuellt = true;
  }
  return { felder: neu, gefuellt };
}
