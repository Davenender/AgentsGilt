import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Davids eigener Standort (OwnTracks auf seinem iPhone, nur auf seinen Wunsch). Reine Logik, getestet: lesen, Ankunft und
// Abfahrt erkennen, verschlüsseln. Gespeichert wird nur der letzte Standort, nie ein Verlauf – andere Personen nie.

export type Standort = { lat: number; lon: number; tst: number; acc?: number; vel?: number; batt?: number; ort?: string };
export type OrtMarke = { name: string; lat: number; lon: number; rad: number; auch?: string[] };
export type OrtEreignis = { art: "ankunft" | "abfahrt"; ort: string; tst: number };
export type StandortSpeicher = { standort: Standort | null; orte: OrtMarke[]; drin: string[]; ereignisse: OrtEreignis[]; orteNeu?: boolean };
export type OwnTracks = { art: "ort"; standort: Standort } | { art: "uebergang"; ereignis: OrtEreignis };

export const LEERER_SPEICHER: StandortSpeicher = { standort: null, orte: [], drin: [], ereignisse: [] };
const MAX_EREIGNISSE = 8;
/** Weiter weg als Kreis + Puffer erst zählt als „weg“ – sonst flattert es am Rand. */
const PUFFER_M = 100;
/** Ungenauer als das: Standort merken, aber keine Ankunft daraus schließen. */
const ZU_UNGENAU_M = 500;
/** Dieselbe Ankunft (von App und Server) innerhalb dieser Zeit zählt nur einmal. */
const GLEICH_S = 15 * 60;
/** Weiter bewegt als das: Der Ortsname stimmt nicht mehr. */
const NAME_GILT_M = 150;

const zahl = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);

export function leseOwnTracks(j: unknown): OwnTracks | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  const tst = zahl(o.tst);
  if (!tst) return null;
  if (o._type === "location") {
    const lat = zahl(o.lat);
    const lon = zahl(o.lon);
    if (lat === undefined || lon === undefined || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const acc = zahl(o.acc);
    const vel = zahl(o.vel);
    const batt = zahl(o.batt);
    return { art: "ort", standort: { lat, lon, tst, ...(acc !== undefined ? { acc } : {}), ...(vel !== undefined ? { vel } : {}), ...(batt !== undefined ? { batt } : {}) } };
  }
  if (o._type === "transition" && (o.event === "enter" || o.event === "leave") && typeof o.desc === "string" && o.desc.trim()) {
    return { art: "uebergang", ereignis: { art: o.event === "enter" ? "ankunft" : "abfahrt", ort: o.desc.trim().slice(0, 60), tst } };
  }
  return null;
}

export function abstandM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = 6_371_000;
  const f1 = (a.lat * Math.PI) / 180;
  const f2 = (b.lat * Math.PI) / 180;
  const df = f2 - f1;
  const dl = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

/** Der Speicher muss in eine Discord-Nachricht passen, sonst scheitert jede Meldung vom iPhone. Erst fällt das Älteste weg, dann die zweiten Namen der Orte. */
export function passendKlein(s: StandortSpeicher, laenge: (x: StandortSpeicher) => number, max: number): StandortSpeicher | null {
  let x = s;
  while (laenge(x) > max && x.ereignisse.length) x = { ...x, ereignisse: x.ereignisse.slice(1) };
  if (laenge(x) > max) x = { ...x, orte: x.orte.map(({ auch: _auch, ...o }) => o) };
  return laenge(x) <= max ? x : null;
}

function merke(s: StandortSpeicher, e: OrtEreignis): StandortSpeicher {
  const doppelt = s.ereignisse.some((x) => x.ort === e.ort && x.art === e.art && Math.abs(x.tst - e.tst) < GLEICH_S);
  const drin = e.art === "ankunft" ? [...new Set([...s.drin, e.ort])] : s.drin.filter((x) => x !== e.ort);
  return { ...s, drin, ereignisse: doppelt ? s.ereignisse : [...s.ereignisse, e].slice(-MAX_EREIGNISSE) };
}

