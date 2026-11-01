import { after, NextResponse } from "next/server";
import type { EmbedLike } from "@/lib/discord-calls";
import { istPosteingangsKarte, posteingangErledigt, posteingangKomponenten, posteingangMailId, posteingangQuelle } from "@/lib/anfragen";
import { aendereKarte, call, clip, sauber, setzeAntwort } from "@/lib/leads";
import { antworteAufMail } from "@/lib/mail-bruecke";
import { SHOW_NAMES } from "@/lib/support";

// Knopf "Antworten" unter Mail-Karten (Kundenkanal und #posteingang): Ein Fenster nimmt den Text auf, der Bot schickt
// die Antwort über das Google-Skript in der Gmail-Unterhaltung ab (aus kontakt@agentsgilt.com, mit dem Namen des Antwortenden).

export const MAIL_PREFIX = "mail:";
const MODAL_PREFIX = "mail:rs:";

export const antwortKnopf = () => ({ type: 2, label: "Antworten", style: 1, emoji: { name: "↩️" }, custom_id: `${MAIL_PREFIX}reply` });
export const antwortReihe = () => [{ type: 1, components: [antwortKnopf()] }];

/** Die Gmail-Nachrichten-ID steht in der Fußzeile der Karte. */
export function mailIdDerKarte(e: EmbedLike): string | null {
  return posteingangMailId(e) ?? e.footer?.text?.match(/Mail ([0-9a-f]{8,})/i)?.[1] ?? null;
}

function komponentenFuerKarte(e: EmbedLike): unknown[] {
  if (!istPosteingangsKarte(e)) return antwortReihe();
  return posteingangErledigt(e) ? [] : posteingangKomponenten(posteingangQuelle(e));
}

const zeit = () => new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export interface MailInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  data?: { custom_id?: string; components?: { components?: { custom_id: string; value?: string }[] }[] };
  member?: { user?: { id: string; username?: string; global_name?: string | null }; nick?: string | null };
  message?: { id: string; embeds?: EmbedLike[] };
}

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

export function handleMailAntwort(i: MailInteraction, token: string | undefined) {
  const user = i.member?.user;
  const channelId = i.channel_id;
  const appId = i.application_id;
  const itoken = i.token;
  const id = (i.data?.custom_id ?? "").slice(MAIL_PREFIX.length);
  if (!user || !token || !channelId || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt. Bitte nochmal versuchen.");

  // Knopf gedrückt: Fenster für den Text öffnen.
  if (id === "reply") {
    const karte = i.message?.embeds?.[0];
    const messageId = i.message?.id;
    if (!karte || !messageId) return ephemeral("Diese Karte ist nicht mehr aktuell.");
    if (!mailIdDerKarte(karte)) return ephemeral("Zu dieser Karte gibt es keine Mail zum Antworten. Bei älteren Karten fehlt die Verknüpfung, bitte direkt in Gmail antworten.");
    return NextResponse.json({
      type: 9,
      data: {
        custom_id: `${MODAL_PREFIX}${messageId}`,
        title: "Antwort per Mail",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "text",
                label: "Deine Antwort",
                style: 2,
                required: true,
                min_length: 3,
                max_length: 3000,
                placeholder: "Hallo …  (Gruß und Unterschrift werden automatisch angehängt)",
              },
            ],
          },
        ],
      },
    });
  }

  // Fenster abgeschickt: Antwort senden.
  if (i.type === 5 && id.startsWith("rs:")) {
    const kartenId = id.slice("rs:".length);
    const text = (i.data?.components?.[0]?.components?.[0]?.value ?? "").trim();
    if (text.length < 3) return ephemeral("Die Antwort war leer.");
    const name = SHOW_NAMES[user.id] ?? i.member?.nick ?? user.global_name ?? user.username ?? "Agents Gilt";
    after(async () => {
      const msg = await call<{ embeds?: EmbedLike[] }>(token, "GET", `/channels/${channelId}/messages/${kartenId}`);
      const karte = msg?.embeds?.[0];
      const mailId = karte ? mailIdDerKarte(karte) : null;
      if (!karte || !mailId) return void (await setzeAntwort(appId, itoken, "⚠️ Diese Karte gibt es nicht mehr oder sie hat keine Mail dahinter."));
      const res = await antworteAufMail(mailId, text, name);
      if (!res.ok) {
        return void (await setzeAntwort(appId, itoken, `⚠️ Die Antwort ist **nicht** gesendet worden: ${res.fehler}\nDein Text zum Kopieren:\n\`\`\`\n${text.slice(0, 1500)}\n\`\`\``));
      }
      // Auf der Karte vermerken, wer wann geantwortet hat.
      const fields = karte.fields ?? [];
      if (fields.length < 24) {
        const neu: EmbedLike = {
          ...karte,
          fields: [...fields, { name: `↩️ Beantwortet von ${name} (${zeit()})`, value: sauber(clip(text, 900)), inline: false }],
        };
        await aendereKarte(token, channelId, kartenId, neu, komponentenFuerKarte(neu));
      }
      await setzeAntwort(appId, itoken, "✅ Die Antwort ist raus. Sie steht in der Gmail-Unterhaltung und geht an den Absender der Mail.");
    });
    return NextResponse.json({ type: 5, data: { flags: 64 } });
  }

  return NextResponse.json({ ok: true });
}
