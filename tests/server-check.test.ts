// Davids Wunsch 16.11.2026: Einmal pro Woche prüft der Bot den Discord-Server und meldet nur, wenn etwas nicht stimmt. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { archivSperren, PFLICHT_KANAELE, pruefeServer, RECHT, type Lage } from "../lib/server-check.ts";

const r = (...n: bigint[]) => n.reduce((a, b) => a | b, BigInt(0)).toString();
const gut: Lage = {
  rollen: [
    { id: "bot", name: "Agents Gilt", position: 3, permissions: r(RECHT.kanaele, RECHT.rollen, RECHT.anheften, RECHT.sehen, RECHT.schreiben), managed: true },
    { id: "team", name: "Team", position: 2, permissions: r(RECHT.sehen), managed: false },
    { id: "anw", name: "Anwärter", position: 1, permissions: "0", managed: false },
    { id: "g", name: "@everyone", position: 0, permissions: r(RECHT.schreiben), managed: false },
  ],
  botRollen: ["bot"],
  kanaele: [
    ...PFLICHT_KANAELE.map((name, i) => ({ id: `p${i}`, name, type: 0, parent_id: null })),
    { id: "arch", name: "ARCHIV", type: 4, parent_id: null },
    { id: "t1", name: "geschlossen-ticket-0001", type: 0, parent_id: "arch", permission_overwrites: [{ id: "team", type: 0, allow: r(RECHT.sehen), deny: r(RECHT.schreiben) }] },
    { id: "l1", name: "📖lernpfad-mijo", type: 0, parent_id: null },
  ],
  aktive: ["mijo", "david"],
};

test("Alles in Ordnung: keine Meldung", () => {
  assert.deepEqual(pruefeServer(gut), []);
});

test("Bot-Rolle unter einer anderen Rolle, fehlende Bot-Rechte, Team darf Nachrichten verwalten", () => {
  const lage: Lage = {
    ...gut,
    rollen: gut.rollen.map((x) =>
      x.id === "bot" ? { ...x, position: 1, permissions: r(RECHT.kanaele, RECHT.sehen) } : x.id === "team" ? { ...x, permissions: r(RECHT.sehen, RECHT.nachrichtenVerwalten) } : x,
    ),
  };
  const m = pruefeServer(lage).join("\n");
  assert.match(m, /Bot-Rolle steht unter „Team“/);
  assert.match(m, /Rollen verwalten/);
  assert.match(m, /Nachrichten anheften/);
  assert.match(m, /Team.*Nachrichten verwalten/);
});

test("Administrator reicht für alle Bot-Rechte", () => {
  const lage: Lage = { ...gut, rollen: gut.rollen.map((x) => (x.id === "bot" ? { ...x, permissions: r(RECHT.admin) } : x)) };
  assert.deepEqual(pruefeServer(lage), []);
});

test("Archiv-Ticket fürs Team beschreibbar, verwaister Lernkanal, fehlender Pflicht-Kanal", () => {
  const lage: Lage = {
    ...gut,
    kanaele: [
      ...gut.kanaele.filter((k) => k.name !== "posteingang" && k.id !== "t1"),
      { id: "t2", name: "geschlossen-ticket-0002", type: 0, parent_id: "arch", permission_overwrites: [{ id: "team", type: 0, allow: r(RECHT.sehen, RECHT.schreiben), deny: "0" }] },
      { id: "l2", name: "🎭uebungen-jakob", type: 0, parent_id: null },
    ],
  };
  const m = pruefeServer(lage).join("\n");
  assert.match(m, /#geschlossen-ticket-0002/);
  assert.match(m, /#🎭uebungen-jakob/);
  assert.match(m, /#posteingang fehlt/);
});

test("Archiv-Sperre: welche Tickets die Team-Rolle schreibgeschützt bekommen (Rechte, die sie hat, bleiben)", () => {
  const kanaele = [
    { id: "arch", name: "ARCHIV", type: 4, parent_id: null },
    { id: "t1", name: "geschlossen-ticket-0001", type: 0, parent_id: "arch", permission_overwrites: [{ id: "team", type: 0, allow: r(RECHT.sehen, RECHT.schreiben, RECHT.verlauf), deny: "0" }] },
    { id: "t6", name: "geschlossen-ticket-0006", type: 0, parent_id: "arch", permission_overwrites: [{ id: "team", type: 0, allow: r(RECHT.sehen, RECHT.verlauf), deny: r(RECHT.schreiben) }] },
    { id: "x", name: "allgemein", type: 0, parent_id: null },
  ];
  assert.deepEqual(archivSperren(kanaele, "team"), [{ kanal: "t1", name: "geschlossen-ticket-0001", allow: r(RECHT.sehen, RECHT.verlauf), deny: r(RECHT.schreiben) }]);
});
