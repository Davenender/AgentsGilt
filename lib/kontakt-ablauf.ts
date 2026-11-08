// Ablauf des Kontaktformulars, ohne Next.js und ohne echte Dienste, damit er sich testen lässt (tests/kontakt.test.ts).
// Regel: Der Besucher sieht „Danke“ nur, wenn die Mail ans Team wirklich rausging. Die Discord-Karte geht immer raus,
// damit keine Anfrage verloren geht (bei einem zweiten Versuch des Besuchers gibt es dann eben zwei Karten).

export type Anfrage = { name: string; email: string; company?: string; service?: string; message: string };
/** Was sendMail zurückgibt: Resend-Antwort mit `error` oder `{ skipped: true }`, wenn der Schlüssel fehlt. */
export type MailErgebnis = { error?: unknown; skipped?: boolean } | null | undefined;

export type KontaktDienste = {
  mailAnsTeam: (a: Anfrage) => Promise<MailErgebnis>;
  bestaetigung: (a: Anfrage) => Promise<MailErgebnis>;
  /** Plant die Weiterleitung nach Discord ein (läuft nach der Antwort). */
  weiterleiten: (a: Anfrage) => void;
  protokoll?: (text: string, fehler?: unknown) => void;
};

export type KontaktAntwort = { status: 200; body: { ok: true } } | { status: 502; body: { error: string } };

export const ZUSTELL_FEHLER = "Deine Anfrage konnte gerade nicht zugestellt werden. Bitte ruf uns kurz an oder schreib uns per WhatsApp.";
export const UNBEKANNTER_FEHLER = "Etwas ist schiefgelaufen. Bitte versuch es erneut.";
export const NETZ_FEHLER = "Verbindung fehlgeschlagen. Bitte versuch es später erneut.";

const fehlgeschlagen = (r: MailErgebnis) => !r || Boolean(r.error) || r.skipped === true;

/** Versucht eine Mail; liefert den Grund, wenn sie nicht rausging, sonst null. */
async function versuche(senden: () => Promise<MailErgebnis>): Promise<unknown> {
  try {
    const r = await senden();
    return fehlgeschlagen(r) ? (r?.error ?? (r?.skipped ? "übersprungen (RESEND_API_KEY fehlt)" : "keine Antwort")) : null;
  } catch (e) {
    return e;
  }
}

export async function bearbeiteAnfrage(daten: Anfrage & { website?: string }, d: KontaktDienste): Promise<KontaktAntwort> {
  const log = d.protokoll ?? ((text: string, fehler?: unknown) => console.error(text, fehler ?? ""));
  // Spam-Bot hat das versteckte Feld ausgefüllt: still „ok“, ohne Mail und ohne Discord
  if (daten.website) return { status: 200, body: { ok: true } };

  const anfrage: Anfrage = { name: daten.name, email: daten.email, company: daten.company || undefined, service: daten.service || undefined, message: daten.message };
  d.weiterleiten(anfrage);

  const teamFehler = await versuche(() => d.mailAnsTeam(anfrage));
  if (teamFehler !== null) {
    log("[contact] Mail ans Team NICHT zugestellt – Anfrage steht nur in Discord:", teamFehler);
    return { status: 502, body: { error: ZUSTELL_FEHLER } };
  }

  // Die Anfrage ist bei uns. Eine vertippte Adresse des Besuchers darf keinen Fehler mehr auslösen.
  const bestaetigungFehler = await versuche(() => d.bestaetigung(anfrage));
  if (bestaetigungFehler !== null) log("[contact] Bestätigungsmail an den Besucher fehlgeschlagen:", bestaetigungFehler);
  return { status: 200, body: { ok: true } };
}

/** Für das Formular: Antwort des Servers lesen, auch wenn sie kein JSON ist (z. B. eine Fehlerseite). */
export function antwortAuswerten(ok: boolean, text: string): { ok: true } | { error: string } {
  if (ok) return { ok: true };
  try {
    const j = JSON.parse(text) as { error?: unknown };
    if (typeof j?.error === "string" && j.error.trim()) return { error: j.error };
  } catch {}
  return { error: UNBEKANNTER_FEHLER };
}
