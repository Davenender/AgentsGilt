import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sammleStatistik, zeigeStatistik } from "@/lib/statistik-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Kunden-Statistik (Plan 1, Etappe 6). Liest nur aus Discord und Notion.
//   GET /api/kunden/statistik            → Zahlen als JSON (für die Zentrale), mit HELFER_SECRET
//   GET /api/kunden/statistik?posten=1   → zusätzlich als Karte in #statistik
// Am 1. jedes Monats ruft Vercel die Adresse mit CRON_SECRET auf (vercel.json), dann wird immer gepostet.

function gleich(gesendet: string, geheim: string | undefined): boolean {
  const g = geheim?.trim();
  if (!g) return false;
  const a = Buffer.from(gesendet);
  const b = Buffer.from(g);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const gesendet = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const vonCron = gleich(gesendet, process.env.CRON_SECRET);
  if (!vonCron && !gleich(gesendet, process.env.HELFER_SECRET)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const s = await sammleStatistik(token);
  if (!s) return NextResponse.json({ error: "Notion nicht erreichbar" }, { status: 502 });
  const posten = vonCron || new URL(req.url).searchParams.get("posten") === "1";
  const gepostet = posten ? await zeigeStatistik(token, s) : false;
  return NextResponse.json({ ...s, gepostet });
}
