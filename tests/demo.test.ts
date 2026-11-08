// Tests für „Demo anfragen“ (Plan 1, Etappe 5): `npm test`.
// Nur reine Logik, nichts schreibt in Notion, Discord oder ntfy.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  demoAusKarte,
  demoBestaetigung,
  demoFeldAusNotion,
  demoFeldText,
  demoOffen,
  demoPush,
  demoZeile,
  mitDemo,
  pruefeDemoAktion,
  statusNachAktion,
} from "../lib/demo.ts";
import { kartenKnoepfe, knoepfePassen } from "../lib/kundenablauf.ts";
import { kundenKarte, type Kunde } from "../lib/notion-kunden.ts";

const MIJO = "1363529531939492133";
const karte = (demo?: string) => ({
  title: "KND-003 · Relax Fit",
  fields: [
    { name: "Status", value: "Lead", inline: true },
    { name: "Zuständig", value: `<@${MIJO}>`, inline: true },
    ...(demo ? [{ name: "Demo", value: demo, inline: false }] : []),
    { name: "E-Mail", value: "a@b.de", inline: true },
  ],
});

test("Offene Demo: angefragt, bestätigt, in Arbeit", () => {
  assert.equal(demoOffen("angefragt"), true);
  assert.equal(demoOffen("bestätigt"), true);
  assert.equal(demoOffen("in Arbeit"), true);
  assert.equal(demoOffen("fertig"), false);
  assert.equal(demoOffen(null), false);
  assert.equal(demoOffen(""), false);
});

test("Kartenfeld: Stand und wer wann angefragt hat, hin und zurück", () => {
  const t = demoFeldText("angefragt", null, { von: MIJO, zeit: "08.11.2026, 23:10" });
  assert.equal(t, `🎨 angefragt, wartet auf Davids Bestätigung\nangefragt von <@${MIJO}> am 08.11.2026, 23:10`);
  assert.deepEqual(demoAusKarte(karte(t)), { status: "angefragt", von: MIJO, zeit: "08.11.2026, 23:10" });
  assert.equal(demoFeldText("bestätigt", null, null), "✅ bestätigt, wird vorbereitet");
  assert.equal(demoFeldText("in Arbeit", null, null), "🔨 in Arbeit");
  assert.equal(demoFeldText("fertig", "https://demo.agentsgilt.com/relax", null), "🌐 fertig: [Demo ansehen](https://demo.agentsgilt.com/relax)");
  assert.deepEqual(demoAusKarte(karte("🔨 in Arbeit")), { status: "in Arbeit", von: null, zeit: null });
  assert.equal(demoAusKarte(karte()), null);
});

test("Nach einer Notion-Meldung bleibt stehen, wer angefragt hat", () => {
  const alt = karte(demoFeldText("angefragt", null, { von: MIJO, zeit: "08.11.2026, 23:10" }));
  assert.equal(
    demoFeldAusNotion("in Arbeit", "", alt),
    `🔨 in Arbeit\nangefragt von <@${MIJO}> am 08.11.2026, 23:10`,
  );
  assert.equal(demoFeldAusNotion("", "", alt), null, "ohne Demo-Status kein Feld");
  assert.equal(demoFeldAusNotion("fertig", "https://x.de", null), "🌐 fertig: [Demo ansehen](https://x.de)");
});

test("Feld an der Karte setzen (hinter Zuständig) oder entfernen", () => {
  const k = mitDemo(karte(), "🔨 in Arbeit");
  assert.deepEqual(k.fields?.map((f) => f.name), ["Status", "Zuständig", "Demo", "E-Mail"]);
  const k2 = mitDemo(k, "🌐 fertig");
  assert.equal(k2.fields?.filter((f) => f.name === "Demo").length, 1);
  assert.equal(mitDemo(k2, null).fields?.some((f) => f.name === "Demo"), false);
});

test("Kundenkarte aus Notion mit Demo-Feld", () => {
  const kunde: Kunde = { nr: "KND-003", name: "Relax Fit", props: { Status: { type: "select", select: { name: "Lead" } } } };
  const c = kundenKarte(kunde, [MIJO], "🔨 in Arbeit");
  const namen = c.fields?.map((f) => f.name) ?? [];
  assert.equal(namen[namen.indexOf("Zuständig") + 1], "Demo");
  assert.equal(kundenKarte(kunde, [MIJO]).fields?.some((f) => f.name === "Demo"), false);
});

test("Knopf „🎨 Demo anfragen“: gesperrt, solange eine Anfrage offen ist", () => {
  const knopf = (status: string, demo: string | null) => kartenKnoepfe(status, demo)[0].components.find((c) => c.custom_id === "knd:demo") as { disabled?: boolean } | undefined;
  assert.equal(knopf("Lead", null)?.disabled, false);
  assert.equal(knopf("Lead", "fertig")?.disabled, false, "nach einer fertigen Demo geht eine neue");
  assert.equal(knopf("Lead", "angefragt")?.disabled, true);
  assert.equal(knopf("Lead", "in Arbeit")?.disabled, true);
  assert.equal(knopf("Verloren", null), undefined, "im Archiv kein Demo-Knopf");
  assert.ok(kartenKnoepfe("Lead", null)[0].components.length <= 5, "höchstens 5 Knöpfe pro Reihe");
  assert.equal(knoepfePassen(kartenKnoepfe("Lead", null), "Lead", "angefragt"), false, "gesperrt/frei wird erkannt");
  assert.equal(knoepfePassen(kartenKnoepfe("Lead", "angefragt"), "Lead", "bestätigt"), true);
});

