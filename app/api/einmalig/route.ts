import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { callComponents } from "@/lib/discord-calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EINMALIG: legt eine Test-Karte in #anrufe an (und löscht sie wieder). Nach Gebrauch wieder löschen.
const KEY_HASH = "e0807831c866d4bec4911c653889318cdb82b2bd2c859ec8a4ef20c1eebfeef5";
const API = "https://discord.com/api/v10";

function erlaubt(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  return timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"));
}
const kopf = () => ({ Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" });

export async function POST(request: Request) {
  if (!erlaubt(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const kanal = process.env.DISCORD_CHANNEL_ANRUFE;
  const body = (await request.json()) as { aktion: "test" | "loeschen"; id?: string };
  if (body.aktion === "loeschen") {
    const res = await fetch(`${API}/channels/${kanal}/messages/${body.id}`, { method: "DELETE", headers: kopf() });
    return NextResponse.json({ status: res.status });
  }
  const embed = {
    title: "TEST (bitte ignorieren): Knopf-Reihen ansehen",
    description: "Testkarte, wird gleich wieder gelöscht.",
    color: 0x3b82f6,
    fields: [
      { name: "Anrufer", value: "Max Test", inline: true },
      { name: "Terminwunsch", value: "Montag, 3.11., 10:00", inline: true },
      { name: "Rückrufnummer", value: "+49 173 0000000", inline: true },
      { name: "Bearbeiter", value: "<@806859236768088114>", inline: false },
      { name: "Status", value: "Übernommen", inline: false },
    ],
    footer: { text: "Test · kein echter Anruf" },
  };
  const res = await fetch(`${API}/channels/${kanal}/messages`, {
    method: "POST",
    headers: kopf(),
    body: JSON.stringify({ embeds: [embed], components: callComponents("claimed", true, embed), allowed_mentions: { parse: [] } }),
  });
  const m = (await res.json().catch(() => ({}))) as { id?: string };
  return NextResponse.json({ status: res.status, id: m.id });
}
