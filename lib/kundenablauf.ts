import type { EmbedLike } from "@/lib/discord-calls";
import { CHECKLISTE, LEERER_STAND, sterneName, type KartenStand } from "./kundenkarte-felder.ts";

// Knöpfe an der Kundenkarte und „Verloren“ mit Kundenarchiv (Plan 1, Etappe 2).
// Reine Logik ohne Netz, damit sie getestet werden kann.

/** Die Auswahl „Verlustgrund“ aus der Notion-Datenbank. */
export const VERLUSTGRUENDE = ["Zu teuer", "Kein Bedarf", "Konkurrent", "Keine Antwort", "Selbst gemacht", "Sonstiges"] as const;
export const VERLOREN = "Verloren";
export const F_VERLUSTGRUND = "Verlustgrund";
export const KUNDEN_KATEGORIE = "KUNDEN";
/** Getrennt vom Ticket-Archiv „ARCHIV“. */
export const ARCHIV_KATEGORIE = "KUNDENARCHIV";

export const grundAusIndex = (i: string): string | null => (/^\d+$/.test(i) ? (VERLUSTGRUENDE[Number(i)] ?? null) : null);

export const statusAusKarte = (karte: EmbedLike | null | undefined): string =>
  karte?.fields?.find((f) => f.name === "Status")?.value.trim() ?? "";

export const zielKategorie = (status: string) => (status === VERLOREN ? ARCHIV_KATEGORIE : KUNDEN_KATEGORIE);

/**
 * Knöpfe unter der Karte (seit Etappe 4, 16.11.2026: Knöpfe statt Notion):
 *   Reihe 1: 👥 Zuständige · 📝 Gesprächsbogen · 🧠 Gespräch auswerten · 🎨 Demo anfragen
 *   Reihe 2: 📌 Nächster Schritt · ✏️ Kontakt · 📧 E-Mail · ⚪ Verloren
 *   Reihe 3: Auswahl „✅ Checkliste“ (vorbelegt mit dem Stand der Karte)
 *   Reihe 4 und 5 erst nach „Live / Übergeben“: ⭐ Zufriedenheit, Referenz erlaubt ja/nein
 * Im Archiv nur 👥 Zuständige, 📝 Gesprächsbogen und ↩️ Wieder aufnehmen.
 */
export function kartenKnoepfe(status: string, demoStatus: string | null = null, stand: KartenStand = LEERER_STAND) {
  // disabled nur, wenn angegeben (der Demo-Knopf trägt es immer, gesperrt oder frei)
  const b = (label: string, emoji: string, id: string, style = 2, disabled?: boolean) => ({ type: 2, style, label, emoji: { name: emoji }, custom_id: id, ...(disabled === undefined ? {} : { disabled }) });
  if (status === VERLOREN) {
    return [{ type: 1, components: [b("Zuständige", "👥", "knd:zust"), b("Gesprächsbogen", "📝", "knd:bogen"), b("Wieder aufnehmen", "↩️", "knd:wieder", 3)] }];
  }
  // Solange eine Demo-Anfrage offen ist, ist „Demo anfragen“ gesperrt (keine doppelten Anfragen).
  const demoGesperrt = demoStatus === "angefragt" || demoStatus === "bestätigt" || demoStatus === "in Arbeit";
  const reihen: { type: number; components: Record<string, unknown>[] }[] = [
    { type: 1, components: [b("Zuständige", "👥", "knd:zust"), b("Gesprächsbogen", "📝", "knd:bogen"), b("Gespräch auswerten", "🧠", "knd:auswerten", 1), b("Demo anfragen", "🎨", "knd:demo", 2, demoGesperrt)] },
    { type: 1, components: [b("Nächster Schritt", "📌", "knd:schritt"), b("Kontakt", "✏️", "knd:kontakt"), b("E-Mail", "📧", "mail:start:kunde"), b("Verloren", "⚪", "knd:verloren")] },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: "knd:check",
          placeholder: "✅ Checkliste abhaken",
          min_values: 0,
          max_values: CHECKLISTE.length,
          options: CHECKLISTE.map(([name, kurz]) => ({ label: kurz, value: name, ...(stand.checkliste[name] ? { default: true } : {}) })),
        },
      ],
    },
  ];
  if (stand.live) {
    reihen.push(
      { type: 1, components: [{ type: 3, custom_id: "knd:sterne", placeholder: "⭐ Wie zufrieden ist der Kunde?", options: [1, 2, 3, 4, 5].map((n) => ({ label: sterneName(n), value: String(n) })) }] },
      { type: 1, components: [b("Referenz erlaubt", "✅", "knd:ref:ja", 3), b("Keine Referenz", "✖️", "knd:ref:nein")] },
    );
  }
  return reihen;
}

