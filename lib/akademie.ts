import type { EmbedLike } from "@/lib/discord-calls";
import type { RohBlock } from "./gespraech.ts";
import { BOT_DARF, CHEF_ID, SPERRE, type Overwrite } from "./zustaendige.ts";
import { team } from "./team.ts";

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
  /** Branchenwissen (Art „Wissen“): nur zum Nachschlagen in der Bibliothek, nie im Lernpfad. */
  wissen?: boolean;
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
  const art = (p["Art"]?.select as { name?: string } | null)?.name;
  if (!nr || art === "Testfrage" || art === "Übung") return null;
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
    ...(art === "Wissen" ? { wissen: true } : {}),
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

export interface Testfrage {
  id: string;
  nr: string;
  einheit: number;
  frage: string;
  antworten: string[];
  richtig: "A" | "B" | "C" | "D";
  zuLektion: string | null;
  erklaerung: string | null;
  fuer: ("Team" | "David")[];
  freigegeben: boolean;
  reihenfolge: number;
}

const BUCHSTABEN = ["A", "B", "C", "D"] as const;

/** Eine Testfrage aus der Akademie-Datenbank (Art = Testfrage), sonst null. */
export function frageAusNotion(seite: { id: string; properties?: Record<string, NotionProp> }): Testfrage | null {
  const p = seite.properties ?? {};
  if ((p["Art"]?.select as { name?: string } | null)?.name !== "Testfrage") return null;
  const nr = text(p["Nr"]?.rich_text);
  const richtig = (p["Richtig"]?.select as { name?: string } | null)?.name;
  const antworten = BUCHSTABEN.map((b) => text(p[`Antwort ${b}`]?.rich_text)).filter(Boolean);
  if (!nr || !richtig || !BUCHSTABEN.includes(richtig as "A") || antworten.length < 2) return null;
  return {
    id: seite.id,
    nr,
    einheit: typeof p["Einheit"]?.number === "number" ? (p["Einheit"].number as number) : Number(nr.replace(/^\D+/, "").split(".")[0]) || 0,
    frage: text(p["Titel"]?.title),
    antworten,
    richtig: richtig as Testfrage["richtig"],
    zuLektion: text(p["Zu Lektion"]?.rich_text) || null,
    erklaerung: text(p["Erklärung"]?.rich_text) || null,
    fuer: ((p["Für"]?.multi_select as { name: string }[] | undefined) ?? []).map((o) => o.name).filter((n): n is "Team" | "David" => n === "Team" || n === "David"),
    freigegeben: p["Freigegeben"]?.checkbox === true,
    reihenfolge: typeof p["Reihenfolge"]?.number === "number" ? (p["Reihenfolge"].number as number) : 9999,
  };
}

// ------------------------------------------------------------- Lernpfad

/** Die Lektionen im Pfad: Team nur Freigegebenes, David alles (auch Entwürfe und seine eigenen). */
export function pfadLektionen(alle: Lektion[], rolle: Rolle): Lektion[] {
  return alle
    .filter((l) => !l.wissen)
    .filter((l) => (rolle === "david" ? l.fuer.includes("Team") || l.fuer.includes("David") : l.fuer.includes("Team") && l.freigegeben))
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.nr.localeCompare(b.nr, "de", { numeric: true }));
}

export type Schritt =
  | { art: "lektion"; lektion: Lektion }
  | { art: "test"; einheit: number; einheitName: string; fragen: Testfrage[]; entwurf: boolean };

export const schrittId = (s: Schritt) => (s.art === "lektion" ? s.lektion.id : `test:${s.einheit}`);
const testName = (einheit: number) => `📝 Test Einheit ${einheit}`;

/** Lektionen und Tests in Reihenfolge: Nach der letzten Lektion einer Einheit kommt ihr Test (wenn es Fragen gibt). */
export function schritte(pfad: Lektion[], fragen: Testfrage[], rolle: Rolle): Schritt[] {
  const sichtbar = fragen
    .filter((f) => (rolle === "david" ? true : f.fuer.includes("Team") && f.freigegeben))
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.nr.localeCompare(b.nr, "de", { numeric: true }));
  const out: Schritt[] = [];
  pfad.forEach((l, i) => {
    out.push({ art: "lektion", lektion: l });
    const naechste = pfad[i + 1];
    if (!naechste || naechste.einheit !== l.einheit) {
      const f = sichtbar.filter((x) => x.einheit === l.einheit);
      if (f.length) out.push({ art: "test", einheit: l.einheit, einheitName: l.einheitName, fragen: f, entwurf: f.some((x) => !x.freigegeben) });
    }
  });
  return out;
}

