import { findChannelId } from "@/lib/discord";
import { aendereKarte, alleNachrichten, besitzerId, call, CH_KARTEN, leadComponents, mitBesitzer, statusWort, teamRolle } from "@/lib/leads";
import { leseAkademie } from "@/lib/akademie-daten";
import { listeKunden } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";
import { uebergibKunde } from "@/lib/kunden-handlers";
import { DAVID_ID, mitglied, type Fall } from "@/lib/team";
import { schreibeTeam } from "@/lib/team-daten";
import { discordIdFuer } from "@/lib/zustaendige";

// Austritt (Plan 4, Etappe 2b): offene Fälle der Person einsammeln, einzeln übergeben, am Ende Rollen weg,
// Akademie-Kanäle ins Archiv (nicht löschen) und vom Server entfernen. Alter Verlauf auf erledigten Karten bleibt.

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";

/** Kunden (nicht verloren), bei denen die Person zuständig ist, und Lead-Karten, die sie übernommen hat. */
export async function sammleFaelle(token: string, aus: string): Promise<Fall[] | null> {
  const kunden = await listeKunden();
  if (!kunden) return null;
  const faelle: Fall[] = [];
  for (const k of kunden) {
    if (k.status === "Verloren") continue;
    const ids = (k.zustaendig ?? []).map(discordIdFuer);
    if (!ids.includes(aus)) continue;
    const kanal = await findChannelId(token, kanalName(k.nr));
    if (kanal) faelle.push({ art: "k", ref: kanal, titel: `${k.nr} ${k.name}`.slice(0, 80) });
  }
  const leads = await findChannelId(token, CH_KARTEN);
  if (leads) {
    for (const m of await alleNachrichten(token, leads, 500)) {
      const e = m.embeds[0];
      if (m.author.bot && e && besitzerId(e) === aus) faelle.push({ art: "l", ref: m.id, titel: (e.title ?? "Lead").replace(/[*_~`|>]/g, "").slice(0, 80) });
    }
  }
  return faelle;
}

/** Einen Fall an eine andere Person geben. */
export async function uebergib(token: string, fall: Pick<Fall, "art" | "ref">, aus: string, neu: string): Promise<boolean> {
  if (fall.art === "k") return uebergibKunde(token, fall.ref, aus, neu, DAVID_ID);
  const leads = await findChannelId(token, CH_KARTEN);
  if (!leads) return false;
  const m = await call<{ id: string; embeds?: Parameters<typeof besitzerId>[0][] }>(token, "GET", `/channels/${leads}/messages/${fall.ref}`);
  const e = m?.embeds?.[0];
  if (!e) return true; // Karte ist schon weg (z. B. Lead aktiv oder abgelegt)
  if (besitzerId(e) !== aus) return true;
  return aendereKarte(token, leads, fall.ref, mitBesitzer(e, neu), leadComponents("accepted", statusWort(e), neu));
}

/** Akademie-Kanäle in die Kategorie ARCHIV schieben (Rechte bleiben, nur David sieht sie). */
async function archiviereAkademie(token: string, aus: string): Promise<number> {
  const ak = await leseAkademie(token);
  const p = ak?.personen.get(aus);
  if (!p) return 0;
  const kanaele = (await call<{ id: string; name: string; type: number }[]>(token, "GET", `/guilds/${GUILD_ID}/channels`)) ?? [];
  const archiv = kanaele.find((c) => c.type === 4 && c.name.toUpperCase() === "ARCHIV")?.id;
  if (!archiv) return 0;
  let n = 0;
  for (const id of [p.lernpfad, p.bibliothek, p.uebKanal?.kanal].filter((x): x is string => Boolean(x))) {
    if ((await call(token, "PATCH", `/channels/${id}`, { parent_id: archiv, lock_permissions: false })) !== null) n++;
  }
  return n;
}

/** Den Austritt ausführen. Gibt die Zeilen für den Bericht zurück. */
export async function fuehreAustrittAus(token: string, aus: string): Promise<string[]> {
  const m = mitglied(aus);
  if (!m || aus === DAVID_ID) return ["Diese Person kann nicht austreten."];
  const bericht: string[] = [];
  // Was noch offen ist, geht an David.
  const rest = (await sammleFaelle(token, aus)) ?? [];
  let anDavid = 0;
  for (const f of rest) if (await uebergib(token, f, aus, DAVID_ID)) anDavid++;
  bericht.push(rest.length ? `• ${anDavid} von ${rest.length} noch offenen Fällen sind jetzt bei dir.` : "• Keine offenen Fälle mehr.");
  const ok = await schreibeTeam(token, { ...m, status: "ausgetreten" });
  bericht.push(ok ? "• Register: ausgetreten (Rufgruppe, Zuständig, Statistik und Zentrale ohne sie/ihn)." : "• ⚠️ Register konnte nicht geschrieben werden.");
  const rolle = await teamRolle(token);
  if (rolle) await call(token, "DELETE", `/guilds/${GUILD_ID}/members/${aus}/roles/${rolle}`);
  const archiv = await archiviereAkademie(token, aus);
  bericht.push(`• Akademie: ${archiv} Kanäle ins ARCHIV verschoben (nicht gelöscht).`);
  const raus = (await call(token, "DELETE", `/guilds/${GUILD_ID}/members/${aus}`)) !== null;
  bericht.push(raus ? "• Vom Server entfernt." : "• ⚠️ Vom Server entfernen hat nicht geklappt (fehlendes Recht?). Bitte in Discord von Hand: Rechtsklick auf die Person → Kicken. Die Rolle Team ist schon weg.");
  return bericht;
}
