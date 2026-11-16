// Finanzen A2 (16.11.2026): Einnahmen von selbst in „Rechnungen“, Stripe-Gebühr in „Ausgaben“. Reine Logik. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anzahlungKarte,
  betragText,
  datumAusUnix,
  einnahmeProps,
  gebuehrProps,
  leseAnzahlungKarte,
  leseBetrag,
  leseZahltag,
  rechnungsNummer,
  typFuer,
} from "../lib/finanzen-regeln.ts";

test("Rechnungsnummer: die von Stripe, sonst ST-Datum-Kennung", () => {
  assert.equal(rechnungsNummer("A1B2C3-0001", "2026-11-16", "pi_3AbCdEfGh123456"), "A1B2C3-0001");
  assert.equal(rechnungsNummer(null, "2026-11-16", "pi_3AbCdEfGh123456"), "ST-20261116-123456");
  assert.equal(rechnungsNummer(null, "2026-11-16", null), "ST-20261116");
});

test("Typ: Abo = Retainer, erste Zahlung = Anzahlung, danach Schlussrechnung", () => {
  assert.equal(typFuer(true, "Kunde"), "Retainer");
  assert.equal(typFuer(false, "Lead"), "Anzahlung");
  assert.equal(typFuer(false, "Angebot gesendet"), "Anzahlung");
  assert.equal(typFuer(false, "Kunde"), "Schlussrechnung");
  assert.equal(typFuer(false, "Retainer läuft"), "Schlussrechnung");
  assert.equal(typFuer(false, null), "Sonstiges", "ohne Kunde");
});

test("Zeile in „Rechnungen“: Euro statt Cent, Kunde, Jahr, Gebühr, Link, Kennung in der Notiz", () => {
  const p = einnahmeProps({
    betragCent: 150000,
    datum: "2026-11-16",
    rechnungsNr: "ST-20261116-123456",
    typ: "Anzahlung",
    zahlungsart: "Stripe",
    kundeSeite: "kunde-1",
    jahrSeite: "jahr-2026",
    gebuehrCent: 2275,
    link: "https://dashboard.stripe.com/payments/pi_1",
    notiz: "Stripe-Ereignis evt_1",
  }) as Record<string, Record<string, unknown>>;
  assert.deepEqual(p["Rechnungsnr."], { title: [{ type: "text", text: { content: "ST-20261116-123456" } }] });
  assert.deepEqual(p["Betrag (€)"], { number: 1500 });
  assert.deepEqual(p["Rechnungsdatum"], { date: { start: "2026-11-16" } });
  assert.deepEqual(p["Bezahlt am"], { date: { start: "2026-11-16" } });
  assert.deepEqual(p["Kunde"], { relation: [{ id: "kunde-1" }] });
  assert.deepEqual(p["Finanzjahr"], { relation: [{ id: "jahr-2026" }] });
  assert.deepEqual(p["Typ"], { select: { name: "Anzahlung" } });
  assert.deepEqual(p["Zahlungsart"], { select: { name: "Stripe" } });
  assert.deepEqual(p["Stripe-Gebühr (€)"], { number: 22.75 });
  assert.deepEqual(p["Stripe"], { url: "https://dashboard.stripe.com/payments/pi_1" });
  assert.match(JSON.stringify(p["Notiz"]), /evt_1/);
});

test("Ohne Kunde, Jahr, Gebühr und Link: diese Felder fehlen (nichts Falsches eintragen)", () => {
  const p = einnahmeProps({ betragCent: 5000, datum: "2026-11-16", rechnungsNr: "X", typ: "Sonstiges", zahlungsart: "Überweisung", kundeSeite: null, jahrSeite: null, gebuehrCent: null, link: null, notiz: "" });
  for (const n of ["Kunde", "Finanzjahr", "Stripe-Gebühr (€)", "Stripe", "Notiz"]) assert.equal(n in p, false, n);
});

test("Stripe-Gebühr als Zeile in „Ausgaben“ (Kategorie Gebühren, kein Reverse Charge)", () => {
  const p = gebuehrProps({ betragCent: 2275, datum: "2026-11-16", wofuer: "KND-003 · ST-20261116-123456", link: "https://dashboard.stripe.com/payments/pi_1", jahrSeite: "jahr-2026" }) as Record<string, Record<string, unknown>>;
  assert.deepEqual(p["Was"], { title: [{ type: "text", text: { content: "Stripe-Gebühr · KND-003 · ST-20261116-123456" } }] });
  assert.deepEqual(p["Anbieter"], { select: { name: "Stripe" } });
  assert.deepEqual(p["Kategorie"], { select: { name: "Gebühren" } });
  assert.deepEqual(p["Betrag (€)"], { number: 22.75 });
  assert.deepEqual(p["Währung"], { select: { name: "EUR" } });
  assert.deepEqual(p["Reverse Charge"], { checkbox: false });
  assert.deepEqual(p["Finanzjahr"], { relation: [{ id: "jahr-2026" }] });
});

test("Datum aus Stripe-Zeitstempel nach deutscher Zeit", () => {
  assert.equal(datumAusUnix(Date.UTC(2026, 10, 16, 22, 30) / 1000), "2026-11-16", "23:30 Uhr in Berlin ist noch der 16.");
  assert.equal(datumAusUnix(Date.UTC(2026, 10, 16, 23, 30) / 1000), "2026-11-17");
});

test("Betrag aus der Eingabe: deutsch und einfach, in Cent", () => {
  assert.equal(leseBetrag("1.500,00"), 150000);
  assert.equal(leseBetrag("1500"), 150000);
  assert.equal(leseBetrag("1.500"), 150000);
  assert.equal(leseBetrag("12,5"), 1250);
  assert.equal(leseBetrag("750 €"), 75000);
  assert.equal(leseBetrag("0"), null);
  assert.equal(leseBetrag("abc"), null);
  assert.equal(leseBetrag("-5"), null);
});

test("Zahltag: leer = heute, TT.MM.JJJJ oder TT.MM. (dieses Jahr), nie in der Zukunft", () => {
  assert.equal(leseZahltag("", "2026-11-16"), "2026-11-16");
  assert.equal(leseZahltag("10.11.2026", "2026-11-16"), "2026-11-10");
  assert.equal(leseZahltag("3.11.", "2026-11-16"), "2026-11-03");
  assert.equal(leseZahltag("20.11.2026", "2026-11-16"), null, "Zukunft");
  assert.equal(leseZahltag("31.02.2026", "2026-11-16"), null);
});

test("Karte in #posteingang: Kunde und Notion-Seite stecken drin und kommen wieder heraus", () => {
  const k = anzahlungKarte({ nr: "KND-003", name: "Relax Fit", kanalId: "123", notionUrl: "https://www.notion.so/abc" });
  assert.match(k.title ?? "", /KND-003 · Relax Fit/);
  assert.deepEqual(leseAnzahlungKarte(k), { nr: "KND-003", name: "Relax Fit", notionUrl: "https://www.notion.so/abc", erledigt: false });
  assert.equal(leseAnzahlungKarte({ title: "Etwas anderes" }), null);
});

test("Betrag als Text", () => {
  assert.equal(betragText(150000).replace(/\s/g, " "), "1.500,00 €");
});
