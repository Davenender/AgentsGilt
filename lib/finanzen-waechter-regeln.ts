// Finanzen A5 (16.11.2026): Wächter und Termine. Jeden Morgen schaut der Bot auf die Zahlen in Notion „Finanzen“:
// Monatsüberblick für David (nur #posteingang + Push, nie ins Team), Push bei 80 % und 100 % der
// Kleinunternehmer-Grenze, Erinnerung vor Steuerterminen. Was schon gemeldet ist, steht im „Bot-Merker“ der Jahreszeile.
// Reine Logik ohne Netz: tests/finanzen-waechter.test.ts. Netz: lib/finanzen-waechter.ts.
import type { EmbedLike } from "./discord-calls.ts";
import { betragText } from "./finanzen-regeln.ts";

export const GRENZE_CENT = 2_500_000;
export const WARN_CENT = 2_000_000;
const GRUNDFREIBETRAG_CENT = 1_234_800; // 2026, wie die Formel in Notion „Finanzjahre“

export const leseMerker = (s: string) => new Set(s.split(/[\s,;]+/).filter(Boolean));
export const schreibeMerker = (m: Set<string>) => [...m].sort().join(" ");

/** Push bei 80 % (20.000 €) und bei 25.000 €; ein Sprung über beide Stufen ergibt eine Meldung. */
export function grenzWarnung(umsatzCent: number, jahr: string, merker: Set<string>): { tokens: string[]; titel: string; text: string } | null {
  const stand = `Umsatz ${jahr}: ${betragText(umsatzCent)} von 25.000 €.`;
  if (umsatzCent >= GRENZE_CENT && !merker.has("grenze100")) {
    return {
      tokens: merker.has("grenze80") ? ["grenze100"] : ["grenze100", "grenze80"],
      titel: "⚠️ Kleinunternehmer-Grenze erreicht",
      text: `${stand} Laut Regel bist du ab nächstem Jahr kein Kleinunternehmer mehr und musst dann Umsatzsteuer auf deine Rechnungen schreiben. Bitte bald mit IHK oder Steuerberatung klären.`,
    };
  }
  if (umsatzCent >= WARN_CENT && !merker.has("grenze80") && !merker.has("grenze100")) {
    return { tokens: ["grenze80"], titel: "💶 80 % der Kleinunternehmer-Grenze", text: `${stand} Ab 25.000 € im Jahr bist du im nächsten Jahr kein Kleinunternehmer mehr.` };
  }
  return null;
}

const tagMs = 24 * 3600_000;
const alsTag = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ms = (tag: string) => Date.parse(`${tag}T00:00:00Z`);

/** Frist am Samstag oder Sonntag rutscht auf den Montag (Feiertage zählen hier nicht). */
export function werktag(tag: string): string {
  const wt = new Date(ms(tag)).getUTCDay();
  return wt === 6 ? alsTag(ms(tag) + 2 * tagMs) : wt === 0 ? alsTag(ms(tag) + tagMs) : tag;
}

export type Termin = { id: string; datum: string; was: string; stufen: number[] };

