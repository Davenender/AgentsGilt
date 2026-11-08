import type { EmbedLike } from "@/lib/discord-calls";

// „Demo anfragen“ (Plan 1, Etappe 5, Discord-Teil). Reine Logik ohne Netz, damit sie getestet werden kann.
// Ablauf: Zuständige fragen an der Kundenkarte an (rote Bestätigung) → Notion „Demo-Status“ = angefragt,
// Push nur an David → David bestätigt in der Zentrale (Plan 3) → in Arbeit → fertig mit Link, der Bot
// postet ihn im Kundenkanal und markiert die Person, die angefragt hat.

export const F_DEMO = "Demo";
export const DEMO_STATUS = ["angefragt", "bestätigt", "in Arbeit", "fertig"] as const;
export type DemoAktion = "bestaetigen" | "in-arbeit" | "fertig" | "ablehnen";

export const demoOffen = (status: string | null | undefined) => status === "angefragt" || status === "bestätigt" || status === "in Arbeit";

const ZEILE: Record<string, string> = {
  angefragt: "🎨 angefragt, wartet auf Davids Bestätigung",
  bestätigt: "✅ bestätigt, wird vorbereitet",
  "in Arbeit": "🔨 in Arbeit",
  fertig: "🌐 fertig",
};

/** Das Feld „Demo“ an der Kundenkarte. */
export function demoFeldText(status: string, link: string | null, anfrage: { von: string; zeit: string } | null): string {
  const erste = status === "fertig" && link ? `🌐 fertig: [Demo ansehen](${link})` : (ZEILE[status] ?? status);
  return anfrage ? `${erste}\nangefragt von <@${anfrage.von}> am ${anfrage.zeit}` : erste;
}

/** Liest das Feld „Demo“ aus der Karte. */
export function demoAusKarte(karte: EmbedLike | null | undefined): { status: string | null; von: string | null; zeit: string | null } | null {
  const v = karte?.fields?.find((f) => f.name === F_DEMO)?.value;
  if (!v) return null;
  const erste = v.split("\n")[0];
  const status = erste.startsWith("🌐") ? "fertig" : (Object.entries(ZEILE).find(([, z]) => z === erste)?.[0] ?? null);
  const m = v.match(/angefragt von <@!?(\d+)> am ([^\n]+)/);
  return { status, von: m?.[1] ?? null, zeit: m?.[2]?.trim() ?? null };
}

/** Feld aus dem Stand in Notion; wer wann angefragt hat, bleibt aus der alten Karte erhalten. */
export function demoFeldAusNotion(status: string, link: string, alt: EmbedLike | null | undefined): string | null {
  if (!status) return null;
  const a = demoAusKarte(alt);
  return demoFeldText(status, link || null, a?.von && a.zeit ? { von: a.von, zeit: a.zeit } : null);
}

/** Setzt das Feld „Demo“ hinter „Zuständig“ (oder entfernt es bei null). */
export function mitDemo(karte: EmbedLike, text: string | null): EmbedLike {
  const fields = (karte.fields ?? []).filter((f) => f.name !== F_DEMO);
  if (text) {
    const i = fields.findIndex((f) => f.name === "Zuständig");
    fields.splice(i >= 0 ? i + 1 : fields.length, 0, { name: F_DEMO, value: text, inline: false });
  }
  return { ...karte, fields };
}

export const demoBestaetigung = (kartenId: string) => ({
  content:
    "🎨 **Demo anfragen?** David bekommt eine Nachricht und bestätigt die Anfrage in der Zentrale. Danach wird die Demo vorbereitet.\nDas lässt sich **nicht zurücknehmen**.",
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 4, label: "Sicher: Demo anfragen", custom_id: `knd:demoja:${kartenId}` },
        { type: 2, style: 2, label: "Abbrechen", custom_id: "knd:demonein" },
      ],
    },
  ],
});

export function pruefeDemoAktion(
  body: unknown,
): { ok: true; nr: string; aktion: DemoAktion; link: string | null; grund?: string } | { ok: false; grund: string } {
  const b = (body ?? {}) as { nr?: unknown; aktion?: unknown; link?: unknown; grund?: unknown };
  const nr = typeof b.nr === "string" ? b.nr.trim().toUpperCase() : "";
  if (!/^KND-\d{3,}$/.test(nr)) return { ok: false, grund: "nr fehlt oder ist ungültig (z. B. KND-003)" };
  const aktion = b.aktion;
  if (aktion !== "bestaetigen" && aktion !== "in-arbeit" && aktion !== "fertig" && aktion !== "ablehnen") {
    return { ok: false, grund: "aktion muss bestaetigen, in-arbeit, fertig oder ablehnen sein" };
  }
  if (aktion === "ablehnen") {
    const g = typeof b.grund === "string" ? b.grund.trim().slice(0, 300) : "";
    return { ok: true, nr, aktion, link: null, ...(g ? { grund: g } : {}) };
  }
  let link: string | null = null;
  if (aktion === "fertig") {
    try {
      const roh = String(b.link ?? "").trim();
      if (new URL(roh).protocol !== "https:") throw new Error("kein https");
      link = roh;
    } catch {
      return { ok: false, grund: "fertig braucht einen https-Link zur Demo" };
    }
  }
  return { ok: true, nr, aktion, link };
}

/** Neuer Demo-Status; null = leeren (abgebrochen). */
export const statusNachAktion = (a: DemoAktion) => (a === "bestaetigen" ? "bestätigt" : a === "in-arbeit" ? "in Arbeit" : a === "fertig" ? "fertig" : null);

export function demoZeile(art: "anfrage" | "sofort" | DemoAktion, d: { von?: string | null; zeit?: string; link?: string | null; grund?: string }): string {
  switch (art) {
    case "anfrage":
      return `🎨 **Demo angefragt** von <@${d.von}> am ${d.zeit}. David bestätigt sie in der Zentrale.`;
    case "sofort":
      return `🎨 **Demo gestartet** von <@${d.von}> am ${d.zeit}.`;
    case "bestaetigen":
      return "✅ **Demo bestätigt.** David bereitet sie vor.";
    case "in-arbeit":
      return "🔨 **Demo in Arbeit.**";
    case "fertig":
      return `🌐 **Die Demo ist fertig:** ${d.link}${d.von ? `\n<@${d.von}>, schau sie dir an.` : ""}`;
    case "ablehnen":
      return `❌ **Demo-Anfrage abgebrochen.**${d.von ? ` <@${d.von}>,` : ""} David hat sie nicht bestätigt.${d.grund ? ` Grund: ${d.grund}` : ""}`;
  }
}

export const demoPush = (kunde: string, von: string) => ({
  titel: "🎨 Demo-Anfrage",
  text: `${von} möchte eine Demo für ${kunde}. Bitte in der Zentrale bestätigen.`,
});

/** Welche Schritte aus der Zentrale zum aktuellen Stand passen. */
export function erlaubteAktion(aktuell: string | null | undefined, aktion: DemoAktion): boolean {
  if (aktion === "bestaetigen") return aktuell === "angefragt";
  if (aktion === "in-arbeit") return aktuell === "angefragt" || aktuell === "bestätigt";
  if (aktion === "ablehnen") return demoOffen(aktuell);
  return demoOffen(aktuell);
}
