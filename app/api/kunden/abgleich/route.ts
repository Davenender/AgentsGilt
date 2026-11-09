import { NextResponse } from "next/server";
import { findChannelId, setzeKanalName } from "@/lib/discord";
import { gleicheZustaendigAb, ordneKanalEin, sichereKundenarchiv, sperreKundenkanal } from "@/lib/kundenkanal";
import { listeKunden } from "@/lib/notion-api";
import { kanalName, kanalNameMitPunkt, statusPunkt } from "@/lib/notion-kunden";
import { zeitplanGebremst } from "@/lib/zeitplan";
import { ladeTeam } from "@/lib/team-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gleicht den Farbpunkt vor den Kundenkanälen (🔴knd_004) mit dem Status in Notion ab.
// Normalerweise passt das schon der Notion-Webhook an; dieser Abgleich (stündlich von
// cron-job.org) fängt Fälle auf, in denen Notion nichts geschickt hat oder Discord das
// Umbenennen gebremst hat.
//
// Außerdem je Kundenkanal (Plan 1, Etappe 1):
//   - Kanalrechte: nur der Bot schreibt, alle anderen lesen und drücken Knöpfe.
//   - Karte: alte Karten bekommen das Feld „Zuständig“ (Erwähnungen) und den Knopf „👥 Zuständige“.
//   - Kategorie: „Verloren“ liegt im KUNDENARCHIV, alles andere unter KUNDEN; die Knöpfe passen zum Status.
//   - Zuständig: Die Karte gilt. Wurde das Feld in Notion von Hand geändert, wird es zurückgesetzt.
// Der Aufruf braucht kein Geheimnis: Er stellt nur den gültigen Stand wieder her.

async function laufen() {
  const bremse = zeitplanGebremst("kunden");
  if (bremse) return bremse;
  const token = process.env.DISCORD_BOT_TOKEN;
  await ladeTeam(token);
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kunden = await listeKunden();
  if (!kunden) return NextResponse.json({ error: "Notion nicht erreichbar" }, { status: 502 });

  // Die Kategorie KUNDENARCHIV gibt es immer, direkt über dem Ticket-ARCHIV.
  const kundenarchiv = Boolean(await sichereKundenarchiv(token));

  let geprueft = 0;
  let fehler = 0;
  let gesperrt = 0;
  const zuruecksetzungen: string[] = [];
  for (const k of kunden) {
    const kanal = await findChannelId(token, kanalName(k.nr));
    if (!kanal) continue;
    geprueft++;
    if (statusPunkt(k.status) && !(await setzeKanalName(token, kanal, kanalNameMitPunkt(k.nr, k.status)))) fehler++;
    if (statusPunkt(k.status) && !(await ordneKanalEin(token, kanal, k.status))) fehler++;
    if (await sperreKundenkanal(token, kanal)) gesperrt++;
    else fehler++;
    const z = await gleicheZustaendigAb(token, kanal, k);
    if (z === "zurückgesetzt") zuruecksetzungen.push(k.nr);
    if (z === "Notion-Fehler") fehler++;
  }
  return NextResponse.json({ ok: true, kunden: kunden.length, kundenarchiv, geprueft, gesperrt, zuruecksetzungen, fehler });
}

export async function GET() {
  return laufen();
}

export async function POST() {
  return laufen();
}
