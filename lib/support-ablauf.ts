// Support-Ticket, Runde 2 (Prompt 18, 23.11.2026): erst übernehmen, dann handeln, und der Abschluss in fester
// Reihenfolge („Noch Fragen?“ → „Abschluss“ → „Ticket schließen“). Reine Regeln ohne Netz: Server
// (lib/support.ts, lib/ticket-handler.ts, /api/support, /api/team/takt) und Tests (tests/support-ablauf.test.ts).
//
// Der Stand steht an der Ticket-Karte (erste Nachricht im Kanal), wie die Sperre, und gilt so über alle
// Server-Instanzen: im Feld „Ablauf“, als Discord-Zeitangaben (Discord zeigt sie in der Uhrzeit des Lesers).
//
// Prompt 18b (Korrekturen nach der Prüfung): Wer übernommen hat, steht mit Discord-Kennung und Zeit im Feld
// „Ablauf“ und wird von dort gelesen, nicht aus „Status“ (dort steht nach dem Schließen „Geschlossen von …“; bis
// dahin galt dann jede Nachricht als fremd, auch die des Übernehmers). Gelöscht wird nur, was neu ist und nie
// zugestellt wurde: nach „Prüfung ab“ (Ticket angelegt oder wieder geöffnet) und nach „Zuletzt zugestellt“. Auf einer
// geschlossenen Karte und in Tickets von vor Prompt 18 (ohne „Prüfung ab“) wird nichts gelöscht.
import { BESUCHER, besucherText, discordZeit, mitFeld, ohneFeld, trenneHinweisZeile, zeitAusTag, zustandDerKarte, type Feld } from "./support-sperre.ts";
import { leseKundenNachricht } from "./support-anruf.ts";
import { zeitAusId } from "./team-takt-regeln.ts";
import type { TicketNachricht } from "./chat-beleidigung.ts";

/**
 * Schalter für eine spätere Ausnahme: Darf der Chef (David) alles, auch ohne das Ticket übernommen zu haben?
 * Erst einmal aus (Davids Entscheidung, bis er nach seinem Test Ja sagt). Zum Einschalten nur diese Zeile auf true.
 */
export const CHEF_DARF_ALLES = false;

export const DREI_STUNDEN_MS = 3 * 60 * 60_000;
/** So lange steht die Warnung „… Deine Nachricht wurde nicht gesendet.“ im Ticket. */
export const WARNUNG_WEG_MS = 30_000;
/** Höchstens so viele Nachrichten löscht der Minutentakt je Ticket und Durchgang. */
export const MAX_LOESCHEN = 5;

/** Ist diese Person noch aktiv im Team (Team-Register: Status „team“)? Ohne Angabe gilt jeder als aktiv. */
export type Aktiv = (discordId: string) => boolean;

// ------------------------------------------------------------------ Ablauf an der Karte

export const ABLAUF_FELD = "Ablauf";
export interface Ablauf {
  /** Discord-Kennung dessen, der übernommen hat. */
  von?: string;
  uebernommen?: number;
  /** Ab hier werden Nachrichten im Kanal geprüft (Ticket angelegt oder wieder geöffnet). */
  pruefungAb?: number;
  /** Zeit der letzten Nachricht, die der Kunde bekommen hat. */
  zugestellt?: number;
  nachgefragt?: number;
  abschluss?: number;
  weg?: number;
}
type Zeitwert = Exclude<keyof Ablauf, "von">;
const ZEILEN: Record<Zeitwert, string> = {
  uebernommen: "Übernommen",
  pruefungAb: "Prüfung ab",
  zugestellt: "Zuletzt zugestellt",
  nachgefragt: "„Noch Fragen?“ gesendet",
  abschluss: "Abschluss gesendet",
  weg: "Kunde weg seit",
};
const REIHE = Object.keys(ZEILEN) as Zeitwert[];

export function leseAblauf(felder: Feld[] | undefined): Ablauf {
  const wert = felder?.find((f) => f.name === ABLAUF_FELD)?.value ?? "";
  const a: Ablauf = {};
  for (const zeile of wert.split("\n")) {
    const schluessel = REIHE.find((k) => zeile.startsWith(ZEILEN[k]));
    if (!schluessel) continue;
    // „Übernommen von <@…>“ geht auch ohne Zeit (alte Tickets, beim Schließen festgehalten: übernommenFest).
    if (schluessel === "uebernommen") {
      const von = zeile.match(/^Übernommen von <@!?(\d+)>/)?.[1];
      if (von) a.von = von;
    }
    const zeit = zeitAusTag(zeile);
    if (zeit) a[schluessel] = zeit;
  }
  return a;
}

