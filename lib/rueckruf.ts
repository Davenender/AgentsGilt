import { editMessage, getMessage, listMessages, replyTo } from "@/lib/discord";
import {
  callComponents,
  confirmedByCallback,
  currentAppointment,
  originalWish,
  ownerId,
  OWNER_FIELD,
  resolveMobile,
  RUECKRUF_FIELD,
  rueckrufKonfiguriert,
  stateOf,
  withField,
  type EmbedLike,
} from "@/lib/discord-calls";
import { bestaetigeKalender } from "@/lib/google-calendar";
import { offeneKarteZuNummer } from "@/lib/anruf-karte";
import { kundeWuenscht } from "@/lib/termin-antwort";

// Rückruf-Agent: Ein KI-Assistent in Vapi ruft den Kunden an (z.B. wenn keine SMS möglich ist,
// weil er vom Festnetz angerufen hat), nennt den Termin und fragt, ob er passt.
//   Ja            -> Termin ist bestätigt (Karte grün, Kalender angepasst)
//   anderer Wunsch -> Wunsch steht auf der Karte, das Team bestätigt
//   nicht erreicht -> Notiz auf der Karte, später erneut (täglich 8 bis 22 Uhr, höchstens 3 Versuche)
// Der Stand steht im Feld "Rückruf" der Karte in #anrufe, wie bei den übrigen Zuständen.
//
// Env (Vercel): VAPI_API_KEY (privater Schlüssel), VAPI_RUECKRUF_ASSISTANT (ID des Rückruf-Assistenten),
// optional VAPI_NUMBER_ID (Absendernummer in Vapi).

const MAX_VERSUCHE = 3;
const ABSTAND_STUNDEN = 3;
const FENSTER_VON = 8;
const FENSTER_BIS = 22;
const NUMBER_ID = process.env.VAPI_NUMBER_ID || "fce24a66-191e-419b-a138-c1d0703bdf7d";

export const RUECKRUF_WERKZEUGE = new Set(["termin_bestaetigt", "anderer_termin", "spaeter_nochmal", "notiz"]);

// ------------------------------------------------------------------- Zeit

function berlinTeile(ts: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

function berlinZuTs(y: number, m: number, d: number, h: number, min: number): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const t = berlinTeile(guess);
  return guess - (Date.UTC(t.y, t.m - 1, t.d, t.h, t.min) - guess);
}

export function imRueckrufFenster(jetzt = Date.now()): boolean {
  const h = berlinTeile(jetzt).h;
  return h >= FENSTER_VON && h < FENSTER_BIS;
}

/** Nächster Versuch: in 3 Stunden, aber nur innerhalb der Anrufzeiten, sonst ab 8 Uhr. */
export function naechsterVersuch(jetzt = Date.now()): number {
  const ziel = jetzt + ABSTAND_STUNDEN * 3600_000;
  const t = berlinTeile(ziel);
  if (t.h >= FENSTER_VON && t.h < FENSTER_BIS) return ziel;
  return fensterBeginn(ziel, t.h < FENSTER_VON ? 0 : 1);
}

function fensterBeginn(ts: number, tageDazu: number): number {
  const t = berlinTeile(ts);
  const tag = new Date(Date.UTC(t.y, t.m - 1, t.d + tageDazu));
  return berlinZuTs(tag.getUTCFullYear(), tag.getUTCMonth() + 1, tag.getUTCDate(), FENSTER_VON, 0);
}

