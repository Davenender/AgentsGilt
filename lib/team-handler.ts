import { after, NextResponse } from "next/server";
import { call, teamRolle } from "@/lib/leads";
import { bereichFuer } from "@/lib/akademie-daten";
import { befehlAus, DAVID_ID, mitglied, team, type Mitglied } from "@/lib/team";
import { schreibeTeam, stelleSicher, zeichneTeamKarte } from "@/lib/team-daten";

// Befehl /team (Plan 4, Etappe 2), nur für David: aufnehmen, daten, pause, zurueck, liste.
// Jede Änderung ist eine neue Zeile in #team-register; alles andere (Zuständig, Rufgruppe, Statistik, Akademie, Zentrale)
// liest von dort. Die Antwort sieht nur David.

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const API = "https://discord.com/api/v10";

export interface TeamInteraction {
  token?: string;
  application_id?: string;
  data?: { name?: string; options?: { name: string; type?: number; value?: unknown; options?: { name: string; value?: unknown }[] }[] };
  member?: { user?: { id: string } };
}

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
const heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

async function antworte(appId: string, itoken: string, content: string) {
  await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

/** Rolle Team geben (Aufnahmetest ist noch aus, deshalb gleich Team). */
async function gibTeamRolle(token: string, userId: string): Promise<boolean> {
  const rolle = await teamRolle(token);
  return !!rolle && (await call(token, "PUT", `/guilds/${GUILD_ID}/members/${userId}/roles/${rolle}`)) !== null;
}

export function handleTeamBefehl(i: TeamInteraction, token: string) {
  const user = i.member?.user;
  const appId = i.application_id;
  const itoken = i.token;
  if (!user || !appId || !itoken) return ephemeral("Das hat gerade nicht geklappt.");
  if (user.id !== DAVID_ID) return ephemeral("Das Team verwaltet nur David.");
  const b = befehlAus(i.data);
  if (!b) return ephemeral("Unbekannter Befehl.");

  after(async () => {
    await stelleSicher(token);
    const m = b.person ? mitglied(b.person) : null;
    const neu = (aenderung: Partial<Mitglied>): Mitglied => ({ ...(m as Mitglied), ...aenderung });

    if (b.aktion === "liste") {
      await zeichneTeamKarte(token);
      return void (await antworte(appId, itoken, "👥 Die Übersicht in #team-register ist neu gezeichnet."));
    }
    if (!b.person) return void (await antworte(appId, itoken, "Bitte eine Person auswählen."));

    if (b.aktion === "aufnehmen") {
      if (m && m.status !== "ausgetreten") return void (await antworte(appId, itoken, `${m.name} steht schon im Register (${m.status}). Ändern geht mit \`/team daten\`.`));
      if (!b.name) return void (await antworte(appId, itoken, "Bitte einen Namen angeben."));
      if (team().some((x) => x.name.toLowerCase() === b.name.toLowerCase() && x.discord !== b.person && x.status !== "ausgetreten")) {
        return void (await antworte(appId, itoken, `Den Namen ${b.name} gibt es schon im Team. Bitte einen anderen (zum Beispiel mit Nachnamen-Buchstaben).`));
      }
      const ok = await schreibeTeam(token, { discord: b.person, name: b.name, status: "team", notion: "", figur: b.figur, seit: heute(), telefon: b.telefon });
      if (!ok) return void (await antworte(appId, itoken, "⚠️ Das Register war nicht erreichbar. Bitte nochmal versuchen."));
      const rolle = await gibTeamRolle(token, b.person);
      const akademie = await bereichFuer(token, b.person);
      return void (await antworte(
        appId,
        itoken,
        [
          `✅ **${b.name}** ist im Team.`,
          `• Rolle Team: ${rolle ? "vergeben" : "⚠️ nicht vergeben (bitte von Hand)"}`,
          `• Akademie: ${akademie}`,
          `• Rufgruppe: ${b.telefon ? `klingelt ab jetzt mit (${b.telefon})` : "noch keine Nummer, mit `/team daten telefon:` nachtragen"}`,
          "",
          "**Noch von dir:**",
          "1. In Notion als **Gast** einladen. Danach die Notion-Kennung mit `/team daten notion:` eintragen (frag mich im Chat, ich suche sie dir heraus). Erst dann kann die Person zuständig sein.",
          "2. Die Push-App (ntfy) mit dem Team-Thema einrichten lassen.",
          "3. Die Vertraulichkeitsvereinbarung unterschreiben lassen.",
        ].join("\n"),
      ));
    }

    if (!m) return void (await antworte(appId, itoken, "Diese Person steht nicht im Register. Neue Leute mit `/team aufnehmen`."));

    if (b.aktion === "daten") {
      const aenderung: Partial<Mitglied> = {};
      if (b.telefon) aenderung.telefon = b.telefon;
      if (b.figur) aenderung.figur = b.figur;
      if (b.notion) aenderung.notion = b.notion;
      if (b.name) aenderung.name = b.name;
      if (!Object.keys(aenderung).length) return void (await antworte(appId, itoken, "Nichts zu ändern: Gib Telefon, Figur, Name oder Notion an."));
      const ok = await schreibeTeam(token, neu(aenderung));
      return void (await antworte(appId, itoken, ok ? `✅ ${m.name}: ${Object.keys(aenderung).join(", ")} geändert.` : "⚠️ Das Register war nicht erreichbar."));
    }

    if (b.aktion === "pause") {
      if (m.discord === DAVID_ID) return void (await antworte(appId, itoken, "Du selbst kannst nicht pausieren."));
      if (m.status !== "team") return void (await antworte(appId, itoken, `${m.name} ist gerade nicht im Status Team (${m.status}).`));
      const ok = await schreibeTeam(token, neu({ status: "pause" }));
      return void (await antworte(
        appId,
        itoken,
        ok
          ? `⏸️ **${m.name}** ist in Pause: bleibt im Server und in der Akademie, klingelt nicht mehr in der Rufgruppe, ist nicht mehr als Zuständig wählbar und kann außerhalb der Akademie keine Knöpfe drücken. Die Push-App bekommt weiter das Team-Thema; wenn das nicht soll, bitte dort abbestellen lassen.`
          : "⚠️ Das Register war nicht erreichbar.",
      ));
    }

    if (b.aktion === "zurueck") {
      if (m.status !== "pause") return void (await antworte(appId, itoken, `${m.name} ist nicht in Pause (${m.status}).`));
      const ok = await schreibeTeam(token, neu({ status: "team" }));
      return void (await antworte(appId, itoken, ok ? `🟢 **${m.name}** ist zurück im Team.` : "⚠️ Das Register war nicht erreichbar."));
    }

    await antworte(appId, itoken, "Unbekannter Befehl.");
  });
  return NextResponse.json({ type: 5, data: { flags: 64 } });
}
