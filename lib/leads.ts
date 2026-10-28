import { findCategoryId, findChannelId } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import type { Analyse } from "@/lib/lead-analyse";

// Lead-Karten: Jemand wirft mit /lead <link> die Website eines Unternehmens ein,
// der Bot legt im Kanal #leads eine Karte an, und das Team stimmt ab, ob es das
// Unternehmen versuchen will. Der Stand steckt in der Karte selbst (Farbe und
// Felder), nur abgelehnte Firmen merkt sich der Bot im unsichtbaren Kanal
// #lead-speicher, damit sie nicht noch einmal vorgelegt werden.

const API = "https://discord.com/api/v10";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1564355422222159975";

export const OWNER_ID = "806859236768088114"; // David: darf Karten löschen
export const CH_KARTEN = "leads";
export const CH_ABLAGE = "lead-ablage";
export const CH_SPEICHER = "lead-speicher";
export const NEEDED = 2; // so viele gleiche Stimmen entscheiden

export type LeadState = "vote" | "confirm" | "accepted" | "active" | "archived";

const COLOR: Record<LeadState, number> = {
  vote: 0xd4a23c, // Gold
  confirm: 0xf97316, // Orange: wartet auf die Bestätigung der Ablehnung
  accepted: 0x22c55e, // Grün
  active: 0x3b82f6, // Blau: Lead aktiv, in Notion
  archived: 0x6b7280, // Grau
};

export const F_YES = "👍 Passt";
export const F_NO = "👎 Passt nicht";
export const F_STATUS = "Status";
export const F_NOTION = "Notion";
const F_HINT = "Hinweis";

export function stateOf(embed: EmbedLike): LeadState {
  const found = (Object.keys(COLOR) as LeadState[]).find((s) => COLOR[s] === embed.color);
  return found ?? "vote";
}

// ------------------------------------------------------------------ Discord

/** Der letzte Fehler von Discord, für die Rückmeldung an den, der /lead ausgeführt hat. */
export let letzterFehler = "";
/** Warum das Anlegen eines Kanals mit Rechten nicht klappte (nur für die Fehlersuche). */
export let kanalInfo = "";

