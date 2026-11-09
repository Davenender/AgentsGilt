import type { EmbedLike } from "@/lib/discord-calls";

// „Zuständig“ für Kunden (Plan 1, Etappe 1). Reine Logik ohne Netz, damit sie getestet werden kann.
//
// Wer zuständig ist, steht im Feld „Zuständig“ der Kundenkarte im Kundenkanal (als Erwähnungen).
// Die Karte ist die Wahrheit: Ändern geht nur über den Knopf „👥 Zuständige“. Wird das Personenfeld
// in Notion von Hand geändert, setzt der Bot es zurück. Alte Karten (mit Namen aus Notion oder ohne
// Feld) übernehmen einmal den Stand aus Notion.

// Wer im Team ist, steht seit Plan 4 im Team-Register (lib/team.ts), nicht mehr fest im Code.
import { aktive, DAVID_ID, team } from "./team.ts";

/** David: darf an jeder Kundenkarte alles. */
export const CHEF_ID: string = DAVID_ID;
export const F_ZUSTAENDIG = "Zuständig";
export const NIEMAND = "niemand";
export const NUR_ZUSTAENDIGE = "Nur die Zuständigen können das.";

const ohneStriche = (id: string) => id.replace(/-/g, "").toLowerCase();
const reihenfolge = (ids: Iterable<string>) => {
  const set = new Set(ids);
  return team().map((t) => t.discord).filter((d) => set.has(d));
};

export const notionIdFuer = (discord: string): string | null => team().find((t) => t.discord === discord)?.notion || null;
export const discordIdFuer = (notion: string): string | null =>
  team().find((t) => t.notion && ohneStriche(t.notion) === ohneStriche(notion))?.discord ?? null;

/** Discord-Kennungen aus dem Notion-Personenfeld (oder einer Liste von Notion-IDs). Fremde fallen weg. */
export function idsAusNotionProp(prop: unknown): string[] {
  const roh = Array.isArray(prop)
    ? (prop as unknown[]).map(String)
    : (((prop as { people?: { id?: string }[] } | undefined)?.people ?? []).map((p) => p.id ?? ""));
  return reihenfolge(roh.map(discordIdFuer).filter((x): x is string => Boolean(x)));
}

export const alsMentions = (ids: string[]): string =>
  ids.length ? reihenfolge(ids).map((id) => `<@${id}>`).join(" ") : NIEMAND;

/** Die Zuständigen aus der Karte. null = alte Karte (Feld fehlt oder enthält Namen statt Erwähnungen). */
export function ausKarte(karte: EmbedLike | null | undefined): string[] | null {
  const v = karte?.fields?.find((f) => f.name === F_ZUSTAENDIG)?.value?.trim();
  if (!v) return null;
  if (v === NIEMAND) return [];
  const ids = [...v.matchAll(/<@!?(\d+)>/g)].map((m) => m[1]);
  return ids.length ? reihenfolge(ids) : null;
}

export const gleich = (a: string[], b: string[]) => {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
};

/** Was gilt, und muss Notion zurückgesetzt werden? */
export function wahrheit(
  karte: EmbedLike | null | undefined,
  notionProp: unknown,
): { ids: string[]; zuruecksetzen: boolean; ausNotion: boolean } {
  const notion = idsAusNotionProp(notionProp);
  const k = ausKarte(karte);
  if (k === null) return { ids: notion, zuruecksetzen: false, ausNotion: true };
  return { ids: k, zuruecksetzen: !gleich(k, notion), ausNotion: false };
}

export const darf = (userId: string, zustaendige: string[]) => userId === CHEF_ID || zustaendige.includes(userId);

export function pruefeAuswahl(values: string[] | undefined): { ok: true; ids: string[] } | { ok: false; grund: string } {
  const ids = [...new Set(values ?? [])];
  if (!ids.length) return { ok: false, grund: "Bitte mindestens eine Person auswählen." };
  if (ids.some((id) => !aktive().some((m) => m.discord === id && m.notion))) return { ok: false, grund: "Zuständig kann nur sein, wer gerade im Team ist (nicht in Pause)." };
  return { ok: true, ids: reihenfolge(ids) };
}

