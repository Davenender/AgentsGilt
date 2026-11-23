// Knöpfe und Fenster der Support-Tickets in Discord (custom_id „ticket:…“), aus app/api/discord/route.ts
// herausgezogen (Prompt 18, 23.11.2026). Regeln ohne Netz: lib/support-sperre.ts, lib/support-ablauf.ts,
// lib/support-anruf.ts; Netz: lib/support.ts.
//
// Seit Prompt 18:
// - Erst übernehmen, dann handeln: Alle Knöpfe (Antworten, Anruf anbieten, Schnellantwort, Sperren, Entsperren,
//   Dauerhaft sperren, Chat beenden, Noch Fragen?, Abschluss, Ticket schließen) gehen nur für den, der das Ticket
//   übernommen hat. Andere sehen nur für sich „Übernimm zuerst das Ticket.“ bzw. „Das Ticket hat <@…> übernommen.“
//   (Schalter CHEF_DARF_ALLES für eine spätere Ausnahme, zunächst aus.)
// - Sperren von Hand nur mit Beleg (Grund wählen, die KI sucht die Stelle: lib/sperr-beleg.ts).
// - Abschluss: „Noch Fragen?“ → „Abschluss“ → „Ticket schließen“ (Ausnahmen: gesperrt, Kunde 3 Stunden weg).
import { after, NextResponse } from "next/server";
import { followupPrivate } from "@/lib/discord";
import type { EmbedLike } from "@/lib/discord-calls";
import { OWNER_ID } from "@/lib/leads";
import { nameVon } from "@/lib/team";
import { pruefeBeleg } from "@/lib/sperr-beleg";
import {
  FOR_CUSTOMER,
  aendereAblauf,
  aendereKarte,
  closeTicketChannel,
  kundenNachrichten,
  leseKarte,
  letzteNachrichten,
  postAnKunde,
  schliesseHinweise,
  schreibeInsTicket,
  sperreMitBeleg,
  ticketComponents,
  type Karte,
} from "@/lib/support";
import {
  BEENDEN_ID,
  DAUERHAFT_ID,
  ENTSPERREN_ID,
  HAND_GRUENDE,
  MIT_BELEG_GESPERRT,
  PRUEFUNG_AUS,
  SCHNELL_FENSTER,
  SCHNELL_WAHL,
  SCHON_GESPERRT,
  SPERRE_FELD,
  SPERR_GRUND_FENSTER,
  SPERR_GRUND_WAHL,
  TROTZDEM_BEENDEN_ID,
  beendetNachricht,
  dauerhaftNachricht,
  dauerhaftWert,
  entsperrtNachricht,
  entsperrtWert,
  grundAuswahl,
  grundFenster,
  istHandGrund,
  keinBelegAntwort,
  mitFeld,
  pruefeText,
  schnellAuswahl,
  schnellFenster,
  sperreDerKarte,
  type Feld,
  type HandGrund,
} from "@/lib/support-sperre";
import {
  ABSCHLUSS_ID,
  GESENDET,
  HINWEIS1_ANFANG,
  HINWEIS2_ANFANG,
  NOCH_FRAGEN_ID,
  SATZ_ABSCHLUSS,
  SATZ_NOCH_FRAGEN,
  SCHON_NACHGEFRAGT,
  abschlussErlaubt,
  abschlussGesendetText,
  andererHat,
  kundeSchriebSeit,
  leseAblauf,
  mitAblauf,
  nachgefragtText,
  pruefeUebernehmer,
  schliessenErlaubt,
  uebernahmeZeit,
  uebernehmerDerKarte,
  zuFruehAntwort,
} from "@/lib/support-ablauf";
import { ANRUF_FENSTER, anrufFenster, leseAnrufKnopf, mitAnrufZeile } from "@/lib/support-anruf";

