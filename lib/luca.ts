import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { findChannelId } from "@/lib/discord";
import { listeKunden } from "@/lib/notion-api";
import { entschluessele, LEERER_SPEICHER, passendKlein, standortText, verschluessele, type OrtMarke, type StandortSpeicher } from "@/lib/standort-logik";
import {
  anrufErlaubt,
  anrufNachricht,
  BRIEF_MARKE,
  briefLesen,
  briefText,
  ERSTER_SATZ_EINGEHEND,
  ERSTER_SATZ_MIT_NOTIZ,
  ersterSatzAusgehend,
  mitNotiz,
  NOTIZ_MARKE,
  notizAus,
  festeNachVorn,
  NACH_VORN_AB,
  notizTeile,
  GESPRAECH_MARKE,
  GESPRAECH_STATUS,
  gespraechLaeuft,
  gedaechtnisAus,
  lageTeile,
  gespraechNachrichten,
  gespraechText,
  SPRECH_PLAN,
  stimmeTelefon,
  LAGE_MARKE,
  MAILBOX,
  kundenText,
  type KundeFuerLuca,
  assistentUeberblick,
  laeuftKlassisch,
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
  const hole = () => fetch(`${DISCORD}/channels/${kanal}/messages?limit=${limit}`, { headers: kopf(), cache: "no-store", signal: AbortSignal.timeout(6000) });
  let res = await hole();
  // Discord bremst: kurz warten und einmal neu versuchen, statt mitten im Gespräch aufzugeben
  if (res.status === 429) {
    const warte = Number(((await res.json().catch(() => ({}))) as { retry_after?: number }).retry_after) || 1;
    await new Promise((r) => setTimeout(r, Math.min(3, warte) * 1000 + 100));
    res = await hole();
  }
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}`);
  return (await res.json()) as Nachricht[];
}

async function poste(kanal: string, content: string): Promise<string | null> {
  const senden = () =>
    fetch(`${DISCORD}/channels/${kanal}/messages`, {
      method: "POST",
      headers: kopf(),
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(6000),
    });
  let res = await senden();
  // Discord bremst: Eine Mitschrift hat mehrere Teile, sonst ginge ein Teil verloren
  if (res.status === 429) {
    const warte = Number(((await res.json().catch(() => ({}))) as { retry_after?: number }).retry_after) || 1;
    await new Promise((r) => setTimeout(r, Math.min(3, warte) * 1000 + 100));
    res = await senden();
  }
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
/** Briefkasten für die Zentrale: offene Briefe und ob gerade ein Gespräch läuft (ein einziger Discord-Abruf). */
export async function briefkasten(): Promise<{ briefe: { id: string; brief: BriefMitZeit }[]; gespraech: boolean }> {
  const kanal = await lucaKanal();
  if (!kanal) throw new Error("Kanal #luca nicht gefunden");
  const alle = await nachrichten(kanal);
  return { briefe: briefeAus(alle), gespraech: gespraechAus(alle) };
}

function briefeAus(alle: Nachricht[]): { id: string; brief: BriefMitZeit }[] {
  return alle
    .filter((m) => istUnsere(m) && m.content.startsWith(BRIEF_MARKE) && !m.reactions?.some((r) => r.emoji.name === "✅" && r.me))
    .map((m) => ({ id: m.id, brief: briefLesen(m.content) }))
    .filter((x): x is { id: string; brief: BriefMitZeit } => x.brief !== null)
    .reverse();
}

export async function offeneBriefe(): Promise<{ id: string; brief: BriefMitZeit }[]> {
  const kanal = await lucaKanal();
  if (!kanal) throw new Error("Kanal #luca nicht gefunden");
  return briefeAus(await nachrichten(kanal));
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

/** Stufe 6: Läuft gerade ein Gespräch mit Luca? Eine feste Bot-Nachricht, die geändert wird (nie eine neue je Anruf). */
export async function setzeGespraech(laeuft: boolean): Promise<boolean> {
  try {
    const kanal = await lucaKanal();
    if (!kanal) return false;
    const alt = (await nachrichten(kanal)).find((m) => istUnsere(m) && m.content.startsWith(GESPRAECH_STATUS));
    const content = gespraechText(laeuft, new Date());
    if (alt) {
      if (alt.content === content) return true;
      const res = await fetch(`${DISCORD}/channels/${kanal}/messages/${alt.id}`, { method: "PATCH", headers: kopf(), body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(6000) });
      return res.ok;
    }
    return Boolean(await poste(kanal, content));
  } catch (err) {
    console.error("[luca] Gespräch-Status:", err);
    return false;
  }
}

/** Für den Briefkasten: läuft gerade ein Gespräch (höchstens 20 Minuten alt)? */
export function gespraechAus(nachr: Nachricht[], jetzt = new Date()): boolean {
  const m = nachr.find((x) => istUnsere(x) && x.content.startsWith(GESPRAECH_STATUS));
  return m ? gespraechLaeuft(m.content, jetzt) : false;
}

/** Eine feste Nachricht nach vorn holen. Klappt das Löschen der alten nicht, fliegt die neue Kopie wieder raus: Sonst würde je Runde eine mehr, und gelesen würde die falsche. */
async function nachVorn(kanal: string, altId: string, content: string): Promise<boolean> {
  const neu = await poste(kanal, content);
  if (!neu) return false;
  const loesche = (id: string) => fetch(`${DISCORD}/channels/${kanal}/messages/${id}`, { method: "DELETE", headers: kopf(), signal: AbortSignal.timeout(6000) }).catch(() => null);
  const weg = await loesche(altId);
  if (weg?.ok) return true;
  await loesche(neu);
  return false;
}

async function festeNachrichtenHalten(kanal: string, alle: Nachricht[]) {
  const zuAlt = festeNachVorn(alle.map((m) => ({ id: m.id, content: m.content, istUnsere: istUnsere(m) })), [STANDORT_MARKE, NOTIZ_MARKE, GESPRAECH_STATUS]);
  for (const m of zuAlt.slice(0, 3)) if (!(await nachVorn(kanal, m.id, m.content))) return;
}

/** Die Zentrale schickt jede Minute ihren Lagebericht: eine einzige Bot-Nachricht, die immer wieder geändert wird. */
export async function setzeLage(l: Lage): Promise<boolean> {
  const kanal = await lucaKanal();
  if (!kanal) return false;
  const alle = await nachrichten(kanal);
  const stelle = alle.findIndex((m) => istUnsere(m) && m.content.startsWith(LAGE_MARKE));
  const alt = stelle >= 0 ? alle[stelle] : null;
  const content = lageNachricht(l);
  if (content.length > 2000) return false;
  await festeNachrichtenHalten(kanal, alle).catch((err) => console.error("[luca] feste Nachrichten:", err));
  // Der Stand selbst rückt mit seinem neuen Inhalt nach vorn
  if (alt && stelle >= NACH_VORN_AB && (await nachVorn(kanal, alt.id, content))) return true;
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
function variablen(lage: Lage | null, grund: string | null, info?: string, notiz: string | null = null, gedaechtnis = "(noch keine früheren Gespräche)", kunden: KundeFuerLuca[] | null = null, standort: StandortSpeicher | null = null) {
  // 09.11.: eigene Variablen für Zeit, Ort, Schule und Termine – der Rest bleibt {{lage}}
  const jetzt = new Date();
  const teile = lageTeile(lage?.text ?? "");
  return {
    jetzt: `${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(jetzt)}, ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(jetzt)} Uhr`,
    standort: standort?.standort ? standortText(standort.standort, jetzt) : "unbekannt",
    schule: teile.schule || "(kein Stand aus dem Schulportal – lass mit schule_aktualisieren frisch nachschauen)",
    termine: teile.termine || "keine",
    // {{wissen}} = alles außer Schule und Termine (für Prompt-Fassung 6); {{lage}} bleibt vollständig für ältere Fassungen
    wissen: `${lageText(lage ? { ...lage, text: teile.rest } : null, jetzt)}\n\n${kundenText(kunden, jetzt)}`,
    lage: `Heute ist ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(jetzt)}.\n${standort?.standort ? `${standortText(standort.standort, jetzt)}\n` : ""}${lageText(lage, jetzt)}\n\n${kundenText(kunden, jetzt)}`,
    gedaechtnis,
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
  // Stufe A: Flash (noch schneller) und etwas lebendiger – Daniel bleibt, solange David nichts anderes wählt
  return lage?.stimme && /^[A-Za-z0-9]{10,40}$/.test(lage.stimme) ? stimmeTelefon(lage.stimme) : undefined;
}

/** Lucas Eintrag bei Vapi, wie er gerade ist (null, wenn Vapi nicht antwortet). Nur lesen. */
async function lucaBeiVapi(): Promise<VapiAssistent | null> {
  const id = lucaAssistent();
  if (!id || !process.env.VAPI_API_KEY?.trim()) return null;
  try {
    return await vapi<VapiAssistent>(`/assistant/${id}`);
  } catch (err) {
    console.error("[luca] Assistent nicht lesbar:", err);
    return null;
  }
}

/** Die Stimme fürs Gespräch – nur, wenn Luca klassisch läuft. Im Zweifel keine: Dann nimmt Vapi, was bei Luca eingestellt ist,
 * und der Anruf klappt immer (GPT Live lehnt fremde Stimmen samt Anruf ab). */
async function stimmeFuerGespraech(lage: Lage | null) {
  const wunsch = stimmeAus(lage);
  if (!wunsch) return undefined;
  return laeuftKlassisch(await lucaBeiVapi()) ? wunsch : undefined;
}

// ------------------------------------------------------------------ Davids Standort (OwnTracks, nur sein eigenes Handy)
const STANDORT_MARKE = "🔒 Standort";
const geheimnis = () => process.env.HELFER_SECRET?.trim() ?? "";
/** Passwort für die App auf Davids iPhone (Basic Auth an /api/standort). */
export const standortPasswort = () => abgeleitet("luca-standort", 32);
export const STANDORT_BENUTZER = "david";

async function standortNachricht(kanal: string): Promise<Nachricht | null> {
  return (await nachrichten(kanal)).find((m) => istUnsere(m) && m.content.startsWith(STANDORT_MARKE)) ?? null;
}

/** Eine einzige Bot-Nachricht in #luca, verschlüsselt: nur der letzte Stand, Discord sieht keine Koordinaten. */
export async function holeStandortSpeicher(): Promise<StandortSpeicher> {
  const kanal = await lucaKanal();
  const m = kanal ? await standortNachricht(kanal) : null;
  const inhalt = m?.content.slice(STANDORT_MARKE.length).trim();
  return (inhalt && entschluessele<StandortSpeicher>(inhalt, geheimnis())) || structuredClone(LEERER_SPEICHER);
}

/** Für Werkzeuge im Anruf: Klappt das Lesen nicht, geht es ohne Standort weiter (mit genannten Orten klappt die Antwort trotzdem). */
export const standortOderLeer = () => holeStandortSpeicher().catch((err) => {
  console.error("[luca] Standort nicht lesbar:", err);
  return structuredClone(LEERER_SPEICHER);
});

export async function schreibeStandortSpeicher(s: StandortSpeicher): Promise<boolean> {
  const kanal = await lucaKanal();
  if (!kanal) return false;
  const text = (x: StandortSpeicher) => `${STANDORT_MARKE} ${verschluessele(x, geheimnis())}`;
  const klein = passendKlein(s, (x) => text(x).length, 2000);
  if (!klein) return false;
  const content = text(klein);
  const alt = await standortNachricht(kanal);
  if (alt) {
    const res = await fetch(`${DISCORD}/channels/${kanal}/messages/${alt.id}`, { method: "PATCH", headers: kopf(), body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(6000) });
    return res.ok;
  }
  return Boolean(await poste(kanal, content));
}

/** Die Orte (Zuhause, Schule …) kommen von der Zentrale. Geändert: Die App bekommt sie bei ihrer nächsten Meldung. */
export async function setzeOrte(orte: OrtMarke[]): Promise<boolean> {
  const s = await holeStandortSpeicher();
  if (JSON.stringify(s.orte) === JSON.stringify(orte)) return true;
  return schreibeStandortSpeicher({ ...s, orte, orteNeu: true, drin: s.drin.filter((n) => orte.some((o) => o.name === n)) });
}

/** Ein Ergebnis mitten ins laufende Gespräch geben: Die Stimme sagt es in eigenen Worten (GPT Live). Klassisch: kein Weg, dann steht es nur im Stand. */
export async function sagImGespraech(anruf: string, text: string): Promise<{ ok: boolean; vorbei?: boolean; grund?: string }> {
  if (!/^[0-9a-f-]{20,60}$/i.test(anruf)) return { ok: false, grund: "ungültige Gesprächsnummer" };
  const call = await vapi<{ status?: string; assistantId?: string; monitor?: { controlUrl?: string } }>(`/call/${anruf}`);
  if (call.assistantId !== lucaAssistent()) return { ok: false, grund: "fremdes Gespräch" };
  if (call.status !== "in-progress" || !call.monitor?.controlUrl) return { ok: false, vorbei: true };
  const res = await fetch(call.monitor.controlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "append-context", kind: "commentary", content: text }),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok ? { ok: true } : { ok: false, grund: `Vapi: HTTP ${res.status}` };
}

/** Werkzeuge bei Luca auf Stand bringen; alles andere (GPT Live, Prompts, Stimme, Reasoner) bleibt, wie David es eingestellt hat. */
export async function aktualisiereWerkzeuge() {
  const id = lucaAssistent();
  if (!id) throw new Error("LUCA_ASSISTANT fehlt");
  const a = await vapi<VapiAssistent>(`/assistant/${id}`);
  const model = { ...a.model, tools: [...LUCA_WERKZEUGE, { type: "endCall" }], toolIds: [] };
  const neu = await vapi<VapiAssistent>(`/assistant/${id}`, { method: "PATCH", body: JSON.stringify({ model }) });
  return assistentUeberblick(neu as Parameters<typeof assistentUeberblick>[0]);
}

/** Prompts von Stimme und Reasoner ersetzen (GPT Live); alles andere bleibt. Beide müssen die Variablen behalten. */
export async function setzePrompts(speaker: string, reasoner: string) {
  const id = lucaAssistent();
  if (!id) throw new Error("LUCA_ASSISTANT fehlt");
  const a = await vapi<VapiAssistent>(`/assistant/${id}`);
  const m = a.model as (VapiAssistent["model"] & { speaker?: Record<string, unknown>; reasoner?: Record<string, unknown> }) | undefined;
  if (!m?.speaker || !m.reasoner) throw new Error("Luca läuft nicht auf GPT Live");
  if (!speaker.includes("{{lage}}") || !reasoner.includes("{{lage}}")) throw new Error("In beiden Prompts muss {{lage}} stehen");
  const model = { ...m, speaker: { ...m.speaker, instructions: speaker }, reasoner: { ...m.reasoner, instructions: reasoner } };
  const neu = await vapi<VapiAssistent>(`/assistant/${id}`, { method: "PATCH", body: JSON.stringify({ model }) });
  return assistentUeberblick(neu as Parameters<typeof assistentUeberblick>[0]);
}

/** Für die Prüfung von der Zentrale aus: Was ist bei Luca gerade eingestellt? */
export async function lucaEinstellungen() {
  return assistentUeberblick((await lucaBeiVapi()) as Parameters<typeof assistentUeberblick>[0]);
}

/** Kundenliste für Lucas Lagebericht. Höchstens 2,5 s warten: Vapi gibt uns beim Anruf nur wenige Sekunden. */
async function kundenFuerLuca(): Promise<KundeFuerLuca[] | null> {
  let uhr: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([listeKunden(), new Promise<null>((fertig) => (uhr = setTimeout(() => fertig(null), 2500)))]);
  } catch {
    return null;
  } finally {
    clearTimeout(uhr);
  }
}

/** Was Luca zum Gespräch braucht, aus einem einzigen Discord-Abruf: Mehrere gleichzeitig bremst Discord, und Vapi gibt uns nur wenige Sekunden.
 * Kommt in vier Sekunden nichts, startet Luca ohne Stand, statt dass der Anruf scheitert. */
async function gespraechsStand(): Promise<{ lage: Lage | null; notiz: string | null; frueher: { zeit: string; text: string }[]; kunden: KundeFuerLuca[] | null; standort: StandortSpeicher | null }> {
  const leer = { lage: null, notiz: null, frueher: [], kunden: null, standort: null };
  let uhr: ReturnType<typeof setTimeout> | undefined;
  const lesen = async () => {
    const kanal = await lucaKanal();
    if (!kanal) return leer;
    const [alle, kunden] = await Promise.all([nachrichten(kanal), kundenFuerLuca()]);
    const unsere = alle.filter(istUnsere);
    const lageM = unsere.find((m) => m.content.startsWith(LAGE_MARKE));
    const standortM = unsere.find((m) => m.content.startsWith(STANDORT_MARKE));
    const inhalt = standortM?.content.slice(STANDORT_MARKE.length).trim();
    return {
      lage: lageM ? lageLesen(lageM.content) : null,
      notiz: notizAus(unsere.filter((m) => m.content.startsWith(NOTIZ_MARKE)).map((m) => m.content)),
      frueher: unsere.filter((m) => m.content.startsWith(GESPRAECH_MARKE)).map((m) => ({ zeit: m.timestamp, text: m.content })),
      kunden,
      standort: (inhalt && entschluessele<StandortSpeicher>(inhalt, geheimnis())) || null,
    };
  };
  try {
    return await Promise.race([lesen(), new Promise<typeof leer>((fertig) => (uhr = setTimeout(() => fertig(leer), 4000)))]);
  } catch (err) {
    console.error("[luca] Stand fürs Gespräch:", err);
    return leer;
  } finally {
    clearTimeout(uhr);
  }
}

/** Die Stimme kommt von Vapi. Antwortet es langsam, bleibt die eingestellte: Vapi gibt uns beim Anruf nur wenige Sekunden. */
async function stimmeMitFrist(lage: Lage | null) {
  let uhr: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([stimmeFuerGespraech(lage), new Promise<undefined>((fertig) => (uhr = setTimeout(() => fertig(undefined), 2500)))]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(uhr);
  }
}

/** Antwort auf assistant-request (David ruft an und hat die 1 gedrückt). */
export async function assistentFuerEingang() {
  const { lage, notiz, frueher, kunden, standort } = await gespraechsStand();
  const stimme = await stimmeMitFrist(lage);
  return {
    assistantId: lucaAssistent(),
    assistantOverrides: {
      firstMessage: notiz ? ERSTER_SATZ_MIT_NOTIZ : ERSTER_SATZ_EINGEHEND,
      variableValues: variablen(lage, null, undefined, notiz, gedaechtnisAus(frueher), kunden, standort),
      ...(stimme ? { voice: stimme } : {}),
    },
  };
}

/** Luca ruft David an – nur Davids Nummer, nie 22–7 Uhr (keine Grenze pro Tag). */
export async function rufeDavidAn(grund: string, test: boolean, info?: string): Promise<{ ok: true; id?: string } | { ok: false; grund: string }> {
  if (!lucaAn()) return { ok: false, grund: "Luca am Telefon ist noch nicht eingerichtet." };
  if (!process.env.VAPI_API_KEY?.trim()) return { ok: false, grund: "VAPI_API_KEY fehlt." };
  const kanal = await lucaKanal();
  if (!kanal) return { ok: false, grund: "Kanal #luca nicht gefunden." };
  const jetzt = new Date();
  const darf = anrufErlaubt(jetzt);
  if (!darf.ok) return darf;
  const { lage, notiz, frueher, kunden, standort } = await gespraechsStand();
  const stimme = await stimmeMitFrist(lage);
  const anruf = (mitMailbox: boolean) =>
    vapi<{ id?: string }>("/call", {
      method: "POST",
      body: JSON.stringify({
        assistantId: lucaAssistent(),
        phoneNumberId: NUMBER_ID,
        customer: { number: lucaNummer() },
        assistantOverrides: {
          firstMessage: ersterSatzAusgehend(grund),
          variableValues: variablen(lage, grund, info, notiz, gedaechtnisAus(frueher), kunden, standort),
          metadata: { luca: true, test, grund: grund.slice(0, 200) },
          ...(stimme ? { voice: stimme } : {}),
          ...(mitMailbox ? MAILBOX : {}),
        },
      }),
    });
  let id: string | undefined;
  try {
    // Nimmt Vapi die Mailbox-Erkennung bei dieser Einstellung nicht an, rufen wir lieber ohne an, als gar nicht.
    // Nur bei dieser Ablehnung: Bei einer Zeitüberschreitung könnte das Telefon schon klingeln, ein zweiter Versuch wäre ein zweiter Anruf.
    const call = await anruf(true).catch(async (err: Error) => {
      if (!/HTTP 4\d\d/.test(err.message)) throw err;
      console.error("[luca] Anruf mit Mailbox-Erkennung abgelehnt, versuche ohne:", err);
      return anruf(false);
    });
    id = call?.id;
  } catch (err) {
    console.error("[luca] Anruf fehlgeschlagen:", err);
    return { ok: false, grund: "Vapi hat den Anruf abgelehnt." };
  }
  // Das Telefon klingelt schon: Antworten, bevor die Zentrale aufgibt und es noch einmal versucht. Was jetzt schiefgeht, ist kein gescheiterter Anruf.
  after(async () => {
    await poste(kanal, anrufNachricht(jetzt.toISOString(), grund, test)).catch((err) => console.error("[luca] Anruf-Notiz:", err));
    await setzeGespraech(true).catch((err) => console.error("[luca] Gespräch-Status:", err));
  });
  return { ok: true, ...(id ? { id } : {}) };
}

/** Wie ist der Anruf ausgegangen? Die Zentrale hakt eine Erinnerung erst ab, wenn David abgenommen hat. Nur Lucas eigene Anrufe. */
export async function anrufStand(id: string): Promise<{ status?: string; endedReason?: string; sekunden?: number } | null> {
  if (!/^[0-9a-f-]{20,60}$/i.test(id)) return null;
  const c = await vapi<{ status?: string; endedReason?: string; assistantId?: string; startedAt?: string; endedAt?: string }>(`/call/${id}`);
  if (c.assistantId !== lucaAssistent()) return null;
  const sekunden = c.startedAt && c.endedAt ? Math.round((Date.parse(c.endedAt) - Date.parse(c.startedAt)) / 1000) : undefined;
  return { status: c.status, endedReason: c.endedReason, ...(sekunden !== undefined ? { sekunden } : {}) };
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
    voice: stimmeTelefon("onwK4e9ZLuTAKqWW03F9"),
    ...SPRECH_PLAN,
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
  // David hat Luca auf GPT Live umgestellt (oder eine eigene Stimme gesetzt): Diese Einstellungen nie überschreiben.
  const beibehalten = Boolean(vorhanden && !laeuftKlassisch(vorhanden));
  const luca = beibehalten
    ? vorhanden!
    : vorhanden
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
    einstellungenBeibehalten: beibehalten,
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
