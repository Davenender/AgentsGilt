import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verarbeiteMail } from "@/lib/mail-eingang";

export const runtime = "nodejs";
export const maxDuration = 60;

// Das Google-Skript (Apps Script) schickt hierher jede neue Mail aus dem Postfach.
// Geschützt durch das Geheimwort MAIL_BRIDGE_SECRET (Kopfzeile x-mail-secret).

const schema = z.object({
  id: z.string().min(1).max(100),
  von: z.string().max(300),
  betreff: z.string().max(500).default(""),
  text: z.string().max(20_000).default(""),
  datum: z.string().max(60).optional(),
  link: z.string().url().max(500).optional(),
});

function geheimOk(given: string | null): boolean {
  const expected = process.env.MAIL_BRIDGE_SECRET?.trim();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.MAIL_BRIDGE_SECRET?.trim()) {
    console.error("[mail] MAIL_BRIDGE_SECRET fehlt");
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 500 });
  }
  if (!geheimOk(request.headers.get("x-mail-secret"))) {
    return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Discord nicht eingerichtet" }, { status: 500 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });

  const res = await verarbeiteMail(token, parsed.data);
  console.log(`[mail] ${parsed.data.id}: ${res.aktion}${"grund" in res ? ` (${res.grund})` : ""}`);
  // Bei einem Fehler 502, damit das Skript die Mail beim nächsten Lauf noch einmal schickt.
  return NextResponse.json(res, { status: res.aktion === "fehler" ? 502 : 200 });
}
