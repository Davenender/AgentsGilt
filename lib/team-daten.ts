import { alleNachrichten, call } from "@/lib/leads";
import { nurDavidKanal } from "@/lib/akademie-daten";
import { leseRegister, setzeTeam, team, zeileTeam, type Mitglied } from "@/lib/team";

// Team-Register laden und ändern (Plan 4). Der Kanal #team-register sieht nur David; der Bot schreibt dort je Änderung
// eine Zeile. Gelesen wird höchstens alle 5 Minuten (pro laufender Instanz), Fehler lassen den alten Stand stehen.

export const REGISTER = "team-register";
const MERKEN_MS = 5 * 60_000;
let bis = 0;

const registerKanal = (token: string) => nurDavidKanal(token, REGISTER, "Team-Register: wer im Team ist (Anwärter, Team, Pause, Ausgetreten). Schreibt nur der Bot. Nicht löschen.");

/** Stand aus Discord holen (mit Zwischenspeicher). Gibt die Liste zurück, auch wenn Discord nicht antwortet. */
export async function ladeTeam(token: string | undefined, neu = false): Promise<readonly Mitglied[]> {
  if (!token || (!neu && Date.now() < bis)) return team();
  try {
    const kanal = await registerKanal(token);
    if (kanal) {
      const msgs = (await alleNachrichten(token, kanal, 500)).slice().reverse();
      setzeTeam(leseRegister(msgs));
      bis = Date.now() + MERKEN_MS;
    }
  } catch (err) {
    console.error("[team] Register nicht lesbar:", err);
  }
  return team();
}

/** Eine Änderung festhalten (neueste Zeile gilt) und sofort übernehmen. */
export async function schreibeTeam(token: string, m: Mitglied): Promise<boolean> {
  const kanal = await registerKanal(token);
  if (!kanal) return false;
  const ok = (await call(token, "POST", `/channels/${kanal}/messages`, { content: zeileTeam(m), allowed_mentions: { parse: [] } })) !== null;
  if (ok) await ladeTeam(token, true);
  return ok;
}
