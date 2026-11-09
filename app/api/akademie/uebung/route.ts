import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { uebungTakt } from "@/lib/uebung-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Übungen (seit 09.11.): Die Zentrale auf Davids Mac ruft das regelmäßig auf (alle 30 Sekunden, während einer Übung
// alle paar Sekunden). Hat jemand in seinem Übungskanal getippt, antwortet die KI als Kunde. Geschützt mit HELFER_SECRET.

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  return NextResponse.json(await uebungTakt(token));
}
