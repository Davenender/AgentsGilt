// Takt fürs Team (cron-job.org, jede Minute): wann etwas fällig ist (Etappe 2, 16.11.2026).
import assert from "node:assert/strict";
import { test } from "node:test";
import { erinnerungFaellig, kanalId, zeitAusId } from "../lib/team-takt-regeln.ts";

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

// 16.11.: Der Takt holte die Kanalliste bis zu sechsmal je Lauf → Discord 429. Jetzt einmal je Lauf.
test("Kanal aus der einmal geholten Liste", () => {
  const liste = [
    { id: "1", name: "leads", type: 0 },
    { id: "2", name: "LEADS", type: 4 },
    { id: "3", name: "posteingang", type: 0 },
    { id: "4", name: "🟡knd_003", type: 0 },
  ];
  assert.equal(kanalId(liste, "leads"), "1");
  assert.equal(kanalId(liste, "posteingang"), "3");
  assert.equal(kanalId(liste, "fehlt"), null);
  assert.equal(kanalId([], "leads"), null);
});
