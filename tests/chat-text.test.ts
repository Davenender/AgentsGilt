// Chat der Website: Marker des Assistenten (unverändert aus dem bisherigen Fenster) und die
// Text-Regeln des neuen Glasfensters (Wörter, Welle des Entschlüsselns, Links, Telefonnummern).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  GREETING,
  STARTER_QUESTIONS,
  WANTS_HUMAN,
  ZEICHEN_WECHSEL,
  aiHistory,
  angebote,
  parseDaten,
  reichTeile,
  stripMarkers,
  wellenPlan,
  woerter,
  type Message,
} from "../lib/chat-text.ts";

test("Marker des Assistenten erscheinen nie im Text, auch nicht halb angekommen", () => {
  assert.equal(stripMarkers("Das klären wir persönlich. [KONTAKT] [MITARBEITER]"), "Das klären wir persönlich.");
  assert.equal(stripMarkers("Termine machen wir am Telefon aus. [ANRUFEN] [MITARBEITER]"), "Termine machen wir am Telefon aus.");
  assert.equal(stripMarkers("Termine machen wir am Telefon aus. [ANRU"), "Termine machen wir am Telefon aus.");
  assert.equal(stripMarkers('Gern. [DATEN]{"name":"Erika"}[/DATEN]'), "Gern.");
  // Mitten im Stream: Der Marker ist erst zum Teil da.
  assert.equal(stripMarkers("Gern. [KONT"), "Gern.");
  assert.equal(stripMarkers('Gern. [DATEN]{"na'), "Gern.");
  assert.equal(stripMarkers("Gern. ["), "Gern.");
  // Gewöhnlicher Text bleibt, wie er ist.
  assert.equal(stripMarkers("Wir bauen Websites [auch große]."), "Wir bauen Websites [auch große].");
});

test("Angaben aus dem Gespräch: nur bekannte Felder, kaputtes JSON scheitert still", () => {
  assert.deepEqual(parseDaten('x [DATEN]{"name":" Erika ","email":"e@b.de","fremd":"x","company":""}[/DATEN]'), { name: "Erika", email: "e@b.de" });
  assert.equal(parseDaten("x [DATEN]{kaputt[/DATEN]"), null);
  assert.equal(parseDaten("ohne Marker"), null);
  assert.equal(parseDaten("x [DATEN]{}[/DATEN]"), null);
});

test("der KI-Assistent sieht weder Team-Antworten noch Hinweise des Support-Chats", () => {
  const verlauf: Message[] = [
    GREETING,
    { role: "user", content: "Hallo" },
    { role: "assistant", content: "Übergeben.", noAi: true },
    { role: "team", content: "Hier ist Jakob.", von: "Jakob" },
    { role: "user", content: "Danke", noAi: true },
    { role: "assistant", content: "Gern." },
  ];
  assert.deepEqual(aiHistory(verlauf).map((m) => m.content), [GREETING.content, "Hallo", "Gern."]);
});

test("wer einen Menschen verlangt, bekommt den Mitarbeiter-Knopf auch ohne Marker", () => {
  for (const satz of ["Kann ich mit einem Mitarbeiter sprechen?", "Ich will einen Menschen", "eine echte Person bitte", "jemand vom Team"]) assert.ok(WANTS_HUMAN.test(satz), satz);
  assert.ok(!WANTS_HUMAN.test("Was kostet eine Website?"));
});

test("die drei Vorschläge fragen nicht nach dem Preis", () => {
  assert.equal(STARTER_QUESTIONS.length, 3);
  for (const frage of STARTER_QUESTIONS) assert.ok(!/preis|kostet/i.test(frage), frage);
});

test("Wörter und Leerräume: zusammengesetzt ergibt sich wieder genau der Text", () => {
  const text = "Hey! 👋 Ich bin\nder  Assistent.";
  const teile = woerter(text);
  assert.equal(teile.map((t) => t.text).join(""), text);
  assert.deepEqual(teile.filter((t) => !t.leer).map((t) => t.text), ["Hey!", "👋", "Ich", "bin", "der", "Assistent."]);
  assert.deepEqual(woerter(""), []);
});

// Die beiden Angebote von vor Prompt 18 (Anruf-Karte, Mitarbeiter); die neuen Karten prüft der Test weiter unten.
const zwei = (antwort: string, frage: string) => {
  const a = angebote(antwort, frage);
  return { anrufen: a.anrufen, mitarbeiter: a.mitarbeiter };
};

