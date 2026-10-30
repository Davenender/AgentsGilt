import { NextResponse } from "next/server";
import { call, sucheKanal, sucheSpeicherKanal } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmaliger Aufruf: setzt die Lead-Suche zurück (Threads löschen, Merkzettel leeren, Suchmeldungen entfernen).
// Die angepinnte Erklärung bleibt. Danach entfernen.
const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";

type Msg = { id: string; content: string; author: { bot?: boolean }; embeds?: { title?: string }[] };

async function leere(token: string, ch: string, filter: (m: Msg) => boolean): Promise<number> {
  let n = 0;
  for (let runde = 0; runde < 20; runde++) {
    const msgs = (await call<Msg[]>(token, "GET", `/channels/${ch}/messages?limit=100`)) ?? [];
    const ziel = msgs.filter(filter);
    if (!ziel.length) break;
    for (const m of ziel) {
      if (await call(token, "DELETE", `/channels/${ch}/messages/${m.id}`)) n++;
    }
    if (ziel.length < msgs.length && msgs.length < 100) break;
  }
  return n;
}

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kanal = await sucheKanal(token);
  const speicher = await sucheSpeicherKanal(token);
  if (!kanal || !speicher) return NextResponse.json({ error: "Kanäle fehlen" }, { status: 500 });

  // Threads (aktive und archivierte) löschen
  const aktiv = (await call<{ threads?: { id: string; parent_id?: string }[] }>(token, "GET", `/guilds/${GUILD}/threads/active`))?.threads ?? [];
  const archiv = (await call<{ threads?: { id: string }[] }>(token, "GET", `/channels/${kanal}/threads/archived/private`))?.threads ?? [];
  const ids = [...aktiv.filter((t) => t.parent_id === kanal).map((t) => t.id), ...archiv.map((t) => t.id)];
  let threads = 0;
  for (const id of ids) if (await call(token, "DELETE", `/channels/${id}`)) threads++;

  const merkzettel = await leere(token, speicher, () => true);
  const meldungen = await leere(token, kanal, (m) => !!m.author.bot && m.content.startsWith("🔎 **") && !m.embeds?.length);
  return NextResponse.json({ threads, merkzettel, meldungen });
}
