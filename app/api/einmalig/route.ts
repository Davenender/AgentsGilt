import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { alleNachrichten, CH_ABLAGE, CH_KARTEN, CH_SPEICHER } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: liest #lead-ablage, #lead-speicher und #leads (nur lesen). Nach Gebrauch löschen.
const KEY_HASH = "1634fe447ae7a54f05f6db8ef87278243670a06ca074ee43f9f5fc3187851ccd";
const ms = (id: string) => Math.floor(Number(BigInt(id) / BigInt(4194304))) + 1420070400000;

export async function GET(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN!;
  const out: Record<string, unknown[]> = {};
  for (const name of [CH_ABLAGE, CH_SPEICHER, CH_KARTEN]) {
    const ch = await findChannelId(token, name);
    if (!ch) { out[name] = []; continue; }
    const msgs = await alleNachrichten(token, ch, 200);
    out[name] = msgs.map((m) => ({
      id: m.id,
      zeit: new Date(ms(m.id)).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "medium" }),
      bot: m.author.bot,
      content: m.content,
      titel: m.embeds?.[0]?.title,
      footer: m.embeds?.[0]?.footer?.text,
      status: m.embeds?.[0]?.fields?.find((f) => f.name === "Status")?.value,
      farbe: m.embeds?.[0]?.color,
    }));
  }
  return NextResponse.json(out);
}
