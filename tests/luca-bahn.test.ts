import assert from "node:assert/strict";
import { test } from "node:test";
import { aufsHandy, verbindungText, zeitAus } from "../lib/luca-unterwegs.ts";

// 17.11.2026, Davids Wunsch nach dem Test-Anruf: Bei der Bahn soll Luca genau sagen (und auf Wunsch schicken), zu welcher
// Haltestelle er wie lange läuft, welche Linie in welche Richtung, ob sie Verspätung hat, wo er umsteigt – und bei
// „morgen zur Tanzschule um halb sechs“ eine Verbindung mit Ankunft bis dahin statt der nächsten ab jetzt.
const JETZT = new Date("2026-11-17T18:30:00.000Z"); // 19:30 Uhr in Berlin
const tst = Math.floor(JETZT.getTime() / 1000) - 60;
const welt = {
  standort: { lat: 50.1215, lon: 8.838, tst, ort: "Zuhause" },
  orte: [{ name: "Zuhause", lat: 50.1215, lon: 8.838, rad: 120 }, { name: "Tanzschule", lat: 50.104623, lon: 8.759126, rad: 150 }],
  jetzt: JETZT,
};
const netz = (antwort: unknown, aufrufe: string[] = []) =>
  (async (u: string | URL) => {
    aufrufe.push(String(u));
    return new Response(JSON.stringify(antwort), { status: 200 });
  }) as typeof fetch;

const geh = (von: string, bis: string, an: string, m: number) => ({ mode: "WALK", startTime: von, endTime: bis, distance: m, from: { name: "START" }, to: { name: an } });
const fahrt = (o: { linie: string; richtung: string; ab: string; an: string; von: string; bis: string; plan?: string; echt?: boolean; gleis?: string; aus?: boolean }) => ({
  mode: "SUBURBAN", routeShortName: o.linie, headsign: o.richtung, startTime: o.von, endTime: o.bis, realTime: o.echt ?? false, cancelled: o.aus ?? false,
  scheduledStartTime: o.plan ?? o.von,
  from: { name: o.ab, departure: o.von, scheduledDeparture: o.plan ?? o.von, ...(o.gleis ? { track: o.gleis } : {}) },
  to: { name: o.an, arrival: o.bis },
});
// Echte Antwort von transitous (gekürzt): Mühlheim Bahnhof → Offenbach Marktplatz, Ankunft bis 17:30
const PLAN = {
  itineraries: [
    { startTime: "2026-11-18T15:48:00Z", endTime: "2026-11-18T16:10:00Z", transfers: 0, legs: [
      geh("2026-11-18T15:48:00Z", "2026-11-18T15:53:00Z", "Mühlheim (Main) Bahnhof", 340),
      fahrt({ linie: "S8", richtung: "Wiesbaden Hauptbahnhof", ab: "Mühlheim (Main) Bahnhof", an: "Offenbach (Main)-Zentrum Marktplatz", von: "2026-11-18T15:53:00Z", bis: "2026-11-18T16:00:00Z" }),
      { ...geh("2026-11-18T16:00:00Z", "2026-11-18T16:10:00Z", "END", 698), from: { name: "Offenbach (Main)-Zentrum Marktplatz" } },
    ] },
    { startTime: "2026-11-18T16:03:00Z", endTime: "2026-11-18T16:25:00Z", transfers: 0, legs: [
      geh("2026-11-18T16:03:00Z", "2026-11-18T16:08:00Z", "Mühlheim (Main) Bahnhof", 340),
      fahrt({ linie: "S9", richtung: "Wiesbaden Hauptbahnhof", ab: "Mühlheim (Main) Bahnhof", an: "Offenbach (Main)-Zentrum Marktplatz", von: "2026-11-18T16:08:00Z", bis: "2026-11-18T16:15:00Z" }),
      { ...geh("2026-11-18T16:15:00Z", "2026-11-18T16:25:00Z", "END", 698), from: { name: "Offenbach (Main)-Zentrum Marktplatz" } },
    ] },
  ],
};

