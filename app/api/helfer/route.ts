import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { listeTermine } from "@/lib/google-calendar";
import { listeKunden } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Helfer-Brücke: Davids persönlicher Assistent (Claude am Mac) liest hierüber, was im Discord-Server
// passiert ist und was Twilio/Vapi protokolliert haben. NUR LESEN – hier wird nichts geschrieben,
// gepostet oder geändert. Geschützt mit HELFER_SECRET (Header "Authorization: Bearer …").
//
//   GET /api/helfer?bereich=lage&seit=2026-11-02T06:00:00Z        → neue Discord-Nachrichten je Kanal
//   GET /api/helfer?bereich=protokolle&seit=2026-11-02T06:00:00Z  → Twilio-Anrufe + Warnungen, Vapi-Gespräche
//   GET /api/helfer?bereich=kunden                                → Kundenliste aus Notion (Status, nächster Schritt)
//   GET /api/helfer?bereich=termine&von=ISO&bis=ISO              → Kalendertermine (Standard: heute + morgen)
//
// Ohne "seit": die letzten 24 Stunden.

const DISCORD = "https://discord.com/api/v10";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";
const DISCORD_EPOCH = BigInt(1420070400000);
const MAX_JE_KANAL = 50;
const MAX_TEXT = 600;

function erlaubt(req: Request): boolean {
  const geheim = process.env.HELFER_SECRET?.trim();
  if (!geheim) return false;
  const gesendet = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(gesendet);
  const b = Buffer.from(geheim);
  return a.length === b.length && timingSafeEqual(a, b);
}

function seitAus(url: URL): Date {
  const roh = url.searchParams.get("seit");
  const d = roh ? new Date(roh) : new Date(Date.now() - 24 * 3600_000);
  return Number.isNaN(d.getTime()) ? new Date(Date.now() - 24 * 3600_000) : d;
}

const kurz = (s: string | undefined, n = MAX_TEXT) => (s && s.length > n ? `${s.slice(0, n)} …` : s ?? "");

// ---------- Discord ----------

type Kanal = { id: string; name: string; type: number; parent_id?: string | null };
type Nachricht = {
  id: string;
  timestamp: string;
  content: string;
  author: { username: string; global_name?: string | null; bot?: boolean };
  embeds?: { title?: string; description?: string; fields?: { name: string; value: string }[]; footer?: { text?: string } }[];
};

