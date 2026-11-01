import { NextResponse } from "next/server";
import { raeumePosteingangAuf } from "@/lib/anfragen";
import { zeitplanGebremst } from "@/lib/zeitplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Räumt den privaten #posteingang auf: Erledigte Karten verschwinden nach 14 Tagen (cron-job.org ruft das täglich um 3 Uhr auf).
// Der Aufruf braucht kein Geheimnis: Er löscht nur, was ohnehin erledigt und alt ist.

async function laufen() {
  const bremse = zeitplanGebremst("posteingang");
  if (bremse) return bremse;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, grund: "kein Bot-Token" });
  return NextResponse.json({ ok: true, ...(await raeumePosteingangAuf(token)) });
}

export const GET = laufen;
export const POST = laufen;
