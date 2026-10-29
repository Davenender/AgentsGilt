import { NextResponse } from "next/server";
import { editMessage, findChannelId, listMessages } from "@/lib/discord";
import { callComponents, ownerId, stateOf } from "@/lib/discord-calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmaliger Aufruf: rüstet übernommene Anruf-Karten mit dem Knopf "Freigeben" nach.
// Harmlos und wiederholbar. Wird danach wieder entfernt.
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const kanal = process.env.DISCORD_CHANNEL_ANRUFE || (await findChannelId(token, "anrufe"));
  if (!token || !kanal) return NextResponse.json({ error: "Kein Bot oder Kanal" }, { status: 500 });
  let geprueft = 0;
  let geaendert = 0;
  for (const m of await listMessages(token, kanal, 100)) {
    const embed = m.embeds?.[0];
    if (!m.author.bot || !embed) continue;
    geprueft++;
    const state = stateOf(embed);
    if (state !== "claimed" && state !== "proposed" && state !== "customer_alt") continue;
    const hat = (m as unknown as { components?: { components?: { custom_id?: string }[] }[] }).components?.some((r) =>
      r.components?.some((c) => c.custom_id === "call:release"),
    );
    if (hat) continue;
    if (await editMessage(token, kanal, m.id, { embeds: [embed], components: callComponents(state, Boolean(ownerId(embed))) })) geaendert++;
  }
  return NextResponse.json({ geprueft, geaendert });
}