test("Uhrzeiten wie David sie sagt: morgen 17:30, 17:30 (schon vorbei → morgen), 18.11. 9 Uhr", () => {
  assert.equal(zeitAus("morgen 17:30", JETZT), "2026-11-18T16:30:00.000Z");
  assert.equal(zeitAus("17:30", JETZT), "2026-11-18T16:30:00.000Z");
  assert.equal(zeitAus("halb sechs", JETZT), null, "Worte rechnet Luca vorher in HH:MM um");
  assert.equal(zeitAus("21:15", JETZT), "2026-11-17T20:15:00.000Z");
  assert.equal(zeitAus("18.11. 9 Uhr", JETZT), "2026-11-18T08:00:00.000Z");
  assert.equal(zeitAus("", JETZT), null);
});

test("Ankunft bis 17:30: späteste passende Verbindung, ganz genau, und eine früher", async () => {
  const aufrufe: string[] = [];
  const t = await verbindungText({ nach: "Tanzschule", ankunft: "17:30" }, welt, netz(PLAN, aufrufe));
  assert.ok(aufrufe[0].includes("time=2026-11-18T16%3A30%3A00.000Z") || aufrufe[0].includes("time=2026-11-18T16:30:00.000Z"), aufrufe[0]);
  assert.ok(aufrufe[0].includes("arriveBy=true"));
  assert.match(t, /^Von Zuhause nach Tanzschule, Ankunft bis Mittwoch 17:30 Uhr\./);
  assert.match(t, /Um 17:03 Uhr los, 5 Minuten zu Fuß \(340 m\) zur Haltestelle Mühlheim \(Main\) Bahnhof\./);
  assert.match(t, /17:08 Uhr S9 Richtung Wiesbaden Hauptbahnhof bis Offenbach \(Main\)-Zentrum Marktplatz \(an 17:15 Uhr\)\./);
  assert.match(t, /Dann 10 Minuten zu Fuß, Ankunft 17:25 Uhr, ohne Umstieg\./);
  assert.match(t, /Eine früher: 16:53 Uhr mit S8, Ankunft 17:10 Uhr\./);
});

test("Verspätung, Gleis, Umstieg und Ausfall werden gesagt; ohne Zeit wie bisher ab jetzt", async () => {
  const plan = { itineraries: [{ startTime: "2026-11-17T18:40:00Z", endTime: "2026-11-17T19:20:00Z", transfers: 1, legs: [
    geh("2026-11-17T18:40:00Z", "2026-11-17T18:44:00Z", "Mühlheim a.M. Südring", 280),
    { ...fahrt({ linie: "OF-32", richtung: "Mühlheim Am Anger", ab: "Mühlheim a.M. Südring", an: "Mühlheim (Main) Bahnhof", von: "2026-11-17T18:47:00Z", plan: "2026-11-17T18:44:00Z", bis: "2026-11-17T18:52:00Z", echt: true }), mode: "BUS" },
    { ...geh("2026-11-17T18:52:00Z", "2026-11-17T18:55:00Z", "Mühlheim (Main) Bahnhof", 150), from: { name: "Mühlheim (Main) Bahnhof" } },
    fahrt({ linie: "S8", richtung: "Wiesbaden Hauptbahnhof", ab: "Mühlheim (Main) Bahnhof", an: "Offenbach (Main)-Zentrum Marktplatz", von: "2026-11-17T18:58:00Z", bis: "2026-11-17T19:05:00Z", echt: true, gleis: "2" }),
    { ...geh("2026-11-17T19:05:00Z", "2026-11-17T19:20:00Z", "END", 698), from: { name: "Offenbach (Main)-Zentrum Marktplatz" } },
  ] }] };
  const aufrufe: string[] = [];
  const t = await verbindungText({ nach: "Tanzschule" }, welt, netz(plan, aufrufe));
  assert.ok(!aufrufe[0].includes("arriveBy"));
  assert.match(t, /Nächste Verbindung: Um 19:40 Uhr los, 4 Minuten zu Fuß \(280 m\) zur Haltestelle Mühlheim a\.M\. Südring\./);
  assert.match(t, /19:44 Uhr OF-32 Richtung Mühlheim Am Anger, heute 3 Minuten Verspätung \(fährt 19:47 Uhr\), bis Mühlheim \(Main\) Bahnhof \(an 19:52 Uhr\)\./);
  assert.match(t, /Umsteigen: 3 Minuten zu Fuß\. 19:58 Uhr S8 Richtung Wiesbaden Hauptbahnhof von Gleis 2, pünktlich, bis Offenbach/);
  assert.match(t, /1-mal umsteigen\./);
  const aus = { itineraries: [{ ...plan.itineraries[0], legs: plan.itineraries[0].legs.map((l, i) => (i === 3 ? { ...l, cancelled: true } : l)) }] };
  assert.match(await verbindungText({ nach: "Tanzschule" }, welt, netz(aus)), /S8 Richtung Wiesbaden Hauptbahnhof von Gleis 2 fällt aus/);
});

