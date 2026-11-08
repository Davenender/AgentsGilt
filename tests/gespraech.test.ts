// Tests für Gesprächsbogen und „Gespräch auswerten“ (Plan 1, Etappe 4): `npm test`.
// Nur reine Logik, nichts fragt die KI, Notion oder Discord.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bloeckeAlsText,
  BOGEN_TITEL,
  bogenBloecke,
  ergebnisBlock,
  ergebnisKarte,
  feldAenderungen,
  findeBogen,
  findeErgebnis,
  guthabenLeer,
  notizenText,
  pruefeAuswertung,
  type RohBlock,
} from "../lib/gespraech.ts";

const rt = (t: string) => [{ plain_text: t, text: { content: t } }];
const b = (id: string, type: string, text: string, extra: Record<string, unknown> = {}): RohBlock => ({ id, type, [type]: { rich_text: rt(text), ...extra } });

/** So sieht ein ausgefüllter Bogen aus, wie Notion ihn zurückgibt. */
const seite: RohBlock[] = [
  b("a1", "paragraph", "Friseur in Mühlheim, Website veraltet."),
  b("h2", "heading_2", BOGEN_TITEL),
  b("h3a", "heading_3", "1. Vor dem Gespräch"),
  b("q1", "to_do", "Was ist die teuerste oder nervigste wiederkehrende Aufgabe?", { checked: true }),
  b("q2", "to_do", "Budget?", { checked: false }),
  b("h3n", "heading_3", "4. Notizen"),
  b("hint", "callout", "✍️ Hier drunter während des Gesprächs mitschreiben (auch am Handy in der Notion-App)."),
  b("n1", "paragraph", "Chefin: Frau Graziella, entscheidet allein."),
  { ...b("n2", "bulleted_list_item", "Telefon klingelt ständig"), kinder: [b("n3", "bulleted_list_item", "ca. 30 Anrufe pro Woche")] },
  b("n4", "paragraph", ""),
  b("h3e", "heading_3", "5. Ergebnis"),
  b("e0", "paragraph", "Wird von „🧠 Gespräch auswerten“ ausgefüllt."),
  b("alt", "callout", "🧠 Auswertung vom 01.11.2026, 10:00 (von David)"),
];

test("Bogen: Aufbau nach Kurs Modul 10 mit Notizen und Ergebnis", () => {
  const bloecke = bogenBloecke();
  const titel = bloecke.filter((x) => x.type.startsWith("heading")).map((x) => (x as never as { [k: string]: { rich_text: { text: { content: string } }[] } })[x.type].rich_text[0].text.content);
  assert.deepEqual(titel, [BOGEN_TITEL, "1. Vor dem Gespräch", "2. Leitfaden (Kurs Modul 10.1)", "3. Fragen", "4. Notizen", "5. Ergebnis"]);
  const text = JSON.stringify(bloecke);
  for (const muss of ["Was kostet euch das", "außerhalb der Öffnungszeiten", "Wer müsste intern zustimmen", "Budget", "Zeitrahmen", "Logo", "Impressum", "Domain", "§ 201 StGB"]) {
    assert.ok(text.includes(muss), muss);
  }
  assert.ok(bloecke.length <= 100, "Notion nimmt höchstens 100 Blöcke auf einmal");
  assert.ok(bloecke.some((x) => x.type === "to_do"), "Fragen zum Abhaken");
});

test("Bogen und Ergebnis in der Seite finden", () => {
  assert.equal(findeBogen(seite), "h2");
  assert.equal(findeBogen([b("x", "paragraph", "nichts")]), null);
  assert.deepEqual(findeErgebnis(seite), { ueberschrift: "h3e", alte: ["alt"] });
  assert.deepEqual(findeErgebnis([]), { ueberschrift: null, alte: [] });
});

test("Notizen: nur der Abschnitt 4, ohne den Hinweis, mit Unterpunkten", () => {
  assert.equal(notizenText(seite), "Chefin: Frau Graziella, entscheidet allein.\n- Telefon klingelt ständig\n  - ca. 30 Anrufe pro Woche");
  assert.equal(notizenText(bogenBloecke().map((x, i) => ({ id: String(i), ...x }) as RohBlock)), "", "leerer Bogen hat keine Notizen");
});

