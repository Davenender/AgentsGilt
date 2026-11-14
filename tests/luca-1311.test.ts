// Davids Ärger 13.11.: Luca redete über die Mailbox-Ansage, sprach dort „als David“ und rief wegen derselben Sache neunmal an.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefAus, briefText, gespraechBrief, istMailbox, LUCA_WERKZEUGE } from "../lib/luca-logik.ts";

const MAILBOX_1 =
  "User: Dein Anruf\nAI: Hey Chef, Luca\nUser: wurde an\nAI: hier!\nUser: Voicemail\nAI: Du wolltest erinnert\nUser: weitergeleitet\nAI: werden:";
const MAILBOX_2 =
  "User: Guten Tag, Sie sind verbunden mit der Vodafone Mailbox von Null, Eins, Fünf. Bitte sprechen Sie Ihre Nachricht nach dem Tonsignal\nAI: Hey Chef, Luca hier!";
const DAVID = "AI: Hey Chef, Luca hier!\nUser: Ja\nAI: Du wolltest erinnert werden: Marc eine Mail.\nUser: Mach ich später\nAI: Okay.";

test("Mailbox wird an der Ansage erkannt, ein echtes Gespräch nicht", () => {
  assert.equal(istMailbox(MAILBOX_1), true);
  assert.equal(istMailbox(MAILBOX_2), true);
  assert.equal(istMailbox(DAVID), false);
  // Sagt David später „sprich mir auf die Mailbox“, ist das keine Ansage
  assert.equal(istMailbox(`${DAVID}\nUser: ${"bla ".repeat(80)} sprich mir auf die Mailbox`), false);
  assert.equal(istMailbox(""), false);
});

test("Nach jedem Gespräch geht ein Brief an die Zentrale: Dauer, Richtung, Mailbox", () => {
  const b = gespraechBrief({ call: { id: "c1", type: "outboundPhoneCall", startedAt: "2026-11-13T11:04:40Z" }, durationSeconds: 25, artifact: { transcript: MAILBOX_1 } }, "2026-11-13T11:05:05Z");
  assert.deepEqual(b, { typ: "gespraech", start: "2026-11-13T11:04:40Z", sekunden: 25, mailbox: true, richtung: "raus", zeit: "2026-11-13T11:05:05Z", anruf: "c1" });
  const rein = gespraechBrief({ call: { id: "c2", type: "inboundPhoneCall" }, durationSeconds: 61.4, transcript: DAVID }, "2026-11-13T11:20:00Z");
  assert.deepEqual(rein, { typ: "gespraech", start: "2026-11-13T11:18:58.600Z", sekunden: 61, mailbox: false, richtung: "rein", zeit: "2026-11-13T11:20:00Z", anruf: "c2" });
});

test("Rückruf mit Uhrzeit und Stichwort (statt selbst gerechneter Minuten)", () => {
  assert.deepEqual(briefAus("rueckruf_planen", { uhrzeit: "15:40", text: "Wegen Marc klären", thema: "Marc" }, "s"), { typ: "rueckruf", uhrzeit: "15:40", text: "Wegen Marc klären", thema: "Marc" });
  assert.equal(briefAus("rueckruf_planen", { uhrzeit: "25:99", text: "x" }, "s"), null);
  // wie bisher
  assert.deepEqual(briefAus("rueckruf_planen", { minuten: "30", text: "Plan in Ruhe besprechen" }, "s"), { typ: "rueckruf", minuten: 30, text: "Plan in Ruhe besprechen" });
});

test("Erinnerung nach Schulschluss mit Stichwort", () => {
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Schreib Marc nochmal eine Mail", ort: "Schule", ereignis: "abfahrt", nach_schulschluss: true, warten: 10, thema: "Marc Mail" }, "s"), {
    typ: "erinnerung",
    text: "Schreib Marc nochmal eine Mail",
    ort: "Schule",
    ereignis: "abfahrt",
    warten: 10,
    nachSchule: true,
    thema: "Marc Mail",
  });
});