type Hat = { has(k: string): boolean };

export function standSchritte(sch: Schritt[], gelesen: Hat, bestanden: Set<number>) {
  const status: Record<string, "fertig" | "jetzt" | "gesperrt"> = {};
  let aktuelle: Schritt | null = null;
  for (const s of sch) {
    const erledigt = s.art === "lektion" ? gelesen.has(s.lektion.id) : bestanden.has(s.einheit);
    if (erledigt) status[schrittId(s)] = "fertig";
    else if (!aktuelle) {
      aktuelle = s;
      status[schrittId(s)] = "jetzt";
    } else status[schrittId(s)] = "gesperrt";
  }
  return { status, aktuelle, fertig: sch.filter((s) => status[schrittId(s)] === "fertig").length, gesamt: sch.length };
}

/** Für die Tests der ersten Etappe: Stand nur aus Lektionen. */
export function stand(pfad: Lektion[], gelesen: Hat) {
  const s = standSchritte(pfad.map((lektion) => ({ art: "lektion" as const, lektion })), gelesen, new Set());
  return { status: s.status, aktuelle: s.aktuelle?.art === "lektion" ? s.aktuelle.lektion : null, fertig: s.fertig };
}

export function fortschrittBalken(fertig: number, gesamt: number, breite = 10): string {
  const voll = gesamt ? Math.round((fertig / gesamt) * breite) : 0;
  return `${"▰".repeat(voll)}${"▱".repeat(breite - voll)} ${fertig} von ${gesamt}`;
}

const WEITER_KNOPF = { type: 2, style: 1, label: "Weiterlernen", emoji: { name: "📖" }, custom_id: "ak:weiter" };
const ENTWURF = " ✏️";

/** Die Karte oben im Lernpfad-Kanal. */
/** Aufnahmetest (Plan 4): alle Tests des Team-Pfads bestanden und 3 Übungen mit mindestens 70 Punkten. */
export const AUFNAHME_UEBUNGEN = 3;
export const AUFNAHME_PUNKTE = 70;
export function aufnahmeStand(sch: Schritt[], bestanden: Set<number>, uebungen: { punkte: number }[]) {
  const noetig = [...new Set(sch.flatMap((x) => (x.art === "test" ? [x.einheit] : [])))];
  const tests = noetig.filter((e) => bestanden.has(e)).length;
  const gut = Math.min(AUFNAHME_UEBUNGEN, uebungen.filter((u) => u.punkte >= AUFNAHME_PUNKTE).length);
  return { tests, testsGesamt: noetig.length, uebungen: gut, uebungenGesamt: AUFNAHME_UEBUNGEN, bestanden: noetig.length > 0 && tests === noetig.length && gut >= AUFNAHME_UEBUNGEN };
}
export const aufnahmeZeile = (a: ReturnType<typeof aufnahmeStand>) =>
  `🎓 **Aufnahmetest:** ${a.tests} von ${a.testsGesamt} Tests · ${a.uebungen} von ${a.uebungenGesamt} Übungen (ab ${AUFNAHME_PUNKTE} Punkten). Danach bist du automatisch im Team.`;