function uhrzeit(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

// ------------------------------------------------------- Stand auf der Karte

const feld = (embed: EmbedLike) => embed.fields?.find((f) => f.name === RUECKRUF_FIELD)?.value ?? "";
const mitStand = (embed: EmbedLike, text: string): EmbedLike => ({ ...embed, fields: withField(embed.fields, RUECKRUF_FIELD, text) });

const textLaeuft = (n: number) => `📞 Anruf läuft (Versuch ${n} von ${MAX_VERSUCHE})`;
const textGeplant = (grund: string, n: number, ts: number) =>
  `📞 ${grund}. Geplant: Versuch ${n} von ${MAX_VERSUCHE} <t:${Math.floor(ts / 1000)}:R>`;

const laeuftVersuch = (embed: EmbedLike) => Number(feld(embed).match(/Anruf läuft \(Versuch (\d) von/)?.[1]) || null;
const geplant = (embed: EmbedLike) => {
  const m = feld(embed).match(/Geplant: Versuch (\d) von \d <t:(\d+):R>/);
  return m ? { versuch: Number(m[1]), ts: Number(m[2]) * 1000 } : null;
};

/** Speichert die Karte mit den passenden Knöpfen. */
async function speichere(messageId: string, embed: EmbedLike): Promise<boolean> {
  return editMessage(process.env.DISCORD_BOT_TOKEN, process.env.DISCORD_CHANNEL_ANRUFE, messageId, {
    embeds: [embed],
    components: callComponents(stateOf(embed), Boolean(ownerId(embed)), embed),
  });
}

function antworte(messageId: string, embed: EmbedLike, text: string) {
  const bearbeiter = embed.fields?.find((f) => f.name === OWNER_FIELD)?.value;
  return replyTo(process.env.DISCORD_BOT_TOKEN, process.env.DISCORD_CHANNEL_ANRUFE, messageId, `${text}${bearbeiter ? ` (${bearbeiter})` : ""}`);
}

// ------------------------------------------------------------------ Anruf

type Start = { ok: true; embed: EmbedLike } | { ok: false; fehler: string };

/**
 * Startet den Rückruf-Anruf (oder plant ihn auf 8 Uhr, wenn gerade keine Anrufzeit ist).
 * Gibt die Karte mit dem neuen Stand zurück. Speichern übernimmt der Aufrufer.
 */
export async function starteRueckruf(messageId: string, embed: EmbedLike, versuch = 1): Promise<Start> {
  if (!rueckrufKonfiguriert()) {
    return { ok: false, fehler: "Der Rückruf ist noch nicht eingerichtet (VAPI_API_KEY und VAPI_RUECKRUF_ASSISTANT fehlen bei Vercel)." };
  }
  const termin = currentAppointment(embed);
  if (!termin) return { ok: false, fehler: "In der Meldung steht kein Termin. Bitte erst über „Anderen Termin vorschlagen“ einen Termin eintragen." };
  const ziel = resolveMobile(embed).seen[0];
  if (!ziel) return { ok: false, fehler: "In der Meldung steht keine Rufnummer. Bitte den Kunden selbst anrufen." };
  if (laeuftVersuch(embed)) return { ok: false, fehler: "Der Rückruf läuft gerade schon." };

  if (!imRueckrufFenster()) {
    const ts = fensterBeginn(Date.now(), berlinTeile(Date.now()).h < FENSTER_VON ? 0 : 1);
    return { ok: true, embed: mitStand(embed, textGeplant("Gerade keine Anrufzeit (8 bis 22 Uhr)", versuch, ts)) };
  }

  const feldWert = (name: string) => embed.fields?.find((f) => f.name === name)?.value ?? "";
  const name = feldWert("Anrufer").trim();
  const state = stateOf(embed);
  const art = state === "proposed" ? "vorschlag" : "bestaetigung";
  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantId: process.env.VAPI_RUECKRUF_ASSISTANT!.trim(),
        phoneNumberId: NUMBER_ID,
        customer: { number: ziel },
        assistantOverrides: {
          variableValues: {
            anrufer: name || "unbekannt",
            betrieb: feldWert("Betrieb"),
            // Die Begrüßungsfrage: mit Namen, wenn wir ihn kennen. Nennt sonst nichts Persönliches.
            frage: name ? `Spreche ich mit ${name}?` : "Hatten Sie bei uns wegen eines Termins angerufen?",
            termin,
            art,
            karte: messageId,
          },
          metadata: { karte: messageId, versuch },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[rueckruf] Vapi HTTP ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, fehler: `Vapi hat den Anruf abgelehnt (HTTP ${res.status}).` };
    }
  } catch (err) {
    console.error("[rueckruf] Vapi nicht erreichbar:", err);
    return { ok: false, fehler: "Vapi war nicht erreichbar. Bitte gleich nochmal versuchen." };
  }
  return { ok: true, embed: mitStand(embed, textLaeuft(versuch)) };
}

/** Karte für den Fall "nicht erreicht": nächster Versuch planen oder aufgeben. */
async function planeOderGibAuf(messageId: string, embed: EmbedLike, n: number, grund: string) {
  if (n >= MAX_VERSUCHE) {
    await speichere(messageId, mitStand(embed, `📞 ${grund}. Nach ${MAX_VERSUCHE} Versuchen nicht erreicht: bitte selbst anrufen.`));
    await antworte(messageId, embed, `📞 Der Kunde wurde nach ${MAX_VERSUCHE} Versuchen nicht erreicht. Bitte selbst anrufen.`);
    return;
  }
  const ts = naechsterVersuch();
  await speichere(messageId, mitStand(embed, textGeplant(grund, n + 1, ts)));
  await antworte(messageId, embed, `📞 ${grund}. Die KI versucht es wieder <t:${Math.floor(ts / 1000)}:f>.`);
}

