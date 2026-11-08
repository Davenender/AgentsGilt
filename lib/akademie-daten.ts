import { call, alleNachrichten, teamRolle } from "@/lib/leads";
import { eigeneId, sperreKundenkanal } from "@/lib/kundenkanal";
import { leseBloecke } from "@/lib/notion-api";
import {
  inhaltsverzeichnis,
  kanalNamen,
  lektionAusNotion,
  lektionText,
  leseSpeicher,
  pfadKarte,
  pfadLektionen,
  privatRechte,
  rolleVon,
  seiten,
  zeileFrei,
  type Lektion,
  type Person,
} from "@/lib/akademie";
import type { EmbedLike } from "@/lib/discord-calls";

// Akademie: Notion lesen, Kanäle und Merkzettel in Discord (Plan 2, Etappe 1).

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
export const AKADEMIE_DB = process.env.NOTION_AKADEMIE_DB || "a003ad728d3741f7874216ac8ab030d2";
const KATEGORIE = "AKADEMIE";
const START = "akademie";
const SPEICHER = "akademie-speicher";
export const START_TITEL = "🎓 Akademie von Agents Gilt";

type Kanal = { id: string; name: string; type: number; parent_id?: string | null };

// ------------------------------------------------------------------ Notion

/** Alle Lektionen aus der Notion-Datenbank (null = Notion nicht erreichbar oder kein Zugriff). */
export async function holeLektionen(): Promise<Lektion[] | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  const out: Lektion[] = [];
  let cursor: string | undefined;
  try {
    do {
      const res = await fetch(`https://api.notion.com/v1/databases/${AKADEMIE_DB}/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[akademie] Lektionen lesen fehlgeschlagen: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { results?: Parameters<typeof lektionAusNotion>[0][]; has_more?: boolean; next_cursor?: string | null };
      for (const s of data.results ?? []) {
        const l = lektionAusNotion(s);
        if (l) out.push(l);
      }
      cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
    } while (cursor);
    return out;
  } catch (err) {
    console.error("[akademie] Lektionen lesen fehlgeschlagen:", err);
    return null;
  }
}

export async function holeSeiten(l: Lektion): Promise<string[] | null> {
  const bloecke = await leseBloecke(l.id);
  return bloecke ? seiten(lektionText(bloecke)) : null;
}

// ----------------------------------------------------------------- Discord

const alleKanaele = (token: string) => call<Kanal[]>(token, "GET", `/guilds/${GUILD_ID}/channels`);

async function kategorie(token: string, kanaele: Kanal[]): Promise<string | null> {
  const da = kanaele.find((c) => c.type === 4 && c.name.toLowerCase() === KATEGORIE.toLowerCase());
  if (da) return da.id;
  return (await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name: KATEGORIE, type: 4 }))?.id ?? null;
}

/** Der unsichtbare Merkzettel-Kanal (nur der Bot, David sieht ihn als Besitzer). */
async function speicherKanal(token: string): Promise<string | null> {
  const kanaele = (await alleKanaele(token)) ?? [];
  const da = kanaele.find((c) => c.type === 0 && c.name === SPEICHER);
  if (da) return da.id;
  const [kat, team, bot] = await Promise.all([kategorie(token, kanaele), teamRolle(token), eigeneId(token)]);
  if (!bot) return null;
  // Wie die privaten Kanäle, nur ohne Person: Es sieht ihn niemand außer dem Bot (und David als Besitzer).
  const rechte = privatRechte(bot, { everyone: GUILD_ID, team, bot }).slice(0, -1); // ohne den Eintrag „Person“ (das wäre der Bot selbst)
  return (
    (
      await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, {
        name: SPEICHER,
        type: 0,
        topic: "Merkzettel der Akademie (wer freigeschaltet ist, was gelesen ist). Nicht löschen.",
        ...(kat ? { parent_id: kat } : {}),
        permission_overwrites: rechte,
      })
    )?.id ?? null
  );
}

export async function leseAkademie(token: string): Promise<{ speicher: string; personen: Map<string, Person> } | null> {
  const speicher = await speicherKanal(token);
  if (!speicher) return null;
  return { speicher, personen: leseSpeicher(await alleNachrichten(token, speicher, 3000)) };
}

export const merke = (token: string, speicher: string, zeile: string) =>
  call(token, "POST", `/channels/${speicher}/messages`, { content: zeile, allowed_mentions: { parse: [] } });

const START_TEXT =
  "Hier lernt ihr Schritt für Schritt alles, was ihr für die Arbeit mit Kunden braucht: wie bei Duolingo, mit Lektionen, Tests und später Übungen.\n\n" +
  "**So geht es los:** Nach der Unterschrift der Vertraulichkeitsvereinbarung schaltet David euch frei. Dann bekommt jeder zwei eigene Kanäle, die nur er und David sehen:\n" +
  "• 📖 **Lernpfad**: Lektionen lesen, Tests machen, Schritt für Schritt weiter\n" +
  "• 📚 **Bibliothek**: alles, was ihr schon gelesen habt, zum Nachschlagen\n\n" +
  "Hier im Kanal wird nicht geschrieben.";

export const START_KNOEPFE = [
  {
    type: 1,
    components: [
      { type: 2, style: 1, label: "Person freischalten", emoji: { name: "🔓" }, custom_id: "ak:frei" },
      { type: 2, style: 2, label: "Mein Bereich (David)", emoji: { name: "🏠" }, custom_id: "ak:meins" },
    ],
  },
];

/** Kategorie, Startkanal mit Karte und Merkzettel anlegen (läuft mehrfach ohne Doppelungen). */
export async function richteEin(token: string): Promise<{ start: string | null; speicher: string | null }> {
  const speicher = await speicherKanal(token);
  const kanaele = (await alleKanaele(token)) ?? [];
  const kat = await kategorie(token, kanaele);
  let start = kanaele.find((c) => c.type === 0 && c.name === START)?.id ?? null;
  if (!start) {
    start = (await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name: START, type: 0, topic: "Die Akademie: lernen, testen, nachschlagen.", ...(kat ? { parent_id: kat } : {}) }))?.id ?? null;
  }
  if (!start) return { start, speicher };
  await sperreKundenkanal(token, start);
  const msgs = await alleNachrichten(token, start, 50);
  if (!msgs.some((m) => m.author.bot && m.embeds[0]?.title === START_TITEL)) {
    const msg = await call<{ id: string }>(token, "POST", `/channels/${start}/messages`, {
      embeds: [{ title: START_TITEL, description: START_TEXT, color: 0x8b5cf6 } as EmbedLike],
      components: START_KNOEPFE,
      allowed_mentions: { parse: [] },
    });
    if (msg) await call(token, "PUT", `/channels/${start}/pins/${msg.id}`);
  }
  return { start, speicher };
}

/** Schaltet eine Person frei: zwei private Kanäle, Pfad-Karte und Inhaltsverzeichnis. Doppelt geht nicht. */
export async function schalteFrei(token: string, userId: string, name: string): Promise<{ ok: true; person: Person; neu: boolean } | { ok: false; grund: string }> {
  const ak = await leseAkademie(token);
  if (!ak) return { ok: false, grund: "Der Merkzettel der Akademie ist nicht erreichbar." };
  const da = ak.personen.get(userId);
  if (da) return { ok: true, person: da, neu: false };
  const lektionen = await holeLektionen();
  if (!lektionen) return { ok: false, grund: "Die Akademie-Datenbank in Notion ist nicht erreichbar. Ist der Bot dort verbunden?" };

  const kanaele = (await alleKanaele(token)) ?? [];
  const [kat, team, bot] = await Promise.all([kategorie(token, kanaele), teamRolle(token), eigeneId(token)]);
  if (!bot) return { ok: false, grund: "Der Bot konnte sich nicht selbst finden." };
  const rechte = privatRechte(userId, { everyone: GUILD_ID, team, bot });
  const namen = kanalNamen(name);
  const lege = (n: string, topic: string) =>
    call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name: n, type: 0, topic, ...(kat ? { parent_id: kat } : {}), permission_overwrites: rechte });
  const lernpfad = await lege(namen.lernpfad, `Lernpfad von ${name}: Lektionen und Tests. Nur ${name} und David sehen diesen Kanal.`);
  const bibliothek = await lege(namen.bibliothek, `Bibliothek von ${name}: alles Gelesene zum Nachschlagen. Nur ${name} und David sehen diesen Kanal.`);
  if (!lernpfad || !bibliothek) return { ok: false, grund: "Die Kanäle konnten nicht angelegt werden (Rechte des Bots prüfen)." };

  const rolle = rolleVon(userId);
  const karte = pfadKarte(name, pfadLektionen(lektionen, rolle), new Set());
  const pfadMsg = await call<{ id: string }>(token, "POST", `/channels/${lernpfad.id}/messages`, { ...karte, allowed_mentions: { parse: [] } });
  const tocMsg = await call<{ id: string }>(token, "POST", `/channels/${bibliothek.id}/messages`, { embeds: [inhaltsverzeichnis(name, [])], allowed_mentions: { parse: [] } });
  if (!pfadMsg || !tocMsg) return { ok: false, grund: "Die Karten konnten nicht gepostet werden." };
  await call(token, "PUT", `/channels/${lernpfad.id}/pins/${pfadMsg.id}`);
  await call(token, "PUT", `/channels/${bibliothek.id}/pins/${tocMsg.id}`);
  await merke(token, ak.speicher, zeileFrei(userId, rolle, lernpfad.id, bibliothek.id, pfadMsg.id, tocMsg.id));
  return {
    ok: true,
    neu: true,
    person: { rolle, lernpfad: lernpfad.id, bibliothek: bibliothek.id, pfadMsg: pfadMsg.id, tocMsg: tocMsg.id, gelesen: new Set(), bib: new Map() },
  };
}
