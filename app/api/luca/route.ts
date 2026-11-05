import { after, NextResponse } from "next/server";
import { briefAus } from "@/lib/luca-logik";
import {
  assistentFuerEingang,
  einrichten,
  lucaEinstellungen,
  gleich,
  holeLage,
  istLucaGespraech,
  letzteGespraeche,
  lucaAn,
  lucaKanal,
  lucaSchluessel,
  markiereAbgeholt,
  briefkasten,
  setzeGespraech,
  posteBrief,
  posteGespraech,
  setzeNotiz,
  rufeDavidAn,
  setzeLage,
  vonZentrale,
} from "@/lib/luca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Luca am Telefon (Davids Helfer aus der Zentrale). Zwei Arten von Aufrufen:
//
// 1. Vapi (Kopf x-vapi-secret = Lucas eigener Schlüssel, NICHT der des Kunden-Assistenten):
//    assistant-request  David hat im Menü die 1 gedrückt → Lucas Assistent mit dem aktuellen Lagebericht
//    tool-calls         auftrag_geben / rueckfrage_beantworten / freigabe_entscheiden → Brief in #luca
//    end-of-call-report kurze Notiz in #luca
// 2. Die Zentrale (Authorization: Bearer HELFER_SECRET):
//    GET  ?a=briefkasten   offene Briefe        POST ?a=abgeholt {ids}
//    POST ?a=lagebericht {stand, text, stimme}  POST ?a=anrufen {grund, test}
//    GET  ?a=status · ?a=gespraeche (Mitschriften)  POST ?a=einrichten (legt Luca bei Vapi an, einmalig)
//    POST ?a=anrufen {grund, info?} – info: was Luca erklären/fragen soll (höchstens 3500 Zeichen)

type ToolCall = { id?: string; name?: string; function?: { name?: string; arguments?: unknown }; arguments?: unknown };
type VapiNachricht = {
  type?: string;
  call?: { id?: string; assistantId?: string | null; assistantOverrides?: { metadata?: Record<string, unknown> } };
  analysis?: { summary?: string };
  artifact?: { transcript?: string };
  transcript?: string;
  toolCallList?: ToolCall[];
  toolCalls?: ToolCall[];
  durationSeconds?: number;
  endedReason?: string;
  summary?: string;
};