// ---------------------------------------------------------------- Wiederholen

/** Wird regelmäßig aufgerufen (GitHub Actions): startet fällige Wiederholungen, solange Anrufzeit ist. */
export async function faelligeWiederholungen(): Promise<{ gestartet: number; offen: number }> {
  const channel = process.env.DISCORD_CHANNEL_ANRUFE;
  if (!channel || !rueckrufKonfiguriert() || !imRueckrufFenster()) return { gestartet: 0, offen: 0 };
  let gestartet = 0;
  let offen = 0;
  for (const m of await listMessages(process.env.DISCORD_BOT_TOKEN, channel, 100)) {
    const embed = m.embeds?.[0];
    if (!embed) continue;
    const state = stateOf(embed);
    if (state === "confirmed" || state === "done") continue;
    const plan = geplant(embed);
    if (!plan) continue;
    offen++;
    if (plan.ts > Date.now()) continue;
    const res = await starteRueckruf(m.id, embed, plan.versuch);
    if (!res.ok) {
      await speichere(m.id, mitStand(embed, `📞 Rückruf konnte nicht gestartet werden: ${res.fehler}`));
      await antworte(m.id, embed, `⚠️ Der geplante Rückruf konnte nicht gestartet werden: ${res.fehler}`);
      continue;
    }
    await speichere(m.id, res.embed);
    gestartet++;
  }
  return { gestartet, offen };
}

// ---------------------------------------------------------------- Zuordnung

/** Die Meldung, zu der ein Rückruf-Anruf gehört (aus den Angaben beim Start, sonst über die Nummer). */
export async function karteZuAnruf(call: unknown): Promise<string | null> {
  const c = call as
    | {
        type?: string;
        customer?: { number?: string };
        metadata?: Record<string, unknown>;
        assistantOverrides?: { variableValues?: Record<string, unknown>; metadata?: Record<string, unknown> };
      }
    | undefined;
  const id = c?.assistantOverrides?.variableValues?.karte ?? c?.assistantOverrides?.metadata?.karte ?? c?.metadata?.karte;
  if (typeof id === "string" && /^\d{15,25}$/.test(id)) return id;
  if (c?.type !== "outboundPhoneCall" || !c.customer?.number) return null;
  const karte = await offeneKarteZuNummer(c.customer.number, (e) => Boolean(laeuftVersuch(e)));
  return karte?.messageId ?? null;
}

// ----------------------------------------------------------------- Werkzeuge

/** Antworten des Rückruf-Assistenten (Vapi-Werkzeuge). Gibt den Text zurück, den der Assistent erhält. */
export async function rueckrufWerkzeug(name: string, args: Record<string, string>, call: unknown): Promise<string> {
  const messageId = await karteZuAnruf(call);
  if (!messageId) return "Dieser Anruf gehört zu keiner Meldung. Verabschieden Sie sich freundlich.";
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_CHANNEL_ANRUFE;
  const embed = (await getMessage(token, channel, messageId))?.embeds?.[0];
  if (!embed) return "Die Meldung ist nicht mehr aktuell. Sagen Sie, dass sich das Team meldet.";
  const state = stateOf(embed);
  if (state === "confirmed" || state === "done") return "Der Termin ist schon abgeschlossen. Sagen Sie, dass alles in Ordnung ist.";
  const n = laeuftVersuch(embed) ?? 1;

  if (name === "termin_bestaetigt") {
    const termin = currentAppointment(embed);
    if (!termin) return "Es ist kein Termin hinterlegt. Sagen Sie, dass sich das Team meldet.";
    const kal = await bestaetigeKalender(originalWish(embed), termin, { messageId, ownerId: ownerId(embed) });
    const neu = mitStand(confirmedByCallback(embed, termin, uhrzeit(), kal.text), `📞 Erreicht (Versuch ${n}): Termin bestätigt`);
    if (!(await speichere(messageId, neu))) return "Das Speichern hat nicht geklappt. Sagen Sie, dass sich das Team meldet.";
    await antworte(messageId, embed, `✅ Der Kunde hat beim Rückruf den Termin bestätigt: ${termin}`);
    return `Der Termin ${termin} ist bestätigt. Bedanken Sie sich und verabschieden Sie sich.`;
  }

  if (name === "anderer_termin") {
    const r = await kundeWuenscht({ ok: true, messageId, embed, state, termin: "" }, args.datum ?? "", args.uhrzeit ?? "");
    if (!r.ok) return `Nicht übernommen: ${r.fehler} Fragen Sie nach einer anderen Zeit oder sagen Sie, dass sich das Team meldet.`;
    const aktuell = (await getMessage(token, channel, messageId))?.embeds?.[0] ?? embed;
    await speichere(messageId, mitStand(aktuell, `📞 Erreicht (Versuch ${n}): Kunde wünscht ${r.termin}`));
    return `Der Wunsch ${r.termin} ist notiert. Sagen Sie, dass das Team ihn prüft und per SMS oder Anruf bestätigt.`;
  }

  if (name === "spaeter_nochmal") {
    await planeOderGibAuf(messageId, embed, n, "Kunde gerade nicht zu sprechen");
    return "Verstanden. Sagen Sie, dass wir es später noch einmal versuchen, und verabschieden Sie sich.";
  }

  // notiz
  const text = (args.text ?? "").trim().slice(0, 500);
  await speichere(messageId, mitStand(embed, `📞 Erreicht (Versuch ${n}): Notiz hinterlassen`));
  await antworte(messageId, embed, `📝 Der Kunde sagt beim Rückruf: ${text || "(ohne Angabe)"}`);
  return "Notiert. Sagen Sie, dass das Team sich meldet, und verabschieden Sie sich.";
}

