import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { finanzWaechter } from "@/lib/finanzen-waechter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Finanzen A5 (16.11.2026): Wächter und Termine. Vercel ruft das jeden Morgen mit CRON_SECRET auf (vercel.json).
//   GET /api/finanzen/waechter            → Grenze, Steuertermine, am Monatsanfang Überblick des Vormonats
//   GET /api/finanzen/waechter?zeigen=1   → zusätzlich sofort den Überblick des laufenden Monats (mit HELFER_SECRET)
// Meldet nur an David (#posteingang, Push). Keine Steuerberatung, nur Zahlen und Fristen.

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
  const zeigen = new URL(req.url).searchParams.get("zeigen") === "1";
  const r = await finanzWaechter(process.env.DISCORD_BOT_TOKEN, new Date(), { zeigen });
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
