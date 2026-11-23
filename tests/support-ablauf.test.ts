// Prompt 18: erst übernehmen, dann handeln; fremde Nachrichten im Ticket; Abschluss-Ablauf (Noch Fragen? → Abschluss
// → Ticket schließen) mit den 3-Stunden-Regeln. Discord wird hier nicht gebraucht: Die Regeln sind ohne Netz.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ABLAUF_FELD,
  CHEF_DARF_ALLES,
  DREI_STUNDEN_MS,
  ERST_NACHFRAGEN,
  NICHT_UEBERNOMMEN,
  SATZ_ABSCHLUSS,
  SATZ_NOCH_FRAGEN,
  SCHON_ABGESCHLOSSEN,
  WARNUNG_WEG_MS,
  ZU_FRUEH,
  abschlussErlaubt,
  abschlussGesendetText,
  artDerTeamNachricht,
  fremdWarnung,
  hinweisGeloest,
  hinweisKeineFragen,
  hinweisNachStand,
  hinweisOffen,
  istFremdWarnung,
  kundeSchriebSeit,
  leseAblauf,
  mitAblauf,
  nachgefragtText,
  pruefeUebernehmer,
  schliessenErlaubt,
  uebernahmeZeit,
  uebernehmerDerKarte,
  verlaufFuerKi,
  warnungenZumLoeschen,
  zuFruehAntwort,
} from "../lib/support-ablauf.ts";
import { BESUCHER, HINWEIS_ZEILE, discordZeit } from "../lib/support-sperre.ts";
import { ANRUF_ZEILE } from "../lib/support-anruf.ts";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const DAVID = "806859236768088114";
const JAKOB = "111111111111111111";
const MIJO = "222222222222222222";
/** Eine Discord-Kennung (Snowflake) zu einem Zeitpunkt. */
const idZu = (ms: number, n = 0) => String(((BigInt(ms) - BigInt(1420070400000)) << BigInt(22)) + BigInt(n));
const T0 = Date.UTC(2026, 10, 23, 18, 0, 0);

const offen = [{ name: "Status", value: "Offen" }];
const uebernommen = (id = JAKOB, seit = T0) => mitAblauf([{ name: "Status", value: `Übernommen von <@${id}> um 19:00` }], { uebernommen: seit });

test("Knöpfe nur für den Übernehmer: vorher „Übernimm zuerst das Ticket.“, bei jemand anderem dessen Name", () => {
  assert.equal(pruefeUebernehmer(offen, JAKOB, DAVID), NICHT_UEBERNOMMEN);
  assert.equal(NICHT_UEBERNOMMEN, "Übernimm zuerst das Ticket.");
  assert.equal(pruefeUebernehmer(uebernommen(), JAKOB, DAVID), null);
  assert.equal(pruefeUebernehmer(uebernommen(), MIJO, DAVID), `Das Ticket hat <@${JAKOB}> übernommen.`);
  // Erst einmal auch für David (Schalter aus); mit dem Schalter dürfte er.
  assert.equal(CHEF_DARF_ALLES, false);
  assert.equal(pruefeUebernehmer(uebernommen(), DAVID, DAVID), `Das Ticket hat <@${JAKOB}> übernommen.`);
  assert.equal(pruefeUebernehmer(uebernommen(), DAVID, DAVID, true), null);
  assert.equal(uebernehmerDerKarte([{ name: "Status", value: "Geschlossen von <@1> um 10:00" }]), null);
});

