import { createTextChannel, findCategoryId, listMessages, postText } from "@/lib/discord";
import { aendereKarte, call, teamRolle } from "@/lib/leads";
import { setzeZustaendig } from "@/lib/notion-api";
import { CARD_MARKER } from "@/lib/notion-kunden";
import { alsMentions, bit, kanalRechte, KARTEN_KNOEPFE, mitZustaendig, SPERRE, wahrheit, type Overwrite } from "@/lib/zustaendige";

// Kundenkanäle (🔴knd_00X): nur der Bot schreibt dort (Karte und Änderungszeilen), alle anderen
// lesen und drücken Knöpfe. Wer zuständig ist, steht in der Karte und gilt auch für Notion.

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
/** Falls der Bot eines der Rechte aus SPERRE selbst nicht hat: wenigstens Schreiben und Threads sperren. */
const SPERRE_MIN = bit(11) | bit(35) | bit(36);

let botId: string | null = null;
async function eigeneId(token: string): Promise<string | null> {
  if (!botId) botId = (await call<{ id: string }>(token, "GET", "/users/@me"))?.id ?? null;
  return botId;
}

/** Setzt die Kanalrechte so, dass nur der Bot schreibt. Ändert nur, was noch fehlt. */
export async function sperreKundenkanal(token: string, kanal: string): Promise<boolean> {
  const [info, team, bot] = await Promise.all([
    call<{ permission_overwrites?: Overwrite[] }>(token, "GET", `/channels/${kanal}`),
    teamRolle(token),
    eigeneId(token),
  ]);
  if (!info || !bot) return false;
  let ok = true;
  let botDarf = true;
  for (const o of kanalRechte(info.permission_overwrites ?? [], { everyone: GUILD_ID, team, bot })) {
    // Ohne eigene Erlaubnis würde sich der Bot mit dem Verbot für alle selbst aussperren.
    if (o.id === GUILD_ID && !botDarf) continue;
    const pfad = `/channels/${kanal}/permissions/${o.id}`;
    let r = await call(token, "PUT", pfad, { type: o.type, allow: o.allow, deny: o.deny });
    if (r === null && o.id !== bot) {
      r = await call(token, "PUT", pfad, { type: o.type, allow: o.allow, deny: String((BigInt(o.deny) & ~SPERRE) | SPERRE_MIN) });
    }
    if (r === null) {
      ok = false;
      if (o.id === bot) botDarf = false;
    }
  }
  return ok;
}

/** Legt den Kundenkanal in der Kategorie KUNDEN an und sperrt ihn gleich. */
export async function legeKundenkanalAn(token: string, name: string, topic: string): Promise<string | null> {
  const kategorie = await findCategoryId(token, "KUNDEN");
  const id = await createTextChannel(token, name, kategorie, topic);
  if (id) await sperreKundenkanal(token, id);
  return id;
}

/** Die Kundenkarte im Kanal (erste Bot-Nachricht mit unserer Fußzeile). */
export async function findeKarte(token: string, kanal: string) {
  const messages = await listMessages(token, kanal, 100);
  return messages.find((m) => m.author.bot && m.embeds[0]?.footer?.text?.startsWith(CARD_MARKER)) ?? null;
}

export const hatKnopf = (components: unknown[] | undefined) => JSON.stringify(components ?? []).includes("knd:zust");

export const zustaendigHinweis = (ids: string[]) =>
  `↩️ **Zuständig** in Notion passte nicht zur Karte und ist wieder: ${alsMentions(ids)}. Ändern geht nur über den Knopf „👥 Zuständige“ an der Karte.`;

/**
 * Stündlicher Abgleich je Kunde: alte Karten bekommen das Feld und den Knopf, und ein von Hand
 * geändertes „Zuständig“ in Notion wird auf den Stand der Karte zurückgesetzt.
 */
export async function gleicheZustaendigAb(
  token: string,
  kanal: string,
  kunde: { notionUrl?: string | null; zustaendig?: string[] },
): Promise<"ok" | "keine Karte" | "zurückgesetzt" | "Notion-Fehler"> {
  const karte = await findeKarte(token, kanal);
  if (!karte) return "keine Karte";
  const w = wahrheit(karte.embeds[0], kunde.zustaendig ?? []);
  if (w.ausNotion || !hatKnopf(karte.components)) {
    await aendereKarte(token, kanal, karte.id, mitZustaendig(karte.embeds[0], w.ids), KARTEN_KNOEPFE);
  }
  if (!w.zuruecksetzen || !kunde.notionUrl) return "ok";
  if (!(await setzeZustaendig(kunde.notionUrl, w.ids))) return "Notion-Fehler";
  await postText(token, kanal, zustaendigHinweis(w.ids));
  return "zurückgesetzt";
}
