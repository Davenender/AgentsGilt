import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { escapeHtml, getMailEnv, sendMail, shell } from "@/lib/mail";

export const runtime = "nodejs";

// Vapi schickt hierher nach jedem Anruf einen Bericht. Wir mailen ihn an uns,
// damit kein Anruf verloren geht — auch die ohne Termin (Rückrufwunsch, Frage,
// Fehlversuch). Ohne diese Route sieht David nur, was im Kalender landet.
//
// In Vapi eintragen unter Assistant -> Advanced -> Server URL:
//   https://agentsgilt.com/api/vapi
// und als Secret den Wert aus VAPI_SECRET (wird als x-vapi-secret geschickt).

const MAX_TRANSCRIPT_CHARS = 6000;

interface VapiPayload {
  message?: {
    type?: string;
    endedReason?: string;
    summary?: string;
    transcript?: string;
    durationSeconds?: number;
    startedAt?: string;
    customer?: { number?: string };
    call?: { id?: string; type?: string; customer?: { number?: string } };
    analysis?: {
      summary?: string;
      structuredData?: Record<string, unknown>;
      structuredOutputs?: Record<string, unknown>;
    };
    // Neuere Vapi-Fassungen legen die extrahierten Felder auch außerhalb von
    // "analysis" ab. Welcher Ort benutzt wird, hängt von der Dashboard-Version
    // ab — wir schauen deshalb an allen bekannten Stellen nach.
    structuredOutputs?: Record<string, unknown>;
    structuredData?: Record<string, unknown>;
    artifact?: { transcript?: string };
  };
}

/**
 * Zieht die extrahierten Felder aus dem Bericht. Vapi hat den Ort im Laufe der
 * Zeit mehrfach verschoben, deshalb der Reihe nach durchprobieren.
 *
 * Die Werte können bei "structuredOutputs" als {name, value}-Objekte kommen
 * statt als flache Werte — beides wird zu "Name: Wert" vereinheitlicht.
 */
function collectFields(msg: VapiPayload["message"]): Record<string, string> {
  const sources = [
    msg?.analysis?.structuredData,
    msg?.analysis?.structuredOutputs,
    msg?.structuredOutputs,
    msg?.structuredData,
  ];

  const out: Record<string, string> = {};
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [key, raw] of Object.entries(source)) {
      if (raw === null || raw === undefined || raw === "") continue;

      let label = key;
      let value: unknown = raw;

      // Vapi verpackt jedes Feld als {name, result} und benutzt eine UUID als
      // Schlüssel — die UUID taugt nicht als Überschrift, der Name schon.
      // Ältere Fassungen benutzen "value" statt "result", beides abfangen.
      if (typeof raw === "object" && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        if ("result" in obj) value = obj.result;
        else if ("value" in obj) value = obj.value;
        if (typeof obj.name === "string" && obj.name.trim()) label = obj.name;
      }
      if (value === null || value === undefined || value === "") continue;

      const text =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      if (text.trim() && !out[label]) out[label] = text.trim();
    }
  }
  return out;
}

/**
 * Erzeugt die Zusammenfassung selbst aus dem Transkript.
 *
 * Vapi bietet dafür zwar "Structured Outputs" an, schickt sie aber nicht im
 * End-of-Call-Bericht mit (nachgewiesen: "0 extrahierte Felder", obwohl im
 * Dashboard vorhanden). Statt auf einen Fix zu warten, fassen wir selbst
 * zusammen — das Transkript liegt uns ja vor.
 *
 * Scheitert der Aufruf, geht die Mail trotzdem raus, nur eben ohne
 * Zusammenfassung. Ein Anruf darf niemals wegen der Kür verloren gehen.
 */
