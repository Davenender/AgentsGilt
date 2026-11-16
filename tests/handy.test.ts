// Am Handy (ohne Maus) gibt es nichts, was für die Maus gedacht ist (Prompt 12, 15.11.2026).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { HANDY } from "../components/neu/umgebung.ts";

const lies = (pfad: string) => readFileSync(new URL(`../${pfad}`, import.meta.url), "utf8");
const ohneKommentare = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("„Handy“ wird am Gerät entschieden (Touch ohne Maus), nicht an der Breite", () => {
  assert.equal(HANDY, "(hover: none), (pointer: coarse)");
  assert.ok(!/width/.test(HANDY));
});

test("Hover-Stile der neuen Seite gelten nur bei echter Maus (am Handy bleibt nichts „hängen“)", () => {
  const dateien = ["components/neu/welt.css", "components/neu/seite/seite.css", "components/neu/chat/chat.css", "components/neu/recht/recht.css", "components/neu/kopf/kopf.css", "components/neu/seite/leuchtstern.css"];
  for (const datei of dateien) {
    const text = ohneKommentare(lies(datei));
    const stapel: string[] = [];
    let puffer = "";
    for (const zeichen of text) {
      if (zeichen === "{") {
        const kopf = puffer.split("}").pop()!.trim();
        // Erlaubt: in einem Block für echte Maus, oder nur als Ausnahme (:not(:hover)).
        const nurAusnahme = !kopf.replace(/:not\(:hover\)/g, "").includes(":hover");
        if (kopf.includes(":hover") && !nurAusnahme) {
          const imMausBlock = stapel.some((k) => k.includes("hover: hover"));
          assert.ok(imMausBlock, `${datei}: ${kopf}`);
        }
        stapel.push(kopf);
        puffer = "";
      } else if (zeichen === "}") {
        stapel.pop();
        puffer = "";
      } else puffer += zeichen;
    }
  }
});

test("den Anrufen-Knopf am unteren Rand (Daumen-Knopf) gibt es nicht mehr", () => {
  for (const datei of ["components/neu/Rahmen.tsx", "components/neu/welt.css", "components/neu/kopf/kopf.css", "components/neu/recht/RechtBlatt.tsx", "components/neu/recht/RechtSeite.tsx"]) {
    assert.ok(!ohneKommentare(lies(datei)).includes("ag-daumen"), datei);
  }
  assert.ok(!lies("components/neu/Rahmen.tsx").includes("DaumenLeiste"));
});

