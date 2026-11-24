// Prompt 17: Sperren, Entsperren, Schnellantwort, Bündeln und Beleidigung im Support-Ticket (Discord).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SCHNELLANTWORTEN } from "../lib/chat-schnellantworten.ts";
import { ticketComponents } from "../lib/support-anruf.ts";
import {
  BELEIDIGUNG_FELD,
  HINWEIS_ZEILE,
  SCHNELL_FENSTER,
  SCHNELL_WAHL,
  SPERRE_FELD,
  beendetNachricht,
  beleidigungenDerKarte,
  beleidigungsNachricht,
  besucherNachrichten,
  entsperrtNachricht,
  entsperrtWert,
  gesperrtVonWert,
  gesperrtWert,
  mitFeld,
  mitHinweisZeile,
  schnellAuswahl,
  schnellFenster,
  sperrKomponenten,
  sperrNachricht,
  sperreDerKarte,
  trenneHinweisZeile,
  zustandDerKarte,
} from "../lib/support-sperre.ts";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const KARTE = [
  { name: "Name", value: "Max", inline: true },
  { name: "Frage", value: "Was kostet ein Chatbot?" },
  { name: "Status", value: "Offen" },
];

test("Sperre steht an der Ticket-Karte (Feld „Sperre“), nicht im Kanalnamen", () => {
  assert.equal(sperreDerKarte(KARTE).gesperrt, false);
  const gesperrt = mitFeld(KARTE, SPERRE_FELD, gesperrtWert("12 Nachrichten in 1 Minute"));
  assert.deepEqual(sperreDerKarte(gesperrt), { gesperrt: true, wert: "Gesperrt – 12 Nachrichten in 1 Minute", bis: null, abgelaufen: false, art: "menge" });
  assert.equal(gesperrt.length, 4);
  // Von Hand gesperrt, dann entsperrt: dasselbe Feld, kein zweites.
  const vonHand = mitFeld(KARTE, SPERRE_FELD, gesperrtVonWert("<@1>", "16:12", "Spam"));
  assert.equal(sperreDerKarte(vonHand).gesperrt, true);
  assert.equal(sperreDerKarte(vonHand).art, "spam");
  const frei = mitFeld(vonHand, SPERRE_FELD, entsperrtWert("<@2>", "16:15"));
  assert.equal(frei.filter((f) => f.name === SPERRE_FELD).length, 1);
  assert.deepEqual(sperreDerKarte(frei), { gesperrt: false, wert: "Entsperrt von <@2> um 16:15", bis: null, abgelaufen: false, art: null });
  // Kanalname und Thema bleiben (Discord erlaubt nur 2 Änderungen in 10 Minuten).
  const src = lies("lib/support.ts");
  const schutz = src.slice(src.indexOf("// ------------------------------------------------------------------ Chat-Schutz"), src.indexOf("export async function hinweisBeiAnrufwunsch"));
  assert.doesNotMatch(schutz, /PATCH", `\/channels\/\$\{channelId\}`, \{/);
  assert.doesNotMatch(schutz, /topic|name:/);
});

test("Sperr-Karte: Grund oder „gesperrt von …“, Knöpfe Entsperren und Chat beenden", () => {
  assert.match(sperrNachricht({ grund: "12 Nachrichten in 1 Minute" }), /^🔒 \*\*Besucher gesperrt\*\* – 12 Nachrichten in 1 Minute\n-# /);
  assert.match(sperrNachricht({ von: "Rolle A" }), /^🔒 \*\*Besucher gesperrt\*\* – gesperrt von Rolle A\n/);
  const knoepfe = sperrKomponenten()[0].components.map((k) => [k.custom_id, k.label]);
  assert.deepEqual(knoepfe, [
    ["ticket:entsperren", "Entsperren"],
    ["ticket:beenden", "Chat beenden"],
  ]);
  const karte = sperrNachricht({ grund: "12 Nachrichten in 1 Minute" });
  assert.equal(entsperrtNachricht(karte, "<@7>", "16:20"), "🔒 **Besucher gesperrt** – 12 Nachrichten in 1 Minute\nEntsperrt von <@7> um 16:20");
  assert.equal(beendetNachricht(karte, "<@7>", "16:21"), "🔒 **Besucher gesperrt** – 12 Nachrichten in 1 Minute\nChat beendet von <@7> um 16:21");
});

test("Knöpfe an der Karte: Übernehmen, Anruf anbieten, Schnellantwort, Sperren, Ticket schließen", () => {
  const offen = ticketComponents("open")[0].components as { custom_id: string; label: string; emoji?: { name: string } }[];
  assert.deepEqual(
    offen.map((k) => `${k.emoji?.name ?? ""}${k.label}`),
    ["Übernehmen", "📞Anruf anbieten", "💬Schnellantwort", "🔒Sperren", "Ticket schließen"],
  );
  // Höchstens 5 Knöpfe in einer Reihe (Discord).
  assert.ok(offen.length <= 5);
  assert.equal(zustandDerKarte(KARTE), "open");
  assert.equal(zustandDerKarte(mitFeld(KARTE, "Status", "Übernommen von <@1> um 10:00")), "claimed");
  assert.equal(zustandDerKarte(mitFeld(KARTE, "Status", "Geschlossen von <@1> um 10:00")), "closed");
});

test("nur das Team darf drücken: alle Ticket-Knöpfe laufen durch dieselbe Prüfung, danach nur der Übernehmer (Prompt 18)", () => {
  const src = lies("app/api/discord/route.ts");
  const pruefung = src.indexOf("if (!darfHandeln(user.id");
  const ticket = src.indexOf('if (customId.startsWith("ticket:")) return handleTicket(');
  assert.ok(pruefung > 0 && ticket > pruefung, "darfHandeln kommt vor handleTicket");
  for (const id of ["ticket:entsperren", "ticket:beenden", "ticket:dauerhaft", SCHNELL_WAHL, SCHNELL_FENSTER]) assert.ok(id.startsWith("ticket:"), id);
  for (const k of ticketComponents("open")[0].components as { custom_id: string }[]) assert.ok(k.custom_id.startsWith("ticket:"));
  const ganz = lies("lib/ticket-handler.ts");
  const handle = ganz.slice(ganz.indexOf("async function entscheide("));
  // Übernehmen zuerst (für alle), danach die Prüfung auf den Übernehmer, erst dann jeder andere Knopf.
  const claim = handle.indexOf('if (id === "ticket:claim")');
  const gate = handle.indexOf("const verbot = pruefeUebernehmer(felder, userId, OWNER_ID, CHEF_DARF_ALLES, aktiv);");
  assert.ok(claim > 0 && gate > claim, "erst Übernehmen, dann die Prüfung");
  for (const aktion of ["id === FREIGEBEN_ID", 'id === "ticket:sperren"', "id === ENTSPERREN_ID", "id === DAUERHAFT_ID", "id === BEENDEN_ID", 'id === "ticket:schnell"', "id === SCHNELL_WAHL", "id === SCHNELL_FENSTER", "id === NOCH_FRAGEN_ID", "id === ABSCHLUSS_ID", 'id === "ticket:close"', "id === SPERR_GRUND_WAHL", "id === TROTZDEM_BEENDEN_ID"]) {
    assert.ok(handle.indexOf(aktion) > gate, aktion);
  }
  assert.ok(handle.indexOf("const knopf = i.type === 3 ? leseAnrufKnopf(id) : null;") > gate, "auch Anruf anbieten");
  // Schon gesperrt: kein zweites Mal; geschlossen: nichts mehr.
  assert.match(handle, /if \(sperreDerKarte\(felder\)\.gesperrt\) return privatMeldung\(SCHON_GESPERRT\);/);
  assert.match(ganz, /geschlossen: i\.channel\?\.name\?\.startsWith\("geschlossen-"\) === true/);
  // „Chat beenden“ an der Sperr-Karte schließt sofort, ohne Abschluss-Satz.
  const beenden = handle.slice(handle.indexOf("if (id === BEENDEN_ID)"), handle.indexOf("// ------------------------------------------------------------ Abschluss"));
  assert.match(beenden, /schliessen\(\);/);
  // Die Karte schließt karteSchliessen (seit 18d mit Meldung, wenn es scheitert) über schliesseKarte (lib/support.ts).
  assert.match(beenden, /karteSchliessen\(\);/);
  assert.match(lies("lib/support.ts"), /\(felder\) => zustandDerKarte\(felder\) === "closed",\s*ticketComponents\("closed"\),/);
  assert.match(handle, /🔒 Ticket geschlossen von \$\{who\}\./);
});

test("Schnellantwort: fünf Sätze aus der Datei (ohne Abschluss-Satz, ohne Rückruf), Auswahl, Fenster, Antwort mit eigenem Namen", () => {
  assert.deepEqual([...SCHNELLANTWORTEN], [
    "Einen Moment, ich schaue kurz nach.",
    "Danke für deine Geduld!",
    "Bitte bleib sachlich, sonst müssen wir den Chat beenden.",
    "Wir melden uns per E-Mail bei dir.",
    "Am schnellsten klären wir das am Telefon: Ruf uns einfach an.",
  ]);
  // Wir rufen nicht zurück; der Abschluss-Satz kommt nur über den Knopf „Abschluss“.
  for (const satz of SCHNELLANTWORTEN) {
    assert.doesNotMatch(satz, /dich anrufen|zurückrufen|Rückruf/);
    assert.doesNotMatch(satz, /beende den Chat jetzt/);
  }
  const auswahl = schnellAuswahl();
  assert.equal(auswahl.flags, 64);
  const menue = auswahl.components[0].components[0];
  assert.equal(menue.type, 3);
  assert.equal(menue.custom_id, SCHNELL_WAHL);
  assert.equal(menue.options.length, 5);
  for (const o of menue.options) assert.ok(o.label.length <= 100);
  const fenster = schnellFenster("4");
  assert.equal(fenster.custom_id, SCHNELL_FENSTER);
  assert.ok(fenster.title.length <= 45);
  const feld = fenster.components[0].components[0];
  assert.ok(feld.label.length <= 45);
  assert.equal(feld.value, "Am schnellsten klären wir das am Telefon: Ruf uns einfach an.");
  // Unbekannte Wahl: der erste Satz statt eines Absturzes.
  assert.equal(schnellFenster("99").components[0].components[0].value, SCHNELLANTWORTEN[0]);
  // Gesendet wird wie eine normale Antwort: 💬 **Name:** Text.
  const handle = lies("lib/ticket-handler.ts");
  const senden = handle.slice(handle.indexOf("id === SCHNELL_FENSTER"), handle.indexOf("if (i.type === 5) {"));
  assert.match(senden, /postAnKunde\(token, channel, who, text\.slice\(0, 1500\)\)/);
  assert.match(lies("lib/support.ts"), /content: `\$\{FOR_CUSTOMER\} \*\*\$\{wer\}:\*\* \$\{text\}`/);
  // Keine Namen von Teammitgliedern in den Sätzen.
  for (const satz of SCHNELLANTWORTEN) assert.doesNotMatch(satz, /David|Jakob|Mijo/);
});

test("Bündeln: Zeilen untereinander in einer Nachricht, zu lang in mehreren, nichts geht verloren", () => {
  assert.deepEqual(besucherNachrichten(["Hallo", "ich hab eine Frage", "  ", "zum Chatbot"]), ["🗨️ **Besucher:** Hallo\nich hab eine Frage\nzum Chatbot"]);
  const lang = Array.from({ length: 5 }, (_, i) => `${i}`.repeat(700));
  const teile = besucherNachrichten(lang);
  assert.ok(teile.length > 1);
  for (const t of teile) assert.ok(t.length <= 2000, String(t.length));
  // Alle Zeilen sind da, in der richtigen Reihenfolge.
  const zurueck = teile.flatMap((t) => t.replace("🗨️ **Besucher:** ", "").split("\n"));
  assert.deepEqual(zurueck, lang);
});

test("Beleidigung: ⚠️ vor der Nachricht, Grund der KI nur fürs Team darunter, nur einmal", () => {
  const vorher = "🗨️ **Besucher:** ihr seid echt das Letzte";
  const markiert = beleidigungsNachricht(vorher, "beschimpft das Team");
  assert.equal(markiert, "⚠️ **Beleidigung** – 🗨️ **Besucher:** ihr seid echt das Letzte\n-# Nur fürs Team: beschimpft das Team");
  assert.equal(beleidigungsNachricht(markiert, "noch mal"), markiert);
  assert.ok(beleidigungsNachricht(`🗨️ **Besucher:** ${"x".repeat(1990)}`, "Grund").length <= 2000);
  assert.equal(beleidigungenDerKarte(KARTE), 0);
  assert.equal(beleidigungenDerKarte(mitFeld(KARTE, BELEIDIGUNG_FELD, "1")), 1);
});

test("„Bitte bleib freundlich.“ geht als ruhiger Hinweis an den Kunden, nicht als Mitarbeiter-Nachricht", () => {
  const im = mitHinweisZeile("Bitte bleib freundlich.");
  assert.equal(im, `Bitte bleib freundlich.\n${HINWEIS_ZEILE}`);
  assert.deepEqual(trenneHinweisZeile(im), { text: "Bitte bleib freundlich.", hinweis: true });
  assert.deepEqual(trenneHinweisZeile("**Name:** Hallo"), { text: "**Name:** Hallo", hinweis: false });
  const src = lies("lib/support.ts");
  assert.match(src, /hinweis: true \}\);/);
  assert.match(src, /mitHinweisZeile\(chatTexte\.schutz\.freundlich\)/);
});