test("alle Ticket-Knöpfe laufen durch die Prüfung (lib/ticket-handler.ts), Übernehmen kommt davor", () => {
  // Was ein Klick bewirkt, steht in entscheide() (Prompt 18b; davor nur, wie schnell Discord die Antwort bekommt).
  const h = lies("lib/ticket-handler.ts").slice(lies("lib/ticket-handler.ts").indexOf("async function entscheide("));
  const gate = h.indexOf("const verbot = pruefeUebernehmer(felder, userId, OWNER_ID, CHEF_DARF_ALLES, aktiv);");
  assert.ok(gate > h.indexOf('if (id === "ticket:claim")'));
  // Alles, was nach dem Übernehmen geht, steht hinter der Prüfung: auch die Fenster (Antworten, Schnellantwort, Anruf, Sonstiges).
  for (const stelle of ["leseAnrufKnopf(id)", "ANRUF_FENSTER)", "SPERR_GRUND_FENSTER)", "SCHNELL_FENSTER)", "if (i.type === 5) {", '"ticket:reply"', "TROTZDEM_BEENDEN_ID)"]) {
    assert.ok(h.indexOf(stelle) > gate, stelle);
  }
  // Der Mail-Knopf am Ticket: dieselbe Regel (lib/mail-antwort.ts, darfMailen).
  assert.match(lies("lib/mail-antwort.ts"), /if \(ort === "ticket"\) \{\s*if \(CHEF_DARF_ALLES && userId === davidId\) return null;/);
  // Vor der Prüfung nur: der Übernehmer ist nicht mehr aktiv im Team (Prompt 18b) → das Ticket wird frei, sonst nichts.
  const vorher = h.slice(h.indexOf("const weg = aktiv ? uebernehmerWeg(felder, aktiv) : null;"), gate);
  assert.match(vorher, /spaeter\(\(\) => gibTicketFrei\(token, channel, freiStatus\(weg\)\)\);\s*return privatMeldung\(nichtMehrAktiv\(weg\)\);/);
});

test("Schreiben im Ticket-Kanal: nur der Übernehmer nach dem Übernehmen; // bleibt Notiz; alles andere ist fremd", () => {
  const seit = T0;
  const m = (autor: string, text: string, zeit = T0 + 60_000) => ({ id: idZu(zeit), text, autor });
  assert.equal(artDerTeamNachricht(m(JAKOB, "Hallo, ich schaue mir das an."), JAKOB, seit), "senden");
  assert.equal(artDerTeamNachricht(m(MIJO, "Ich kann auch helfen"), JAKOB, seit), "fremd");
  assert.equal(artDerTeamNachricht(m(MIJO, "// Notiz: Kunde kennt uns von der Messe"), JAKOB, seit), "notiz");
  assert.equal(artDerTeamNachricht(m(JAKOB, "// nur fürs Team"), JAKOB, seit), "notiz");
  // Vor dem Übernehmen: fremd, auch vom späteren Übernehmer.
  assert.equal(artDerTeamNachricht(m(JAKOB, "Moin!", T0 - 30_000), JAKOB, seit), "fremd");
  assert.equal(artDerTeamNachricht(m(JAKOB, "Moin!"), null, 0), "fremd");
  // In derselben Sekunde kurz vor dem Klick (gefunden in der Prüfung mit nachgestelltem Discord): auch fremd.
  const klick = T0 + 400;
  assert.equal(artDerTeamNachricht(m(JAKOB, "Moin!", klick - 20), JAKOB, uebernahmeZeit(klick)), "fremd");
  assert.equal(artDerTeamNachricht(m(JAKOB, "Hallo, ich bin da.", klick + 5000), JAKOB, uebernahmeZeit(klick)), "senden");
  // Seit Prompt 18b mit Kennung: mitUebernahme schreibt „Übernommen von <@…> <Zeit>“ ins Feld „Ablauf“.
  assert.match(lies("lib/ticket-handler.ts"), /mitUebernahme\(felder, userId, jetzt\)/);
});

test("Warnung ohne den Text der Nachricht, nach 30 s weg; die gelöschte Nachricht kommt nie beim Kunden an", () => {
  assert.equal(fremdWarnung(MIJO, null), `<@${MIJO}>, übernimm zuerst das Ticket. Deine Nachricht wurde nicht gesendet.`);
  assert.equal(fremdWarnung(MIJO, JAKOB), `<@${MIJO}>, das Ticket hat <@${JAKOB}> übernommen. Deine Nachricht wurde nicht gesendet.`);
  // Schrieb der spätere Übernehmer vor dem Übernehmen: nicht „… hat <@er selbst> übernommen“, sondern „übernimm zuerst“.
  assert.equal(fremdWarnung(JAKOB, JAKOB), `<@${JAKOB}>, übernimm zuerst das Ticket. Deine Nachricht wurde nicht gesendet.`);
  assert.ok(istFremdWarnung(fremdWarnung(MIJO, JAKOB)));
  assert.ok(!istFremdWarnung("Deine Nachricht wurde nicht gesendet."));
  assert.equal(WARNUNG_WEG_MS, 30_000);
  // Aufräumen im Minutentakt: Warnungen älter als 30 s, wenn die fremde Nachricht weg ist.
  const jetzt = T0 + 120_000;
  const warnung = { id: idZu(T0 + 61_000), content: fremdWarnung(MIJO, JAKOB), author: { bot: true } };
  const frisch = { id: idZu(jetzt - 5_000), content: fremdWarnung(MIJO, JAKOB), author: { bot: true } };
  assert.deepEqual(warnungenZumLoeschen([warnung, frisch], JAKOB, T0, jetzt), [warnung.id]);
  // Klappte das Löschen der fremden Nachricht nicht (Recht fehlt), bleibt die Warnung stehen.
  const nochDa = { id: idZu(T0 + 60_000), content: "Ich kann auch helfen", author: { id: MIJO, bot: false } };
  assert.deepEqual(warnungenZumLoeschen([nochDa, warnung], JAKOB, T0, jetzt), []);
  // Weitergabe an die Website: Fremdes geht nie an den Kunden, der Zeiger läuft darüber hinweg (lib/support.ts).
  const relay = lies("lib/support.ts");
  const teil = relay.slice(relay.indexOf("export async function relayMessages("), relay.indexOf("export interface Fremd"));
  assert.match(teil, /if \(art === "notiz"\) continue;/);
  // Gelöscht wird nur, was neu und nie zugestellt ist (Prompt 18b: pruefbar).
  assert.match(teil, /if \(art === "fremd"\) \{\s*if \(karte && pruefbar\(karte\.felder, zeitAusId\(m\.id\)\)\) fremd\.push\(\{ id: m\.id, autor: m\.author\.id \?\? "" \}\);\s*continue;/);
  assert.match(teil, /const last = sorted\.length \? sorted\[sorted\.length - 1\]\.id : after;/);
  // Die Warnung trägt nie den Text der fremden Nachricht.
  const loeschen = relay.slice(relay.indexOf("export async function loescheFremde("), relay.indexOf("export async function loescheNachricht("));
  assert.match(loeschen, /content: fremdWarnung\(f\.autor, uebernehmer\)/);
  assert.doesNotMatch(loeschen, /content: [^,]*text/);
  // Auch ohne Kunden im Chat: der Minutentakt (lib/team-takt.ts).
  assert.match(lies("lib/team-takt.ts"), /\["tickets", \(\) => ticketsPflegen\(token, t, kanaele\)\]/);
});

test("das Feld „Ablauf“ an der Karte: übernommen, Noch Fragen?, Abschluss, Kunde weg (Discord-Zeitangaben)", () => {
  let f = mitAblauf(offen, { uebernommen: T0, nachgefragt: T0 + 60_000 });
  const wert = f.find((x) => x.name === ABLAUF_FELD)!.value;
  assert.equal(wert, `Übernommen ${discordZeit(T0)}\n„Noch Fragen?“ gesendet ${discordZeit(T0 + 60_000)}`);
  assert.deepEqual(leseAblauf(f), { uebernommen: T0, nachgefragt: T0 + 60_000 });
  f = mitAblauf(f, { weg: T0 + 120_000 });
  f = mitAblauf(f, { weg: null });
  assert.deepEqual(leseAblauf(f), { uebernommen: T0, nachgefragt: T0 + 60_000 });
  // Ohne Zeilen fällt das Feld weg (Discord erlaubt keine leeren Felder).
  assert.equal(mitAblauf(f, { uebernommen: null, nachgefragt: null }).some((x) => x.name === ABLAUF_FELD), false);
});

test("Abschluss-Ablauf: Hinweis 1 (gelöst), weiterfragen, Hinweis 1 wieder, Hinweis 2 erst nach „Noch Fragen?“", () => {
  // Die KI meldet „gelöst“: Hinweis 1 mit @ für den Übernehmer, nur fürs Team.
  assert.equal(hinweisNachStand("geloest", {}), "geloest");
  const h1 = hinweisGeloest(JAKOB);
  assert.match(h1.content, /^✅ \*\*Klingt gelöst\.\*\* Noch Fragen stellen\? <@111111111111111111>\n-# Nur fürs Team\. Nach dem Klick bekommt der Kunde: „Hast du sonst noch Fragen\?“/);
  assert.match(h1.content, /-# Nimm ihn, wenn/, "kurz erklärt, wann man ihn benutzt");
  assert.deepEqual(h1.components[0].components.map((k) => k.label), ["Noch Fragen?"]);
  assert.deepEqual(h1.allowed_mentions.users, [JAKOB]);
  assert.ok(!h1.content.startsWith("💬"), "der Kunde sieht ihn nie");
  // „Keine Fragen mehr“ ohne vorheriges „Noch Fragen?“: erst wieder Hinweis 1 (die Reihenfolge bleibt).
  assert.equal(hinweisNachStand("keine_fragen", {}), "geloest");
  // Nach „Noch Fragen?“: Fragt der Kunde weiter, geht der Chat normal weiter (kein Hinweis); ist es wieder gelöst, Hinweis 1.
  const a = { nachgefragt: T0 };
  assert.equal(hinweisNachStand(null, a), null);
  assert.equal(hinweisNachStand("geloest", a), "geloest");
  // Er antwortet „nein“: Hinweis 2.
  assert.equal(hinweisNachStand("keine_fragen", a), "keine_fragen");
  const h2 = hinweisKeineFragen(JAKOB);
  assert.match(h2.content, /^👋 \*\*Keine Fragen mehr\.\*\* Chat abschließen\? <@111111111111111111>\n-# Nur fürs Team\. Nach dem Klick bekommt der Kunde den Abschluss-Satz, danach geht „Ticket schließen“\./);
  assert.deepEqual(h2.components[0].components.map((k) => k.label), ["Abschluss"]);
  // Nach dem Abschluss: keine Hinweise mehr.
  assert.equal(hinweisNachStand("geloest", { nachgefragt: T0, abschluss: T0 + 1000 }), null);
  // Kein zweiter offener Hinweis derselben Art.
  assert.ok(hinweisOffen([{ author: { bot: true }, content: h1.content, components: h1.components }], "geloest"));
  assert.ok(!hinweisOffen([{ author: { bot: true }, content: nachgefragtText("<@1>", "19:05"), components: [] }], "geloest"));
});

test("„Noch Fragen?“ und „Abschluss“: fester Satz als 💬-Nachricht im Verlauf, der Hinweis danach ohne Knopf", () => {
  assert.equal(SATZ_NOCH_FRAGEN, "Hast du sonst noch Fragen?");
  assert.equal(SATZ_ABSCHLUSS, "Danke für deine Nachricht – ich beende den Chat jetzt. Schönen Tag noch!");
  assert.equal(nachgefragtText("<@1>", "19:05"), "✅ Nachgefragt von <@1> um 19:05.");
  assert.equal(abschlussGesendetText("<@1>", "19:20"), "👋 Abschluss gesendet von <@1> um 19:20. Du kannst das Ticket jetzt schließen.");
  const h = lies("lib/ticket-handler.ts");
  const noch = h.slice(h.indexOf("if (id === NOCH_FRAGEN_ID)"), h.indexOf("if (id === ABSCHLUSS_ID)"));
  // Sofort, ohne Fenster: im Namen des Drückenden („💬 **Name:** …“), Stand an der Karte, Hinweis ohne Knopf, „Gesendet.“ nur für ihn.
  // Seit Prompt 18b über sendeEinmal: erst an der Karte vermerken, dann senden (der zweite Klick: „Schon gesendet.“).
  assert.match(noch, /await sendeEinmal\("nachgefragt", SATZ_NOCH_FRAGEN\)/);
  assert.match(noch, /ersetzeDaten\(\{ content: nachgefragtText\(ownerTag, time\), components: \[\] \}\)/);
  assert.match(noch, /followupPrivate\(i\.application_id \?\? "", i\.token \?\? "", GESENDET\)/);
  assert.doesNotMatch(noch, /fensterDaten/);
  const ab = h.slice(h.indexOf("if (id === ABSCHLUSS_ID)"), h.indexOf("// ------------------------------------------------------------ Antworten, Schnellantwort"));
  assert.match(ab, /await sendeEinmal\("abschluss", SATZ_ABSCHLUSS\)/);
  assert.match(ab, /ersetzeDaten\(\{ content: abschlussGesendetText\(ownerTag, time\), components: \[\] \}\)/);
  assert.doesNotMatch(ab, /fensterDaten/);
  const einmal = h.slice(h.indexOf("const sendeEinmal = async"), h.indexOf("if (id === NOCH_FRAGEN_ID)"));
  assert.ok(einmal.indexOf("await aendereAblauf(token, channel, { [art]: jetzt })") < einmal.indexOf("await postAnKunde(token, channel, who, satz)"), "erst vermerken, dann senden");
  assert.match(lies("lib/support.ts"), /content: `\$\{FOR_CUSTOMER\} \*\*\$\{wer\}:\*\* \$\{text\}`/);
});

test("Abschluss erst nach „Noch Fragen?“; antwortet der Kunde nicht, nach 3 Stunden trotzdem", () => {
  assert.deepEqual(abschlussErlaubt({}, false, T0), { ok: false, meldung: ERST_NACHFRAGEN });
  const a = { nachgefragt: T0 };
  // Er hat noch nicht geantwortet: „Abschluss geht ab …“ (3 Stunden nach der Nachfrage).
  assert.deepEqual(abschlussErlaubt(a, false, T0 + 60_000), { ok: false, meldung: `Der Kunde antwortet vielleicht noch. Abschluss geht ab ${discordZeit(T0 + DREI_STUNDEN_MS)}.` });
  assert.deepEqual(abschlussErlaubt(a, false, T0 + DREI_STUNDEN_MS), { ok: true });
  // Er hat geantwortet: gleich.
  assert.deepEqual(abschlussErlaubt(a, true, T0 + 60_000), { ok: true });
  assert.deepEqual(abschlussErlaubt({ nachgefragt: T0, abschluss: T0 + 5000 }, true, T0 + 10_000), { ok: false, meldung: SCHON_ABGESCHLOSSEN });
  // Geantwortet heißt: eine Nachricht des Kunden nach der Nachfrage.
  const kunde = (ms: number) => ({ id: idZu(ms), content: `${BESUCHER} nein danke`, author: { bot: true } });
  assert.equal(kundeSchriebSeit([kunde(T0 - 1000)], T0), false);
  assert.equal(kundeSchriebSeit([kunde(T0 + 1000)], T0), true);
  assert.equal(kundeSchriebSeit([{ id: idZu(T0 + 1000), content: `⚠️ **Beleidigung** – ${BESUCHER} x`, author: { bot: true } }], T0), true);
});

test("zu früh „Ticket schließen“: nur für den Drückenden, mit beiden Knöpfen; gesperrt jederzeit; Abschluss gesendet: frei", () => {
  assert.deepEqual(schliessenErlaubt({}, false, T0), { ok: false, meldung: ZU_FRUEH, knoepfe: true });
  assert.equal(ZU_FRUEH, "Frag zuerst, ob noch Fragen offen sind, und schick dann den Abschluss.");
  const z = zuFruehAntwort();
  assert.equal(z.flags, 64);
  assert.deepEqual(z.components[0].components.map((k) => k.label), ["Noch Fragen?", "Abschluss"]);
  assert.deepEqual(schliessenErlaubt({ nachgefragt: T0 }, false, T0 + 1000), { ok: false, meldung: ZU_FRUEH, knoepfe: true });
  assert.deepEqual(schliessenErlaubt({ nachgefragt: T0, abschluss: T0 + 1000 }, false, T0 + 2000), { ok: true });
  // Gesperrter Kunde: jederzeit beendbar, ohne Abschluss-Satz.
  assert.deepEqual(schliessenErlaubt({}, true, T0), { ok: true });
  const h = lies("lib/ticket-handler.ts");
  const zu = h.slice(h.indexOf('if (id === "ticket:close")'));
  assert.match(zu, /schliessenErlaubt\(leseAblauf\(felder\), sperreDerKarte\(felder\)\.gesperrt, jetzt\)/);
  assert.match(zu, /darf\.knoepfe \? fertig\(nachrichtDaten\(zuFruehAntwort\(\)\)\)/);
});

test("Kunde hat den Chat verlassen: 3 Stunden kein Schließen, danach direkt (ohne Abschluss-Satz)", () => {
  const a = { weg: T0 };
  assert.deepEqual(schliessenErlaubt(a, false, T0 + 60 * 60_000), { ok: false, meldung: `Der Kunde kommt vielleicht zurück. Schließen geht ab ${discordZeit(T0 + DREI_STUNDEN_MS)}.`, knoepfe: false });
  assert.deepEqual(schliessenErlaubt(a, false, T0 + DREI_STUNDEN_MS), { ok: true });
  // Der Stand kommt vom Abruf „presence“ (lib/support.ts → Feld „Ablauf“).
  assert.match(lies("app/api/support/route.ts"), /await aendereAblauf\(bot, channelId, \{ weg: state === "left" \? Date\.now\(\) : null \}\);/);
});

test("Daten für die KI-Prüfung: nur das Ticket nach dem Wechsel, Kunde und Übernehmer, ohne Hinweise, Notizen und Fremdes", () => {
  const n = (id: number, content: string, author: { id?: string; bot?: boolean }) => ({ id: String(1_000_000_000_000_000 + id), content, author });
  const verlauf = verlaufFuerKi(
    [
      n(9, `${BESUCHER} Danke, das hilft mir!`, { bot: true }),
      n(8, `💬 **Jakob:** Am schnellsten am Telefon.\n${ANRUF_ZEILE}`, { bot: true }),
      n(7, `💬 Bitte bleib freundlich.\n${HINWEIS_ZEILE}`, { bot: true }),
      n(6, "// intern: kennt uns", { id: JAKOB }),
      n(5, "Ich mische mich ein", { id: MIJO }),
      n(4, "Hallo, ich bin da.", { id: JAKOB }),
      n(3, "📞 **Der Kunde möchte sprechen.** Anruf anbieten?", { bot: true }),
      n(2, `${BESUCHER} Wie lange dauert eine Website?`, { bot: true }),
    ],
    [String(1_000_000_000_000_009)],
    JAKOB,
  );
  assert.deepEqual(verlauf, [
    { von: "kunde", text: "Wie lange dauert eine Website?" },
    { von: "team", text: "Hallo, ich bin da." },
    { von: "team", text: "Am schnellsten am Telefon." },
  ]);
});
