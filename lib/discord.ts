import { createPublicKey, verify } from "node:crypto";
import type { EmbedLike } from "@/lib/discord-calls";

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

const NO_MENTIONS = { parse: [] as string[] };

function botHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bot ${token}` };
}

/** Liest eine Nachricht aus dem Kanal (für die Kundenseite). */
export async function getMessage(
  token: string | undefined,
  channelId: string | undefined,
  messageId: string,
): Promise<{ id: string; embeds: EmbedLike[] } | null> {
  if (!token || !channelId) return null;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
      headers: botHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as { id: string; embeds: EmbedLike[] };
  } catch (err) {
    console.error("[discord] Nachricht lesen fehlgeschlagen:", err);
    return null;
  }
}

/** Ändert Embed und Knöpfe einer bestehenden Nachricht. */
export async function editMessage(
  token: string | undefined,
  channelId: string | undefined,
  messageId: string,
  body: { embeds: unknown[]; components: unknown[] },
): Promise<boolean> {
  if (!token || !channelId) return false;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      headers: botHeaders(token),
      body: JSON.stringify({ ...body, allowed_mentions: NO_MENTIONS }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[discord] Nachricht ändern fehlgeschlagen: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("[discord] Nachricht ändern fehlgeschlagen:", err);
    return false;
  }
}

/** Schreibt eine kurze Antwort unter die Meldung, damit der Kanal aufleuchtet. */
export async function replyTo(
  token: string | undefined,
  channelId: string | undefined,
  messageId: string,
  content: string,
): Promise<void> {
  if (!token || !channelId) return;
  try {
    const res = await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: botHeaders(token),
      body: JSON.stringify({
        content,
        message_reference: { message_id: messageId, fail_if_not_exists: false },
        allowed_mentions: NO_MENTIONS,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[discord] Antwort fehlgeschlagen: HTTP ${res.status}`);
  } catch (err) {
    console.error("[discord] Antwort fehlgeschlagen:", err);
  }
}

/** Ändert die Nachricht, unter der ein Knopf gedrückt wurde (nach verzögerter Antwort). */
export async function editInteractionOriginal(
  applicationId: string,
  interactionToken: string,
  body: { embeds: unknown[]; components: unknown[] },
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API}/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, allowed_mentions: NO_MENTIONS }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) console.error(`[discord] Original ändern fehlgeschlagen: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("[discord] Original ändern fehlgeschlagen:", err);
    return false;
  }
}

/** Nachricht, die nur der sieht, der geklickt hat (nach verzögerter Antwort). */
export async function followupPrivate(
  applicationId: string,
  interactionToken: string,
  content: string,
): Promise<void> {
  try {
    await fetch(`${API}/webhooks/${applicationId}/${interactionToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, flags: 64 }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[discord] Rückmeldung fehlgeschlagen:", err);
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
