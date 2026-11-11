---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Startseite (app/page.tsx) – Oberflächen-Auftrag

- **Umfang und Modus:** Landingpage agentsgilt.com, Modus Überzeugen. Nur Darstellung; Logik, Schnittstellen und Anker bleiben (docs/funktionen.md).
- **Besucher:** Inhaber lokaler Betriebe in Rhein-Main, wenig Zeit, eher nicht technikaffin, oft am Handy.
- **Aktion:** Anrufen +49 6108 9694027 (dort nimmt der KI-Assistent ab). Zweitens Chat unten rechts, drittens das kleine, eingeklappte Anfrage-Formular.
- **Belege:** nur echte Inhalte aus docs/texte.md; keine Kundenstimmen (auch kein Platzhalter), keine erfundenen Zahlen, keine Preise.
- **Gewählt am 11.11.2026 von David:** „Chromzeichen in der Punktwolke“ aus fünf Richtungen. Gewählte Skizze: docs/skizzen/chromzeichen-in-der-punktwolke.html (Komposition, die der Bau treffen muss).
- **Entschieden am 11.11.2026:** Betonungswörter bleiben aufrecht (nicht kursiv). Fußleiste mit stehendem Riesen-Schriftzug, kein Laufband.
- **Entschieden am 11.11.2026 (Schritt 3 → 4):** Aufbau „Riesen-Schriftzug“. Kopfbereich: ein Bild, alles mittig; das Logo als glänzendes 3D-Zeichen (three.js/WebGPU, nur am Computer), am Handy und bei „weniger Bewegung“ ein ruhiges 2D-Ersatzbild, das auf Tippen reagiert. Vier Kopfbild-Varianten unter `/varianten/kopf`; gewählt: **Kern im Schriftzug** (`/varianten/kopf/kern`).

- **Richtungswechsel am 11.11.2026 (Zwischenauftrag vor Schritt 5): Das 3D-Logo fällt weg.** Kopfbereich in zwei Ebenen, durchscheinend übereinander: hinten unser Logo aus Licht (ein einziger Shader, kein three.js), vorn der Name aus Zeichen-Teilchen (2D-Zeichenfläche). Einzelheiten in docs/gestaltung.md, Abschnitt 4c. Der Name der Richtung bleibt nur als Etikett; der Vertrag unten ist darauf umgeschrieben.

## Direction contract

THESIS: Das Logo selbst ist die Bühne, aber als Licht, nicht als Gegenstand. Hinter dem Riesenschriftzug leuchtet unser Logo als reines Licht (vier goldene Lichtbalken um einen fast weißen Stern), davor steht der Name aus tausenden Schriftzeichen, die das Licht anstrahlt und die auf den Besucher reagieren. Direkt darunter liegt die funktionierende Anruf-Leiste. Kein 3D-Modell, kein Chrom. Verweigert wird die Branchen-Voreinstellung: zentrierte Überschrift über drei gleichen Karten, lila Leuchten, Glas.

OWN-WORLD: Grund ist ein gerader Nachtverlauf von tiefem Blau (#0f1a3a) über #0a1126 zu fast schwarzem Blau (#070b16) mit einer Glut-Kante (#23120d bis #6d3319) am unteren Rand; kein Glas, kein Deko-Raster, keine Lichthöfe an Bauteilen. Einziges Licht mit Schein ist das Licht-Logo im Kopfbereich: weich wie durch Nebel, leicht körnig, Ränder laufen in feinen Strahlen ins Dunkle aus. Gold (#d4a23c, #f3d27a) nur auf Bedienbarem und dem Betonungswort, Elfenbein (#f1eee6) für Text, Blaugrau (#737a95) für die gedämpfte erste Zeile. Sofia Sans Extra Condensed 800 in Großbuchstaben, Gloock aufrecht für Goldwörter, Sofia Sans für Fließtext, Cutive Mono nur für Status- und Messangaben. Bauteile: schwebende Kopfleisten-Kachel, runde Knöpfe mit Pfeil-Kreis, Anruf-Leiste; als einziger Schmuck das Licht-Logo und die Zeichen-Teilchen des Namens (# = + - : · und kleine Blöcke in Cutive Mono, Blaugrau, vom Licht golden und cremig angestrahlt).

STORY: Der Besucher versteht in fünf Sekunden: Wenn es klingelt und er nicht kann, nimmt der Assistent ab. Er glaubt es, weil er die Nummer sofort anrufen und es hören kann. Er tippt auf „Jetzt anrufen“; wer nicht anrufen will, fragt den Chat.

FIRST VIEWPORT: 1440 x 900, alles mittig. Oben Marke links, Kopfleisten-Kachel mittig, Anrufen-Knopf rechts. Im oberen Drittel der Riesenschriftzug „AGENTS GILT“ aus Zeichen-Teilchen (rund 1100 px breit), dahinter mittig das Logo aus Licht (rund 370 px hoch), dessen Balken über und unter dem Namen hervorschauen und dessen Stern durch die Zeichen scheint. Darunter die Überschrift in zwei Zeilen: gedämpft „Es klingelt.“, dann hell „Ihr Assistent“ mit goldenem Serifenwort „nimmt ab.“. Eine Unterzeile, dann die Anruf-Leiste (Status, Nummer, goldener Knopf mit Pfeil-Kreis) und daneben der Nebenknopf. Unten mittig klein der Hinweis „Klicken Sie irgendwo“, unten rechts der Chat-Knopf, ganz unten die Glut-Kante. Am Handy (390): das Licht-Logo als ruhiges, leicht atmendes Bild, der Name aus Zeichen steht still davor, Tippen löst die Welle aus; Überschrift dreizeilig, Anruf-Karte in voller Breite, Kopfleiste als schwebende Kachel.

SIGNATURE INTERACTION: „Das Licht folgt“. Der Stern des Licht-Logos folgt dem Zeiger sanft und verzögert und bleibt nahe der Mitte; die Strahlen der Balken neigen sich zu ihm und werden heller, der Schimmer wandert über den Namen. Die Zeichen weichen dem Zeiger aus und fließen zurück. Ein Klick irgendwo im Kopfbereich schickt eine Welle durch die Zeichen (sie stieben auseinander und setzen sich in 1 bis 2 Sekunden wieder zusammen), das Licht leuchtet kurz auf. Das Licht ist der ruhige Hintergrund, die Zeichen sind der Spaß; nie wirkt alles gleich laut. Startanimation: erst baut sich das Licht-Logo auf, dann sammeln sich die Zeichen zum Namen. Bewegungs-Grammatik: Teile gleiten auf geraden Bahnen herein und rasten ein (Ladebildschirm: vier Balken und Stern einzeln, Prozentzahl, höchstens 2 bis 3 Sekunden), Zeilen steigen aus einer Maske, Text färbt sich Wort für Wort, Karten schieben sich übereinander, der Gold-Tropfen fließt auf einer einzigen Bahn. Kein Scroll-Zwang; bei „weniger Bewegung“ steht alles im Endzustand.

FORM: Von David gewählte, aus seinen Vorbildern zusammengesetzte Richtung (Active Theory, Poly, Vapi, Lando Norris, recent.design; für den Kopfbereich seit dem Richtungswechsel die Wirkung des Lichts von madebyigor.com und der Zeichen-Teilchen von ksenpanchenko.com, in unserer Form und unseren Farben); nicht aus meiner Siebener-Liste. Die gewürfelte Richtung (Platz 3, „Die Vermittlung“) lag zur Wahl und wurde nicht genommen. seed:373ab79b8d49e7d0

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
