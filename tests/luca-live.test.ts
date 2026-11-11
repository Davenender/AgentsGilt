// Tests für Lucas Live-Werkzeuge am Telefon: `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefAus, kundeAenderung, terminAus, wetterWort } from "../lib/luca-logik.ts";
import { findeOrt, kostenSatz, losSatz, ortsnameAus, routeText, verbindungText, wetterText } from "../lib/luca-unterwegs.ts";

const JETZT = new Date("2026-11-05T21:00:00.000Z");
const tst = Math.floor(JETZT.getTime() / 1000) - 120;
const welt = {
  standort: { lat: 50.0761, lon: 8.8733, tst, ort: "Bürgermeister-Mahr-Straße, Obertshausen" },
  orte: [{ name: "Zuhause", lat: 50.12, lon: 8.83, rad: 120 }, { name: "Schule", lat: 50.123, lon: 8.843, rad: 200 }],
  jetzt: JETZT,
};
const netz = (antwort: (url: string) => unknown, aufrufe: string[] = []) =>
  (async (u: string | URL) => {
    aufrufe.push(String(u));
    const a = antwort(String(u));
    if (a instanceof Error) throw a;
    return new Response(JSON.stringify(a), { status: a === 500 ? 500 : 200 });
  }) as typeof fetch;

test("Orte: „hier“ ist Davids frischer Standort, „nach Hause“ sein Zuhause, feste Orte ohne Netz", async () => {
  const leer = netz(() => new Error("nicht fragen"));
  for (const t of ["hier", "von hier", "mein Standort", "", "wo ich bin"]) assert.equal((await findeOrt(t, welt, leer))?.lat, 50.0761, t);
  for (const t of ["nach Hause", "zuhause", "heim", "Zuhause"]) assert.equal((await findeOrt(t, welt, leer))?.name, "Zuhause", t);
  assert.equal((await findeOrt("die Schule", welt, leer))?.name, "Schule");
  // Standort zu alt oder unbekannt: nicht raten
  // Das iPhone meldet sich nur bei Bewegung: Stunden ohne Meldung heißen, er ist noch dort; erst nach einer Woche nicht mehr
  assert.equal((await findeOrt("hier", { ...welt, standort: { ...welt.standort, tst: tst - 5 * 3600 } }, leer))?.lat, 50.0761);
  assert.equal(await findeOrt("hier", { ...welt, standort: { ...welt.standort, tst: tst - 8 * 86400 } }, leer), null);
  for (const t of ["von hier aus", "wo ich gerade bin", "von wo ich gerade bin", "meinem aktuellen Standort aus", "da wo ich jetzt bin"]) assert.equal((await findeOrt(t, welt, leer))?.lat, 50.0761, t);
  assert.equal(await findeOrt("hier", { ...welt, standort: null }, leer), null);
  assert.equal(await findeOrt("nach Hause", { ...welt, orte: [] }, leer), null);
});

test("Orte im Netz: der passende Treffer, ein falscher wird abgelehnt", async () => {
  const aufrufe: string[] = [];
  const r = await findeOrt("Rewe Mühlheim", welt, netz((u) => (u.includes("nominatim") ? [{ lat: "50.12", lon: "8.82", name: "Rewe", display_name: "Rewe, Friedensstraße 52, Mühlheim am Main", category: "shop", type: "supermarket" }] : { features: [] }), aufrufe));
  assert.equal(r?.name, "Rewe");
  assert.ok(aufrufe[0].includes("nominatim"));
  assert.equal(await findeOrt("Relax Fit Obertshausen", welt, netz((u) => (u.includes("nominatim") ? [{ lat: "49.1", lon: "6.2", name: "Cryo Relax & Fit", display_name: "Metz, Frankreich", category: "leisure", type: "fitness_centre" }] : { features: [] }))), null);
});

test("Route gesprochen: von hier nach Hause, mit Länge und Dauer, ehrlich ohne Stau", async () => {
  const t = await routeText({ nach: "nach Hause" }, welt, netz(() => ({ code: "Ok", routes: [{ distance: 7840, duration: 840 }] })));
  assert.match(t, /Bürgermeister-Mahr-Straße, Obertshausen/);
  assert.match(t, /Zuhause/);
  assert.match(t, /7,8 Kilometer/);
  assert.match(t, /14 Minuten/);
  assert.match(t, /ohne Stau/);
  assert.match(await routeText({ nach: "nach Hause", modus: "rad" }, welt, netz(() => ({ code: "Ok", routes: [{ distance: 7840, duration: 1800 }] }))), /Fahrrad/);
  assert.match(await routeText({ nach: "Gibtsnicht" }, welt, netz((u) => (u.includes("nominatim") ? [] : { features: [] }))), /nicht gefunden/);
  assert.match(await routeText({ nach: "nach Hause" }, { ...welt, standort: null }, netz(() => ({}))), /wo du gerade bist|Standort/);
});

