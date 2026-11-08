// Tests für die Akademie (Plan 2, Etappen 1 und 2): `npm test`. Nur reine Logik, nichts geht an Notion oder Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auswertung,
  bibliothekKarte,
  ergebnisAnsicht,
  fortschritt,
  fortschrittBalken,
  frageAnsicht,
  frageAusNotion,
  gelesenAnsicht,
  kanalNamen,
  lektionAusNotion,
  lektionsAnsicht,
  lektionText,
  leseSpeicher,
  pfadKarte,
  pfadLektionen,
  personDetail,
  privatRechte,
  rolleVon,
  schritte,
  seiten,
  standSchritte,
  sucheTreffer,
  verwaltungKarte,
  zeileFrei,
  zeileGelesen,
  zeileTest,
  type Lektion,
  type Testfrage,
} from "../lib/akademie.ts";
import type { RohBlock } from "../lib/gespraech.ts";

const DAVID = "806859236768088114";
const MIJO = "1363529531939492133";
const L = (nr: string, reihenfolge: number, o: Partial<Lektion> = {}): Lektion => ({
  id: `id-${nr}`,
  nr,
  titel: `Lektion ${nr}`,
  einheit: Number(nr.split(".")[0]),
  einheitName: `${nr.split(".")[0]} · Einheit`,
  reihenfolge,
  fuer: ["Team", "David"],
  minuten: 3,
  freigegeben: true,
  ...o,
});
const F = (nr: string, einheit: number, richtig: "A" | "B" | "C" | "D", zu: string, o: Partial<Testfrage> = {}): Testfrage => ({
  id: `f-${nr}`,
  nr,
  einheit,
  frage: `Frage ${nr}?`,
  antworten: ["a", "b", "c", "d"],
  richtig,
  zuLektion: zu,
  erklaerung: `Weil ${richtig}.`,
  fuer: ["Team", "David"],
  freigegeben: true,
  reihenfolge: 100,
  ...o,
});
const alle = [L("1.2", 2), L("1.1", 1), L("1.3", 3, { freigegeben: false }), L("9.1", 50, { fuer: ["David"], freigegeben: false }), L("2.1", 5)];
const fragen = [F("T1.1", 1, "B", "1.1"), F("T1.2", 1, "C", "1.2"), F("T2.1", 2, "A", "2.1", { freigegeben: false })];

test("Lernpfad: Team sieht nur Freigegebenes, David alles inklusive eigener Lektionen", () => {
  assert.equal(rolleVon(DAVID), "david");
  assert.equal(rolleVon(MIJO), "team");
  assert.deepEqual(pfadLektionen(alle, "team").map((l) => l.nr), ["1.1", "1.2", "2.1"]);
  assert.deepEqual(pfadLektionen(alle, "david").map((l) => l.nr), ["1.1", "1.2", "1.3", "2.1", "9.1"]);
});

test("Schritte: nach der letzten Lektion einer Einheit kommt ihr Test", () => {
  const team = schritte(pfadLektionen(alle, "team"), fragen, "team");
  assert.deepEqual(team.map((s) => (s.art === "test" ? `Test ${s.einheit}` : s.lektion.nr)), ["1.1", "1.2", "Test 1", "2.1"]);
  const david = schritte(pfadLektionen(alle, "david"), fragen, "david");
  assert.deepEqual(david.map((s) => (s.art === "test" ? `Test ${s.einheit}` : s.lektion.nr)), ["1.1", "1.2", "1.3", "Test 1", "2.1", "Test 2", "9.1"]);
});

test("Stand: Test sperrt die nächste Einheit, bis er bestanden ist", () => {
  const sch = schritte(pfadLektionen(alle, "team"), fragen, "team");
  const a = standSchritte(sch, new Set(["id-1.1", "id-1.2"]), new Set());
  assert.equal(a.aktuelle?.art, "test");
  assert.equal(a.status["id-2.1"], "gesperrt");
  const b = standSchritte(sch, new Set(["id-1.1", "id-1.2"]), new Set([1]));
  assert.equal(b.aktuelle?.art === "lektion" && b.aktuelle.lektion.nr, "2.1");
  assert.equal(b.status["test:1"], "fertig");
  assert.equal(b.fertig, 3);
  assert.equal(b.gesamt, 4);
  assert.equal(fortschrittBalken(3, 10), "▰▰▰▱▱▱▱▱▱▱ 3 von 10");
  assert.equal(fortschrittBalken(0, 0), "▱▱▱▱▱▱▱▱▱▱ 0 von 0");
});

