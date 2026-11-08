import type { EmbedLike } from "@/lib/discord-calls";
import type { RohBlock } from "./gespraech.ts";
import { BOT_DARF, CHEF_ID, SPERRE, type Overwrite } from "./zustaendige.ts";

// Akademie in Discord (Plan 2). Reine Logik ohne Netz, damit sie getestet werden kann.
//
// Je Person zwei private Kanäle (nur die Person und David): 📖lernpfad-<name> und 📚bibliothek-<name>.
// Die Lektionen stehen in der Notion-Datenbank „Akademie – Agents Gilt“. Was gelesen ist, merkt sich der
// Bot im unsichtbaren Kanal #akademie-speicher (eine Zeile pro Eintrag).

export interface Lektion {
  id: string;
  url?: string;
  nr: string;
  titel: string;
  einheit: number;
  einheitName: string;
  reihenfolge: number;
  fuer: ("Team" | "David")[];
  minuten: number | null;
  freigegeben: boolean;
}

export type Rolle = "team" | "david";
export const rolleVon = (userId: string): Rolle => (userId === CHEF_ID ? "david" : "team");

const SEP = " · ";
const FARBE = 0x8b5cf6;

// ---------------------------------------------------------------- Notion

type NotionProp = { type?: string; [k: string]: unknown };
const text = (v: unknown) => ((v as { plain_text?: string }[] | undefined) ?? []).map((t) => t.plain_text ?? "").join("").trim();

/** Eine Zeile der Akademie-Datenbank als Lektion (null, wenn die Nummer fehlt). */
export function lektionAusNotion(seite: { id: string; url?: string; properties?: Record<string, NotionProp> }): Lektion | null {
  const p = seite.properties ?? {};
  const nr = text(p["Nr"]?.rich_text);
  if (!nr) return null;
  const zahl = (n: string) => (typeof p[n]?.number === "number" ? (p[n].number as number) : null);
  return {
    id: seite.id,
    ...(seite.url ? { url: seite.url } : {}),
    nr,
    titel: text(p["Titel"]?.title) || `Lektion ${nr}`,
    einheit: zahl("Einheit") ?? Number(nr.split(".")[0]) ?? 0,
    einheitName: (p["Einheit-Name"]?.select as { name?: string } | null)?.name ?? `Einheit ${nr.split(".")[0]}`,
    reihenfolge: zahl("Reihenfolge") ?? 9999,
    fuer: ((p["Für"]?.multi_select as { name: string }[] | undefined) ?? [])
      .map((o) => o.name)
      .filter((n): n is "Team" | "David" => n === "Team" || n === "David"),
    minuten: zahl("Minuten"),
    freigegeben: p["Freigegeben"]?.checkbox === true,
  };
}

type RT = { plain_text?: string; text?: { content?: string }; annotations?: { bold?: boolean; italic?: boolean; code?: boolean } };
const reich = (rts: RT[] | undefined) =>
  (rts ?? [])
    .map((r) => {
      const t = r.plain_text ?? r.text?.content ?? "";
      if (!t.trim()) return t;
      const a = r.annotations ?? {};
      return a.code ? `\`${t}\`` : a.bold ? `**${t}**` : a.italic ? `*${t}*` : t;
    })
    .join("");

