import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { EmbedLike } from "@/lib/discord-calls";
import { analysiere, domainKey, type Analyse } from "@/lib/lead-analyse";
import { findChannelId } from "@/lib/discord";
import { linkSecret } from "@/lib/termin";
import { alleNachrichten, call, CH_ABLAGE, CH_KARTEN, CH_SPEICHER, sucheSpeicherKanal, SEP } from "@/lib/leads";

// Lead-Suche: Der Bot findet Firmen über Google Maps (Places API (New)), das Team wählt in
// Discord aus. Dieses Modul enthält den Merkzettel (Codes, Freischaltung, Limit, "gesehen")
// und die eigentliche Suche. Die Bedienung steht in lead-suche-handlers.ts.
//
// Merkzettel = unsichtbarer Kanal #lead-suche-speicher, eine Zeile pro Eintrag:
//   code     · <userId> · <CODE> · <ablaufMs> · offen|benutzt
//   sitzung  · <userId> · <bisMs>
//   suche    · <userId> · <zeitMs>
//   gesehen  · <datum> · <schluessel>,<schluessel>,…
//
// Env: GOOGLE_PLACES_KEY (nur Places API), ANTHROPIC_API_KEY (für die Website-Auswertung).

export const MAX_SUCHEN = 3; // pro 24 Stunden fürs ganze Team
export const SITZUNG_MIN = 60;
export const CODE_MIN = 15;
export const TREFFER = 5;
export const MAX_BRANCHEN = 4;
export const STANDARD_ORT = "Mühlheim am Main";
export const STANDARD_LAT = 50.1080582;
export const STANDARD_LON = 8.8467138;

const TAG_MS = 24 * 60 * 60 * 1000;

// -------------------------------------------------------------- Merkzettel

const msgZeit = (id: string) => Math.floor(Number(BigInt(id) / BigInt(4194304))) + 1420070400000;

interface Zeile {
  id: string;
  teile: string[];
  zeit: number;
}

async function zeilen(token: string, max = 300): Promise<{ ch: string; liste: Zeile[] } | null> {
  const ch = await sucheSpeicherKanal(token);
  if (!ch) return null;
  const msgs = await alleNachrichten(token, ch, max);
  return {
    ch,
    liste: msgs.filter((m) => m.author.bot).map((m) => ({ id: m.id, teile: m.content.split(SEP), zeit: msgZeit(m.id) })),
  };
}

