// Prompt 18b (23.11.2026): Korrekturen nach der unabhängigen Prüfung von Prompt 18. Jeder Test stellt einen Fall aus
// dem Prüfbericht nach. Die Module werden in jedem Test neu geladen (await import): So läuft dieselbe Datei auch gegen
// den alten Stand (Commit 3f716fc) und zeigt dort je Fall, was falsch war (rot), hier, dass es stimmt (grün).
//
// Was der Bot an der Karte tut (Übernehmen, Schließen, per Mail wieder öffnen), steht in lib/ticket-handler.ts und
// lib/support.ts und braucht Discord. Die Hilfen unten machen genau dasselbe mit den reinen Regeln, für beide Stände:
// Gibt es die neue Regel, wird sie benutzt; sonst das, was der alte Code an derselben Stelle tat.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Feld = { name: string; value: string };
type Nachricht = { id: string; content: string; author: { id?: string; bot?: boolean } };

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const ablauf = async (): Promise<any> => import("../lib/support-ablauf.ts");

const DAVID = "806859236768088114";
const JAKOB = "111111111111111111";
const MIJO = "222222222222222222";
const idZu = (ms: number, n = 0) => String(((BigInt(ms) - BigInt(1420070400000)) << BigInt(22)) + BigInt(n));
const T0 = Date.UTC(2026, 10, 23, 18, 0, 0);
const team = (autor: string, text: string, zeit: number, n = 0): Nachricht => ({ id: idZu(zeit, n), content: text, author: { id: autor, bot: false } });
const kunde = (text: string, zeit: number): Nachricht => ({ id: idZu(zeit), content: `🗨️ **Besucher:** ${text}`, author: { bot: true } });
const status = (f: Feld[], wert: string) => f.map((x) => (x.name === "Status" ? { ...x, value: wert } : x));

/** Die Karte eines neuen Tickets (lib/support.ts openTicket; seit 18b mit „Prüfung ab“). */
async function neueKarte(zeit: number): Promise<Feld[]> {
  const ab = await ablauf();
  const f: Feld[] = [
    { name: "Status", value: "Offen" },
    { name: "Frage", value: "Was kostet eine Website?" },
  ];
  return typeof ab.aufSekunde === "function" ? ab.mitAblauf(f, { pruefungAb: ab.aufSekunde(zeit) }) : f;
}
/** Klick auf „Übernehmen“ (lib/ticket-handler.ts). */
async function uebernehmen(f: Feld[], wer: string, zeit: number): Promise<Feld[]> {
  const ab = await ablauf();
  const neu = typeof ab.mitUebernahme === "function" ? ab.mitUebernahme(f, wer, zeit) : ab.mitAblauf(f, { uebernommen: ab.uebernahmeZeit(zeit) });
  return status(neu, `Übernommen von <@${wer}> um 18:01`);
}
/** „Ticket schließen“ (lib/ticket-handler.ts, karteZu). */
async function schliessen(f: Feld[], wer: string): Promise<Feld[]> {
  const ab = await ablauf();
  return status(typeof ab.uebernommenFest === "function" ? ab.uebernommenFest(f) : f, `Geschlossen von <@${wer}> um 18:30`);
}
/** Kunde antwortet per Mail auf ein geschlossenes Ticket (lib/support.ts, oeffneTicketWieder). Vorher blieb die Karte, wie sie war. */
async function perMailWiederOffen(f: Feld[], zeit: number): Promise<Feld[]> {
  const ab = await ablauf();
  return typeof ab.wiederOffenFelder === "function" ? ab.wiederOffenFelder(f, zeit) : f;
}
/** Was der Minutentakt löscht (lib/support.ts, ticketPflege). Vorher: jede fremde Nachricht, auch geschlossen, ohne Grenze. */
async function loeschtDerTakt(liste: Nachricht[], f: Feld[]): Promise<string[]> {
  const ab = await ablauf();
  if (typeof ab.zumLoeschen === "function") return ab.zumLoeschen(liste, f).map((x: { id: string }) => x.id);
  const uebernehmer = ab.uebernehmerDerKarte(f);
  const seit = ab.leseAblauf(f).uebernommen ?? 0;
  return liste
    .filter((m) => !m.author.bot && ab.artDerTeamNachricht({ id: m.id, text: m.content.trim(), autor: m.author.id ?? "" }, uebernehmer, seit) === "fremd")
    .map((m) => m.id);
}
/** Bekommt der Kunde diese Nachricht beim nächsten Abruf (lib/support.ts, relayMessages)? */
async function kommtAn(m: Nachricht, f: Feld[]): Promise<boolean> {
  const ab = await ablauf();
  const seit = ab.leseAblauf(f).uebernommen ?? 0;
  return ab.artDerTeamNachricht({ id: m.id, text: m.content.trim(), autor: m.author.id ?? "" }, ab.uebernehmerDerKarte(f), seit) === "senden";
}

