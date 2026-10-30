import { NextResponse } from "next/server";
import { findChannelId, listMessages } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { call } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: nimmt den Abschnitt "Damit es klappt" aus der Rufgruppen-Anleitung. Danach entfernen.
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kanal = await findChannelId(token, "willkommen");
  if (!kanal) return NextResponse.json({ error: "Kanal fehlt" }, { status: 404 });
  const m = (await listMessages(token, kanal, 50)).find((x) => x.author.bot && x.embeds?.[0]?.title === "📖 Anleitung: Telefon-Rufgruppe");
  if (!m) return NextResponse.json({ error: "Anleitung nicht gefunden" }, { status: 404 });
  const e = m.embeds[0] as EmbedLike;
  const text = (e.description ?? "").split("\n\n**Damit es klappt:**")[0].trimEnd();
  const ok = await call(token, "PATCH", `/channels/${kanal}/messages/${m.id}`, { embeds: [{ ...e, description: text }], allowed_mentions: { parse: [] } });
  return NextResponse.json({ geaendert: Boolean(ok), laenge: text.length });
}