export function ablaufWert(a: Ablauf): string {
  return REIHE.filter((k) => a[k])
    .map((k) => {
      if (k === "uebernommen" && a.von) return `Übernommen von <@${a.von}> ${discordZeit(a.uebernommen!)}`;
      return `${ZEILEN[k]} ${discordZeit(a[k]!, k === "zugestellt" ? "T" : "t")}`;
    })
    .concat(a.von && !a.uebernommen ? [`Übernommen von <@${a.von}>`] : [])
    .join("\n");
}

/** Ändert das Feld „Ablauf“ (null löscht eine Zeile); ohne Zeilen fällt das Feld weg (Discord erlaubt keine leeren Felder). */
export function mitAblauf(felder: Feld[] | undefined, aenderung: { [K in keyof Ablauf]?: Ablauf[K] | null }): Feld[] {
  const a: Ablauf = { ...leseAblauf(felder) };
  for (const k of Object.keys(aenderung) as (keyof Ablauf)[]) {
    const v = aenderung[k];
    if (v) (a as Record<string, unknown>)[k] = v;
    else delete a[k];
  }
  const wert = ablaufWert(a);
  return wert ? mitFeld(felder, ABLAUF_FELD, wert) : ohneFeld(felder, ABLAUF_FELD);
}

/** Zeit auf die nächste volle Sekunde aufgerundet (die Zeitangabe im Feld ist sekundengenau): lieber eine Sekunde zu spät als zu früh. */
export const aufSekunde = (ms: number) => Math.ceil(ms / 1000) * 1000;
/** Wann das Übernehmen zählt (so geht nichts durch, was in derselben Sekunde kurz vor dem Klick geschrieben wurde). */
export const uebernahmeZeit = aufSekunde;

/** Übernehmen: Kennung und Zeit an der Karte. */
export const mitUebernahme = (felder: Feld[] | undefined, id: string, jetzt: number) => mitAblauf(felder, { von: id, uebernommen: uebernahmeZeit(jetzt) });

// ------------------------------------------------------------------ Übernehmen

/**
 * Wer das Ticket übernommen hat: aus dem Feld „Ablauf“ (seit Prompt 18b), bei Tickets von vor Prompt 18 aus „Übernommen
 * von <@…> um …“ im Status. Auch nach dem Schließen (dann kommen seine letzten Nachrichten noch an). Mit `aktiv`:
 * Ist er nicht mehr im Team oder pausiert, gilt das Ticket als frei (null).
 */
export function uebernehmerDerKarte(felder: Feld[] | undefined, aktiv?: Aktiv): string | null {
  const ausAblauf = leseAblauf(felder).von;
  const status = felder?.find((f) => f.name === "Status")?.value ?? "";
  const wer = ausAblauf ?? (/^Übernommen/.test(status.trim()) ? (status.match(/<@!?(\d+)>/)?.[1] ?? null) : null);
  if (wer && aktiv && !aktiv(wer)) return null;
  return wer;
}

/**
 * Beim Schließen: Stand der Übernehmer nur im Status (Tickets von vor Prompt 18b), kommt er ins Feld „Ablauf“, damit
 * seine letzten Nachrichten nach dem Schließen noch beim Kunden ankommen (der Status heißt dann „Geschlossen von …“).
 */
export function uebernommenFest(felder: Feld[] | undefined): Feld[] {
  const wer = uebernehmerDerKarte(felder);
  return wer && !leseAblauf(felder).von ? mitAblauf(felder, { von: wer }) : [...(felder ?? [])];
}

/** Ist ein Übernehmer eingetragen, aber nicht mehr aktiv im Team (dann gibt der Bot das Ticket frei)? */
export function uebernehmerWeg(felder: Feld[] | undefined, aktiv: Aktiv): string | null {
  const wer = uebernehmerDerKarte(felder);
  return wer && !aktiv(wer) && zustandDerKarte(felder) !== "closed" ? wer : null;
}

export const NICHT_UEBERNOMMEN = "Übernimm zuerst das Ticket.";
/** Übernehmen nur, wer im Team-Register aktiv ist (sonst gäbe der Bot das Ticket in der nächsten Minute wieder frei). */
export const NICHT_IM_TEAM = "Du bist im Team-Register nicht als aktiv eingetragen. Übernehmen geht erst danach.";
/** Der Übernehmer ist nicht mehr aktiv im Team: Der Bot gibt frei, wer geklickt hat, liest das. */
export const nichtMehrAktiv = (id: string) => `<@${id}> ist nicht mehr aktiv im Team. Das Ticket ist jetzt frei: Übernimm es zuerst.`;
export const andererHat = (id: string) => `Das Ticket hat <@${id}> übernommen.`;