test("„Erledigt“ und „Lösch Nummer 2“ am Telefon", () => {
  assert.deepEqual(briefAus("erinnerung_erledigt", { thema: "Marc Mail" }, "s"), { typ: "erledigt", thema: "Marc Mail" });
  assert.deepEqual(briefAus("erinnerung_erledigt", { thema: "Marc Mail", spaeter_uhrzeit: "19:30", text: "Schreib Marc" }, "s"), { typ: "erledigt", thema: "Marc Mail", uhrzeit: "19:30", text: "Schreib Marc" });
  assert.deepEqual(briefAus("erinnerung_erledigt", { thema: "Marc", spaeter_minuten: 45 }, "s"), { typ: "erledigt", thema: "Marc", minuten: 45 });
  assert.equal(briefAus("erinnerung_erledigt", {}, "s"), null);
  assert.deepEqual(briefAus("erinnerung_loeschen", { nr: "2" }, "s"), { typ: "erinnerung_weg", nr: 2 });
  assert.equal(briefAus("erinnerung_loeschen", { nr: 0 }, "s"), null);
  assert.match(briefText({ typ: "erledigt", thema: "Marc", zeit: "z" }), /Erledigt: Marc/);
});

test("Die neuen Werkzeuge sind da und Rückruf braucht keine Minuten mehr", () => {
  const namen = LUCA_WERKZEUGE.map((w) => w.function.name);
  for (const n of ["erinnerung_erledigt", "erinnerung_loeschen", "rueckruf_planen", "erinnerung_planen"]) assert.ok(namen.includes(n), n);
  const rr = LUCA_WERKZEUGE.find((w) => w.function.name === "rueckruf_planen")!;
  assert.deepEqual([...rr.function.parameters.required], ["text"]);
});

test("Der Briefkasten lässt die neuen Briefe durch (sonst kämen sie nie in der Zentrale an)", async () => {
  const { briefLesen } = await import("../lib/luca-logik.ts");
  for (const b of [
    { typ: "gespraech", start: "2026-11-13T11:00:00Z", sekunden: 60, mailbox: false, richtung: "rein", zeit: "z" },
    { typ: "erledigt", thema: "Marc", zeit: "z" },
    { typ: "erinnerung_weg", nr: 2, zeit: "z" },
  ] as const) assert.ok(briefLesen(briefText(b)), b.typ);
});

// Etappe 2 (14.11.): Nachricht aufs Handy, Wunschliste, neue Vorlagen zum Zeigen
test("Etappe 2: nachricht_schicken und wunsch_merken werden Briefe, die der Briefkasten durchlässt", async () => {
  const { briefLesen, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("nachricht_schicken", { text: "Relax Fit: Bürgermeister-Mahr-Str. 44" }, "s"), { typ: "nachricht", text: "Relax Fit: Bürgermeister-Mahr-Str. 44" });
  assert.equal(briefAus("nachricht_schicken", { text: "  " }, "s"), null);
  assert.deepEqual(briefAus("wunsch_merken", { text: "Spotify steuern" }, "s"), { typ: "wunsch", text: "Spotify steuern" });
  for (const b of [{ typ: "nachricht", text: "x", zeit: "z" }, { typ: "wunsch", text: "y", zeit: "z" }] as const) assert.ok(briefLesen(briefText(b)), b.typ);
  for (const v of ["hilfe", "wunschliste", "nachrichten"]) assert.ok((ZEIG_VORLAGEN as readonly string[]).includes(v), v);
  const namen = LUCA_WERKZEUGE.map((w) => w.function.name);
  assert.ok(namen.includes("nachricht_schicken") && namen.includes("wunsch_merken"));
});

