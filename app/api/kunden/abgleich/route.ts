import { NextResponse } from "next/server";
import { findChannelId, setzeKanalName } from "@/lib/discord";
import { listeKunden } from "@/lib/notion-api";
import { kanalName, kanalNameMitPunkt, statusPunkt } from "@/lib/notion-kunden";
import { zeitplanGebremst } from "@/lib/zeitplan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gleicht den Farbpunkt vor den Kundenkanälen (🔴knd_004) mit dem Status in Notion ab.
// Normalerweise passt das schon der Notion-Webhook an; dieser Abgleich (stündlich von
// cron-job.org) fängt Fälle auf, in denen Notion nichts geschickt hat oder Discord das
// Umbenennen gebremst hat. Der Aufruf braucht kein Geheimnis: Er ändert nur Kanalnamen.

async function laufen() {
  const bremse = zeitplanGebremst("kunden");
  if (bremse) return bremse;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kunden = await listeKunden();
  if (!kunden) return NextResponse.json({ error: "Notion nicht erreichbar" }, { status: 502 });

  let geprueft = 0;
  let fehler = 0;
  for (const k of kunden) {
    if (!statusPunkt(k.status)) continue;
    const kanal = await findChannelId(token, kanalName(k.nr));
    if (!kanal) continue;
    geprueft++;
    if (!(await setzeKanalName(token, kanal, kanalNameMitPunkt(k.nr, k.status)))) fehler++;
  }
  return NextResponse.json({ ok: true, kunden: kunden.length, geprueft, fehler });
}

export async function GET() {
  return laufen();
}

export async function POST() {
  return laufen();
}