/** Darf diese Person die Knöpfe benutzen? null heißt ja, sonst die Warnung nur für sie. */
export function pruefeUebernehmer(
  felder: Feld[] | undefined,
  userId: string,
  chefId: string,
  chefDarfAlles = CHEF_DARF_ALLES,
  aktiv?: Aktiv,
): string | null {
  if (chefDarfAlles && userId === chefId) return null;
  const wer = uebernehmerDerKarte(felder, aktiv);
  if (!wer) return NICHT_UEBERNOMMEN;
  return wer === userId ? null : andererHat(wer);
}

// ------------------------------------------------------------------ Freigeben, wieder öffnen

export const FREIGEBEN_ID = "ticket:freigeben";
export const freigegebenStatus = (wer: string, zeit: string) => `Freigegeben von ${wer} um ${zeit}`;
/** Der Übernehmer ist nicht mehr im Team oder pausiert: Der Bot gibt das Ticket frei, die Karte sagt kurz, warum. */
export const freiStatus = (id: string) => `Frei: <@${id}> ist nicht mehr aktiv im Team. Wer übernimmt?`;
export const WIEDER_OFFEN = "Wieder offen";

/** Freigeben (Knopf oder automatisch): Übernehmer weg, „Noch Fragen?“ und Abschluss beginnen neu. */
export function ohneUebernahme(felder: Feld[] | undefined): Feld[] {
  return mitAblauf(felder, { von: null, uebernommen: null, nachgefragt: null, abschluss: null });
}

/**
 * Ticket per Mail wieder geöffnet: Status „Wieder offen“, kein Übernehmer, „Prüfung ab“ neu (ältere Nachrichten bleiben
 * unberührt), und „Noch Fragen?“, Abschluss und „Kunde weg“ beginnen neu.
 */
export function wiederOffenFelder(felder: Feld[] | undefined, jetzt: number): Feld[] {
  const f = mitAblauf(felder, { von: null, uebernommen: null, nachgefragt: null, abschluss: null, weg: null, pruefungAb: aufSekunde(jetzt) });
  return f.map((x) => (x.name === "Status" ? { ...x, value: WIEDER_OFFEN } : x));
}

// ------------------------------------------------------------------ Nachrichten im Kanal

/** Die Warnung im Kanal, wenn jemand schreibt, der das Ticket nicht übernommen hat (ohne den Text der Nachricht). */
export function fremdWarnung(autorId: string, uebernehmerId: string | null): string {
  // Schrieb der spätere Übernehmer selbst vor dem Übernehmen, gilt die Warnung „vor dem Übernehmen“.
  return uebernehmerId && uebernehmerId !== autorId
    ? `<@${autorId}>, das Ticket hat <@${uebernehmerId}> übernommen. Deine Nachricht wurde nicht gesendet.`
    : `<@${autorId}>, übernimm zuerst das Ticket. Deine Nachricht wurde nicht gesendet.`;
}
export const istFremdWarnung = (text: string | undefined) => !!text && /^<@\d+>, /.test(text) && text.endsWith("Deine Nachricht wurde nicht gesendet.");

/**
 * Was mit einer Nachricht eines Menschen im Ticket-Kanal geschieht:
 * - „notiz“: beginnt mit // (interne Notiz, bleibt stehen, geht nicht an den Kunden),
 * - „senden“: von dem, der übernommen hat, und nach dem Übernehmen geschrieben,
 * - „fremd“: von jemand anderem oder vor dem Übernehmen: geht nie an den Kunden (gelöscht wird sie nur, wenn
 *   `pruefbar`).
 * `seit`: wann übernommen wurde (aus dem Feld „Ablauf“; 0, wenn es fehlt).
 */
export function artDerTeamNachricht(
  m: { id: string; text: string; autor: string },
  uebernehmer: string | null,
  seit: number,
): "notiz" | "senden" | "fremd" {
  if (m.text.trim().startsWith("//")) return "notiz";
  if (!uebernehmer || m.autor !== uebernehmer) return "fremd";
  const zeit = zeitAusId(m.id);
  return seit && zeit && zeit < seit ? "fremd" : "senden";
}