// Etappe 3 (14.11.): Erinnern komplett am Telefon
test("Etappe 3: wiederkehrend, unterwegs, bei Ereignis, vor dem Termin, am Mac, ändern, heute nicht mehr", async () => {
  const { briefLesen, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("erinnerung_wiederkehrend", { text: "Wochenplan", tage: "mo,mi", uhrzeit: "7:00", thema: "Wochenplan" }, "s"), { typ: "erinnerung", text: "Wochenplan", wiederholen: { tage: [1, 3], uhrzeit: "07:00" }, thema: "Wochenplan" });
  assert.deepEqual(briefAus("erinnerung_wiederkehrend", { text: "Lernen", tage: "schultage", nach_stunde: 6 }, "s"), { typ: "erinnerung", text: "Lernen", wiederholen: { tage: "schultage", nachStunde: 6 } });
  assert.deepEqual(briefAus("erinnerung_wiederkehrend", { text: "Tasche", tage: "taeglich", uhrzeit: "21:30" }, "s"), { typ: "erinnerung", text: "Tasche", wiederholen: { tage: [0, 1, 2, 3, 4, 5, 6], uhrzeit: "21:30" } });
  assert.equal(briefAus("erinnerung_wiederkehrend", { text: "x", tage: "mo" }, "s"), null);
  assert.deepEqual(briefAus("erinnerung_unterwegs", { text: "Buch", ziel: "Bibliothek", wann: "halb" }, "s"), { typ: "erinnerung", text: "Buch", unterwegs: { ziel: "Bibliothek", wann: "halb" } });
  assert.deepEqual(briefAus("erinnerung_bei_ereignis", { text: "Marc hat geantwortet", art: "mail", wer: "Marc", wie: "nachricht" }, "s"), { typ: "erinnerung", text: "Marc hat geantwortet", wenn: { art: "mail", wer: "Marc" }, wie: "nachricht" });
  assert.deepEqual(briefAus("erinnerung_vor_termin", { text: "Unterlagen", termin: "Relax Fit", minuten: 30 }, "s"), { typ: "erinnerung", text: "Unterlagen", vorTermin: { titel: "Relax Fit", minuten: 30 } });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Rechnung", am_mac: true, nachhaken: true }, "s"), { typ: "erinnerung", text: "Rechnung", amMac: true, nachhaken: true });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Hausaufgaben", ort: "Schule", ereignis: "abfahrt", mal: 2 }, "s"), { typ: "erinnerung", text: "Hausaufgaben", ort: "Schule", ereignis: "abfahrt", mal: 2 });
  assert.deepEqual(briefAus("erinnerung_aendern", { nr: 1, uhrzeit: "18:00" }, "s"), { typ: "erinnerung_aendern", nr: 1, uhrzeit: "18:00" });
  assert.deepEqual(briefAus("erinnerung_erledigt", { thema: "Marc", erst_morgen: true }, "s"), { typ: "erledigt", thema: "Marc", erstMorgen: true });
  assert.ok(briefLesen(briefText({ typ: "erinnerung_aendern", nr: 1, uhrzeit: "18:00", zeit: "z" })));
  assert.ok((ZEIG_VORLAGEN as readonly string[]).includes("anrufe"));
});

// Etappe 4 (14.11.): Pause und Fokus, Einstellungen, Morgen-Überblick, dringend, Karte des Tages
test("Etappe 4: Pause, Fokus, Einstellungen, Überblick und dringend", async () => {
  const { briefLesen, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("pause", {}, "s"), { typ: "pause", bis: "morgen" });
  assert.deepEqual(briefAus("pause", { bis: "18:00", fokus: true }, "s"), { typ: "pause", bis: "18:00", fokus: true });
  assert.deepEqual(briefAus("pause", { aufheben: true }, "s"), { typ: "pause", aufheben: true });
  assert.deepEqual(briefAus("luca_einstellen", { was: "tagesabschluss", an: false }, "s"), { typ: "einstellung", was: "tagesabschluss", an: false });
  assert.deepEqual(briefAus("luca_einstellen", { was: "tagesabschluss", an: true, uhrzeit: "21:00" }, "s"), { typ: "einstellung", was: "tagesabschluss", an: true, uhrzeit: "21:00" });
  assert.equal(briefAus("luca_einstellen", { was: "kaffee", an: true }, "s"), null);
  assert.deepEqual(briefAus("erinnerung_wiederkehrend", { text: "Guten Morgen", tage: "schultage", uhrzeit: "06:45", ueberblick: true, wie: "nachricht" }, "s"), { typ: "erinnerung", text: "Guten Morgen", wiederholen: { tage: "schultage", uhrzeit: "06:45" }, wie: "nachricht", ueberblick: true });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Arzt", minuten: 30, dringend: true }, "s"), { typ: "erinnerung", text: "Arzt", minuten: 30, dringend: true });
  for (const b of [{ typ: "pause", bis: "morgen", zeit: "z" }, { typ: "einstellung", was: "schlafhinweis", an: false, zeit: "z" }] as const) assert.ok(briefLesen(briefText(b)), b.typ);
  assert.ok((ZEIG_VORLAGEN as readonly string[]).includes("tageskarte"));
});

