import type { Analyse } from "@/lib/lead-analyse";

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

/** Legt aus einer Website-Anfrage einen neuen Lead in der Kunden-Datenbank an. */
export async function legeLeadAusAnfrage(input: {
  name: string;
  email: string;
  company?: string;
  service?: string;
  message: string;
}): Promise<{ ok: true; seite: string; nr: string | null; titel: string } | { ok: false; fehler: string }> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return { ok: false, fehler: "Notion ist noch nicht verbunden (NOTION_TOKEN fehlt bei Vercel)." };

  const titel = (input.company?.trim() || input.name).slice(0, 200);
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const properties: Record<string, unknown> = {
    Name: { title: text(titel, 200) },
    Status: { select: { name: "Lead" } },
    Quelle: { select: { name: "Website / Chatbot" } },
    Erstkontakt: { date: { start: heute } },
    "Nächster Schritt": { rich_text: text("Erstkontakt aufnehmen", 200) },
  };
  if (input.email) properties["E-Mail"] = { email: input.email };
  const angebot = input.service ? ANGEBOT[input.service] : null;
  if (angebot) properties["Angebot"] = { select: { name: angebot } };

  const zeilen = [
    `Anfrage über die Website am ${new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}`,
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
          properties?: Record<
            string,
            {
              title?: { plain_text?: string }[];
              email?: string | null;
              formula?: { string?: string | null };
              unique_id?: { prefix?: string | null; number?: number };
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
        out.push({ nr, name: name || "ohne Namen", email: props["E-Mail"]?.email ?? "" });
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
