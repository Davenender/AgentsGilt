import { NextResponse } from "next/server";
import { gleich, holeStandortSpeicher, schreibeStandortSpeicher, STANDORT_BENUTZER, standortPasswort } from "@/lib/luca";
import { ortsname } from "@/lib/luca-unterwegs";
import { abstandM, leseOwnTracks, neuerStand, wegpunkteBefehl } from "@/lib/standort-logik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// OwnTracks auf Davids iPhone meldet hier seinen Standort (HTTP, Basic Auth mit eigenem Passwort, das nur die App kennt).
// Antwort: leere Liste – oder, wenn sich seine Orte geändert haben, der Befehl, sie als Regionen anzulegen.
const SELTEN_M = 30;
const SELTEN_S = 20;

function zugelassen(req: Request): boolean {
  const passwort = standortPasswort();
  const kopf = req.headers.get("authorization") ?? "";
  if (!passwort || !kopf.startsWith("Basic ")) return false;
  const [benutzer, ...rest] = Buffer.from(kopf.slice(6), "base64").toString("utf8").split(":");
  return gleich(benutzer, STANDORT_BENUTZER) && gleich(rest.join(":"), passwort);
}

export async function POST(req: Request) {
  if (!zugelassen(req)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401, headers: { "www-authenticate": 'Basic realm="Zentrale"' } });
  const roh = await req.text();
  // Die App schickt manchmal Leeres oder Dinge, die uns nicht interessieren: bestätigen und fertig
  let json: unknown = null;
  try {
    json = roh ? JSON.parse(roh) : null;
  } catch {}
  const n = leseOwnTracks(json);
  if (!n) return NextResponse.json([]);
  const alt = await holeStandortSpeicher();
  if (n.art === "ort" && alt.standort && !alt.orteNeu && n.standort.tst - alt.standort.tst < SELTEN_S && abstandM(alt.standort, n.standort) < SELTEN_M) return NextResponse.json([]);
  let neu = neuerStand(alt, n);
  if (neu.standort && !neu.standort.ort && neu.standort !== alt.standort) {
    const name = await ortsname(neu.standort.lat, neu.standort.lon);
    if (name) neu = { ...neu, standort: { ...neu.standort, ort: name } };
  }
  const befehl = neu.orteNeu && neu.orte.length ? [wegpunkteBefehl(neu.orte)] : [];
  // Schlägt das Speichern fehl, schickt die App es später noch einmal
  if (!(await schreibeStandortSpeicher({ ...neu, orteNeu: false }))) return NextResponse.json({ error: "Speichern fehlgeschlagen" }, { status: 503 });
  return NextResponse.json(befehl);
}