test("Aufs Handy nur auf Wunsch und nie eine Fehlermeldung", () => {
  const t = "Von Zuhause nach Tanzschule. Nächste Verbindung: …";
  assert.equal(aufsHandy("verbindung_suchen", { schicken: true }, t), t);
  assert.equal(aufsHandy("route_berechnen", { schicken: true }, "Von A nach B mit dem Auto: 8 Kilometer"), "Von A nach B mit dem Auto: 8 Kilometer");
  assert.equal(aufsHandy("verbindung_suchen", {}, t), null);
  assert.equal(aufsHandy("wetter_abrufen", { schicken: true }, t), null);
  assert.equal(aufsHandy("verbindung_suchen", { schicken: true }, "Die Fahrplanauskunft ist gerade nicht erreichbar. Frag in ein paar Minuten nochmal."), null);
  assert.equal(aufsHandy("verbindung_suchen", { schicken: true }, "Von A nach B habe ich gerade keine Verbindung gefunden."), null);
});

test("Rückruf in der Pause: „ruf mich in der Pause an“ wird ein Pausen-Rückruf (Zeit rechnet die Zentrale)", async () => {
  const { briefAus } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("rueckruf_planen", { pause: true, text: "Wir besprechen die Vertretung", thema: "Vertretung" }, ""), { typ: "rueckruf", pause: true, text: "Wir besprechen die Vertretung", thema: "Vertretung" });
  // Pause schlägt Minuten: David sagte „in der Pause“
  assert.deepEqual(briefAus("rueckruf_planen", { pause: true, minuten: 30, text: "x" }, ""), { typ: "rueckruf", pause: true, text: "x" });
  assert.deepEqual(briefAus("rueckruf_planen", { minuten: 30, text: "x" }, ""), { typ: "rueckruf", minuten: 30, text: "x" });
  // „ruf mich morgen in der Pause an“
  assert.deepEqual(briefAus("rueckruf_planen", { pause: true, morgen: true, text: "x" }, ""), { typ: "rueckruf", pause: true, morgen: true, text: "x" });
});

// Ü1 (17.11.): „Erst machen, dann sagen“ – die Erinnerung ist erst eingetragen, wenn die Zentrale es bestätigt (kommt ins
// Gespräch). Vorher sagte die Sofort-Antwort „ist eingeplant: Luca ruft David an“, auch bei „nur als Nachricht“.
test("Sofort-Antwort zur Erinnerung: noch nicht „fest drin“, und bei „nur als Nachricht“ kein Anruf", async () => {
  const { briefAntwort } = await import("../lib/luca-logik.ts");
  const a = briefAntwort({ typ: "erinnerung", text: "Trink Wasser", minuten: 10, wie: "nachricht" }, "STANDARD");
  assert.match(a, /Nachricht/);
  assert.doesNotMatch(a, /ruft David an/);
  assert.match(a, /bestätigt|Bestätigung/);
  assert.match(briefAntwort({ typ: "erinnerung", text: "x", minuten: 5 }, "STANDARD"), /Anruf/);
  assert.equal(briefAntwort({ typ: "idee", text: "x" }, "STANDARD"), "STANDARD");
});