test("Bus und Bahn gesprochen: wann ab wo, welche Linie, wie lange, wie oft umsteigen", async () => {
  const plan = {
    itineraries: [
      { duration: 2100, startTime: "2026-11-05T21:10:00Z", endTime: "2026-11-05T21:45:00Z", transfers: 0, legs: [
        { mode: "WALK", startTime: "2026-11-05T21:10:00Z", endTime: "2026-11-05T21:24:00Z", from: { name: "START" }, to: { name: "Obertshausen-Hausen Rathaus" } },
        { mode: "BUS", startTime: "2026-11-05T21:24:00Z", endTime: "2026-11-05T21:39:00Z", routeShortName: "OF-32", headsign: "Mühlheim Am Anger", from: { name: "Obertshausen-Hausen Rathaus" }, to: { name: "Mühlheim (Main) Bahnhof Südseite" } },
        { mode: "WALK", startTime: "2026-11-05T21:39:00Z", endTime: "2026-11-05T21:45:00Z", from: { name: "Mühlheim (Main) Bahnhof Südseite" }, to: { name: "END" } },
      ] },
    ],
  };
  const t = await verbindungText({ nach: "nach Hause" }, welt, netz(() => plan));
  assert.match(t, /22:24/);
  assert.match(t, /OF-32/);
  assert.match(t, /Obertshausen-Hausen Rathaus/);
  assert.match(t, /14 Minuten zu Fuß/);
  assert.match(t, /22:45/);
  assert.match(t, /ohne Umstieg/);
  assert.match(await verbindungText({ nach: "nach Hause" }, welt, netz(() => ({ itineraries: [] }))), /keine Verbindung/i);
  assert.match(await verbindungText({ nach: "nach Hause" }, welt, netz(() => new Error("weg"))), /nicht erreichbar/);
});

test("Wetter gesprochen: jetzt, heute, morgen, am aktuellen Ort", async () => {
  const j = { current: { temperature_2m: 8.4, weather_code: 3 }, daily: { time: ["2026-11-05", "2026-11-06"], temperature_2m_max: [11.4, 9.6], temperature_2m_min: [4.2, 2.5], precipitation_probability_max: [30, 80], weather_code: [3, 61] } };
  const aufrufe: string[] = [];
  const t = await wetterText({}, welt, netz(() => j, aufrufe));
  assert.ok(aufrufe[0].includes("latitude=50.0761"));
  assert.match(t, /8 Grad/);
  assert.match(t, /bewölkt/i);
  assert.match(t, /morgen/i);
  assert.match(t, /80 Prozent/);
  assert.equal(wetterWort(95), "Gewitter");
});

test("Briefe: nachschauen, Schule, Erinnerung, Lerncheck werden geprüft", () => {
  assert.deepEqual(briefAus("nachschauen", { frage: "Was steht in Notion zu Relax Fit?" }, ""), { typ: "nachschauen", frage: "Was steht in Notion zu Relax Fit?" });
  assert.equal(briefAus("nachschauen", {}, ""), null);
  assert.deepEqual(briefAus("schule_aktualisieren", {}, ""), { typ: "schule" });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "An die Sporttasche denken", ort: "Zuhause", ereignis: "ankunft" }, ""), { typ: "erinnerung", text: "An die Sporttasche denken", ort: "Zuhause", ereignis: "ankunft" });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Mama anrufen", minuten: 45 }, ""), { typ: "erinnerung", text: "Mama anrufen", minuten: 45 });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Lernen", uhrzeit: "2026-11-06T16:00" }, ""), { typ: "erinnerung", text: "Lernen", uhrzeit: "2026-11-06T16:00" });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Morgen-Anruf", uhrzeit: "2026-11-06T07:00", ueberblick: true }, ""), { typ: "erinnerung", text: "Morgen-Anruf", uhrzeit: "2026-11-06T07:00", ueberblick: true });
  assert.equal(briefAus("erinnerung_planen", { text: "Ohne Auslöser" }, ""), null);
  assert.equal(briefAus("erinnerung_planen", { minuten: 5 }, ""), null);
  assert.equal(briefAus("erinnerung_planen", { text: "x", minuten: 99999 }, ""), null);
  assert.deepEqual(briefAus("lerncheck_merken", { fach: "Geschichte", sitzt: "Weimar", luecken: "Versailles" }, ""), { typ: "lerncheck", fach: "Geschichte", sitzt: "Weimar", luecken: "Versailles" });
  assert.equal(briefAus("lerncheck_merken", { sitzt: "x" }, ""), null);
});

