// Tests für „Lead ohne Website“ (Plan 1, Etappe 3): `npm test`.
// Nur reine Logik, nichts fragt Google, Notion oder Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyseAusFormular,
  erkenneEingabe,
  trefferAuswahl,
  analyseAusPlatz,
  erlaubterMapsHost,
  formularModal,
  formularWerte,
  istMapsLink,
  manuellerSchluessel,
  mapsHinweise,
  platzAusApi,
  webArt,
  type Platz,
} from "../lib/lead-ohne-website.ts";

test("Google-Maps-Links werden erkannt, andere nicht", () => {
  for (const ok of [
    "https://maps.app.goo.gl/AbCdEf123",
    "https://goo.gl/maps/xyz",
    "https://www.google.com/maps/place/Friseur+Graziella/@50.1,8.8,17z",
    "https://www.google.de/maps/place/Test",
    "https://maps.google.com/?cid=123456",
    "maps.app.goo.gl/AbC",
  ]) assert.equal(istMapsLink(ok), true, ok);
  for (const nein of ["https://www.friseur-graziella.de", "https://google.com", "https://evil.com/maps/place/x", "https://maps.google.com.evil.com/x", ""])
    assert.equal(istMapsLink(nein), false, nein);
});

test("Weiterleitungen nur innerhalb von Google", () => {
  assert.equal(erlaubterMapsHost("https://www.google.com/maps/place/x"), true);
  assert.equal(erlaubterMapsHost("https://maps.app.goo.gl/x"), true);
  assert.equal(erlaubterMapsHost("https://consent.google.de/?x"), true);
  assert.equal(erlaubterMapsHost("http://www.google.com/maps"), false, "nur https");
  assert.equal(erlaubterMapsHost("https://127.0.0.1/maps"), false);
  assert.equal(erlaubterMapsHost("https://google.com.evil.io/"), false);
  assert.equal(erlaubterMapsHost("kein link"), false);
});

test("Aus dem Maps-Link: Name, Koordinaten oder Place-ID", () => {
  assert.deepEqual(
    mapsHinweise("https://www.google.com/maps/place/Friseur+Graziella/@50.1080582,8.8467138,17z/data=!3m1!4b1"),
    { name: "Friseur Graziella", lat: 50.1080582, lon: 8.8467138, placeId: null },
  );
  assert.deepEqual(
    mapsHinweise("https://www.google.com/maps/place/Caf%C3%A9+M%C3%BCller/data=!4m6!3m5!8m2!3d50.11!4d8.84"),
    { name: "Café Müller", lat: 50.11, lon: 8.84, placeId: null },
  );
  assert.deepEqual(mapsHinweise("https://www.google.com/maps/search/?api=1&query=Pizzeria&query_place_id=ChIJabc123"), {
    name: "Pizzeria",
    lat: null,
    lon: null,
    placeId: "ChIJabc123",
  });
  assert.deepEqual(mapsHinweise("https://maps.google.com/maps?q=place_id:ChIJxyz"), { name: null, lat: null, lon: null, placeId: "ChIJxyz" });
  assert.deepEqual(mapsHinweise("https://maps.google.com/?q=B%C3%A4ckerei+Schmitt,+Hauptstr.+1,+M%C3%BChlheim&ftid=0x1:0x2"), {
    name: "Bäckerei Schmitt, Hauptstr. 1, Mühlheim",
    lat: null,
    lon: null,
    placeId: null,
  });
  assert.equal(mapsHinweise("https://maps.google.com/?cid=123").name, null, "cid allein reicht nicht");
  assert.equal(mapsHinweise("kaputt").name, null);
});

test("Website-Art: keine, Verzeichnis oder echte Seite", () => {
  assert.equal(webArt(null), "keine");
  assert.equal(webArt("https://www.facebook.com/friseur"), "social");
  assert.equal(webArt("https://www.instagram.com/x"), "social");
  assert.equal(webArt("https://friseur-graziella.de"), "site");
});

