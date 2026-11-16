import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Prüft die Schlüssel für Finanzen und Verloren-Automat (16.11.2026): VERCEL_TOKEN, GITHUB_TOKEN, STRIPE_SECRET_KEY.
// Nur für David (HELFER_SECRET). Jeder Dienst wird einmal nur lesend gefragt; zurück kommt nur „geht“ oder der HTTP-Code,
// nie ein Schlüssel oder ein Teil davon.

const TEAM = process.env.VERCEL_TEAM_ID || "team_aGDX333dwIk6UgZq6ACgeHaU";

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function frage(url: string, headers: Record<string, string>): Promise<{ status: number; json: unknown }> {
  try {
    const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return { status: res.status, json: await res.json().catch(() => null) };
  } catch {
    return { status: 0, json: null };
  }
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const vercel = process.env.VERCEL_TOKEN?.trim();
  const github = process.env.GITHUB_TOKEN?.trim();
  const stripe = process.env.STRIPE_SECRET_KEY?.trim();

  const v = vercel ? await frage(`https://api.vercel.com/v9/projects?teamId=${TEAM}&limit=20`, { Authorization: `Bearer ${vercel}` }) : null;
  const g = github ? await frage("https://api.github.com/repos/Davenender/relaxfit-demo", { Authorization: `Bearer ${github}`, Accept: "application/vnd.github+json", "User-Agent": "agentsgilt-server" }) : null;
  const s = stripe ? await frage("https://api.stripe.com/v1/payment_links?limit=1", { Authorization: `Bearer ${stripe}` }) : null;

  const projekte = ((v?.json as { projects?: { name?: string }[] } | null)?.projects ?? []).map((p) => p.name).filter(Boolean);
  const repoRechte = (g?.json as { permissions?: { admin?: boolean } } | null)?.permissions;
  return NextResponse.json({
    vercel: !vercel ? "fehlt" : v?.status === 200 ? `geht (${projekte.length} Projekte: ${projekte.join(", ")})` : `HTTP ${v?.status}`,
    github: !github ? "fehlt" : g?.status === 200 ? (repoRechte?.admin ? "geht (darf archivieren)" : "liest, darf aber nicht archivieren") : `HTTP ${g?.status}`,
    stripe: !stripe ? "fehlt" : s?.status === 200 ? `geht (${stripe.startsWith("rk_live_") ? "eingeschränkt, live" : stripe.startsWith("rk_") ? "eingeschränkt" : "Achtung: kein eingeschränkter Schlüssel"})` : `HTTP ${s?.status}`,
  });
}
