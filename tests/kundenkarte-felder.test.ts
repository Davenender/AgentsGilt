// Kundenkarte: Knöpfe statt Notion (Etappe 4, 16.11.2026). Reine Logik.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHECKLISTE, checklisteProps, feedbackProps, leseDatum, pruefeKontakt, standAusKarte, notionLinkAusKarte } from "../lib/kundenkarte-felder.ts";

const karte = (zeilen: string[]) => ({ fields: [{ name: "Status", value: "Lead" }, { name: "Checkliste", value: zeilen.join("\n") }] });

test("Stand aus der Karte lesen", () => {
  const s = standAusKarte(karte(["✅ Angebot raus", "⬜ Vertrag unterschrieben", "⬜ AVV unterschrieben", "⬜ Anzahlung erhalten", "✅ Material erhalten", "⬜ Abnahme erfolgt", "⬜ Live / Übergeben"]));
  assert.equal(s.checkliste["Angebot raus"], true);
  assert.equal(s.checkliste["Material erhalten"], true);
  assert.equal(s.checkliste["Vertrag unterschrieben"], false);
  assert.equal(s.live, false);
  assert.equal(standAusKarte(karte(["✅ Live / Übergeben"])).live, true);
  assert.equal(standAusKarte(null).live, false);
  assert.equal(CHECKLISTE.length, 7);
});

test("Checkliste: alle sieben Felder, gewählte an", () => {
  const p = checklisteProps(["Material erhalten"]);
  assert.equal(Object.keys(p).length, 7);
  assert.deepEqual(p["Material erhalten"], { checkbox: true });
  assert.deepEqual(p["Angebot raus"], { checkbox: false });
  assert.deepEqual(checklisteProps(["Unsinn"])["Angebot raus"], { checkbox: false });
});

test("Datum lesen, nie in der Vergangenheit", () => {
  assert.equal(leseDatum("24.11.2026", "2026-11-16"), "2026-11-24");
  assert.equal(leseDatum("24.11.26", "2026-11-16"), "2026-11-24");
  assert.equal(leseDatum("24.11.", "2026-11-30"), "2027-11-24");
  assert.equal(leseDatum("1.12.", "2026-11-16"), "2026-12-01");
  assert.equal(leseDatum("31.02.2027", "2026-11-16"), null);
  assert.equal(leseDatum("15.11.2026", "2026-11-16"), null);
  assert.equal(leseDatum("morgen", "2026-11-16"), null);
  assert.equal(leseDatum("", "2026-11-16"), null);
});

test("Kontakt prüfen", () => {
  assert.equal(pruefeKontakt("kein-mail", "").ok, false);
  assert.equal(pruefeKontakt("", "").ok, false);
  assert.equal(pruefeKontakt("", "abc").ok, false);
  const r = pruefeKontakt("Max@Firma.de", "069 123456");
  assert.ok(r.ok);
  assert.deepEqual(r.props["E-Mail"], { email: "max@firma.de" });
  assert.deepEqual(r.props["Telefon"], { phone_number: "069 123456" });
  const nurTel = pruefeKontakt("", "+49 151 2345678");
  assert.ok(nurTel.ok && nurTel.props["E-Mail"] === undefined);
});

test("Feedback", () => {
  assert.deepEqual(feedbackProps(3, null), { Zufriedenheit: { select: { name: "⭐⭐⭐ 3" } } });
  assert.deepEqual(feedbackProps(null, true), { "Referenz erlaubt": { checkbox: true } });
  assert.deepEqual(feedbackProps(5, false), { Zufriedenheit: { select: { name: "⭐⭐⭐⭐⭐ 5" } }, "Referenz erlaubt": { checkbox: false } });
});

test("Notion-Link aus der Karte (Etappe 5: Angebotslink in Mails prüfen)", () => {
  const karte = { fields: [{ name: "Notion", value: "[Kundenseite öffnen](https://www.notion.so/abc123)" }] };
  assert.equal(notionLinkAusKarte(karte), "https://www.notion.so/abc123");
  assert.equal(notionLinkAusKarte({ fields: [{ name: "Notion", value: "fehlt" }] }), null);
  assert.equal(notionLinkAusKarte(null), null);
});