/** Setzt das Feld „Zuständig“ in der Karte (ersetzt es oder fügt es hinter „Angebot“ bzw. „Status“ ein). */
export function mitZustaendig(karte: EmbedLike, ids: string[]): EmbedLike {
  const feld = { name: F_ZUSTAENDIG, value: alsMentions(ids), inline: true };
  const fields = [...(karte.fields ?? [])];
  const i = fields.findIndex((f) => f.name === F_ZUSTAENDIG);
  if (i >= 0) fields[i] = feld;
  else {
    const nach = Math.max(fields.findIndex((f) => f.name === "Angebot"), fields.findIndex((f) => f.name === "Status"));
    fields.splice(nach + 1, 0, feld);
  }
  return { ...karte, fields };
}

/** Auswahl der Zuständigen (nur für die Person sichtbar). */
export const auswahlMenue = (kartenId: string, aktuell: string[]) => [
  {
    type: 1,
    components: [
      {
        type: 5,
        custom_id: `knd:zustwahl:${kartenId}`,
        placeholder: "Zuständige auswählen",
        min_values: 1,
        max_values: Math.max(1, aktive().length),
        default_values: aktuell.map((id) => ({ id, type: "user" })),
      },
    ],
  },
];

export const notionPeople = (ids: string[]) => ({
  people: ids.map(notionIdFuer).filter((x): x is string => Boolean(x)).map((id) => ({ object: "user", id })),
});

export const zustaendigZeile = (alt: string[], neu: string[], von: string) =>
  `👥 **${F_ZUSTAENDIG}:** ${alsMentions(alt)} → ${alsMentions(neu)} (geändert von <@${von}>)`;

// ------------------------------------------------------------ Kanalrechte

export const bit = (n: number) => BigInt(1) << BigInt(n);
/**
 * Im Kundenkanal verboten: schreiben (11), Befehle (31), öffentliche/private Threads anlegen (35, 36),
 * in Threads schreiben (38), fremde Apps nutzen (50). Lesen und Knöpfe drücken bleibt.
 */
export const SPERRE = bit(11) | bit(31) | bit(35) | bit(36) | bit(38) | bit(50);
/** Der Bot selbst: ansehen (10), schreiben (11), Links einbetten (14), Verlauf lesen (16). */
export const BOT_DARF = bit(10) | bit(11) | bit(14) | bit(16);

export interface Overwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

/**
 * Welche Kanalrechte gesetzt werden müssen (nur die geänderten, der Bot zuerst). Bestehende
 * Erlaubnisse wie „ansehen“ aus der Kategorie bleiben erhalten.
 */
export function kanalRechte(
  vorhanden: Overwrite[],
  ids: { everyone: string; team: string | null; bot: string },
): Overwrite[] {
  const alle = new Map(vorhanden.map((o) => [o.id, o]));
  for (const id of [ids.everyone, ids.team]) if (id && !alle.has(id)) alle.set(id, { id, type: 0, allow: "0", deny: "0" });
  if (!alle.has(ids.bot)) alle.set(ids.bot, { id: ids.bot, type: 1, allow: "0", deny: "0" });

  const out: Overwrite[] = [];
  for (const o of alle.values()) {
    const a = BigInt(o.allow);
    const d = BigInt(o.deny);
    const [na, nd] = o.id === ids.bot ? [a | BOT_DARF, d & ~BOT_DARF] : [a & ~SPERRE, d | SPERRE];
    if (na !== a || nd !== d) out.push({ id: o.id, type: o.type, allow: String(na), deny: String(nd) });
  }
  const rang = (o: Overwrite) => (o.id === ids.bot ? 0 : o.id === ids.everyone ? 1 : o.id === ids.team ? 2 : 3);
  return out.sort((x, y) => rang(x) - rang(y));
}