const API_PLATZ = {
  id: "ChIJ1",
  displayName: { text: "Friseur Graziella" },
  formattedAddress: "Bahnhofstr. 5, 63165 Mühlheim am Main",
  nationalPhoneNumber: "06108 12345",
  websiteUri: "https://www.facebook.com/graziella",
  rating: 4.7,
  userRatingCount: 119,
  googleMapsUri: "https://maps.google.com/?cid=42",
  primaryTypeDisplayName: { text: "Friseursalon" },
  businessStatus: "OPERATIONAL",
};

test("Google-Antwort → Platz", () => {
  const p = platzAusApi(API_PLATZ);
  assert.deepEqual(p, {
    id: "ChIJ1",
    name: "Friseur Graziella",
    adresse: "Bahnhofstr. 5, 63165 Mühlheim am Main",
    telefon: "06108 12345",
    website: "https://www.facebook.com/graziella",
    bewertung: 4.7,
    anzahl: 119,
    maps: "https://maps.google.com/?cid=42",
    branche: "Friseursalon",
  });
  assert.equal(platzAusApi({ ...API_PLATZ, businessStatus: "CLOSED_PERMANENTLY" }), null, "geschlossen zählt nicht");
  assert.equal(platzAusApi({}), null);
});

test("Analyse aus Google-Daten (ohne eigene Website)", () => {
  const p = platzAusApi(API_PLATZ) as Platz;
  const a = analyseAusPlatz(p);
  assert.equal(a.firma, "Friseur Graziella");
  assert.equal(a.branche, "Friseursalon");
  assert.equal(a.telefon, "06108 12345");
  assert.equal(a.email, null);
  assert.match(a.zusammenfassung, /4,7 ★ \(119 Bewertungen\)/);
  assert.match(a.zusammenfassung, /Google Maps/);
  assert.deepEqual(a.auffaelligkeiten, ["Als Website nur ein Verzeichnis oder soziales Netzwerk (facebook.com)"]);
  assert.equal(a.passt, "Websites & Landingpages");
  const ohne = analyseAusPlatz({ ...p, website: null, bewertung: null, anzahl: 0 });
  assert.deepEqual(ohne.auffaelligkeiten, ["Keine Website bei Google Maps eingetragen"]);
  assert.match(ohne.zusammenfassung, /^Gefunden über Google Maps/);
});

test("Formular: Felder, Vorbelegung und Auswertung", () => {
  const m = formularModal("Bäckerei Schmitt", "Mühlheim");
  assert.equal(m.type, 9);
  assert.equal(m.data.custom_id, "lead:formab");
  const felder = m.data.components.map((r) => r.components[0]);
  assert.deepEqual(felder.map((f) => f.custom_id), ["firma", "ort", "telefon", "ansprechpartner", "notiz"]);
  assert.deepEqual(felder.map((f) => f.required), [true, true, false, false, false]);
  assert.equal(felder[0].value, "Bäckerei Schmitt");
  assert.equal(felder[1].value, "Mühlheim");
  assert.equal(felder[4].style, 2, "Notiz ist mehrzeilig");
  assert.equal("value" in formularModal().data.components[0].components[0], false, "ohne Vorbelegung kein Wert");

  const werte = formularWerte([
    { components: [{ custom_id: "firma", value: "  Bäckerei Schmitt " }] },
    { components: [{ custom_id: "ort", value: "Mühlheim" }] },
    { components: [{ custom_id: "telefon", value: "" }] },
    { components: [{ custom_id: "ansprechpartner", value: "Frau Schmitt" }] },
    { components: [{ custom_id: "notiz", value: "War am Markt, will Website" }] },
  ]);
  assert.deepEqual(werte, { firma: "Bäckerei Schmitt", ort: "Mühlheim", telefon: "", ansprechpartner: "Frau Schmitt", notiz: "War am Markt, will Website" });
});

test("Analyse aus dem Formular", () => {
  const a = analyseAusFormular({ firma: "Bäckerei Schmitt", ort: "Mühlheim", telefon: "", ansprechpartner: "Frau Schmitt", notiz: "War am Markt" });
  assert.equal(a.firma, "Bäckerei Schmitt");
  assert.equal(a.adresse, "Mühlheim");
  assert.equal(a.telefon, null);
  assert.equal(a.ansprechpartner, "Frau Schmitt");
  assert.match(a.zusammenfassung, /^War am Markt/);
  assert.match(a.zusammenfassung, /von Hand angelegt/);
  assert.deepEqual(a.auffaelligkeiten, ["Von Hand angelegt, ohne Website-Auswertung"]);
  assert.equal(a.passt, null);
  const leer = analyseAusFormular({ firma: "X", ort: "Y", telefon: "069 1", ansprechpartner: "", notiz: "" });
  assert.equal(leer.ansprechpartner, null);
  assert.equal(leer.telefon, "069 1");
  assert.match(leer.zusammenfassung, /^Von Hand angelegt/);
});

