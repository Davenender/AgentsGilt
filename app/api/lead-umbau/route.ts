import { NextResponse } from "next/server";
import { ruesteKnoepfeNach } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: rüstet angenommene Karten in #leads mit den aktuellen Knöpfen nach. Danach entfernen.
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  return NextResponse.json(await ruesteKnoepfeNach(token));
}
