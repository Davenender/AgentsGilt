import { NextResponse } from "next/server";
import { findChannelId, postText, setzeKanalName } from "@/lib/discord";
import { gleicheZustaendigAb, ordneKanalEin, sichereKundenarchiv, sperreKundenkanal } from "@/lib/kundenkanal";
import { arbeitszeitenSeit, eigeneNotionId, inPapierkorb, listeKunden, setzeStatus } from "@/lib/notion-api";
import { ladeStaende, schreibePrivat } from "@/lib/kunden-stand";
import { werHat } from "@/lib/notion-sperre";
import { davidNotion, STEMPEL_HINWEIS, wendeSperreAn } from "@/lib/notion-sperre-anwenden";
import { discordIdFuer } from "@/lib/zustaendige";
import { belege, statusAusBelegen, statusZeile } from "@/lib/status-regeln";
import { kanalName, kanalNameMitPunkt, statusPunkt, wert } from "@/lib/notion-kunden";
import { zeitplanGebremst } from "@/lib/zeitplan";
import { ladeTeam } from "@/lib/team-daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gleicht den Farbpunkt vor den Kundenkanälen (🔴knd_004) mit dem Status in Notion ab.
// Normalerweise passt das schon der Notion-Webhook an; dieser Abgleich (stündlich von
// cron-job.org) fängt Fälle auf, in denen Notion nichts geschickt hat oder Discord das
// Umbenennen gebremst hat.
//
// Außerdem je Kundenkanal (Plan 1, Etappe 1):
//   - Kanalrechte: nur der Bot schreibt, alle anderen lesen und drücken Knöpfe.
//   - Karte: alte Karten bekommen das Feld „Zuständig“ (Erwähnungen) und den Knopf „👥 Zuständige“.
//   - Kategorie: „Verloren“ liegt im KUNDENARCHIV, alles andere unter KUNDEN; die Knöpfe passen zum Status.
//   - Zuständig: Die Karte gilt. Wurde das Feld in Notion von Hand geändert, wird es zurückgesetzt.
//   - Notion-Sperre (Etappe 6): gesperrte Felder, die das Team geändert hat und zu denen keine Meldung kam, zurück
//     auf den gültigen Stand (mit DM); Einträge in „Arbeitszeiten“, die nicht David angelegt hat, in den Papierkorb.
//   - Status von selbst (Etappe 5): fehlt nach festen Belegen ein Schritt (z. B. Notion hat zum Häkchen
//     nichts geschickt), setzt der Abgleich ihn nach, nur vorwärts, mit Zeile im Kundenkanal.
// Der Aufruf braucht kein Geheimnis: Er stellt nur den gültigen Stand wieder her.

/** Ab dann gilt die Notion-Sperre für Arbeitszeiten (ältere Einträge bleiben, wie sie sind). */
const SPERRE_AB = "2026-11-16T00:00:00.000Z";

async function laufen() {
  const bremse = zeitplanGebremst("kunden");
  if (bremse) return bremse;
  const token = process.env.DISCORD_BOT_TOKEN;
  await ladeTeam(token);
  if (!token) return NextResponse.json({ error: "Kein Bot-Token" }, { status: 500 });
  const kunden = await listeKunden();
  if (!kunden) return NextResponse.json({ error: "Notion nicht erreichbar" }, { status: 502 });

  // Die Kategorie KUNDENARCHIV gibt es immer, direkt über dem Ticket-ARCHIV.
  const kundenarchiv = Boolean(await sichereKundenarchiv(token));

  let geprueft = 0;
  let fehler = 0;
  let gesperrt = 0;
  const zuruecksetzungen: string[] = [];
  const statusGesetzt: string[] = [];
  const gesperrtZurueck: string[] = [];
  const staende = await ladeStaende(token);
  for (const k of kunden) {
    // Etappe 6: Notion-Sperre vor „Status von selbst“, damit der mit den gültigen Werten rechnet
    if (staende && k.roh) {
      const sp = await wendeSperreAn(token, { nr: k.nr, name: k.name, props: k.roh, seite: k.notionUrl ?? null, editor: k.zuletztVon ?? null }, staende);
      if (sp.art === "zuruecksetzen") {
        gesperrtZurueck.push(`${k.nr}: ${sp.felder.join(", ")}`);
        const p = k.roh as Record<string, Parameters<typeof wert>[0]>;
        k.status = wert(p["Status"]);
        k.angebotRaus = wert(p["Angebot raus"]) === "ja";
        k.anzahlung = wert(p["Anzahlung erhalten"]) === "ja";
        k.zahlungsstatus = wert(p["Zahlungsstatus"]) || null;
      }
      if (sp.art === "fehler") fehler++;
    }
    const auto = statusAusBelegen(belege({ status: k.status, angebotRaus: Boolean(k.angebotRaus), anzahlungHaken: Boolean(k.anzahlung), zahlungsstatus: k.zahlungsstatus ?? "" }));
    const neuGesetzt = Boolean(auto && k.notionUrl && (await setzeStatus(k.notionUrl, auto)));
    if (auto && neuGesetzt) {
      k.status = auto;
      statusGesetzt.push(`${k.nr}: ${auto}`);
    }
    const kanal = await findChannelId(token, kanalName(k.nr));
    if (!kanal) continue;
    geprueft++;
    if (auto && neuGesetzt) await postText(token, kanal, statusZeile(auto));
    if (statusPunkt(k.status) && !(await setzeKanalName(token, kanal, kanalNameMitPunkt(k.nr, k.status)))) fehler++;
    if (statusPunkt(k.status) && !(await ordneKanalEin(token, kanal, k.status))) fehler++;
    if (await sperreKundenkanal(token, kanal)) gesperrt++;
    else fehler++;
    const z = await gleicheZustaendigAb(token, kanal, k);
    if (z === "zurückgesetzt") zuruecksetzungen.push(k.nr);
    if (z === "Notion-Fehler") fehler++;
  }
  // Etappe 6: Ein- und Ausstempeln nur David. Was das Team seit dem Start der Sperre angelegt hat, kommt in den Papierkorb.
  let stempelEntfernt = 0;
  const bot = await eigeneNotionId();
  for (const e of (await arbeitszeitenSeit(SPERRE_AB)) ?? []) {
    if (werHat(e.erstelltVon, bot, davidNotion()) !== "team" || !(await inPapierkorb(e.id))) continue;
    stempelEntfernt++;
    const person = e.erstelltVon ? discordIdFuer(e.erstelltVon) : null;
    if (person) await schreibePrivat(token, person, STEMPEL_HINWEIS(e.taetigkeit));
  }
  return NextResponse.json({ ok: true, kunden: kunden.length, kundenarchiv, geprueft, gesperrt, zuruecksetzungen, statusGesetzt, gesperrtZurueck, stempelEntfernt, staende: Boolean(staende), fehler });
}

export async function GET() {
  return laufen();
}

export async function POST() {
  return laufen();
}
