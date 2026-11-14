// Tests für die Rechenregeln der Startanimation im Kopfbereich: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { OBEN_PX, lichtStaerke, probeFrist, rollStand, stufenWerte } from "../components/neu/kopf/startlogik.ts";

test("Oben ist oben: Bis 24 px unter dem Seitenanfang fliegt nichts auseinander", () => {
  for (const y of [0, 0.5, 1, 3, 10, OBEN_PX]) assert.equal(rollStand(y, 900), 0, `scrollY ${y}`);
  // Auch beim Zurückfedern über den Seitenanfang hinaus (negative Werte am Mac).
  assert.equal(rollStand(-40, 900), 0);
});

test("Danach wächst der Fortschritt stetig und ist nach 90 % der Bildhöhe bei 1", () => {
  let vorher = 0;
  for (let y = OBEN_PX + 1; y <= 810; y += 7) {
    const s = rollStand(y, 900);
    assert.ok(s > 0 && s <= 1 && s >= vorher, `scrollY ${y}: ${s}`);
    vorher = s;
  }
  assert.equal(rollStand(810, 900), 1);
  assert.equal(rollStand(5000, 900), 1);
});

test("Der Fortschritt bleibt auch bei unsinnigen Maßen eine Zahl zwischen 0 und 1", () => {
  for (const hoch of [0, 1, 20, Number.NaN]) {
    const s = rollStand(300, hoch);
    assert.ok(s >= 0 && s <= 1, `Bildhöhe ${hoch}: ${s}`);
  }
});

test("Das Licht baut sich von innen nach außen auf: erst der Stern, dann die Balken, dann die Strahlen", () => {
  const zeiten = [0.7, 0.6, 1.2] as const;
  assert.deepEqual(stufenWerte(0, zeiten), { stern: 0, balken: 0, strahlen: 0 });
  assert.deepEqual(stufenWerte(1, zeiten), { stern: 1, balken: 1, strahlen: 1 });
  // Nach der ersten Stufe steht der Stern, die Strahlen haben noch nicht begonnen.
  const nachStern = stufenWerte(0.7 / 2.5, zeiten);
  assert.equal(nachStern.stern, 1);
  assert.ok(nachStern.balken > 0 && nachStern.balken < 0.2);
  assert.equal(nachStern.strahlen, 0);
  // Keine Stufe geht je zurück.
  let v = stufenWerte(0, zeiten);
  for (let p = 0.01; p <= 1; p += 0.01) {
    const w = stufenWerte(p, zeiten);
    assert.ok(w.stern >= v.stern && w.balken >= v.balken && w.strahlen >= v.strahlen, `p ${p}`);
    assert.ok(w.stern >= w.balken && w.balken >= w.strahlen, `Reihenfolge bei p ${p}`);
    v = w;
  }
});

test("Lichtstärke: 0 am Anfang, 1 am Ende, 60 % (Zeichen fliegen los) erst, wenn die Strahlen wachsen", () => {
  const zeiten = [0.7, 0.6, 1.2] as const;
  assert.equal(lichtStaerke(0, zeiten), 0);
  assert.equal(lichtStaerke(1, zeiten), 1);
  let ab = -1;
  for (let p = 0; p <= 1; p += 0.002) {
    if (lichtStaerke(p, zeiten) >= 0.6) {
      ab = p;
      break;
    }
  }
  assert.ok(ab > 0, "60 % werden erreicht");
  const w = stufenWerte(ab, zeiten);
  assert.equal(w.stern, 1);
  assert.ok(w.balken > 0.95 && w.strahlen > 0.1, `bei p ${ab}: Balken ${w.balken}, Strahlen ${w.strahlen}`);
});

test("Die Probe hält den Start höchstens bis 6 s nach dem ersten Bild auf, nach langem Laden noch 1 s", () => {
  assert.equal(probeFrist(1.5), 4.5);
  assert.equal(probeFrist(5.6), 1);
  assert.equal(probeFrist(9), 1);
  // Nie über die Sicherheitsgrenze von 15 s hinaus.
  assert.equal(probeFrist(14.5), 0.5);
  assert.equal(probeFrist(16), 0);
});

// ── Sprungziele während der Startanimation (umgebung.ts).
import { scrollSperre, scrollZiel } from "../components/neu/umgebung.ts";

test("ein Sprungziel während der Sperre wird gemerkt und erst nach der Freigabe angesteuert", () => {
  const gescrollt: unknown[] = [];
  scrollZiel.melde((ziel) => gescrollt.push(ziel));
  const kontakt = { isConnected: true } as HTMLElement;
  const leistungen = { isConnected: true } as HTMLElement;
  try {
    scrollSperre.setze(true, true);
    scrollZiel.zu(kontakt);
    assert.equal(gescrollt.length, 0, "während der Sperre bewegt sich nichts");
    // Das zuletzt gewünschte Ziel zählt.
    scrollZiel.zu(leistungen);
    assert.equal(scrollSperre.setze(false), true, "die Freigabe meldet, dass die Seite zum Ziel scrollt");
    assert.deepEqual(gescrollt, [leistungen]);
    // Ohne Sperre scrollt die Seite sofort.
    scrollZiel.zu(kontakt);
    assert.deepEqual(gescrollt, [leistungen, kontakt]);
  } finally {
    scrollSperre.setze(false);
    scrollZiel.melde(undefined);
  }
});

