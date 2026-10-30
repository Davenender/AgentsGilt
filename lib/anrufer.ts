import { listMessages } from "@/lib/discord";
import { PROPOSAL_FIELD, stateOf, type EmbedLike } from "@/lib/discord-calls";
import { toE164 } from "@/lib/termin";
import type { Vorschlag } from "@/lib/termin-kunde";

// Wiedererkennen von Anrufern für den Telefon-Assistenten.
//
// Die Nummer dient nur als Hinweis: Der Assistent fragt "Rufen Sie wegen <Firma> an?"
// und spricht Termine erst nach einem Ja an. Es kann ja jemand anderes am Telefon sein.

const KUNDEN_DB = process.env.NOTION_KUNDEN_DB || "94012175-c78b-41c9-8c2e-c0e21ea2889c";

/** Nummern vergleichen wir ohne Länderkennung, Leerzeichen und führende Null: die letzten 9 Ziffern. */
function schluessel(raw: string | undefined | null): string | null {
  const e = raw ? toE164(raw) : null;
  return e ? e.replace(/\D/g, "").slice(-9) : null;
}

/** Firma zur Nummer aus der Kunden-Datenbank in Notion. Nur wenn genau eine Firma passt. */
export async function firmaZurNummer(nummer: string | null | undefined): Promise<string | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  const key = schluessel(nummer);
  if (!token || !key) return null;

  const firmen = new Set<string>();
  let cursor: string | undefined;
  try {
    for (let seite = 0; seite < 5; seite++) {
      const res = await fetch(`https://api.notion.com/v1/databases/${KUNDEN_DB}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
          filter: { property: "Telefon", phone_number: { is_not_empty: true } },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        console.error(`[anrufer] Notion HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        results: { properties?: Record<string, { type?: string; title?: { plain_text?: string }[]; phone_number?: string | null }> }[];
        has_more?: boolean;
        next_cursor?: string | null;
      };
      for (const p of data.results) {
        const tel = p.properties?.["Telefon"]?.phone_number;
        if (schluessel(tel) !== key) continue;
        const titel = Object.values(p.properties ?? {}).find((x) => x?.type === "title");
        const name = (titel?.title ?? []).map((t) => t.plain_text ?? "").join("").trim();
        if (name) firmen.add(name);
      }
      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
    }
  } catch (err) {
    console.error("[anrufer] Notion nicht erreichbar:", err);
    return null;
  }
  return firmen.size === 1 ? [...firmen][0] : null;
}

type Geladen = Extract<Vorschlag, { ok: true }>;

function nummernDerKarte(embed: EmbedLike): (string | null)[] {
  const rueck = embed.fields?.find((f) => f.name === "Rückrufnummer")?.value;
  const imTitel = embed.title?.match(/\+?\d[\d\s()-]{7,}\d/)?.[0];
  return [schluessel(rueck), schluessel(imTitel)];
}

/**
 * Der Terminvorschlag, der für diese Nummer gerade auf eine Antwort wartet
 * (Karte in #anrufe im Zustand "proposed"). Bei mehreren: der neueste.
 */
export async function offenerVorschlag(nummer: string | null | undefined): Promise<Geladen | null> {
  const key = schluessel(nummer);
  const channel = process.env.DISCORD_CHANNEL_ANRUFE;
  if (!key || !channel) return null;

  const nachrichten = await listMessages(process.env.DISCORD_BOT_TOKEN, channel, 100);
  for (const m of nachrichten) {
    const embed = m.embeds?.[0];
    if (!embed || stateOf(embed) !== "proposed") continue;
    if (!nummernDerKarte(embed).includes(key)) continue;
    const termin = embed.fields?.find((f) => f.name === PROPOSAL_FIELD)?.value ?? "";
    if (!termin) continue;
    return { ok: true, messageId: m.id, embed, state: "proposed", termin };
  }
  return null;
}