/**
 * Darf eine Nachricht (ihre Zeit) noch geprüft und, wenn fremd, gelöscht werden? Nur neue, nie zugestellte: nach
 * „Prüfung ab“ und nach „Zuletzt zugestellt“. Nie auf einer geschlossenen Karte, nie in Tickets ohne „Prüfung ab“.
 */
export function pruefbar(felder: Feld[] | undefined, zeit: number): boolean {
  if (zustandDerKarte(felder) === "closed") return false;
  const a = leseAblauf(felder);
  if (!a.pruefungAb || !zeit) return false;
  return zeit >= a.pruefungAb && (!a.zugestellt || zeit > a.zugestellt);
}

/**
 * Was der Minutentakt löscht: fremde, neue, nie zugestellte Nachrichten (pruefbar), die noch im Kanal stehen,
 * älteste zuerst, höchstens 5 je Durchgang (die übrigen im nächsten). `gewarnt`: Nach ihr steht schon eine Warnung an
 * dieselbe Person. Das zählt nur, wenn das Löschen scheitert (fehlendes Recht): dann nicht jede Minute neu warnen.
 * Löschen hindert es nicht (sonst blieben nach fünf gelöschten die übrigen stehen, weil deren Warnungen jünger sind).
 */
export function zumLoeschen(
  nachrichten: { id: string; content?: string; author: { id?: string; bot?: boolean } }[],
  felder: Feld[] | undefined,
): { id: string; autor: string; gewarnt: boolean }[] {
  const uebernehmer = uebernehmerDerKarte(felder);
  const seit = leseAblauf(felder).uebernommen ?? 0;
  const warnungen = nachrichten.filter((m) => m.author.bot && istFremdWarnung(m.content));
  return nachrichten
    .filter((m) => !m.author.bot && pruefbar(felder, zeitAusId(m.id)))
    .filter((m) => artDerTeamNachricht({ id: m.id, text: (m.content ?? "").trim(), autor: m.author.id ?? "" }, uebernehmer, seit) === "fremd")
    .sort((a, b) => zeitAusId(a.id) - zeitAusId(b.id))
    .slice(0, MAX_LOESCHEN)
    .map((m) => ({
      id: m.id,
      autor: m.author.id ?? "",
      gewarnt: warnungen.some((w) => zeitAusId(w.id) >= zeitAusId(m.id) && (w.content ?? "").startsWith(`<@${m.author.id}>`)),
    }));
}

// ------------------------------------------------------------------ Abschluss

export const SATZ_NOCH_FRAGEN = "Hast du sonst noch Fragen?";
export const SATZ_ABSCHLUSS = "Danke für deine Nachricht – ich beende den Chat jetzt. Schönen Tag noch!";
export const NOCH_FRAGEN_ID = "ticket:nochfragen";
export const ABSCHLUSS_ID = "ticket:abschluss";
export const HINWEIS1_ANFANG = "✅ **Klingt gelöst.**";
export const HINWEIS2_ANFANG = "👋 **Keine Fragen mehr.**";

const knopf = (label: string, custom_id: string, style: 1 | 2 | 3) => ({ type: 2, style, label, custom_id });
const nochFragenKnopf = () => knopf("Noch Fragen?", NOCH_FRAGEN_ID, 1);
const abschlussKnopf = () => knopf("Abschluss", ABSCHLUSS_ID, 3);
const erwaehne = (id: string | null) => (id ? ` <@${id}>` : "");
const nurEr = (id: string | null) => ({ parse: [] as string[], users: id ? [id] : [] });

/**
 * Hinweis 1, nur fürs Team (ohne 💬, darum sieht der Kunde ihn nie): Die KI hält das Anliegen für gelöst.
 * Erwähnt den, der übernommen hat. Die kleine Zeile sagt, wann man den Knopf nimmt (Davids Wunsch).
 */
export function hinweisGeloest(uebernehmer: string | null) {
  return {
    content: `${HINWEIS1_ANFANG} Noch Fragen stellen?${erwaehne(uebernehmer)}\n-# Nur fürs Team. Nach dem Klick bekommt der Kunde: „${SATZ_NOCH_FRAGEN}“\n-# Nimm ihn, wenn du alles beantwortet hast. Fragt der Kunde weiter, schreib einfach normal weiter.`,
    components: [{ type: 1, components: [nochFragenKnopf()] }],
    allowed_mentions: nurEr(uebernehmer),
  };
}

