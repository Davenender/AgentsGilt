import type { EmbedLike } from "@/lib/discord-calls";

// Aus einem Notion-Webhook (Automation "Webhook senden") wird die Kundenkarte
// für den Discord-Kanal des Kunden gebaut, und es wird verglichen, was sich
// gegenüber der letzten Karte geändert hat.

type NotionProp = Record<string, unknown> & { type?: string };

export interface Kunde {
  nr: string | null; // "KND-004"
  name: string;
  url?: string;
  props: Record<string, NotionProp>;
}

const text = (arr: unknown): string =>
  Array.isArray(arr)
    ? arr
        .map((x) => (x as { plain_text?: string; text?: { content?: string } }).plain_text ?? (x as { text?: { content?: string } }).text?.content ?? "")
        .join("")
        .trim()
    : "";

/** Liest den Wert einer Notion-Eigenschaft als einfachen Text. */
export function wert(p: NotionProp | undefined): string {
  if (!p) return "";
  switch (p.type) {
    case "title":
    case "rich_text":
      return text(p[p.type]);
    case "select":
    case "status":
      return ((p[p.type] as { name?: string } | null)?.name ?? "").trim();
    case "multi_select":
      return ((p.multi_select as { name: string }[]) ?? []).map((o) => o.name).join(", ");
    case "people":
      return ((p.people as { name?: string }[]) ?? []).map((u) => u.name ?? "").filter(Boolean).join(", ");
    case "checkbox":
      return p.checkbox ? "ja" : "nein";
    case "number":
      return p.number === null || p.number === undefined ? "" : String(p.number);
    case "date": {
      const d = p.date as { start?: string; end?: string } | null;
      return d?.start ? (d.end ? `${d.start} bis ${d.end}` : d.start) : "";
    }
    case "rollup": {
      const r = p.rollup as { type?: string; number?: number | null } | null;
      return r?.type === "number" && r.number !== null && r.number !== undefined ? String(r.number) : "";
    }
    case "email":
    case "phone_number":
    case "url":
      return String(p[p.type] ?? "");
    case "unique_id": {
      const u = p.unique_id as { prefix?: string; number?: number } | null;
      return u?.number !== undefined ? `${u.prefix ? `${u.prefix}-` : ""}${u.number}` : "";
    }
    case "formula": {
      const f = p.formula as { type?: string; string?: string; number?: number; boolean?: boolean } | null;
      if (!f) return "";
      return String(f.string ?? f.number ?? f.boolean ?? "");
    }
    default:
      return "";
  }
}

/** Findet die Seite im Webhook (Notion packt sie je nach Fassung unter "data" oder direkt hinein). */
export function parseKunde(payload: unknown): Kunde | null {
  const root = payload as { data?: unknown } | undefined;
  const page = (root?.data ?? payload) as
    | { object?: string; url?: string; properties?: Record<string, NotionProp> }
    | undefined;
  const props = page?.properties;
  if (!props || typeof props !== "object") return null;

  const titleProp = Object.values(props).find((p) => p?.type === "title");
  const name = wert(titleProp);
  let nr = wert(props["KND-Nr."]).match(/^KND-\d{3,}$/) ? wert(props["KND-Nr."]) : null;
  if (!nr) {
    // Die Kunden-ID kommt als "2" oder mit Vorsilbe als "KND-2".
    const id = Number(wert(props["Kunden-ID"]).match(/(\d+)$/)?.[1]);
    if (Number.isFinite(id) && id > 0) nr = `KND-${String(id).padStart(3, "0")}`;
  }
  return { nr, name, url: page?.url, props };
}

