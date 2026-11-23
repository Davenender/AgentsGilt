// Der Chat-Verlauf steht immer ganz unten (Feinschliff-Runde 1, Punkt 4; Prompt 18): mit einer nachgestellten
// Liste, die sich wie das Element im Browser verhält (scrollTop wird auf 0 … Höhe − sichtbare Höhe begrenzt), und
// einer nachgestellten Uhr.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SELBST_MS, erstelleEndeHalter } from "../components/neu/chat/endeHalten.ts";

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
function uhr() {
  let jetzt = 1_000_000;
  return { lies: () => jetzt, weiter: (ms: number) => (jetzt += ms) };
}
// So reagiert das Fenster (ChatFenster.tsx) auf ein Scroll-Ereignis: Es zählt nur, solange der Besucher selbst scrollt.
const scrollEreignis = (ende: ReturnType<typeof erstelleEndeHalter>) => {
  if (ende.selbst) ende.eingabe();
};

test("der nachgestellte Fehler: Ein Scroll-Ereignis ohne Eingabe hielt die Antwort mittendrin an; jetzt steht der Chat ganz unten", () => {
  // Bis Prompt 18 hieß jedes Scroll-Ereignis mehr als 48 px vom Ende „Besucher hat hochgescrollt“: Danach zog
  // nichts mehr nach (mit dem alten endeHalten.ts endete dieser Ablauf 547 px über dem Ende).
  const l = liste(1200);
  const ende = erstelleEndeHalter(uhr().lies);
  ende.neu(l, false); // die Punkte-Blase: am Ende
  // Die Blase wird beim Wechsel zur Welle kurz kleiner (der Browser begrenzt die Lage), ein Trackpad scrollt nach:
  l.scrollHeight -= 80;
  l.scrollTop = l.scrollTop - 60;
  scrollEreignis(ende); // kein Besucher am Werk: zählt nicht
  // Die Antwort wächst in Schritten, der Text baut sich auf, zuletzt kommt die Anruf-Karte (nach dem letzten Wachsen der Blase).
  for (const schritt of [40, 90, 120, 60, 177]) {
    l.scrollHeight += schritt;
    ende.groesse(l);
  }
  assert.equal(l.abstand(), 0, "ganz unten, die Karte ist ganz zu sehen");
});

test("die Blase wächst in großen Schritten: Der Chat bleibt in jedem Schritt ganz unten", () => {
  const l = liste(600);
  const ende = erstelleEndeHalter(uhr().lies);
  ende.neu(l, false);
  for (const schritt of [90, 70, 50, 30, 15, 5, 177]) {
    l.scrollHeight += schritt;
    scrollEreignis(ende);
    ende.groesse(l);
    assert.equal(l.abstand(), 0, `nach ${schritt} px`);
  }
});

test("die Liste wird kleiner (Eingabefeld wächst, Tastatur am Handy): Sie rückt nach", () => {
  const l = liste(1200, 600);
  const ende = erstelleEndeHalter(uhr().lies);
  ende.neu(l, false);
  (l as { clientHeight: number }).clientHeight = 420;
  ende.groesse(l);
  assert.equal(l.abstand(), 0);
});

test("scrollt der Besucher gerade selbst nach oben, zieht der Chat 2 s nicht dagegen; danach geht das Neue ans Ende", () => {
  const l = liste(1500);
  const u = uhr();
  const ende = erstelleEndeHalter(u.lies);
  ende.neu(l, false);
  // Mausrad nach oben: Eingabe, dann scrollt die Liste (Nachlauf zählt mit).
  ende.eingabe();
  l.scrollTop = 200;
  scrollEreignis(ende);
  // Eine Antwort des Teams kommt und wächst: Die Liste bleibt, wo er sie hingestellt hat.
  l.scrollHeight += 300;
  ende.neu(l, false);
  ende.groesse(l);
  assert.equal(l.scrollTop, 200);
  // 1 s später noch nicht …
  u.weiter(1000);
  ende.pruefe(l);
  assert.equal(l.scrollTop, 200);
  // … nach 2 s geht es mit dem Neuen wieder ganz nach unten.
  u.weiter(SELBST_MS);
  ende.pruefe(l);
  assert.equal(l.abstand(), 0);
});

test("hat er nur gelesen und es kam nichts Neues, bleibt die Liste stehen", () => {
  const l = liste(1500);
  const u = uhr();
  const ende = erstelleEndeHalter(u.lies);
  ende.neu(l, false);
  ende.eingabe();
  l.scrollTop = 100;
  u.weiter(SELBST_MS + 100);
  ende.pruefe(l);
  assert.equal(l.scrollTop, 100);
  // Die nächste neue Nachricht holt ihn wieder ganz nach unten.
  l.scrollHeight += 120;
  ende.neu(l, false);
  assert.equal(l.abstand(), 0);
});

test("die eigene Nachricht geht sofort ans Ende, auch mitten im Scrollen", () => {
  const l = liste(1500);
  const ende = erstelleEndeHalter(uhr().lies);
  ende.eingabe();
  l.scrollTop = 100;
  l.scrollHeight += 60;
  ende.neu(l, true);
  assert.equal(l.abstand(), 0);
  assert.equal(ende.selbst, false);
});

test("das Fenster nutzt die Regel: Eingaben zählen, Scroll-Ereignisse allein nicht, Beobachter auf Inhalt und Liste", () => {
  const code = readFileSync(new URL("../components/neu/chat/ChatFenster.tsx", import.meta.url), "utf8");
  assert.match(code, /const \[ende\] = useState\(\(\) => erstelleEndeHalter\(\)\);/);
  assert.match(code, /waechter\.observe\(inhalt\);\s*waechter\.observe\(el\);/);
  for (const art of ["wheel", "touchstart", "touchmove", "keydown", "pointerdown", "scroll"]) assert.match(code, new RegExp(`el\\.addEventListener\\("${art}"`), art);
  assert.match(code, /if \(ev\.deltaY < 0\) selbst\(\);/);
  assert.match(code, /const gescrollt = \(\) => \{\s*if \(ende\.selbst\) selbst\(\);/);
  assert.match(code, /const eigene = neu && chat\.messages\[chat\.messages\.length - 1\]\?\.role === "user";/);
  assert.match(code, /ende\.neu\(el, eigene \|\| formular\);/);
  // Das Bild beim Öffnen wird nicht mehr abgebrochen, wenn sich gleich danach etwas ändert.
  assert.ok(!/const bild = requestAnimationFrame\(\(\) => ende\.neu\(el, true\)\);\s*return \(\) => cancelAnimationFrame\(bild\);/.test(code));
  const regel = readFileSync(new URL("../components/neu/chat/endeHalten.ts", import.meta.url), "utf8");
  assert.ok(!/gescrollt\(/.test(regel), "kein Urteil über den Besucher aus einem Scroll-Ereignis");
});
