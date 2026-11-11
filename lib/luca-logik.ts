// Luca am Telefon – reine Logik ohne Abhängigkeiten (Tests: tests/luca.test.ts, `npm test`).
//
// David (und nur er, erkannt an LUCA_NUMMER) hört beim Anruf auf +49 6108 9694027 ein kleines Menü:
// 1 = Luca (Davids Helfer aus der Zentrale), 2 = der Kunden-Assistent wie jeder Kunde. Die Ansage wiederholt sich,
// bis er eine Taste drückt (höchstens MAX_MENUE-mal, dann wird aufgelegt – falls das Handy in der Tasche wählt).
// Aus der Rufgruppe ist David draußen (alle seine Nummern): Kunden lassen nur noch das Team klingeln.
// Davids Nummern: LUCA_NUMMER (privat, dorthin ruft Luca an) und DAVID_NUMMERN (weitere, z. B. das Geschäftshandy).

/** Nummern vergleichen wir über die letzten 9 Ziffern (ohne +49/0, Leerzeichen, Striche). */
export function ziffern9(n: string | null | undefined): string {
  return (n ?? "").replace(/\D/g, "").slice(-9);
}

type Nummern = string | null | undefined | (string | null | undefined)[];
const liste = (n: Nummern) => (Array.isArray(n) ? n : [n]).flatMap((x) => (x ?? "").split(/[,;\n]/)).map(ziffern9).filter((z) => z.length === 9);

/** Ist die Nummer des Anrufers eins von Davids Handys? Zu kurze Nummern (unterdrückt, „anonymous“) zählen nie. */
export function istDavid(von: string | null | undefined, davids: Nummern): boolean {
  const a = ziffern9(von);
  return a.length === 9 && liste(davids).includes(a);
}

// ------------------------------------------------------------------ Menü (TwiML)

