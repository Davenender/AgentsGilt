import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId, listMessages } from "@/lib/discord";
import { call } from "@/lib/leads";
import { ANLEITUNGEN, GOLD, alsEmbed, gleich, planePlaetze, planeReihenfolge, planeWillkommen, type Schritt } from "@/lib/willkommen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Anleitungen in #willkommen pflegen (Texte in lib/willkommen.ts). Nur für David: geschützt mit HELFER_SECRET.
//   GET                     → zeigt die Bot-Nachrichten in #willkommen und die Kanalnamen des Servers
//   POST ?probe=1           → zeigt nur, was passieren würde
//   POST                    → ändert vorhandene Anleitungen (am Titel erkannt) und legt fehlende neu an
//   POST ?reihenfolge=1     → belegt die vorhandenen Bot-Nachrichten der Reihe nach neu, damit die Reihenfolge stimmt
//   POST ?plaetze=1         → wie reihenfolge, aber streng nach Platz (wenn Titel doppelt oder vertauscht sind)
// Schon passende Nachrichten werden übersprungen, deshalb darf man den Aufruf einfach wiederholen.
// Discord bremst Änderungen an Nachrichten, die älter als eine Stunde sind: dann wird gewartet und neu versucht.
// Nachrichten von Menschen werden nie angefasst, gelöscht wird nichts.

const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const API = "https://discord.com/api/v10";
const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Schickt an Discord und wartet bei 429 die verlangte Zeit ab (höchstens 5 Versuche, höchstens 20 s am Stück). */
async function schicke(token: string, method: string, pfad: string, body: unknown): Promise<string> {
  for (let versuch = 0; versuch < 5; versuch++) {
    const res = await fetch(`${API}${pfad}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bot ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) return "ok";
    if (res.status !== 429) return `HTTP ${res.status}`;
    const j = (await res.json().catch(() => ({}))) as { retry_after?: number };
    const ms = Math.ceil((j.retry_after ?? 1) * 1000) + 300;
    if (ms > 20_000) return `gebremst (${Math.round(ms / 1000)} s), bitte später nochmal`;
    await warte(ms);
  }
  return "gebremst, bitte später nochmal";
}

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
    planPlaetze: planePlaetze(l.nachrichten, ANLEITUNGEN),
  });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const q = new URL(req.url).searchParams;
  const l = await lies(token);
  if (!l) return NextResponse.json({ error: "Kanal #willkommen fehlt" }, { status: 404 });

  const plan: Schritt[] | null = q.get("plaetze")
    ? planePlaetze(l.nachrichten, ANLEITUNGEN)
    : q.get("reihenfolge")
      ? planeReihenfolge(l.nachrichten, ANLEITUNGEN)
      : planeWillkommen(l.nachrichten, ANLEITUNGEN);
  if (!plan) return NextResponse.json({ error: "In #willkommen stehen Bot-Nachrichten, die keiner Anleitung zugeordnet werden können. Ohne ?reihenfolge=1 / ?plaetze=1 aufrufen." }, { status: 409 });
  if (q.get("probe")) return NextResponse.json({ probe: true, plan });

  const ergebnis: string[] = [];
  for (const s of plan) {
    const a = ANLEITUNGEN.find((x) => x.titel === s.titel)!;
    const body = { embeds: [alsEmbed(a, GOLD)], content: "", allowed_mentions: { parse: [] } };
    if (s.art === "aendern") {
      const ist = l.roh.find((m) => m.id === s.id);
      if (ist && !ist.content && gleich(ist.embeds?.[0] ?? {}, body.embeds[0])) {
        ergebnis.push(`${s.titel}: stimmt schon`);
        continue;
      }
      const r = await schicke(token, "PATCH", `/channels/${l.kanal}/messages/${s.id}`, body);
      ergebnis.push(`${s.titel}: ${r === "ok" ? "geändert" : r}`);
    } else if (s.art === "neu") {
      const r = await schicke(token, "POST", `/channels/${l.kanal}/messages`, body);
      ergebnis.push(`${s.titel}: ${r === "ok" ? "neu" : r}`);
    } else ergebnis.push(`${s.titel}: ausgelassen (nicht vorhanden)`);
  }
  return NextResponse.json({ ergebnis });
}