function headers(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bot ${token}` };
}

async function call<T>(token: string, method: string, path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: headers(token),
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      letzterFehler = `HTTP ${res.status} ${text.slice(0, 300)}`;
      console.error(`[lead] ${method} ${path.split("?")[0]} -> ${letzterFehler}`);
      return null;
    }
    return res.status === 204 ? ({} as T) : ((await res.json()) as T);
  } catch (err) {
    console.error(`[lead] ${method} ${path.split("?")[0]} fehlgeschlagen:`, err);
    return null;
  }
}

interface Role {
  id: string;
  name: string;
}

const READ = String(1024 + 65536); // ansehen + Verlauf

export const USAGE_TEXT =
  "**So legst du eine Lead-Karte an**\n" +
  "Schreib im Kanal **#lead-befehle** `/lead` und füge den Link der Firmenwebsite ein, zum Beispiel `/lead link: www.beispiel.de`. Nur dort funktioniert der Befehl.\n" +
  "Der Bot liest die Seite, fasst sie zusammen und legt hier eine Karte an. Danach stimmt ihr mit **Passt** oder **Passt nicht** ab, zwei gleiche Stimmen entscheiden.\n" +
  "Hier im Kanal kann man nur Knöpfe klicken, nicht schreiben. Hinweis: Nur kontaktieren, wenn es rechtlich zulässig ist (Kaltakquise).";

/**
 * Legt den Kanal an, falls er fehlt. Er landet in der Kategorie AUTOMATISCH: Dort darf der
 * Bot schreiben, und das Team kann (wie bei #anrufe) nur lesen und klicken. Der Bot darf in
 * diesem Server keine eigenen Kanalrechte vergeben, deshalb erbt der Kanal sie von der Kategorie.
 * Den Merkzettel sieht zusätzlich nur David.
 */
async function ensureChannel(token: string, name: string): Promise<string | null> {
  const existing = await findChannelId(token, name);
  if (existing) return existing;

  const parent = (await findCategoryId(token, "AUTOMATISCH")) ?? (await findCategoryId(token, "TEAM"));
  const topic =
    name === CH_KARTEN
      ? "Neue Unternehmen: mit /lead <link> anlegen, hier abstimmen."
      : name === CH_ABLAGE
        ? "Abgeschlossene Leads (Kein Interesse)."
        : "Merkzettel des Bots (abgelehnte Firmen). Nicht löschen.";
  const created = await call<{ id: string }>(token, "POST", `/guilds/${GUILD_ID}/channels`, {
    name,
    type: 0,
    topic,
    ...(parent ? { parent_id: parent } : {}),
  });
  if (!created) {
    kanalInfo = `Anlegen: ${letzterFehler}`;
    return null;
  }

  if (name === CH_SPEICHER) {
    // Nur David darf den Merkzettel sehen. Verbieten darf der Bot, ohne selbst alles zu haben.
    const roles = (await call<Role[]>(token, "GET", `/guilds/${GUILD_ID}/roles`)) ?? [];
    const team = roles.find((r) => r.name === "Team");
    if (team) await call(token, "PUT", `/channels/${created.id}/permissions/${team.id}`, { type: 0, allow: "0", deny: "1024" });
    await call(token, "PUT", `/channels/${created.id}/permissions/${OWNER_ID}`, { type: 1, allow: READ, deny: "0" });
  }
  if (name === CH_KARTEN) {
    const msg = await call<{ id: string }>(token, "POST", `/channels/${created.id}/messages`, {
      content: USAGE_TEXT,
      allowed_mentions: { parse: [] },
    });
    if (msg) await call(token, "PUT", `/channels/${created.id}/pins/${msg.id}`);
  }
  return created.id;
}

export const kartenKanal = (t: string) => ensureChannel(t, CH_KARTEN);
export const ablageKanal = (t: string) => ensureChannel(t, CH_ABLAGE);
export const speicherKanal = (t: string) => ensureChannel(t, CH_SPEICHER);

interface Msg {
  id: string;
  content: string;
  author: { bot?: boolean };
  embeds: EmbedLike[];
}

async function alleNachrichten(token: string, channelId: string, max = 300): Promise<Msg[]> {
  const out: Msg[] = [];
  let before = "";
  while (out.length < max) {
    const page = await call<Msg[]>(
      token,
      "GET",
      `/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ""}`,
    );
    if (!page?.length) break;
    out.push(...page);
    before = page[page.length - 1].id;
    if (page.length < 100) break;
  }
  return out;
}

// ---------------------------------------------------------------- Merkzettel

const datum = () => new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
const SEP = " · ";

export async function merkeAbgelehnt(token: string, domain: string, firma: string): Promise<void> {
  const ch = await speicherKanal(token);
  if (!ch) return;
  await call(token, "POST", `/channels/${ch}/messages`, {
    content: `abgelehnt${SEP}${domain}${SEP}${datum()}${SEP}${firma.slice(0, 80)}`,
    allowed_mentions: { parse: [] },
  });
}

/** Löscht alle Merkzettel zu einer Firma (damit sie wieder vorgelegt werden darf). */
export async function vergissAbgelehnt(token: string, domain: string): Promise<number> {
  const ch = await findChannelId(token, CH_SPEICHER);
  if (!ch) return 0;
  const hits = (await alleNachrichten(token, ch)).filter((m) => m.content.split(SEP)[1] === domain);
  for (const m of hits) await call(token, "DELETE", `/channels/${ch}/messages/${m.id}`);
  return hits.length;
}

export interface Bestehend {
  art: "karte" | "ablage" | "abgelehnt";
  channelId: string;
  messageId: string;
  status?: string;
  datum?: string;
}

const cardDomain = (m: Msg) => {
  const f = m.embeds?.[0]?.footer?.text;
  return f?.startsWith("lead:") ? f.slice(5).split(SEP)[0].trim() : null;
};

/** Gibt es zu dieser Firma schon eine Karte, einen Ablage-Eintrag oder eine Ablehnung? */
export async function findeBestehend(token: string, domain: string): Promise<Bestehend | null> {
  for (const [name, art] of [[CH_KARTEN, "karte"], [CH_ABLAGE, "ablage"]] as const) {
    const ch = await findChannelId(token, name);
    if (!ch) continue;
    const hit = (await alleNachrichten(token, ch)).find((m) => m.author.bot && cardDomain(m) === domain);
    if (hit) {
      const status = hit.embeds[0].fields?.find((f) => f.name === F_STATUS)?.value;
      return { art, channelId: ch, messageId: hit.id, status };
    }
  }
  const sp = await findChannelId(token, CH_SPEICHER);
  if (sp) {
    const hit = (await alleNachrichten(token, sp)).find((m) => m.content.split(SEP)[1] === domain);
    if (hit) return { art: "abgelehnt", channelId: sp, messageId: hit.id, datum: hit.content.split(SEP)[2] };
  }
  return null;
}

export async function loescheNachricht(token: string, channelId: string, messageId: string): Promise<boolean> {
  return (await call(token, "DELETE", `/channels/${channelId}/messages/${messageId}`)) !== null;
}

export async function postKarte(
  token: string,
  channelId: string,
  embed: EmbedLike,
  components: unknown[],
  ping?: { content: string; roleId: string },
): Promise<string | null> {
  const msg = await call<{ id: string }>(token, "POST", `/channels/${channelId}/messages`, {
    ...(ping ? { content: ping.content } : {}),
    embeds: [embed],
    components,
    allowed_mentions: ping ? { parse: [], roles: [ping.roleId] } : { parse: [] },
  });
  return msg?.id ?? null;
}

export async function aendereKarte(token: string, channelId: string, messageId: string, embed: EmbedLike, components: unknown[]): Promise<boolean> {
  return (
    (await call(token, "PATCH", `/channels/${channelId}/messages/${messageId}`, {
      embeds: [embed],
      components,
      allowed_mentions: { parse: [] },
    })) !== null
  );
}

/** Antwort auf den Befehl (nur für die Person sichtbar) durch einen Text ersetzen. */
export async function setzeAntwort(appId: string, interactionToken: string, content: string): Promise<void> {
  try {
    await fetch(`${API}/webhooks/${appId}/${interactionToken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, embeds: [], components: [], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[lead] Antwort setzen fehlgeschlagen:", err);
  }
}

