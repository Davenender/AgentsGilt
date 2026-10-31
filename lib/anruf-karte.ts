import { editMessage, listMessages, replyTo } from "@/lib/discord";
import {
  callComponents,
  mitAnrufId,
  OWNER_FIELD,
  ownerId,
  RUECKRUF_FIELD,
  stateOf,
  withField,
  type EmbedLike,
} from "@/lib/discord-calls";
import { toE164 } from "@/lib/termin";

// Ruft ein Kunde erneut an, solange seine Karte in #anrufe noch offen ist, wird diese Karte
// ergänzt, statt eine neue anzulegen. Nach "Erledigt" oder einer Bestätigung gibt es wieder eine neue.

/** Nummern vergleichen wir ohne Länderkennung, Leerzeichen und führende Null: die letzten 9 Ziffern. */
function schluessel(raw: string | undefined | null): string | null {
  const e = raw ? toE164(raw) : null;
  return e ? e.replace(/\D/g, "").slice(-9) : null;
}

function nummernDerKarte(embed: EmbedLike): (string | null)[] {
  const rueck = embed.fields?.find((f) => f.name === "Rückrufnummer")?.value;
  const imTitel = embed.title?.match(/\+?\d[\d\s()-]{7,}\d/)?.[0];
  return [schluessel(rueck), schluessel(imTitel)];
}

/** Die neueste noch offene Karte zu dieser Nummer (Rückrufnummer oder Anrufernummer). */
export async function offeneKarteZuNummer(nummer: string, passt: (embed: EmbedLike) => boolean = () => true) {
  const key = schluessel(nummer);
  const channel = process.env.DISCORD_CHANNEL_ANRUFE;
  if (!key || !channel) return null;

  const nachrichten = await listMessages(process.env.DISCORD_BOT_TOKEN, channel, 100);
  for (const m of nachrichten) {
    const embed = m.embeds?.[0];
    if (!embed) continue;
    const state = stateOf(embed);
    if (state === "done" || state === "confirmed") continue;
    if (!nummernDerKarte(embed).includes(key) || !passt(embed)) continue;
    return { messageId: m.id, embed, state };
  }
  return null;
}

/**
 * Hängt den neuen Anruf an die offene Karte des Kunden. Gibt false zurück, wenn es keine
 * passende Karte gibt oder das Ergänzen nicht klappt (dann legt der Aufrufer eine neue an).
 */
export async function ergaenzeKarte(
  nummer: string,
  info: { zeit: string; zusammenfassung: string; felder: [string, string][]; anrufId?: string },
): Promise<boolean> {
  const karte = await offeneKarteZuNummer(nummer);
  if (!karte) return false;
  const fields = karte.embed.fields ?? [];
  if (fields.length >= 24) return false;

  const zeilen = [
    info.zusammenfassung || "Keine Zusammenfassung vorhanden.",
    ...info.felder.filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v}`),
  ].join("\n");
  const value = zeilen.length > 1000 ? `${zeilen.slice(0, 997)}...` : zeilen;

  // Wartet noch ein geplanter Rückruf der KI, ist er überflüssig: der Kunde hat sich selbst gemeldet.
  const geplant = fields.some((f) => f.name === RUECKRUF_FIELD && f.value.includes("Geplant:"));
  const embed: EmbedLike = mitAnrufId({
    ...karte.embed,
    fields: [
      ...(geplant ? withField(fields, RUECKRUF_FIELD, "📞 Der Kunde hat selbst angerufen, kein weiterer Rückruf geplant.") : fields),
      { name: `📞 Erneuter Anruf (${info.zeit})`, value, inline: false },
    ],
  }, info.anrufId);
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_CHANNEL_ANRUFE;
  const ok = await editMessage(token, channel, karte.messageId, {
    embeds: [embed],
    components: callComponents(karte.state, Boolean(ownerId(karte.embed)), embed),
  });
  if (!ok) return false;
  const bearbeiter = karte.embed.fields?.find((f) => f.name === OWNER_FIELD)?.value;
  await replyTo(
    token,
    channel,
    karte.messageId,
    `📞 Der Kunde hat erneut angerufen. Das Neue steht in der Meldung.${bearbeiter ? ` (${bearbeiter})` : ""}`,
  );
  return true;
}
