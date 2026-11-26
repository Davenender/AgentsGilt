import { randomBytes } from "node:crypto";
import { anmeldeUrl, antwortSeite, STATE_COOKIE } from "@/lib/discord-verknuepfen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Davids Wunsch 26.11.2026: einmal öffnen → bei Discord zustimmen → „Agents Gilt · Founder“ unter „Verknüpfungen“.
// Auch die „Verifizierungs-URL für verknüpfte Rollen“ der Agents-Gilt-App zeigt hierher.
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const html = (titel: string, text: string, status = 200) => new Response(antwortSeite(titel, text), { status, headers: { "content-type": "text/html; charset=utf-8" } });
  if (!token || !process.env.DISCORD_CLIENT_SECRET) return html("Noch nicht eingerichtet", "Bei Vercel fehlt DISCORD_CLIENT_SECRET.", 503);
  // Die Anwendungs-ID der Agents-Gilt-App (= Bot) direkt von Discord
  const r = await fetch("https://discord.com/api/v10/oauth2/applications/@me", { headers: { authorization: `Bot ${token}` }, cache: "no-store" }).catch(() => null);
  const app = r?.ok ? ((await r.json()) as { id?: string }) : null;
  if (!app?.id) return html("Discord antwortet nicht", "Bitte gleich noch einmal versuchen.", 502);
  const state = randomBytes(16).toString("hex");
  return new Response(null, {
    status: 302,
    headers: { location: anmeldeUrl({ clientId: app.id, state }), "set-cookie": `${STATE_COOKIE}=${state}; Path=/api/discord/verknuepfen; Max-Age=600; HttpOnly; Secure; SameSite=Lax` },
  });
}
