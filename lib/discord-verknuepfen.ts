// Davids Wunsch 26.11.2026: Unter „Verknüpfungen“ in seinem Discord-Profil steht das Agents-Gilt-Logo mit „Agents Gilt ·
// Founder“. Dafür meldet die Agents-Gilt-App (der Bot) über Discords „Linked Roles“ eine Verbindung für David an: einmal
// /api/discord/verknuepfen öffnen → bei Discord zustimmen → /api/discord/verknuepfen/rueckruf trägt sie ein. Nur David.

import { timingSafeEqual } from "node:crypto";

export const DAVID_DISCORD_ID = "806859236768088114";
export const RUECKRUF = "https://agentsgilt.com/api/discord/verknuepfen/rueckruf";
export const STATE_COOKIE = "ag_dc_verknuepfen";

/** Was im Profil steht (Titel und Zeile neben dem Logo) */
export const VERKNUEPFUNG = { platform_name: "Agents Gilt", platform_username: "Agents Gilt · Founder" };
/** Ein Merkmal, damit Discord die App als Verbindung mit verknüpfter Rolle führt (7 = Ja/Nein „ist gleich“) */
export const METADATEN = [{ type: 7, key: "founder", name: "Founder", description: "Gründer von Agents Gilt" }];

export function anmeldeUrl(o: { clientId: string; state: string; redirect?: string }): string {
  const q = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirect ?? RUECKRUF,
    response_type: "code",
    scope: "role_connections.write identify",
    state: o.state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${q.toString()}`;
}

/** Nur für David – alle anderen bekommen nichts eingetragen */
export function rollenVerbindung(userId: string): (typeof VERKNUEPFUNG & { metadata: Record<string, string> }) | null {
  return userId === DAVID_DISCORD_ID ? { ...VERKNUEPFUNG, metadata: { founder: "1" } } : null;
}

export function statePasst(cookie: string | undefined | null, state: string | null): boolean {
  if (!cookie || !state || cookie.length < 16) return false;
  const a = Buffer.from(cookie), b = Buffer.from(state);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Kleine Antwortseite (die Seite sieht nur David, einmal) */
export function antwortSeite(titel: string, text: string): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0e14;color:#f3ead7;font-family:system-ui,sans-serif"><main style="max-width:420px;padding:24px;text-align:center"><h1 style="color:#e0a84a;font-size:22px">${esc(titel)}</h1><p style="line-height:1.5">${esc(text)}</p></main></body></html>`;
}
