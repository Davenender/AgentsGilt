// Zustand und Knöpfe der Anruf-Meldungen in Discord.
//
// Der Zustand eines Anrufs (offen, übernommen, Termin nicht möglich, erledigt)
// steht in der Nachricht selbst: als Feld "Status" und "Bearbeiter" im Embed
// plus der Farbe. So braucht es keine Datenbank, und jeder sieht sofort, wie
// es um einen Anruf steht.

export type CallState = "open" | "claimed" | "nodate" | "done";

export type CallAction = "claim" | "nodate" | "done";

export const CALL_CUSTOM_ID_PREFIX = "call:";

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedLike {
  title?: string;
  description?: string;
  color?: number;
  fields?: EmbedField[];
  footer?: { text: string };
  [key: string]: unknown;
}

const STATE_COLOR: Record<CallState, number> = {
  open: 0xd4a23c, // Gold, wie das Logo
  claimed: 0x3b82f6, // Blau
  nodate: 0xf97316, // Orange
  done: 0x22c55e, // Grün
};

const STATE_LABEL: Record<CallState, string> = {
  open: "Offen",
  claimed: "Übernommen",
  nodate: "Termin nicht möglich",
  done: "Erledigt",
};

export const STATUS_FIELD = "Status";
export const OWNER_FIELD = "Bearbeiter";

/** Knöpfe, die zum jeweiligen Zustand passen (Discord: Action Row mit Buttons). */
export function callComponents(state: CallState) {
  const button = (
    label: string,
    action: CallAction,
    style: 1 | 2 | 3 | 4,
  ) => ({
    type: 2,
    label,
    style,
    custom_id: `${CALL_CUSTOM_ID_PREFIX}${action}`,
  });

  switch (state) {
    case "open":
      return [
        {
          type: 1,
          components: [
            button("Übernehmen", "claim", 3),
            button("Termin nicht möglich", "nodate", 4),
          ],
        },
      ];
    case "claimed":
      return [
        {
          type: 1,
          components: [
            button("Zurückgerufen / Erledigt", "done", 1),
            button("Termin nicht möglich", "nodate", 4),
          ],
        },
      ];
    case "nodate":
      return [
        {
          type: 1,
          components: [button("Neuer Termin steht / Erledigt", "done", 1)],
        },
      ];
    case "done":
      return [];
  }
}

/** Setzt ein Feld (legt es an, falls es fehlt) und lässt die anderen unberührt. */
function withField(
  fields: EmbedField[] | undefined,
  name: string,
  value: string,
): EmbedField[] {
  const list = (fields ?? []).map((f) => ({ ...f }));
  const existing = list.find((f) => f.name === name);
  if (existing) existing.value = value;
  else list.push({ name, value, inline: false });
  return list;
}

export function currentOwner(embed: EmbedLike): string | undefined {
  return embed.fields?.find((f) => f.name === OWNER_FIELD)?.value;
}

/**
 * Baut das Embed nach einem Knopfdruck neu.
 * "who" ist der Anzeigename, "time" die Uhrzeit des Klicks (schon formatiert).
 */
export function applyAction(
  embed: EmbedLike,
  action: CallAction,
  who: string,
  time: string,
): { embed: EmbedLike; state: CallState } {
  let state: CallState;
  let status: string;
  let owner: string | undefined;

  switch (action) {
    case "claim":
      state = "claimed";
      status = `${STATE_LABEL.claimed} um ${time}`;
      owner = who;
      break;
    case "nodate":
      state = "nodate";
      status = `${STATE_LABEL.nodate}, gemeldet um ${time}. Neuer Termin wird gesucht (siehe Faden).`;
      // Wer den Anruf schon hat, bleibt Bearbeiter, sonst trägt sich der
      // Meldende ein, damit jemand zuständig ist.
      owner = currentOwner(embed) ?? who;
      break;
    case "done":
      state = "done";
      status = `${STATE_LABEL.done} um ${time}`;
      owner = currentOwner(embed) ?? who;
      break;
  }

  let fields = withField(embed.fields, STATUS_FIELD, status);
  if (owner) fields = withField(fields, OWNER_FIELD, owner);

  return {
    embed: { ...embed, color: STATE_COLOR[state], fields },
    state,
  };
}

/** Anfangszustand einer neuen Meldung. */
export function openEmbed(embed: EmbedLike): EmbedLike {
  return {
    ...embed,
    color: STATE_COLOR.open,
    fields: withField(embed.fields, STATUS_FIELD, STATE_LABEL.open),
  };
}

/** Nutzer-IDs aus der Env-Var (kommagetrennt). Leer = niemand darf. */
export function parseAllowedIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
