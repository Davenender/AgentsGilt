// Ereignisse, mit denen sich Komponenten gegenseitig Bescheid geben, ohne
// voneinander abzuhängen. Hier zentral, damit Sender und Empfänger garantiert
// denselben Namen benutzen.

/**
 * Wird gefeuert, sobald die Sektion "Was wir machen" ins Bild kommt und dort
 * die Schreibmaschinen-Animation beginnt.
 *
 * Sender:   components/IntroTypewriter.tsx
 * Empfänger: components/ChatWidget.tsx (startet danach den Zähler für die
 *            Sprechblase, damit sie nicht mitten in die Schreibanimation platzt)
 */
export const INTRO_TYPING_STARTED = "ag:intro-typing-started";

/**
 * Wird gefeuert, sobald die Schreibmaschinen-Animation fertig durchgelaufen
 * ist und der letzte Buchstabe steht.
 *
 * Sender:    components/IntroTypewriter.tsx
 * Empfänger: components/ChatWidget.tsx (lässt danach kurz Luft und zeigt dann
 *            die Sprechblase)
 *
 * Warum ein eigenes Ereignis und keine feste Wartezeit: Wie lange getippt
 * wird, hängt an der Länge der Texte in `content.ts`. Eine geratene Zahl
 * müsste bei jeder Textänderung nachgezogen werden — und wenn man es vergisst,
 * platzt die Blase mitten in die Animation oder kommt viel zu spät.
 */
export const INTRO_TYPING_DONE = "ag:intro-typing-done";

/**
 * Trägt Angaben, die der Besucher im Chat genannt hat, ins Kontaktformular ein,
 * damit er sie nicht ein zweites Mal tippen muss.
 *
 * Sender:    components/ChatWidget.tsx (beim Klick auf "Anfrage schicken")
 * Empfänger: components/Contact.tsx
 *
 * Wichtig: Die Angaben stammen aus einem gesprochenen/getippten Chat und können
 * Tippfehler enthalten. Das Formular weist den Besucher deshalb sichtbar darauf
 * hin, die Felder noch einmal zu prüfen.
 */
export const PREFILL_CONTACT = "ag:prefill-contact";

export interface PrefillContactDetail {
  name?: string;
  email?: string;
  company?: string;
  /** Muss exakt einem Eintrag aus `services` in lib/content.ts entsprechen
   *  (oder "Sonstiges"), sonst greift die Vorauswahl im Dropdown nicht. */
  service?: string;
  message?: string;
}
