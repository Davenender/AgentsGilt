// Finanzen A3 (16.11.2026): Belege-Sammler. Eine Rechnungsmail wird eine Zeile in Notion „Ausgaben“ (mit PDF, Euro-Betrag
// zum EZB-Kurs, Finanzjahr), die Mail bekommt in Gmail das Label „Belege“. Regeln: lib/belege-regeln.ts.
import Anthropic from "@anthropic-ai/sdk";
import { ausgabeProps, BELEG_PROMPT, euroCent, postfachAus, pruefeBeleg, type Anhang, type Beleg } from "@/lib/belege-regeln";
import { DB, jahrSeite, notion } from "@/lib/finanzen";
import { holeAnhang } from "@/lib/mail-bruecke";
import { call, posteingangKanal } from "@/lib/leads";
import { belegZeile } from "@/lib/belege-regeln";

export type BelegMail = { id: string; von: string; betreff: string; text: string; an?: string; anhaenge?: Anhang[]; link?: string; datum?: string };
export type BelegErgebnis =
  | { art: "gebucht"; beleg: Beleg; cent: number | null; url: string | null }
  | { art: "schon" }
  | { art: "keinBeleg" }
  | { art: "privat" }
  | { art: "fehler"; grund: string };

/** Euro je Dollar am Tag der Rechnung (EZB-Kurs über frankfurter.app, kostenlos). null bei Fehler. */
async function kursUsdEur(datum: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/${datum}?from=USD&to=EUR`, { signal: AbortSignal.timeout(8000) });
    const j = (await res.json()) as { rates?: { EUR?: number } };
    return typeof j.rates?.EUR === "number" ? j.rates.EUR : null;
  } catch {
    return null;
  }
}

/** Die KI liest Mail und (falls da) PDF. null = KI nicht erreichbar oder Antwort unbrauchbar. */
async function liesBeleg(m: BelegMail, pdf: { daten: Uint8Array } | null): Promise<Beleg | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const inhalt: Anthropic.ContentBlockParam[] = [
    ...(pdf ? [{ type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: Buffer.from(pdf.daten).toString("base64") } }] : []),
    { type: "text", text: `<mail>\nVon: ${m.von}\nBetreff: ${m.betreff}${m.datum ? `\nGesendet: ${m.datum.slice(0, 10)}` : ""}\n\n${m.text.slice(0, 6000)}\n</mail>` },
  ];
  try {
    const res = await new Anthropic({ apiKey, timeout: 40_000, maxRetries: 1 }).messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 600,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: BELEG_PROMPT,
      messages: [{ role: "user", content: inhalt }],
    });
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    return json ? pruefeBeleg(JSON.parse(json), m.datum) : null;
  } catch (err) {
    console.error("[belege] KI fehlgeschlagen:", err);
    return null;
  }
}

/** PDF zu Notion hochladen (Datei-Upload). null bei Fehler, dann bleibt der Gmail-Link als Beleg. */
async function ladeHoch(pdf: { name: string; typ: string; daten: Uint8Array }): Promise<{ id: string; name: string } | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token || pdf.daten.byteLength > 5_000_000) return null;
  const up = await notion<{ id: string }>("/file_uploads", "POST", { filename: pdf.name, content_type: "application/pdf" });
  if (!up?.id) return null;
  try {
    const fd = new FormData();
    const bytes = pdf.daten.buffer.slice(pdf.daten.byteOffset, pdf.daten.byteOffset + pdf.daten.byteLength) as ArrayBuffer;
    fd.append("file", new Blob([bytes], { type: "application/pdf" }), pdf.name);
    const res = await fetch(`https://api.notion.com/v1/file_uploads/${up.id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
      body: fd,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) console.error(`[belege] PDF-Upload: HTTP ${res.status}`);
    return res.ok ? { id: up.id, name: pdf.name } : null;
  } catch {
    return null;
  }
}

/**
 * Liest und bucht eine Rechnungsmail (doppelt-sicher über die Mail-Kennung). Das PDF kommt entweder mit (Skript im
 * privaten Postfach) oder wird über die Gmail-Brücke von kontakt@ geholt.
 */
export async function bucheBeleg(m: BelegMail, mitgegeben?: { name: string; daten: Uint8Array } | null): Promise<BelegErgebnis> {
  const schon = await notion<{ results?: unknown[] }>(`/databases/${DB.ausgaben}/query`, "POST", { filter: { property: "Notiz", rich_text: { contains: `Mail ${m.id}` } }, page_size: 1 });
  if (!schon) return { art: "fehler", grund: "Notion „Ausgaben“ nicht erreichbar" };
  if (schon.results?.length) return { art: "schon" };

  const hatPdf = (m.anhaenge ?? []).some((a) => /pdf/i.test(a.typ));
  const pdf = mitgegeben ? { ...mitgegeben, typ: "application/pdf" } : hatPdf ? await holeAnhang(m.id) : null;
  const beleg = await liesBeleg(m, pdf);
  if (!beleg) return { art: "fehler", grund: "KI hat die Rechnung nicht lesen können" };
  if (!beleg.istRechnung) return { art: "keinBeleg" };
  if (beleg.privat) return { art: "privat" };

  const kurs = beleg.waehrung === "USD" ? await kursUsdEur(beleg.datum) : null;
  const cent = euroCent(beleg.betrag, beleg.waehrung, kurs);
  const [jahr, datei] = await Promise.all([jahrSeite(beleg.datum.slice(0, 4)), pdf ? ladeHoch(pdf) : Promise.resolve(null)]);
  const zeile = await notion<{ id: string; url?: string }>("/pages", "POST", {
    parent: { database_id: DB.ausgaben },
    properties: ausgabeProps(beleg, { euroCent: cent, kurs, postfach: postfachAus(m.an), link: m.link ?? null, mailId: m.id, jahrSeite: jahr, datei }),
  });
  if (!zeile) return { art: "fehler", grund: "Zeile in „Ausgaben“ nicht angelegt" };
  return { art: "gebucht", beleg, cent, url: zeile.url ?? null };
}

/** Kurze Zeile in #posteingang, dass ein Beleg gebucht wurde. */
export async function meldeBeleg(token: string, b: Extract<BelegErgebnis, { art: "gebucht" }>): Promise<void> {
  const pe = await posteingangKanal(token);
  if (pe) await call(token, "POST", `/channels/${pe}/messages`, { content: belegZeile(b.beleg, b.cent, b.url), allowed_mentions: { parse: [] }, flags: 4 });
}
