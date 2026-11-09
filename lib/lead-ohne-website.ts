import type { Analyse } from "@/lib/lead-analyse";

// Lead ohne Website (Plan 1, Etappe 3): /lead mit Google-Maps-Link, /lead name: … ort: …
// und das Formular, wenn Google nichts findet. Reine Logik ohne Netz, damit sie getestet werden kann.

const MAPS_HOSTS = /^(?:www\.|maps\.)?google\.(?:com|de)$|^maps\.app\.goo\.gl$|^goo\.gl$/;

const alsUrl = (s: string): URL | null => {
  try {
    return new URL(/^https?:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`);
  } catch {
    return null;
  }
};

/** Ist das ein Google-Maps-Link (auch Kurzlink zum Teilen)? */
export function istMapsLink(s: string): boolean {
  const u = alsUrl(s);
  if (!u || !s.trim()) return false;
  const host = u.hostname.toLowerCase();
  if (host === "maps.app.goo.gl") return true;
  if (host === "goo.gl") return u.pathname.startsWith("/maps");
  if (!MAPS_HOSTS.test(host)) return false;
  return host.startsWith("maps.") || u.pathname.startsWith("/maps");
}

/** Weiterleitungen eines Maps-Kurzlinks folgt der Bot nur innerhalb von Google und nur über https. */
export function erlaubterMapsHost(s: string): boolean {
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return /^([a-z0-9-]+\.)*google\.(com|de)$/.test(host) || host === "maps.app.goo.gl" || host === "goo.gl";
}

const zahl = (s: string | undefined) => (s !== undefined && Number.isFinite(Number(s)) ? Number(s) : null);

/** Was der (aufgelöste) Maps-Link über die Firma verrät. */
export function mapsHinweise(link: string): { name: string | null; lat: number | null; lon: number | null; placeId: string | null } {
  const u = alsUrl(link);
  const leer = { name: null, lat: null, lon: null, placeId: null };
  if (!u || !istMapsLink(link)) return leer;
  const p = u.searchParams;
  const ausQ = (v: string | null) => (v && !v.startsWith("place_id:") ? v.trim() : null);
  const idAusQ = (v: string | null) => (v?.startsWith("place_id:") ? v.slice("place_id:".length) : null);

  const place = u.pathname.match(/\/maps\/place\/([^/]+)/)?.[1];
  const name = place ? decodeURIComponent(place.replace(/\+/g, " ")).trim() : ausQ(p.get("q")) ?? ausQ(p.get("query"));
  const at = u.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const d = u.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const placeId = p.get("query_place_id") ?? idAusQ(p.get("q")) ?? idAusQ(p.get("query"));
  return {
    name: name || null,
    lat: zahl(at?.[1] ?? d?.[1]),
    lon: zahl(at?.[2] ?? d?.[2]),
    placeId: placeId || null,
  };
}

// ------------------------------------------------------------ Google-Daten

const VERZEICHNISSE =
  /(facebook|instagram|linktr\.ee|tiktok|youtube|business\.site|google\.[a-z]+\/maps|yelp|treatwell|fresha|booksy|jameda|gelbeseiten|dasoertliche|11880|cylex|golocal|branchen|wix\.com\/?$)/i;

export type WebArt = "keine" | "social" | "site";
/** Hat die Firma keine Website, nur ein Verzeichnis/soziales Netzwerk oder eine echte Seite? */
export const webArt = (url: string | null): WebArt => (!url ? "keine" : VERZEICHNISSE.test(url) ? "social" : "site");

export interface Platz {
  id: string;
  name: string;
  adresse: string | null;
  telefon: string | null;
  website: string | null;
  bewertung: number | null;
  anzahl: number;
  maps: string | null;
  branche: string | null;
}

/** Felder, die der Bot bei Google abfragt (für Suche und Einzelabruf gleich). */
export const PLATZ_FELDER = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "primaryTypeDisplayName",
  "businessStatus",
];

type ApiPlatz = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  businessStatus?: string;
};

/** Ein Eintrag aus der Places-Antwort; geschlossene Firmen zählen nicht. */
export function platzAusApi(p: ApiPlatz): Platz | null {
  if (!p.id || !p.displayName?.text) return null;
  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return null;
  return {
    id: p.id,
    name: p.displayName.text,
    adresse: p.formattedAddress ?? null,
    telefon: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    bewertung: p.rating ?? null,
    anzahl: p.userRatingCount ?? 0,
    maps: p.googleMapsUri ?? null,
    branche: p.primaryTypeDisplayName?.text ?? null,
  };
}

const hostVon = (url: string) => alsUrl(url)?.hostname.replace(/^www\./, "") ?? "?";

/** Die Auswertung für die Lead-Karte aus den Google-Daten (wenn es keine auswertbare Website gibt). */
export function analyseAusPlatz(p: Platz): Analyse {
  const art = webArt(p.website);
  const sterne =
    p.bewertung !== null ? `${p.bewertung.toFixed(1).replace(".", ",")} ★ (${p.anzahl} Bewertungen). ` : p.anzahl ? `${p.anzahl} Bewertungen. ` : "";
  return {
    firma: p.name,
    branche: p.branche,
    ansprechpartner: null,
    adresse: p.adresse,
    telefon: p.telefon,
    email: null,
    zusammenfassung: `${sterne}Gefunden über Google Maps.`,
    auffaelligkeiten: [
      art === "keine"
        ? "Keine Website bei Google Maps eingetragen"
        : art === "social"
          ? `Als Website nur ein Verzeichnis oder soziales Netzwerk (${hostVon(p.website ?? "")})`
          : "Website konnte nicht ausgewertet werden",
    ],
    passt: art === "site" ? null : "Websites & Landingpages",
    begruendung: art === "site" ? null : "Ohne eigene Website verpasst die Firma Kunden, die online suchen.",
  };
}

// ---------------------------------------------------------------- Formular

export interface FormularWerte {
  firma: string;
  ort: string;
  telefon: string;
  ansprechpartner: string;
  notiz: string;
}

const FELDER: { id: keyof FormularWerte; label: string; required: boolean; style: 1 | 2; max: number }[] = [
  { id: "firma", label: "Firma", required: true, style: 1, max: 120 },
  { id: "ort", label: "Ort", required: true, style: 1, max: 80 },
  { id: "telefon", label: "Telefon", required: false, style: 1, max: 40 },
  { id: "ansprechpartner", label: "Ansprechpartner", required: false, style: 1, max: 80 },
  { id: "notiz", label: "Notiz (was ihr wisst)", required: false, style: 2, max: 1000 },
];

/** Das kleine Formular, wenn Google die Firma nicht findet (oder es keinen Eintrag gibt). */
export function formularModal(firma?: string, ort?: string) {
  const vor: Partial<FormularWerte> = { firma: firma?.trim().slice(0, 120), ort: ort?.trim().slice(0, 80) };
  return {
    type: 9,
    data: {
      custom_id: "lead:formab",
      title: "Lead von Hand anlegen",
      components: FELDER.map((f) => ({
        type: 1,
        components: [
          {
            type: 4,
            custom_id: f.id,
            label: f.label,
            style: f.style,
            required: f.required,
            max_length: f.max,
            ...(vor[f.id] ? { value: vor[f.id] } : {}),
          },
        ],
      })),
    },
  };
}

export function formularWerte(rows: { components?: { custom_id: string; value?: string }[] }[] | undefined): FormularWerte {
  const w: FormularWerte = { firma: "", ort: "", telefon: "", ansprechpartner: "", notiz: "" };
  for (const r of rows ?? []) for (const c of r.components ?? []) if (c.custom_id in w) w[c.custom_id as keyof FormularWerte] = (c.value ?? "").trim();
  return w;
}

export function analyseAusFormular(w: FormularWerte): Analyse {
  return {
    firma: w.firma,
    branche: null,
    ansprechpartner: w.ansprechpartner || null,
    adresse: w.ort || null,
    telefon: w.telefon || null,
    email: null,
    zusammenfassung: w.notiz ? `${w.notiz}\n\nDie Firma wurde von Hand angelegt (Formular).` : "Von Hand angelegt über das Formular, ohne Google-Maps-Eintrag.",
    auffaelligkeiten: ["Von Hand angelegt, ohne Website-Auswertung"],
    passt: null,
    begruendung: null,
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Schlüssel der Lead-Karte für von Hand angelegte Firmen, damit es sie nicht doppelt gibt. */
export const manuellerSchluessel = (firma: string, ort: string) => `manuell-${slug(`${firma} ${ort}`)}`.slice(0, 80).replace(/-+$/, "");

// ------------------------------------------------- /lead mit einem Feld (09.11.)

export type Eingabe = { art: "leer" } | { art: "maps"; text: string } | { art: "website"; text: string } | { art: "name"; text: string };

/** Was steht im einen Feld von /lead? Maps-Link, Website (ein Wort mit Domain) oder ein Firmenname mit Ort. */
export function erkenneEingabe(roh: string): Eingabe {
  const text = roh.trim().replace(/\s+/g, " ");
  if (!text) return { art: "leer" };
  if (istMapsLink(text)) return { art: "maps", text };
  const istSeite = !/\s/.test(text) && (/^https?:\/\//i.test(text) || /^(?:www\.)?[\p{L}\d-]+(?:\.[\p{L}\d-]+)*\.[a-z]{2,}(?:[/?#].*)?$/iu.test(text));
  return istSeite ? { art: "website", text } : { art: "name", text };
}

type Knopf = { type: 2; style: number; label: string; custom_id: string };

/** Mehrere Treffer bei Google Maps: bis zu drei zur Auswahl (nur für den, der /lead benutzt hat). */
export function trefferAuswahl(treffer: Platz[], suchtext: string): { content: string; components: { type: 1; components: Knopf[] }[] } {
  const liste = treffer.filter((p) => `lead:wahl:${p.id}`.length <= 100).slice(0, 3);
  const zahl = (n: number) => String(n).replace(".", ",");
  const zeilen = liste.map((p, i) => {
    const sterne = p.bewertung !== null && p.anzahl > 0 ? `⭐ ${zahl(p.bewertung)} (${p.anzahl})` : "keine Bewertungen";
    return `${i + 1}. **${p.name.replace(/[*_~`|>@]/g, "")}**\n   📍 ${p.adresse ?? "Adresse unbekannt"} · ${sterne}`;
  });
  const sauber = suchtext.replace(/[*_~`|>@]/g, "").slice(0, 80);
  const knoepfe: Knopf[] = liste.map((p, i) => ({ type: 2, style: 1, label: `${i + 1} · ${p.name}`.slice(0, 80), custom_id: `lead:wahl:${p.id}` }));
  knoepfe.push({ type: 2, style: 2, label: "Keine davon", custom_id: `lead:formular:${suchtext.replace(/\|/g, " ").slice(0, 40)}|` });
  return {
    content: `🔎 Zu „${sauber}“ habe ich ${liste.length} Firmen gefunden. Welche meinst du?\n\n${zeilen.join("\n")}\n\nIst keine dabei, trägst du die Firma mit „Keine davon“ von Hand ein.`,
    components: [{ type: 1, components: knoepfe }],
  };
}
