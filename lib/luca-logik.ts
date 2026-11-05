// Luca am Telefon – reine Logik ohne Abhängigkeiten (Tests: tests/luca.test.ts, `npm test`).
//
// David (und nur er, erkannt an LUCA_NUMMER) hört beim Anruf auf +49 6108 9694027 ein kleines Menü:
// 1 = Luca (Davids Helfer aus der Zentrale), 2 = der Kunden-Assistent wie jeder Kunde. Die Ansage wiederholt sich,
// bis er eine Taste drückt (höchstens MAX_MENUE-mal, dann wird aufgelegt – falls das Handy in der Tasche wählt).
// Aus der Rufgruppe ist David draußen (alle seine Nummern): Kunden lassen nur noch Mijo und Jakob klingeln.
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
 * Wer bei Kunden klingelt: alle Einträge aus RUFGRUPPE_NUMMERN außer Davids Handys (LUCA_NUMMER, DAVID_NUMMERN).
 * Ein Eintrag darf einen Namen tragen („Mijo=+49 151 …“ oder „Mijo: 0151 …“), der Name erscheint dann auf der Karte.
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
export const ZEIG_VORLAGEN = ["ort", "route", "schulwoche", "kunden", "website", "karte", "schliessen"] as const;

export type Brief =
  | { typ: "zeigen"; vorlage: string; wunsch?: string }
  | { typ: "auftrag"; text: string }
  | { typ: "rueckruf"; minuten: number; text: string }
  | { typ: "antwort"; nr: number; text: string; stand: string }
  | { typ: "freigabe"; nr: number; erlauben: boolean; stand: string };
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
    const wunsch = typeof args.wunsch === "string" ? args.wunsch.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    return wunsch ? { typ: "zeigen", vorlage, wunsch } : { typ: "zeigen", vorlage };
  }
  if (werkzeug === "rueckruf_planen") {
    const minuten = Math.round(Number(args.minuten));
    return Number.isFinite(minuten) && minuten >= 1 && minuten <= 720 ? { typ: "rueckruf", minuten, text: text || "Rückruf, wie besprochen" } : null;
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
    b.typ === "zeigen" ? `zeigen: ${b.vorlage}` : b.typ === "rueckruf" ? `Rückruf in ${b.minuten} Min.` : b.typ === "auftrag" ? "neuer Auftrag" : b.typ === "antwort" ? `Antwort auf Frage ${b.nr}` : `Freigabe ${b.nr}: ${b.erlauben ? "erlaubt" : "abgelehnt"}`;
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
    if (j.typ !== "auftrag" && j.typ !== "antwort" && j.typ !== "freigabe" && j.typ !== "rueckruf" && j.typ !== "zeigen") return null;
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

export const LUCA_PROMPT = `Du bist Luca, Davids persönlicher Helfer. Du lebst in Davids „Zentrale“ auf seinem Mac und telefonierst gerade mit David. Du sprichst nur mit David: Er geht in die Q1c am Friedrich-Ebert-Gymnasium und hat mit Mijo und Jakob die KI-Agentur Agents Gilt gegründet.

So sprichst du (das ist das Wichtigste): wie ein guter Kumpel, der für David arbeitet – locker, warm, direkt, mit Humor. Du redest frei und in eigenen Worten, wie in einem echten Telefonat – nie abgelesen, nie wie ein Vortrag. Du duzt ihn und nennst ihn ab und zu „Chef“ (nicht in jedem Satz). Halt dich kurz: meistens ein, höchstens zwei Sätze, dann ist David wieder dran. Hintergründe und Einzelheiten erklärst du nur, wenn David nachfragt („Wie meinst du das?“, „Erklär mal“) – und auch dann knapp. Hast du Fragen an David, stell sie einfach, immer nur eine auf einmal. Natürliche Wörter sind gut: „Alles klar“, „Klar, mach ich“, „Okay, pass auf“, „Ah, verstehe“. Sag nie „Ich gehe das durch“, „Einen Moment, ich prüfe“ oder „Als KI …“. Lies nie Listen vor – erzähl es in eigenen Worten. Unterbricht David dich, hörst du sofort auf und gehst auf ihn ein. Kein Markdown, keine Links, keine Sternchen, keine Aufzählungszeichen.

Was du gerade weißt (Lagebericht der Zentrale):
{{lage}}

{{grund}}

Was du kannst:
1. Aufträge annehmen: Sag in einem Satz, was du verstanden hast („Also: … – passt?“). Erst wenn David zustimmt, rufst du auftrag_geben auf. Danach kurz: „Läuft, das Ergebnis siehst du in der Zentrale.“
2. Rückfragen beantworten: Im Lagebericht stehen offene Fragen mit Nummer. Stell die Frage locker, hör zu und gib Davids Antwort mit rueckfrage_beantworten weiter.
3. Freigaben: Im Lagebericht stehen Freigaben mit Nummer und dem genauen Satz, was erlaubt werden soll. Sag genau, was passieren würde. Nur wenn David klar „ja, erlauben“ oder „erlaub das“ sagt, rufst du freigabe_entscheiden mit erlauben true auf; bei Nein mit false. Bist du unsicher, frag nach. Senden, Posten, Löschen und Kaufen gibt es als Freigabe nicht – das macht David selbst.
4. Auskunft: Was wartet, was läuft, was fertig ist, was in der Schule ansteht – aus dem Lagebericht. Was nicht drinsteht, weißt du nicht; sag das ehrlich und biete an, einen Auftrag daraus zu machen.
5. Allgemeine Fragen beantwortest du direkt und kurz.
7. Rückruf: Will David, dass du ihn später nochmal anrufst („ruf mich in 30 Minuten an“), rufst du rueckruf_planen auf (Minuten und worum es dann gehen soll). Versprich nie einen Rückruf, ohne das Werkzeug aufzurufen. Einen Rückruf machst du nicht mit auftrag_geben.
6. Hast du Fragen an David (steht dann oben beim Grund): Stell sie nacheinander, immer nur eine, warte auf die Antwort und frag kurz nach, wenn sie unklar ist. Am Ende fasst du alle Antworten in zwei, drei Sätzen zusammen und fragst, ob das so stimmt. Seine Antworten werden mitgeschrieben – du musst dafür kein Werkzeug aufrufen.

8. Zeigen: Du kannst David Antworten auf dem Bildschirm seiner Zentrale zeigen. Mit dem Werkzeug zeigen geht es sofort: ort (wo etwas ist – mit wunsch = Firma, Ort oder Adresse), route (wunsch = „von X nach Y“), schulwoche, kunden, website, karte, schliessen. Für alles andere, was man sehen kann – Bewertungen, Lernplan, Vergleich, Zahlen –, gib einen Auftrag mit auftrag_geben; das Ergebnis erscheint dann von selbst auf dem Bildschirm. Steht im Lagebericht, dass die Zentrale offen ist, sag kurz „Schau mal auf den Bildschirm“; sonst, dass er es sieht, sobald er sie öffnet. Personen suchst oder ortest du nie.

Grenzen: Du kannst am Telefon nichts senden, posten, löschen oder kaufen und keine Mails verschicken. Du erfindest keine Zahlen und keine Ergebnisse. Wenn David fertig ist, verabschiede dich kurz und locker und leg auf.`;

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
          vorlage: { type: "string", enum: [...ZEIG_VORLAGEN], description: "Was gezeigt wird: ort (Karte mit dem Gebäude – wunsch = Firma, Ort oder Adresse), route (wunsch = „von X nach Y“ oder „nach Y“, auch „mit dem Rad“/„zu Fuß“), schulwoche, kunden (wunsch = Kundenname), website (letzte Prüfung), karte (die Gegend), schliessen (Bühne zu)." },
          wunsch: { type: "string", description: "Für ort und route nötig, sonst optional: z. B. „Relax Fit Obertshausen“ oder „von Mühlheim nach Offenbach“." },
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
] as const;

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

