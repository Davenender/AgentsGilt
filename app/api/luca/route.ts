import { after, NextResponse } from "next/server";
import { briefAus, gespraechBrief } from "@/lib/luca-logik";
import { kostenStand } from "@/lib/kosten";
import { lucaLive } from "@/lib/luca-live";
import { ortsname } from "@/lib/luca-unterwegs";
import { lesePrompts, setzePrompts } from "@/lib/luca";
import { owntracksKonfig, owntracksLink, standortText } from "@/lib/standort-logik";
import {
  assistentFuerEingang,
  einrichten,
  aktualisiereWerkzeuge,
  sagImGespraech,
  anrufStand,
  holeStandortSpeicher,
  LUCA_ADRESSE,
  lucaEinstellungen,
  schreibeStandortSpeicher,
  setzeOrte,
  standortPasswort,
  STANDORT_BENUTZER,
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
import { ladeTeam } from "@/lib/team-daten";

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
  call?: { id?: string; type?: string; startedAt?: string; assistantId?: string | null; assistantOverrides?: { metadata?: Record<string, unknown> } };
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
  nachschauen: "Ist beim Team, noch kein Ergebnis. Es kommt im Gespräch nach, meist unter einer Minute. Sag David kurz, dass nachgeschaut wird, und rede normal weiter. Behaupte nichts, bis es da ist.",
  schule: "Das Schulportal wird gerade abgefragt, noch kein Ergebnis. Es kommt gleich im Gespräch nach.",
  erinnerung: "Die Erinnerung ist eingeplant: Luca ruft David an. Sag ihm kurz, wann. Zwischen 2 und 6 Uhr nachts und im Unterricht ruft er nicht an, dann danach.",
  ruhe: "Ist bei der Zentrale. Sie sagt dir gleich im Gespräch, was gilt (oder ob sie den Ort nicht gefunden hat). Bis dahin sag David kurz, dass du es notierst.",
  lerncheck: "Ist gemerkt.",
  notiz: "Ist notiert, liegt in der Zentrale im Eingang.",
  erledigt: "Ist durch: Dazu ruft Luca nicht mehr an. Hat David eine neue Zeit genannt, kommt genau ein Anruf zu dieser Zeit. Sag es ihm in einem Satz.",
  erinnerung_weg: "Ist an die Zentrale raus. Kam die Nummer nicht hin, sagt sie es dir gleich im Gespräch.",
  nachricht: "Ist unterwegs auf Davids Handy (iMessage). Sag es ihm in einem Satz.",
  erinnerung_aendern: "Ist an die Zentrale raus. Sie sagt dir gleich, ob die Nummer gepasst hat. Sag David kurz, was jetzt gilt.",
  wunsch: "Steht auf der Wunschliste, der Bauer schreibt David den fertigen Prompt dazu. Sag David ehrlich und kurz: Kann ich noch nicht, steht auf der Wunschliste.",
};

