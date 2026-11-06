// Wo David ist und wie er wohin kommt – direkt von hier aus, ohne den Mac, damit Luca es im Anruf sofort sagen kann.
// Freie Dienste ohne Konto: Nominatim/Photon (Orte), routing.openstreetmap.de (Route), Transitous (Bus und Bahn), Open-Meteo.
import { wetterWort } from "./luca-logik.ts";
import { besterKandidat, falte, varianten, type Kandidat } from "./ortssuche.ts";

const UA = "AgentsGilt-Luca/1.0 (privat)";
type Abruf = typeof fetch;
const NAH = { lat: 50.1186, lon: 8.8331 };
/** Das iPhone meldet sich nur, wenn David sich bewegt: Keine Meldung heißt meist, er ist noch dort. Erst nach einer Woche gilt es nicht mehr. */
const STANDORT_FRISCH_S = 7 * 24 * 3600;
const TOMTOM = "https://api.tomtom.com/routing/1/calculateRoute";
const ZONE = "Europe/Berlin";

export type Punkt = { name: string; lat: number; lon: number };
export type Welt = { standort: { lat: number; lon: number; tst: number; ort?: string } | null; orte: { name: string; lat: number; lon: number; rad?: number; auch?: string[] }[]; jetzt?: Date; stauSchluessel?: string };
export type Modus = "auto" | "rad" | "fuss";