export function pfadKarte(name: string, sch: Schritt[], gelesen: Hat, bestanden: Set<number>, zusatz?: string) {
  const s = standSchritte(sch, gelesen, bestanden);
  const gelesenListe = sch.flatMap((x) => (x.art === "lektion" && gelesen.has(x.lektion.id) ? [x.lektion] : []));
  const zeilen: string[] = [];
  let einheit = "";
  // Nur bis zum Abschnitt, der gerade dran ist: Erledigte Einheiten bleiben stehen, die nächste erscheint nach dem Test.
  const einheitVon = (x: Schritt) => (x.art === "lektion" ? x.lektion.einheit : x.einheit);
  const bis = s.aktuelle ? einheitVon(s.aktuelle) : Infinity;
  for (const x of sch.filter((y) => einheitVon(y) <= bis)) {
    const en = x.art === "lektion" ? x.lektion.einheitName : x.einheitName;
    if (en !== einheit) {
      einheit = en;
      zeilen.push(`${zeilen.length ? "\n" : ""}**${einheit}**`);
    }
    const titel = x.art === "lektion" ? `${x.lektion.nr} ${x.lektion.titel}` : testName(x.einheit);
    const entwurf = (x.art === "lektion" ? !x.lektion.freigegeben : x.entwurf) ? ENTWURF : "";
    const st = s.status[schrittId(x)];
    zeilen.push(st === "fertig" ? `✅ ${titel}${entwurf}` : st === "jetzt" ? `📖 **${titel}** ← jetzt dran${entwurf}` : `🔒 ${titel}${entwurf}`);
  }
  return {
    embeds: [
      {
        title: `📖 Lernpfad von ${name}`,
        color: FARBE,
        description: `${zusatz ? `${zusatz}\n\n` : ""}${fortschrittBalken(s.fertig, s.gesamt)}\n\n${zeilen.join("\n") || "Noch keine Lektionen."}`.slice(0, 4000),
        footer: {
          text: `${s.aktuelle ? "Mit „📖 Weiterlernen“ geht es weiter." : sch.length ? "Alles geschafft. Neue Lektionen kommen hier dazu." : "Bald geht es los."}${gelesenListe.length ? " Zum Wiederholen unten eine Lektion auswählen." : ""}`,
        },
      } as EmbedLike,
    ],
    components: [{ type: 1, components: [WEITER_KNOPF] }, ...auswahlRow(gelesenListe, "ak:pw", "ak:pe", "Lektion wiederholen …")],
  };
}

