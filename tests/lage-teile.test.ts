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
  // gibt es den neuen Teil 2, zählt der alte nicht
  assert.ok(!lageZusammen([neu[0], altTeil2, ...neu.slice(1)])!.text.includes("ALT"));
  // fehlt er (Ändern mittendrin gescheitert), kommt seit 28.11. der alte dazu – besser als eine Lücke
  const z = lageZusammen([neu[0], altTeil2, ...neu.slice(2)])!;
  assert.ok(z.text.includes("ALT"));
  assert.equal(z.stand, STAND);
  assert.deepEqual(lageZusammen([{ stand: STAND, text: "nur eins" }]), { stand: STAND, text: "nur eins" });
  assert.equal(lageZusammen([]), null);
});

test("28.11.: fehlt ein Teil des neuesten Stands, kommt der neueste ältere dieses Teils dazu", () => {
  const neu = lageStuecke({ stand: STAND, text: zeilen(60) });
  const alt = lageStuecke({ stand: "2026-11-28T09:00:00.000Z", text: zeilen(60).replace(/Zeile/g, "Alt") });
  assert.ok(neu.length >= 3);
  // Teil 2 des neuen Stands fehlt
  const z = lageZusammen([...neu.filter((t) => t.teil !== 2), ...alt])!;
  assert.equal(z.stand, STAND);
  const teile = z.text.split("\n");
  assert.ok(z.text.includes(neu[0].text) && z.text.includes(alt[1].text) && z.text.includes(neu[2].text));
  assert.ok(teile.length > 0);
});

test("28.11.: nur Teil 1 und geänderte Teile werden geändert; Luca liest unveränderte aus dem älteren Stand", async () => {
  const { teilAendern } = await import("../lib/luca-logik.ts");
  const alt = lageStuecke({ stand: "2026-11-28T09:00:00.000Z", text: zeilen(60) });
  const neuText = zeilen(60).replace("Zeile 59:", "Zeile 59 neu:");
  const neu = lageStuecke({ stand: STAND, text: neuText });
  assert.equal(neu.length, alt.length);
  const aendern = neu.map((s, i) => teilAendern(lageNachricht(alt[i]), s));
  assert.equal(aendern[0], true); // Teil 1 immer
  assert.equal(aendern.at(-1), true); // der letzte hat sich geändert
  assert.ok(aendern.slice(1, -1).every((x) => !x)); // die mittleren nicht
  // So liegt es danach in Discord: Teil 1 und der letzte neu, die mittleren alt – zusammen genau der neue Text
  const inDiscord = neu.map((s, i) => (aendern[i] ? s : alt[i]));
  assert.deepEqual(lageZusammen(inDiscord), { stand: STAND, text: neuText });
});
