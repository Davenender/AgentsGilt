// Tests für die Zahlungsmeldung von Stripe: `npm test`.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { betragText, kundenNr, meldungAus, meldungsKarte, signaturGueltig, verarbeite, type Dienste } from "../lib/stripe-meldung.ts";

const GEHEIM = "whsec_nurfuerdentest";
const JETZT = 1_800_000_000_000;
const signiert = (roh: string, t = JETZT / 1000, geheim = GEHEIM) =>
  `t=${t},v1=${createHmac("sha256", geheim).update(`${t}.${roh}`).digest("hex")},v0=egal`;

test("Signatur: echt wird angenommen, alles andere nicht", () => {
  const roh = '{"id":"evt_1"}';
  assert.equal(signaturGueltig(roh, signiert(roh), GEHEIM, JETZT), true);
  assert.equal(signaturGueltig(roh + " ", signiert(roh), GEHEIM, JETZT), false, "veränderter Inhalt");
  assert.equal(signaturGueltig(roh, signiert(roh, JETZT / 1000, "whsec_falsch"), GEHEIM, JETZT), false, "falsches Geheimnis");
  assert.equal(signaturGueltig(roh, signiert(roh, JETZT / 1000 - 301), GEHEIM, JETZT), false, "zu alt");
  assert.equal(signaturGueltig(roh, null, GEHEIM, JETZT), false, "kein Kopf");
  assert.equal(signaturGueltig(roh, "unsinn", GEHEIM, JETZT), false, "kaputter Kopf");
  assert.equal(signaturGueltig(roh, `t=${JETZT / 1000},v0=abc`, GEHEIM, JETZT), false, "nur v0 zählt nicht");
});

test("Kundennummer aus den Metadaten", () => {
  assert.equal(kundenNr("3"), "KND-003");
  assert.equal(kundenNr("KND-003"), "KND-003");
  assert.equal(kundenNr("knd_12"), "KND-012");
  assert.equal(kundenNr(""), null);
  assert.equal(kundenNr(undefined), null);
  assert.equal(kundenNr("Relax Fit"), null);
});

const rechnung = (o: Record<string, unknown>, type = "invoice.paid") => ({
  id: "evt_r",
  type,
  livemode: true,
  data: { object: { id: "in_1", amount_paid: 15000, amount_due: 15000, currency: "eur", customer_email: "Info@Relax-Fit.de", customer_name: "Relax Fit", billing_reason: "subscription_create", ...o } },
});

test("Erste Zahlung: bezahlt, mit Hinweis ans Team", () => {
  const m = meldungAus(rechnung({ parent: { subscription_details: { metadata: { kunde: "3" } } } }));
  assert.equal(m?.art, "bezahlt");
  assert.equal(m?.betrag, 15000);
  assert.equal(m?.email, "info@relax-fit.de");
  assert.equal(m?.kundeNr, "KND-003");
  assert.equal(m?.zahlungsstatus, "Bezahlt");
  assert.equal(m?.hinweis, true);
  assert.equal(m?.mail, false);
});

test("Monatszahlung: bezahlt, aber still; Metadaten auch aus dem alten Feld", () => {
  const m = meldungAus(rechnung({ billing_reason: "subscription_cycle", amount_paid: 3000, subscription_details: { metadata: { kunde: "KND-003" } } }));
  assert.equal(m?.betrag, 3000);
  assert.equal(m?.kundeNr, "KND-003");
  assert.equal(m?.hinweis, false);
});

test("Rechnung über 0 € wird nicht gemeldet", () => {
  assert.equal(meldungAus(rechnung({ amount_paid: 0 })), null);
});

test("Fehlgeschlagen: nur beim ersten und beim letzten Versuch, sonst käme bis zu 9-mal eine Meldung", () => {
  const f = (o: Record<string, unknown>) => meldungAus(rechnung({ billing_reason: "subscription_cycle", ...o }, "invoice.payment_failed"));
  const erst = f({ attempt_count: 1, next_payment_attempt: 1800100000 });
  assert.equal(erst?.art, "fehlgeschlagen");
  assert.equal(erst?.zahlungsstatus, "Offen");
  assert.equal(erst?.hinweis, true);
  assert.equal(erst?.mail, true);
  assert.equal(erst?.letzterVersuch, false);
  assert.equal(f({ attempt_count: 3, next_payment_attempt: 1800200000 }), null);
  const letzt = f({ attempt_count: 9, next_payment_attempt: null });
  assert.equal(letzt?.letzterVersuch, true);
  assert.equal(letzt?.mail, true);
});