/** Hinweis 2: Der Kunde hat auf „Noch Fragen?“ geantwortet, dass nichts mehr offen ist. */
export function hinweisKeineFragen(uebernehmer: string | null) {
  return {
    content: `${HINWEIS2_ANFANG} Chat abschließen?${erwaehne(uebernehmer)}\n-# Nur fürs Team. Nach dem Klick bekommt der Kunde den Abschluss-Satz, danach geht „Ticket schließen“.\n-# Nimm ihn, wenn der Kunde nichts mehr wissen will.`,
    components: [{ type: 1, components: [abschlussKnopf()] }],
    allowed_mentions: nurEr(uebernehmer),
  };
}

export const nachgefragtText = (wer: string, zeit: string) => `✅ Nachgefragt von ${wer} um ${zeit}.`;
export const abschlussGesendetText = (wer: string, zeit: string) => `👋 Abschluss gesendet von ${wer} um ${zeit}. Du kannst das Ticket jetzt schließen.`;
export const GESENDET = "Gesendet.";

export const ZU_FRUEH = "Frag zuerst, ob noch Fragen offen sind, und schick dann den Abschluss.";
/** Zu früh „Ticket schließen“: nur für den Drückenden, darunter gleich beide Knöpfe. */
export function zuFruehAntwort() {
  return { content: ZU_FRUEH, flags: 64, components: [{ type: 1, components: [nochFragenKnopf(), abschlussKnopf()] }] };
}
export const ERST_NACHFRAGEN = "Schick zuerst „Noch Fragen?“. Danach geht der Abschluss.";
export const SCHON_ABGESCHLOSSEN = "Der Abschluss ist schon gesendet. Du kannst das Ticket jetzt schließen.";
/** Zweiter Klick auf „Noch Fragen?“ oder „Abschluss“ (Prompt 18b: nur das, sonst nichts). */
export const SCHON_GESENDET = "Schon gesendet.";
export const antwortetNoch = (ab: number) => `Der Kunde antwortet vielleicht noch. Abschluss geht ab ${discordZeit(ab)}.`;
export const kommtZurueck = (ab: number) => `Der Kunde kommt vielleicht zurück. Schließen geht ab ${discordZeit(ab)}.`;

/** Hat der Kunde nach dem Zeitpunkt `seit` geschrieben? (Nachrichten im Kanal; seine stehen mit „🗨️ **Besucher:**“.) */
export function kundeSchriebSeit(nachrichten: { id: string; content?: string; author?: { bot?: boolean } }[], seit: number): boolean {
  return nachrichten.some((m) => m.author?.bot && (m.content ?? "").replace(/^⚠️ \*\*Beleidigung\*\* – /, "").startsWith(BESUCHER) && zeitAusId(m.id) > seit);
}

/**
 * Zweiter Klick (Prompt 18b)? „Noch Fragen?“ ist schon gesendet, solange der Kunde seitdem nicht geschrieben hat
 * (dann darf man noch einmal fragen); der Abschluss, sobald er nach dem letzten „Noch Fragen?“ gesendet ist.
 */
export function schonGesendet(art: "nachgefragt" | "abschluss", a: Ablauf, nachrichten: Parameters<typeof kundeSchriebSeit>[0]): boolean {
  if (art === "nachgefragt") return !!a.nachgefragt && !kundeSchriebSeit(nachrichten, a.nachgefragt);
  return !!a.abschluss && !!a.nachgefragt && a.abschluss >= a.nachgefragt;
}

/** Darf jetzt der Abschluss-Satz hinaus? Erst nach „Noch Fragen?“, und erst wenn der Kunde geantwortet hat oder 3 Stunden um sind. */
export function abschlussErlaubt(a: Ablauf, kundeSchriebDanach: boolean, jetzt: number): { ok: true } | { ok: false; meldung: string } {
  if (!a.nachgefragt) return { ok: false, meldung: ERST_NACHFRAGEN };
  if (a.abschluss && a.abschluss >= a.nachgefragt) return { ok: false, meldung: SCHON_ABGESCHLOSSEN };
  if (kundeSchriebDanach || jetzt - a.nachgefragt >= DREI_STUNDEN_MS) return { ok: true };
  return { ok: false, meldung: antwortetNoch(a.nachgefragt + DREI_STUNDEN_MS) };
}

/**
 * Darf „Ticket schließen“ jetzt? Ja, wenn der Abschluss gesendet ist, wenn der Kunde gesperrt ist (dann ohne
 * Abschluss-Satz, er sieht „Der Chat wurde beendet.“), oder wenn er den Chat vor mehr als 3 Stunden verlassen hat.
 * Ist er erst kurz weg: „Der Kunde kommt vielleicht zurück …“. Sonst: erst „Noch Fragen?“ und Abschluss.
 */