/** Notion-Blöcke einer Lektion als Discord-Text. Eine Trennlinie (---) beginnt eine neue Seite. */
export function lektionText(bloecke: RohBlock[]): string {
  const teile: { art: string; text: string }[] = [];
  const zeilen = (bl: RohBlock, tiefe: number, nummer: number): string => {
    const inhalt = (bl[bl.type] as { rich_text?: RT[]; checked?: boolean } | undefined) ?? {};
    const t = reich(inhalt.rich_text);
    const ein = "  ".repeat(tiefe);
    let z: string;
    switch (bl.type) {
      case "bulleted_list_item":
        z = `${ein}• ${t}`;
        break;
      case "numbered_list_item":
        z = `${ein}${nummer}. ${t}`;
        break;
      case "to_do":
        z = `${ein}${inhalt.checked ? "☑" : "☐"} ${t}`;
        break;
      default:
        z = `${ein}${t}`;
    }
    let n = 0;
    const kinder = (bl.kinder ?? []).map((k) => zeilen(k, tiefe + 1, k.type === "numbered_list_item" ? ++n : 0));
    return [z, ...kinder].join("\n");
  };
  let nummer = 0;
  for (const bl of bloecke) {
    nummer = bl.type === "numbered_list_item" ? nummer + 1 : 0;
    const inhalt = (bl[bl.type] as { rich_text?: RT[] } | undefined) ?? {};
    if (bl.type === "divider") teile.push({ art: "divider", text: "---" });
    else if (bl.type.startsWith("heading")) teile.push({ art: "h", text: `**${reich(inhalt.rich_text).replace(/\*\*/g, "")}**` });
    else if (bl.type === "callout" || bl.type === "quote") teile.push({ art: "q", text: `> ${reich(inhalt.rich_text)}` });
    else if (bl.type === "code") teile.push({ art: "code", text: `\`\`\`\n${reich(inhalt.rich_text)}\n\`\`\`` });
    else if (["bulleted_list_item", "numbered_list_item", "to_do"].includes(bl.type)) teile.push({ art: bl.type, text: zeilen(bl, 0, nummer) });
    else {
      const t = zeilen(bl, 0, 0);
      if (t.trim()) teile.push({ art: "p", text: t });
    }
  }
  let out = "";
  teile.forEach((t, i) => {
    if (i > 0) out += teile[i - 1].art === t.art && t.art.endsWith("item") ? "\n" : t.art === "to_do" && teile[i - 1].art === "to_do" ? "\n" : "\n\n";
    out += t.text;
  });
  return out.trim();
}

// ------------------------------------------------------------- Lernpfad

/** Die Lektionen im Pfad: Team nur Freigegebenes, David alles (auch Entwürfe und seine eigenen). */
export function pfadLektionen(alle: Lektion[], rolle: Rolle): Lektion[] {
  return alle
    .filter((l) => (rolle === "david" ? l.fuer.includes("Team") || l.fuer.includes("David") : l.fuer.includes("Team") && l.freigegeben))
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.nr.localeCompare(b.nr, "de", { numeric: true }));
}

export function stand(pfad: Lektion[], gelesen: Set<string>) {
  const status: Record<string, "fertig" | "jetzt" | "gesperrt"> = {};
  let aktuelle: Lektion | null = null;
  for (const l of pfad) {
    if (gelesen.has(l.id)) status[l.id] = "fertig";
    else if (!aktuelle) {
      aktuelle = l;
      status[l.id] = "jetzt";
    } else status[l.id] = "gesperrt";
  }
  return { status, aktuelle, fertig: pfad.filter((l) => gelesen.has(l.id)).length };
}

export function fortschrittBalken(fertig: number, gesamt: number, breite = 10): string {
  const voll = gesamt ? Math.round((fertig / gesamt) * breite) : 0;
  return `${"▰".repeat(voll)}${"▱".repeat(breite - voll)} ${fertig} von ${gesamt}`;
}

const WEITER_KNOPF = { type: 2, style: 1, label: "Weiterlernen", emoji: { name: "📖" }, custom_id: "ak:weiter" };