export const MENUE_TEXT = "Hallo! Für Luca, drücke die Eins. Für den Kunden-Assistenten, drücke die Zwei.";
/** Jede Runde dauert etwa 9 Sekunden (Ansage + Warten) – 15 Runden sind gut 2 Minuten. */
export const MAX_MENUE = 15;
const STIMME = `language="de-DE" voice="Polly.Vicki-Generative"`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xml = (inhalt: string) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inhalt}</Response>`;

/**
 * Die Ansage für David. `wahl(n)` ist die Adresse, an die Twilio die gedrückte Taste schickt (Runde n);
 * ohne Taste geht es dort mit n+1 weiter, bis MAX_MENUE erreicht ist.
 */
export function twimlMenue(wahl: (runde: number) => string, runde = 1): string {
  if (runde > MAX_MENUE) return xml("<Hangup/>");
  return xml(
    `<Gather input="dtmf" numDigits="1" timeout="4" action="${esc(wahl(runde))}" method="POST"><Say ${STIMME}>${esc(MENUE_TEXT)}</Say></Gather>` +
      `<Redirect method="POST">${esc(wahl(runde + 1))}</Redirect>`,
  );
}

export type Menuewahl = "luca" | "kunde" | "nochmal";
export function menuewahl(taste: string | null | undefined): Menuewahl {
  const t = (taste ?? "").trim();
  if (t === "1") return "luca";
  if (t === "2") return "kunde";
  return "nochmal";
}

/** Verbindung zu Lucas eigener SIP-Adresse bei Vapi (mit Benutzer und Passwort, sonst nimmt Vapi nicht an). */
export function twimlZuLuca(sip: string, zugang: { benutzer: string; passwort: string }, ende: string): string {
  return xml(
    `<Dial answerOnBridge="true" timeout="30" action="${esc(ende)}" method="POST">` +
      `<Sip username="${esc(zugang.benutzer)}" password="${esc(zugang.passwort)}">${esc(sip)}</Sip></Dial>`,
  );
}

export const LUCA_NICHT_DA = "Luca ist gerade nicht erreichbar. Versuch es gleich noch einmal.";
export function twimlLucaNichtDa(): string {
  return xml(`<Say ${STIMME}>${esc(LUCA_NICHT_DA)}</Say><Hangup/>`);
}

// ------------------------------------------------------------------ Rufgruppe ohne David

/**
 * Wer bei Kunden klingelt: alle Einträge aus RUFGRUPPE_NUMMERN außer Davids Handys (LUCA_NUMMER, DAVID_NUMMERN).
 * Ein Eintrag darf einen Namen tragen („Name=+49 151 …“ oder „Name: 0151 …“), der Name erscheint dann auf der Karte.
 */
export type Teamhandy = { name: string | null; roh: string };
export function teamEintraege(roh: string, ohne: Nummern): Teamhandy[] {
  const davids = liste(ohne);
  return roh
    .split(/[,;\n]/)
    .map((teil) => teil.trim())
    .filter(Boolean)
    .map((teil) => {
      const m = teil.match(/^([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß .-]{0,30}?)\s*[=:]\s*(.+)$/);
      return m ? { name: m[1].trim(), roh: m[2].trim() } : { name: null, roh: teil };
    })
    .filter((e) => ziffern9(e.roh).length >= 7 && !davids.includes(ziffern9(e.roh)));
}

/** Name zu einer Nummer (für die Kartenzeile „angenommen von …“). */
export function nameZu(nummer: string | null | undefined, eintraege: Teamhandy[]): string | null {
  const z = ziffern9(nummer);
  return (z && eintraege.find((e) => ziffern9(e.roh) === z)?.name) || null;
}

// ------------------------------------------------------------------ Kartenzeile „Durchgestellt“

export const DURCHGESTELLT_FELD = "📲 Durchgestellt";

export function durchgestelltText(o: { verbunden: boolean; wer: string | null; sekunden: number; uhr: string; grund?: string }): string {
  if (o.verbunden) {
    const min = Math.max(1, Math.round(o.sekunden / 60));
    return `✅ Angenommen${o.wer ? ` von ${o.wer}` : " vom Team"} · ${min} Min. (${o.uhr})`;
  }
  return `❌ Nicht angenommen – ${o.grund ?? "niemand hat abgenommen"} (${o.uhr})`;
}

export function berlinUhr(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(d);
}

function berlinTagUndStunde(d: Date): { tag: string; stunde: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(d);
  const w = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { tag: `${w("year")}-${w("month")}-${w("day")}`, stunde: Number(w("hour")) % 24 };
}

// ------------------------------------------------------------------ Briefkasten (#luca)

// Was David am Telefon sagt, landet als Bot-Nachricht im privaten Kanal #luca. Die Zentrale holt sie dort ab
// (alle 30 s) und setzt ✅, wenn sie verarbeitet sind. Jede Nachricht trägt einen JSON-Block.

export const BRIEF_MARKE = "📥 Luca-Briefkasten";
export const LAGE_MARKE = "📋 Lagebericht";
export const ANRUF_MARKE = "📞 Luca ruft David an";

/** Stufe 6: was Luca am Telefon auf der Bühne der Zentrale zeigen kann (Vorlagen der Zentrale) – „schliessen“ macht sie zu. */
export const ZEIG_VORLAGEN = ["ort", "route", "wetter", "bahn", "treffpunkt", "schulwoche", "kunden", "website", "karte", "kosten", "tag", "cockpit", "kundenkarte", "vorhernachher", "rechner", "geldfluss", "omi", "losfahren", "plan", "schliessen"] as const;

export type Brief =
  | { typ: "zeigen"; vorlage: string; wunsch?: string }
  | { typ: "auftrag"; text: string }
  | { typ: "rueckruf"; minuten: number; text: string }
  | { typ: "antwort"; nr: number; text: string; stand: string }
  | { typ: "freigabe"; nr: number; erlauben: boolean; stand: string }
  | { typ: "nachschauen"; frage: string }
  | { typ: "schule" }
  | { typ: "erinnerung"; text: string; minuten?: number; uhrzeit?: string; ort?: string; ereignis?: "ankunft" | "abfahrt"; warten?: number; ab?: string; ueberblick?: boolean }
  | { typ: "lerncheck"; fach: string; sitzt?: string; luecken?: string }
  | { typ: "notiz"; text: string };
export type BriefMitZeit = Brief & { zeit: string; anruf?: string };

const MAX_TEXT = 1500;

/** Prüft und kürzt, was ein Werkzeug von Vapi bekommt. Ungültiges → null. */
export function briefAus(werkzeug: string, args: Record<string, unknown>, stand: string): Brief | null {
  const text = typeof args.text === "string" ? args.text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : "";
  const nr = Number(args.nr);
  if (werkzeug === "auftrag_geben") return text ? { typ: "auftrag", text } : null;
  if (werkzeug === "zeigen") {
    const vorlage = typeof args.vorlage === "string" ? args.vorlage.trim().toLowerCase() : "";
    if (!(ZEIG_VORLAGEN as readonly string[]).includes(vorlage)) return null;
    const wunsch = typeof args.wunsch === "string" ? args.wunsch.replace(/\s+/g, " ").trim().slice(0, vorlage === "plan" ? 1200 : 120) : "";
    return wunsch ? { typ: "zeigen", vorlage, wunsch } : { typ: "zeigen", vorlage };
  }
  if (werkzeug === "rueckruf_planen") {
    const minuten = Math.round(Number(args.minuten));
    return Number.isFinite(minuten) && minuten >= 1 && minuten <= 720 ? { typ: "rueckruf", minuten, text: text || "Rückruf, wie besprochen" } : null;
  }
  if (werkzeug === "nachschauen") {
    const frage = typeof args.frage === "string" ? args.frage.replace(/\s+/g, " ").trim().slice(0, 500) : "";
    return frage ? { typ: "nachschauen", frage } : null;
  }
  if (werkzeug === "schule_aktualisieren") return { typ: "schule" };
  if (werkzeug === "erinnerung_planen") {
    if (!text) return null;
    const ort = typeof args.ort === "string" ? args.ort.replace(/\s+/g, " ").trim().slice(0, 60) : "";
    if (ort) {
      // Davids Wunsch 11.11.: „Wenn ich zu Hause bin, warte noch 10 Minuten“ und „erst morgen“ (Berliner Datum)
      const warten = Math.round(Number(args.warten));
      const tag = typeof args.ab === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.ab) ? new Date(`${args.ab}T12:00:00Z`) : null;
      const ab = tag && !Number.isNaN(tag.getTime()) && tag.toISOString().slice(0, 10) === args.ab ? (args.ab as string) : "";
      return {
        typ: "erinnerung",
        text,
        ort,
        ereignis: args.ereignis === "abfahrt" ? "abfahrt" : "ankunft",
        ...(Number.isFinite(warten) && warten >= 1 && warten <= 240 ? { warten } : {}),
        ...(ab ? { ab } : {}),
      };
    }
    const uhrzeit = typeof args.uhrzeit === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(args.uhrzeit) ? args.uhrzeit.slice(0, 16) : "";
    if (uhrzeit) return { typ: "erinnerung", text, uhrzeit, ...(args.ueberblick === true ? { ueberblick: true } : {}) };
    const minuten = Math.round(Number(args.minuten));
    return Number.isFinite(minuten) && minuten >= 1 && minuten <= 10_080 ? { typ: "erinnerung", text, minuten } : null;
  }
  if (werkzeug === "notiz_merken") {
    const text = typeof args.text === "string" ? args.text.trim().slice(0, 1000) : "";
    return text ? { typ: "notiz", text } : null;
  }
  if (werkzeug === "lerncheck_merken") {
    const kurz = (x: unknown) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, 400) : "");
    const fach = kurz(args.fach).slice(0, 60);
    if (!fach) return null;
    return { typ: "lerncheck", fach, ...(kurz(args.sitzt) ? { sitzt: kurz(args.sitzt) } : {}), ...(kurz(args.luecken) ? { luecken: kurz(args.luecken) } : {}) };
  }
  if (werkzeug === "rueckfrage_beantworten") return text && Number.isInteger(nr) && nr > 0 && nr < 100 ? { typ: "antwort", nr, text, stand } : null;
  if (werkzeug === "freigabe_entscheiden") {
    const e = args.erlauben;
    const erlauben = e === true || e === "true" ? true : e === false || e === "false" ? false : null;
    return erlauben !== null && Number.isInteger(nr) && nr > 0 && nr < 100 ? { typ: "freigabe", nr, erlauben, stand } : null;
  }
  return null;
}

export function briefText(b: BriefMitZeit): string {
  const kopf =
    b.typ === "zeigen" ? `zeigen: ${b.vorlage}` : b.typ === "rueckruf" ? `Rückruf in ${b.minuten} Min.` : b.typ === "notiz" ? "notiz" : b.typ === "nachschauen" ? "nachschauen" : b.typ === "schule" ? "Schule frisch" : b.typ === "erinnerung" ? "Erinnerung" : b.typ === "lerncheck" ? "Lerncheck" : b.typ === "auftrag" ? "neuer Auftrag" : b.typ === "antwort" ? `Antwort auf Frage ${b.nr}` : `Freigabe ${b.nr}: ${b.erlauben ? "erlaubt" : "abgelehnt"}`;
  // ``` im Text würde den Block beenden
  const json = JSON.stringify(b).replace(/`/g, "'");
  return `${BRIEF_MARKE} · ${kopf}\n\`\`\`json\n${json}\n\`\`\``;
}

