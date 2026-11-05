import { legeTerminAn } from "@/lib/google-calendar";
import { holeLage, standortOderLeer } from "@/lib/luca";
import { kundeAenderung, lageText, terminAus } from "@/lib/luca-logik";
import { routeText, verbindungText, wetterText, type Welt } from "@/lib/luca-unterwegs";
import { aendereKunde } from "@/lib/notion-api";
import { standortText } from "@/lib/standort-logik";

// Werkzeuge, die Luca im Anruf sofort beantwortet bekommt, ohne Umweg über den Mac. null = kein Sofort-Werkzeug (dann Brief).
const LIVE = new Set(["stand_abfragen", "wo_ist_david", "route_berechnen", "verbindung_suchen", "wetter_abrufen", "kunde_aendern", "termin_anlegen"]);

const text = (x: unknown) => (typeof x === "string" ? x.slice(0, 160) : undefined);

export async function lucaLive(name: string, a: Record<string, unknown>): Promise<string | null> {
  if (!LIVE.has(name)) return null;
  if (name === "stand_abfragen") {
    const lage = await holeLage();
    return lage ? lageText(lage, new Date()) : "Von der Zentrale ist gerade kein Stand da. Der Mac schläft vielleicht.";
  }
  if (name === "kunde_aendern") {
    const p = kundeAenderung(a);
    if (!p.ok) return p.grund;
    const r = await aendereKunde(p.nr, p.felder);
    if (!r.ok) return `Nicht geändert: ${r.grund}`;
    const was = [p.felder.status ? `Status: ${p.felder.status}` : "", p.felder.naechsterSchritt ? `nächster Schritt: ${p.felder.naechsterSchritt}` : "", p.felder.followUp ? `Follow-up: ${p.felder.followUp}` : ""].filter(Boolean).join(", ");
    return `Bei ${p.nr} ${r.name} in Notion geändert: ${was}.`;
  }
  if (name === "termin_anlegen") {
    const p = terminAus(a);
    if (!p.ok) return p.grund;
    const r = await legeTerminAn(p);
    return r.ok ? `Termin angelegt: ${p.titel}, ${p.start.slice(8, 10)}.${p.start.slice(5, 7)}. um ${p.start.slice(11, 16)} Uhr, ${p.minuten} Minuten.` : `Nicht angelegt: ${r.grund}`;
  }
  const s = await standortOderLeer();
  if (name === "wo_ist_david") return s.standort ? `${standortText(s.standort, new Date())}${s.drin.length ? ` Er ist gerade bei: ${s.drin.join(", ")}.` : ""}` : "Davids Standort ist nicht bekannt: Vom iPhone kam noch nichts.";
  const welt: Welt = { standort: s.standort, orte: s.orte };
  if (name === "route_berechnen") return routeText({ von: text(a.von), nach: text(a.nach), modus: text(a.modus) }, welt);
  if (name === "verbindung_suchen") return verbindungText({ von: text(a.von), nach: text(a.nach) }, welt);
  return wetterText({ ort: text(a.ort) }, welt);
}