function argumente(c: ToolCall): Record<string, unknown> {
  const roh = c.function?.arguments ?? c.arguments;
  try {
    const o = typeof roh === "string" ? JSON.parse(roh || "{}") : roh;
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const ANTWORT: Record<string, string> = {
  zeigen: "Ist unterwegs zum Bildschirm der Zentrale. Sag kurz „Schau mal auf den Bildschirm“ – ist die Zentrale nicht offen, sieht David es, sobald er sie öffnet.",
  rueckruf: "Der Rückruf ist eingeplant. Sag David kurz, wann du dich meldest.",
  auftrag: "Der Auftrag ist bei der Zentrale angekommen. Sag David kurz, dass er erledigt wird und das Ergebnis in der Zentrale steht.",
  antwort: "Die Antwort ist weitergegeben. Die Aufgabe macht damit weiter.",
  freigabe: "Die Entscheidung ist weitergegeben.",
};

async function vonVapi(req: Request, body: { message?: VapiNachricht }) {
  const msg = body.message;
  const typ = msg?.type;

  if (typ === "assistant-request") {
    if (!lucaAn()) return NextResponse.json({ error: "Luca ist nicht eingerichtet" }, { status: 503 });
    // Stufe 6: Gespräch läuft → die Zentrale holt schneller ab (für „zeigen“)
    after(() => setzeGespraech(true).then(() => undefined));
    return NextResponse.json(await assistentFuerEingang());
  }

  if (typ === "tool-calls") {
    const calls = msg?.toolCallList ?? msg?.toolCalls ?? [];
    if (!istLucaGespraech(msg?.call)) {
      console.error("[luca] Werkzeug-Aufruf aus einem fremden Gespräch abgewiesen");
      return NextResponse.json({ results: calls.map((c) => ({ toolCallId: c.id, result: "Nicht erlaubt." })) });
    }
    const lage = await holeLage();
    const results = [];
    for (const c of calls) {
      const name = c.function?.name ?? c.name ?? "";
      const brief = briefAus(name, argumente(c), lage?.stand ?? "");
      if (!brief) {
        results.push({ toolCallId: c.id, result: "Das hat nicht geklappt: Angaben unvollständig. Frag David noch einmal." });
        continue;
      }
      const ok = await posteBrief({ ...brief, zeit: new Date().toISOString(), ...(msg?.call?.id ? { anruf: msg.call.id } : {}) });
      if (brief.typ === "zeigen") after(() => setzeGespraech(true).then(() => undefined));
      results.push({ toolCallId: c.id, result: ok ? ANTWORT[brief.typ] : "Der Briefkasten ist gerade nicht erreichbar. Sag David, er soll es in der Zentrale eintragen." });
    }
    return NextResponse.json({ results });
  }

  if (typ === "end-of-call-report") {
    if (istLucaGespraech(msg?.call)) {
      after(() => setzeGespraech(false).then(() => undefined));
      const grund = msg?.call?.assistantOverrides?.metadata?.grund;
      await posteGespraech({
        minuten: Math.max(1, Math.round((msg?.durationSeconds ?? 0) / 60)),
        grund: typeof grund === "string" ? grund : undefined,
        zusammenfassung: msg?.analysis?.summary ?? msg?.summary,
        mitschrift: msg?.artifact?.transcript ?? msg?.transcript,
      }).catch((err) => console.error("[luca] Mitschrift:", err));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignoriert: typ ?? "unbekannt" });
}

async function vonDerZentrale(req: Request, aktion: string | null) {
  try {
    if (req.method === "GET" && aktion === "briefkasten") return NextResponse.json(await briefkasten());
    if (req.method === "GET" && aktion === "gespraeche") return NextResponse.json({ gespraeche: await letzteGespraeche() });
    if (req.method === "GET" && aktion === "status") {
      const lage = await holeLage();
      // Rufgruppe ohne Nummern: nur Anzahl, Namen und die letzten 3 Ziffern, damit man sieht, dass David draußen ist
      const { nummern } = await import("@/lib/rufgruppe");
      const { teamEintraege } = await import("@/lib/luca-logik");
      const roh = `${process.env.RUFGRUPPE_NUMMERN ?? ""},${process.env.RUFGRUPPE_NUMMERN_2 ?? ""}`;
      const ohne = [process.env.LUCA_NUMMER, process.env.DAVID_NUMMERN];
      const ende = (n: string) => `…${n.replace(/\D/g, "").slice(-3)}`;
      return NextResponse.json({
        an: lucaAn(),
        kanal: Boolean(await lucaKanal()),
        lageStand: lage?.stand ?? null,
        assistent: await lucaEinstellungen(),
        rufgruppe: { klingeln: nummern().length, team: teamEintraege(roh, ohne).map((e) => `${e.name ?? "?"} ${ende(e.roh)}`), david: ohne.flatMap((x) => (x ?? "").split(",")).filter((x) => x.trim()).map(ende) },
      });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (aktion === "abgeholt") {
      const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
      return NextResponse.json({ markiert: await markiereAbgeholt(ids) });
    }
    if (aktion === "lagebericht") {
      const text = typeof body.text === "string" ? body.text.slice(0, 1700) : "";
      const stand = typeof body.stand === "string" && !Number.isNaN(Date.parse(body.stand)) ? body.stand : new Date().toISOString();
      const stimme = typeof body.stimme === "string" && /^[A-Za-z0-9]{10,40}$/.test(body.stimme) ? body.stimme : undefined;
      if (!text) return NextResponse.json({ error: "text fehlt" }, { status: 400 });
      return NextResponse.json({ ok: await setzeLage({ stand, text, ...(stimme ? { stimme } : {}) }) });
    }
    if (aktion === "anrufen") {
      const grund = typeof body.grund === "string" ? body.grund.trim().slice(0, 300) : "";
      if (!grund) return NextResponse.json({ error: "grund fehlt" }, { status: 400 });
      const info = typeof body.info === "string" ? body.info.trim().slice(0, 3500) : undefined;
      const r = await rufeDavidAn(grund, body.test === true, info || undefined);
      return NextResponse.json(r, { status: r.ok ? 200 : 409 });
    }
    if (aktion === "einrichten") return NextResponse.json(await einrichten());
    if (aktion === "notiz") return NextResponse.json({ ok: await setzeNotiz(typeof body.text === "string" ? body.text : "") });
  } catch (err) {
    console.error(`[luca] ${aktion}:`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message.slice(0, 500) : "Fehler" }, { status: 502 });
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

async function handle(req: Request) {
  const aktion = new URL(req.url).searchParams.get("a");
  const vapiSecret = req.headers.get("x-vapi-secret");
  if (vapiSecret !== null) {
    if (!gleich(vapiSecret, lucaSchluessel())) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as { message?: VapiNachricht };
    return vonVapi(req, body);
  }
  if (!vonZentrale(req)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  return vonDerZentrale(req, aktion);
}

export const GET = handle;
export const POST = handle;
