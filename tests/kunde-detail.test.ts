// Tests für die Kundendetails der Helfer-Brücke (Baukasten, Plan 3A Etappe 2): `npm test`.
// Nur reine Logik, nichts liest oder schreibt Notion.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { RohBlock } from "../lib/gespraech.ts";
import { kundeAusSeite, ortAusAdresse, pruefeKundenNr } from "../lib/kunde-detail.ts";
import type { KundeKurz } from "../lib/notion-api.ts";

const absatz = (id: string, text: string): RohBlock => ({ id, type: "paragraph", paragraph: { rich_text: [{ plain_text: text }] } });

const kunde: KundeKurz = {
  nr: "KND-003",
  name: "Relax Fit",
  email: "info@relaxfit.de",
  status: "Lead",
  domain: "relax-fit.de",
  demoStatus: "angefragt",
  demoLink: null,
  notionUrl: "https://www.notion.so/Relax-Fit-abc",
};

test("pruefeKundenNr: nur KND- mit mindestens drei Ziffern", () => {
  assert.equal(pruefeKundenNr("KND-003"), true);
  assert.equal(pruefeKundenNr("KND-1234"), true);
  assert.equal(pruefeKundenNr("KND-03"), false);
  assert.equal(pruefeKundenNr("knd-003"), false);
  assert.equal(pruefeKundenNr("KND-003&x=1"), false);
  assert.equal(pruefeKundenNr(null), false);
});

test("ortAusAdresse nimmt den Ort hinter der Postleitzahl", () => {
  assert.equal(ortAusAdresse("Hauptstraße 1, 63179 Obertshausen"), "Obertshausen");
  assert.equal(ortAusAdresse("Am Markt 3, 60311 Frankfurt am Main, Deutschland"), "Frankfurt am Main");
  assert.equal(ortAusAdresse("irgendwo"), null);
  assert.equal(ortAusAdresse(null), null);
});

test("kundeAusSeite liest Branche, Ansprechpartner und Adresse aus dem Seitentext", () => {
  const k = kundeAusSeite(kunde, [
    absatz("1", "Fitnessstudio mit Kursen und Sauna."),
    absatz("2", "Branche: Fitnessstudio"),
    absatz("3", "Ansprechpartner: Marc Beispiel"),
    absatz("4", "Adresse: Hauptstraße 1, 63179 Obertshausen"),
  ]);
  assert.equal(k.nr, "KND-003");
  assert.equal(k.branche, "Fitnessstudio");
  assert.equal(k.ansprechpartner, "Marc Beispiel");
  assert.equal(k.adresse, "Hauptstraße 1, 63179 Obertshausen");
  assert.equal(k.ort, "Obertshausen");
  assert.equal(k.website, "https://relax-fit.de");
  assert.equal(k.kanal, "knd_003");
  assert.match(k.seitentext ?? "", /Sauna/);
});

test("kundeAusSeite: fehlende Angaben werden null, nicht erfunden", () => {
  const k = kundeAusSeite(kunde, [absatz("1", "Nur eine Notiz.")]);
  assert.equal(k.branche, null);
  assert.equal(k.ansprechpartner, null);
  assert.equal(k.adresse, null);
  assert.equal(k.ort, null);
});

test("kundeAusSeite: Blöcke nicht lesbar → seitentext null, Rest bleibt", () => {
  const k = kundeAusSeite(kunde, null);
  assert.equal(k.seitentext, null);
  assert.equal(k.name, "Relax Fit");
});

test("kundeAusSeite kürzt den Seitentext auf 20 000 Zeichen", () => {
  const k = kundeAusSeite(kunde, [absatz("1", "x".repeat(25_000))]);
  assert.equal(k.seitentext?.length, 20_000);
});
