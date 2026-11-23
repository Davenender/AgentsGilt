// Tests für die Anleitungen in #willkommen: `npm test`. Nur reine Logik.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANLEITUNGEN, LEAD_BEFEHLE_TEXT, alsEmbed, planePlaetze, planeReihenfolge, planeWillkommen, gleich, pruefeLaengen, type Anleitung } from "../lib/willkommen.ts";

const a = (titel: string, sucht: string[] = [], nurWennDa = false): Anleitung => ({ titel, sucht, text: "x", nurWennDa });

test("vorhandene Bot-Nachricht wird über den Titelanfang gefunden und geändert", () => {
  const plan = planeWillkommen(
    [{ id: "1", bot: true, titel: "📖 Anleitung: Anrufe (Karten in #anrufe)" }],
    [a("📖 Anleitung: Anrufe", ["📖 Anleitung: Anrufe"])],
  );
  assert.deepEqual(plan, [{ art: "aendern", id: "1", titel: "📖 Anleitung: Anrufe" }]);
});

test("fehlende Anleitung wird neu angelegt, außer sie soll nur geändert werden", () => {
  const plan = planeWillkommen([], [a("📖 Neu"), a("📖 Lead-Suche", ["📖 Anleitung: Lead-Suche"], true)]);
  assert.deepEqual(plan, [
    { art: "neu", titel: "📖 Neu" },
    { art: "auslassen", titel: "📖 Lead-Suche" },
  ]);
});

test("Nachrichten von Menschen werden nie angefasst", () => {
  const plan = planeWillkommen([{ id: "1", bot: false, titel: "📖 Neu" }], [a("📖 Neu")]);
  assert.deepEqual(plan, [{ art: "neu", titel: "📖 Neu" }]);
});

test("jede Nachricht wird höchstens einmal benutzt, Groß-/Kleinschreibung egal", () => {
  const plan = planeWillkommen(
    [{ id: "1", bot: true, titel: "Die wichtigsten Kanäle" }],
    [a("Die wichtigsten Kanäle", ["die WICHTIGSTEN kanäle"]), a("Kanäle 2", ["Die wichtigsten"])],
  );
  assert.deepEqual(plan, [
    { art: "aendern", id: "1", titel: "Die wichtigsten Kanäle" },
    { art: "neu", titel: "Kanäle 2" },
  ]);
});

test("der eigene Titel zählt immer als Suchwort", () => {
  const plan = planeWillkommen([{ id: "9", bot: true, titel: "📖 Anleitung: Akademie" }], [a("📖 Anleitung: Akademie")]);
  assert.equal(plan[0].art, "aendern");
});

test("Längenprüfung meldet zu lange Texte und Felder", () => {
  const lang: Anleitung = { titel: "T", sucht: [], text: "x".repeat(4097) };
  const feld: Anleitung = { titel: "F", sucht: [], felder: [{ name: "n", value: "y".repeat(1025) }] };
  assert.equal(pruefeLaengen([lang, feld]).length, 2);
});

test("alle echten Anleitungen passen in Discord-Grenzen und haben eindeutige Titel", () => {
  assert.deepEqual(pruefeLaengen(ANLEITUNGEN), []);
  const titel = ANLEITUNGEN.map((x) => x.titel);
  assert.equal(new Set(titel).size, titel.length);
  assert.ok(ANLEITUNGEN.length >= 8);
});

