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

// ------------------------------------------------------------- Tipps (26.11.)

/** Ein Tipp frühestens nach so vielen eigenen Antworten (und wieder erst nach so vielen weiteren). */
export const TIPP_ABSTAND = 3;

/** Steht ein Tipp an? Nach mindestens TIPP_ABSTAND eigenen Antworten seit dem Start bzw. seit dem letzten Tipp. */
export function tippFaellig(msgs: Nachricht[], start: string): boolean {
  const ab = msgs.findIndex((m) => m.id === start);
  if (ab < 0) return false;
  let seit = 0;
  for (const m of msgs.slice(ab + 1)) {
    if (m.author && !m.author.bot) {
      if ((m.content ?? "").trim()) seit++;
      continue;
    }
    const f = fuss(m);
    if (f[0] !== MARKE || f[1] !== start) continue;
    if (f[2] === "tipp") seit = 0;
    else if (f[2] === "du") seit++; // Antwort über /a oder das Fenster (als Karte gepostet)
  }
  return seit >= TIPP_ABSTAND;
}

export const TIPP_PROMPT = `Du bist Verkaufstrainer bei Agents Gilt und schaust bei einer Übung zu: Jemand aus dem Team führt ein Gespräch mit einem gespielten Kunden. Entscheide, ob die Person gerade feststeckt: Sie dreht sich im Kreis, wiederholt dasselbe Argument, kommt bei einem Einwand nicht weiter, oder der Kunde wird immer abweisender. Läuft es ordentlich, steckt sie nicht fest.

Steckt sie fest, wähle genau EINE Lektion aus <lektionen>, die ihr jetzt am meisten hilft, und schreib einen kurzen Satz auf Deutsch, was jetzt helfen würde – ein Denkanstoß, nicht die fertige Antwort.

Antworte nur mit JSON, ohne Text davor oder danach:
{"fest": true oder false, "lektion": "Nummer aus <lektionen>", "tipp": "ein kurzer Satz"}

<lektionen>
{LEKTIONEN}
</lektionen>`;

/** Die Tipp-Antwort der KI: nur, wenn sie feststeckt, und nur mit einer Lektion aus dem Lernpfad. */
export function pruefeTipp(raw: unknown, erlaubt: string[]): { lektion: string; tipp: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { fest?: unknown; lektion?: unknown; tipp?: unknown };
  if (r.fest !== true || typeof r.lektion !== "string" || typeof r.tipp !== "string") return null;
  const lektion = r.lektion.trim();
  const tipp = r.tipp.replace(/\s+/g, " ").trim().slice(0, 300);
  return erlaubt.includes(lektion) && tipp ? { lektion, tipp } : null;
}

/** Der Tipp im Kanal – eigene Art „tipp“: zählt nicht zum Gespräch (KI-Kunde und Bewertung sehen ihn nicht). */
export const tippEmbed = (start: string, l: { nr: string; titel: string }, tipp: string): EmbedLike =>
  ({
    description: `💡 **Tipp (nur für dich – der Kunde sieht das nicht):** ${tipp}\n📖 Schau nochmal in Lektion **${l.nr}** „${l.titel}“ im Lernpfad.`.slice(0, 4000),
    color: 0x8b5cf6,
    footer: { text: marke(start, "tipp") },
  }) as EmbedLike;

// -------------------------------------------------------------------- KI

