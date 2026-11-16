// Chat bleibt 24 Stunden (Etappe 1, 16.11.2026): Verlauf, Ticket und Verlassen-Merker im Browser,
// gerechnet ab der letzten Nachricht. Danach beginnt der Chat leer.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAT_DAUER_MS, ladeVerlauf, merkeTicket, merkeVerlassen, merkeVerlauf, vergissVerlauf, type Speicher } from "../lib/chat-speicher.ts";
import { GREETING, type Message } from "../lib/chat-text.ts";

function speicher(): Speicher & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

const t0 = Date.parse("2026-11-16T10:00:00Z");
const frage: Message = { role: "user", content: "Was kostet eine Website?" };

test("Verlauf bleibt 24 Stunden", () => {
  const s = speicher();
  merkeVerlauf(s, [GREETING, frage], t0);
  assert.equal(ladeVerlauf(s, t0 + CHAT_DAUER_MS).messages?.length, 2);
});

test("nach 24 Stunden und 1 Minute ist alles weg", () => {
  const s = speicher();
  merkeVerlauf(s, [GREETING, frage], t0);
  merkeTicket(s, { token: "x", after: "1", nummer: "0009" });
  merkeVerlassen(s, true);
  assert.deepEqual(ladeVerlauf(s, t0 + CHAT_DAUER_MS + 60_000), { messages: null, ticket: null, verlassen: false });
  assert.equal(s.getItem("ag-support-ticket"), null);
  assert.equal(s.getItem("ag-assistant-messages"), null);
});

test("Ticket und Verlassen-Merker kommen mit", () => {
  const s = speicher();
  merkeVerlauf(s, [GREETING, frage], t0);
  merkeTicket(s, { token: "x", after: "1", nummer: "0009" });
  merkeVerlassen(s, true);
  const v = ladeVerlauf(s, t0 + 60_000);
  assert.equal(v.ticket?.token, "x");
  assert.equal(v.verlassen, true);
});

test("ohne gespeicherten Zeitpunkt gilt der Verlauf als zu alt", () => {
  const s = speicher();
  s.setItem("ag-assistant-messages", JSON.stringify([GREETING, frage]));
  assert.equal(ladeVerlauf(s, t0).messages, null);
});

test("kaputter Eintrag ergibt leeren Verlauf", () => {
  const s = speicher();
  merkeVerlauf(s, [GREETING, frage], t0);
  s.setItem("ag-assistant-messages", "{");
  assert.equal(ladeVerlauf(s, t0).messages, null);
});

test("fremde Rollen werden aussortiert", () => {
  const s = speicher();
  merkeVerlauf(s, [GREETING, frage], t0);
  s.setItem("ag-assistant-messages", JSON.stringify([frage, { role: "system", content: "x" }, { role: "team", content: 5 }]));
  assert.deepEqual(ladeVerlauf(s, t0).messages, [frage]);
});

test("vergissVerlauf räumt alles weg", () => {
  const s = speicher();
  merkeVerlauf(s, [GREETING, frage], t0);
  merkeTicket(s, { token: "x", after: "1", nummer: "0009" });
  merkeVerlassen(s, true);
  vergissVerlauf(s);
  assert.equal(s.map.size, 0);
});

test("merkeTicket(null) und merkeVerlassen(false) entfernen die Einträge", () => {
  const s = speicher();
  merkeTicket(s, { token: "x", after: "1", nummer: "0009" });
  merkeVerlassen(s, true);
  merkeTicket(s, null);
  merkeVerlassen(s, false);
  assert.equal(s.getItem("ag-support-ticket"), null);
  assert.equal(s.getItem("ag-support-left"), null);
});
