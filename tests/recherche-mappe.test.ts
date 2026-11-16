// Recherche-Mappe (Etappe 3, 16.11.2026): Prüfung der KI-Antwort und Aufbereitung für Discord und Notion.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FRAGE_PROMPT, MAPPE_PROMPT, antwortAlsNachricht, antwortMitQuellen, embedsAlsText, istMappe, mappeAlsText, mappeEmbeds, pruefeMappe } from "../lib/recherche-mappe.ts";

const roh = {
  profil: "Friseursalon in Mühlheim, Inhaberin Anna Weber.",
  anrufzeit: "Di–Do 14–16 Uhr",
  bewertungen: "4,6 Sterne bei 87 Bewertungen. Lob: Beratung. Kritik: telefonisch schwer erreichbar.",
  website: "• am Handy schwer lesbar\n• keine Online-Buchung",
  leistung: "Online-Terminbuchung, weil viele Kunden anrufen.",
  einstieg: ["Guten Tag Frau Weber, …", "Ich habe gesehen, dass …"],
  fragen: ["Wie buchen Ihre Kunden heute?", "Wie viele Anrufe am Tag?", "Wer entscheidet mit?"],
  einwaende: [{ einwand: "Keine Zeit", antwort: "Dauert nur 10 Minuten." }, { einwand: "Zu teuer", antwort: "Rechnet sich über weniger Telefonzeit." }],
  demo: true,
};

test("gültige Mappe kommt durch", () => {
  const m = pruefeMappe(roh);
  assert.ok(m);
  assert.equal(m.einstieg.length, 2);
  assert.equal(m.einwaende[1].einwand, "Zu teuer");
  assert.equal(m.demoHinweis, true);
});

test("ohne Profil oder Einstieg unbrauchbar", () => {
  assert.equal(pruefeMappe({ ...roh, profil: "" }), null);
  assert.equal(pruefeMappe({ ...roh, einstieg: [] }), null);
  assert.equal(pruefeMappe(null), null);
});

test("Preise sind gesperrt", () => {
  assert.equal(pruefeMappe({ ...roh, leistung: "Website für 990 € ist ideal." }), null);
});

test("Embeds bleiben unter den Discord-Grenzen", () => {
  const lang = pruefeMappe({ ...roh, profil: "x".repeat(5000), website: "y".repeat(3000), fragen: ["z".repeat(2000), "a", "b"] })!;
  const e = mappeEmbeds(lang, "Salon Weber");
  let summe = 0;
  for (const x of e) {
    assert.ok((x.title ?? "").length <= 256);
    assert.ok((x.description ?? "").length <= 4096);
    for (const f of x.fields ?? []) assert.ok(f.value.length <= 1024 && f.value.length > 0);
    summe += (x.title ?? "").length + (x.description ?? "").length + (x.fields ?? []).reduce((s, f) => s + f.name.length + f.value.length, 0) + (x.footer?.text.length ?? 0);
  }
  assert.ok(summe <= 6000, `zu lang: ${summe}`);
});

test("ohne Bewertungen fehlt der Abschnitt ganz", () => {
  const e = mappeEmbeds(pruefeMappe({ ...roh, bewertungen: null })!, "Salon Weber");
  assert.equal(e.flatMap((x) => x.fields ?? []).some((f) => f.name.includes("Bewertungen")), false);
});

test("als Text für Notion und für Fragen im Thread", () => {
  const m = pruefeMappe(roh)!;
  const t = mappeAlsText(m);
  assert.match(t, /Guten Tag Frau Weber/);
  assert.match(t, /Zu teuer/);
  const e = mappeEmbeds(m, "Salon Weber");
  assert.equal(istMappe(e[0]), true);
  assert.equal(istMappe({ title: "Lead" }), false);
  assert.match(embedsAlsText(e), /telefonisch schwer erreichbar/);
});

test("Prompt: nichts erfinden, keine Preise", () => {
  assert.match(MAPPE_PROMPT, /Erfinde nichts/);
  assert.match(MAPPE_PROMPT, /keine Preise/i);
});

