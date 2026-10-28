import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { USAGE_TEXT } from "@/lib/leads";
import { findChannelId } from "@/lib/discord";

export const runtime = "nodejs";

// TEMPORÄR: einmalige Einrichtung (Anleitung im Befehlskanal, Texte korrigieren). Danach löschen.
const KEY_HASH = "b09a86305fa9b9d789113f98cfc59a8c45fd04f475670452fd0c234f8eeb057e";
const API = "https://discord.com/api/v10";

const BEFEHLE = [
  "**Anleitung: Lead-Karten**",
  "In diesem Kanal gibst du die Befehle ein. Nur hier funktionieren sie.",
  "",
  "**1. Neues Unternehmen vorschlagen**",
  "Schreib `/lead` und füge den Link der Firmenwebsite ein, zum Beispiel `/lead link: www.beispiel.de`. Der Bot liest die Seite und legt in **#leads** eine Karte an.",
  "",
  "**2. Abstimmen**",
  "In **#leads** auf **Passt** (grün) oder **Passt nicht** (rot) klicken. Zwei gleiche Stimmen entscheiden, die eigene Stimme lässt sich ändern. Bei zwei „Passt nicht“ kommt noch eine Rückfrage.",
  "",
  "**3. Status setzen**",
  "Nach der Annahme per Knopf: Offen, In Arbeit, Kontaktiert, **Lead aktiv** (legt den Kunden in Notion an) oder Kein Interesse (kommt in **#lead-ablage**).",
  "",
  "**4. Karte löschen oder Ablehnung aufheben** (nur David)",
  "`/lead-delete` mit dem Link.",
  "",
  "Hinweis: Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).",
].join("\n");

type Msg = { id: string; content: string; author: { bot?: boolean }; embeds: { title?: string; description?: string }[] };

export async function POST(request: Request) {
  const given = createHash("sha256").update(request.headers.get("x-key") ?? "").digest();
  if (!timingSafeEqual(given, Buffer.from(KEY_HASH, "hex"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 500 });
  const action = new URL(request.url).searchParams.get("action");
  const h = { "Content-Type": "application/json", Authorization: `Bot ${token}` };
  const out: Record<string, unknown> = {};

  if (action === "befehle") {
    const ch = await findChannelId(token, "lead-befehle");
    if (!ch) return NextResponse.json({ error: "Kanal lead-befehle nicht gefunden" }, { status: 404 });
    const res = await fetch(`${API}/channels/${ch}/messages`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ content: BEFEHLE, allowed_mentions: { parse: [] } }),
    });
    out.post = res.status;
    if (res.ok) {
      const msg = (await res.json()) as { id: string };
      const pin = await fetch(`${API}/channels/${ch}/pins/${msg.id}`, { method: "PUT", headers: h });
      out.pin = pin.status;
    } else out.fehler = (await res.text()).slice(0, 200);
    return NextResponse.json(out);
  }

  if (action === "korrektur") {
    const will = await findChannelId(token, "willkommen");
    if (will) {
      const list = (await (await fetch(`${API}/channels/${will}/messages?limit=50`, { headers: h })).json()) as Msg[];
      const m = list.find((x) => x.author.bot && x.embeds[0]?.title?.includes("Lead-Karten"));
      if (m) {
        const desc = (m.embeds[0].description ?? "").replace(
          /In irgendeinem Kanal `\/lead` schreiben und den Link der Firmenwebsite einfügen\. Nur du siehst die Antwort des Bots\./,
          "Im Kanal **#lead-befehle** `/lead` schreiben und den Link der Firmenwebsite einfügen (nur dort funktioniert der Befehl). Nur du siehst die Antwort des Bots.",
        );
        const r = await fetch(`${API}/channels/${will}/messages/${m.id}`, {
          method: "PATCH",
          headers: h,
          body: JSON.stringify({ embeds: [{ ...m.embeds[0], description: desc }] }),
        });
        out.willkommen = r.status;
        out.geaendert = desc !== m.embeds[0].description;
      } else out.willkommen = "Nachricht nicht gefunden";
    }
    const leads = await findChannelId(token, "leads");
    if (leads) {
      const list = (await (await fetch(`${API}/channels/${leads}/messages?limit=50`, { headers: h })).json()) as Msg[];
      const m = list.find((x) => x.author.bot && x.content.startsWith("**So legst du eine Lead-Karte an**"));
      if (m) {
        const r = await fetch(`${API}/channels/${leads}/messages/${m.id}`, {
          method: "PATCH",
          headers: h,
          body: JSON.stringify({ content: USAGE_TEXT }),
        });
        out.leads = r.status;
      } else out.leads = "Nachricht nicht gefunden";
    }
    return NextResponse.json(out);
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