async function schreibe(token: string, ch: string, text: string): Promise<string | null> {
  const m = await call<{ id: string }>(token, "POST", `/channels/${ch}/messages`, {
    content: text.slice(0, 1900),
    allowed_mentions: { parse: [] },
  });
  return m?.id ?? null;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const zufall = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Neuer Einmal-Code für diese Person (gilt CODE_MIN Minuten). */
export async function erzeugeCode(token: string, userId: string): Promise<{ code: string; bis: number } | null> {
  const ch = await sucheSpeicherKanal(token);
  if (!ch) return null;
  const code = `${zufall(4)}-${zufall(4)}`;
  const bis = Date.now() + CODE_MIN * 60_000;
  const ok = await schreibe(token, ch, ["code", userId, code, String(bis), "offen"].join(SEP));
  return ok ? { code, bis } : null;
}

/** Prüft den eingegebenen Code. Ein richtiger Code wird dabei verbraucht. */
export async function loeseCodeEin(token: string, userId: string, eingabe: string): Promise<boolean> {
  const z = await zeilen(token, 100);
  if (!z) return false;
  const roh = eingabe.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const norm = roh.length === 8 ? `${roh.slice(0, 4)}-${roh.slice(4)}` : eingabe.trim().toUpperCase();
  const treffer = z.liste.find(
    (r) => r.teile[0] === "code" && r.teile[1] === userId && r.teile[2] === norm && r.teile[4] === "offen" && Number(r.teile[3]) > Date.now(),
  );
  if (!treffer) return false;
  await call(token, "PATCH", `/channels/${z.ch}/messages/${treffer.id}`, {
    content: ["code", userId, norm, treffer.teile[3], "benutzt"].join(SEP),
  });
  return true;
}

export async function starteSitzung(token: string, userId: string): Promise<number | null> {
  const ch = await sucheSpeicherKanal(token);
  if (!ch) return null;
  const bis = Date.now() + SITZUNG_MIN * 60_000;
  return (await schreibe(token, ch, ["sitzung", userId, String(bis)].join(SEP))) ? bis : null;
}

/** Bis wann ist diese Person freigeschaltet? (null = nicht freigeschaltet) */
export async function sitzungBis(token: string, userId: string): Promise<number | null> {
  const z = await zeilen(token, 100);
  const r = z?.liste.find((x) => x.teile[0] === "sitzung" && x.teile[1] === userId);
  const bis = r ? Number(r.teile[2]) : 0;
  return bis > Date.now() ? bis : null;
}

export interface Kontingent {
  frei: number;
  /** Wann wird die nächste Suche wieder frei? (null, wenn noch keine verbraucht ist) */
  naechste: number | null;
}

export async function kontingent(token: string): Promise<Kontingent> {
  const z = await zeilen(token, 300);
  const jetzt = Date.now();
  const benutzt = (z?.liste ?? [])
    .filter((r) => r.teile[0] === "suche")
    .map((r) => Number(r.teile[2]) || r.zeit)
    .filter((t) => t > jetzt - TAG_MS)
    .sort((a, b) => a - b);
  return { frei: Math.max(0, MAX_SUCHEN - benutzt.length), naechste: benutzt.length ? benutzt[0] + TAG_MS : null };
}

/** Verbraucht eine Suche. Gibt die Nachrichten-ID zurück, damit man sie bei einem Fehler zurückgeben kann. */
export async function verbrauchSuche(token: string, userId: string): Promise<string | null> {
  const ch = await sucheSpeicherKanal(token);
  return ch ? schreibe(token, ch, ["suche", userId, String(Date.now())].join(SEP)) : null;
}

export async function gibSucheZurueck(token: string, messageId: string): Promise<void> {
  const ch = await sucheSpeicherKanal(token);
  if (ch) await call(token, "DELETE", `/channels/${ch}/messages/${messageId}`);
}

async function gesehenSet(token: string): Promise<Set<string>> {
  const z = await zeilen(token, 800);
  const set = new Set<string>();
  for (const r of z?.liste ?? []) {
    if (r.teile[0] !== "gesehen") continue;
    for (const k of (r.teile[2] ?? "").split(",")) if (k) set.add(k);
  }
  return set;
}

/** Alle Firmen, die es schon als Karte, in der Ablage oder als abgelehnt gibt (einmal einlesen statt je Firma). */
async function bekannteFirmen(token: string): Promise<Set<string>> {
  const set = new Set<string>();
  for (const name of [CH_KARTEN, CH_ABLAGE, CH_SPEICHER]) {
    const ch = await findChannelId(token, name);
    if (!ch) continue;
    for (const m of await alleNachrichten(token, ch, 300)) {
      if (name === CH_SPEICHER) {
        const d = m.content.split(SEP)[1];
        if (d) set.add(d);
      } else {
        const f = m.embeds?.[0]?.footer?.text;
        if (m.author.bot && f?.startsWith("lead:")) set.add(f.slice(5).split(SEP)[0].trim());
      }
    }
  }
  return set;
}

async function merkeGesehen(token: string, keys: string[]): Promise<void> {
  if (!keys.length) return;
  const ch = await sucheSpeicherKanal(token);
  if (!ch) return;
  const datum = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  await schreibe(token, ch, ["gesehen", datum, keys.join(",")].join(SEP));
}

// ----------------------------------------------------------------- Suche

export type WebFilter = "keine" | "social" | "schlecht" | "alle";
export type Sortierung = "empfohlen" | "meiste" | "beste" | "naechste";

export interface Einstellungen {
  ort: string;
  radius: number; // km
  branchen: string[]; // aus der Liste
  eigene: string[]; // frei eingegeben
  web: WebFilter[];
  sort: Sortierung;
  ungesehene: boolean;
  minBewertung: number;
  minAnzahl: number;
}

export const STANDARD: Einstellungen = {
  ort: STANDARD_ORT,
  radius: 5,
  branchen: [],
  eigene: [],
  web: ["keine", "schlecht"],
  sort: "empfohlen",
  ungesehene: true,
  minBewertung: 0,
  minAnzahl: 3,
};

export interface Ort {
  lat: number;
  lon: number;
  name: string;
}

export async function geocode(ort: string): Promise<Ort | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ort)}&format=json&limit=1&countrycodes=de,at,ch`,
      { headers: { "User-Agent": "AgentsGilt-Leadsuche/1.0 (kontakt@agentsgilt.com)", "Accept-Language": "de" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    return arr[0] ? { lat: Number(arr[0].lat), lon: Number(arr[0].lon), name: arr[0].display_name.split(",")[0] } : null;
  } catch {
    return null;
  }
}

interface Platz {
  id: string;
  name: string;
  adresse: string | null;
  telefon: string | null;
  website: string | null;
  bewertung: number | null;
  anzahl: number;
  km: number;
  lat: number;
  lon: number;
  maps: string | null;
  branche: string;
}

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};

interface PlacesAntwort {
  places?: {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    businessStatus?: string;
    googleMapsUri?: string;
    location?: { latitude: number; longitude: number };
  }[];
  nextPageToken?: string;
}

async function suchePlaces(key: string, begriff: string, mitte: Ort, radiusKm: number, seite?: string): Promise<PlacesAntwort | null> {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((mitte.lat * Math.PI) / 180));
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.businessStatus,places.googleMapsUri,places.location,nextPageToken",
      },
      body: JSON.stringify({
        textQuery: begriff,
        languageCode: "de",
        regionCode: "DE",
        pageSize: 20,
        ...(seite ? { pageToken: seite } : {}),
        locationRestriction: {
          rectangle: {
            low: { latitude: mitte.lat - dLat, longitude: mitte.lon - dLon },
            high: { latitude: mitte.lat + dLat, longitude: mitte.lon + dLon },
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error(`[lead-suche] Places HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    return (await res.json()) as PlacesAntwort;
  } catch (err) {
    console.error("[lead-suche] Places nicht erreichbar:", err);
    return null;
  }
}

