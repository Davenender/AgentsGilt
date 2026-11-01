import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { call, CH_SUCHE, letzterFehler } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: macht #lead-suche für die Rolle Team schreibgeschützt (nur Knöpfe, lesen). Nach Gebrauch wieder löschen.
const KEY_HASH = "97ee42d64e1d1abab6799d1a2e034808923272018ba5ba4583c3e6c9cf6c9bc5";
const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN!;
  const kanal = await findChannelId(token, CH_SUCHE);
  if (!kanal) return NextResponse.json({ error: "Kanal nicht gefunden" });
  const roles = (await call<{ id: string; name: string }[]>(token, "GET", `/guilds/${GUILD}/roles`)) ?? [];
  const team = roles.find((r) => r.name === "Team");
  if (!team) return NextResponse.json({ error: "Rolle Team nicht gefunden" });
  const { deny } = (await request.json()) as { deny: string };
  const gesetzt = await call(token, "PUT", `/channels/${kanal}/permissions/${team.id}`, { type: 0, allow: "1049600", deny });
  const info = await call<{ permission_overwrites?: { id: string; type: number; allow: string; deny: string }[] }>(token, "GET", `/channels/${kanal}`);
  const mein = info?.permission_overwrites?.find((o) => o.id === team.id);
  return NextResponse.json({ gesetzt: gesetzt !== null, fehler: gesetzt === null ? letzterFehler : null, kanal, ueberschreibung: mein ?? null });
}
