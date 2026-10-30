import { isGermanMobile, toE164 } from "@/lib/termin";

// Zustand und Knöpfe der Anruf-Meldungen in Discord.
//
// Der Zustand eines Anrufs steht in der Nachricht selbst: als Farbe des Embeds
// und als Felder "Status", "Bearbeiter" usw. So braucht es keine Datenbank,
// und jeder sieht sofort, wie es um einen Anruf steht.
//
// Ablauf: Offen -> Übernommen -> (Termin bestätigen -> Bestätigt)
//                              oder (Neuer Termin vorgeschlagen -> Kunde antwortet
//                                    per Link: bestätigt, oder wünscht anderen Termin)
//         Erledigt geht jederzeit (z.B. wenn nur zurückgerufen wurde).

export type CallState =
  | "open"
  | "claimed"
  | "proposed"
  | "customer_alt"
  | "confirmed"
  | "done";

export type CallAction = "claim" | "confirm" | "propose" | "done" | "release" | "callback";

export const CALL_CUSTOM_ID_PREFIX = "call:";
export const PROPOSAL_MODAL_PREFIX = "call:proposal:";

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
  proposed: 0xf97316, // Orange: wartet auf den Kunden
  customer_alt: 0xa855f7, // Violett: Kunde wünscht etwas anderes
  confirmed: 0x22c55e, // Grün: Termin steht
  done: 0x6b7280, // Grau: abgeschlossen
};

export const STATUS_FIELD = "Status";
export const OWNER_FIELD = "Bearbeiter";
export const WISH_FIELD = "Terminwunsch";
export const PROPOSAL_FIELD = "Aktueller Vorschlag";
export const CUSTOMER_FIELD = "Kundenwunsch";
export const FIXED_FIELD = "Bestätigter Termin";
export const CALENDAR_FIELD = "Kalender";
export const RUECKRUF_FIELD = "Rückruf";
const DEFAULT_CALENDAR_TEXT = "Eintrag „VORLÄUFIG“ im Kalender auf diesen Termin ändern";

/** Den Zustand liest man an der Farbe ab. Unbekannte Farbe zählt als offen. */
export function stateOf(embed: EmbedLike): CallState {
  const found = (Object.keys(STATE_COLOR) as CallState[]).find(
    (s) => STATE_COLOR[s] === embed.color,
  );
  return found ?? "open";
}

/** Der Rückruf-Knopf erscheint erst, wenn der Rückruf-Agent in Vapi und bei Vercel eingerichtet ist. */
function rueckrufKonfiguriert(): boolean {
  return Boolean(process.env.VAPI_API_KEY?.trim() && process.env.VAPI_RUECKRUF_ASSISTANT?.trim());
}

/** Knöpfe, die zum jeweiligen Zustand passen (Discord: Action Row mit Buttons). */
export function callComponents(state: CallState, hasOwner = true, embed?: EmbedLike) {
  const button = (label: string, action: CallAction, style: 1 | 2 | 3 | 4) => ({
    type: 2,
    label,
    style,
    custom_id: `${CALL_CUSTOM_ID_PREFIX}${action}`,
  });

  switch (state) {
    case "open":
      return [{ type: 1, components: [button("Übernehmen", "claim", 3)] }];
    case "claimed":
    case "proposed":
    case "customer_alt":
      // Ohne Bearbeiter (nach "Freigeben") kann nur wieder übernommen werden.
      if (!hasOwner) return [{ type: 1, components: [button("Übernehmen", "claim", 3)] }];
      return [
        {
          type: 1,
          components: [
            button("Termin bestätigen (SMS)", "confirm", 3),
            button("Anderen Termin vorschlagen", "propose", 1),
            // Geht keine SMS (Festnetz), ruft stattdessen der KI-Rückruf-Agent an. Zum Testen: RUECKRUF_AUCH_HANDY=1.
            ...(embed && rueckrufKonfiguriert() && (!resolveMobile(embed).mobile || process.env.RUECKRUF_AUCH_HANDY === "1")
              ? [button("Per Rückruf klären", "callback", 1)]
              : []),
            button("Erledigt", "done", 2),
            button("Freigeben", "release", 2),
          ],
        },
      ];
    case "confirmed":
    case "done":
      return [];
  }
}

