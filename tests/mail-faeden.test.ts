// Wohin gehört die Antwort eines Kunden auf unsere Mail? (Etappe 2, 16.11.2026)
import assert from "node:assert/strict";
import { test } from "node:test";
import { FADEN_TAGE, fadenZeile, leseFaeden, waehleFaden, type Faden } from "../lib/mail-faeden.ts";
import { resendNutzlast } from "../lib/mail.ts";

const TAG = 24 * 60 * 60 * 1000;
const jetzt = Date.parse("2026-11-16T10:00:00Z");
const f = (email: string, tageAlt: number, kanal = "k1"): Faden => ({ email, kanal, ort: "ticket", quelleId: "q", zeit: new Date(jetzt - tageAlt * TAG).toISOString() });

test("Adresse wird ohne Rücksicht auf Groß- und Kleinschreibung gefunden", () => {
  assert.equal(waehleFaden([f("Max@Firma.de", 1)], " max@firma.DE", jetzt)?.kanal, "k1");
});

test("nach 30 Tagen gilt der Faden nicht mehr", () => {
  assert.equal(FADEN_TAGE, 30);
  assert.equal(waehleFaden([f("max@firma.de", 29)], "max@firma.de", jetzt)?.kanal, "k1");
  assert.equal(waehleFaden([f("max@firma.de", 31)], "max@firma.de", jetzt), null);
});

test("bei mehreren Fäden gilt der neueste", () => {
  assert.equal(waehleFaden([f("max@firma.de", 5, "alt"), f("max@firma.de", 1, "neu")], "max@firma.de", jetzt)?.kanal, "neu");
});

test("Zeile und Lesen passen zusammen, Fremdes wird übersprungen", () => {
  const zeilen = [fadenZeile(f("max@firma.de", 1)), "irgendwas", "{kaputt", JSON.stringify({ email: "x" })];
  const liste = leseFaeden(zeilen);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].email, "max@firma.de");
});

test("Resend bekommt Bcc und Antwortadresse", () => {
  const n = resendNutzlast({ to: "max@firma.de", subject: "Hallo", html: "<p>x</p>", text: "x", replyTo: "kontakt@agentsgilt.com", bcc: "kontakt@agentsgilt.com" }, "Agents Gilt <kontakt@agentsgilt.com>");
  assert.equal(n.bcc, "kontakt@agentsgilt.com");
  assert.equal(n.replyTo, "kontakt@agentsgilt.com");
  assert.equal(n.from, "Agents Gilt <kontakt@agentsgilt.com>");
  assert.equal("bcc" in resendNutzlast({ to: "a@b.de", subject: "s", html: "h" }, "x"), false);
});