test("Support-Chat: gesperrt heißt 423 ohne Discord, Bündel als texts, eine KI-Prüfung im Hintergrund", () => {
  const src = lies("app/api/support/route.ts");
  const senden = src.slice(src.indexOf('if (body.action === "send")'), src.indexOf('if (body.action === "sperre")'));
  const sperre = senden.indexOf("if (stand.gesperrt) return");
  const posten = senden.indexOf("postFromVisitor(bot, channelId, zeilen)");
  assert.ok(sperre > 0 && posten > sperre, "erst die Sperre prüfen, dann posten");
  assert.match(src, /status: 423/);
  assert.match(senden, /body\.texts/);
  // Beleidigung, Anliegen und Stand in EINEM Aufruf (Prompt 18), mit den letzten Nachrichten des Tickets als Daten.
  assert.match(senden, /const p = await pruefeTicket\(alles, verlaufFuerKi\(letzte, ids, uebernehmerDerKarte\(karte\?\.felder\)\)\);/);
  assert.match(senden, /if \(p\.beleidigung\) \{\s*await meldeBeleidigung\(bot, channelId, ids, p\.grund\);/);
  // Gemerkt wird erst nach dem Posten (sonst zählte „Nochmal senden“ als Wiederholung).
  assert.ok(senden.indexOf("waechter.merke(") > posten);
  // Der Abruf meldet gesperrt mit Grund; antwortet Discord nicht, kommt 502 und der Chat behält seinen Stand.
  assert.match(src, /gesperrt: stand\.gesperrt,/);
  assert.match(src, /if \(!stand\) return fehler\("Nicht erreichbar", 502\);/);
  // Kann die Karte nicht gelesen werden, ist der Stand unbekannt: keine Nachricht geht in ein vielleicht gesperrtes Ticket.
  const support = lies("lib/support.ts");
  assert.match(support, /if \(!ch \|\| karte === "fehler"\) return null;/);
  assert.match(senden, /if \(stand === null\) return fehler\(/);
});

test("Texte: kurz, ohne Emoji, duzt, keine Namen; der Grund der Sperre steht dabei (Prompt 18, Variante A)", () => {
  const src = lies("lib/inhalt-neu.ts");
  const block = src.slice(src.indexOf("  schutz: {"), src.indexOf("\n  karten: {"));
  for (const satz of [
    "Zu viele Nachrichten – wieder frei in",
    "Gleiche Nachricht zu oft – wieder frei in",
    "Bitte nur echte Nachrichten – wieder frei in",
    "Gesperrt wegen Beleidigung – wieder frei in",
    "Zu viele Nachrichten – ein Mitarbeiter gibt den Chat wieder frei.",
    "Gesperrt wegen Beleidigung.",
    "Gesperrt wegen Spam.",
    "Gesperrt wegen Drohung.",
    "Der Chat ist gesperrt.",
    "Der Chat wurde beendet.",
    "Du kannst wieder schreiben.",
    "Bitte bleib freundlich.",
    "nicht angekommen",
    "Nochmal senden",
  ]) {
    assert.ok(block.includes(`"${satz}"`), satz);
  }
  // Nicht mehr: „Ein Mitarbeiter hat den Chat gesperrt.“ (oft sperrt der Bot selbst).
  assert.ok(!block.includes('"Ein Mitarbeiter hat den Chat gesperrt."'));
  assert.doesNotMatch(block, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(block, /\bSie\b|\bIhnen\b/);
});

test("Anzeige: die Klassen des Chat-Schutzes gibt es im Fenster nur einmal (kein Zusammenstoß mit alten Regeln)", () => {
  const css = lies("components/neu/chat/chat.css");
  const vorher = css.slice(0, css.indexOf("/* ── Chat-Schutz (Prompt 17)"));
  for (const klasse of ["ag-cf__sperre", "ag-cf__rest", "ag-cf__zustellung", "ag-cf__nochmal", "ag-cf__hinweis", "ag-cf__blase--fehlt"]) {
    assert.ok(!vorher.includes(`.${klasse}`), `${klasse} gab es schon vor dem Chat-Schutz`);
    assert.ok(css.includes(`.${klasse} {`), `${klasse} fehlt`);
  }
  // „nicht angekommen · Nochmal senden“ nutzt nicht die eingeklappte Fehlerzeile des Formulars.
  const fenster = lies("components/neu/chat/ChatFenster.tsx");
  const zeile = fenster.slice(fenster.indexOf("function NichtAngekommen("), fenster.indexOf("/** Kennzeichnet die Maße"));
  assert.doesNotMatch(zeile, /ag-cf__fehlt/);
});
