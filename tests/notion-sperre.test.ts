// Etappe 6: Notion-Sperre durch Zurücksetzen. Reine Logik. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { abweichungen, alsKartenProp, editorAus, entscheide, GESPERRT, rueckProps, sperrHinweis, standAus, werHat } from "../lib/notion-sperre.ts";

const BOT = "bot-1111";
const DAVID = "42dc06f2-4850-4c87-b958-a8bf40505986";

test("Gesperrt sind genau die 40 Felder aus dem Plan, ohne Formeln", () => {
  assert.equal(GESPERRT.length, 40);
  for (const n of ["Status", "Angebot raus", "Telefon", "Zuständig", "Setup-Preis (€)", "Vertrag am", "Nächste Wartung", "Name", "Aufwand (in Stunden)"]) assert.ok(GESPERRT.includes(n), n);
  for (const n of ["Stand", "KND-Nr.", "Fortschritt (%)", "Gesamtstunden", "Arbeitszeiten", "Einstempeln"]) assert.ok(!GESPERRT.includes(n), n);
});

test("Wer hat geändert: Bot, David, Team, unbekannt", () => {
  assert.equal(werHat(BOT, BOT, DAVID), "bot", "Review Focus 4: das Zurücksetzen des Bots gilt");
  assert.equal(werHat(DAVID.replace(/-/g, ""), BOT, DAVID), "david", "mit und ohne Striche");
  assert.equal(werHat("233d872b-594c-81cb-98c0-0002013ab53c", BOT, DAVID), "team");
  assert.equal(werHat(null, BOT, DAVID), "unbekannt");
  assert.equal(werHat("233d872b-594c-81cb-98c0-0002013ab53c", null, DAVID), "unbekannt", "ohne Bot-Kennung lieber nichts zurücksetzen");
  assert.equal(werHat(DAVID, null, DAVID), "david");
});

test("Bearbeiter aus der Notion-Meldung", () => {
  assert.equal(editorAus({ data: { object: "page", last_edited_by: { object: "user", id: "u-1" } } }), "u-1");
  assert.equal(editorAus({ source: { user_id: "u-2" }, data: { object: "page" } }), "u-2");
  assert.equal(editorAus({ data: { object: "page" } }), null);
  assert.equal(editorAus(null), null);
});

const props = {
  Status: { type: "select", select: { name: "Lead" } },
  "Angebot raus": { type: "checkbox", checkbox: false },
  "Nächster Schritt": { type: "rich_text", rich_text: [{ plain_text: "Angebot " }, { plain_text: "nachfragen" }] },
  Name: { type: "title", title: [{ plain_text: "Bäckerei Schmitt" }] },
  "Setup-Preis (€)": { type: "number", number: 1500 },
  "Nächstes Follow-up": { type: "date", date: { start: "2026-11-20", end: null } },
  "Angebot (Link)": { type: "url", url: "https://agentsgilt.com/angebot/schmitt?x=ä" },
  "E-Mail": { type: "email", email: "info@schmitt.de" },
  Telefon: { type: "phone_number", phone_number: null },
  Zuständig: { type: "people", people: [{ id: "p2" }, { id: "p1" }] },
  Stand: { type: "formula", formula: { type: "string", string: "🔴" } },
  "Fortschritt (%)": { type: "formula", formula: { type: "number", number: 10 } },
  Gesamtstunden: { type: "rollup", rollup: { type: "number", number: 2 } },
  Notizfeld: { type: "rich_text", rich_text: [{ plain_text: "nicht gesperrt" }] },
};

test("Stand: nur gesperrte, schreibbare Felder, einfache Werte", () => {
  const s = standAus(props);
  assert.deepEqual(s.Status, ["select", "Lead"]);
  assert.deepEqual(s["Angebot raus"], ["checkbox", false]);
  assert.deepEqual(s["Nächster Schritt"], ["rich_text", "Angebot nachfragen"]);
  assert.deepEqual(s.Name, ["title", "Bäckerei Schmitt"]);
  assert.deepEqual(s["Setup-Preis (€)"], ["number", 1500]);
  assert.deepEqual(s["Nächstes Follow-up"], ["date", { start: "2026-11-20", end: null }]);
  assert.deepEqual(s.Telefon, ["phone_number", null]);
  assert.deepEqual(s.Zuständig, ["people", ["p1", "p2"]], "sortiert");
  assert.equal(s.Stand, undefined, "Formel");
  assert.equal(s.Gesamtstunden, undefined, "Rollup");
  assert.equal(s.Notizfeld, undefined, "nicht gesperrt");
});

test("Abweichungen: geänderter Status ja, Formel nein, Zuständig nie", () => {
  const stand = standAus(props);
  const neu = {
    ...props,
    Status: { type: "select", select: { name: "Kunde" } },
    "Fortschritt (%)": { type: "formula", formula: { type: "number", number: 80 } },
    Zuständig: { type: "people", people: [{ id: "p9" }] },
    "Nächster Schritt": { type: "rich_text", rich_text: [{ plain_text: "Angebot nachfragen " }] },
  };
  assert.deepEqual(abweichungen(neu, stand), ["Status"]);
  assert.deepEqual(abweichungen(props, stand), []);
});

test("Abweichungen: Feld fehlt in der Meldung oder im Stand → keine Abweichung", () => {
  const { Status: _weg, ...ohneStatus } = props;
  void _weg;
  assert.deepEqual(abweichungen(ohneStatus, standAus(props)), []);
  const { Telefon: _t, ...standOhneTelefon } = standAus(props);
  void _t;
  assert.deepEqual(abweichungen({ ...props, Telefon: { type: "phone_number", phone_number: "+49 1" } }, standOhneTelefon), []);
});