test("ohne gemerktes Ziel, nach dem Verwerfen oder mit einem entfernten Ziel scrollt die Freigabe nirgendwohin", () => {
  const gescrollt: unknown[] = [];
  scrollZiel.melde((ziel) => gescrollt.push(ziel));
  try {
    scrollSperre.setze(true, true);
    assert.equal(scrollSperre.setze(false), false, "kein Ziel");
    scrollSperre.setze(true, true);
    scrollZiel.zu({ isConnected: true } as HTMLElement);
    scrollZiel.vergiss();
    assert.equal(scrollSperre.setze(false), false, "verworfen");
    scrollSperre.setze(true, true);
    scrollZiel.zu({ isConnected: false } as HTMLElement);
    assert.equal(scrollSperre.setze(false), false, "nicht mehr im Dokument");
    // Eine neue Sperre beginnt ohne das Ziel der letzten.
    scrollSperre.setze(true, true);
    scrollZiel.zu({ isConnected: true } as HTMLElement);
    scrollSperre.setze(false);
    scrollSperre.setze(true, true);
    assert.equal(scrollSperre.setze(false), false, "neue Sperre, kein altes Ziel");
    assert.equal(gescrollt.length, 1);
  } finally {
    scrollSperre.setze(false);
    scrollZiel.melde(undefined);
  }
});

// ── Die Uhr des Sicherheitsnetzes: Sie läuft nur, solange die Seite zu sehen ist.
import { erzeugeSichtUhr } from "../components/neu/kopf/startlogik.ts";

test("die Sicht-Uhr zählt nur sichtbare Zeit: Ein verdeckter Tab hält sie an", () => {
  let zeit = 1000;
  let verdeckt = false;
  const uhr = erzeugeSichtUhr(() => zeit, () => verdeckt);
  zeit = 3000;
  assert.equal(uhr.ms(), 2000, "2 s zu sehen");
  // Tab-Wechsel: 30 s weg.
  verdeckt = true;
  uhr.wechsel();
  zeit = 33000;
  assert.equal(uhr.ms(), 2000, "verdeckt steht die Uhr");
  verdeckt = false;
  uhr.wechsel();
  zeit = 34500;
  assert.equal(uhr.ms(), 3500, "nach der Rückkehr läuft sie weiter");
  // Doppelte Meldungen ändern nichts.
  uhr.wechsel();
  uhr.wechsel();
  assert.equal(uhr.ms(), 3500);
});

test("die Sicht-Uhr beginnt bei null, wenn die Seite verdeckt geladen wird (Tab im Hintergrund)", () => {
  let zeit = 500;
  let verdeckt = true;
  const uhr = erzeugeSichtUhr(() => zeit, () => verdeckt);
  zeit = 60500;
  assert.equal(uhr.ms(), 0, "eine Minute im Hintergrund zählt nicht");
  verdeckt = false;
  uhr.wechsel();
  zeit = 61700;
  assert.equal(uhr.ms(), 1200);
});

// ── Womit die Abfolge läuft, wenn das Licht angeht.
import { lichtQuelle } from "../components/neu/kopf/startlogik.ts";

test("das Licht geht mit der Szene an, ohne sie mit dem ruhigen Bild; fehlt beides, mit dem Not-Licht", () => {
  assert.equal(lichtQuelle(true, false), "szene");
  assert.equal(lichtQuelle(true, true), "szene", "die Szene geht vor");
  assert.equal(lichtQuelle(false, true), "bild", "kein WebGL: dieselbe Abfolge mit dem ruhigen Bild");
  // Weder Szene noch das große Bild sind geladen (Sicherheitsgrenze bei sehr langsamer Leitung):
  // Es gibt trotzdem ein Licht für den Stufenaufbau. Die Abfolge läuft nie ohne Licht los.
  assert.equal(lichtQuelle(false, false), "notlicht");
});

test("mit der Freigabe steht die Seite sicher oben, erst dann geht es weich zum gemerkten Ziel", () => {
  // Solange die Seite noch lädt, stellt der Browser sie beim Entsperren selbst zum Ziel in der
  // Adresse. Ein eigener kleiner Schritt (1 px und zurück) beendet das, bevor das weiche Scrollen beginnt.
  const schritte: string[] = [];
  const welt = globalThis as unknown as { window?: unknown };
  const vorher = welt.window;
  welt.window = { scrollTo: (wie: { top: number }) => schritte.push(`seite ${wie.top}`) };
  scrollZiel.melde(() => schritte.push("weich zum Ziel"));
  try {
    scrollSperre.setze(true, true);
    scrollZiel.zu({ isConnected: true } as HTMLElement);
    assert.deepEqual(schritte, [], "während der Sperre bewegt sich nichts");
    scrollSperre.setze(false);
    assert.deepEqual(schritte, ["seite 1", "seite 0", "weich zum Ziel"]);
    // Ohne vorherige Sperre (etwa bei „weniger Bewegung“) fasst die Freigabe die Seite nicht an.
    schritte.length = 0;
    scrollSperre.setze(false);
    assert.deepEqual(schritte, []);
  } finally {
    scrollSperre.setze(false);
    scrollZiel.melde(undefined);
    welt.window = vorher;
  }
});

