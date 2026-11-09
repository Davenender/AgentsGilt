import type { EmbedLike } from "@/lib/discord-calls";
import type { Person, Rolle, UebungErgebnis } from "./akademie.ts";

// Übungen mit dem KI-Kunden (Plan 2, Etappe 6). Reine Logik ohne Netz, damit sie getestet werden kann.
//
// Jede Person hat einen privaten Kanal 🎭uebungen-<name>. Dort startet sie eine Lage, die KI spielt den Kunden.
// Der Bot liest keine getippten Nachrichten, deshalb läuft jede Antwort über den Knopf „💬 Antworten“ (Fenster).
// Alles, was zu einer Übung gehört, steht als Karte im Kanal. Die Fußzeile verrät, wozu sie gehört:
//   „🎭 Übung · start · Ü1“      Start (Aufgabe)
//   „🎭 Übung · <start> · kunde“ der Kunde spricht
//   „🎭 Übung · <start> · du“    die Person spricht
//   „🎭 Übung · <start> · ende“  bewertet oder abgebrochen
// Die Lagen (Aufgabe, Rolle, erster Satz, Bewertungspunkte) und der Leitfaden (Ü0) stehen in Notion,
// weil das Repo öffentlich ist. Hier steht nur, wie gespielt und bewertet wird.

export const MARKE = "🎭 Übung";
const SEP = " · ";
const FARBE = 0xf59e0b;
const FARBE_DU = 0x3b82f6;
const FARBE_ENDE = 0x22c55e;

/** Höchstens so viele neue Übungen am Tag (Team). */
export const GRENZE_TAG = 5;
/** Höchstens so viele eigene Antworten in einer Übung. */
export const GRENZE_ZUEGE = 30;

export interface Uebung {
  id: string;
  nr: string;
  titel: string;
  /** Diese Einheit muss bestanden sein. */
  voraussetzung: number;
  reihenfolge: number;
  fuer: ("Team" | "David")[];
  freigegeben: boolean;
  /** Ü0: der allgemeine Bewertungsleitfaden, keine Lage. */
  leitfaden: boolean;
}

// ---------------------------------------------------------------- Notion

type NotionProp = { type?: string; [k: string]: unknown };
const text = (v: unknown) => ((v as { plain_text?: string }[] | undefined) ?? []).map((t) => t.plain_text ?? "").join("").trim();

/** Eine Zeile der Akademie-Datenbank mit Art „Übung“, sonst null. */
export function uebungAusNotion(seite: { id: string; properties?: Record<string, NotionProp> }): Uebung | null {
  const p = seite.properties ?? {};
  if ((p["Art"]?.select as { name?: string } | null)?.name !== "Übung") return null;
  const nr = text(p["Nr"]?.rich_text);
  if (!nr) return null;
  const zahl = (n: string) => (typeof p[n]?.number === "number" ? (p[n].number as number) : null);
  return {
    id: seite.id,
    nr,
    titel: text(p["Titel"]?.title) || `Übung ${nr}`,
    voraussetzung: zahl("Einheit") ?? 6,
    reihenfolge: zahl("Reihenfolge") ?? 9999,
    fuer: ((p["Für"]?.multi_select as { name: string }[] | undefined) ?? []).map((o) => o.name).filter((n): n is "Team" | "David" => n === "Team" || n === "David"),
    freigegeben: p["Freigegeben"]?.checkbox === true,
    leitfaden: nr === "Ü0",
  };
}

const TEILE = { aufgabe: "aufgabe", rolle: "rolle", "erster satz": "ersterSatz", "worauf achten": "achten" } as const;

