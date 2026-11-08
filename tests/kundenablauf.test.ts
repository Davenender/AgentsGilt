// Tests für „Verloren“ und das Kundenarchiv (Plan 1, Etappe 2): `npm test`.
// Nur reine Logik, nichts schreibt in Notion oder Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alsVerloren,
  alsWiederAufgenommen,
  ARCHIV_KATEGORIE,
  grundAusIndex,
  kartenKnoepfe,
  knoepfePassen,
  KUNDEN_KATEGORIE,
  statusAusKarte,
  VERLUSTGRUENDE,
  verlorenZeile,
  verlustBestaetigung,
  verlustMenue,
  wiederZeile,
  zielKategorie,
} from "../lib/kundenablauf.ts";
import { aenderungen, kundenKarte, type Kunde } from "../lib/notion-kunden.ts";

const DAVID = "806859236768088114";
const karte = (status: string, extra: { name: string; value: string; inline: boolean }[] = []) => ({
  title: "KND-003 · Relax Fit",
  fields: [
    { name: "Status", value: status, inline: true },
    ...extra,
    { name: "Angebot", value: "Website", inline: true },
    { name: "Zuständig", value: `<@${DAVID}>`, inline: true },
  ],
  footer: { text: "Kundenkarte · wird automatisch aus Notion aktualisiert" },
});
const ids = (rows: { components: { custom_id?: string }[] }[]) => rows.flatMap((r) => r.components.map((c) => c.custom_id));

test("Verlustgründe wie in Notion", () => {
  assert.deepEqual(VERLUSTGRUENDE, ["Zu teuer", "Kein Bedarf", "Konkurrent", "Keine Antwort", "Selbst gemacht", "Sonstiges"]);
  assert.equal(grundAusIndex("2"), "Konkurrent");
  assert.equal(grundAusIndex("9"), null);
  assert.equal(grundAusIndex("x"), null);
});

test("Knöpfe an der Karte hängen vom Status ab", () => {
  assert.deepEqual(ids(kartenKnoepfe("Lead")), ["knd:zust", "knd:verloren"]);
  assert.deepEqual(ids(kartenKnoepfe("Angebot gesendet")), ["knd:zust", "knd:verloren"]);
  assert.deepEqual(ids(kartenKnoepfe("Verloren")), ["knd:zust", "knd:wieder"]);
  assert.equal(knoepfePassen(kartenKnoepfe("Lead"), "Lead"), true);
  assert.equal(knoepfePassen(kartenKnoepfe("Lead"), "Verloren"), false);
  assert.equal(knoepfePassen([], "Lead"), false);
  assert.equal(knoepfePassen(undefined, "Lead"), false);
  // So kommen die Knöpfe von Discord zurück (mit zusätzlichen Feldern)
  const vonDiscord = [{ type: 1, id: 1, components: [{ type: 2, id: 2, custom_id: "knd:zust", label: "Zuständige" }, { type: 2, id: 3, custom_id: "knd:verloren" }] }];
  assert.equal(knoepfePassen(vonDiscord, "Lead"), true);
});

test("Status aus der Karte", () => {
  assert.equal(statusAusKarte(karte("Lead")), "Lead");
  assert.equal(statusAusKarte({ fields: [] }), "");
  assert.equal(statusAusKarte(null), "");
});

test("Verloren: erst Grund wählen, dann rot bestätigen", () => {
  const menue = verlustMenue("555");
  const sel = menue[0].components[0];
  assert.equal(sel.type, 3);
  assert.equal(sel.custom_id, "knd:vgrund:555");
  assert.deepEqual(sel.options.map((o) => o.label), VERLUSTGRUENDE);
  assert.deepEqual(sel.options.map((o) => o.value), ["0", "1", "2", "3", "4", "5"]);

  const b = verlustBestaetigung("555", "1");
  assert.match(b.content, /Kein Bedarf/);
  const [ja, nein] = b.components[0].components;
  assert.equal(ja.style, 4, "rot");
  assert.equal(ja.label, "Sicher: als verloren markieren");
  assert.equal(ja.custom_id, "knd:vja:555:1");
  assert.equal(nein.custom_id, "knd:vnein");
});

test("Karte als verloren und wieder aufgenommen", () => {
  const v = alsVerloren(karte("Angebot gesendet"), "Zu teuer");
  assert.deepEqual(v.fields?.map((f) => [f.name, f.value]).slice(0, 2), [["Status", "Verloren"], ["Verlustgrund", "Zu teuer"]]);
  assert.equal(v.fields?.length, 4);
  const v2 = alsVerloren(v, "Konkurrent");
  assert.equal(v2.fields?.filter((f) => f.name === "Verlustgrund").length, 1, "nicht doppelt");
  assert.equal(v2.fields?.[1].value, "Konkurrent");
  const w = alsWiederAufgenommen(v2);
  assert.deepEqual(w.fields?.map((f) => f.name), ["Status", "Angebot", "Zuständig"]);
  assert.equal(w.fields?.[0].value, "Lead");
  assert.equal(w.title, "KND-003 · Relax Fit");
});

test("Zeilen im Kanal halten fest, wer es wann gesetzt hat", () => {
  assert.equal(verlorenZeile("Zu teuer", DAVID, "08.11.2026, 21:30"), `⚪ **Verloren** (Grund: Zu teuer), gesetzt von <@${DAVID}> am 08.11.2026, 21:30. Der Kanal liegt jetzt im ${ARCHIV_KATEGORIE}.`);
  assert.equal(wiederZeile(DAVID, "09.11.2026, 10:00"), `↩️ **Wieder aufgenommen** von <@${DAVID}> am 09.11.2026, 10:00. Status ist wieder **Lead**.`);
});

test("Kategorie je Status", () => {
  assert.equal(zielKategorie("Verloren"), ARCHIV_KATEGORIE);
  assert.equal(ARCHIV_KATEGORIE, "KUNDENARCHIV");
  assert.equal(zielKategorie("Lead"), KUNDEN_KATEGORIE);
  assert.equal(zielKategorie("Kunde"), "KUNDEN");
  assert.equal(zielKategorie(""), KUNDEN_KATEGORIE);
});

test("Kundenkarte zeigt den Verlustgrund hinter dem Status", () => {
  const k: Kunde = {
    nr: "KND-003",
    name: "Relax Fit",
    props: {
      Status: { type: "select", select: { name: "Verloren" } },
      Verlustgrund: { type: "select", select: { name: "Keine Antwort" } },
      Angebot: { type: "select", select: { name: "Website" } },
    },
  };
  const c = kundenKarte(k, []);
  assert.deepEqual(c.fields?.slice(0, 3).map((f) => f.name), ["Status", "Verlustgrund", "Angebot"]);
  // Nach dem Knopf steht der Stand schon in der Karte: Der Webhook meldet danach nichts doppelt.
  const nachKnopf = alsVerloren(kundenKarte({ ...k, props: { ...k.props, Status: { type: "select", select: { name: "Lead" } }, Verlustgrund: { type: "select", select: null } } }, []), "Keine Antwort");
  assert.deepEqual(aenderungen(nachKnopf, c), []);
});
