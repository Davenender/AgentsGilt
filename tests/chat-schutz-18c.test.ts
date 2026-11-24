// Prompt 18c (24.11.2026): drei neue Fehler aus der Prüfung von 18b (cebecd2) und der Schreibkonflikt an der Karte.
// Jeder Test stellt einen Fall nach. Die Module werden in jedem Test neu geladen (await import): So läuft dieselbe
// Datei auch gegen den Stand cebecd2 und zeigt dort, was falsch war (rot), hier, dass es stimmt (grün).
// Was dort der Server mit Discord tat (Löschen, Warnen, Karte schreiben), machen die Hilfen unten mit den reinen
// Regeln nach: Gibt es die neue Regel, wird sie benutzt, sonst das, was der Code von cebecd2 an derselben Stelle tat.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Feld = { name: string; value: string };
type Nachricht = { id: string; content: string; author: { id?: string; bot?: boolean }; message_reference?: { message_id: string } };

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const ablauf = async (): Promise<any> => import("../lib/support-ablauf.ts");

const JAKOB = "111111111111111111";
const MIJO = "222222222222222222";
const NEU = "333333333333333333";
const idZu = (ms: number, n = 0) => String(((BigInt(ms) - BigInt(1420070400000)) << BigInt(22)) + BigInt(n));
const T0 = Date.UTC(2026, 10, 24, 10, 0, 0);
const team = (autor: string, text: string, zeit: number, n = 0): Nachricht => ({ id: idZu(zeit, n), content: text, author: { id: autor, bot: false } });
const status = (f: Feld[], wert: string) => f.map((x) => (x.name === "Status" ? { ...x, value: wert } : x));
const alsArt = (m: Nachricht) => ({ id: m.id, text: m.content, autor: m.author.id ?? "" });

async function neueKarte(zeit: number): Promise<Feld[]> {
  const ab = await ablauf();
  return ab.mitAblauf([{ name: "Status", value: "Offen" }, { name: "Frage", value: "Was kostet eine Website?" }], { pruefungAb: ab.aufSekunde(zeit) });
}
async function uebernommen(wer: string, zeit: number): Promise<Feld[]> {
  const ab = await ablauf();
  return status(ab.mitUebernahme(await neueKarte(T0), wer, zeit), `Übernommen von <@${wer}> um 10:01`);
}
/** Geht diese Nachricht an den Kunden („senden“) oder gilt sie als fremd? Wie relayMessages in lib/support.ts. */
async function art(m: Nachricht, f: Feld[]): Promise<string> {
  const ab = await ablauf();
  if (typeof ab.artImKanal === "function") return ab.artImKanal(alsArt(m), ab.kanalRegel(f));
  return ab.artDerTeamNachricht(alsArt(m), ab.uebernehmerDerKarte(f), ab.leseAblauf(f).uebernommen ?? 0);
}

// ------------------------------------------------------------------ A

test("A: Freigeben gleich nach der letzten Nachricht: sie kommt noch an, erst danach Geschriebenes ist fremd", async () => {
  const ab = await ablauf();
  const f0 = await uebernommen(JAKOB, T0 + 60_000);
  const letzte = team(JAKOB, "Ich gebe dich an einen Kollegen weiter.", T0 + 600_000);
  // Wenige Sekunden später „Freigeben“ (Knopf; automatisch und beim Wiederöffnen per Mail dieselbe Regel).
  const frei = status(ab.ohneUebernahme(f0, T0 + 603_000), ab.freigegebenStatus(`<@${JAKOB}>`, "10:10"));
  assert.equal(await art(letzte, frei), "senden", "die Nachricht von vor dem Freigeben kommt an");
  assert.deepEqual(ab.zumLoeschen([letzte], frei).map((x: { id: string }) => x.id), [], "und wird nicht gelöscht");
  assert.equal(await art(team(JAKOB, "Ach, noch was", T0 + 610_000), frei), "fremd", "danach Geschriebenes ist fremd");
  assert.match(frei.find((x) => x.name === "Ablauf")?.value ?? "", new RegExp(`^Freigegeben <t:\\d+:T> von <@${JAKOB}> \\(übernommen <t:\\d+:T>\\)$`, "m"));
  // Was er vor dem Übernehmen schrieb, bleibt fremd.
  assert.equal(await art(team(JAKOB, "Moin", T0 + 30_000), frei), "fremd");
  // Ein Neuer übernimmt: Jakobs letzte Nachricht kommt trotzdem noch an, Mijos danach auch.
  const neu = status(ab.mitUebernahme(frei, MIJO, T0 + 620_000), `Übernommen von <@${MIJO}> um 10:10`);
  assert.equal(await art(letzte, neu), "senden");
  assert.equal(await art(team(MIJO, "Hallo, ich bin jetzt da.", T0 + 630_000), neu), "senden");
  // Per Mail wieder geöffnet (nach dem Schließen): ebenso.
  const offen = ab.wiederOffenFelder(f0, T0 + 3_600_000);
  assert.equal(await art(letzte, offen), "senden");
});

