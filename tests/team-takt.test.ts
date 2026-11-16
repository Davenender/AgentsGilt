// Takt fürs Team (cron-job.org, jede Minute): wann etwas fällig ist (Etappe 2, 16.11.2026).
import assert from "node:assert/strict";
import { test } from "node:test";
import { erinnerungFaellig, zeitAusId } from "../lib/team-takt-regeln.ts";

const H = 60 * 60 * 1000;

test("Erinnerung an David nach 2 Stunden, nur einmal", () => {
  const t0 = Date.parse("2026-11-16T10:00:00Z");
  assert.equal(erinnerungFaellig(t0, t0 + 2 * H - 60_000, false), false);
  assert.equal(erinnerungFaellig(t0, t0 + 2 * H + 60_000, false), true);
  assert.equal(erinnerungFaellig(t0, t0 + 5 * H, true), false);
});

test("Zeitpunkt aus der Discord-Kennung", () => {
  // Kennung der echten Willkommen-Karte, angelegt am 27.10.2026 um 19:37:59 UTC (Discord-Snowflake)
  const t = zeitAusId("1564724866966360156");
  assert.equal(new Date(t).toISOString(), "2026-10-27T19:37:59.467Z");
  assert.equal(zeitAusId("kein"), 0);
});
