// Davids Wunsch 26.11.2026: Die Übungs-Kunden waren zu schwer (Oskars Erstgespräch mit „Sabine“: jede Zahl zerpflückt,
// jeder Vorschlag abgeblockt). Jetzt fair statt streng – und dreht sich die Person im Kreis, schreibt der Bot einen kleinen
// Tipp mit der Lektion, die jetzt hilft („Schau nochmal in 8.5“). Den Tipp sieht nur die Person, nie der KI-Kunde.
import assert from "node:assert/strict";
import { test } from "node:test";
import { KUNDEN_PROMPT, BEWERTUNG_PROMPT, TIPP_PROMPT, pruefeTipp, tippEmbed, tippFaellig, uebungKarte, verlauf } from "../lib/uebung.ts";

const mensch = (id: string, text: string) => ({ id, content: text, author: { bot: false }, embeds: [] });
const bot = (id: string, footer: string, description = "") => ({ id, content: "", author: { bot: true }, embeds: [{ title: "", description, footer: { text: footer } }] });
const start = bot("10", "🎭 Übung · start · Ü1", "Aufgabe");
const kunde = (id: string) => bot(id, "🎭 Übung · 10 · kunde", "Ja?");

test("der KI-Kunde ist fair statt streng – ruhig mehrere Einwände, aber überzeugbar; kein Zerpflücken jeder Zahl", () => {
  assert.doesNotMatch(KUNDEN_PROMPT, /jedes Ja wirklich verdienen/);
  assert.match(KUNDEN_PROMPT, /fair/);
  assert.match(KUNDEN_PROMPT, /immer nur einen auf einmal/);
  assert.match(KUNDEN_PROMPT, /überzeugbar/);
  assert.match(KUNDEN_PROMPT, /nicht jede Zahl/i);
  assert.match(KUNDEN_PROMPT, /vorstell/i);
  assert.match(KUNDEN_PROMPT, /Nein/);
  assert.match(KUNDEN_PROMPT, /\{ROLLE\}/);
  assert.doesNotMatch(BEWERTUNG_PROMPT, /Sei streng/);
  const karte = uebungKarte("Oskar", [], { rolle: "team", bestanden: new Set() } as never);
  assert.doesNotMatch(karte.embeds[0]!.description!, /streng/);
  assert.match(karte.embeds[0]!.description!, /Tipp/);
});

test("Tipp frühestens ab der 3. eigenen Antwort, danach höchstens alle 3 Antworten", () => {
  const zwei = [start, kunde("11"), mensch("12", "a"), kunde("13"), mensch("14", "b"), kunde("15")];
  assert.equal(tippFaellig(zwei, "10"), false);
  const drei = [...zwei, mensch("16", "c"), kunde("17")];
  assert.equal(tippFaellig(drei, "10"), true);
  const mitTipp = [...drei, tippEmbedNachricht("18")];
  assert.equal(tippFaellig(mitTipp, "10"), false);
  const danach = [...mitTipp, mensch("19", "d"), kunde("20"), mensch("21", "e"), kunde("22")];
  assert.equal(tippFaellig(danach, "10"), false);
  assert.equal(tippFaellig([...danach, mensch("23", "f"), kunde("24")], "10"), true);
  // Antworten über /a oder das Fenster kommen als Karte „du“ und zählen genauso
  const perKarte = [start, kunde("11"), bot("12", "🎭 Übung · 10 · du", "a"), kunde("13"), bot("14", "🎭 Übung · 10 · du", "b"), kunde("15"), mensch("16", "c")];
  assert.equal(tippFaellig(perKarte, "10"), true);
});

test("Tipp-Antwort der KI streng lesen: nur feststeckend und nur eine Lektion aus dem Lernpfad", () => {
  const erlaubt = ["8.4", "8.5"];
  assert.deepEqual(pruefeTipp({ fest: true, lektion: "8.5", tipp: "Geh erst auf ihre Sorge ein, bevor du rechnest." }, erlaubt), { lektion: "8.5", tipp: "Geh erst auf ihre Sorge ein, bevor du rechnest." });
  assert.equal(pruefeTipp({ fest: false, lektion: "8.5", tipp: "x" }, erlaubt), null);
  assert.equal(pruefeTipp({ fest: true, lektion: "9.9", tipp: "x" }, erlaubt), null);
  assert.equal(pruefeTipp(null, erlaubt), null);
  assert.match(TIPP_PROMPT, /im Kreis/);
  assert.match(TIPP_PROMPT, /\{LEKTIONEN\}/);
});

test("die Tipp-Karte: nur für die Person, mit Lektion – der KI-Kunde und die Bewertung sehen sie nicht", () => {
  const e = tippEmbed("10", { nr: "8.5", titel: "Einwände zum Preis" }, "Geh erst auf ihre Sorge ein.");
  assert.equal(e.footer?.text, "🎭 Übung · 10 · tipp");
  assert.match(e.description ?? "", /nur für dich/);
  assert.match(e.description ?? "", /8\.5/);
  assert.match(e.description ?? "", /Einwände zum Preis/);
  const msgs = [start, kunde("11"), mensch("12", "a"), kunde("13"), tippEmbedNachricht("14"), mensch("15", "b")];
  const v = verlauf(msgs as never, "10")!;
  assert.deepEqual(v.zuege.map((z) => z.wer), ["kunde", "du", "kunde", "du"]);
  assert.equal(v.offen, true); // nach dem Tipp wartet die neue Antwort weiter auf den Kunden
});

function tippEmbedNachricht(id: string) {
  const e = tippEmbed("10", { nr: "8.4", titel: "Bedarf erfragen" }, "Frag nach.");
  return { id, content: "", author: { bot: true }, embeds: [{ title: "", description: e.description, footer: e.footer }] };
}
