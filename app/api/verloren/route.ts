import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { listeKunden } from "@/lib/notion-api";
import { DAVID_ID } from "@/lib/team";
import { frischeKarteAuf, meldeVerloren } from "@/lib/verloren-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Verloren-Automat B1 (16.11.2026): Karte in #posteingang für einen Kunden, der schon „Verloren“ ist
// (zum Beispiel Relax Fit, verloren vor dem Automaten). Nur mit HELFER_SECRET. Es wird nichts abgeschaltet,
// das macht erst David mit „▶️ Starten“ auf der Karte.
//   POST /api/verloren  {"nr": "KND-003"}
// Gibt es schon eine gestartete Karte, wird sie nur aufgefrischt (B2: dann mit Löschen-Knöpfen), keine neue.

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
  const nr = String(((await req.json().catch(() => ({}))) as { nr?: unknown }).nr ?? "").trim().toUpperCase();
  if (!token || !/^KND-\d{3,}$/.test(nr)) return NextResponse.json({ error: "nr fehlt (z. B. KND-003)" }, { status: 400 });
  const k = (await listeKunden())?.find((x) => x.nr === nr);
  if (!k?.notionUrl) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  if (await frischeKarteAuf(token, nr)) return NextResponse.json({ ok: true, nr, aufgefrischt: true });
  if (k.status !== "Verloren") return NextResponse.json({ error: `Status ist „${k.status}“, nicht „Verloren“` }, { status: 409 });
  await meldeVerloren(token, { nr, seite: k.notionUrl, grund: k.verlustgrund ?? "nicht angegeben", von: DAVID_ID });
  return NextResponse.json({ ok: true, nr });
}
