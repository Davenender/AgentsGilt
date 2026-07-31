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