// ── Ein Licht kommt, während der Start schon läuft (späte Szene, Grafik ausgefallen und neu aufgebaut).
import { wennBildKommt, wennSzeneKommt } from "../components/neu/kopf/startlogik.ts";

test("fällt die Grafik mitten im Lichtaufbau aus, beginnt der Aufbau neu: Die Zeichen fliegen trotzdem los", () => {
  // Vor der 60-%-Schwelle unterbrochen: Lebendes Licht war zu sehen, die Zeichen sind noch nicht geflogen.
  const unterbrochen = { fertig: false, fliegt: false, zeigt: "live" } as const;
  assert.equal(wennSzeneKommt(unterbrochen), "aufbauen", "die neu aufgebaute Szene baut sich in Stufen auf (mit dem Auslöser für den Flug)");
  assert.equal(wennBildKommt(unterbrochen), "aufbauen", "gelingt der Neuaufbau nicht, baut sich das ruhige Bild in Stufen auf");
  // War noch gar kein Licht zu sehen, gilt dasselbe.
  assert.equal(wennSzeneKommt({ fertig: false, fliegt: false, zeigt: "nichts" }), "aufbauen");
  assert.equal(wennBildKommt({ fertig: false, fliegt: false, zeigt: "nichts" }), "aufbauen");
});

test("fliegen oder stehen die Zeichen schon, kommt das Licht weich oder sofort zurück", () => {
  // Alles stand mit lebendem Licht: sofort wieder da.
  assert.equal(wennSzeneKommt({ fertig: true, fliegt: true, zeigt: "live" }), "sofort");
  // Die Zeichen fliegen schon: weich einblenden, kein zweiter Stufenaufbau.
  assert.equal(wennSzeneKommt({ fertig: false, fliegt: true, zeigt: "live" }), "ueberblenden");
  assert.equal(wennBildKommt({ fertig: false, fliegt: true, zeigt: "live" }), "einblenden");
  assert.equal(wennBildKommt({ fertig: true, fliegt: true, zeigt: "live" }), "einblenden");
  // Das ruhige Bild steht oder baut sich gerade auf (die Szene kam nach der Sicherheitsgrenze): überblenden.
  assert.equal(wennSzeneKommt({ fertig: false, fliegt: false, zeigt: "bild" }), "ueberblenden");
  assert.equal(wennSzeneKommt({ fertig: true, fliegt: true, zeigt: "bild" }), "ueberblenden");
});

// ── Wie lange der Stern schon zu sehen war, bevor das Skript eingerichtet wurde.
import { sichtbarZwischen } from "../components/neu/kopf/startlogik.ts";

test("vor dem Einrichten zählt nur nachweislich sichtbare Zeit", () => {
  // Erstes Bild bei 150 ms, Skript bei 600 ms, die ganze Zeit zu sehen.
  assert.equal(sichtbarZwischen(150, 600, [{ name: "visible", startTime: 0 }]), 450);
  // Erstes Bild, nach 0,2 s Tab verdeckt, nach 5 s zurück, dann erst das Skript: nur 0,2 s + 0,3 s.
  const hinUndHer = [
    { name: "visible", startTime: 0 },
    { name: "hidden", startTime: 350 },
    { name: "visible", startTime: 5350 },
  ];
  assert.equal(sichtbarZwischen(150, 5650, hinUndHer), 200 + 300);
  // Im Hintergrund geladen und beim Einrichten noch verdeckt: nichts gesehen.
  assert.equal(sichtbarZwischen(150, 900, [{ name: "hidden", startTime: 0 }]), 0);
  // Im Hintergrund geladen, kurz vor dem Einrichten hingesehen.
  assert.equal(sichtbarZwischen(150, 9400, [{ name: "hidden", startTime: 0 }, { name: "visible", startTime: 9000 }]), 400);
  // Die Reihenfolge der Einträge spielt keine Rolle.
  assert.equal(sichtbarZwischen(150, 5650, [...hinUndHer].reverse()), 500);
});

test("kennt der Browser kein Sichtbarkeits-Protokoll, zählt die Zeit vor dem Einrichten nicht (lieber etwas länger warten)", () => {
  assert.equal(sichtbarZwischen(150, 600, null), 0);
  assert.equal(sichtbarZwischen(150, 600, []), 0);
  assert.equal(sichtbarZwischen(600, 150, [{ name: "visible", startTime: 0 }]), 0, "verkehrte Zeiten ergeben nichts");
});