/** Auswahl gelesener Lektionen: bis 25 direkt, sonst erst die Einheit. */
function auswahlRow(lektionen: Lektion[], lektionId: string, einheitId: string, placeholder: string) {
  if (!lektionen.length) return [];
  if (lektionen.length <= 25) {
    return [{ type: 1, components: [{ type: 3, custom_id: lektionId, placeholder, options: lektionen.map((l) => ({ label: `${l.nr} ${l.titel}`.slice(0, 100), value: l.id })) }] }];
  }
  const einheiten = [...new Map(lektionen.map((l) => [l.einheit, l.einheitName])).entries()];
  return [{ type: 1, components: [{ type: 3, custom_id: einheitId, placeholder: "Einheit wählen …", options: einheiten.slice(0, 25).map(([e, n]) => ({ label: n.slice(0, 100), value: String(e) })) }] }];
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

export const ANZEIGE = "📚 Anzeige";

/**
 * Eine Seite einer Lektion. Modus „lernen“: Gelesen auf der letzten Seite. „lesen“: Nachlesen nach einem Test,
 * danach weiter. „bib“: Anzeige in der Bibliothek für alle im Kanal, mit Schließen.
 */
export function lektionsAnsicht(l: Lektion, s: string[], i: number, entwurf: boolean, modus: "lernen" | "lesen" = "lernen") {
  const letzte = i >= s.length - 1;
  const p = modus === "lernen" ? "s" : "z";
  const fuss = `${l.einheitName} · Seite ${i + 1} von ${s.length}${l.minuten ? ` · etwa ${l.minuten} Min.` : ""}${entwurf ? " · ✏️ Entwurf, noch nicht freigegeben" : ""}`;
  const zurueck = { type: 2, style: 2, label: "◀ Zurück", custom_id: `ak:${p}:${l.id}:${Math.max(0, i - 1)}`, disabled: i === 0 };
  const weiter = { type: 2, style: 1, label: "Weiter ▶", custom_id: `ak:${p}:${l.id}:${i + 1}`, disabled: letzte };
  const knoepfe = !letzte
    ? [zurueck, weiter]
    : modus === "lernen"
      ? [zurueck, { type: 2, style: 3, label: "Gelesen", emoji: { name: "✅" }, custom_id: `ak:g:${l.id}` }]
      : [zurueck, WEITER_KNOPF];
  return {
    embeds: [{ title: `${l.nr} · ${l.titel}`, color: FARBE, description: s[i] ?? "", footer: { text: fuss } } as EmbedLike],
    components: [{ type: 1, components: knoepfe }],
  };
}

/**
 * Eine ganze Lektion auf einmal (Bibliothek und Wiederholen): Trennlinien werden zu Abständen, der Text kommt
 * in Karten bis knapp 4.000 Zeichen und die Karten in Nachrichten bis 6.000 Zeichen (so viel erlaubt Discord).
 */
export function lektionNachrichten(l: Lektion, t: string): { embeds: EmbedLike[] }[] {
  const absaetze = t
    .split(/\n\s*-{3,}\s*\n/)
    .flatMap((teil) => teil.trim().split("\n\n"))
    .filter((a) => a.trim());
  const stuecke: string[] = [];
  let akt = "";
  for (const a of absaetze.length ? absaetze : ["(Diese Lektion ist noch leer.)"]) {
    for (let i = 0; i < a.length; i += 3900) {
      const teil = a.slice(i, i + 3900);
      if (akt && akt.length + 2 + teil.length > 3900) {
        stuecke.push(akt);
        akt = "";
      }
      akt = akt ? `${akt}\n\n${teil}` : teil;
    }
  }
  if (akt) stuecke.push(akt);
  const titel = `${l.nr} · ${l.titel}`;
  const fuss = `${ANZEIGE} · ${l.einheitName}`;
  const nachrichten: { embeds: EmbedLike[] }[] = [];
  let embeds: EmbedLike[] = [];
  let laenge = 0;
  stuecke.forEach((st, i) => {
    const e: EmbedLike = { color: FARBE, description: st, ...(i === 0 ? { title: titel } : {}) };
    const n = st.length + (i === 0 ? titel.length : 0) + (i === stuecke.length - 1 ? fuss.length : 0);
    if (embeds.length && (embeds.length >= 10 || laenge + n > 5800)) {
      nachrichten.push({ embeds });
      embeds = [];
      laenge = 0;
    }
    embeds.push(e);
    laenge += n;
  });
  if (embeds.length) {
    embeds[embeds.length - 1].footer = { text: fuss };
    nachrichten.push({ embeds });
  }
  return nachrichten;
}

export const schrittLabel = (s: Schritt | null) => (!s ? null : s.art === "lektion" ? `${s.lektion.nr} ${s.lektion.titel}` : testName(s.einheit));

// ----------------------------------------------------------------- Tests

export const BESTEHEN = 80;

/** Eine Frage des Tests. Die bisherigen Antworten stecken im Knopf (z. B. „ak:t:1:BC“). */
export function frageAnsicht(einheitName: string, fragen: Testfrage[], antworten: string) {
  const i = antworten.length;
  const f = fragen[i];
  const einheit = fragen[0]?.einheit ?? 0;
  return {
    content: "",
    embeds: [
      {
        title: `📝 Test · ${einheitName} · Frage ${i + 1} von ${fragen.length}`,
        color: 0xf59e0b,
        description: `${f.frage}\n\n${f.antworten.map((a, j) => `**${BUCHSTABEN[j]})** ${a}`).join("\n")}`,
        footer: { text: `Ab ${BESTEHEN} % bestanden.` },
      } as EmbedLike,
    ],
    components: [{ type: 1, components: f.antworten.map((_, j) => ({ type: 2, style: 2, label: BUCHSTABEN[j], custom_id: `ak:t:${einheit}:${antworten}${BUCHSTABEN[j]}` })) }],
  };
}

export function auswertung(fragen: Testfrage[], antworten: string) {
  const falsch = fragen.filter((f, i) => antworten[i] !== f.richtig);
  const richtig = fragen.length - falsch.length;
  const prozent = fragen.length ? Math.round((richtig / fragen.length) * 100) : 0;
  return { richtig, gesamt: fragen.length, prozent, bestanden: prozent >= BESTEHEN, falsch };
}

