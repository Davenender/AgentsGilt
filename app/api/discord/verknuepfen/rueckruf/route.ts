import { antwortSeite, METADATEN, RUECKRUF, rollenVerbindung, STATE_COOKIE, statePasst } from "@/lib/discord-verknuepfen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://discord.com/api/v10";
const html = (titel: string, text: string, status = 200) =>
  new Response(antwortSeite(titel, text), { status, headers: { "content-type": "text/html; charset=utf-8", "set-cookie": `${STATE_COOKIE}=; Path=/api/discord/verknuepfen; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });

// Discord schickt David nach der Zustimmung hierher: Code eintauschen, prüfen, dass es David ist, Verbindung eintragen.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([a-f0-9]+)`))?.[1];
  if (!statePasst(cookie, url.searchParams.get("state"))) return html("Abgelaufen", "Bitte den Link zum Verknüpfen noch einmal öffnen.", 400);
  const code = url.searchParams.get("code");
  const token = process.env.DISCORD_BOT_TOKEN, geheim = process.env.DISCORD_CLIENT_SECRET;
  if (!code || !token || !geheim) return html("Nicht möglich", "Es fehlt etwas – bitte noch einmal versuchen.", 400);

  const app = (await fetch(`${API}/oauth2/applications/@me`, { headers: { authorization: `Bot ${token}` }, cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as { id?: string } | null;
  if (!app?.id) return html("Discord antwortet nicht", "Bitte gleich noch einmal versuchen.", 502);
  const tausch = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: app.id, client_secret: geheim, grant_type: "authorization_code", code, redirect_uri: RUECKRUF }),
  }).catch(() => null);
  const zugang = tausch?.ok ? ((await tausch.json()) as { access_token?: string }) : null;
  if (!zugang?.access_token) return html("Nicht geklappt", "Discord hat die Anmeldung nicht bestätigt. Bitte noch einmal versuchen.", 400);
  const bearer = { authorization: `Bearer ${zugang.access_token}` };
  const ich = (await fetch(`${API}/users/@me`, { headers: bearer }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as { id?: string } | null;
  const verbindung = ich?.id ? rollenVerbindung(ich.id) : null;
  if (!verbindung) return html("Nur für den Gründer", "Diese Verknüpfung ist nur für David gedacht.", 403);

  // Das Merkmal einmal anmelden (gleichbleibend), dann Davids Verbindung eintragen
  await fetch(`${API}/applications/${app.id}/role-connections/metadata`, { method: "PUT", headers: { authorization: `Bot ${token}`, "content-type": "application/json" }, body: JSON.stringify(METADATEN) }).catch(() => null);
  const gesetzt = await fetch(`${API}/users/@me/applications/${app.id}/role-connection`, { method: "PUT", headers: { ...bearer, "content-type": "application/json" }, body: JSON.stringify(verbindung) }).catch(() => null);
  if (!gesetzt?.ok) return html("Nicht geklappt", `Discord hat die Verbindung nicht angenommen (${gesetzt?.status ?? "keine Antwort"}).`, 502);
  return html("Verknüpft ✓", "In Discord steht jetzt unter Profil → Verknüpfungen „Agents Gilt · Founder“. Das kann ein paar Sekunden dauern.");
}
