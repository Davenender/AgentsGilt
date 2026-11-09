import { call, teamRolle } from "@/lib/leads";

// Rollen für den Aufnahmetest (Plan 4, Etappe 3): „Team“ oder „Anwärter“. Anwärter sehen nur #willkommen, #allgemein,
// #akademie und ihre eigenen Akademie-Kanäle. Alles, was sonst für jeden sichtbar ist, wird für Anwärter gesperrt.

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
export const ANWAERTER = "Anwärter";
const SEHEN = BigInt(1) << BigInt(10);
const SCHREIBEN = BigInt(1) << BigInt(11);
const VERLAUF = BigInt(1) << BigInt(16);

type Rolle = { id: string; name: string };
type Kanal = { id: string; name: string; type: number; permission_overwrites?: { id: string; type: number; allow: string; deny: string }[] };

/** Die Rolle „Anwärter“ (wird beim ersten Mal angelegt). */
export async function anwaerterRolle(token: string): Promise<string | null> {
  const rollen = (await call<Rolle[]>(token, "GET", `/guilds/${GUILD_ID}/roles`)) ?? [];
  const da = rollen.find((r) => r.name === ANWAERTER);
  if (da) return da.id;
  return (await call<Rolle>(token, "POST", `/guilds/${GUILD_ID}/roles`, { name: ANWAERTER, permissions: "0", color: 0xf59e0b, hoist: false, mentionable: false }))?.id ?? null;
}

/** Rolle wechseln: „team“ gibt Team und nimmt Anwärter, „anwaerter“ umgekehrt. */
export async function setzeRolle(token: string, userId: string, ziel: "team" | "anwaerter"): Promise<boolean> {
  const [team, anw] = await Promise.all([teamRolle(token), anwaerterRolle(token)]);
  if (!team || !anw) return false;
  const [dazu, weg] = ziel === "team" ? [team, anw] : [anw, team];
  const ok = (await call(token, "PUT", `/guilds/${GUILD_ID}/members/${userId}/roles/${dazu}`)) !== null;
  await call(token, "DELETE", `/guilds/${GUILD_ID}/members/${userId}/roles/${weg}`);
  return ok;
}

const kurz = (name: string) => name.toLowerCase().replace(/[^a-z0-9-]/g, "");
const ERLAUBT: Record<string, bigint> = { willkommen: SEHEN | VERLAUF, allgemein: SEHEN | VERLAUF | SCHREIBEN, akademie: SEHEN | VERLAUF };

/**
 * Sichtbarkeit für Anwärter herstellen (läuft mehrfach ohne Doppelungen): die drei erlaubten Kanäle freigeben, alles,
 * was @everyone sehen kann, für Anwärter sperren. Kanäle, die @everyone nicht sieht, sieht ein Anwärter ohnehin nicht.
 */
export async function sichtbarkeitFuerAnwaerter(token: string): Promise<{ frei: number; gesperrt: number; fehler: number }> {
  const anw = await anwaerterRolle(token);
  const kanaele = (await call<Kanal[]>(token, "GET", `/guilds/${GUILD_ID}/channels`)) ?? [];
  const r = { frei: 0, gesperrt: 0, fehler: 0 };
  if (!anw) return { ...r, fehler: 1 };
  for (const k of kanaele) {
    const alt = k.permission_overwrites?.find((o) => o.id === anw);
    const erlaubt = k.type === 0 ? ERLAUBT[kurz(k.name)] : undefined;
    if (erlaubt) {
      if (alt && (BigInt(alt.allow) & erlaubt) === erlaubt && BigInt(alt.deny) === BigInt(0)) continue;
      const ok = (await call(token, "PUT", `/channels/${k.id}/permissions/${anw}`, { type: 0, allow: String(erlaubt), deny: "0" })) !== null;
      if (ok) r.frei++;
      else r.fehler++;
      continue;
    }
    const jeder = k.permission_overwrites?.find((o) => o.id === GUILD_ID);
    const jederSieht = !jeder || (BigInt(jeder.deny) & SEHEN) === BigInt(0);
    if (!jederSieht || (alt && (BigInt(alt.deny) & SEHEN) !== BigInt(0))) continue;
    const ok = (await call(token, "PUT", `/channels/${k.id}/permissions/${anw}`, { type: 0, allow: "0", deny: String(SEHEN) })) !== null;
    if (ok) r.gesperrt++;
    else r.fehler++;
  }
  return r;
}