test("Pfad-Karte mit Einheiten, Test und Knopf zum Weiterlernen", () => {
  const sch = schritte(pfadLektionen(alle, "david"), fragen, "david");
  const k = pfadKarte("David", sch, new Set(["id-1.1"]), new Set());
  assert.equal(k.embeds[0].title, "📖 Lernpfad von David");
  const text = k.embeds[0].description ?? "";
  assert.match(text, /✅ 1\.1 Lektion 1\.1/);
  assert.match(text, /📖 \*\*1\.2 Lektion 1\.2\*\* ← jetzt dran/);
  assert.match(text, /🔒 📝 Test Einheit 1/);
  assert.match(text, /\*\*1 · Einheit\*\*/);
  assert.match(text, /📝/, "Entwürfe sind für David markiert");
  assert.equal(k.components[0].components[0].custom_id, "ak:weiter");
});

test("Seiten: an der Trennlinie und bei zu langem Text", () => {
  assert.deepEqual(seiten("A\n\n---\n\nB"), ["A", "B"]);
  const lang = Array.from({ length: 30 }, (_, i) => `Absatz ${i} ${"x".repeat(200)}`).join("\n\n");
  const s = seiten(lang, 1000);
  assert.ok(s.length > 5);
  assert.ok(s.every((p) => p.length <= 1000));
  assert.equal(s.join("\n\n"), lang, "nichts geht verloren");
  assert.deepEqual(seiten("   "), ["(Diese Lektion ist noch leer.)"]);
});

test("Lektion anzeigen: Lernen, Nachlesen und Anzeige in der Bibliothek", () => {
  const l = L("1.1", 1);
  const erste = lektionsAnsicht(l, ["S1", "S2"], 0, false);
  assert.equal(erste.embeds[0].title, "1.1 · Lektion 1.1");
  assert.match(erste.embeds[0].footer?.text ?? "", /Seite 1 von 2/);
  assert.deepEqual(erste.components[0].components.map((c) => c.custom_id), ["ak:s:id-1.1:0", "ak:s:id-1.1:1"]);
  assert.equal(erste.components[0].components[0].disabled, true);
  const letzte = lektionsAnsicht(l, ["S1", "S2"], 1, true);
  assert.deepEqual(letzte.components[0].components.map((c) => c.custom_id), ["ak:s:id-1.1:0", "ak:g:id-1.1"]);
  assert.match(letzte.embeds[0].footer?.text ?? "", /Entwurf/);
  const nach = lektionsAnsicht(l, ["S1", "S2"], 1, false, "lesen");
  assert.deepEqual(nach.components[0].components.map((c) => c.custom_id), ["ak:z:id-1.1:0", "ak:weiter"], "Nachlesen: kein Gelesen, danach weiter");
  const bib = lektionsAnsicht(l, ["S1", "S2"], 0, false, "bib");
  assert.deepEqual(bib.components[0].components.map((c) => c.custom_id), ["ak:b:id-1.1:0", "ak:b:id-1.1:1", "ak:bx"]);
  assert.match(bib.embeds[0].footer?.text ?? "", /^📚 Anzeige/);
  const g = gelesenAnsicht(l, "1.2 Lektion 1.2");
  assert.match(g.content, /✅ \*\*1\.1 Lektion 1\.1\*\* gelesen/);
  assert.equal(g.components[0].components[0].custom_id, "ak:weiter");
  assert.deepEqual(gelesenAnsicht(l, null).components, []);
});