// ------------------------------------------------------------------ 1 (kritisch): Übernehmer aus „Ablauf“

test("1a: Kunde antwortet per Mail auf ein geschlossenes Ticket: nichts Altes wird gelöscht, „Antworten“ geht fürs Team", async () => {
  let f = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 60_000);
  const verlauf = [team(JAKOB, "Hallo, ich bin Jakob.", T0 + 90_000), team(JAKOB, "Das kostet je nach Umfang …", T0 + 120_000), team(MIJO, "// Notiz: kennt uns", T0 + 130_000)];
  f = await schliessen(f, JAKOB);
  f = await perMailWiederOffen(f, T0 + 3_600_000);
  // Vorher: Status „Geschlossen von …“ blieb stehen, jede Nachricht des Teams galt als fremd und flog im Minutentakt raus.
  assert.deepEqual(await loeschtDerTakt(verlauf, f), [], "nichts aus dem alten Gespräch löschen");
  const ab = await ablauf();
  assert.equal(f.find((x) => x.name === "Status")?.value, "Wieder offen");
  assert.equal(ab.uebernehmerDerKarte(f), null, "wieder offen: niemand hat übernommen");
  // „Antworten“ an der Kundenmail: Solange niemand übernommen hat, darf das ganze Team (wie vor Prompt 18).
  const mail: any = await import("../lib/mail-antwort.ts");
  const berechtigt = [mail.ticketBesitzer({ fields: f }) ?? ""];
  assert.equal(mail.darfMailen("ticket", MIJO, berechtigt, DAVID), null);
  assert.equal(mail.darfMailen("ticket", JAKOB, berechtigt, DAVID), null);
  // Nach dem Übernehmen wieder nur der Neue; seine Nachricht davor zählt nicht als zugestellt, die danach geht raus.
  const neu = await uebernehmen(f, MIJO, T0 + 3_700_000);
  assert.equal(mail.darfMailen("ticket", JAKOB, [mail.ticketBesitzer({ fields: neu }) ?? ""], DAVID), `Das Ticket hat <@${MIJO}> übernommen.`);
  assert.ok(await kommtAn(team(MIJO, "Hallo, ich übernehme.", T0 + 3_710_000), neu));
  // Neue fremde Nachricht nach dem Wiederöffnen: die wird (einmal) entfernt, das alte Gespräch nicht.
  const jakobNeu = team(JAKOB, "Ich mach das!", T0 + 3_720_000);
  assert.deepEqual(await loeschtDerTakt([...verlauf, jakobNeu], neu), [jakobNeu.id]);
});

test("1b: Schließen gleich nach der letzten Nachricht: die Nachricht kommt beim Kunden noch an und wird nicht gelöscht", async () => {
  let f = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 60_000);
  const letzte = team(JAKOB, "Gern, bis bald!", T0 + 600_000);
  f = await schliessen(f, JAKOB);
  // Der Kunde ruft erst nach dem Schließen ab: Die Nachricht ist vom Übernehmer, vor dem Schließen geschrieben.
  assert.ok(await kommtAn(letzte, f), "letzte Nachricht kommt an");
  assert.deepEqual(await loeschtDerTakt([letzte], f), [], "auf einer geschlossenen Karte wird nichts gelöscht");
});