// Etappe 5 (14.11.): Schule am Telefon
test("Etappe 5: Schule eintragen, Stoppuhr, Abfrage, Anzeigen", async () => {
  const { briefLesen, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("schule_eintragen", { was: "hausaufgabe", fach: "Mathe", text: "S. 12 Nr. 3", bis: "morgen" }, "s"), { typ: "schuldaten", was: "hausaufgabe", fach: "Mathe", text: "S. 12 Nr. 3", bis: "morgen" });
  assert.deepEqual(briefAus("schule_eintragen", { was: "note", fach: "Bio", art: "klausur", punkte: 11 }, "s"), { typ: "schuldaten", was: "note", fach: "Bio", art: "klausur", punkte: 11 });
  assert.deepEqual(briefAus("schule_eintragen", { was: "lernthemen", fach: "Mathe", klausur: "02.12.", themen: ["Ableitungen", "Integrale"] }, "s"), { typ: "schuldaten", was: "lernthemen", fach: "Mathe", klausur: "02.12.", themen: ["Ableitungen", "Integrale"] });
  assert.equal(briefAus("schule_eintragen", { was: "quatsch" }, "s"), null);
  assert.deepEqual(briefAus("lernen", { aktion: "start", fach: "Bio" }, "s"), { typ: "lernen", aktion: "start", fach: "Bio" });
  assert.deepEqual(briefAus("lernen", { aktion: "stopp", fach: "Bio", thema: "Operon" }, "s"), { typ: "lernen", aktion: "stopp", fach: "Bio", thema: "Operon" });
  assert.deepEqual(briefAus("abfrage", { fach: "Bio" }, "s"), { typ: "abfrage", fach: "Bio" });
  for (const b of [{ typ: "schuldaten", was: "note", fach: "Bio", punkte: 11, zeit: "z" }, { typ: "lernen", aktion: "start", zeit: "z" }, { typ: "abfrage", fach: "Bio", zeit: "z" }] as const) assert.ok(briefLesen(briefText(b)), b.typ);
  for (const v of ["klausuren", "hausaufgaben", "lernzeit"]) assert.ok((ZEIG_VORLAGEN as readonly string[]).includes(v), v);
});

// Etappe 6 (14.11.): Agents Gilt am Telefon
test("Etappe 6: Mail-Entwurf, Frist, Preis, Geld, Pipeline", async () => {
  const { briefLesen, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("mail_entwurf", { an: "Marc", worum: "Nachfassen zum Angebot" }, "s"), { typ: "mailentwurf", an: "Marc", worum: "Nachfassen zum Angebot" });
  assert.equal(briefAus("mail_entwurf", { an: "Marc" }, "s"), null);
  assert.deepEqual(briefAus("frist_merken", { titel: "Angebot läuft aus", bis: "20.11." }, "s"), { typ: "frist", titel: "Angebot läuft aus", bis: "20.11." });
  assert.deepEqual(briefAus("frist_merken", { titel: "Shadow", erledigt: true }, "s"), { typ: "frist", titel: "Shadow", erledigt: true });
  assert.deepEqual(briefAus("preis_rechnen", { posten: ["Website", "Chatbot"] }, "s"), { typ: "preis", posten: ["Website", "Chatbot"] });
  assert.deepEqual(briefAus("geld_abfragen", {}, "s"), { typ: "geld" });
  for (const b of [{ typ: "mailentwurf", an: "M", worum: "x", zeit: "z" }, { typ: "frist", titel: "x", zeit: "z" }, { typ: "preis", posten: ["x"], zeit: "z" }, { typ: "geld", zeit: "z" }] as const) assert.ok(briefLesen(briefText(b)), b.typ);
  for (const v of ["pipeline", "geld"]) assert.ok((ZEIG_VORLAGEN as readonly string[]).includes(v), v);
});

