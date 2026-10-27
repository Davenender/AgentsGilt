import { createSign } from "node:crypto";
import { berlinNow, formatTermin, parseDatum } from "@/lib/termin";

// Stellt den vorläufigen Kalendereintrag um, wenn ein Termin bestätigt wird.
//
// Der Voice-Agent trägt Termine als "VORLÄUFIG — Erstgespräch — Name, Betrieb"
// ein. Wird ein Termin bestätigt, suchen wir diesen Eintrag (über Datum und
// Uhrzeit des ursprünglichen Wunsches), nehmen "VORLÄUFIG" aus dem Titel und
// verschieben ihn, falls der bestätigte Termin ein anderer ist.
//
// Zugang über ein Google-Dienstkonto, dessen E-Mail-Adresse den Kalender mit
// "Änderungen an Terminen vornehmen" freigegeben bekommen hat.
//
// Env-Vars (Vercel, Production):
//   GOOGLE_SERVICE_ACCOUNT_KEY   Inhalt der JSON-Schlüsseldatei (Secret)
//   GOOGLE_CALENDAR_ID           Kalender, z.B. kontakt@agentsgilt.com
//
// Fehlt einer davon, passiert nichts und die Meldung sagt, dass der Kalender
// von Hand geändert werden muss.

const API = "https://www.googleapis.com/calendar/v3";
const MARKER = "VORLÄUFIG";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function calendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_CALENDAR_ID);
}

function readKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;
  try {
    // Manche tragen die Datei als Base64 ein, manche als reinen JSON-Text.
    const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const key = JSON.parse(text) as ServiceAccountKey;
    if (!key.client_email || !key.private_key) return null;
    return { ...key, private_key: key.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const key = readKey();
  if (!key) return null;

  const now = Math.floor(Date.now() / 1000);
  const uri = key.token_uri || "https://oauth2.googleapis.com/token";
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: uri,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key);

  const res = await fetch(uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error(`[kalender] Anmeldung bei Google fehlgeschlagen: HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

interface CalEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
}

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error(`[kalender] Google Calendar HTTP ${res.status} bei ${init?.method ?? "GET"} ${path.split("?")[0]}`);
    return null;
  }
  return (await res.json()) as T;
}

/** "Mi, 28.10., 14:00 Uhr" -> { datum: "2026-10-28", zeit: "14:00" } */
export function labelZuDatumUndZeit(label: string): { datum: string; zeit: string } | null {
  const m = label.match(/(\d{1,2}\.\d{1,2}\.)\s*,?\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = parseDatum(m[1], berlinNow());
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return { datum: `${d.year}-${p(d.month)}-${p(d.day)}`, zeit: `${p(Number(m[2]))}:${m[3]}` };
}

export interface KalenderErgebnis {
  /** false = nichts angefasst (nicht eingerichtet oder Fehler) */
  geaendert: boolean;
  text: string;
}

const HAND = "bitte von Hand ändern";

/**
 * Sucht den vorläufigen Eintrag zum ursprünglichen Wunsch, entfernt "VORLÄUFIG"
 * und verschiebt ihn auf den bestätigten Termin.
 */
export async function bestaetigeKalender(
  wunschLabel: string | undefined,
  bestaetigtLabel: string,
  meta?: { messageId: string; ownerId?: string },
): Promise<KalenderErgebnis> {
  if (!calendarConfigured()) {
    return { geaendert: false, text: `Eintrag „${MARKER}“ im Kalender auf diesen Termin ändern` };
  }
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);

  const wunsch = wunschLabel ? labelZuDatumUndZeit(wunschLabel) : null;
  const neu = labelZuDatumUndZeit(bestaetigtLabel);
  if (!wunsch || !neu) {
    return { geaendert: false, text: `Kein Eintrag gefunden (Termin nicht lesbar), ${HAND}` };
  }

  try {
    const token = await accessToken();
    if (!token) return { geaendert: false, text: `Zugang zum Kalender fehlgeschlagen, ${HAND}` };

    // Einen Tag Spielraum, die Uhrzeit wird unten genau verglichen. Mit
    // timeZone kommen die Zeiten in Berliner Zeit zurück.
    const day = Date.parse(`${wunsch.datum}T12:00:00Z`);
    const list = await call<{ items?: CalEvent[] }>(
      token,
      `/calendars/${calId}/events?singleEvents=true&timeZone=Europe%2FBerlin&maxResults=50` +
        `&timeMin=${encodeURIComponent(new Date(day - 36 * 3600_000).toISOString())}` +
        `&timeMax=${encodeURIComponent(new Date(day + 36 * 3600_000).toISOString())}`,
    );
    if (!list) return { geaendert: false, text: `Kalender konnte nicht gelesen werden, ${HAND}` };

    const ev = (list.items ?? []).find(
      (e) =>
        e.summary?.includes(MARKER) &&
        e.start?.dateTime?.startsWith(`${wunsch.datum}T${wunsch.zeit}`),
    );
    if (!ev || !ev.start?.dateTime || !ev.end?.dateTime) {
      return { geaendert: false, text: `Kein „${MARKER}“-Eintrag zum Wunschtermin gefunden, ${HAND}` };
    }

    const titel = ev.summary!.replace(new RegExp(`${MARKER}\\s*[—–-]\\s*`), "").trim();
    const body: Record<string, unknown> = { summary: titel };
    // Merkt sich, zu welchem Anruf der Termin gehört und wer ihn hat, damit der
    // Bot später in #termine erinnern kann. "0" = Erinnerung noch nicht gesendet.
    if (meta) {
      body.extendedProperties = {
        private: {
          agMsg: meta.messageId,
          agOwner: meta.ownerId ?? "",
          agR24: "0",
          agR1: "0",
        },
      };
    }

    const verschieben = neu.datum !== wunsch.datum || neu.zeit !== wunsch.zeit;
    if (verschieben) {
      const dauer = Date.parse(ev.end.dateTime) - Date.parse(ev.start.dateTime);
      const start = Date.parse(`${neu.datum}T${neu.zeit}:00Z`);
      const p = (n: number) => String(n).padStart(2, "0");
      const ende = new Date(start + dauer);
      const endeLokal = `${ende.getUTCFullYear()}-${p(ende.getUTCMonth() + 1)}-${p(ende.getUTCDate())}T${p(ende.getUTCHours())}:${p(ende.getUTCMinutes())}:00`;
      body.start = { dateTime: `${neu.datum}T${neu.zeit}:00`, timeZone: "Europe/Berlin" };
      body.end = { dateTime: endeLokal, timeZone: "Europe/Berlin" };

      // Nicht auf einen belegten Termin schieben.
      const dayNew = Date.parse(`${neu.datum}T12:00:00Z`);
      const others = await call<{ items?: CalEvent[] }>(
        token,
        `/calendars/${calId}/events?singleEvents=true&timeZone=Europe%2FBerlin&maxResults=50` +
          `&timeMin=${encodeURIComponent(new Date(dayNew - 36 * 3600_000).toISOString())}` +
          `&timeMax=${encodeURIComponent(new Date(dayNew + 36 * 3600_000).toISOString())}`,
      );
      const naive = (s?: string) => (s ? Date.parse(`${s.slice(0, 19)}Z`) : NaN);
      const kollision = (others?.items ?? []).find(
        (e) =>
          e.id !== ev.id &&
          naive(e.start?.dateTime) < start + dauer &&
          naive(e.end?.dateTime) > start,
      );
      if (kollision) {
        return {
          geaendert: false,
          text: `Der neue Termin überschneidet sich im Kalender mit „${kollision.summary ?? "Termin"}“. Nichts geändert, ${HAND}`,
        };
      }
    }

    const done = await call<CalEvent>(token, `/calendars/${calId}/events/${ev.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!done) return { geaendert: false, text: `Eintrag konnte nicht geändert werden, ${HAND}` };

    return {
      geaendert: true,
      text: verschieben
        ? `Eintrag wurde auf ${bestaetigtLabel} verschoben und ist nicht mehr vorläufig`
        : "Eintrag ist nicht mehr vorläufig",
    };
  } catch (err) {
    console.error("[kalender] Fehler:", err);
    return { geaendert: false, text: `Kalender nicht erreichbar, ${HAND}` };
  }
}

export interface FreiErgebnis {
  /** true = im Kalender steht zu dieser Zeit schon etwas anderes */
  belegt: boolean;
  /** Titel des Termins, der im Weg steht */
  womit?: string;
}

/**
 * Prüft, ob ein Termin (60 Minuten) im Kalender frei ist. Der vorläufige
 * Eintrag zum ursprünglichen Wunsch zählt nicht, er gehört ja zu diesem Anruf.
 * Ist der Kalender nicht eingerichtet oder nicht erreichbar, gilt der Termin
 * als nicht belegt, damit der Ablauf nicht daran hängt.
 */
export async function pruefeFrei(
  terminLabel: string,
  wunschLabel?: string,
): Promise<FreiErgebnis> {
  if (!calendarConfigured()) return { belegt: false };
  const neu = labelZuDatumUndZeit(terminLabel);
  if (!neu) return { belegt: false };
  const wunsch = wunschLabel ? labelZuDatumUndZeit(wunschLabel) : null;

  try {
    const token = await accessToken();
    if (!token) return { belegt: false };
    const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);
    const day = Date.parse(`${neu.datum}T12:00:00Z`);
    const list = await call<{ items?: CalEvent[] }>(
      token,
      `/calendars/${calId}/events?singleEvents=true&timeZone=Europe%2FBerlin&maxResults=50` +
        `&timeMin=${encodeURIComponent(new Date(day - 36 * 3600_000).toISOString())}` +
        `&timeMax=${encodeURIComponent(new Date(day + 36 * 3600_000).toISOString())}`,
    );
    if (!list) return { belegt: false };

    // Uhrzeiten als "naive" Berliner Zeit vergleichen (Zone steht schon in den Antworten).
    const naive = (x?: string) => (x ? Date.parse(`${x.slice(0, 19)}Z`) : NaN);
    const start = Date.parse(`${neu.datum}T${neu.zeit}:00Z`);
    const ende = start + 60 * 60_000;

    const im_weg = (list.items ?? []).find((e) => {
      if (!e.start?.dateTime) return false; // ganztägige Einträge ignorieren
      const eigener =
        wunsch &&
        e.summary?.includes(MARKER) &&
        e.start.dateTime.startsWith(`${wunsch.datum}T${wunsch.zeit}`);
      if (eigener) return false;
      return naive(e.start.dateTime) < ende && naive(e.end?.dateTime) > start;
    });
    return im_weg ? { belegt: true, womit: im_weg.summary ?? "Termin" } : { belegt: false };
  } catch (err) {
    console.error("[kalender] Prüfung fehlgeschlagen:", err);
    return { belegt: false };
  }
}

