import { findChannelId, listMessages } from "@/lib/discord";
import { aendereKarte, alleNachrichten, besitzerId, cardDomain, CH_ABLAGE, CH_KARTEN, CH_SPEICHER, postKarte, statistikKanal } from "@/lib/leads";
import { jetztText } from "@/lib/kundenablauf";
import { listeKunden } from "@/lib/notion-api";
import { kanalName } from "@/lib/notion-kunden";
import { rechneStatistik, snowflakeZeit, STAT_KNOPF, statistikKarte, type KundeEintrag, type LeadEintrag, type Statistik } from "@/lib/statistik";
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
  for (const k of kunden) {
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

/** Postet die Übersicht in #statistik (oder aktualisiert eine bestehende Karte). */
export async function zeigeStatistik(token: string, s: Statistik, nachricht?: { kanal: string; id: string }): Promise<boolean> {
  const karte = statistikKarte(s, jetztText());
  if (nachricht) return aendereKarte(token, nachricht.kanal, nachricht.id, karte, STAT_KNOPF);
  const kanal = await statistikKanal(token);
  if (!kanal) return false;
  return (await postKarte(token, kanal, karte, STAT_KNOPF)) !== null;
}

