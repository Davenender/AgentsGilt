import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { call } from "@/lib/leads";
import { serverCheck, sperreArchiv } from "@/lib/server-check-lauf";
import { ladeTeam } from "@/lib/team-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Discord-Durchsicht (16.11.2026): liest den Aufbau des Servers, nur lesen, nur mit HELFER_SECRET.
// Rollen mit Reihenfolge, Kategorien und Kanäle mit Sonderrechten, Mitglieder mit Rollen, laufende Threads.
// Gibt nur Namen, Kennungen und Rechte-Namen zurück, keine Nachrichten.
//   POST {"aktion":"check"}   → Server-Check jetzt (ohne Karte), Funde als Liste
//   POST {"aktion":"archiv"}  → geschlossene Tickets im ARCHIV fürs Team schreibgeschützt

const GUILD = process.env.DISCORD_GUILD_ID || "1564355422222159975";

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

const RECHTE: [string, bigint][] = [
  ["admin", BigInt(1) << BigInt(3)],
  ["kanaele_verwalten", BigInt(1) << BigInt(4)],
  ["sehen", BigInt(1) << BigInt(10)],
  ["schreiben", BigInt(1) << BigInt(11)],
  ["nachrichten_verwalten", BigInt(1) << BigInt(13)],
  ["verlauf", BigInt(1) << BigInt(16)],
  ["rollen_verwalten", BigInt(1) << BigInt(28)],
  ["threads_verwalten", BigInt(1) << BigInt(34)],
  ["oeffentliche_threads", BigInt(1) << BigInt(35)],
  ["private_threads", BigInt(1) << BigInt(36)],
  ["in_threads_schreiben", BigInt(1) << BigInt(38)],
  ["anheften", BigInt(1) << BigInt(51)],
];
const namen = (bits: string | undefined) => {
  const b = BigInt(bits ?? "0");
  return RECHTE.filter(([, v]) => (b & v) === v).map(([n]) => n);
};

type Rolle = { id: string; name: string; position: number; permissions: string; managed: boolean };
type Kanal = { id: string; name: string; type: number; position: number; parent_id?: string | null; permission_overwrites?: { id: string; type: number; allow: string; deny: string }[] };
type Mitglied = { user: { id: string; username: string; global_name?: string | null; bot?: boolean }; nick?: string | null; roles: string[] };

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const [rollen, kanaele, mitglieder, threads, ich] = await Promise.all([
    call<Rolle[]>(token, "GET", `/guilds/${GUILD}/roles`),
    call<Kanal[]>(token, "GET", `/guilds/${GUILD}/channels`),
    call<Mitglied[]>(token, "GET", `/guilds/${GUILD}/members?limit=100`),
    call<{ threads?: { id: string; name: string; parent_id: string; type: number; member_count?: number }[] }>(token, "GET", `/guilds/${GUILD}/threads/active`),
    call<{ id: string }>(token, "GET", "/users/@me"),
  ]);
  if (!rollen || !kanaele) return NextResponse.json({ error: "Discord nicht lesbar" }, { status: 502 });
  const rollenName = new Map(rollen.map((r) => [r.id, r.name]));
  const personName = new Map((mitglieder ?? []).map((m) => [m.user.id, m.nick || m.user.global_name || m.user.username]));
  const botRollen = (mitglieder ?? []).find((m) => m.user.id === ich?.id)?.roles ?? [];
  const botHoechste = Math.max(0, ...rollen.filter((r) => botRollen.includes(r.id)).map((r) => r.position));
  const kategorien = new Map(kanaele.filter((k) => k.type === 4).map((k) => [k.id, k.name]));
  const sonder = (k: Kanal) =>
    (k.permission_overwrites ?? []).map((o) => ({
      fuer: o.type === 0 ? `Rolle ${rollenName.get(o.id) ?? o.id}` : `Person ${personName.get(o.id) ?? o.id}`,
      erlaubt: namen(o.allow),
      verboten: namen(o.deny),
    }));
  return NextResponse.json({
    bot: { id: ich?.id, rollen: botRollen.map((r) => rollenName.get(r)), hoechstePosition: botHoechste },
    rollen: rollen
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, position: r.position, rechte: namen(r.permissions), vonBot: r.managed, botDarfVergeben: r.position < botHoechste })),
    kanaele: kanaele
      .sort((a, b) => a.position - b.position)
      .map((k) => ({ id: k.id, name: k.name, art: k.type === 4 ? "Kategorie" : k.type === 0 ? "Text" : k.type === 2 ? "Sprache" : k.type === 15 ? "Forum" : `Typ ${k.type}`, kategorie: k.parent_id ? kategorien.get(k.parent_id) ?? k.parent_id : null, position: k.position, sonderrechte: sonder(k) })),
    mitglieder: (mitglieder ?? []).map((m) => ({ id: m.user.id, name: personName.get(m.user.id), bot: Boolean(m.user.bot), rollen: m.roles.map((r) => rollenName.get(r) ?? r) })),
    threads: (threads?.threads ?? []).map((t) => ({ id: t.id, name: t.name, in: kanaele.find((k) => k.id === t.parent_id)?.name ?? t.parent_id, privat: t.type === 12, mitglieder: t.member_count })),
  });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const aktion = String(((await req.json().catch(() => ({}))) as { aktion?: unknown }).aktion ?? "");
  await ladeTeam(token);
  if (aktion === "check") return NextResponse.json(await serverCheck(token, false));
  if (aktion === "archiv") return NextResponse.json(await sperreArchiv(token));
  return NextResponse.json({ error: "aktion: check oder archiv" }, { status: 400 });
}
