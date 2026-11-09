import { call, alleNachrichten, teamRolle } from "@/lib/leads";
import { eigeneId, sperreKundenkanal } from "@/lib/kundenkanal";
import { leseBloecke } from "@/lib/notion-api";
import {
  ANZEIGE,
  bibliothekKarte,
  fortschritt,
  frageAusNotion,
  kanalNamen,
  lektionAusNotion,
  lektionText,
  leseSpeicher,
  pfadKarte,
  pfadLektionen,
  wissenSeiten,
  privatRechte,
  rolleVon,
  schritte,
  seiten,
  verwaltungKarte,
  zeileFrei,
  zeileUebKanal,
  type Lektion,
  type Person,
  type Testfrage,
} from "@/lib/akademie";
import { snowflakeZeit } from "@/lib/statistik";
import { TEAM } from "@/lib/zustaendige";
import { sichtbareUebungen, uebungAusNotion, uebungKarte, type Uebung } from "@/lib/uebung";
import type { EmbedLike } from "@/lib/discord-calls";

// Akademie: Notion lesen, Kanäle, Karten und Merkzettel in Discord (Plan 2).
// Jeder aus dem Team (David, Jakob, Mijo) hat seinen Lernpfad und seine Bibliothek, ohne Freischalten.

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
export const AKADEMIE_DB = process.env.NOTION_AKADEMIE_DB || "a003ad728d3741f7874216ac8ab030d2";
const KATEGORIE = "AKADEMIE";
const START = "akademie";
const SPEICHER = "akademie-speicher";
const VERWALTUNG = "akademie-verwaltung";
export const START_TITEL = "🎓 Akademie von Agents Gilt";
const VERWALTUNG_TITEL_ALT = "🔧 Akademie verwalten";

type Kanal = { id: string; name: string; type: number; parent_id?: string | null };
export type Inhalt = { lektionen: Lektion[]; fragen: Testfrage[]; uebungen: Uebung[] };

export const nameVon = (id: string) => TEAM.find((t) => t.discord === id)?.name ?? "Person";

// ------------------------------------------------------------------ Notion

