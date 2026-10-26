// Meldungen in den Discord-Server schicken, über einen Webhook pro Kanal.
// Die Webhook-Adresse ist ein Geheimnis (wer sie kennt, kann in den Kanal
// schreiben) und steht deshalb nur als Env-Var in Vercel, nie im Code.
//
// Wie mail.ts degradiert das sauber: ohne Env-Var wird nur geloggt, und ein
// Fehler hier darf nie den eigentlichen Ablauf (z.B. die Anruf-Mail) stören.

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  fields?: DiscordField[];
  footer?: string;
}

// Discord lehnt zu lange Texte komplett ab, statt zu kürzen. Grenzen laut
// Discord: Titel 256, Beschreibung 4096, Feldname 256, Feldwert 1024.
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function sendDiscord(
  webhookUrl: string | undefined,
  embed: DiscordEmbed,
): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!webhookUrl) {
    console.warn(`[discord] Webhook fehlt, Meldung "${embed.title}" wird übersprungen`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Agents Gilt",
        // Niemand soll durch Inhalte aus dem Gespräch angepingt werden
        // (@everyone, @here, Rollen), auch wenn der Anrufer so etwas sagt.
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: clip(embed.title, 256),
            description: embed.description ? clip(embed.description, 4096) : undefined,
            url: embed.url,
            color: 0xd4a23c, // Gold aus dem Logo
            fields: embed.fields
              ?.filter((f) => f.value.trim())
              .slice(0, 25)
              .map((f) => ({
                name: clip(f.name, 256),
                value: clip(f.value, 1024),
                inline: f.inline ?? false,
              })),
            footer: embed.footer ? { text: clip(embed.footer, 2048) } : undefined,
          },
        ],
      }),
    });

    if (!res.ok) {
      // Nur den Statuscode loggen, die Antwort könnte die Adresse spiegeln.
      console.error(`[discord] Webhook-Fehler für "${embed.title}": HTTP ${res.status}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[discord] Senden fehlgeschlagen für "${embed.title}":`, err);
    return { ok: false };
  }
}