/** Teilt den Text einer Übungsseite an ihren Überschriften (Aufgabe, Rolle, Erster Satz, Worauf achten). */
export function uebungTeile(t: string): { aufgabe: string; rolle: string; ersterSatz: string; achten: string } {
  const out = { aufgabe: "", rolle: "", ersterSatz: "", achten: "" };
  let jetzt: keyof typeof out | null = null;
  const sammel: Record<string, string[]> = {};
  for (const zeile of t.split("\n")) {
    const h = zeile.trim().match(/^\*\*(.+?)\*\*$/);
    const key = h ? TEILE[h[1].trim().toLowerCase().replace(/:$/, "") as keyof typeof TEILE] : undefined;
    if (key) {
      jetzt = key;
      continue;
    }
    if (jetzt) (sammel[jetzt] ??= []).push(zeile);
  }
  for (const k of Object.keys(out) as (keyof typeof out)[]) out[k] = (sammel[k] ?? []).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/** Die Lagen, die eine Person sieht: Team nur Freigegebenes, David alles. Der Leitfaden ist keine Lage. */
export function sichtbareUebungen(alle: Uebung[], rolle: Rolle): Uebung[] {
  return alle
    .filter((u) => !u.leitfaden)
    .filter((u) => (rolle === "david" ? true : u.fuer.includes("Team") && u.freigegeben))
    .sort((a, b) => a.reihenfolge - b.reihenfolge || a.nr.localeCompare(b.nr, "de", { numeric: true }));
}

/** Darf die Person diese Lage üben? Erst nach dem Test der Voraussetzung, David immer. */
export const darfUeben = (u: Uebung, p: Pick<Person, "rolle" | "bestanden">) => p.rolle === "david" || p.bestanden.has(u.voraussetzung);

// --------------------------------------------------------------- Verlauf

type Nachricht = { id: string; embeds?: EmbedLike[]; content?: string; author?: { id?: string; bot?: boolean } };
export type Zug = { wer: "du" | "kunde"; text: string; id: string };

const fuss = (m: Nachricht) => ((m.embeds?.[0]?.footer as { text?: string } | undefined)?.text ?? "").split(SEP);

/** Die Fußzeile einer Karte dieser Übung. */
export const marke = (start: string, art: string) => [MARKE, start, art].join(SEP);

/** Die neueste Übung im Kanal (ihre Start-Nachricht), Nachrichten älteste zuerst. */
export function aktuelleUebung(msgs: Nachricht[]): string | null {
  for (let k = msgs.length - 1; k >= 0; k--) {
    const f = fuss(msgs[k]);
    if (f[0] === MARKE && f[1] === "start") return msgs[k].id;
  }
  return null;
}

/**
 * Was in einer Übung bisher gesagt wurde (Nachrichten älteste zuerst). null, wenn es den Start nicht gibt.
 * Antworten der Person kommen als Karte (Fenster, /a) oder als ganz normal getippte Nachricht im Kanal (seit 09.11.).
 * `offen`: Zuletzt hat die Person getippt und der Kunde hat noch nicht geantwortet (dann antwortet die KI).
 */
export function verlauf(msgs: Nachricht[], start: string): { nr: string; zuege: Zug[]; beendet: boolean; offen: boolean } | null {
  const ab = msgs.findIndex((m) => m.id === start);
  const sf = ab >= 0 ? fuss(msgs[ab]) : [];
  if (ab < 0 || sf[0] !== MARKE || sf[1] !== "start") return null;
  const zuege: Zug[] = [];
  let beendet = false;
  let offen = false;
  for (const m of msgs.slice(ab + 1)) {
    if (beendet) break;
    if (m.author && !m.author.bot) {
      const text = (m.content ?? "").trim();
      if (text) {
        zuege.push({ wer: "du", text, id: m.id });
        offen = true;
      }
      continue;
    }
    const f = fuss(m);
    if (f[0] !== MARKE || f[1] !== start) continue;
    if (f[2] === "ende") beendet = true;
    else if (f[2] === "hinweis") offen = false;
    else if (f[2] === "du" || f[2] === "kunde") {
      zuege.push({ wer: f[2], text: m.embeds?.[0]?.description ?? "", id: m.id });
      offen = false;
    }
  }
  return { nr: sf[2] ?? "", zuege, beendet, offen: offen && !beendet };
}

/** Getippt wird oft in mehreren kurzen Nachrichten: erst antworten, wenn seit der letzten 3 Sekunden Ruhe ist. */
export const tippFertig = (letzteId: string, jetzt = Date.now()) => jetzt - snowflakeZeit(letzteId) >= 3000;

const berlinTag = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
export const snowflakeZeit = (id: string) => Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000));

/** Wie viele Übungen heute (Berliner Zeit) gestartet wurden. */
export function heuteGestartet(msgs: Nachricht[], jetzt = Date.now()): number {
  const heute = berlinTag(jetzt);
  return msgs.filter((m) => {
    const f = fuss(m);
    return f[0] === MARKE && f[1] === "start" && /^\d+$/.test(m.id) && berlinTag(snowflakeZeit(m.id)) === heute;
  }).length;
}

// -------------------------------------------------------------------- KI