test("was unter einer Antwort angeboten wird: Anruf-Karte bei [ANRUFEN], Mitarbeiter bei [MITARBEITER], [KONTAKT] oder auf Wunsch", () => {
  assert.deepEqual(zwei("Termine machen wir am Telefon aus. [ANRUFEN]", "Habt ihr noch Termine frei?"), { anrufen: true, mitarbeiter: false });
  assert.deepEqual(zwei("Am Telefon. [ANRUFEN] Für weitere Fragen verbinde ich dich gern. [MITARBEITER]", "Wann habt ihr frei?"), { anrufen: true, mitarbeiter: true });
  // Preisfrage: Seit Runde 1 (Feinschliff) auch die Anruf-Karte, selbst wenn der Assistent [ANRUFEN] vergisst.
  assert.deepEqual(zwei("Das kann dir ein Mitarbeiter genau sagen. [MITARBEITER]", "Was kostet das?"), { anrufen: true, mitarbeiter: true });
  assert.deepEqual(zwei("Ruf uns an. [KONTAKT] [ANRUFEN] [MITARBEITER]", "Was kostet eine Website?"), { anrufen: true, mitarbeiter: true });
  assert.deepEqual(zwei("Dabei hilft dir unser Team. [KONTAKT]", "Geht das auch anders?"), { anrufen: false, mitarbeiter: true });
  // Der Besucher verlangt einen Menschen: Der Knopf kommt auch, wenn der Assistent den Marker vergisst.
  assert.deepEqual(zwei("Gern.", "Ich möchte mit einem Mitarbeiter schreiben"), { anrufen: false, mitarbeiter: true });
  assert.deepEqual(zwei("Wir bauen Websites, Chatbots und Telefon-Assistenten.", "Was macht ihr genau?"), { anrufen: false, mitarbeiter: false });
  // Wunsch nach Erstgespräch oder Gespräch: Anruf-Karte, auch ohne Marker.
  assert.equal(angebote("Gern.", "Kann ich ein Erstgespräch bekommen?").anrufen, true);
  assert.equal(angebote("Gern.", "Kann ich mal mit jemandem von euch sprechen?").anrufen, true);
  // Fragen zu unseren Leistungen lösen sie nicht aus.
  assert.equal(angebote("Ja.", "Habt ihr auch Online-Terminbuchung?").anrufen, false);
  assert.equal(angebote("Ja.", "Kann euer Telefon-Assistent Anrufe annehmen?").anrufen, false);
});

test("die Welle des Entschlüsselns: jedes Wort bleibt 0,5 bis 0,7 s Zeichen, kurze Antwort rund 2 s, normale 2,5 bis 3 s, nie über 3,5 s", () => {
  // Die Zeichen wechseln ruhig (rund alle 70 bis 90 ms).
  assert.ok(ZEICHEN_WECHSEL >= 70 && ZEICHEN_WECHSEL <= 90);
  for (const n of [1, 5, 12, 18, 30, 45, 64, 120, 400]) {
    const plan = wellenPlan(n);
    // Die Zeichenzeit bleibt, auch bei sehr langen Antworten: Dort wird nur der Takt schneller.
    assert.ok(plan.zeichenzeit >= 500 && plan.zeichenzeit <= 700, `Zeichenzeit bei ${n} Wörtern`);
    assert.ok(plan.gesamt <= 3500, `Dauer bei ${n} Wörtern`);
    assert.equal(plan.gesamt, Math.round((n - 1) * plan.takt + plan.zeichenzeit));
  }
  // Die Begrüßung (18 Wörter) und andere kurze Antworten: etwa 2 s.
  const kurz = wellenPlan(18).gesamt;
  assert.ok(kurz >= 1900 && kurz <= 2300, `kurz: ${kurz}`);
  // Eine normale Antwort (30 bis 45 Wörter): 2,5 bis 3 s.
  for (const n of [30, 38, 45]) {
    const dauer = wellenPlan(n).gesamt;
    assert.ok(dauer >= 2500 && dauer <= 3000, `${n} Wörter: ${dauer}`);
  }
  // Sehr lang: 3,5 s, der Takt wird schneller.
  assert.equal(wellenPlan(120).gesamt, 3500);
  assert.ok(wellenPlan(400).takt < wellenPlan(120).takt);
  // Die Welle des Einrastens läuft der Welle der Zeichen hinterher: Es sind immer mehrere Wörter zugleich Zeichen.
  for (const n of [18, 45, 120]) assert.ok(wellenPlan(n).zeichenzeit / wellenPlan(n).takt >= 4, `${n} Wörter`);
  // Ganz kurze Texte sind früher fertig (kein Wort steht eine Sekunde allein da).
  assert.equal(wellenPlan(1).gesamt, 600);
  assert.equal(wellenPlan(0).gesamt, 600);
  // Die Zusammenfassung im Formular läuft zügiger: rund 1 s.
  for (const n of [12, 30, 60]) {
    const dauer = wellenPlan(n, true).gesamt;
    assert.ok(dauer >= 700 && dauer <= 1000, `zügig, ${n} Wörter: ${dauer}`);
  }
});

