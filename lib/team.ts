// Team-Register (Plan 4, Etappe 1): Wer gehört zum Team, mit welchem Stand. Reine Logik ohne Netz.
//
// Statt fester Namen im Code steht das Team im Discord-Kanal #team-register (nur David sieht ihn), eine Zeile je
// Änderung: „team · <discord> · <name> · <status> · <notion> · <figur> · <seit> · <telefon>“. Die neueste Zeile je Person gilt.
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
  /** Handynummer für die Rufgruppe (leer = Nummer aus den Vercel-Einstellungen, falls dort mit Namen) */
  telefon: string;
}

const SEP = " · ";
export const DAVID_ID = "806859236768088114";

export const START: Mitglied[] = [
  { discord: DAVID_ID, notion: "42dc06f2-4850-4c87-b958-a8bf40505986", name: "David", status: "team", figur: "", seit: "", telefon: "" },
  { discord: "523479048727560205", notion: "405d872b-594c-814f-92f2-00022b1d1178", name: "Jakob", status: "team", figur: "blond", seit: "", telefon: "" },
  { discord: "1363529531939492133", notion: "233d872b-594c-81cb-98c0-0002013ab53c", name: "Mijo", status: "team", figur: "schwarz", seit: "", telefon: "" },
];

export const zeileTeam = (m: Omit<Mitglied, "telefon"> & { telefon?: string }) =>
  ["team", m.discord, m.name, m.status, m.notion, m.figur, m.seit, m.telefon ?? ""].join(SEP);