test("Test: Fragen, Auswertung, Nachlese-Vorschläge", () => {
  const f = fragen.slice(0, 2);
  const q = frageAnsicht("1 · Einheit", f, "B");
  assert.match(q.embeds[0].title ?? "", /Frage 2 von 2/);
  assert.match(q.embeds[0].description ?? "", /Frage T1\.2\?\n\n\*\*A\)\*\* a\n\*\*B\)\*\* b/);
  assert.deepEqual(q.components[0].components.map((c) => c.custom_id), ["ak:t:1:BA", "ak:t:1:BB", "ak:t:1:BC", "ak:t:1:BD"]);

  const gut = auswertung(f, "BC");
  assert.deepEqual({ richtig: gut.richtig, gesamt: gut.gesamt, prozent: gut.prozent, bestanden: gut.bestanden }, { richtig: 2, gesamt: 2, prozent: 100, bestanden: true });
  const schlecht = auswertung(f, "BA");
  assert.equal(schlecht.bestanden, false);
  assert.equal(schlecht.prozent, 50);
  assert.deepEqual(schlecht.falsch.map((x) => x.nr), ["T1.2"]);
  assert.equal(auswertung([...f, F("T1.3", 1, "A", "1.1"), F("T1.4", 1, "A", "1.1"), F("T1.5", 1, "A", "1.1")], "BCAAD").prozent, 80, "4 von 5 = 80 % reicht");
  assert.equal(auswertung([...f, F("T1.3", 1, "A", "1.1"), F("T1.4", 1, "A", "1.1"), F("T1.5", 1, "A", "1.1")], "BCAAD").bestanden, true);

  const lektionen = [L("1.1", 1), L("1.2", 2)];
  const e1 = ergebnisAnsicht(gut, lektionen, 1);
  assert.match(e1.content, /Bestanden/);
  assert.equal(e1.components[0].components[0].custom_id, "ak:weiter");
  const e2 = ergebnisAnsicht(schlecht, lektionen, 1);
  assert.match(e2.content, /Lies am besten nochmal nach: \*\*1\.2 Lektion 1\.2\*\*/);
  assert.match(e2.content, /Weil C\./, "Erklärung zur falschen Frage");
  assert.deepEqual(e2.components[0].components.map((c) => c.custom_id), ["ak:z:id-1.2:0", "ak:t:1:"]);
});

test("Bibliothek: Inhaltsverzeichnis mit Auswahl und Suche", () => {
  const gelesen = [L("1.2", 2), L("1.1", 1)];
  const k = bibliothekKarte("Mijo", gelesen);
  assert.equal(k.embeds[0].title, "📚 Bibliothek von Mijo");
  assert.match(k.embeds[0].description ?? "", /\*\*1 · Einheit\*\*\n1\.1 Lektion 1\.1\n1\.2 Lektion 1\.2/);
  assert.match(k.embeds[0].description ?? "", /🔎 \*\*Suchen\*\*.*\n🧹 \*\*Aufräumen\*\*/, "Erklärung der Knöpfe");
  const sel = k.components[0].components[0] as { type: number; custom_id: string; options: { value: string }[] };
  assert.equal(sel.type, 3);
  assert.equal(sel.custom_id, "ak:bw");
  assert.deepEqual(sel.options.map((o) => o.value), ["id-1.1", "id-1.2"]);
  assert.deepEqual(k.components[1].components.map((c) => c.custom_id), ["ak:bs", "ak:bc"], "Suchen und rechts daneben Aufräumen");
  const leer = bibliothekKarte("Mijo", []);
  assert.match(leer.embeds[0].description ?? "", /Noch nichts gelesen/);
  assert.equal(leer.components.length, 1, "ohne Lektionen nur der Suchknopf");
  const viele = bibliothekKarte("Mijo", Array.from({ length: 30 }, (_, i) => L(`${1 + Math.floor(i / 10)}.${i % 10}`, i)));
  assert.equal((viele.components[0].components[0] as { custom_id: string }).custom_id, "ak:be", "über 25: erst die Einheit wählen");

  const treffer = sucheTreffer([{ lektion: L("1.1", 1), text: "Der Retainer ist monatlich." }, { lektion: L("1.2", 2, { titel: "Retainer erklärt" }), text: "Nichts." }, { lektion: L("1.3", 3), text: "Anderes." }], "retainer");
  assert.deepEqual(treffer.map((t) => t.lektion.nr), ["1.2", "1.1"], "Titel zuerst");
  assert.match(treffer[1].ausschnitt, /Retainer ist monatlich/);
  assert.deepEqual(sucheTreffer([{ lektion: L("1.1", 1), text: "x" }], " "), []);
});

