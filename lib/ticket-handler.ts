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
//
// Seit Prompt 18b:
// - Wer übernommen hat, steht mit Kennung und Zeit im Feld „Ablauf“ (mitUebernahme), nicht nur im Status.
// - „Freigeben“ (nur der Übernehmer): wieder offen mit „Übernehmen“, die Karte sagt „Freigegeben von … um …“. Ist der
//   Übernehmer nicht mehr aktiv im Team (Register: Pause, ausgetreten, fehlt), gibt der Bot das Ticket selbst frei.
// - Discord wartet nur 3 Sekunden auf eine Antwort. Muss erst etwas geholt oder gesendet werden, bekommt Discord
//   sofort „Moment“ (Typ 6) und das Ergebnis kommt danach (die Nachricht wird geändert oder eine private Meldung
//   folgt). Fenster lassen sich nicht aufschieben: Dafür wird die Karte nur kurz geholt (höchstens 1,5 s).
// - „Noch Fragen?“ und „Abschluss“ werden erst an der Karte vermerkt, dann gesendet. Ein zweiter Klick sieht nur
//   „Schon gesendet.“ (auch zwei Klicks gleichzeitig in derselben Instanz).
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
  aktivImTeam,
  closeTicketChannel,
  schliesseKarte,
  uebernimmTicket,
  gibTicketFrei,
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
  CHEF_DARF_ALLES,
  FREIGEBEN_ID,
  GESENDET,
  HINWEIS1_ANFANG,
  HINWEIS2_ANFANG,
  NICHT_IM_TEAM,
  NOCH_FRAGEN_ID,
  SATZ_ABSCHLUSS,
  SATZ_NOCH_FRAGEN,
  SCHON_GESENDET,
  abschlussErlaubt,
  abschlussGesendetText,
  andererHat,
  aufSekunde,
  freiStatus,
  freigegebenStatus,
  kundeSchriebSeit,
  leseAblauf,
  nachgefragtText,
  nichtMehrAktiv,
  pruefeUebernehmer,
  schliessenErlaubt,
  schonGesendet,
  uebernehmerDerKarte,
  uebernehmerWeg,
  uebernommenFest,
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
/** So lange darf das Holen der Karte dauern, bevor ein Fenster aufgeht (Discord wartet insgesamt 3 s). */
export const FENSTER_FRIST_MS = 1500;
const KARTE_WEG = "Die Ticket-Karte ist gerade nicht erreichbar. Versuch es gleich nochmal.";
const NICHT_GEKLAPPT = "Das hat gerade nicht geklappt. Bitte gleich nochmal versuchen.";

/**
 * Was Discord als Antwort bekommt: 4 = neue Nachricht (privat mit Flag 64), 6 = „Moment“ (die Nachricht ändert der Bot
 * danach selbst), 7 = geklickte Nachricht ersetzen, 9 = Fenster.
 */
type MitDaten = { type: 4 | 7 | 9; data: Record<string, unknown> };
export type Antwort = MitDaten | { type: 6 };
/** Übernehmen, Freigeben, Schließen an der Karte (Prompt 18c): sofort „Moment“, die Karte schreibt der Bot frisch gelesen. */
const MOMENT: Antwort = { type: 6 };
type Arbeit = () => Promise<unknown>;
interface Entscheid {
  antwort: Antwort;
  arbeit: Arbeit[];
}

/** Flag 64 = nur für den sehen, der geklickt hat. */
const privatDaten = (content: string, components?: unknown[]): MitDaten => ({
  type: 4,
  data: { content, flags: 64, ...(components ? { components } : {}), allowed_mentions: { parse: [] } },
});
/** Die Nachricht, an der geklickt wurde, ersetzen (Typ 7). */
const ersetzeDaten = (data: Record<string, unknown>): Antwort => ({ type: 7, data: { allowed_mentions: { parse: [] }, ...data } });
const fensterDaten = (data: Record<string, unknown>): Antwort => ({ type: 9, data });
const nachrichtDaten = (data: Record<string, unknown>): Antwort => ({ type: 4, data: { allowed_mentions: { parse: [] }, ...data } });

