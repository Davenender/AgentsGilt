// Tests für „Zuständig“ in den Kundenkanälen (Plan 1, Etappe 1): `npm test`.
// Nur reine Logik, nichts schreibt in Notion oder Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alsMentions,
  ausKarte,
  auswahlMenue,
  CHEF_ID,
  darf,
  discordIdFuer,
  gleich,
  idsAusNotionProp,
  kanalRechte,
  mitZustaendig,
  NIEMAND,
  notionIdFuer,
  notionPeople,
  pruefeAuswahl,
  SPERRE,
  BOT_DARF,
  wahrheit,
  zustaendigZeile,
} from "../lib/zustaendige.ts";
import { aenderungen, kundenKarte, type Kunde } from "../lib/notion-kunden.ts";
import { kartenKnoepfe } from "../lib/kundenablauf.ts";

const DAVID = "806859236768088114";
const JAKOB = "523479048727560205";
const MIJO = "1363529531939492133";
const FREMD = "111111111111111111";
const N_DAVID = "42dc06f2-4850-4c87-b958-a8bf40505986";
const N_JAKOB = "405d872b-594c-814f-92f2-00022b1d1178";
const N_MIJO = "233d872b-594c-81cb-98c0-0002013ab53c";

const people = (...ids: string[]) => ({ type: "people", people: ids.map((id) => ({ object: "user", id })) });
const karteMit = (wert?: string) => ({
  title: "KND-009 · Test",
  fields: [
    { name: "Status", value: "Lead", inline: true },
    { name: "Angebot", value: "Website", inline: true },
    ...(wert === undefined ? [] : [{ name: "Zuständig", value: wert, inline: true }]),
    { name: "E-Mail", value: "a@b.de", inline: true },
  ],
  footer: { text: "Kundenkarte · wird automatisch aus Notion aktualisiert" },
});

test("Zuordnung Discord ↔ Notion für David, Jakob und Mijo", () => {
  assert.equal(CHEF_ID, DAVID);
  assert.equal(notionIdFuer(DAVID), N_DAVID);
  assert.equal(notionIdFuer(JAKOB), N_JAKOB);
  assert.equal(notionIdFuer(MIJO), N_MIJO);
  assert.equal(notionIdFuer(FREMD), null);
  assert.equal(discordIdFuer(N_MIJO), MIJO);
  assert.equal(discordIdFuer(N_JAKOB.replace(/-/g, "").toUpperCase()), JAKOB, "ohne Striche und groß geschrieben");
  assert.equal(discordIdFuer("ffffffff-0000-0000-0000-000000000000"), null);
});

test("Notion-Personenfeld → Discord-Kennungen (Reihenfolge wie im Team, Fremde fallen weg)", () => {
  assert.deepEqual(idsAusNotionProp(people(N_MIJO, N_DAVID, "ffffffff-0000-0000-0000-000000000000", N_MIJO)), [DAVID, MIJO]);
  assert.deepEqual(idsAusNotionProp(people()), []);
  assert.deepEqual(idsAusNotionProp(undefined), []);
  assert.deepEqual(idsAusNotionProp([N_JAKOB]), [JAKOB], "auch eine Liste von Notion-IDs");
});

test("Kartenfeld: Erwähnungen hin und zurück, alte Karten zählen nicht", () => {
  assert.equal(alsMentions([JAKOB, DAVID]), `<@${DAVID}> <@${JAKOB}>`);
  assert.equal(alsMentions([]), NIEMAND);
  assert.deepEqual(ausKarte(karteMit(`<@${JAKOB}> <@${DAVID}>`)), [DAVID, JAKOB]);
  assert.deepEqual(ausKarte(karteMit(NIEMAND)), []);
  assert.equal(ausKarte(karteMit("David Hesse")), null, "alte Karte mit Namen aus Notion");
  assert.equal(ausKarte(karteMit()), null, "alte Karte ohne Feld");
  assert.equal(ausKarte(null), null);
});

test("Wahrheit: die Karte gilt, Notion wird bei Abweichung zurückgesetzt", () => {
  const w1 = wahrheit(karteMit(`<@${JAKOB}>`), people(N_JAKOB, N_MIJO));
  assert.deepEqual(w1, { ids: [JAKOB], zuruecksetzen: true, ausNotion: false });
  const w2 = wahrheit(karteMit(`<@${JAKOB}>`), people(N_JAKOB));
  assert.deepEqual(w2, { ids: [JAKOB], zuruecksetzen: false, ausNotion: false });
  const w3 = wahrheit(karteMit("David Hesse"), people(N_DAVID));
  assert.deepEqual(w3, { ids: [DAVID], zuruecksetzen: false, ausNotion: true }, "alte Karte übernimmt einmal Notion");
  const w4 = wahrheit(null, people(N_MIJO));
  assert.deepEqual(w4, { ids: [MIJO], zuruecksetzen: false, ausNotion: true }, "neue Karte übernimmt Notion");
  const w5 = wahrheit(karteMit(NIEMAND), people(N_MIJO));
  assert.deepEqual(w5, { ids: [], zuruecksetzen: true, ausNotion: false }, "niemand zuständig bleibt niemand");
  assert.equal(gleich([DAVID, JAKOB], [JAKOB, DAVID]), true);
  assert.equal(gleich([DAVID], [DAVID, JAKOB]), false);
});

test("Rechte: David darf immer, sonst nur Zuständige", () => {
  assert.equal(darf(DAVID, []), true);
  assert.equal(darf(JAKOB, [JAKOB]), true);
  assert.equal(darf(MIJO, [JAKOB]), false);
  assert.equal(darf(FREMD, [JAKOB, MIJO]), false);
});

