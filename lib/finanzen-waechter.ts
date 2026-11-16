// Finanzen A5 (16.11.2026): Wächter und Termine, läuft jeden Morgen (Vercel-Cron, /api/finanzen/waechter).
// Regeln: lib/finanzen-waechter-regeln.ts. Liest Notion „Rechnungen“ und „Ausgaben“, merkt sich Gemeldetes im
// „Bot-Merker“ der Jahreszeile in „Finanzjahre“. Meldet nur an David: #posteingang und Push (NTFY_TOPIC_DAVID).
import { DB, jahrSeite, notion } from "@/lib/finanzen";
import {
  faelligeTermine,
  grenzWarnung,
  leseMerker,
  monatsGrenzen,
  schreibeMerker,
  steuerTermine,
  ueberblickKarte,
  vormonat,
} from "@/lib/finanzen-waechter-regeln";
import { betragText } from "@/lib/finanzen-regeln";
import { call, posteingangKanal } from "@/lib/leads";
import { pusheDavid } from "@/lib/ntfy";

const FINANZEN_URL = "https://www.notion.so/41a03fa227fb813190abff0c4c504b6c";
type Props = Record<string, { number?: number | null; checkbox?: boolean; rich_text?: { plain_text?: string }[] } | undefined>;
type Zeile = { properties: Props };

const berlinTag = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
const cent = (p: Props[string]) => (typeof p?.number === "number" ? Math.round(p.number * 100) : null);
const zeitraum = (feld: string, von: string, bis: string) => ({ and: [{ property: feld, date: { on_or_after: von } }, { property: feld, date: { before: bis } }] });
const tagText = (tag: string) => tag.split("-").reverse().join(".");