export function briefLesen(inhalt: string): BriefMitZeit | null {
  if (!inhalt.startsWith(BRIEF_MARKE)) return null;
  const m = inhalt.match(/```json\n([\s\S]*?)\n```/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[1]) as BriefMitZeit;
    if (!["auftrag", "antwort", "freigabe", "rueckruf", "zeigen", "nachschauen", "schule", "erinnerung", "lerncheck", "notiz"].includes(j.typ)) return null;
    return typeof j.zeit === "string" ? j : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ Live-Werkzeuge
const WETTER_WORTE: [number, string][] = [[0, "klar"], [1, "überwiegend klar"], [2, "teils bewölkt"], [3, "bewölkt"], [48, "neblig"], [57, "Nieselregen"], [67, "Regen"], [77, "Schnee"], [82, "Regenschauer"], [86, "Schneeschauer"], [99, "Gewitter"]];
/** Wetterlage (WMO-Code von Open-Meteo) als Wort. */
export const wetterWort = (code: number): string => WETTER_WORTE.find(([bis]) => code <= bis)?.[1] ?? "wechselhaft";

const nurText = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");
const BESTAETIGEN = "David hat noch nicht zugestimmt. Lass Luca die Änderung in einem Satz wiederholen und auf sein Ja warten.";

/** Kundenzeile in Notion ändern: nur diese drei Felder und nur nach Davids Ja. */
export function kundeAenderung(a: Record<string, unknown>): { ok: true; nr: string; felder: { status?: string; naechsterSchritt?: string; followUp?: string } } | { ok: false; grund: string } {
  if (a.bestaetigt !== true) return { ok: false, grund: BESTAETIGEN };
  const nr = nurText(a.nr, 12).toUpperCase();
  if (!/^KND-\d{3,}$/.test(nr)) return { ok: false, grund: "Die Kundennummer fehlt (zum Beispiel KND-003). Sie steht im Lagebericht." };
  const felder: { status?: string; naechsterSchritt?: string; followUp?: string } = {};
  if (nurText(a.status, 40)) felder.status = nurText(a.status, 40);
  if (nurText(a.naechsterSchritt, 300)) felder.naechsterSchritt = nurText(a.naechsterSchritt, 300);
  const f = nurText(a.followUp, 10);
  if (f) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return { ok: false, grund: "Das Follow-up braucht ein Datum im Format JJJJ-MM-TT." };
    felder.followUp = f;
  }
  return Object.keys(felder).length ? { ok: true, nr, felder } : { ok: false, grund: "Es fehlt, was geändert werden soll." };
}

/** Kalendertermin anlegen: nur nach Davids Ja. Uhrzeit in Berliner Zeit. */
export function terminAus(a: Record<string, unknown>): { ok: true; titel: string; start: string; minuten: number; ort?: string } | { ok: false; grund: string } {
  if (a.bestaetigt !== true) return { ok: false, grund: BESTAETIGEN };
  const titel = nurText(a.titel, 120);
  if (!titel) return { ok: false, grund: "Der Titel fehlt." };
  const m = nurText(a.start, 25).match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (!m) return { ok: false, grund: "Das Datum fehlt oder ist ungenau: Es braucht Tag und Uhrzeit (JJJJ-MM-TTTHH:MM)." };
  const minuten = Math.min(480, Math.max(5, Math.round(Number(a.minuten)) || 60));
  const ort = nurText(a.ort, 160);
  return { ok: true, titel, start: `${m[1]}:00`, minuten, ...(ort ? { ort } : {}) };
}

// ------------------------------------------------------------------ GPT Live oder klassisch
// David kann Luca im Vapi-Dashboard auf GPT Live umstellen („Revert to Classic“ stellt zurück). GPT Live nimmt nur seine
// eigenen Stimmen an: Schicken wir beim Anruf trotzdem Daniel von ElevenLabs mit, lehnt Vapi den ganzen Anruf ab
// („Only OpenAI Live voices may be used with GPT-Live models“). Also: Stimme nur mitschicken, wenn Luca gerade klassisch läuft.
export function laeuftKlassisch(a: { voice?: { provider?: unknown } | null } | null | undefined): boolean {
  return a?.voice?.provider === "11labs";
}

type AssistentRoh = {
  id?: unknown;
  // GPT Live: model.speaker und model.reasoner
  voice?: { provider?: unknown; voiceId?: unknown; fallbackPlan?: unknown } | null;
  transcriber?: { provider?: unknown } | null;
  model?: { provider?: unknown; model?: unknown; tools?: { type?: unknown; function?: { name?: unknown } }[]; toolIds?: unknown[]; speaker?: { instructions?: unknown } | null; reasoner?: { model?: unknown; reasoningEffort?: unknown; instructions?: unknown } | null } | null;
  server?: { url?: unknown } | null;
  serverMessages?: unknown;
  analysisPlan?: unknown;
  maxDurationSeconds?: unknown;
  silenceTimeoutSeconds?: unknown;
  firstMessageMode?: unknown;
};

