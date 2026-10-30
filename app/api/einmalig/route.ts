import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { alleNachrichten, ablageKanal, CH_ABLAGE, CH_KARTEN, CH_SPEICHER, COLOR, F_STATUS, FOOTER_HINWEIS, loescheNachricht, postKarte, SEP } from "@/lib/leads";

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

// Stellt die heute um 13 Uhr aus #lead-ablage nach #lead-speicher verschobenen Firmen als "Kein Interesse" in der Ablage wieder her.
export async function POST(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN!;
  const { ids } = (await request.json()) as { ids: string[] };
  const speicher = await findChannelId(token, CH_SPEICHER);
  const ablage = await ablageKanal(token);
  if (!speicher || !ablage) return NextResponse.json({ error: "Kanal fehlt" }, { status: 500 });
  const vorhanden = new Set((await alleNachrichten(token, ablage, 300)).map((m) => m.embeds?.[0]?.footer?.text?.split(SEP)[0]));
  const ergebnis: unknown[] = [];
  for (const m of await alleNachrichten(token, speicher, 300)) {
    if (!ids.includes(m.id)) continue;
    // Nur Einträge von heute ab 13 Uhr (Berliner Zeit = 12 Uhr UTC), nie ältere.
    if (ms(m.id) < Date.parse("2026-10-30T12:00:00Z")) { ergebnis.push({ id: m.id, uebersprungen: "zu alt" }); continue; }
    const [art, domain, , firma] = m.content.split(SEP);
    if (art !== "abgelehnt" || !domain) { ergebnis.push({ id: m.id, uebersprungen: "kein Eintrag" }); continue; }
    if (!vorhanden.has(`lead:${domain}`)) {
      const neu = await postKarte(
        token,
        ablage,
        {
          title: firma,
          description: `🔗 https://${domain}`,
          color: COLOR.archived,
          fields: [{ name: F_STATUS, value: "Kein Interesse · 30.10.", inline: false }],
          footer: { text: `lead:${domain}${SEP}aus dem Speicher zurückgeholt${SEP}${FOOTER_HINWEIS}` },
        },
        [],
      );
      if (!neu) { ergebnis.push({ id: m.id, domain, fehler: "Karte nicht angelegt" }); continue; }
    }
    const weg = await loescheNachricht(token, speicher, m.id);
    ergebnis.push({ id: m.id, domain, firma, ablage: true, ausSpeicherGeloescht: weg });
  }
  return NextResponse.json(ergebnis);
}
