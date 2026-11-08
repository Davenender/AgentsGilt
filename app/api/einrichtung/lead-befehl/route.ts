import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig (Plan 1, Etappe 3): /lead bekommt die Felder name und ort, link wird freiwillig.
// Ändert nur den Befehl /lead (gleicher Name, Rechte bleiben). Geschützt mit HELFER_SECRET. Danach entfernen.
//   GET  → zeigt den aktuellen Befehl
//   POST → aktualisiert ihn

const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const API = "https://discord.com/api/v10";

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function lage() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const h = { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
  const app = (await (await fetch(`${API}/oauth2/applications/@me`, { headers: h })).json()) as { id?: string };
  if (!app.id) return null;
  const alle = (await (await fetch(`${API}/applications/${app.id}/guilds/${GUILD}/commands`, { headers: h })).json()) as {
    id: string;
    name: string;
    description: string;
    options?: unknown[];
  }[];
  return { h, appId: app.id, lead: Array.isArray(alle) ? alle.find((c) => c.name === "lead") ?? null : null };
}

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const l = await lage();
  return NextResponse.json({ lead: l?.lead ?? null });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const l = await lage();
  if (!l?.lead) return NextResponse.json({ error: "Befehl /lead nicht gefunden" }, { status: 404 });
  const res = await fetch(`${API}/applications/${l.appId}/guilds/${GUILD}/commands/${l.lead.id}`, {
    method: "PATCH",
    headers: l.h,
    body: JSON.stringify({
      description: l.lead.description,
      options: [
        { type: 3, name: "link", description: "Website oder Google-Maps-Link der Firma", required: false },
        { type: 3, name: "name", description: "Firmenname, wenn es keine Website gibt", required: false },
        { type: 3, name: "ort", description: "Ort der Firma (zusammen mit name)", required: false },
      ],
    }),
  });
  return NextResponse.json({ status: res.status, antwort: (await res.text()).slice(0, 600) });
}
