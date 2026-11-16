import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { speicherKategorie } from "@/lib/akademie-daten";
import { call } from "@/lib/leads";
import { SPEICHER_KATEGORIE, speicherPlan } from "@/lib/speicher-kategorie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Kategorie „🗄️ SPEICHER“ einrichten (16.11.2026, Davids Wunsch). Nur für David: geschützt mit HELFER_SECRET.
//   POST → legt die Kategorie an (nur David und der Bot sehen sie), schiebt sie ganz nach unten und die Merkzettel
//          aus lib/speicher-kategorie.ts hinein. Die Rechte der Kanäle bleiben, wie sie sind. Wiederholen schadet nicht.

const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";
type Kanal = { id: string; name: string; type: number; position: number; parent_id?: string | null };

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const alle = await call<Kanal[]>(token, "GET", `/guilds/${GUILD}/channels`);
  if (!alle) return NextResponse.json({ error: "Kanalliste nicht lesbar (Discord bremst?), gleich nochmal" }, { status: 502 });
  const kat = await speicherKategorie(token, alle);
  if (!kat) return NextResponse.json({ error: `${SPEICHER_KATEGORIE} konnte nicht angelegt werden` }, { status: 502 });
  const liste = alle.some((c) => c.id === kat) ? alle : ((await call<Kanal[]>(token, "GET", `/guilds/${GUILD}/channels`)) ?? alle);
  const plan = speicherPlan(liste, kat);
  const nachUnten = plan.position === null ? "schon unten" : (await call(token, "PATCH", `/guilds/${GUILD}/channels`, [{ id: kat, position: plan.position }])) !== null ? "ok" : "fehler";
  const verschoben: string[] = [];
  const fehler: string[] = [];
  for (const id of plan.verschieben) {
    const name = liste.find((c) => c.id === id)?.name ?? id;
    if ((await call(token, "PATCH", `/channels/${id}`, { parent_id: kat, lock_permissions: false })) !== null) verschoben.push(name);
    else fehler.push(name);
  }
  return NextResponse.json({ ok: fehler.length === 0, kategorie: SPEICHER_KATEGORIE, nachUnten, verschoben, fehler });
}
