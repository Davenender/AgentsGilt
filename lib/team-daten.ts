import { alleNachrichten, call } from "@/lib/leads";
import { nurDavidKanal } from "@/lib/akademie-daten";
import { teamEintraege } from "@/lib/luca-logik";
import { leseEinstellungen, leseRegister, setzeEinstellungen, setzeTeam, START, team, teamKarte, zeileEinstellung, zeileTeam, type Mitglied } from "@/lib/team";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
// Team-Register laden und ändern (Plan 4). Der Kanal #team-register sieht nur David; der Bot schreibt dort je Änderung
// eine Zeile. Gelesen wird höchstens alle 5 Minuten (pro laufender Instanz), Fehler lassen den alten Stand stehen.

export const REGISTER = "team-register";
const MERKEN_MS = 5 * 60_000;
let bis = 0;

export const registerKanal = (token: string) => nurDavidKanal(token, REGISTER, "Team-Register: wer im Team ist (Anwärter, Team, Pause, Ausgetreten). Schreibt nur der Bot. Nicht löschen.");

/** Stand aus Discord holen (mit Zwischenspeicher). Gibt die Liste zurück, auch wenn Discord nicht antwortet. */
export async function ladeTeam(token: string | undefined, neu = false): Promise<readonly Mitglied[]> {
  if (!token || (!neu && Date.now() < bis)) return team();
  try {
    const kanal = await registerKanal(token);
    if (kanal) {
      const msgs = (await alleNachrichten(token, kanal, 500)).slice().reverse();
      setzeTeam(leseRegister(msgs));
      setzeEinstellungen(leseEinstellungen(msgs));
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
  if (ok) {
    await ladeTeam(token, true);
    await zeichneTeamKarte(token);
  }
  return ok;
}

/** Den Schalter Aufnahmetest umlegen (neue Zeile im Register). */
export async function schreibeAufnahmetest(token: string, an: boolean): Promise<boolean> {
  const kanal = await registerKanal(token);
  if (!kanal) return false;
  const ok = (await call(token, "POST", `/channels/${kanal}/messages`, { content: zeileEinstellung("aufnahmetest", an), allowed_mentions: { parse: [] } })) !== null;
  if (ok) {
    await ladeTeam(token, true);
    await zeichneTeamKarte(token);
  }
  return ok;
}

const KARTE_TITEL = "👥 Team-Register";

/** Die Übersicht oben in #team-register neu zeichnen (oder anlegen und anheften). */
export async function zeichneTeamKarte(token: string): Promise<void> {
  const kanal = await registerKanal(token);
  if (!kanal) return;
  const karte = { ...teamKarte(team()), allowed_mentions: { parse: [] } };
  const alt = (await alleNachrichten(token, kanal, 500)).find((m) => m.author.bot && m.embeds[0]?.title === KARTE_TITEL);
  if (alt) await call(token, "PATCH", `/channels/${kanal}/messages/${alt.id}`, karte);
  else {
    const m = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, karte);
    if (m) await call(token, "PUT", `/channels/${kanal}/pins/${m.id}`);
  }
}

/** Beim ersten Mal die bisherige Besetzung ins Register schreiben (mit den Nummern aus den Vercel-Einstellungen). */
export async function stelleSicher(token: string): Promise<void> {
  const kanal = await registerKanal(token);
  if (!kanal) return;
  const msgs = await alleNachrichten(token, kanal, 500);
  if (msgs.some((m) => m.content.startsWith("team · "))) return;
  const handys = teamEintraege(`${process.env.RUFGRUPPE_NUMMERN ?? ""},${process.env.RUFGRUPPE_NUMMERN_2 ?? ""}`, null);
  for (const m of START) {
    const h = handys.find((e) => e.name?.toLowerCase() === m.name.toLowerCase());
    await call(token, "POST", `/channels/${kanal}/messages`, { content: zeileTeam({ ...m, telefon: h?.roh ?? "" }), allowed_mentions: { parse: [] } });
  }
  await ladeTeam(token, true);
}

/** Meldet den Befehl /team bei Discord an (nur Leute mit Admin-Rechten sehen ihn; der Bot prüft zusätzlich auf David). */
export async function meldeTeamBefehlAn(token: string): Promise<boolean> {
  const app = await call<{ id?: string }>(token, "GET", "/oauth2/applications/@me");
  if (!app?.id) return false;
  const person = { type: 6, name: "person", description: "Wer?", required: true };
  const figur = { type: 3, name: "figur", description: "Haarfarbe der Figur in der Zentrale", required: false, choices: ["blond", "schwarz", "braun", "rot"].map((v) => ({ name: v, value: v })) };
  const telefon = { type: 3, name: "telefon", description: "Handynummer für die Rufgruppe", required: false, max_length: 30 };
  const befehl = {
    name: "team",
    type: 1,
    description: "Team verwalten (nur David)",
    default_member_permissions: "0",
    options: [
      { type: 1, name: "aufnehmen", description: "Neue Person ins Team aufnehmen", options: [person, { type: 3, name: "name", description: "Vorname, so wie er überall stehen soll", required: true, max_length: 40 }, figur, telefon] },
      { type: 1, name: "daten", description: "Telefon, Figur, Name oder Notion-Kennung ändern", options: [person, telefon, figur, { type: 3, name: "name", description: "Neuer Name", required: false, max_length: 40 }, { type: 3, name: "notion", description: "Notion-Kennung (für „Zuständig“)", required: false, max_length: 60 }] },
      { type: 1, name: "pause", description: "Person pausiert (bleibt im Server, keine Rufgruppe, nicht zuständig)", options: [person] },
      { type: 1, name: "zurueck", description: "Person aus der Pause zurückholen", options: [person] },
      {
        type: 1,
        name: "austritt",
        description: "Person verlässt das Team: Übergabe je Kunde, dann Rollen weg und vom Server",
        options: [
          { ...person, required: false, description: "Wer? (Ist die Person schon weg vom Server: stattdessen kennung)" },
          { type: 3, name: "kennung", description: "Discord-Nummer oder Name aus #team-register, falls die Person den Server schon verlassen hat", required: false, max_length: 60 },
        ],
      },
      { type: 1, name: "aufnahmetest", description: "Aufnahmetest an: Wer noch nicht bestanden hat, wird Anwärter", options: [{ type: 3, name: "zustand", description: "an oder aus", required: true, choices: [{ name: "an", value: "an" }, { name: "aus", value: "aus" }] }] },
      { type: 1, name: "liste", description: "Übersicht in #team-register neu zeichnen" },
    ],
  };
  return (await call(token, "POST", `/applications/${app.id}/guilds/${GUILD_ID}/commands`, befehl)) !== null;
}
