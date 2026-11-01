import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: legt Emojis für die Knöpfe auf dem Server an. Nach Gebrauch wieder löschen.
const KEY_HASH = "b3c11a035049ca9532aeec034bfa1a89176b5b164063d0fbb4782ac6a31e97fc";
const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const API = "https://discord.com/api/v10";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}
const kopf = () => ({ Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" });

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const { emojis } = (await request.json()) as { emojis: { name: string; image: string }[] };
  const out: unknown[] = [];
  for (const e of emojis) {
    const res = await fetch(`${API}/guilds/${GUILD}/emojis`, { method: "POST", headers: kopf(), body: JSON.stringify(e) });
    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string; code?: number };
    out.push({ name: e.name, status: res.status, id: body.id, fehler: body.message, code: body.code });
  }
  const liste = await fetch(`${API}/guilds/${GUILD}/emojis`, { headers: kopf() });
  const alle = (await liste.json().catch(() => [])) as { id: string; name: string }[];
  return NextResponse.json({ out, vorhanden: Array.isArray(alle) ? alle.length : null });
}
