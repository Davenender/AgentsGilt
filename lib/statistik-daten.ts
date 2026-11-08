import { findChannelId, listMessages } from "@/lib/discord";
import { aendereKarte, alleNachrichten, besitzerId, cardDomain, CH_ABLAGE, CH_KARTEN, CH_SPEICHER, postKarte, statistikKanal } from "@/lib/leads";
import { jetztText } from "@/lib/kundenablauf";
import { listeKunden } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";
import { rechneStatistik, snowflakeZeit, STAT_KNOPF, statistikKarte, zaehltMit, type KundeEintrag, type LeadEintrag, type Statistik } from "@/lib/statistik";
import { sperreKundenkanal } from "@/lib/kundenkanal";
import { idsAusNotionProp } from "@/lib/zustaendige";

// Sammelt die Zahlen für die Statistik (Etappe 6) aus Discord und Notion. Liest nur.

export async function sammleStatistik(token: string): Promise<Statistik | null> {
  const kunden = await listeKunden();
  if (!kunden) return null;

  // Lead-Karten in #leads und #lead-ablage, dazu abgelehnte Firmen aus dem Merkzettel.
  const leads: LeadEintrag[] = [];
  for (const name of [CH_KARTEN, CH_ABLAGE]) {
    const ch = await findChannelId(token, name);
    if (!ch) continue;
    for (const m of await alleNachrichten(token, ch, 1000)) {
      if (m.author.bot && cardDomain(m)) leads.push({ zeit: snowflakeZeit(m.id), besitzer: besitzerId(m.embeds[0]) });
    }
  }
  const speicher = await findChannelId(token, CH_SPEICHER);
  if (speicher) {
    for (const m of await alleNachrichten(token, speicher, 1000)) {
      if (m.content.startsWith("abgelehnt")) leads.push({ zeit: snowflakeZeit(m.id), besitzer: null });
    }
  }

  // Kunden aus Notion; „Gespräch geführt“ = im Kundenkanal wurde ein Gespräch ausgewertet.
  const eintraege: KundeEintrag[] = [];
  for (const k of kunden.filter((x) => zaehltMit(x.nr))) {
    const kanal = await findChannelId(token, kanalName(k.nr));
    const msgs = kanal ? await listMessages(token, kanal, 100) : [];
    eintraege.push({
      status: k.status,
      verlustgrund: k.verlustgrund ?? null,
      zustaendig: idsAusNotionProp(k.zustaendig ?? []),
      angebotRaus: k.angebotRaus ?? false,
      erstellt: k.erstellt ?? null,
      gespraech: msgs.some((m) => m.author.bot && (m.content ?? "").startsWith("🧠 Gespräch ausgewertet")),
    });
  }
  return rechneStatistik(leads, eintraege);
}

/**
 * Postet die Übersicht in #statistik (oder aktualisiert eine bestehende Karte). Der Kanal wird dabei
 * so gesperrt wie die Kundenkanäle: Nur der Bot schreibt, alle anderen lesen und drücken Knöpfe.
 */
export async function zeigeStatistik(token: string, s: Statistik, nachricht?: { kanal: string; id: string }): Promise<{ gepostet: boolean; gesperrt: boolean }> {
  const karte = statistikKarte(s, jetztText());
  if (nachricht) return { gepostet: await aendereKarte(token, nachricht.kanal, nachricht.id, karte, STAT_KNOPF), gesperrt: true };
  const kanal = await statistikKanal(token);
  if (!kanal) return { gepostet: false, gesperrt: false };
  const gesperrt = await sperreKundenkanal(token, kanal);
  // Gibt es in diesem Monat schon eine Statistik-Karte, wird sie aktualisiert, sonst kommt eine neue (die alten bleiben als Verlauf).
  const monat = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 7);
  const letzte = (await listMessages(token, kanal, 20)).find((m) => m.author.bot && m.embeds[0]?.title === karte.title);
  if (letzte && monat(snowflakeZeit(letzte.id)) === monat(Date.now())) {
    return { gepostet: await aendereKarte(token, kanal, letzte.id, karte, STAT_KNOPF), gesperrt };
  }
  return { gepostet: (await postKarte(token, kanal, karte, STAT_KNOPF)) !== null, gesperrt };
}

/** Nur die Kanalrechte von #statistik prüfen und setzen (ohne zu posten). */
export async function sperreStatistik(token: string): Promise<boolean> {
  const kanal = await statistikKanal(token);
  return kanal ? sperreKundenkanal(token, kanal) : false;
}

