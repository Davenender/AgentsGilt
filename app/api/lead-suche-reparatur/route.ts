import { NextResponse } from "next/server";
import type { EmbedLike } from "@/lib/discord-calls";
import { istVerworfen, stelleKarteHer } from "@/lib/lead-suche-handlers";
import { call } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmaliger Aufruf: macht verworfene Karten in den aktiven Such-Threads wieder bedienbar. Danach entfernen.
const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const aktiv = await call<{ threads?: { id: string; name: string }[] }>(token, "GET", `/guilds/${GUILD}/threads/active`);
  let geaendert = 0;
  for (const t of aktiv?.threads ?? []) {
    const msgs = (await call<{ id: string; author: { bot?: boolean }; embeds: EmbedLike[] }[]>(token, "GET", `/channels/${t.id}/messages?limit=50`)) ?? [];
    for (const m of msgs) {
      const e = m.embeds?.[0];
      if (!m.author.bot || !e || !istVerworfen(e)) continue;
      const r = stelleKarteHer(e);
      if (await call(token, "PATCH", `/channels/${t.id}/messages/${m.id}`, { embeds: [r.embed], components: r.components, allowed_mentions: { parse: [] } })) geaendert++;
    }
  }
  return NextResponse.json({ threads: aktiv?.threads?.length ?? 0, geaendert });
}