export const KUNDEN_PROMPT = `Du spielst in einer Verkaufsübung einen Kunden. Auf der anderen Seite übt jemand aus dem Team von Agents Gilt (eine kleine Agentur, die KI-Lösungen wie Websites, Chatbots und Telefon-Assistenten für Betriebe baut) ein Kundengespräch.

Spiel den Kunden streng und echt, wie einen beschäftigten Betriebsinhaber, der nicht auf diesen Kontakt gewartet hat. Dein Gegenüber soll sich jedes Ja wirklich verdienen müssen.

Deine Rolle steht in <rolle>. Halte dich daran:
- Bleib immer in der Rolle. Sag nie, dass du eine KI bist oder dass es eine Übung ist, auch wenn du danach gefragt wirst.
- Antworte auf Deutsch, so kurz wie in einem echten Gespräch: meistens 1 bis 3 Sätze, ohne Aufzählungen, ohne Markdown.
- Du bist kein hilfsbereiter Assistent, sondern ein Mensch mit wenig Zeit, eigenen Sorgen und eigener Meinung. Du hast keine Lust auf Verkäufer.
- Der Einstieg entscheidet: Fehlt am Anfang eine saubere Vorstellung (Name, Firma, warum es sich meldet) oder die Frage, ob du gerade kurz Zeit hast, bist du kurz angebunden oder genervt, zum Beispiel: „Wer ist da?“, „Worum geht's denn?“, „Wollen Sie mir was verkaufen?“ oder „Ich hab gerade echt keine Zeit.“
- Floskeln, lange Monologe, Technik-Begriffe, Druck oder ein Angebot, bevor dein Problem verstanden ist, machen dich misstrauischer. Dann fragst du zum Beispiel „Was soll das jetzt?“, „Und was hab ich davon?“ oder „Wollen Sie nur meine Zeit verschwenden?“.
- Gib Informationen nur, wenn gut danach gefragt wird. Gute, konkrete Fragen zu deinem Alltag bekommen ehrliche, konkrete Antworten. Bei vagen Fragen bleibst du vage.
- Einwände aus deiner Rolle gibst du nicht schnell auf. Ein Einwand ist erst erledigt, wenn die Antwort wirklich auf deine Sorge eingeht, mit einem Nutzen, der zu deinem Problem passt. Druck, Rabatte ohne Grund oder Ausweichen zählen nicht.
- Du darfst Nein sagen: Geht dein Gegenüber zweimal hintereinander nicht auf dich ein oder überzeugt dich nicht, sag höflich, aber bestimmt Nein und verabschiede dich. Danach bleibst du bei Nein („Ich hab doch schon Nein gesagt.“).
- Du schlägst von dir aus keinen Termin und keinen nächsten Schritt vor. Ja sagst du nur, wenn du wirklich überzeugt bist und dein Gegenüber einen konkreten, kleinen nächsten Schritt vorschlägt.
- Erfinde keine Preise oder Angebote von Agents Gilt. Die nennt dein Gegenüber.
- Wenn dein Gegenüber das Gespräch sauber beendet oder ein nächster Schritt vereinbart ist, verabschiede dich natürlich.

<rolle>
{ROLLE}
</rolle>`;

export const BEWERTUNG_PROMPT = `Du bist Verkaufstrainer bei Agents Gilt. Jemand aus dem Team hat ein Übungsgespräch mit einem gespielten Kunden geführt. Bewerte, wie gut die Person das Gespräch geführt hat (nicht den Kunden).

Bewerte nur nach dem Leitfaden in <leitfaden> und den Punkten für diese Lage in <achten>. Erfinde keine eigenen Regeln.
Sei streng: Punkte gibt es nur für Schritte, die im Gespräch wirklich zu sehen sind. Ein schwacher Einstieg (ohne Vorstellung, ohne Grund, ohne Frage nach Zeit) kostet deutlich Punkte.
Sei ehrlich und konkret, freundlich im Ton, und beziehe dich auf Sätze aus dem Gespräch. Schreib auf Deutsch, in einfachen Sätzen.

Antworte nur mit JSON, ohne Text davor oder danach:
{"punkte": 0-100, "gut": ["bis zu 3 Dinge, die gut waren"], "besser": ["bis zu 3 Dinge, die besser gehen"], "tipp": "ein Satz, was die Person beim nächsten Mal zuerst anders machen soll", "lektionen": ["bis zu 3 Nummern aus <lektionen>, die die Person nochmal lesen sollte"]}

Punkte: 90 und mehr = sehr sicher und nach Leitfaden; 70 bis 89 = gut mit Lücken; 50 bis 69 = Grundlagen da, wichtige Schritte fehlen; unter 50 = Leitfaden kaum befolgt.

<leitfaden>
{LEITFADEN}
</leitfaden>

<achten>
{ACHTEN}
</achten>

<lektionen>
{LEKTIONEN}
</lektionen>`;

export type ApiNachricht = { role: "user" | "assistant"; content: string };

