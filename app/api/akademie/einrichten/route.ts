import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { holeLektionen, richteEin, schalteFrei } from "@/lib/akademie-daten";
import { CHEF_ID } from "@/lib/zustaendige";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Akademie einrichten (Plan 2). Nur für David: geschützt mit HELFER_SECRET.
//   GET  → prüft, ob der Bot die Notion-Datenbank lesen kann (Anzahl Lektionen)
//   POST → legt Kategorie AKADEMIE, #akademie mit Startkarte und den Merkzettel an (doppelt geht nicht);
//          mit ?david=1 zusätzlich Davids eigenen Bereich (Lernpfad und Bibliothek)

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const l = await holeLektionen();
  return NextResponse.json({ notion: l !== null, lektionen: l?.length ?? 0, freigegeben: l?.filter((x) => x.freigegeben).length ?? 0 });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const e = await richteEin(token);
  const david = new URL(req.url).searchParams.get("david") === "1" ? await schalteFrei(token, CHEF_ID, "David") : null;
  return NextResponse.json({ ...e, david: david ? (david.ok ? { lernpfad: david.person.lernpfad, bibliothek: david.person.bibliothek, neu: david.neu } : { fehler: david.grund }) : null });
}
