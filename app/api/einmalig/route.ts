import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { call } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: Text in #willkommen anpassen. Wird danach wieder gelöscht.
const KEY_HASH = "55aa51417d76603c7b673a5ceca8454be5ae0b45e396bfa9d091e82b628bf6c0";

function erlaubt(request: Request): boolean {
  const a = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  const b = Buffer.from(KEY_HASH, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  const kanal = await findChannelId(token, "willkommen");
  if (!token || !kanal) return NextResponse.json({ error: "Kein Kanal" }, { status: 500 });
  const msgs = (await call<{ id: string; author: { bot?: boolean }; embeds: unknown[] }[]>(token, "GET", `/channels/${kanal}/messages?limit=50`)) ?? [];
  return NextResponse.json(msgs.filter((m) => m.author.bot).map((m) => ({ id: m.id, embeds: m.embeds })));
}

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  const kanal = await findChannelId(token, "willkommen");
  const { id, embed } = (await request.json()) as { id: string; embed: unknown };
  if (!token || !kanal || !id) return NextResponse.json({ error: "Fehlt" }, { status: 400 });
  const res = await call(token, "PATCH", `/channels/${kanal}/messages/${id}`, { embeds: [embed] });
  return NextResponse.json({ ok: res !== null });
}