async function discord<T>(token: string, pfad: string): Promise<T | null> {
  try {
    const res = await fetch(`${DISCORD}${pfad}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function lage(seit: Date) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { fehler: "Kein Discord-Bot-Token" };
  const alle = await discord<Kanal[]>(token, `/guilds/${GUILD_ID}/channels`);
  if (!alle) return { fehler: "Discord-Kanäle nicht lesbar" };

  const kategorie = new Map(alle.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
  const textkanaele = alle.filter((c) => c.type === 0 || c.type === 5);
  // Discord-IDs enthalten den Zeitpunkt – damit holt "after" nur Nachrichten nach "seit".
  const nachId = ((BigInt(seit.getTime()) - DISCORD_EPOCH) << BigInt(22)).toString();

  const kanaele: unknown[] = [];
  for (let i = 0; i < textkanaele.length; i += 5) {
    const gruppe = textkanaele.slice(i, i + 5);
    const ergebnisse = await Promise.all(
      gruppe.map((k) => discord<Nachricht[]>(token, `/channels/${k.id}/messages?after=${nachId}&limit=${MAX_JE_KANAL}`)),
    );
    gruppe.forEach((k, j) => {
      const liste = ergebnisse[j];
      if (!liste || liste.length === 0) return;
      kanaele.push({
        kanal: k.name,
        kategorie: k.parent_id ? kategorie.get(k.parent_id) ?? null : null,
        anzahl: liste.length,
        nachrichten: liste
          .slice()
          .reverse()
          .map((m) => ({
            zeit: m.timestamp,
            von: m.author.global_name || m.author.username,
            bot: Boolean(m.author.bot),
            text: kurz(m.content),
            karten: (m.embeds ?? []).map((e) => ({
              titel: e.title,
              text: kurz(e.description, 400),
              felder: (e.fields ?? []).map((f) => `${f.name}: ${kurz(f.value, 200)}`),
            })),
          })),
      });
    });
  }
  return { seit: seit.toISOString(), kanaele };
}

// ---------- Twilio + Vapi ----------

async function twilio(seit: Date) {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return { fehler: "Twilio nicht eingerichtet" };
  const auth = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
  const tag = seit.toISOString().slice(0, 10);
  try {
    const [anrufeRes, warnRes] = await Promise.all([
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json?StartTime%3E=${tag}&PageSize=50`, {
        headers: { Authorization: auth },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://monitor.twilio.com/v1/Alerts?StartDate=${seit.toISOString()}&PageSize=30`, {
        headers: { Authorization: auth },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    const anrufe = anrufeRes.ok ? ((await anrufeRes.json()).calls as Record<string, string>[]) : [];
    const warnungen = warnRes.ok ? ((await warnRes.json()).alerts as Record<string, string>[]) : [];
    return {
      anrufe: anrufe
        .filter((c) => new Date(c.start_time || c.date_created) >= seit)
        .map((c) => ({
          zeit: c.start_time || c.date_created,
          richtung: c.direction,
          von: c.from,
          an: c.to,
          status: c.status,
          dauerSek: Number(c.duration ?? 0),
        })),
      warnungen: warnungen.map((a) => ({
        zeit: a.date_created,
        code: a.error_code,
        stufe: a.log_level,
        text: kurz(a.alert_text, 300),
      })),
    };
  } catch {
    return { fehler: "Twilio nicht erreichbar" };
  }
}

async function vapi(seit: Date) {
  const key = process.env.VAPI_API_KEY?.trim();
  if (!key) return { fehler: "Vapi-Schlüssel fehlt" };
  try {
    const res = await fetch(`https://api.vapi.ai/call?createdAtGt=${encodeURIComponent(seit.toISOString())}&limit=50`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { fehler: `Vapi HTTP ${res.status}` };
    const calls = (await res.json()) as Record<string, unknown>[];
    return {
      gespraeche: calls.map((c) => {
        const start = c.startedAt ? new Date(String(c.startedAt)).getTime() : 0;
        const ende = c.endedAt ? new Date(String(c.endedAt)).getTime() : 0;
        const kunde = c.customer as { number?: string; name?: string } | undefined;
        const zusammenfassung = (c.analysis as { summary?: string } | undefined)?.summary ?? (c as { summary?: string }).summary;
        return {
          id: c.id ?? null,
          zeit: c.createdAt,
          art: c.type,
          status: c.status,
          endeGrund: c.endedReason,
          dauerSek: start && ende ? Math.round((ende - start) / 1000) : null,
          // nur Name oder die letzten 3 Ziffern – die volle Nummer verlässt die Brücke nicht
          // (Vapi legt die Nummer manchmal auch ins Namensfeld)
          anrufer: kunde?.name?.trim() && !/^[+\d\s()\-/.]+$/.test(kunde.name.trim()) ? kunde.name.trim() : maskiere(kunde?.number ?? kunde?.name),
          // auch diktierte Rückrufnummern in der Zusammenfassung nur gekürzt
          ergebnis: zusammenfassung ? kurz(ohneNummern(String(zusammenfassung)), 240) : null,
        };
      }),
    };
  } catch {
    return { fehler: "Vapi nicht erreichbar" };
  }
}

/** Telefonnummer → „+49 … 678“ (nur die letzten 3 Ziffern sichtbar). */
function maskiere(nummer?: string | null): string | null {
  const ziffern = (nummer ?? "").replace(/\D/g, "");
  if (ziffern.length < 4) return nummer ? "unbekannt" : null;
  return `${nummer!.trim().startsWith("+") ? `+${ziffern.slice(0, 2)} ` : ""}… ${ziffern.slice(-3)}`;
}

/** Zahlenfolgen mit 7 oder mehr Ziffern (Telefonnummern) im Text → „+49 … 678“ bzw. „… 678“. */
function ohneNummern(text: string): string {
  return text.replace(/\+?\d[\d \-/()]{5,}\d/g, (m) => (m.replace(/\D/g, "").length >= 7 ? maskiere(m) ?? m : m));
}

/** „Domain / Anbieter“ (z. B. „relaxfit.de (IONOS)“) → https://relaxfit.de, sonst null. */
function alsWebsite(text?: string | null): string | null {
  const m = (text ?? "").match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s]*)?/i);
  return m ? `https://${m[1].toLowerCase()}` : null;
}

