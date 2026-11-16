import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { finanzWaechter } from "@/lib/finanzen-waechter";
import { serverCheck } from "@/lib/server-check-lauf";
import { ladeTeam } from "@/lib/team-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Täglicher Aufruf (Vercel-Cron, vercel.json, 06:00 UTC): Finanz-Wächter jeden Tag (lib/finanzen-waechter.ts),
// montags dazu der Server-Check (lib/server-check-lauf.ts, meldet nur bei Funden). Mit CRON_SECRET oder HELFER_SECRET.

function gleich(gesendet: string, geheim: string | undefined): boolean {
  const g = geheim?.trim();
  if (!g) return false;
  const a = Buffer.from(gesendet);
  const b = Buffer.from(g);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const gesendet = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!gleich(gesendet, process.env.CRON_SECRET) && !gleich(gesendet, process.env.HELFER_SECRET)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  const finanzen = await finanzWaechter(token);
  const montag = new Date().toLocaleDateString("en-US", { timeZone: "Europe/Berlin", weekday: "short" }) === "Mon";
  let server: Awaited<ReturnType<typeof serverCheck>> | null = null;
  if (montag && token) {
    await ladeTeam(token);
    server = await serverCheck(token);
  }
  return NextResponse.json({ finanzen, server });
}