export interface TicketInteraction {
  type: number;
  token?: string;
  application_id?: string;
  channel_id?: string;
  channel?: { name?: string };
  data?: {
    custom_id?: string;
    values?: string[];
    components?: { components?: { custom_id: string; value?: string }[] }[];
  };
  member?: { user?: { id: string } };
  message?: { id: string; content?: string; embeds?: EmbedLike[]; flags?: number };
}

const API = "https://discord.com/api/v10";

function ephemeral(content: string, components?: unknown[]) {
  // Flag 64 = nur für den sehen, der geklickt hat
  return NextResponse.json({ type: 4, data: { content, flags: 64, ...(components ? { components } : {}), allowed_mentions: { parse: [] } } });
}
/** Die Nachricht, an der geklickt wurde, ersetzen (Typ 7). */
const ersetze = (data: Record<string, unknown>) => NextResponse.json({ type: 7, data: { allowed_mentions: { parse: [] }, ...data } });

/** Die private Meldung einer Interaktion nachträglich ändern (nach einer Antwort vom Typ 7 auf eine private Nachricht). */
async function bearbeiteOriginal(appId: string | undefined, itoken: string | undefined, data: { content: string; components?: unknown[] }) {
  if (!appId || !itoken) return;
  try {
    await fetch(`${API}/webhooks/${appId}/${itoken}/messages/@original`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ components: [], ...data, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[ticket] Meldung ändern fehlgeschlagen:", err);
  }
}

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

const textAusFenster = (i: TicketInteraction) => i.data?.components?.[0]?.components?.[0]?.value?.trim() ?? "";

export async function handleTicket(i: TicketInteraction, whoRaw: string, ownerTag: string, token: string | undefined): Promise<NextResponse> {
  const id = i.data?.custom_id ?? "";
  const userId = i.member?.user?.id ?? "";
  // So heißen die Leute im Chat der Besucher, unabhängig vom Discord-Namen.
  const who = nameVon(userId) ?? whoRaw;
  const channel = i.channel_id;
  if (!channel || !token) return ephemeral("Der Kanal ist nicht bekannt.");
  const geschlossen = i.channel?.name?.startsWith("geschlossen-") === true;
  const schonZu = () => ephemeral("Das Ticket ist schon geschlossen. Der Kunde bekommt keine Nachrichten mehr.");
  const time = uhrzeit();
  const jetzt = Date.now();
  const privat = ((i.message?.flags ?? 0) & 64) === 64;

  // Die Ticket-Karte: Klick an der Karte selbst, sonst holen (Hinweise, Sperr-Karte, private Meldungen).
  const eigene = i.message?.embeds?.[0];
  const karte: Karte | null =
    i.message && eigene?.title?.startsWith("Support-Anfrage") ? { id: i.message.id, embed: eigene, felder: (eigene.fields ?? []) as Feld[] } : await leseKarte(token, channel);
  if (!karte) return ephemeral("Die Ticket-Karte ist gerade nicht erreichbar. Versuch es gleich nochmal.");
  const felder = karte.felder;
  const embed = karte.embed;
  const setStatus = (status: string, color: number, f: Feld[] = felder): EmbedLike => ({
    ...embed,
    color,
    fields: f.map((x) => (x.name === "Status" ? { ...x, value: status } : x)),
  });

  // ------------------------------------------------------------ Übernehmen (für alle, solange offen)
  if (id === "ticket:claim") {
    if (geschlossen) return schonZu();
    const wer = uebernehmerDerKarte(felder);
    if (wer) return ephemeral(wer === userId ? "Du hast das Ticket schon übernommen." : andererHat(wer));
    after(async () => {
      await schreibeInsTicket(token, channel, `${FOR_CUSTOMER} **${who}** Du bist jetzt mit einem Mitarbeiter verbunden und kannst direkt schreiben.`);
    });
    // Wann übernommen wurde, steht genau im Feld „Ablauf“: Was der Übernehmer davor schrieb, geht nicht an den Kunden.
    return ersetze({
      embeds: [setStatus(`Übernommen von ${ownerTag} um ${time}`, 0x3b82f6, mitAblauf(felder, { uebernommen: uebernahmeZeit(jetzt) }))],
      components: ticketComponents("claimed"),
    });
  }

  // ------------------------------------------------------------ alles andere: nur der Übernehmer
  const verbot = pruefeUebernehmer(felder, userId, OWNER_ID);
  if (verbot) return ephemeral(verbot);

  // „Anruf anbieten“ (an der Karte oder am Hinweis nur fürs Team): Fenster mit einem fertigen Satz. An der Karte
  // der allgemeine Satz (der Chat mit dem Assistenten zählt seit Prompt 18 nicht mehr), am Hinweis der zum Anliegen.
  const knopf = i.type === 3 ? leseAnrufKnopf(id) : null;
  if (knopf) {
    if (geschlossen) return schonZu();
    return NextResponse.json({ type: 9, data: anrufFenster(knopf.quelle, knopf.anliegen) });
  }

  // Fenster „Anruf anbieten“ abgeschickt: Der Kunde sieht die Nachricht und darunter die Anruf-Karte.
  if (i.type === 5 && id.startsWith(ANRUF_FENSTER)) {
    const text = textAusFenster(i);
    if (!text) return ephemeral("Die Nachricht war leer.");
    if (geschlossen) return schonZu();
    after(async () => {
      await schreibeInsTicket(token, channel, `${FOR_CUSTOMER} **${who}:** ${mitAnrufZeile(text.slice(0, 1000))}`);
    });
    // Am Hinweis: Er wird zur Notiz, wer angeboten hat (ohne Knopf, damit es nicht doppelt geschieht).
    if (id === `${ANRUF_FENSTER}hinweis` && i.message) return ersetze({ content: `📞 Anruf angeboten von ${ownerTag} um ${time}.`, components: [] });
    return ephemeral("Gesendet. Der Kunde sieht die Nachricht gleich im Chat, darunter die Anruf-Karte mit „Jetzt anrufen“.");
  }

  // ------------------------------------------------------------ Sperren von Hand: nur mit Beleg
  const pruefeUndSperre = (grund: HandGrund, beschreibung: string) => {
    const name = grund === "sonstiges" ? `Sonstiges: ${beschreibung.replace(/\s+/g, " ").slice(0, 80)}` : HAND_GRUENDE[grund];
    after(async () => {
      const liste = await kundenNachrichten(token, channel, karte);
      const beleg = liste === null ? ({ art: "fehler" } as const) : await pruefeBeleg(grund, beschreibung, liste);
      if (beleg.art === "fehler") return bearbeiteOriginal(i.application_id, i.token, { content: PRUEFUNG_AUS });
      if (beleg.art === "nichts") return bearbeiteOriginal(i.application_id, i.token, keinBelegAntwort());
      const r = await sperreMitBeleg(token, channel, { grund: name, stelle: beleg.stelle, erklaerung: beleg.erklaerung, wer: who, tag: ownerTag, zeit: time });
      await bearbeiteOriginal(i.application_id, i.token, { content: r === "gesperrt" ? MIT_BELEG_GESPERRT : r === "schon" ? SCHON_GESPERRT : PRUEFUNG_AUS });
    });
    return ersetze({ content: pruefeText(name), components: [] });
  };
  if (id === "ticket:sperren") {
    if (geschlossen) return schonZu();
    if (sperreDerKarte(felder).gesperrt) return ephemeral(SCHON_GESPERRT);
    return NextResponse.json({ type: 4, data: grundAuswahl() });
  }
  if (id === SPERR_GRUND_WAHL) {
    if (geschlossen) return schonZu();
    const grund = i.data?.values?.[0];
    if (!istHandGrund(grund)) return ephemeral("Unbekannter Grund.");
    if (sperreDerKarte(felder).gesperrt) return ersetze({ content: SCHON_GESPERRT, components: [] });
    if (grund === "sonstiges") return NextResponse.json({ type: 9, data: grundFenster() });
    return pruefeUndSperre(grund, "");
  }
  if (i.type === 5 && id === SPERR_GRUND_FENSTER) {
    const text = textAusFenster(i);
    if (text.length < 3) return ephemeral("Bitte kurz beschreiben, was los ist.");
    if (geschlossen) return schonZu();
    if (sperreDerKarte(felder).gesperrt) return ersetze({ content: SCHON_GESPERRT, components: [] });
    return pruefeUndSperre("sonstiges", text);
  }

  // Ticket schließen (an der Karte nur, wenn erlaubt; an der Sperr-Karte und nach „kein Grund gefunden“ immer).
  const schliessen = () => {
    after(async () => {
      await closeTicketChannel(token, channel);
      await schreibeInsTicket(token, channel, `🔒 Ticket geschlossen von ${who}.`);
    });
  };
  const karteZu = (f: Feld[]) => ({ color: 0x6b7280, fields: f.map((x) => (x.name === "Status" ? { ...x, value: `Geschlossen von ${ownerTag} um ${time}` } : x)) });

  if (id === TROTZDEM_BEENDEN_ID) {
    if (geschlossen) return schonZu();
    schliessen();
    after(async () => {
      await aendereKarte(token, channel, karteZu, ticketComponents("closed"));
    });
    return ersetze({ content: `Chat beendet von ${ownerTag} um ${time}. Das Ticket ist geschlossen.`, components: [] });
  }

  // ------------------------------------------------------------ an der Sperr-Karte
  if (id === ENTSPERREN_ID) {
    if (geschlossen) return schonZu();
    after(async () => {
      await aendereKarte(token, channel, (f: Feld[]) => ({ fields: mitFeld(f, SPERRE_FELD, entsperrtWert(ownerTag, time)) }));
    });
    return ersetze({ content: entsperrtNachricht(i.message?.content ?? "", ownerTag, time), components: [] });
  }
  if (id === DAUERHAFT_ID) {
    if (geschlossen) return schonZu();
    // Der Grund steht schon fest (aus dem Assistenten-Chat): keine neue Prüfung, die Uhr fällt weg.
    const wert = sperreDerKarte(felder).wert;
    const grund = (i.message?.content ?? "").match(/^🔒 \*\*Gesperrt\*\* – (.+?) \(aus dem Assistenten-Chat/)?.[1] ?? "Sperre";
    const neu = dauerhaftWert(wert.startsWith("Gesperrt") ? wert : `Gesperrt – ${grund} (aus dem Assistenten-Chat)`, ownerTag, time);
    after(async () => {
      await aendereKarte(token, channel, (f: Feld[]) => ({ fields: mitFeld(f, SPERRE_FELD, neu) }));
    });
    return ersetze({ content: dauerhaftNachricht(i.message?.content ?? "", ownerTag, time), components: [{ type: 1, components: [{ type: 2, style: 3, label: "Entsperren", emoji: { name: "🔓" }, custom_id: ENTSPERREN_ID }, { type: 2, style: 2, label: "Chat beenden", custom_id: BEENDEN_ID }] }] });
  }
  // „Chat beenden“ an der Sperr-Karte: Ein gesperrter Kunde lässt sich jederzeit beenden, ohne Abschluss-Satz.
  if (id === BEENDEN_ID) {
    if (geschlossen) return schonZu();
    schliessen();
    after(async () => {
      await aendereKarte(token, channel, karteZu, ticketComponents("closed"));
    });
    return ersetze({ content: beendetNachricht(i.message?.content ?? "", ownerTag, time), components: [] });
  }

  // ------------------------------------------------------------ Abschluss
  if (id === NOCH_FRAGEN_ID) {
    if (geschlossen) return schonZu();
    const a = leseAblauf(felder);
    if (a.nachgefragt && jetzt - a.nachgefragt < 15_000) return ephemeral(SCHON_NACHGEFRAGT);
    after(async () => {
      // Wie eine eigene Nachricht des Übernehmers: „💬 **Name:** Hast du sonst noch Fragen?“ steht im Verlauf.
      await postAnKunde(token, channel, who, SATZ_NOCH_FRAGEN);
      await aendereAblauf(token, channel, { nachgefragt: jetzt });
      if (privat) await schliesseHinweise(token, channel, HINWEIS1_ANFANG, nachgefragtText(ownerTag, time));
      else await followupPrivate(i.application_id ?? "", i.token ?? "", GESENDET);
    });
    return privat ? ersetze({ content: GESENDET, components: [] }) : ersetze({ content: nachgefragtText(ownerTag, time), components: [] });
  }
  if (id === ABSCHLUSS_ID) {
    if (geschlossen) return schonZu();
    const a = leseAblauf(felder);
    const nachrichten = a.nachgefragt ? ((await letzteNachrichten(token, channel, 50)) ?? []) : [];
    const darf = abschlussErlaubt(a, kundeSchriebSeit(nachrichten, a.nachgefragt ?? 0), jetzt);
    if (!darf.ok) return ephemeral(darf.meldung);
    after(async () => {
      await postAnKunde(token, channel, who, SATZ_ABSCHLUSS);
      await aendereAblauf(token, channel, { abschluss: jetzt });
      if (privat) await schliesseHinweise(token, channel, HINWEIS2_ANFANG, abschlussGesendetText(ownerTag, time));
      else await followupPrivate(i.application_id ?? "", i.token ?? "", GESENDET);
    });
    return privat
      ? ersetze({ content: `${GESENDET} Du kannst das Ticket jetzt schließen.`, components: [] })
      : ersetze({ content: abschlussGesendetText(ownerTag, time), components: [] });
  }

  // ------------------------------------------------------------ Antworten, Schnellantwort
  if (i.type === 5 && id === SCHNELL_FENSTER) {
    const text = textAusFenster(i);
    if (!text) return ephemeral("Die Nachricht war leer.");
    if (geschlossen) return schonZu();
    after(async () => {
      await postAnKunde(token, channel, who, text.slice(0, 1500));
    });
    return ephemeral("Gesendet. Der Kunde sieht die Antwort gleich im Chat.");
  }
  if (i.type === 5) {
    const text = textAusFenster(i);
    if (!text) return ephemeral("Die Nachricht war leer.");
    if (geschlossen) return schonZu();
    after(async () => {
      await postAnKunde(token, channel, who, text.slice(0, 1500));
    });
    return ephemeral("Gesendet. Der Besucher sieht die Antwort gleich im Chat.");
  }
  if (id === "ticket:reply") {
    return NextResponse.json({
      type: 9,
      data: {
        custom_id: "ticket:reply",
        title: "Antwort an den Besucher",
        components: [{ type: 1, components: [{ type: 4, custom_id: "text", label: "Nachricht", style: 2, required: true, max_length: 1500 }] }],
      },
    });
  }
  if (id === "ticket:schnell") {
    if (geschlossen) return schonZu();
    return NextResponse.json({ type: 4, data: schnellAuswahl() });
  }
  if (id === SCHNELL_WAHL) {
    if (geschlossen) return schonZu();
    return NextResponse.json({ type: 9, data: schnellFenster(i.data?.values?.[0]) });
  }

  // ------------------------------------------------------------ Ticket schließen (an der Karte)
  if (id === "ticket:close") {
    if (geschlossen) return schonZu();
    const darf = schliessenErlaubt(leseAblauf(felder), sperreDerKarte(felder).gesperrt, jetzt);
    if (!darf.ok) return darf.knoepfe ? NextResponse.json({ type: 4, data: { ...zuFruehAntwort(), allowed_mentions: { parse: [] } } }) : ephemeral(darf.meldung);
    schliessen();
    return ersetze({ embeds: [setStatus(`Geschlossen von ${ownerTag} um ${time}`, 0x6b7280)], components: ticketComponents("closed") });
  }

  return NextResponse.json({ ok: true });
}