test("Ganze Seite als Text für die KI (Häkchen sichtbar)", () => {
  const t = bloeckeAlsText(seite);
  assert.match(t, /^Friseur in Mühlheim/);
  assert.match(t, /## 🗣️ Gesprächsbogen/);
  assert.match(t, /\[x\] Was ist die teuerste/);
  assert.match(t, /\[ \] Budget\?/);
  assert.match(t, /  - ca\. 30 Anrufe/);
});

const OPT = { angebote: ["Websites und Landingpages", "Voice-Agent", "Sonstiges"], quellen: ["Persönlich vor Ort", "Website / Chatbot", "Sonstiges"] };

test("Auswertung prüfen: nur erlaubte Werte, Datum nicht in der Vergangenheit", () => {
  const a = pruefeAuswertung(
    {
      zusammenfassung: "Gutes Gespräch.",
      produkt: "Voice-Agent für Anrufe",
      bedarf: "30 Anrufe pro Woche",
      entscheider: "Frau Graziella",
      einwand: "zu teuer?",
      naechster_schritt: "Angebot schicken",
      follow_up: "2026-11-12",
      angebot: "Voice-Agent",
      quelle: "Persönlich vor Ort",
      status: "Kunde",
    },
    OPT,
    "2026-11-08",
  );
  assert.deepEqual(a, {
    zusammenfassung: "Gutes Gespräch.",
    produkt: "Voice-Agent für Anrufe",
    bedarf: "30 Anrufe pro Woche",
    entscheider: "Frau Graziella",
    einwand: "zu teuer?",
    naechsterSchritt: "Angebot schicken",
    followUp: "2026-11-12",
    angebot: "Voice-Agent",
    quelle: "Persönlich vor Ort",
  });
  const b2 = pruefeAuswertung({ zusammenfassung: "x", follow_up: "2026-11-01", angebot: "Raketen", quelle: "Telepathie", einwand: "" }, OPT, "2026-11-08");
  assert.equal(b2?.followUp, null, "Vergangenheit");
  assert.equal(b2?.angebot, null, "unbekanntes Angebot");
  assert.equal(b2?.quelle, null);
  assert.equal(b2?.einwand, null, "leer wird null");
  assert.equal(pruefeAuswertung({ follow_up: "morgen" }, OPT, "2026-11-08"), null, "ohne Zusammenfassung unbrauchbar");
  assert.equal(pruefeAuswertung(null, OPT, "2026-11-08"), null);
  assert.equal(pruefeAuswertung({ zusammenfassung: "x", follow_up: "2026-13-45" }, OPT, "2026-11-08")?.followUp, null, "kein echtes Datum");
});

test("Felder: Nächster Schritt und Follow-up ersetzen, Angebot und Quelle nur wenn leer, sonst nichts", () => {
  const a = pruefeAuswertung(
    { zusammenfassung: "x", naechster_schritt: "Angebot schicken", follow_up: "2026-11-12", angebot: "Voice-Agent", quelle: "Persönlich vor Ort" },
    OPT,
    "2026-11-08",
  )!;
  const leer = feldAenderungen(a, { angebot: null, quelle: null });
  assert.deepEqual(Object.keys(leer.properties).sort(), ["Angebot", "Nächster Schritt", "Nächstes Follow-up", "Quelle"]);
  assert.deepEqual(leer.properties["Nächstes Follow-up"], { date: { start: "2026-11-12" } });
  assert.deepEqual(leer.properties["Angebot"], { select: { name: "Voice-Agent" } });
  const voll = feldAenderungen(a, { angebot: "Websites und Landingpages", quelle: "Sonstiges" });
  assert.deepEqual(Object.keys(voll.properties).sort(), ["Nächster Schritt", "Nächstes Follow-up"]);
  assert.deepEqual(voll.geaendert, ["Nächster Schritt", "Nächstes Follow-up"]);
  for (const nie of ["Status", "Zuständig", "Setup-Preis (€)", "Retainer (€/Monat)", "Angebot raus"]) assert.equal(nie in leer.properties, false, nie);
  const nichts = feldAenderungen(pruefeAuswertung({ zusammenfassung: "x" }, OPT, "2026-11-08")!, { angebot: null, quelle: null });
  assert.deepEqual(nichts.properties, {});
});

test("Ergebnis-Block in Notion und Karte im Kundenkanal", () => {
  const a = pruefeAuswertung({ zusammenfassung: "Gutes Gespräch.", produkt: "Voice-Agent", naechster_schritt: "Angebot schicken", follow_up: "2026-11-12" }, OPT, "2026-11-08")!;
  const block = ergebnisBlock(a, "David", "08.11.2026, 22:00");
  assert.equal(block.type, "callout");
  const json = JSON.stringify(block);
  assert.match(json, /🧠 Auswertung vom 08\.11\.2026, 22:00 \(von David\)/);
  assert.match(json, /Gutes Gespräch/);
  assert.match(json, /Nächster Schritt: Angebot schicken/);
  assert.match(json, /Follow-up: 12\.11\.2026/);
  assert.equal(json.includes("Einwand"), false, "leere Punkte fehlen");

  const karte = ergebnisKarte(a, "KND-002 · Friseur Graziella", "https://www.notion.so/abc");
  assert.equal(karte.title, "🧠 Gesprächsauswertung · KND-002 · Friseur Graziella");
  assert.equal(karte.description, "Gutes Gespräch.");
  assert.deepEqual(karte.fields?.map((f) => f.name), ["Produkt", "Nächster Schritt", "Follow-up", "Notion"]);
  assert.match(karte.fields?.[3].value ?? "", /\(https:\/\/www\.notion\.so\/abc\)/);
  assert.match(karte.footer?.text ?? "", /KI-Auswertung/);
});

test("Leeres KI-Guthaben wird erkannt", () => {
  assert.equal(guthabenLeer("400 {\"type\":\"error\",\"error\":{\"message\":\"Your credit balance is too low to access the Anthropic API.\"}}"), true);
  assert.equal(guthabenLeer("Kein ANTHROPIC_API_KEY"), false);
  assert.equal(guthabenLeer("overloaded"), false);
});