function ephemeral(content: string) {
  return NextResponse.json(privatDaten(content));
}

/**
 * Das Ergebnis nach einer aufgeschobenen Antwort (Typ 6) nachreichen: „ersetzen“ ändert die geklickte Nachricht,
 * alles andere kommt als neue Meldung (privat, wenn Flag 64 gesetzt ist).
 */
export async function liefere(appId: string | undefined, itoken: string | undefined, a: Antwort): Promise<void> {
  if (!appId || !itoken || a.type === 6) return;
  const daten = a.type === 9 ? privatDaten("Bitte klick den Knopf gleich nochmal.").data : a.data;
  try {
    await fetch(a.type === 7 ? `${API}/webhooks/${appId}/${itoken}/messages/@original` : `${API}/webhooks/${appId}/${itoken}`, {
      method: a.type === 7 ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(daten),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[ticket] Antwort nachreichen fehlgeschlagen:", err);
  }
}

/** Die private Meldung einer Interaktion nachträglich ändern (nach einer Antwort vom Typ 7 auf eine private Nachricht). */
async function bearbeiteOriginal(appId: string | undefined, itoken: string | undefined, data: { content: string; components?: unknown[] }) {
  await liefere(appId, itoken, ersetzeDaten({ components: [], ...data }));
}

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

const textAusFenster = (i: TicketInteraction) => i.data?.components?.[0]?.components?.[0]?.value?.trim() ?? "";

/** Höchstens `ms` warten, sonst null. */
function mitFrist<T>(p: Promise<T | null>, ms: number): Promise<T | null> {
  return new Promise((ja) => {
    const t = setTimeout(() => ja(null), ms);
    p.then(
      (v) => (clearTimeout(t), ja(v)),
      () => (clearTimeout(t), ja(null)),
    );
  });
}

// Zwei Klicks gleichzeitig (z. B. Doppelklick) in derselben Instanz: Der zweite wartet nicht auf die Karte, er sieht
// gleich „Schon gesendet.“. Zwischen Instanzen schützt die Reihenfolge: erst an der Karte vermerken, dann senden.
const laeuft: Map<string, number> = ((globalThis as { __agTicketLaeuft?: Map<string, number> }).__agTicketLaeuft ??= new Map());
function beginne(schluessel: string, jetzt: number): boolean {
  const seit = laeuft.get(schluessel);
  if (seit && jetzt - seit < 20_000) return false;
  laeuft.set(schluessel, jetzt);
  return true;
}

/** Klicks, die vor der Antwort etwas holen oder senden: immer aufgeschoben (Typ 6), auch an der Karte. */
const IMMER_SPAETER = new Set([NOCH_FRAGEN_ID, ABSCHLUSS_ID]);

/** Öffnet dieser Klick ein Fenster? Fenster müssen sofort kommen (Typ 9 lässt sich nicht aufschieben). */
export function oeffnetFenster(i: Pick<TicketInteraction, "type" | "data">): boolean {
  if (i.type !== 3) return false;
  const id = i.data?.custom_id ?? "";
  return !!leseAnrufKnopf(id) || id === "ticket:reply" || id === SCHNELL_WAHL || (id === SPERR_GRUND_WAHL && i.data?.values?.[0] === "sonstiges");
}

interface Fall {
  i: TicketInteraction;
  id: string;
  userId: string;
  who: string;
  ownerTag: string;
  channel: string;
  token: string;
  geschlossen: boolean;
  time: string;
  jetzt: number;
  privat: boolean;
  /** Kam die Karte aus der geklickten Nachricht selbst? */
  anKarte: boolean;
}

export async function handleTicket(i: TicketInteraction, whoRaw: string, ownerTag: string, token: string | undefined): Promise<NextResponse> {
  const id = i.data?.custom_id ?? "";
  const userId = i.member?.user?.id ?? "";
  const channel = i.channel_id;
  if (!channel || !token) return ephemeral("Der Kanal ist nicht bekannt.");
  const fall: Fall = {
    i,
    id,
    userId,
    // So heißen die Leute im Chat der Besucher, unabhängig vom Discord-Namen.
    who: nameVon(userId) ?? whoRaw,
    ownerTag,
    channel,
    token,
    geschlossen: i.channel?.name?.startsWith("geschlossen-") === true,
    time: uhrzeit(),
    jetzt: Date.now(),
    privat: ((i.message?.flags ?? 0) & 64) === 64,
    anKarte: false,
  };

  // 1) Klick an der Ticket-Karte selbst: Die Karte steht in der Nachricht, die Antwort kommt sofort.
  const eigene = i.message?.embeds?.[0];
  const ausNachricht: Karte | null =
    i.message && eigene?.title?.startsWith("Support-Anfrage") ? { id: i.message.id, embed: eigene, felder: (eigene.fields ?? []) as Feld[] } : null;
  if (ausNachricht && !IMMER_SPAETER.has(id)) return sofort(await entscheide({ ...fall, anKarte: true }, ausNachricht));

  // 2) Ein Fenster: Die Karte nur kurz holen. Wer darf, wird beim Abschicken noch einmal geprüft.
  if (oeffnetFenster(i)) {
    const karte = ausNachricht ?? (await mitFrist(leseKarte(token, channel), FENSTER_FRIST_MS));
    if (!karte) return ephemeral(KARTE_WEG);
    return sofort(await entscheide(fall, karte));
  }

  // 3) Alles andere holt erst die Karte (Hinweise, Sperr-Karte, private Meldungen) oder sendet etwas: Discord bekommt
  //    sofort „Moment“ (Typ 6), das Ergebnis kommt danach.
  after(async () => {
    const karte = await leseKarte(token, channel);
    const e: Entscheid = karte ? await entscheide(fall, karte) : { antwort: privatDaten(KARTE_WEG), arbeit: [] };
    await liefere(i.application_id, i.token, e.antwort);
    for (const a of e.arbeit) await a().catch((err) => console.error("[ticket] Nacharbeit fehlgeschlagen:", err));
  });
  return NextResponse.json({ type: 6 });
}

function sofort(e: Entscheid): NextResponse {
  for (const a of e.arbeit) after(a);
  return NextResponse.json(e.antwort);
}

/** Was ein Klick bewirkt. Nachrichten senden, Karte ändern usw. stehen in `arbeit` und laufen nach der Antwort. */
async function entscheide(f: Fall, karte: Karte): Promise<Entscheid> {
  const { i, id, userId, who, ownerTag, channel, token, geschlossen, time, jetzt, privat } = f;
  const arbeit: Arbeit[] = [];
  const spaeter = (a: Arbeit) => void arbeit.push(a);
  const fertig = (antwort: Antwort): Entscheid => ({ antwort, arbeit });
  const privatMeldung = (text: string) => fertig(privatDaten(text));
  const schonZu = () => privatMeldung("Das Ticket ist schon geschlossen. Der Kunde bekommt keine Nachrichten mehr.");

  const felder = karte.felder;
  // „Noch aktiv im Team?“ nur, wenn das Register geladen ist, und nicht mehr nach dem Schließen.
  const aktiv = geschlossen ? undefined : aktivImTeam();

  // ------------------------------------------------------------ Übernehmen (für alle im Team, solange offen)
  if (id === "ticket:claim") {
    if (geschlossen) return schonZu();
    if (aktiv && !aktiv(userId)) return privatMeldung(NICHT_IM_TEAM);
    const wer = uebernehmerDerKarte(felder, aktiv);
    if (wer) return privatMeldung(wer === userId ? "Du hast das Ticket schon übernommen." : andererHat(wer));
    // Wer und wann übernommen hat, steht genau im Feld „Ablauf“: Was der Übernehmer davor schrieb, geht nicht an den Kunden.
    // Seit Prompt 18c schreibt der Bot die Karte frisch gelesen (nicht den Stand der angeklickten Nachricht) und sieht
    // nach, ob die Übernahme steht; erst dann bekommt der Kunde „Du bist jetzt … verbunden“.
    spaeter(async () => {
      const r = await uebernimmTicket(token, channel, { id: userId, tag: ownerTag, zeit: time }, jetzt, aktiv);
      if (r.ok) await schreibeInsTicket(token, channel, `${FOR_CUSTOMER} **${who}** Du bist jetzt mit einem Mitarbeiter verbunden und kannst direkt schreiben.`);
      else await followupPrivate(i.application_id ?? "", i.token ?? "", r.anderer ? andererHat(r.anderer) : NICHT_GEKLAPPT);
    });
    return fertig(MOMENT);
  }

  // ------------------------------------------------------------ alles andere: nur der Übernehmer
  // Ist er nicht mehr aktiv im Team (Pause, ausgetreten), gibt der Bot das Ticket gleich frei.
  const weg = aktiv ? uebernehmerWeg(felder, aktiv) : null;
  if (weg && !(CHEF_DARF_ALLES && userId === OWNER_ID)) {
    spaeter(() => gibTicketFrei(token, channel, freiStatus(weg)));
    return privatMeldung(nichtMehrAktiv(weg));
  }
  const verbot = pruefeUebernehmer(felder, userId, OWNER_ID, CHEF_DARF_ALLES, aktiv);
  if (verbot) return privatMeldung(verbot);

  // ------------------------------------------------------------ Freigeben (an der Karte)
  if (id === FREIGEBEN_ID) {
    if (geschlossen) return schonZu();
    const status = freigegebenStatus(ownerTag, time);
    // Frisch gelesen und geprüft (Prompt 18c). Seine Nachrichten von vor dem Freigeben kommen noch an (Feld „Ablauf“).
    spaeter(async () => {
      if (!(await gibTicketFrei(token, channel, status, jetzt))) await followupPrivate(i.application_id ?? "", i.token ?? "", NICHT_GEKLAPPT);
      else if (!f.anKarte) await followupPrivate(i.application_id ?? "", i.token ?? "", "Freigegeben. Jetzt kann jemand anderes das Ticket übernehmen.");
    });
    return fertig(f.anKarte ? MOMENT : privatDaten("Einen Moment …"));
  }

  // „Anruf anbieten“ (an der Karte oder am Hinweis nur fürs Team): Fenster mit einem fertigen Satz. An der Karte
  // der allgemeine Satz (der Chat mit dem Assistenten zählt seit Prompt 18 nicht mehr), am Hinweis der zum Anliegen.
  const knopf = i.type === 3 ? leseAnrufKnopf(id) : null;
  if (knopf) {
    if (geschlossen) return schonZu();
    return fertig(fensterDaten(anrufFenster(knopf.quelle, knopf.anliegen)));
  }

  // Fenster „Anruf anbieten“ abgeschickt: Der Kunde sieht die Nachricht und darunter die Anruf-Karte.
  if (i.type === 5 && id.startsWith(ANRUF_FENSTER)) {
    const text = textAusFenster(i);
    if (!text) return privatMeldung("Die Nachricht war leer.");
    if (geschlossen) return schonZu();
    spaeter(() => schreibeInsTicket(token, channel, `${FOR_CUSTOMER} **${who}:** ${mitAnrufZeile(text.slice(0, 1000))}`));
    // Am Hinweis: Er wird zur Notiz, wer angeboten hat (ohne Knopf, damit es nicht doppelt geschieht).
    if (id === `${ANRUF_FENSTER}hinweis` && i.message) return fertig(ersetzeDaten({ content: `📞 Anruf angeboten von ${ownerTag} um ${time}.`, components: [] }));
    return privatMeldung("Gesendet. Der Kunde sieht die Nachricht gleich im Chat, darunter die Anruf-Karte mit „Jetzt anrufen“.");
  }

  // ------------------------------------------------------------ Sperren von Hand: nur mit Beleg
  const pruefeUndSperre = (grund: HandGrund, beschreibung: string) => {
    const name = grund === "sonstiges" ? `Sonstiges: ${beschreibung.replace(/\s+/g, " ").slice(0, 80)}` : HAND_GRUENDE[grund];
    spaeter(async () => {
      const liste = await kundenNachrichten(token, channel, karte);
      const beleg = liste === null ? ({ art: "fehler" } as const) : await pruefeBeleg(grund, beschreibung, liste);
      if (beleg.art === "fehler") return bearbeiteOriginal(i.application_id, i.token, { content: PRUEFUNG_AUS });
      if (beleg.art === "nichts") return bearbeiteOriginal(i.application_id, i.token, keinBelegAntwort());
      const r = await sperreMitBeleg(token, channel, { grund: name, stelle: beleg.stelle, erklaerung: beleg.erklaerung, wer: who, tag: ownerTag, zeit: time });
      await bearbeiteOriginal(i.application_id, i.token, { content: r === "gesperrt" ? MIT_BELEG_GESPERRT : r === "schon" ? SCHON_GESPERRT : PRUEFUNG_AUS });
    });
    return fertig(ersetzeDaten({ content: pruefeText(name), components: [] }));
  };
  if (id === "ticket:sperren") {
    if (geschlossen) return schonZu();
    if (sperreDerKarte(felder).gesperrt) return privatMeldung(SCHON_GESPERRT);
    return fertig(nachrichtDaten(grundAuswahl()));
  }
  if (id === SPERR_GRUND_WAHL) {
    if (geschlossen) return schonZu();
    const grund = i.data?.values?.[0];
    if (!istHandGrund(grund)) return privatMeldung("Unbekannter Grund.");
    if (sperreDerKarte(felder).gesperrt) return fertig(ersetzeDaten({ content: SCHON_GESPERRT, components: [] }));
    if (grund === "sonstiges") return fertig(fensterDaten(grundFenster()));
    return pruefeUndSperre(grund, "");
  }
  if (i.type === 5 && id === SPERR_GRUND_FENSTER) {
    const text = textAusFenster(i);
    if (text.length < 3) return privatMeldung("Bitte kurz beschreiben, was los ist.");
    if (geschlossen) return schonZu();
    if (sperreDerKarte(felder).gesperrt) return fertig(ersetzeDaten({ content: SCHON_GESPERRT, components: [] }));
    return pruefeUndSperre("sonstiges", text);
  }

  // Ticket schließen (an der Karte nur, wenn erlaubt; an der Sperr-Karte und nach „kein Grund gefunden“ immer).
  const schliessen = () => {
    spaeter(async () => {
      await closeTicketChannel(token, channel);
      await schreibeInsTicket(token, channel, `🔒 Ticket geschlossen von ${who}.`);
    });
  };
  // Der Übernehmer bleibt im Feld „Ablauf“ stehen (auch bei alten Tickets): Seine letzten Nachrichten kommen noch an.
  const karteZu = (fl: Feld[]) => ({ color: 0x6b7280, fields: uebernommenFest(fl).map((x) => (x.name === "Status" ? { ...x, value: `Geschlossen von ${ownerTag} um ${time}` } : x)) });

  if (id === TROTZDEM_BEENDEN_ID) {
    if (geschlossen) return schonZu();
    schliessen();
    spaeter(() => aendereKarte(token, channel, karteZu, ticketComponents("closed")));
    return fertig(ersetzeDaten({ content: `Chat beendet von ${ownerTag} um ${time}. Das Ticket ist geschlossen.`, components: [] }));
  }

  // ------------------------------------------------------------ an der Sperr-Karte
  if (id === ENTSPERREN_ID) {
    if (geschlossen) return schonZu();
    // Mit der genauen Zeit (Discord-Zeitangabe): Eine Sperre im Assistenten-Chat, die erst danach kam, bleibt (Prompt 18b).
    spaeter(() => aendereKarte(token, channel, (fl: Feld[]) => ({ fields: mitFeld(fl, SPERRE_FELD, entsperrtWert(ownerTag, jetzt)) })));
    return fertig(ersetzeDaten({ content: entsperrtNachricht(i.message?.content ?? "", ownerTag, time), components: [] }));
  }
  if (id === DAUERHAFT_ID) {
    if (geschlossen) return schonZu();
    // Der Grund steht schon fest (aus dem Assistenten-Chat): keine neue Prüfung, die Uhr fällt weg.
    const wert = sperreDerKarte(felder).wert;
    const grund = (i.message?.content ?? "").match(/^🔒 \*\*Gesperrt\*\* – (.+?) \(aus dem Assistenten-Chat/)?.[1] ?? "Sperre";
    const neu = dauerhaftWert(wert.startsWith("Gesperrt") ? wert : `Gesperrt – ${grund} (aus dem Assistenten-Chat)`, ownerTag, time);
    spaeter(() => aendereKarte(token, channel, (fl: Feld[]) => ({ fields: mitFeld(fl, SPERRE_FELD, neu) })));
    return fertig(
      ersetzeDaten({
        content: dauerhaftNachricht(i.message?.content ?? "", ownerTag, time),
        components: [{ type: 1, components: [{ type: 2, style: 3, label: "Entsperren", emoji: { name: "🔓" }, custom_id: ENTSPERREN_ID }, { type: 2, style: 2, label: "Chat beenden", custom_id: BEENDEN_ID }] }],
      }),
    );
  }
  // „Chat beenden“ an der Sperr-Karte: Ein gesperrter Kunde lässt sich jederzeit beenden, ohne Abschluss-Satz.
  if (id === BEENDEN_ID) {
    if (geschlossen) return schonZu();
    schliessen();
    spaeter(() => aendereKarte(token, channel, karteZu, ticketComponents("closed")));
    return fertig(ersetzeDaten({ content: beendetNachricht(i.message?.content ?? "", ownerTag, time), components: [] }));
  }

  // ------------------------------------------------------------ Abschluss (immer aufgeschoben, Karte frisch gelesen)
  // Erst vermerken, dann senden: Ein zweiter Klick liest schon „gesendet“ und sieht nur „Schon gesendet.“. Geht das
  // Senden schief, wird der Vermerk zurückgenommen, damit man es noch einmal versuchen kann.
  const sendeEinmal = async (art: "nachgefragt" | "abschluss", satz: string): Promise<string | null> => {
    const schluessel = `${channel}:${art}`;
    if (!beginne(schluessel, jetzt)) return SCHON_GESENDET;
    try {
      const a = leseAblauf(felder);
      const nachrichten = a.nachgefragt || a.abschluss ? ((await letzteNachrichten(token, channel, 50)) ?? []) : [];
      // Noch einmal fragen geht erst, wenn der Kunde seitdem geschrieben hat; der Abschluss nur einmal.
      if (schonGesendet(art, a, nachrichten)) return SCHON_GESENDET;
      if (art === "abschluss") {
        const darf = abschlussErlaubt(a, kundeSchriebSeit(nachrichten, a.nachgefragt ?? 0), jetzt);
        if (!darf.ok) return darf.meldung;
      }
      // Auf die volle Sekunde aufgerundet (die Karte speichert Sekunden): Was der Kunde in derselben Sekunde kurz vor
      // dem Klick schrieb, zählt nicht als „seitdem geschrieben“ (sonst ginge „Noch Fragen?“ ein zweites Mal hinaus).
      if (!(await aendereAblauf(token, channel, { [art]: aufSekunde(jetzt) }))) return NICHT_GEKLAPPT;
      if (!(await postAnKunde(token, channel, who, satz))) {
        await aendereAblauf(token, channel, { [art]: a[art] ?? null });
        return "Die Nachricht ging nicht hinaus. Bitte gleich nochmal versuchen.";
      }
      return null;
    } finally {
      laeuft.delete(schluessel);
    }
  };
  if (id === NOCH_FRAGEN_ID) {
    if (geschlossen) return schonZu();
    const fehler = await sendeEinmal("nachgefragt", SATZ_NOCH_FRAGEN);
    if (fehler) return privatMeldung(fehler);
    if (privat) {
      spaeter(() => schliesseHinweise(token, channel, HINWEIS1_ANFANG, nachgefragtText(ownerTag, time)));
      return fertig(ersetzeDaten({ content: GESENDET, components: [] }));
    }
    spaeter(() => followupPrivate(i.application_id ?? "", i.token ?? "", GESENDET));
    return fertig(ersetzeDaten({ content: nachgefragtText(ownerTag, time), components: [] }));
  }
  if (id === ABSCHLUSS_ID) {
    if (geschlossen) return schonZu();
    const fehler = await sendeEinmal("abschluss", SATZ_ABSCHLUSS);
    if (fehler) return privatMeldung(fehler);
    if (privat) {
      spaeter(() => schliesseHinweise(token, channel, HINWEIS2_ANFANG, abschlussGesendetText(ownerTag, time)));
      return fertig(ersetzeDaten({ content: `${GESENDET} Du kannst das Ticket jetzt schließen.`, components: [] }));
    }
    spaeter(() => followupPrivate(i.application_id ?? "", i.token ?? "", GESENDET));
    return fertig(ersetzeDaten({ content: abschlussGesendetText(ownerTag, time), components: [] }));
  }

  // ------------------------------------------------------------ Antworten, Schnellantwort
  if (i.type === 5 && id === SCHNELL_FENSTER) {
    const text = textAusFenster(i);
    if (!text) return privatMeldung("Die Nachricht war leer.");
    if (geschlossen) return schonZu();
    spaeter(() => postAnKunde(token, channel, who, text.slice(0, 1500)));
    return privatMeldung("Gesendet. Der Kunde sieht die Antwort gleich im Chat.");
  }
  if (i.type === 5) {
    const text = textAusFenster(i);
    if (!text) return privatMeldung("Die Nachricht war leer.");
    if (geschlossen) return schonZu();
    spaeter(() => postAnKunde(token, channel, who, text.slice(0, 1500)));
    return privatMeldung("Gesendet. Der Besucher sieht die Antwort gleich im Chat.");
  }
  if (id === "ticket:reply") {
    return fertig(
      fensterDaten({
        custom_id: "ticket:reply",
        title: "Antwort an den Besucher",
        components: [{ type: 1, components: [{ type: 4, custom_id: "text", label: "Nachricht", style: 2, required: true, max_length: 1500 }] }],
      }),
    );
  }
  if (id === "ticket:schnell") {
    if (geschlossen) return schonZu();
    return fertig(nachrichtDaten(schnellAuswahl()));
  }
  if (id === SCHNELL_WAHL) {
    if (geschlossen) return schonZu();
    return fertig(fensterDaten(schnellFenster(i.data?.values?.[0])));
  }

  // ------------------------------------------------------------ Ticket schließen (an der Karte)
  if (id === "ticket:close") {
    if (geschlossen) return schonZu();
    const darf = schliessenErlaubt(leseAblauf(felder), sperreDerKarte(felder).gesperrt, jetzt);
    if (!darf.ok) return darf.knoepfe ? fertig(nachrichtDaten(zuFruehAntwort())) : privatMeldung(darf.meldung);
    schliessen();
    // Frisch gelesen und geprüft (Prompt 18c); der Übernehmer bleibt im Feld „Ablauf“ (uebernommenFest).
    spaeter(() => schliesseKarte(token, channel, `Geschlossen von ${ownerTag} um ${time}`));
    return fertig(MOMENT);
  }

  return privatMeldung("Unbekannter Knopf.");
}