// Ketten und Stellen, die nicht in Frage kommen.
const KETTEN =
  /\b(mcdonald|burger king|subway|starbucks|rewe|aldi|lidl|edeka|kaufland|netto|penny|dm[- ]drogerie|rossmann|müller|sparkasse|volksbank|raiffeisen|commerzbank|deutsche bank|postbank|hypovereinsbank|deutsche post|dhl|hermes|dpd|ups|tchibo|ikea|obi|hornbach|bauhaus|toom|lloyd|ernsting|kik|takko|h&m|zara|primark|fressnapf|apollo|fielmann|mrs\.? ?sporty|mcfit|john reed|clever ?fit|fitx|ihre apotheke|stadtverwaltung|rathaus|polizei|feuerwehr|bundesagentur|jobcenter|finanzamt|amtsgericht|kirche|friedhof|schule|kita|kindergarten)\b/i;

const VERZEICHNISSE =
  /(facebook|instagram|linktr\.ee|tiktok|youtube|business\.site|google\.[a-z]+\/maps|yelp|treatwell|fresha|booksy|jameda|gelbeseiten|dasoertliche|11880|cylex|golocal|branchen|wix\.com\/?$)/i;

export type WebArt = "keine" | "social" | "site";
const webArt = (url: string | null): WebArt => (!url ? "keine" : VERZEICHNISSE.test(url) ? "social" : "site");

const SCHLECHT = /veraltet|nicht (responsiv|mobil)|unübersichtlich|defekt|im aufbau|baustelle|kein ssl|unsicher|©\s*(19\d\d|200\d|201\d)|alt(modisch)?e?s? design/i;

export interface Treffer {
  platz: Platz;
  art: WebArt | "schlecht";
  analyse: Analyse | null;
  url: string; // Website oder Google-Maps-Adresse
  domain: string; // Schlüssel für die Lead-Karte
  seenKey: string;
}

export type SucheErgebnis =
  | { ok: true; treffer: Treffer[]; ort: Ort; anfragen: number; geprueft: number }
  | { ok: false; fehler: string };

