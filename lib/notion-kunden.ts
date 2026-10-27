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
  let nr = wert(props["KND-Nr."]) || null;
  if (!nr) {
    const id = Number(wert(props["Kunden-ID"]));
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

export const CARD_MARKER = "Kundenkarte";

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
  add("Fortschritt", w("Fortschritt (%)") ? `${Math.round(Number(w("Fortschritt (%)")) * (Number(w("Fortschritt (%)")) <= 1 ? 100 : 1))} %` : "");
  add("E-Mail", w("E-Mail"));
  add("Telefon", w("Telefon"));
  add("Quelle", w("Quelle"));
  add("Setup-Preis", euro(w("Setup-Preis (€)")));
  add("Retainer pro Monat", euro(w("Retainer (€/Monat)")));
  add("Zahlungsstatus", w("Zahlungsstatus"));
  add("Nächstes Follow-up", w("Nächstes Follow-up"));
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
    if (name === "Notion") continue;
    const before = a.get(name) ?? "";
    if (before === value) continue;

    if (name === "Checkliste") {
      const lines = (s: string) => new Map(s.split("\n").map((l) => [l.slice(2), l.slice(0, 1)]));
      const la = lines(before);
      for (const [item, mark] of lines(value)) {
        if (la.get(item) !== mark) out.push(`${mark} **${item}**`);
      }
    } else if (name === "Fortschritt") {
      continue; // folgt aus der Checkliste, würde nur doppelt melden
    } else {
      out.push(`**${name}:** ${before || "leer"} → ${value}`);
    }
  }
  // Felder, die jetzt leer sind
  for (const [name, before] of a) {
    if (!n.has(name) && name !== "Notion" && name !== "Fortschritt") out.push(`**${name}:** ${before} → leer`);
  }
  return out;
}
