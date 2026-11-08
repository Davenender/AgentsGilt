// Tests für die Akademie (Plan 2, Etappe 1): `npm test`. Nur reine Logik, nichts geht an Notion oder Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bibliothekEmbeds,
  fortschrittBalken,
  gelesenAnsicht,
  inhaltsverzeichnis,
  kanalNamen,
  lektionAusNotion,
  lektionsAnsicht,
  lektionText,
  leseSpeicher,
  pfadKarte,
  pfadLektionen,
  privatRechte,
  rolleVon,
  seiten,
  stand,
  zeileBib,
  zeileFrei,
  zeileGelesen,
  type Lektion,
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
const alle = [
  L("1.2", 2),
  L("1.1", 1),
  L("1.3", 3, { freigegeben: false }),
  L("9.1", 50, { fuer: ["David"], freigegeben: false }),
  L("2.1", 5),
];

test("Lernpfad: Team sieht nur Freigegebenes, David alles inklusive eigener Lektionen", () => {
  assert.equal(rolleVon(DAVID), "david");
  assert.equal(rolleVon(MIJO), "team");
  assert.deepEqual(pfadLektionen(alle, "team").map((l) => l.nr), ["1.1", "1.2", "2.1"]);
  assert.deepEqual(pfadLektionen(alle, "david").map((l) => l.nr), ["1.1", "1.2", "1.3", "2.1", "9.1"]);
});

test("Stand: fertig, jetzt dran, gesperrt", () => {
  const pfad = pfadLektionen(alle, "team");
  const s = stand(pfad, new Set(["id-1.1"]));
  assert.deepEqual(s.status, { "id-1.1": "fertig", "id-1.2": "jetzt", "id-2.1": "gesperrt" });
  assert.equal(s.aktuelle?.nr, "1.2");
  assert.equal(s.fertig, 1);
  const durch = stand(pfad, new Set(["id-1.1", "id-1.2", "id-2.1"]));
  assert.equal(durch.aktuelle, null);
  assert.equal(durch.fertig, 3);
  assert.equal(fortschrittBalken(3, 10), "▰▰▰▱▱▱▱▱▱▱ 3 von 10");
  assert.equal(fortschrittBalken(0, 0), "▱▱▱▱▱▱▱▱▱▱ 0 von 0");
});

test("Pfad-Karte mit Einheiten und Knopf zum Weiterlernen", () => {
  const pfad = pfadLektionen(alle, "david");
  const k = pfadKarte("David", pfad, new Set(["id-1.1"]));
  assert.equal(k.embeds[0].title, "📖 Lernpfad von David");
  const text = k.embeds[0].description ?? "";
  assert.match(text, /✅ 1\.1 Lektion 1\.1/);
  assert.match(text, /📖 \*\*1\.2 Lektion 1\.2\*\* ← jetzt dran/);
  assert.match(text, /🔒 2\.1/);
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

test("Lektion anzeigen: Blättern, Gelesen nur auf der letzten Seite", () => {
  const l = L("1.1", 1);
  const erste = lektionsAnsicht(l, ["S1", "S2"], 0, false);
  assert.equal(erste.embeds[0].title, "1.1 · Lektion 1.1");
  assert.equal(erste.embeds[0].description, "S1");
  assert.match(erste.embeds[0].footer?.text ?? "", /Seite 1 von 2/);
  const ids1 = erste.components[0].components.map((c) => c.custom_id);
  assert.deepEqual(ids1, ["ak:s:id-1.1:0", "ak:s:id-1.1:1"]);
  assert.equal(erste.components[0].components[0].disabled, true, "Zurück auf Seite 1 aus");
  const letzte = lektionsAnsicht(l, ["S1", "S2"], 1, true);
  assert.deepEqual(letzte.components[0].components.map((c) => c.custom_id), ["ak:s:id-1.1:0", "ak:g:id-1.1"]);
  assert.match(letzte.embeds[0].footer?.text ?? "", /Entwurf/);
  const g = gelesenAnsicht(l, L("1.2", 2));
  assert.match(g.content, /✅ \*\*1\.1 Lektion 1\.1\*\* gelesen/);
  assert.equal(g.components[0].components[0].custom_id, "ak:weiter");
  assert.deepEqual(gelesenAnsicht(l, null).components, []);
});

test("Bibliothek und Inhaltsverzeichnis", () => {
  const e = bibliothekEmbeds(L("1.1", 1), ["S1", "S2"]);
  assert.equal(e.length, 2);
  assert.equal(e[0].title, "1.1 · Lektion 1.1");
  assert.equal(e[1].title, undefined);
  const toc = inhaltsverzeichnis("Mijo", [
    { nr: "1.2", titel: "B", einheitName: "1 · Willkommen", link: "https://discord.com/channels/1/2/4" },
    { nr: "1.1", titel: "A", einheitName: "1 · Willkommen", link: "https://discord.com/channels/1/2/3" },
  ]);
  assert.equal(toc.title, "📚 Bibliothek von Mijo");
  assert.match(toc.description ?? "", /\*\*1 · Willkommen\*\*\n\[1\.1 A\]\(https:\/\/discord\.com\/channels\/1\/2\/3\)\n\[1\.2 B\]/);
  assert.match(inhaltsverzeichnis("Mijo", []).description ?? "", /Noch nichts gelesen/);
});

test("Merkzettel: freigeschaltet, gelesen, Bibliothek", () => {
  const zeilen = [
    zeileFrei(MIJO, "team", "100", "200", "300", "400"),
    zeileGelesen(MIJO, "id-1.1", "1.1", "2026-11-09T10:00:00Z"),
    zeileBib(MIJO, "id-1.1", "1.1", "https://discord.com/channels/1/200/9"),
    "irgendwas anderes",
  ].map((content, i) => ({ id: String(i), content }));
  const m = leseSpeicher(zeilen);
  const p = m.get(MIJO)!;
  assert.deepEqual({ rolle: p.rolle, lernpfad: p.lernpfad, bibliothek: p.bibliothek, pfadMsg: p.pfadMsg, tocMsg: p.tocMsg }, { rolle: "team", lernpfad: "100", bibliothek: "200", pfadMsg: "300", tocMsg: "400" });
  assert.deepEqual([...p.gelesen], ["id-1.1"]);
  assert.equal(p.bib.get("id-1.1")?.link, "https://discord.com/channels/1/200/9");
  assert.equal(m.get(DAVID), undefined);
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
  assert.equal(von(MIJO).type, 1);
  assert.equal(BigInt(von("777").allow) & BigInt(2048), BigInt(2048), "der Bot schreibt");
});

test("Notion: Eigenschaften und Text der Lektion", () => {
  const l = lektionAusNotion({
    id: "abc",
    url: "https://www.notion.so/abc",
    properties: {
      Titel: { type: "title", title: [{ plain_text: "Was Agents Gilt macht" }] },
      Nr: { type: "rich_text", rich_text: [{ plain_text: "1.1" }] },
      Einheit: { type: "number", number: 1 },
      "Einheit-Name": { type: "select", select: { name: "1 · Willkommen bei Agents Gilt" } },
      Reihenfolge: { type: "number", number: 1 },
      Für: { type: "multi_select", multi_select: [{ name: "Team" }, { name: "David" }] },
      Minuten: { type: "number", number: 4 },
      Freigegeben: { type: "checkbox", checkbox: false },
    },
  });
  assert.deepEqual(l, {
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