export async function sucheFirmen(token: string, e: Einstellungen): Promise<SucheErgebnis> {
  const key = process.env.GOOGLE_PLACES_KEY?.trim();
  if (!key) return { ok: false, fehler: "Die Suche ist noch nicht eingerichtet (GOOGLE_PLACES_KEY fehlt bei Vercel)." };
  const begriffe = [...e.branchen, ...e.eigene].map((b) => b.trim()).filter(Boolean).slice(0, MAX_BRANCHEN);
  if (!begriffe.length) return { ok: false, fehler: "Bitte mindestens eine Branche wählen." };

  const mitte = await geocode(e.ort);
  if (!mitte) return { ok: false, fehler: `Den Ort „${e.ort}“ habe ich nicht gefunden. Bitte genauer eingeben (z. B. „Mühlheim am Main“).` };

  // Alle Branchen abfragen (höchstens 5 Anfragen insgesamt, das hält die Kosten klein).
  let anfragen = 0;
  const roh = new Map<string, Platz>();
  for (const b of begriffe) {
    let seite: string | undefined;
    for (let i = 0; i < 2 && anfragen < 5; i++) {
      const antwort = await suchePlaces(key, b, mitte, e.radius, seite);
      anfragen++;
      if (!antwort) {
        if (!roh.size) return { ok: false, fehler: "Google Maps hat nicht geantwortet. Bitte gleich nochmal versuchen." };
        break;
      }
      for (const p of antwort.places ?? []) {
        if (!p.location || roh.has(p.id)) continue;
        if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
        const abstand = km(mitte, { lat: p.location.latitude, lon: p.location.longitude });
        if (abstand > e.radius) continue;
        roh.set(p.id, {
          id: p.id,
          name: p.displayName?.text ?? "Unbekannt",
          adresse: p.formattedAddress ?? null,
          telefon: p.nationalPhoneNumber ?? null,
          website: p.websiteUri ?? null,
          bewertung: p.rating ?? null,
          anzahl: p.userRatingCount ?? 0,
          km: Math.round(abstand * 10) / 10,
          lat: p.location.latitude,
          lon: p.location.longitude,
          maps: p.googleMapsUri ?? null,
          branche: b,
        });
      }
      seite = antwort.nextPageToken;
      if (!seite || roh.size >= 25) break;
    }
  }

  // Grundfilter.
  const gesehen = e.ungesehene ? await gesehenSet(token) : new Set<string>();
  const bekannt = e.ungesehene ? await bekannteFirmen(token) : new Set<string>();
  const kandidaten: Platz[] = [];
  for (const p of roh.values()) {
    if (KETTEN.test(p.name)) continue;
    if (p.bewertung !== null && p.bewertung < e.minBewertung) continue;
    if (p.anzahl < e.minAnzahl) continue;
    if (!p.telefon) continue; // ohne Telefonnummer kann man nicht anrufen
    const dom = p.website ? domainKey(p.website) : null;
    const seenKey = dom && webArt(p.website) === "site" ? dom : `gmaps-${p.id}`;
    if (e.ungesehene) {
      if (gesehen.has(seenKey) || gesehen.has(`gmaps-${p.id}`)) continue;
      // Gibt es die Firma schon als Karte, in der Ablage oder als abgelehnt?
      if ((dom && bekannt.has(dom)) || bekannt.has(`gmaps-${p.id}`)) continue;
    }
    kandidaten.push(p);
  }

  const rang = (t: Treffer["art"]) => ({ keine: 0, social: 1, schlecht: 2, site: 3 })[t];
  const sortiere = (liste: Treffer[]) =>
    liste.sort((a, b) => {
      if (e.sort === "meiste") return b.platz.anzahl - a.platz.anzahl;
      if (e.sort === "beste") return (b.platz.bewertung ?? 0) - (a.platz.bewertung ?? 0) || b.platz.anzahl - a.platz.anzahl;
      if (e.sort === "naechste") return a.platz.km - b.platz.km;
      return rang(a.art) - rang(b.art) || b.platz.anzahl - a.platz.anzahl;
    });

  // Website-Filter. Nur wenn "schlechte Website" gewählt ist, werden Websites ausgewertet (kostet etwas).
  const will = new Set(e.web);
  const treffer: Treffer[] = [];
  const mitWebsite: Platz[] = [];
  for (const p of kandidaten) {
    const art = webArt(p.website);
    const dom = p.website ? domainKey(p.website) : null;
    const basis = {
      platz: p,
      analyse: null,
      url: p.website ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
      domain: art === "site" && dom ? dom : `gmaps-${p.id}`,
      seenKey: art === "site" && dom ? dom : `gmaps-${p.id}`,
    };
    if (art === "keine" && will.has("keine")) treffer.push({ ...basis, art });
    else if (art === "social" && will.has("social")) treffer.push({ ...basis, art });
    else if (art === "site") {
      if (will.has("schlecht")) mitWebsite.push(p);
      else if (will.has("alle")) treffer.push({ ...basis, art });
    }
  }

  // Auswerten, bis genug da sind (höchstens 8 Seiten, damit es schnell bleibt).
  const geprueft = Math.min(8, mitWebsite.length);
  const ergebnisse = await Promise.all(
    mitWebsite
      .sort((a, b) => b.anzahl - a.anzahl)
      .slice(0, geprueft)
      .map(async (p) => {
        const r = await analysiere(p.website!);
        return { p, r };
      }),
  );
  for (const { p, r } of ergebnisse) {
    const dom = domainKey(p.website!) ?? `gmaps-${p.id}`;
    const basis = { platz: p, url: r.ok ? r.url : p.website!, domain: dom, seenKey: dom };
    if (!r.ok) {
      if (will.has("alle")) treffer.push({ ...basis, art: "site", analyse: null });
      continue;
    }
    const schlecht = r.analyse.passt === "Websites & Landingpages" || SCHLECHT.test(r.analyse.auffaelligkeiten.join(" "));
    if (schlecht) treffer.push({ ...basis, art: "schlecht", analyse: r.analyse });
    else if (will.has("alle")) treffer.push({ ...basis, art: "site", analyse: r.analyse });
  }

  return { ok: true, treffer: sortiere(treffer).slice(0, TREFFER), ort: mitte, anfragen, geprueft };
}

