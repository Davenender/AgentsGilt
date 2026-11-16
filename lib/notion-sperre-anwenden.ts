// Notion-Sperre anwenden (Etappe 6): für den Notion-Webhook (app/api/notion/route.ts) und den stündlichen Abgleich
// (app/api/kunden/abgleich/route.ts). Regeln: lib/notion-sperre.ts, Stand: lib/kunden-stand.ts.
import { findChannelId } from "@/lib/discord";
import { ladeStaende, schreibePrivat, schreibeStand, type Staende } from "@/lib/kunden-stand";
import { eigeneNotionId, setzeFelder } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";
import { alsKartenProp, entscheide, sperrHinweis, werHat, type Entscheidung, type Wer } from "@/lib/notion-sperre";
import { DAVID_ID, team } from "@/lib/team";
import { discordIdFuer } from "@/lib/zustaendige";

/** Davids Notion-Kennung aus dem Team-Register (Fallback: die bekannte). */
export const davidNotion = () => team().find((m) => m.discord === DAVID_ID)?.notion || "42dc06f2-4850-4c87-b958-a8bf40505986";

export type SperrErgebnis = { art: Entscheidung["art"] | "fehler"; felder: string[]; wer: Wer };

/**
 * Prüft eine Kundenseite gegen den gültigen Stand. Bei „zuruecksetzen“ werden die Felder in Notion zurückgesetzt,
 * `props` bekommt die gültigen Werte (damit die Karte sie gleich zeigt), und die Person bekommt eine DM.
 * Ohne Stand-Kanal oder bei Fehlern passiert nichts (lieber eine Team-Änderung durchlassen als Davids löschen).
 */
export async function wendeSperreAn(
  token: string,
  k: { nr: string; name: string; props: Record<string, unknown>; seite: string | null; editor: string | null },
  vorhanden?: Staende | null,
): Promise<SperrErgebnis> {
  const s = vorhanden ?? (await ladeStaende(token));
  const wer = werHat(k.editor, await eigeneNotionId(), davidNotion());
  if (!s) return { art: "fehler", felder: [], wer };
  const alt = s.je.get(k.nr)?.stand ?? null;
  const e = entscheide(k.props, alt, wer);
  if (e.art === "neu" || e.art === "uebernehmen") {
    if (!(await schreibeStand(token, s, k.nr, e.stand))) return { art: "fehler", felder: [], wer };
    return { art: e.art, felder: [], wer };
  }
  if (e.art !== "zuruecksetzen" || !alt) return { art: "nichts", felder: [], wer };
  if (!k.seite || !(await setzeFelder(k.seite, e.props))) return { art: "fehler", felder: e.felder, wer };
  for (const n of e.felder) if (alt[n]) k.props[n] = alsKartenProp(alt[n]);
  const person = k.editor ? discordIdFuer(k.editor) : null;
  if (person) await schreibePrivat(token, person, sperrHinweis(k.nr, k.name, e.felder, await findChannelId(token, kanalName(k.nr))));
  console.log(`[sperre] ${k.nr}: ${e.felder.join(", ")} zurückgesetzt (Team, DM ${person ? "gesendet" : "ohne Discord-Kennung"})`);
  return { art: "zuruecksetzen", felder: e.felder, wer };
}

export const STEMPEL_HINWEIS = (taetigkeit: string) =>
  `↩️ Ein- und Ausstempeln macht bei uns nur David. Deinen Eintrag „${taetigkeit || "Arbeitszeit"}“ in den Arbeitszeiten habe ich in den Papierkorb gelegt.`;
