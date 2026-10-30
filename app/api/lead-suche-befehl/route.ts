import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig: meldet den Befehl /close bei Discord an (legt nur diesen einen Befehl an, andere bleiben unberührt). Danach entfernen.
const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const API = "https://discord.com/api/v10";

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const h = { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
  const app = (await (await fetch(`${API}/oauth2/applications/@me`, { headers: h })).json()) as { id?: string };
  if (!app.id) return NextResponse.json({ error: "Anwendung nicht gefunden" }, { status: 500 });
  const vorher = (await (await fetch(`${API}/applications/${app.id}/guilds/${GUILD}/commands`, { headers: h })).json()) as { name: string }[];
  const res = await fetch(`${API}/applications/${app.id}/guilds/${GUILD}/commands`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ name: "close", description: "Schließt deinen Such-Thread der Lead-Suche vorzeitig", type: 1 }),
  });
  return NextResponse.json({ status: res.status, vorher: Array.isArray(vorher) ? vorher.map((c) => c.name) : vorher, antwort: (await res.text()).slice(0, 300) });
}
