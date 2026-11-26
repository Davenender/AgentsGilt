// Davids Wunsch 26.11.2026: Oskar hat die Übung 5–6 Mal gemacht und das Tageslimit erreicht. Jetzt: kein Limit mehr,
// großzügigere Bewertung und /team bestanden – David zählt eine Übung als bestanden, egal wie viele Punkte.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BEWERTUNG_PROMPT, bestandenEmbed, uebungKarte, verlauf } from "../lib/uebung.ts";
import { befehlAus, bestandenAntwort } from "../lib/team.ts";
import { aufnahmeStand } from "../lib/akademie.ts";

const mensch = (id: string, text: string) => ({ id, content: text, author: { bot: false }, embeds: [] });
const bot = (id: string, footer: string, description = "") => ({ id, content: "", author: { bot: true }, embeds: [{ title: "", description, footer: { text: footer } }] });

test("kein Tageslimit mehr – die Karte sagt: so oft du willst", () => {
  const karte = uebungKarte("Oskar", [], { rolle: "team", bestanden: new Set() } as never);
  assert.doesNotMatch(karte.embeds[0]!.description!, /Am Tag/);
  assert.match(karte.embeds[0]!.description!, /so oft du willst/);
});

test("die Bewertung ist großzügig: im Zweifel mehr Punkte, Grundschritte = mindestens 75", () => {
  assert.match(BEWERTUNG_PROMPT, /großzügig/);
  assert.match(BEWERTUNG_PROMPT, /Im Zweifel gib die höhere Punktzahl/);
  assert.match(BEWERTUNG_PROMPT, /mindestens 75/);
});

test("/team bestanden: die Karte beendet die laufende Übung und zählt 100 Punkte", () => {
  const e = bestandenEmbed("10", "Erstgespräch");
  assert.equal(e.footer?.text, "🎭 Übung · 10 · ende");
  assert.match(e.description ?? "", /100 von 100/);
  const msgs = [bot("10", "🎭 Übung · start · 1.2"), bot("11", "🎭 Übung · 10 · kunde", "Ja?"), mensch("12", "Hallo"), { ...bot("13", e.footer!.text!), embeds: [{ title: e.title, description: e.description, footer: e.footer }] }, mensch("14", "noch was")];
  const v = verlauf(msgs as never, "10")!;
  assert.equal(v.beendet, true);
  assert.equal(v.offen, false); // danach antwortet der KI-Kunde nicht mehr
  assert.equal(bestandenEmbed(null, "x").footer, undefined);
});

test("/team bestanden wird erkannt, die Antwort sagt den Stand – oder dass die Person jetzt im Team ist", () => {
  assert.deepEqual(befehlAus({ name: "team", options: [{ name: "bestanden", options: [{ name: "person", value: "42" }] }] })?.aktion, "bestanden");
  const stand = aufnahmeStand([{ art: "test", einheit: 1 } as never], new Set([1]), [{ punkte: 100 }]);
  const t = bestandenAntwort("Oskar", { titel: "Erstgespräch", lief: true, team: false, stand });
  assert.match(t, /zählt als bestanden/);
  assert.match(t, /1 von 1 Tests · 1 von 3 Übungen/);
  assert.match(t, /Es fehlen noch 2 Übungen/);
  assert.match(bestandenAntwort("Oskar", { titel: "Erstgespräch", lief: false, team: true, stand }), /jetzt im Team/);
});