test("Schlüssel für von Hand angelegte Firmen (gegen doppelte Karten)", () => {
  assert.equal(manuellerSchluessel("Bäckerei Schmitt GmbH", "Mühlheim am Main"), "manuell-baeckerei-schmitt-gmbh-muehlheim-am-main");
  assert.equal(manuellerSchluessel(" bäckerei  schmitt gmbh", "MÜHLHEIM am main "), "manuell-baeckerei-schmitt-gmbh-muehlheim-am-main");
  assert.ok(manuellerSchluessel("a".repeat(200), "b").length <= 80);
});

// 09.11.: /lead mit einem einzigen Feld – der Bot erkennt selbst, was gemeint ist.
test("Eingabe erkennen: Website, Maps-Link oder Firmenname mit Ort", () => {
  assert.deepEqual(erkenneEingabe(""), { art: "leer" });
  assert.deepEqual(erkenneEingabe("   "), { art: "leer" });
  assert.deepEqual(erkenneEingabe("https://maps.app.goo.gl/AbC"), { art: "maps", text: "https://maps.app.goo.gl/AbC" });
  for (const w of ["www.firma.de", "firma.de", "https://www.baeckerei-schmitt.de/kontakt", "http://friseur.com", "Salon-Mueller.de/"]) assert.equal(erkenneEingabe(w).art, "website", w);
  assert.deepEqual(erkenneEingabe("  Bäckerei Schmitt Mühlheim am Main "), { art: "name", text: "Bäckerei Schmitt Mühlheim am Main" });
  // Ein Name mit Punkt ist keine Website
  for (const n of ["Dr. Weber Zahnarzt Offenbach", "Café Mio", "Müller GmbH & Co. KG Hanau", "Fantasia 1"]) assert.equal(erkenneEingabe(n).art, "name", n);
});

const platz = (id: string, name: string, extra: Partial<Platz> = {}): Platz => ({ id, name, adresse: "Hauptstr. 1, 63165 Mühlheim", telefon: null, website: null, bewertung: 4.6, anzahl: 128, maps: null, branche: "Bäckerei", ...extra });

test("Treffer-Auswahl: bis zu 3 Firmen mit Adresse und Bewertung, je ein Knopf, dazu „Keine davon“", () => {
  const a = trefferAuswahl([
    platz("ChIJaaa", "Bäckerei Schmitt"),
    platz("ChIJbbb", "Bäckerei Schmitt Filiale", { adresse: "Bahnhofstr. 5, 63165 Mühlheim", bewertung: null, anzahl: 0 }),
    platz("ChIJccc", "Schmitt Backwaren"),
    platz("ChIJddd", "Zu viel"),
  ], "Bäckerei Schmitt Mühlheim");
  assert.match(a.content, /3 Firmen/);
  assert.match(a.content, /\*\*Bäckerei Schmitt\*\*/);
  assert.match(a.content, /Hauptstr\. 1, 63165 Mühlheim/);
  assert.match(a.content, /⭐ 4,6 \(128\)/);
  assert.match(a.content, /keine Bewertungen/);
  assert.doesNotMatch(a.content, /Zu viel/);
  const knoepfe = a.components.flatMap((r) => r.components);
  assert.deepEqual(knoepfe.slice(0, 3).map((k) => k.custom_id), ["lead:wahl:ChIJaaa", "lead:wahl:ChIJbbb", "lead:wahl:ChIJccc"]);
  assert.equal(knoepfe.every((k) => (k.label ?? "").length <= 80 && k.custom_id.length <= 100), true);
  assert.match(knoepfe.at(-1)!.custom_id, /^lead:formular:/);
  assert.equal(knoepfe.at(-1)!.label, "Keine davon");
});