test("Merkzettel: freigeschaltet, gelesen, Tests", () => {
  const zeilen = [
    zeileFrei(MIJO, "team", "100", "200", "300", "400"),
    zeileGelesen(MIJO, "id-1.1", "1.1", "2026-11-09T10:00:00Z"),
    zeileTest(MIJO, 1, 5, 8, false, "2026-11-09T10:10:00Z"),
    zeileTest(MIJO, 1, 7, 8, true, "2026-11-09T10:20:00Z"),
    "irgendwas anderes",
  ].map((content, i) => ({ id: String(i), content }));
  const p = leseSpeicher(zeilen).get(MIJO)!;
  assert.deepEqual({ rolle: p.rolle, lernpfad: p.lernpfad, bibliothek: p.bibliothek, pfadMsg: p.pfadMsg, tocMsg: p.tocMsg }, { rolle: "team", lernpfad: "100", bibliothek: "200", pfadMsg: "300", tocMsg: "400" });
  assert.deepEqual([...p.gelesen.keys()], ["id-1.1"]);
  assert.equal(p.gelesen.get("id-1.1")?.zeit, "2026-11-09T10:00:00Z");
  assert.deepEqual([...p.bestanden], [1]);
  assert.equal(p.tests.length, 2);
  assert.equal(leseSpeicher(zeilen).get(DAVID), undefined);
});

test("Fortschritt für die Verwaltung und die Zentrale", () => {
  const sch = schritte(pfadLektionen(alle, "team"), fragen, "team");
  const p = leseSpeicher(
    [zeileFrei(MIJO, "team", "1", "2", "3", "4"), zeileGelesen(MIJO, "id-1.1", "1.1", "2026-11-09T10:00:00Z"), zeileGelesen(MIJO, "id-1.2", "1.2", "2026-11-09T11:00:00Z"), zeileTest(MIJO, 1, 1, 2, false, "2026-11-09T11:30:00Z")]
      .reverse()
      .map((content, i) => ({ id: String(i), content })),
  ).get(MIJO)!;
  const f = fortschritt("Mijo", p, sch);
  assert.equal(f.fertig, 2);
  assert.equal(f.gesamt, 4);
  assert.equal(f.prozent, 50);
  assert.equal(f.jetzt, "📝 Test Einheit 1");
  assert.equal(f.zuletzt?.was, "Test Einheit 1: 1 von 2 (50 %), nicht bestanden");
  assert.equal(f.zuletzt?.zeit, "2026-11-09T11:30:00Z");
  const karte = verwaltungKarte([f]);
  assert.equal(karte.embeds[0].title, "🔧 Akademie: Fortschritt");
  assert.match(JSON.stringify(karte), /Mijo/);
  assert.deepEqual(karte.components[0].components.map((c) => c.custom_id), [`ak:vp:${MIJO}`, "ak:vr"]);
  const d = personDetail(f, p, sch);
  assert.match(d.description ?? "", /✅ 1\.1 Lektion 1\.1 · 09\.11\., 11:00/);
  assert.match(d.description ?? "", /Test Einheit 1: 1 von 2/);
});

test("Kanäle nur für die Person und David", () => {
  assert.deepEqual(kanalNamen("Mijo"), { lernpfad: "📖lernpfad-mijo", bibliothek: "📚bibliothek-mijo" });
  assert.deepEqual(kanalNamen("Jakob Börke"), { lernpfad: "📖lernpfad-jakob-boerke", bibliothek: "📚bibliothek-jakob-boerke" });
  const r = privatRechte(MIJO, { everyone: "999", team: "888", bot: "777" });
  const von = (id: string) => r.find((o) => o.id === id)!;
  assert.equal(BigInt(von("999").deny) & BigInt(1024), BigInt(1024), "alle anderen sehen nichts");
  assert.equal(BigInt(von("888").deny) & BigInt(1024), BigInt(1024));
  assert.equal(BigInt(von(MIJO).allow) & BigInt(1024 + 65536), BigInt(1024 + 65536), "Mijo sieht und liest");
  assert.equal(BigInt(von(MIJO).deny) & BigInt(2048), BigInt(2048), "Mijo schreibt nicht");
  assert.equal(BigInt(von("777").allow) & BigInt(2048), BigInt(2048), "der Bot schreibt");
});

