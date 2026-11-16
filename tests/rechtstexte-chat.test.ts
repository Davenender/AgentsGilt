// Etappe 1 (16.11.2026): Die Datenschutzerklärung nennt, dass der Chat 24 Stunden im Browser bleibt.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Datenschutz: Chatverlauf bis zu 24 Stunden im Browser", () => {
  const text = readFileSync(new URL("../components/neu/recht/Rechtstexte.tsx", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.match(text, /speichert dein Browser den Chatverlauf bis zu 24 Stunden nach deiner letzten Nachricht/);
  assert.match(text, /indem du die Website-Daten in deinem Browser löschst/);
});
