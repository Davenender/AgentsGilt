// Leads „In Arbeit“ (Etappe 3, 16.11.2026, Davids Regeln): Reihenfolge Offen → In Arbeit → Kontaktiert,
// pro Person nur eine Firma gleichzeitig in Arbeit, nach 2 Tagen fragt der Bot nach.
import assert from "node:assert/strict";
import { test } from "node:test";
import { NACHHAKEN_MS, andererInArbeit, kontaktiertErlaubt, mitRecherche, nachhakText, nachhakenFaellig, offeneFragen, ohneRecherche, pruefeSchritt, rechercheThread, schonNachgehakt } from "../lib/lead-arbeit.ts";

test("Kontaktiert erst nach In Arbeit", () => {
  assert.match(pruefeSchritt("Offen", "contacted") ?? "", /Erst auf „In Arbeit“ setzen/);
  assert.equal(pruefeSchritt("In Arbeit", "contacted"), null);
  assert.equal(pruefeSchritt("Kontaktiert", "contacted"), null);
  assert.equal(pruefeSchritt("Offen", "work"), null);
  assert.equal(pruefeSchritt("Kontaktiert", "open"), null);
  assert.equal(kontaktiertErlaubt("Offen"), false);
  assert.equal(kontaktiertErlaubt("In Arbeit"), true);
  assert.equal(kontaktiertErlaubt("Kontaktiert"), true);
});

const karte = (id: string, besitzer: string | null, status: string, firma = `Firma ${id}`) => ({ id, firma, besitzer, status });

test("nur eine eigene Firma gleichzeitig in Arbeit", () => {
  const karten = [karte("1", "A", "In Arbeit", "Bäckerei Schmitt"), karte("2", "A", "Offen"), karte("3", "B", "In Arbeit")];
  assert.equal(andererInArbeit(karten, "A", "2"), "Bäckerei Schmitt");
  assert.equal(andererInArbeit(karten, "A", "1"), null);
  assert.equal(andererInArbeit(karten, "B", "4"), "Firma 3");
  assert.equal(andererInArbeit(karten, "C", "9"), null);
});

test("freigegeben, aussortiert oder wieder offen: Platz ist frei", () => {
  assert.equal(andererInArbeit([karte("1", null, "In Arbeit"), karte("2", "A", "Offen"), karte("3", "A", "Kontaktiert")], "A", "4"), null);
});

test("nach 2 Tagen nachfragen, nur einmal", () => {
  const t0 = Date.parse("2026-11-16T10:00:00Z");
  assert.equal(NACHHAKEN_MS, 172_800_000);
  assert.equal(nachhakenFaellig(t0, t0 + NACHHAKEN_MS - 60_000, false), false);
  assert.equal(nachhakenFaellig(t0, t0 + NACHHAKEN_MS + 60_000, false), true);
  assert.equal(nachhakenFaellig(t0, t0 + NACHHAKEN_MS * 2, true), false);
});

// Task 3.3: Recherche-Thread an der Lead-Karte, Fragen im Thread, Nachhaken.
test("Recherche-Feld an der Karte setzen, lesen, entfernen", () => {
  const karte = { title: "Salon Weber", fields: [{ name: "Status", value: "In Arbeit" }] };
  const mit = mitRecherche(karte, "1571831419595128853");
  assert.equal(rechercheThread(mit), "1571831419595128853");
  assert.equal(rechercheThread(mitRecherche(mit, "222222222222222222"))?.length, 18);
  assert.equal(mit.fields?.filter((f) => f.name === "🔎 Recherche").length, 1);
  assert.equal(rechercheThread(ohneRecherche(mit)), null);
  assert.equal(rechercheThread(karte), null);
});

test("offene Fragen: Menschen nach der letzten Bot-Nachricht, älteste zuerst", () => {
  const n = (id: string, bot: boolean, text: string) => ({ id, autorId: bot ? "BOT" : "U", bot, text });
  assert.deepEqual(
    offeneFragen([n("1", true, "Mappe"), n("2", false, "Wer ist der Inhaber?"), n("3", true, "Anna Weber."), n("4", false, "Und die Öffnungszeiten?"), n("5", false, "  ")], "BOT"),
    [{ id: "4", text: "Und die Öffnungszeiten?" }],
  );
  assert.deepEqual(offeneFragen([n("1", true, "Mappe")], "BOT"), []);
});

test("Nachhaken nur einmal je Thread", () => {
  const t = nachhakText("Salon Weber", "111");
  assert.match(t, /^<@111> Wie weit bist du mit \*\*Salon Weber\*\*\?/);
  assert.equal(schonNachgehakt(["Mappe", t]), true);
  assert.equal(schonNachgehakt(["Mappe"]), false);
});
