// WhatsApp Etappe 3 (22.11.2026): „nachschauen“ am Telefon sucht auch in Davids WhatsApp und den Personen-Notizen. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LUCA_WERKZEUGE } from "../lib/luca-logik.ts";

test("nachschauen: auch WhatsApp und Personen-Notizen; Antwort-Entwürfe kommen mit Link aufs Handy", () => {
  const n = LUCA_WERKZEUGE.find((w) => w.function.name === "nachschauen");
  assert.ok(n, "nachschauen fehlt");
  const d = n.function.description;
  assert.match(d, /in WhatsApp \(alle Chats seit 2013\) und den Personen-Notizen/);
  assert.match(d, /Antwort-Entwürfe für WhatsApp kommen mit Link aufs Handy/);
  assert.match(d, /nachricht_schicken/);
});

// Telefon-Test 22.11.: „Schreib mal 'nen Entwurf an Maxi“ landete bei diktat („zum Beispiel für WhatsApp“) – Text ohne Link.
test("diktat: nicht für WhatsApp-Kontakte, verweist auf nachschauen (Entwurf mit Link)", () => {
  const d = LUCA_WERKZEUGE.find((w) => w.function.name === "diktat")?.function.description ?? "";
  assert.doesNotMatch(d, /zum Beispiel für WhatsApp/);
  assert.match(d, /Für einen WhatsApp-Kontakt nimm stattdessen nachschauen/);
});
