# Gestaltungs-Auftrag – Startseite agentsgilt.com

Stand 11.11.2026 · **Gewählte Richtung (Schritt 2, von David auf der Auswahlseite): Chromzeichen in der Punktwolke** – zusammengesetzt aus seinen Vorbildern (Active Theory, Poly, Vapi, Lando Norris, recent.design).
In Schritt 1 stand vorläufig „Bühnenhorizont“; in Schritt 2 hat David unter fünf Richtungen neu gewählt (zur Wahl standen außerdem: Die Vermittlung, Edel, Bühnenhorizont, Anzeigetafel).

- Gewählte Skizze des ersten Bildschirms (die Komposition, die der Bau treffen muss): `docs/skizzen/chromzeichen-in-der-punktwolke.html`, Bild dazu `docs/skizzen/chromzeichen-in-der-punktwolke.jpg`.
- Richtungs-Vertrag für Impeccable: `.impeccable/surfaces/app-page-tsx.md` (lesen mit `impeccable surface-brief read app/page.tsx`). Nie in ausgelieferten Code kopieren.
- Bau-Weg: Code zuerst (keine Bild-Erzeugung).

## 1. Für wen und in welchem Modus
- Modus **Überzeugen** (Landingpage). Besucher: Inhaber lokaler Betriebe in Rhein-Main, wenig Zeit, eher nicht technikaffin, oft am Handy, oft nach Feierabend.
- In 5 Sekunden verstehen: *Wenn es klingelt und Sie nicht können, nimmt Ihr Assistent ab.*

## 2. Ziel und Belege
- Hauptaktion: **Anrufen +49 6108 9694027** – dort nimmt der eigene KI-Assistent ab und macht einen Termin (die Seite ist damit die Vorführung). Knopf immer sichtbar (Kopfleiste, Anruf-Leiste im Hero, am Handy am Daumen).
- Zweitens: Chat unten rechts. Drittens: Anfrage-Formular, klein, aufklappbar („Lieber schreiben?“).
- Belege nur echt: Leistungen, Ablauf, Vorteile, 4 Anthropic-Zertifikate (David Hesse, Mijo Schulz), Einzugsgebiet, „meist innerhalb eines Werktages“. Keine Zahlen erfinden. **Kein Kundenstimmen-Bereich, auch kein Platzhalter.** Das Motiv „Karten schieben sich übereinander“ nur für echte Inhalte (Vorteile, Leistungen).