// ------------------------------------------------------------- Erinnerungen

export interface Erinnerung {
  eventId: string;
  art: "tag" | "stunde";
  /** Titel ohne "Erstgespräch — ", z.B. "Max Test, Test GmbH" */
  wer: string;
  /** "heute", "morgen" oder das Datum */
  wann: string;
  /** "Mi, 28.10., 14:00 Uhr" */
  label: string;
  ownerId?: string;
  messageId?: string;
}

/**
 * Bestätigte Termine der nächsten 25 Stunden, für die eine Erinnerung fällig ist:
 * "tag" (zwischen 24 und 3 Stunden vorher) und "stunde" (in der letzten Stunde).
 * Was zu kurzfristig bestätigt wurde, bekommt nur die Stunden-Erinnerung.
 */
export async function holeErinnerungen(now = new Date()): Promise<Erinnerung[]> {
  if (!calendarConfigured()) return [];
  const token = await accessToken();
  if (!token) return [];
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);

  const list = await call<{ items?: CalEvent[] }>(
    token,
    `/calendars/${calId}/events?singleEvents=true&orderBy=startTime&timeZone=Europe%2FBerlin&maxResults=50` +
      `&timeMin=${encodeURIComponent(new Date(now.getTime() - 10 * 60_000).toISOString())}` +
      `&timeMax=${encodeURIComponent(new Date(now.getTime() + 25 * 3600_000).toISOString())}`,
  );

  const heute = berlinNow(now);
  const out: Erinnerung[] = [];
  for (const e of list?.items ?? []) {
    const priv = e.extendedProperties?.private;
    if (!priv?.agMsg || !e.start?.dateTime || e.summary?.includes(MARKER)) continue;

    const minuten = (Date.parse(e.start.dateTime) - now.getTime()) / 60_000;
    let art: Erinnerung["art"] | null = null;
    if (minuten <= 60 && minuten > -10 && priv.agR1 !== "1") art = "stunde";
    else if (minuten <= 1440 && minuten > 180 && priv.agR24 !== "1") art = "tag";
    if (!art) continue;

    const [y, m, d] = e.start.dateTime.slice(0, 10).split("-").map(Number);
    const label = formatTermin({ year: y, month: m, day: d, hour: Number(e.start.dateTime.slice(11, 13)), minute: Number(e.start.dateTime.slice(14, 16)) });
    const tage = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(heute.year, heute.month - 1, heute.day)) / 86400000);

    out.push({
      eventId: e.id,
      art,
      wer: (e.summary ?? "Termin").replace(/^Erstgespräch\s*[—–-]\s*/, ""),
      wann: tage <= 0 ? "heute" : "morgen",
      label,
      ownerId: priv.agOwner || undefined,
      messageId: priv.agMsg,
    });
  }
  return out;
}

/** Hakt eine Erinnerung ab (oder nimmt den Haken zurück, wenn das Senden scheitert). */
export async function markiereErinnert(
  eventId: string,
  art: "tag" | "stunde",
  gesendet: boolean,
): Promise<boolean> {
  const token = await accessToken();
  if (!token) return false;
  const calId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);
  const res = await call<CalEvent>(token, `/calendars/${calId}/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify({
      extendedProperties: { private: { [art === "tag" ? "agR24" : "agR1"]: gesendet ? "1" : "0" } },
    }),
  });
  return Boolean(res);
}
