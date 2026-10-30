import { NextResponse } from "next/server";
import { faelligeWiederholungen } from "@/lib/rueckruf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Startet geplante Rückrufe der KI neu, wenn ihre Zeit gekommen ist (GitHub Actions ruft das alle 30 Minuten auf).
// Gestartet wird nur täglich von 8 bis 22 Uhr. Der Aufruf braucht kein Geheimnis: Er tut nur, was auf den Karten geplant ist.

async function laufen() {
  const res = await faelligeWiederholungen();
  return NextResponse.json(res);
}

export const GET = laufen;
export const POST = laufen;
