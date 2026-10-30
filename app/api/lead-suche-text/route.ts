import { NextResponse } from "next/server";
import { listMessages } from "@/lib/discord";
import { call, sucheKanal } from "@/lib/leads";
import { CODE_MIN, MAX_SUCHEN, SITZUNG_MIN, TREFFER } from "@/lib/lead-suche";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: ersetzt den Text der angepinnten Erklärung in #lead-suche. Danach entfernen.
const TEXT =
  "**So funktioniert die Lead-Suche**\n" +
  "Der Bot findet Firmen über Google Maps, am liebsten solche ohne oder mit schlechter Website.\n\n" +
  "**1.** Drück **Suche starten**. Der Bot schickt dir den Code als **Direktnachricht**. Den gibst du hier einmal ein, danach bist du " + SITZUNG_MIN + " Minuten freigeschaltet (die Restzeit steht oben).\n" +
  "**2.** Stell Ort, Umkreis, Branchen und die Website-Art ein. Die Karte zeigt deinen Umkreis.\n" +
  "**3.** Mit **Suche starten** legt der Bot einen **privaten Thread** an, den nur du siehst, mit bis zu " + TREFFER + " Karten. " +
  "**Zur Abstimmung** schickt eine Firma nach #leads, **Später** zeigt sie nach 30 Tagen wieder, **Verwerfen** blendet sie dauerhaft aus, mit **Notiz** hältst du etwas fest.\n\n" +
  "**Limit:** " + MAX_SUCHEN + " Suchen pro 24 Stunden für das ganze Team. Jede Suche wird 24 Stunden nach dem Start wieder frei.\n" +
  "Der Code gilt " + CODE_MIN + " Minuten und nur einmal. **Die Suchzentrale verschwindet, wenn du Discord neu lädst.** Drück dann einfach wieder Suche starten, solange die " + SITZUNG_MIN + " Minuten laufen, brauchst du keinen neuen Code.\n" +
  "Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kanal = await sucheKanal(token);
  if (!kanal) return NextResponse.json({ error: "Kein Kanal" }, { status: 500 });
  const msg = (await listMessages(token, kanal, 50)).find((m) => m.author.bot && m.embeds?.[0]?.title === "🔎 Lead-Suche");
  if (!msg) return NextResponse.json({ error: "Erklärung nicht gefunden" }, { status: 404 });
  const ok = await call(token, "PATCH", `/channels/${kanal}/messages/${msg.id}`, {
    embeds: [{ title: "🔎 Lead-Suche", description: TEXT, color: 0xd4a23c }],
    allowed_mentions: { parse: [] },
  });
  return NextResponse.json({ geaendert: Boolean(ok) });
}