// Etappe 7 (14.11.): Agents Gilt II und Team
test("Etappe 7: Team-Aufgabe, Team-Nachricht, Team anrufen, Demo, Idee, Recherche", async () => {
  const { briefLesen, ZEIG_VORLAGEN } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("team_aufgabe", { wer: "Oskar", was: "Fotos machen", bis: "Montag" }, "s"), { typ: "teamaufgabe", wer: "Oskar", was: "Fotos machen", bis: "Montag" });
  assert.deepEqual(briefAus("team_aufgabe", { wer: "Oskar", was: "Fotos", erledigt: true }, "s"), { typ: "teamaufgabe", wer: "Oskar", was: "Fotos", erledigt: true });
  assert.deepEqual(briefAus("team_nachricht", { wer: "Oskar", text: "Kannst du Montag?" }, "s"), { typ: "teamnachricht", wer: "Oskar", text: "Kannst du Montag?" });
  // Anrufen nur nach Davids Ja; Kundeninfos nur, wenn er sie freigibt
  assert.equal(briefAus("team_anrufen", { wer: "Oskar", worum: "Telefon-Assistent erklären" }, "s"), null);
  assert.deepEqual(briefAus("team_anrufen", { wer: "Oskar", worum: "Telefon-Assistent erklären", bestaetigt: true }, "s"), { typ: "teamanruf", wer: "Oskar", worum: "Telefon-Assistent erklären" });
  assert.deepEqual(briefAus("team_anrufen", { wer: "Oskar", worum: "Relax Fit erklären", bestaetigt: true, kundeninfo: "Relax Fit: Angebot 150 €", kundeninfo_freigegeben: true }, "s"), { typ: "teamanruf", wer: "Oskar", worum: "Relax Fit erklären", kundeninfo: "Relax Fit: Angebot 150 €" });
  assert.deepEqual(briefAus("team_anrufen", { wer: "Oskar", worum: "x", bestaetigt: true, kundeninfo: "geheim" }, "s"), { typ: "teamanruf", wer: "Oskar", worum: "x" });
  assert.deepEqual(briefAus("demo_schicken", { kunde: "Relax Fit" }, "s"), { typ: "demo", kunde: "Relax Fit" });
  assert.deepEqual(briefAus("idee_merken", { text: "Paket für Friseure" }, "s"), { typ: "idee", text: "Paket für Friseure" });
  assert.deepEqual(briefAus("recherche_auftrag", { art: "leads", wunsch: "Friseure in Offenbach" }, "s"), { typ: "recherche", art: "leads", wunsch: "Friseure in Offenbach" });
  for (const b of [{ typ: "teamaufgabe", wer: "a", was: "b", zeit: "z" }, { typ: "teamanruf", wer: "a", worum: "b", zeit: "z" }, { typ: "demo", kunde: "a", zeit: "z" }, { typ: "idee", text: "a", zeit: "z" }, { typ: "recherche", art: "leads", wunsch: "a", zeit: "z" }, { typ: "teamnachricht", wer: "a", text: "b", zeit: "z" }] as const) assert.ok(briefLesen(briefText(b)), b.typ);
  assert.ok((ZEIG_VORLAGEN as readonly string[]).includes("team"));
});

test("Etappe 7: Team-Anruf nur an aktive Teammitglieder, tagsüber, ohne Werkzeuge", async () => {
  const { teamMitgliedFuer, teamAnrufZeit, teamAnrufAssistent, nummerE164 } = await import("../lib/luca-logik.ts");
  const team = [
    { discord: "1", name: "Oskar", status: "team", notion: "", figur: "", seit: "", telefon: "0151 2345678" },
    { discord: "2", name: "Lena", status: "ausgetreten", notion: "", figur: "", seit: "", telefon: "0151 9999999" },
  ] as const;
  assert.deepEqual(teamMitgliedFuer(team, "", "oskar"), { name: "Oskar", nummer: "+491512345678" });
  assert.equal(teamMitgliedFuer(team, "", "Lena"), null);
  assert.equal(teamMitgliedFuer(team, "", "Marc"), null);
  assert.deepEqual(teamMitgliedFuer([{ ...team[0], telefon: "" }], "Oskar=+49 151 1112223", "Oskar"), { name: "Oskar", nummer: "+491511112223" });
  assert.equal(nummerE164("0049 151 1"), "+491511");
  assert.equal(teamAnrufZeit(new Date("2026-11-14T07:30:00Z")), true); // 8:30 Uhr
  assert.equal(teamAnrufZeit(new Date("2026-11-14T20:30:00Z")), false); // 21:30 Uhr
  const vorlage = { model: { provider: "openai", model: "gpt-live-1", speaker: { instructions: "alt" }, reasoner: { instructions: "alt" }, tools: [{ type: "function" }], toolIds: ["x"] }, voice: { provider: "openai", voiceId: "cedar" }, transcriber: { provider: "assembly-ai" } };
  const a = teamAnrufAssistent(vorlage, { name: "Oskar", worum: "Wie der Telefon-Assistent funktioniert" });
  assert.equal(a.firstMessageMode, "assistant-waits-for-user");
  assert.deepEqual((a.model as { tools: unknown[] }).tools, [{ type: "endCall" }]);
  assert.equal((a.model as { toolIds?: unknown }).toolIds, undefined);
  const sp = (a.model as { speaker: { instructions: string } }).speaker.instructions;
  assert.match(sp, /Oskar/);
  assert.match(sp, /Wie der Telefon-Assistent funktioniert/);
  assert.match(sp, /Kundendaten gibst du nicht weiter/);
  assert.deepEqual(a.metadata, { luca: true, team: true, wer: "Oskar" });
  const mit = teamAnrufAssistent(vorlage, { name: "Oskar", worum: "Relax Fit", kundeninfo: "Angebot 150 €" });
  assert.match((mit.model as { speaker: { instructions: string } }).speaker.instructions, /Von David freigegeben: Angebot 150 €/);
});