// Ü2 (17.11.): „jeden Montag nach der 6. Stunde“ am Telefon – das Wort „jeden“ machte das ganze Tage-Feld ungültig.
test("Wiederkehrende Erinnerung: Füllwörter wie „jeden“ stören nicht, Unsinn bleibt ungültig", async () => {
  const { briefAus } = await import("../lib/luca-logik.ts");
  const b = (tage: string) => briefAus("erinnerung_wiederkehrend", { text: "Mathe-Hausaufgaben", tage, nach_stunde: 6 }, "") as { wiederholen?: unknown } | null;
  assert.deepEqual(b("jeden Montag")?.wiederholen, { tage: [1], nachStunde: 6 });
  assert.deepEqual(b("montags und mittwochs")?.wiederholen, { tage: [1, 3], nachStunde: 6 });
  assert.deepEqual(b("Mo")?.wiederholen, { tage: [1], nachStunde: 6 });
  assert.equal(b("irgendwann"), null);
});

// 17.11. 22:25: Luca legte im Anruf einen Termin direkt an (termin_anlegen läuft auf der Website, ohne Brief). Die Zentrale
// sah das nicht, hielt die Zusage für offen und trug zusätzlich eine Erinnerung ein. Der Gesprächs-Brief nennt die Werkzeuge.
test("Gesprächs-Brief nennt die Werkzeuge des Anrufs (ohne delegate)", async () => {
  const { gespraechBrief } = await import("../lib/luca-logik.ts");
  const b = gespraechBrief(
    {
      call: { id: "c1", type: "inboundPhoneCall", startedAt: "2026-11-17T21:25:41Z" },
      durationSeconds: 48,
      artifact: { transcript: "AI: Hey", messages: [{ role: "tool_calls", toolCalls: [{ function: { name: "delegate" } }, { function: { name: "termin_anlegen" } }] }, { role: "bot", message: "Ist eingetragen" }, { role: "tool_calls", toolCalls: [{ function: { name: "termin_anlegen" } }] }] },
    } as never,
    "2026-11-17T21:26:30Z",
  );
  assert.deepEqual(b.werkzeuge, ["termin_anlegen"]);
});

