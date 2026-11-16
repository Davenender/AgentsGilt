// Server-Check (Davids Wunsch 16.11.2026): liest Rollen und Kanäle, prüft mit lib/server-check.ts und meldet nur, wenn
// etwas nicht stimmt (Karte in #posteingang, nur David). Archiv-Sperre: geschlossene Tickets fürs Team schreibgeschützt.
import { call, posteingangKanal, postKarte } from "@/lib/leads";
import { archivSperren, pruefeServer, type Kanal, type Rolle } from "@/lib/server-check";
import { team } from "@/lib/team";

const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";

async function lage(token: string) {
  const [rollen, kanaele, ich] = await Promise.all([
    call<Rolle[]>(token, "GET", `/guilds/${GUILD}/roles`),
    call<Kanal[]>(token, "GET", `/guilds/${GUILD}/channels`),
    call<{ id: string }>(token, "GET", "/users/@me"),
  ]);
  if (!rollen || !kanaele || !ich) return null;
  const mitglied = await call<{ roles: string[] }>(token, "GET", `/guilds/${GUILD}/members/${ich.id}`);
  return { rollen, kanaele, botRollen: mitglied?.roles ?? [] };
}

/** Prüft den Server. `melden`: bei Funden eine Karte in #posteingang. */
export async function serverCheck(token: string, melden = true): Promise<{ ok: boolean; funde: string[] }> {
  const l = await lage(token);
  if (!l) return { ok: false, funde: ["Discord war nicht lesbar."] };
  const aktive = team().filter((m) => m.status !== "ausgetreten").map((m) => m.name);
  const funde = pruefeServer({ ...l, aktive });
  if (funde.length && melden) {
    const kanal = await posteingangKanal(token);
    if (kanal) {
      await postKarte(
        token,
        kanal,
        {
          title: "🔧 Server-Check: bitte anschauen",
          description: funde.map((f) => `• ${f}`).join("\n").slice(0, 4000),
          color: 0xd4a23c,
          footer: { text: "Wöchentlicher Check (montags). Kommt nur, wenn etwas nicht stimmt." },
        },
        [],
      );
    }
  }
  console.log(`[server-check] ${funde.length} Funde`);
  return { ok: true, funde };
}

/** Geschlossene Tickets im ARCHIV fürs Team schreibgeschützt machen (Sehen und Verlauf bleiben). */
export async function sperreArchiv(token: string): Promise<{ gesperrt: string[]; fehler: string[] }> {
  const l = await lage(token);
  const teamRolle = l?.rollen.find((r) => r.name === "Team");
  if (!l || !teamRolle) return { gesperrt: [], fehler: ["Discord oder Rolle „Team“ nicht lesbar"] };
  const gesperrt: string[] = [];
  const fehler: string[] = [];
  for (const a of archivSperren(l.kanaele, teamRolle.id)) {
    const ok = await call(token, "PUT", `/channels/${a.kanal}/permissions/${teamRolle.id}`, { type: 0, allow: a.allow, deny: a.deny });
    (ok !== null ? gesperrt : fehler).push(a.name);
  }
  return { gesperrt, fehler };
}
