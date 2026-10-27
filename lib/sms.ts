// SMS über Twilio. Der Absender ist ein Name statt einer Nummer ("AgentsGilt");
// der Kunde kann darauf nicht antworten, deshalb steht ein Link oder die
// Rückrufnummer im Text.
//
// Env-Vars (Vercel, Production, als Secret):
//   TWILIO_ACCOUNT_SID   beginnt mit "AC"
//   TWILIO_AUTH_TOKEN
// Optional:
//   TWILIO_SMS_FROM      Absendername oder Nummer, Standard "AgentsGilt"
//
// Fehlen die Zugangsdaten, wird nichts gesendet und der Aufrufer bekommt
// "not-configured" zurück.

export type SmsResult = { ok: true } | { ok: false; reason: string };

export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  // Beim Kopieren aus der Twilio-Konsole rutschen leicht Leerzeichen mit.
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return { ok: false, reason: "not-configured" };
  if (!sid.startsWith("AC")) {
    console.error(`[sms] TWILIO_ACCOUNT_SID beginnt mit "${sid.slice(0, 2)}" statt "AC"`);
    return { ok: false, reason: "TWILIO_ACCOUNT_SID muss mit AC beginnen" };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: process.env.TWILIO_SMS_FROM || "AgentsGilt",
          Body: body,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      // Twilio nennt Code und Grund im JSON; die Nummer und der Text stehen dort nicht drin.
      const err = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
      console.error(`[sms] Twilio-Fehler HTTP ${res.status}, Code ${err.code ?? "?"}: ${err.message ?? ""}`);
      return { ok: false, reason: `Twilio ${res.status}${err.code ? ` / ${err.code}` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[sms] Senden fehlgeschlagen:", err);
    return { ok: false, reason: "Verbindung zu Twilio fehlgeschlagen" };
  }
}

export function smsBestaetigung(termin: string): string {
  return `Ihr Termin am ${termin} ist bestätigt. Wir freuen uns auf das Gespräch!`;
}

export function smsVorschlag(termin: string, link: string, mitWunsch: boolean): string {
  const anfang = mitWunsch
    ? `Ihr Wunschtermin passt bei uns leider nicht. Wir schlagen ${termin} vor.`
    : `Wir schlagen Ihnen ${termin} für ein Gespräch vor.`;
  return `${anfang} Passt das? Antwort hier:\n${link}\n\nOder per Anruf unter +49 6108 9694027`;
}