test("1c: Geschlossen, aber Umbenennen/Takt ging schief: nichts löschen, auch nicht 50 Nachrichten", async () => {
  let f = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 60_000);
  const verlauf = Array.from({ length: 50 }, (_, n) => team(n % 2 ? JAKOB : MIJO, `Nachricht ${n}`, T0 + 120_000 + n * 1000));
  f = await schliessen(f, JAKOB);
  // Der Kanal heißt noch nicht „geschlossen-…“ (Umbenennen scheiterte): Die Karte sagt „Geschlossen“, das reicht.
  assert.deepEqual(await loeschtDerTakt(verlauf, f), []);
  // Auch bei Tickets von vor Prompt 18b (Übernehmer nur im Status): Beim Schließen bleibt er im Feld „Ablauf“.
  const alt = status([{ name: "Status", value: "Offen" }], `Übernommen von <@${JAKOB}> um 17:00`);
  assert.ok(await kommtAn(team(JAKOB, "Letzte Antwort", T0), await schliessen(alt, JAKOB)), "altes Ticket: letzte Antwort kommt nach dem Schließen an");
});

test("1d: „Zuletzt zugestellt“: Was der Kunde schon bekommen hat, fasst der Bot nie an", async () => {
  const ab = await ablauf();
  let f = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 60_000);
  f = ab.mitAblauf(f, { zugestellt: ab.aufSekunde(T0 + 300_000) });
  // Mijo schrieb vor der letzten zugestellten Nachricht (der Abruf lief schon darüber): nicht mehr löschen.
  assert.equal(ab.pruefbar(f, T0 + 200_000), false);
  assert.equal(ab.pruefbar(f, T0 + 301_000), true);
  assert.deepEqual(await loeschtDerTakt([team(MIJO, "alt", T0 + 200_000), team(MIJO, "neu", T0 + 301_000)], f), [idZu(T0 + 301_000)]);
  // Steht in der Karte als genaue Uhrzeit (mit Sekunden).
  assert.match(f.find((x) => x.name === "Ablauf")?.value ?? "", /^Zuletzt zugestellt <t:\d+:T>$/m);
});

// ------------------------------------------------------------------ 2: alte Tickets, höchstens 5 je Durchgang

test("2: Ticket ohne „Prüfung ab“ (von vor Prompt 18): nichts wird gelöscht; sonst höchstens 5 je Durchgang, älteste zuerst", async () => {
  const alt = status([{ name: "Status", value: "Offen" }], `Übernommen von <@${JAKOB}> um 17:00`);
  const fremd = Array.from({ length: 8 }, (_, n) => team(MIJO, `fremd ${n}`, T0 + 60_000 + n * 1000));
  assert.deepEqual(await loeschtDerTakt(fremd, alt), [], "altes Ticket: nichts löschen");
  const neu = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 30_000);
  const weg = await loeschtDerTakt([...fremd].reverse(), neu);
  assert.equal(weg.length, 5);
  assert.deepEqual(weg, fremd.slice(0, 5).map((m) => m.id));
  const ab = await ablauf();
  assert.equal(ab.MAX_LOESCHEN, 5);
});

// ------------------------------------------------------------------ 3: Freigeben, Übernehmer nicht mehr im Team

test("3a: „Freigeben“ nur für den Übernehmer: danach wieder offen mit „Übernehmen“, Karte sagt, wer freigegeben hat", async () => {
  const ab = await ablauf();
  const anruf: any = await import("../lib/support-anruf.ts");
  const knoepfe = anruf.ticketComponents("claimed")[0].components.map((k: { custom_id: string }) => k.custom_id);
  assert.ok(knoepfe.includes(ab.FREIGEBEN_ID), "Knopf Freigeben an der übernommenen Karte");
  assert.ok(knoepfe.length <= 5, "Discord: höchstens 5 Knöpfe je Reihe");
  assert.ok(!anruf.ticketComponents("open")[0].components.some((k: { custom_id: string }) => k.custom_id === ab.FREIGEBEN_ID));
  const f = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 60_000);
  assert.equal(ab.pruefeUebernehmer(f, MIJO, DAVID), `Das Ticket hat <@${JAKOB}> übernommen.`, "nur Jakob darf freigeben");
  const frei = status(ab.ohneUebernahme(f), ab.freigegebenStatus(`<@${JAKOB}>`, "18:20"));
  assert.equal(frei.find((x) => x.name === "Status")?.value, `Freigegeben von <@${JAKOB}> um 18:20`);
  assert.equal(ab.uebernehmerDerKarte(frei), null);
  assert.equal(ab.pruefeUebernehmer(frei, MIJO, DAVID), ab.NICHT_UEBERNOMMEN);
  // Der Handler: Freigeben steht hinter der Prüfung „nur der Übernehmer“ und setzt die Knöpfe wieder auf „offen“.
  const h = lies("lib/ticket-handler.ts").slice(lies("lib/ticket-handler.ts").indexOf("async function entscheide("));
  const teil = h.slice(h.indexOf("if (id === FREIGEBEN_ID)"));
  assert.ok(h.indexOf("if (id === FREIGEBEN_ID)") > h.indexOf("const verbot = pruefeUebernehmer("));
  assert.match(teil, /setStatus\(status, 0xd4a23c, ohneUebernahme\(felder\)\)\], components: ticketComponents\("open"\)/);
  // In der Anleitung in #willkommen steht es auch (lib/willkommen.ts).
  const w: any = await import("../lib/willkommen.ts");
  const support = w.ANLEITUNGEN.find((x: { titel: string }) => x.titel.includes("Support-Chat"));
  assert.match(support.text, /\*\*Freigeben:\*\* gibt das Ticket ab, dann kann jemand anderes übernehmen\./);
  assert.ok(support.text.length <= 4096);
});

