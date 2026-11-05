// Tests für Luca am Telefon: `npm test` (Node-eigener Testlauf, TypeScript direkt).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anrufErlaubt,
  assistentUeberblick,
  laeuftKlassisch,
  anrufNachricht,
  anrufZeit,
  briefAus,
  briefLesen,
  briefText,
  durchgestelltText,
  gedaechtnisAus,
  istDavid,
  kundenText,
  MAILBOX,
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

test("David hat mehrere Handys: alle werden erkannt und keins klingelt bei Kunden", () => {
  const davids = [DAVID, "+49 160 98427943"];
  assert.equal(istDavid("+4916098427943", davids), true);
  assert.equal(istDavid("015906430065", davids), true);
  assert.equal(istDavid("+491715233279", davids), false);
  assert.equal(istDavid("+4916098427943", "015906430065, 0160 98427943"), true);
  const team = teamEintraege("David=+4916098427943,Mijo=+491715233279,Jakob=+491715256337", [DAVID, undefined, "+4916098427943"]);
  assert.deepEqual(team.map((e) => e.name), ["Mijo", "Jakob"]);
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

test("Anrufe an David: nie 22–7 Uhr (Berlin), keine Tagesgrenze", () => {
  // 05.11. = Winterzeit, Berlin = UTC+1
  const mittag = new Date("2026-11-05T11:00:00.000Z"); // 12:00
  assert.deepEqual(anrufErlaubt(mittag, []), { ok: true });
  assert.equal(anrufErlaubt(new Date("2026-11-05T21:30:00.000Z"), []).ok, false); // 22:30
  assert.equal(anrufErlaubt(new Date("2026-11-05T05:30:00.000Z"), []).ok, false); // 06:30
  assert.equal(anrufErlaubt(new Date("2026-11-05T06:00:00.000Z"), []).ok, true); // 07:00
  // Davids Wunsch 05.11.: keine Grenze mehr pro Tag
  const sechs = ["06:00", "07:00", "08:00", "09:00", "10:00", "10:30"].map((u) => `2026-11-05T${u}:00.000Z`);
  assert.deepEqual(anrufErlaubt(mittag, sechs), { ok: true });
});

test("Anruf-Nachricht trägt die Zeit lesbar für die Tageszählung", () => {
  const z = "2026-11-05T11:00:00.000Z";
  assert.equal(anrufZeit(anrufNachricht(z, "Frage zu `x`", false)), z);
  assert.equal(anrufZeit("Hallo"), null);
});

test("Mitschrift: Kopf mit Grund und Zusammenfassung, Mitschrift in Teilen unter 2000 Zeichen", async () => {
  const { gespraechNachrichten, GESPRAECH_MARKE } = await import("../lib/luca-logik.ts");
  const teile = gespraechNachrichten({ minuten: 4, grund: "Plan besprechen", zusammenfassung: "David will Karte zuerst.", mitschrift: "AI: Hey Chef\nUser: Hi\n".repeat(1000), zeit: "2026-11-05T15:00:00.000Z" });
  assert.match(teile[0], /^☎️ Gespräch mit Luca · 16:00 Uhr · 4 Min\.\nGrund: Plan besprechen\n\*\*Kurz:\*\* David will Karte zuerst\./);
  assert.equal(teile.length, 8);
  assert.equal(teile.every((t) => t.length < 2000 && t.startsWith(GESPRAECH_MARKE)), true);
  assert.equal(gespraechNachrichten({ minuten: 1, zeit: "2026-11-05T15:00:00.000Z" }).length, 1);
});

test("Luca spricht locker: Prompt verlangt kurze, natürliche Antworten und keine Listen", async () => {
  const { LUCA_PROMPT, ERSTER_SATZ_EINGEHEND, ersterSatzAusgehend } = await import("../lib/luca-logik.ts");
  assert.match(LUCA_PROMPT, /wie ein guter Kumpel/);
  assert.match(LUCA_PROMPT, /Lies nie Listen vor/);
  assert.match(LUCA_PROMPT, /\{\{lage\}\}/);
  assert.match(LUCA_PROMPT, /\{\{grund\}\}/);
  assert.equal(ERSTER_SATZ_EINGEHEND, "Hey Chef! Was kann ich für dich tun?");
  assert.equal(ersterSatzAusgehend("Ich hab den Plan fertig."), "Hey Chef, Luca hier! Ich hab den Plan fertig.");
});

test("Davids Wunsch 05.11.: frei reden, kurz halten, nur auf Nachfrage erklären, Fragen stellen", async () => {
  const { LUCA_PROMPT, ERSTER_SATZ_MIT_NOTIZ, mitNotiz } = await import("../lib/luca-logik.ts");
  assert.match(LUCA_PROMPT, /redest frei/);
  assert.match(LUCA_PROMPT, /höchstens zwei Sätze/);
  assert.match(LUCA_PROMPT, /nur, wenn David nachfragt/);
  assert.match(LUCA_PROMPT, /Hast du Fragen an David, stell sie/);
  assert.doesNotMatch(ERSTER_SATZ_MIT_NOTIZ, /erklären/);
  assert.match(mitNotiz("Grund", "Thema"), /nur kurz/);
  assert.doesNotMatch(mitNotiz("Grund", "Thema"), /in Ruhe/);
});

test("Rückruf planen: 1 bis 720 Minuten, mit Thema; sonst abgewiesen", async () => {
  const { briefAus, briefLesen, briefText, LUCA_WERKZEUGE, LUCA_PROMPT } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("rueckruf_planen", { minuten: "30", text: "Plan in Ruhe besprechen" }, "s"), { typ: "rueckruf", minuten: 30, text: "Plan in Ruhe besprechen" });
  assert.equal(briefAus("rueckruf_planen", { minuten: 0, text: "x" }, "s"), null);
  assert.equal(briefAus("rueckruf_planen", { minuten: 2000, text: "x" }, "s"), null);
  assert.deepEqual(briefAus("rueckruf_planen", { minuten: 5 }, "s"), { typ: "rueckruf", minuten: 5, text: "Rückruf, wie besprochen" });
  const b = { typ: "rueckruf" as const, minuten: 30, text: "Plan", zeit: "2026-11-05T15:00:00.000Z" };
  assert.match(briefText(b), /Rückruf in 30 Min\./);
  assert.deepEqual(briefLesen(briefText(b)), b);
  assert.equal(LUCA_WERKZEUGE.some((w) => w.function.name === "rueckruf_planen"), true);
  assert.match(LUCA_PROMPT, /Versprich nie einen Rückruf, ohne das Werkzeug aufzurufen/);
});

test("Notiz für Luca: in zwei Teile geteilt, wieder zusammengesetzt, leer = keine Notiz", async () => {
  const { notizTeile, notizAus, mitNotiz, NOTIZ_MAX } = await import("../lib/luca-logik.ts");
  const lang = "Plan: ".concat("x".repeat(3000));
  const [a, b] = notizTeile(lang);
  assert.equal(a.length < 2000 && b.length < 2000, true);
  assert.equal(notizAus([b, "andere Nachricht", a]), lang);
  assert.equal(notizAus(notizTeile("")), null);
  assert.equal(notizAus(notizTeile("kurz")), "kurz");
  assert.equal(notizTeile("y".repeat(NOTIZ_MAX + 500)).join("").includes("y".repeat(NOTIZ_MAX + 1)), false);
  assert.match(mitNotiz("David hat dich angerufen.", "Stufe 6 erklären"), /^David hat dich angerufen\.\n\nNotiz von Claude.*\nStufe 6 erklären$/s);
  assert.equal(mitNotiz("Grund", null), "Grund");
});

test("Stufe 6: zeigen – Brief für die Bühne der Zentrale, nur bekannte Vorlagen", async () => {
  const { briefAus, briefText, briefLesen, LUCA_WERKZEUGE, LUCA_PROMPT, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("zeigen", { vorlage: "schulwoche" }, "s"), { typ: "zeigen", vorlage: "schulwoche" });
  assert.deepEqual(briefAus("zeigen", { vorlage: "kunden", wunsch: "  Relax Fit " }, "s"), { typ: "zeigen", vorlage: "kunden", wunsch: "Relax Fit" });
  assert.deepEqual(briefAus("zeigen", { vorlage: "route", wunsch: "von Mühlheim nach Offenbach" }, "s"), { typ: "zeigen", vorlage: "route", wunsch: "von Mühlheim nach Offenbach" });
  assert.equal(briefAus("zeigen", { vorlage: "aufgaben" }, "s"), null); // nichts über die Zentrale selbst
  assert.deepEqual(briefAus("zeigen", { vorlage: "wetter" }, "s"), { typ: "zeigen", vorlage: "wetter" });
  assert.deepEqual(briefAus("zeigen", { vorlage: "treffpunkt", wunsch: "Offenbach|Hanau" }, "s"), { typ: "zeigen", vorlage: "treffpunkt", wunsch: "Offenbach|Hanau" });
  assert.deepEqual(briefAus("zeigen", { vorlage: "schliessen" }, "s"), { typ: "zeigen", vorlage: "schliessen" });
  assert.equal(briefAus("zeigen", { vorlage: "rakete" }, "s"), null);
  assert.equal(briefAus("zeigen", {}, "s"), null);
  const b = { typ: "zeigen" as const, vorlage: "ort", wunsch: "Relax Fit", zeit: "2026-11-05T18:00:00.000Z" };
  assert.deepEqual(briefLesen(briefText(b)), b);
  const w = LUCA_WERKZEUGE.find((x) => x.function.name === "zeigen");
  assert.ok(w);
  assert.deepEqual([...(w!.function.parameters.properties as { vorlage: { enum: string[] } }).vorlage.enum], [...ZEIG_VORLAGEN]);
  assert.match(LUCA_PROMPT, /Werkzeug zeigen/);
  assert.match(LUCA_PROMPT, /Personen suchst oder ortest du nie/);
  assert.match(LUCA_PROMPT, /Bildschirm/);
});

test("Stufe 6: Gespräch läuft – Marke mit Zeit, verfällt nach 20 Minuten", async () => {
  const { gespraechText, gespraechLaeuft, GESPRAECH_LAEUFT_MARKE } = await import("../lib/luca-logik.ts");
  const jetzt = new Date("2026-11-05T18:00:00.000Z");
  const an = gespraechText(true, jetzt);
  assert.ok(an.startsWith(GESPRAECH_LAEUFT_MARKE));
  assert.equal(gespraechLaeuft(an, new Date("2026-11-05T18:19:00.000Z")), true);
  assert.equal(gespraechLaeuft(an, new Date("2026-11-05T18:21:00.000Z")), false);
  assert.equal(gespraechLaeuft(gespraechText(false, jetzt), jetzt), false);
  assert.equal(gespraechLaeuft("irgendwas", jetzt), false);
});

test("Stufe A: deutsches Abwarten, Unterbrechen ohne „mhm“, lebendigere Stimme", async () => {
  const { SPRECH_PLAN, stimmeTelefon } = await import("../lib/luca-logik.ts");
  assert.equal(SPRECH_PLAN.startSpeakingPlan.smartEndpointingPlan.provider, "vapi");
  assert.ok(SPRECH_PLAN.startSpeakingPlan.transcriptionEndpointingPlan.onNoPunctuationSeconds > SPRECH_PLAN.startSpeakingPlan.transcriptionEndpointingPlan.onPunctuationSeconds);
  for (const w of ["ja", "mhm", "genau", "okay"]) assert.ok(SPRECH_PLAN.stopSpeakingPlan.acknowledgementPhrases.includes(w), w);
  assert.ok(SPRECH_PLAN.stopSpeakingPlan.interruptionPhrases.includes("stopp"));
  const s = stimmeTelefon("onwK4e9ZLuTAKqWW03F9");
  assert.equal(s.model, "eleven_flash_v2_5");
  assert.equal(s.voiceId, "onwK4e9ZLuTAKqWW03F9");
  assert.ok(s.stability < 0.5);
});

test("Stufe A: Gedächtnis – Kurzfassungen der letzten drei Gespräche, älteste zuerst", async () => {
  const { gedaechtnisAus, LUCA_PROMPT } = await import("../lib/luca-logik.ts");
  const g = (zeit: string, kurz: string) => ({ zeit, text: `☎️ Gespräch mit Luca · 18:17 Uhr · 2 Min.\nGrund: x\n**Kurz:** ${kurz}` });
  const liste = [
    g("2026-11-05T17:17:32.000Z", "David will den ganzen Bühnen-Plan."),
    { zeit: "2026-11-05T17:17:33.000Z", text: "☎️ Gespräch mit Luca · Mitschrift 1\nAI: Hey" },
    g("2026-11-05T15:11:00.000Z", "David war unterwegs."),
    g("2026-11-04T10:00:00.000Z", "Ganz alt."),
    g("2026-11-05T14:31:00.000Z", "Merkliste-Auftrag."),
  ];
  const t = gedaechtnisAus(liste);
  assert.equal(t.split("\n").length, 3);
  assert.match(t.split("\n")[0], /Merkliste-Auftrag/);
  assert.match(t.split("\n")[2], /ganzen Bühnen-Plan/);
  assert.doesNotMatch(t, /Ganz alt|Mitschrift/);
  assert.equal(gedaechtnisAus([]), "(noch keine früheren Gespräche)");
  assert.match(LUCA_PROMPT, /\{\{gedaechtnis\}\}/);
  assert.match(LUCA_PROMPT, /Umgangssprache/);
});

test("Stimme mitschicken nur, wenn Luca klassisch läuft: GPT Live lehnt fremde Stimmen samt Anruf ab", () => {
  assert.equal(laeuftKlassisch({ voice: { provider: "11labs" } }), true);
  assert.equal(laeuftKlassisch({ voice: { provider: "openai" } }), false);
  // Vapi antwortet nicht oder nichts eingestellt: lieber keine Stimme schicken, der Anruf klappt dann trotzdem
  assert.equal(laeuftKlassisch(null), false);
  assert.equal(laeuftKlassisch({}), false);
});

test("Überblick über Lucas Einstellungen: ohne Prompt und ohne Geheimnisse", () => {
  const u = assistentUeberblick({
    voice: { provider: "openai", voiceId: "cedar" },
    transcriber: { provider: "assembly-ai" },
    model: { provider: "openai", model: "gpt-live", messages: [{ role: "system", content: "GEHEIMER PROMPT" }], tools: [{ type: "function", function: { name: "auftrag_geben" } }, { type: "endCall" }] },
    server: { url: "https://agentsgilt.com/api/luca", secret: "GEHEIM" },
    serverMessages: ["tool-calls", "end-of-call-report"],
    analysisPlan: { summaryPlan: {} },
    maxDurationSeconds: 900,
  } as never);
  assert.equal(u?.art, "gpt-live-oder-eigene-stimme");
  assert.deepEqual(u?.werkzeuge, ["auftrag_geben", "endCall"]);
  assert.equal(u?.serverGesetzt, true);
  assert.ok(!JSON.stringify(u).includes("GEHEIM"));
  assert.equal(assistentUeberblick(null), null);
});

test("Luca kennt am Telefon die Kunden aus Notion: Stand, nächster Schritt, überfälliges Follow-up", () => {
  const jetzt = new Date("2026-11-05T20:00:00.000Z");
  const t = kundenText([{ nr: "KND-003", name: "Relax Fit", status: "Angebot gesendet", naechsterSchritt: "Neuen Termin ausmachen", followUp: "2026-10-22", angebot: "Websites", vercelProjekt: "https://relaxfit-demo.vercel.app", live: false }, { nr: "KND-002", name: "Friseur Graziella", status: "Lead", followUp: "2026-12-01" }], jetzt);
  assert.match(t, /KND-003 Relax Fit: Status: Angebot gesendet/);
  assert.match(t, /nächster Schritt: Neuen Termin ausmachen/);
  assert.match(t, /Follow-up 22\.10\. \(überfällig\)/);
  assert.match(t, /Demo ist online/);
  assert.match(t, /Follow-up 01\.12\.(?! \()/);
  assert.match(kundenText(null, jetzt), /nicht erreichbar/);
  assert.match(kundenText([], jetzt), /noch kein Kunde/);
  assert.ok(kundenText(Array.from({ length: 50 }, (_, i) => ({ nr: `KND-${i}`, name: "x".repeat(200) })), jetzt).length <= 1800);
});

test("Im Gedächtnis heißt Luca Luca, auch wenn die Mitschrift Lukas verstanden hat", () => {
  const g = gedaechtnisAus([{ zeit: "2026-11-05T17:17:00.000Z", text: "**Kurz:** David erlaubt Lukas' neue Bühne. Lukas darf zeigen." }]);
  assert.ok(!/Lukas/.test(g));
  assert.match(g, /Luca neue Bühne/);
});

test("Mailbox: Erkennung per Vapi, kurzer Satz ohne Inhalte", () => {
  assert.equal(MAILBOX.voicemailDetection.provider, "vapi");
  assert.ok(MAILBOX.voicemailDetection.backoffPlan.frequencySeconds >= 2.5);
  assert.ok(MAILBOX.voicemailMessage.length < 120);
});