/** Standard: heute 00:00 bis übermorgen 00:00 (Berliner Zeit), sonst ?von= und ?bis=. */
function termineZeitraum(url: URL): { von: Date; bis: Date } {
  const tag = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  const mitternacht = new Date(`${tag}T00:00:00`);
  const versatz = new Date(mitternacht.toLocaleString("en-US", { timeZone: "Europe/Berlin" })).getTime() - mitternacht.getTime();
  const heute = new Date(mitternacht.getTime() - versatz);
  const von = new Date(url.searchParams.get("von") ?? heute.toISOString());
  const bis = new Date(url.searchParams.get("bis") ?? new Date(heute.getTime() + 2 * 86400_000).toISOString());
  return { von: Number.isNaN(von.getTime()) ? heute : von, bis: Number.isNaN(bis.getTime()) ? new Date(heute.getTime() + 2 * 86400_000) : bis };
}

export async function GET(req: Request) {
  if (!process.env.HELFER_SECRET?.trim()) {
    return NextResponse.json({ error: "Helfer-Brücke ist nicht eingerichtet (HELFER_SECRET fehlt)" }, { status: 503 });
  }
  if (!erlaubt(req)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });

  const url = new URL(req.url);
  const seit = seitAus(url);
  const bereich = url.searchParams.get("bereich") ?? "lage";

  if (bereich === "lage") return NextResponse.json(await lage(seit));
  if (bereich === "protokolle") {
    const [t, v] = await Promise.all([twilio(seit), vapi(seit)]);
    return NextResponse.json({ seit: seit.toISOString(), twilio: t, vapi: v });
  }
  if (bereich === "kunden") {
    const kunden = await listeKunden();
    if (!kunden) return NextResponse.json({ error: "Notion nicht erreichbar" }, { status: 502 });
    return NextResponse.json({
      kunden: kunden.map((k) => ({
        nr: k.nr,
        name: k.name,
        status: k.status || null,
        naechsterSchritt: k.naechsterSchritt ?? null,
        followUp: k.followUp ?? null,
        angebot: k.angebot ?? null,
        website: alsWebsite(k.domain),
        demoLink: k.vercelProjekt && /\.vercel\.app/i.test(k.vercelProjekt) ? k.vercelProjekt : null,
        vercelProjekt: k.vercelProjekt ?? null,
        live: k.live ?? false,
        notionUrl: k.notionUrl ?? null,
        kanal: kanalName(k.nr),
        letzteAktivitaet: k.geaendert ?? null,
      })),
    });
  }
  if (bereich === "termine") {
    const { von, bis } = termineZeitraum(url);
    const termine = await listeTermine(von, bis);
    if (!termine) return NextResponse.json({ error: "Kalender nicht erreichbar" }, { status: 502 });
    return NextResponse.json({ von: von.toISOString(), bis: bis.toISOString(), termine });
  }
  return NextResponse.json({ error: "Unbekannter Bereich (lage | protokolle | kunden | termine)" }, { status: 400 });
}
