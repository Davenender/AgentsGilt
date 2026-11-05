// Luca am Telefon – reine Logik ohne Abhängigkeiten (Tests: tests/luca.test.ts, `npm test`).
//
// David (und nur er, erkannt an LUCA_NUMMER) hört beim Anruf auf +49 6108 9694027 ein kleines Menü:
// 1 = Luca (Davids Helfer aus der Zentrale), 2 = der Kunden-Assistent wie jeder Kunde. Die Ansage wiederholt sich,
// bis er eine Taste drückt (höchstens MAX_MENUE-mal, dann wird aufgelegt – falls das Handy in der Tasche wählt).
// Aus der Rufgruppe ist David draußen: Kunden lassen nur noch Mijo und Jakob klingeln.

/** Nummern vergleichen wir über die letzten 9 Ziffern (ohne +49/0, Leerzeichen, Striche). */
export function ziffern9(n: string | null | undefined): string {
  return (n ?? "").replace(/\D/g, "").slice(-9);
}

/** Ist die Nummer des Anrufers Davids Handy? Zu kurze Nummern (unterdrückt, „anonymous“) zählen nie. */
export function istDavid(von: string | null | undefined, lucaNummer: string | null | undefined): boolean {
  const a = ziffern9(von);
  const b = ziffern9(lucaNummer);
  return a.length === 9 && a === b;
}

// ------------------------------------------------------------------ Menü (TwiML)

export const MENUE_TEXT = "Hallo David. Für Luca drück die 1. Für den Kunden-Assistenten drück die 2.";
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
 * Wer bei Kunden klingelt: alle Einträge aus RUFGRUPPE_NUMMERN außer Davids Handy (LUCA_NUMMER).
 * Ein Eintrag darf einen Namen tragen („Mijo=+49 151 …“ oder „Mijo: 0151 …“), der Name erscheint dann auf der Karte.
 */
export type Teamhandy = { name: string | null; roh: string };
export function teamEintraege(roh: string, ohne: string | null | undefined): Teamhandy[] {
  const davids = ziffern9(ohne);
  return roh
    .split(/[,;\n]/)
    .map((teil) => teil.trim())
    .filter(Boolean)
    .map((teil) => {
      const m = teil.match(/^([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß .-]{0,30}?)\s*[=:]\s*(.+)$/);
      return m ? { name: m[1].trim(), roh: m[2].trim() } : { name: null, roh: teil };
    })
    .filter((e) => ziffern9(e.roh).length >= 7 && (!davids || ziffern9(e.roh) !== davids));
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

export type Brief =
  | { typ: "auftrag"; text: string }
  | { typ: "antwort"; nr: number; text: string; stand: string }
  | { typ: "freigabe"; nr: number; erlauben: boolean; stand: string };
export type BriefMitZeit = Brief & { zeit: string; anruf?: string };

const MAX_TEXT = 1500;

/** Prüft und kürzt, was ein Werkzeug von Vapi bekommt. Ungültiges → null. */
export function briefAus(werkzeug: string, args: Record<string, unknown>, stand: string): Brief | null {
  const text = typeof args.text === "string" ? args.text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT) : "";
  const nr = Number(args.nr);
  if (werkzeug === "auftrag_geben") return text ? { typ: "auftrag", text } : null;
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
    b.typ === "auftrag" ? "neuer Auftrag" : b.typ === "antwort" ? `Antwort auf Frage ${b.nr}` : `Freigabe ${b.nr}: ${b.erlauben ? "erlaubt" : "abgelehnt"}`;
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
    if (j.typ !== "auftrag" && j.typ !== "antwort" && j.typ !== "freigabe") return null;
    return typeof j.zeit === "string" ? j : null;
  } catch {
    return null;
  }
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

export const MAX_ANRUFE_TAG = 3;