const kopf = { "user-agent": UA, accept: "application/json" };
async function holeJson<T>(url: string, abruf: Abruf, ms = 8000): Promise<T | null> {
  try {
    const res = await abruf(url, { headers: kopf, signal: AbortSignal.timeout(ms) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Aus einer Nominatim-Adresse: „Lämmerspieler Straße 100, Mühlheim am Main“. Die Stadt zählt vor dem Stadtteil. */
export function ortsnameAus(a: Record<string, string>): string | null {
  const strasse = a.road ?? a.pedestrian ?? a.footway ?? a.neighbourhood;
  const mitNummer = strasse && a.house_number ? `${strasse} ${a.house_number}` : strasse;
  const teile = [mitNummer, a.city ?? a.town ?? a.municipality ?? a.village ?? a.suburb].filter(Boolean);
  return teile.length ? teile.join(", ") : null;
}

/** Name zu Koordinaten; null, wenn der Dienst nicht antwortet. */
export async function ortsname(lat: number, lon: number, abruf: Abruf = fetch): Promise<string | null> {
  const j = await holeJson<{ address?: Record<string, string> }>(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=de`, abruf, 5000);
  return ortsnameAus(j?.address ?? {});
}

const FUELL_ORT = /\b(von|nach|zu|zum|zur|die|der|das|den|dem|bis|in|an|am|mein|meine|meinem)\b/g;
const einfach = (t: string) => falte(t).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(FUELL_ORT, " ").replace(/\s+/g, " ").trim();
const IST_HIER = /^(?:hier(?: aus)?|(?:(?:aktu|jetzig)\w* )?(?:standort|position)(?: aus)?|(?:da )?wo ich(?: gerade| grad| jetzt| momentan)? bin(?: aus)?|ich(?: bin)?)$/;
const istHier = (k: string) => k === "" || IST_HIER.test(k);
const kompakt = (t: string) => t.replace(/\s+/g, "");
const HEIM = new Set(["hause", "haus", "zuhause", "heim", "daheim", "home"]);

/** Einen Ort finden: Davids Standort, seine festen Orte, sonst Kartensuche. Lieber null als ein falscher Ort. */
export async function findeOrt(text: string | undefined, w: Welt, abruf: Abruf = fetch): Promise<Punkt | null> {
  const k = einfach(text ?? "");
  if (istHier(k)) {
    const s = w.standort;
    const jetzt = (w.jetzt ?? new Date()).getTime() / 1000;
    return s && jetzt - s.tst <= STANDORT_FRISCH_S ? { name: s.ort ?? "deinem Standort", lat: s.lat, lon: s.lon } : null;
  }
  const kk = kompakt(k);
  const fest = HEIM.has(k) ? w.orte.find((o) => o.name === "Zuhause") : w.orte.find((o) => [o.name, ...(o.auch ?? [])].some((n) => kompakt(einfach(n)) === kk));
  if (fest) return { name: fest.name, lat: fest.lat, lon: fest.lon };
  if (HEIM.has(k)) return null;
  for (const v of varianten(text!)) {
    const n = await holeJson<{ lat: string; lon: string; name?: string; display_name?: string; category?: string; type?: string; importance?: number }[]>(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=de&accept-language=de&viewbox=8.3,50.45,9.4,49.75&q=${encodeURIComponent(v.slice(0, 160))}`, abruf);
    const ausN: Kandidat[] = (n ?? []).map((t) => ({ name: t.name?.trim() ?? "", adresse: t.display_name ?? "", klasse: t.category, typ: t.type, wichtig: t.importance ?? 0, lat: Number(t.lat), lon: Number(t.lon), quelle: "nominatim" }));
    let best = besterKandidat(v, ausN);
    if (!best) {
      const p = await holeJson<{ features?: { geometry?: { coordinates?: number[] }; properties?: Record<string, string> }[] }>(`https://photon.komoot.io/api/?q=${encodeURIComponent(v.slice(0, 160))}&lang=de&limit=5&lat=${NAH.lat}&lon=${NAH.lon}`, abruf);
      const ausP: Kandidat[] = (p?.features ?? []).flatMap((f) => {
        const [lon, lat] = f.geometry?.coordinates ?? [];
        const a = f.properties ?? {};
        return Number.isFinite(lat) && Number.isFinite(lon) ? [{ name: a.name?.trim() ?? "", adresse: [a.street, a.housenumber, a.postcode, a.district, a.city ?? a.town ?? a.village, a.state, a.country].filter(Boolean).join(", "), klasse: a.osm_key, typ: a.osm_value, lat, lon, quelle: "photon" }] : [];
      });
      best = besterKandidat(v, ausP);
    }
    if (best) return { name: best.name || text!.trim(), lat: best.lat, lon: best.lon };
  }
  return null;
}

const PROFIL: Record<Modus, string> = { auto: "routed-car", rad: "routed-bike", fuss: "routed-foot" };
const MITTEL: Record<Modus, string> = { auto: "mit dem Auto", rad: "mit dem Fahrrad", fuss: "zu Fuß" };
const komma = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const dauer = (min: number) => (min < 60 ? `${min} Minuten` : `${Math.floor(min / 60)} Stunde${Math.floor(min / 60) > 1 ? "n" : ""}${min % 60 ? ` und ${min % 60} Minuten` : ""}`);
const OHNE_STANDORT = "Ich weiß gerade nicht, wo du bist: Vom iPhone kam kein frischer Standort. Frag David kurz, von wo aus er losgeht.";
const uhr = (iso: string) => new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

async function strecke(o: { von?: string; nach?: string }, w: Welt, abruf: Abruf): Promise<{ von: Punkt; nach: Punkt } | string> {
  const von = await findeOrt(o.von, w, abruf);
  if (!von) return !istHier(einfach(o.von ?? "")) ? `„${o.von}“ habe ich nicht gefunden. Frag David nach dem genauen Namen oder der Adresse.` : OHNE_STANDORT;
  if (!o.nach?.trim()) return "Das Ziel fehlt. Frag David, wohin er will.";
  const nach = await findeOrt(o.nach, w, abruf);
  if (!nach) return HEIM.has(einfach(o.nach)) ? "Dein Zuhause ist noch nicht eingetragen: David legt es im Zahnrad der Zentrale fest (Standort)." : `„${o.nach}“ habe ich nicht gefunden. Frag David nach dem genauen Namen oder der Adresse.`;
  return { von, nach };
}

export async function routeText(o: { von?: string; nach?: string; modus?: string }, w: Welt, abruf: Abruf = fetch): Promise<string> {
  const s = await strecke(o, w, abruf);
  if (typeof s === "string") return s;
  const modus: Modus = o.modus === "rad" || o.modus === "fuss" ? o.modus : "auto";
  if (modus === "auto" && w.stauSchluessel) {
    const live = await holeJson<{ routes?: { summary?: { lengthInMeters?: number; travelTimeInSeconds?: number; trafficDelayInSeconds?: number } }[] }>(`${TOMTOM}/${s.von.lat},${s.von.lon}:${s.nach.lat},${s.nach.lon}/json?key=${encodeURIComponent(w.stauSchluessel)}&traffic=true&travelMode=car&routeType=fastest&computeTravelTimeFor=all&routeRepresentation=summaryOnly`, abruf);
    const su = live?.routes?.[0]?.summary;
    if (su?.lengthInMeters && su.travelTimeInSeconds) {
      const stau = Math.round((su.trafficDelayInSeconds ?? 0) / 60);
      return `Von ${s.von.name} nach ${s.nach.name} ${MITTEL.auto}: ${komma(su.lengthInMeters / 1000)} Kilometer, etwa ${dauer(Math.max(1, Math.round(su.travelTimeInSeconds / 60)))} mit dem aktuellen Verkehr, ${stau ? `davon ${dauer(stau)} Stau` : "gerade kein Stau"}.`;
    }
  }
  const j = await holeJson<{ code?: string; routes?: { distance: number; duration: number }[] }>(`https://routing.openstreetmap.de/${PROFIL[modus]}/route/v1/driving/${s.von.lon},${s.von.lat};${s.nach.lon},${s.nach.lat}?overview=false`, abruf, 10_000);
  const r = j?.routes?.[0];
  if (j?.code !== "Ok" || !r) return `Die Route von ${s.von.name} nach ${s.nach.name} konnte ich gerade nicht berechnen. Nichts angezeigt.`;
  return `Von ${s.von.name} nach ${s.nach.name} ${MITTEL[modus]}: ${komma(r.distance / 1000)} Kilometer, etwa ${dauer(Math.max(1, Math.round(r.duration / 60)))}${modus === "auto" ? ", ohne Stau gerechnet" : ""}.`;
}

type Bein = { mode?: string; startTime?: string; endTime?: string; routeShortName?: string; headsign?: string; from?: { name?: string }; to?: { name?: string } };
const minuten = (a?: string, b?: string) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60_000) : 0);

export async function verbindungText(o: { von?: string; nach?: string }, w: Welt, abruf: Abruf = fetch): Promise<string> {
  const s = await strecke(o, w, abruf);
  if (typeof s === "string") return s;
  const j = await holeJson<{ itineraries?: { startTime?: string; endTime?: string; transfers?: number; legs?: Bein[] }[] }>(`https://api.transitous.org/api/v1/plan?fromPlace=${s.von.lat},${s.von.lon}&toPlace=${s.nach.lat},${s.nach.lon}&numItineraries=3`, abruf, 10_000);
  if (!j) return "Die Fahrplanauskunft ist gerade nicht erreichbar. Frag in ein paar Minuten nochmal.";
  const saetze = (j.itineraries ?? []).slice(0, 3).flatMap((r, i) => {
    const beine = r.legs ?? [];
    const fahrten = beine.filter((b) => b.mode && b.mode !== "WALK");
    if (!fahrten.length) return [];
    const erste = fahrten[0];
    const weg = beine[0]?.mode === "WALK" ? minuten(beine[0].startTime, beine[0].endTime) : 0;
    const um = r.transfers ?? fahrten.length - 1;
    const linien = fahrten.map((b) => b.routeShortName || b.mode).join(", dann ");
    return [`${i === 0 ? "Nächste Verbindung" : "Danach"}: ${uhr(erste.startTime!)} ab ${erste.from?.name ?? "Haltestelle"}${weg ? ` (${weg} Minuten zu Fuß dorthin, also ${uhr(beine[0].startTime!)} loslaufen)` : ""} mit ${linien}${erste.headsign ? ` Richtung ${erste.headsign}` : ""}, Ankunft ${uhr(r.endTime!)}, ${um ? `${um}-mal umsteigen` : "ohne Umstieg"}.`];
  });
  return saetze.length ? `Von ${s.von.name} nach ${s.nach.name}. ${saetze.join(" ")}` : `Von ${s.von.name} nach ${s.nach.name} habe ich gerade keine Verbindung gefunden.`;
}

export async function wetterText(o: { ort?: string }, w: Welt, abruf: Abruf = fetch): Promise<string> {
  const ort = await findeOrt(o.ort, w, abruf);
  if (!ort) return o.ort?.trim() ? `„${o.ort}“ habe ich nicht gefunden.` : OHNE_STANDORT;
  const j = await holeJson<{ current?: { temperature_2m?: number; weather_code?: number }; daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[]; weather_code?: number[] } }>(`https://api.open-meteo.com/v1/forecast?latitude=${ort.lat}&longitude=${ort.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=Europe%2FBerlin&forecast_days=3`, abruf);
  if (!j?.daily?.temperature_2m_max?.length) return "Der Wetterdienst ist gerade nicht erreichbar.";
  const d = j.daily;
  const tag = (i: number, name: string) => `${name} ${wetterWort(d.weather_code?.[i] ?? 0)}, ${Math.round(d.temperature_2m_min?.[i] ?? 0)} bis ${Math.round(d.temperature_2m_max?.[i] ?? 0)} Grad, Regenrisiko ${d.precipitation_probability_max?.[i] ?? 0} Prozent`;
  const jetzt = j.current?.temperature_2m !== undefined ? `Jetzt ${Math.round(j.current.temperature_2m)} Grad, ${wetterWort(j.current.weather_code ?? 0)}. ` : "";
  return `Wetter für ${ort.name}. ${jetzt}${tag(0, "Heute")}. ${(d.temperature_2m_max?.length ?? 0) > 1 ? `${tag(1, "Morgen")}.` : ""}`.trim();
}

