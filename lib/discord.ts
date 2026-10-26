import { createPublicKey, verify } from "node:crypto";

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

const API = "https://discord.com/api/v10";

/** Wandelt unser Format in das, was Discord als Embed erwartet (inkl. Kürzen). */
export function buildEmbed(embed: DiscordEmbed) {
  return {
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
  };
}

/**
 * Schickt eine Anruf-Meldung mit Knöpfen über den Bot in den Kanal.
 * Braucht DISCORD_BOT_TOKEN und die Kanal-ID. Fehlt eins davon, gibt die
 * Funktion false zurück, und der Aufrufer nimmt den Webhook (ohne Knöpfe).
 */
export async function postWithBot(
  token: string | undefined,
  channelId: string | undefined,
  body: { embeds: unknown[]; components: unknown[] },
): Promise<boolean> {
  if (!token || !channelId) return false;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify({ ...body, allowed_mentions: { parse: [] } }),
    });
    if (!res.ok) {
      console.error(`[discord] Bot-Nachricht fehlgeschlagen: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[discord] Bot-Nachricht fehlgeschlagen:", err);
    return false;
  }
}

/** Öffnet einen Faden an einer Nachricht (für den neuen Terminvorschlag). */
export async function createThread(
  token: string | undefined,
  channelId: string,
  messageId: string,
  name: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(
      `${API}/channels/${channelId}/messages/${messageId}/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${token}`,
        },
        body: JSON.stringify({ name: name.slice(0, 100), auto_archive_duration: 1440 }),
        // Discord erwartet die Antwort auf einen Knopfdruck binnen 3 Sekunden.
        signal: AbortSignal.timeout(1500),
      },
    );
    if (!res.ok) {
      console.error(`[discord] Faden konnte nicht angelegt werden: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[discord] Faden konnte nicht angelegt werden:", err);
    return false;
  }
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
        embeds: [buildEmbed(embed)],
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

// Ed25519-Schlüssel kommen von Discord als rohe 32 Byte (Hex). Node will sie als
// SPKI/DER, dafür gehört dieser feste Vorspann davor.
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKeyHex: string,
): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(timestamp + body),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
