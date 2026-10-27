import { NextResponse } from "next/server";
import { findChannelId, messageLink, postText } from "@/lib/discord";
import { holeErinnerungen, markiereErinnert } from "@/lib/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Schickt die Terminerinnerungen in #termine. Wird alle paar Minuten von einem
// Zeitplan in GitHub Actions aufgerufen (.github/workflows/erinnerungen.yml).
//
// Der Aufruf braucht kein Geheimnis: Er sendet nur, was gerade fällig ist, und
// vermerkt jede gesendete Erinnerung am Kalendereintrag. Wer ihn selbst
// aufruft, kann also keine zusätzlichen Nachrichten auslösen.

async function laufen() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const faellig = await holeErinnerungen();
  if (faellig.length === 0) return NextResponse.json({ gesendet: 0 });

  const kanal = await findChannelId(token, "termine");
  const anrufe = process.env.DISCORD_CHANNEL_ANRUFE;
  if (!kanal) {
    console.error("[erinnerung] Kanal #termine nicht gefunden");
    return NextResponse.json({ gesendet: 0, fehler: "kein Kanal" }, { status: 500 });
  }

  let gesendet = 0;
  for (const e of faellig) {
    // Erst abhaken, dann senden: Läuft der Zeitplan doppelt, kommt nichts doppelt an.
    if (!(await markiereErinnert(e.eventId, e.art, true))) continue;

    const wer = e.ownerId ? `<@${e.ownerId}> ` : "";
    const was =
      e.art === "stunde"
        ? `⏰ ${wer}In einer Stunde: Erstgespräch mit ${e.wer}, ${e.label}.`
        : `📅 ${wer}Erinnerung: Erstgespräch mit ${e.wer}, ${e.wann} (${e.label}).`;
    const link = e.messageId && anrufe ? `\nZum Anruf: ${messageLink(anrufe, e.messageId)}` : "";

    const ok = await postText(token, kanal, `${was}${link}`, e.ownerId ? [e.ownerId] : []);
    if (ok) gesendet++;
    else await markiereErinnert(e.eventId, e.art, false);
  }
  console.log(`[erinnerung] ${gesendet} von ${faellig.length} gesendet`);
  return NextResponse.json({ gesendet, faellig: faellig.length });
}

export async function GET() {
  return laufen();
}

export async function POST() {
  return laufen();
}
