import { randomUUID, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import {
  createTextChannel,
  editMessage,
  findCategoryId,
  findChannelId,
  listMessages,
  postEmbed,
  postText,
  setzeKanalName,
} from "@/lib/discord";
import {
  aenderungen,
  CARD_MARKER,
  kanalName,
  kanalNameMitPunkt,
  kundenKarte,
  parseKunde,
  statusPunkt,
  wert,
} from "@/lib/notion-kunden";
import { call } from "@/lib/leads";
import { holeKundenNr, seitenId } from "@/lib/notion-api";
import type { Kunde } from "@/lib/notion-kunden";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Notion ruft diese Adresse auf, wenn in der Kunden-Datenbank eine Zeile
// angelegt oder ein wichtiges Feld geändert wird (Automation "Webhook senden").
//
// In Notion als URL eintragen:  https://agentsgilt.com/api/notion?key=<NOTION_WEBHOOK_KEY>
//
// Pro Kunde gibt es den Kanal knd_00X (wird angelegt, falls er fehlt) mit einer
// Karte (Embed), die bei jeder Änderung überschrieben wird. Zusätzlich steht
// jede Änderung als kurze Zeile im Kanal. Vor dem Kanalnamen steht ein Farbpunkt
// je Status (🔴knd_004), siehe statusPunkt.
//
// Wartezeit: Notion schickt bei jedem geänderten Feld eine eigene Meldung. Damit beim
// Ausfüllen nicht zehn Meldungen in Discord landen, wartet der Bot nach jeder Meldung
// eine Minute. Kommt in der Zeit eine neue Meldung zur selben Seite, beginnt die Minute
// von vorn. Erst danach überträgt er den Stand aus der letzten Meldung, also alle Änderungen
// auf einmal. Den Stand merkt er sich in einer Nachricht in #notion ("⏳ … wartet").
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

type Ergebnis = { res: NextResponse; protokoll?: string };

/** Prüft den Aufruf und liest die Seite aus dem Webhook. */
async function annehmen(request: Request): Promise<Ergebnis | { kunde: Kunde; payload: unknown }> {
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
  return { kunde, payload };
}

/** Überträgt eine Seite nach Discord: Kanal anlegen oder umbenennen, Karte und Änderungszeile. */
async function uebertrage(kunde: Kunde, seite: string | null): Promise<Ergebnis> {
  if (!kunde.nr) {
    // Der Webhook liefert die Nummer nicht immer mit: direkt bei Notion nachschlagen.
    kunde.nr = await holeKundenNr(kunde.url ?? seite);
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
  const status = wert(kunde.props["Status"]);
  const mitPunkt = kanalNameMitPunkt(kunde.nr, status);
  const karte = kundenKarte(kunde);

  let kanal = await findChannelId(token, name);
  let neu = false;
  if (!kanal) {
    const kategorie = await findCategoryId(token, "KUNDEN");
    kanal = await createTextChannel(token, mitPunkt, kategorie, `${kunde.nr} · ${kunde.name}`);
    neu = true;
  } else if (statusPunkt(status)) {
    // Farbpunkt vor dem Kanalnamen an den Status anpassen (🔴knd_004 -> 🟡knd_004).
    await setzeKanalName(token, kanal, mitPunkt);
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

// ------------------------------------------------------------------ Wartezeit

const WARTEN_MS = 60_000;
const WARTE_MARKER = "wartet:";

type LogNachricht = { id: string; author: { bot?: boolean }; embeds?: { footer?: { text?: string } }[] };

/** Die "⏳ wartet"-Nachrichten zu einer Seite in #notion, neueste zuerst. */
async function warteNachrichten(token: string, log: string, seite: string): Promise<LogNachricht[]> {
  const alle = (await call<LogNachricht[]>(token, "GET", `/channels/${log}/messages?limit=50`)) ?? [];
  return alle.filter((m) => m.author.bot && m.embeds?.[0]?.footer?.text?.startsWith(`${WARTE_MARKER}${seite}:`));
}

/** Merkt sich die neueste Meldung zu einer Seite. Gibt false zurück, wenn das nicht ging. */
async function merkeWarten(token: string, log: string, seite: string, marke: string, name: string): Promise<boolean> {
  const embed = {
    description: "Wird übertragen, sobald eine Minute lang nichts mehr geändert wurde.",
    color: 0x9ca3af,
    footer: { text: `${WARTE_MARKER}${seite}:${marke}` },
  };
  const [vorhanden] = await warteNachrichten(token, log, seite);
  if (vorhanden) return (await call(token, "PATCH", `/channels/${log}/messages/${vorhanden.id}`, { embeds: [embed] })) !== null;
  return (await call(token, "POST", `/channels/${log}/messages`, { content: `⏳ ${name || "Notion"}: Änderung erhalten.`, embeds: [embed], allowed_mentions: { parse: [] } })) !== null;
}

async function protokolliere(protokoll: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const log = await findChannelId(token, "notion");
  if (log) await postText(token, log, protokoll);
}

export async function POST(request: Request) {
  const angenommen = await annehmen(request);
  if ("res" in angenommen) {
    if (angenommen.protokoll) await protokolliere(angenommen.protokoll);
    return angenommen.res;
  }
  const { kunde, payload } = angenommen;
  if (AUSGENOMMEN.some((re) => re.test(kunde.name))) return NextResponse.json({ ok: true, uebersprungen: "ausgenommen" });
  const seite = seitenId(kunde.url ?? pageId(payload));
  const token = process.env.DISCORD_BOT_TOKEN;
  const log = await findChannelId(token, "notion");
  const marke = randomUUID().slice(0, 8);

  // Ohne Seiten-ID oder ohne #notion geht das Warten nicht: dann wie früher sofort übertragen.
  if (!seite || !token || !log || !(await merkeWarten(token, log, seite, marke, kunde.name))) {
    const { res, protokoll } = await uebertrage(kunde, seite);
    if (protokoll) await protokolliere(protokoll);
    return res;
  }

  after(async () => {
    await new Promise((r) => setTimeout(r, WARTEN_MS));
    const [neueste, ...aeltere] = await warteNachrichten(token, log, seite);
    // Ist inzwischen eine neuere Meldung gekommen, überträgt deren Aufruf.
    if (!neueste || neueste.embeds?.[0]?.footer?.text !== `${WARTE_MARKER}${seite}:${marke}`) return;
    // Jede Notion-Meldung enthält die ganze Seite, die neueste also den aktuellen Stand.
    const { protokoll } = await uebertrage(kunde, seite);
    await call(token, "PATCH", `/channels/${log}/messages/${neueste.id}`, {
      content: protokoll ?? `${kunde.name}: übertragen.`,
      embeds: [],
      allowed_mentions: { parse: [] },
    });
    for (const m of aeltere) await call(token, "DELETE", `/channels/${log}/messages/${m.id}`);
  });
  return NextResponse.json({ ok: true, wartet: true });
}
