import type { Analyse } from "@/lib/lead-analyse";
import { notionPeople } from "@/lib/zustaendige";

// Legt einen neuen Lead als Zeile in der Kunden-Datenbank an.
// Danach löst die bestehende Notion-Automation den Kunden-Kanal in Discord aus.
//
// Env-Var (Vercel): NOTION_TOKEN = Token der Notion-Integration. Die Kunden-
// Datenbank muss mit der Integration geteilt sein.

const DATABASE_ID = process.env.NOTION_KUNDEN_DB || "94012175-c78b-41c9-8c2e-c0e21ea2889c";

export const notionConfigured = () => Boolean(process.env.NOTION_TOKEN?.trim());

const ANGEBOT: Record<string, string> = {
  "Websites & Landingpages": "Websites und Landingpages",
  "Voice-Agenten": "Voice-Agent",
  "Online-Terminbuchung": "Online Terminbuchung",
  Automatisierungen: "Automatisierung",
  "KI-Beratung & Audit": "KI-Beratung und Audit",
  "KI-Chatbots": "Sonstiges",
};

const text = (s: string, max = 1900) => [{ type: "text", text: { content: s.slice(0, max) } }];

export async function legeKundenZeileAn(input: {
  analyse: Analyse;
  url: string;
  domain: string;
  /** Discord-Kennungen der Zuständigen (wer den Lead übernommen hat). */
  zustaendig?: string[];
}): Promise<{ ok: true; seite: string; nr: string | null } | { ok: false; fehler: string }> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return { ok: false, fehler: "Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel)." };
  const a = input.analyse;

  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const properties: Record<string, unknown> = {
    Name: { title: text(a.firma, 200) },
    Status: { select: { name: "Lead" } },
    Quelle: { select: { name: "Sonstiges" } },
    Erstkontakt: { date: { start: heute } },
    "Domain / Anbieter": { rich_text: text(input.domain, 200) },
    "Nächster Schritt": { rich_text: text("Erstkontakt aufnehmen", 200) },
  };
  if (a.email) properties["E-Mail"] = { email: a.email };
  if (a.telefon) properties["Telefon"] = { phone_number: a.telefon };
  if (input.zustaendig?.length) properties["Zuständig"] = notionPeople(input.zustaendig);
  const angebot = a.passt ? ANGEBOT[a.passt] : null;
  if (angebot) properties["Angebot"] = { select: { name: angebot } };

  const zeilen = [
    a.zusammenfassung,
    a.branche && `Branche: ${a.branche}`,
    a.ansprechpartner && `Ansprechpartner: ${a.ansprechpartner}`,
    a.adresse && `Adresse: ${a.adresse}`,
    `Webseite: ${input.url}`,
    a.auffaelligkeiten.length ? `Auffälligkeiten:\n${a.auffaelligkeiten.map((x) => `• ${x}`).join("\n")}` : null,
    a.passt && `Passt zu: ${a.passt}${a.begruendung ? ` (${a.begruendung})` : ""}`,
  ].filter((x): x is string => Boolean(x));

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties,
        children: zeilen.map((z) => ({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: text(z) },
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[notion] Zeile anlegen fehlgeschlagen: HTTP ${res.status} ${body.slice(0, 300)}`);
      return {
        ok: false,
        fehler:
          res.status === 401 || res.status === 403 || res.status === 404
            ? "Notion lehnt den Zugriff ab. Die Integration muss mit der Kunden-Datenbank geteilt sein."
            : `Notion hat die Zeile abgelehnt (HTTP ${res.status}).`,
      };
    }
    const page = (await res.json()) as {
      url?: string;
      properties?: Record<string, { formula?: { string?: string | null }; unique_id?: { prefix?: string | null; number?: number } }>;
    };
    const f = page.properties?.["KND-Nr."]?.formula?.string;
    const id = page.properties?.["Kunden-ID"]?.unique_id;
    const nr = f || (id?.number ? `${id.prefix ?? "KND"}-${String(id.number).padStart(3, "0")}` : null);
    return { ok: true, seite: page.url ?? "", nr };
  } catch (err) {
    console.error("[notion] Zeile anlegen fehlgeschlagen:", err);
    return { ok: false, fehler: "Notion war nicht erreichbar. Bitte gleich nochmal versuchen." };
  }
}

/** Seiten-ID (32 Hex-Zeichen) aus einer Notion-Adresse oder ID, sonst null. */
export function seitenId(seite: string | undefined | null): string | null {
  return (seite ?? "").replace(/-/g, "").match(/([0-9a-f]{32})(?:[?#].*)?$/i)?.[1]?.toLowerCase() ?? null;
}

/**
 * Schlägt die Kunden-Nr. einer Seite direkt bei Notion nach. Der Webhook liefert sie
 * manchmal nicht mit (z.B. wenn nur ein anderes Feld geändert wurde).
 * Akzeptiert die Seiten-Adresse oder die Seiten-ID.
 */
export async function holeKundenNr(seite: string | undefined | null): Promise<string | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  const id = (seite ?? "").replace(/-/g, "").match(/([0-9a-f]{32})(?:[?#].*)?$/i)?.[1];
  if (!token || !id) return null;
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const page = (await res.json()) as {
      properties?: Record<string, { formula?: { string?: string | null }; unique_id?: { prefix?: string | null; number?: number } }>;
    };
    const f = page.properties?.["KND-Nr."]?.formula?.string;
    if (f && /^KND-\d{3,}$/.test(f)) return f;
    const n = page.properties?.["Kunden-ID"]?.unique_id?.number;
    return n && n > 0 ? `KND-${String(n).padStart(3, "0")}` : null;
  } catch {
    return null;
  }
}

/** Setzt nur das Personenfeld „Zuständig“ einer Kundenzeile (Discord-Kennungen von David, Jakob, Mijo). */
export async function setzeZustaendig(notionUrl: string, zustaendig: string[]): Promise<boolean> {
  const token = process.env.NOTION_TOKEN?.trim();
  const seite = seitenId(notionUrl);
  if (!token || !seite) return false;
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${seite}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { Zuständig: notionPeople(zustaendig) } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[notion] Zuständig setzen fehlgeschlagen: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("[notion] Zuständig setzen fehlgeschlagen:", err);
    return false;
  }
}

/**
 * Kundenkarte „Verloren“ / „Wieder aufnehmen“: setzt den Status und den Verlustgrund
 * (null = Verlustgrund leeren, undefined = nicht anfassen).
 */
export async function setzeStatus(notionUrl: string, status: string, verlustgrund?: string | null): Promise<boolean> {
  const token = process.env.NOTION_TOKEN?.trim();
  const seite = seitenId(notionUrl);
  if (!token || !seite) return false;
  const properties: Record<string, unknown> = { Status: { select: { name: status } } };
  if (verlustgrund !== undefined) properties.Verlustgrund = { select: verlustgrund ? { name: verlustgrund } : null };
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${seite}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[notion] Status setzen fehlgeschlagen: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("[notion] Status setzen fehlgeschlagen:", err);
    return false;
  }
}

/** Zahlungsmeldung von Stripe: setzt nur das Feld „Zahlungsstatus“ einer Kundenzeile. */
export async function setzeZahlungsstatus(notionUrl: string, status: "Bezahlt" | "Offen"): Promise<boolean> {
  const token = process.env.NOTION_TOKEN?.trim();
  const seite = seitenId(notionUrl);
  if (!token || !seite) return false;
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${seite}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { Zahlungsstatus: { select: { name: status } } } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[notion] Zahlungsstatus setzen fehlgeschlagen: HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("[notion] Zahlungsstatus setzen fehlgeschlagen:", err);
    return false;
  }
}

/** Legt aus einer Website-Anfrage einen neuen Lead in der Kunden-Datenbank an. */
export async function legeLeadAusAnfrage(input: {
  name: string;
  email: string;
  company?: string;
  service?: string;
  message: string;
  /** Wie der Kontakt zu uns kam, Vorgabe: Website / Chatbot (bei Mails: Sonstiges). */
  quelle?: string;
  /** Discord-Kennungen der Zuständigen (wer die Anfrage übernommen hat). */
  zustaendig?: string[];
}): Promise<{ ok: true; seite: string; nr: string | null; titel: string } | { ok: false; fehler: string }> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return { ok: false, fehler: "Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel)." };

  const titel = (input.company?.trim() || input.name).slice(0, 200);
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const properties: Record<string, unknown> = {
    Name: { title: text(titel, 200) },
    Status: { select: { name: "Lead" } },
    Quelle: { select: { name: input.quelle ?? "Website / Chatbot" } },
    Erstkontakt: { date: { start: heute } },
    "Nächster Schritt": { rich_text: text("Erstkontakt aufnehmen", 200) },
  };
  if (input.email) properties["E-Mail"] = { email: input.email };
  if (input.zustaendig?.length) properties["Zuständig"] = notionPeople(input.zustaendig);
  const angebot = input.service ? ANGEBOT[input.service] : null;
  if (angebot) properties["Angebot"] = { select: { name: angebot } };

  const zeilen = [
    `${input.quelle === "Sonstiges" ? "Mail" : "Anfrage über die Website"} am ${new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}`,
    `Ansprechpartner: ${input.name}`,
    input.company?.trim() && `Unternehmen: ${input.company.trim()}`,
    input.service && `Gewünschte Leistung: ${input.service}`,
    `Nachricht:\n${input.message}`,
  ].filter((x): x is string => Boolean(x));

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties,
        children: zeilen.map((z) => ({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: text(z) },
        })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[notion] Lead anlegen fehlgeschlagen: HTTP ${res.status} ${body.slice(0, 300)}`);
      return {
        ok: false,
        fehler:
          res.status === 401 || res.status === 403 || res.status === 404
            ? "Notion lehnt den Zugriff ab. Die Integration muss mit der Kunden-Datenbank geteilt sein."
            : `Notion hat die Zeile abgelehnt (HTTP ${res.status}).`,
      };
    }
    const page = (await res.json()) as {
      url?: string;
      properties?: Record<string, { formula?: { string?: string | null }; unique_id?: { prefix?: string | null; number?: number } }>;
    };
    const f = page.properties?.["KND-Nr."]?.formula?.string;
    const id = page.properties?.["Kunden-ID"]?.unique_id;
    const nr = f || (id?.number ? `${id.prefix ?? "KND"}-${String(id.number).padStart(3, "0")}` : null);
    return { ok: true, seite: page.url ?? "", nr, titel };
  } catch (err) {
    console.error("[notion] Lead anlegen fehlgeschlagen:", err);
    return { ok: false, fehler: "Notion war nicht erreichbar. Bitte gleich nochmal versuchen." };
  }
}