test("sehr schmale Handys: Die Kopfleiste passt (unter 375 px etwas kleiner gezeichnet, ab 375 px unverändert)", () => {
  // Name, „Anrufen“ und Menü-Knopf brauchen in der Kachel rund 376 px. Jede Stufe darf höchstens
  // so stark verkleinern, dass es bis zur nächst kleineren Stufe passt (Verkleinerung × 376 ≤ Breite).
  const stil = ohneKommentare(lies("components/neu/welt.css"));
  const stufen = [...stil.matchAll(/@media \(max-width: (\d+)px\) \{\s*\.ag-kopf,\s*\.ag-menue__kopf \{\s*zoom: ([\d.]+);/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.ok(stufen.length >= 3, "es gibt die Stufen");
  assert.equal(stufen[0][0], 374, "erst unter 375 px");
  for (let i = 0; i < stufen.length; i++) {
    const [breite, faktor] = stufen[i];
    // Die letzte Stufe reicht bis 280 px (äußeres Display gefalteter Handys).
    const kleinste = i + 1 < stufen.length ? stufen[i + 1][0] + 1 : 280;
    assert.ok(faktor < 1 && faktor * 376 <= kleinste + 0.5, `Stufe bis ${breite} px: ${faktor} passt ab ${kleinste} px`);
    if (i > 0) assert.ok(breite < stufen[i - 1][0] && faktor < stufen[i - 1][1]);
  }
});

test("„In drei Schritten“: Die nicht aktiven Schritte sind gedimmt, aber mit genug Kontrast (WCAG AA)", () => {
  const stil = ohneKommentare(lies("components/neu/seite/seite.css"));
  const m = stil.match(/\.ag-abn__liste li\[data-gewaehlt="false"\] \{\s*opacity: ([\d.]+);/);
  assert.ok(m, "Regel gefunden");
  const deck = Number(m[1]);
  // Nummer #9aa0b5 und Text #a9adbd auf dem Grund #070b16, mit der Deckkraft gemischt.
  const lum = (c: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const grund = [7, 11, 22];
  for (const farbe of [[154, 160, 181], [169, 173, 189]]) {
    const gemischt = farbe.map((v, i) => v * deck + grund[i] * (1 - deck));
    const kontrast = (lum(gemischt) + 0.05) / (lum(grund) + 0.05);
    assert.ok(kontrast >= 4.5, `Kontrast ${kontrast.toFixed(2)}`);
  }
});

test("das große Logo am Anfang: wackelt am Handy nicht und reagiert nicht auf Antippen", () => {
  const szene = ohneKommentare(lies("components/neu/kopf/lichtszene.ts"));
  // Die Wand wiegt sich nur mit Maus; ohne Maus steht sie still.
  assert.match(szene, /const kx = wahl\.aufnahme \|\| !wahl\.maus \? 0 :/);
  assert.match(szene, /const ky = wahl\.aufnahme \|\| !wahl\.maus \? 0 :/);
  const name = ohneKommentare(lies("components/neu/kopf/LichtName.tsx"));
  // Die Welle beim Klick gibt es nur mit Maus, die Vibration gar nicht mehr.
  assert.match(name, /if \(maus\) \{\s*held\.addEventListener\("click", klick\);/);
  assert.ok(!name.includes("vibrate"));
  // Auch der Name im Fuß reagiert nur mit Maus.
  assert.match(ohneKommentare(lies("components/neu/seite/FussSchluss.tsx")), /if \(!maus\.matches \|\|/);
});

test("am Handy ist alles animiert wie am Computer; weg bleibt nur, was Maus oder Finger braucht", () => {
  // Wörter-Feld: Die Wörter schweben von selbst (Stylesheet), reagieren aber nicht auf den Finger.
  const feld = ohneKommentare(lies("components/neu/seite/Uebergang.tsx"));
  assert.ok(!feld.includes("pointerdown"));
  assert.match(feld, /el\.dataset\.treibt = "1"/);
  const stil = lies("components/neu/seite/seite.css");
  assert.match(stil, /\.ag-ueber\[data-da\]\[data-treibt\] \.ag-wf__wort \{\s*animation: ag-wf-treiben/);
  // Ablauf: Lauf und Hervorhebung wie am Computer, nur ohne die große Zahl.
  const ablauf = lies("components/neu/seite/AblaufNummern.tsx");
  assert.match(ablauf, /\{!handy && \(\s*<div className="ag-abn__bild"/);
  assert.match(ablauf, /if \(still \|\| !imBild\) return;/);
  assert.ok(!ablauf.includes("data-handy"));
  assert.match(stil, /@media \(hover: none\), \(pointer: coarse\) \{\s*\.ag-abn__bild \{\s*display: none;/);
  // Überschriften: kein Sonderweg mehr am Handy (sie entschlüsseln und tippen sich wie am Computer).
  // Einziger Unterschied ist die Sparstufe: neue Zeichen höchstens alle 50 ms, sonst derselbe Ablauf.
  assert.ok(!lies("components/neu/seite/Aussage.tsx").includes("HANDY"));
  const spielCode = ohneKommentare(lies("components/neu/seite/Entschluesselt.tsx"));
  assert.match(spielCode, /export const SPAR_TAKT_MS = 50;/);
  assert.match(spielCode, /const takt = window\.matchMedia\(HANDY\)\.matches \? SPAR_TAKT_MS : 0;/);
  assert.equal(spielCode.match(/HANDY/g)?.length, 2, "HANDY nur im Import und für den Takt");
  assert.match(spielCode, /if \(takt && zuletzt && jetzt - zuletzt < takt - 4\) \{\s*rahmen = requestAnimationFrame\(bild\);\s*return;/);
  assert.ok(!stil.includes("data-ruhig"));
  // Das Verbuggen unter der Maus bleibt nur mit Maus.
  assert.match(ohneKommentare(lies("components/neu/seite/Entschluesselt.tsx")), /ev\.pointerType === "mouse"\) spiel\.stoeren/);
  // Der Name oben bildet sich am Handy ohne den kleinen Sprung danach (die Welle gibt es nur mit
  // Maus: startlogik.ts nachLandung, seit der Startanimation-Runde 2).
  assert.match(ohneKommentare(lies("components/neu/kopf/LichtName.tsx")), /const plan = nachLandung\(maus\);\s*if \(plan\.welle !== null\) spaeter\.push\(gsap\.delayedCall\(plan\.welle, feld\.welleMitte\)\);/);
  assert.match(lies("components/neu/kopf/startlogik.ts"), /welle: maus \? WELLE_PAUSE : null/);
  // Leistungen: Am Handy spielt die Karte in der Mitte, immer höchstens eine, mit Zurücksetzen.
  const leistungen = lies("components/neu/seite/Leistungen.tsx");
  assert.match(leistungen, /meldeMitte\(/);
  assert.ok(!leistungen.includes("waechter.disconnect();\n        schalte(true)"));
});

test("Überschriften: Das Zwischenwort steht im Platz des echten Wortes, nichts rückt oder gleitet", () => {
  const spiel = ohneKommentare(lies("components/neu/seite/Entschluesselt.tsx"));
  assert.ok(!spiel.includes("danach"), "der Rest der Zeile rückt nicht mehr");
  assert.ok(!/f\.erstOrt = \{ \.\.\.f\.ort/.test(spiel));
  const stil = lies("components/neu/seite/seite.css");
  assert.ok(!/\.ag-wuerfel--satz \.ag-wuerfel__spiel span \{\s*transition:/.test(stil), "die Zeichen gleiten nicht");
});
