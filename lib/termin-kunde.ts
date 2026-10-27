import { getMessage } from "@/lib/discord";
import {
  PROPOSAL_FIELD,
  stateOf,
  type CallState,
  type EmbedLike,
} from "@/lib/discord-calls";
import { linkSecret, pruefeCode } from "@/lib/termin";

// Was die Kundenseite (agentsgilt.com/t/...) über einen Terminvorschlag wissen darf.
// Der Stand steckt in der Discord-Meldung, hier wird sie nur gelesen.

export type Vorschlag =
  | { ok: true; messageId: string; embed: EmbedLike; state: CallState; termin: string }
  | { ok: false; grund: "ungueltig" | "nicht-gefunden" };

export async function ladeVorschlag(code: string): Promise<Vorschlag> {
  const secret = linkSecret();
  const messageId = secret ? pruefeCode(code, secret) : null;
  if (!messageId) return { ok: false, grund: "ungueltig" };

  const msg = await getMessage(
    process.env.DISCORD_BOT_TOKEN,
    process.env.DISCORD_CHANNEL_ANRUFE,
    messageId,
  );
  const embed = msg?.embeds?.[0];
  if (!embed) return { ok: false, grund: "nicht-gefunden" };

  const termin = embed.fields?.find((f) => f.name === PROPOSAL_FIELD)?.value ?? "";
  return { ok: true, messageId, embed, state: stateOf(embed), termin };
}