/** Der bisherige Verlauf für die KI (die KI ist der Kunde), dazu die neue Antwort der Person (falls nicht schon im Verlauf). */
export function apiNachrichten(zuege: Zug[], neu?: string): ApiNachricht[] {
  const out: ApiNachricht[] = [{ role: "user", content: "(Das Gespräch beginnt. Du sprichst zuerst.)" }];
  const dazu = (role: ApiNachricht["role"], content: string) => {
    const letzte = out[out.length - 1];
    if (letzte.role === role) letzte.content += `\n${content}`;
    else out.push({ role, content });
  };
  for (const z of zuege) dazu(z.wer === "kunde" ? "assistant" : "user", z.text);
  if (neu) dazu("user", neu);
  return out;
}

/** Das Gespräch als Text für die Bewertung. */
export const transkript = (zuege: Zug[], name: string) => zuege.map((z) => `${z.wer === "kunde" ? "Kunde" : name}: ${z.text}`).join("\n");

export interface Bewertung {
  punkte: number;
  gut: string[];
  besser: string[];
  tipp: string;
  lektionen: string[];
}

const liste = (v: unknown, n: number) =>
  (Array.isArray(v) ? v : [])
    .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
    .map((x) => x.trim().slice(0, 300))
    .slice(0, n);

/** Prüft die Antwort der KI. Nur Lektionen, die es wirklich gibt. */
export function pruefeBewertung(raw: unknown, erlaubt: string[]): Bewertung | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const p = typeof r.punkte === "number" ? r.punkte : Number.NaN;
  if (!Number.isFinite(p)) return null;
  return {
    punkte: Math.round(Math.min(100, Math.max(0, p))),
    gut: liste(r.gut, 3),
    besser: liste(r.besser, 3),
    tipp: typeof r.tipp === "string" ? r.tipp.trim().slice(0, 400) : "",
    lektionen: liste(r.lektionen, 5).filter((n) => erlaubt.includes(n)).slice(0, 3),
  };
}

// --------------------------------------------------------------- Discord

const knopf = (label: string, emoji: string, custom_id: string, style = 2) => ({ type: 2, style, label, emoji: { name: emoji }, custom_id });

export const START_KNOPF = knopf("Übung starten", "🎭", "ak:us", 1);

/** Aufgabe der Lage (die Rolle des Kunden sieht die Person nicht). */
export function startEmbed(u: Uebung, aufgabe: string, name: string): EmbedLike {
  return {
    title: `🎭 Übung: ${u.titel}`,
    color: FARBE,
    description: `${aufgabe || "Führe das Gespräch so, wie du es gelernt hast."}\n\n**So geht's:** Schreib einfach unten in den Chat, was du dem Kunden sagst. Er antwortet nach ein paar Sekunden. Kommt nach etwa 30 Sekunden nichts, schreib \`/a\` und deinen Text. Wenn das Gespräch zu Ende ist, drück **„✅ Fertig“**: Dann bekommst du eine Rückmeldung mit Punkten.`.slice(0, 4000),
    author: { name: `Übung von ${name}` },
    footer: { text: marke("start", u.nr) },
  } as EmbedLike;
}

export function zugEmbed(wer: Zug["wer"], text: string, name: string, start: string): EmbedLike {
  return {
    color: wer === "kunde" ? FARBE : FARBE_DU,
    author: { name: wer === "kunde" ? "🎭 Kunde" : `🧑 ${name}` },
    description: text.slice(0, 4000),
    footer: { text: marke(start, wer) },
  } as EmbedLike;
}

/** Geantwortet wird im Chat (getippt oder mit /a). Das Fenster (ak:ua) bleibt nur für ältere Karten. */
export const zugKnoepfe = (start: string) => [{ type: 1, components: [knopf("Fertig", "✅", `ak:uf:${start}`, 3), knopf("Abbrechen", "✖️", `ak:ux:${start}`)] }];

/** Kurzer Hinweis in der Übung (z. B. KI nicht erreichbar). Danach wird erst auf eine neue Nachricht wieder geantwortet. */
export const hinweisEmbed = (start: string, text: string): EmbedLike => ({ description: text.slice(0, 4000), color: 0x6b7280, footer: { text: marke(start, "hinweis") } }) as EmbedLike;

export const ANTWORT_MODAL = (start: string) => ({
  type: 9,
  data: {
    custom_id: `ak:um:${start}`,
    title: "Deine Antwort an den Kunden",
    components: [{ type: 1, components: [{ type: 4, custom_id: "antwort", label: "Was sagst du?", style: 2, min_length: 1, max_length: 1500, required: true, placeholder: "So, wie du es im Gespräch sagen würdest …" }] }],
  },
});

