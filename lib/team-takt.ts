// Team-Takt (Etappe 2, 16.11.2026): cron-job.org ruft /api/team/takt jede Minute auf.
// Jeder Schritt läuft für sich (ein Fehler stoppt die anderen nicht) und erledigt nur, was fällig ist.
//   - Mail-Knopf: Ticket übernommen und der Kunde 3 Stunden still → Knopf „📧 Per E-Mail antworten“
//     (bzw. einmal der Hinweis, dass es keine Mail-Adresse gibt). Die Person, die übernommen hat, wird erwähnt.
//   - Freigabe-Erinnerung: Eine Mail wartet seit 2 Stunden auf David → einmal Push, nie von selbst senden.
//   - Recherche (Etappe 3): Mappen bauen, Fragen im Thread beantworten, nach 2 Tagen „In Arbeit“ nachhaken.
// Regeln: lib/mail-antwort.ts (mailKnopfFaellig), lib/team-takt-regeln.ts.
import { listMessages, messageLink } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { aendereKarte, call } from "@/lib/leads";
import { freigabeKnoepfe, KEIN_EMAIL, leseFreigabe, MAIL_HINWEIS, mailKnopf, mailKnopfFaellig, mitErinnert, ticketBesitzer } from "@/lib/mail-antwort";
import { pusheDavid } from "@/lib/ntfy";
import { erinnerungFaellig, kanalId, zeitAusId, type GildenKanal } from "@/lib/team-takt-regeln";
import { rechercheTakt } from "@/lib/recherche-handlers";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const feld = (e: EmbedLike, name: string) => e.fields?.find((f) => f.name === name)?.value ?? "";

async function mailKnoepfe(token: string, jetzt: number, kanaele: GildenKanal[]): Promise<number> {
  let gesetzt = 0;
  for (const k of kanaele.filter((c) => c.type === 0 && /^ticket-\d+$/.test(c.name))) {
    const nachrichten = await listMessages(token, k.id, 100);
    const karte = nachrichten.find((m) => m.author.bot && m.embeds[0]?.title?.startsWith("Support-Anfrage"));
    if (!karte) continue;
    const e = karte.embeds[0];
    const fall = mailKnopfFaellig(
      {
        status: feld(e, "Status"),
        kontakt: feld(e, "Kontakt"),
        kartenZeit: new Date(zeitAusId(karte.id)).toISOString(),
        nachrichten: nachrichten.map((m) => ({ zeit: new Date(zeitAusId(m.id)).toISOString(), bot: Boolean(m.author.bot), text: m.content ?? "" })),
      },
      jetzt,
    );
    if (!fall) continue;
    const besitzer = ticketBesitzer(e);
    const wer = besitzer ? ` <@${besitzer}>` : "";
    const ok = await call(token, "POST", `/channels/${k.id}/messages`, {
      content: (fall === "knopf" ? MAIL_HINWEIS : KEIN_EMAIL) + wer,
      allowed_mentions: { parse: [], users: besitzer ? [besitzer] : [] },
      ...(fall === "knopf" ? { components: [{ type: 1, components: [mailKnopf("ticket")] }] } : {}),
    });
    if (ok) gesetzt++;
  }
  return gesetzt;
}

async function freigabeErinnerungen(token: string, jetzt: number, kanal: string | null): Promise<number> {
  if (!kanal) return 0;
  let erinnert = 0;
  for (const m of await listMessages(token, kanal, 100)) {
    const e = m.embeds[0];
    const f = leseFreigabe(e);
    if (!e || !f || f.zustand !== "offen" || !erinnerungFaellig(zeitAusId(m.id), jetzt, f.erinnert)) continue;
    // Erst merken, dann pushen: lieber einmal zu wenig als jede Minute.
    if (!(await aendereKarte(token, kanal, m.id, mitErinnert(e), freigabeKnoepfe("offen")))) continue;
    await pusheDavid("📧 Mail wartet auf Freigabe", `Seit 2 Stunden: Mail an ${f.an}`, messageLink(kanal, m.id));
    erinnert++;
  }
  return erinnert;
}

export async function teamTakt(token: string, jetzt = new Date()): Promise<Record<string, number | string>> {
  const t = jetzt.getTime();
  const bericht: Record<string, number | string> = {};
  // Die Kanalliste nur EINMAL je Lauf holen: Discord erlaubt davon nur wenige kurz hintereinander (16.11.: 429).
  const kanaele = (await call<GildenKanal[]>(token, "GET", `/guilds/${GUILD_ID}/channels`)) ?? [];
  if (kanaele.length === 0) return { kanalliste: "fehlt (Discord bremst), nächste Minute wieder" };
  const schritte: [string, () => Promise<number | Record<string, number>>][] = [
    ["mailKnoepfe", () => mailKnoepfe(token, t, kanaele)],
    ["freigabeErinnerungen", () => freigabeErinnerungen(token, t, kanalId(kanaele, "posteingang"))],
    // Etappe 3: Recherche-Mappen bauen, Fragen im Thread beantworten, nach 2 Tagen nachhaken (zuletzt, dauert am längsten)
    ["recherche", () => rechercheTakt(token, t, kanalId(kanaele, "leads"))],
  ];
  for (const [name, schritt] of schritte) {
    try {
      const r = await schritt();
      if (typeof r === "number") bericht[name] = r;
      else for (const [k, v] of Object.entries(r)) bericht[`${name}.${k}`] = v;
    } catch (err) {
      console.error(`[team-takt] ${name} fehlgeschlagen:`, err);
      bericht[name] = "fehler";
    }
  }
  return bericht;
}
