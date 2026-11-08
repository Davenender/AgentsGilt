import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId, listMessages } from "@/lib/discord";
import { call } from "@/lib/leads";
import { ANLEITUNGEN, GOLD, alsEmbed, planeReihenfolge, planeWillkommen, type Schritt } from "@/lib/willkommen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Anleitungen in #willkommen pflegen (Texte in lib/willkommen.ts). Nur für David: geschützt mit HELFER_SECRET.
//   GET                     → zeigt die Bot-Nachrichten in #willkommen und die Kanalnamen des Servers
//   POST ?probe=1           → zeigt nur, was passieren würde
//   POST                    → ändert vorhandene Anleitungen (am Titel erkannt) und legt fehlende neu an
//   POST ?reihenfolge=1     → belegt die vorhandenen Bot-Nachrichten der Reihe nach neu, damit die Reihenfolge stimmt
// Nachrichten von Menschen werden nie angefasst, gelöscht wird nichts.

const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function lies(token: string) {
  const kanal = await findChannelId(token, "willkommen");
  if (!kanal) return null;
  // Discord liefert die neuesten zuerst, hier brauchen wir die älteste zuerst.
  const roh = (await listMessages(token, kanal, 100)).slice().reverse();
  return { kanal, roh, nachrichten: roh.map((m) => ({ id: m.id, bot: Boolean(m.author.bot), titel: m.embeds?.[0]?.title ?? m.content?.split("\n")[0] ?? "" })) };
}

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const l = await lies(token);
  if (!l) return NextResponse.json({ error: "Kanal #willkommen fehlt" }, { status: 404 });
  const kanaele = (await call<{ name: string; type: number }[]>(token, "GET", `/guilds/${GUILD}/channels`)) ?? [];
  return NextResponse.json({
    nachrichten: l.roh.map((m) => ({
      id: m.id,
      bot: Boolean(m.author.bot),
      titel: m.embeds?.[0]?.title ?? null,
      text: m.embeds?.[0]?.description ?? m.content ?? "",
      felder: (m.embeds?.[0]?.fields ?? []).map((f) => f.name),
    })),
    kanaele: kanaele.filter((k) => k.type === 0 || k.type === 4).map((k) => (k.type === 4 ? `[${k.name}]` : k.name)),
    plan: planeWillkommen(l.nachrichten, ANLEITUNGEN),
    planReihenfolge: planeReihenfolge(l.nachrichten, ANLEITUNGEN),
  });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const q = new URL(req.url).searchParams;
  const l = await lies(token);
  if (!l) return NextResponse.json({ error: "Kanal #willkommen fehlt" }, { status: 404 });

  const plan: Schritt[] | null = q.get("reihenfolge") ? planeReihenfolge(l.nachrichten, ANLEITUNGEN) : planeWillkommen(l.nachrichten, ANLEITUNGEN);
  if (!plan) return NextResponse.json({ error: "In #willkommen steht eine Bot-Nachricht, die zu keiner Anleitung gehört. Ohne ?reihenfolge=1 aufrufen." }, { status: 409 });
  if (q.get("probe")) return NextResponse.json({ probe: true, plan });

  const ergebnis: string[] = [];
  for (const s of plan) {
    const a = ANLEITUNGEN.find((x) => x.titel === s.titel)!;
    const body = { embeds: [alsEmbed(a, GOLD)], content: "", allowed_mentions: { parse: [] } };
    if (s.art === "aendern") {
      const ok = await call(token, "PATCH", `/channels/${l.kanal}/messages/${s.id}`, body);
      ergebnis.push(`${s.titel}: ${ok ? "geändert" : "FEHLER"}`);
    } else if (s.art === "neu") {
      const ok = await call(token, "POST", `/channels/${l.kanal}/messages`, body);
      ergebnis.push(`${s.titel}: ${ok ? "neu" : "FEHLER"}`);
    } else ergebnis.push(`${s.titel}: ausgelassen (nicht vorhanden)`);
  }
  return NextResponse.json({ ergebnis });
}
