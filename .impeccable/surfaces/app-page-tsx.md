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
- **Entschieden am 11.11.2026 (Schritt 3 → 4):** Aufbau „Riesen-Schriftzug“. Kopfbereich: ein Bild, alles mittig; das Logo als glänzendes 3D-Zeichen (three.js/WebGPU, nur am Computer), am Handy und bei „weniger Bewegung“ ein ruhiges 2D-Ersatzbild, das auf Tippen reagiert. Vier Kopfbild-Varianten unter `/varianten/kopf`.

## Direction contract

THESIS: Das Logo selbst ist die Bühne. Ein glänzendes Chrom-Gold-Zeichen schwebt in einer Punktwolke, die auf den Besucher reagiert, und direkt darunter liegt die funktionierende Anruf-Leiste. Verweigert wird die Branchen-Voreinstellung: zentrierte Überschrift über drei gleichen Karten, lila Leuchten, Glas.

OWN-WORLD: Grund ist ein gerader Nachtverlauf von tiefem Blau (#0f1a3a) über #0a1126 zu fast schwarzem Blau (#070b16) mit einer Glut-Kante (#23120d bis #6d3319) am unteren Rand; keine Lichthöfe, kein Glas, kein Deko-Raster. Gold (#d4a23c, #f3d27a) nur auf Bedienbarem und dem Betonungswort, Elfenbein (#f1eee6) für Text, Blaugrau (#737a95) für die gedämpfte erste Zeile. Sofia Sans Extra Condensed 800 in Großbuchstaben, Gloock aufrecht für Goldwörter, Sofia Sans für Fließtext, Cutive Mono nur für Status- und Messangaben. Bauteile: schwebende Kopfleisten-Kachel, runde Knöpfe mit Pfeil-Kreis, Anruf-Leiste, Punktwolke und Lichtbänder als einziger Schmuck.

STORY: Der Besucher versteht in fünf Sekunden: Wenn es klingelt und er nicht kann, nimmt der Assistent ab. Er glaubt es, weil er die Nummer sofort anrufen und es hören kann. Er tippt auf „Jetzt anrufen“; wer nicht anrufen will, fragt den Chat.

FIRST VIEWPORT: 1440 x 900. Oben Marke links, Kopfleisten-Kachel mittig, Anrufen-Knopf rechts. Das Zeichen (etwa 250 px) im oberen Drittel mittig, umkreist von einem Ring aus rund 440 Punkten, zwei Lichtbänder laufen vor und hinter ihm durch. Darunter mittig die Überschrift in zwei Zeilen um 104 px: gedämpft „Es klingelt.“, dann hell „Ihr Assistent“ mit goldenem Serifenwort „nimmt ab.“. Eine Unterzeile, dann die Anruf-Leiste (Status, Nummer, goldener Knopf mit Pfeil-Kreis) und daneben der Nebenknopf. Unten links die Orte, unten rechts der Chat-Knopf, ganz unten die Glut-Kante. Am Handy (390): kein 3D, das Zeichen als Rasterpunkt-Zeichnung, Überschrift dreizeilig, Anrufen-Knopf in voller Breite am Daumen, Kopfleiste als schwebende Kachel.

SIGNATURE INTERACTION: „Das Zeichen folgt“. Das 3D-Zeichen neigt sich zum Zeiger, Lichtbänder und nahe Punkte biegen sich mit; beim Scrollen fliegt man am Zeichen vorbei. Bewegungs-Grammatik: Teile gleiten auf geraden Bahnen herein und rasten ein (Ladebildschirm: vier Balken und Stern einzeln, Prozentzahl, höchstens 2 bis 3 Sekunden), Zeilen steigen aus einer Maske, Text färbt sich Wort für Wort, Karten schieben sich übereinander, der Gold-Tropfen fließt auf einer einzigen Bahn. Kein Scroll-Zwang; bei „weniger Bewegung“ steht alles im Endzustand.

FORM: Von David gewählte, aus seinen Vorbildern zusammengesetzte Richtung (Active Theory, Poly, Vapi, Lando Norris, recent.design); nicht aus meiner Siebener-Liste. Die gewürfelte Richtung (Platz 3, „Die Vermittlung“) lag zur Wahl und wurde nicht genommen. seed:373ab79b8d49e7d0

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
