import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: liest und ändert die Anleitungen in #willkommen. Nach Gebrauch wieder löschen.
const KEY_HASH = "6ece8c943b9cb320012af55dc3eeb7c82563ff75a9fc70a38a8516ecacbcbe66";
const KANAL = "1564363305919848488";
const API = "https://discord.com/api/v10";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}
const kopf = () => ({ Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" });

export async function GET(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const res = await fetch(`${API}/channels/${KANAL}/messages?limit=50`, { headers: kopf() });
  const msgs = (await res.json()) as { id: string; author: { bot?: boolean }; content: string; embeds: unknown[]; pinned?: boolean }[];
  return NextResponse.json(msgs.reverse().map((m) => ({ id: m.id, bot: m.author.bot, pinned: m.pinned, content: m.content, embeds: m.embeds })));
}

// Ändert den Text (description) einer Karte, Titel und Farbe bleiben.
export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const { id, description } = (await request.json()) as { id: string; description: string };
  if (!id || !description || description.length > 4000) return NextResponse.json({ error: "Ungültig" }, { status: 400 });
  const alt = await fetch(`${API}/channels/${KANAL}/messages/${id}`, { headers: kopf() });
  const msg = (await alt.json()) as { embeds?: { title?: string; color?: number }[] };
  const e = msg.embeds?.[0];
  if (!e) return NextResponse.json({ error: "Keine Karte" }, { status: 404 });
  const res = await fetch(`${API}/channels/${KANAL}/messages/${id}`, {
    method: "PATCH",
    headers: kopf(),
    body: JSON.stringify({ embeds: [{ title: e.title, color: e.color, description }] }),
  });
  return NextResponse.json({ ok: res.ok, status: res.status });
}
