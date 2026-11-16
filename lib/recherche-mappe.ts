// Recherche-Mappe (Etappe 3, 16.11.2026): Drückt jemand bei einem Lead „In Arbeit“, bereitet der Bot eine Mappe vor
// (Profil, beste Anrufzeit, Google-Bewertungen, Website-Check, passende Leistung, Einstieg, Fragen, Einwände).
// Hier nur Prüfung und Aufbereitung, ohne Netz: tests/recherche-mappe.test.ts. Abruf: lib/recherche.ts.
import type { EmbedLike } from "./discord-calls.ts";

export interface Mappe {
  profil: string;
  anrufzeit: string | null;
  bewertungen: string | null;
  website: string;
  leistung: string;
  einstieg: string[];
  fragen: string[];
  einwaende: { einwand: string; antwort: string }[];
  demoHinweis: boolean;
}

export const MAPPE_PROMPT = `Du bereitest für das Vertriebsteam der KI-Agentur Agents Gilt eine Recherche-Mappe über eine Firma vor, die wir anrufen wollen.
Unsere Leistungen: {LEISTUNGEN}.

Du bekommst unsere Analyse der Firma, Text von ihrer Website und, wenn vorhanden, Google-Bewertungen und Öffnungszeiten.
Regeln:
- Erfinde nichts. Was nicht in den Daten steht, lässt du weg (null oder leere Liste).
- Nenne keine Preise, Beträge oder Rabatte.
- Kurz und konkret, für jemanden, der gleich anruft. Die Einstiegssätze in der Sie-Form (Firmenkunde am Telefon).
- Unser Name ist Agents Gilt (immer der volle Name).

Antworte ausschließlich mit einem JSON-Objekt:
{"profil": "2 bis 3 Sätze: was die Firma macht, Inhaber oder Ansprechpartner, wenn bekannt",
 "anrufzeit": "beste Zeit zum Anrufen aus den Öffnungszeiten, außerhalb der Stoßzeiten, oder null",
 "bewertungen": "1 bis 3 Sätze: Sterne, Anzahl, häufiges Lob, häufige Kritik; null ohne Bewertungen",
 "website": "2 bis 4 Zeilen, jede mit • : am Handy gut? Online-Buchung? Chat? Was fehlt?",
 "leistung": "welche unserer Leistungen am besten passt und warum, 1 bis 2 Sätze",
 "einstieg": ["2 bis 3 Einstiegssätze für den Anruf, auf diese Firma bezogen"],
 "fragen": ["3 Fragen für das Gespräch"],
 "einwaende": [{"einwand": "wahrscheinlicher Einwand", "antwort": "kurze Antwort"}],
 "demo": true oder false (true, wenn die Website schwach ist und eine Demo überzeugen würde)}`;

const PREIS = /€|\bEuro\b|\bEUR\b|\d\s*,-/i;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v: unknown, n: number, max: number) =>
  Array.isArray(v) ? v.map((x) => text(x, max)).filter(Boolean).slice(0, n) : [];

/** Prüft die Antwort der KI. null = unbrauchbar (kein Profil, kein Einstieg oder ein Preis darin). */
export function pruefeMappe(raw: unknown): Mappe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const m: Mappe = {
    profil: text(r.profil, 2000),
    anrufzeit: text(r.anrufzeit, 200) || null,
    bewertungen: text(r.bewertungen, 800) || null,
    website: text(r.website, 900),
    leistung: text(r.leistung, 600),
    einstieg: liste(r.einstieg, 3, 400),
    fragen: liste(r.fragen, 4, 300),
    einwaende: (Array.isArray(r.einwaende) ? r.einwaende : [])
      .map((x) => ({ einwand: text((x as Record<string, unknown>)?.einwand, 150).replace(/[.!?:;,\s]+$/, ""), antwort: text((x as Record<string, unknown>)?.antwort, 300) }))
      .filter((x) => x.einwand && x.antwort)
      .slice(0, 3),
    demoHinweis: r.demo === true,
  };
  if (!m.profil || m.einstieg.length === 0) return null;
  if (PREIS.test(JSON.stringify(m))) return null;
  return m;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const GOLD = 0xd4a23c;
export const MAPPE_FUSS = "recherche-mappe";

/** Zwei Karten für den Thread. Grenzen: Beschreibung 4096, Feld 1024, zusammen höchstens 6000 Zeichen. */
export function mappeEmbeds(m: Mappe, firma: string): EmbedLike[] {
  const f = (name: string, value: string, max = 700) => ({ name, value: clip(value, max), inline: false });
  const eins: EmbedLike = {
    title: clip(`🔎 Recherche: ${firma}`, 250),
    description: clip(m.profil, 900),
    color: GOLD,
    fields: [
      ...(m.anrufzeit ? [f("🕑 Beste Zeit zum Anrufen", m.anrufzeit, 200)] : []),
      ...(m.bewertungen ? [f("⭐ Google-Bewertungen", m.bewertungen, 600)] : []),
      ...(m.website ? [f("🌐 Website", m.website, 600)] : []),
      ...(m.leistung ? [f("🎯 Passt am besten", m.leistung, 450)] : []),
    ],
    footer: { text: MAPPE_FUSS },
  };
  const zwei: EmbedLike = {
    title: "🗣️ Fürs Gespräch",
    color: GOLD,
    fields: [
      f("Einstieg", m.einstieg.map((x) => `• ${x}`).join("\n"), 600),
      ...(m.fragen.length ? [f("Fragen", m.fragen.map((x, n) => `${n + 1}. ${x}`).join("\n"), 500)] : []),
      ...(m.einwaende.length ? [f("Mögliche Einwände", m.einwaende.map((x) => `**${x.einwand}:** ${x.antwort}`).join("\n"), 600)] : []),
      ...(m.demoHinweis ? [f("🎨 Demo", "Die Website ist schwach: Eine Demo überzeugt hier oft am meisten.", 200)] : []),
    ],
    footer: { text: "Fragen einfach hier in den Thread schreiben. Mehr zur Branche: 📘 Branchenwissen in deiner 📚 Bibliothek." },
  };
  return [eins, zwei];
}

export const istMappe = (e: EmbedLike | null | undefined) => e?.footer?.text === MAPPE_FUSS;

/** Die Mappe als Text (für Notion bei „Lead aktiv“). */
export function mappeAlsText(m: Mappe): string {
  return [
    m.profil,
    m.anrufzeit && `Beste Zeit zum Anrufen: ${m.anrufzeit}`,
    m.bewertungen && `Google-Bewertungen: ${m.bewertungen}`,
    m.website && `Website:\n${m.website}`,
    m.leistung && `Passt am besten: ${m.leistung}`,
    `Einstieg:\n${m.einstieg.map((x) => `• ${x}`).join("\n")}`,
    m.fragen.length && `Fragen:\n${m.fragen.map((x, n) => `${n + 1}. ${x}`).join("\n")}`,
    m.einwaende.length && `Mögliche Einwände:\n${m.einwaende.map((x) => `• ${x.einwand}: ${x.antwort}`).join("\n")}`,
    m.demoHinweis && "Demo: Die Website ist schwach, eine Demo überzeugt hier oft am meisten.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Die Karten im Thread zurück in Text (Grundlage für Antworten auf Fragen). */
export function embedsAlsText(embeds: EmbedLike[]): string {
  return embeds
    .map((e) => [e.title, e.description, ...(e.fields ?? []).map((f) => `${f.name}: ${f.value}`)].filter(Boolean).join("\n"))
    .join("\n\n");
}
