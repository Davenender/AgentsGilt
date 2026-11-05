import { createHmac, timingSafeEqual } from "node:crypto";
import { findChannelId } from "@/lib/discord";
import {
  anrufErlaubt,
  anrufNachricht,
  anrufZeit,
  BRIEF_MARKE,
  briefLesen,
  briefText,
  ERSTER_SATZ_EINGEHEND,
  ERSTER_SATZ_MIT_NOTIZ,
  ersterSatzAusgehend,
  mitNotiz,
  NOTIZ_MARKE,
  notizAus,
  notizTeile,
  GESPRAECH_MARKE,
  gespraechNachrichten,
  LAGE_MARKE,
  lageLesen,
  lageNachricht,
  lageText,
  LUCA_NAME,
  LUCA_PROMPT,
  LUCA_WERKZEUGE,
  type BriefMitZeit,
  type Lage,
} from "@/lib/luca-logik";

// Luca am Telefon – die Teile, die mit Vapi und Discord reden. Logik und Texte: lib/luca-logik.ts.
//
// Einstellungen (Vercel, Production):
//   LUCA_NUMMER            Davids privates Handy. Nur dorthin ruft Luca an.
//   DAVID_NUMMERN          weitere Handys von David (Komma), z. B. das Geschäftshandy – Menü auch von dort
//   LUCA_ASSISTANT         Vapi-Assistent „Luca (Zentrale)“ (legt ?a=einrichten an)
//   LUCA_SIP_URI           Lucas SIP-Adresse bei Vapi (legt ?a=einrichten an)
//   HELFER_SECRET          daraus werden Lucas Vapi-Schlüssel und das SIP-Passwort abgeleitet
//   VAPI_API_KEY, VAPI_SIP_URI, VAPI_NUMBER_ID   wie beim Kunden-Assistenten / Rückruf
// Ohne LUCA_ASSISTANT und LUCA_SIP_URI ist alles aus: David landet wie jeder Kunde beim Kunden-Assistenten.

const DISCORD = "https://discord.com/api/v10";
const VAPI = "https://api.vapi.ai";
const SITE = process.env.SITE_URL || "https://agentsgilt.com";
export const LUCA_ADRESSE = `${SITE}/api/luca`;
const NUMBER_ID = process.env.VAPI_NUMBER_ID || "fce24a66-191e-419b-a138-c1d0703bdf7d";

const abgeleitet = (zweck: string, laenge: number): string | null => {
  const s = process.env.HELFER_SECRET?.trim();
  return s ? createHmac("sha256", s).update(zweck).digest("hex").slice(0, laenge) : null;
};

/** Geheimnis, das Vapi bei jeder Nachricht für Luca als x-vapi-secret mitschickt. */
export const lucaSchluessel = () => abgeleitet("luca-vapi", 40);
/** Benutzer und Passwort für Lucas SIP-Adresse (nur Twilio kennt sie, sonst kommt niemand direkt zu Luca). */
export const sipZugang = () => {
  const p = abgeleitet("luca-sip", 32);
  const b = abgeleitet("luca-sip-benutzer", 10);
  // Vapi verlangt mindestens 20 Zeichen für den Benutzernamen
  return p && b ? { benutzer: `luca-zentrale-${b}`, passwort: p } : null;
};

export const lucaNummer = () => process.env.LUCA_NUMMER?.trim() || null;
/** Alle Handys von David (privat + weitere) – von dort gibt es das Menü, und keins davon klingelt bei Kunden. */
export const davidsNummern = () => [process.env.LUCA_NUMMER, process.env.DAVID_NUMMERN].filter((x): x is string => Boolean(x?.trim()));
export const lucaAssistent = () => process.env.LUCA_ASSISTANT?.trim() || null;
export const lucaSip = () => process.env.LUCA_SIP_URI?.trim() || null;
/** Menü und Anrufe sind nur an, wenn alles eingerichtet ist. */
export const lucaAn = () => Boolean(lucaNummer() && lucaAssistent() && lucaSip() && sipZugang() && lucaSchluessel());

