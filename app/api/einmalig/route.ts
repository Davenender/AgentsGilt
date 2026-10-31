import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: ändert die Anleitungen in #willkommen. Nach Gebrauch wieder löschen.
const KEY_HASH = "7781e0302cd20abe5df15752edfc23ad847b8c1a9f54d0b5400bbca6b237547b";
const KANAL = "1564363305919848488";
const API = "https://discord.com/api/v10";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}
const kopf = () => ({ Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" });

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const { ops } = (await request.json()) as { ops: { typ: "patch" | "delete"; id: string; embed?: unknown }[] };
  const out: unknown[] = [];
  for (const op of ops) {
    const url = `${API}/channels/${KANAL}/messages/${op.id}`;
    const res = await fetch(url, {
      method: op.typ === "patch" ? "PATCH" : "DELETE",
      headers: kopf(),
      ...(op.typ === "patch" ? { body: JSON.stringify({ embeds: [op.embed], allowed_mentions: { parse: [] } }) } : {}),
    });
    out.push({ typ: op.typ, id: op.id, status: res.status });
    await new Promise((r) => setTimeout(r, 2500));
  }
  return NextResponse.json(out);
}
