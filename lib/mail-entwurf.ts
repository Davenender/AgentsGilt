// KI-Entwurf für Mails des Teams an Kunden (Etappe 2, 16.11.2026). Der Entwurf ist nur ein Vorschlag:
// Das Teammitglied ändert ihn, David gibt ihn frei. Nie Preise (Davids Regel), nichts erfinden.
// Gleiches Muster wie „Gespräch auswerten“ (lib/kunden-handlers.ts): JSON aus der Antwort, danach prüfen.
// Test der Prüfung: tests/mail-entwurf.test.ts.
import Anthropic from "@anthropic-ai/sdk";
import type { MailOrt } from "./mail-antwort.ts";

export interface Entwurf {
  zusammenfassung: string;
  betreff: string;
  text: string;
}

export const ENTWURF_PROMPT = `Du schreibst für die KI-Agentur Agents Gilt den Entwurf einer kurzen E-Mail an einen Kunden. Ein Mitarbeiter liest und ändert ihn vor dem Senden, danach wird er freigegeben.

Regeln:
- Du-Form, freundlich, klar, 60 bis 150 Wörter. Nur wenn unser Team den Kunden im Verlauf schon siezt, bleib beim Sie.
- Beginne mit „Hallo <Vorname des Kunden>,“, wenn der Name bekannt ist, sonst mit „Hallo,“.
- Geh auf das ein, was im Verlauf offen ist. Erfinde nichts: keine Termine, Zusagen, Fakten oder Leistungen, die nicht im Verlauf oder in den Kundendaten stehen.
- Nenne nie Preise, Beträge, Rabatte oder Kosten. Bei Preisfragen: Das besprechen wir gern kurz am Telefon oder in einem kostenlosen Erstgespräch.
- Biete am Ende einen nächsten Schritt an (zum Beispiel einen kurzen Anruf oder einen Termin), ohne Druck.
- Schließe mit „Viele Grüße“, darunter der Vorname des Mitarbeiters ({VORNAME}), darunter „Agents Gilt“.
- Kein Markdown, keine Emojis.

{LAGE}

Antworte ausschließlich mit einem JSON-Objekt:
{"zusammenfassung": "1 bis 2 Sätze für den Mitarbeiter, worum es geht", "betreff": "höchstens 80 Zeichen, dieselbe Anrede wie im Text", "text": "die Mail"}`;

const LAGE: Record<MailOrt, string> = {
  ticket: "Lage: Der Kunde hat im Website-Chat mit unserem Team geschrieben und ist seit Stunden nicht mehr im Chat. Die Mail führt das Gespräch weiter.",
  anfrage: "Lage: Der Kunde hat auf agentsgilt.com das Kontaktformular ausgefüllt. Die Mail ist unsere erste persönliche Antwort darauf.",
  kundenmail: "Lage: Der Kunde hat uns eine Mail geschrieben. Die Mail ist die Antwort darauf.",
  kunde: "Lage: Wir schreiben einem bestehenden Kunden oder Interessenten zum aktuellen Stand.",
};

const PREIS = /€|\bEuro\b|\bEUR\b|\d\s*,-/i;
const kurz = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Duzt der Text, darf der Betreff nicht siezen (16.11.: „Ihre Nachricht …“ über einem Text mit „du“).
 * Siezt der Text, bleibt der Betreff, wie er ist.
 */
export function betreffWieText(betreff: string, text: string): string {
  const duzt = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i.test(text);
  const siezt = /\b(Sie|Ihnen|Ihre?|Ihren|Ihrem|Ihrer)\b/.test(text.replace(/^Hallo[^\n]*\n/, ""));
  if (!duzt || siezt) return betreff;
  return betreff
    .replace(/\bIhre\b/g, "Deine")
    .replace(/\bIhren\b/g, "Deinen")
    .replace(/\bIhrem\b/g, "Deinem")
    .replace(/\bIhrer\b/g, "Deiner")
    .replace(/\bIhr\b/g, "Dein")
    .replace(/\bIhnen\b/g, "dir")
    .replace(/\bSie\b/g, "du");
}

/** Prüft die Antwort der KI. null heißt: unbrauchbar (kein Text oder ein Preis darin). */
export function pruefeEntwurf(raw: unknown): Entwurf | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const text = kurz(r.text, 3500);
  if (!text || PREIS.test(text)) return null;
  let betreff = kurz(r.betreff, 200);
  if (betreff.length > 80) betreff = `${betreff.slice(0, 79).trimEnd()}…`;
  return { zusammenfassung: kurz(r.zusammenfassung, 400), betreff: betreffWieText(betreff, text), text };
}

/** Schreibt den Entwurf. null, wenn die KI nicht erreichbar war oder nichts Brauchbares kam. */
export async function schreibeEntwurf(k: { ort: MailOrt; verlauf: string; kunde?: string; vorname: string }): Promise<Entwurf | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await new Anthropic({ apiKey, timeout: 25_000, maxRetries: 1 }).messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1500,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: ENTWURF_PROMPT.replace("{VORNAME}", k.vorname || "dein Team").replace("{LAGE}", LAGE[k.ort]),
      messages: [
        {
          role: "user",
          content: `<verlauf>\n${k.verlauf.slice(0, 20_000)}\n</verlauf>${k.kunde ? `\n<kunde>\n${k.kunde.slice(0, 4000)}\n</kunde>` : ""}`,
        },
      ],
    });
    const out = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const a = out.indexOf("{");
    const b = out.lastIndexOf("}");
    return a !== -1 && b > a ? pruefeEntwurf(JSON.parse(out.slice(a, b + 1))) : null;
  } catch (err) {
    console.error("[mail] Entwurf fehlgeschlagen:", err);
    return null;
  }
}
