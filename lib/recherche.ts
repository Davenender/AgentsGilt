// Recherche-Mappe erstellen (Etappe 3, 16.11.2026): Website-Text, Google-Bewertungen (höchstens 500 im Monat,
// lib/recherche-speicher.ts) und unsere Analyse gehen an Claude (Haiku 5.5), heraus kommt die Mappe.
// Aufbau und Prüfung: lib/recherche-mappe.ts. Antworten auf Fragen im Thread: beantworteFrage().
import Anthropic from "@anthropic-ai/sdk";
import { LEISTUNGEN, seitenText } from "@/lib/lead-analyse";
import { MAPPE_PROMPT, pruefeMappe, type Mappe } from "@/lib/recherche-mappe";
import { zaehleBewertung } from "@/lib/recherche-speicher";

const PLACES = "https://places.googleapis.com/v1";

export interface GoogleInfos {
  sterne: number | null;
  anzahl: number | null;
  rezensionen: string[];
  oeffnungszeiten: string[];
}

/** Google-Infos zur Firma. Erst die Kennung (kostenlose Suche nur nach IDs), dann die Details mit Bewertungen. */
export async function holeGoogleInfos(token: string, suchtext: string): Promise<GoogleInfos | null> {
  const key = process.env.GOOGLE_PLACES_KEY?.trim();
  if (!key || !suchtext.trim()) return null;
  try {
    const such = await fetch(`${PLACES}/places:searchText`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({ textQuery: suchtext, languageCode: "de", regionCode: "DE", pageSize: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    const id = ((await such.json()) as { places?: { id?: string }[] }).places?.[0]?.id;
    if (!id) return null;
    // Erst zählen, dann abrufen: Ist die Monatsgrenze erreicht, gibt es die Mappe ohne Bewertungen.
    if (!(await zaehleBewertung(token))) return null;
    const res = await fetch(`${PLACES}/places/${id}?languageCode=de`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,reviews,regularOpeningHours" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const p = (await res.json()) as {
      rating?: number;
      userRatingCount?: number;
      reviews?: { rating?: number; text?: { text?: string } }[];
      regularOpeningHours?: { weekdayDescriptions?: string[] };
    };
    return {
      sterne: p.rating ?? null,
      anzahl: p.userRatingCount ?? null,
      rezensionen: (p.reviews ?? []).map((r) => `${r.rating ?? "?"}★ ${(r.text?.text ?? "").slice(0, 500)}`).filter((t) => t.length > 3),
      oeffnungszeiten: p.regularOpeningHours?.weekdayDescriptions ?? [],
    };
  } catch (err) {
    console.error("[recherche] Google-Infos fehlgeschlagen:", err);
    return null;
  }
}

async function frageClaude(system: string, inhalt: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await new Anthropic({ apiKey, timeout: 40_000, maxRetries: 1 }).messages.create({
      model: "claude-haiku-5-5",
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: inhalt }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (err) {
    console.error("[recherche] Claude fehlgeschlagen:", err);
    return null;
  }
}

/** Erstellt die Mappe. null, wenn die KI nichts Brauchbares liefert. */
export async function erstelleMappe(
  token: string,
  lead: { firma: string; website: string | null; adresse: string | null; analyse: string; branche: string | null },
): Promise<Mappe | null> {
  const [seite, google] = await Promise.all([
    lead.website ? seitenText(lead.website) : Promise.resolve(null),
    holeGoogleInfos(token, [lead.firma, lead.adresse].filter(Boolean).join(" ")),
  ]);
  const inhalt = [
    `<analyse>\nFirma: ${lead.firma}\nBranche: ${lead.branche ?? "unbekannt"}\nAdresse: ${lead.adresse ?? "unbekannt"}\n${lead.analyse}\n</analyse>`,
    seite ? `<website url="${seite.url}">\n${seite.text}\n</website>` : "<website>keine Website oder nicht lesbar</website>",
    google
      ? `<google>\nSterne: ${google.sterne ?? "?"} bei ${google.anzahl ?? "?"} Bewertungen\nÖffnungszeiten:\n${google.oeffnungszeiten.join("\n") || "unbekannt"}\nBewertungen:\n${google.rezensionen.join("\n") || "keine Texte"}\n</google>`
      : "<google>keine Daten</google>",
  ].join("\n\n");
  const out = await frageClaude(MAPPE_PROMPT.replace("{LEISTUNGEN}", LEISTUNGEN.join(", ")), inhalt, 3000);
  if (!out) return null;
  const a = out.indexOf("{");
  const b = out.lastIndexOf("}");
  try {
    return a !== -1 && b > a ? pruefeMappe(JSON.parse(out.slice(a, b + 1))) : null;
  } catch {
    return null;
  }
}

const FRAGE_PROMPT = `Du hilfst einem Mitarbeiter der KI-Agentur Agents Gilt, sich auf einen Anruf bei einer Firma vorzubereiten.
Antworte kurz (höchstens 6 Sätze), auf Deutsch, in der Du-Form, nur auf Grundlage der Recherche-Mappe und des bisherigen Threads.
Steht etwas nicht darin, sag das ehrlich und schlag vor, wo man nachsehen kann (Website, Google-Eintrag, Impressum). Nenne keine Preise.`;

/** Antwort auf eine Frage im Recherche-Thread. */
export async function beantworteFrage(mappe: string, verlauf: string, frage: string): Promise<string | null> {
  const out = await frageClaude(FRAGE_PROMPT, `<mappe>\n${mappe.slice(0, 8000)}\n</mappe>\n<thread>\n${verlauf.slice(-4000)}\n</thread>\n<frage>\n${frage.slice(0, 1500)}\n</frage>`, 700);
  return out ? out.slice(0, 1800) : null;
}
