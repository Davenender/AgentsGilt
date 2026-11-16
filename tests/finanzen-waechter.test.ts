// Finanzen A5 (16.11.2026): Wächter und Termine. Reine Logik, `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  faelligeTermine,
  grenzWarnung,
  leseMerker,
  monatsGrenzen,
  monatsName,
  ruecklageCent,
  schreibeMerker,
  steuerTermine,
  ueberblickKarte,
  vormonat,
  werktag,
} from "../lib/finanzen-waechter-regeln.ts";

test("Merker: lesen und schreiben ohne Doppelte", () => {
  const m = leseMerker("monat:2026-10  grenze80,erklaerung-2026:30");
  assert.deepEqual([...m].sort(), ["erklaerung-2026:30", "grenze80", "monat:2026-10"]);
  m.add("grenze80");
  assert.equal(schreibeMerker(m), "erklaerung-2026:30 grenze80 monat:2026-10");
  assert.equal(leseMerker("").size, 0);
});

test("Kleinunternehmer-Grenze: Push bei 80 % (20.000 €) und bei 25.000 €, jede Stufe nur einmal", () => {
  assert.equal(grenzWarnung(1_999_999, "2026", new Set()), null);
  const w80 = grenzWarnung(2_000_000, "2026", new Set());
  assert.deepEqual(w80?.tokens, ["grenze80"]);
  assert.match(w80!.text, /20\.000,00\s€ von 25\.000\s€/);
  assert.equal(grenzWarnung(2_100_000, "2026", new Set(["grenze80"])), null, "80 % schon gemeldet");
  const w100 = grenzWarnung(2_500_100, "2026", new Set(["grenze80"]));
  assert.deepEqual(w100?.tokens, ["grenze100"]);
  assert.match(w100!.titel, /erreicht/);
  assert.deepEqual(grenzWarnung(2_600_000, "2026", new Set())?.tokens.sort(), ["grenze100", "grenze80"], "Sprung über beide Stufen: eine Meldung, beide gemerkt");
  assert.equal(grenzWarnung(3_000_000, "2026", new Set(["grenze100"])), null);
});

test("Fristen am Wochenende rutschen auf Montag", () => {
  assert.equal(werktag("2027-07-31"), "2027-08-02", "31.07.2027 ist ein Samstag");
  assert.equal(werktag("2027-03-10"), "2027-03-10", "Mittwoch bleibt");
  assert.equal(werktag("2027-02-14"), "2027-02-15", "Sonntag → Montag");
});

test("Steuertermine: Erklärung fürs Vorjahr immer, Vorauszahlungen nur wenn angehakt", () => {
  const nur = steuerTermine(2027, { estVoraus: false, gewstVoraus: false });
  assert.deepEqual(nur.map((t) => t.id), ["erklaerung-2026"]);
  assert.equal(nur[0].datum, "2027-08-02");
  assert.match(nur[0].was, /Steuererklärung 2026/);
  const alle = steuerTermine(2027, { estVoraus: true, gewstVoraus: true });
  assert.equal(alle.length, 9);
  assert.ok(alle.some((t) => t.id === "est-2027-06" && t.datum === "2027-06-10"));
  assert.ok(alle.some((t) => t.id === "gewst-2027-11" && t.datum === "2027-11-15"));
  assert.deepEqual(steuerTermine(2026, { estVoraus: false, gewstVoraus: false }), [], "für 2025 gab es noch kein Gewerbe");
});

test("Erinnerung: je Termin die engste fällige Stufe, spätere Stufen gelten mit als erledigt", () => {
  const termine = steuerTermine(2027, { estVoraus: true, gewstVoraus: false });
  assert.deepEqual(faelligeTermine("2027-06-01", termine, new Set()).map((f) => f.token), [], "noch zu früh");
  const a = faelligeTermine("2027-07-03", termine, new Set());
  assert.equal(a.length, 1);
  assert.equal(a[0].termin.id, "erklaerung-2026");
  assert.equal(a[0].tage, 30);
  assert.deepEqual(a[0].tokens, ["erklaerung-2026:30"]);
  const b = faelligeTermine("2027-07-27", termine, new Set(["erklaerung-2026:30"]));
  assert.deepEqual(b[0].tokens, ["erklaerung-2026:7"]);
  const c = faelligeTermine("2027-08-01", termine, new Set());
  assert.deepEqual(c[0].tokens.sort(), ["erklaerung-2026:1", "erklaerung-2026:30", "erklaerung-2026:7"], "Lauf verpasst: nur einmal erinnern");
  assert.deepEqual(faelligeTermine("2027-08-03", termine, new Set()), [], "Termin vorbei");
  assert.equal(faelligeTermine("2027-09-03", termine, new Set())[0].termin.id, "est-2027-09");
});

test("Monat: Vormonat, Grenzen und Name", () => {
  assert.equal(vormonat("2026-12-01"), "2026-11");
  assert.equal(vormonat("2027-01-15"), "2026-12");
  assert.deepEqual(monatsGrenzen("2026-12"), { von: "2026-12-01", bis: "2027-01-01" });
  assert.equal(monatsName("2026-10"), "Oktober 2026");
});

test("Rücklage nach Faustregel: 25 % vom Gewinn über dem Grundfreibetrag", () => {
  assert.equal(ruecklageCent(1_000_000), 0);
  assert.equal(ruecklageCent(2_234_800), 250_000);
  assert.equal(ruecklageCent(-50_000), 0);
});

test("Monatsüberblick: Zahlen, Grenze, Hinweise nur wenn nötig", () => {
  const k = ueberblickKarte({
    monat: "2026-11",
    einnahmenCent: 50_000,
    ausgabenCent: 12_345,
    rcCent: 810,
    ohneBetrag: 1,
    jahr: "2026",
    umsatzCent: 250_000,
    kostenCent: 60_000,
    naechster: { datum: "2027-08-02", was: "Steuererklärung 2026" },
  });
  assert.equal(k.title, "💶 Finanzen November 2026");
  const text = JSON.stringify(k);
  assert.match(text, /500,00/);
  assert.match(text, /123,45/);
  assert.match(text, /Gewinn/);
  assert.match(text, /10 % von 25\.000/);
  assert.match(text, /Reverse Charge/);
  assert.match(text, /1 Ausgabe ohne Euro-Betrag/);
  assert.match(text, /02\.08\.2027/);
  const ruhig = JSON.stringify(ueberblickKarte({ monat: "2026-11", einnahmenCent: 0, ausgabenCent: 0, rcCent: 0, ohneBetrag: 0, jahr: "2026", umsatzCent: 0, kostenCent: 0, naechster: null }));
  assert.doesNotMatch(ruhig, /Reverse Charge|ohne Euro-Betrag|Steuertermin/);
});