// Probe 16.11.: „Wir haben schon eine Website bei STRATO.: …“ und „vom Team Agents“
test("Einwände ohne Satzzeichen am Ende, Prompt nennt den vollen Namen", () => {
  const m = pruefeMappe({ ...roh, einwaende: [{ einwand: "Wir haben schon eine Website.", antwort: "Verstehe." }, { einwand: "Keine Zeit!", antwort: "Kurz." }] })!;
  assert.equal(m.einwaende[0].einwand, "Wir haben schon eine Website");
  assert.equal(m.einwaende[1].einwand, "Keine Zeit");
  assert.match(MAPPE_PROMPT, /Agents Gilt \(immer der volle Name\)/);
});

// 16.11.: Fragen im Thread werden wirklich recherchiert (Websuche), mit Quellen.
test("Antwort und Quellen aus der Antwort mit Websuche", () => {
  const inhalt = [
    { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "Fantasia 1 Offenbach Inhaber" } },
    { type: "web_search_tool_result", tool_use_id: "s1", content: [] },
    {
      type: "text",
      text: "Laut Impressum auf Lieferando ist Inhaber Marco Rossi.",
      citations: [
        { type: "web_search_result_location", url: "https://www.lieferando.de/speisekarte/fantasia-1", title: "Fantasia 1 | Lieferando", cited_text: "Inhaber: Marco Rossi" },
        { type: "web_search_result_location", url: "https://www.lieferando.de/speisekarte/fantasia-1", title: "doppelt", cited_text: "x" },
      ],
    },
    { type: "text", text: " Frag beim Anruf am besten nach ihm.", citations: null },
  ];
  const a = antwortMitQuellen(inhalt);
  assert.equal(a.text, "Laut Impressum auf Lieferando ist Inhaber Marco Rossi. Frag beim Anruf am besten nach ihm.");
  assert.deepEqual(a.quellen, ["https://www.lieferando.de/speisekarte/fantasia-1"]);
  assert.match(antwortAlsNachricht(a), /Quelle: <https:\/\/www\.lieferando\.de\/speisekarte\/fantasia-1>/);
  assert.equal(antwortAlsNachricht({ text: "Nichts gefunden.", quellen: [] }), "Nichts gefunden.");
});

test("Fragen-Prompt: recherchieren, Quellen nennen, keine toten Seiten, keine Privatdaten", () => {
  assert.match(FRAGE_PROMPT, /Websuche/);
  assert.match(FRAGE_PROMPT, /Lieferando/);
  assert.match(FRAGE_PROMPT, /nicht erreichbar/);
  assert.match(FRAGE_PROMPT, /privat/i);
});

// Probe 16.11.: „… schaue ich in anderen Quellen nach.Laut dem Impressum …“
test("Textteile mit Leerzeichen verbinden, Prompt verbietet Erzählen", () => {
  const a = antwortMitQuellen([
    { type: "text", text: "Die Mappe nennt keinen Inhaber." },
    { type: "server_tool_use" },
    { type: "text", text: "Laut Impressum ist es Herr Daglik.", citations: null },
    { type: "text", text: " Er ist seit 2019 Inhaber.", citations: null },
  ]);
  assert.equal(a.text, "Die Mappe nennt keinen Inhaber. Laut Impressum ist es Herr Daglik. Er ist seit 2019 Inhaber.");
  assert.match(FRAGE_PROMPT, /Erzähl nicht, was du tust/);
});

test("Erzählsätze am Anfang fallen weg", () => {
  const a = antwortMitQuellen([
    { type: "text", text: "Die Mappe nennt keinen Inhaber, deshalb schaue ich zuerst bei den Lieferdiensten nach. Laut Impressum ist Abbas Daglik der Inhaber." },
  ]);
  assert.equal(a.text, "Laut Impressum ist Abbas Daglik der Inhaber.");
  const b = antwortMitQuellen([{ type: "text", text: "Ich suche kurz. Ich recherchiere weiter. Er heißt Daglik." }]);
  assert.equal(b.text, "Er heißt Daglik.");
  const c = antwortMitQuellen([{ type: "text", text: "Die beste Zeit ist 14 Uhr. Ich schaue morgen nochmal nach." }]);
  assert.equal(c.text, "Die beste Zeit ist 14 Uhr. Ich schaue morgen nochmal nach.");
});
