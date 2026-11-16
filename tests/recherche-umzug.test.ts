// Recherche-Thread bei Statuswechseln (16.11.2026, Davids Wunsch): Offen klappt ein, In Arbeit öffnet wieder
// (Mappe älter als 30 Tage → neu), Lead aktiv kopiert Mappe und Verlauf in den Kundenkanal. `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mitRecherche } from "../lib/lead-arbeit.ts";
import {
  FEHLVERSUCH,
  MAPPE_TAGE,
  NEUE_MAPPE,
  PLATZHALTER,
  aktuelleMappe,
  istUmgezogen,
  kundenNrAus,
  mappeVeraltet,
  mitUmzug,
  teileText,
  umzugFaellig,
  verlaufZeilen,
} from "../lib/recherche-umzug.ts";

// Discord-Kennung zu einer Zeit (Millisekunden) bauen
const idZu = (ms: number) => ((BigInt(ms) - BigInt(1420070400000)) << BigInt(22)).toString();
const TAG = 24 * 60 * 60 * 1000;
const jetzt = Date.UTC(2026, 10, 16, 12);

test("Mappe veraltet nach 30 Tagen, keine Mappe gilt als veraltet", () => {
  assert.equal(MAPPE_TAGE, 30);
  assert.equal(mappeVeraltet(idZu(jetzt - 29 * TAG), jetzt), false);
  assert.equal(mappeVeraltet(idZu(jetzt - 30 * TAG), jetzt), true);
  assert.equal(mappeVeraltet(null, jetzt), true);
});

test("Aktuelle Mappe: die neueste, aber nur nach dem letzten Neuaufbau-Hinweis; Fehlversuche ebenso", () => {
  const m = (id: string, mappe: boolean, text = "") => ({ id, mappe, text });
  assert.deepEqual(aktuelleMappe([m("1", false, "Hallo"), m("2", true), m("3", false, "Frage"), m("4", true)]), { mappeId: "4", fehlversuche: 0 });
  assert.deepEqual(aktuelleMappe([m("1", true), m("2", false, `${NEUE_MAPPE}, ich stelle eine neue zusammen.`)]), { mappeId: null, fehlversuche: 0 });
  assert.deepEqual(
    aktuelleMappe([m("0", false, `${FEHLVERSUCH}. x`), m("1", true), m("2", false, `${NEUE_MAPPE} …`), m("3", false, `${FEHLVERSUCH}. y`)]),
    { mappeId: null, fehlversuche: 1 },
  );
  assert.deepEqual(aktuelleMappe([]), { mappeId: null, fehlversuche: 0 });
});

test("Verlauf: Fragen und Antworten, ohne Bot-Hinweise", () => {
  const z = verlaufZeilen([
    { bot: true, name: "Bot", text: `<@1> ${PLATZHALTER} zu **X**, das dauert etwa eine Minute.` },
    { bot: false, name: "Mijo", text: "  Wer ist der Inhaber?  " },
    { bot: true, name: "Bot", text: "Laut Impressum Frau Muster." },
    { bot: true, name: "Bot", text: "👥 <@2> ist dazugekommen." },
    { bot: true, name: "Bot", text: "<@1> Wie weit bist du mit **X**? Setz den Lead auf Kontaktiert oder Offen." },
    { bot: true, name: "Bot", text: `${FEHLVERSUCH}. Ich versuche es gleich noch einmal.` },
    { bot: true, name: "Bot", text: `${NEUE_MAPPE}, ich stelle eine neue zusammen.` },
    { bot: false, name: "Mijo", text: "" },
  ]);
  assert.deepEqual(z, ["Mijo: Wer ist der Inhaber?", "Bot: Laut Impressum Frau Muster."]);
});

test("Text in Stücke für Discord teilen (je höchstens max Zeichen, Zeilen bleiben ganz)", () => {
  assert.deepEqual(teileText(["aaa", "bbb", "ccc"], 8), ["aaa\nbbb", "ccc"]);
  assert.deepEqual(teileText([], 8), []);
  const lang = "x".repeat(20);
  assert.ok(teileText([lang], 8).every((s) => s.length <= 8));
});

test("Umzug merken und erkennen; Kundennummer von der Karte", () => {
  const e = mitRecherche({ title: "Firma", fields: [{ name: "Notion", value: "KND-012 · [In Notion öffnen](https://notion.so/x)" }] }, "111");
  assert.equal(istUmgezogen(e), false);
  assert.equal(kundenNrAus(e), "KND-012");
  assert.equal(umzugFaellig(e, "Lead aktiv"), true);
  assert.equal(umzugFaellig(e, "Kontaktiert"), false);
  const u = mitUmzug(e, "222");
  assert.equal(istUmgezogen(u), true);
  assert.equal(umzugFaellig(u, "Lead aktiv"), false);
  assert.match(u.fields?.find((f) => f.name === "🔎 Recherche")?.value ?? "", /^<#111>.*<#222>/);
  assert.equal(umzugFaellig({ title: "ohne Thread", fields: [{ name: "Notion", value: "KND-012 · angelegt" }] }, "Lead aktiv"), false);
  assert.equal(kundenNrAus({ fields: [{ name: "Notion", value: "angelegt" }] }), null);
});
