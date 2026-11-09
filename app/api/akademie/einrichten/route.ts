import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { holeInhalt, richteEin, setzeZurueck } from "@/lib/akademie-daten";
import { team } from "@/lib/team";
import { ladeTeam, meldeTeamBefehlAn, stelleSicher, zeichneTeamKarte } from "@/lib/team-daten";
import { entferneBefehle, meldeLeadBefehlAn, pflegeLeadBefehleText } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Akademie einrichten (Plan 2). Nur für David: geschützt mit HELFER_SECRET.
//   GET  → prüft, ob der Bot die Notion-Datenbank lesen kann (Lektionen, Testfragen)
//   POST → richtet alles ein und bringt alle Karten auf den neuesten Stand (doppelt geht nicht):
//          Kategorie AKADEMIE, #akademie, Merkzettel, #akademie-verwaltung, Bereiche für alle aus dem Team-Register
//          mit ?zuruecksetzen=David (oder ein anderer Name aus dem Register) vorher den Lernstand dieser Person löschen (Gelesenes und Tests)

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
    lektionen: i?.lektionen.filter((x) => !x.wissen).length ?? 0,
    freigegeben: i?.lektionen.filter((x) => !x.wissen && x.freigegeben).length ?? 0,
    branchenwissen: i?.lektionen.filter((x) => x.wissen).length ?? 0,
    branchenwissenFreigegeben: i?.lektionen.filter((x) => x.wissen && x.freigegeben).length ?? 0,
    testfragen: i?.fragen.length ?? 0,
    testfragenFreigegeben: i?.fragen.filter((x) => x.freigegeben).length ?? 0,
  });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  await ladeTeam(token);
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const wen = new URL(req.url).searchParams.get("zuruecksetzen");
  const person = wen ? team().find((t) => t.name.toLowerCase() === wen.toLowerCase()) : null;
  if (wen && !person) return NextResponse.json({ error: "Unbekannte Person" }, { status: 400 });
  const zurueckgesetzt = person ? await setzeZurueck(token, person.discord) : 0;
  // Plan 4: Team-Register anlegen (Startbelegung), Übersicht zeichnen, /team anmelden
  await stelleSicher(token);
  await zeichneTeamKarte(token);
  const teamBefehl = (await meldeTeamBefehlAn(token)) ? "/team angemeldet" : "/team nicht angemeldet";
  const leadBefehl = (await meldeLeadBefehlAn(token)) ? "/lead und /lead-delete angemeldet" : "/lead nicht angemeldet";
  // Liste der übrigen Befehle (entfernt wird hier nichts mehr; /lead-delete bleibt für David, Wunsch 09.11.)
  const befehle = await entferneBefehle(token, []);
  const leadAnleitung = await pflegeLeadBefehleText(token);
  return NextResponse.json({ teamBefehl, leadBefehl, befehle, leadAnleitung, ...(await richteEin(token)), ...(person ? { zurueckgesetzt: `${person.name}: ${zurueckgesetzt} Einträge gelöscht` } : {}) });
}