test("Notion: Lektionen, Testfragen und Text", () => {
  const props = (o: Record<string, unknown>) => ({ id: "abc", url: "https://www.notion.so/abc", properties: o as never });
  const basis = {
    Titel: { type: "title", title: [{ plain_text: "Was Agents Gilt macht" }] },
    Nr: { type: "rich_text", rich_text: [{ plain_text: "1.1" }] },
    Einheit: { type: "number", number: 1 },
    "Einheit-Name": { type: "select", select: { name: "1 · Willkommen bei Agents Gilt" } },
    Reihenfolge: { type: "number", number: 1 },
    Für: { type: "multi_select", multi_select: [{ name: "Team" }, { name: "David" }] },
    Minuten: { type: "number", number: 4 },
    Freigegeben: { type: "checkbox", checkbox: false },
  };
  assert.deepEqual(lektionAusNotion(props(basis)), {
    id: "abc",
    url: "https://www.notion.so/abc",
    nr: "1.1",
    titel: "Was Agents Gilt macht",
    einheit: 1,
    einheitName: "1 · Willkommen bei Agents Gilt",
    reihenfolge: 1,
    fuer: ["Team", "David"],
    minuten: 4,
    freigegeben: false,
  });
  assert.equal(lektionAusNotion({ id: "x", properties: {} }), null, "ohne Nummer keine Lektion");
  const frage = {
    ...basis,
    Titel: { type: "title", title: [{ plain_text: "Was ist ein Retainer?" }] },
    Nr: { type: "rich_text", rich_text: [{ plain_text: "T1.2" }] },
    Art: { type: "select", select: { name: "Testfrage" } },
    "Antwort A": { type: "rich_text", rich_text: [{ plain_text: "einmalig" }] },
    "Antwort B": { type: "rich_text", rich_text: [{ plain_text: "Rabatt" }] },
    "Antwort C": { type: "rich_text", rich_text: [{ plain_text: "monatlich" }] },
    "Antwort D": { type: "rich_text", rich_text: [] },
    Richtig: { type: "select", select: { name: "C" } },
    "Zu Lektion": { type: "rich_text", rich_text: [{ plain_text: "1.1" }] },
    Erklärung: { type: "rich_text", rich_text: [{ plain_text: "Monatlich." }] },
  };
  assert.equal(lektionAusNotion(props(frage)), null, "Testfragen sind keine Lektionen");
  const t = frageAusNotion(props(frage));
  assert.deepEqual({ nr: t?.nr, frage: t?.frage, antworten: t?.antworten, richtig: t?.richtig, zuLektion: t?.zuLektion, erklaerung: t?.erklaerung, einheit: t?.einheit }, {
    nr: "T1.2",
    frage: "Was ist ein Retainer?",
    antworten: ["einmalig", "Rabatt", "monatlich"],
    richtig: "C",
    zuLektion: "1.1",
    erklaerung: "Monatlich.",
    einheit: 1,
  });
  assert.equal(frageAusNotion(props(basis)), null, "Lektionen sind keine Testfragen");

  const rt = (t: string, bold = false) => [{ plain_text: t, annotations: { bold } }];
  const bloecke: RohBlock[] = [
    { id: "1", type: "paragraph", paragraph: { rich_text: [...rt("Wir "), ...rt("bauen", true), ...rt(" schnell.")] } },
    { id: "2", type: "bulleted_list_item", bulleted_list_item: { rich_text: rt("Punkt") }, kinder: [{ id: "2a", type: "bulleted_list_item", bulleted_list_item: { rich_text: rt("Unterpunkt") } }] },
    { id: "3", type: "divider", divider: {} },
    { id: "4", type: "numbered_list_item", numbered_list_item: { rich_text: rt("Eins") } },
    { id: "5", type: "numbered_list_item", numbered_list_item: { rich_text: rt("Zwei") } },
    { id: "6", type: "heading_3", heading_3: { rich_text: rt("Titel") } },
    { id: "7", type: "callout", callout: { rich_text: rt("Wichtig") } },
  ];
  assert.equal(lektionText(bloecke), "Wir **bauen** schnell.\n\n• Punkt\n  • Unterpunkt\n\n---\n\n1. Eins\n2. Zwei\n\n**Titel**\n\n> Wichtig");
});