test("Änderungen per Stimme: nur mit Bestätigung und nur diese Felder", () => {
  assert.deepEqual(kundeAenderung({ nr: "knd-003", naechsterSchritt: "Vertrag schicken", followUp: "2026-11-12", bestaetigt: true }), { ok: true, nr: "KND-003", felder: { naechsterSchritt: "Vertrag schicken", followUp: "2026-11-12" } });
  assert.equal(kundeAenderung({ nr: "KND-003", naechsterSchritt: "x" }).ok, false);
  assert.equal(kundeAenderung({ nr: "Relax", status: "Lead", bestaetigt: true }).ok, false);
  assert.equal(kundeAenderung({ nr: "KND-003", bestaetigt: true }).ok, false);
  assert.equal(kundeAenderung({ nr: "KND-003", followUp: "morgen", bestaetigt: true }).ok, false);
  const t = terminAus({ titel: "Treffen Relax Fit", start: "2026-11-06T15:00", minuten: 45, ort: "Obertshausen", bestaetigt: true });
  assert.deepEqual(t, { ok: true, titel: "Treffen Relax Fit", start: "2026-11-06T15:00:00", minuten: 45, ort: "Obertshausen" });
  assert.equal(terminAus({ titel: "x", start: "2026-11-06T15:00" }).ok, false);
  assert.equal(terminAus({ titel: "x", start: "morgen", bestaetigt: true }).ok, false);
  assert.equal(terminAus({ start: "2026-11-06T15:00", bestaetigt: true }).ok, false);
  assert.equal((terminAus({ titel: "x", start: "2026-11-06T15:00", minuten: 9999, bestaetigt: true }) as { minuten: number }).minuten, 480);
});

test("Standortname: Hausnummer dabei, die Stadt zählt vor dem Stadtteil", () => {
  assert.equal(ortsnameAus({ road: "Lämmerspieler Straße", house_number: "100", village: "Dietesheim", municipality: "Mühlheim am Main" }), "Lämmerspieler Straße 100, Mühlheim am Main");
  assert.equal(ortsnameAus({ road: "Zeil", suburb: "Innenstadt", city: "Frankfurt am Main" }), "Zeil, Frankfurt am Main");
  assert.equal(ortsnameAus({ village: "Dietesheim" }), "Dietesheim");
  assert.equal(ortsnameAus({}), null);
});

test("Adressbuch der Zentrale: Relax Fit in allen Schreibweisen, ohne Kartensuche", async () => {
  const leer = netz(() => new Error("nicht fragen"));
  const w = { ...welt, orte: [...welt.orte, { name: "Relax Fit", lat: 50.0763, lon: 8.8728, rad: 150, auch: ["Relaxfit", "RELAX-FIT Fitness-Studio"] }] };
  for (const t of ["Relax Fit", "relaxfit", "Relax-Fit", "zum Relax Fit", "RELAX-FIT Fitness-Studio"]) assert.equal((await findeOrt(t, w, leer))?.name, "Relax Fit", t);
});

test("Route mit Schlüssel: echter Verkehr von TomTom; scheitert das, ehrlich ohne Stau", async () => {
  const w = { ...welt, stauSchluessel: "test" };
  const osrm = { code: "Ok", routes: [{ distance: 5000, duration: 600 }] };
  const live = { routes: [{ summary: { lengthInMeters: 13200, travelTimeInSeconds: 1500, trafficDelayInSeconds: 360 } }] };
  let t = await routeText({ nach: "Zuhause" }, w, netz((u) => (u.includes("tomtom") ? live : osrm)));
  assert.match(t, /13,2 Kilometer/);
  assert.match(t, /mit dem aktuellen Verkehr, davon 6 Minuten Stau/);
  t = await routeText({ nach: "Zuhause" }, w, netz((u) => (u.includes("tomtom") ? { routes: [{ summary: { lengthInMeters: 13200, travelTimeInSeconds: 1200, trafficDelayInSeconds: 0 } }] } : osrm)));
  assert.match(t, /gerade kein Stau/);
  t = await routeText({ nach: "Zuhause" }, w, netz((u) => (u.includes("tomtom") ? {} : osrm)));
  assert.match(t, /ohne Stau gerechnet/);
  // ohne Schlüssel fragt er TomTom gar nicht
  let gefragt = false;
  await routeText({ nach: "Zuhause" }, welt, netz((u) => { if (u.includes("tomtom")) gefragt = true; return osrm; }));
  assert.equal(gefragt, false);
  // der Schlüssel taucht nie in dem auf, was Luca sagt
  assert.doesNotMatch(t, /test/);
});