test("eine Telefonnummer im Text wird ein gewöhnlicher Link mit der Nummer als tel-Verweis", () => {
  const teile = reichTeile("Ruf einfach an unter +49 6108 9694027. Dort nimmt der Assistent ab.");
  assert.deepEqual(teile, [
    { art: "text", text: "Ruf einfach an unter " },
    { art: "tel", text: "+49 6108 9694027", href: "tel:+4961089694027" },
    { art: "text", text: ". Dort nimmt der Assistent ab." },
  ]);
  assert.deepEqual(reichTeile("06108 9694027")[0], { art: "tel", text: "06108 9694027", href: "tel:061089694027" });
});

test("Jahreszahlen, Mengen und Uhrzeiten sind keine Telefonnummern", () => {
  for (const satz of ["Seit 2024 bauen wir Websites.", "In 3 bis 5 Tagen fertig.", "Um 10:30 Uhr.", "Das sind 100 % Einsatz.", "0 Aufwand für dich."]) {
    assert.ok(reichTeile(satz).every((t) => t.art === "text"), satz);
  }
});

test("E-Mail-Adressen und Adressen im Netz werden Links, Satzzeichen bleiben Text", () => {
  const teile = reichTeile("Schreib an kontakt@agentsgilt.com, oder schau auf agentsgilt.com.");
  assert.deepEqual(teile, [
    { art: "text", text: "Schreib an " },
    { art: "mail", text: "kontakt@agentsgilt.com", href: "mailto:kontakt@agentsgilt.com" },
    { art: "text", text: ", oder schau auf " },
    { art: "netz", text: "agentsgilt.com", href: "https://agentsgilt.com" },
    { art: "text", text: "." },
  ]);
  assert.deepEqual(reichTeile("https://agentsgilt.com/datenschutz")[0], { art: "netz", text: "https://agentsgilt.com/datenschutz", href: "https://agentsgilt.com/datenschutz" });
  // Kein Link aus einem Satzende ohne Leerzeichen.
  assert.ok(reichTeile("Das ist die Website.Dann geht es weiter.").every((t) => t.art === "text"));
  // Zusammengesetzt bleibt der Text derselbe.
  const text = "Mehr auf agentsgilt.com. Anruf: +49 6108 9694027!";
  assert.equal(reichTeile(text).map((t) => t.text).join(""), text);
});

test("das Wissen des Assistenten: Termine über [ANRUFEN] ohne Nummer im Satz, Tieferes zum Mitarbeiter, WhatsApp kein Kontaktweg", () => {
  const wissen = readFileSync(new URL("../lib/chatbot-knowledge.ts", import.meta.url), "utf8");
  // Termine: ein kurzer Satz und der Marker; die Nummer steht in der Anruf-Karte, nicht im Text.
  // Seit Runde 1 (Feinschliff) auch bei Gesprächen und Preisfragen.
  assert.ok(wissen.includes("Termine und Gespräche: immer anrufen (Marker [ANRUFEN])"));
  assert.ok(/keine Telefonnummer in den Text/i.test(wissen));
  const regeln = wissen.slice(wissen.indexOf("Termine und Gespräche: immer anrufen"));
  const terminRegel = regeln.slice(0, regeln.indexOf("\n10."));
  assert.ok(!/\+49|06108/.test(terminRegel), "keine Nummer in der Termin-Regel");
  // Tiefergehende Fragen und der Wunsch nach einem Menschen: kurz antworten, dann [MITARBEITER].
  assert.ok(wissen.includes("Mit einem Mitarbeiter schreiben"));
  assert.ok(!wissen.includes("Mit einem Mitarbeiter sprechen"));
  // WhatsApp steht nur noch in der Regel, was bei ausdrücklicher Nachfrage zu sagen ist.
  assert.ok(!/auch per WhatsApp erreichbar|Per WhatsApp \(Button/.test(wissen));
  assert.ok(wissen.includes("du nennst nie eine WhatsApp-Nummer"));
  assert.ok(!/wa\.me|4916098427943/.test(wissen), "keine WhatsApp-Nummer im Wissen");
  for (const marker of ["[KONTAKT]", "[ANRUFEN]", "[MITARBEITER]", "[DATEN]"]) assert.ok(wissen.includes(marker), marker);
  // Preise bleiben tabu.
  assert.ok(wissen.includes("NIEMALS eine Zahl nennen"));
});
