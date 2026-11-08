import { after, NextResponse } from "next/server";
import { z } from "zod";
import { escapeHtml, getMailEnv, sendMail, shell } from "@/lib/mail";
import { leiteAnfrageWeiter } from "@/lib/anfragen";
import { bearbeiteAnfrage } from "@/lib/kontakt-ablauf";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const contactSchema = z.object({
  // Der Name landet im Betreff der Mail: Zeilenumbrüche fliegen raus
  name: z.string().trim().min(1, "Bitte gib deinen Namen an").max(120).transform((n) => n.replace(/[\r\n\t]+/g, " ")),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail an").max(160),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  service: z.string().trim().max(160).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(1, "Bitte schreib uns kurz, worum es geht")
    .max(3000),
  // Honeypot gegen Spam-Bots: Menschen lassen es leer. Bots füllen es aus und bekommen unten still „ok“
  // (früher max(0): dann lehnte schon die Prüfung ab und der Bot sah eine Fehlermeldung)
  website: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  // Rate-Limit gegen Spam/Missbrauch: max. 5 Anfragen / Stunde pro IP
  const rl = rateLimit(`contact:${getClientIp(request)}`, 5, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuch es später noch einmal." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ungültige Eingaben" },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const { to } = getMailEnv();

  // Der Besucher sieht „Danke“ nur, wenn die Mail ans Team wirklich rausging (lib/kontakt-ablauf.ts, Tests in tests/kontakt.test.ts).
  // Spam-Falle ausgefüllt: still „ok“, ohne Mail und ohne Discord.
  const antwort = await bearbeiteAnfrage(data, {
    // Zusätzlich nach Discord: Die KI prüft auf Spam, echte Anfragen landen in #anfragen, Verdächtige zuerst in Davids
    // privatem #posteingang. Läuft nach der Antwort, auch wenn die Mail scheitert, damit keine Anfrage verloren geht.
    weiterleiten: (a) =>
      after(async () => {
        try {
          await leiteAnfrageWeiter(a);
        } catch (err) {
          console.error("[contact] Discord-Meldung fehlgeschlagen:", err);
        }
      }),
    // 1) Benachrichtigung an uns
    mailAnsTeam: () =>
      sendMail({
        to,
        replyTo: data.email,
        subject: `Neue Projekt-Anfrage von ${data.name}`,
        html: shell(
          "Neue Anfrage über die Website",
          `
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
            <tr><td style="padding:8px 0;color:#8a8579;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(data.name)}</td></tr>
            <tr><td style="padding:8px 0;color:#8a8579;">E-Mail</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
            ${data.company ? `<tr><td style="padding:8px 0;color:#8a8579;">Unternehmen</td><td style="padding:8px 0;">${escapeHtml(data.company)}</td></tr>` : ""}
            ${data.service ? `<tr><td style="padding:8px 0;color:#8a8579;">Leistung</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(data.service)}</td></tr>` : ""}
          </table>
          <p style="margin:20px 0 6px;font-weight:600;">Nachricht:</p>
          <p style="background:#faf9f6;padding:14px 16px;border-radius:10px;white-space:pre-wrap;margin:0;">${escapeHtml(data.message)}</p>
          <p style="margin:24px 0 0;color:#8a8579;font-size:13px;">Direkt auf diese Mail antworten — landet beim Interessenten.</p>
          `,
        ),
      }),
    // 2) Bestätigung an den Interessenten (nur wenn 1) geklappt hat)
    bestaetigung: () =>
      sendMail({
        to: data.email,
        subject: "Danke für deine Anfrage bei Agents Gilt",
        html: shell(
          "Danke für deine Nachricht!",
          `
          <p style="margin:0 0 16px;">Hallo ${escapeHtml(data.name)},</p>
          <p style="margin:0 0 16px;">danke für deine Anfrage bei Agents Gilt. Wir haben sie erhalten und melden uns persönlich bei dir — meist innerhalb eines Werktages.</p>
          <p style="margin:0 0 20px;">Bis gleich!</p>
          <p style="margin:0;color:#8a8579;font-size:13px;">Beste Grüße<br/>dein Team von Agents Gilt</p>
          `,
        ),
      }),
  });

  return NextResponse.json(antwort.body, { status: antwort.status });
}
