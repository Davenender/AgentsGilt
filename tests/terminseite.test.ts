// Terminseite aus der SMS im neuen Design (Feinschliff-Runde 1, Davids Wahl 5 A, 16.11.2026):
// gleiche Texte, gleiche Zustände, gleiches Senden; nur das Aussehen ist neu.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");

test("die Terminseite steht in der neuen Welt: Glaskarte, Stern, Entschlüsseln, Schriften", () => {
  const seite = lies("app/termin/[code]/page.tsx");
  assert.match(seite, /<Welt>/);
  assert.match(seite, /<TerminKarte>/);
  assert.match(seite, /<Leuchtstern \/>/);
  assert.match(seite, /<Entschluesselt als="h1" className="ag-versal ag-ts__titel">/);
  assert.match(seite, /import "@\/components\/neu\/termin\/termin\.css";/);
  // Kein altes Aussehen mehr (Tailwind-Klassen der alten Seite).
  assert.ok(!/text-ink|bg-cream|gold-dark|rounded-3xl/.test(seite));
  assert.ok(!/text-ink|bg-cream|rounded-full px-6/.test(lies("components/TerminAntwort.tsx")));
  // Nicht für Suchmaschinen, Titel wie bisher.
  assert.match(seite, /title: "Ihr Terminvorschlag – Agents Gilt",\s*robots: \{ index: false, follow: false \}/);
  // Alte Links führen weiter auf die Seite.
  assert.match(lies("app/t/[code]/page.tsx"), /redirect\(`\/termin\/\$\{encodeURIComponent\(code\)\}`\)/);
  // Die Auswahlseite der Entwürfe gibt es nicht mehr.
  assert.ok(!existsSync(new URL("../app/auswahl", import.meta.url)));
});

test("alle Texte der Seite sind geblieben", () => {
  const seite = lies("app/termin/[code]/page.tsx");
  for (const text of [
    "Terminvorschlag",
    "Agents Gilt",
    "KI-Lösungen für lokale Unternehmen",
    "Guten Tag, ${name}",
    '"Guten Tag"',
    "Dazu haben wir einen Terminvorschlag für Sie:",
    "Unser Vorschlag",
    "Erstgespräch mit Agents Gilt",
    "Dieser Link ist leider ungültig oder abgelaufen. Rufen Sie uns gern an:",
    "Ihr Termin ist bestätigt. Vielen Dank, wir freuen uns auf das Gespräch.",
    "Vielen Dank, wir haben Ihren Wunsch erhalten und melden uns per SMS oder Rückruf.",
    "Dieser Vorschlag ist nicht mehr aktuell. Rufen Sie uns gern an:",
    "Persönlicher Link, nur für Sie.",
    "Keine Anmeldung, keine Zahlungsdaten.",
    "Fragen?",
    "der Website von Agents Gilt.",
    "Impressum",
    "Datenschutz",
  ]) {
    assert.ok(seite.includes(text), text);
  }
  const antwort = lies("components/TerminAntwort.tsx");
  for (const text of [
    "Passt",
    "Anderer Termin",
    "Wann passt es Ihnen?",
    "Datum",
    "Uhrzeit",
    "Wunsch senden",
    "Zurück",
    "Vielen Dank! Ihr Termin am ${t} ist bestätigt. Wir freuen uns auf das Gespräch.",
    "Vielen Dank! Wir haben Ihren Wunsch (${t}) notiert und melden uns per SMS oder Rückruf.",
    "Das hat leider nicht geklappt. Bitte rufen Sie uns an.",
    "Keine Verbindung. Bitte versuchen Sie es nochmal oder rufen Sie uns an.",
  ]) {
    assert.ok(antwort.includes(text), text);
  }
});

test("gesendet wird wie bisher: POST /api/termin mit accept bzw. wish, Datum und Uhrzeit", () => {
  const antwort = lies("components/TerminAntwort.tsx");
  assert.match(antwort, /fetch\("\/api\/termin", \{\s*method: "POST",/);
  assert.match(antwort, /body: JSON\.stringify\(\{ code, \.\.\.payload \}\)/);
  assert.match(antwort, /\{ action: "accept" \}/);
  assert.match(antwort, /\{ action: "wish", datum, uhrzeit \}/);
  assert.match(antwort, /type="date" required min=\{fruehestens\}/);
  assert.match(antwort, /type="time" required step=\{300\}/);
});