export function ergebnisEmbed(b: Bewertung, titel: string, start: string, lektionen: { nr: string; titel: string }[]): EmbedLike {
  const punkt = (xs: string[]) => xs.map((x) => `• ${x}`).join("\n");
  const lesen = b.lektionen.map((n) => `• ${n} ${lektionen.find((l) => l.nr === n)?.titel ?? ""}`.trim()).join("\n");
  const fields = [
    ...(b.gut.length ? [{ name: "👍 Gut", value: punkt(b.gut).slice(0, 1024), inline: false }] : []),
    ...(b.besser.length ? [{ name: "🔧 Besser", value: punkt(b.besser).slice(0, 1024), inline: false }] : []),
    ...(b.tipp ? [{ name: "💡 Nächstes Mal zuerst", value: b.tipp.slice(0, 1024), inline: false }] : []),
    ...(lesen ? [{ name: "📚 Nochmal lesen (in deiner Bibliothek)", value: lesen.slice(0, 1024), inline: false }] : []),
  ];
  return {
    title: `✅ Übung bewertet: ${titel}`,
    color: FARBE_ENDE,
    description: `**${b.punkte} von 100 Punkten**\n${balken(b.punkte)}`,
    fields,
    footer: { text: marke(start, "ende") },
  } as EmbedLike;
}

export const abbruchEmbed = (start: string): EmbedLike => ({ description: "✖️ Übung abgebrochen. Sie wird nicht bewertet.", color: 0x6b7280, footer: { text: marke(start, "ende") } }) as EmbedLike;

const balken = (punkte: number) => "🟩".repeat(Math.round(punkte / 10)) + "⬜".repeat(10 - Math.round(punkte / 10));

const zeit = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit" });

/** Die angeheftete Karte oben im Übungskanal. */
export function uebungKarte(name: string, lagen: Uebung[], p: Pick<Person, "rolle" | "bestanden"> & { uebungen?: UebungErgebnis[] }) {
  const zeilen = lagen.map((u) => (darfUeben(u, p) ? `🎭 **${u.nr} ${u.titel}**` : `🔒 ${u.nr} ${u.titel} · frei nach dem Test von Einheit ${u.voraussetzung}`));
  const ergebnisse = (p.uebungen ?? []).slice(-5).reverse().map((e) => `• ${e.nr} ${e.titel}: **${e.punkte}** von 100 · ${zeit(e.zeit)}`);
  const description = [
    "Hier übst du Kundengespräche. Die KI spielt den Kunden, du führst das Gespräch so, wie du es in Einheit 6 gelernt hast.",
    "",
    "**So geht's**",
    "1. Drück **„🎭 Übung starten“** und wähle eine Lage.",
    "2. Unten erscheint deine Aufgabe, und der Kunde sagt den ersten Satz.",
    "3. Schreib einfach hier in den Chat, was du dem Kunden sagst. Er antwortet nach ein paar Sekunden. Kommt nach etwa 30 Sekunden nichts, schreib `/a` und deinen Text (das geht immer).",
    "   Die Kunden sind streng: Stell dich am Anfang sauber vor, frag, ob sie kurz Zeit haben, und überzeuge mit Argumenten. Sonst sagen sie auch mal Nein.",
    "4. Ist das Gespräch zu Ende, drück **„✅ Fertig“**. Du bekommst Punkte (0 bis 100), was gut war, was besser geht und welche Lektionen du nochmal lesen kannst.",
    "",
    "Mit **„✖️ Abbrechen“** hörst du ohne Bewertung auf. Eine neue Übung kannst du jederzeit starten. Am Tag gehen bis zu " + GRENZE_TAG + " Übungen.",
    "",
    "**Lagen**",
    zeilen.join("\n") || "Noch keine Lagen da.",
    ...(ergebnisse.length ? ["", "**Deine letzten Ergebnisse**", ...ergebnisse] : []),
  ].join("\n");
  return {
    embeds: [{ title: `🎭 Übungen von ${name}`, color: FARBE, description: description.slice(0, 4096) } as EmbedLike],
    components: [{ type: 1, components: [START_KNOPF] }],
  };
}

/** Auswahl der Lagen (nur freie). */
export const lagenAuswahl = (lagen: Uebung[]) => [
  {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: "ak:uw",
        placeholder: "Lage wählen …",
        options: lagen.slice(0, 25).map((u) => ({ label: `${u.nr} ${u.titel}`.slice(0, 100), value: u.id })),
      },
    ],
  },
];
