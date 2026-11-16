import { Resend } from "resend";

let cachedResend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedResend) cachedResend = new Resend(key);
  return cachedResend;
}

export function getMailEnv() {
  // MAIL_FROM muss eine Adresse auf einer in Resend verifizierten Domain sein,
  // z.B. "Agents Gilt <kontakt@agentsgilt.com>"
  const from = process.env.MAIL_FROM || "Agents Gilt <onboarding@resend.dev>";
  const to = process.env.MAIL_TO || "kontakt@agentsgilt.com";
  return { from, to };
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface MailOptionen {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Kopie, z. B. an kontakt@agentsgilt.com, damit gesendete Team-Mails in Gmail stehen (Etappe 2). */
  bcc?: string | string[];
}

/** Was an Resend geht. Bcc nur, wenn gesetzt. */
export function resendNutzlast(opts: MailOptionen, from: string) {
  return {
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    replyTo: opts.replyTo,
    ...(opts.bcc ? { bcc: opts.bcc } : {}),
  };
}

export async function sendMail(opts: MailOptionen) {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[mail] RESEND_API_KEY fehlt — Mail "${opts.subject}" an ${opts.to} wird übersprungen`,
    );
    return { id: null, skipped: true };
  }
  const { from } = getMailEnv();
  const res = await resend.emails.send(resendNutzlast(opts, from));
  if (res.error) {
    console.error(
      `[mail] Resend-Fehler für "${opts.subject}" → ${opts.to}: ${JSON.stringify(res.error, Object.getOwnPropertyNames(res.error))}`,
    );
  } else {
    console.log(`[mail] gesendet "${opts.subject}" → ${opts.to} (id=${res.data?.id})`);
  }
  return res;
}

// E-Mail-Grundgerüst im Agents-Gilt-Look
export function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0c0e14;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14171f;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #efece4;">
      <div style="font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#b8842b;margin-bottom:6px;font-weight:700;">Agents Gilt</div>
      <h1 style="font-size:24px;margin:0 0 20px;color:#0c0e14;">${escapeHtml(title)}</h1>
      ${body}
      <hr style="border:none;border-top:1px solid #efece4;margin:28px 0 16px;" />
      <p style="font-size:12px;color:#8a8579;margin:0;">Agents Gilt · agentsgilt.com · kontakt@agentsgilt.com</p>
    </div></body></html>`;
}
