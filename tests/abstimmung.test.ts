// Lead-Abstimmung (Davids Wunsch 09.11.): Fürs Erste reicht ein „Passt“, damit ein Lead aufgenommen wird.
// Ablehnen braucht weiter zwei Stimmen (danach fragt der Bot noch einmal nach).
import assert from "node:assert/strict";
import { test } from "node:test";
import { entscheide, NOETIG } from "../lib/abstimmung.ts";

test("ein Passt nimmt den Lead auf, Ablehnen braucht zwei", () => {
  assert.deepEqual(NOETIG, { ja: 1, nein: 2 });
  assert.equal(entscheide(1, 0), "accepted");
  assert.equal(entscheide(0, 1), "vote");
  assert.equal(entscheide(0, 2), "confirm");
  assert.equal(entscheide(1, 1), "accepted");
  assert.equal(entscheide(0, 0), "vote");
});