export const KUNDEN_PROMPT = `Du spielst in einer Verkaufsübung einen Kunden. Auf der anderen Seite übt jemand aus dem Team von Agents Gilt (eine kleine Agentur, die KI-Lösungen wie Websites, Chatbots und Telefon-Assistenten für Betriebe baut) ein Kundengespräch. Die Person lernt gerade erst – die Übung soll fordern, aber zu schaffen sein.

Spiel den Kunden echt, aber fair: ein beschäftigter Betriebsinhaber, der nicht auf diesen Kontakt gewartet hat, aber offen wird, wenn man ihm zuhört und sein Problem versteht. Gute Schritte deines Gegenübers belohnst du spürbar mit mehr Offenheit.

Deine Rolle steht in <rolle>. Halte dich daran:
- Bleib immer in der Rolle. Sag nie, dass du eine KI bist oder dass es eine Übung ist, auch wenn du danach gefragt wirst.
- Antworte auf Deutsch, so kurz wie in einem echten Gespräch: meistens 1 bis 3 Sätze, ohne Aufzählungen, ohne Markdown.
- Der Einstieg zählt: Fehlt am Anfang eine kurze Vorstellung (Name, Firma, warum es sich meldet) oder die Frage, ob du gerade kurz Zeit hast, bist du erst etwas kurz angebunden, zum Beispiel „Worum geht's denn?“ oder „Wollen Sie mir was verkaufen?“. Das legt sich, sobald dein Gegenüber es nachholt.
- Lange Monologe, Technik-Begriffe oder Druck machen dich etwas misstrauischer („Und was hab ich davon?“, „Wollen Sie nur meine Zeit verschwenden?“). Gute, konkrete Fragen zu deinem Alltag beantwortest du ehrlich und konkret.
- Bring ruhig mehrere echte Einwände aus deiner Rolle (Preis, Vertrauen, Zeit, Technik, „brauch ich nicht“), aber immer nur einen auf einmal. Ein Einwand ist erledigt, wenn die Antwort wirklich auf deine Sorge eingeht und einen Nutzen nennt, der zu deinem Problem passt. Einen erledigten Einwand bringst du nicht noch einmal – du bist überzeugbar, und jede gute Antwort macht dich spürbar offener.
- Hake nicht jede Zahl nach. Nennt dein Gegenüber eine Preisspanne oder rechnet grob vor, reicht dir das für ein erstes Telefonat. Korrigierte Zahlen nimmst du hin, ohne sie vorzuhalten.
- Schlägt dein Gegenüber einen kleinen, konkreten nächsten Schritt vor (ein kurzer Termin, eine Demo anhören), nachdem es dein Problem verstanden hat, sag Ja oder nenn eine Zeit, die dir passt. Von dir aus schlägst du keinen nächsten Schritt vor.
- Nein sagst du nur, wenn dein Gegenüber mehrmals hintereinander gar nicht auf dich eingeht oder unhöflich wird. Dann verabschiede dich höflich und bleib bei Nein.
- Erfinde keine Preise oder Angebote von Agents Gilt. Die nennt dein Gegenüber.
- Wenn dein Gegenüber das Gespräch sauber beendet oder ein nächster Schritt vereinbart ist, verabschiede dich natürlich.

<rolle>
{ROLLE}
</rolle>`;

export const BEWERTUNG_PROMPT = `Du bist Verkaufstrainer bei Agents Gilt. Jemand aus dem Team hat ein Übungsgespräch mit einem gespielten Kunden geführt. Bewerte, wie gut die Person das Gespräch geführt hat (nicht den Kunden).

Bewerte nur nach dem Leitfaden in <leitfaden> und den Punkten für diese Lage in <achten>. Erfinde keine eigenen Regeln.
Sei fair: Punkte gibt es für Schritte, die im Gespräch wirklich zu sehen sind, und gute Ansätze zählen auch, wenn sie noch nicht perfekt sind. Ein schwacher Einstieg (ohne Vorstellung, ohne Grund, ohne Frage nach Zeit) kostet Punkte. Tipps, die der Person während der Übung angezeigt wurden, stehen nicht im Gespräch und zählen nicht gegen sie.
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
    "   Die Kunden sind beschäftigt, aber fair: Stell dich am Anfang kurz vor, frag, ob sie kurz Zeit haben, und geh auf ihr Problem ein.",
    "   Kommst du nicht weiter, bekommst du einen kleinen 💡 Tipp, welche Lektion dir jetzt hilft. Den siehst nur du, nicht der Kunde.",
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

/**
 * Welche Übungskanäle der Takt abfragt (alle 30 Sekunden): nicht die von Ausgetretenen und nur Kanäle, die es auf dem
 * Server noch gibt (sonst meldet Discord „Unknown Channel“, Befund 16.11.2026). `vorhanden` null: Kanalliste nicht
 * lesbar, dann wird nur nach Austritt gefiltert.
 */
export function zuFragendeUebKanaele(
  personen: Iterable<[string, { uebKanal?: { kanal: string } }]>,
  ausgetreten: ReadonlySet<string>,
  vorhanden: ReadonlySet<string> | null,
): { kanal: string; user: string }[] {
  const out: { kanal: string; user: string }[] = [];
  for (const [user, p] of personen) {
    if (!p.uebKanal || ausgetreten.has(user)) continue;
    if (vorhanden && !vorhanden.has(p.uebKanal.kanal)) continue;
    out.push({ kanal: p.uebKanal.kanal, user });
  }
  return out;
}