test("Bezahlseite: nur Einmalzahlungen, beim Abo meldet die Rechnung (sonst doppelt)", () => {
  const s = (o: Record<string, unknown>) => ({ id: "evt_s", type: "checkout.session.completed", livemode: true, data: { object: { id: "cs_1", mode: "payment", payment_status: "paid", amount_total: 50000, currency: "eur", payment_intent: "pi_1", customer_details: { email: "A@B.de", name: "Anna", business_name: "Firma GmbH" }, metadata: { kunde: "7" }, ...o } } });
  const m = meldungAus(s({}));
  assert.equal(m?.art, "bezahlt");
  assert.equal(m?.firma, "Firma GmbH");
  assert.equal(m?.email, "a@b.de");
  assert.equal(m?.kundeNr, "KND-007");
  assert.equal(meldungAus(s({ mode: "subscription" })), null);
  assert.equal(meldungAus(s({ payment_status: "unpaid" })), null);
});

test("Abo beendet: Meldung und Mail, der Zahlungsstatus bleibt", () => {
  const m = meldungAus({ id: "evt_a", type: "customer.subscription.deleted", livemode: true, data: { object: { id: "sub_1", metadata: { kunde: "3" } } } });
  assert.equal(m?.art, "abo_beendet");
  assert.equal(m?.zahlungsstatus, null);
  assert.equal(m?.mail, true);
  assert.equal(m?.link, "https://dashboard.stripe.com/subscriptions/sub_1");
});

test("Unbekannte Ereignisse, Testmodus und Unsinn werden nicht gemeldet", () => {
  assert.equal(meldungAus({ id: "evt_x", type: "customer.created", livemode: true, data: { object: {} } }), null);
  assert.equal(meldungAus({ ...rechnung({}), livemode: false }), null);
  assert.equal(meldungAus(null), null);
  assert.equal(meldungAus("kaputt"), null);
  assert.equal(meldungAus({ type: "invoice.paid" }), null);
});

test("Betrag in Euro, Karte nennt Kunde, Betrag und die Ereignis-Nummer", () => {
  assert.equal(betragText(15000, "eur"), "150,00 €");
  assert.equal(betragText(3050, "eur"), "30,50 €");
  assert.equal(betragText(null, "eur"), "unbekannt");
  const m = meldungAus(rechnung({ hosted_invoice_url: "https://invoice.stripe.com/i/x" }));
  assert.ok(m);
  const k = meldungsKarte(m, "Relax Fit");
  assert.match(k.title ?? "", /^💶 .*Relax Fit/);
  assert.match(k.title ?? "", /150,00 €/);
  assert.match(k.footer?.text ?? "", /evt_r/);
  const ohne = meldungsKarte(m, null);
  assert.ok(ohne.fields?.some((f) => /zuordnen/i.test(f.value)), "ohne Kunde steht da, dass es noch zugeordnet werden muss");
});

test("Fremder Text löst in Discord keine Erwähnung aus", () => {
  const m = meldungAus(rechnung({ customer_name: "<@123> @everyone", customer_email: "x@y.de" }));
  assert.ok(m);
  const text = JSON.stringify(meldungsKarte(m, null));
  assert.doesNotMatch(text, /<@123>/);
  assert.doesNotMatch(text, /(?<!​)@everyone/);
});

// ---- Ablauf mit Attrappen statt Notion, Discord und Mail

