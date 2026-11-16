// Antworten der Kunden auf unsere Mails landen im richtigen Kanal (Etappe 2, 16.11.2026).
import assert from "node:assert/strict";
import { test } from "node:test";
import { mailKnopf, sauberAdresse } from "../lib/mail-antwort.ts";
import { zielFuerMail, type Faden } from "../lib/mail-faeden.ts";

const faden = (ort: Faden["ort"]): Faden => ({ email: "max@firma.de", kanal: "k", ort, quelleId: "q", zeit: "2026-11-16T10:00:00Z" });

test("bekannter Kunde geht wie bisher in seinen Kanal", () => {
  assert.equal(zielFuerMail(true, faden("ticket")), "kunde");
  assert.equal(zielFuerMail(true, null), "kunde");
});

test("sonst entscheidet der Faden", () => {
  assert.equal(zielFuerMail(false, faden("ticket")), "ticket");
  assert.equal(zielFuerMail(false, faden("anfrage")), "anfrage");
  assert.equal(zielFuerMail(false, faden("kundenmail")), "kunde");
  assert.equal(zielFuerMail(false, faden("kunde")), "kunde");
});

test("ohne Faden in den Posteingang", () => {
  assert.equal(zielFuerMail(false, null), "posteingang");
});

test("Mail-Knopf trägt Ort und auf Wunsch die Karte", () => {
  assert.equal(mailKnopf("anfrage").custom_id, "mail:start:anfrage");
  assert.equal(mailKnopf("anfrage", "Antworten", "1564724866966360156").custom_id, "mail:start:anfrage:1564724866966360156");
  assert.equal(mailKnopf("kundenmail", "Antworten").label, "Antworten");
  assert.equal(mailKnopf("ticket").label, "Per E-Mail antworten");
  assert.ok(mailKnopf("kundenmail", "x", "1".repeat(20)).custom_id.length <= 100);
});

test("Adresse aus der Karte ohne unsichtbare Zeichen", () => {
  assert.equal(sauberAdresse("Max <max@​firma.de>"), "max@firma.de");
  assert.equal(sauberAdresse("max@firma.de"), "max@firma.de");
  assert.equal(sauberAdresse(" ​max@firma.de﻿ "), "max@firma.de");
});
