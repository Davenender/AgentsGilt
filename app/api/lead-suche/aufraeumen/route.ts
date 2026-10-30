import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { alleNachrichten, call, CH_SUCHE, SEP, sucheSpeicherKanal } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Räumt die Lead-Suche auf (wird stündlich von GitHub Actions aufgerufen):
//  - die öffentlichen Meldungen "… hat gesucht" in #lead-suche verschwinden nach 24 Stunden
//  - im Merkzettel werden alte Codes, Freischaltungen und Suchen gelöscht
// Der Aufruf braucht kein Geheimnis: Er löscht nur Altes, sonst nichts.

const msgZeit = (id: string) => Math.floor(Number(BigInt(id) / BigInt(4194304))) + 1420070400000;
const TAG = 24 * 60 * 60 * 1000;

async function laufen() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const jetzt = Date.now();
  let meldungen = 0;
  let merkzettel = 0;

  const kanal = await findChannelId(token, CH_SUCHE);
  if (kanal) {
    for (const m of await alleNachrichten(token, kanal, 200)) {
      if (!m.author.bot || m.embeds?.length || !m.content.startsWith("🔎 **")) continue;
      if (jetzt - msgZeit(m.id) < TAG) continue;
      if (await call(token, "DELETE", `/channels/${kanal}/messages/${m.id}`)) meldungen++;
    }
  }

  const speicher = await sucheSpeicherKanal(token);
  if (speicher) {
    for (const m of await alleNachrichten(token, speicher, 300)) {
      const art = m.content.split(SEP)[0];
      const alt = jetzt - msgZeit(m.id);
      // Codes und Freischaltungen nach 1 Tag, verbrauchte Suchen nach 2 Tagen (zählen nur 24 Stunden). "gesehen" und "entscheid" bleiben.
      if ((art === "code" || art === "sitzung") && alt > TAG) {
        if (await call(token, "DELETE", `/channels/${speicher}/messages/${m.id}`)) merkzettel++;
      } else if (art === "suche" && alt > 2 * TAG) {
        if (await call(token, "DELETE", `/channels/${speicher}/messages/${m.id}`)) merkzettel++;
      }
    }
  }
  return NextResponse.json({ meldungen, merkzettel });
}

export const GET = laufen;
export const POST = laufen;