async function summarize(
  transcript: string,
): Promise<{ summary: string; fields: Record<string, string> }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !transcript.trim()) return { summary: "", fields: {} };

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: `Du wertest Telefonate aus, die ein KI-Assistent für die Agentur "Agents Gilt" entgegengenommen hat.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown und ohne Erklärung:
{"anrufer":"","betrieb":"","rueckrufnummer":"","terminwunsch":"","zusammenfassung":""}

- anrufer: Vor- und Nachname, falls genannt
- betrieb: Art und Name des Betriebs, falls genannt
- rueckrufnummer: genannte Rückrufnummer, nur Ziffern und Leerzeichen
- terminwunsch: vereinbarter oder gewünschter Termin mit Datum und Uhrzeit
- zusammenfassung: zwei bis drei Sätze auf Deutsch, sachlich als Notiz für einen Kollegen

Felder, zu denen im Gespräch nichts gesagt wurde, bleiben leer. Erfinde nichts.
Beachte: Die Spracherkennung schreibt den Firmennamen oft falsch ("Agent Skilled", "AgentsGate") — das ist immer "Agents Gilt" und kein Hinweis auf den Anrufer.`,
      messages: [{ role: "user", content: transcript.slice(0, 12000) }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Das Modell antwortet gelegentlich mit Code-Zaun drumherum.
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    const pick = (key: string) => {
      const v = parsed[key];
      return typeof v === "string" ? v.trim() : "";
    };

    const fields: Record<string, string> = {};
    const map: Array<[string, string]> = [
      ["Anrufer", "anrufer"],
      ["Betrieb", "betrieb"],
      ["Rückrufnummer", "rueckrufnummer"],
      ["Terminwunsch", "terminwunsch"],
    ];
    for (const [label, key] of map) {
      const value = pick(key);
      if (value) fields[label] = value;
    }

    return { summary: pick("zusammenfassung"), fields };
  } catch (err) {
    console.error("[vapi] Zusammenfassung fehlgeschlagen:", err);
    return { summary: "", fields: {} };
  }
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:8px 0;color:#8a8579;width:150px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(value)}</td></tr>`;
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 0) return "unbekannt";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} Min ${s} Sek` : `${s} Sek`;
}

export async function POST(request: Request) {
  // Der Endpunkt ist öffentlich erreichbar. Ohne diese Prüfung könnte jeder
  // Mails auslösen. Solange kein Secret gesetzt ist, laufen wir offen weiter,
  // damit ein vergessenes Env-Var nicht stillschweigend alle Anrufe verschluckt.
  //
  // Vapi schickt das Secret je nach eingestellter Credential-Art anders: mal als
  // eigener Header, mal als Bearer-Token. Wir akzeptieren beide Wege, damit die
  // Einstellung in Vapi frei wählbar bleibt.
  const expected = process.env.VAPI_SECRET;
  if (expected) {
    const headerSecret = request.headers.get("x-vapi-secret");
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (headerSecret !== expected && bearer !== expected) {
      console.warn("[vapi] Aufruf mit falschem oder fehlendem Secret abgewiesen");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: VapiPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const msg = payload?.message;
  const type = msg?.type;

  // Vapi schickt viele Ereignisse (status-update, speech-update, ...). Uns
  // interessiert nur der Abschlussbericht. Alles andere mit 200 quittieren,
  // sonst versucht Vapi es immer wieder neu.
  if (type !== "end-of-call-report") {
    return NextResponse.json({ ok: true, ignored: type ?? "unbekannt" });
  }

  const number =
    msg?.customer?.number || msg?.call?.customer?.number || "unbekannt";
  const summaryFromVapi = msg?.analysis?.summary || msg?.summary || "";
  const transcript = (msg?.artifact?.transcript || msg?.transcript || "").slice(
    0,
    MAX_TRANSCRIPT_CHARS,
  );
  const duration = formatDuration(msg?.durationSeconds);
  const endedReason = msg?.endedReason || "";
  const fields = collectFields(msg);

  // Vapi liefert die Felder derzeit nicht mit — dann selbst zusammenfassen.
  let summary = summaryFromVapi;
  if (Object.keys(fields).length === 0 || !summary) {
    const eigen = await summarize(transcript);
    if (!summary) summary = eigen.summary;
    for (const [k, v] of Object.entries(eigen.fields)) {
      if (!fields[k]) fields[k] = v;
    }
  }

  // Damit bei einer Änderung auf Vapi-Seite nachvollziehbar bleibt, was
  // tatsächlich ankommt — sichtbar in den Vercel-Logs, nicht in der Mail.
  console.log(
    `[vapi] Bericht von ${number}: ${Object.keys(fields).length} extrahierte Felder (${Object.keys(fields).join(", ") || "keine"})`,
  );

  const zeit = msg?.startedAt
    ? new Date(msg.startedAt).toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      })
    : new Date().toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Berlin",
      });

  const { to } = getMailEnv();

  // Vapi liefert die extrahierten Felder als freies Objekt. Kurze Werte passen
  // in die Tabelle oben (Name, Termin, Rückrufnummer), längere sind meist ganze
  // Sätze — die kommen als eigener Absatz, sonst quetscht sich Fließtext in
  // eine Tabellenzelle.
  const structuredEntries = Object.entries(fields);

  const structuredRows = structuredEntries
    .filter(([, v]) => String(v).length <= 120)
    .map(([k, v]) => row(k, String(v)))
    .join("");

  const structuredBlocks = structuredEntries
    .filter(([, v]) => String(v).length > 120)
    .map(
      ([k, v]) =>
        `<p style="margin:20px 0 6px;font-weight:600;">${escapeHtml(k)}:</p>
         <p style="background:#faf9f6;padding:14px 16px;border-radius:10px;white-space:pre-wrap;margin:0;">${escapeHtml(String(v))}</p>`,
    )
    .join("");

  await sendMail({
    to,
    subject: `Anruf von ${number}${summary ? ` — ${summary.slice(0, 60)}` : ""}`,
    html: shell(
      "Neuer Anruf beim Voice-Agent",
      `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        ${row("Rufnummer", number)}
        ${row("Zeitpunkt", zeit)}
        ${row("Dauer", duration)}
        ${endedReason ? row("Ende", endedReason) : ""}
        ${structuredRows}
      </table>
      ${
        summary
          ? `<p style="margin:20px 0 6px;font-weight:600;">Zusammenfassung:</p>
             <p style="background:#faf9f6;padding:14px 16px;border-radius:10px;white-space:pre-wrap;margin:0;">${escapeHtml(summary)}</p>`
          : structuredBlocks
            ? ""
            : `<p style="margin:20px 0 0;color:#8a8579;">Keine Zusammenfassung vorhanden.</p>`
      }
      ${structuredBlocks}
      ${
        transcript
          ? `<p style="margin:24px 0 6px;font-weight:600;">Gesprächsverlauf:</p>
             <p style="background:#faf9f6;padding:14px 16px;border-radius:10px;white-space:pre-wrap;margin:0;font-size:13px;line-height:1.6;">${escapeHtml(transcript)}</p>`
          : ""
      }
      ${
        number !== "unbekannt"
          ? `<p style="margin:24px 0 0;"><a href="tel:${escapeHtml(number)}" style="display:inline-block;background:#d4a23c;color:#0c0e14;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;">Zurückrufen</a></p>`
          : ""
      }
      `,
    ),
  });

  return NextResponse.json({ ok: true });
}
