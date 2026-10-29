import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createTextChannel,
  editMessage,
  findCategoryId,
  findChannelId,
  listMessages,
  postEmbed,
  postText,
} from "@/lib/discord";
import {
  aenderungen,
  CARD_MARKER,
  kanalName,
  kundenKarte,
  parseKunde,
} from "@/lib/notion-kunden";
import { holeKundenNr } from "@/lib/notion-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Notion ruft diese Adresse auf, wenn in der Kunden-Datenbank eine Zeile
// angelegt oder ein wichtiges Feld geändert wird (Automation "Webhook senden").
//
// In Notion als URL eintragen:  https://agentsgilt.com/api/notion?key=<NOTION_WEBHOOK_KEY>
//
// Pro Kunde gibt es den Kanal knd_00X (wird angelegt, falls er fehlt) mit einer
// Karte (Embed), die bei jeder Änderung überschrieben wird. Zusätzlich steht
// jede Änderung als kurze Zeile im Kanal.
//
// Env-Vars (Vercel, Production):
//   NOTION_WEBHOOK_KEY   zufälliger Schlüssel in der Webhook-URL
//   DISCORD_BOT_TOKEN    Token des Bots (braucht "Kanäle verwalten")

const AUSGENOMMEN = [/beispiel/i];

function keyOk(given: string | null): boolean {
  const expected = process.env.NOTION_WEBHOOK_KEY;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Seiten-ID aus dem Webhook, falls keine Adresse mitkommt. */
function pageId(payload: unknown): string | null {
  const root = payload as { id?: unknown; data?: { id?: unknown } } | undefined;
  const id = root?.data?.id ?? root?.id;
  return typeof id === "string" ? id : null;
}

async function verarbeite(request: Request): Promise<{ res: NextResponse; protokoll?: string }> {
  if (!process.env.NOTION_WEBHOOK_KEY) {
    console.error("[notion] NOTION_WEBHOOK_KEY fehlt");
    return { res: NextResponse.json({ error: "Nicht konfiguriert" }, { status: 500 }) };
  }
  if (!keyOk(new URL(request.url).searchParams.get("key"))) {
    return { res: NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 }) };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { res: NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 }) };
  }

  const kunde = parseKunde(payload);
  if (!kunde) {
    // Hilft beim Einrichten: zeigt, was Notion tatsächlich schickt (nur die Struktur).
    const keys = payload && typeof payload === "object" ? Object.keys(payload as object) : [];
    console.error(`[notion] Keine Seite im Webhook gefunden, Schlüssel: ${keys.join(", ")}`);
    return {
      res: NextResponse.json({ error: "Keine Seite erkannt" }, { status: 422 }),
      protokoll: `⚠️ Notion hat etwas geschickt, aber keine Seite war erkennbar (Schlüssel: ${keys.join(", ") || "keine"}).`,
    };
  }
  if (!kunde.nr) {
    // Der Webhook liefert die Nummer nicht immer mit: direkt bei Notion nachschlagen.
    kunde.nr = await holeKundenNr(kunde.url ?? pageId(payload));
  }
  if (!kunde.nr) {
    console.error("[notion] Keine Kunden-Nr. in der Seite");
    return {
      res: NextResponse.json({ ok: false, grund: "keine Kunden-Nr." }),
      protokoll: `⚠️ „${kunde.name}“: keine Kunden-Nr. im Webhook, deshalb nichts getan.`,
    };
  }
  if (AUSGENOMMEN.some((re) => re.test(kunde.name))) {
    return { res: NextResponse.json({ ok: true, uebersprungen: "ausgenommen" }) };
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  const name = kanalName(kunde.nr);
  const karte = kundenKarte(kunde);

  let kanal = await findChannelId(token, name);
  let neu = false;
  if (!kanal) {
    const kategorie = await findCategoryId(token, "KUNDEN");
    kanal = await createTextChannel(token, name, kategorie, `${kunde.nr} · ${kunde.name}`);
    neu = true;
  }
  if (!kanal) {
    return {
      res: NextResponse.json({ error: "Kanal nicht verfügbar" }, { status: 502 }),
      protokoll: `⚠️ ${kunde.nr}: Kanal ${name} konnte nicht gefunden oder angelegt werden (Rechte des Bots prüfen).`,
    };
  }

  // Die bestehende Karte suchen: erste Bot-Nachricht mit unserer Fußzeile.
  const messages = await listMessages(token, kanal, 100);
  const alt = messages.find(
    (m) => m.author.bot && m.embeds[0]?.footer?.text?.startsWith(CARD_MARKER),
  );

  if (alt) {
    const aender = aenderungen(alt.embeds[0], karte);
    if (aender.length === 0) {
      return {
        res: NextResponse.json({ ok: true, geaendert: 0 }),
        protokoll: `${kunde.nr} · ${kunde.name}: Notion-Meldung erhalten, nichts Wichtiges geändert.`,
      };
    }
    await editMessage(token, kanal, alt.id, { embeds: [karte], components: [] });
    await postText(token, kanal, `🔄 ${aender.join("\n")}`);
    return {
      res: NextResponse.json({ ok: true, geaendert: aender.length }),
      protokoll: `${kunde.nr} · ${kunde.name}: ${aender.length} Änderung(en) in <#${kanal}> eingetragen.`,
    };
  }

  await postEmbed(token, kanal, karte);
  console.log(`[notion] Karte für ${kunde.nr} angelegt${neu ? " (neuer Kanal)" : ""}`);
  return {
    res: NextResponse.json({ ok: true, neu }),
    protokoll: `${kunde.nr} · ${kunde.name}: ${neu ? "Kanal angelegt und " : ""}Karte erstellt in <#${kanal}>.`,
  };
}

export async function POST(request: Request) {
  const { res, protokoll } = await verarbeite(request);
  // Jede Meldung aus Notion steht kurz in #notion, so sieht man, was angekommen ist.
  if (protokoll) {
    const token = process.env.DISCORD_BOT_TOKEN;
    const log = await findChannelId(token, "notion");
    if (log) await postText(token, log, protokoll);
  }
  return res;
}