const GELD = (n: number | null | undefined) => (typeof n === "number" ? `${n.toFixed(2).replace(".", ",")} Dollar` : "unbekannt");

/** Was Twilio und Vapi kosten, zum Sagen. */
export function kostenSatz(k: { twilio: { dieser: number | null; letzter: number | null; guthaben: number | null }; vapi: { dieser: { betrag: number; anrufe: number; minuten: number } | null; letzter: { betrag: number } | null } }): string {
  const t = `Twilio: letzter Monat ${GELD(k.twilio.letzter)}, dieser Monat bisher ${GELD(k.twilio.dieser)}${k.twilio.guthaben !== null ? `, Guthaben ${GELD(k.twilio.guthaben)}` : ""}.`;
  const v = `Vapi: letzter Monat ${GELD(k.vapi.letzter?.betrag)}, dieser Monat bisher ${GELD(k.vapi.dieser?.betrag)}${k.vapi.dieser ? ` bei ${k.vapi.dieser.anrufe} Anrufen und ${k.vapi.dieser.minuten} Minuten` : ""}.`;
  return `${t} ${v} Die ganze Kostenliste steht in der Zentrale.`;
}

const UHR = (d: Date) => new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(d);
const TAG = (d: Date) => new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, weekday: "long" }).format(d);
const LOS_PUFFER = 10;

