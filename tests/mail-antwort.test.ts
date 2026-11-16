// Mails an Kunden mit Davids Freigabe (Etappe 2, 16.11.2026): reine Logik ohne Netz.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRUENDE,
  KEIN_EMAIL,
  MAIL_HINWEIS,
  ZEILE_RAUS,
  freigabeKarte,
  freigabeKnoepfe,
  istEmail,
  leseFreigabe,
  mailInhalt,
  mailKnopfFaellig,
  mitErinnert,
  mitZustand,
  zeileAbgelehnt,
  zeileGesendet,
  type MailAuftrag,
} from "../lib/mail-antwort.ts";

const H = 60 * 60 * 1000;
const t0 = Date.parse("2026-11-16T10:00:00Z");
const besucher = (minutenVorher: number) => ({ zeit: new Date(t0 - minutenVorher * 60_000).toISOString(), bot: true, text: "🗨️ **Besucher:** Hallo?" });
const ticket = (o: Partial<{ status: string; kontakt: string; nachrichten: { zeit: string; bot: boolean; text: string }[] }> = {}) => ({
  status: "Übernommen von <@1> um 10:00",
  kontakt: "max@firma.de",
  kartenZeit: new Date(t0 - 5 * H).toISOString(),
  nachrichten: [besucher(181)],
  ...o,
});

test("Mail-Knopf nach 3 Stunden Stille", () => {
  assert.equal(mailKnopfFaellig(ticket(), t0), "knopf");
  assert.equal(mailKnopfFaellig(ticket({ nachrichten: [besucher(179)] }), t0), null);
});

test("ohne Besucher-Nachricht zählt die Karte", () => {
  assert.equal(mailKnopfFaellig(ticket({ nachrichten: [] }), t0), "knopf");
});

test("Telefonnummer als Kontakt: einmal Hinweis statt Knopf", () => {
  assert.equal(mailKnopfFaellig(ticket({ kontakt: "0151 1234567" }), t0), "kein-email");
});

test("kein zweiter Knopf und kein zweiter Hinweis", () => {
  assert.equal(mailKnopfFaellig(ticket({ nachrichten: [besucher(200), { zeit: besucher(10).zeit, bot: true, text: MAIL_HINWEIS }] }), t0), null);
  assert.equal(mailKnopfFaellig(ticket({ kontakt: "0151", nachrichten: [besucher(200), { zeit: besucher(10).zeit, bot: true, text: KEIN_EMAIL }] }), t0), null);
});

test("nicht übernommen: kein Knopf", () => {
  assert.equal(mailKnopfFaellig(ticket({ status: "Offen" }), t0), null);
  assert.equal(mailKnopfFaellig(ticket({ status: "Geschlossen von <@1> um 11:00" }), t0), null);
});

test("istEmail", () => {
  assert.equal(istEmail("max@firma.de"), true);
  assert.equal(istEmail(" Max@Firma.de "), true);
  assert.equal(istEmail("0151 1234567"), false);
  assert.equal(istEmail("max@firma"), false);
});

const auftrag: MailAuftrag = {
  ort: "ticket",
  kanal: "111",
  quelleId: "222",
  an: "max@firma.de",
  betreff: "Deine Frage im Chat",
  frage: "Was kostet eine Website?",
  autor: "333",
};

test("Freigabe-Karte lässt sich wieder lesen", () => {
  const f = leseFreigabe(freigabeKarte(auftrag, "Hallo Max, …", "z1"));
  assert.ok(f);
  assert.equal(f.ort, "ticket");
  assert.equal(f.kanal, "111");
  assert.equal(f.quelleId, "222");
  assert.equal(f.autor, "333");
  assert.equal(f.an, "max@firma.de");
  assert.equal(f.betreff, "Deine Frage im Chat");
  assert.equal(f.frage, "Was kostet eine Website?");
  assert.equal(f.zeilenId, "z1");
  assert.equal(f.text, "Hallo Max, …");
  assert.equal(f.zustand, "offen");
  assert.equal(f.erinnert, false);
});

test("Zustand und Erinnerung stehen in der Karte", () => {
  const karte = freigabeKarte(auftrag, "Hallo", "z1");
  assert.equal(leseFreigabe(mitZustand(karte, "gesendet", "✅ gesendet um 10:42"))?.zustand, "gesendet");
  assert.equal(leseFreigabe(mitZustand(karte, "abgelehnt", "Ton passt nicht"))?.zustand, "abgelehnt");
  assert.equal(leseFreigabe(mitErinnert(karte))?.erinnert, true);
  assert.equal(leseFreigabe(mitErinnert(karte))?.zustand, "offen");
});

test("fremde Karten sind keine Freigabe", () => {
  assert.equal(leseFreigabe({ title: "Anfrage", footer: { text: "posteingang:form" } }), null);
});

test("Knöpfe nur, solange die Freigabe offen ist", () => {
  const ids = freigabeKnoepfe("offen").flatMap((r) => r.components.map((c) => c.custom_id));
  assert.deepEqual(ids, ["mail:ok", "mail:aendern", "mail:nein"]);
  assert.deepEqual(freigabeKnoepfe("gesendet"), []);
  assert.deepEqual(freigabeKnoepfe("abgelehnt"), []);
});

test("Zeilen für den Kanal nennen David nie", () => {
  assert.equal(ZEILE_RAUS, "📧 Mail geht raus");
  assert.equal(zeileGesendet("10:42"), "✅ Mail gesendet um 10:42");
  assert.equal(zeileAbgelehnt("Ton passt nicht"), "❌ Mail konnte nicht abgeschickt werden: Ton passt nicht");
  assert.equal(GRUENDE.length, 6);
  assert.equal(GRUENDE.at(-1), "Anderer Grund");
});

test("Mail-Inhalt maskiert HTML und zeigt die Frage", () => {
  const m = mailInhalt("Hallo <script>x</script>\n\nViele Grüße", "Was <b>kostet</b> das?");
  assert.doesNotMatch(m.html, /<script>/);
  assert.match(m.html, /&lt;script&gt;/);
  assert.match(m.html, /Was &lt;b&gt;kostet&lt;\/b&gt; das\?/);
  assert.match(m.text, /Was <b>kostet<\/b> das\?/);
});