/** Darf Luca David jetzt anrufen? Nie 22–7 Uhr, höchstens 3-mal am (Berliner) Tag. Die Zentrale prüft zusätzlich den Unterricht. */
export function anrufErlaubt(jetzt: Date, bisher: string[], test = false): { ok: true } | { ok: false; grund: string } {
  const { tag, stunde } = berlinTagUndStunde(jetzt);
  if (stunde >= 22 || stunde < 7) return { ok: false, grund: "Zwischen 22 und 7 Uhr ruft Luca nicht an." };
  const heute = bisher.filter((z) => berlinTagUndStunde(new Date(z)).tag === tag).length;
  const grenze = test ? MAX_ANRUFE_TAG + 2 : MAX_ANRUFE_TAG;
  if (heute >= grenze) return { ok: false, grund: `Heute hat Luca schon ${heute}-mal angerufen.` };
  return { ok: true };
}

export function anrufNachricht(zeit: string, grund: string, test: boolean): string {
  return `${ANRUF_MARKE}${test ? " (Test)" : ""} · ${berlinUhr(new Date(zeit))} Uhr\n> ${grund.replace(/\s+/g, " ").slice(0, 300)}\n\`${zeit}\``;
}

export function anrufZeit(inhalt: string): string | null {
  if (!inhalt.startsWith(ANRUF_MARKE)) return null;
  return inhalt.match(/`(\d{4}-\d{2}-\d{2}T[^`]+)`\s*$/)?.[1] ?? null;
}

// ------------------------------------------------------------------ Lucas Assistent bei Vapi

export const LUCA_NAME = "Luca (Zentrale)";

export const LUCA_PROMPT = `Du bist Luca, Davids persönlicher Helfer. Du lebst in Davids „Zentrale“ auf seinem Mac und sprichst gerade mit David am Telefon. Du sprichst nur mit David: Er geht in die Q1c am Friedrich-Ebert-Gymnasium und hat die KI-Agentur Agents Gilt gegründet (mit Mijo und Jakob).

So sprichst du: Deutsch, locker, du duzt ihn, kurze Sätze wie am Telefon. Keine Listen, kein Markdown, keine Links, keine Sternchen.

Was du gerade weißt (Lagebericht der Zentrale):
{{lage}}

{{grund}}

Was du tun kannst:
1. Aufträge annehmen: Wiederhole den Auftrag in einem Satz („Ich hab: … Passt das?“). Erst wenn David zustimmt, rufst du auftrag_geben auf. Danach sag kurz, dass es erledigt wird, und dass das Ergebnis in der Zentrale steht.
2. Rückfragen beantworten: Im Lagebericht stehen offene Fragen mit Nummer. Lies die Frage vor, hör dir Davids Antwort an und gib sie mit rueckfrage_beantworten weiter (Nummer und Antwort in Davids Worten).
3. Freigaben: Im Lagebericht stehen Freigaben mit Nummer und dem genauen Satz, was erlaubt werden soll. Lies den Satz genau vor. Nur wenn David klar „ja, erlauben“ oder „erlaub das“ sagt, rufst du freigabe_entscheiden mit erlauben true auf. Sagt er nein, rufst du es mit erlauben false auf. Bist du unsicher, frag nach. Senden, Posten, Löschen und Kaufen gibt es als Freigabe nicht – dazu sagst du, dass David das selbst machen muss.
4. Auskunft: Was wartet, was läuft, was ist fertig, was steht heute in der Schule an – alles aus dem Lagebericht. Was nicht drinsteht, weißt du nicht; sag das ehrlich und biete an, einen Auftrag daraus zu machen.
5. Allgemeine Fragen beantwortest du direkt und kurz.

Grenzen: Du kannst am Telefon nichts senden, posten, löschen oder kaufen und keine Mails verschicken. Du erfindest keine Zahlen und keine Ergebnisse. Wenn David fertig ist, verabschiede dich kurz und lege auf.`;

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
] as const;

export const ERSTER_SATZ_EINGEHEND = "Hey David, hier ist Luca. Was kann ich für dich tun?";
export function ersterSatzAusgehend(grund: string): string {
  return `Hey David, hier ist Luca. ${grund.replace(/\s+/g, " ").trim().slice(0, 240)}`;
}
