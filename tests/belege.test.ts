// Finanzen A3 (16.11.2026): Belege-Sammler, Rechnungen aus Gmail werden Zeilen in „Ausgaben“. Reine Logik. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { anbieterOption, ausgabeProps, belegZeile, euroCent, istBelegKandidat, postfachAus, pruefeBeleg } from "../lib/belege-regeln.ts";

const mail = (o: Partial<{ von: string; betreff: string; text: string; anhaenge: { name: string; typ: string; groesse: number }[] }>) => ({
  von: "Jemand <jemand@firma.de>",
  betreff: "Hallo",
  text: "",
  anhaenge: [],
  ...o,
});

test("Kandidat: bekannter Anbieter, Rechnungs-Betreff oder Rechnungs-PDF", () => {
  assert.equal(istBelegKandidat(mail({ von: "Google Payments <payments-noreply@google.com>", betreff: "Google Workspace: Ihre Rechnung für agents-gilt.agency" })), true);
  assert.equal(istBelegKandidat(mail({ von: "Anthropic <invoice+statements@anthropic.com>", betreff: "Your receipt from Anthropic, PBC #2071-4459" })), true);
  assert.equal(istBelegKandidat(mail({ betreff: "Ihre Rechnung Nr. 4711" })), true);
  assert.equal(istBelegKandidat(mail({ anhaenge: [{ name: "Invoice-ABC-0001.pdf", typ: "application/pdf", groesse: 50000 }] })), true);
  assert.equal(istBelegKandidat(mail({ betreff: "Termin am Montag?" })), false);
  assert.equal(istBelegKandidat(mail({ von: "Notion <team@makenotion.com>", betreff: "New features in Notion" })), false, "Newsletter eines Anbieters ist kein Beleg");
});

test("KI-Antwort prüfen: nur gültige Belege, Werte begrenzt", () => {
  const ok = pruefeBeleg({ istRechnung: true, privat: false, anbieter: "Google", was: "Google Workspace Business Starter", betrag: 8.1, waehrung: "eur", datum: "2026-11-02", rechnungsnr: "5288881234", reverseCharge: true, monatlich: true, kategorie: "Software" });
  assert.deepEqual(ok, { istRechnung: true, privat: false, anbieter: "Google", was: "Google Workspace Business Starter", betrag: 8.1, waehrung: "EUR", datum: "2026-11-02", rechnungsnr: "5288881234", reverseCharge: true, monatlich: true, kategorie: "Software" });
  assert.equal(pruefeBeleg({ istRechnung: true, betrag: -3, waehrung: "EUR", datum: "2026-11-02", anbieter: "X", was: "Y" }), null, "Betrag muss positiv sein");
  assert.equal(pruefeBeleg({ istRechnung: true, betrag: 5, waehrung: "EUR", datum: "02.11.2026", anbieter: "X", was: "Y" }), null, "Datum JJJJ-MM-TT");
  assert.equal(pruefeBeleg("kaputt"), null);
  assert.equal(pruefeBeleg({ istRechnung: false })?.istRechnung, false, "keine Rechnung wird erkannt, nicht verworfen");
  assert.equal(pruefeBeleg({ istRechnung: true, privat: false, anbieter: "X", was: "Y", betrag: 5, waehrung: "EUR", datum: "2026-11-02", kategorie: "Quatsch" })?.kategorie, "Sonstiges");
});

test("Anbieter auf die Auswahl in Notion abbilden", () => {
  assert.equal(anbieterOption("Anthropic, PBC"), "Anthropic");
  assert.equal(anbieterOption("Google Cloud EMEA Ltd"), "Google");
  assert.equal(anbieterOption("Notion Labs, Inc."), "Notion");
  assert.equal(anbieterOption("Namecheap, Inc."), "Namecheap");
  assert.equal(anbieterOption("Bäckerei Schmitt"), "Sonstiges");
});

test("Postfach: an die Firma oder privat weitergeleitet", () => {
  assert.equal(postfachAus("kontakt@agents-gilt.agency"), "kontakt@");
  assert.equal(postfachAus("Kontakt <kontakt@agentsgilt.com>"), "kontakt@");
  assert.equal(postfachAus("davidhes4a@gmail.com"), "privat");
  assert.equal(postfachAus(undefined), "kontakt@", "ohne Angabe (alter Skriptstand) ist es kontakt@");
});

test("Euro-Betrag: Euro bleibt, Dollar zum Tageskurs, sonst nichts erfinden", () => {
  assert.equal(euroCent(8.1, "EUR", null), 810);
  assert.equal(euroCent(10, "USD", 0.92), 920);
  assert.equal(euroCent(10, "USD", null), null);
  assert.equal(euroCent(10, "CHF", 1.05), null);
});

