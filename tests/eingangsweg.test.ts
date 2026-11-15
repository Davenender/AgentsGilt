// Eingehender Anruf: Wartet für die Nummer ein Rückruf, kommt zuerst die Ansage – auch bei David, damit er den
// Ablauf als Kunde testen kann (Davids Wunsch 16.11.). Sonst bekommt David sein Menü, alle anderen den Assistenten.
import assert from "node:assert/strict";
import { test } from "node:test";
import { eingangsWeg } from "../lib/eingangsweg.ts";

test("wartender Rückruf geht vor, auch bei Davids Nummer", () => {
  assert.equal(eingangsWeg({ rueckrufWartet: true, david: true }), "rueckruf-ansage");
  assert.equal(eingangsWeg({ rueckrufWartet: true, david: false }), "rueckruf-ansage");
});

test("ohne wartenden Rückruf: David bekommt sein Menü, alle anderen den Assistenten", () => {
  assert.equal(eingangsWeg({ rueckrufWartet: false, david: true }), "davids-menue");
  assert.equal(eingangsWeg({ rueckrufWartet: false, david: false }), "assistent");
});