/** Alle Zeilen einer Datenbank zum Filter (blättert). null = Notion nicht erreichbar. */
async function alleZeilen(db: string, filter: unknown): Promise<Zeile[] | null> {
  const out: Zeile[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const r = await notion<{ results: Zeile[]; has_more: boolean; next_cursor: string | null }>(`/databases/${db}/query`, "POST", {
      filter,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    if (!r) return null;
    out.push(...r.results);
    if (!r.has_more || !r.next_cursor) break;
    cursor = r.next_cursor;
  }
  return out;
}

/** Bezahlte Einnahmen im Zeitraum (Notion „Rechnungen“, nach „Bezahlt am“) in Cent. */
async function einnahmen(von: string, bis: string): Promise<number | null> {
  const z = await alleZeilen(DB.rechnungen, zeitraum("Bezahlt am", von, bis));
  return z ? z.reduce((s, r) => s + (cent(r.properties["Betrag (€)"]) ?? 0), 0) : null;
}

/** Ausgaben im Zeitraum: Summe, davon Reverse Charge, und wie viele noch keinen Euro-Betrag haben. */
async function ausgaben(von: string, bis: string): Promise<{ cent: number; rcCent: number; ohne: number } | null> {
  const z = await alleZeilen(DB.ausgaben, zeitraum("Datum", von, bis));
  if (!z) return null;
  return z.reduce(
    (s, r) => {
      const c = cent(r.properties["Betrag (€)"]);
      return {
        cent: s.cent + (c ?? 0),
        rcCent: s.rcCent + (r.properties["Reverse Charge"]?.checkbox ? (c ?? 0) : 0),
        ohne: s.ohne + (c === null ? 1 : 0),
      };
    },
    { cent: 0, rcCent: 0, ohne: 0 },
  );
}

export type WaechterErgebnis = { ok: true; heute: string; meldungen: string[]; ueberblick: string | null; umsatzCent: number; kostenCent: number } | { ok: false; grund: string };

/**
 * Ein Lauf: Grenze prüfen, Steuertermine erinnern, am Monatsanfang den Überblick des Vormonats schicken.
 * `zeigen`: Überblick des laufenden Monats bis heute sofort schicken (ändert den Merker nicht).
 */
export async function finanzWaechter(token: string | undefined, jetzt = new Date(), o: { zeigen?: boolean } = {}): Promise<WaechterErgebnis> {
  const heute = berlinTag(jetzt);
  const jahr = heute.slice(0, 4);
  const seite = await jahrSeite(jahr);
  const page = seite ? await notion<{ properties: Props }>(`/pages/${seite}`, "GET") : null;
  if (!seite || !page) return { ok: false, grund: "Notion „Finanzjahre“ nicht erreichbar" };

  const p = page.properties;
  const merker = leseMerker((p["Bot-Merker"]?.rich_text ?? []).map((t) => t.plain_text ?? "").join(""));
  const vorher = schreibeMerker(merker);
  const voraus = { estVoraus: p["ESt-Vorauszahlungen"]?.checkbox === true, gewstVoraus: p["GewSt-Vorauszahlungen"]?.checkbox === true };
  const naechstesJahr = String(Number(jahr) + 1);
  const [umsatzCent, kosten] = await Promise.all([einnahmen(`${jahr}-01-01`, `${naechstesJahr}-01-01`), ausgaben(`${jahr}-01-01`, `${naechstesJahr}-01-01`)]);
  if (umsatzCent === null || !kosten) return { ok: false, grund: "Notion „Rechnungen“ oder „Ausgaben“ nicht erreichbar" };

  const meldungen: { titel: string; text: string }[] = [];
  const grenze = grenzWarnung(umsatzCent, jahr, merker);
  if (grenze) {
    grenze.tokens.forEach((t) => merker.add(t));
    meldungen.push(grenze);
  }
  for (const f of faelligeTermine(heute, steuerTermine(Number(jahr), voraus), merker)) {
    f.tokens.forEach((t) => merker.add(t));
    const wann = f.tage === 0 ? "Heute ist die Frist" : `In ${f.tage} ${f.tage === 1 ? "Tag" : "Tagen"}, am ${tagText(f.termin.datum)}`;
    meldungen.push({ titel: `🗓️ ${f.termin.was}`, text: `${wann}: ${f.termin.was}.` });
  }

  // Monatsüberblick: am Monatsanfang der Vormonat (einmal), auf Abruf der laufende Monat bis heute.
  const monat = o.zeigen ? heute.slice(0, 7) : vormonat(heute);
  let karte: ReturnType<typeof ueberblickKarte> | null = null;
  if (o.zeigen || !merker.has(`monat:${monat}`)) {
    const g = monatsGrenzen(monat);
    const mJahr = monat.slice(0, 4);
    const [mE, mA, jE, jA] = await Promise.all([
      einnahmen(g.von, g.bis),
      ausgaben(g.von, g.bis),
      mJahr === jahr ? Promise.resolve(umsatzCent) : einnahmen(`${mJahr}-01-01`, `${jahr}-01-01`),
      mJahr === jahr ? Promise.resolve(kosten) : ausgaben(`${mJahr}-01-01`, `${jahr}-01-01`),
    ]);
    if (mE === null || !mA || jE === null || !jA) return { ok: false, grund: "Notion für den Monatsüberblick nicht erreichbar" };
    const naechster = [...steuerTermine(Number(jahr), voraus), ...steuerTermine(Number(jahr) + 1, voraus)].find((t) => t.datum >= heute) ?? null;
    karte = ueberblickKarte({
      monat,
      bisHeute: o.zeigen,
      einnahmenCent: mE,
      ausgabenCent: mA.cent,
      rcCent: mA.rcCent,
      ohneBetrag: mA.ohne,
      jahr: mJahr,
      umsatzCent: jE,
      kostenCent: jA.cent,
      naechster,
    });
    if (!o.zeigen) merker.add(`monat:${monat}`);
  }

  // Erst merken, dann melden: lieber einmal zu wenig als jeden Morgen dasselbe.
  const neu = schreibeMerker(merker);
  if (neu !== vorher) {
    const ok = await notion(`/pages/${seite}`, "PATCH", { properties: { "Bot-Merker": { rich_text: [{ type: "text", text: { content: neu.slice(0, 2000) } }] } } });
    if (!ok) return { ok: false, grund: "Bot-Merker nicht gespeichert, nichts gemeldet" };
  }

  const pe = token ? await posteingangKanal(token) : null;
  for (const m of meldungen) {
    await pusheDavid(m.titel, m.text, FINANZEN_URL);
    if (pe && token) await call(token, "POST", `/channels/${pe}/messages`, { content: `**${m.titel}**\n${m.text}`, allowed_mentions: { parse: [] } });
  }
  if (karte && pe && token) {
    await call(token, "POST", `/channels/${pe}/messages`, { embeds: [{ ...karte, url: FINANZEN_URL }], allowed_mentions: { parse: [] } });
    if (!o.zeigen) await pusheDavid(karte.title ?? "💶 Finanzen", `Jahr ${jahr} bisher: Umsatz ${betragText(umsatzCent)}, Kosten ${betragText(kosten.cent)}`, FINANZEN_URL);
  }
  console.log(`[finanzen] Wächter ${heute}: ${meldungen.length} Meldungen${karte ? `, Überblick ${monat}` : ""}`);
  return { ok: true, heute, meldungen: meldungen.map((m) => m.titel), ueberblick: karte?.title ?? null, umsatzCent, kostenCent: kosten.cent };
}
