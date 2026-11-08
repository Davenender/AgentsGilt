import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { holeInhalt, richteEin, setzeZurueck } from "@/lib/akademie-daten";
import { TEAM } from "@/lib/zustaendige";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Akademie einrichten (Plan 2). Nur für David: geschützt mit HELFER_SECRET.
//   GET  → prüft, ob der Bot die Notion-Datenbank lesen kann (Lektionen, Testfragen)
//   POST → richtet alles ein und bringt alle Karten auf den neuesten Stand (doppelt geht nicht):
//          Kategorie AKADEMIE, #akademie, Merkzettel, #akademie-verwaltung, Bereiche für David, Jakob und Mijo
//          mit ?zuruecksetzen=David (oder Jakob/Mijo) vorher den Lernstand dieser Person löschen (Gelesenes und Tests)

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const i = await holeInhalt();
  return NextResponse.json({
    notion: i !== null,
    lektionen: i?.lektionen.length ?? 0,
    freigegeben: i?.lektionen.filter((x) => x.freigegeben).length ?? 0,
    testfragen: i?.fragen.length ?? 0,
    testfragenFreigegeben: i?.fragen.filter((x) => x.freigegeben).length ?? 0,
  });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const wen = new URL(req.url).searchParams.get("zuruecksetzen");
  const person = wen ? TEAM.find((t) => t.name.toLowerCase() === wen.toLowerCase()) : null;
  if (wen && !person) return NextResponse.json({ error: "Unbekannte Person" }, { status: 400 });
  const zurueckgesetzt = person ? await setzeZurueck(token, person.discord) : 0;
  return NextResponse.json({ ...(await richteEin(token)), ...(person ? { zurueckgesetzt: `${person.name}: ${zurueckgesetzt} Einträge gelöscht` } : {}) });
}
