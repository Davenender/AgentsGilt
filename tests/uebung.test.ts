// Tests für die Übungen mit dem KI-Kunden (Plan 2, Etappe 6): `npm test`. Nur reine Logik, nichts geht an Notion, Discord oder die KI.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fortschritt, kanalNamen, lektionAusNotion, leseSpeicher, personDetail, zeileFrei, zeileUebKanal, zeileUebung, type Person } from "../lib/akademie.ts";
import {
  ANTWORT_MODAL,
  GRENZE_TAG,
  apiNachrichten,
  aktuelleUebung,
  darfUeben,
  heuteGestartet,
  pruefeBewertung,
  sichtbareUebungen,
  startEmbed,
  transkript,
  uebungAusNotion,
  uebungKarte,
  uebungTeile,
  verlauf,
  zugEmbed,
  zugKnoepfe,
  type Uebung,
} from "../lib/uebung.ts";

const DAVID = "806859236768088114";
const MIJO = "1363529531939492133";

const seite = (art: string, nr: string, o: Record<string, unknown> = {}) => ({
  id: `id-${nr}`,
  properties: {
    Art: { select: { name: art } },
    Nr: { rich_text: [{ plain_text: nr }] },
    Titel: { title: [{ plain_text: `Titel ${nr}` }] },
    Einheit: { number: 6 },
    Reihenfolge: { number: 1 },
    Für: { multi_select: [{ name: "Team" }, { name: "David" }] },
    Freigegeben: { checkbox: true },
    ...o,
  },
});

const U = (nr: string, o: Partial<Uebung> = {}): Uebung => ({
  id: `id-${nr}`,
  nr,
  titel: `Titel ${nr}`,
  voraussetzung: 6,
  reihenfolge: Number(nr.slice(1)) || 0,
  fuer: ["Team", "David"],
  freigegeben: true,
  leitfaden: nr === "Ü0",
  ...o,
});

const P = (o: Partial<Person> = {}): Person => ({
  rolle: "team",
  lernpfad: "lp",
  bibliothek: "bib",
  pfadMsg: "pm",
  tocMsg: "tm",
  gelesen: new Map(),
  tests: [],
  bestanden: new Set(),
  ...o,
});

// Discord-Nachrichten wie im Kanal (älteste zuerst). Snowflakes: Zeit = (id >> 22) + 1420070400000.
const snow = (ms: number) => String((BigInt(ms - 1420070400000) << BigInt(22)) + BigInt(1));
const msg = (id: string, footer: string, description = "", title = "") => ({ id, content: "", author: { bot: true }, embeds: [{ title, description, footer: { text: footer } }] });

// ------------------------------------------------------------ Notion

test("eine Übung wird aus Notion gelesen, Ü0 ist der Leitfaden", () => {
  const u = uebungAusNotion(seite("Übung", "Ü1"));
  assert.deepEqual(u, { id: "id-Ü1", nr: "Ü1", titel: "Titel Ü1", voraussetzung: 6, reihenfolge: 1, fuer: ["Team", "David"], freigegeben: true, leitfaden: false });
  assert.equal(uebungAusNotion(seite("Übung", "Ü0"))?.leitfaden, true);
  assert.equal(uebungAusNotion(seite("Lektion", "6.1")), null);
  assert.equal(uebungAusNotion(seite("Übung", "")), null);
});

test("Übungen sind nie Lektionen (nicht im Lernpfad, nicht in der Bibliothek)", () => {
  assert.equal(lektionAusNotion(seite("Übung", "Ü1")), null);
  assert.notEqual(lektionAusNotion(seite("Lektion", "6.1")), null);
});

test("die Übungsseite wird in Aufgabe, Rolle, ersten Satz und Bewertungspunkte geteilt", () => {
  const t = "**Aufgabe**\n\nDu rufst an.\n\n**Rolle**\n\nDu bist Sabine.\nDu hast wenig Zeit.\n\n**Erster Satz**\n\nJa, Salon Sabine?\n\n**Worauf achten**\n\n- Rahmen setzen";
  assert.deepEqual(uebungTeile(t), { aufgabe: "Du rufst an.", rolle: "Du bist Sabine.\nDu hast wenig Zeit.", ersterSatz: "Ja, Salon Sabine?", achten: "- Rahmen setzen" });
  assert.deepEqual(uebungTeile("nur Text"), { aufgabe: "", rolle: "", ersterSatz: "", achten: "" });
});

