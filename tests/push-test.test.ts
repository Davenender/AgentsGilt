// Test-Push an das Team (19.11.2026, Davids Wunsch nach neuem ntfy-Code): Nur mit HELFER_SECRET,
// schickt genau einen kurzen Push an das Team-Thema und meldet zurück, ob er rausging (ohne den Code zu zeigen).
import assert from "node:assert/strict";
import { test } from "node:test";
import { testPush } from "../lib/push-test.ts";

const spion = () => {
  const aufrufe: [string, string][] = [];
  const schicke = async (titel: string, text: string) => (aufrufe.push([titel, text]), { gesetzt: true, laenge: 23, status: 200 });
  return { aufrufe, schicke };
};

test("Test-Push: ohne oder mit falschem Schlüssel nichts senden", async () => {
  for (const auth of [null, "", "Bearer falsch", "Bearer geheim1"]) {
    const s = spion();
    const r = await testPush(auth, "geheim", s.schicke);
    assert.equal(r.status, 401, String(auth));
    assert.equal(s.aufrufe.length, 0);
  }
  const s = spion();
  assert.equal((await testPush("Bearer geheim", undefined, s.schicke)).status, 401, "ohne HELFER_SECRET nie");
  assert.equal(s.aufrufe.length, 0);
});

test("Test-Push: mit Schlüssel genau ein Push, Antwort mit Länge statt Code", async () => {
  const s = spion();
  const r = await testPush("Bearer geheim", "geheim", s.schicke);
  assert.equal(r.status, 200);
  assert.equal(s.aufrufe.length, 1);
  assert.match(s.aufrufe[0][0], /Test/);
  assert.deepEqual(r.body, { gesendet: true, laenge: 23, ntfy: 200 });
  const ohneThema = await testPush("Bearer geheim", "geheim", async () => ({ gesetzt: false, laenge: 0, status: null }));
  assert.deepEqual(ohneThema.body, { gesendet: false, laenge: 0, ntfy: null });
});