// -------------------------------------------------------------------- Karte

const fieldValue = (e: EmbedLike, name: string) => e.fields?.find((f) => f.name.startsWith(name))?.value;

export const domainOfCard = (e: EmbedLike): string | null =>
  e.footer?.text?.startsWith("lead:") ? e.footer.text.slice(5).split(SEP)[0].trim() : null;

const FOOTER_HINWEIS = "Nur kontaktieren, wenn rechtlich zulässig (Kaltakquise)";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// Nichts von der fremden Seite soll in Discord Erwähnungen oder Kanalverweise auslösen.
const sauber = (s: string) => s.replace(/@/g, "@​").replace(/<(#|@|:)/g, "<​$1");

/** Die Rolle Team (für die Benachrichtigung bei neuen Karten). */
export async function teamRolle(token: string): Promise<string | null> {
  const roles = (await call<Role[]>(token, "GET", `/guilds/${GUILD_ID}/roles`)) ?? [];
  return roles.find((r) => r.name === "Team")?.id ?? null;
}

export function kartenEmbed(a: Analyse, url: string, domain: string): EmbedLike {
  const fields: EmbedLike["fields"] = [
    { name: "Branche", value: sauber(a.branche ?? "nicht gefunden"), inline: true },
    { name: "Telefon", value: sauber(a.telefon ?? "nicht gefunden"), inline: true },
    { name: "E-Mail", value: sauber(a.email ?? "nicht gefunden"), inline: true },
    { name: "Ansprechpartner", value: sauber(a.ansprechpartner ?? "nicht gefunden"), inline: true },
    { name: "Adresse", value: sauber(a.adresse ?? "nicht gefunden"), inline: true },
  ];
  if (a.auffaelligkeiten.length) {
    fields.push({ name: "Auffällig an der Website", value: sauber(a.auffaelligkeiten.map((x) => `• ${x}`).join("\n")), inline: false });
  }
  if (a.passt) {
    fields.push({ name: "Passt zu", value: sauber(clip(`${a.passt}${a.begruendung ? ` – ${a.begruendung}` : ""}`, 300)), inline: false });
  }
  fields.push(
    { name: `${F_YES} (0 von ${NEEDED})`, value: "–", inline: true },
    { name: `${F_NO} (0 von ${NEEDED})`, value: "–", inline: true },
  );
  return {
    title: clip(sauber(a.firma), 250),
    description: `${sauber(clip(a.zusammenfassung, 700))}\n\n🔗 ${url}`,
    color: COLOR.vote,
    fields,
    footer: { text: `lead:${domain}${SEP}${FOOTER_HINWEIS}` },
  };
}

function ids(value: string | undefined): string[] {
  return [...(value ?? "").matchAll(/<@!?(\d+)>/g)].map((m) => m[1]);
}

export function votes(e: EmbedLike): { yes: string[]; no: string[] } {
  return { yes: ids(fieldValue(e, F_YES)), no: ids(fieldValue(e, F_NO)) };
}

function mitStimmen(e: EmbedLike, yes: string[], no: string[], state: LeadState): EmbedLike {
  const set = (prefix: string, base: string, list: string[]) => ({
    name: `${base} (${list.length} von ${NEEDED})`,
    value: list.length ? list.map((i) => `<@${i}>`).join(" ") : "–",
    inline: true,
  });
  const fields = (e.fields ?? [])
    .filter((f) => f.name !== F_HINT)
    .map((f) =>
      f.name.startsWith(F_YES) ? set(F_YES, F_YES, yes) : f.name.startsWith(F_NO) ? set(F_NO, F_NO, no) : f,
    );
  if (state === "confirm") {
    fields.push({
      name: F_HINT,
      value: "⚠️ Zwei von euch haben abgelehnt. Wirklich ablehnen? Dann wird die Karte gelöscht und die Firma nicht mehr vorgelegt.",
      inline: false,
    });
  }
  return { ...e, color: COLOR[state], fields };
}

export type Abstimmung =
  | { art: "doppelt"; text: string }
  | { art: "neu"; embed: EmbedLike; state: LeadState };

/** Eine Stimme abgeben oder ändern. */
export function stimme(e: EmbedLike, userId: string, dafuer: boolean): Abstimmung {
  const { yes, no } = votes(e);
  if ((dafuer && yes.includes(userId)) || (!dafuer && no.includes(userId))) {
    return { art: "doppelt", text: "Du hast schon so abgestimmt. Du kannst deine Stimme ändern, indem du den anderen Knopf klickst." };
  }
  const y = yes.filter((i) => i !== userId);
  const n = no.filter((i) => i !== userId);
  (dafuer ? y : n).push(userId);

  if (y.length >= NEEDED) {
    const emb = mitStimmen(e, y, n, "accepted");
    return {
      art: "neu",
      state: "accepted",
      embed: { ...emb, fields: [...(emb.fields ?? []).filter((f) => f.name !== F_STATUS), { name: F_STATUS, value: "Offen", inline: false }] },
    };
  }
  if (n.length >= NEEDED) return { art: "neu", state: "confirm", embed: mitStimmen(e, y, n, "confirm") };
  return { art: "neu", state: "vote", embed: mitStimmen(e, y, n, "vote") };
}

/** Ablehnung abgebrochen: die Ablehnungen werden zurückgenommen. */
export function ablehnungAbbrechen(e: EmbedLike): EmbedLike {
  const { yes } = votes(e);
  return mitStimmen(e, yes, [], "vote");
}

const STATUS_WORD = ["Offen", "In Arbeit", "Kontaktiert", "Lead aktiv"] as const;

export function statusWort(e: EmbedLike): string {
  const v = fieldValue(e, F_STATUS) ?? "Offen";
  return STATUS_WORD.find((w) => v.startsWith(w)) ?? "Offen";
}

export function mitStatus(e: EmbedLike, status: string, zeit: string, state: LeadState = "accepted"): EmbedLike {
  const fields = (e.fields ?? []).filter((f) => f.name !== F_STATUS);
  fields.push({ name: F_STATUS, value: `${status} · ${zeit}`, inline: false });
  return { ...e, color: COLOR[state], fields };
}

export function mitNotion(e: EmbedLike, nr: string | null, seite: string): EmbedLike {
  const fields = (e.fields ?? []).filter((f) => f.name !== F_NOTION);
  fields.push({ name: F_NOTION, value: `${nr ? `${nr} · ` : ""}${seite ? `[In Notion öffnen](${seite})` : "angelegt"}`, inline: false });
  return { ...e, fields };
}

export function archiviert(e: EmbedLike, zeit: string): EmbedLike {
  return mitStatus({ ...e, fields: (e.fields ?? []).filter((f) => f.name !== F_HINT) }, "Kein Interesse", zeit, "archived");
}

// ------------------------------------------------------------------- Knöpfe

const button = (label: string, id: string, style: 1 | 2 | 3 | 4) => ({
  type: 2,
  label,
  style,
  custom_id: `lead:${id}`,
});

export function leadComponents(state: LeadState, status = "Offen") {
  switch (state) {
    case "vote":
      return [{ type: 1, components: [button("Passt", "yes", 3), button("Passt nicht", "no", 4)] }];
    case "confirm":
      return [{ type: 1, components: [button("Sicher ablehnen", "sure", 4), button("Abbrechen", "cancel", 2)] }];
    case "accepted": {
      const s = (label: string, id: string, current: boolean) => button(label, `st:${id}`, current ? 1 : 2);
      const row = [
        s("Offen", "open", status === "Offen"),
        s("In Arbeit", "work", status === "In Arbeit"),
        s("Kontaktiert", "contacted", status === "Kontaktiert"),
        ...(status === "Kontaktiert" ? [button("Lead aktiv", "st:active", 3)] : []),
        button("Kein Interesse", "st:nointerest", 4),
      ];
      return [{ type: 1, components: row }];
    }
    default:
      return [];
  }
}
