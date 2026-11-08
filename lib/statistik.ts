import type { EmbedLike } from "@/lib/discord-calls";
import { TEAM } from "./zustaendige.ts";

// Statistik (Plan 1, Etappe 6): Lead-Karten → Lead aktiv → Gespräch → Angebot → Kunde oder verloren,
// die häufigsten Verlustgründe und je Person übernommen und gewonnen. Reine Logik ohne Netz.

export interface LeadEintrag {
  /** Zeitpunkt der Lead-Karte (ms) */
  zeit: number;
  /** Discord-Kennung aus „Übernommen von“ */
  besitzer: string | null;
}

export interface KundeEintrag {
  status: string;
  verlustgrund: string | null;
  /** Discord-Kennungen der Zuständigen */
  zustaendig: string[];
  angebotRaus: boolean;
  /** Anlage der Notion-Zeile (ISO) */
  erstellt: string | null;
  /** Wurde ein Gespräch ausgewertet? */
  gespraech: boolean;
}

export interface Statistik {
  trichter: { leads: number; aktiv: number; gespraech: number; angebot: number; kunde: number; verloren: number };
  /** Anteil der aktiven Leads, die Kunde geworden sind, in Prozent */
  quote: number;
  letzte30: { leads: number; aktiv: number };
  verlustgruende: [string, number][];
  personen: { name: string; uebernommen: number; gewonnen: number }[];
}

const NACH_GESPRAECH = new Set(["Angebot gesendet", "Kunde", "Retainer läuft"]);
const GEWONNEN = new Set(["Kunde", "Retainer läuft"]);

export const snowflakeZeit = (id: string) => Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000));

export function rechneStatistik(leads: LeadEintrag[], kunden: KundeEintrag[], jetzt = Date.now()): Statistik {
  const grenze = jetzt - 30 * 86_400_000;
  const kunde = kunden.filter((k) => GEWONNEN.has(k.status));
  const verloren = kunden.filter((k) => k.status === "Verloren");
  const gruende = new Map<string, number>();
  for (const k of verloren) {
    const g = k.verlustgrund || "ohne Grund";
    gruende.set(g, (gruende.get(g) ?? 0) + 1);
  }
  return {
    trichter: {
      leads: leads.length,
      aktiv: kunden.length,
      gespraech: kunden.filter((k) => k.gespraech || NACH_GESPRAECH.has(k.status)).length,
      angebot: kunden.filter((k) => k.angebotRaus || NACH_GESPRAECH.has(k.status)).length,
      kunde: kunde.length,
      verloren: verloren.length,
    },
    quote: kunden.length ? Math.round((kunde.length / kunden.length) * 100) : 0,
    letzte30: {
      leads: leads.filter((l) => l.zeit >= grenze).length,
      aktiv: kunden.filter((k) => k.erstellt && Date.parse(k.erstellt) >= grenze).length,
    },
    verlustgruende: [...gruende.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    personen: TEAM.map((t) => ({
      name: t.name,
      uebernommen: leads.filter((l) => l.besitzer === t.discord).length,
      gewonnen: kunde.filter((k) => k.zustaendig.includes(t.discord)).length,
    })),
  };
}

export const STAT_KNOPF = [
  { type: 1, components: [{ type: 2, style: 2, label: "Aktualisieren", emoji: { name: "🔄" }, custom_id: "stat:neu" }] },
];

/** Die Übersicht als Karte für #statistik. */
export function statistikKarte(s: Statistik, stand: string): EmbedLike {
  const t = s.trichter;
  return {
    title: "📊 Kunden-Statistik",
    color: 0x14b8a6,
    description:
      `**Von der Lead-Karte zum Kunden** (seit Beginn)\n` +
      `🗂️ Lead-Karten: **${t.leads}**\n` +
      `🔴 Lead aktiv (in Notion): **${t.aktiv}**\n` +
      `🗣️ Gespräch geführt: **${t.gespraech}**\n` +
      `🟡 Angebot geschickt: **${t.angebot}**\n` +
      `🟢 Kunde: **${t.kunde}** · ⚪ Verloren: **${t.verloren}**\n` +
      `Abschlussquote: **${s.quote} %** der aktiven Leads\n\n` +
      `In den letzten 30 Tagen: **${s.letzte30.leads}** neue Lead-Karten, **${s.letzte30.aktiv}** neue aktive Leads.\n` +
      `-# Website-Anfragen kommen ohne Lead-Karte direkt bei „Lead aktiv“ dazu.`,
    fields: [
      {
        name: "Häufigste Verlustgründe",
        value: s.verlustgruende.length ? s.verlustgruende.slice(0, 6).map(([g, n]) => `${g}: ${n}`).join("\n") : "Noch keine verlorenen Kunden.",
        inline: true,
      },
      {
        name: "Je Person (übernommen · gewonnen)",
        value: s.personen.map((p) => `${p.name}: ${p.uebernommen} · ${p.gewonnen}`).join("\n"),
        inline: true,
      },
    ],
    footer: { text: `Stand ${stand} · kommt am 1. jedes Monats neu, mit 🔄 jederzeit` },
  };
}
