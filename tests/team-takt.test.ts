// Takt fürs Team (cron-job.org, jede Minute): wann etwas fällig ist (Etappe 2, 16.11.2026).
import assert from "node:assert/strict";
import { test } from "node:test";
import { erinnerungFaellig, followUpHeute, followUpZeile, followUpZeit, heuteSchonErinnert, kanalId, zeitAusId } from "../lib/team-takt-regeln.ts";

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

// Etappe 4 (16.11.2026): Am Follow-up-Tag erinnert der Bot im Kundenkanal, einmal, um 8 Uhr.
test("Follow-up: welche Kunden heute dran sind", () => {
  const kunden = [
    { nr: "KND-002", followUp: "2026-11-17", status: "Lead" },
    { nr: "KND-003", followUp: "2026-11-17", status: "Verloren" },
    { nr: "KND-004", followUp: "2026-11-18", status: "Kunde" },
    { nr: "KND-005", followUp: null, status: "Lead" },
  ];
  assert.deepEqual(followUpHeute(kunden, "2026-11-17"), ["KND-002"]);
});

test("Follow-up: nur zwischen 8:00 und 8:04 deutscher Zeit", () => {
  assert.equal(followUpZeit(new Date("2026-11-17T07:02:00Z")), true); // 8:02 Winterzeit
  assert.equal(followUpZeit(new Date("2026-11-17T07:06:00Z")), false);
  assert.equal(followUpZeit(new Date("2026-07-17T06:01:00Z")), true); // 8:01 Sommerzeit
  assert.equal(followUpZeit(new Date("2026-11-17T08:01:00Z")), false);
});

test("Follow-up: Zeile und keine zweite Erinnerung am selben Tag", () => {
  const z = followUpZeile(["111", "222"], "Angebot nachfassen");
  assert.equal(z, "📌 <@111> <@222> Heute steht an: Angebot nachfassen");
  assert.equal(followUpZeile([], ""), "📌 Heute steht an: nachfassen");
  const heuteId = String((BigInt(Date.parse("2026-11-17T07:01:00Z") - 1420070400000) << 22n));
  const gesternId = String((BigInt(Date.parse("2026-11-16T07:01:00Z") - 1420070400000) << 22n));
  assert.equal(heuteSchonErinnert([{ id: heuteId, text: z }], "2026-11-17"), true);
  assert.equal(heuteSchonErinnert([{ id: gesternId, text: z }], "2026-11-17"), false);
  assert.equal(heuteSchonErinnert([{ id: heuteId, text: "andere Nachricht" }], "2026-11-17"), false);
});
