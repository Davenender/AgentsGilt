import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { alleNachrichten, CH_POSTEINGANG, loescheNachricht } from "@/lib/leads";
import { findChannelId } from "@/lib/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EINMALIG: listet und löscht Karten im privaten #posteingang. Nach Gebrauch wieder löschen.
const KEY_HASH = "242cb37dd204a9e1259a9b53d8956c8bcd7eacc36ed6714eb9baf47c3bedcbda";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}

export async function GET(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN!;
  const kanal = await findChannelId(token, CH_POSTEINGANG);
  if (!kanal) return NextResponse.json({ error: "kein Kanal" });
  const msgs = await alleNachrichten(token, kanal);
  return NextResponse.json(
    msgs.map((m) => ({
      id: m.id,
      bot: m.author.bot,
      titel: m.embeds?.[0]?.title ?? m.content.slice(0, 60),
      status: m.embeds?.[0]?.fields?.find((f) => f.name === "Status")?.value ?? null,
      footer: m.embeds?.[0]?.footer?.text ?? null,
    })),
  );
}

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN!;
  const kanal = await findChannelId(token, CH_POSTEINGANG);
  if (!kanal) return NextResponse.json({ error: "kein Kanal" });
  const { ids } = (await request.json()) as { ids: string[] };
  let geloescht = 0;
  for (const id of ids) {
    if (await loescheNachricht(token, kanal, id)) geloescht++;
    await new Promise((r) => setTimeout(r, 700));
  }
  return NextResponse.json({ geloescht, von: ids.length });
}