test("Kosten zum Sagen: echte Zahlen, Fehlendes bleibt unbekannt", () => {
  const t = kostenSatz({ twilio: { dieser: 3.5, letzter: 12, guthaben: 20 }, vapi: { dieser: { betrag: 1.2, anrufe: 3, minuten: 7 }, letzter: null } });
  assert.match(t, /Twilio: letzter Monat 12,00 Dollar, dieser Monat bisher 3,50 Dollar, Guthaben 20,00 Dollar/);
  assert.match(t, /Vapi: letzter Monat unbekannt, dieser Monat bisher 1,20 Dollar bei 3 Anrufen und 7 Minuten/);
});

test("Wann muss ich los: nächster Termin mit Ort, Fahrzeit mit Verkehr und 10 Minuten Puffer", async () => {
  const w = { ...welt, stauSchluessel: "test", jetzt: JETZT, orte: [...welt.orte, { name: "Relax Fit", lat: 50.07, lon: 8.87 }] };
  const start = new Date(JETZT.getTime() + 3 * 3600_000).toISOString();
  const termine = [{ titel: "Ganztag", start, ganztags: true, ort: "X" }, { titel: "Ohne Ort", start, ganztags: false }, { titel: "Relax Fit: Demo", start, ganztags: false, ort: "Relax Fit" }];
  const t = await losSatz(termine, w, JETZT, netz(() => ({ routes: [{ summary: { travelTimeInSeconds: 1500, trafficDelayInSeconds: 300 } }] })));
  assert.match(t, /Nächster Termin: Relax Fit: Demo/);
  assert.match(t, /Fahrt etwa 25 Minuten mit dem aktuellen Verkehr, davon 5 Minuten Stau/);
  assert.match(t, /muss um \d\d:\d\d Uhr los, mit 10 Minuten Puffer/);
  assert.equal(await losSatz(null, w, JETZT), "Der Kalender antwortet gerade nicht.");
  assert.match(await losSatz([], w, JETZT), /kein Termin mit Ort/);
  const knapp = [{ titel: "Gleich", start: new Date(JETZT.getTime() + 5 * 60_000).toISOString(), ganztags: false, ort: "Relax Fit" }];
  assert.match(await losSatz(knapp, w, JETZT, netz(() => ({ routes: [{ summary: { travelTimeInSeconds: 1500 } }] }))), /Er müsste jetzt los/);
});

test("Erinnerung am Ort mit Wartezeit und erst ab einem Tag (Davids Wunsch 11.11.)", () => {
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Marc anrufen (eine Woche um)", ort: "Zuhause", ereignis: "ankunft", warten: 10, ab: "2026-11-12" }, ""), { typ: "erinnerung", text: "Marc anrufen (eine Woche um)", ort: "Zuhause", ereignis: "ankunft", warten: 10, ab: "2026-11-12" });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "x", ort: "Zuhause", warten: 5 }, ""), { typ: "erinnerung", text: "x", ort: "Zuhause", ereignis: "ankunft", warten: 5 });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "x", ort: "Zuhause", warten: 0, ab: "morgen" }, ""), { typ: "erinnerung", text: "x", ort: "Zuhause", ereignis: "ankunft" }, "Unsinn fällt weg");
  assert.deepEqual(briefAus("erinnerung_planen", { text: "x", ort: "Zuhause", warten: 500 }, ""), { typ: "erinnerung", text: "x", ort: "Zuhause", ereignis: "ankunft" }, "höchstens 240 Minuten");
  assert.deepEqual(briefAus("erinnerung_planen", { text: "x", ort: "Zuhause", ab: "2026-13-40" }, ""), { typ: "erinnerung", text: "x", ort: "Zuhause", ereignis: "ankunft" });
});

test("Nicht stören, solange David an einem Ort ist (Davids Wunsch 11.11.)", () => {
  assert.deepEqual(briefAus("nicht_stoeren", { ort: "Fitnessstudio" }, ""), { typ: "ruhe", ort: "Fitnessstudio" });
  assert.deepEqual(briefAus("nicht_stoeren", {}, ""), { typ: "ruhe" }, "ohne Ort: da, wo David gerade ist");
  assert.deepEqual(briefAus("nicht_stoeren", { ort: "  hier " }, ""), { typ: "ruhe" });
  assert.deepEqual(briefAus("nicht_stoeren", { aufheben: true }, ""), { typ: "ruhe", aufheben: true });
});
