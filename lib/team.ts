// Team-Register (Plan 4, Etappe 1): Wer gehört zum Team, mit welchem Stand. Reine Logik ohne Netz.
//
// Statt fester Namen im Code steht das Team im Discord-Kanal #team-register (nur David sieht ihn), eine Zeile je
// Änderung: „team · <discord> · <name> · <status> · <notion> · <figur> · <seit>“. Die neueste Zeile je Person gilt.
// Ohne Einträge gilt die Startliste (David, Jakob, Mijo). Geladen wird in lib/team-daten.ts, hier liegt der Stand.

export type Status = "anwaerter" | "team" | "pause" | "ausgetreten";
const STATUS: Status[] = ["anwaerter", "team", "pause", "ausgetreten"];

export interface Mitglied {
  discord: string;
  name: string;
  status: Status;
  /** Notion-Kennung (für „Zuständig“), leer solange kein Zugang */
  notion: string;
  /** Aussehen der Figur in der Zentrale, zum Beispiel „blond“ */
  figur: string;
  /** seit wann (YYYY-MM-DD) */
  seit: string;
}

const SEP = " · ";
export const DAVID_ID = "806859236768088114";

export const START: Mitglied[] = [
  { discord: DAVID_ID, notion: "42dc06f2-4850-4c87-b958-a8bf40505986", name: "David", status: "team", figur: "", seit: "" },
  { discord: "523479048727560205", notion: "405d872b-594c-814f-92f2-00022b1d1178", name: "Jakob", status: "team", figur: "blond", seit: "" },
  { discord: "1363529531939492133", notion: "233d872b-594c-81cb-98c0-0002013ab53c", name: "Mijo", status: "team", figur: "schwarz", seit: "" },
];

export const zeileTeam = (m: Mitglied) => ["team", m.discord, m.name, m.status, m.notion, m.figur, m.seit].join(SEP);

/** Das Register aus den Nachrichten (älteste zuerst). David bleibt immer im Team. */
export function leseRegister(nachrichten: { content: string }[]): Mitglied[] {
  const liste = START.map((m) => ({ ...m }));
  for (const n of nachrichten) {
    const t = n.content.split(SEP).map((x) => x.trim());
    if (t[0] !== "team" || !/^\d{5,25}$/.test(t[1] ?? "") || !t[2] || !STATUS.includes(t[3] as Status)) continue;
    const neu: Mitglied = { discord: t[1], name: t[2].slice(0, 40), status: t[3] as Status, notion: t[4] ?? "", figur: t[5] ?? "", seit: t[6] ?? "" };
    if (neu.discord === DAVID_ID) neu.status = "team";
    const i = liste.findIndex((m) => m.discord === neu.discord);
    if (i >= 0) liste[i] = neu;
    else liste.push(neu);
  }
  return liste;
}

let stand: Mitglied[] = START;

/** Den geladenen Stand setzen (lib/team-daten.ts, Tests). */
export const setzeTeam = (liste: Mitglied[]) => {
  stand = liste.length ? liste : START;
};

/** Alle, die je im Team waren (auch Ausgetretene, damit alte Karten Namen behalten). */
export const team = (): readonly Mitglied[] => stand;
/** Wer gerade arbeitet: zuständig wählbar, Rufgruppe, Pushes. */
export const aktive = () => stand.filter((m) => m.status === "team");
/** Wer einen Akademie-Bereich hat (alle außer Ausgetretenen). */
export const mitAkademie = () => stand.filter((m) => m.status !== "ausgetreten");
export const mitglied = (discord: string) => stand.find((m) => m.discord === discord) ?? null;
export const nameVon = (discord: string) => mitglied(discord)?.name ?? null;
/** Discord-Kennung → Name (für Anzeigen, z. B. im Support-Chat). */
export const namen = (): Record<string, string> => Object.fromEntries(stand.map((m) => [m.discord, m.name]));
