// Der Chat-Verlauf bleibt am Ende (Feinschliff-Runde 1, Punkt 4): mit einer nachgestellten Liste,
// die sich wie das Element im Browser verhält (scrollTop wird auf 0 … Höhe − sichtbare Höhe begrenzt).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AM_ENDE_PX, erstelleEndeHalter } from "../components/neu/chat/endeHalten.ts";

function liste(hoehe: number, sichtbar = 500) {
  let top = 0;
  const l = {
    scrollHeight: hoehe,
    clientHeight: sichtbar,
    get scrollTop() {
      return top;
    },
    set scrollTop(v: number) {
      top = Math.max(0, Math.min(v, l.scrollHeight - l.clientHeight));
    },
    abstand: () => l.scrollHeight - top - l.clientHeight,
  };
  return l;
}

test("der alte Fehler: Das Scroll-Ereignis zu unserem Nachziehen kommt erst, wenn schon eine Karte darunter steht", () => {
  const l = liste(800);
  const ende = erstelleEndeHalter();
  ende.neu(l, false); // neue Antwort: ans Ende
  assert.equal(l.abstand(), 0);
  // Bevor das Scroll-Ereignis dazu ankommt, erscheint die Anruf-Karte (177 px).
  l.scrollHeight += 177;
  ende.gescrollt(l); // das verspätete Ereignis unseres eigenen Scrollens
  assert.equal(ende.amEnde, true, "unser eigenes Scrollen heißt nicht, dass der Besucher hochgescrollt hat");
  ende.groesse(l); // der Beobachter meldet die neue Höhe
  assert.equal(l.abstand(), 0, "die Karte ist ganz zu sehen");
});

test("die Blase wächst in großen Schritten: Die Liste bleibt in jedem Schritt am Ende", () => {
  const l = liste(600);
  const ende = erstelleEndeHalter();
  ende.neu(l, false);
  for (const schritt of [90, 70, 50, 30, 15, 5, 177]) {
    l.scrollHeight += schritt;
    ende.gescrollt(l);
    ende.groesse(l);
    assert.equal(l.abstand(), 0, `nach ${schritt} px`);
  }
});

test("die Liste wird kleiner (Eingabefeld wächst, Tastatur am Handy): Sie rückt nach", () => {
  const l = liste(1200, 600);
  const ende = erstelleEndeHalter();
  ende.neu(l, false);
  (l as { clientHeight: number }).clientHeight = 420;
  ende.groesse(l);
  assert.equal(l.abstand(), 0);
});

test("hat der Besucher selbst hochgescrollt, bleibt die Liste stehen, bis er selbst schreibt", () => {
  const l = liste(1500);
  const ende = erstelleEndeHalter();
  ende.neu(l, false);
  l.scrollTop = 200; // Besucher scrollt hoch
  ende.gescrollt(l);
  assert.equal(ende.amEnde, false);
  // Team-Nachricht und Karte kommen dazu: Die Liste bleibt, wo sie ist.
  l.scrollHeight += 300;
  ende.neu(l, false);
  ende.groesse(l);
  assert.equal(l.scrollTop, 200);
  // Er schreibt selbst: wieder ans Ende.
  l.scrollHeight += 60;
  ende.neu(l, true);
  assert.equal(l.abstand(), 0);
  assert.equal(ende.amEnde, true);
});

test("scrollt der Besucher selbst wieder bis fast ans Ende, folgt die Liste wieder", () => {
  const l = liste(1500);
  const ende = erstelleEndeHalter();
  l.scrollTop = 100;
  ende.gescrollt(l);
  assert.equal(ende.amEnde, false);
  l.scrollTop = l.scrollHeight - l.clientHeight - (AM_ENDE_PX - 10);
  ende.gescrollt(l);
  assert.equal(ende.amEnde, true);
  l.scrollHeight += 200;
  ende.groesse(l);
  assert.equal(l.abstand(), 0);
});

test("das Fenster nutzt die Regel: Beobachter auf Inhalt und Liste, eigene Nachricht holt zurück", () => {
  const code = readFileSync(new URL("../components/neu/chat/ChatFenster.tsx", import.meta.url), "utf8");
  assert.match(code, /const \[ende\] = useState\(erstelleEndeHalter\);/);
  assert.match(code, /waechter\.observe\(inhalt\);\s*waechter\.observe\(el\);/);
  assert.match(code, /const eigene = neu && chat\.messages\[chat\.messages\.length - 1\]\?\.role === "user";/);
  assert.match(code, /ende\.neu\(el, eigene \|\| formular\);/);
  assert.ok(!/amEnde\.current = true;\s*\/\/ Im Klick/.test(code), "Antworten holen einen hochgescrollten Besucher nicht mehr zurück");
});