/** Das kleine Fenster, in dem man Datum und Uhrzeit eines Vorschlags eingibt. */
export function proposalModal(messageId: string) {
  const input = (id: string, label: string, placeholder: string) => ({
    type: 1,
    components: [
      {
        type: 4,
        custom_id: id,
        label,
        style: 1,
        placeholder,
        required: true,
        min_length: 1,
        max_length: 12,
      },
    ],
  });
  return {
    custom_id: `${PROPOSAL_MODAL_PREFIX}${messageId}`,
    title: "Terminvorschlag per SMS",
    components: [
      input("datum", "Datum", "28.10."),
      input("uhrzeit", "Uhrzeit", "10:30"),
    ],
  };
}

/** Setzt ein Feld (legt es an, falls es fehlt) und lässt die anderen unberührt. */
export function withField(
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

function fieldValue(embed: EmbedLike, name: string): string | undefined {
  return embed.fields?.find((f) => f.name === name)?.value;
}

export function currentOwner(embed: EmbedLike): string | undefined {
  return fieldValue(embed, OWNER_FIELD);
}

/** Discord-Kennung des Bearbeiters. Er steht als Erwähnung (<@123>) im Feld "Bearbeiter". */
export function ownerId(embed: EmbedLike): string | undefined {
  return currentOwner(embed)?.match(/<@!?(\d+)>/)?.[1];
}

/**
 * Der Termin, um den es gerade geht: was der Kunde sich zuletzt gewünscht hat,
 * sonst der letzte Vorschlag, sonst der Wunsch aus dem Anruf.
 */
export function currentAppointment(embed: EmbedLike): string | undefined {
  const state = stateOf(embed);
  if (state === "customer_alt") return fieldValue(embed, CUSTOMER_FIELD);
  if (state === "proposed") return fieldValue(embed, PROPOSAL_FIELD);
  return fieldValue(embed, WISH_FIELD);
}

/** Der ursprüngliche Wunsch aus dem Anruf (so steht der vorläufige Eintrag im Kalender). */
export function originalWish(embed: EmbedLike): string | undefined {
  return fieldValue(embed, WISH_FIELD);
}

/** Gab es schon einen Terminwunsch aus dem Gespräch? Steuert den Ton der SMS. */
export function hasWish(embed: EmbedLike): boolean {
  return Boolean(fieldValue(embed, WISH_FIELD)?.trim());
}

/**
 * Handynummer des Kunden für die SMS: erst die genannte Rückrufnummer, dann die
 * Nummer, von der er angerufen hat (steht im Titel). Festnetz zählt nicht.
 */
export function resolveMobile(embed: EmbedLike): { mobile: string | null; seen: string[] } {
  const raw: string[] = [];
  const callback = fieldValue(embed, "Rückrufnummer");
  if (callback) raw.push(callback);
  const inTitle = embed.title?.match(/\+?\d[\d\s()-]{7,}\d/)?.[0];
  if (inTitle) raw.push(inTitle);

  const numbers = raw.map(toE164).filter((n): n is string => Boolean(n));
  return { mobile: numbers.find(isGermanMobile) ?? null, seen: numbers };
}

interface Change {
  status: string;
  owner?: string;
  set?: Record<string, string>;
  remove?: string[];
}

/** Baut das Embed für einen neuen Zustand. */
export function transition(embed: EmbedLike, to: CallState, change: Change): EmbedLike {
  let fields = withField(embed.fields, STATUS_FIELD, change.status);
  if (change.owner) fields = withField(fields, OWNER_FIELD, change.owner);
  for (const [name, value] of Object.entries(change.set ?? {})) {
    fields = withField(fields, name, value);
  }
  if (change.remove?.length) {
    fields = fields.filter((f) => !change.remove!.includes(f.name));
  }
  return { ...embed, color: STATE_COLOR[to], fields };
}

/** Übernehmen, Freigeben und Erledigt: ohne SMS, sofort. */
export function applyAction(
  embed: EmbedLike,
  action: "claim" | "done" | "release",
  who: string,
  time: string,
): { embed: EmbedLike; state: CallState } {
  const state = stateOf(embed);
  if (action === "claim") {
    // Wartet schon ein Vorschlag oder ein Kundenwunsch, bleibt dieser Zustand erhalten (nur der Bearbeiter ändert sich).
    if (state === "proposed" || state === "customer_alt") {
      return { embed: transition(embed, state, { status: fieldValue(embed, STATUS_FIELD) ?? "Übernommen", owner: who }), state };
    }
    return {
      embed: transition(embed, "claimed", { status: `Übernommen um ${time}`, owner: who }),
      state: "claimed",
    };
  }
  if (action === "release") {
    const status =
      state === "proposed" || state === "customer_alt"
        ? (fieldValue(embed, STATUS_FIELD) ?? "Freigegeben")
        : `Freigegeben um ${time}, wartet auf eine neue Übernahme`;
    return { embed: transition(embed, state, { status, remove: [OWNER_FIELD] }), state };
  }
  return {
    embed: transition(embed, "done", {
      status: `Erledigt um ${time}`,
      owner: currentOwner(embed) ?? who,
    }),
    state: "done",
  };
}

/** Nach "Termin bestätigen": SMS ist raus. */
export function confirmedByUs(
  embed: EmbedLike,
  termin: string,
  who: string,
  time: string,
  kalender = DEFAULT_CALENDAR_TEXT,
) {
  return transition(embed, "confirmed", {
    status: `Termin bestätigt um ${time}, SMS an den Kunden gesendet`,
    owner: currentOwner(embed) ?? who,
    set: {
      [FIXED_FIELD]: termin,
      [CALENDAR_FIELD]: kalender,
    },
  });
}

/** Nach einem Vorschlag per SMS: wartet auf den Kunden. */
export function proposedByUs(embed: EmbedLike, termin: string, who: string, time: string) {
  return transition(embed, "proposed", {
    status: `Vorschlag per SMS gesendet um ${time}, wartet auf die Antwort des Kunden`,
    owner: currentOwner(embed) ?? who,
    set: { [PROPOSAL_FIELD]: termin },
    remove: [CUSTOMER_FIELD],
  });
}

/** Der Kunde hat über den Link zugesagt. */
export function confirmedByCustomer(embed: EmbedLike, time: string, kalender = DEFAULT_CALENDAR_TEXT) {
  const termin = fieldValue(embed, PROPOSAL_FIELD) ?? "";
  return transition(embed, "confirmed", {
    status: `Kunde hat den Vorschlag bestätigt um ${time}`,
    set: {
      [FIXED_FIELD]: termin,
      [CALENDAR_FIELD]: kalender,
    },
  });
}

/** Der Kunde wünscht über den Link einen anderen Termin. */
export function customerWish(embed: EmbedLike, termin: string, time: string) {
  return transition(embed, "customer_alt", {
    status: `Kunde wünscht einen anderen Termin (gemeldet um ${time})`,
    set: { [CUSTOMER_FIELD]: termin },
  });
}

/** Anfangszustand einer neuen Meldung. */
export function openEmbed(embed: EmbedLike): EmbedLike {
  return {
    ...embed,
    color: STATE_COLOR.open,
    fields: withField(embed.fields, STATUS_FIELD, "Offen"),
  };
}

/** Vorschlag gespeichert, aber ohne SMS (Festnetz): geklärt wird per Rückruf. */
export function proposedWithoutSms(embed: EmbedLike, termin: string, who: string, time: string) {
  return transition(embed, "proposed", {
    status: `Vorschlag gespeichert um ${time}, keine SMS möglich: per Rückruf klären`,
    owner: currentOwner(embed) ?? who,
    set: { [PROPOSAL_FIELD]: termin },
    remove: [CUSTOMER_FIELD],
  });
}

/** Der Kunde hat beim Rückruf des KI-Assistenten zugesagt. */
export function confirmedByCallback(embed: EmbedLike, termin: string, time: string, kalender = DEFAULT_CALENDAR_TEXT) {
  return transition(embed, "confirmed", {
    status: `Kunde hat den Termin beim Rückruf bestätigt um ${time}`,
    set: {
      [FIXED_FIELD]: termin,
      [CALENDAR_FIELD]: kalender,
    },
  });
}
