// KI-Entwurf für Mails an Kunden (Etappe 2, 16.11.2026): nur die Prüfung, ohne Netz.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ENTWURF_PROMPT, pruefeEntwurf } from "../lib/mail-entwurf.ts";

const gut = { zusammenfassung: "Kunde fragt nach einer Website für seine Bäckerei.", betreff: "Deine Frage zur Website", text: "Hallo Max,\n\ndanke für deine Nachricht.\n\nViele Grüße\nDavid\nAgents Gilt" };

test("gültiger Entwurf kommt durch", () => {
  assert.deepEqual(pruefeEntwurf(gut), gut);
});

test("ohne Text ist der Entwurf unbrauchbar", () => {
  assert.equal(pruefeEntwurf({ ...gut, text: "  " }), null);
  assert.equal(pruefeEntwurf(null), null);
  assert.equal(pruefeEntwurf("Hallo"), null);
});

test("zu langer Betreff wird gekürzt", () => {
  const e = pruefeEntwurf({ ...gut, betreff: "x".repeat(120) });
  assert.ok(e && e.betreff.length <= 80);
});

test("fehlende Zusammenfassung ist erlaubt", () => {
  assert.equal(pruefeEntwurf({ betreff: "a", text: "b" })?.zusammenfassung, "");
});

test("Preise sind gesperrt", () => {
  assert.equal(pruefeEntwurf({ ...gut, text: "Das kostet 990 € im Monat." }), null);
  assert.equal(pruefeEntwurf({ ...gut, text: "Rund 500 Euro einmalig." }), null);
  assert.equal(pruefeEntwurf({ ...gut, text: "Ab 49 EUR pro Monat." }), null);
});

test("Prompt verbietet Preise und verlangt Du-Form", () => {
  assert.match(ENTWURF_PROMPT, /nie Preise/i);
  assert.match(ENTWURF_PROMPT, /Du-Form/);
});