export function neuerStand(alt: StandortSpeicher, n: OwnTracks): StandortSpeicher {
  if (n.art === "uebergang") return merke(alt, n.ereignis);
  const neu = n.standort;
  // nachgereicht (war offline): nie über den neueren Stand schreiben
  if (alt.standort && neu.tst < alt.standort.tst) return alt;
  const name = alt.standort?.ort && abstandM(alt.standort, neu) <= NAME_GILT_M ? alt.standort.ort : undefined;
  let s: StandortSpeicher = { ...alt, standort: { ...neu, ...(name ? { ort: name } : {}) } };
  if ((neu.acc ?? 0) > ZU_UNGENAU_M) return s;
  for (const o of s.orte) {
    const m = abstandM(o, neu);
    const war = s.drin.includes(o.name);
    if (!war && m <= o.rad) s = merke(s, { art: "ankunft", ort: o.name, tst: neu.tst });
    else if (war && m > o.rad + PUFFER_M) s = merke(s, { art: "abfahrt", ort: o.name, tst: neu.tst });
  }
  return s;
}

const SEKUNDEN_FRISCH = 2 * 3600;
export function standortText(s: Standort | null, jetzt: Date): string {
  if (!s) return "Davids Standort ist nicht bekannt.";
  const alter = Math.max(0, Math.round(jetzt.getTime() / 1000 - s.tst));
  const min = Math.round(alter / 60);
  const wann = min < 2 ? "gerade eben" : min < 90 ? `vor ${min} Minuten` : `vor ${Math.round(min / 60)} Stunden`;
  const wo = s.ort ?? `bei ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`;
  return alter > SEKUNDEN_FRISCH ? `Davids letzter bekannter Standort: ${wo} (${wann}). Das ist schon älter, frag ihn im Zweifel.` : `David ist gerade hier: ${wo} (gemeldet ${wann}).`;
}

const schluessel = (geheim: string) => createHash("sha256").update(`standort:${geheim}`).digest();

/** Discord speichert nur Unlesbares: Den Standort kann nur dieser Server entschlüsseln. */
export function verschluessele(wert: unknown, geheim: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", schluessel(geheim), iv);
  const inhalt = Buffer.concat([c.update(JSON.stringify(wert), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), inhalt]).toString("base64url");
}

export function entschluessele<T = unknown>(text: string, geheim: string): T | null {
  try {
    const b = Buffer.from(text, "base64url");
    const d = createDecipheriv("aes-256-gcm", schluessel(geheim), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

const wegpunkte = (orte: OrtMarke[], tst: number) => orte.slice(0, 20).map((o, i) => ({ _type: "waypoint" as const, desc: o.name, lat: o.lat, lon: o.lon, rad: o.rad, tst: tst + i }));

/** Einrichtung der App: HTTP an unseren Server, sparsame Ortung („Significant“: etwa alle 5 Minuten oder 500 Meter). */
export function owntracksKonfig(o: { url: string; benutzer: string; passwort: string; orte: OrtMarke[] }, tst = Math.floor(Date.now() / 1000)) {
  return {
    _type: "configuration" as const,
    mode: 3,
    url: o.url,
    auth: true,
    username: o.benutzer,
    password: o.passwort,
    deviceId: "iphone",
    tid: "DH",
    monitoring: 1,
    cmd: true,
    remoteConfiguration: false,
    allowRemoteLocation: false,
    waypoints: wegpunkte(o.orte, tst),
  };
}

export const owntracksLink = (k: unknown) => `owntracks:///config?inline=${encodeURIComponent(Buffer.from(JSON.stringify(k)).toString("base64"))}`;

/** Antwort an die App, wenn sich die Orte geändert haben: legt die Regionen an. */
export function wegpunkteBefehl(orte: OrtMarke[], tst = Math.floor(Date.now() / 1000)) {
  return { _type: "cmd" as const, action: "setWaypoints" as const, waypoints: { _type: "waypoints" as const, waypoints: wegpunkte(orte, tst) } };
}
