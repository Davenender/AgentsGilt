// 28.11.2026 (Davids Wunsch: am Telefon soll nichts mehr gekürzt werden): der Lagebericht in mehreren Discord-Nachrichten.
import assert from "node:assert/strict";
import { test } from "node:test";
import { lageLesen, lageNachricht, lageStuecke, lageZusammen, LAGE_TEILE_MAX } from "../lib/luca-logik.ts";

const STAND = "2026-11-28T10:00:00.000Z";
const zeilen = (n: number) => Array.from({ length: n }, (_, i) => `Zeile ${i}: „${"Wissen für Luca ".repeat(6)}“ – mit "Anführung" und Umlauten äöü`).join("\n");

test("kurzer Bericht: ein Teil, wie bisher", () => {
  const s = lageStuecke({ stand: STAND, text: "Schule: heute frei", stimme: "abc1234567" });
  assert.deepEqual(s, [{ stand: STAND, text: "Schule: heute frei", stimme: "abc1234567", teil: 1, teile: 1 }]);
});

test("langer Bericht: mehrere Teile, jede Nachricht unter 2.000 Zeichen, zusammen wieder genau der Text", () => {
  const text = zeilen(50); // ~7.000 Zeichen – so viel schickt die Zentrale höchstens (MAX_LAGE 8.000)
  const s = lageStuecke({ stand: STAND, text, stimme: "abc1234567" });
  assert.ok(s.length > 1);
  for (const t of s) assert.ok(lageNachricht(t).length <= 2000, `Teil ${t.teil}: ${lageNachricht(t).length}`);
  assert.equal(s[0].stimme, "abc1234567");
  assert.equal(s[1].stimme, undefined);
  const gelesen = s.map((t) => lageLesen(lageNachricht(t))!);
  // Discord liefert die neuesten zuerst – die Reihenfolge ist egal
  assert.deepEqual(lageZusammen(gelesen.reverse()), { stand: STAND, text, stimme: "abc1234567" });
});

test("eine einzelne Riesen-Zeile wird an Wortgrenzen geteilt; höchstens 10 Teile", () => {
  const s = lageStuecke({ stand: STAND, text: "wort ".repeat(1500).trim() });
  for (const t of s) assert.ok(lageNachricht(t).length <= 2000);
  assert.equal(lageZusammen(s)!.text.replace(/\n/g, " "), "wort ".repeat(1500).trim());
  assert.ok(lageStuecke({ stand: STAND, text: zeilen(2000) }).length <= LAGE_TEILE_MAX);
});

test("mitten im Ändern: Teile eines anderen Stands zählen nicht; alte einzelne Nachricht gilt als Teil 1", () => {
  const neu = lageStuecke({ stand: STAND, text: zeilen(60) });
  const altTeil2 = { ...neu[1], stand: "2026-11-28T09:59:00.000Z", text: "ALT" };
  const z = lageZusammen([neu[0], altTeil2, ...neu.slice(2)])!;
  assert.ok(!z.text.includes("ALT"));
  assert.deepEqual(lageZusammen([{ stand: STAND, text: "nur eins" }]), { stand: STAND, text: "nur eins" });
  assert.equal(lageZusammen([]), null);
});