test("Team sieht nur freigegebene Übungen, David alle; der Leitfaden ist nie eine Lage", () => {
  const alle = [U("Ü2"), U("Ü0"), U("Ü1", { freigegeben: false }), U("Ü3", { fuer: ["David"] })];
  assert.deepEqual(sichtbareUebungen(alle, "team").map((u) => u.nr), ["Ü2"]);
  assert.deepEqual(sichtbareUebungen(alle, "david").map((u) => u.nr), ["Ü1", "Ü2", "Ü3"]);
});

test("Üben geht erst nach dem Test der Voraussetzung, David darf immer", () => {
  assert.equal(darfUeben(U("Ü1"), P()), false);
  assert.equal(darfUeben(U("Ü1"), P({ bestanden: new Set([6]) })), true);
  assert.equal(darfUeben(U("Ü1"), P({ rolle: "david" })), true);
});

// ------------------------------------------------------------ Verlauf

test("der Verlauf einer Übung wird aus den Nachrichten seit ihrem Start gelesen", () => {
  const msgs = [
    msg("1", "🎭 Übung · start · Ü1", "alte Aufgabe", "🎭 Übung: Alt"),
    msg("2", "🎭 Übung · 1 · kunde", "alt"),
    msg("10", "🎭 Übung · start · Ü2", "Aufgabe", "🎭 Übung: Titel Ü2"),
    msg("11", "🎭 Übung · 10 · kunde", "Hallo?"),
    msg("12", "🎭 Übung · 10 · du", "Guten Tag"),
    msg("13", "🎭 Übung · 10 · kunde", "Worum geht's?"),
  ];
  const v = verlauf(msgs, "10");
  assert.deepEqual(v, {
    nr: "Ü2",
    zuege: [
      { wer: "kunde", text: "Hallo?", id: "11" },
      { wer: "du", text: "Guten Tag", id: "12" },
      { wer: "kunde", text: "Worum geht's?", id: "13" },
    ],
    beendet: false,
  });
  assert.equal(verlauf(msgs, "99"), null);
  assert.equal(verlauf([...msgs, msg("14", "🎭 Übung · 10 · ende", "fertig")], "10")?.beendet, true);
});

test("nur die neueste Übung im Kanal läuft", () => {
  const msgs = [msg("1", "🎭 Übung · start · Ü1"), msg("10", "🎭 Übung · start · Ü2"), msg("11", "🎭 Übung · 10 · kunde", "Hallo?")];
  assert.equal(aktuelleUebung(msgs), "10");
  assert.equal(aktuelleUebung([]), null);
});

test("Tagesgrenze: gezählt werden nur heute gestartete Übungen (Berliner Zeit)", () => {
  const jetzt = Date.parse("2026-11-09T20:00:00Z");
  const msgs = [
    msg(snow(Date.parse("2026-11-08T22:30:00Z")), "🎭 Übung · start · Ü1"), // 23:30 Berlin am Vortag
    msg(snow(Date.parse("2026-11-08T23:30:00Z")), "🎭 Übung · start · Ü1"), // 00:30 Berlin heute
    msg(snow(Date.parse("2026-11-09T10:00:00Z")), "🎭 Übung · start · Ü2"),
    msg(snow(Date.parse("2026-11-09T10:01:00Z")), "🎭 Übung · x · kunde"),
  ];
  assert.equal(heuteGestartet(msgs, jetzt), 2);
  assert.ok(GRENZE_TAG >= 3);
});

test("für die KI: beginnt mit dem Nutzer, wechselt sauber ab und endet mit der neuen Antwort", () => {
  const n = apiNachrichten(
    [
      { wer: "kunde", text: "Hallo?", id: "1" },
      { wer: "du", text: "Guten Tag", id: "2" },
      { wer: "kunde", text: "Ja?", id: "3" },
    ],
    "Ich bin von Agents Gilt.",
  );
  assert.equal(n[0].role, "user");
  assert.equal(n.at(-1)?.role, "user");
  assert.equal(n.at(-1)?.content, "Ich bin von Agents Gilt.");
  for (let k = 1; k < n.length; k++) assert.notEqual(n[k].role, n[k - 1].role);
  assert.deepEqual(n.map((x) => x.role), ["user", "assistant", "user", "assistant", "user"]);
});