/** Das Register aus den Nachrichten (älteste zuerst). David bleibt immer im Team. */
export function leseRegister(nachrichten: { content: string }[]): Mitglied[] {
  const liste = START.map((m) => ({ ...m }));
  for (const n of nachrichten) {
    const t = n.content.split(SEP).map((x) => x.trim());
    if (t[0] !== "team" || !/^\d{5,25}$/.test(t[1] ?? "") || !t[2] || !STATUS.includes(t[3] as Status)) continue;
    const neu: Mitglied = { discord: t[1], name: t[2].slice(0, 40), status: t[3] as Status, notion: t[4] ?? "", figur: t[5] ?? "", seit: t[6] ?? "", telefon: t[7] ?? "" };
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

// ------------------------------------------------------------ Rufgruppe

type Handy = { name: string | null; roh: string };

/**
 * Wer bei Kunden klingelt: die Einträge aus den Vercel-Einstellungen, abgeglichen mit dem Register. Eine Nummer im
 * Register gilt vor der aus Vercel; wer nicht im Status Team ist (Pause, Anwärter, Ausgetreten), klingelt nicht.
 * Wer nur im Register eine Nummer hat, kommt dazu. David regelt die Rufgruppe weiter selbst (luca-logik).
 */
export function mitRegister(env: Handy[], liste: readonly Mitglied[]): Handy[] {
  const nachName = new Map(liste.map((m) => [m.name.toLowerCase(), m]));
  const out: Handy[] = [];
  for (const e of env) {
    const m = e.name ? nachName.get(e.name.toLowerCase()) : undefined;
    if (!m) out.push(e);
    else if (m.status === "team") out.push(m.telefon ? { name: e.name, roh: m.telefon } : e);
  }
  const imEnv = new Set(env.map((e) => e.name?.toLowerCase()).filter(Boolean));
  for (const m of liste) {
    if (m.status === "team" && m.telefon && m.discord !== DAVID_ID && !imEnv.has(m.name.toLowerCase())) out.push({ name: m.name, roh: m.telefon });
  }
  return out;
}

// ------------------------------------------------------------ Übersicht und Befehle

const ZEICHEN: Record<Status, string> = { team: "🟢", pause: "⏸️", anwaerter: "🎓", ausgetreten: "⚪" };
const WORT: Record<Status, string> = { team: "Team", pause: "Pause", anwaerter: "Anwärter", ausgetreten: "Ausgetreten" };

// ------------------------------------------------------------ Einstellungen (Etappe 3)

export type Einstellungen = { aufnahmetest: boolean };
export const zeileEinstellung = (name: "aufnahmetest", an: boolean) => ["einstellung", name, an ? "an" : "aus"].join(SEP);

/** Einstellungen aus dem Register (neueste Zeile gilt). Der Aufnahmetest ist aus, bis David ihn einschaltet. */
export function leseEinstellungen(nachrichten: { content: string }[]): Einstellungen {
  const e: Einstellungen = { aufnahmetest: false };
  for (const n of nachrichten) {
    const t = n.content.split(SEP).map((x) => x.trim());
    if (t[0] === "einstellung" && t[1] === "aufnahmetest") e.aufnahmetest = t[2] === "an";
  }
  return e;
}

let einstellungen: Einstellungen = { aufnahmetest: false };
export const setzeEinstellungen = (e: Einstellungen) => {
  einstellungen = e;
};
export const aufnahmetestAn = () => einstellungen.aufnahmetest;

/** Die Karte oben in #team-register (nur David sieht sie). */
export function teamKarte(liste: readonly Mitglied[], e: Einstellungen = einstellungen) {
  const zeilen = liste.map((m) =>
    [
      `${ZEICHEN[m.status]} **${m.name}** · ${WORT[m.status]}${m.seit ? ` seit ${m.seit}` : ""}`,
      m.discord === DAVID_ID ? "Chef" : m.telefon ? `📞 ${m.telefon}` : "📞 aus den Vercel-Einstellungen oder fehlt",
      m.notion ? "Notion ✓" : "Notion fehlt",
      m.figur ? `Figur ${m.figur}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  );
  return {
    embeds: [
      {
        title: "👥 Team-Register",
        color: 0x3b82f6,
        description: [
          zeilen.join("\n"),
          "",
          `🎓 **Aufnahmetest: ${e.aufnahmetest ? "an" : "aus"}** ${e.aufnahmetest ? "(neue Leute und alle, die noch nicht bestanden haben, sind Anwärter)" : "(neue Leute kommen direkt ins Team)"}`,
          "",
          "**Befehle (nur David)**",
          "`/team aufnehmen` neue Person · `/team daten` Telefon, Figur, Notion · `/team pause` · `/team zurueck` · `/team austritt` · `/team aufnahmetest` · `/team liste`",
          "",
          "🟢 Team · ⏸️ Pause (bleibt im Server, keine Rufgruppe, nicht zuständig) · 🎓 Anwärter · ⚪ Ausgetreten",
        ].join("\n"),
      },
    ],
  };
}

export type Befehl = { aktion: string; person: string; name: string; figur: string; telefon: string; notion: string; zustand: string };

/** Den Befehl /team aus den Discord-Daten lesen. */
export function befehlAus(data: { name?: string; options?: { name: string; type?: number; value?: unknown; options?: { name: string; value?: unknown }[] }[] } | undefined): Befehl | null {
  const sub = data?.options?.[0];
  if (data?.name !== "team" || !sub) return null;
  const wert = (n: string) => String(sub.options?.find((o) => o.name === n)?.value ?? "").trim();
  return { aktion: sub.name, person: wert("person"), name: wert("name").slice(0, 40), figur: wert("figur").slice(0, 20), telefon: wert("telefon").slice(0, 30), notion: wert("notion").slice(0, 60), zustand: wert("zustand") };
}

/** Pause und Anwärter dürfen außerhalb der Akademie (Knöpfe ak:…, Befehl /a) nichts auslösen. Unbekannte regelt der Rest. */
export function darfHandeln(userId: string, art: string): boolean {
  const m = mitglied(userId);
  if (!m || m.status === "team") return true;
  return art.startsWith("ak:") || art === "befehl:a";
}

// ------------------------------------------------------------ Austritt (Etappe 2b)

/** In einer Liste von Discord-Kennungen die gehende Person durch die neue ersetzen (ohne Doppelte, Reihenfolge bleibt). */
export function ersetzeIn(ids: string[], alt: string, neu: string): string[] {
  if (!ids.includes(alt)) return ids;
  const out: string[] = [];
  for (const id of ids.map((x) => (x === alt ? neu : x))) if (!out.includes(id)) out.push(id);
  return out;
}

/** Wer einen Fall übernehmen kann: alle im Status Team außer der gehenden Person. */
export const ziele = (aus: string) => aktive().filter((m) => m.discord !== aus).map((m) => ({ label: m.name, value: m.discord }));

export type Fall = { art: "k" | "l"; ref: string; titel: string };
const ART: Record<Fall["art"], string> = { k: "👥 Kunde", l: "🗂️ Lead-Karte" };

/** Je offenem Fall eine Auswahl „wer übernimmt?“, höchstens 4 Fälle je Nachricht (Discord erlaubt 5 Reihen). */
export function uebergabeNachrichten(aus: string, name: string, faelle: Fall[], optionen: { label: string; value: string }[]) {
  const out: { embeds: { title: string; description: string; color: number }[]; components: { type: number; components: Record<string, unknown>[] }[] }[] = [];
  for (let i = 0; i < faelle.length; i += 4) {
    const teil = faelle.slice(i, i + 4);
    out.push({
      embeds: [{ title: `🚪 Übergabe von ${name} (${i + 1}–${i + teil.length} von ${faelle.length})`, color: 0xf59e0b, description: teil.map((f) => `${ART[f.art]}: **${f.titel}**`).join("\n") }],
      components: teil.map((f) => ({
        type: 1,
        components: [{ type: 3, custom_id: `tm:ue:${aus}:${f.art}:${f.ref}`, placeholder: `${f.titel} → wer übernimmt?`.slice(0, 150), options: optionen.slice(0, 25) }],
      })),
    });
  }
  return out;
}

/** Der rote Knopf zum Ausführen (mit Nachfrage). */
export const austrittKnopf = (aus: string, nachfrage: boolean) => [
  {
    type: 1,
    components: nachfrage
      ? [
          { type: 2, style: 4, label: "Ja, endgültig: Rollen weg und vom Server entfernen", custom_id: `tm:ausja:${aus}` },
          { type: 2, style: 2, label: "Abbrechen", custom_id: `tm:ausnein:${aus}` },
        ]
      : [{ type: 2, style: 4, label: "Austritt ausführen", emoji: { name: "🚪" }, custom_id: `tm:aus:${aus}` }],
  },
];

/** Knöpfe und Auswahlen des Austritts lesen: tm:ue:<aus>:<art>:<ref> · tm:aus|ausja|ausnein:<aus> */
export function knopfAus(id: string): { aktion: string; aus: string; art?: Fall["art"]; ref?: string } | null {
  const t = id.split(":");
  if (t[0] !== "tm" || !t[1] || !t[2]) return null;
  if (t[1] === "ue" && (t[3] === "k" || t[3] === "l") && t[4]) return { aktion: "ue", aus: t[2], art: t[3], ref: t[4] };
  if (["aus", "ausja", "ausnein"].includes(t[1])) return { aktion: t[1], aus: t[2] };
  return null;
}