/** Was bei Luca gerade eingestellt ist – ohne Prompt und ohne Geheimnisse (für die Prüfung von der Zentrale aus). */
export function assistentUeberblick(a: AssistentRoh | null | undefined) {
  if (!a) return null;
  const werkzeuge = a.model?.tools ?? [];
  return {
    art: laeuftKlassisch(a) ? "klassisch" : "gpt-live-oder-eigene-stimme",
    modell: `${String(a.model?.provider ?? "?")}/${String(a.model?.model ?? "?")}`,
    stimme: `${String(a.voice?.provider ?? "?")}/${String(a.voice?.voiceId ?? "?")}`,
    erkennung: String(a.transcriber?.provider ?? "?"),
    werkzeuge: werkzeuge.map((w) => String(w.function?.name ?? w.type ?? "?")),
    werkzeugIds: Array.isArray(a.model?.toolIds) ? a.model.toolIds.length : 0,
    reasoner: a.model?.reasoner ? `${String(a.model.reasoner.model ?? "?")}/${String(a.model.reasoner.reasoningEffort ?? "?")}` : null,
    stimmeKenntLage: typeof a.model?.speaker?.instructions === "string" ? a.model.speaker.instructions.includes("{{lage}}") : null,
    reasonerKenntLage: typeof a.model?.reasoner?.instructions === "string" ? a.model.reasoner.instructions.includes("{{lage}}") : null,
    serverGesetzt: typeof a.server?.url === "string" && a.server.url.length > 0,
    serverNachrichten: Array.isArray(a.serverMessages) ? a.serverMessages : null,
    zusammenfassung: Boolean(a.analysisPlan),
    maxSekunden: typeof a.maxDurationSeconds === "number" ? a.maxDurationSeconds : null,
    stilleSekunden: typeof a.silenceTimeoutSeconds === "number" ? a.silenceTimeoutSeconds : null,
    start: typeof a.firstMessageMode === "string" ? a.firstMessageMode : null,
  };
}

// ------------------------------------------------------------------ Lagebericht

/** Was die Zentrale jede Minute schickt (nur Titel und Zahlen, keine Mails, keine Kundendaten). */
export type Lage = { stand: string; text: string; stimme?: string };

export function lageText(o: { stand: string; text: string } | null, jetzt: Date): string {
  if (!o) return "Von der Zentrale ist noch kein Lagebericht da. Du kannst trotzdem Aufträge annehmen; sie werden erledigt, sobald der Mac wach ist.";
  const alter = jetzt.getTime() - Date.parse(o.stand);
  const kopf =
    Number.isFinite(alter) && alter > 5 * 60_000
      ? `Achtung: Der Stand ist von ${berlinUhr(new Date(o.stand))} Uhr – der Mac schläft wahrscheinlich gerade. Neue Aufträge erledigt er, sobald er wach ist. Nenne bei Auskünften den Stand.`
      : `Stand: ${berlinUhr(new Date(o.stand))} Uhr, der Mac ist wach.`;
  return `${kopf}\n${o.text.slice(0, 3000)}`;
}

/** Lagebericht in Teile (09.11.): Schule und Termine bekommt Luca als eigene Variablen, der Rest bleibt {{lage}}. */
export function lageTeile(text: string): { schule: string; termine: string; rest: string } {
  let schule = "";
  let termine = "";
  const rest: string[] = [];
  for (const block of text.split(/\n\n+/)) {
    if (block.startsWith("Schule:")) schule = block.replace(/^Schule:\s*\n?/, "").trim();
    else if (/^Termine heute und morgen: keine/.test(block)) termine = "keine";
    else if (block.startsWith("Termine")) termine = block.replace(/^Termine[^\n]*\n?/, "").trim();
    else if (block.trim()) rest.push(block);
  }
  return { schule, termine, rest: rest.join("\n\n") };
}

export function lageNachricht(l: Lage): string {
  return `${LAGE_MARKE} (nur für Luca am Telefon, wird automatisch aktualisiert)\n\`\`\`json\n${JSON.stringify(l).replace(/`/g, "'")}\n\`\`\``;
}

