// Prompt 18d (24.11.2026): drei kleine Punkte aus der Prüfung von 18c (8f93cee). Jeder Test stellt den Fall nach. Die
// Module werden in jedem Test neu geladen (await import): So läuft dieselbe Datei auch gegen 8f93cee (dort rot).
// Was der Server mit Discord tut, machen die Hilfen mit den reinen Regeln nach (lib/karte-schreiben.ts gab es schon in
// 18c); fehlt eine neue Regel, steht dort, was der Code von 8f93cee an derselben Stelle tat.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Feld = { name: string; value: string };

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const ablauf = async (): Promise<any> => import("../lib/support-ablauf.ts");
const schreiben = async (): Promise<any> => import("../lib/karte-schreiben.ts");

const JAKOB = "111111111111111111";
const MIJO = "222222222222222222";
const T0 = Date.UTC(2026, 10, 24, 12, 0, 0);
const status = (f: Feld[], wert: string) => f.map((x) => (x.name === "Status" ? { ...x, value: wert } : x));

async function neueKarte(): Promise<Feld[]> {
  const ab = await ablauf();
  return ab.mitAblauf([{ name: "Status", value: "Offen" }, { name: "Frage", value: "Hallo" }], { pruefungAb: ab.aufSekunde(T0) });
}

/** Ein Speicher für die Karte, wie Discord sie hält; zählt die Schreibvorgänge. */
function speicher(start: Feld[]) {
  const s = { karte: start, geschrieben: 0, beimWarten: null as null | (() => void) };
  const zugriff = {
    lese: async () => s.karte,
    schreibe: async (k: Feld[]) => {
      s.karte = k;
      s.geschrieben++;
      return true;
    },
    warte: async () => {
      const f = s.beimWarten;
      s.beimWarten = null;
      f?.();
    },
  };
  return { s, zugriff };
}

/** Übernehmen wie uebernimmTicket (lib/support.ts): Ergebnis und ob „Du bist jetzt … verbunden“ gepostet wird. */
async function uebernehmen(z: any, wer: string): Promise<{ r: string; schon: boolean; postet: boolean }> {
  const ab = await ablauf();
  const ks = await schreiben();
  const w = { id: wer, tag: `<@${wer}>`, zeit: "12:01" };
  let schon = false;
  const r = await ks.aendereGeprueft(
    z,
    (f: Feld[]) => {
      if (typeof ab.uebernahmeSchritt === "function") {
        const schritt = ab.uebernahmeSchritt(f, w, T0 + 60_000);
        if (schritt.art === "schon") schon = true;
        return schritt.art === "schreiben" ? schritt.fields : null;
      }
      // 8f93cee: nur ein anderer wurde abgewiesen, dieselbe Person schrieb noch einmal.
      const da = ab.uebernehmerDerKarte(f);
      if (da && da !== wer) return null;
      return status(ab.mitUebernahme(f, wer, T0 + 60_000), `Übernommen von <@${wer}> um 12:01`);
    },
    (f: Feld[]) => ab.leseAblauf(f).von === wer,
  );
  return { r, schon, postet: r === "ok" };
}