// Ü3/Ü4 (17.11.): keine Preise (David rechnet im Preisrechner), private Lernblöcke nicht in den Geschäftskalender
test("Werkzeug-Texte: preis_rechnen nennt keine Preise, termin_anlegen nur fürs Geschäft", async () => {
  const { LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  const beschr = (n: string) => (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((w) => w.function?.name === n)?.function?.description ?? "";
  assert.match(beschr("preis_rechnen"), /Preisrechner/);
  assert.match(beschr("preis_rechnen"), /nie|keine/);
  assert.match(beschr("termin_anlegen"), /erinnerung_planen/);
});

// 18.11.: günstige Tankstelle am Telefon – Standard Diesel, „Super E10“ auf Zuruf; rechnet die Zentrale (Tankerkönig-Schlüssel dort)
test("tankstelle_suchen wird ein Alltags-Brief „tanken“ mit Sorte", async () => {
  const { briefAus, LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("tankstelle_suchen", {}, ""), { typ: "alltag", was: "tanken", text: "diesel" });
  assert.deepEqual(briefAus("tankstelle_suchen", { sorte: "e10" }, ""), { typ: "alltag", was: "tanken", text: "e10" });
  const w = (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((x) => x.function?.name === "tankstelle_suchen");
  assert.match(w?.function?.description ?? "", /Diesel/);
});

// N1 (18.11.): „morgen nach der Schule“ am Telefon (Davids Regel rechnet die Zentrale aus)
test("erinnerung_planen mit nach_der_schule: heute, morgen, übermorgen oder Datum; Unsinn nicht", async () => {
  const { briefAus } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("erinnerung_planen", { text: "Bio lernen", thema: "Bio", nach_der_schule: "morgen" }, ""), { typ: "erinnerung", text: "Bio lernen", nachDerSchule: "morgen", thema: "Bio" });
  assert.deepEqual(briefAus("erinnerung_planen", { text: "x", nach_der_schule: "2026-11-20" }, ""), { typ: "erinnerung", text: "x", nachDerSchule: "2026-11-20" });
  assert.equal(briefAus("erinnerung_planen", { text: "x", nach_der_schule: "irgendwann" }, ""), null);
});

// N3 (18.11.): „Plan mir morgen“ am Telefon – die Zentrale rechnet den Plan mit festen Zeiten
test("tagesplan: Tag, erinnern, Nachricht statt Anruf, aufs Handy", async () => {
  const { briefAus, LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("tagesplan", { tag: "morgen" }, ""), { typ: "alltag", was: "tagesplan", tag: "morgen" });
  assert.deepEqual(briefAus("tagesplan", { tag: "2026-11-20", erinnern: true, wie: "nachricht", schicken: true }, ""), { typ: "alltag", was: "tagesplan", tag: "2026-11-20", erinnern: true, wie: "nachricht", schicken: true });
  assert.deepEqual(briefAus("tagesplan", {}, ""), { typ: "alltag", was: "tagesplan", tag: "morgen" });
  const w = (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((x) => x.function?.name === "tagesplan");
  assert.match(w?.function?.description ?? "", /Plan mir morgen/);
});

// N5 (18.11.): „Donnerstag um 4 hab ich Zahnarzt“ – nach Davids Ja in seinen privaten Kalender (die Zentrale trägt ein)
test("privattermin: nur mit Ja, Tag und Uhrzeit; Dauer und Ort optional", async () => {
  const { briefAus, LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("privattermin", { titel: "Zahnarzt", datum: "2026-11-26", uhrzeit: "16:00", bestaetigt: true }, ""), { typ: "alltag", was: "termin", titel: "Zahnarzt", datum: "2026-11-26", uhrzeit: "16:00" });
  assert.deepEqual(briefAus("privattermin", { titel: "Zahnarzt", datum: "morgen", uhrzeit: "9:30", minuten: 30, ort: "Praxis Dr. Müller", bestaetigt: true }, ""), { typ: "alltag", was: "termin", titel: "Zahnarzt", datum: "morgen", uhrzeit: "9:30", minuten: 30, ort: "Praxis Dr. Müller" });
  assert.equal(briefAus("privattermin", { titel: "Zahnarzt", datum: "2026-11-26", uhrzeit: "16:00" }, ""), null); // ohne Ja nichts
  assert.equal(briefAus("privattermin", { titel: "Zahnarzt", datum: "2026-11-26", bestaetigt: true }, ""), null); // ohne Uhrzeit nichts
  const w = (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((x) => x.function?.name === "privattermin");
  assert.match(w?.function?.description ?? "", /Zahnarzt/);
  const g = (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((x) => x.function?.name === "termin_anlegen");
  assert.match(g?.function?.description ?? "", /privattermin/);
});

// Telefon-Test 18.11.: Luca sagte „Ich prüfe Telefon, Briefkasten, Standort und iMessage“ und gleich „Läuft alles“ –
// der Systemcheck prüft mehr, und das Ergebnis kommt erst noch ins Gespräch
test("systemcheck: nennt den ganzen Umfang und behauptet vorher nichts", async () => {
  const { LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  const w = (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((x) => x.function?.name === "systemcheck");
  assert.match(w?.function?.description ?? "", /Vertretungsplan/);
  assert.match(w?.function?.description ?? "", /Das Ergebnis kommt gleich ins Gespräch; vorher nichts behaupten/);
});

// M2 (18.11.): Namen für die Spracherkennung (AssemblyAI keytermsPrompt, kostenlos auf universal-3-6-pro, höchstens 100 × 50 Zeichen)
test("Erkennungs-Wörter: geprüft, ohne Doppelte, nur bei AssemblyAI; alles andere bleibt", async () => {
  const { keytermsAus, transcriberMitWoertern } = await import("../lib/luca-logik.ts");
  assert.deepEqual(keytermsAus(["Mijo", " Oskar ", "mijo", "", 5, "x".repeat(60)]), ["Mijo", "Oskar"]);
  assert.equal(keytermsAus("Mijo"), null);
  assert.equal(keytermsAus(Array.from({ length: 150 }, (_, i) => `N${i}`))?.length, 100);
  const t = { provider: "assembly-ai", speechModel: "universal-3-6-pro", languageCodes: ["de"], confidenceThreshold: 0.4 };
  assert.deepEqual(transcriberMitWoertern(t, ["Mijo"]), { ...t, keytermsPrompt: ["Mijo"] });
  assert.equal(transcriberMitWoertern({ provider: "deepgram" }, ["Mijo"]), null);
  assert.equal(transcriberMitWoertern(undefined, ["Mijo"]), null);
});

// M6 (18.11.): Personen – „Ferdi ist unser Fotograf“, „Ferdi schickt die Fotos bis Freitag“, „Ferdi hat die Fotos geschickt“
test("person_merken: Name plus wer, offen oder erledigt", async () => {
  const { briefAus, LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  assert.deepEqual(briefAus("person_merken", { name: "Ferdi", wer: "Fotograf für unsere Kunden" }, ""), { typ: "alltag", was: "person", name: "Ferdi", text: "Fotograf für unsere Kunden" });
  assert.deepEqual(briefAus("person_merken", { name: "Ferdi", offen: "schickt die Fotos bis Freitag" }, ""), { typ: "alltag", was: "person", name: "Ferdi", offen: "schickt die Fotos bis Freitag" });
  assert.deepEqual(briefAus("person_merken", { name: "Ferdi", erledigt: "Fotos geschickt" }, ""), { typ: "alltag", was: "person", name: "Ferdi", erledigt: "Fotos geschickt" });
  assert.equal(briefAus("person_merken", { name: "Ferdi" }, ""), null);
  assert.equal(briefAus("person_merken", { wer: "Fotograf" }, ""), null);
  const w = (LUCA_WERKZEUGE as unknown as { function?: { name?: string; description?: string } }[]).find((x) => x.function?.name === "person_merken");
  assert.match(w?.function?.description ?? "", /nur Davids eigene Angaben/);
});

// Telefon-Luca (26.11.2026, Davids „kannst du machen“): Termine verschieben (auch auf einen anderen Tag) und löschen –
// bei Serien wie Gym nur an diesem Tag; immer erst nach Davids Ja.
test("privattermin_aendern: verschieben (auch anderer Tag) und löschen, nur mit Ja", async () => {
  const { briefAus, LUCA_WERKZEUGE } = await import("../lib/luca-logik.ts");
  assert.deepEqual(
    briefAus("privattermin_aendern", { aktion: "verschieben", titel: "Gym", datum: "2026-11-26", uhrzeit: "19:00", bestaetigt: true }, ""),
    { typ: "alltag", was: "verschieben", titel: "Gym", datum: "2026-11-26", uhrzeit: "19:00" },
  );
  assert.deepEqual(
    briefAus("privattermin_aendern", { aktion: "verschieben", titel: "Biologie Klausur", datum: "2026-11-26", uhrzeit: "15:30", bis: "17:00", neuer_tag: "2026-11-27", bestaetigt: true }, ""),
    { typ: "alltag", was: "verschieben", titel: "Biologie Klausur", datum: "2026-11-26", uhrzeit: "15:30", bis: "17:00", neuerTag: "2026-11-27" },
  );
  assert.deepEqual(
    briefAus("privattermin_aendern", { aktion: "loeschen", titel: "Kino mit Lukas", datum: "2026-11-28", bestaetigt: true }, ""),
    { typ: "alltag", was: "loeschen", titel: "Kino mit Lukas", datum: "2026-11-28" },
  );
  assert.deepEqual(
    briefAus("privattermin_aendern", { aktion: "loeschen", titel: "Mathe", datum: "2026-11-27", uhrzeit: "13:55", bestaetigt: true }, ""),
    { typ: "alltag", was: "loeschen", titel: "Mathe", datum: "2026-11-27", uhrzeit: "13:55" },
  );
  assert.equal(briefAus("privattermin_aendern", { aktion: "loeschen", titel: "Kino", datum: "2026-11-28" }, ""), null); // ohne Ja nichts
  assert.equal(briefAus("privattermin_aendern", { aktion: "verschieben", titel: "Gym", datum: "heute", bestaetigt: true }, ""), null); // ohne neue Uhrzeit nichts
  assert.equal(briefAus("privattermin_aendern", { aktion: "umbenennen", titel: "Gym", datum: "heute", bestaetigt: true }, ""), null);
  const w = LUCA_WERKZEUGE.find((x) => x.function.name === "privattermin_aendern");
  assert.ok(w && /nur an diesem (einen )?Tag/.test(w.function.description) && /Ja/.test(w.function.description));
});
