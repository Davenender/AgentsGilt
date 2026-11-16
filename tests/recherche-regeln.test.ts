// Recherche-Mappe (Etappe 3, 16.11.2026): Obergrenze für Google-Bewertungen (500 im Monat, Davids Wunsch).
import assert from "node:assert/strict";
import { test } from "node:test";
import { BEWERTUNGEN_MAX, bewertungenErlaubt, leseZaehler, monatSchluessel, zaehlerZeile } from "../lib/recherche-regeln.ts";

test("höchstens 500 Bewertungs-Abrufe im Monat", () => {
  assert.equal(BEWERTUNGEN_MAX, 500);
  assert.equal(bewertungenErlaubt(499), true);
  assert.equal(bewertungenErlaubt(500), false);
});

test("Monat nach deutscher Zeit", () => {
  assert.equal(monatSchluessel(new Date("2026-11-30T23:30:00Z")), "2026-12");
  assert.equal(monatSchluessel(new Date("2026-11-16T10:00:00Z")), "2026-11");
});

test("Zähler beginnt jeden Monat neu", () => {
  const zeilen = [zaehlerZeile("2026-10", 480), zaehlerZeile("2026-11", 12), "irgendwas"];
  assert.equal(leseZaehler(zeilen, "2026-11"), 12);
  assert.equal(leseZaehler(zeilen, "2026-12"), 0);
  assert.equal(leseZaehler(["bewertungen|2026-11|kaputt"], "2026-11"), 0);
});