test("1: Doppelklick auf „Übernehmen“: einmal „verbunden“, der zweite Klick sieht nur „Du hast das Ticket schon übernommen.“", async () => {
  const ab = await ablauf();
  const { s, zugriff } = speicher(await neueKarte());
  const erster = await uebernehmen(zugriff, JAKOB);
  // Der zweite Klick kommt von der alten Nachricht (der Knopf war noch da), die Karte ist inzwischen geschrieben.
  const zweiter = await uebernehmen(zugriff, JAKOB);
  const posts = [erster, zweiter].filter((x) => x.postet).length;
  assert.equal(posts, 1, `„Du bist jetzt mit einem Mitarbeiter verbunden“ ${posts}×`);
  assert.equal(s.geschrieben, 1, "die Karte wird nur einmal geschrieben");
  assert.equal(zweiter.schon, true);
  assert.equal(ab.SCHON_UEBERNOMMEN, "Du hast das Ticket schon übernommen.");
  // Dazu die Doppelklick-Sperre (zwei Klicks gleichzeitig in derselben Instanz) und die Meldung nur für ihn.
  const h = lies("lib/ticket-handler.ts");
  const teil = h.slice(h.indexOf('if (id === "ticket:claim")'), h.indexOf("// ------------------------------------------------------------ alles andere"));
  assert.match(teil, /const schluessel = `\$\{channel\}:uebernehmen:\$\{userId\}`;\s*if \(!beginne\(schluessel, jetzt\)\) return privatMeldung\(SCHON_UEBERNOMMEN\);/);
  assert.match(teil, /r\.schon \? SCHON_UEBERNOMMEN :/);
  assert.match(teil, /finally \{\s*laeuft\.delete\(schluessel\);/);
});

test("2: Freigeben, und gleich danach übernimmt jemand anderes: gilt als geklappt, nichts wird noch einmal geschrieben", async () => {
  const ab = await ablauf();
  const ks = await schreiben();
  const start = status(ab.mitUebernahme(await neueKarte(), JAKOB, T0 + 60_000), `Übernommen von <@${JAKOB}> um 12:01`);
  const { s, zugriff } = speicher(start);
  const frei = ab.freigegebenStatus(`<@${JAKOB}>`, "12:10");
  // Während das Freigeben nachsieht (etwa 1,2 s), übernimmt Mijo.
  s.beimWarten = () => {
    s.karte = status(ab.mitUebernahme(s.karte, MIJO, T0 + 601_000), `Übernommen von <@${MIJO}> um 12:10`);
  };
  let bisher: string | null = null;
  const r = await ks.aendereGeprueft(
    zugriff,
    (f: Feld[]) => {
      bisher ??= ab.uebernehmerDerKarte(f);
      return typeof ab.freigabeFelder === "function" ? ab.freigabeFelder(f, frei, T0 + 600_000) : status(ab.ohneUebernahme(f, T0 + 600_000), frei);
    },
    // 8f93cee prüfte nur: Status „Freigegeben …“ und niemand übernommen.
    (f: Feld[]) => (typeof ab.freigabeSteht === "function" ? ab.freigabeSteht(f, frei, bisher) : f.find((x) => x.name === "Status")?.value === frei && !ab.leseAblauf(f).von),
  );
  assert.equal(r, "ok", "keine Fehlermeldung für den, der freigegeben hat");
  assert.equal(s.geschrieben, 1, "nicht noch einmal freigegeben");
  assert.equal(ab.leseAblauf(s.karte).von, MIJO, "Mijos Übernahme bleibt");
  // Schrieb dagegen jemand eine ältere Karte zurück (Jakob wieder drin), ist das Freigeben weg: noch einmal.
  if (typeof ab.freigabeSteht === "function") assert.equal(ab.freigabeSteht(start, frei, JAKOB), false);
});

test("3: Scheitert das Schließen der Karte: Meldung für den Klickenden; ein zweiter Klick schließt nur noch die Karte", async () => {
  const ab = await ablauf();
  const offen = status(ab.mitUebernahme(await neueKarte(), JAKOB, T0 + 60_000), `Übernommen von <@${JAKOB}> um 12:01`);
  const zu = status(offen, "Geschlossen von <@111111111111111111> um 12:30");
  // 8f93cee: Hieß der Kanal schon „geschlossen-…“, kam immer „Das Ticket ist schon geschlossen.“, die Karte blieb offen.
  const schritt = (kanalZu: boolean, f: Feld[]) => (typeof ab.schliessenSchritt === "function" ? ab.schliessenSchritt(kanalZu, f) : kanalZu ? "schon-zu" : "alles");
  assert.equal(schritt(true, offen), "nur-karte", "Kanal umbenannt, Karte offen: nur noch die Karte schließen");
  assert.equal(schritt(true, zu), "schon-zu");
  assert.equal(schritt(false, offen), "alles");
  assert.equal(ab.KARTE_NICHT_ZU, "Die Karte ließ sich nicht schließen – drück bitte noch einmal ‚Ticket schließen‘.");
  // Der Knopf wertet das Ergebnis aus und meldet es nur dem Klickenden (lib/ticket-handler.ts).
  const h = lies("lib/ticket-handler.ts");
  assert.match(h, /if \(!\(await schliesseKarte\(token, channel, `Geschlossen von \$\{ownerTag\} um \$\{time\}`\)\)\) await followupPrivate\(i\.application_id \?\? "", i\.token \?\? "", KARTE_NICHT_ZU\);/);
  const zuTeil = h.slice(h.indexOf('if (id === "ticket:close")'));
  assert.match(zuTeil, /const schritt = schliessenSchritt\(geschlossen, felder\);\s*if \(schritt === "schon-zu"\) return schonZu\(\);\s*if \(schritt === "alles"\) \{/);
});