export function ergebnisAnsicht(a: ReturnType<typeof auswertung>, lektionen: Lektion[], einheit: number) {
  if (a.bestanden) {
    return {
      content: `✅ **Bestanden!** ${a.prozent} % (${a.richtig} von ${a.gesamt}). Die nächste Einheit ist frei.${a.falsch.length ? `\n\nDaneben lagst du bei: ${a.falsch.map((f) => `„${f.frage}“ (richtig: ${f.richtig})`).join(", ")}` : ""}`,
      embeds: [],
      components: [{ type: 1, components: [WEITER_KNOPF] }],
    };
  }
  const nach = [...new Set(a.falsch.map((f) => f.zuLektion).filter((x): x is string => Boolean(x)))]
    .map((nr) => lektionen.find((l) => l.nr === nr))
    .filter((l): l is Lektion => Boolean(l));
  const fehler = a.falsch
    .map((f) => `• ${f.frage} → richtig: **${f.richtig})** ${f.antworten[BUCHSTABEN.indexOf(f.richtig)] ?? ""}${f.erklaerung ? `. ${f.erklaerung}` : ""}`)
    .join("\n");
  return {
    content:
      `❌ **Noch nicht bestanden:** ${a.prozent} % (${a.richtig} von ${a.gesamt}). Du brauchst ${BESTEHEN} %.\n\n**Daneben:**\n${fehler}` +
      (nach.length ? `\n\nLies am besten nochmal nach: ${nach.map((l) => `**${l.nr} ${l.titel}**`).join(", ")}` : "") +
      "\nDanach kannst du den Test sofort wiederholen.",
    embeds: [],
    components: [
      {
        type: 1,
        components: [
          ...nach.slice(0, 4).map((l) => ({ type: 2, style: 2, label: `${l.nr} nochmal lesen`.slice(0, 80), emoji: { name: "📖" }, custom_id: `ak:z:${l.id}:0` })),
          { type: 2, style: 1, label: "Test wiederholen", emoji: { name: "🔁" }, custom_id: `ak:t:${einheit}:` },
        ],
      },
    ],
  };
}

// ------------------------------------------------------------ Bibliothek

/** Branchenwissen für die Bibliothek: Team nur Freigegebenes, David alles. Muss nicht erst gelesen werden. */
export function wissenSeiten(alle: Lektion[], rolle: Rolle): Lektion[] {
  return alle
    .filter((l) => l.wissen && (rolle === "david" || (l.fuer.includes("Team") && l.freigegeben)))
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.nr.localeCompare(b.nr, "de", { numeric: true }));
}

/** Inhaltsverzeichnis der gelesenen Lektionen mit Auswahl zum Anzeigen und Suchknopf. */
export function bibliothekKarte(name: string, gelesen: Lektion[]) {
  const sortiert = [...gelesen].sort((a, b) => a.reihenfolge - b.reihenfolge || a.nr.localeCompare(b.nr, "de", { numeric: true }));
  const zeilen: string[] = [];
  let einheit = "";
  for (const l of sortiert) {
    if (l.einheitName !== einheit) {
      einheit = l.einheitName;
      zeilen.push(`${zeilen.length ? "\n" : ""}**${einheit}**`);
    }
    zeilen.push(`${l.nr} ${l.titel}`);
  }
  const suchen = {
    type: 1,
    components: [
      { type: 2, style: 2, label: "Suchen", emoji: { name: "🔎" }, custom_id: "ak:bs" },
      { type: 2, style: 2, label: "Aufräumen", emoji: { name: "🧹" }, custom_id: "ak:bc" },
    ],
  };
  const erklaerung =
    "Wähle unten eine Lektion aus, dann erscheint sie hier im Kanal. Du kannst mehrere öffnen.\n" +
    "🔎 **Suchen**: findet ein Stichwort in allen Lektionen, die du schon gelesen hast, und im Branchenwissen.\n" +
    "🧹 **Aufräumen**: nimmt alle angezeigten Lektionen wieder weg. Über das Inhaltsverzeichnis holst du sie jederzeit wieder her.\n" +
    "📘 **Branchenwissen**: Tipps und typische Einsatzzwecke je Branche zum Nachschlagen vor einem Kundengespräch. Das steht von Anfang an hier, ohne Lernpfad.";
  const auswahl = auswahlRow(sortiert, "ak:bw", "ak:be", "Lektion anzeigen …");
  return {
    embeds: [
      {
        title: `📚 Bibliothek von ${name}`,
        color: FARBE,
        description: `${erklaerung}\n\n${zeilen.length ? zeilen.join("\n") : "Noch nichts gelesen. Jede gelesene Lektion steht dann hier."}`.slice(0, 4000),
      } as EmbedLike,
    ],
    components: [...auswahl, suchen],
  };
}

