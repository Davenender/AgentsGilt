// Davids Wunsch 16.11.2026: Knopf „✏️ Name“ an jeder Anruf-Karte in #anrufe. Öffnet ein Fenster mit dem jetzigen
// Namen; gespeichert wird im Feld „Anrufer“, das SMS und Rückruf lesen. Regeln: lib/anrufer-name.ts.
//   anrname:knopf            → Fenster öffnen
//   anrname:fenster:<karte>  → Karte mit dem neuen Namen zeigen (gleiche Knöpfe wie vorher)
import { NextResponse } from "next/server";
import { callComponents, ownerId, stateOf, type EmbedLike } from "@/lib/discord-calls";
import { mitAnruferName, nameFenster, NAME_FENSTER_PREFIX, NAME_KNOPF_ID, pruefeAnruferName } from "@/lib/anrufer-name";

type NameInteraction = {
  type: number;
  data?: { custom_id?: string; components?: { components?: { custom_id: string; value?: string }[] }[] };
  message?: { id: string; embeds?: EmbedLike[] };
};

const ephemeral = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });

export function handleAnruferName(i: NameInteraction) {
  const id = i.data?.custom_id ?? "";
  const embed = i.message?.embeds?.[0];
  const karte = i.message?.id;
  if (!embed || !karte) return ephemeral("Diese Karte ist nicht mehr aktuell.");

  if (id === NAME_KNOPF_ID) {
    const aktuell = embed.fields?.find((f) => f.name === "Anrufer")?.value ?? "";
    return NextResponse.json({ type: 9, data: nameFenster(karte, aktuell) });
  }

  if (i.type === 5 && id === `${NAME_FENSTER_PREFIX}${karte}`) {
    const roh = i.data?.components?.flatMap((r) => r.components ?? []).find((c) => c.custom_id === "name")?.value ?? "";
    const name = pruefeAnruferName(roh);
    if (!name) return ephemeral("Bitte nur den Namen eingeben: Buchstaben, Leerzeichen oder Bindestrich, höchstens 40 Zeichen.");
    const neu: EmbedLike = { ...embed, fields: mitAnruferName(embed.fields, name) };
    console.log(`[anrufe] Name auf der Karte ${karte} korrigiert`);
    return NextResponse.json({
      type: 7,
      data: { embeds: [neu], components: callComponents(stateOf(neu), Boolean(ownerId(neu)), neu), allowed_mentions: { parse: [] } },
    });
  }

  return ephemeral("Das hat nicht geklappt. Bitte nochmal auf „✏️ Name“ klicken.");
}
