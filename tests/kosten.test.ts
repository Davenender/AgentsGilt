import assert from "node:assert/strict";
import { test } from "node:test";
import { kostenStand, monatsAnfang } from "../lib/kosten.ts";

const JETZT = new Date("2026-11-05T22:00:00Z");
const netz = (antwort: (u: string) => unknown, status = 200) => (async (u: string | URL) => new Response(JSON.stringify(antwort(String(u))), { status })) as typeof fetch;
const UMGEBUNG = { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "geheim", VAPI_API_KEY: "vapigeheim" };

test("Monatsanfang", () => {
  assert.equal(monatsAnfang(JETZT, 0), "2026-11-01T00:00:00.000Z");
  assert.equal(monatsAnfang(JETZT, -1), "2026-10-01T00:00:00.000Z");
  assert.equal(monatsAnfang(new Date("2027-01-02T12:00:00Z"), -1), "2026-12-01T00:00:00.000Z");
});

test("Kosten: Twilio und Vapi je Monat, Dauer aus den Anrufen, nie ein Schlüssel in der Antwort", async () => {
  const s = await kostenStand(JETZT, netz((u) => {
    if (u.includes("ThisMonth")) return { usage_records: [{ price: "3.456", price_unit: "usd" }] };
    if (u.includes("LastMonth")) return { usage_records: [{ price: "12.10", price_unit: "usd" }] };
    if (u.includes("Balance")) return { balance: "20.5", currency: "USD" };
    if (u.includes("createdAtLt")) return [{ cost: 1.5, startedAt: "2026-10-02T10:00:00Z", endedAt: "2026-10-02T10:10:00Z" }];
    return [{ cost: 0.25, startedAt: "2026-11-02T10:00:00Z", endedAt: "2026-11-02T10:03:00Z" }, { cost: 0.1 }];
  }), UMGEBUNG);
  assert.equal(s.twilio.dieser, 3.46);
  assert.equal(s.twilio.letzter, 12.1);
  assert.equal(s.twilio.guthaben, 20.5);
  assert.equal(s.twilio.waehrung, "USD");
  assert.deepEqual(s.vapi.dieser, { betrag: 0.35, anrufe: 2, minuten: 3 });
  assert.deepEqual(s.vapi.letzter, { betrag: 1.5, anrufe: 1, minuten: 10 });
  assert.doesNotMatch(JSON.stringify(s), /geheim/);
});

test("Kosten: Anbieter antwortet nicht oder Schlüssel fehlt, dann ehrlich leer statt falsch", async () => {
  const fehlt = await kostenStand(JETZT, netz(() => ({}), 500), UMGEBUNG);
  assert.equal(fehlt.twilio.dieser, null);
  assert.equal(fehlt.vapi.dieser, null);
  const ohne = await kostenStand(JETZT, netz(() => { throw new Error("nicht fragen"); }), {});
  assert.equal(ohne.twilio.dieser, null);
  assert.equal(ohne.vapi.letzter, null);
});