// ----------------------------------------------------------------- Karten

const sauber = (s: string) => s.replace(/@/g, "@​").replace(/<(#|@|:)/g, "<​$1");

/** Die Auswertung für die Lead-Karte (bei Firmen ohne Website aus den Google-Daten gebaut). */
export function analyseFuer(t: Treffer): Analyse {
  const p = t.platz;
  const sterne = p.bewertung !== null ? `${p.bewertung.toFixed(1).replace(".", ",")} ★ (${p.anzahl} Bewertungen)` : `${p.anzahl} Bewertungen`;
  if (t.analyse) {
    return {
      ...t.analyse,
      firma: t.analyse.firma || p.name,
      telefon: t.analyse.telefon ?? p.telefon,
      adresse: t.analyse.adresse ?? p.adresse,
      zusammenfassung: `${sterne}, ${p.km} km entfernt. ${t.analyse.zusammenfassung}`,
    };
  }
  const auff =
    t.art === "keine"
      ? ["Keine Website bei Google Maps eingetragen"]
      : t.art === "social"
        ? [`Als Website nur ein Verzeichnis oder soziales Netzwerk (${domainKey(p.website ?? "") ?? "?"})`]
        : ["Website konnte nicht ausgewertet werden"];
  return {
    firma: p.name,
    branche: p.branche,
    ansprechpartner: null,
    adresse: p.adresse,
    telefon: p.telefon,
    email: null,
    zusammenfassung: `${sterne}, ${p.km} km entfernt. Gefunden über Google Maps (Suche „${p.branche}“).`,
    auffaelligkeiten: auff,
    passt: t.art === "site" ? null : "Websites & Landingpages",
    begruendung: t.art === "site" ? null : "Ohne eigene Website verpasst die Firma Kunden, die online suchen.",
  };
}

export const artText = (a: Treffer["art"]) =>
  a === "keine" ? "keine Website" : a === "social" ? "nur Verzeichnis/Facebook" : a === "schlecht" ? "schlechte Website" : "Website vorhanden";

/** Zusatzfelder für die Karte im Thread. */
export function zusatzFelder(t: Treffer): NonNullable<EmbedLike["fields"]> {
  const p = t.platz;
  return [
    { name: "Bewertung", value: p.bewertung !== null ? `${p.bewertung.toFixed(1).replace(".", ",")} ★ · ${p.anzahl} Bewertungen` : `${p.anzahl} Bewertungen`, inline: true },
    { name: "Entfernung", value: `${p.km} km`, inline: true },
    { name: "Website", value: sauber(artText(t.art)), inline: true },
    ...(p.maps ? [{ name: "Google Maps", value: `[Karte öffnen](${p.maps})`, inline: true }] : []),
  ];
}

export { merkeGesehen };


// ------------------------------------------------------------------- Karte

const SITE = process.env.SITE_URL || "https://agentsgilt.com";

const sig = (d: string) => {
  const secret = linkSecret();
  return secret ? createHmac("sha256", secret).update(`lead-karte:${d}`).digest("hex").slice(0, 20) : "";
};

export function karteSigOk(d: string, k: string | null): boolean {
  const erwartet = sig(d);
  if (!erwartet || !k) return false;
  const a = Buffer.from(erwartet);
  const b = Buffer.from(k);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Adresse unseres Kartenbilds. Der Zustand steckt (signiert) in der Adresse und bleibt so unsichtbar. */
export function karteUrl(daten: unknown): string {
  const d = Buffer.from(JSON.stringify(daten), "utf8").toString("base64url");
  return `${SITE}/api/lead-suche/karte?d=${d}&k=${sig(d)}`;
}

export function leseKarteUrl(url: string | undefined): Record<string, unknown> | null {
  try {
    const u = new URL(url ?? "");
    const d = u.searchParams.get("d");
    if (!d || !karteSigOk(d, u.searchParams.get("k"))) return null;
    return JSON.parse(Buffer.from(d, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