/** Die Karte oben im Lernpfad-Kanal. */
export function pfadKarte(name: string, pfad: Lektion[], gelesen: Set<string>) {
  const s = stand(pfad, gelesen);
  const zeilen: string[] = [];
  let einheit = "";
  for (const l of pfad) {
    if (l.einheitName !== einheit) {
      einheit = l.einheitName;
      zeilen.push(`${zeilen.length ? "\n" : ""}**${einheit}**`);
    }
    const entwurf = l.freigegeben ? "" : " 📝";
    const st = s.status[l.id];
    zeilen.push(st === "fertig" ? `✅ ${l.nr} ${l.titel}${entwurf}` : st === "jetzt" ? `📖 **${l.nr} ${l.titel}** ← jetzt dran${entwurf}` : `🔒 ${l.nr} ${l.titel}${entwurf}`);
  }
  return {
    embeds: [
      {
        title: `📖 Lernpfad von ${name}`,
        color: FARBE,
        description: `${fortschrittBalken(s.fertig, pfad.length)}\n\n${zeilen.join("\n") || "Noch keine Lektionen."}`.slice(0, 4000),
        footer: { text: s.aktuelle ? "Mit „📖 Weiterlernen“ geht es weiter." : pfad.length ? "Alles gelesen. Neue Lektionen kommen hier dazu." : "Bald geht es los." },
      } as EmbedLike,
    ],
    components: [{ type: 1, components: [WEITER_KNOPF] }],
  };
}

/** Teilt eine Lektion in Seiten: an jeder Trennlinie und sonst an Absätzen, wenn sie zu lang wird. */
export function seiten(t: string, max = 3500): string[] {
  const out: string[] = [];
  for (const teil of t.split(/\n\s*-{3,}\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    let akt = "";
    for (const absatz of teil.split("\n\n")) {
      if (akt && akt.length + 2 + absatz.length > max) {
        out.push(akt);
        akt = "";
      }
      akt = akt ? `${akt}\n\n${absatz}` : absatz.slice(0, max);
    }
    if (akt) out.push(akt);
  }
  return out.length ? out : ["(Diese Lektion ist noch leer.)"];
}

/** Eine Seite einer Lektion mit Blättern; „Gelesen“ gibt es nur auf der letzten Seite. */
export function lektionsAnsicht(l: Lektion, s: string[], i: number, entwurf: boolean) {
  const letzte = i >= s.length - 1;
  return {
    embeds: [
      {
        title: `${l.nr} · ${l.titel}`,
        color: FARBE,
        description: s[i] ?? "",
        footer: { text: `${l.einheitName} · Seite ${i + 1} von ${s.length}${l.minuten ? ` · etwa ${l.minuten} Min.` : ""}${entwurf ? " · 📝 Entwurf, noch nicht freigegeben" : ""}` },
      } as EmbedLike,
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 2, label: "◀ Zurück", custom_id: `ak:s:${l.id}:${Math.max(0, i - 1)}`, disabled: i === 0 },
          letzte
            ? { type: 2, style: 3, label: "Gelesen", emoji: { name: "✅" }, custom_id: `ak:g:${l.id}` }
            : { type: 2, style: 1, label: "Weiter ▶", custom_id: `ak:s:${l.id}:${i + 1}` },
        ],
      },
    ],
  };
}

export function gelesenAnsicht(l: Lektion, naechste: Lektion | null) {
  return {
    content: `✅ **${l.nr} ${l.titel}** gelesen und in deiner Bibliothek abgelegt.${naechste ? `\nAls Nächstes: **${naechste.nr} ${naechste.titel}**` : "\nDas war die letzte Lektion, die gerade frei ist."}`,
    embeds: [],
    components: naechste ? [{ type: 1, components: [WEITER_KNOPF] }] : [],
  };
}

// ------------------------------------------------------------ Bibliothek

/** Eine gelesene Lektion als Eintrag in der Bibliothek (eine Karte pro Seite). */
export function bibliothekEmbeds(l: Lektion, s: string[]): EmbedLike[] {
  return s.map((seite, i) => ({
    ...(i === 0 ? { title: `${l.nr} · ${l.titel}` } : {}),
    color: FARBE,
    description: seite,
    ...(i === s.length - 1 ? { footer: { text: l.einheitName } } : {}),
  }));
}

