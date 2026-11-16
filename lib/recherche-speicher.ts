// Merkzettel der Recherche-Mappe: privater Kanal „recherche-speicher“ (nur David und der Bot).
// Eine Zeile je Monat: „bewertungen|JJJJ-MM|n“. Regeln: lib/recherche-regeln.ts.
import { nurDavidKanal } from "@/lib/akademie-daten";
import { listMessages } from "@/lib/discord";
import { call } from "@/lib/leads";
import { pusheDavid } from "@/lib/ntfy";
import { BEWERTUNGEN_MAX, bewertungenErlaubt, leseZaehler, monatSchluessel, zaehlerZeile } from "@/lib/recherche-regeln";

const KANAL = "recherche-speicher";
const THEMA = "Merkzettel des Bots: Zähler für Google-Bewertungen der Recherche-Mappe (höchstens 500 im Monat). Nicht löschen.";

/** Zählt einen Bewertungs-Abruf. false, wenn die Monatsgrenze erreicht ist (dann ohne Bewertungen weiter). */
export async function zaehleBewertung(token: string, jetzt = new Date()): Promise<boolean> {
  const kanal = await nurDavidKanal(token, KANAL, THEMA);
  if (!kanal) return false;
  const monat = monatSchluessel(jetzt);
  const nachrichten = await listMessages(token, kanal, 50);
  const n = leseZaehler(nachrichten.map((m) => m.content ?? ""), monat);
  if (!bewertungenErlaubt(n)) return false;
  const zeile = nachrichten.find((m) => (m.content ?? "").startsWith(`bewertungen|${monat}|`));
  const inhalt = { content: zaehlerZeile(monat, n + 1), allowed_mentions: { parse: [] } };
  const ok = zeile
    ? await call(token, "PATCH", `/channels/${kanal}/messages/${zeile.id}`, inhalt)
    : await call(token, "POST", `/channels/${kanal}/messages`, inhalt);
  if (ok && n + 1 === BEWERTUNGEN_MAX) {
    await pusheDavid("🔎 Recherche-Mappe", `${BEWERTUNGEN_MAX} Google-Bewertungen in diesem Monat erreicht. Bis Monatsende kommen Mappen ohne Bewertungen.`);
  }
  return Boolean(ok);
}