/** Termine eines Jahres: Steuererklärung fürs Vorjahr (ab 2026, Gewerbe seit 22.06.2026), Vorauszahlungen nur, wenn angehakt. */
export function steuerTermine(jahr: number, o: { estVoraus: boolean; gewstVoraus: boolean }): Termin[] {
  const t: Termin[] = [];
  if (jahr - 1 >= 2026) {
    t.push({ id: `erklaerung-${jahr - 1}`, datum: werktag(`${jahr}-07-31`), was: `Steuererklärung ${jahr - 1} (Einkommensteuer mit EÜR, Gewerbesteuer) über ELSTER`, stufen: [30, 7, 1] });
  }
  if (o.estVoraus) for (const m of ["03", "06", "09", "12"]) t.push({ id: `est-${jahr}-${m}`, datum: werktag(`${jahr}-${m}-10`), was: "Einkommensteuer-Vorauszahlung", stufen: [7, 1] });
  if (o.gewstVoraus) for (const m of ["02", "05", "08", "11"]) t.push({ id: `gewst-${jahr}-${m}`, datum: werktag(`${jahr}-${m}-15`), was: "Gewerbesteuer-Vorauszahlung", stufen: [7, 1] });
  return t.sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Je Termin höchstens eine Erinnerung: die engste fällige Stufe; die weiteren Stufen gelten damit als erledigt. */
export function faelligeTermine(heute: string, termine: Termin[], merker: Set<string>): { termin: Termin; tage: number; tokens: string[] }[] {
  const out: { termin: Termin; tage: number; tokens: string[] }[] = [];
  for (const termin of termine) {
    const tage = Math.round((ms(termin.datum) - ms(heute)) / tagMs);
    if (tage < 0) continue;
    const offen = termin.stufen.filter((s) => tage <= s && !merker.has(`${termin.id}:${s}`));
    if (!offen.length) continue;
    out.push({ termin, tage, tokens: offen.map((s) => `${termin.id}:${s}`) });
  }
  return out;
}

export function vormonat(heute: string): string {
  const [j, m] = heute.slice(0, 7).split("-").map(Number);
  return m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, "0")}`;
}

export function monatsGrenzen(ym: string): { von: string; bis: string } {
  const [j, m] = ym.split("-").map(Number);
  return { von: `${ym}-01`, bis: m === 12 ? `${j + 1}-01-01` : `${j}-${String(m + 1).padStart(2, "0")}-01` };
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const monatsName = (ym: string) => `${MONATE[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Faustregel wie in Notion: 25 % vom Gewinn über dem Grundfreibetrag. Keine Steuerberechnung. */
export const ruecklageCent = (gewinnCent: number) => Math.max(0, Math.round((gewinnCent - GRUNDFREIBETRAG_CENT) * 0.25));

const tagText = (tag: string) => tag.split("-").reverse().join(".");

/** Karte für #posteingang am Monatsanfang (oder auf Abruf mit dem Stand bis heute). */
export function ueberblickKarte(d: {
  monat: string;
  bisHeute?: boolean;
  einnahmenCent: number;
  ausgabenCent: number;
  rcCent: number;
  ohneBetrag: number;
  jahr: string;
  umsatzCent: number;
  kostenCent: number;
  naechster: { datum: string; was: string } | null;
}): EmbedLike & { color: number } {
  const gewinnJahr = d.umsatzCent - d.kostenCent;
  const prozent = Math.floor((d.umsatzCent / GRENZE_CENT) * 100);
  const fields = [
    { name: d.bisHeute ? "Im Monat bis heute" : "Im Monat", value: `Einnahmen ${betragText(d.einnahmenCent)} · Ausgaben ${betragText(d.ausgabenCent)} · Gewinn ${betragText(d.einnahmenCent - d.ausgabenCent)}` },
    { name: `Jahr ${d.jahr} bisher`, value: `Umsatz ${betragText(d.umsatzCent)} · Kosten ${betragText(d.kostenCent)} · Gewinn ${betragText(gewinnJahr)}` },
    { name: "Rücklage (Faustregel)", value: `${betragText(ruecklageCent(gewinnJahr))} zur Seite legen`, inline: true },
    { name: "Kleinunternehmer-Grenze", value: `${prozent} % von 25.000 €`, inline: true },
    ...(d.rcCent > 0 ? [{ name: "Reverse Charge", value: `${betragText(d.rcCent)} Ausgaben mit Reverse Charge. Ob du dafür Umsatzsteuer melden musst, kläre bei der IHK.` }] : []),
    ...(d.ohneBetrag > 0 ? [{ name: "Fehlt", value: `${d.ohneBetrag} ${d.ohneBetrag === 1 ? "Ausgabe" : "Ausgaben"} ohne Euro-Betrag, bitte in Notion „Ausgaben“ eintragen.` }] : []),
    ...(d.naechster ? [{ name: "Nächster Steuertermin", value: `${tagText(d.naechster.datum)}: ${d.naechster.was}` }] : []),
  ];
  return {
    title: `💶 Finanzen ${monatsName(d.monat)}${d.bisHeute ? " (bis heute)" : ""}`,
    description: "Nur für dich. Die Zahlen kommen aus Notion „Finanzen“, keine Steuerberatung.",
    color: gewinnJahr >= 0 ? 0x2e9e5b : 0xd4a23c,
    fields,
  };
}