export const lektionAuswahl = (lektionen: Lektion[], placeholder = "Lektion anzeigen …") => [
  { type: 1, components: [{ type: 3, custom_id: "ak:bw", placeholder, options: lektionen.slice(0, 25).map((l) => ({ label: `${l.nr} ${l.titel}`.slice(0, 100), value: l.id })) }] },
];

export const SUCH_MODAL = {
  type: 9,
  data: {
    custom_id: "ak:bsuche",
    title: "In der Bibliothek suchen",
    components: [{ type: 1, components: [{ type: 4, custom_id: "begriff", label: "Wonach suchst du?", style: 1, required: true, min_length: 2, max_length: 60 }] }],
  },
};

/** Treffer für einen Suchbegriff: erst Titel, dann Text, mit kurzem Ausschnitt. */
export function sucheTreffer(liste: { lektion: Lektion; text: string }[], begriff: string): { lektion: Lektion; ausschnitt: string }[] {
  const b = begriff.trim().toLowerCase();
  if (!b) return [];
  const titel = liste.filter((x) => x.lektion.titel.toLowerCase().includes(b));
  const inhalt = liste.filter((x) => !titel.includes(x) && x.text.toLowerCase().includes(b));
  const schnitt = (t: string) => {
    const i = t.toLowerCase().indexOf(b);
    if (i < 0) return t.slice(0, 120).replace(/\s+/g, " ");
    return `${i > 60 ? "…" : ""}${t.slice(Math.max(0, i - 60), i + b.length + 60).replace(/\s+/g, " ")}${i + b.length + 60 < t.length ? "…" : ""}`;
  };
  return [...titel, ...inhalt].map((x) => ({ lektion: x.lektion, ausschnitt: schnitt(x.text) }));
}

// ------------------------------------------------------------ Merkzettel

export const zeileFrei = (user: string, rolle: Rolle, lernpfad: string, bibliothek: string, pfadMsg: string, tocMsg: string) =>
  ["frei", user, rolle, lernpfad, bibliothek, pfadMsg, tocMsg].join(SEP);
export const zeileGelesen = (user: string, lektion: string, nr: string, zeit: string) => ["gelesen", user, lektion, nr, zeit].join(SEP);
export const zeileTest = (user: string, einheit: number, richtig: number, gesamt: number, bestanden: boolean, zeit: string) =>
  ["test", user, String(einheit), String(richtig), String(gesamt), bestanden ? "ja" : "nein", zeit].join(SEP);
/** Der Übungskanal einer Person und ihre Karte darin. */
export const zeileUebKanal = (user: string, kanal: string, karte: string) => ["uebkanal", user, kanal, karte].join(SEP);
/** Ergebnis einer bewerteten Übung (Punkte 0 bis 100). */
export const zeileUebung = (user: string, nr: string, titel: string, punkte: number, zeit: string) =>
  ["uebung", user, nr, String(punkte), zeit, titel.replace(/ · /g, " - ")].join(SEP);

export interface TestErgebnis {
  einheit: number;
  richtig: number;
  gesamt: number;
  bestanden: boolean;
  zeit: string;
}

export interface UebungErgebnis {
  nr: string;
  titel: string;
  punkte: number;
  zeit: string;
}

export interface Person {
  rolle: Rolle;
  lernpfad: string;
  bibliothek: string;
  pfadMsg: string;
  tocMsg: string;
  gelesen: Map<string, { nr: string; zeit: string }>;
  tests: TestErgebnis[];
  bestanden: Set<number>;
  /** Übungskanal mit Karte (fehlt, solange er nicht angelegt ist). */
  uebKanal?: { kanal: string; karte: string };
  /** Bewertete Übungen, älteste zuerst. */
  uebungen?: UebungErgebnis[];
}