/** Lektionen und Testfragen aus der Notion-Datenbank (null = Notion nicht erreichbar oder kein Zugriff). */
export async function holeInhalt(): Promise<Inhalt | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  const lektionen: Lektion[] = [];
  const fragen: Testfrage[] = [];
  const uebungen: Uebung[] = [];
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
        console.error(`[akademie] Notion lesen fehlgeschlagen: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { results?: Parameters<typeof lektionAusNotion>[0][]; has_more?: boolean; next_cursor?: string | null };
      for (const s of data.results ?? []) {
        const l = lektionAusNotion(s);
        if (l) lektionen.push(l);
        const f = frageAusNotion(s);
        if (f) fragen.push(f);
        const u = uebungAusNotion(s);
        if (u) uebungen.push(u);
      }
      cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
    } while (cursor);
    return { lektionen, fragen, uebungen };
  } catch (err) {
    console.error("[akademie] Notion lesen fehlgeschlagen:", err);
    return null;
  }
}

export async function holeText(l: Lektion): Promise<string | null> {
  const bloecke = await leseBloecke(l.id);
  return bloecke ? lektionText(bloecke) : null;
}

export async function holeSeiten(l: Lektion): Promise<string[] | null> {
  const t = await holeText(l);
  return t === null ? null : seiten(t);
}

export const schritteVon = (p: Person, inhalt: Inhalt) => schritte(pfadLektionen(inhalt.lektionen, p.rolle), inhalt.fragen, p.rolle);
export const gelesenVon = (p: Person, inhalt: Inhalt) => pfadLektionen(inhalt.lektionen, p.rolle).filter((l) => p.gelesen.has(l.id));
/** Was in der Bibliothek steht: gelesene Lektionen und das Branchenwissen. */
export const bibliothekVon = (p: Person, inhalt: Inhalt) => [...gelesenVon(p, inhalt), ...wissenSeiten(inhalt.lektionen, p.rolle)];

// ----------------------------------------------------------------- Discord

const alleKanaele = (token: string) => call<Kanal[]>(token, "GET", `/guilds/${GUILD_ID}/channels`);

async function kategorie(token: string, kanaele: Kanal[]): Promise<string | null> {
  const da = kanaele.find((c) => c.type === 4 && c.name.toLowerCase() === KATEGORIE.toLowerCase());
  if (da) return da.id;
  return (await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name: KATEGORIE, type: 4 }))?.id ?? null;
}

/** Ein Kanal, den außer dem Bot nur David sieht (als Serverbesitzer). */
async function nurDavidKanal(token: string, name: string, topic: string): Promise<string | null> {
  const kanaele = (await alleKanaele(token)) ?? [];
  const da = kanaele.find((c) => c.type === 0 && c.name === name);
  if (da) return da.id;
  const [kat, team, bot] = await Promise.all([kategorie(token, kanaele), teamRolle(token), eigeneId(token)]);
  if (!bot) return null;
  // Wie die privaten Kanäle, nur ohne Person (das wäre der Bot selbst).
  const rechte = privatRechte(bot, { everyone: GUILD_ID, team, bot }).slice(0, -1);
  return (await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name, type: 0, topic, ...(kat ? { parent_id: kat } : {}), permission_overwrites: rechte }))?.id ?? null;
}

const speicherKanal = (token: string) => nurDavidKanal(token, SPEICHER, "Merkzettel der Akademie (Bereiche, Gelesenes, Tests). Nicht löschen.");
const verwaltungKanal = (token: string) => nurDavidKanal(token, VERWALTUNG, "Nur für David: Fortschritt von Mijo, Jakob und David in der Akademie.");

export async function leseAkademie(token: string): Promise<{ speicher: string; personen: Map<string, Person> } | null> {
  const speicher = await speicherKanal(token);
  if (!speicher) return null;
  return { speicher, personen: leseSpeicher(await alleNachrichten(token, speicher, 3000)) };
}

export const merke = (token: string, speicher: string, zeile: string) =>
  call(token, "POST", `/channels/${speicher}/messages`, { content: zeile, allowed_mentions: { parse: [] } });

const START_TEXT = [
  "Hier lernt ihr Schritt für Schritt alles, was ihr für die Arbeit mit Kunden braucht. Mit Lektionen, Tests und Übungen, aufgebaut wie bei Duolingo.",
  "",
  "**Eure Kanäle**",
  "Jeder hat zwei eigene Kanäle, die nur er sehen kann:",
  "• 📖 **Lernpfad**: Hier lernst du.",
  "• 📚 **Bibliothek**: Hier schlägst du nach, was du schon gelernt hast.",
  "",
  "**📖 So funktioniert der Lernpfad**",
  "1. Oben im Kanal steht deine Karte mit allen Einheiten und Lektionen: ✅ fertig · 📖 jetzt dran · 🔒 noch gesperrt. Der Balken zeigt, wie weit du bist.",
  "2. Drück **„📖 Weiterlernen“**. Die nächste Lektion erscheint, und nur du siehst sie.",
  "3. Lies sie in Ruhe. Mit **„Weiter ▶“** und **„◀ Zurück“** blätterst du zwischen den Seiten.",
  "4. Auf der letzten Seite drückst du **„✅ Gelesen“**. Die Lektion verschwindet, ist auf deiner Karte abgehakt und steht ab jetzt in deiner Bibliothek. Die nächste ist frei.",
  "5. Mit **„📖 Weiterlernen“** geht es weiter, so lange du willst.",
  "",
  "**🔁 Wiederholen**",
  "Unter deiner Karte kannst du jede Lektion auswählen, die du schon gelesen hast. Sie erscheint dann komplett auf einmal, nur für dich.",
  "",
  "**📝 Tests**",
  "• Nach der letzten Lektion einer Einheit kommt ein kurzer Test. Bei jeder Frage klickst du auf A, B, C oder D. Alle Antworten stehen in den Lektionen davor.",
  "• Ab **80 %** richtig ist der Test bestanden, und die nächste Einheit wird frei.",
  "• Unter 80 % zeigt dir der Bot, welche Fragen falsch waren, was richtig gewesen wäre und welche Lektionen du nochmal lesen solltest. Mit **„📖 … nochmal lesen“** öffnest du sie direkt, mit **„🔁 Test wiederholen“** startest du neu. Das geht sofort und so oft du willst.",
  "",
  "**📚 So funktioniert die Bibliothek**",
  "• Oben steht das Inhaltsverzeichnis mit allem, was du schon gelesen hast, nach Einheiten geordnet.",
  "• Wählst du darunter eine Lektion aus, erscheint sie komplett im Kanal. Du kannst mehrere gleichzeitig öffnen.",
  "• **🔎 Suchen**: Gib ein Stichwort ein, zum Beispiel „Retainer“ oder „Friseur“. Du bekommst alle gelesenen Lektionen, in denen es vorkommt, mit einem kurzen Ausschnitt, und kannst sie direkt öffnen.",
  "• **🧹 Aufräumen**: nimmt alle angezeigten Lektionen wieder weg. Das Inhaltsverzeichnis bleibt, und du kannst jede Lektion jederzeit wieder öffnen.",
  "• **📘 Branchenwissen**: Ganz unten im Inhaltsverzeichnis stehen Seiten zu einzelnen Branchen (Ärzte, Handwerker, Restaurants …). Dort steht, was Betriebe dieser Branche oft brauchen und worauf es ankommt. Diese Seiten sind von Anfang an da, ohne Lernpfad und ohne Test. Lies die passende Seite vor einem Kundengespräch. Die Suche findet sie auch.",
  "",
  "**Gut zu wissen**",
  "• In den Akademie-Kanälen schreibt nur der Bot, ihr drückt Knöpfe.",
  "• 🎭 **Übungen**: Jeder hat dazu einen dritten Kanal, 🎭uebungen-<name>. Dort übst du Kundengespräche mit einem KI-Kunden, sobald du den Test von Einheit 6 bestanden hast. Wie das geht, steht oben in deinem Übungskanal.",
  "• Fragen oder klappt etwas nicht? In #allgemein schreiben.",
].join("\n");

/** Lernpfad- und Bibliothek-Karte einer Person neu zeichnen. */
export async function zeichne(token: string, userId: string, p: Person, inhalt: Inhalt) {
  const name = nameVon(userId);
  await call(token, "PATCH", `/channels/${p.lernpfad}/messages/${p.pfadMsg}`, { ...pfadKarte(name, schritteVon(p, inhalt), p.gelesen, p.bestanden), allowed_mentions: { parse: [] } });
  await call(token, "PATCH", `/channels/${p.bibliothek}/messages/${p.tocMsg}`, { ...bibliothekKarte(name, bibliothekVon(p, inhalt)), allowed_mentions: { parse: [] } });
}

/** Die Karte oben im Übungskanal einer Person neu zeichnen. */
export async function zeichneUebung(token: string, userId: string, p: Person, inhalt: Inhalt) {
  if (!p.uebKanal) return;
  await call(token, "PATCH", `/channels/${p.uebKanal.kanal}/messages/${p.uebKanal.karte}`, {
    ...uebungKarte(nameVon(userId), sichtbareUebungen(inhalt.uebungen, p.rolle), p),
    allowed_mentions: { parse: [] },
  });
}

/** Legt den Übungskanal einer Person an (doppelt geht nicht). */
async function legeUebungAn(token: string, speicher: string, userId: string, p: Person, inhalt: Inhalt): Promise<Person["uebKanal"] | null> {
  const kanaele = (await alleKanaele(token)) ?? [];
  const [kat, team, bot] = await Promise.all([kategorie(token, kanaele), teamRolle(token), eigeneId(token)]);
  if (!bot) return null;
  const name = nameVon(userId);
  const kanal = await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, {
    name: kanalNamen(name).uebungen,
    type: 0,
    topic: `Übungen von ${name}: Kundengespräche mit einem KI-Kunden. Nur ${name} und David sehen diesen Kanal.`,
    ...(kat ? { parent_id: kat } : {}),
    permission_overwrites: privatRechte(userId, { everyone: GUILD_ID, team, bot }),
  });
  if (!kanal) return null;
  const karte = await call<{ id: string }>(token, "POST", `/channels/${kanal.id}/messages`, {
    ...uebungKarte(name, sichtbareUebungen(inhalt.uebungen, p.rolle), p),
    allowed_mentions: { parse: [] },
  });
  if (!karte) return null;
  await call(token, "PUT", `/channels/${kanal.id}/pins/${karte.id}`);
  await merke(token, speicher, zeileUebKanal(userId, kanal.id, karte.id));
  return { kanal: kanal.id, karte: karte.id };
}

/** Die Fortschritts-Karte in #akademie-verwaltung (nur David) neu zeichnen. */
export async function zeichneVerwaltung(token: string, personen: Map<string, Person>, inhalt: Inhalt) {
  const kanal = await verwaltungKanal(token);
  if (!kanal) return;
  const liste = TEAM.filter((t) => personen.has(t.discord)).map((t) => fortschritt(t.name, personen.get(t.discord)!, schritteVon(personen.get(t.discord)!, inhalt)));
  const karte = verwaltungKarte(liste);
  const msgs = await alleNachrichten(token, kanal, 50);
  const alt = msgs.find((m) => m.author.bot && (m.embeds[0]?.title === karte.embeds[0].title || m.embeds[0]?.title === VERWALTUNG_TITEL_ALT));
  if (alt) await call(token, "PATCH", `/channels/${kanal}/messages/${alt.id}`, { ...karte, allowed_mentions: { parse: [] } });
  else {
    const m = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, { ...karte, allowed_mentions: { parse: [] } });
    if (m) await call(token, "PUT", `/channels/${kanal}/pins/${m.id}`);
  }
}

/** Legt Lernpfad und Bibliothek einer Person an (doppelt geht nicht). */
async function legeBereichAn(token: string, speicher: string, userId: string, inhalt: Inhalt): Promise<Person | null> {
  const kanaele = (await alleKanaele(token)) ?? [];
  const [kat, team, bot] = await Promise.all([kategorie(token, kanaele), teamRolle(token), eigeneId(token)]);
  if (!bot) return null;
  const name = nameVon(userId);
  const rechte = privatRechte(userId, { everyone: GUILD_ID, team, bot });
  const namen = kanalNamen(name);
  const lege = (n: string, topic: string) => call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name: n, type: 0, topic, ...(kat ? { parent_id: kat } : {}), permission_overwrites: rechte });
  const lernpfad = await lege(namen.lernpfad, `Lernpfad von ${name}: Lektionen und Tests. Nur ${name} und David sehen diesen Kanal.`);
  const bibliothek = await lege(namen.bibliothek, `Bibliothek von ${name}: alles Gelesene zum Nachschlagen. Nur ${name} und David sehen diesen Kanal.`);
  if (!lernpfad || !bibliothek) return null;
  const rolle = rolleVon(userId);
  const leer: Person = { rolle, lernpfad: lernpfad.id, bibliothek: bibliothek.id, pfadMsg: "", tocMsg: "", gelesen: new Map(), tests: [], bestanden: new Set() };
  const pfadMsg = await call<{ id: string }>(token, "POST", `/channels/${lernpfad.id}/messages`, { ...pfadKarte(name, schritteVon(leer, inhalt), leer.gelesen, leer.bestanden), allowed_mentions: { parse: [] } });
  const tocMsg = await call<{ id: string }>(token, "POST", `/channels/${bibliothek.id}/messages`, { ...bibliothekKarte(name, []), allowed_mentions: { parse: [] } });
  if (!pfadMsg || !tocMsg) return null;
  await call(token, "PUT", `/channels/${lernpfad.id}/pins/${pfadMsg.id}`);
  await call(token, "PUT", `/channels/${bibliothek.id}/pins/${tocMsg.id}`);
  await merke(token, speicher, zeileFrei(userId, rolle, lernpfad.id, bibliothek.id, pfadMsg.id, tocMsg.id));
  return { ...leer, pfadMsg: pfadMsg.id, tocMsg: tocMsg.id };
}

/**
 * Alles einrichten und auf den neuesten Stand bringen (läuft mehrfach ohne Doppelungen):
 * Kategorie, #akademie mit Startkarte, Merkzettel, Verwaltung, Bereiche für David, Jakob und Mijo, alle Karten.
 */
export async function richteEin(token: string): Promise<{ start: string | null; speicher: string | null; bereiche: Record<string, string>; fehler?: string }> {
  const inhalt = await holeInhalt();
  const ak = await leseAkademie(token);
  if (!ak) return { start: null, speicher: null, bereiche: {}, fehler: "Merkzettel nicht erreichbar" };
  const kanaele = (await alleKanaele(token)) ?? [];
  const kat = await kategorie(token, kanaele);

  // #akademie: nur die Startkarte, ohne Knöpfe
  let start = kanaele.find((c) => c.type === 0 && c.name === START)?.id ?? null;
  if (!start) start = (await call<Kanal>(token, "POST", `/guilds/${GUILD_ID}/channels`, { name: START, type: 0, topic: "Die Akademie: lernen, testen, nachschlagen.", ...(kat ? { parent_id: kat } : {}) }))?.id ?? null;
  if (start) {
    await sperreKundenkanal(token, start);
    const karte = { embeds: [{ title: START_TITEL, description: START_TEXT, color: 0x8b5cf6 } as EmbedLike], components: [], allowed_mentions: { parse: [] } };
    const alt = (await alleNachrichten(token, start, 50)).find((m) => m.author.bot && m.embeds[0]?.title === START_TITEL);
    if (alt) {
      if (alt.embeds[0]?.description !== START_TEXT || alt.components?.length) await call(token, "PATCH", `/channels/${start}/messages/${alt.id}`, karte);
    } else {
      const msg = await call<{ id: string }>(token, "POST", `/channels/${start}/messages`, karte);
      if (msg) await call(token, "PUT", `/channels/${start}/pins/${msg.id}`);
    }
  }
  if (!inhalt) return { start, speicher: ak.speicher, bereiche: {}, fehler: "Notion nicht erreichbar" };

  const bereiche: Record<string, string> = {};
  for (const t of TEAM) {
    let p = ak.personen.get(t.discord);
    if (!p) {
      p = (await legeBereichAn(token, ak.speicher, t.discord, inhalt)) ?? undefined;
      if (p) ak.personen.set(t.discord, p);
    } else await zeichne(token, t.discord, p, inhalt);
    if (p && !p.uebKanal) {
      const u = await legeUebungAn(token, ak.speicher, t.discord, p, inhalt);
      if (u) p.uebKanal = u;
    } else if (p) await zeichneUebung(token, t.discord, p, inhalt);
    bereiche[t.name] = p ? `lernpfad ${p.lernpfad}, bibliothek ${p.bibliothek}, übungen ${p.uebKanal?.kanal ?? "Fehler beim Anlegen"}` : "Fehler beim Anlegen";
  }
  await zeichneVerwaltung(token, ak.personen, inhalt);
  return { start, speicher: ak.speicher, bereiche };
}

// ------------------------------------------------------------- Aufräumen

/**
 * Räumt die Bibliotheken auf. Es bleibt nur das Inhaltsverzeichnis (und `ausser`). Lektions-Anzeigen gehen weg,
 * wenn sie älter als `abMinuten` sind (ohne Angabe: sofort). Alte Einträge aus der ersten Fassung gehen immer weg.
 * Läuft beim Anzeigen einer Lektion (nur dieser Kanal) und stündlich im Abgleich (alle).
 */
export async function raeumeBibliothekAuf(token: string, opt: { kanal?: string; ausser?: string; abMinuten?: number } = {}): Promise<number> {
  const ak = await leseAkademie(token);
  if (!ak) return 0;
  const grenze = Date.now() - (opt.abMinuten ?? 0) * 60_000;
  let weg = 0;
  for (const p of ak.personen.values()) {
    if (opt.kanal && p.bibliothek !== opt.kanal) continue;
    for (const m of await alleNachrichten(token, p.bibliothek, 100)) {
      if (!m.author.bot || m.id === p.tocMsg || m.id === opt.ausser) continue;
      const anzeige = (m.embeds[0]?.footer as { text?: string } | undefined)?.text?.startsWith(ANZEIGE);
      if (anzeige && opt.abMinuten !== undefined && snowflakeZeit(m.id) > grenze) continue;
      if ((await call(token, "DELETE", `/channels/${p.bibliothek}/messages/${m.id}`)) !== null) weg++;
    }
  }
  return weg;
}

/** Setzt den Lernstand einer Person zurück (Gelesenes, Tests und Übungsergebnisse). Bereich und Kanäle bleiben. */
export async function setzeZurueck(token: string, userId: string): Promise<number> {
  const speicher = await speicherKanal(token);
  if (!speicher) return 0;
  let weg = 0;
  for (const m of await alleNachrichten(token, speicher, 3000)) {
    const t = m.content.split(" · ");
    if ((t[0] === "gelesen" || t[0] === "test" || t[0] === "uebung") && t[1] === userId) {
      if ((await call(token, "DELETE", `/channels/${speicher}/messages/${m.id}`)) !== null) weg++;
    }
  }
  return weg;
}
