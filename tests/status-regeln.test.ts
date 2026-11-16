// Etappe 5: Der Status setzt sich nur aus festen Belegen und nur vorwärts. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { belege, enthaeltLink, STUFEN, statusAusBelegen, statusZeile } from "../lib/status-regeln.ts";

const b = (status: string, x: Partial<{ angebotRaus: boolean; anzahlung: boolean; bezahlt: boolean; abo: boolean }> = {}) => ({
  status,
  angebotRaus: false,
  anzahlung: false,
  bezahlt: false,
  abo: false,
  ...x,
});

test("Stufen in der richtigen Reihenfolge", () => {
  assert.deepEqual([...STUFEN], ["Lead", "Angebot gesendet", "Kunde", "Retainer läuft"]);
});

test("Angebot raus macht aus Lead „Angebot gesendet“", () => {
  assert.equal(statusAusBelegen(b("Lead", { angebotRaus: true })), "Angebot gesendet");
});

test("Zahlung macht aus „Angebot gesendet“ einen Kunden", () => {
  assert.equal(statusAusBelegen(b("Angebot gesendet", { bezahlt: true })), "Kunde");
});

test("Anzahlung (Überweisung) macht einen Kunden, auch direkt aus Lead", () => {
  assert.equal(statusAusBelegen(b("Lead", { anzahlung: true })), "Kunde");
});

test("Abo macht „Retainer läuft“", () => {
  assert.equal(statusAusBelegen(b("Kunde", { abo: true, bezahlt: true })), "Retainer läuft");
  assert.equal(statusAusBelegen(b("Lead", { abo: true })), "Retainer läuft");
});

test("Nie zurück: Kunde mit nur „Angebot raus“ bleibt Kunde", () => {
  assert.equal(statusAusBelegen(b("Kunde", { angebotRaus: true })), null);
  assert.equal(statusAusBelegen(b("Retainer läuft", { bezahlt: true })), null);
});

test("Schon auf der richtigen Stufe: nichts zu tun", () => {
  assert.equal(statusAusBelegen(b("Angebot gesendet", { angebotRaus: true })), null);
  assert.equal(statusAusBelegen(b("Lead")), null);
});

test("Verloren und unbekannter Status bleiben, wie sie sind", () => {
  assert.equal(statusAusBelegen(b("Verloren", { bezahlt: true })), null);
  assert.equal(statusAusBelegen(b("", { angebotRaus: true })), null);
  assert.equal(statusAusBelegen(b("Irgendwas", { bezahlt: true })), null);
});

test("Belege aus den Notion-Feldern: Häkchen und Zahlungsstatus", () => {
  assert.deepEqual(belege({ status: "Lead", angebotRaus: true, anzahlungHaken: false, zahlungsstatus: "Offen" }), b("Lead", { angebotRaus: true }));
  assert.equal(belege({ status: "Lead", angebotRaus: false, anzahlungHaken: true, zahlungsstatus: "" }).anzahlung, true);
  assert.equal(belege({ status: "Lead", angebotRaus: false, anzahlungHaken: false, zahlungsstatus: "Anzahlung erhalten" }).anzahlung, true);
  assert.equal(belege({ status: "Lead", angebotRaus: false, anzahlungHaken: false, zahlungsstatus: "Bezahlt" }).bezahlt, true);
  assert.equal(belege({ status: "Lead", angebotRaus: false, anzahlungHaken: false, zahlungsstatus: "Bezahlt" }).abo, false, "aus Notion kommt nie ein Abo");
});

test("Zeile im Kundenkanal nennt neuen Status und Grund", () => {
  assert.match(statusZeile("Angebot gesendet"), /^🟡 .*Angebot gesendet.*Angebot raus/);
  assert.match(statusZeile("Kunde"), /^🟢 .*Kunde/);
  assert.match(statusZeile("Retainer läuft"), /^🟢 .*Retainer läuft/);
});

test("Angebotslink in der Mail erkennen (ohne https, www und Schrägstrich am Ende)", () => {
  const link = "https://agentsgilt.com/angebot/relax-fit/";
  assert.equal(enthaeltLink("Hier dein Angebot: https://agentsgilt.com/angebot/relax-fit", link), true);
  assert.equal(enthaeltLink("Schau mal: www.agentsgilt.com/Angebot/relax-fit/ und melde dich", "agentsgilt.com/angebot/relax-fit"), true);
  assert.equal(enthaeltLink("Hier dein Angebot: https://agentsgilt.com/angebot/andere-firma", link), false);
  assert.equal(enthaeltLink("Kein Link", null), false);
  assert.equal(enthaeltLink("https://agentsgilt.com", ""), false);
  assert.equal(enthaeltLink("https://agentsgilt.com", "https://"), false, "leerer Link zählt nicht");
});
