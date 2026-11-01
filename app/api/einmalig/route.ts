import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EINMALIG: liest und ändert die Anleitungen in #willkommen. Nach Gebrauch wieder löschen.
const KEY_HASH = "c7673eb135137e7a54c14f34aab60f875fdbec2d1824493d88b3f00043cca78a";
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
  const msgs = (await res.json()) as { id: string; author: { bot?: boolean }; embeds: unknown[] }[];
  return NextResponse.json(msgs.reverse().map((m) => ({ id: m.id, embeds: m.embeds })));
}

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const { ops } = (await request.json()) as { ops: { typ: "patch" | "post"; id?: string; embed: unknown }[] };
  const out: unknown[] = [];
  for (const op of ops) {
    const url = op.typ === "patch" ? `${API}/channels/${KANAL}/messages/${op.id}` : `${API}/channels/${KANAL}/messages`;
    const res = await fetch(url, {
      method: op.typ === "patch" ? "PATCH" : "POST",
      headers: kopf(),
      body: JSON.stringify({ embeds: [op.embed], allowed_mentions: { parse: [] } }),
    });
    out.push({ typ: op.typ, id: op.id, status: res.status });
    await new Promise((r) => setTimeout(r, 2500));
  }
  return NextResponse.json(out);
}