const knopfIds = (components: unknown) =>
  JSON.stringify(
    ((components ?? []) as { components?: { custom_id?: string; disabled?: boolean; options?: { value?: string; default?: boolean }[] }[] }[]).flatMap((r) =>
      (r.components ?? []).map(
        (c) => `${c.custom_id ?? ""}${c.disabled ? ":aus" : ""}${c.options ? `:${c.options.filter((o) => o.default).map((o) => o.value).join(",")}` : ""}`,
      ),
    ),
  );

/** Stehen an der Karte schon die richtigen Knöpfe für Status, Demo-Stand und Checkliste? */
export const knoepfePassen = (components: unknown, status: string, demoStatus: string | null = null, stand: KartenStand = LEERER_STAND) =>
  knopfIds(components) === knopfIds(kartenKnoepfe(status, demoStatus, stand));

/** Schritt 1 nach „⚪ Verloren“: Grund auswählen (nur für die Person sichtbar). */
export const verlustMenue = (kartenId: string) => [
  {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `knd:vgrund:${kartenId}`,
        placeholder: "Verlustgrund auswählen",
        min_values: 1,
        max_values: 1,
        options: VERLUSTGRUENDE.map((label, i) => ({ label, value: String(i) })),
      },
    ],
  },
];

/** Schritt 2: roter Knopf zum Bestätigen. */
export function verlustBestaetigung(kartenId: string, index: string) {
  return {
    content: `⚪ **Als verloren markieren?** Grund: **${grundAusIndex(index) ?? "?"}**\nDer Status in Notion wird „Verloren“, und der Kanal wandert in das ${ARCHIV_KATEGORIE}. Mit „Wieder aufnehmen“ lässt sich das rückgängig machen.`,
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 4, label: "Sicher: als verloren markieren", custom_id: `knd:vja:${kartenId}:${index}` },
          { type: 2, style: 2, label: "Abbrechen", custom_id: "knd:vnein" },
        ],
      },
    ],
  };
}

/** Setzt ein Feld (ersetzt es oder fügt es hinter „nach“ ein) oder entfernt es bei null. */
function mitFeld(karte: EmbedLike, name: string, value: string | null, nach: string): EmbedLike {
  const fields = (karte.fields ?? []).filter((f) => value !== null || f.name !== name);
  if (value !== null) {
    const i = fields.findIndex((f) => f.name === name);
    const feld = { name, value, inline: true };
    if (i >= 0) fields[i] = feld;
    else fields.splice(fields.findIndex((f) => f.name === nach) + 1, 0, feld);
  }
  return { ...karte, fields };
}

export const alsVerloren = (karte: EmbedLike, grund: string) =>
  mitFeld(mitFeld(karte, "Status", VERLOREN, ""), F_VERLUSTGRUND, grund, "Status");

export const alsWiederAufgenommen = (karte: EmbedLike) => mitFeld(mitFeld(karte, "Status", "Lead", ""), F_VERLUSTGRUND, null, "Status");

export const verlorenZeile = (grund: string, von: string, zeit: string) =>
  `⚪ **Verloren** (Grund: ${grund}), gesetzt von <@${von}> am ${zeit}. Der Kanal liegt jetzt im ${ARCHIV_KATEGORIE}.`;

export const wiederZeile = (von: string, zeit: string) =>
  `↩️ **Wieder aufgenommen** von <@${von}> am ${zeit}. Status ist wieder **Lead**.`;

/** „08.11.2026, 21:30“ in deutscher Zeit. */
export const jetztText = (d = new Date()) =>
  d.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Neue Reihenfolge der Kategorien, damit KUNDENARCHIV direkt über dem Ticket-ARCHIV steht.
 * Leer, wenn sie schon stimmt oder eine der beiden fehlt.
 */
export function archivReihenfolge(kanaele: { id: string; name: string; type: number; position: number }[]): { id: string; position: number }[] {
  const kats = kanaele
    .filter((c) => c.type === 4)
    .sort((a, b) => a.position - b.position || (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
  const name = (n: string) => kats.findIndex((c) => c.name.toLowerCase() === n.toLowerCase());
  const k = name(ARCHIV_KATEGORIE);
  const a = name("ARCHIV");
  if (k < 0 || a < 0 || k === a - 1) return [];
  const [kundenarchiv] = kats.splice(k, 1);
  kats.splice(name("ARCHIV"), 0, kundenarchiv);
  return kats.map((c, i) => ({ id: c.id, position: i }));
}