const WERKZEUG_FRIST_MS = 15_000;
const ZU_LANGE = "Das dauert gerade zu lange, ich habe noch kein Ergebnis. Sag David das kurz und ehrlich.";
const FEHLER = "Das hat gerade nicht geklappt. Sag David das kurz und ehrlich.";
const ERLEDIGT = new Map<string, string>();

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
    // Den Stand nur holen, wenn ein Brief ihn braucht: Discord bremst sonst bei vielen Werkzeug-Aufrufen
    let lage: ReturnType<typeof holeLage> | undefined;
    const einer = async (c: ToolCall): Promise<string> => {
      const name = c.function?.name ?? c.name ?? "";
      // Stand, Standort, Route, Bus, Wetter, Änderungen: sofort, ohne Umweg über den Mac
      const live = await lucaLive(name, argumente(c)).catch((err) => {
        console.error(`[luca] ${name}:`, err);
        return FEHLER;
      });
      if (live !== null) return live;
      lage ??= holeLage();
      const brief = briefAus(name, argumente(c), (await lage)?.stand ?? "");
      if (!brief) return "Das hat nicht geklappt: Angaben unvollständig. Frag David noch einmal.";
      const ok = await posteBrief({ ...brief, zeit: new Date().toISOString(), ...(msg?.call?.id ? { anruf: msg.call.id } : {}) });
      if (brief.typ === "zeigen") after(() => setzeGespraech(true).then(() => undefined));
      return ok ? ANTWORT[brief.typ] : "Der Briefkasten ist gerade nicht erreichbar. Sag David, er soll es in der Zentrale eintragen.";
    };
    // Gleichzeitig und mit Frist: Ein langsames Werkzeug hält die anderen nicht auf, und Vapi bekommt immer eine Antwort
    const results = await Promise.all(
      calls.map(async (c) => {
        const id = c.id ?? "";
        const schon = id ? ERLEDIGT.get(id) : undefined;
        if (schon !== undefined) return { toolCallId: c.id, result: schon };
        let uhr: ReturnType<typeof setTimeout> | undefined;
        const arbeit = einer(c).catch(() => FEHLER);
        const result = await Promise.race([arbeit, new Promise<string>((fertig) => (uhr = setTimeout(() => fertig(ZU_LANGE), WERKZEUG_FRIST_MS)))]);
        clearTimeout(uhr);
        // Schickt Vapi denselben Aufruf noch einmal, darf nichts doppelt passieren (kein zweiter Termin, kein zweiter Auftrag).
        // Ein Fehler zählt nicht: Da darf es Luca noch einmal versuchen. Läuft die Arbeit noch, wird sie zu Ende geführt und dann gemerkt.
        if (id) {
          if (result === ZU_LANGE) {
            ERLEDIGT.set(id, result);
            after(() => arbeit.then((r) => (r === FEHLER ? ERLEDIGT.delete(id) : ERLEDIGT.set(id, r))).then(() => undefined));
          } else if (result !== FEHLER) ERLEDIGT.set(id, result);
          if (ERLEDIGT.size > 300) ERLEDIGT.delete(ERLEDIGT.keys().next().value as string);
        }
        return { toolCallId: c.id, result };
      }),
    );
    return NextResponse.json({ results });
  }

  if (typ === "end-of-call-report") {
    if (istLucaGespraech(msg?.call)) {
      after(() => setzeGespraech(false).then(() => undefined));
      const grund = msg?.call?.assistantOverrides?.metadata?.grund;
      // 13.11.: Die Zentrale erfährt, dass David mit Luca gesprochen hat (oder nur die Mailbox dran war): kein zweiter Anruf wegen derselben Sache
      await posteBrief(gespraechBrief(msg ?? {}, new Date().toISOString())).catch((err) => console.error("[luca] Gesprächs-Brief:", err));
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
    if (req.method === "GET" && aktion === "kosten") return NextResponse.json(await kostenStand());
    if (req.method === "GET" && aktion === "anruf-stand") {
      const s = await anrufStand(new URL(req.url).searchParams.get("id") ?? "");
      return s ? NextResponse.json(s) : NextResponse.json({ error: "Unbekannter Anruf" }, { status: 404 });
    }
    if (req.method === "GET" && aktion === "standort") {
      const s = await holeStandortSpeicher();
      return NextResponse.json({ standort: s.standort, text: standortText(s.standort, new Date()), orte: s.orte, drin: s.drin, ereignisse: s.ereignisse });
    }
    if (req.method === "GET" && aktion === "standort-zugang") {
      const passwort = standortPasswort();
      if (!passwort) return NextResponse.json({ error: "HELFER_SECRET fehlt" }, { status: 503 });
      const s = await holeStandortSpeicher();
      const url = `${new URL(LUCA_ADRESSE).origin}/api/standort`;
      return NextResponse.json({ link: owntracksLink(owntracksKonfig({ url, benutzer: STANDORT_BENUTZER, passwort, orte: s.orte })), orte: s.orte.map((o) => o.name) });
    }
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
      // Klappt es nicht, muss die Zentrale das erfahren: Sonst glaubt sie, Luca kenne den neuen Stand samt den Nummern
      const ok = await setzeLage({ stand, text, ...(stimme ? { stimme } : {}) });
      return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
    }
    if (aktion === "anrufen") {
      const grund = typeof body.grund === "string" ? body.grund.trim().slice(0, 1200) : "";
      if (!grund) return NextResponse.json({ error: "grund fehlt" }, { status: 400 });
      const info = typeof body.info === "string" ? body.info.trim().slice(0, 3500) : undefined;
      const mailbox = typeof body.mailbox === "string" ? body.mailbox.replace(/\s+/g, " ").trim().slice(0, 400) : "";
      const r = await rufeDavidAn(grund, body.test === true, info || undefined, mailbox || undefined);
      return NextResponse.json(r, { status: r.ok ? 200 : 409 });
    }
    if (aktion === "einrichten") return NextResponse.json(await einrichten());
    if (aktion === "werkzeuge") return NextResponse.json({ assistent: await aktualisiereWerkzeuge() });
    if (aktion === "mitteilung") {
      const anruf = typeof body.anruf === "string" ? body.anruf : "";
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
      if (!anruf || !text) return NextResponse.json({ error: "anruf oder text fehlt" }, { status: 400 });
      return NextResponse.json(await sagImGespraech(anruf, text));
    }
    if (aktion === "prompt" && req.method === "GET") return NextResponse.json(await lesePrompts());
    if (aktion === "prompt") {
      if (typeof body.speaker !== "string" || typeof body.reasoner !== "string") return NextResponse.json({ error: "speaker und reasoner fehlen" }, { status: 400 });
      return NextResponse.json(await setzePrompts(body.speaker.slice(0, 20_000), body.reasoner.slice(0, 20_000)));
    }
    if (aktion === "standort-orte") {
      const orte = (Array.isArray(body.orte) ? body.orte : [])
        .map((o) => o as { name?: unknown; lat?: unknown; lon?: unknown; rad?: unknown; auch?: unknown })
        .filter((o) => typeof o.name === "string" && o.name.trim() && Number.isFinite(o.lat) && Number.isFinite(o.lon))
        .slice(0, 20)
        .map((o) => ({ name: String(o.name).trim().slice(0, 60), lat: Number(o.lat), lon: Number(o.lon), rad: Math.min(1000, Math.max(50, Number(o.rad) || 150)), ...(Array.isArray(o.auch) && o.auch.length ? { auch: o.auch.filter((a): a is string => typeof a === "string").slice(0, 6).map((a) => a.slice(0, 40)) } : {}) }));
      const ok = await setzeOrte(orte);
      return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
    }
    if (aktion === "standort-name") {
      const s = await holeStandortSpeicher();
      if (!s.standort) return NextResponse.json({ ok: false });
      const ort = await ortsname(s.standort.lat, s.standort.lon);
      return NextResponse.json({ ok: Boolean(ort && (await schreibeStandortSpeicher({ ...s, standort: { ...s.standort, ort } }))), ort });
    }
    if (aktion === "standort-loeschen") {
      const s = await holeStandortSpeicher();
      return NextResponse.json({ ok: await schreibeStandortSpeicher({ ...s, standort: null, ereignisse: [], drin: [] }) });
    }
    if (aktion === "notiz") return NextResponse.json({ ok: await setzeNotiz(typeof body.text === "string" ? body.text : "") });
  } catch (err) {
    console.error(`[luca] ${aktion}:`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message.slice(0, 500) : "Fehler" }, { status: 502 });
  }
  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

async function handle(req: Request) {
  await ladeTeam(process.env.DISCORD_BOT_TOKEN);
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
