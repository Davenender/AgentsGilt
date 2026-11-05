// Tests für Luca am Telefon: `npm test` (Node-eigener Testlauf, TypeScript direkt).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anrufErlaubt,
  anrufNachricht,
  anrufZeit,
  briefAus,
  briefLesen,
  briefText,
  durchgestelltText,
  istDavid,
  lageLesen,
  lageNachricht,
  lageText,
  MAX_MENUE,
  menuewahl,
  nameZu,
  teamEintraege,
  twimlMenue,
  twimlZuLuca,
} from "../lib/luca-logik.ts";

const DAVID = "+4915906430065";

test("Davids Nummer wird in jeder Schreibweise erkannt, andere nicht", () => {
  assert.equal(istDavid("+4915906430065", DAVID), true);
  assert.equal(istDavid("015906430065", DAVID), true);
  assert.equal(istDavid("0049 159 0643 0065", DAVID), true);
  assert.equal(istDavid("+4915906430066", DAVID), false);
  assert.equal(istDavid("anonymous", DAVID), false);
  assert.equal(istDavid("", DAVID), false);
  assert.equal(istDavid(DAVID, ""), false);
});

test("Menü: Ansage mit 1/2, ohne Taste geht es mit der nächsten Runde weiter, nach MAX_MENUE wird aufgelegt", () => {
  const url = (n: number) => `https://x/api/rufgruppe?a=menue&n=${n}&k=abc`;
  const eins = twimlMenue(url, 1);
  assert.match(eins, /<Gather input="dtmf" numDigits="1"[^>]*action="https:\/\/x\/api\/rufgruppe\?a=menue&amp;n=1&amp;k=abc"/);
  assert.match(eins, /Für Luca drück die 1\. Für den Kunden-Assistenten drück die 2\./);
  assert.match(eins, /<Redirect method="POST">https:\/\/x\/api\/rufgruppe\?a=menue&amp;n=2&amp;k=abc<\/Redirect>/);
  assert.match(twimlMenue(url, MAX_MENUE), /<Gather/);
  assert.equal(twimlMenue(url, MAX_MENUE + 1).includes("<Hangup/>"), true);
  assert.equal(twimlMenue(url, MAX_MENUE + 1).includes("<Gather"), false);
});

test("Menüwahl: 1 = Luca, 2 = Kunden-Assistent, alles andere nochmal", () => {
  assert.equal(menuewahl("1"), "luca");
  assert.equal(menuewahl("2"), "kunde");
  assert.equal(menuewahl("3"), "nochmal");
  assert.equal(menuewahl(""), "nochmal");
  assert.equal(menuewahl(null), "nochmal");
});

test("Zu Luca nur mit SIP-Benutzer und -Passwort, Sonderzeichen werden geschützt", () => {
  const x = twimlZuLuca("sip:luca-1@sip.vapi.ai", { benutzer: "zentrale", passwort: 'a"<b' }, "https://x/ende?a=1&k=2");
  assert.match(x, /<Sip username="zentrale" password="a&quot;&lt;b">sip:luca-1@sip\.vapi\.ai<\/Sip>/);
  assert.match(x, /action="https:\/\/x\/ende\?a=1&amp;k=2"/);
});

test("Rufgruppe ohne David: seine Nummer fällt raus, Namen werden gelesen", () => {
  const e = teamEintraege("Mijo=+49 151 1111111, 015906430065; Jakob: 0160 2222222\n+49 170 3333333", DAVID);
  assert.deepEqual(e.map((x) => x.name), ["Mijo", "Jakob", null]);
  assert.equal(e.some((x) => x.roh.includes("06430065")), false);
  assert.equal(nameZu("+491602222222", e), "Jakob");
  assert.equal(nameZu("+491703333333", e), null);
  // ohne LUCA_NUMMER bleibt alles drin
  assert.equal(teamEintraege("015906430065, 0160 2222222", "").length, 2);
});

test("Kartenzeile: angenommen mit Name und Minuten, sonst ehrlich nicht angenommen", () => {
  assert.equal(durchgestelltText({ verbunden: true, wer: "Mijo", sekunden: 250, uhr: "14:32" }), "✅ Angenommen von Mijo · 4 Min. (14:32)");
  assert.equal(durchgestelltText({ verbunden: true, wer: null, sekunden: 20, uhr: "09:05" }), "✅ Angenommen vom Team · 1 Min. (09:05)");
  assert.equal(durchgestelltText({ verbunden: false, wer: null, sekunden: 0, uhr: "09:05", grund: "niemand hat abgenommen" }), "❌ Nicht angenommen – niemand hat abgenommen (09:05)");
});