test("3b: Übernehmer nicht mehr im Team (Pause, ausgetreten, fehlt): Ticket wird frei, Karte sagt kurz warum", async () => {
  const ab = await ablauf();
  const f = await uebernehmen(await neueKarte(T0), JAKOB, T0 + 60_000);
  const aktiv = (id: string) => id !== JAKOB;
  assert.equal(ab.uebernehmerWeg(f, aktiv), JAKOB);
  assert.equal(ab.uebernehmerWeg(f, () => true), null);
  assert.equal(ab.uebernehmerWeg(await schliessen(f, JAKOB), aktiv), null, "geschlossen: nichts mehr freigeben");
  assert.equal(ab.pruefeUebernehmer(f, MIJO, DAVID, false, aktiv), ab.NICHT_UEBERNOMMEN);
  assert.equal(ab.freiStatus(JAKOB), `Frei: <@${JAKOB}> ist nicht mehr aktiv im Team. Wer übernimmt?`);
  const frei = status(ab.ohneUebernahme(f), ab.freiStatus(JAKOB));
  assert.equal(ab.uebernehmerDerKarte(frei), null);
  // Der Minutentakt und jeder Klick geben frei, aber nur mit wirklich geladenem Team-Register (sonst nie).
  const s = lies("lib/support.ts");
  assert.match(s, /export const aktivImTeam = \(\): Aktiv \| undefined => \(registerGeladen\(\) \? imTeam : undefined\);/);
  assert.match(s, /const weg = aktiv \? uebernehmerWeg\(karte\.felder, aktiv\) : null;\s*if \(weg\) await gibTicketFrei\(token, channelId, freiStatus\(weg\)\);/);
  // Der Schalter für David bleibt aus und ist eine Zeile.
  assert.equal(ab.CHEF_DARF_ALLES, false);
  assert.match(lies("lib/support-ablauf.ts"), /^export const CHEF_DARF_ALLES = false;$/m);
});

// ------------------------------------------------------------------ 4: kleinere Fehler

test("4a: Doppelklick auf „Noch Fragen?“ oder „Abschluss“: der zweite sieht nur „Schon gesendet.“", async () => {
  const ab = await ablauf();
  assert.equal(ab.SCHON_GESENDET, "Schon gesendet.");
  const nachgefragt = { nachgefragt: T0 };
  // 20 s später, der Kunde hat nichts geschrieben: nicht noch einmal (vorher ging es nach 15 s wieder).
  assert.equal(ab.schonGesendet("nachgefragt", nachgefragt, []), true);
  assert.equal(ab.schonGesendet("nachgefragt", nachgefragt, [kunde("Ja, eine noch", T0 + 20_000)]), false, "nach einer Antwort darf man wieder fragen");
  assert.equal(ab.schonGesendet("abschluss", { nachgefragt: T0, abschluss: T0 + 60_000 }, []), true);
  assert.equal(ab.schonGesendet("abschluss", { nachgefragt: T0 }, []), false);
  // Erst an der Karte vermerken, dann senden; zwei Klicks in derselben Instanz: der zweite wartet nicht.
  const h = lies("lib/ticket-handler.ts");
  const einmal = h.slice(h.indexOf("const sendeEinmal = async"), h.indexOf("if (id === NOCH_FRAGEN_ID)"));
  assert.ok(einmal.indexOf("if (!beginne(schluessel, jetzt)) return SCHON_GESENDET;") >= 0);
  assert.ok(einmal.indexOf("await aendereAblauf(token, channel, { [art]: jetzt })") < einmal.indexOf("await postAnKunde(token, channel, who, satz)"));
  assert.match(h, /const IMMER_SPAETER = new Set\(\[NOCH_FRAGEN_ID, ABSCHLUSS_ID\]\);/);
});

