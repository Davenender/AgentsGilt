import type { EmbedLike } from "@/lib/discord-calls";

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

/** Knöpfe unter der Karte: „👥 Zuständige“ und je nach Status „⚪ Verloren“ oder „↩️ Wieder aufnehmen“. */
export function kartenKnoepfe(status: string) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 2, label: "Zuständige", emoji: { name: "👥" }, custom_id: "knd:zust" },
        status === VERLOREN
          ? { type: 2, style: 3, label: "Wieder aufnehmen", emoji: { name: "↩️" }, custom_id: "knd:wieder" }
          : { type: 2, style: 2, label: "Verloren", emoji: { name: "⚪" }, custom_id: "knd:verloren" },
      ],
    },
  ];
}

const knopfIds = (components: unknown) =>
  JSON.stringify(
    ((components ?? []) as { components?: { custom_id?: string }[] }[]).flatMap((r) => (r.components ?? []).map((c) => c.custom_id ?? "")),
  );

/** Stehen an der Karte schon die richtigen Knöpfe für diesen Status? */
export const knoepfePassen = (components: unknown, status: string) => knopfIds(components) === knopfIds(kartenKnoepfe(status));

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
