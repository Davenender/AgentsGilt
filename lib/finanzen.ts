// Finanzen A2 (16.11.2026): Einnahmen in Notion „Rechnungen“, Stripe-Gebühr in „Ausgaben“, beides mit dem Finanzjahr.
// Regeln und Notion-Felder: lib/finanzen-regeln.ts. Aufgerufen von lib/stripe-handler.ts (Zahlung) und
// lib/finanzen-handlers.ts (Überweisung über die Karte in #posteingang).
import { seitenId } from "@/lib/notion-api";
import { einnahmeProps, gebuehrProps, rechnungsNummer, typFuer, type Einnahme } from "@/lib/finanzen-regeln";
import type { Meldung, StripeKunde } from "@/lib/stripe-meldung";

const DB = {
  rechnungen: process.env.NOTION_RECHNUNGEN_DB || "8f55e3b1-186d-4e81-855c-75f604512731",
  ausgaben: process.env.NOTION_AUSGABEN_DB || "41a03fa2-27fb-81b9-a6cf-f2d6ed303ef9",
  jahre: process.env.NOTION_FINANZJAHRE_DB || "41a03fa2-27fb-8120-a4a7-ed63698a56d4",
};

const heute = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });

async function notion<T>(pfad: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T | null> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.notion.com/v1${pfad}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[finanzen] Notion ${method} ${pfad.split("?")[0]}: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[finanzen] Notion nicht erreichbar:", err);
    return null;
  }
}

async function stripe<T>(pfad: string): Promise<T | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1${pfad}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.error(`[finanzen] Stripe ${pfad.split("?")[0]}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Die Zeile des Jahres in „Finanzjahre“ (legt sie an, wenn sie fehlt). */
export async function jahrSeite(jahr: string): Promise<string | null> {
  const r = await notion<{ results?: { id: string }[] }>(`/databases/${DB.jahre}/query`, "POST", { filter: { property: "Jahr", title: { equals: jahr } }, page_size: 1 });
  if (r?.results?.[0]?.id) return r.results[0].id;
  if (!r) return null;
  const neu = await notion<{ id: string }>("/pages", "POST", { parent: { database_id: DB.jahre }, properties: { Jahr: { title: [{ type: "text", text: { content: jahr } }] } } });
  return neu?.id ?? null;
}

/** Steht das Stripe-Ereignis schon in „Rechnungen“? null = Notion nicht erreichbar. */
async function schonGebucht(ereignis: string): Promise<boolean | null> {
  const r = await notion<{ results?: unknown[] }>(`/databases/${DB.rechnungen}/query`, "POST", { filter: { property: "Notiz", rich_text: { contains: ereignis } }, page_size: 1 });
  return r ? (r.results?.length ?? 0) > 0 : null;
}

/** Stripe-Gebühr einer Zahlung in Cent. null, wenn nicht herauszufinden (dann wird ohne Gebühr gebucht). */
export async function stripeGebuehr(m: Pick<Meldung, "zahlungId" | "rechnungId">): Promise<number | null> {
  let zahlung = m.zahlungId;
  if (!zahlung && m.rechnungId) {
    // Neuere Stripe-Versionen hängen die Zahlung nicht mehr direkt an die Rechnung.
    const ip = await stripe<{ data?: { payment?: { payment_intent?: string | null } }[] }>(`/invoice_payments?invoice=${encodeURIComponent(m.rechnungId)}&limit=1`);
    zahlung = ip?.data?.[0]?.payment?.payment_intent ?? null;
    if (!zahlung) zahlung = (await stripe<{ payment_intent?: string | null }>(`/invoices/${encodeURIComponent(m.rechnungId)}`))?.payment_intent ?? null;
  }
  if (!zahlung) return null;
  const pi = await stripe<{ latest_charge?: { balance_transaction?: { fee?: number } | string | null } | string | null }>(
    `/payment_intents/${encodeURIComponent(zahlung)}?expand[]=latest_charge.balance_transaction`,
  );
  const bt = typeof pi?.latest_charge === "object" ? pi?.latest_charge?.balance_transaction : null;
  return bt && typeof bt === "object" && typeof bt.fee === "number" ? bt.fee : null;
}

async function legeAn(db: string, properties: Record<string, unknown>): Promise<boolean> {
  return Boolean(await notion<{ id: string }>("/pages", "POST", { parent: { database_id: db }, properties }));
}

/** Bucht eine Stripe-Zahlung (doppelt-sicher). false = später noch einmal versuchen. */
export async function bucheEinnahme(m: Meldung, kunde: StripeKunde | null): Promise<boolean> {
  if (m.art !== "bezahlt" || m.betrag === null || m.betrag <= 0) return true;
  const schon = await schonGebucht(m.ereignis);
  if (schon === null) return false;
  if (schon) return true;
  const datum = m.bezahltAm ?? heute();
  const [jahr, gebuehr] = await Promise.all([jahrSeite(datum.slice(0, 4)), stripeGebuehr(m).catch(() => null)]);
  const nr = rechnungsNummer(m.rechnungsNr, datum, m.zahlungId);
  const fremd = m.waehrung.toLowerCase() !== "eur" ? ` · Achtung: Währung ${m.waehrung.toUpperCase()}, Betrag bitte prüfen` : "";
  const e: Einnahme = {
    betragCent: m.betrag,
    datum,
    rechnungsNr: nr,
    typ: typFuer(m.abo, kunde ? (kunde.status ?? "") : null),
    zahlungsart: "Stripe",
    kundeSeite: kunde?.notionUrl ? seitenId(kunde.notionUrl) : null,
    jahrSeite: jahr,
    gebuehrCent: gebuehr,
    link: m.link,
    notiz: `Stripe-Ereignis ${m.ereignis}${kunde ? "" : " · Kunde nicht zugeordnet, bitte verknüpfen"}${fremd}`,
  };
  if (!(await legeAn(DB.rechnungen, einnahmeProps(e)))) return false;
  if (gebuehr && gebuehr > 0) {
    const ok = await legeAn(DB.ausgaben, gebuehrProps({ betragCent: gebuehr, datum, wofuer: `${kunde?.nr ?? "ohne Kunde"} · ${nr}`, link: m.link, jahrSeite: jahr }));
    if (!ok) console.error(`[finanzen] Gebühr für ${m.ereignis} nicht gebucht`);
  }
  return true;
}

/** Bucht eine Überweisung, die David über die Karte in #posteingang eingetragen hat. */
export async function bucheUeberweisung(k: { nr: string; notionUrl: string | null; betragCent: number; datum: string }): Promise<boolean> {
  const jahr = await jahrSeite(k.datum.slice(0, 4));
  return legeAn(
    DB.rechnungen,
    einnahmeProps({
      betragCent: k.betragCent,
      datum: k.datum,
      rechnungsNr: `ÜW-${k.datum.replace(/-/g, "")}-${k.nr}`,
      typ: "Anzahlung",
      zahlungsart: "Überweisung",
      kundeSeite: k.notionUrl ? seitenId(k.notionUrl) : null,
      jahrSeite: jahr,
      gebuehrCent: null,
      link: null,
      notiz: "Überweisung, eingetragen über #posteingang",
    }),
  );
}