export function leseSpeicher(nachrichten: { id: string; content: string }[]): Map<string, Person> {
  const m = new Map<string, Person>();
  const zeilen = [...nachrichten].reverse().map((n) => n.content.split(SEP));
  for (const t of zeilen) {
    if (t[0] === "frei" && t.length >= 7) {
      const alt = m.get(t[1]);
      m.set(t[1], {
        rolle: t[2] === "david" ? "david" : "team",
        lernpfad: t[3],
        bibliothek: t[4],
        pfadMsg: t[5],
        tocMsg: t[6],
        gelesen: alt?.gelesen ?? new Map(),
        tests: alt?.tests ?? [],
        bestanden: alt?.bestanden ?? new Set(),
        ...(alt?.uebKanal ? { uebKanal: alt.uebKanal } : {}),
        uebungen: alt?.uebungen ?? [],
      });
    }
  }
  for (const t of zeilen) {
    const p = m.get(t[1]);
    if (!p) continue;
    if (t[0] === "gelesen" && t[2]) p.gelesen.set(t[2], { nr: t[3] ?? "", zeit: t[4] ?? "" });
    if (t[0] === "test" && t.length >= 7) {
      const e = { einheit: Number(t[2]), richtig: Number(t[3]), gesamt: Number(t[4]), bestanden: t[5] === "ja", zeit: t[6] };
      p.tests.push(e);
      if (e.bestanden) p.bestanden.add(e.einheit);
    }
    if (t[0] === "uebkanal" && t.length >= 4) p.uebKanal = { kanal: t[2], karte: t[3] };
    if (t[0] === "uebung" && t.length >= 6) (p.uebungen ??= []).push({ nr: t[2], punkte: Number(t[3]) || 0, zeit: t[4], titel: t.slice(5).join(SEP) });
  }
  return m;
}

// --------------------------------------------------- Fortschritt (David)

export const zeitText = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/^(\d\d\.\d\d\.), /, "$1, ")
    : "";

const uebungText = (u: UebungErgebnis) => `🎭 Übung ${u.nr} ${u.titel}: ${u.punkte} von 100 Punkten`;
const testText = (t: TestErgebnis) => `Test Einheit ${t.einheit}: ${t.richtig} von ${t.gesamt} (${t.gesamt ? Math.round((t.richtig / t.gesamt) * 100) : 0} %), ${t.bestanden ? "bestanden" : "nicht bestanden"}`;

export function fortschritt(name: string, p: Person, sch: Schritt[]) {
  const s = standSchritte(sch, p.gelesen, p.bestanden);
  const ereignisse = [
    ...[...p.gelesen.entries()].map(([id, g]) => {
      const l = sch.find((x) => x.art === "lektion" && x.lektion.id === id);
      return { was: `${g.nr}${l?.art === "lektion" ? ` ${l.lektion.titel}` : ""} gelesen`, zeit: g.zeit };
    }),
    ...p.tests.map((t) => ({ was: testText(t), zeit: t.zeit })),
    ...(p.uebungen ?? []).map((u) => ({ was: uebungText(u), zeit: u.zeit })),
  ].sort((a, b) => b.zeit.localeCompare(a.zeit));
  return {
    id: team().find((t) => t.name === name)?.discord ?? "",
    name,
    fertig: s.fertig,
    gesamt: s.gesamt,
    prozent: s.gesamt ? Math.round((s.fertig / s.gesamt) * 100) : 0,
    jetzt: s.aktuelle ? (s.aktuelle.art === "lektion" ? `📖 ${s.aktuelle.lektion.nr} ${s.aktuelle.lektion.titel}` : testName(s.aktuelle.einheit)) : null,
    zuletzt: ereignisse[0] ?? null,
    letzte: ereignisse.slice(0, 5),
    tests: p.tests,
    uebungen: p.uebungen ?? [],
  };
}

