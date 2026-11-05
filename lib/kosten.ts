// Was Twilio und Vapi wirklich kosten: nur lesen, direkt bei den Anbietern. Die Zentrale holt das hierüber ab, weil nur der
// Server die Schlüssel hat. Schlüssel kommen nie in die Antwort.
type Abruf = typeof fetch;
type Monate<T> = { dieser: T | null; letzter: T | null };
export type VapiMonat = { betrag: number; anrufe: number; minuten: number };
export type KostenStand = { stand: string; twilio: Monate<number> & { waehrung: string; guthaben: number | null }; vapi: Monate<VapiMonat> };

const rund = (n: number) => Math.round(n * 100) / 100;
const ZONE = "Europe/Berlin";

/** Erster Tag des Monats (0 = dieser, -1 = letzter), Mitternacht in Berlin ungefähr genug für eine Abrechnung. */
export function monatsAnfang(jetzt: Date, versatz: number): string {
  const [j, m] = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit" }).format(jetzt).split("-").map(Number);
  return new Date(Date.UTC(j, m - 1 + versatz, 1)).toISOString();
}

async function twilioMonat(sid: string, token: string, zeitraum: "ThisMonth" | "LastMonth", abruf: Abruf): Promise<{ betrag: number; waehrung: string } | null> {
  try {
    const res = await abruf(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Usage/Records/${zeitraum}.json?Category=totalprice`, { headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const r = ((await res.json()) as { usage_records?: { price?: string; price_unit?: string }[] }).usage_records?.[0];
    return r?.price === undefined ? null : { betrag: rund(Number(r.price)), waehrung: (r.price_unit ?? "usd").toUpperCase() };
  } catch {
    return null;
  }
}

async function twilioGuthaben(sid: string, token: string, abruf: Abruf): Promise<number | null> {
  try {
    const res = await abruf(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Balance.json`, { headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const b = Number(((await res.json()) as { balance?: string }).balance);
    return Number.isFinite(b) ? rund(b) : null;
  } catch {
    return null;
  }
}

async function vapiMonat(schluessel: string, von: string, bis: string | null, abruf: Abruf): Promise<VapiMonat | null> {
  try {
    const res = await abruf(`https://api.vapi.ai/call?limit=1000&createdAtGe=${encodeURIComponent(von)}${bis ? `&createdAtLt=${encodeURIComponent(bis)}` : ""}`, { headers: { authorization: `Bearer ${schluessel}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { cost?: number; startedAt?: string; endedAt?: string }[];
    if (!Array.isArray(j)) return null;
    let betrag = 0;
    let ms = 0;
    for (const c of j) {
      betrag += c.cost ?? 0;
      if (c.startedAt && c.endedAt) ms += Math.max(0, Date.parse(c.endedAt) - Date.parse(c.startedAt));
    }
    return { betrag: rund(betrag), anrufe: j.length, minuten: Math.round(ms / 60_000) };
  } catch {
    return null;
  }
}

export async function kostenStand(jetzt = new Date(), abruf: Abruf = fetch, umgebung: Record<string, string | undefined> = process.env): Promise<KostenStand> {
  const sid = umgebung.TWILIO_ACCOUNT_SID;
  const token = umgebung.TWILIO_AUTH_TOKEN;
  const vapi = umgebung.VAPI_API_KEY;
  const [t1, t2, g, v1, v2] = await Promise.all([
    sid && token ? twilioMonat(sid, token, "ThisMonth", abruf) : null,
    sid && token ? twilioMonat(sid, token, "LastMonth", abruf) : null,
    sid && token ? twilioGuthaben(sid, token, abruf) : null,
    vapi ? vapiMonat(vapi, monatsAnfang(jetzt, 0), null, abruf) : null,
    vapi ? vapiMonat(vapi, monatsAnfang(jetzt, -1), monatsAnfang(jetzt, 0), abruf) : null,
  ]);
  return { stand: jetzt.toISOString(), twilio: { dieser: t1?.betrag ?? null, letzter: t2?.betrag ?? null, waehrung: t1?.waehrung ?? t2?.waehrung ?? "USD", guthaben: g }, vapi: { dieser: v1, letzter: v2 } };
}