test("4b: „Entsperrt“ hebt nur eine Sperre im Assistenten-Chat auf, die schon vorher lief", async () => {
  const sp: any = await import("../lib/support-sperre.ts");
  const um = T0 + 90_000;
  const wert = sp.entsperrtWert("<@7>", um);
  assert.match(wert, /^Entsperrt von <@7> um <t:\d+:t>$/);
  assert.equal(sp.entsperrtZeit(wert), Math.floor(um / 1000) * 1000);
  // /api/support (GET): aufheben nur, wenn die laufende Sperre vor dem Entsperren begann.
  const route = lies("app/api/support/route.ts");
  assert.match(route, /if \(laufend && laufend\.ab < entsperrt\) chatWaechter\(\)\.aufheben\(schluessel\);/);
  const schutz: any = await import("../lib/chat-schutz.ts");
  const w = new schutz.Waechter();
  const k = schutz.chatSchluessel("1.2.3.4", "UA", "abcdefghij0123456789");
  w.sperreSetzen(k, "Beleidigungen", um + 30_000, 300_000, "beleidigung");
  const neuere = w.sperre(k, um + 40_000);
  assert.ok(neuere && !(neuere.ab < sp.entsperrtZeit(wert)), "die neuere Sperre bleibt");
});

test("4c: Schlüssel der Sperre: zufällige Kennung des Browsers zuerst, Adresse plus Browser nur ohne Kennung", async () => {
  const schutz: any = await import("../lib/chat-schutz.ts");
  const a = schutz.chatSchluessel("1.2.3.4", "Mozilla/5.0", "abcdefghij0123456789");
  const b = schutz.chatSchluessel("1.2.3.4", "Mozilla/5.0", "zyxwvutsrq9876543210");
  assert.equal(a, "chat:k:abcdefghij0123456789");
  assert.notEqual(a, b, "zwei Leute hinter derselben Adresse mit gleichem Browser: getrennt");
  assert.equal(schutz.chatSchluessel("1.2.3.4", "Mozilla/5.0", "<script>"), schutz.chatSchluessel("1.2.3.4", "Mozilla/5.0"), "ungültige Kennung: wie ohne");
  // Der Browser legt sie einmal an und behält sie.
  const speicher = new Map<string, string>();
  const s = { getItem: (x: string) => speicher.get(x) ?? null, setItem: (x: string, v: string) => void speicher.set(x, v), removeItem: (x: string) => void speicher.delete(x) };
  const eins = schutz.chatKennung(s);
  assert.match(eins, /^[a-z0-9]{20}$/);
  assert.equal(schutz.chatKennung(s), eins);
  const chat = lies("components/chat/useChat.ts");
  assert.equal((chat.match(/kennung: kennung\(\)/g) ?? []).length, 3, "/api/chat (2×) und Ticket eröffnen");
  assert.equal((chat.match(/&k=\$\{encodeURIComponent\(kennung\(\)\)\}/g) ?? []).length, 2, "beide Abrufe des Tickets");
});