test("Zeile in „Ausgaben“: alle Felder, Kennung der Mail in der Notiz, Kurs-Hinweis bei Dollar", () => {
  const b = pruefeBeleg({ istRechnung: true, privat: false, anbieter: "Vapi", was: "Vapi Guthaben", betrag: 10, waehrung: "USD", datum: "2026-11-05", rechnungsnr: "INV-1", reverseCharge: true, monatlich: false, kategorie: "KI" })!;
  const p = ausgabeProps(b, { euroCent: 920, kurs: 0.92, postfach: "privat", link: "https://mail.google.com/x", mailId: "m123", jahrSeite: "jahr-2026", datei: { id: "up1", name: "Invoice.pdf" } }) as Record<string, Record<string, unknown>>;
  assert.deepEqual(p["Was"], { title: [{ type: "text", text: { content: "Vapi Guthaben" } }] });
  assert.deepEqual(p["Anbieter"], { select: { name: "Vapi" } });
  assert.deepEqual(p["Betrag (€)"], { number: 9.2 });
  assert.deepEqual(p["Betrag original"], { number: 10 });
  assert.deepEqual(p["Währung"], { select: { name: "USD" } });
  assert.deepEqual(p["Datum"], { date: { start: "2026-11-05" } });
  assert.deepEqual(p["Kategorie"], { select: { name: "KI" } });
  assert.deepEqual(p["Reverse Charge"], { checkbox: true });
  assert.deepEqual(p["Monatlich"], { checkbox: false });
  assert.deepEqual(p["Postfach"], { select: { name: "privat" } });
  assert.deepEqual(p["Beleg-Link"], { url: "https://mail.google.com/x" });
  assert.deepEqual(p["Beleg"], { files: [{ type: "file_upload", file_upload: { id: "up1" }, name: "Invoice.pdf" }] });
  assert.deepEqual(p["Finanzjahr"], { relation: [{ id: "jahr-2026" }] });
  const notiz = JSON.stringify(p["Notiz"]);
  assert.match(notiz, /Mail m123/);
  assert.match(notiz, /INV-1/);
  assert.match(notiz, /0,92/);
});

test("Ohne Euro-Betrag (Kurs fehlt): Zeile trotzdem, Betrag leer und Hinweis", () => {
  const b = pruefeBeleg({ istRechnung: true, privat: false, anbieter: "Vapi", was: "Vapi", betrag: 10, waehrung: "USD", datum: "2026-11-05" })!;
  const p = ausgabeProps(b, { euroCent: null, kurs: null, postfach: "kontakt@", link: null, mailId: "m1", jahrSeite: null, datei: null }) as Record<string, unknown>;
  assert.equal("Betrag (€)" in p, false);
  assert.match(JSON.stringify(p["Notiz"]), /Euro-Betrag bitte eintragen/);
});

test("Zeile in #posteingang: kurz, mit Betrag, Datum und Hinweisen", () => {
  const b = pruefeBeleg({ istRechnung: true, privat: false, anbieter: "Google", was: "Google Workspace", betrag: 8.1, waehrung: "EUR", datum: "2026-11-02", reverseCharge: true, monatlich: true })!;
  const z = belegZeile(b, 810, "https://www.notion.so/zeile");
  assert.match(z, /^🧾 Beleg gebucht: \*\*Google Workspace\*\*/);
  assert.match(z.replace(/\s/g, " "), /8,10 €/);
  assert.match(z, /02\.11\.2026/);
  assert.match(z, /Reverse Charge/);
  assert.match(z, /notion\.so\/zeile/);
});

test("Ohne Datum in der Mail (z. B. Twilio-Aufladung): Datum der Mail als Ersatz, falsches Ersatzdatum zählt nicht", () => {
  const ki = { istRechnung: true, privat: false, anbieter: "Twilio", was: "Twilio Guthaben", betrag: 20, waehrung: "USD", kategorie: "Telefon" };
  assert.equal(pruefeBeleg(ki)?.datum, undefined, "ohne Ersatz bleibt es unbrauchbar");
  assert.equal(pruefeBeleg(ki, "2026-11-16T10:30:00.000Z")?.datum, "2026-11-16");
  assert.equal(pruefeBeleg(ki, "kaputt"), null);
  assert.equal(pruefeBeleg({ ...ki, datum: "2026-11-02" }, "2026-11-16T10:30:00.000Z")?.datum, "2026-11-02", "Datum der Rechnung geht vor");
});