## 3. Gewählte Richtung: Chromzeichen in der Punktwolke
- **Idee:** Das Logo selbst ist die Bühne. Es schwebt als glänzendes Chrom-Gold-Zeichen (echte Form: vier schräge Balken, Stern in der Mitte) in einer Punktwolke, zwei Lichtbänder laufen vor und hinter ihm durch, alles reagiert auf den Zeiger. Direkt darunter liegt die funktionierende Anruf-Leiste.
- **Grund:** gerader Nachtverlauf von tiefem Blau (#0f1a3a) über #0a1126 zu fast schwarzem Blau (#070b16), nie reines Schwarz. Am unteren Rand eine Glut-Kante (#23120d bis #6d3319) als einziges warmes Licht neben Gold (aus recent.design).
- **Farben:** Gold (#d4a23c, hell #f3d27a) nur auf Bedienbarem und auf dem Betonungswort. Elfenbein (#f1eee6) für Text, Blaugrau (#737a95) für die gedämpfte erste Überschriftenzeile, Glut (#b4532a) nur als Kantenlicht. Kein Lila, kein Cyan.
- **Schrift:** Sofia Sans Extra Condensed 800 in Großbuchstaben (Überschriften), Gloock aufrecht für die goldenen Betonungswörter, Sofia Sans für Fließtext, Cutive Mono nur für Status- und Messangaben („Assistent bereit“, Orte, Nummern 01–06). Nicht Inter. Im Bau über `next/font` selbst ausliefern.
- **Bauteile:** schwebende Kopfleisten-Kachel; runde Knöpfe mit Pfeil-Kreis (Hauptknopf Gold mit dunklem Pfeil-Kreis, Nebenknopf Haarlinie); Anruf-Leiste (Status, Nummer, „Jetzt anrufen“); Punktwolke und Lichtbänder als einziger Schmuck. Keine Kästchenraster.
- **Disziplin aus der Auswahlrunde (von den abgelehnten Karten behalten):** leuchtendes Gold nur auf Bedienbarem; Licht folgt dem Zeiger; Zustände laufen als Welle, nie alles gleichzeitig; ein festes Lesemaß für Fließtext; am Handy entsteht das Logo aus Rasterpunkten.

## 4. Ablauf der Seite (alle Bereiche bleiben, Reihenfolge darf sich ändern)
1. **Ladebildschirm = Startanimation (höchstens 2–3 s):** Die vier Balken und der Stern des Logos gleiten einzeln herein und setzen sich in der Mitte zusammen, darunter dünner Ladebalken und Prozentzahl. Das fertige Zeichen bleibt stehen und wird ohne Schnitt zum Zeichen im Hero. Beim zweiten Besuch in derselben Sitzung kürzer; bei „weniger Bewegung“ und ohne JavaScript ganz ohne.
2. **Hero mit Probeanruf:** wie die Skizze. Überschrift in zwei Tönen, Zeile für Zeile: gedämpft „Es klingelt.“, dann hell „Ihr Assistent“ mit goldenem Serifenwort „nimmt ab.“. Darunter die Anruf-Leiste mit der echten Nummer (keine neue Logik) und der Nebenknopf „Leistungen ansehen“. Hinweis in der Nähe: „Am Telefon nimmt unser KI-Assistent ab und macht direkt einen Termin aus.“
3. **Was wir machen (Schreibmaschine bleibt):** Beim Scrollen tauchen Überschrift und Zeichen langsam weg, der Bereich kommt von unten herein. „Wir bauen in ~~Tagen~~ Stunden*…“; der Fließtext färbt sich beim Lesen Wort für Wort ein. Die Ereignisse für die Chat-Sprechblase bleiben.
4. **Leistungen:** sechs Leistungen als große Zeilenliste mit festen Nummern 01–06 (keine Kästchen); ein kleines Bild oder Zeichen fliegt über die Überschrift bzw. sitzt mitten in ihr. Klick wählt die Leistung im Formular vor (Funktion bleibt).
   Erweiterte Beschreibungen (Namen bleiben wörtlich gleich, nur die Beschreibungen wachsen):
   - **Automatisierungen** – zusätzlich: CRM einrichten und interne Werkzeuge.
   - **KI-Chatbots** – zusätzlich: Wissens-KI, die die eigenen Unterlagen eines Betriebs kennt.
   - **KI-Beratung & Audit** – zusätzlich: individuelle KI-Systeme, z. B. ein Kundenportal.
   Keine Preise, keine eigenen Software-Produkte nennen.
5. **So läuft es ab:** drei Schritte entlang einer einzigen geschwungenen Lichtbahn (gleiche Formensprache wie die Lichtbänder im Hero); ein glänzender, flüssiger Gold-Tropfen fließt beim Scrollen von Schritt zu Schritt (Oberflächenspannung, Nachziehen). Jeder Schritt rastet sichtbar ein, der letzte auf „startklar“ (Wort aus dem echten Text von Schritt 3).
6. **Warum wir:** vier Vorteile als Karten, die sich beim Scrollen übereinanderschieben, ohne das Scrollen festzuhalten.
7. **Ausbildung:** Zertifikate als schwebende Collage mit Tiefe; Stapel-Wechsel und PDF-Link bleiben.
8. **Kontakt:** die Anruf-Leiste noch einmal groß, dazu WhatsApp; das Formular klein und eingeklappt. Die Glut-Kante schließt die Seite.
9. **Fußleiste:** stehender Riesen-Schriftzug „Agents Gilt“ (kein Laufband, entschieden 11.11.2026), Navigation, Impressum, Datenschutz.

## 4a. Drei Aufbau-Varianten (Schritt 3)

Gleiche Welt, anderer Aufbau. Nebeneinander zu sehen unter `/varianten`, Code in `components/neu/aufbau/`. Impeccable hat aus sieben Aufbau-Ideen diese drei gezogen (nicht gezogen: Mittelachse, Anruf zuerst, Geteilte Bühne, Laufweg des Tropfens).

| | Riesen-Schriftzug | Kartenstapel | Umlaufbahn |
|---|---|---|---|
| Kopfbereich | Name riesig über die ganze Breite, Zeichen mitten darin; Überschrift links, Anruf-Leiste rechts | wie die gewählte Skizze: Zeichen mittig, Überschrift und Anruf-Leiste darunter | Überschrift allein in der Mitte, sechs Leistungen als Kacheln auf einem Punktring, Zeichen oben auf der Bahn |
| Übergang | Schriftzug und Überschrift tauchen weg, eine große Tafel kommt von unten | jeder Bereich ist ein Bogen, der sich über den vorigen schiebt | Kacheln fliegen über die Überschrift zur Mitte |
| Leistungen | Riesen-Zeilen, ein goldenes Zeichen folgt dem Zeiger | Zeilenliste, kleines Bild in der Überschrift wechselt mit der Zeile | Drehscheibe links, sechs Texte rechts |
| So läuft es ab | Tropfen auf gerader, schräger Bahn | Tropfen auf einer Welle | Tropfen auf einem Bogen |
| Warum wir | vier Riesen-Wörter | Fächer aus vier Karten (am Handy schieben sie sich übereinander) | vier Trabanten um die Aussage |
| Ausrichtung | linksbündig | mittig | mittig |

Am Handy sind alle drei bewusst ähnlicher und leichter: Zeichen als Rasterpunkt-Zeichnung, keine Dauer-Animation, Anruf-Karte in voller Breite, Anrufen-Knopf am Daumen.

## 4b. Vier Kopfbild-Varianten (Schritt 4)

Im gewählten Aufbau **Riesen-Schriftzug**; nur der Kopfbereich ist anders. Übersicht unter `/varianten/kopf`, Code in `components/neu/kopf/`. Alles mittig, kein Foto: unser Logo als glänzendes 3D-Zeichen, Bewegung Stärke 4 von 5.

| | Kern im Schriftzug | Lichtbänder | Punktwolke | Tiefenflug |
|---|---|---|---|---|
| Bild | Name riesig quer über die Mitte, das Zeichen genau darin | Zeichen groß, fünf Lichtbänder kreisen darum, dahinter der Name als feine Linie | Zeichen in einer Kugel aus 2600 Punkten, die sich langsam dreht | Zeichen am Ende eines Tunnels aus Punktringen |
| Maus | drei Lichtspuren umflechten den Zeiger, Staub wird mitgerissen | Bänder beugen sich zum Zeiger | Punkte weichen dem Zeiger aus und leuchten golden | Zeiger lenkt das hintere Ende des Tunnels, zwei Spuren folgen |
| Text | Überschrift, Unterzeile, Knöpfe unter dem Bild | Überschrift oben, Knöpfe unten | Überschrift oben, Name angeschnitten am Boden | Überschrift groß, Wort für Wort hereinfliegend |
| Scrollen | Bild und Zeichen ziehen nach oben weg | wie Kern | wie Kern, der Name am Boden steigt mit | die Kamera fliegt durch den Tunnel am Zeichen vorbei |

Gemeinsam: Das Zeichen neigt sich zur Maus, das Glanzlicht folgt ihr, ein Glanzstreifen läuft beim Auftritt und danach alle paar Sekunden darüber; der Nebel im dunklen Grund zieht langsam, die Glut am unteren Rand flackert leicht. Technik: three.js mit WebGPU (fällt von selbst auf WebGL 2 zurück), Farben und Licht in TSL berechnet, keine Bilder oder Texturen zum Nachladen. Das 3D-Paket wird **nur am Computer** geladen.

**Am Handy und bei „weniger Bewegung“:** ruhiges Ersatzbild statt 3D – das Logo als goldene Linienzeichnung, über die ein Licht wandert, ein paar schwebende Punkte (je Variante Staub, Ellipsen, Punktring oder Ringe). Ein Tippen auf den Kopfbereich lässt Funken sprühen und das Zeichen aufleuchten. Bei „weniger Bewegung“ steht alles still.

## 5. Bewegung (Bewegung hoch, Abweichung hoch, Dichte niedrig)
- **Kennzeichen „Das Zeichen folgt“:** Das 3D-Zeichen neigt sich zum Zeiger, Lichtbänder und nahe Punkte biegen sich mit. Beim Scrollen fliegt man am Zeichen vorbei.
- Ein Bewegungs-Vokabular: Teile gleiten auf geraden Bahnen herein und rasten ein; Zeilen steigen aus einer Maske; Text färbt sich Wort für Wort.
- Kein Scroll-Zwang: normales Scrollen, kein Festhalten ganzer Bereiche, Animationen begleiten nur. `prefers-reduced-motion` zeigt alles sofort im Endzustand.
- **Handy leichter:** kein 3D (Zeichen als Rasterpunkt- oder Strichzeichnung), kein Zeiger-Effekt, kürzerer Ladebildschirm, Tropfen als einfache Linie mit Punkt, Kopfleiste als schwebende Kachel, Anrufen-Knopf in voller Breite am Daumen.

## 6. Zustände und Mengen
- Formular: leer, Fehler am Feld, sendet, Erfolg (Texte aus `docs/texte.md`, gesiezt). Chat: zu, Sprechblase, offen, Übergabe, Support-Chat. Ladebildschirm: erster Besuch, Wiederkehr, reduzierte Bewegung, kein JavaScript (Seite sofort sichtbar).
- Texte siezen; Datenschutz und Impressum bleiben wortgleich; Chat siezt ohne Emojis.

## 7. Grenzen
- Keine Änderung an `app/api`, `lib` (außer Texten in `lib/content.ts` und reinen Anzeige-Texten im Chat-Widget), Metadaten, Statistik, Terminseiten-Logik, Weiterleitung. Alle Anker-IDs bleiben. Die sechs Leistungstitel bleiben wörtlich (Schnittstellenwerte für Formular, Chat und Notion, siehe `docs/funktionen.md` 4a); ein anderer Anzeigename nur als getrennter Anzeigetext.
- Nie: lila Verläufe, Inter, 3D-Blobs, KI-Standard-Kästchenraster, Emojis als Symbole, Glas überall, reines Schwarz ohne Farbe, erfundene Zahlen oder Stimmen. Keine fremde Seite 1:1.
- Leistung: Der Ladebildschirm darf die Seite nicht blockieren (Inhalt steht im HTML); 3D nur am Computer und nachgeladen.

## 8. Was die Code-Fehlersuche in Schritt 2 gelehrt hat (im Bau von Anfang an vermeiden)
- Keine kursive Serife in Riesen-Überschriften: Betonungswörter stehen aufrecht (von David bestätigt, 11.11.2026).
- Keine farbigen Leuchtschein-Schatten und keine runden Lichthöfe im Hintergrund: Licht als gerade Verläufe und Bänder.
- Kein kleines Etikett in Großbuchstaben über einer Überschrift.
- Kein Deko-Raster aus Linien im Hintergrund; die Punktwolke trägt die Textur.
- Lange Sätze nicht in Riesengröße: Die Hero-Überschrift bleibt kurz.
- Umrandete Flächen bekommen innen mindestens 8 px Abstand.

## Entscheidungen von David (11.11.2026)
1. **Kundenstimmen:** ganz weglassen, kein Platzhalter.
2. **Bilder:** selbst gezeichnete Grafiken (SVG/Canvas im Stil der gewählten Richtung) oder gute Bilder aus dem Web. Web-Bilder nur mit freier Lizenz für gewerbliche Nutzung (z. B. Unsplash, Pexels), Quelle und Lizenz je Bild in `docs/bildquellen.md` vermerken, Adresse vorher prüfen, lokal in `public/` ablegen. Keine Bild- oder Video-Erzeugung (kostet Geld). Keine Bilder, die Kunden, Projekte oder Team vortäuschen.
3. **Leistungen:** Beschreibungen von „Automatisierungen“, „KI-Chatbots“, „KI-Beratung & Audit“ werden erweitert (siehe Bereich 4); die sechs Namen bleiben unverändert.
4. **Richtung:** Chromzeichen in der Punktwolke (Schritt 2).
5. **Betonungswörter:** aufrecht lassen, nicht kursiv (Schritt 3).
6. **Fußleiste:** stehender Riesen-Schriftzug statt Laufband (Schritt 3).
7. **Aufbau:** Riesen-Schriftzug (Schritt 3 → 4).
8. **Kopfbild:** Kern im Schriftzug (Schritt 4) – der Name riesig quer über die Mitte, das glänzende 3D-Zeichen genau darin, Lichtspuren und Staub folgen der Maus; am Handy die goldene Linienzeichnung, die auf Tippen reagiert.