export function inhaltsverzeichnis(name: string, eintraege: { nr: string; titel: string; einheitName: string; link: string }[]): EmbedLike {
  const sortiert = [...eintraege].sort((a, b) => a.nr.localeCompare(b.nr, "de", { numeric: true }));
  const zeilen: string[] = [];
  let einheit = "";
  for (const e of sortiert) {
    if (e.einheitName !== einheit) {
      einheit = e.einheitName;
      zeilen.push(`${zeilen.length ? "\n" : ""}**${einheit}**`);
    }
    zeilen.push(`[${e.nr} ${e.titel}](${e.link})`);
  }
  return {
    title: `📚 Bibliothek von ${name}`,
    color: FARBE,
    description: (zeilen.length ? zeilen.join("\n") : "Noch nichts gelesen. Jede gelesene Lektion landet hier.").slice(0, 4000),
    footer: { text: "Klick auf eine Lektion springt hin. Suchen: Discord-Suche oben rechts." },
  };
}

// ------------------------------------------------------------ Merkzettel

export const zeileFrei = (user: string, rolle: Rolle, lernpfad: string, bibliothek: string, pfadMsg: string, tocMsg: string) =>
  ["frei", user, rolle, lernpfad, bibliothek, pfadMsg, tocMsg].join(SEP);
export const zeileGelesen = (user: string, lektion: string, nr: string, zeit: string) => ["gelesen", user, lektion, nr, zeit].join(SEP);
export const zeileBib = (user: string, lektion: string, nr: string, link: string) => ["bib", user, lektion, nr, link].join(SEP);

export interface Person {
  rolle: Rolle;
  lernpfad: string;
  bibliothek: string;
  pfadMsg: string;
  tocMsg: string;
  gelesen: Set<string>;
  bib: Map<string, { nr: string; link: string }>;
}

export function leseSpeicher(nachrichten: { id: string; content: string }[]): Map<string, Person> {
  const m = new Map<string, Person>();
  // Älteste zuerst, damit spätere Einträge gelten.
  for (const n of [...nachrichten].reverse()) {
    const t = n.content.split(SEP);
    if (t[0] === "frei" && t.length >= 7) {
      const alt = m.get(t[1]);
      m.set(t[1], { rolle: t[2] === "david" ? "david" : "team", lernpfad: t[3], bibliothek: t[4], pfadMsg: t[5], tocMsg: t[6], gelesen: alt?.gelesen ?? new Set(), bib: alt?.bib ?? new Map() });
    }
  }
  for (const n of [...nachrichten].reverse()) {
    const t = n.content.split(SEP);
    const p = m.get(t[1]);
    if (!p) continue;
    if (t[0] === "gelesen" && t[2]) p.gelesen.add(t[2]);
    if (t[0] === "bib" && t[2] && t[4]) p.bib.set(t[2], { nr: t[3], link: t[4] });
  }
  return m;
}

// --------------------------------------------------------------- Kanäle

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const kanalNamen = (name: string) => ({ lernpfad: `📖lernpfad-${slug(name)}`, bibliothek: `📚bibliothek-${slug(name)}` });

const SEHEN = BigInt(1024);
const LESEN = BigInt(1024 + 65536);

/** Rechte für die privaten Kanäle: nur die Person (lesen, Knöpfe) und der Bot. David sieht als Besitzer alles. */
export function privatRechte(userId: string, ids: { everyone: string; team: string | null; bot: string }): Overwrite[] {
  return [
    { id: ids.bot, type: 1, allow: String(BOT_DARF), deny: "0" },
    { id: ids.everyone, type: 0, allow: "0", deny: String(SEHEN | SPERRE) },
    ...(ids.team ? [{ id: ids.team, type: 0, allow: "0", deny: String(SEHEN | SPERRE) }] : []),
    { id: userId, type: 1, allow: String(LESEN), deny: String(SPERRE) },
  ];
}
