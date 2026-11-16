// Seit Etappe 1 (Chat 24 Stunden) und 2 (Mail-Knopf) stimmt „Antworten kommen nicht mehr an“ nicht mehr.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("Hinweis „Besucher hat den Chat verlassen“ nennt 24 Stunden und den Mail-Knopf", () => {
  const s = readFileSync(new URL("../lib/support.ts", import.meta.url), "utf8");
  assert.doesNotMatch(s, /Antworten kommen bei ihm nicht mehr an/);
  assert.match(s, /Kommt er innerhalb von 24 Stunden zurück, sieht er eure Antworten/);
  assert.match(s, /📧 Per E-Mail antworten/);
});