export function gleich(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Aufrufe der Zentrale (Mac): wie die Helfer-Brücke mit HELFER_SECRET. */
export function vonZentrale(req: Request): boolean {
  const gesendet = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return gleich(gesendet, process.env.HELFER_SECRET?.trim());
}

// ------------------------------------------------------------------ Discord #luca

const token = () => process.env.DISCORD_BOT_TOKEN;
const kopf = () => ({ "Content-Type": "application/json", Authorization: `Bot ${token()}` });

type Nachricht = { id: string; content: string; author: { id: string; bot?: boolean }; reactions?: { emoji: { name: string }; me?: boolean }[]; timestamp: string };

export async function lucaKanal(): Promise<string | null> {
  return process.env.DISCORD_CHANNEL_LUCA?.trim() || (await findChannelId(token(), "luca"));
}

async function nachrichten(kanal: string, limit = 100): Promise<Nachricht[]> {
  const res = await fetch(`${DISCORD}/channels/${kanal}/messages?limit=${limit}`, { headers: kopf(), cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}`);
  return (await res.json()) as Nachricht[];
}

async function poste(kanal: string, content: string): Promise<string | null> {
  const res = await fetch(`${DISCORD}/channels/${kanal}/messages`, {
    method: "POST",
    headers: kopf(),
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    console.error(`[luca] Discord-Nachricht fehlgeschlagen: HTTP ${res.status}`);
    return null;
  }
  return ((await res.json()) as { id: string }).id;
}

const istUnsere = (m: Nachricht) => m.author?.bot === true;

/** Schreibt einen Brief in den Briefkasten (Werkzeug-Aufruf am Telefon). */
export async function posteBrief(b: BriefMitZeit): Promise<boolean> {
  const kanal = await lucaKanal();
  return Boolean(kanal && (await poste(kanal, briefText(b))));
}

/** Alle noch nicht abgeholten Briefe (ohne ✅ des Bots), älteste zuerst. */
export async function offeneBriefe(): Promise<{ id: string; brief: BriefMitZeit }[]> {
  const kanal = await lucaKanal();
  if (!kanal) throw new Error("Kanal #luca nicht gefunden");
  return (await nachrichten(kanal))
    .filter((m) => istUnsere(m) && m.content.startsWith(BRIEF_MARKE) && !m.reactions?.some((r) => r.emoji.name === "✅" && r.me))
    .map((m) => ({ id: m.id, brief: briefLesen(m.content) }))
    .filter((x): x is { id: string; brief: BriefMitZeit } => x.brief !== null)
    .reverse();
}

export async function markiereAbgeholt(ids: string[]): Promise<number> {
  const kanal = await lucaKanal();
  if (!kanal) return 0;
  let n = 0;
  for (const id of ids.filter((x) => /^\d{5,25}$/.test(x)).slice(0, 50)) {
    const res = await fetch(`${DISCORD}/channels/${kanal}/messages/${id}/reactions/${encodeURIComponent("✅")}/@me`, {
      method: "PUT",
      headers: kopf(),
      signal: AbortSignal.timeout(6000),
    }).catch(() => null);
    if (res?.ok) n++;
    await new Promise((r) => setTimeout(r, 300)); // Discord: Reaktionen höchstens ~4/s
  }
  return n;
}

async function lageNachrichtFinden(kanal: string): Promise<Nachricht | null> {
  return (await nachrichten(kanal)).find((m) => istUnsere(m) && m.content.startsWith(LAGE_MARKE)) ?? null;
}

/** Die Zentrale schickt jede Minute ihren Lagebericht: eine einzige Bot-Nachricht, die immer wieder geändert wird. */
export async function setzeLage(l: Lage): Promise<boolean> {
  const kanal = await lucaKanal();
  if (!kanal) return false;
  const alt = await lageNachrichtFinden(kanal);
  const content = lageNachricht(l);
  if (content.length > 2000) return false;
  if (alt) {
    const res = await fetch(`${DISCORD}/channels/${kanal}/messages/${alt.id}`, {
      method: "PATCH",
      headers: kopf(),
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  }
  return Boolean(await poste(kanal, content));
}

export async function holeLage(): Promise<Lage | null> {
  try {
    const kanal = await lucaKanal();
    const m = kanal ? await lageNachrichtFinden(kanal) : null;
    return m ? lageLesen(m.content) : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ Vapi

const vapiKopf = () => ({ Authorization: `Bearer ${process.env.VAPI_API_KEY?.trim() ?? ""}`, "Content-Type": "application/json" });

async function vapi<T>(pfad: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${VAPI}${pfad}`, { ...init, headers: vapiKopf(), signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vapi ${init.method ?? "GET"} ${pfad.split("?")[0]}: HTTP ${res.status} ${text.slice(0, 400)}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Was Luca beim Gespräch weiß (Lagebericht), warum er anruft, was er erklären/fragen soll und die Notiz von Claude. */
function variablen(lage: Lage | null, grund: string | null, info?: string, notiz: string | null = null) {
  return {
    lage: lageText(lage, new Date()),
    grund: mitNotiz(grund ? `Du rufst David an. Grund: ${grund}${info ? `\n\nDas sollst du ihm erklären und fragen:\n${info}` : ""}` : "David hat dich angerufen.", notiz),
  };
}

async function notizNachrichten(kanal: string): Promise<Nachricht[]> {
  return (await nachrichten(kanal)).filter((m) => istUnsere(m) && m.content.startsWith(NOTIZ_MARKE));
}

/** Die Notiz für Luca setzen (leer = löschen). Zwei feste Bot-Nachrichten, die geändert werden. */
export async function setzeNotiz(text: string): Promise<boolean> {
  const kanal = await lucaKanal();
  if (!kanal) return false;
  const alt = await notizNachrichten(kanal);
  const teile = notizTeile(text);
  for (let i = 0; i < 2; i++) {
    const vorhanden = alt.find((m) => m.content.startsWith(`${NOTIZ_MARKE} ${i + 1}\n`));
    if (vorhanden) {
      const res = await fetch(`${DISCORD}/channels/${kanal}/messages/${vorhanden.id}`, { method: "PATCH", headers: kopf(), body: JSON.stringify({ content: teile[i], allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(6000) });
      if (!res.ok) return false;
    } else if (!(await poste(kanal, teile[i]))) return false;
  }
  return true;
}

export async function holeNotiz(): Promise<string | null> {
  try {
    const kanal = await lucaKanal();
    return kanal ? notizAus((await notizNachrichten(kanal)).map((m) => m.content)) : null;
  } catch {
    return null;
  }
}

function stimmeAus(lage: Lage | null): { provider: string; voiceId: string; model?: string } | undefined {
  // turbo v2.5: deutlich schneller als multilingual v2 – am Telefon zählt jede Zehntelsekunde
  return lage?.stimme && /^[A-Za-z0-9]{10,40}$/.test(lage.stimme) ? { provider: "11labs", voiceId: lage.stimme, model: "eleven_turbo_v2_5" } : undefined;
}

/** Antwort auf assistant-request (David ruft an und hat die 1 gedrückt). */
export async function assistentFuerEingang() {
  const [lage, notiz] = await Promise.all([holeLage(), holeNotiz()]);
  const stimme = stimmeAus(lage);
  return {
    assistantId: lucaAssistent(),
    assistantOverrides: {
      firstMessage: notiz ? ERSTER_SATZ_MIT_NOTIZ : ERSTER_SATZ_EINGEHEND,
      variableValues: variablen(lage, null, undefined, notiz),
      ...(stimme ? { voice: stimme } : {}),
    },
  };
}

async function anrufeBisher(kanal: string): Promise<string[]> {
  return (await nachrichten(kanal)).filter(istUnsere).map((m) => anrufZeit(m.content)).filter((z): z is string => z !== null);
}

/** Luca ruft David an – nur Davids Nummer, nie 22–7 Uhr, höchstens 3-mal am Tag. */
export async function rufeDavidAn(grund: string, test: boolean, info?: string, gewuenscht = false): Promise<{ ok: true } | { ok: false; grund: string }> {
  if (!lucaAn()) return { ok: false, grund: "Luca am Telefon ist noch nicht eingerichtet." };
  if (!process.env.VAPI_API_KEY?.trim()) return { ok: false, grund: "VAPI_API_KEY fehlt." };
  const kanal = await lucaKanal();
  if (!kanal) return { ok: false, grund: "Kanal #luca nicht gefunden." };
  const jetzt = new Date();
  const darf = anrufErlaubt(jetzt, await anrufeBisher(kanal), test || gewuenscht);
  if (!darf.ok) return darf;
  const [lage, notiz] = await Promise.all([holeLage(), holeNotiz()]);
  const stimme = stimmeAus(lage);
  try {
    await vapi("/call", {
      method: "POST",
      body: JSON.stringify({
        assistantId: lucaAssistent(),
        phoneNumberId: NUMBER_ID,
        customer: { number: lucaNummer() },
        assistantOverrides: {
          firstMessage: ersterSatzAusgehend(grund),
          variableValues: variablen(lage, grund, info, notiz),
          metadata: { luca: true, test, grund: grund.slice(0, 200) },
          ...(stimme ? { voice: stimme } : {}),
        },
      }),
    });
  } catch (err) {
    console.error("[luca] Anruf fehlgeschlagen:", err);
    return { ok: false, grund: "Vapi hat den Anruf abgelehnt." };
  }
  await poste(kanal, anrufNachricht(jetzt.toISOString(), grund, test));
  return { ok: true };
}

type VapiAssistent = { id: string; name?: string; model?: Record<string, unknown>; voice?: Record<string, unknown>; transcriber?: Record<string, unknown> };
type VapiNummer = { id: string; name?: string; provider?: string; sipUri?: string; assistantId?: string | null };

/**
 * Legt Lucas Assistenten und seine SIP-Adresse bei Vapi an (oder bringt sie auf Stand). Modell, Spracherkennung und
 * Stimmen-Anbieter übernehmen wir vom Kunden-Assistenten, der läuft schon gut auf Deutsch. Der Kunden-Assistent selbst
 * wird nur gelesen, nie geändert.
 */
export async function einrichten(): Promise<Record<string, unknown>> {
  const schluessel = lucaSchluessel();
  const zugang = sipZugang();
  if (!schluessel || !zugang) throw new Error("HELFER_SECRET fehlt");
  const nummern = await vapi<VapiNummer[]>("/phone-number?limit=100");
  const kundenSip = process.env.VAPI_SIP_URI?.trim();
  const kundenNummer = nummern.find((n) => kundenSip && n.sipUri === kundenSip);
  if (!kundenNummer?.assistantId) throw new Error("Kunden-Assistent zur VAPI_SIP_URI nicht gefunden");
  const vorlage = await vapi<VapiAssistent>(`/assistant/${kundenNummer.assistantId}`);

  const modell = vorlage.model ?? {};
  const assistent = {
    name: LUCA_NAME,
    firstMessage: ERSTER_SATZ_EINGEHEND,
    firstMessageMode: "assistant-speaks-first",
    model: {
      provider: modell.provider,
      model: modell.model,
      ...(typeof modell.temperature === "number" ? { temperature: modell.temperature } : {}),
      messages: [{ role: "system", content: LUCA_PROMPT }],
      tools: LUCA_WERKZEUGE,
    },
    voice: { provider: "11labs", voiceId: "onwK4e9ZLuTAKqWW03F9", model: "eleven_turbo_v2_5" },
    ...(vorlage.transcriber ? { transcriber: vorlage.transcriber } : {}),
    maxDurationSeconds: 900,
    // David ist oft unterwegs: länger auf ihn warten und Straßenlärm herausfiltern
    silenceTimeoutSeconds: 90,
    backgroundDenoisingEnabled: true,
    analysisPlan: {
      summaryPlan: {
        messages: [
          {
            role: "system",
            content:
              "Fasse das Telefonat zwischen Luca und David auf Deutsch in 3 bis 6 kurzen Sätzen zusammen. Wichtig: jede Entscheidung, Antwort und jeder Auftrag von David, möglichst in seinen Worten. Keine Einleitung.",
          },
          { role: "user", content: "Mitschrift:\n{{transcript}}" },
        ],
      },
    },
    endCallFunctionEnabled: true,
    serverMessages: ["tool-calls", "end-of-call-report"],
    server: { url: LUCA_ADRESSE, secret: schluessel },
    metadata: { zentrale: true },
  };

  const alle = await vapi<VapiAssistent[]>("/assistant?limit=100");
  const vorhanden = alle.find((a) => a.name === LUCA_NAME);
  const luca = vorhanden
    ? await vapi<VapiAssistent>(`/assistant/${vorhanden.id}`, { method: "PATCH", body: JSON.stringify(assistent) })
    : await vapi<VapiAssistent>("/assistant", { method: "POST", body: JSON.stringify(assistent) });

  const alteSip = nummern.find((n) => n.name === LUCA_NAME);
  const sipUri = alteSip?.sipUri ?? `sip:luca-${abgeleitet("luca-sip-name", 12)}@sip.vapi.ai`;
  const nummer = {
    name: LUCA_NAME,
    server: { url: LUCA_ADRESSE, secret: schluessel },
    authentication: { username: zugang.benutzer, password: zugang.passwort },
  };
  const sip = alteSip
    ? await vapi<VapiNummer>(`/phone-number/${alteSip.id}`, { method: "PATCH", body: JSON.stringify(nummer) })
    : await vapi<VapiNummer>("/phone-number", { method: "POST", body: JSON.stringify({ provider: "vapi", sipUri, ...nummer }) });

  return {
    assistent: luca.id,
    sipNummer: sip.id,
    sipUri: sip.sipUri ?? sipUri,
    uebernommen: { modell: `${String(modell.provider)}/${String(modell.model)}`, erkennung: vorlage.transcriber ? String(vorlage.transcriber.provider) : "Vapi-Standard" },
  };
}

/** Gehört dieses Gespräch zu Luca? (Assistent ist Luca – eingehend über seine SIP-Adresse oder ausgehend an David.) */
export function istLucaGespraech(call: { assistantId?: string | null } | undefined): boolean {
  const id = lucaAssistent();
  return Boolean(id && call?.assistantId === id);
}

/** Nach jedem Gespräch: Zusammenfassung und Mitschrift in #luca (privat: nur David und der Bot). */
export async function posteGespraech(o: { minuten: number; grund?: string; zusammenfassung?: string; mitschrift?: string }): Promise<void> {
  const kanal = await lucaKanal();
  if (!kanal) return;
  for (const teil of gespraechNachrichten({ ...o, zeit: new Date().toISOString() })) await poste(kanal, teil);
}

/** Die letzten Gespräche (Zusammenfassung + Mitschrift), neueste zuerst. */
export async function letzteGespraeche(): Promise<{ zeit: string; text: string }[]> {
  const kanal = await lucaKanal();
  if (!kanal) return [];
  return (await nachrichten(kanal))
    .filter((m) => istUnsere(m) && m.content.startsWith(GESPRAECH_MARKE))
    .map((m) => ({ zeit: m.timestamp, text: m.content }));
}