test("Zurücksetzen: richtige Notion-Form je Typ", () => {
  const s = standAus(props);
  const r = rueckProps(s, ["Status", "Angebot raus", "Nächster Schritt", "Name", "Setup-Preis (€)", "Nächstes Follow-up", "Angebot (Link)", "E-Mail", "Telefon"]);
  assert.deepEqual(r.Status, { select: { name: "Lead" } });
  assert.deepEqual(r["Angebot raus"], { checkbox: false });
  assert.deepEqual(r["Nächster Schritt"], { rich_text: [{ type: "text", text: { content: "Angebot nachfragen" } }] });
  assert.deepEqual(r.Name, { title: [{ type: "text", text: { content: "Bäckerei Schmitt" } }] });
  assert.deepEqual(r["Setup-Preis (€)"], { number: 1500 });
  assert.deepEqual(r["Nächstes Follow-up"], { date: { start: "2026-11-20", end: null } });
  assert.deepEqual(r["Angebot (Link)"], { url: "https://agentsgilt.com/angebot/schmitt?x=ä" });
  assert.deepEqual(r["E-Mail"], { email: "info@schmitt.de" });
  assert.deepEqual(r.Telefon, { phone_number: null });
  assert.deepEqual(rueckProps({ Status: ["select", null], Q: ["rich_text", ""] }, ["Status", "Q"]), { Status: { select: null }, Q: { rich_text: [] } });
  assert.deepEqual(rueckProps(s, ["Zuständig"]).Zuständig, { people: [{ object: "user", id: "p1" }, { object: "user", id: "p2" }] });
});

test("Langer Text wird beim Zurücksetzen in 2000er-Stücke geteilt", () => {
  const lang = "x".repeat(4500);
  const r = rueckProps({ "Nächster Schritt": ["rich_text", lang] }, ["Nächster Schritt"]) as Record<string, { rich_text: { text: { content: string } }[] }>;
  assert.equal(r["Nächster Schritt"].rich_text.length, 3);
  assert.equal(r["Nächster Schritt"].rich_text.map((t) => t.text.content).join(""), lang);
});

test("Karten-Eigenschaft aus dem Stand (damit die Karte gleich den richtigen Wert zeigt)", () => {
  assert.deepEqual(alsKartenProp(["select", "Lead"]), { type: "select", select: { name: "Lead" } });
  assert.deepEqual(alsKartenProp(["checkbox", true]), { type: "checkbox", checkbox: true });
  assert.deepEqual(alsKartenProp(["rich_text", "Hallo"]), { type: "rich_text", rich_text: [{ type: "text", text: { content: "Hallo" } }] });
});

test("Hinweis an die Person nennt Kunde, Felder und die Knöpfe", () => {
  const t = sperrHinweis("KND-003", "Relax Fit", ["Status", "Telefon"], "123");
  assert.match(t, /KND-003 · Relax Fit/);
  assert.match(t, /„Status“, „Telefon“/);
  assert.match(t, /Knöpfe im Kundenkanal <#123>/);
});

// ---- Task 6.2: was mit einer Meldung passiert

test("Noch kein Stand: der aktuelle Notion-Stand gilt (erster Lauf), egal wer", () => {
  const e = entscheide(props, null, "team");
  assert.equal(e.art, "neu");
  assert.deepEqual(e.art === "neu" && e.stand.Status, ["select", "Lead"]);
});

test("David oder Bot: neuer Stand, unveränderte Felder aus dem alten bleiben", () => {
  const alt = { ...standAus(props), "Gmail-Label": ["rich_text", "Kunden/Kunde - 003"] as [string, unknown] };
  const neu = { ...props, Status: { type: "select", select: { name: "Kunde" } } };
  for (const wer of ["david", "bot"] as const) {
    const e = entscheide(neu, alt, wer);
    assert.equal(e.art, "uebernehmen", wer);
    if (e.art === "uebernehmen") {
      assert.deepEqual(e.stand.Status, ["select", "Kunde"]);
      assert.deepEqual(e.stand["Gmail-Label"], ["rich_text", "Kunden/Kunde - 003"], "fehlt in der Meldung, bleibt");
    }
  }
  assert.equal(entscheide(props, standAus(props), "david").art, "nichts", "nichts geändert");
});

test("Team: nur die abweichenden Felder zurück, mit Notion-Form", () => {
  const alt = standAus(props);
  const neu = { ...props, Status: { type: "select", select: { name: "Kunde" } }, Telefon: { type: "phone_number", phone_number: "+49 170 1" } };
  const e = entscheide(neu, alt, "team");
  assert.equal(e.art, "zuruecksetzen");
  if (e.art === "zuruecksetzen") {
    assert.deepEqual(e.felder, ["Status", "Telefon"]);
    assert.deepEqual(e.props, { Status: { select: { name: "Lead" } }, Telefon: { phone_number: null } });
  }
  assert.equal(entscheide(props, alt, "team").art, "nichts", "Team hat nur im Gesprächsbogen geschrieben");
});

test("Unbekannter Bearbeiter: nichts tun", () => {
  const neu = { ...props, Status: { type: "select", select: { name: "Kunde" } } };
  assert.equal(entscheide(neu, standAus(props), "unbekannt").art, "nichts");
});
