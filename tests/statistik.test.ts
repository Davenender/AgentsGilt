// Tests für die Statistik (Plan 1, Etappe 6): `npm test`. Nur reine Logik.
import assert from "node:assert/strict";
import { test } from "node:test";
import { rechneStatistik, snowflakeZeit, statistikKarte, STAT_KNOPF, type KundeEintrag, type LeadEintrag } from "../lib/statistik.ts";

const DAVID = "806859236768088114";
const JAKOB = "523479048727560205";
const MIJO = "1363529531939492133";
const JETZT = Date.parse("2026-11-08T22:00:00Z");
const TAG = 86_400_000;

const leads: LeadEintrag[] = [
  { zeit: JETZT - 2 * TAG, besitzer: JAKOB },
  { zeit: JETZT - 5 * TAG, besitzer: JAKOB },
  { zeit: JETZT - 10 * TAG, besitzer: MIJO },
  { zeit: JETZT - 40 * TAG, besitzer: null },
  { zeit: JETZT - 60 * TAG, besitzer: DAVID },
];
const k = (o: Partial<KundeEintrag>): KundeEintrag => ({ status: "Lead", verlustgrund: null, zustaendig: [], angebotRaus: false, erstellt: null, gespraech: false, ...o });
const kunden: KundeEintrag[] = [
  k({ status: "Lead", erstellt: "2026-11-05T10:00:00Z", zustaendig: [JAKOB] }),
  k({ status: "Lead", gespraech: true, zustaendig: [MIJO] }),
  k({ status: "Angebot gesendet", angebotRaus: true, zustaendig: [JAKOB] }),
  k({ status: "Kunde", zustaendig: [DAVID, JAKOB], erstellt: "2026-10-01T10:00:00Z" }),
  k({ status: "Verloren", verlustgrund: "Zu teuer", angebotRaus: true, gespraech: true }),
  k({ status: "Verloren", verlustgrund: "Zu teuer" }),
  k({ status: "Verloren", verlustgrund: null }),
];

test("Trichter: Lead-Karten → Lead aktiv → Gespräch → Angebot → Kunde / verloren", () => {
  const s = rechneStatistik(leads, kunden, JETZT);
  assert.deepEqual(s.trichter, { leads: 5, aktiv: 7, gespraech: 4, angebot: 3, kunde: 1, verloren: 3 });
  assert.equal(s.quote, 14, "1 von 7 aktiven Leads ist Kunde geworden (gerundet)");
  assert.deepEqual(s.letzte30, { leads: 3, aktiv: 1 });
});

test("Verlustgründe, häufigste zuerst", () => {
  const s = rechneStatistik(leads, kunden, JETZT);
  assert.deepEqual(s.verlustgruende, [
    ["Zu teuer", 2],
    ["ohne Grund", 1],
  ]);
});

test("Je Person: übernommen und gewonnen", () => {
  const s = rechneStatistik(leads, kunden, JETZT);
  assert.deepEqual(s.personen, [
    { name: "David", uebernommen: 1, gewonnen: 1 },
    { name: "Jakob", uebernommen: 2, gewonnen: 1 },
    { name: "Mijo", uebernommen: 1, gewonnen: 0 },
  ]);
});

test("Leere Daten gehen auch", () => {
  const s = rechneStatistik([], [], JETZT);
  assert.equal(s.quote, 0);
  assert.deepEqual(s.verlustgruende, []);
  assert.match(JSON.stringify(statistikKarte(s, "08.11.2026, 23:00")), /Noch keine verlorenen Kunden/);
});

test("Karte für #statistik mit Knopf zum Aktualisieren", () => {
  const karte = statistikKarte(rechneStatistik(leads, kunden, JETZT), "08.11.2026, 23:00");
  assert.equal(karte.title, "📊 Kunden-Statistik");
  const text = JSON.stringify(karte);
  for (const muss of ["Lead-Karten", "Lead aktiv", "Gespräch", "Angebot", "Kunde", "Verloren", "Zu teuer", "Jakob", "14 %", "letzten 30 Tagen"]) assert.ok(text.includes(muss), muss);
  assert.match(karte.footer?.text ?? "", /Stand 08\.11\.2026, 23:00/);
  assert.equal(STAT_KNOPF[0].components[0].custom_id, "stat:neu");
});

test("Zeitpunkt aus einer Discord-Kennung", () => {
  // 806859236768088114 → Discord-Konto von David, angelegt 2021
  assert.equal(new Date(snowflakeZeit("806859236768088114")).getUTCFullYear(), 2021);
  assert.equal(snowflakeZeit("0"), 1420070400000);
});