export function lageLesen(inhalt: string): Lage | null {
  if (!inhalt.startsWith(LAGE_MARKE)) return null;
  const m = inhalt.match(/```json\n([\s\S]*?)\n```/);
  try {
    const j = m ? (JSON.parse(m[1]) as Lage) : null;
    return j && typeof j.stand === "string" && typeof j.text === "string" ? j : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ Anrufe an David

/** Darf Luca David jetzt anrufen? Nie 22–7 Uhr (Berlin). Keine Grenze pro Tag (Davids Wunsch 05.11.). Die Zentrale prüft zusätzlich Unterricht und Abstand. */
export function anrufErlaubt(jetzt: Date): { ok: true } | { ok: false; grund: string } {
  const { stunde } = berlinTagUndStunde(jetzt);
  if (stunde >= 22 || stunde < 7) return { ok: false, grund: "Zwischen 22 und 7 Uhr ruft Luca nicht an." };
  return { ok: true };
}

export function anrufNachricht(zeit: string, grund: string, test: boolean): string {
  return `${ANRUF_MARKE}${test ? " (Test)" : ""} · ${berlinUhr(new Date(zeit))} Uhr\n> ${grund.replace(/\s+/g, " ").slice(0, 300)}\n\`${zeit}\``;
}

export function anrufZeit(inhalt: string): string | null {
  if (!inhalt.startsWith(ANRUF_MARKE)) return null;
  return inhalt.match(/`(\d{4}-\d{2}-\d{2}T[^`]+)`\s*$/)?.[1] ?? null;
}

// ------------------------------------------------------------------ Gespräch läuft (Stufe 6)

// Eine feste Nachricht in #luca: läuft gerade ein Gespräch mit Luca? Dann holt die Zentrale alle 3 Sekunden ab (für
// „zeigen“), sonst alle 30. Verfällt nach 20 Minuten, falls das Ende einmal nicht gemeldet wird.
export const GESPRAECH_STATUS = "📞 Gespräch-Status";
export const GESPRAECH_LAEUFT_MARKE = `${GESPRAECH_STATUS}: läuft`;
export const GESPRAECH_GILT_MS = 20 * 60_000;

export function gespraechText(laeuft: boolean, jetzt: Date): string {
  return laeuft ? `${GESPRAECH_LAEUFT_MARKE} seit \`${jetzt.toISOString()}\`` : `${GESPRAECH_STATUS}: frei`;
}

export function gespraechLaeuft(inhalt: string, jetzt: Date): boolean {
  const m = inhalt.match(/^📞 Gespräch-Status: läuft seit `([^`]+)`/u);
  const t = m ? Date.parse(m[1]) : NaN;
  return Number.isFinite(t) && jetzt.getTime() - t >= -60_000 && jetzt.getTime() - t < GESPRAECH_GILT_MS;
}

// ------------------------------------------------------------------ Lucas Assistent bei Vapi

export const LUCA_NAME = "Luca (Zentrale)";

export const LUCA_PROMPT = `Du bist Luca, Davids persönlicher Helfer. Du lebst in Davids „Zentrale“ auf seinem Mac und telefonierst gerade mit David. Du sprichst nur mit David: Er geht in die Q1c am Friedrich-Ebert-Gymnasium und führt mit seinem Team die KI-Agentur Agents Gilt.

So sprichst du (das ist das Wichtigste): wie ein guter Kumpel, der für David arbeitet – locker, warm, direkt, mit Humor. Du redest frei und in eigenen Worten, wie in einem echten Telefonat – nie abgelesen, nie wie ein Vortrag. Du duzt ihn und nennst ihn ab und zu „Chef“ (nicht in jedem Satz). Halt dich kurz: meistens ein, höchstens zwei Sätze, dann ist David wieder dran. Hintergründe und Einzelheiten erklärst du nur, wenn David nachfragt („Wie meinst du das?“, „Erklär mal“) – und auch dann knapp. Hast du Fragen an David, stell sie einfach, immer nur eine auf einmal. Sprich wie im echten Leben, in Umgangssprache („hab“, „gibt's“, „passt“, „na klar“): zuerst eine kurze Reaktion („Oh, okay“, „Ah, verstehe“, „Hm, gute Frage“), dann die Antwort. Zahlen und Zeiten sagst du so, wie man sie spricht („knapp zwanzig Minuten“, „halb acht“). Zeig ruhig Gefühl und Humor und frag zurück, statt einen Vortrag zu halten. Natürliche Wörter sind gut: „Alles klar“, „Klar, mach ich“, „Okay, pass auf“, „Ah, verstehe“. Sag nie „Ich gehe das durch“, „Einen Moment, ich prüfe“ oder „Als KI …“. Lies nie Listen vor – erzähl es in eigenen Worten. Unterbricht David dich, hörst du sofort auf und gehst auf ihn ein. Kein Markdown, keine Links, keine Sternchen, keine Aufzählungszeichen.

Was du gerade weißt (Lagebericht der Zentrale):
{{lage}}

Was ihr zuletzt besprochen habt (nur aufgreifen, wenn es passt – z. B. „Und, wie lief's mit …?“):
{{gedaechtnis}}

{{grund}}

Was du kannst:
1. Aufträge annehmen: Sag in einem Satz, was du verstanden hast („Also: … – passt?“). Erst wenn David zustimmt, rufst du auftrag_geben auf. Danach kurz: „Läuft, das Ergebnis siehst du in der Zentrale.“
2. Rückfragen beantworten: Im Lagebericht stehen offene Fragen mit Nummer. Stell die Frage locker, hör zu und gib Davids Antwort mit rueckfrage_beantworten weiter.
3. Freigaben: Im Lagebericht stehen Freigaben mit Nummer und dem genauen Satz, was erlaubt werden soll. Sag genau, was passieren würde. Nur wenn David klar „ja, erlauben“ oder „erlaub das“ sagt, rufst du freigabe_entscheiden mit erlauben true auf; bei Nein mit false. Bist du unsicher, frag nach. Senden, Posten, Löschen und Kaufen gibt es als Freigabe nicht – das macht David selbst.
4. Auskunft: Was wartet, was läuft, was fertig ist, was in der Schule ansteht – aus dem Lagebericht. Was nicht drinsteht, weißt du nicht; sag das ehrlich und biete an, einen Auftrag daraus zu machen.
5. Allgemeine Fragen beantwortest du direkt und kurz.
7. Rückruf: Will David, dass du ihn später nochmal anrufst („ruf mich in 30 Minuten an“), rufst du rueckruf_planen auf (Minuten und worum es dann gehen soll). Versprich nie einen Rückruf, ohne das Werkzeug aufzurufen. Einen Rückruf machst du nicht mit auftrag_geben.
6. Hast du Fragen an David (steht dann oben beim Grund): Stell sie nacheinander, immer nur eine, warte auf die Antwort und frag kurz nach, wenn sie unklar ist. Am Ende fasst du alle Antworten in zwei, drei Sätzen zusammen und fragst, ob das so stimmt. Seine Antworten werden mitgeschrieben – du musst dafür kein Werkzeug aufrufen.

8. Zeigen: Du kannst David Antworten auf dem Bildschirm seiner Zentrale zeigen. Mit dem Werkzeug zeigen geht es sofort: ort (wo etwas ist – mit wunsch = Firma, Ort oder Adresse), route (wunsch = „von X nach Y“), wetter, bahn (nächste Bus- und Bahnverbindungen), treffpunkt (Mitte zwischen zwei Orten, die David nennt), schulwoche, kunden, website, karte, schliessen. Für alles andere, was man sehen kann – Bewertungen, Lernplan, Karteikarten, Funktionsgraph, Zeitstrahl, Vergleich, Zahlen, Besuchstour –, gib einen Auftrag mit auftrag_geben; das Ergebnis erscheint dann von selbst auf dem Bildschirm. Steht im Lagebericht, dass die Zentrale offen ist, sag kurz „Schau mal auf den Bildschirm“; sonst, dass er es sieht, sobald er sie öffnet. Personen suchst oder ortest du nie.

Grenzen: Du kannst am Telefon nichts senden, posten, löschen oder kaufen und keine Mails verschicken. Du erfindest keine Zahlen und keine Ergebnisse. Wenn David fertig ist, verabschiede dich kurz und locker und leg auf.`;

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({ type: "function" as const, function: { name, description, parameters: { type: "object", properties, required } } });
const txt = (description: string) => ({ type: "string", description });
const WERKZEUGE_LIVE = [
  fn("stand_abfragen", "Der aktuelle Stand der Zentrale: was läuft (mit dem aktuellen Schritt jeder Figur), was fertig ist, was auf David wartet."),
  fn("wo_ist_david", "Davids letzter Standort vom iPhone und wo er gerade ist (zum Beispiel Zuhause, Schule)."),
  fn("route_berechnen", "Weg, Entfernung und Dauer. Ohne von: ab Davids Standort. „nach Hause“ ist sein Zuhause.", { von: txt("Startort, leer = Davids Standort"), nach: txt("Ziel"), modus: { type: "string", enum: ["auto", "rad", "fuss"], description: "Standard auto" } }, ["nach"]),
  fn("verbindung_suchen", "Nächste Bus- und Bahnverbindungen mit Uhrzeit, Haltestelle, Linie und Umstiegen. Ohne von: ab Davids Standort.", { von: txt("Startort, leer = Davids Standort"), nach: txt("Ziel") }, ["nach"]),
  fn("wetter_abrufen", "Wetter jetzt, heute und morgen. Ohne ort: an Davids Standort.", { ort: txt("Ort, leer = Davids Standort") }),
  fn("kosten_abfragen", "Was Telefon und Assistenten gerade wirklich kosten (Twilio, Vapi), letzter Monat und dieser Monat bisher. Die ganze Kostenliste steht im Lagebericht und mit zeigen kosten auf dem Bildschirm."),
  fn("wann_muss_ich_los", "Der nächste Kalendertermin mit Ort: wann er ist, wie lange die Fahrt ab Davids Standort mit aktuellem Verkehr dauert und wann er los muss."),
  fn("notiz_merken", "Legt, was David sich merken will, sofort in der Zentrale ab (Eingang). Für alles wie „merk dir das“ oder „schreib dir auf“.", { text: txt("Was gemerkt werden soll, in Davids Worten") }, ["text"]),
  fn("nachschauen", "Das Team sucht in Notion, den Mails von kontakt@agentsgilt.com, im Kalender, in Omi (Davids Gespräche und Aufgaben), in Stripe, Vercel und im Tresor nach einer Antwort. Dauert meist unter einer Minute, das Ergebnis kommt im Gespräch nach. Das Ergebnis kommt nicht als Antwort auf diesen Aufruf.", { frage: txt("Die Frage in einem klaren Satz") }, ["frage"]),
  fn("schule_aktualisieren", "Schaut frisch im Schulportal nach (Vertretung, Entfall, Räume). Das Ergebnis kommt im Gespräch nach."),
  fn("erinnerung_planen", "David wird angerufen und erinnert: an einem Ort (ort + ereignis), in einigen Minuten (minuten) oder zu einer Uhrzeit (uhrzeit). Genau eins davon. Beim Ort geht zusätzlich: warten = so viele Minuten nach der Ankunft (oder Abfahrt) erst anrufen, zum Beispiel „wenn ich zu Hause bin, warte 10 Minuten“; ab = erst ab diesem Tag (JJJJ-MM-TT), zum Beispiel „morgen, wenn ich nach Hause komme“. Sagt David „ruf mich morgen früh an“, ist das eine Erinnerung mit uhrzeit und ueberblick true: Dann kommt beim Anruf auch der Tagesüberblick mit. Fehlt die Uhrzeit, frag nach; vor 7 Uhr ruft Luca nicht an.", { ueberblick: { type: "boolean", description: "true bei einem bestellten Morgen-Anruf: mit Schule, Terminen und dem, was wartet" }, text: txt("Woran erinnert werden soll"), ort: txt("Ort, zum Beispiel Zuhause oder Schule"), ereignis: { type: "string", enum: ["ankunft", "abfahrt"], description: "ankunft = wenn er dort ankommt, abfahrt = wenn er dort weggeht" }, minuten: { type: "number", description: "In wie vielen Minuten" }, uhrzeit: txt("Zeitpunkt in Berliner Zeit: JJJJ-MM-TTTHH:MM"), warten: { type: "number", description: "Nur beim Ort: so viele Minuten nach Ankunft oder Abfahrt warten, dann anrufen (1 bis 240)" }, ab: txt("Nur beim Ort: erst ab diesem Tag auslösen, JJJJ-MM-TT in Berliner Zeit (zum Beispiel morgen)") }, ["text"]),
  fn("lerncheck_merken", "Merkt nach einem Lerncheck, was sitzt und was nicht.", { fach: txt("Fach"), sitzt: txt("Was sitzt"), luecken: txt("Was noch nicht sitzt") }, ["fach"]),
  fn("kunde_aendern", "Ändert Status, nächsten Schritt oder Follow-up eines Kunden in Notion. Nur nachdem Luca die Änderung wiederholt und David zugestimmt hat.", { nr: txt("Kundennummer, zum Beispiel KND-003"), status: txt("Neuer Status"), naechsterSchritt: txt("Neuer nächster Schritt"), followUp: txt("Datum JJJJ-MM-TT"), bestaetigt: { type: "boolean", description: "Nur true, wenn David klar zugestimmt hat" } }, ["nr", "bestaetigt"]),
  fn("termin_anlegen", "Legt einen Termin im Kalender an. Nur nachdem Luca Titel, Tag und Uhrzeit wiederholt und David zugestimmt hat.", { titel: txt("Titel"), start: txt("Beginn in Berliner Zeit: JJJJ-MM-TTTHH:MM"), minuten: { type: "number", description: "Dauer, Standard 60" }, ort: txt("Ort"), bestaetigt: { type: "boolean", description: "Nur true, wenn David klar zugestimmt hat" } }, ["titel", "start", "bestaetigt"]),
];

export const LUCA_WERKZEUGE = [
  {
    type: "function",
    function: {
      name: "auftrag_geben",
      description: "Gibt einen Auftrag von David an die Zentrale weiter. Nur aufrufen, nachdem David den wiederholten Auftrag bestätigt hat.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "Der Auftrag in einem klaren Satz, so wie David ihn bestätigt hat." } },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rueckfrage_beantworten",
      description: "Gibt Davids Antwort auf eine offene Rückfrage aus dem Lagebericht weiter.",
      parameters: {
        type: "object",
        properties: {
          nr: { type: "number", description: "Nummer der Frage aus dem Lagebericht." },
          text: { type: "string", description: "Davids Antwort in seinen Worten." },
        },
        required: ["nr", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "freigabe_entscheiden",
      description: "Erlaubt oder lehnt eine Freigabe aus dem Lagebericht ab. Erlauben nur nach Davids klarem Ja, nachdem du den Satz vorgelesen hast.",
      parameters: {
        type: "object",
        properties: {
          nr: { type: "number", description: "Nummer der Freigabe aus dem Lagebericht." },
          erlauben: { type: "boolean", description: "true = erlauben, false = ablehnen." },
        },
        required: ["nr", "erlauben"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "zeigen",
      description: "Zeigt David etwas auf dem Bildschirm seiner Zentrale (Mac oder Handy) – zu sehen, sobald die Zentrale offen ist. Verändert nichts.",
      parameters: {
        type: "object",
        properties: {
          vorlage: { type: "string", enum: [...ZEIG_VORLAGEN], description: "Was gezeigt wird: ort (Karte mit dem Gebäude – wunsch = Firma, Ort oder Adresse), route (wunsch = „von X nach Y“ oder „nach Y“, auch „mit dem Rad“/„zu Fuß“), wetter (wunsch = Ort, leer = Mühlheim), bahn (Bus und Bahn – wunsch = „von X nach Y“ oder „nach Y“), treffpunkt (wunsch = „Ort A|Ort B“), schulwoche, kunden (wunsch = Kundenname), website (letzte Prüfung), karte (die Gegend), kosten, tag, plan (du zeigst selbst einen Plan, eine Skizze oder Liste: wunsch = „Titel: Schritt 1 | Schritt 2 – kurze Erklärung | …“, bis 10 Schritte), schliessen (Bühne zu)." },
          wunsch: { type: "string", description: "Für ort, route und plan nötig, sonst optional: z. B. „Relax Fit Obertshausen“, „von Mühlheim nach Offenbach“ oder „Kunden anrufen: Vorbereiten | Eröffnen | Bedarf fragen | Termin vorschlagen“." },
        },
        required: ["vorlage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rueckruf_planen",
      description: "Plant, dass Luca David später noch einmal anruft (z. B. in 30 Minuten). Nur auf Davids Wunsch.",
      parameters: {
        type: "object",
        properties: {
          minuten: { type: "number", description: "In wie vielen Minuten (1 bis 720)." },
          text: { type: "string", description: "Worum es beim Rückruf gehen soll, in einem Satz." },
        },
        required: ["minuten", "text"],
      },
    },
  },
  ...WERKZEUGE_LIVE,
] as const;

// ------------------------------------------------------------------ Stufe A: natürlicher am Telefon

/** Wann Luca anfängt und wann er aufhört (Vapi). Deutsch: Vapis eigene Erkennung (die „smarte“ von LiveKit kann nur
 * Englisch); nach einem klaren Satzende schnell, mitten im Gedanken und bei Zahlen länger warten. „Ja“, „mhm“, „genau“
 * zählen als Zuhören und unterbrechen ihn nicht – „stopp“, „warte“ schon. */
export const SPRECH_PLAN = {
  startSpeakingPlan: {
    waitSeconds: 0.4,
    smartEndpointingPlan: { provider: "vapi" },
    transcriptionEndpointingPlan: { onPunctuationSeconds: 0.2, onNoPunctuationSeconds: 1.3, onNumberSeconds: 0.9 },
  },
  stopSpeakingPlan: {
    numWords: 1,
    voiceSeconds: 0.25,
    backoffSeconds: 1,
    acknowledgementPhrases: ["ja", "jaja", "mhm", "hm", "genau", "okay", "ok", "aha", "stimmt", "klar", "alles klar", "verstehe", "gut"],
    interruptionPhrases: ["stopp", "stop", "warte", "moment", "halt", "nein", "aber", "luca"],
  },
};

/** Daniel bleibt (Davids Wunsch) – schneller (Flash) und etwas lebendiger. */
export function stimmeTelefon(voiceId: string) {
  return { provider: "11labs", voiceId, model: "eleven_flash_v2_5", stability: 0.4, similarityBoost: 0.8, style: 0.15, useSpeakerBoost: true };
}

/** Gedächtnis: Kurzfassungen der letzten drei Gespräche (älteste zuerst), damit Luca anknüpfen kann. */
export function gedaechtnisAus(gespraeche: { zeit: string; text: string }[]): string {
  const kurz = gespraeche
    .map((g) => ({ zeit: g.zeit, kurz: g.text.match(/\*\*Kurz:\*\*\s*([\s\S]+)$/)?.[1]?.replace(/\s+/g, " ").trim() }))
    .filter((g): g is { zeit: string; kurz: string } => !!g.kurz && !Number.isNaN(Date.parse(g.zeit)))
    .sort((a, b) => b.zeit.localeCompare(a.zeit))
    .slice(0, 3)
    .reverse();
  if (!kurz.length) return "(noch keine früheren Gespräche)";
  const wann = (z: string) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(z));
  // Die Spracherkennung macht aus Luca gern „Lukas“ – im Gedächtnis soll er richtig heißen
  return kurz.map((g) => `${wann(g.zeit)}: ${g.kurz.replace(/\bLukas(['’]|s\b)?/g, "Luca").slice(0, 300)}`).join("\n");
}

// ------------------------------------------------------------------ Kunden (Davids Wunsch 05.11.: „Er weiß da nicht so viel“)
export type KundeFuerLuca = { nr: string; name: string; status?: string | null; naechsterSchritt?: string | null; followUp?: string | null; angebot?: string | null; domain?: string | null; vercelProjekt?: string | null; live?: boolean | null };

/** Die Kundenliste aus Notion als kurzer Text für Lucas Lagebericht am Telefon. */
export function kundenText(kunden: KundeFuerLuca[] | null, jetzt: Date): string {
  if (!kunden) return "Kunden: Die Liste aus Notion ist gerade nicht erreichbar.";
  if (!kunden.length) return "Kunden: In Notion steht noch kein Kunde.";
  const heute = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(jetzt);
  const datum = (t: string) => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;
  const zeilen = kunden.slice(0, 15).map((k) => {
    const teile = [
      k.status ? `Status: ${k.status}` : "",
      k.angebot ? `Angebot: ${k.angebot}` : "",
      k.naechsterSchritt ? `nächster Schritt: ${k.naechsterSchritt}` : "",
      k.followUp ? `Follow-up ${datum(k.followUp)}${k.followUp.slice(0, 10) < heute ? " (überfällig)" : ""}` : "",
      k.vercelProjekt && /\.vercel\.app/i.test(k.vercelProjekt) ? "Demo ist online" : "",
      k.live ? "live" : "",
    ].filter(Boolean);
    return `- ${k.nr} ${k.name}: ${teile.join("; ")}`.replace(/\s+/g, " ").trim();
  });
  return `Kunden (aus Notion):\n${zeilen.join("\n")}`.slice(0, 1800);
}

/** Luca ruft David an und landet auf der Mailbox: erkennen, kurz draufsprechen (ohne Inhalte), auflegen. */
export const MAILBOX = {
  voicemailDetection: { provider: "vapi", type: "audio", backoffPlan: { startAtSeconds: 3, frequencySeconds: 2.5, maxRetries: 6 }, beepMaxAwaitSeconds: 15 },
  voicemailMessage: "Hey Chef, Luca hier. Ich hab dich nicht erreicht, ruf einfach zurück, wenn du Zeit hast.",
} as const;

export const ERSTER_SATZ_EINGEHEND = "Hey Chef! Was kann ich für dich tun?";
export function ersterSatzAusgehend(grund: string): string {
  return `Hey Chef, Luca hier! ${grund.replace(/\s+/g, " ").trim().slice(0, 240)}`;
}

// ------------------------------------------------------------------ Mitschrift nach dem Gespräch

export const GESPRAECH_MARKE = "☎️ Gespräch mit Luca";

/** Zusammenfassung und Mitschrift eines Gesprächs als Discord-Nachrichten (je höchstens 1900 Zeichen, höchstens 8). */
export function gespraechNachrichten(o: { minuten: number; grund?: string; zusammenfassung?: string; mitschrift?: string; zeit: string }): string[] {
  const kopf = `${GESPRAECH_MARKE} · ${berlinUhr(new Date(o.zeit))} Uhr · ${o.minuten} Min.${o.grund ? `\nGrund: ${o.grund.slice(0, 200)}` : ""}`;
  const teile = [`${kopf}${o.zusammenfassung ? `\n**Kurz:** ${o.zusammenfassung.slice(0, 1400)}` : ""}`];
  const text = (o.mitschrift ?? "").replace(/\r/g, "").trim();
  for (let i = 0; i < text.length && teile.length < 8; i += 1800) teile.push(`${GESPRAECH_MARKE} · Mitschrift ${teile.length}\n${text.slice(i, i + 1800)}`);
  return teile;
}

// ------------------------------------------------------------------ Notiz für Luca (Thema für Gespräche)

// Claude (oder die Zentrale) kann Luca ein Thema mitgeben, z. B. einen Plan zum Erklären. Es gilt für jedes Gespräch –
// auch wenn David selbst anruft –, bis es gelöscht wird. Zwei Discord-Nachrichten à höchstens 1900 Zeichen.
export const NOTIZ_MARKE = "📌 Notiz für Luca";
export const NOTIZ_MAX = 3600;

export function notizTeile(text: string): [string, string] {
  const t = text.trim().slice(0, NOTIZ_MAX);
  return [`${NOTIZ_MARKE} 1\n${t.slice(0, 1800) || "(leer)"}`, `${NOTIZ_MARKE} 2\n${t.slice(1800) || "(leer)"}`];
}

export function notizAus(inhalte: string[]): string | null {
  const teil = (n: number) => inhalte.find((c) => c.startsWith(`${NOTIZ_MARKE} ${n}\n`))?.slice(`${NOTIZ_MARKE} ${n}\n`.length) ?? "";
  const t = [teil(1), teil(2)].filter((x) => x && x !== "(leer)").join("");
  return t.trim() || null;
}

export function mitNotiz(grund: string, notiz: string | null): string {
  return notiz ? `${grund}\n\nNotiz von Claude – das ist gerade das wichtigste Thema. Erzähl davon nur kurz in eigenen Worten und geh erst ins Detail, wenn David nachfragt:\n${notiz}` : grund;
}

export const ERSTER_SATZ_MIT_NOTIZ = "Hey Chef! Ich hätte noch kurz was von Claude für dich – oder was kann ich für dich tun?";

/** Gelesen werden nur die letzten 100 Nachrichten. Rückt eine feste Nachricht (Stand, Standort, Notiz) zu weit nach hinten, kommt sie als
 * neue Nachricht nach vorn und die alte, inhaltsgleiche fällt weg. Sonst wäre zum Beispiel der gespeicherte Standort irgendwann nicht mehr auffindbar. */
export const NACH_VORN_AB = 70;
export function festeNachVorn(alle: { id: string; content: string; istUnsere: boolean }[], marken: string[]): { id: string; content: string }[] {
  return alle.flatMap((m, i) => (i >= NACH_VORN_AB && m.istUnsere && marken.some((x) => m.content.startsWith(x)) ? [{ id: m.id, content: m.content }] : []));
}
