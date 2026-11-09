import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fortschritt, personDetail } from "@/lib/akademie";
import { holeInhalt, leseAkademie, schritteVon } from "@/lib/akademie-daten";
import { team } from "@/lib/team";
import { ladeTeam } from "@/lib/team-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Fortschritt in der Akademie für die Zentrale (dieselben Zahlen wie in #akademie-verwaltung).
// Nur lesen, geschützt mit HELFER_SECRET.

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  await ladeTeam(token);
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const [ak, inhalt] = await Promise.all([leseAkademie(token), holeInhalt()]);
  if (!ak || !inhalt) return NextResponse.json({ error: "Akademie nicht erreichbar" }, { status: 502 });
  const personen = team().filter((t) => t.status !== "ausgetreten" && ak.personen.has(t.discord)).map((t) => {
    const p = ak.personen.get(t.discord)!;
    const sch = schritteVon(p, inhalt);
    const f = fortschritt(t.name, p, sch);
    return { ...f, status: t.status, figur: t.figur, details: personDetail(f, p, sch).description };
  });
  return NextResponse.json({ personen });
}