// ------------------------------------------------------------------ B

test("B: Register nicht lesbar → kein Ticket wird frei; ausdrücklich pausiert oder ausgetreten → frei", async () => {
  const ab = await ablauf();
  const t: any = await import("../lib/team.ts");
  // Bis cebecd2 galt als aktiv nur, wer im Register „team“ hat (lib/support.ts, imTeam).
  const aktiv = (id: string): boolean => (typeof t.nochAktiv === "function" ? t.nochAktiv(id) : t.mitglied(id)?.status === "team");
  const f = await uebernommen(NEU, T0 + 60_000);
  try {
    // Lesefehler: Nur die Startliste ist da, das neue Mitglied fehlt darin.
    t.setzeTeam(t.START.map((m: object) => ({ ...m })));
    assert.equal(ab.uebernehmerWeg(f, aktiv), null, "Lesefehler gibt nichts frei");
    // Ausdrücklich pausiert / ausgetreten: frei. Anwärter oder im Team: nicht.
    const mit = (s: string) => t.setzeTeam([...t.START, { discord: NEU, name: "Neu", status: s, notion: "", figur: "", seit: "", telefon: "" }]);
    mit("pause");
    assert.equal(ab.uebernehmerWeg(f, aktiv), NEU);
    mit("ausgetreten");
    assert.equal(ab.uebernehmerWeg(f, aktiv), NEU);
    mit("team");
    assert.equal(ab.uebernehmerWeg(f, aktiv), null);
  } finally {
    t.setzeTeam(t.START);
  }
  // ladeTeam merkt sich das Register nur, wenn wirklich Register-Zeilen gelesen wurden (Lesefehler: leere Liste).
  assert.match(
    lies("lib/team-daten.ts"),
    /if \(registerZeilen\(msgs\) > 0\) \{\s*setzeTeam\(leseRegister\(msgs\)\);\s*setzeEinstellungen\(leseEinstellungen\(msgs\)\);\s*bis = Date\.now\(\) \+ MERKEN_MS;/,
  );
  assert.equal(t.registerZeilen([]), 0);
  assert.equal(t.registerZeilen([{ content: t.zeileTeam({ discord: NEU, name: "Neu", status: "team", notion: "", figur: "", seit: "" }) }]), 1);
});

// ------------------------------------------------------------------ C

test("C: 7 fremde Nachrichten ohne Löschrecht: jede wird genau einmal gewarnt, im Abruf wie im Minutentakt", async () => {
  const ab = await ablauf();
  const f = await uebernommen(JAKOB, T0 + 60_000);
  const liste: Nachricht[] = Array.from({ length: 7 }, (_, n) => team(MIJO, `Mijo ${n + 1}`, T0 + 120_000 + n * 1000));
  const warnungen = new Map<string, number>();
  let nr = 0;
  const neu = typeof ab.fremdeZuWarnen === "function";
  // Ein Durchgang so, wie der Server ihn macht. Das Löschen scheitert immer (Recht fehlt), die Nachricht bleibt.
  const durchgang = (wo: "takt" | "abruf") => {
    if (neu) {
      // Seit 18c: Warnung als Antwort auf die Nachricht, dann Löschen (scheitert).
      const k = wo === "takt" ? ab.zumLoeschen(liste, f) : ab.fremdeZuWarnen(liste, f);
      for (const x of k) {
        liste.push({ id: idZu(T0 + 200_000, nr++), content: ab.fremdWarnung(x.autor, JAKOB), author: { bot: true }, message_reference: { message_id: x.id } });
        warnungen.set(x.id, (warnungen.get(x.id) ?? 0) + 1);
      }
      return;
    }
    // cebecd2: Minutentakt die 5 ältesten (mit „gewarnt“), Abruf alle fremden (ohne). Löschen scheitert, die Nachricht
    // steht noch da, also wird gewarnt, außer „gewarnt“ ist gesetzt. (Der Abruf läuft in einer anderen Instanz.)
    const k =
      wo === "takt"
        ? ab.zumLoeschen(liste, f)
        : liste.filter((m) => !m.author.bot && ab.pruefbar(f, Number((BigInt(m.id) >> 22n) + 1420070400000n)) && ab.artDerTeamNachricht(alsArt(m), JAKOB, ab.leseAblauf(f).uebernommen ?? 0) === "fremd").map((m) => ({ id: m.id, autor: m.author.id }));
    for (const x of k) {
      if (x.gewarnt) continue;
      liste.push({ id: idZu(T0 + 200_000, nr++), content: ab.fremdWarnung(x.autor, JAKOB), author: { bot: true } });
      warnungen.set(x.id, (warnungen.get(x.id) ?? 0) + 1);
    }
  };
  durchgang("takt");
  durchgang("takt");
  durchgang("abruf");
  durchgang("takt");
  const je = liste.filter((m) => !m.author.bot).map((m) => warnungen.get(m.id) ?? 0);
  assert.deepEqual(je, [1, 1, 1, 1, 1, 1, 1], `Warnungen je Nachricht: ${je.join(", ")}`);
  // Warnungen auf Nachrichten, die noch dastehen, bleiben (sie merken sich das „gewarnt“).
  assert.deepEqual(ab.warnungenZumLoeschen(liste, T0 + 600_000), []);
  // Älteste zuerst, auch wenn mehrere in derselben Millisekunde kamen (gefunden im Ablauftest).
  const gleich = Array.from({ length: 7 }, (_, n) => team(MIJO, `gleich ${n}`, T0 + 300_000, 6 - n));
  assert.deepEqual(ab.zumLoeschen(gleich, f).map((x: { id: string }) => x.id), [...gleich].reverse().slice(0, 5).map((m) => m.id));
  // Der Server warnt als Antwort und erst dann löscht er (lib/support.ts, loescheFremde).
  const s = lies("lib/support.ts");
  const teil = s.slice(s.indexOf("export async function loescheFremde("), s.indexOf("export async function loescheNachricht("));
  assert.match(teil, /message_reference: \{ message_id: f\.id, fail_if_not_exists: true \}/);
  assert.ok(teil.indexOf("message_reference") < teil.indexOf("await loescheNachricht(token, channelId, f.id)"), "erst warnen, dann löschen");
});

// ------------------------------------------------------------------ D

test("D: Übernahme bleibt, auch wenn gleichzeitig „Zuletzt zugestellt“ an die Karte geschrieben wird", async () => {
  const ab = await ablauf();
  let ks: any = null;
  try {
    ks = await import("../lib/karte-schreiben.ts");
  } catch {
    ks = null;
  }
  const S0 = await neueKarte(T0);
  // Der Abruf des Kunden hat die Karte gelesen (noch ohne Übernahme) und schreibt gleich „Zuletzt zugestellt“ dazu.
  const abrufLas = S0;
  const zustellung = (karte: Feld[]) => ab.mitAblauf(karte, { zugestellt: ab.aufSekunde(T0 + 65_000) });
  const uebernimm = (karte: Feld[]) => status(ab.mitUebernahme(karte, JAKOB, T0 + 61_000), `Übernommen von <@${JAKOB}> um 10:01`);
  let karte: Feld[] = S0;
  if (ks) {
    // Seit 18c: frisch lesen, schreiben, nachsehen, sonst noch einmal. Der Abruf schreibt genau zwischen Schreiben und
    // Nachsehen seine ältere Karte zurück (das schlimmste Zusammentreffen).
    let abrufFertig = false;
    const r = await ks.aendereGeprueft(
      {
        lese: async () => karte,
        schreibe: async (k: Feld[]) => {
          karte = k;
          if (!abrufFertig) {
            karte = zustellung(abrufLas);
            abrufFertig = true;
          }
          return true;
        },
        warte: async () => {},
      },
      (k: Feld[]) => (ab.leseAblauf(k).von ? null : uebernimm(k)),
      (k: Feld[]) => ab.leseAblauf(k).von === JAKOB,
    );
    assert.equal(r, "ok");
  } else {
    // cebecd2: Der Knopf schrieb die Karte aus der angeklickten Nachricht (Typ 7), dann schrieb der Abruf seine.
    karte = uebernimm(S0);
    karte = zustellung(abrufLas);
  }
  assert.equal(ab.leseAblauf(karte).von, JAKOB, "die Übernahme steht");
  assert.ok(ab.leseAblauf(karte).zugestellt, "und „Zuletzt zugestellt“ auch");
  // Übernehmen, Freigeben, Schließen schreiben so (lib/support.ts) und antworten Discord sofort mit „Moment“.
  const s = lies("lib/support.ts");
  for (const f of ["uebernimmTicket", "gibTicketFrei", "schliesseKarte"]) assert.match(s, new RegExp(`export async function ${f}\\([\\s\\S]*?aendereKarteGeprueft\\(`), f);
  const h = lies("lib/ticket-handler.ts");
  assert.match(h, /uebernimmTicket\(token, channel, \{ id: userId, tag: ownerTag, zeit: time \}, jetzt, aktiv\)/);
  // Seit 18d wird das Ergebnis ausgewertet (karteSchliessen).
  assert.match(h, /if \(!\(await schliesseKarte\(token, channel, `Geschlossen von \$\{ownerTag\} um \$\{time\}`\)\)\)/);
});
