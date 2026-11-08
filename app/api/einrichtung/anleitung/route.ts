import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findChannelId } from "@/lib/discord";
import { USAGE_TEXT } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Einmalig (Plan 1, Etappe 3): Anleitung in #lead-befehle und Kurztext in #leads auf die neuen
// /lead-Wege bringen. Ändert nur diese zwei Bot-Nachrichten. Geschützt mit HELFER_SECRET. Danach entfernen.
//   GET  → zeigt die aktuellen Texte
//   POST → ersetzt sie

const API = "https://discord.com/api/v10";

const BEFEHLE = [
  "**Anleitung: Lead-Karten**",
  "In diesem Kanal gibst du die Befehle ein. Nur hier funktionieren sie.",
  "",
  "**1. Neues Unternehmen vorschlagen** (drei Wege)",
  "• **Mit Website:** `/lead link: www.beispiel.de`. Der Bot liest die Seite und legt in **#leads** eine Karte an.",
  "• **Mit Google-Maps-Link:** `/lead link:` und den Link aus Google Maps einfügen (in Maps auf „Teilen“ → „Link kopieren“).",
  "• **Ohne Website:** `/lead name: Bäckerei Schmitt ort: Mühlheim`. Der Bot sucht die Firma bei Google Maps.",
  "Findet der Bot nichts (oder du schreibst nur `/lead`), erscheint der Knopf **📝 Formular öffnen**. Dort trägst du Firma, Ort, Telefon, Ansprechpartner und eine Notiz ein.",
  "",
  "**2. Abstimmen**",
  "In **#leads** auf **Passt** (grün) oder **Passt nicht** (rot) klicken. Zwei gleiche Stimmen entscheiden, die eigene Stimme lässt sich ändern. Bei zwei „Passt nicht“ kommt noch eine Rückfrage.",
  "",
  "**3. Übernehmen und Status setzen**",
  "Nach der Annahme den Lead mit **Übernehmen** zu dir nehmen. Dann per Knopf: Offen, In Arbeit, Kontaktiert, **Lead aktiv** (legt den Kunden in Notion an, du wirst dort als **Zuständig** eingetragen) oder Kein Interesse (kommt in **#lead-ablage**).",
  "",
  "**4. Im Kundenkanal weiter**",
  "Nach „Lead aktiv“ entsteht der Kanal 🔴knd_00X mit der Kundenkarte. Dort schreibt nur der Bot, ihr drückt Knöpfe: **👥 Zuständige** ändern, **⚪ Verloren** (mit Grund, der Kanal wandert ins KUNDENARCHIV) und dort **↩️ Wieder aufnehmen**. Notizen kommen in Notion.",
  "",
  "**5. Karte löschen oder Ablehnung aufheben** (nur David)",
  "`/lead-delete` mit dem Link.",
  "",
  "Hinweis: Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).",
].join("\n");

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const a = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Msg = { id: string; content: string; author: { bot?: boolean } };

async function finde(token: string, kanal: string, anfang: string) {
  const ch = await findChannelId(token, kanal);
  if (!ch) return null;
  const h = { Authorization: `Bot ${token}` };
  for (const pfad of [`/channels/${ch}/pins`, `/channels/${ch}/messages?limit=100`]) {
    const res = await fetch(`${API}${pfad}`, { headers: h, cache: "no-store" });
    const list = res.ok ? ((await res.json()) as Msg[]) : [];
    const m = list.find((x) => x.author.bot && x.content.startsWith(anfang));
    if (m) return { ch, m };
  }
  return null;
}

const ZIELE = [
  { kanal: "lead-befehle", anfang: "**Anleitung: Lead-Karten**", text: BEFEHLE },
  { kanal: "leads", anfang: "**So legst du eine Lead-Karte an**", text: USAGE_TEXT },
];

export async function GET(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const out: Record<string, string | null> = {};
  for (const z of ZIELE) out[z.kanal] = (await finde(token, z.kanal, z.anfang))?.m.content ?? null;
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  if (!erlaubt(req)) return NextResponse.json({ error: "nicht erlaubt" }, { status: 401 });
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const out: Record<string, number | string> = {};
  for (const z of ZIELE) {
    const f = await finde(token, z.kanal, z.anfang);
    if (!f) {
      out[z.kanal] = "Nachricht nicht gefunden";
      continue;
    }
    const res = await fetch(`${API}/channels/${f.ch}/messages/${f.m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bot ${token}` },
      body: JSON.stringify({ content: z.text, allowed_mentions: { parse: [] } }),
    });
    out[z.kanal] = res.status;
  }
  return NextResponse.json(out);
}
