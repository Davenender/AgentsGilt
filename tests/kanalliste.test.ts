// Discord-Durchsicht 16.11.2026: Rund 100-mal bremste Discord den Bot (HTTP 429), weil 30 Stellen die Kanalliste des
// Servers einzeln abrufen. Ein gemeinsamer Zwischenspeicher (15 s, geleert, sobald der Bot selbst Kanäle ändert). `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { KANALLISTE_MS, Kanalliste, istKanallisteAbruf, leertKanalliste } from "../lib/kanalliste.ts";

test("Welche Aufrufe die Kanalliste lesen und welche sie ungültig machen", () => {
  assert.equal(istKanallisteAbruf("GET", "/guilds/1564355422222159975/channels"), true);
  assert.equal(istKanallisteAbruf("GET", "/guilds/1564355422222159975/channels?x=1"), false);
  assert.equal(istKanallisteAbruf("POST", "/guilds/1564355422222159975/channels"), false);
  assert.equal(istKanallisteAbruf("GET", "/channels/123/messages"), false);
  assert.equal(leertKanalliste("POST", "/guilds/1/channels"), true, "Kanal angelegt");
  assert.equal(leertKanalliste("PATCH", "/guilds/1/channels"), true, "Reihenfolge geändert");
  assert.equal(leertKanalliste("PATCH", "/channels/123"), true, "Name, Kategorie oder Thema geändert");
  assert.equal(leertKanalliste("DELETE", "/channels/123"), true);
  assert.equal(leertKanalliste("PUT", "/channels/123/permissions/456"), true, "Rechte geändert");
  assert.equal(leertKanalliste("POST", "/channels/123/messages"), false, "Nachricht schreiben ändert keine Kanäle");
  assert.equal(leertKanalliste("PATCH", "/channels/123/messages/9"), false);
  assert.equal(leertKanalliste("PUT", "/channels/123/pins/9"), false);
  assert.equal(leertKanalliste("GET", "/guilds/1/channels"), false);
});

test("Zwischenspeicher: 15 s gültig, leeren wirkt sofort, nur Erfolge werden gemerkt", () => {
  const z = new Kanalliste();
  assert.equal(z.hole(1000), undefined);
  z.merke([{ id: "a" }], 1000);
  assert.deepEqual(z.hole(1000 + KANALLISTE_MS - 1), [{ id: "a" }]);
  assert.equal(z.hole(1000 + KANALLISTE_MS), undefined, "abgelaufen");
  z.merke([{ id: "b" }], 2000);
  z.leere();
  assert.equal(z.hole(2001), undefined);
  z.merke(null, 3000);
  assert.equal(z.hole(3001), undefined, "Fehler (null) wird nicht gemerkt");
  assert.equal(KANALLISTE_MS, 15_000);
});
