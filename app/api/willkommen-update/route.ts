import { NextResponse } from "next/server";
import { findChannelId, listMessages } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { call } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: streicht den Satz zu David und den privaten Meldungen aus den Anleitungen. Danach entfernen.
const ERSETZE: [string, string][] = [
  [" David darf immer. Alle anderen bekommen eine private Meldung, und die Karte bleibt unverändert.", ""],
  ["**Nur der Bearbeiter** (und David) kann danach die Knöpfe benutzen. Alle anderen bekommen eine private Meldung.", "**Nur der Bearbeiter** kann danach die Knöpfe benutzen."],
];

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kanal = await findChannelId(token, "willkommen");
  if (!kanal) return NextResponse.json({ error: "Kanal fehlt" }, { status: 404 });
  const ergebnis: string[] = [];
  for (const m of await listMessages(token, kanal, 50)) {
    const e = m.embeds?.[0] as EmbedLike | undefined;
    if (!m.author.bot || !e?.description) continue;
    let text = e.description;
    for (const [a, b] of ERSETZE) text = text.replace(a, b);
    if (text === e.description) continue;
    const ok = await call(token, "PATCH", `/channels/${kanal}/messages/${m.id}`, { embeds: [{ ...e, description: text }], allowed_mentions: { parse: [] } });
    ergebnis.push(`${e.title}: ${ok ? "geändert" : "FEHLER"}`);
  }
  return NextResponse.json({ ergebnis });
}
