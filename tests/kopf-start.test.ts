// Tests für die Rechenregeln der Startanimation im Kopfbereich: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  drehAnteil,
  LICHT_VOLL,
  lichtStaerke,
  lichtVoll,
  MAUS_DREHEN,
  nachLandung,
  OBEN_PX,
  probeFrist,
  rollStand,
  schonfristVorbei,
  softwareGrafik,
  stufenWerte,
  wachFensterVoll,
  zielAnsteuern,
} from "../components/neu/kopf/startlogik.ts";

test("Oben ist oben: Bis 24 px unter dem Seitenanfang tritt das Licht nicht zurück", () => {
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

test("Software-Grafik wird am Namen des Treibers erkannt, echte Grafikkarten nicht", () => {
  // So meldet Chrome die Grafik, wenn es ohne Grafikkarte rechnet (gemessen am 14.11.2026).
  assert.ok(softwareGrafik("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)"));
  assert.ok(softwareGrafik("Google SwiftShader"));
  assert.ok(softwareGrafik("llvmpipe (LLVM 15.0.7, 256 bits)"));
  assert.ok(softwareGrafik("ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0)"));
  assert.ok(softwareGrafik("Apple Software Renderer"));
  // Echte Grafikkarten.
  assert.ok(!softwareGrafik("ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)"));
  assert.ok(!softwareGrafik("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)"));
  assert.ok(!softwareGrafik("ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)"));
  assert.ok(!softwareGrafik("Mali-G78"));
  assert.ok(!softwareGrafik(""), "ohne Auskunft bleibt es bei der Wache");
});

test("die Wache schließt ein Messfenster nach 60 Messungen oder spätestens nach 2 s", () => {
  // Schnelles Gerät: 60 Messungen sind nach rund einer Sekunde da.
  assert.equal(wachFensterVoll(59, 980), false);
  assert.equal(wachFensterVoll(60, 1000), true);
  // Langsames Gerät (4 Bilder je Sekunde): Nach 2 s sind 8 Messungen da, das Fenster schließt.
  assert.equal(wachFensterVoll(7, 1750), false);
  assert.equal(wachFensterVoll(8, 2000), true);
  // Sehr langsam (unter 4 Bildern je Sekunde): Es wartet, bis 8 Messungen da sind, nicht länger.
  assert.equal(wachFensterVoll(5, 2600), false);
  assert.equal(wachFensterVoll(8, 4200), true);
  // Zwei Sekunden allein genügen nicht: Ein einzelner Ausreißer stellt keine Sparstufe ein.
  assert.equal(wachFensterVoll(1, 9000), false);
});

test("nach einem Stufenwechsel zählen 30 Messungen nicht, höchstens aber 1,2 s", () => {
  assert.equal(schonfristVorbei(29, 480), false);
  assert.equal(schonfristVorbei(30, 500), true);
  // Langsames Gerät: Nach 1,2 s geht es weiter, auch wenn erst drei Messungen kamen.
  assert.equal(schonfristVorbei(3, 1100), false);
  assert.equal(schonfristVorbei(3, 1200), true);
});

// ── Ruhe: Ein Blatt liegt über der Seite (Impressum, Datenschutz).
import { scrollRuhe } from "../components/neu/umgebung.ts";

test("liegt ein Blatt über der Seite, ruht das weiche Scrollen, und ein Sprungziel schließt erst das Blatt", () => {
  const stand: boolean[] = [];
  const gescrollt: unknown[] = [];
  const anDasBlatt: unknown[] = [];
  scrollRuhe.melde((an) => stand.push(an));
  scrollZiel.melde((ziel) => gescrollt.push(ziel));
  const kontakt = { isConnected: true, id: "kontakt" } as HTMLElement;
  try {
    scrollRuhe.setze(true);
    scrollRuhe.setze(true);
    assert.deepEqual(stand, [true], "einmal angehalten, nicht doppelt");
    // Ohne Blatt, das sich darum kümmert, scrollt die Seite wie gewohnt.
    scrollZiel.zu(kontakt);
    assert.deepEqual(gescrollt, [kontakt]);
    // Das Blatt meldet sich an: Jetzt geht das Ziel an das Blatt (es schließt sich und scrollt danach).
    scrollRuhe.beiZiel((ziel) => anDasBlatt.push(ziel));
    scrollZiel.zu(kontakt);
    assert.deepEqual(anDasBlatt, [kontakt]);
    assert.equal(gescrollt.length, 1, "die Seite darunter bewegt sich nicht");
    scrollRuhe.setze(false);
    assert.deepEqual(stand, [true, false]);
    // Nach der Ruhe scrollt die Seite wieder selbst.
    scrollZiel.zu(kontakt);
    assert.equal(gescrollt.length, 2);
    assert.equal(anDasBlatt.length, 1);
  } finally {
    scrollRuhe.setze(false);
    scrollRuhe.beiZiel(undefined);
    scrollRuhe.melde(undefined);
    scrollZiel.melde(undefined);
  }
});

test("wer sich während der Ruhe anmeldet, erfährt sofort davon", () => {
  const stand: boolean[] = [];
  try {
    scrollRuhe.setze(true);
    scrollRuhe.melde((an) => stand.push(an));
    assert.deepEqual(stand, [true]);
  } finally {
    scrollRuhe.setze(false);
    scrollRuhe.melde(undefined);
  }
});

// ───────────── Startanimation-Runde 2 (16.11.2026) ─────────────
const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");

test("Scrollen ist frei, sobald der Name gelandet ist; die Welle läuft weiter, „Start vorbei“ kommt wie bisher nach der Welle", () => {
  const mitMaus = nachLandung(true);
  assert.equal(mitMaus.frei, 0, "frei genau bei der Landung");
  assert.equal(mitMaus.welle, 0.25, "Welle 0,25 s nach der Landung (nur mit Maus)");
  assert.equal(mitMaus.vorbei, 0.25 + 1.3, "vorbei, wenn die Welle durch ist (wie früher die Freigabe)");
  const handy = nachLandung(false);
  assert.equal(handy.frei, 0);
  assert.equal(handy.welle, null, "am Handy keine Welle");
  assert.equal(handy.vorbei, 0.25 + 1.3, "derselbe Zeitpunkt für den Scroll-Hinweis");
  // So setzt es der Kopfbereich um: Freigabe direkt im Moment der Landung, nicht über einen Zeitgeber.
  const code = lies("components/neu/kopf/LichtName.tsx");
  const landung = code.slice(code.indexOf("feld.starten(() => {"), code.indexOf("// Während die Zeichen landen, erscheinen Kopfleiste"));
  assert.match(landung, /stehen\(\);\s*\/\/[^\n]*\n[^\n]*\n\s*freigeben\(false\);/);
  assert.match(landung, /gsap\.delayedCall\(plan\.vorbei, startVorbei\)/);
  assert.ok(!/delayedCall\([^)]*freigeben/.test(code), "die Freigabe wartet auf keine Uhr mehr");
  // Der Scroll-Hinweis richtet sich nach „Start vorbei“, nicht nach der Freigabe: Er kommt so spät wie bisher.
  const hinweis = lies("components/neu/seite/ScrollHinweis.tsx");
  assert.match(hinweis, /window\.addEventListener\(START_VORBEI, planen\);/);
  assert.ok(!hinweis.includes("START_FREI"));
  assert.match(lies("components/neu/kopf/kopf.css"), /html:not\(\.ag-start-vorbei\) \.ag-hinweis \{/);
});

test("Das Licht folgt der Maus ab voller Helligkeit, mit einer weichen Drehung von 0,8 s", () => {
  assert.equal(lichtVoll(0.5), false);
  assert.equal(lichtVoll(0.998), false);
  assert.equal(lichtVoll(LICHT_VOLL), true);
  assert.equal(lichtVoll(1), true);
  assert.equal(MAUS_DREHEN, 0.8);
  const code = lies("components/neu/kopf/LichtName.tsx");
  // Im Moment der vollen Helligkeit: erst die Maus, dann (0,7 s später) der Flug.
  assert.match(code, /if \(!lichtVoll\(pegel\)\) return;[\s\S]{0,260}mausAb\(\);\s*lichtIstAn\(\);/);
  assert.match(code, /szene\.mausFolgen\(true, MAUS_DREHEN\);/);
  assert.ok(!/MAUS_NACH|WELLE_ENDE/.test(code), "keine Wartezeit nach der Welle mehr");
});

test("Die Drehung zur Maus: weich anfahren, weich ankommen, kein Sprung", () => {
  assert.equal(drehAnteil(0, 0.8), 0);
  assert.equal(drehAnteil(0.8, 0.8), 1);
  assert.equal(drehAnteil(5, 0.8), 1);
  assert.equal(drehAnteil(-1, 0.8), 0);
  assert.equal(drehAnteil(0.3, 0), 1, "ohne Dauer sofort");
  let vorher = 0;
  for (let t = 0; t <= 0.8; t += 0.01) {
    const a = drehAnteil(t, 0.8);
    assert.ok(a >= vorher - 1e-12 && a <= 1, `stetig steigend bei ${t.toFixed(2)}`);
    vorher = a;
  }
  // Anfang und Ende flach (weich anfahren, weich ankommen), auch in der Beschleunigung.
  assert.ok(drehAnteil(0.008, 0.8) < 0.0001);
  assert.ok(1 - drehAnteil(0.792, 0.8) < 0.0001);
  assert.ok(Math.abs(drehAnteil(0.4, 0.8) - 0.5) < 1e-12, "in der Mitte genau halb");
});

test("Bewegt sich die Maus während der Drehung, folgt das Licht ohne Ruck (nachgerechnet wie in lichtszene.ts)", () => {
  // Die Bildschleife der Szene: Ein Folger läuft der Maus nach (Folgetempo 3,2 je Sekunde), das Licht
  // geht mit drehAnteil vom Start auf den Folger über; danach gewöhnliches Folgen.
  const szene = lies("components/neu/kopf/lichtszene.ts");
  assert.match(szene, /const FOLGE_TEMPO = 3\.2;/);
  assert.match(szene, /ist\.x = dreh\.vonX \+ \(dreh\.folgX - dreh\.vonX\) \* a;/);
  const tempo = 3.2;
  const dt = 1 / 60;
  const ende = Math.round(MAUS_DREHEN / dt);
  // Die Maus zieht zügig hin und her, während das Licht sich zu ihr dreht.
  const maus = (bild: number) => Math.sin(bild * dt * 2.4) * 0.8;
  /** Weg des Lichts je Bild; `neu`: die Drehung mit Folger (jetzt), sonst die alte (direkt zur Maus, dann umschalten). */
  const lauf = (neu: boolean) => {
    let ist = 0;
    let folg = 0;
    let zeit = 0;
    let dreht = true;
    const wege: number[] = [];
    for (let bild = 0; bild < 150; bild++) {
      const m = maus(bild);
      const zug = 1 - Math.exp(-dt * tempo);
      const vorher = ist;
      if (dreht) {
        zeit += dt;
        const a = drehAnteil(zeit, MAUS_DREHEN);
        if (neu) {
          folg += (m - folg) * zug;
          ist = folg * a;
        } else ist = m * a;
        if (a >= 1) dreht = false;
      } else ist += (m - ist) * zug;
      wege.push(ist - vorher);
    }
    // Beschleunigung je Bild (Änderung des Wegs von Bild zu Bild).
    return wege.slice(1).map((w, i) => Math.abs(w - wege[i]));
  };
  const jetzt = lauf(true);
  const alt = lauf(false);
  // Maßstab: das gewöhnliche Folgen danach, bei derselben Maus.
  const gewoehnlich = Math.max(...jetzt.slice(ende + 5));
  const drehung = Math.max(...jetzt.slice(0, ende + 5));
  assert.ok(drehung <= 2 * gewoehnlich, `Drehung ${drehung.toFixed(5)} gegen gewöhnliches Folgen ${gewoehnlich.toFixed(5)}`);
  // Am Übergang ins gewöhnliche Folgen: kein Knick. Die alte Drehung lief zuletzt 1:1 mit der Maus und
  // bremste beim Umschalten schlagartig ab.
  const uebergang = (werte: number[]) => Math.max(...werte.slice(ende - 2, ende + 2));
  assert.ok(uebergang(jetzt) <= 1.5 * gewoehnlich, `Übergang jetzt ${uebergang(jetzt).toFixed(5)}`);
  assert.ok(uebergang(alt) > 5 * uebergang(jetzt), `alt ${uebergang(alt).toFixed(5)} gegen jetzt ${uebergang(jetzt).toFixed(5)}`);
});

test("Am Computer fliegt der Name beim Scrollen nicht mehr auseinander, er wandert mit der Seite", () => {
  const code = lies("components/neu/kopf/LichtName.tsx");
  assert.match(code, /if \(gebaut\) feld\.rollen\(0, Math\.max\(0, y - obenImDokument\), hoch\);/);
  assert.ok(!/feld\.rollen\(maus \? s/.test(code));
  // Die Zeichenfläche reicht nicht mehr unter den Kopfbereich (dort flogen die Zeichen hin).
  assert.ok(!/ueberhang:/.test(code));
  // Licht tritt beim Scrollen weiter zurück und leuchtet oben wieder auf; Ausweichen und Klick-Welle bleiben.
  assert.match(code, /held\.style\.setProperty\("--licht-deck"/);
  assert.match(code, /szene\?\.aufleuchten\(\);/);
  assert.match(code, /feld\.zeiger\(ev\.clientX - e\.left, y, y > -80 && y < e\.height \+ 80\);/);
  assert.match(code, /feld\.welle\(ev\.clientX - e\.left, ev\.clientY - e\.top\);/);
});

test("Neu laden landet oben: Ein Abschnitt in der Adresse wird nur bei einem neuen Aufruf angesteuert", () => {
  // Neuer Aufruf (Link von außen, Mail, SMS): erst der Start, dann dorthin.
  assert.equal(zielAnsteuern("navigate", false), true);
  assert.equal(zielAnsteuern("prerender", false), true);
  assert.equal(zielAnsteuern(undefined, false), true, "ohne Angabe des Browsers wie bisher");
  // Neu geladen, Zurück/Vor, Rückkehr aus dem Zwischenspeicher: immer oben.
  assert.equal(zielAnsteuern("reload", false), false);
  assert.equal(zielAnsteuern("back_forward", false), false);
  assert.equal(zielAnsteuern("navigate", true), false, "aus dem Zwischenspeicher des Browsers");
  const code = lies("components/neu/kopf/LichtName.tsx");
  // Die Navigationsart zählt nur beim ersten Start nach dem Laden (Wechsel innerhalb der Website sind neue Aufrufe).
  assert.match(code, /const navigationsArt = ersterStart \? \(performance\.getEntriesByType\("navigation"\)\[0\] as PerformanceNavigationTiming \| undefined\)\?\.type : "navigate";/);
  assert.match(code, /const vonAussen = zielAnsteuern\(navigationsArt, rueckkehr > 0\);/);
  // Der Abschnitt kommt aus der Adresse, ohne neuen Verlaufseintrag; angesteuert wird nur bei neuem Aufruf.
  assert.match(code, /if \(!vonAussen && window\.location\.hash\) \{\s*try \{\s*window\.history\.replaceState\(window\.history\.state, "", window\.location\.pathname \+ window\.location\.search\);/);
  assert.match(code, /const sprungziel = vonAussen \? zielVon\(window\.location\.hash\) : null;/);
  assert.ok(!/history\.pushState/.test(code), "kein neuer Verlaufseintrag");
  // Der Browser stellt keine frühere Lage wieder her, die Seite geht nach oben.
  assert.match(code, /window\.history\.scrollRestoration = "manual";/);
  assert.match(code, /if \(window\.scrollY > 0\) window\.scrollTo\(\{ top: 0, behavior: "instant" \}\);/);
});