test("Auswahl: nur David, Jakob und Mijo, mindestens eine Person", () => {
  assert.deepEqual(pruefeAuswahl([MIJO, JAKOB]), { ok: true, ids: [JAKOB, MIJO] });
  assert.equal(pruefeAuswahl([]).ok, false);
  assert.equal(pruefeAuswahl(undefined).ok, false);
  const fremd = pruefeAuswahl([JAKOB, FREMD]);
  assert.equal(fremd.ok, false);
  assert.match(fremd.ok ? "" : fremd.grund, /David, Jakob und Mijo/);
});

test("Karte: Feld wird ersetzt oder hinter Angebot eingefügt", () => {
  const ersetzt = mitZustaendig(karteMit("David Hesse"), [MIJO]);
  assert.deepEqual(ersetzt.fields?.map((f) => f.name), ["Status", "Angebot", "Zuständig", "E-Mail"]);
  assert.equal(ersetzt.fields?.[2].value, `<@${MIJO}>`);
  const eingefuegt = mitZustaendig(karteMit(), [JAKOB, DAVID]);
  assert.deepEqual(eingefuegt.fields?.map((f) => f.name), ["Status", "Angebot", "Zuständig", "E-Mail"]);
  assert.equal(eingefuegt.fields?.[2].value, `<@${DAVID}> <@${JAKOB}>`);
  assert.equal(eingefuegt.title, "KND-009 · Test", "der Rest bleibt");
});

test("Knopf und Auswahlmenü", () => {
  const knopf = kartenKnoepfe("Lead")[0].components[0];
  assert.equal(knopf.custom_id, "knd:zust");
  assert.equal(knopf.type, 2);
  const menue = auswahlMenue("1234", [JAKOB]);
  const sel = menue[0].components[0];
  assert.equal(sel.type, 5, "Personenauswahl");
  assert.equal(sel.custom_id, "knd:zustwahl:1234");
  assert.equal(sel.min_values, 1);
  assert.equal(sel.max_values, 3);
  assert.deepEqual(sel.default_values, [{ id: JAKOB, type: "user" }]);
});

test("Notion bekommt Personen, Kanal bekommt eine Änderungszeile", () => {
  assert.deepEqual(notionPeople([MIJO, FREMD]), { people: [{ object: "user", id: N_MIJO }] });
  assert.deepEqual(notionPeople([]), { people: [] });
  assert.equal(
    zustaendigZeile([JAKOB], [JAKOB, MIJO], DAVID),
    `👥 **Zuständig:** <@${JAKOB}> → <@${JAKOB}> <@${MIJO}> (geändert von <@${DAVID}>)`,
  );
});

test("Kanalrechte: Schreiben für alle gesperrt, der Bot darf, nichts doppelt", () => {
  const GILDE = "999";
  const TEAM = "888";
  const BOT = "777";
  const vorher = [{ id: TEAM, type: 0, allow: "1024", deny: "0" }];
  const puts = kanalRechte(vorher, { everyone: GILDE, team: TEAM, bot: BOT });
  assert.deepEqual(puts.map((p) => p.id), [BOT, GILDE, TEAM], "Bot zuerst");
  const team = puts.find((p) => p.id === TEAM)!;
  assert.equal(team.allow, "1024", "Ansehen aus der Kategorie bleibt erlaubt");
  assert.equal(BigInt(team.deny) & SPERRE, SPERRE);
  assert.equal(BigInt(puts[0].allow) & BOT_DARF, BOT_DARF);
  assert.equal(puts[0].type, 1, "Bot ist ein Mitglied");
  assert.equal(SPERRE & BigInt(2048), BigInt(2048), "Schreiben gesperrt");
  assert.equal(SPERRE & (BigInt(1) << BigInt(31)), BigInt(1) << BigInt(31), "Befehle gesperrt");
  assert.equal(SPERRE & BigInt(1024), BigInt(0), "Ansehen bleibt");
  // Zweiter Lauf: alles schon gesetzt, nichts zu tun.
  assert.deepEqual(kanalRechte(puts, { everyone: GILDE, team: TEAM, bot: BOT }), []);
  // Erlaubtes Schreiben an anderer Stelle wird ebenfalls gesperrt.
  const fremd = kanalRechte([...puts, { id: "555", type: 1, allow: "2048", deny: "0" }], { everyone: GILDE, team: TEAM, bot: BOT });
  assert.equal(fremd.length, 1);
  assert.equal(fremd[0].allow, "0");
});

test("Kundenkarte zeigt die Zuständigen aus dem Bot, die Umstellung erzeugt keine Zeile", () => {
  const k: Kunde = {
    nr: "KND-009",
    name: "Test",
    props: { Status: { type: "select", select: { name: "Lead" } }, Zuständig: { type: "people", people: [{ id: N_DAVID, name: "David Hesse" }] } },
  };
  const alt = kundenKarte(k);
  assert.equal(alt.fields?.find((f) => f.name === "Zuständig")?.value, "David Hesse");
  const neu = kundenKarte(k, [DAVID, JAKOB]);
  assert.equal(neu.fields?.find((f) => f.name === "Zuständig")?.value, `<@${DAVID}> <@${JAKOB}>`);
  assert.deepEqual(aenderungen(alt, neu), [], "Umstellung Namen → Erwähnungen still");
  const leer = kundenKarte(k, []);
  assert.equal(leer.fields?.find((f) => f.name === "Zuständig")?.value, NIEMAND);
  assert.deepEqual(aenderungen(neu, kundenKarte(k, [JAKOB])), [`**Zuständig:** <@${DAVID}> <@${JAKOB}> → <@${JAKOB}>`]);
});
