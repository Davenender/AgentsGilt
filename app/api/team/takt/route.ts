import { NextResponse } from "next/server";
import { teamTakt } from "@/lib/team-takt";
import { ladeTeam } from "@/lib/team-daten";
import { zeitplanGebremst } from "@/lib/zeitplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Team-Takt (Etappe 2, 16.11.2026): cron-job.org ruft das jede Minute auf („AgentsGilt Team-Takt“).
// Erledigt nur Fälliges (Mail-Knopf nach 3 Stunden Stille im Ticket, Erinnerung an David nach 2 Stunden),
// darum braucht der Aufruf kein Geheimnis. Was genau: lib/team-takt.ts.

async function laufen() {
  const bremse = zeitplanGebremst("team");
  if (bremse) return bremse;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, grund: "kein Bot-Token" });
  await ladeTeam(token);
  return NextResponse.json({ ok: true, ...(await teamTakt(token)) });
}

export const GET = laufen;
export const POST = laufen;