/** "KND-004" -> "knd_004" (so heißen die Kanäle). */
export function kanalName(nr: string): string {
  return nr.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

const CHECKLIST = [
  "Angebot raus",
  "Vertrag unterschrieben",
  "AVV unterschrieben",
  "Anzahlung erhalten",
  "Material erhalten",
  "Abnahme erfolgt",
  "Live / Übergeben",
];

const euro = (v: string) => (v ? `${Number(v).toLocaleString("de-DE")} €` : "");

/** "2026-10-30" -> "30.10.2026", "2026-10-30T14:00:00.000+01:00" -> "30.10.2026, 14:00 Uhr". */
function datum(v: string): string {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return v;
  const tag = `${m[3]}.${m[2]}.${m[1]}`;
  return m[4] && !(m[4] === "00" && m[5] === "00") ? `${tag}, ${m[4]}:${m[5]} Uhr` : tag;
}

/** Die Formel liefert 0 bis 1 oder 0 bis 100, beides wird zu "29 %". */
const prozent = (v: string) => {
  if (v === "") return "";
  const n = Number(v);
  return `${Math.round(n <= 1 ? n * 100 : n)} %`;
};

const stunden = (v: string) =>
  v === "" ? "" : `${Number(v).toLocaleString("de-DE", { maximumFractionDigits: 1 })} h`;

export const CARD_MARKER = "Kundenkarte";

/** Felder, die sich ständig ändern und deshalb keine eigene Zeile im Kanal bekommen. */
const OHNE_MELDUNG = new Set(["Zeit gesamt", "Fortschritt", "Notion"]);

/** Baut die Karte, die im Kundenkanal steht und bei Änderungen überschrieben wird. */
export function kundenKarte(k: Kunde): EmbedLike {
  const w = (n: string) => wert(k.props[n]);
  const fields: { name: string; value: string; inline: boolean }[] = [];
  const add = (name: string, value: string, inline = true) => {
    if (value.trim()) fields.push({ name, value: value.trim(), inline });
  };

  add("Status", w("Status"));
  add("Angebot", w("Angebot"));
  add("Zuständig", w("Zuständig"));
  add("Fortschritt", prozent(w("Fortschritt (%)")));
  add("Zeit gesamt", stunden(w("Gesamtstunden")));
  add("Zahlungsstatus", w("Zahlungsstatus"));
  add("Setup-Preis", euro(w("Setup-Preis (€)")));
  add("Retainer pro Monat", euro(w("Retainer (€/Monat)")));
  add("Quelle", w("Quelle"));
  add("E-Mail", w("E-Mail"));
  add("Telefon", w("Telefon"));
  add("Nächster Termin", datum(w("Nächstes Follow-up")));
  add("Nächster Schritt", w("Nächster Schritt"), false);
  fields.push({
    name: "Checkliste",
    value: CHECKLIST.map((c) => `${wert(k.props[c]) === "ja" ? "✅" : "⬜"} ${c}`).join("\n"),
    inline: false,
  });
  if (k.url) fields.push({ name: "Notion", value: `[Kundenseite öffnen](${k.url})`, inline: false });

  return {
    title: `${k.nr ?? "Kunde"} · ${k.name || "ohne Namen"}`,
    color: 0xd4a23c,
    fields,
    footer: { text: `${CARD_MARKER} · wird automatisch aus Notion aktualisiert` },
  };
}

const fieldMap = (e: EmbedLike | null) =>
  new Map((e?.fields ?? []).map((f) => [f.name, f.value]));

/** Einzeiler für die Änderungen zwischen alter und neuer Karte. */
export function aenderungen(alt: EmbedLike | null, neu: EmbedLike): string[] {
  if (!alt) return [];
  const a = fieldMap(alt);
  const n = fieldMap(neu);
  const out: string[] = [];

  for (const [name, value] of n) {
    if (OHNE_MELDUNG.has(name)) continue;
    const before = a.get(name) ?? "";
    if (before === value) continue;
    if (name === "Checkliste") {
      // Pro Punkt eine Zeile: nur was sich wirklich geändert hat.
      const lines = (t: string) => new Map(t.split("\n").map((l) => [l.slice(2), l.slice(0, 1)]));
      const la = lines(before);
      for (const [item, mark] of lines(value)) {
        if (la.get(item) !== mark) out.push(`${mark} **${item}**`);
      }
    } else {
      out.push(`**${name}:** ${before || "leer"} → ${value}`);
    }
  }
  // Felder, die jetzt leer sind
  for (const [name, before] of a) {
    if (!n.has(name) && !OHNE_MELDUNG.has(name)) out.push(`**${name}:** ${before} → leer`);
  }
  return out;
}