export interface KundeKurz {
  nr: string;
  name: string;
  email: string;
  status: string;
  /** Spalte "Nächster Schritt" (für die Helfer-Brücke) */
  naechsterSchritt?: string | null;
  /** Spalte "Nächstes Follow-up" als JJJJ-MM-TT (für die Helfer-Brücke) */
  followUp?: string | null;
  /** Für die Helfer-Brücke (nur lesen): Angebot, "Domain / Anbieter", "Vercel-Projekt", "Live / Übergeben", Seite, zuletzt geändert */
  angebot?: string | null;
  domain?: string | null;
  vercelProjekt?: string | null;
  live?: boolean;
  notionUrl?: string | null;
  geaendert?: string | null;
  /** Notion-IDs im Personenfeld „Zuständig“ */
  zustaendig?: string[];
}

/** Alle Kunden aus Notion (für die Auswahl "Bestehender Kunde?"), neueste zuerst. */
export async function listeKunden(max = 300): Promise<KundeKurz[] | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  const out: KundeKurz[] = [];
  let cursor: string | undefined;
  try {
    while (out.length < max) {
      const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
          sorts: [{ timestamp: "created_time", direction: "descending" }],
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[notion] Kunden lesen fehlgeschlagen: HTTP ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        has_more?: boolean;
        next_cursor?: string | null;
        results?: {
          url?: string;
          last_edited_time?: string;
          properties?: Record<
            string,
            {
              title?: { plain_text?: string }[];
              email?: string | null;
              select?: { name?: string } | null;
              formula?: { string?: string | null };
              unique_id?: { prefix?: string | null; number?: number };
              rich_text?: { plain_text?: string }[];
              date?: { start?: string | null } | null;
              url?: string | null;
              checkbox?: boolean;
              people?: { id?: string }[];
            }
          >;
        }[];
      };
      for (const p of data.results ?? []) {
        const props = p.properties ?? {};
        const name = (props["Name"]?.title ?? []).map((t) => t.plain_text ?? "").join("").trim();
        const f = props["KND-Nr."]?.formula?.string;
        const id = props["Kunden-ID"]?.unique_id;
        const nr = f && /^KND-\d{3,}$/.test(f) ? f : id?.number ? `KND-${String(id.number).padStart(3, "0")}` : null;
        if (!nr || /beispiel/i.test(name)) continue;
        out.push({
          nr,
          name: name || "ohne Namen",
          email: props["E-Mail"]?.email ?? "",
          status: props["Status"]?.select?.name ?? "",
          naechsterSchritt: (props["Nächster Schritt"]?.rich_text ?? []).map((t) => t.plain_text ?? "").join("").trim() || null,
          followUp: props["Nächstes Follow-up"]?.date?.start?.slice(0, 10) ?? null,
          angebot: props["Angebot"]?.select?.name ?? null,
          domain: (props["Domain / Anbieter"]?.rich_text ?? []).map((t) => t.plain_text ?? "").join("").trim() || null,
          vercelProjekt: props["Vercel-Projekt"]?.url ?? null,
          live: props["Live / Übergeben"]?.checkbox ?? false,
          notionUrl: p.url ?? null,
          geaendert: p.last_edited_time ?? null,
          zustaendig: (props["Zuständig"]?.people ?? []).map((u) => u.id ?? "").filter(Boolean),
        });
      }
      if (!data.has_more || !data.next_cursor) break;
      cursor = data.next_cursor;
    }
    return out;
  } catch (err) {
    console.error("[notion] Kunden lesen fehlgeschlagen:", err);
    return null;
  }
}