test("Rote Bestätigung", () => {
  const b = verlangt();
  function verlangt() {
    return demoBestaetigung("777");
  }
  const [ja, nein] = b.components[0].components;
  assert.equal(ja.style, 4);
  assert.equal(ja.label, "Sicher: Demo anfragen");
  assert.equal(ja.custom_id, "knd:demoja:777");
  assert.equal(nein.custom_id, "knd:demonein");
  assert.match(b.content, /nicht zurücknehmen/);
});

test("Aufruf aus der Zentrale prüfen", () => {
  assert.deepEqual(pruefeDemoAktion({ nr: "KND-003", aktion: "bestaetigen" }), { ok: true, nr: "KND-003", aktion: "bestaetigen", link: null });
  assert.deepEqual(pruefeDemoAktion({ nr: "KND-003", aktion: "fertig", link: "https://relax.agentsgilt.com" }), { ok: true, nr: "KND-003", aktion: "fertig", link: "https://relax.agentsgilt.com" });
  assert.equal(pruefeDemoAktion({ nr: "KND-003", aktion: "fertig" }).ok, false, "fertig braucht einen Link");
  assert.equal(pruefeDemoAktion({ nr: "KND-003", aktion: "fertig", link: "javascript:alert(1)" }).ok, false);
  assert.equal(pruefeDemoAktion({ nr: "KND-003", aktion: "fertig", link: "http://x.de" }).ok, false, "nur https");
  assert.equal(pruefeDemoAktion({ nr: "Relax", aktion: "bestaetigen" }).ok, false);
  assert.equal(pruefeDemoAktion({ nr: "KND-003", aktion: "loeschen" }).ok, false);
  assert.equal(pruefeDemoAktion(null).ok, false);
  assert.equal(statusNachAktion("bestaetigen"), "bestätigt");
  assert.equal(statusNachAktion("in-arbeit"), "in Arbeit");
  assert.equal(statusNachAktion("fertig"), "fertig");
});

test("Zeilen im Kanal und Push an David", () => {
  assert.equal(demoZeile("anfrage", { von: MIJO, zeit: "08.11.2026, 23:10" }), `🎨 **Demo angefragt** von <@${MIJO}> am 08.11.2026, 23:10. David bestätigt sie in der Zentrale.`);
  assert.equal(demoZeile("sofort", { von: "806859236768088114", zeit: "08.11.2026, 23:10" }), "🎨 **Demo gestartet** von <@806859236768088114> am 08.11.2026, 23:10.");
  assert.equal(demoZeile("bestaetigen", {}), "✅ **Demo bestätigt.** David bereitet sie vor.");
  assert.equal(demoZeile("in-arbeit", {}), "🔨 **Demo in Arbeit.**");
  assert.equal(demoZeile("fertig", { von: MIJO, link: "https://x.de" }), `🌐 **Die Demo ist fertig:** https://x.de\n<@${MIJO}>, schau sie dir an.`);
  assert.equal(demoZeile("fertig", { link: "https://x.de" }), "🌐 **Die Demo ist fertig:** https://x.de");
  assert.deepEqual(demoPush("KND-003 · Relax Fit", "Mijo"), { titel: "🎨 Demo-Anfrage", text: "Mijo möchte eine Demo für KND-003 · Relax Fit. Bitte in der Zentrale bestätigen." });
});

test("Erlaubte Schritte: angefragt → bestätigt → in Arbeit → fertig", async () => {
  const { erlaubteAktion } = await import("../lib/demo.ts");
  assert.equal(erlaubteAktion("angefragt", "bestaetigen"), true);
  assert.equal(erlaubteAktion("bestätigt", "bestaetigen"), false);
  assert.equal(erlaubteAktion("angefragt", "in-arbeit"), true);
  assert.equal(erlaubteAktion("bestätigt", "in-arbeit"), true);
  assert.equal(erlaubteAktion("in Arbeit", "fertig"), true);
  assert.equal(erlaubteAktion("bestätigt", "fertig"), true);
  assert.equal(erlaubteAktion("fertig", "fertig"), false, "schon fertig");
  assert.equal(erlaubteAktion(null, "bestaetigen"), false, "keine Anfrage");
});

test("Abbrechen: offene Anfrage zurücksetzen, die Person bekommt Bescheid", async () => {
  const m = await import("../lib/demo.ts");
  assert.deepEqual(m.pruefeDemoAktion({ nr: "KND-003", aktion: "ablehnen", grund: "  passt gerade nicht " }), { ok: true, nr: "KND-003", aktion: "ablehnen", link: null, grund: "passt gerade nicht" });
  assert.equal(m.erlaubteAktion("angefragt", "ablehnen"), true);
  assert.equal(m.erlaubteAktion("in Arbeit", "ablehnen"), true);
  assert.equal(m.erlaubteAktion("fertig", "ablehnen"), false);
  assert.equal(m.statusNachAktion("ablehnen"), null, "Demo-Status wird geleert");
  assert.equal(m.demoZeile("ablehnen", { von: MIJO }), `❌ **Demo-Anfrage abgebrochen.** <@${MIJO}>, David hat sie nicht bestätigt.`);
  assert.equal(m.demoZeile("ablehnen", { von: MIJO, grund: "erst Angebot" }), `❌ **Demo-Anfrage abgebrochen.** <@${MIJO}>, David hat sie nicht bestätigt. Grund: erst Angebot`);
});