export function schliessenErlaubt(a: Ablauf, gesperrt: boolean, jetzt: number): { ok: true } | { ok: false; meldung: string; knoepfe: boolean } {
  if (gesperrt || (a.abschluss && (!a.nachgefragt || a.abschluss >= a.nachgefragt))) return { ok: true };
  if (a.weg) return jetzt - a.weg >= DREI_STUNDEN_MS ? { ok: true } : { ok: false, meldung: kommtZurueck(a.weg + DREI_STUNDEN_MS), knoepfe: false };
  return { ok: false, meldung: ZU_FRUEH, knoepfe: true };
}

/**
 * Welcher Hinweis nach der Prüfung einer Nachricht des Kunden (die KI meldet `stand`)? „Keine Fragen mehr“
 * nur, wenn „Noch Fragen?“ schon gesendet ist; sonst wieder „Klingt gelöst“. Nach dem Abschluss keiner mehr.
 */
export function hinweisNachStand(stand: "geloest" | "keine_fragen" | null, a: Ablauf): "geloest" | "keine_fragen" | null {
  if (!stand) return null;
  if (a.abschluss && (!a.nachgefragt || a.abschluss >= a.nachgefragt)) return null;
  return stand === "keine_fragen" && a.nachgefragt ? "keine_fragen" : "geloest";
}

/** Steht in den letzten Nachrichten schon ein offener Hinweis dieser Art (noch mit Knopf)? Dann kein zweiter. */
export function hinweisOffen(letzte: { content?: string; author?: { bot?: boolean }; components?: unknown[] }[], art: "geloest" | "keine_fragen"): boolean {
  const anfang = art === "geloest" ? HINWEIS1_ANFANG : HINWEIS2_ANFANG;
  return letzte.some((m) => m.author?.bot && m.content?.startsWith(anfang) && (m.components?.length ?? 0) > 0);
}

/** Warnungen im Kanal, die weg dürfen: älter als 30 s, und die fremde Nachricht davor ist gelöscht. */
export function warnungenZumLoeschen(
  nachrichten: { id: string; content?: string; author: { id?: string; bot?: boolean } }[],
  uebernehmer: string | null,
  seit: number,
  jetzt: number,
): string[] {
  const fremd = nachrichten.filter((m) => !m.author.bot && artDerTeamNachricht({ id: m.id, text: m.content ?? "", autor: m.author.id ?? "" }, uebernehmer, seit) === "fremd");
  return nachrichten
    .filter((m) => m.author.bot && istFremdWarnung(m.content) && jetzt - zeitAusId(m.id) >= WARNUNG_WEG_MS)
    .filter((w) => !fremd.some((f) => zeitAusId(f.id) <= zeitAusId(w.id) && (w.content ?? "").startsWith(`<@${f.author.id}>`)))
    .map((w) => w.id);
}

// ------------------------------------------------------------------ Daten für die KI-Prüfung

/** Vorangestelltes Zeichen bei allem, was der Kunde sehen soll (wie FOR_CUSTOMER in lib/support.ts). */
const FUER_KUNDEN = "💬";

/**
 * Die letzten Nachrichten im Ticket für die KI-Prüfung (älteste zuerst): Kunde und Team, ohne Notizen, Hinweise
 * und Karten. Nur was nach dem Wechsel zum Team geschrieben wurde (der Kanal entsteht beim Wechsel).
 */
export function verlaufFuerKi(
  nachrichten: { id: string; content: string; author: { id?: string; bot?: boolean } }[],
  ohne: string[],
  uebernehmer: string | null,
): TicketNachricht[] {
  const out: TicketNachricht[] = [];
  for (const m of [...nachrichten].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))) {
    if (ohne.includes(m.id)) continue;
    if (m.author.bot) {
      const kunde = besucherText(m.content);
      if (kunde) out.push({ von: "kunde", text: kunde });
      else if (m.content.startsWith(FUER_KUNDEN)) {
        const roh = trenneHinweisZeile(m.content.slice(FUER_KUNDEN.length).trim());
        if (!roh.hinweis) out.push({ von: "team", text: leseKundenNachricht(roh.text).text });
      }
    } else if (uebernehmer && m.author.id === uebernehmer && !m.content.trim().startsWith("//") && m.content.trim()) {
      out.push({ von: "team", text: m.content.trim() });
    }
  }
  return out;
}

