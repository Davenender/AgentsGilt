import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { bucheBeleg, meldeBeleg } from "@/lib/belege";
import { belegEmpfaenger, belegKennung } from "@/lib/belege-regeln";

export const runtime = "nodejs";
export const maxDuration = 60;

// Finanzen A3 (16.11.2026): Das kleine Skript im PRIVATEN Gmail (gmail-belege-privat.gs) sucht dort nur Rechnungen der
// Firmen-Anbieter und schickt sie hierher, samt PDF. Andere private Mails verlassen das Postfach nie.
// Geschützt mit demselben Geheimwort wie die Gmail-Brücke (Kopfzeile x-mail-secret).
// A4 (16.11.2026): Auch das Skript von kontakt@ schickt hierher, wenn es alte Rechnungen nachträgt (postfach "kontakt@").

const schema = z.object({
  id: z.string().min(1).max(100),
  von: z.string().max(300),
  betreff: z.string().max(500).default(""),
  text: z.string().max(20_000).default(""),
  link: z.string().url().max(500).optional(),
  an: z.string().max(500).optional(),
  datum: z.string().max(40).optional(),
  postfach: z.enum(["privat", "kontakt@"]).default("privat"),
  pdf: z.object({ name: z.string().max(200), daten: z.string().max(4_500_000) }).optional(),
});

function geheimOk(given: string | null): boolean {
  const expected = process.env.MAIL_BRIDGE_SECRET?.trim();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!geheimOk(request.headers.get("x-mail-secret"))) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
  const m = parsed.data;
  const pdf = m.pdf ? { name: m.pdf.name, daten: Uint8Array.from(Buffer.from(m.pdf.daten, "base64")) } : null;
  const b = await bucheBeleg({ id: belegKennung(m.id, m.postfach), von: m.von, betreff: m.betreff, text: m.text, an: belegEmpfaenger(m.postfach, m.an), anhaenge: pdf ? [{ name: pdf.name, typ: "application/pdf", groesse: pdf.daten.byteLength }] : [], link: m.link, datum: m.datum }, pdf);
  const token = process.env.DISCORD_BOT_TOKEN;
  if (b.art === "gebucht" && token) await meldeBeleg(token, b);
  console.log(`[belege] ${m.postfach} ${m.id}: ${b.art}${"grund" in b ? ` (${b.grund})` : ""}`);
  // Fehler: 502, damit das Skript es beim nächsten Lauf noch einmal schickt. Alles andere ist erledigt.
  return NextResponse.json({ ok: b.art !== "fehler", art: b.art }, { status: b.art === "fehler" ? 502 : 200 });
}
