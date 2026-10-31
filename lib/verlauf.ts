import { sauber } from "@/lib/leads";

// Gesprächsverlauf eines Anrufs: kommt beim Knopfdruck live von Vapi (über die Anruf-ID auf der Karte),
// es wird nichts zusätzlich gespeichert.

interface VapiNachricht {
  role?: string;
  message?: string;
  content?: string;
  time?: number;
  secondsFromStart?: number;
}

interface VapiAnruf {
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  transcript?: string;
  summary?: string;
  messages?: VapiNachricht[];
  artifact?: { transcript?: string; messages?: VapiNachricht[] };
  analysis?: { summary?: string };
}

export const vapiKonfiguriert = () => Boolean(process.env.VAPI_API_KEY?.trim());

const sprecher = (role: string | undefined): string | null => {
  if (role === "user") return "👤 Anrufer";
  if (role === "bot" || role === "assistant") return "🤖 KI";
  return null; // system, Werkzeugaufrufe und deren Ergebnisse gehören nicht ins Gespräch
};

const zeitMarke = (sek: number | undefined) =>
  typeof sek === "number" ? `${String(Math.floor(sek / 60)).padStart(2, "0")}:${String(Math.floor(sek % 60)).padStart(2, "0")} ` : "";

/** Holt einen Anruf von Vapi und macht daraus lesbare Zeilen. */
export async function holeVerlauf(id: string): Promise<{ ok: true; kopf: string; zeilen: string[] } | { ok: false; fehler: string }> {
  const key = process.env.VAPI_API_KEY?.trim();
  if (!key) return { ok: false, fehler: "Der Zugang zu Vapi fehlt (VAPI_API_KEY bei Vercel)." };
  try {
    const res = await fetch(`https://api.vapi.ai/call/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { ok: false, fehler: "Vapi kennt dieses Gespräch nicht mehr." };
    if (!res.ok) return { ok: false, fehler: `Vapi hat nicht geantwortet (HTTP ${res.status}).` };
    const call = (await res.json()) as VapiAnruf;

    const nachrichten = call.artifact?.messages ?? call.messages ?? [];
    let zeilen = nachrichten
      .map((m) => {
        const wer = sprecher(m.role);
        const text = (m.message ?? m.content ?? "").trim();
        return wer && text ? `${zeitMarke(m.secondsFromStart)}**${wer}:** ${sauber(text)}` : null;
      })
      .filter((z): z is string => Boolean(z));
    if (!zeilen.length) {
      // Fallback: das fertige Transkript als Text ("AI: ...", "User: ...")
      const t = (call.artifact?.transcript ?? call.transcript ?? "").trim();
      zeilen = t
        .split("\n")
        .map((z) => z.trim())
        .filter(Boolean)
        .map((z) => sauber(z.replace(/^(AI|Assistant|Bot):/i, "**🤖 KI:**").replace(/^(User|Customer):/i, "**👤 Anrufer:**")));
    }

    const start = call.startedAt
      ? new Date(call.startedAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" })
      : "";
    const dauer =
      call.startedAt && call.endedAt
        ? Math.max(0, Math.round((Date.parse(call.endedAt) - Date.parse(call.startedAt)) / 1000))
        : null;
    const kopf = `**📞 Gespräch${start ? ` vom ${start}` : ""}${dauer !== null ? ` · ${Math.floor(dauer / 60)}:${String(dauer % 60).padStart(2, "0")} min` : ""}**`;
    return { ok: true, kopf, zeilen };
  } catch (err) {
    console.error("[verlauf] Vapi nicht erreichbar:", err);
    return { ok: false, fehler: "Vapi war nicht erreichbar. Bitte gleich nochmal versuchen." };
  }
}

/** Teilt Zeilen in Nachrichten von höchstens 1900 Zeichen (Discord erlaubt 2000). */
export function inStuecke(zeilen: string[], max = 1900): string[] {
  const out: string[] = [];
  let aktuell = "";
  for (const z of zeilen) {
    const zeile = z.length > max ? `${z.slice(0, max - 1)}…` : z;
    if (aktuell && aktuell.length + zeile.length + 1 > max) {
      out.push(aktuell);
      aktuell = zeile;
    } else {
      aktuell = aktuell ? `${aktuell}\n${zeile}` : zeile;
    }
  }
  if (aktuell) out.push(aktuell);
  return out;
}