/** Luca am Telefon, nach Davids Ja: Status, nächster Schritt oder Follow-up eines Kunden ändern (nur diese Felder). */
export async function aendereKunde(nr: string, felder: { status?: string; naechsterSchritt?: string; followUp?: string }): Promise<{ ok: true; name: string } | { ok: false; grund: string }> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return { ok: false, grund: "Notion ist hier nicht eingerichtet." };
  const kopf = { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" };
  const kunde = (await listeKunden())?.find((k) => k.nr === nr);
  if (!kunde) return { ok: false, grund: `${nr} habe ich in Notion nicht gefunden.` };
  const seite = seitenId(kunde.notionUrl);
  if (!seite) return { ok: false, grund: `Die Notion-Seite von ${nr} habe ich nicht gefunden.` };
  const properties: Record<string, unknown> = {};
  if (felder.status) {
    // Nur Status, die es schon gibt: Sonst würde Notion still einen neuen anlegen
    const db = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, { headers: kopf, signal: AbortSignal.timeout(10_000) });
    const optionen = db.ok ? (((await db.json()) as { properties?: Record<string, { select?: { options?: { name: string }[] } }> }).properties?.Status?.select?.options ?? []).map((o) => o.name) : [];
    const treffer = optionen.find((o) => o.replace(/[^\p{L}\p{N} ]/gu, "").trim().toLowerCase() === felder.status!.replace(/[^\p{L}\p{N} ]/gu, "").trim().toLowerCase());
    if (!treffer) return { ok: false, grund: `Den Status „${felder.status}“ gibt es nicht. Möglich sind: ${optionen.join(", ") || "unbekannt"}.` };
    properties.Status = { select: { name: treffer } };
  }
  if (felder.naechsterSchritt) properties["Nächster Schritt"] = { rich_text: text(felder.naechsterSchritt) };
  if (felder.followUp) properties["Nächstes Follow-up"] = { date: { start: felder.followUp } };
  const res = await fetch(`https://api.notion.com/v1/pages/${seite}`, { method: "PATCH", headers: kopf, body: JSON.stringify({ properties }), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.error(`[notion] Kunde ändern fehlgeschlagen: HTTP ${res.status}`);
    return { ok: false, grund: "Notion hat die Änderung nicht angenommen." };
  }
  return { ok: true, name: kunde.name };
}
