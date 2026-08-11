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
    analysis?: { summary?: string; structuredData?: Record<string, unknown> };
    artifact?: { transcript?: string };
  };
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
  const summary = msg?.analysis?.summary || msg?.summary || "";
  const transcript = (msg?.artifact?.transcript || msg?.transcript || "").slice(
    0,
    MAX_TRANSCRIPT_CHARS,
  );
  const duration = formatDuration(msg?.durationSeconds);
  const endedReason = msg?.endedReason || "";
  const structured = msg?.analysis?.structuredData;

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

  const structuredRows =
    structured && typeof structured === "object"
      ? Object.entries(structured)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => row(k, String(v)))
          .join("")
      : "";

  await sendMail({
    to,
    subject: `Anruf von ${number}${summary ? ` — ${summary.slice(0, 60)}` : ""}`,
    html: shell(
      "Neuer Anruf beim Voice-Agent",
      `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        ${row("Anrufer", number)}
        ${row("Zeitpunkt", zeit)}
        ${row("Dauer", duration)}
        ${endedReason ? row("Ende", endedReason) : ""}
        ${structuredRows}
      </table>
      ${
        summary
          ? `<p style="margin:20px 0 6px;font-weight:600;">Zusammenfassung:</p>
             <p style="background:#faf9f6;padding:14px 16px;border-radius:10px;white-space:pre-wrap;margin:0;">${escapeHtml(summary)}</p>`
          : `<p style="margin:20px 0 0;color:#8a8579;">Keine Zusammenfassung vorhanden.</p>`
      }
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