const KUNDEN = [{ nr: "KND-003", name: "Relax Fit", email: "Info@Relax-Fit.de", notionUrl: "https://notion.so/abc" }];
function attrappen(aenderung: Partial<Dienste> = {}) {
  const log = { status: [] as string[], karten: [] as { kanal: string; title: string; hinweis: boolean }[], mails: [] as string[] };
  const d: Dienste = {
    kunden: async () => KUNDEN,
    setzeStatus: async (url, s) => { log.status.push(`${url}:${s}`); return true; },
    kundenKanal: async (nr) => (nr === "KND-003" ? "kanal-003" : null),
    posteingang: async () => "kanal-post",
    schonGemeldet: async () => false,
    poste: async (kanal, karte, hinweis) => { log.karten.push({ kanal, title: karte.title, hinweis }); return true; },
    schickeMail: async (betreff) => { log.mails.push(betreff); return true; },
    ...aenderung,
  };
  return { d, log };
}
const bezahlt = (o: Record<string, unknown> = {}) => meldungAus(rechnung(o))!;
const gescheitert = () => meldungAus(rechnung({ billing_reason: "subscription_cycle", attempt_count: 1, next_payment_attempt: 1800100000 }, "invoice.payment_failed"))!;

test("Kunde über die E-Mail gefunden: Notion, Kundenkanal, keine Mail", async () => {
  const { d, log } = attrappen();
  assert.equal(await verarbeite(bezahlt(), d), true);
  assert.deepEqual(log.status, ["https://notion.so/abc:Bezahlt"]);
  assert.equal(log.karten[0].kanal, "kanal-003");
  assert.match(log.karten[0].title, /Relax Fit/);
  assert.deepEqual(log.mails, []);
});

test("Kundennummer aus dem Link geht vor der E-Mail", async () => {
  const { d, log } = attrappen();
  await verarbeite(bezahlt({ customer_email: "buchhaltung@anders.de", parent: { subscription_details: { metadata: { kunde: "3" } } } }), d);
  assert.equal(log.karten[0].kanal, "kanal-003");
  assert.equal(log.status.length, 1);
});

test("Kein Kunde gefunden: Karte im privaten Posteingang, Notion bleibt unberührt", async () => {
  const { d, log } = attrappen();
  assert.equal(await verarbeite(bezahlt({ customer_email: "fremd@x.de" }), d), true);
  assert.equal(log.karten[0].kanal, "kanal-post");
  assert.deepEqual(log.status, []);
});

test("Kundenkanal fehlt: lieber im Posteingang als verloren", async () => {
  const { d, log } = attrappen({ kundenKanal: async () => null });
  assert.equal(await verarbeite(bezahlt(), d), true);
  assert.equal(log.karten[0].kanal, "kanal-post");
});

test("Fehlschlag: Hinweis ans Team und Mail, Status Offen", async () => {
  const { d, log } = attrappen();
  assert.equal(await verarbeite(gescheitert(), d), true);
  assert.deepEqual(log.status, ["https://notion.so/abc:Offen"]);
  assert.equal(log.karten[0].hinweis, true);
  assert.equal(log.mails.length, 1);
  assert.match(log.mails[0], /fehlgeschlagen/i);
});

test("Doppelt zugestellt: keine zweite Karte, keine zweite Mail", async () => {
  const { d, log } = attrappen({ schonGemeldet: async () => true });
  assert.equal(await verarbeite(gescheitert(), d), true);
  assert.deepEqual(log.karten, []);
  assert.deepEqual(log.mails, []);
});

test("Notion oder Mail streiken: die Karte kommt trotzdem, und sie sagt es", async () => {
  const { d, log } = attrappen({ setzeStatus: async () => false, schickeMail: async () => false });
  let karte: { fields: { value: string }[] } | null = null;
  d.poste = async (_k, k) => { karte = k; return true; };
  assert.equal(await verarbeite(gescheitert(), d), true);
  assert.deepEqual(log.karten, []);
  assert.match(JSON.stringify(karte), /Notion/);
});

test("Karte geht nirgends raus: Stripe soll es noch einmal schicken", async () => {
  const { d } = attrappen({ poste: async () => false });
  assert.equal(await verarbeite(bezahlt(), d), false);
});

test("Notion nicht erreichbar: Stripe soll es später noch einmal schicken, statt falsch zuzuordnen", async () => {
  const { d, log } = attrappen({ kunden: async () => null });
  assert.equal(await verarbeite(bezahlt(), d), false);
  assert.deepEqual(log.karten, []);
});
