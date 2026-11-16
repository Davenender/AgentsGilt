// Mails mit Freigabe (Etappe 2): Wer darf mailen, doppeltes Senden, Verlauf fürs Ticket, Entwurf-Karte.
import assert from "node:assert/strict";
import { test } from "node:test";
import { darfMailen, entwurfKarte, freigabeKarte, leseEntwurfKarte, mitZustand, pruefeSenden, ticketBesitzer, ticketVerlauf } from "../lib/mail-antwort.ts";

const DAVID = "806859236768088114";

test("Ticket: nur wer übernommen hat, und David", () => {
  const karte = { title: "Support-Anfrage ticket-0009", fields: [{ name: "Status", value: "Übernommen von <@111> um 10:00" }] };
  assert.equal(ticketBesitzer(karte), "111");
  assert.equal(darfMailen("ticket", "111", [ticketBesitzer(karte) ?? ""], DAVID), null);
  assert.equal(darfMailen("ticket", DAVID, ["111"], DAVID), null);
  assert.match(darfMailen("ticket", "222", ["111"], DAVID) ?? "", /übernommen/);
  assert.equal(ticketBesitzer({ fields: [{ name: "Status", value: "Offen" }] }), null);
});

test("Kundenmail: nur Zuständige, und David", () => {
  assert.equal(darfMailen("kundenmail", "111", ["111", "333"], DAVID), null);
  assert.match(darfMailen("kundenmail", "222", ["111"], DAVID) ?? "", /Zuständigen/);
});

test("zweites Senden wird abgewiesen", () => {
  const karte = freigabeKarte({ ort: "ticket", kanal: "1", quelleId: "2", an: "a@b.de", betreff: "x", frage: "y", autor: "3" }, "Hallo", "z");
  assert.equal(pruefeSenden(karte), null);
  assert.equal(pruefeSenden(mitZustand(karte, "gesendet", "✅")), "Diese Mail ist schon erledigt.");
  assert.equal(pruefeSenden({ title: "irgendwas" }), "Diese Mail ist schon erledigt.");
});

test("Verlauf fürs Ticket ohne interne Notizen und Hinweise", () => {
  const karte = { fields: [{ name: "Frage", value: "Was kostet eine Website?" }, { name: "Chat davor (mit dem Assistenten)", value: "Besucher: Hallo" }] };
  const v = ticketVerlauf(karte, [
    { text: "🗨️ **Besucher:** Gibt es auch Ratenzahlung?" },
    { text: "💬 **David:** Das klären wir gern am Telefon." },
    { text: "// intern: Preis erst nach Absprache" },
    { text: "📞 **Der Kunde fragt nach dem Preis.** Anruf anbieten?" },
    { text: "❗ **Der Besucher hat den Chat verlassen.**" },
  ]);
  assert.match(v, /Was kostet eine Website\?/);
  assert.match(v, /Kunde: Gibt es auch Ratenzahlung\?/);
  assert.match(v, /Team \(David\): Das klären wir gern am Telefon\./);
  assert.doesNotMatch(v, /intern/);
  assert.doesNotMatch(v, /Anruf anbieten\?/);
});

test("Entwurf-Karte lässt sich wieder lesen", () => {
  const k = entwurfKarte({ zusammenfassung: "Kunde will Preise.", betreff: "Deine Frage", text: "Hallo Max" }, "max@firma.de");
  assert.deepEqual(leseEntwurfKarte(k), { betreff: "Deine Frage", text: "Hallo Max" });
  assert.deepEqual(leseEntwurfKarte(entwurfKarte(null, "max@firma.de")), { betreff: "", text: "" });
});