test("das Gesprächsprotokoll nennt Verkäufer und Kunde", () => {
  assert.equal(transkript([{ wer: "kunde", text: "Hallo?", id: "1" }, { wer: "du", text: "Hi", id: "2" }], "Mijo"), "Kunde: Hallo?\nMijo: Hi");
});

// ------------------------------------------------------------ Bewertung

test("die Bewertung wird geprüft: Punkte 0–100, kurze Listen, nur echte Lektionen", () => {
  const b = pruefeBewertung({ punkte: 140.4, gut: ["a", "b", "c", "d"], besser: ["x"], tipp: " Mehr fragen. ", lektionen: ["6.2", "9.9", "6.4"] }, ["6.2", "6.4"]);
  assert.deepEqual(b, { punkte: 100, gut: ["a", "b", "c"], besser: ["x"], tipp: "Mehr fragen.", lektionen: ["6.2", "6.4"] });
  assert.equal(pruefeBewertung({ punkte: "viel" }, []), null);
  assert.equal(pruefeBewertung(null, []), null);
  assert.equal(pruefeBewertung({ punkte: 50, gut: [], besser: [], tipp: "" }, [])?.punkte, 50);
});

// ------------------------------------------------------------ Discord

test("Züge, Knöpfe und Antwort-Fenster tragen die Start-Nachricht", () => {
  const e = zugEmbed("du", "Hallo", "Jakob", "10");
  assert.equal(e.footer?.text, "🎭 Übung · 10 · du");
  assert.match(e.author?.name ?? "", /Jakob/);
  assert.equal(zugEmbed("kunde", "Ja?", "Jakob", "10").footer?.text, "🎭 Übung · 10 · kunde");
  const ids = zugKnoepfe("10")[0].components.map((c) => c.custom_id);
  assert.deepEqual(ids, ["ak:ua:10", "ak:uf:10", "ak:ux:10"]);
  assert.equal(ANTWORT_MODAL("10").data.custom_id, "ak:um:10");
  assert.equal(startEmbed(U("Ü1"), "Du rufst an.", "Jakob").footer?.text, "🎭 Übung · start · Ü1");
});

test("die Übungskarte zeigt gesperrte und freie Lagen und den Start-Knopf", () => {
  const k = uebungKarte("Mijo", [U("Ü1"), U("Ü2", { voraussetzung: 9 })], P({ bestanden: new Set([6]) }));
  const d = k.embeds[0].description ?? "";
  assert.match(d, /🎭 \*\*Ü1/);
  assert.match(d, /🔒 Ü2.*Einheit 9/);
  assert.equal(k.components[0].components[0].custom_id, "ak:us");
  assert.ok(d.length <= 4096);
});

// ------------------------------------------------------------ Merkzettel und Fortschritt

test("Merkzettel: Übungskanal und Ergebnisse werden gelesen", () => {
  const p = leseSpeicher(
    [
      { id: "3", content: zeileUebung(MIJO, "Ü2", "Einwand: zu teuer", 72, "2026-11-09T10:00:00.000Z") },
      { id: "2", content: zeileUebKanal(MIJO, "kanal-u", "karte-u") },
      { id: "1", content: zeileFrei(MIJO, "team", "lp", "bib", "pm", "tm") },
    ].map((x) => x),
  ).get(MIJO);
  assert.deepEqual(p?.uebKanal, { kanal: "kanal-u", karte: "karte-u" });
  assert.deepEqual(p?.uebungen, [{ nr: "Ü2", titel: "Einwand: zu teuer", punkte: 72, zeit: "2026-11-09T10:00:00.000Z" }]);
});

test("Fortschritt und Details nennen die letzte Übung", () => {
  const p = P({ uebungen: [{ nr: "Ü2", titel: "Einwand: zu teuer", punkte: 72, zeit: "2026-11-09T10:00:00.000Z" }] });
  const f = fortschritt("Mijo", p, []);
  assert.match(f.zuletzt?.was ?? "", /Übung Ü2 Einwand: zu teuer: 72 von 100/);
  assert.deepEqual(f.uebungen, p.uebungen);
  assert.match(personDetail(f, p, []).description ?? "", /🎭 Übungen/);
});

test("der Übungskanal heißt wie die anderen Kanäle der Person", () => {
  assert.equal(kanalNamen("Mijo").uebungen, "🎭uebungen-mijo");
  assert.equal(DAVID.length > 0, true);
});
