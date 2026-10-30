import { NextResponse } from "next/server";
import { listMessages } from "@/lib/discord";
import { call, sucheKanal, sucheSpeicherKanal } from "@/lib/leads";
import { CODE_MIN, MAX_SUCHEN, SITZUNG_MIN, TREFFER } from "@/lib/lead-suche";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmaliger Aufruf: legt #lead-suche (Kategorie TEAM) und den unsichtbaren Merkzettel an und
// postet die feste Nachricht mit dem Knopf "Suche starten". Wiederholbar (legt nichts doppelt an).
const TEXT =
  "**So funktioniert die Lead-Suche**\n" +
  "Der Bot findet Firmen über Google Maps, am liebsten solche ohne oder mit schlechter Website.\n\n" +
  "**1.** Drück **Suche starten**. Du bekommst privat einen Code, den du einmal eingibst. Danach bist du " + SITZUNG_MIN + " Minuten freigeschaltet (die Restzeit steht oben).\n" +
  "**2.** Stell Ort, Umkreis, Branchen und die Website-Art ein.\n" +
  "**3.** Mit **Suche starten** legt der Bot einen **privaten Thread** an, den nur du siehst, mit bis zu " + TREFFER + " Karten. " +
  "**Zur Abstimmung** schickt eine Firma nach #leads, **Verwerfen** blendet sie dauerhaft aus.\n\n" +
  "**Limit:** " + MAX_SUCHEN + " Suchen pro 24 Stunden für das ganze Team. Jede Suche wird 24 Stunden nach dem Start wieder frei.\n" +
  "Der Code gilt " + CODE_MIN + " Minuten und nur einmal. **Die Suchzentrale verschwindet, wenn du Discord neu lädst.** Drück dann einfach wieder Suche starten, solange die " + SITZUNG_MIN + " Minuten laufen, brauchst du keinen neuen Code.\n" +
  "Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kanal = await sucheKanal(token);
  const speicher = await sucheSpeicherKanal(token);
  if (!kanal) return NextResponse.json({ error: "Kanal #lead-suche konnte nicht angelegt werden" }, { status: 500 });

  const vorhanden = (await listMessages(token, kanal, 50)).some((m) => m.author.bot && m.embeds?.[0]?.title === "🔎 Lead-Suche");
  let gepostet = false;
  if (!vorhanden) {
    const msg = await call<{ id: string }>(token, "POST", `/channels/${kanal}/messages`, {
      embeds: [{ title: "🔎 Lead-Suche", description: TEXT, color: 0xd4a23c }],
      components: [{ type: 1, components: [{ type: 2, style: 3, label: "Suche starten", custom_id: "ls:start" }] }],
      allowed_mentions: { parse: [] },
    });
    if (msg) {
      await call(token, "PUT", `/channels/${kanal}/pins/${msg.id}`);
      gepostet = true;
    }
  }
  return NextResponse.json({ kanal, speicher, gepostet, schonDa: vorhanden });
}