/** Nächster Termin mit Ort: Fahrzeit mit Verkehr und wann David los muss. */
export async function losSatz(termine: { titel: string; start: string; ganztags: boolean; ort?: string }[] | null, w: Welt, jetzt = new Date(), abruf: Abruf = fetch): Promise<string> {
  if (termine === null) return "Der Kalender antwortet gerade nicht.";
  const t = termine.filter((x) => !x.ganztags && x.ort && Date.parse(x.start) > jetzt.getTime()).sort((a, b) => a.start.localeCompare(b.start))[0];
  if (!t) return "In den nächsten 36 Stunden steht kein Termin mit Ort im Kalender.";
  const start = new Date(t.start);
  const wann = `${TAG(start)} um ${UHR(start)} Uhr`;
  const s = await strecke({ nach: t.ort }, w, abruf);
  if (typeof s === "string") return `Nächster Termin: ${t.titel}, ${wann}, ${t.ort}. Die Fahrzeit kann ich nicht ausrechnen: ${s}`;
  let min: number | null = null;
  let stau = 0;
  let live = false;
  if (w.stauSchluessel) {
    const j = await holeJson<{ routes?: { summary?: { travelTimeInSeconds?: number; trafficDelayInSeconds?: number } }[] }>(`${TOMTOM}/${s.von.lat},${s.von.lon}:${s.nach.lat},${s.nach.lon}/json?key=${encodeURIComponent(w.stauSchluessel)}&traffic=true&travelMode=car&routeType=fastest&routeRepresentation=summaryOnly`, abruf);
    const su = j?.routes?.[0]?.summary;
    if (su?.travelTimeInSeconds) {
      min = Math.max(1, Math.round(su.travelTimeInSeconds / 60));
      stau = Math.round((su.trafficDelayInSeconds ?? 0) / 60);
      live = true;
    }
  }
  if (min === null) {
    const j = await holeJson<{ code?: string; routes?: { duration: number }[] }>(`https://routing.openstreetmap.de/${PROFIL.auto}/route/v1/driving/${s.von.lon},${s.von.lat};${s.nach.lon},${s.nach.lat}?overview=false`, abruf);
    if (j?.code === "Ok" && j.routes?.[0]) min = Math.max(1, Math.round(j.routes[0].duration / 60));
  }
  if (min === null) return `Nächster Termin: ${t.titel}, ${wann}, ${t.ort}. Die Fahrzeit kann ich gerade nicht ausrechnen.`;
  const los = new Date(start.getTime() - (min + LOS_PUFFER) * 60_000);
  const zuSpaet = los.getTime() <= jetzt.getTime();
  return `Nächster Termin: ${t.titel}, ${wann}, ${t.ort}. Fahrt etwa ${dauer(min)}${live ? (stau ? ` mit dem aktuellen Verkehr, davon ${dauer(stau)} Stau` : " mit dem aktuellen Verkehr") : ", ohne Stau gerechnet"}. ${zuSpaet ? "Er müsste jetzt los." : `Er muss um ${UHR(los)} Uhr los, mit ${LOS_PUFFER} Minuten Puffer.`}`;
}
