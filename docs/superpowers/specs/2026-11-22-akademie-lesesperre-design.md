# Akademie: Lesesperre für „Weiter ▶“ und „✅ Gelesen“ (kurzes Design)

Stand 22.11.2026, von David freigegeben („je nach Textlänge … möglichst kurz, aber nicht skippbar; auch für mich“).

## Warum
Im Lernpfad kann man heute jede Lektion in Sekunden durchklicken. Man soll die Einheiten nicht einfach
überspringen können. Wer normal oder sogar sehr schnell liest, soll davon nichts merken.

## Ziele / Nicht-Ziele
- Ziel: „Weiter ▶“ und „✅ Gelesen“ im Lernpfad gehen erst nach einer kurzen Lesezeit je Seite.
- Ziel: Kein Fortschritt geht verloren, niemand wird plötzlich gesperrt.
- Nicht: Bibliothek, Wiederholen, Nachlesen nach dem Test, Tests, Übungen (alles ohne Sperre).
- Anti-Ziel: lange Wartezeiten (z. B. die „etwa 6 Min.“ aus Notion als Sperre).

## Ansätze
1. **Startzeit im Knopf (gewählt):** Der Knopf trägt Seite und Zeitpunkt in seiner `custom_id`. Nichts wird gespeichert,
   der Merkzettel (#akademie-speicher) bleibt unverändert.
2. Startzeit im Merkzettel speichern: eine Zeile je geöffneter Seite, bläht den Merkzettel auf (er wird bis 3000
   Nachrichten gelesen). Verworfen.
3. Knopf grau machen und der Bot gibt ihn nach der Zeit frei: braucht einen im Hintergrund wartenden Aufruf
   (wackelig, kostet Laufzeit). Verworfen; der Knopf bleibt drückbar und sagt, wie lange noch.

## Dauer (Davids Vorgabe, Rechnung meine Wahl)
- Grundzeit = Wörter der Seite bei 300 Wörtern pro Minute.
- Davon ab: 40 %, mindestens aber 20 Sekunden (`min(grund − 20, grund × 0,6)`).
- Nie unter 5 Sekunden, nie über 3 Minuten.
- Beispiele: volle Seite (500 Wörter) 60 s statt 100 s; 200 Wörter 20 s; kurze Seite 5 s.
- Gilt für alle, auch für David.

## Verhalten
- Jede Lernen-Ansicht kennt die weiteste erreichte Seite `f` und wann sie zuerst gezeigt wurde `t` (Unix-Sekunden).
- „Weiter ▶“ auf eine neue Seite: erst ab `t + sperre(seite f)`. Zu früh → gleiche Seite, Hinweis mit Countdown.
- Zurückblättern und schon gesehene Seiten: ohne Warten.
- „✅ Gelesen“: erst ab `t + sperre(letzte Seite)`, sonst Hinweis.
- Über der Seite steht live „⏳ Weiter frei in … Sekunden“ (Discord-Zeitstempel `<t:…:R>`).
- Alte Knöpfe ohne Zeit (Lektionen, die gerade offen sind) laufen ohne Sperre weiter.
- „📖 Weiterlernen“ öffnet wie bisher Seite 1, die Zeit beginnt dann neu.

## Fortschritt
Unverändert. Es kommt keine neue Merkzettel-Zeile dazu, es wird nichts gelöscht oder umgeschrieben.

## Dem Bauenden überlassen
Genauer Wortlaut der Hinweise (kurz, ein Satz), Aufteilung in reine Logik (`lib/akademie.ts`, getestet) und Handler.