test("die Anleitungen nennen die aktuellen Fakten", () => {
  const alles = ANLEITUNGEN.map((x) => `${x.text ?? ""} ${(x.felder ?? []).map((f) => f.value).join(" ")}`).join(" ");
  assert.match(alles, /Handys des Teams/);
  assert.doesNotMatch(alles, /Mijo|Jakob/, "keine festen Namen (Team-Register, Plan 4)");
  assert.doesNotMatch(alles, /noch nicht automatisiert/);
  assert.match(alles, /Stripe/);
  assert.match(alles, /Gesprächsbogen/);
  assert.match(alles, /Akademie/);
  assert.match(alles, /#statistik/);
  // 09.11.: /lead hat nur noch ein Feld, der Bot erkennt Website, Maps-Link oder Firma mit Ort selbst
  assert.match(alles, /\/lead Bäckerei Schmitt Mühlheim am Main/);
  assert.match(alles, /bis zu drei/);
  assert.doesNotMatch(alles, /\/lead name:/);
});

test("alsEmbed baut ein Embed mit Titel, Text, Feldern und Farbe", () => {
  const e = alsEmbed({ titel: "T", sucht: [], text: "t", felder: [{ name: "n", value: "v" }] }, 1);
  assert.deepEqual(e, { title: "T", description: "t", color: 1, fields: [{ name: "n", value: "v", inline: false }] });
  assert.deepEqual(alsEmbed({ titel: "T", sucht: [], text: "t" }, 2), { title: "T", description: "t", color: 2 });
});

test("Reihenfolge: vorhandene Nachrichten werden der Reihe nach neu belegt, der Rest kommt hinten dazu", () => {
  const nachrichten = [
    { id: "1", bot: true, titel: "A" },
    { id: "x", bot: false, titel: "von David" },
    { id: "2", bot: true, titel: "C" },
  ];
  const plan = planeReihenfolge(nachrichten, [a("A"), a("B"), a("C")]);
  assert.deepEqual(plan, [
    { art: "aendern", id: "1", titel: "A" },
    { art: "aendern", id: "2", titel: "B" },
    { art: "neu", titel: "C" },
  ]);
});

test("Reihenfolge verweigert, wenn eine Bot-Nachricht zu keiner Anleitung gehört", () => {
  assert.equal(planeReihenfolge([{ id: "1", bot: true, titel: "Fremd" }], [a("A")]), null);
});

test("Reihenfolge lässt Anleitungen aus, die nur geändert werden sollen und fehlen", () => {
  const plan = planeReihenfolge([{ id: "1", bot: true, titel: "A" }], [a("A"), a("L", [], true), a("B")]);
  assert.deepEqual(plan, [
    { art: "aendern", id: "1", titel: "A" },
    { art: "auslassen", titel: "L" },
    { art: "neu", titel: "B" },
  ]);
});

test("Plätze: Bot-Nachrichten werden streng der Reihe nach belegt, auch bei doppelten Titeln", () => {
  const n = [
    { id: "1", bot: true, titel: "A" },
    { id: "2", bot: true, titel: "A" },
    { id: "m", bot: false, titel: "Mensch" },
    { id: "3", bot: true, titel: "Z" },
  ];
  assert.deepEqual(planePlaetze(n, [a("A"), a("B"), a("C"), a("D")]), [
    { art: "aendern", id: "1", titel: "A" },
    { art: "aendern", id: "2", titel: "B" },
    { art: "aendern", id: "3", titel: "C" },
    { art: "neu", titel: "D" },
  ]);
});

test("Plätze verweigert, wenn es mehr Bot-Nachrichten als Anleitungen gibt", () => {
  assert.equal(planePlaetze([{ id: "1", bot: true, titel: "A" }, { id: "2", bot: true, titel: "B" }], [a("A")]), null);
});

test("gleich erkennt, ob eine Nachricht schon den gewünschten Inhalt hat", () => {
  const soll = { title: "T", description: "d", color: 1, fields: [{ name: "n", value: "v", inline: false }] };
  assert.equal(gleich({ title: "T", description: "d", fields: [{ name: "n", value: "v" }] }, soll), true);
  assert.equal(gleich({ title: "T", description: "anders" }, soll), false);
  assert.equal(gleich({ title: "T", description: "d" }, { title: "T", description: "d", color: 1 }), true);
});

test("Anleitung in #lead-befehle: /lead mit einem Feld, /lead-delete nur für David, passt in eine Nachricht", () => {
  assert.match(LEAD_BEFEHLE_TEXT, /^\*\*Anleitung: Lead-Karten\*\*/);
  assert.match(LEAD_BEFEHLE_TEXT, /\/lead Bäckerei Schmitt Mühlheim am Main/);
  assert.match(LEAD_BEFEHLE_TEXT, /bis zu drei/);
  assert.match(LEAD_BEFEHLE_TEXT, /Ein \*\*Passt\*\* reicht/);
  assert.doesNotMatch(LEAD_BEFEHLE_TEXT, /link:|name:/);
  assert.match(LEAD_BEFEHLE_TEXT, /`\/lead-delete` mit Website, Maps-Link oder Firma und Ort/);
  assert.ok(LEAD_BEFEHLE_TEXT.length <= 2000);
});

// Etappe 1 (16.11.2026): Anruf anbieten und der Chat, der 24 Stunden bleibt.
test("Support-Chat erklärt Anruf anbieten und die 24 Stunden", () => {
  const support = ANLEITUNGEN.find((x) => x.titel === "📖 Anleitung: Support-Chat auf der Website");
  const text = [support?.text ?? "", ...(support?.felder ?? []).map((f) => f.value)].join("\n");
  assert.match(text, /📞 Anruf anbieten/);
  assert.match(text, /innerhalb von 24 Stunden zurück/);
  assert.doesNotMatch(text, /Antworten kommen nur an, solange er im Chat ist/);
  assert.match(text, /schreibt er danach wieder mit dem KI-Assistenten/);
});

// Prompt 17 (23.11.2026): Chat-Schutz. Kurz im Stil „Gut zu wissen“, die Karte wird geändert (sucht), nicht neu gepostet.
test("Support-Chat erklärt Sperre, Entsperren, Schnellantwort, Beleidigung und Bündeln", () => {
  const support = ANLEITUNGEN.find((x) => x.titel === "📖 Anleitung: Support-Chat auf der Website");
  assert.deepEqual(support?.sucht, ["📖 Anleitung: Support-Chat"]);
  const text = support?.text ?? "";
  const gut = text.slice(text.indexOf("**Gut zu wissen**"));
  for (const teil of [
    /• \*\*💬 Schnellantwort:\*\*/,
    /Sperr-Karte mit \*\*Entsperren\*\* und \*\*Chat beenden\*\*/,
    /mehr als 10 Nachrichten in einer Minute, dreimal dasselbe oder viermal Tastengewirr/,
    /sperrt Spam 5 Minuten lang/,
    /bis zum Entsperren/,
    /• \*\*⚠️ Beleidigung:\*\* Jede Nachricht prüft eine KI/,
    /„Bitte bleib freundlich\.“, beim zweiten Mal sperrt das Ticket/,
    /innerhalb von 3 Sekunden schreibt, kommt als eine Nachricht/,
  ]) {
    assert.match(gut, teil);
  }
  // Keine Namen aus dem Team in den Zeilen.
  assert.doesNotMatch(gut, /David|Jakob|Mijo/);
  assert.deepEqual(pruefeLaengen([support!]), []);
});

// Prompt 18 (23.11.2026): erst übernehmen, nur der Übernehmer schreibt, //, Abschluss, 3 Stunden, Dauerhaft sperren, Sperren mit Beleg.
test("Support-Chat erklärt den Ablauf von Prompt 18 kurz im Stil „Gut zu wissen“ (Karte wird geändert, nicht neu gepostet)", () => {
  const support = ANLEITUNGEN.find((x) => x.titel === "📖 Anleitung: Support-Chat auf der Website");
  assert.deepEqual(support?.sucht, ["📖 Anleitung: Support-Chat"]);
  const text = support?.text ?? "";
  for (const teil of [
    /\*\*Erst übernehmen:\*\*/,
    /• \*\*Nur wer übernommen hat:\*\* Alle Knöpfe am Ticket gehen nur für ihn/,
    /löscht der Bot die Nachricht\. Sie geht nie an den Kunden/,
    /• \*\*Interne Notiz:\*\* Nachricht mit `\/\/` beginnen\. Sie bleibt stehen/,
    /\*\*Noch Fragen\?\*\*.*\*\*Abschluss\*\*.*Erst danach geht \*\*Ticket schließen\*\*/,
    /• \*\*3 Stunden:\*\*.*Abschluss nach 3 Stunden trotzdem.*Schließen erst nach 3 Stunden/,
    /• \*\*Dauerhaft sperren:\*\*.*ohne Uhr, bis ihr entsperrt/,
    /• \*\*🔒 Sperren von Hand, nur mit Beleg:\*\*.*Findet sie nichts, wird nicht gesperrt/,
    /Chat trotzdem beenden/,
    /Einen gesperrten Kunden könnt ihr jederzeit beenden/,
  ]) {
    assert.match(text, teil);
  }
  assert.doesNotMatch(text, /David|Jakob|Mijo/);
  // Kein Rückruf durch das Team.
  assert.doesNotMatch(text, /wir rufen (dich|Sie|ihn) (zurück|an)/i);
  assert.deepEqual(pruefeLaengen([support!]), []);
});

// Etappe 2 (16.11.2026): Mails an Kunden laufen über Discord, nicht mehr über Gmail.
test("Anleitung „Mails an Kunden“ und kein Gmail-Antworten mehr", () => {
  const alle = ANLEITUNGEN.map((x) => [x.text ?? "", ...(x.felder ?? []).map((f) => f.value)].join("\n")).join("\n");
  const mails = ANLEITUNGEN.find((x) => x.titel === "📖 Anleitung: Mails an Kunden");
  assert.ok(mails, "Anleitung fehlt");
  assert.match(mails.text ?? "", /📧 Mail geht raus/);
  assert.match(mails.text ?? "", /Bearbeiten & senden/);
  assert.match(mails.text ?? "", /§ 7 UWG/);
  assert.doesNotMatch(alle, /in Gmail auf \*\*Antworten\*\*/);
  assert.doesNotMatch(alle, /Geantwortet wird weiterhin direkt in Gmail/);
  const i = ANLEITUNGEN.findIndex((x) => x.titel === "📖 Anleitung: Mails an Kunden");
  assert.equal(ANLEITUNGEN[i + 1]?.titel, "📖 Anleitung: Mails und Zahlungen");
  assert.deepEqual(pruefeLaengen(ANLEITUNGEN), []);
});

// Etappe 3 (16.11.2026): Leads „In Arbeit“ mit Recherche-Thread.
test("Lead-Anleitungen erklären Reihenfolge, eine Firma und den Recherche-Thread", () => {
  const lead = ANLEITUNGEN.find((x) => x.titel.startsWith("📖 Anleitung: Lead-Karten"));
  const t = [lead?.text ?? "", ...(lead?.felder ?? []).map((f) => f.value)].join("\n");
  assert.match(t, /erst nach \*\*In Arbeit\*\*/);
  assert.match(t, /nur eine Firma gleichzeitig/);
  assert.match(t, /🔎/);
  assert.match(t, /👥 Einladen/);
  assert.match(t, /nach 2 Tagen/);
  const befehle = String(LEAD_BEFEHLE_TEXT);
  assert.match(befehle, /🔎 Recherche/);
  assert.deepEqual(pruefeLaengen(ANLEITUNGEN), []);
});

// Etappe 4 (16.11.2026): Knöpfe auf der Kundenkarte und der Ablauf eines Kundengesprächs.
test("Kundenkarte: neue Knöpfe und Gesprächsablauf erklärt", () => {
  const karte = ANLEITUNGEN.find((x) => x.titel === "📖 Anleitung: Kundenkanal und Kundenkarte");
  const t = karte?.text ?? "";
  for (const k of ["📌 Nächster Schritt", "✏️ Kontakt", "📧 E-Mail", "✅ Checkliste", "⭐ Zufriedenheit"]) assert.match(t, new RegExp(k), k);
  const gespraech = ANLEITUNGEN.find((x) => x.titel === "📖 Anleitung: So läuft ein Kundengespräch");
  assert.ok(gespraech, "Anleitung zum Gespräch fehlt");
  assert.match(gespraech.text ?? "", /📝 Gesprächsbogen/);
  assert.match(gespraech.text ?? "", /🧠 Gespräch auswerten/);
  assert.match(gespraech.text ?? "", /Notizen/);
  const i = ANLEITUNGEN.findIndex((x) => x.titel === "📖 Anleitung: Kundenkanal und Kundenkarte");
  assert.equal(ANLEITUNGEN[i + 1]?.titel, "📖 Anleitung: So läuft ein Kundengespräch");
  assert.deepEqual(pruefeLaengen(ANLEITUNGEN), []);
});
