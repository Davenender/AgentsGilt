import { NextResponse } from "next/server";
import { ruesteKnoepfeNach } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmaliger Aufruf: rüstet vorhandene Lead-Karten mit dem Knopf "Übernehmen" nach.
// Harmlos und wiederholbar (ändert nur Karten, denen der Knopf noch fehlt). Wird danach wieder entfernt.
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  return NextResponse.json(await ruesteKnoepfeNach(token));
}
