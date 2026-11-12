# Gestaltungs-Auftrag – Startseite agentsgilt.com

Stand 11.11.2026 · **Gewählte Richtung (Schritt 2, von David auf der Auswahlseite): Chromzeichen in der Punktwolke** – zusammengesetzt aus seinen Vorbildern (Active Theory, Poly, Vapi, Lando Norris, recent.design).
In Schritt 1 stand vorläufig „Bühnenhorizont“; in Schritt 2 hat David unter fünf Richtungen neu gewählt (zur Wahl standen außerdem: Die Vermittlung, Edel, Bühnenhorizont, Anzeigetafel).

> **Richtungswechsel (11./12.11.2026, vor Schritt 5): Das 3D-Logo ist ersetzt.** Der Kopfbereich ist ohne Text und besteht aus zwei Ebenen: hinten unser Logo aus Licht (Scherenschnitt vor einer Lichtkugel, God Rays), vorn der Name aus Schriftzeichen. Verbindlich ist Abschnitt **4d** (er ersetzt 4c). Der Name der Richtung („Chromzeichen in der Punktwolke“) bleibt nur als Etikett stehen; ein Chrom- oder 3D-Zeichen gibt es nicht mehr. Wo ältere Abschnitte noch vom 3D-Zeichen sprechen, gilt 4d.
>
> **Stil, der bleibt:** fast schwarz mit dunkelblauen Akzenten, der Name grau, Gold beim Licht und bei wichtigen Wörtern. Nichts Helles.

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
- **Idee:** Das Logo selbst ist die Bühne. Seit dem Richtungswechsel (4d) als Licht hinter dem Namen: Das Logo steht als dunkler Scherenschnitt vor einer goldenen Lichtkugel, die Strahlen fallen durch die Lücken zwischen den vier Balken, der Stern leuchtet weiß; davor der Riesenschriftzug aus tausenden Schriftzeichen. Alles reagiert auf den Zeiger. Der Kopfbereich selbst trägt keinen Text; „Anrufen“ steht oben rechts. (Ursprünglich: ein glänzendes Chrom-Gold-Zeichen in einer Punktwolke – verworfen.)
- **Grund:** gerader Nachtverlauf von tiefem Blau (#0f1a3a) über #0a1126 zu fast schwarzem Blau (#070b16), nie reines Schwarz. Am unteren Rand eine Glut-Kante (#23120d bis #6d3319) als einziges warmes Licht neben Gold (aus recent.design).
- **Farben:** Gold (#d4a23c, hell #f3d27a) nur auf Bedienbarem und auf dem Betonungswort. Elfenbein (#f1eee6) für Text, Blaugrau (#737a95) für die gedämpfte erste Überschriftenzeile, Glut (#b4532a) nur als Kantenlicht. Kein Lila, kein Cyan.
- **Schrift:** Sofia Sans Extra Condensed 800 in Großbuchstaben (Überschriften), Gloock aufrecht für die goldenen Betonungswörter, Sofia Sans für Fließtext, Cutive Mono nur für Status- und Messangaben („Assistent bereit“, Orte, Nummern 01–06). Nicht Inter. Im Bau über `next/font` selbst ausliefern.
- **Bauteile:** schwebende Navigationsleiste aus dunklem Glas mit feinem Goldrand und wanderndem Lichtpunkt (4d); runde Knöpfe mit Pfeil-Kreis (Hauptknopf Gold mit dunklem Pfeil-Kreis, Nebenknopf Haarlinie); Anruf-Leiste (Status, Nummer, „Jetzt anrufen“); als Schmuck das Licht-Logo und die Zeichen-Teilchen des Namens (4d). Keine Kästchenraster.
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

**Stand von Schritt 4, durch 4c überholt:** Gewählt wurde „Kern im Schriftzug“; dessen 3D-Zeichen ist inzwischen durch Licht ersetzt. Die drei anderen Varianten (Lichtbänder, Punktwolke, Tiefenflug) sind nicht gewählt und zeigen noch das verworfene 3D-Zeichen.

Im gewählten Aufbau **Riesen-Schriftzug**; nur der Kopfbereich ist anders. Übersicht unter `/varianten/kopf`, Code in `components/neu/kopf/`. Alles mittig, kein Foto: unser Logo als glänzendes 3D-Zeichen, Bewegung Stärke 4 von 5.

| | Kern im Schriftzug | Lichtbänder | Punktwolke | Tiefenflug |
|---|---|---|---|---|
| Bild | Name riesig quer über die Mitte, das Zeichen genau darin | Zeichen groß, fünf Lichtbänder kreisen darum, dahinter der Name als feine Linie | Zeichen in einer Kugel aus 2600 Punkten, die sich langsam dreht | Zeichen am Ende eines Tunnels aus Punktringen |
| Maus | drei Lichtspuren umflechten den Zeiger, Staub wird mitgerissen | Bänder beugen sich zum Zeiger | Punkte weichen dem Zeiger aus und leuchten golden | Zeiger lenkt das hintere Ende des Tunnels, zwei Spuren folgen |
| Text | Überschrift, Unterzeile, Knöpfe unter dem Bild | Überschrift oben, Knöpfe unten | Überschrift oben, Name angeschnitten am Boden | Überschrift groß, Wort für Wort hereinfliegend |
| Scrollen | Bild und Zeichen ziehen nach oben weg | wie Kern | wie Kern, der Name am Boden steigt mit | die Kamera fliegt durch den Tunnel am Zeichen vorbei |

Gemeinsam: Das Zeichen neigt sich zur Maus, das Glanzlicht folgt ihr, ein Glanzstreifen läuft beim Auftritt und danach alle paar Sekunden darüber; der Nebel im dunklen Grund zieht langsam, die Glut am unteren Rand flackert leicht. Technik: three.js mit WebGPU (fällt von selbst auf WebGL 2 zurück), Farben und Licht in TSL berechnet, keine Bilder oder Texturen zum Nachladen. Das 3D-Paket wird **nur am Computer** geladen.

**Am Handy und bei „weniger Bewegung“:** ruhiges Ersatzbild statt 3D – das Logo als goldene Linienzeichnung, über die ein Licht wandert, ein paar schwebende Punkte (je Variante Staub, Ellipsen, Punktring oder Ringe). Ein Tippen auf den Kopfbereich lässt Funken sprühen und das Zeichen aufleuchten. Bei „weniger Bewegung“ steht alles still.

## 4c. Kopfbereich: Logo aus Licht, Name aus Zeichen (erster Wurf vom 11.11.2026 – durch 4d ersetzt)

> Überholt. Licht und Name wurden am 12.11.2026 komplett neu gebaut, der Kopfbereich ist seitdem ohne Text. Dieser Abschnitt bleibt nur als Verlauf stehen; die Dateien `licht.ts` und `zeichenfeld.ts` gibt es nicht mehr, der Hinweis „Klicken Sie irgendwo“ ist entfallen.

**Das 3D-Logo ist entfernt.** Der Kopfbereich hat zwei Ebenen, durchscheinend übereinander. Zu sehen unter `/varianten/kopf/kern`, Code in `components/neu/kopf/LichtName.tsx` (hält beide im Takt), `licht.ts` (Licht) und `zeichenfeld.ts` (Zeichen). Vorbilder nur für die Wirkung, nichts übernommen: das Licht von madebyigor.com, die Zeichen-Teilchen von ksenpanchenko.com.

**1. Hinten: unser Logo aus Licht**
- Kein Modell, reines Licht. Die vier Balken sind goldene Lichtbalken: weich leuchtend wie Licht durch Nebel, leicht körnig; ihre Ränder laufen in feinen Strahlen ins Dunkle aus. Der Stern ist ein helles, fast weißes Licht mit goldenem Hof und weichen Strahlen. Die Logo-Form muss in Ruhe klar erkennbar sein.
- Bewegung: Der Stern folgt der Maus sanft und verzögert, bleibt aber nahe der Mitte. Die Balken bleiben an ihrem Platz; ihre Strahlen neigen sich zum Stern und werden heller, wenn er näherkommt. In Ruhe atmet das Licht ganz leicht.
- Lage: hinter dem Namen, scheint durch die Zeichen hindurch.
- Technik: **ein einziger Shader** (WebGL, ohne three.js) auf einer Leinwand über den ganzen Kopfbereich, rechnet nur, wenn der Kopfbereich sichtbar ist; gröber, wenn der Rechner nicht mitkommt. Ohne WebGL bleibt das Logo als flache goldene Grafik stehen.

**2. Vorn: unser Name aus Zeichen-Teilchen**
- Der Riesenschriftzug „AGENTS GILT“ besteht aus tausenden kleinen Schriftzeichen (# = + - : · und kleine Blöcke, Schrift Cutive Mono), dicht wie ein Druckraster. Grundfarbe Blaugrau. An den Ober- und Unterkanten lockern sich die Buchstaben zu feinen Zeichen-Strahlen auf, wie spritzende Tinte.
- Vom Licht angestrahlt: Zeichen nahe an den Balken golden, nahe am Stern hell-cremig, sonst grau. Wandert der Stern, wandert der Schimmer über den Namen. Ein dunkler Saum um jedes Zeichen hält den Namen auch vor dem Licht lesbar.
- Maus: Die Zeichen weichen dem Zeiger aus und fließen zurück.
- Klick: Ein Klick irgendwo im Kopfbereich (nicht auf Knöpfe und Links) schickt eine Welle durch die Zeichen; sie stieben auseinander und setzen sich in 1 bis 2 Sekunden wieder zusammen, das Licht leuchtet kurz auf. Kleiner Hinweis „Klicken Sie irgendwo“ (am Handy „Tippen Sie irgendwo“), verschwindet nach dem ersten Klick.
- Technik: 2D-Zeichenfläche; gezeichnet wird nur, solange sich etwas bewegt oder das Licht wandert. In Ruhe ist der Name klar lesbar.

**Ruhe und Handy:** Das Licht ist der ruhige Hintergrund, die Zeichen sind der Spaß; nie wirkt alles gleich laut.
- **Am Handy:** das Licht-Logo als ruhiges, leicht atmendes Bild (einmal gerechnet, atmet nur über die Deckkraft, etwas gedämpft), der Name aus Zeichen steht ruhig, Tippen löst die Welle aus.
- **Bei „weniger Bewegung“:** alles still, kein Hinweis, keine Reaktion.
- **Startanimation bleibt:** Nach dem Ladebildschirm baut sich erst das Licht-Logo auf (Balken reihum, dann der Stern), dann sammeln sich die Zeichen zum Namen.
- **Ohne Skript:** Name und Logo stehen als gewöhnliche Grafik da.

**Folgen für spätere Schritte (Stand 4d):** Kein 3D-Modell im Kopfbereich. `three` wird für das Licht-Logo gebraucht (zusammen mit `postprocessing`), außerdem noch von den drei nicht gewählten Kopfbildern (`szene.ts`, `KopfBuehne.tsx`, `einfach.ts`); diese drei können entfallen.

## 4d. Kopfbereich neu gebaut (Korrektur vom 12.11.2026, gilt ab jetzt)

Zu sehen unter `/varianten/kopf/kern`. Code: `components/neu/kopf/LichtName.tsx` (hält alles im Takt), `lichtszene.ts` (Licht), `zeichenname.ts` (Name), `components/neu/Kopfleiste.tsx` (Navigation). Vorbilder nur für Wirkung und Machart, eigene Umsetzung, kein Code übernommen: das Licht von madebyigor.com, die Zeichen von ksenpanchenko.com.

**1 · Licht-Logo (statt des 3D-Logos) – Stand nach der dritten Runde vom 12.11.2026, gilt ab jetzt**

Ziel in einem Satz: Man sieht kein Objekt, keine Kante und keine Fläche, nur ein feines, körniges, gedimmtes goldenes Licht, das in der Form unseres Logos aus dem Schwarz strahlt. Kein Weiß: Auch der Kern ist Gold.

- **Fertiger Effekt der Bibliothek, kein eigener:** Das Licht kommt vom `GodRaysEffect` der Bibliothek `postprocessing`, das Korn von deren `NoiseEffect`. Der frühere eigene Strahlen-Effekt, die Balken als Körper, die goldenen Kanten und der weiße Blitz sind vollständig gelöscht.
- **Aufbau (so macht es auch das Vorbild, bleibt so):**
  1. In der Szene steht nur eine **schwarze Wand**. In ihrem Shader werden die Stellen unseres Logos verworfen (`discard`): Dort hat die Wand Löcher und schreibt keine Tiefe. Die Wand wird ganz normal gezeichnet und schreibt sonst überall Tiefe.
  2. Die **Lichtscheibe** ist nicht Teil der Szene. Sie wird nur dem Effekt als Lichtquelle (`lightSource`) übergeben, durchsichtig und ohne Tiefe zu schreiben. Der Effekt vergleicht sie mit der Tiefe der Wand: Licht kommt nur durch die Löcher.
  3. Aus diesem Licht zieht der Effekt die Strahlen.
- **Größe:** Das Logo-Loch ist etwa so breit wie die Buchstaben „TS“ im Namen zusammen (17 % der Bildbreite, am Computer bei 1440 px rund 245 px, höchstens 300 px). Am Handy rund 35 % der Bildbreite. Gemeint ist die sichtbare Öffnung: Die Spitzen der vier Splitter liegen genau auf dem Rand des Platzes (`.ag-ln__loch`).
- **Schmale Öffnungen:** Die vier Balken des Logos sind als schmale Splitter geöffnet: entlang der Mittellinie des Balkens, in der Mitte gut halb so breit wie der Balken, an beiden Enden spitz auslaufend. Seit Runde 3b sind sie rund 11 % länger (die Spitzen reichen ein Stück über die Balkenenden hinaus zu den Achsen hin) und in der Mitte 15 % breiter; die Gesamtbreite des Lochs, der Stern und alle Licht-Werte sind dabei gleich geblieben. Die vier äußeren Speichen-Bündel leuchten dadurch etwas kräftiger und breiter. Der Stern in der Mitte behält seine vier langen, feinen Spitzen. Das Logo bleibt erkennbar, das Licht kommt in feinen Speichen heraus.
- **Lichtscheibe weit hinten:** Die Kamera steht 14 Einheiten vor der Wand (bei einem Logo von rund einem Viertel der Bildhöhe ergibt das 35° Sichtfeld), die Scheibe sitzt 100 Einheiten hinter der Wand auf deren Achse. Kippt die Wand nur wenig zur Maus (zur Seite höchstens rund 9°, nach oben und unten rund 11°; so zeigt der Kegel in den Bildecken wie beim Vorbild leicht steiler als die Diagonale), wandert die ferne Scheibe weit zur Gegenseite: Es entsteht ein langer, schmaler Lichtkegel zur Maus hin, auf der abgewandten Seite ist es schwarz. Die Scheibe ist groß (Radius 44), damit sie das Logo auch gekippt noch beleuchtet; im Umkreis des halben Logos um ihre Mitte leuchtet sie etwas schwächer (70 %), sonst überstrahlt der Stern alles andere.
- **Immer gleich groß und in der Blickachse:** Das Sichtfeld richtet sich nach der Bildhöhe, der Bildausschnitt wird auf die Logo-Mitte verschoben. So sieht das Licht bei jeder Bildgröße und an jeder Stelle gleich aus (am Handy sitzt es im oberen Drittel).
- **Farbe:** nur Gold (#f0a83a), in der Mitte der Scheibe ein Hauch heller (zu 60 % #ffd27a). Kein Weiß. Belichtung und Gewicht sind so niedrig, dass nichts überstrahlt.
- **Speichen:** Die Störung in der Lichtscheibe hängt nur an der Richtung um ihre Mitte und verändert sich langsam (Zeit × 0,5). Dadurch zerfällt das Licht in viele feine Speichen, die genau entlang der Strahlen laufen, auch im Lichtkegel.
- **Strahlen enden im Schwarz:** Sie laufen etwa bis zur halben Strecke zum Bildrand aus (am Computer rund 350 bis 430 px von der Logo-Mitte) und werden dann wirklich schwarz. Erreicht wird das über die Dichte des Effekts (0,77): Jeder Bildpunkt sucht nur auf gut drei Vierteln des Wegs zur Lichtquelle nach Licht.
- **Körnung wie beim Vorbild:** `NoiseEffect` mit `COLOR_DODGE` und 0,2 Deckkraft. Das Korn ist nur im Licht sichtbar, das Schwarz bleibt schwarz und sauber.
- **Grund rein schwarz:** Kopfbereich, Wand und Hintergrund der Szene haben denselben Ton (#000). Kein blauer Verlauf im Kopfbereich. Der Grund der Szene ist als Hintergrund gesetzt (nicht als Löschfarbe), damit die Farbe in den Löchern richtig ankommt. Direkt unter dem Kopfbereich geht das Schwarz ohne harte Linie in den Grund der Seite über.
- **Bewegung:** Das Licht pulsiert nur ganz leicht (± 2 %). Ohne Maus (Handy) wiegt sich die Wand kaum merklich von selbst; das Leben kommt aus den langsam wandernden Speichen.
- **Werte (mit dem Vorbild abgeglichen):** 80 Proben je Bildpunkt am Computer, 60 am Handy; Dichte 0,77, Abklingen 0,94, Gewicht 0,2, Belichtung 0,42 (Abklingen und Gewicht werden auf die Probenzahl umgerechnet, damit das Licht am Handy gleich aussieht); halbe Auflösung mit mittlerem Weichzeichner. Gemessen neben dem Vorbild (hellster Wert auf Ringen um die Lichtmitte, 100/130/160/200/250 px): unseres 171/128/77/49/30, Vorbild 176/104/73/53/40; danach wird unseres wie verlangt schneller schwarz (bei 440 px praktisch 0).
- **Technik:** three.js mit `postprocessing`, wird nachgeladen (nicht bei „weniger Bewegung“). Rechnet nur, solange der Kopfbereich zu sehen ist, mit höchstens 2-facher Pixeldichte. Vor dem Auftritt wird nur einmal der dunkle Grund gezeichnet; in Ruhe genügt jedes zweite Bild.
- **Testseite:** `/varianten/licht-test` zeigt das Licht allein (schwarze Wand mit Logo-Loch, Lichtscheibe, God Rays, Filmkorn; ohne Name und Kopfleiste), in derselben Größe und Lage wie im Kopfbereich (am Handy im oberen Drittel). Dort wird es neben madebyigor.com/lab gelegt (Computer: Maus in der Mitte und links oben; Handy) und angeglichen. Was außer Farbe und Form bewusst anders ist: Die Strahlen enden früher im reinen Schwarz, und am Handy sitzt das Licht im oberen Drittel statt in der Mitte. Bei „weniger Bewegung“ steht auch dort nur das ruhige Bild. Wer das Licht ändert, gleicht zuerst dort ab.

**2 · Name aus Zeichen-Teilchen, deutlich größer**
- **Form:** „AGENTS GILT“ in unserer schmalen, fetten Schrift wird unsichtbar als Graustufenbild gezeichnet, am Rand weich, dazu ein paar feine Strahlen nach außen (wie spritzende Tinte). Das Bild wird in ein Raster zerlegt (Zellen am Computer 6,5 px, am Handy 5 px). Jede Zelle hat eine Dichte von 1 bis 9; daraus folgen Deckkraft (Dichte/9) und Zeichen. Zeichensatz `· . : - = + * / % #`: innen dichte Zeichen (# %), am Rand lockere (· . :). Zellen unter 8 % Abdeckung fallen weg.
- **Größe:** fast die ganze Breite (am Computer bis 1760 px). Am Handy stehen die beiden Wörter übereinander, damit der Name groß genug bleibt; er sitzt dort mit dem Licht im oberen Drittel.
- **Farbe:** Grundfarbe grau. Wo das Licht des Logos die Zeichen trifft (bis etwa drei Logo-Halbmesser weit), leuchten sie golden, nahe am Stern einen Hauch heller. Kein Weiß. Kippt das Licht zur Maus, wandert der Schimmer in diese Richtung mit, zur Gegenseite reißt er ab. Angestrahlte Zeichen haben einen dunklen Saum, damit der Name auch direkt vor dem Licht lesbar bleibt.
- **Lage:** vor dem Licht; das Licht scheint zwischen den Zeichen durch.
- **Zeichnen:** Jedes Zeichen liegt einmal fertig in einem Vorrat (Monospace Cutive Mono, Stärke 500), in jeder Dichte und Färbung. Neu gezeichnet wird nur, wenn sich etwas bewegt.
- **Ruhe-Flimmern:** Alle 140 ms tauschen rund 0,4 % der Zellen kurz ihr Zeichen.
- **Maus:** Im Umkreis von 70 px weichen die Zeichen bis zu 18 px aus und federn weich zurück (je Bild 25 % zum Ziel).
- **Welle beim Klick:** Ein Ring breitet sich mit 1150 px/s aus, als weiches Band von rund 90 px Breite, schiebt die Zeichen bis zu 56 px nach außen und klingt in 1,3 s ab. Getroffene Zeichen leuchten kurz heller und wechseln ihr Zeichen. Höchstens 4 Wellen gleichzeitig. Klicks auf Knöpfe und Links lösen keine Welle aus. Einmal nach dem Auftritt läuft von selbst eine Welle als Hinweis. Am Handy löst Tippen die Welle aus, mit kurzer Vibration (wo das Gerät es kann).
- **Technik:** 2D-Zeichenfläche, pausiert, wenn nicht sichtbar. Bei „weniger Bewegung“ kein Ausweichen, keine Welle, kein Flimmern.

**3 · Kopfbereich ohne Text**
Nur diese Dinge, kein weiterer Text, kein Hinweistext:
- Mitte: Licht-Logo und Name.
- Oben links: kleines Logo, leicht golden leuchtend.
- Oben Mitte: Navigationsleiste, schwebend, aus dunklem Glas, mit feinem Goldrand. Ein kleiner Lichtpunkt gleitet unter den Menüpunkt, über dem die Maus ist, und bleibt sonst unter dem Abschnitt, der gerade zu sehen ist.
- Oben rechts: „Anrufen“, sanft golden glühend.
- Unten rechts: Chat-Knopf.
- Überschrift, Unterzeile und Telefon-Block stehen **vorläufig direkt unter dem Kopfbereich**; sie werden im nächsten Auftrag neu verteilt. Am Handy bleibt der Anrufen-Knopf am Daumen weg, solange der Kopfbereich zu sehen ist („Anrufen“ steht dann in der Kopfleiste).

**Scroll-Hinweis, sehr dezent (seit Runde 3b wieder da):** Wer nach 4 Sekunden nicht gescrollt hat, sieht von ganz unten einen sehr schwachen, warmen Goldschein hereinkommen. Er sitzt am unteren Rand des sichtbaren Bildes (auch in sehr niedrigen Fenstern, in denen der Kopfbereich höher ist als das Bild), ist weich und breit (ein flacher Bogen über rund drei Viertel der Breite, höchstens 320 px hoch), hat keine Kante und trägt ein feines Korn wie das Licht (das verhindert sichtbare Stufen im dunklen Verlauf). Er ist höchstens so hell wie die schwächsten Strahlen (im Mittel höchstens rund 16 von 255) und pulsiert langsam zwischen halber und voller Stärke (eine Runde in 2,6 s). Beim Scrollen blendet er aus, zurück am Seitenanfang kommt er nach 4 Sekunden wieder. Sonst bleibt der Grund rein schwarz. Der frühere helle goldene Streifen bleibt weg.

**Handy:** Gleiche Regeln wie am Computer. Das Logo ist etwa 35 % der Bildbreite groß, Licht und Name sitzen im oberen Drittel (Logo-Mitte bei 30 % der Bildhöhe, im Stylesheet als `--licht-oben`, damit auch ohne Skript das ruhige Bild auf dem Namen sitzt), der Rest ist schwarz. Das Licht läuft dort ebenfalls live, mit 60 Proben, solange es flüssig bleibt. Die Szene misst mit, und zwar erst nach dem Auftritt (das Laden der Seite zählt nicht als Ruckeln) und nur an gezeichneten Bildern, in Fenstern von 30 Bildern: Dauert ein Bild im Schnitt länger als 30 ms, rechnet sie erst gröber (Pixeldichte 1,25, dann 1); ruckelt es auch dann noch (mindestens zwei Fenster in Folge), endet sie und es steht das **ruhige Bild** des Lichts (`public/kopf/licht-logo.jpg`, einmal aus der eigenen Szene aufgenommen, kein fremdes Bild; es atmet leicht über die Deckkraft). Dasselbe gilt, wenn das Gerät kein WebGL kann, nicht in 16-Bit-Zwischenbilder zeichnen kann oder die Grafik mittendrin ausfällt. Hat ein Gerät einmal geruckelt, versucht die Seite es bis zum Neuladen nicht noch einmal (nur im Arbeitsspeicher gemerkt, nichts wird im Browser abgelegt). Der Name aus Zeichen steht ruhig, Tippen löst die Welle aus. „Anrufen“ ist immer sichtbar.

**„Weniger Bewegung“:** Es steht das ruhige Bild, three.js wird nicht geladen, alles ist still.

**Ruhiges Bild neu aufnehmen**, wenn sich das Licht ändert (aus der laufenden Szene, ohne Zeichen und Kopfleiste, Quadrat um die Logo-Mitte mit 4,2-facher Logo-Höhe, in 1,5-facher Pixeldichte). Es ist als Datei eingebunden, seine Adresse trägt eine Prüfsumme: Ein neues Bild kommt sicher bei allen an.

**Offen für den nächsten Auftrag:** die Startanimation (derzeit nur: Licht blendet auf, der Name blendet von der Mitte nach außen ein, dann die eine Hinweis-Welle) und die Abschnitte unter dem Kopfbereich.

## 5. Bewegung (Bewegung hoch, Abweichung hoch, Dichte niedrig)
- **Kennzeichen „Das Licht folgt“:** Das Licht in der Form unseres Logos kippt als langer, schmaler Kegel zum Zeiger, der Schimmer wandert über den Namen; die Zeichen weichen aus, ein Klick schickt eine Welle hindurch (4d). Kein 3D-Zeichen mehr.
- Ein Bewegungs-Vokabular: Teile gleiten auf geraden Bahnen herein und rasten ein; Zeilen steigen aus einer Maske; Text färbt sich Wort für Wort.
- Kein Scroll-Zwang: normales Scrollen, kein Festhalten ganzer Bereiche, Animationen begleiten nur. `prefers-reduced-motion` zeigt alles sofort im Endzustand.
- **Handy leichter:** Licht mit 60 statt 80 Proben, ohne Maus, im oberen Drittel, ruhiges Bild nur, wenn es ruckelt; Name aus Zeichen steht still, Tippen löst die Welle aus (4d); kein Zeiger-Effekt, kürzerer Ladebildschirm, Tropfen als einfache Linie mit Punkt, Kopfleiste als schwebende Kachel, Anrufen-Knopf in voller Breite am Daumen.

## 6. Zustände und Mengen
- Formular: leer, Fehler am Feld, sendet, Erfolg (Texte aus `docs/texte.md`, gesiezt). Chat: zu, Sprechblase, offen, Übergabe, Support-Chat. Ladebildschirm: erster Besuch, Wiederkehr, reduzierte Bewegung, kein JavaScript (Seite sofort sichtbar).
- Texte siezen; Datenschutz und Impressum bleiben wortgleich; Chat siezt ohne Emojis.

## 7. Grenzen
- Keine Änderung an `app/api`, `lib` (außer Texten in `lib/content.ts` und reinen Anzeige-Texten im Chat-Widget), Metadaten, Statistik, Terminseiten-Logik, Weiterleitung. Alle Anker-IDs bleiben. Die sechs Leistungstitel bleiben wörtlich (Schnittstellenwerte für Formular, Chat und Notion, siehe `docs/funktionen.md` 4a); ein anderer Anzeigename nur als getrennter Anzeigetext.
- Nie: lila Verläufe, Inter, 3D-Blobs, KI-Standard-Kästchenraster, Emojis als Symbole, Glas überall, reines Schwarz ohne Farbe, erfundene Zahlen oder Stimmen. Keine fremde Seite 1:1.
- Leistung: Der Ladebildschirm darf die Seite nicht blockieren (Inhalt steht im HTML). Das Licht (three.js mit postprocessing) wird nachgeladen und rechnet nur, wenn es zu sehen ist; ruckelt es, steht ein Bild. Glas-Effekt nur an der schwebenden Kopfleiste.

## 8. Was die Code-Fehlersuche in Schritt 2 gelehrt hat (im Bau von Anfang an vermeiden)
- Keine kursive Serife in Riesen-Überschriften: Betonungswörter stehen aufrecht (von David bestätigt, 11.11.2026).
- Keine farbigen Leuchtschein-Schatten und keine runden Lichthöfe im Hintergrund: Licht als gerade Verläufe und Bänder. Ausnahmen, von David gewünscht (4d): das Licht-Logo im Kopfbereich, der sehr schwache Goldschein von unten als Scroll-Hinweis, das leichte Leuchten von Logo und „Anrufen“ in der Kopfleiste.
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
8. **Kopfbild:** Kern im Schriftzug (Schritt 4) – der Name riesig quer über die Mitte, das Logo genau darin. Die Ausführung mit 3D-Zeichen ist durch Entscheidung 9 ersetzt.
9. **Richtungswechsel (Zwischenauftrag vor Schritt 5):** Das 3D-Logo fällt weg. Kopfbereich in zwei Ebenen: hinten das Logo aus Licht, vorn der Name aus Zeichen-Teilchen (erster Wurf, Abschnitt 4c).
10. **Korrektur Kopfbereich (12.11.2026):** Licht und Name komplett neu gebaut (Licht mit God Rays, three.js mit postprocessing; Name als Zeichen-Raster, fast über die ganze Breite). Kopfbereich ohne Text, neue Navigationsleiste aus dunklem Glas mit Lichtpunkt, Scroll-Hinweis nur durch goldenes Licht von unten; Überschrift, Unterzeile und Telefon-Block vorerst direkt darunter (Abschnitt 4d). Stil: fast schwarz mit dunkelblauen Akzenten, Name grau, Gold beim Licht und bei wichtigen Wörtern, nichts Helles.
11. **Licht neu, mit dem fertigen Effekt (12.11.2026):** Der eigene Strahlen-Effekt, die Balken als Körper, die goldenen Kanten und der weiße Blitz sind gelöscht. Das Licht kommt jetzt vom fertigen `GodRaysEffect` der Bibliothek, richtig eingebunden: Wand mit Logo-Loch in der Szene, Lichtscheibe nur als Lichtquelle (Abschnitt 4d, Punkt 1). Zuerst auf der Testseite `/varianten/licht-test` mit madebyigor.com/lab abgeglichen, dann in den Kopfbereich gebaut. Am Handy läuft es live mit 60 Proben; das ruhige Bild steht nur, wenn es ruckelt, und bei „weniger Bewegung“.
12. **Licht, dritte Runde (12.11.2026): feiner und dunkler, wie das Vorbild.** Der Aufbau bleibt (Wand mit Logo-Loch, Lichtscheibe nur als Lichtquelle, fertiger `GodRaysEffect`). Neu: Lichtscheibe 100 Einheiten hinter der Wand (Kamera 14 davor), schmale, spitz auslaufende Öffnungen, Logo-Loch etwa so breit wie „TS“ im Namen, nur noch Gold (kein Weiß), Korn als `COLOR_DODGE` mit 0,2 Deckkraft, Strahlen enden auf etwa halber Strecke im reinen Schwarz, Grund des Kopfbereichs rein schwarz ohne blauen Verlauf, Atmen fast unmerklich. Am Handy: Logo 35 % der Bildbreite, im oberen Drittel, der Rest schwarz. **Entfallen:** das goldene Scroll-Licht von unten (kein goldener Streifen am unteren Rand). Einzelheiten in 4d, Punkt 1.
13. **Licht, Runde 3b (12.11.2026):** Die vier äußeren Öffnungen sind rund 11 % länger und in der Mitte 15 % breiter (Enden bleiben spitz; Stern, Gesamtbreite des Lochs und Licht-Werte unverändert). Der Scroll-Hinweis ist zurück, aber dezent: nach 4 Sekunden ein sehr schwacher, breiter Goldschein von unten, der langsam pulsiert und beim Scrollen ausblendet (4d).
