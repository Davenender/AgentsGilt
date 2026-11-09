import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { demoAusKarte, demoFeldText, demoOffen, demoZeile, erlaubteAktion, mitDemo, pruefeDemoAktion, statusNachAktion } from "@/lib/demo";
import { findChannelId, messageLink, postText } from "@/lib/discord";
import { findeKarte } from "@/lib/kundenkanal";
import { kartenKnoepfe, statusAusKarte } from "@/lib/kundenablauf";
import { aendereKarte } from "@/lib/leads";
import { listeKunden, setzeFelder } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";
import { team } from "@/lib/team";
import { ladeTeam } from "@/lib/team-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Demo-Anfragen für die Zentrale (Plan 1 Etappe 5, die Oberfläche kommt mit Plan 3).
// Nur für David: geschützt mit HELFER_SECRET (Header "Authorization: Bearer …").
//
//   GET  /api/kunden/demo  → offene Demo-Anfragen (angefragt · bestätigt · in Arbeit)
//   POST /api/kunden/demo  { nr: "KND-003", aktion: "bestaetigen" | "in-arbeit" | "fertig" | "ablehnen", link?: "https://…", grund?: "…" }
//        → setzt „Demo-Status“ (und bei „fertig“ den „Demo-Link“) in Notion, passt die Karte an und schreibt
//          eine Zeile in den Kundenkanal. Bei „fertig“ und „ablehnen“ wird die Person markiert, die angefragt hat.
//          „ablehnen“ leert den Demo-Status, das Feld verschwindet von der Karte und der Knopf ist wieder frei.

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

const name = (id: string | null) => (id ? (team().find((t) => t.discord === id)?.name ?? null) : null);

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  await ladeTeam(token);
  const kunden = await listeKunden();
  if (!token || !kunden) return NextResponse.json({ error: "Notion oder Discord nicht erreichbar" }, { status: 502 });
  const offen = [];
  for (const k of kunden.filter((x) => demoOffen(x.demoStatus))) {
    const kanal = await findChannelId(token, kanalName(k.nr));
    const karte = kanal ? await findeKarte(token, kanal) : null;
    const a = demoAusKarte(karte?.embeds[0]);
    offen.push({
      nr: k.nr,
      name: k.name,
      demoStatus: k.demoStatus,
      angefragtVon: name(a?.von ?? null),
      angefragtAm: a?.zeit ?? null,
      notion: k.notionUrl ?? null,
      discord: kanal && karte ? messageLink(kanal, karte.id) : null,
    });
  }
  return NextResponse.json({ offen });
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  await ladeTeam(token);
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const p = pruefeDemoAktion(await req.json().catch(() => null));
  if (!p.ok) return NextResponse.json({ error: p.grund }, { status: 400 });

  const kunde = (await listeKunden())?.find((k) => k.nr === p.nr);
  if (!kunde?.notionUrl) return NextResponse.json({ error: `${p.nr} nicht gefunden` }, { status: 404 });
  if (!erlaubteAktion(kunde.demoStatus, p.aktion)) {
    return NextResponse.json({ error: `Bei Demo-Status „${kunde.demoStatus ?? "keiner"}“ geht „${p.aktion}“ nicht` }, { status: 409 });
  }
  const status = statusNachAktion(p.aktion);
  const felder: Record<string, unknown> = { "Demo-Status": { select: status ? { name: status } : null } };
  if (p.link) felder["Demo-Link"] = { url: p.link };
  if (!(await setzeFelder(kunde.notionUrl, felder))) return NextResponse.json({ error: "Notion hat die Änderung nicht angenommen" }, { status: 502 });

  const kanal = await findChannelId(token, kanalName(p.nr));
  const karte = kanal ? await findeKarte(token, kanal) : null;
  if (!kanal || !karte) return NextResponse.json({ ok: true, notion: true, discord: "Kanal oder Karte nicht gefunden" });
  const a = demoAusKarte(karte.embeds[0]);
  const anfrage = a?.von && a.zeit ? { von: a.von, zeit: a.zeit } : null;
  await aendereKarte(
    token,
    kanal,
    karte.id,
    mitDemo(karte.embeds[0], status ? demoFeldText(status, p.link, anfrage) : null),
    kartenKnoepfe(statusAusKarte(karte.embeds[0]), status),
  );
  const ping = (p.aktion === "fertig" || p.aktion === "ablehnen") && a?.von ? [a.von] : [];
  await postText(token, kanal, demoZeile(p.aktion, { von: ping[0] ?? null, link: p.link, grund: p.grund }), ping);
  return NextResponse.json({ ok: true, notion: true, discord: true, demoStatus: status });
}