export function verwaltungKarte(liste: ReturnType<typeof fortschritt>[]) {
  return {
    embeds: [
      {
        title: "🔧 Akademie: Fortschritt",
        color: FARBE,
        description:
          liste
            .map(
              (f) =>
                `**${f.name}**\n${fortschrittBalken(f.fertig, f.gesamt)} (${f.prozent} %)\nJetzt: ${f.jetzt ?? "alles geschafft"}\nZuletzt: ${f.zuletzt ? `${f.zuletzt.was} · ${zeitText(f.zuletzt.zeit)}` : "noch nichts"}`,
            )
            .join("\n\n") || "Noch niemand in der Akademie.",
        footer: { text: "Nur du siehst diesen Kanal. Aktualisiert sich bei jedem Schritt, mit 🔄 sofort." },
      } as EmbedLike,
    ],
    components: [
      {
        type: 1,
        components: [
          ...liste.filter((f) => f.id).slice(0, 4).map((f) => ({ type: 2, style: 2, label: f.name, emoji: { name: "👤" }, custom_id: `ak:vp:${f.id}` })),
          { type: 2, style: 2, label: "Aktualisieren", emoji: { name: "🔄" }, custom_id: "ak:vr" },
        ],
      },
    ],
  };
}

/** Die Details einer Person: jeder Schritt mit Zeit, Tests und die letzten Aktivitäten. */
export function personDetail(f: ReturnType<typeof fortschritt>, p: Person, sch: Schritt[]): EmbedLike {
  const s = standSchritte(sch, p.gelesen, p.bestanden);
  const zeilen = sch.map((x) => {
    const st = s.status[schrittId(x)];
    const zeichen = st === "fertig" ? "✅" : st === "jetzt" ? "📖" : "🔒";
    if (x.art === "lektion") {
      const g = p.gelesen.get(x.lektion.id);
      return `${zeichen} ${x.lektion.nr} ${x.lektion.titel}${g?.zeit ? ` · ${zeitText(g.zeit)}` : ""}`;
    }
    const versuche = p.tests.filter((t) => t.einheit === x.einheit);
    const best = versuche.sort((a, b) => b.richtig / b.gesamt - a.richtig / a.gesamt)[0];
    return `${zeichen} ${testName(x.einheit)}${versuche.length ? ` · ${versuche.length} Versuch${versuche.length > 1 ? "e" : ""}, bestes Ergebnis ${best.richtig} von ${best.gesamt}` : ""}`;
  });
  const letzte = f.letzte.map((e) => `• ${e.was} · ${zeitText(e.zeit)}`).join("\n");
  const uebungen = (p.uebungen ?? []).slice(-5).reverse().map((u) => `• ${u.nr} ${u.titel}: **${u.punkte}** von 100 · ${zeitText(u.zeit)}`).join("\n");
  return {
    title: `👤 ${f.name} in der Akademie`,
    color: FARBE,
    description: `${fortschrittBalken(f.fertig, f.gesamt)} (${f.prozent} %)\nJetzt: ${f.jetzt ?? "alles geschafft"}\n\n${zeilen.join("\n")}${uebungen ? `\n\n**🎭 Übungen**\n${uebungen}` : ""}${letzte ? `\n\n**Zuletzt**\n${letzte}` : ""}`.slice(0, 4000),
  };
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

export const kanalNamen = (name: string) => ({ lernpfad: `📖lernpfad-${slug(name)}`, bibliothek: `📚bibliothek-${slug(name)}`, uebungen: `🎭uebungen-${slug(name)}` });

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

const SCHREIBEN = BigInt(1) << BigInt(11);
const BEFEHLE = BigInt(1) << BigInt(31);

/** Übungskanal (seit 09.11.): Die Person darf dort schreiben und den Befehl /a benutzen, sonst wie die privaten Kanäle. */
export function uebungRechte(userId: string, ids: { everyone: string; team: string | null; bot: string }): Overwrite[] {
  return privatRechte(userId, ids).map((o) => (o.id === userId && o.type === 1 ? { ...o, allow: String(LESEN | SCHREIBEN | BEFEHLE), deny: String(SPERRE & ~(SCHREIBEN | BEFEHLE)) } : o));
}

export { kanalWahl } from "./kanalwahl.ts";
