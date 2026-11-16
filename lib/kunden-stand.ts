// Gültiger Stand der Kundenfelder (Etappe 6): privater Kanal „kunden-stand“ (nur David und der Bot), eine Karte je
// Kunde (Titel KND-Nr., JSON in der Beschreibung). Regeln: lib/notion-sperre.ts, Karte: lib/kunden-stand-zeile.ts.
import { nurDavidKanal } from "@/lib/akademie-daten";
import { aendereKarte, alleNachrichten, call, postKarte } from "@/lib/leads";
import { leseStandKarte, standKarte } from "@/lib/kunden-stand-zeile";
import { GESPERRT, standAus, type Stand } from "@/lib/notion-sperre";
import { parseKunde } from "@/lib/notion-kunden";

const KANAL = "kunden-stand";
const THEMA = "Merkzettel des Bots: gültiger Stand der Kundenfelder in Notion (Etappe 6). Nicht löschen, nicht ändern.";

export type StandEintrag = { id: string; stand: Stand | null };
export type Staende = { kanal: string; je: Map<string, StandEintrag> };

/** Alle Stände (neueste Karte je Kunde gilt). null, wenn der Kanal nicht erreichbar ist: dann lieber nichts tun. */
export async function ladeStaende(token: string): Promise<Staende | null> {
  const kanal = await nurDavidKanal(token, KANAL, THEMA);
  if (!kanal) return null;
  const je = new Map<string, StandEintrag>();
  for (const m of await alleNachrichten(token, kanal, 500)) {
    const nr = m.embeds?.[0]?.title?.trim() ?? "";
    if (!m.author?.bot || !/^KND-\d+$/.test(nr) || je.has(nr)) continue;
    je.set(nr, { id: m.id, stand: leseStandKarte(m.embeds[0])?.stand ?? null });
  }
  return { kanal, je };
}

/** Schreibt den Stand (ändert die vorhandene Karte oder legt eine an). */
export async function schreibeStand(token: string, s: Staende, nr: string, stand: Stand): Promise<boolean> {
  const karte = standKarte(nr, stand);
  const da = s.je.get(nr);
  const ok = da ? await aendereKarte(token, s.kanal, da.id, karte, []) : Boolean(await postKarte(token, s.kanal, karte, []));
  if (ok && !da) {
    // Die neue Karte gleich merken, damit derselbe Lauf keine zweite anlegt.
    const frisch = await ladeStaende(token);
    const id = frisch?.je.get(nr)?.id;
    if (id) s.je.set(nr, { id, stand });
  } else if (ok && da) s.je.set(nr, { id: da.id, stand });
  return ok;
}

/**
 * Nach einer Änderung durch den Bot selbst (Knöpfe, Stripe, Status von selbst): nur die geschriebenen Felder in den
 * Stand übernehmen. So hält der stündliche Abgleich sie nie für eine Änderung des Teams, auch wenn Notion keine
 * Meldung schickt. Fehlt der Stand noch, gilt die ganze Seite.
 */
export async function merkeBotFelder(token: string, seite: unknown, namen: string[]): Promise<void> {
  const kunde = parseKunde(seite);
  const felder = namen.filter((n) => GESPERRT.includes(n));
  if (!kunde?.nr || !felder.length) return;
  const s = await ladeStaende(token);
  if (!s) return;
  const neu = standAus(kunde.props);
  const alt = s.je.get(kunde.nr)?.stand;
  const stand: Stand = alt ? { ...alt, ...Object.fromEntries(felder.filter((n) => neu[n]).map((n) => [n, neu[n]])) } : neu;
  if (!alt || JSON.stringify(stand) !== JSON.stringify(alt)) await schreibeStand(token, s, kunde.nr, stand);
}

/** Kurze private Nachricht an eine Person (z. B. „Ich habe … zurückgesetzt“). */
export async function schreibePrivat(token: string, userId: string, text: string): Promise<boolean> {
  const dm = await call<{ id: string }>(token, "POST", "/users/@me/channels", { recipient_id: userId });
  return dm ? Boolean(await call(token, "POST", `/channels/${dm.id}/messages`, { content: text, allowed_mentions: { parse: [] } })) : false;
}