test("4d: Beleg-Prüfung sieht alles vom Kunden: erste Frage, mehrzeilige Nachrichten, Chat davor bis 4000 Zeichen", async () => {
  const beleg: any = await import("../lib/sperr-beleg.ts");
  const verlauf = [
    { role: "user", content: "Erste Zeile\nzweite Zeile mit Schimpfwort" },
    { role: "assistant", content: "Gern helfe ich." },
    ...Array.from({ length: 10 }, (_, n) => ({ role: n % 2 ? "assistant" : "user", content: `${"x".repeat(380)} ${n}` })),
  ];
  const felder = beleg.chatDavorFelder(verlauf);
  assert.ok(felder.length >= 2 && felder.length <= 4, "auf mehrere Felder verteilt, höchstens vier");
  for (const f of felder) assert.ok(f.value.length <= 1024, "Discord: höchstens 1024 Zeichen je Feld");
  assert.ok(beleg.chatDavorText(felder).length <= beleg.DAVOR_MAX);
  assert.ok(beleg.chatDavorText(felder).length > 1000, "mehr als die 1000 Zeichen von vorher");
  // Lange Nachrichten (je 1000 Zeichen, so viel schickt der Browser höchstens): nur ganze Nachrichten, die neuesten,
  // zusammen höchstens 4000 Zeichen (hier drei).
  const lang = Array.from({ length: 6 }, (_, n) => ({ role: "user", content: `${n}${"y".repeat(999)}` }));
  const ganze = beleg.kundeImChatDavor(beleg.chatDavorText(beleg.chatDavorFelder(lang)));
  assert.deepEqual(ganze.map((t: string) => [t[0], t.length]), [["3", 1000], ["4", 1000], ["5", 1000]]);
  // Die ganze Karte bleibt unter Discords 6000 Zeichen, auch bei langer Frage.
  assert.equal(beleg.davorPlatz("Max", "max@example.com", "kurz"), 4000);
  const platz = beleg.davorPlatz("N".repeat(200), "K".repeat(200), "F".repeat(1000));
  assert.ok(platz + 1400 + 900 <= 6000 && platz >= 3000, String(platz));
  const kurz = beleg.chatDavorFelder(verlauf.slice(0, 2));
  assert.deepEqual(beleg.kundeImChatDavor(beleg.chatDavorText(kurz)), ["Erste Zeile\nzweite Zeile mit Schimpfwort"]);
  // Die erste Frage aus dem Feld „Frage“ gehört dazu (lib/support.ts, kundenNachrichten).
  const s = lies("lib/support.ts");
  const teil = s.slice(s.indexOf("export async function kundenNachrichten("));
  assert.match(teil, /return \[\.\.\.kundeImChatDavor\(davor\), \.\.\.\(frage \? \[frage\] : \[\]\), \.\.\.imTicket\];/);
  // Und der Browser schickt mehr vom Chat davor mit.
  assert.match(lies("components/chat/useChat.ts"), /verlauf: aiHistory\(messages\)\.slice\(-12\),/);
});

test("4e: abgelaufene Sperre vermerken: Karte frisch lesen, nur ändern, wenn sie noch abgelaufen ist", () => {
  const s = lies("lib/support.ts");
  const teil = s.slice(s.indexOf("export async function markiereAbgelaufen("), s.indexOf("/** Von Hand mit Beleg gesperrt"));
  assert.match(teil, /^export async function markiereAbgelaufen\(token: string, channelId: string, bis: number\)/);
  assert.match(teil, /await aendereKarte\(token, channelId, \(felder\) =>\s*sperreDerKarte\(felder\)\.abgelaufen \?/);
  assert.match(teil, /if \(!geaendert\) return;/);
});

test("4f: Discord wartet nur 3 Sekunden: was erst holen oder senden muss, antwortet sofort mit „Moment“ (Typ 6)", () => {
  const h = lies("lib/ticket-handler.ts");
  const handle = h.slice(h.indexOf("export async function handleTicket("), h.indexOf("function sofort("));
  // An der Karte selbst: sofort. Fenster: Karte höchstens 1,5 s holen. Alles andere: Typ 6, danach liefern.
  assert.match(handle, /if \(ausNachricht && !IMMER_SPAETER\.has\(id\)\) return sofort\(/);
  assert.match(handle, /await mitFrist\(leseKarte\(token, channel\), FENSTER_FRIST_MS\)/);
  assert.match(handle, /await liefere\(i\.application_id, i\.token, e\.antwort\);/);
  assert.match(handle, /return NextResponse\.json\(\{ type: 6 \}\);/);
  assert.match(h, /export const FENSTER_FRIST_MS = 1500;/);
  // In entscheide() wird nichts mehr direkt nach Discord geschickt, außer bei „Noch Fragen?“/„Abschluss“ (immer aufgeschoben).
  const ent = h.slice(h.indexOf("async function entscheide("));
  assert.doesNotMatch(ent, /\bafter\(/);
});
