// Anruf anbieten im Support-Chat und Anruf-Karte beim Chatbot (Feinschliff-Runde 1).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ANRUF_FENSTER,
  ANRUF_ZEILE,
  HINWEIS_ANFANG,
  angebotsSatz,
  anliegenDerKarte,
  anrufFenster,
  erkenneAnliegen,
  hinweisKomponenten,
  hinweisNoetig,
  hinweisText,
  leseAnrufKnopf,
  leseKundenNachricht,
  mitAnrufZeile,
  ticketComponents,
  trenneAnrufZeile,
  type Anliegen,
} from "../lib/support-anruf.ts";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");

test("erkennt, was der Kunde möchte: sprechen, Erstgespräch, Termin, Preis", () => {
  const faelle: [string, Anliegen | null][] = [
    ["Können wir kurz telefonieren?", "sprechen"],
    ["Ich würde gern mit euch sprechen.", "sprechen"],
    ["Ruft mich bitte an", "sprechen"],
    ["Bitte um Rückruf", "sprechen"],
    ["Hätte gern ein Gespräch", "sprechen"],
    ["Ich hätte gern ein Erstgespräch", "erstgespraech"],
    ["Wollen wir uns kennenlernen?", "erstgespraech"],
    ["Was kostet ein Erstgespräch?", "erstgespraech"],
    ["Wann habt ihr einen Termin frei?", "termin"],
    ["Was kostet das?", "preis"],
    ["Wie sind eure Preise?", "preis"],
    ["Habt ihr Festpreise?", "preis"],
    ["Könnt ihr mir ein Angebot machen?", "preis"],
    ["Mein Budget liegt bei 2000 €", "preis"],
    // Fragen zu unseren Leistungen lösen nichts aus.
    ["Was macht ihr genau?", null],
    ["Habt ihr auch Online-Terminbuchung?", null],
    ["Kann euer Telefon-Assistent Anrufe annehmen?", null],
    ["Ist das kostenlos?", null],
    ["Wie lange dauert eine Website?", null],
  ];
  for (const [text, erwartet] of faelle) assert.equal(erkenneAnliegen(text), erwartet, text);
});

test("der Hinweis ist nur fürs Team: ohne 💬 davor, mit Knopf, und kommt nicht doppelt", () => {
  for (const a of ["sprechen", "erstgespraech", "termin", "preis"] as Anliegen[]) {
    const text = hinweisText(a);
    assert.ok(text.startsWith(HINWEIS_ANFANG), text);
    assert.ok(!text.startsWith("💬"), "nie mit dem Zeichen, das an den Kunden geht");
    assert.match(text, /Anruf anbieten\?/);
    assert.equal(hinweisKomponenten(a)[0].components[0].custom_id, `ticket:call:${a}`);
  }
  assert.match(hinweisText("sprechen"), /Der Kunde möchte sprechen\./);
  // Offener Hinweis (mit Knopf) oder schon ein Angebot in den letzten Nachrichten: kein neuer.
  const bot = { bot: true };
  assert.equal(hinweisNoetig([]), true);
  assert.equal(hinweisNoetig([{ author: bot, content: hinweisText("preis"), components: hinweisKomponenten("preis") }]), false);
  assert.equal(hinweisNoetig([{ author: bot, content: `💬 **David:** ${mitAnrufZeile("Ruf uns an.")}` }]), false);
  // Erledigter Hinweis (ohne Knopf) oder Nachrichten von Menschen: wieder ein Hinweis möglich.
  assert.equal(hinweisNoetig([{ author: bot, content: "📞 Der Kunde möchte sprechen.", components: [] }]), true);
  assert.equal(hinweisNoetig([{ author: { bot: false }, content: mitAnrufZeile("x") }]), true);
});