test("Briefkasten: nur gültige Werkzeug-Aufrufe werden zu Briefen, Text wird gekürzt", () => {
  assert.deepEqual(briefAus("auftrag_geben", { text: "  Prüf   die Website " }, "s"), { typ: "auftrag", text: "Prüf die Website" });
  assert.equal(briefAus("auftrag_geben", { text: "" }, "s"), null);
  assert.deepEqual(briefAus("rueckfrage_beantworten", { nr: 2, text: "Ja, blau" }, "S1"), { typ: "antwort", nr: 2, text: "Ja, blau", stand: "S1" });
  assert.equal(briefAus("rueckfrage_beantworten", { nr: 0, text: "x" }, "s"), null);
  assert.deepEqual(briefAus("freigabe_entscheiden", { nr: "1", erlauben: "true" }, "S"), { typ: "freigabe", nr: 1, erlauben: true, stand: "S" });
  assert.deepEqual(briefAus("freigabe_entscheiden", { nr: 1, erlauben: false }, "S"), { typ: "freigabe", nr: 1, erlauben: false, stand: "S" });
  assert.equal(briefAus("freigabe_entscheiden", { nr: 1, erlauben: "vielleicht" }, "S"), null);
  assert.equal(briefAus("mail_senden", { text: "x" }, "S"), null);
  assert.equal(briefAus("auftrag_geben", { text: "x".repeat(5000) }, "s")?.typ, "auftrag");
  assert.equal((briefAus("auftrag_geben", { text: "x".repeat(5000) }, "s") as { text: string }).text.length, 1500);
});

test("Briefkasten: Hin und zurück, Backticks brechen den Block nicht", () => {
  const b = { typ: "auftrag" as const, text: "Schreib ```rm -rf``` auf", zeit: "2026-11-05T12:00:00.000Z", anruf: "c1" };
  const zurueck = briefLesen(briefText(b));
  assert.equal(zurueck?.typ, "auftrag");
  assert.equal(zurueck?.anruf, "c1");
  assert.equal((zurueck as { text: string }).text.includes("```"), false);
  assert.equal(briefLesen("irgendwas"), null);
  assert.equal(briefLesen("📥 Luca-Briefkasten · x\n```json\n{\"typ\":\"loeschen\",\"zeit\":\"z\"}\n```"), null);
});

test("Lagebericht: Hin und zurück; alter Stand wird als 'Mac schläft' angesagt", () => {
  const l = { stand: "2026-11-05T12:00:00.000Z", text: "Wartet: nichts", stimme: "abc" };
  assert.deepEqual(lageLesen(lageNachricht(l)), l);
  assert.match(lageText(l, new Date("2026-11-05T12:02:00.000Z")), /der Mac ist wach/);
  assert.match(lageText(l, new Date("2026-11-05T12:30:00.000Z")), /Mac schläft wahrscheinlich/);
  assert.match(lageText(null, new Date()), /noch kein Lagebericht/);
});

test("Anrufe an David: nie 22–7 Uhr (Berlin), höchstens 3 am Tag", () => {
  // 05.11. = Winterzeit, Berlin = UTC+1
  const mittag = new Date("2026-11-05T11:00:00.000Z"); // 12:00
  assert.deepEqual(anrufErlaubt(mittag, []), { ok: true });
  assert.equal(anrufErlaubt(new Date("2026-11-05T21:30:00.000Z"), []).ok, false); // 22:30
  assert.equal(anrufErlaubt(new Date("2026-11-05T05:30:00.000Z"), []).ok, false); // 06:30
  assert.equal(anrufErlaubt(new Date("2026-11-05T06:00:00.000Z"), []).ok, true); // 07:00
  const drei = ["2026-11-05T07:00:00.000Z", "2026-11-05T08:00:00.000Z", "2026-11-05T09:00:00.000Z"];
  assert.equal(anrufErlaubt(mittag, drei).ok, false);
  assert.equal(anrufErlaubt(mittag, ["2026-11-04T09:00:00.000Z", ...drei.slice(0, 2)]).ok, true); // gestern zählt nicht
});

test("Anruf-Nachricht trägt die Zeit lesbar für die Tageszählung", () => {
  const z = "2026-11-05T11:00:00.000Z";
  assert.equal(anrufZeit(anrufNachricht(z, "Frage zu `x`", false)), z);
  assert.equal(anrufZeit("Hallo"), null);
});
