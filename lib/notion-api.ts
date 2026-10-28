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