test("der fertige Satz: passt zur Lage, im Du, kurz, ohne Emoji, mit dem Telefon-Assistenten", () => {
  const saetze = [null, "sprechen", "erstgespraech", "termin", "preis"].map((a) => angebotsSatz(a as Anliegen | null));
  assert.equal(new Set(saetze).size, saetze.length, "je Lage ein eigener Satz");
  for (const s of saetze) {
    assert.match(s, /Telefon-Assistent/);
    assert.match(s, /Termin/);
    assert.match(s, /\b(dir|du|dich|Ruf)\b/);
    assert.ok(!/\b(Sie|Ihnen|Ihr)\b/.test(s), `duzt: ${s}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(s), `ohne Emoji: ${s}`);
    assert.ok(s.length <= 220, `kurz: ${s.length}`);
  }
  assert.match(angebotsSatz("preis"), /Preis/);
  assert.match(angebotsSatz("erstgespraech"), /Erstgespräch/);
  assert.match(angebotsSatz("sprechen"), /sprechen/);
});

test("Knopf an der Karte und am Hinweis, Fenster mit dem Satz zum Ändern", () => {
  const offen = ticketComponents("open")[0].components.map((k) => k.custom_id);
  assert.deepEqual(offen, ["ticket:claim", "ticket:call", "ticket:schnell", "ticket:sperren", "ticket:close"]);
  assert.deepEqual(ticketComponents("claimed")[0].components.map((k) => k.custom_id), ["ticket:call", "ticket:schnell", "ticket:sperren", "ticket:close"]);
  assert.deepEqual(ticketComponents("closed"), []);
  const knopf = ticketComponents("open")[0].components[1] as { label: string; emoji?: { name: string } };
  assert.equal(knopf.label, "Anruf anbieten");
  assert.equal(knopf.emoji?.name, "📞");

  assert.deepEqual(leseAnrufKnopf("ticket:call"), { quelle: "karte", anliegen: null });
  assert.deepEqual(leseAnrufKnopf("ticket:call:preis"), { quelle: "hinweis", anliegen: "preis" });
  assert.equal(leseAnrufKnopf("ticket:call:quatsch"), null);
  assert.equal(leseAnrufKnopf("ticket:claim"), null);

  const fenster = anrufFenster("hinweis", "erstgespraech");
  assert.equal(fenster.custom_id, `${ANRUF_FENSTER}hinweis`);
  assert.ok(fenster.title.length <= 45);
  const feld = fenster.components[0].components[0];
  assert.equal(feld.value, angebotsSatz("erstgespraech"));
  assert.ok(feld.label.length <= 45, "Discord erlaubt höchstens 45 Zeichen");
  assert.equal(feld.style, 2);
});

test("an der Karte: das Anliegen aus der Frage, sonst aus den Zeilen des Besuchers davor", () => {
  assert.equal(anliegenDerKarte([{ name: "Frage", value: "Was kostet eine Website?" }]), "preis");
  assert.equal(
    anliegenDerKarte([
      { name: "Frage", value: "Ich brauche eine neue Website." },
      { name: "Chat davor (mit dem Assistenten)", value: "Besucher: Was macht ihr?\nAssistent: Termine am Telefon.\nBesucher: Können wir telefonieren?" },
    ]),
    "sprechen",
  );
  // Was der Assistent schreibt, zählt nicht.
  assert.equal(anliegenDerKarte([{ name: "Chat davor (mit dem Assistenten)", value: "Assistent: Ruf uns für einen Termin an." }]), null);
  assert.equal(anliegenDerKarte(undefined), null);
});

test("die Zeile unter dem Angebot wird beim Kunden zur Anruf-Karte und nie als Text gezeigt", () => {
  const imTicket = `**David:** ${mitAnrufZeile("Ruf uns einfach an.")}`;
  assert.ok(imTicket.endsWith(ANRUF_ZEILE));
  assert.ok(ANRUF_ZEILE.startsWith("-# "), "in Discord graue Kleinschrift");
  assert.deepEqual(trenneAnrufZeile(imTicket), { text: "**David:** Ruf uns einfach an.", anrufen: true });
  assert.deepEqual(trenneAnrufZeile("**David:** Hallo"), { text: "**David:** Hallo", anrufen: false });
  // So liest die Weitergabe die Nachricht: Name ohne Doppelpunkt, Text ohne die Zeile, Karte ja/nein.
  assert.deepEqual(leseKundenNachricht(imTicket), { von: "David", text: "Ruf uns einfach an.", anrufen: true });
  assert.deepEqual(leseKundenNachricht("**Mijo:** Hallo"), { von: "Mijo", text: "Hallo", anrufen: false });
  assert.deepEqual(leseKundenNachricht("**David** Du bist jetzt mit einem Mitarbeiter verbunden."), { von: "David", text: "Du bist jetzt mit einem Mitarbeiter verbunden.", anrufen: false });
  assert.deepEqual(leseKundenNachricht("Ohne Namen **fett**"), { von: "Agents Gilt", text: "Ohne Namen fett", anrufen: false });
  // Die Weitergabe an die Website nutzt das, und der Chat zeigt die Karte unter Team-Nachrichten.
  const support = lies("lib/support.ts");
  assert.match(support, /leseKundenNachricht\(m\.content\.slice\(FOR_CUSTOMER\.length\)\)/);
  assert.match(support, /anrufen \? \{ anrufen: true as const \} : \{\}/);
  assert.match(lies("components/chat/useChat.ts"), /\.\.\.\(x\.anrufen \? \{ anrufen: true \} : \{\}\)/);
});

test("Discord: Klick öffnet das Fenster, Absenden schickt Text mit Karte; ohne Klick erfährt der Kunde nichts", () => {
  const route = lies("app/api/discord/route.ts");
  assert.match(route, /return NextResponse\.json\(\{ type: 9, data: anrufFenster\(knopf\.quelle, anliegen\) \}\)/);
  assert.match(route, /postText\(token, channel, `\$\{FOR_CUSTOMER\} \*\*\$\{who\}:\*\* \$\{mitAnrufZeile\(text\.slice\(0, 1000\)\)\}`\)/);
  const support = lies("app/api/support/route.ts");
  // Der Hinweis entsteht beim Eröffnen und bei jeder Nachricht des Kunden, nach der Antwort an ihn.
  assert.equal((support.match(/await hinweisBeiAnrufwunsch\(/g) ?? []).length, 2);
  const lib = lies("lib/support.ts");
  assert.match(lib, /content: hinweisText\(anliegen\),/);
  assert.ok(!/content: `\$\{FOR_CUSTOMER\}[^`]*hinweisText/.test(lib), "der Hinweis geht nie an den Kunden");
});

test("Chatbot: bei Preis, Erstgespräch und Gespräch die Anruf-Karte", () => {
  const wissen = lies("lib/chatbot-knowledge.ts");
  assert.match(wissen, /\[KONTAKT\] \[ANRUFEN\] \[MITARBEITER\]"/);
  assert.match(wissen, /9\. \*\*Termine und Gespräche: immer anrufen \(Marker \[ANRUFEN\]\)\.\*\*/);
  assert.match(wissen, /möchte jemand mit uns sprechen, telefonieren oder zurückgerufen werden/);
});