// --------------------------------------------------------------- Anrufende

const NICHT_ERREICHT: Record<string, string> = {
  "customer-did-not-answer": "Nicht erreicht (niemand ging ran)",
  "customer-busy": "Nicht erreicht (besetzt)",
  voicemail: "Mailbox, Hinweis hinterlassen",
  "twilio-failed-to-connect-call": "Nicht erreicht (Verbindung kam nicht zustande)",
  "silence-timed-out": "Nicht erreicht (nur Stille)",
};

/** Das Ergebnis in lesbarem Text (ohne Discord-Zeitangaben), z.B. für die Mail. */
function klartext(stand: string): string {
  return stand
    .replace(/^📞\s*/, "")
    .replace(/<t:(\d+):R>/g, (_, sec) =>
      new Date(Number(sec) * 1000).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" }),
    );
}

export interface RueckrufErgebnis {
  ergebnis: string;
  anrufer: string;
  betrieb: string;
  termin: string;
}

/**
 * Ergebnis des Anrufs (Vapi-Abschlussbericht). Hat ein Werkzeug schon ein Ergebnis gemeldet, wird hier nur
 * der Stand gelesen. Gibt das Ergebnis für die Mail zurück.
 */
export async function verarbeiteRueckrufEnde(
  messageId: string,
  bericht: { endedReason?: string; summary?: string; durationSeconds?: number },
): Promise<RueckrufErgebnis | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channel = process.env.DISCORD_CHANNEL_ANRUFE;
  const embed = (await getMessage(token, channel, messageId))?.embeds?.[0];
  if (!embed) return null;
  const n = laeuftVersuch(embed);

  // Mit "Anruf läuft": kein Werkzeug hat ein Ergebnis gemeldet, also nach dem Ende des Anrufs entscheiden.
  if (n) {
    const grund = NICHT_ERREICHT[bericht.endedReason ?? ""];
    if (grund) {
      await planeOderGibAuf(messageId, embed, n, grund);
    } else {
      const kurz = (bericht.summary ?? "").slice(0, 300);
      const fehler = /error|failed|pipeline/i.test(bericht.endedReason ?? "");
      await speichere(
        messageId,
        mitStand(embed, fehler ? `📞 Technischer Fehler beim Rückruf (${bericht.endedReason}). Bitte selbst anrufen.` : `📞 Erreicht (Versuch ${n}), aber ohne Ergebnis. Bitte prüfen.`),
      );
      await antworte(messageId, embed, `📞 Rückruf beendet ohne Ergebnis${kurz ? `: ${kurz}` : "."} Bitte prüfen.`);
    }
  }

  const neu = (await getMessage(token, channel, messageId))?.embeds?.[0] ?? embed;
  const wert = (name: string) => neu.fields?.find((f) => f.name === name)?.value ?? "";
  return {
    ergebnis: klartext(feld(neu)) || "unklar",
    anrufer: wert("Anrufer"),
    betrieb: wert("Betrieb"),
    termin: wert("Bestätigter Termin") || currentAppointment(neu) || "",
  };
}
