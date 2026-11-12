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
- **Schrift:** Sofia Sans Extra Condensed 800 in Großbuchstaben (Überschriften), Gloock aufrecht für die goldenen Betonungswörter, Sofia Sans für Fließtext, JetBrains Mono (seit 12.11.2026, vorher Cutive Mono) für den Namen aus Zeichen, die Zufallszeichen beim Verwürfeln und die Status- und Messangaben („Assistent bereit“, Orte, Nummern 01–06). Nicht Inter. Im Bau über `next/font` selbst ausliefern.
- **Bauteile:** schwebende Navigationsleiste aus dunklem Glas mit feinem Goldrand und weichem Licht hinter dem Glas (4e); runde Knöpfe mit Pfeil-Kreis (Hauptknopf Gold mit dunklem Pfeil-Kreis, Nebenknopf Haarlinie); Anruf-Leiste (Status, Nummer, „Jetzt anrufen“); als Schmuck das Licht-Logo und die Zeichen-Teilchen des Namens (4d). Keine Kästchenraster.
- **Disziplin aus der Auswahlrunde (von den abgelehnten Karten behalten):** leuchtendes Gold nur auf Bedienbarem; Licht folgt dem Zeiger; Zustände laufen als Welle, nie alles gleichzeitig; ein festes Lesemaß für Fließtext; am Handy entsteht das Logo aus Rasterpunkten.

## 4. Ablauf der Seite (alle Bereiche bleiben, Reihenfolge darf sich ändern)

**Stand seit 12.11.2026: die neue Seite** (`/varianten/kopf/kern`, `components/neu/seite/Seite.tsx`). Alle Anker bleiben (`#top #leistungen #ablauf #warum #ausbildung #kontakt`).
1. **Startanimation** (4f): Stern im Dunkeln, während alles lädt; dann geht das Licht an, dann fliegen die Zeichen ein. Ersetzt den Ladebildschirm mit Balken und „0 %“.
2. **Kopfbereich ohne Text** (4d): Licht-Logo, darunter der Name aus Zeichen; am unteren Rand der Scroll-Hinweis aus Licht (4g).
3. **Erste Aussage** (4h): Die Zeichen fliegen beim Scrollen auseinander, dann steht groß „Wir bauen in Stunden*, wofür Agenturen Wochen brauchen.“ (die Hauptüberschrift der Seite), darunter ein kurzer Satz und die Anruf-Leiste.
4. **Übergang** (4h): ein schräger Lichtstrahl, der sich zum Lichtstern auffächert, mit den vier Wörtern Persönlich · Schnell · Feste Preise · Aus Rhein-Main.
5. **Leistungen** (4h): sechs Karten mit kleinen Szenen und Zeichen-Nummern; „Anfragen“ wählt die Leistung im Formular vor (Funktion bleibt).
6. **So läuft es ab** (4h): drei Schritte, daneben die gewählte Nummer als großes Zeichen-Bild.
7. **Warum wir** (4h): Überschrift, Text, „Unser Versprechen“ als drei schräge Karten, darunter das schräg laufende Band.
8. **Ausbildung** („Über uns“): Zertifikate wie bisher, Überschrift mit Entschlüsselungs-Effekt.
9. **Kundenstimmen:** fertig gebaut, aber aus (Schalter `testimonials.aktiv` in `lib/content.ts`).
10. **Kontakt und Fuß:** Anruf-Leiste, WhatsApp, Formular (unverändert); stehender Riesenschriftzug mit Zeichen-Strahl und Lichtschein.
Überall: der Mauszeiger aus 4i (nur bei echter Maus).

**Ursprünglicher Plan vom 11.11.2026 (durch den Stand oben ersetzt, zum Nachlesen):**
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
- **Größe:** Das Logo-Loch ist am Computer rund 245 px breit (17 % der Bildbreite, höchstens 300 px). Am Handy rund 35 % der Bildbreite. Gemeint ist die sichtbare Öffnung: Die äußeren Ecken der vier Balken liegen genau auf dem Rand des Platzes (`.ag-ln__loch`).
- **Öffnungen wie im echten Logo (seit Runde 4):** Die vier Balken-Öffnungen haben Form und Winkel der Balken aus dem Logo (`components/neu/Marke.tsx`; der Balken ist dort rund 9,4 von 100 Einheiten breit, bei 245 px Logo-Breite knapp 25 px). Die Außenkante ist unverändert, die Innenkante liegt etwas weiter außen: Die Öffnung ist 85 % so breit wie der Balken (rund 21 px). Die beiden stumpfen Enden sind nur leicht angespitzt. Der Stern behält die Größe, die er seit der dritten Runde hat (er ist damit rund 17 % größer als im Logo). Die schmalen Splitter aus Runde 3 und 3b sind ersetzt: Mit ihnen war das Logo nicht eindeutig zu erkennen.
- **Licht direkt in den Öffnungen (seit Runde 4):** Derselbe `GodRaysEffect` läuft ein zweites Mal mit ganz kurzer Reichweite (30 Proben, Dichte 0,15, Abklingen 0,82, Gewicht 0,3, Belichtung 0,24), gespeist aus einer zweiten, gleichmäßigen Lichtscheibe an derselben Stelle (auch sie nicht in der Szene, nur Lichtquelle, ohne Speichen). Er zeigt das Licht in den Öffnungen selbst. Grund: Ein Balken liegt quer zu den Strahlen; mit den langen Strahlen allein verschwindet seine Außenkante im Schein, und man sieht vier Fächer statt vier Balken. Mit dem zweiten Durchgang leuchten Balken und Stern als Form (gedimmt, rund 205 von 255), die Speichen strahlen wie zuvor. David hat den zweiten Durchgang am 12.11.2026 bestätigt („Stern, Balkenbreite und der zweite Durchgang bleiben genau so“). Seine Stärke gleicht aus, wenn die langen Strahlen heller oder dunkler gestellt werden: Die Balken selbst dürfen nicht überstrahlen.
- **Lichtscheibe weit hinten:** Die Kamera steht 14 Einheiten vor der Wand (bei einem Logo von rund einem Viertel der Bildhöhe ergibt das 35° Sichtfeld), die Scheibe sitzt 100 Einheiten hinter der Wand auf deren Achse. Kippt die Wand nur wenig zur Maus (zur Seite höchstens rund 9°, nach oben und unten rund 11°; so zeigt der Kegel in den Bildecken wie beim Vorbild leicht steiler als die Diagonale), wandert die ferne Scheibe weit zur Gegenseite: Es entsteht ein langer, schmaler Lichtkegel zur Maus hin, auf der abgewandten Seite ist es schwarz. Die Scheibe ist groß (Radius 44), damit sie das Logo auch gekippt noch beleuchtet; im Umkreis des halben Logos um ihre Mitte leuchtet sie etwas schwächer (70 %), sonst überstrahlt der Stern alles andere.
- **Immer gleich groß und in der Blickachse:** Das Sichtfeld richtet sich nach der Bildhöhe, der Bildausschnitt wird auf die Logo-Mitte verschoben. So sieht das Licht bei jeder Bildgröße und an jeder Stelle gleich aus (am Handy sitzt es im oberen Drittel).
- **Farbe:** nur Gold (#f0a83a), in der Mitte der Scheibe ein Hauch heller (zu 60 % #ffd27a). Kein Weiß. Belichtung und Gewicht sind so niedrig, dass nichts überstrahlt.
- **Speichen:** Die Störung in der Lichtscheibe hängt nur an der Richtung um ihre Mitte und verändert sich langsam (Zeit × 0,5). Dadurch zerfällt das Licht in viele feine Speichen, die genau entlang der Strahlen laufen, auch im Lichtkegel.
- **Strahlen enden im Schwarz:** Sie laufen etwa bis zur halben Strecke zum Bildrand aus (am Computer rund 350 bis 430 px von der Logo-Mitte) und werden dann wirklich schwarz. Erreicht wird das über die Dichte des Effekts (0,77): Jeder Bildpunkt sucht nur auf gut drei Vierteln des Wegs zur Lichtquelle nach Licht.
- **Körnung wie beim Vorbild:** `NoiseEffect` mit `COLOR_DODGE` und 0,2 Deckkraft. Das Korn ist nur im Licht sichtbar, das Schwarz bleibt schwarz und sauber.
- **Grund rein schwarz:** Kopfbereich, Wand und Hintergrund der Szene haben denselben Ton (#000). Kein blauer Verlauf im Kopfbereich. Der Grund der Szene ist als Hintergrund gesetzt (nicht als Löschfarbe), damit die Farbe in den Löchern richtig ankommt. Direkt unter dem Kopfbereich geht das Schwarz ohne harte Linie in den Grund der Seite über.
- **Bewegung:** Das Licht pulsiert nur ganz leicht (± 2 %). Ohne Maus (Handy) wiegt sich die Wand kaum merklich von selbst; das Leben kommt aus den langsam wandernden Speichen.
- **Werte der Strahlen:** 80 Proben je Bildpunkt am Computer, 60 am Handy; Dichte 0,77, Abklingen 0,94, Gewicht 0,2, Belichtung 0,21 (Abklingen und Gewicht werden auf die Probenzahl umgerechnet, damit das Licht am Handy gleich aussieht); halbe Auflösung mit mittlerem Weichzeichner. **Maßstab sind die Strahlen aus dem Stand 8c455bd** (schmale Splitter, Belichtung 0,42): Seit die Öffnungen die Breite der echten Balken haben, fällt mehr Licht hindurch; mit 0,21 sind die langen Strahlen wieder so stark und so lang wie dort. Gemessen auf der Testseite (1440 × 900, Maus in der Mitte) als Mittelwert der Helligkeit (hellster Farbkanal) in Halbringen oberhalb des Logos, 130–200 / 200–300 / 300–400 px: 8c455bd 46 / 15 / 6, jetzt 46 / 16 / 6; über den ganzen Ring bei 130/160/200/250/300 px: 84/49/27/15/10 gegenüber 85/49/28/16/10; Reichweite jeweils rund 430 px. (Zwischenstand ea5125f mit Belichtung 0,15: 39 / 13 / 5, die Strahlen waren zu schwach und zu kurz.) Zum Vergleich das Vorbild, hellster Wert bei 100/130/160/200/250 px: 176/104/73/53/40.
- **Technik:** three.js mit `postprocessing`, wird nachgeladen (nicht bei „weniger Bewegung“). Rechnet nur, solange der Kopfbereich zu sehen ist, mit höchstens 2-facher Pixeldichte. Vor dem Auftritt wird nur einmal der dunkle Grund gezeichnet; in Ruhe genügt jedes zweite Bild.
- **Testseite:** `/varianten/licht-test` zeigt das Licht allein (schwarze Wand mit Logo-Loch, Lichtscheibe, God Rays, Filmkorn; ohne Name und Kopfleiste), in derselben Größe und Lage wie im Kopfbereich (am Handy im oberen Drittel). Dort wird es neben madebyigor.com/lab gelegt (Computer: Maus in der Mitte und links oben; Handy) und angeglichen. Was außer Farbe und Form bewusst anders ist: Die Strahlen enden früher im reinen Schwarz, und am Handy sitzt das Licht im oberen Drittel statt in der Mitte. Bei „weniger Bewegung“ steht auch dort nur das ruhige Bild. Wer das Licht ändert, gleicht zuerst dort ab.

**2 · Name aus Zeichen-Teilchen, deutlich größer**
- **Form und Raster:** „AGENTS GILT“ in unserer schmalen, fetten Schrift wird unsichtbar als Graustufenbild gezeichnet, dazu ein paar feine Strahlen nach außen (wie spritzende Tinte). Das Bild wird in ein Raster zerlegt: Spalten = max(12, Breite ÷ 6,5 px), **unter 768 px Breite ÷ 5 px**; die Zeilen im gleichen Verhältnis (Zelle 1,3-mal so hoch wie breit). Je Zelle zählt die Abdeckung `cov`: unter 0,08 fällt die Zelle weg. Dichte = `round(Grundwert × (0,45 + 0,55 × min(1, 1,6 × cov)))`, begrenzt auf 1 bis 9; der Grundwert ist 9 × die Stärke der Tinte in der Zelle (Buchstaben voll, Strahlen laufen aus). Deckkraft = Dichte/9 × 0,7. **Zeichen je Dichte (seit 12.11.2026, so in der Zeichen-Grafik des Vorbilds gezählt):** 9: `▓` (50 %), `▒` (30 %), `#` (20 %) · 8: `#` (45 %), `▒` (25 %), `=` (20 %), `+` (10 %) · 7: `+` (50 %), `-` (25 %), `=` (25 %) · 5–6: `. : - +` zu gleichen Teilen · 3–4: `. · :` · 1–2: `·` und `.`. Die dichten Stellen bestehen also aus den Block-Zeichen `▓` und `▒`: Aus ihnen entstehen die „Kacheln“, die übereinander zu Streifen schließen. Je Zelle wird das Zeichen einmal fest per Zufall gewählt, das Bild steht ruhig. **Am Handy derselbe Satz** (`▓` kommt ohnehin nur bei Dichte 9 vor); die Strahlen nach unten sind dort nur halb so lang. Damit der kleine Name am Handy mindestens so gut lesbar ist wie vorher, werden die Striche der Buchstaben dort vor dem Rastern um knapp eine halbe Zelle je Seite kräftiger gezeichnet (mehr Zellen erreichen die volle Dichte), und das Grau ist etwas heller. **Weggefallen:** der Grund in Zellgröße unter dichten Zeichen und das Nachziehen der feinen Zeichen. Pixeldichte der Zeichenfläche: am Handy höchstens 1,5, am Computer höchstens 2.
- **Größe:** rund drei Viertel der Bildbreite (76 %, höchstens 1340 px). Am Handy stehen die beiden Wörter übereinander (78 % der Bildbreite), damit der Name groß genug bleibt.
- **Farbe:** Grundfarbe grau. Wo das Licht des Logos die Zeichen trifft (bis etwa drei Logo-Halbmesser weit), leuchten sie golden, nahe am Stern einen Hauch heller. Kein Weiß. Kippt das Licht zur Maus, wandert der Schimmer in diese Richtung mit, zur Gegenseite reißt er ab. (Der frühere dunkle Saum um angestrahlte Zeichen ist seit 12.11.2026 weg.)
- **Lage (seit Runde 4):** Der Name steht mittig **unter** dem Licht-Logo, mit Abstand (am Computer rund 84 px, am Handy 9 % der Bildbreite). Nichts überdeckt sich; der Name liegt nicht mehr im Kern des Lichts. Die Strahlen laufen weich hinter seinem oberen Rand aus und färben die oberen Zeichen leicht golden. Licht-Logo und Name stehen als Gruppe mittig im Raum unter der Kopfleiste; am Handy liegt die Logo-Mitte bei 30 % der Bildhöhe. In niedrigen Fenstern wächst der Kopfbereich mit; unter 600 px Breite hält der gewöhnliche Schriftzug im Seitenfluss die Höhe für die zwei Zeilen frei, damit der Name unten nicht abgeschnitten wird. Damit ist „Kern im Schriftzug“ (das Logo genau im Namen) aufgegeben.
- **Zeichnen:** JetBrains Mono, Stärke 500 (über `next/font/google`, ersetzt Cutive Mono), gezeichnet mit 1,25 × Zellbreite. Jedes Zeichen liegt einmal fertig in einem Vorrat, in jeder Färbung, **mit 1,8 × Pixeldichte vorgerendert** und verkleinert gezeichnet: So bleibt es auch im Flug scharf, wenn es bis zu 1,8-fach groß ist. Die Deckkraft kommt erst beim Zeichnen dazu. Die Web-Fassung von JetBrains Mono liefert `▓` und `▒` nicht mit (sonst spränge je Gerät eine andere, viel breitere Ersatzschrift ein); deshalb werden diese beiden als Punktraster in Zeichenbreite über die ganze Zellhöhe selbst gezeichnet (`▒` Schachbrett, `▓` drei von vier Punkten) und sehen auf jedem Gerät gleich aus. Das ruhende Bild liegt als fertiges Bild im Zwischenspeicher; neu gezeichnet wird nur, solange sich etwas bewegt (oder das Licht sich sichtbar ändert). Ist der Kopfbereich nicht zu sehen, pausiert alles.
- **Ruhe-Flimmern:** Alle 140 ms wechseln 0,4 % der Zellen (mindestens eine) ihr Zeichen und beim nächsten Takt wieder zurück.
- **Maus (seit 12.11.2026 enger):** Nur Zeichen im Umkreis von 40 px weichen aus, um `(1 − Abstand/40) × 10 px`: ein kleiner Kreis eng um den Zeiger. (Das Vorbild rechnet mit 70 und 18 px; bei uns stehen die Zeichen in einer dichten Fläche, da wirkte das wie ein Loch.) Je Bild bewegt sich ein Zeichen um `1 − 0,75^(dt × 60)` zum Ziel hin (`dt` in Sekunden), also unabhängig von der Bildrate gleich schnell; Reste unter 0,05 px fallen weg. Nur bei echter Maus.
- **Welle beim Klick:** Klick oder Tippen im Bereich des Namens plus 40 px Rand, nicht auf Knöpfen oder Links, nicht während des Startflugs. Ausschlag je Zeichen (seit 12.11.2026 höchstens 40 px statt 56, Band 80 px statt 90): `40 × e^(−((Abstand − 1150 × t) / 80)²) × max(0, 1 − t/1,3)²` (t in Sekunden seit dem Klick): Der Ring schiebt die Zeichen nach außen und ist nach 1,3 s vorbei. Mehrere Wellen addieren sich (höchstens 4 gleichzeitig), zusammen aber nie mehr als 40 px. Getroffene Zeichen werden kräftiger (Deckkraft × (1 + Ausschlag/28), höchstens ganz deckend) und wechseln ab 7 px Ausschlag mit 25 % Wahrscheinlichkeit je Bild ihr Zeichen (auf 60 Bilder je Sekunde bezogen, läuft also auf jedem Bildschirm gleich). Wo Strahlen den Namen streifen, leuchten die Zeichen golden. Am Handy dazu eine kurze Vibration (6 ms, wo das Gerät es kann).
- **Startflug (seit 12.11.2026, nach dem Vorbild ksenpanchenko.com, Zahlen von dort):** Die Zeichen fliegen wie ein Schwarm von außerhalb des Bildes an ihren Platz. Startpunkt je Zeichen: in der Richtung von der Namensmitte (50 % der Breite, 42 % der Höhe) zu seinem Platz, ± 0,8 im Bogenmaß, 0,5 bis 1,4 × `u` weit draußen (`u` = 0,75 × die größere Bildschirmseite), dazu bis 0,25 × `u` nach oben versetzt. Dauer 2,2 s, Restweg `a = (1 − n)³` (am Anfang sehr schnell, am Ende weich). Reihenfolge: Schwelle `Y = clamp((0,62 − r) × 0,5 + 0,22 × Zufall, 0, 0,45)` mit `r` = Abstand zur Namensmitte (in Anteilen von Breite und Höhe des Namens), eigener Fortschritt `f = smoothstep((a − Y) / 0,55)` (1 = ganz außen, 0 = gelandet): Die Mitte landet zuerst, die Ränder zuletzt. Bahn: Platz + Startversatz × `f`. Unterwegs: Größe × (1 + 0,8 × f); solange 0,02 < f < 0,98, wechselt das Zeichen mit 7 % Wahrscheinlichkeit je Bild zu einem Zufallszeichen (`# + = - : . * / % ·`, ohne die Block-Zeichen; das Ruhe-Flimmern nimmt dieselben). Zeichen mehr als 40 px außerhalb des Bildes werden nicht gezeichnet. **Sichtbarkeit und Farbe unterwegs (seit 12.11.2026):** Fliegende Zeichen haben das Hellgrau des Namens, nur leicht wärmer; golden werden sie nur, wo sie unter dem Licht durchfliegen (Gold über den ganzen Bildschirm wirkte zu voll). Im letzten Fünftel des Wegs gleicht sich die Farbe der ihres Platzes an. Deckkraft = Ruhedeckkraft × (1 − f)^0,8, mindestens 0,22, sobald ein Zeichen losgeflogen und im Bild ist. Unter den Zeichen liegt nichts mehr (das frühere Feld in Zellgröße sah wie Pixel-Schnee aus); die Kacheln im Schwarm sind die Block-Zeichen selbst. So füllt bei 0,3 bis 0,9 s ein klar erkennbarer, aber ruhiger Schwarm das Bild. Maus und Klick wirken auf ein Zeichen erst, wenn es gelandet ist (f < 0,05). 250 ms nach dem Ende des Flugs läuft von selbst eine Welle aus der Mitte des Namens.
- **Takt des Starts (seit 12.11.2026, Einzelheiten in 4f):** Erst wird alles geladen, während nur der Stern schimmert. Dann geht das Licht an, und bei 40 % seiner Stärke (rund 0,5 s später) fliegen die Zeichen los. Flug und Welle rechnen mit der wirklich vergangenen Zeit, dauern also auch auf langsamen Geräten 2,2 s und 1,3 s.
- **Beim Scrollen (seit 12.11.2026, Einzelheiten in 4h):** Die Zeichen fliegen auf den Bahnen des Startflugs wieder auseinander; zurück am Seitenanfang setzt sich der Name wieder zusammen.
- **Nichts blitzt auf:** Vor dem Start ist vom Namen nichts zu sehen. Der gewöhnliche Schriftzug hält nur den Platz frei und nennt Vorleseprogrammen den Namen; er ist unsichtbar. Sichtbar wird er nur ohne Skript oder wenn der Browser keine Zeichenfläche hergibt.
- **Leistung:** Solange die Zeichen als Ganzes unterwegs sind (Startflug, Welle), wird das Licht dahinter höchstens 20-mal je Sekunde neu gezeichnet; sein Bild ändert sich dadurch nicht. So bleibt die Bewegung der Zeichen auch in großen Fenstern flüssig.
- **Technik:** 2D-Zeichenfläche, pausiert, wenn nicht sichtbar. Bei „weniger Bewegung“ blendet der Name einfach ein (0,6 s): kein Flug, kein Ausweichen, keine Welle, kein Flimmern.

**3 · Kopfbereich ohne Text**
Nur diese Dinge, kein weiterer Text, kein Hinweistext:
- Oben mittig das Licht-Logo, mittig darunter der Name.
- Oben links: das kleine, selbst leuchtende Logo und der Name in Grau (Einzelheiten in 4e).
- Oben Mitte: die Navigationsleiste aus Glas (4e).
- Oben rechts: „Anrufen“ als Glas-Knopf mit Goldrand (4e).
- Unten rechts: der Chat-Knopf als Glas-Kugel (4e).
- Direkt unter dem Kopfbereich steht seit 12.11.2026 die erste Aussage (4h). Am Handy bleibt der Anrufen-Knopf am Daumen weg, solange der Kopfbereich zu sehen ist („Anrufen“ steht dann in der Kopfleiste).

**Scroll-Hinweis:** seit 12.11.2026 der Lichtstreifen am unteren Rand (4g). Der frühere ruhende Goldschein von unten ist damit ersetzt.

**Handy:** Gleiche Regeln wie am Computer. Das Logo ist etwa 35 % der Bildbreite groß, das Licht sitzt im oberen Drittel (Logo-Mitte bei 30 % der Bildhöhe), der Name steht zweizeilig darunter (gleicher Zeichensatz wie am Computer, etwas kräftiger und heller gerastert), der Rest ist schwarz. Das Licht läuft dort ebenfalls live, mit 60 Proben, solange es flüssig bleibt. Die Szene misst mit, und zwar erst nach dem Auftritt (das Laden der Seite zählt nicht als Ruckeln) und nur an gezeichneten Bildern, in Fenstern von 30 Bildern: Dauert ein Bild im Schnitt länger als 30 ms, rechnet sie erst gröber (Pixeldichte 1,25, dann 1); ruckelt es auch dann noch (mindestens zwei Fenster in Folge), endet sie und es steht das **ruhige Bild** des Lichts (`public/kopf/licht-logo.jpg`, einmal aus der eigenen Szene aufgenommen, kein fremdes Bild; es atmet leicht über die Deckkraft). Dasselbe gilt, wenn das Gerät kein WebGL kann, nicht in 16-Bit-Zwischenbilder zeichnen kann oder die Grafik mittendrin ausfällt. Hat ein Gerät einmal geruckelt, versucht die Seite es bis zum Neuladen nicht noch einmal (nur im Arbeitsspeicher gemerkt, nichts wird im Browser abgelegt). Der Name aus Zeichen steht ruhig, Tippen löst die Welle aus. „Anrufen“ ist immer sichtbar.

**„Weniger Bewegung“:** Es steht das ruhige Bild, three.js wird nicht geladen; der Name blendet einfach ein, sonst ist alles still.

**Ruhiges Bild neu aufnehmen**, wenn sich das Licht ändert: von der Testseite `/varianten/licht-test` (dieselbe Szene, schwarzer Grund, ohne Name, Kopfleiste und Goldschein), Quadrat um die Logo-Mitte mit 4,2-facher Logo-Größe, in 1,5-facher Pixeldichte. Das Bild hängt im Kopfbereich am Platz des Logos (`.ag-ln__loch`, Breite 420 %) und sitzt deshalb immer auf dessen Mitte, auch ohne Skript. Es ist als Datei eingebunden, seine Adresse trägt eine Prüfsumme: Ein neues Bild kommt sicher bei allen an.

Die Abschnitte unter dem Kopfbereich stehen seit 12.11.2026 (4h).

## 4e. Kopfleiste und Chat-Knopf (neu gestaltet am 12.11.2026)

Was die Elemente tun, ist unverändert: „Anrufen“ ist ein `tel:`-Link, die Menüpunkte springen zu den Abschnitten, der Chat-Knopf öffnet den Chat. Neu sind nur Aussehen und Bewegung. Alles passt zum Licht-Logo und zur Schrift des Namens: dunkel, Gold, Licht, Zeichen. Code: `components/neu/Kopfleiste.tsx`, `ChatKnopf.tsx`, `glimmrand.ts`, `magnet.ts`, `verwuerfeln.ts`, Stile in `app/varianten/welt.css`.

**Glas, überall gleich** (`.ag-glas`): Schwarz mit 35 % Deckkraft, Unschärfe dahinter 16 px bei 140 % Sättigung, oben eine 1 px helle Lichtkante (Weiß 18 %), weicher Schatten nach unten (30 px, Schwarz 45 %). Gold nur aus den vorhandenen Tönen (`--gold`, `--gold-hell`).

**Glimmrand** (`.ag-glimm`, `glimmrand.ts`): ein 1 px feiner Goldrand, der nur dort aufglimmt, wo die Maus in der Nähe ist. Ein weicher Lichtfleck von rund 120 px sitzt an der Stelle des Rands, die der Maus am nächsten ist, und zieht je Bild 20 % nach. Ist die Maus weiter als 200 px weg, bleibt nur der ganz schwache Grundrand. Nur bei echter Maus, nicht bei „weniger Bewegung“.

**Mini-Licht** (`public/kopf/licht-mini.webp`): das große Licht-Logo als kleines Bild mit durchsichtigem Grund, einmal aus dem eigenen ruhigen Bild `licht-logo.jpg` abgeleitet (Schein und feine Speichen in Logo-Form, kein zweites WebGL, kein fremdes Bild). Es atmet im Takt des großen Lichts (`--atem`, 8,976 s = ein Atemzug der Licht-Szene). Neu aufnehmen, wenn sich das große Licht ändert.

**1 · Kopfleiste (oben Mitte)**
- Schwebendes Glas mit Glimmrand.
- Menüpunkte in der Schrift des Namens (schmal und fett, Großbuchstaben, etwas Buchstabenabstand), grau. Beim Drüberfahren werden sie golden und verwürfeln sich wie der Name (0,5 s, gleiche Regeln).
- **Licht hinter dem Glas (seit 12.11.2026, ersetzt den kleinen Lichtpunkt unter den Menüpunkten):** Hinter dem Glas der Leiste, also unter ihrer Unschärfe, liegt ein weiches goldenes Licht, so wie das Logo leuchtet: warmer Kern, nach außen weich auslaufend, rund 120 × 44 px, höchstens 30 % Deckkraft. Es folgt der Maus waagerecht (je Bild `1 − 0,82^(dt × 60)` zum Ziel hin), blendet beim Betreten der Leiste in 0,3 s ein und beim Verlassen in 0,5 s aus. Weil es hinter dem Glas liegt, wirkt es wie Licht, das durch Milchglas scheint; hinter der Schrift unter der Maus beginnt es leicht zu leuchten. Nur bei echter Maus, nicht bei „weniger Bewegung“ (wird das mittendrin umgestellt, geht das Licht sofort aus); ändert sich die Fenstergröße bei ruhender Maus, wird es neu eingemessen.
- **Aktiver Abschnitt:** Der Menüpunkt ist golden, und hinter dem Glas liegt dort dauerhaft ein ganz schwacher Schein (10 %). Das Maus-Licht überblendet ihn. Gleitet die Leiste weg, gehen beide Lichter sofort aus (sie sind nie ohne das Glas davor zu sehen).
- **Handy:** kein Maus-Licht. Im Menü ist der Punkt des aktiven Abschnitts golden, dahinter liegt nur der schwache Schein.
- Beim Scrollen: Nach dem ersten Bildschirm (ab 90 % der Bildhöhe) wird die Leiste etwas schmaler und dunkler (0,3 s). Beim Runterscrollen gleitet sie nach oben weg, beim Hochscrollen kommt sie wieder; das gilt erst ab 8 px Bewegung in eine Richtung. Hat ein Menüpunkt den Tastatur-Fokus, bleibt sie da.

**2 · Oben links: Logo und Name**
- Das kleine Logo ist das Mini-Licht: Es leuchtet selbst und atmet.
- „AGENTS GILT“ in der Schrift des Namens, grau. Beim Drüberfahren golden und verwürfelt (wie in 4d).

**3 · Oben rechts: Anrufen**
- Glas-Knopf mit Goldrand. Der Hörer sitzt in einem kleinen goldenen Lichtkreis, der langsam pulsiert (ein Drittel von `--atem`, also rund 3 s je Atemzug).
- Etwa alle 6 s läuft ein schmaler Lichtstreifen schräg (20°) über den Knopf, 0,8 s lang.
- Drüberfahren: leicht magnetisch (Fangbereich 100 px ab dem Rand, höchstens 8 px Versatz), der Goldrand glüht auf, „Anrufen“ verwürfelt sich.

**4 · Unten rechts: Chat-Knopf**
- Eine runde Glas-Kugel von 64 px mit heller Lichtkante oben und weichem Schatten; innen das Mini-Licht, das langsam atmet.
- Magnetisch (`magnet.ts`): Ist die Maus näher als 160 px, zieht es die Kugel zu ihr hin, um bis zu 35 % des Abstands und höchstens 28 px, je näher desto stärker. Das innere Licht bewegt sich 40 % mehr mit (Tiefenwirkung), die Kugel wächst bis 1,08. Entfernt sich die Maus, federt sie mit leichtem Überschwingen zurück (etwa 0,6 s). Nur bei echter Maus, bei „weniger Bewegung“ aus.
- Sprechblase: etwa 6 s nach „Laden fertig“ (oder beim Drüberfahren) wächst sie federnd aus dem Knopf (0,4 s, leichtes Überschwingen). Glas mit feinem Lichtrand; dahinter ein weicher goldener Schimmer, der langsam atmet und leicht wandert. Der Text besteht zuerst nur aus Zufallszeichen (`# + = - : . * / % ·`) und rastet über 0,7 s von links nach rechts ein (bis dahin 40 % Wechsel je Bild); die Breite bleibt fest. Sie lässt sich wegklicken und kommt in dieser Sitzung nicht wieder (auch nicht, wenn der Chat schon geöffnet wurde). Ein Klick auf den Text öffnet den Chat.
- Handy: gleicher Stil, ohne Magnet. Die Sprechblase steht über dem Knopf, erscheint einmal für 4 s und verschwindet von selbst.
- Technik: Der Chat selbst (`components/ChatWidget.tsx` im Stammlayout) ist unverändert. Sein eigener Knopf und seine Sprechblase sind in der neuen Welt nur ausgeblendet; die Kugel klickt genau diesen Knopf an. Ist der Chat offen oder das Menü, ruht die Kugel. Eine ungelesene Antwort zeigt ein kleiner goldener Punkt.

## 4f. Startanimation: erst laden, dann Licht, dann Zeichen (12.11.2026)

Sie ersetzt den Ladebildschirm mit den Balken (auch am Handy; dort erschien bis dahin noch der alte mit „0 %“). Ziel: Nichts ruckelt, weil alles fertig geladen ist, bevor sich etwas bewegt. Code: `components/neu/kopf/LichtName.tsx` (Ablauf), `lichtszene.ts` (Licht in Stufen), Stile in `app/varianten/kopf/kopf.css` („Startanimation“). Der Zustand steht als `data-start` am Kopfbereich: `warten` → `licht` → `landen` → `fertig`.

1. **Stern im Dunkeln (Warten):** Der Bildschirm ist schwarz, in der Mitte schimmert nur der Stern des Logos, ohne Balken und Strahlen. Er atmet langsam (Deckkraft 0,15–0,3, eine Runde in 2,5 s). Er ist ein vorgerendertes Bild ohne WebGL (`public/kopf/licht-stern.webp`, einmal aus der eigenen Licht-Szene aufgenommen: Testseite `/varianten/licht-test?nur=stern`, Quadrat mit 1,5-facher Logo-Größe). Er hängt am Platz des Logos und sitzt deshalb genau dort und genau so groß wie der Stern der Szene.
2. **Im Hintergrund wird alles fertig gemacht,** jede Phase wird gemessen (`performance.measure`, Namen `ag-start:…`):
   - **Schriften:** Namens-Schrift, JetBrains Mono, Serifen- und Textschrift über `document.fonts.load` auf echte Zeichen (höchstens 2,5 s).
   - **Zeichen:** Raster und Vorrat des Namens bauen.
   - **Licht:** Szene holen (`licht-laden`; sie wird schon geholt, während die Seite startet), anlegen, Shader übersetzen und Bilder unsichtbar vorzeichnen (`licht-anlegen`).
   - **Bilder:** Bilder der ersten drei Bildschirme dekodieren (`img.decode()`), dazu das kleine Licht von Logo und Chat-Knopf.
   - **Probe:** 10 Bilder hintereinander unter 20 ms.
3. **Weiter geht es, wenn alles fertig ist,** frühestens 0,8 s und spätestens 4 s nach dem ersten Bild der Seite. (Im Auftrag stehen als Mindestzeit einmal 0,8 s und einmal 2 s; gebaut sind 0,8 s, weil nur damit alles nach rund 3,5 s steht. Die Zahl steht als `WARTEN_MIN` in `LichtName.tsx`.)
4. **Das Licht geht an (1,4 s, am Handy 1 s),** wie ein Dimmer: zügig, weich auslaufend. Die Szene zeigt zuerst nur den Stern, genau so hell wie sein Bild gerade ist (kein Sprung; das Bild blendet in 0,35 s aus). Dann öffnen sich die vier Balken von ihrer Mittellinie aus (erst feine Schlitze, dann volle Breite, in der ersten Hälfte), danach wachsen die langen Strahlen nach außen (Reichweite und Stärke). Nichts Weißes.
5. **Die Zeichen fliegen bei 40 % der Lichtstärke** (0,46 s nach Beginn des Lichts; am Handy 0,33 s). Der Startflug läuft unverändert (2,2 s); 250 ms nach der Landung kommt die Welle aus der Namensmitte.
6. **Kopfleiste, „Anrufen“ und Chat-Knopf** erscheinen 1,1 s nach Flugbeginn weich (0,9 s), während die Zeichen landen. Bis dahin sind sie verborgen.
7. **Die Seite leuchtet selbst:** Die goldenen Wörter der Überschriften und die Anruf-Leiste haben einen dezenten warmen Schein (`text-shadow` bzw. `box-shadow`, von David gewünscht).

**Das Licht schaut erst zur Maus, wenn es hell ist:** Während der Startanimation steht es ruhig in der Mitte (die Mausposition wird nur gemerkt). Ist es ganz an, dreht es sich weich zur Maus (dieselbe Nachführung wie sonst, rund 0,8 s) und folgt ihr danach wie bisher.

**Regeln:**
- Klick, Taste oder Scrollen überspringt: Alles steht sofort.
- Bei jedem Laden der Seite komplett, auch bei weiteren Besuchen.
- „Weniger Bewegung“: kein Stern, kein Warten; es steht das ruhige Bild, der Name und die Kopfleiste blenden ruhig ein.
- Lädt die Licht-Szene nach 4 s noch, fliegen die Zeichen trotzdem; der Stern schimmert weiter, und das Licht geht normal an, sobald die Szene da ist. Kann sie gar nicht starten (kein WebGL, Gerät ruckelt), blendet das ruhige Bild ein.
- Ohne Skript: Schriftzug, ruhiges Bild und Kopfleiste stehen sofort. Startet das Skript nicht, erscheint die Kopfleiste nach 8 s von selbst.
- **Zurück nach oben:** Wer weiter als 60 % weggescrollt war und zurückkommt, sieht das Licht kurz etwas heller aufleuchten (bis +28 %, 0,2 s an, 0,9 s aus); die Zeichen nahe am Licht leuchten mit.

**Gemessen am 12.11.2026** (fertige Fassung `next start` auf demselben Rechner, Apple M1, sichtbares Chrome ohne Bildaufnahme; Zeiten in Millisekunden ab dem ersten Bild der Seite):

| Fenster | Schriften | Zeichen | Licht (holen + anlegen) | Bilder | Probe | Stern steht | alles steht | Bilder/s: Licht an · Flug · Welle · Scrollen |
|---|---|---|---|---|---|---|---|---|
| 1440 × 900, erster Besuch | 103 | 66 | 472 (283 + 189) | 187 | 118 | 805 | 3457 | 163 · 149 · 102 · 164 |
| 1440 × 900, aus dem Zwischenspeicher | 33 | 42 | 226 (111 + 115) | 88 | 135 | 804 | 3458 | 161 · 149 · 124 · 157 |
| 1440 × 900, Maus bewegt sich | 73 | 42 | 356 | 137 | 84 | 803 | 3454 | 161 · 129 · 102 · 165 |
| 2560 × 1440 | 66 | 48 | 387 | 123 | 167 | 801 | 3458 | 80 · 109 · 84 · 113 |
| 1440 × 900, doppelte Pixeldichte | 60 | 42 | 504 | 117 | 213 | 803 | 3461 | 50 · 125 · 89 · 81 |
| Handy 390 × 844, 4-fache Prozessorbremse | 225 | 69 | 531 | 499 | 288 | 1245 | 3766 | 126 · 97 · 72 · 128 |

Am Handy steht alles etwas früher, wenn nichts bremst (das Licht braucht dort nur 1 s): ohne Bremse nach rund 3,3 s. Mit Bildaufnahme und in der Entwicklungsfassung sind alle Zeiten deutlich länger; dort nicht messen.

## 4g. Scroll-Hinweis: Lichtstreifen am unteren Rand (12.11.2026)

Code: `components/neu/seite/ScrollHinweis.tsx`, Stile in `kopf.css`. Kein Text, kein Pfeil.
- **Wann:** Steht man nach dem Ende der Startanimation 4,5 s ganz oben, ohne zu scrollen.
- **Aussehen:** Ein weicher goldener Lichtfleck (240 px breit, 60 px hoch, nach oben auslaufend, höchstens 25 % Deckkraft) gleitet in 2,4 s von links unten nach rechts unten. Danach pulsiert der ganze untere Rand einmal leicht (höchstens 13 %). Das wiederholt sich alle 6 s, höchstens dreimal.
- **Weg:** Beim ersten Scrollen, Wischen oder Tastendruck blendet er in 0,2 s aus und kommt in dieser Sitzung nicht wieder (`sessionStorage`, Merker `ag-scroll-hinweis-weg`).
- **Handy:** gleich, der Fleck ist 160 px breit. **„Weniger Bewegung“:** nur ein ruhiger, schwacher Schein am Rand, nichts gleitet.

## 4h. Beim Runterscrollen: die Abschnitte der neuen Seite (12.11.2026)

Code: `components/neu/seite/` (Seite, Aussage, Uebergang, Leistungen, AblaufNummern, Warum, FussStrahl, Entschluesselt, ZeichenNummer, `zeichenbild.ts`), Stile in `components/neu/seite/seite.css`. Die Zahlen zum Auseinanderfliegen und zu den Zeichen-Bildern stammen aus dem Code von ksenpanchenko.com; umgesetzt ist alles selbst.

**1 · Die Zeichen fliegen auseinander** (`zeichenname.ts`, Methode `rollen`)
- Scroll-Fortschritt `s = scrollY ÷ (0,9 × Bildschirmhöhe)`, begrenzt auf 0–1.
- Gemeinsamer Antrieb mit dem Startflug: `l = max(s, Restweg des Startflugs)`; jedes Zeichen nutzt `f = smoothstep((l − Y) / 0,55)` mit demselben `Y` wie im Startflug. Die Ränder gehen zuerst, die Mitte zuletzt.
- Richtung und Weite: dieselben Startversätze wie beim Startflug. Unterwegs gleiche Größe, Farbe, Deckkraft und gleicher Zeichenwechsel. Maus und Welle sind dabei aus. Beim Hochscrollen setzt sich der Name genauso wieder zusammen.
- Die Zeichenfläche scrollt mit der Seite mit (nichts hinkt nach). Solange gescrollt ist, reicht sie 90 % der Bildschirmhöhe unter den Kopfbereich hinaus, damit die Zeichen dort zu sehen sind; in Ruhe ist sie so hoch wie der Kopfbereich. Steht die Seite mitten im Auseinanderfliegen still, genügt ein neues Bild alle 80 ms.
- Das Licht tritt beim Scrollen zurück (bis auf 14 %).

**2 · Die erste Aussage** (`Aussage.tsx`): „Wir bauen in Stunden*, wofür Agenturen Wochen brauchen.“ als Hauptüberschrift, mittig, mit Entschlüsselungs-Effekt; „Stunden“ golden mit Schein. Darunter der kurze Satz, die Anruf-Leiste und die Fußnote zum Sternchen (bleibt wörtlich).

**Entschlüsselungs-Effekt** (`Entschluesselt.tsx`): Kommt eine Überschrift ins Bild, laufen ihre Buchstaben als Zufallszeichen (`# + = - : . * / % ·`, JetBrains Mono) durch und rasten von links nach rechts ein (0,9 s, 40 % Wechsel je Bild). Geht über mehrere Zeilen und über Wörter in anderer Schrift; der echte Text bleibt für Vorleseprogramme stehen. Texte laufen zeilenweise ein (`Zeilen.tsx`). Bei „weniger Bewegung“ steht alles sofort.

**3 · Übergang zu den Leistungen** (`Uebergang.tsx`): derselbe Licht-Aufbau wie im Kopfbereich (Wand mit Öffnung, Lichtscheibe dahinter, `lichtszene.ts` mit `strahl`). Die Öffnung ist zuerst ein schmaler, schräger Schlitz (0,09 × 2,9 Logo-Einheiten, 32° geneigt). Beim Scrollen zieht er sich in die Mitte zurück, während dort der Stern aus ihm herauswächst. Um das Licht schweben die vier Wörter. Die Szene wird erst nach der Startanimation angelegt, wenn der Abschnitt bis auf eine halbe Bildschirmhöhe heran ist, und rechnet nur, solange er zu sehen ist. Ersatz bei „weniger Bewegung“ und ohne WebGL: ein ruhiger schräger Lichtstrahl aus dem Stylesheet.

**4 · Leistungen mit kleinen Szenen** (`Leistungen.tsx`): sechs Karten. Jede hat oben eine gezeichnete Szene aus mehreren Ebenen (kleine Kärtchen, Sprechblasen, Kalender, Hörer, Häkchen, Zahlen).
- Jede Ebene hat eine Ruhe-Lage und eine Hover-Lage (Versatz, Drehung, Deckkraft). Beim Drüberfahren springen die Ebenen federnd in die Hover-Lage: 0,9 s mit leichtem Überschwingen (`cubic-bezier(0.34, 1.45, 0.5, 1)`), jede Ebene 35 ms nach der vorigen. Zahlen zählen dabei hoch (1,1 s, weich auslaufend).
- Szenen: **Websites** Browserfenster, „Anfragen +38 %“ zählt hoch, die Linie steigt · **Chatbot** Frage, Tipp-Punkte, die Antwort erscheint · **Voice-Agent** der Hörer klingelt, „Es klingelt – Ihr Assistent nimmt ab“, dann „Termin eingetragen“ mit Häkchen · **Terminbuchung** Kalender, ein Tag leuchtet golden, „Gebucht“ · **Automatisierungen** Kärtchen ordnen sich, „12 Stunden gespart“ zählt hoch · **KI-Beratung** die Checkliste hakt sich ab. Zahlen tragen das Schild „Beispiel“.
- **Nummer der Karte (01–06)** als kleines Zeichen-Bild (150 × 92 px, Zellen 6 × 9,5 px). Beim Drüberfahren zerfällt sie zu Staub und setzt sich nach 260 ms neu zusammen.
- **Karte beim Drüberfahren:** hebt sich um 6 px, der Schatten wird weicher, der Goldrand glimmt nahe der Maus (`glimmrand.ts`).
- **Handy:** Die Szene spielt einmal, wenn die Karte zu 55 % im Bild ist. **„Weniger Bewegung“:** sofort das Endbild.

**Zeichen-Bilder** (`zeichenbild.ts`; für die Karten-Nummern, die Ablauf-Nummern und den Strahl im Fuß):
- Die Form wird unsichtbar gezeichnet (Nummern in kursiver Serifenschrift) und in Zellen von 7 × 11 px zerlegt. Zeichen je Abdeckung: über 0,75 `▓ # %`, über 0,5 `# % = ▒`, über 0,28 `= * + /`, sonst `+ :`, unter 0,1 leer. Drei Tonstufen mit Deckkraft 1 / 0,9 / 0,62.
- Teilchen: 1,25-mal so viele wie Zellen der größten Form. Überzählige schweben als Staub (`: + . · -`, Deckkraft 0,35) zufällig im Feld; jedes dritte bleibt nahe an der Form (±20 / ±18 px).
- Wechsel: Jedes Teilchen fliegt auf einer quadratischen Bézier-Kurve zu seiner neuen Zelle (Kontrollpunkt: Mitte plus Zufall ±70 / ±55 px), Verzögerung 0–380 ms, Dauer 650–1100 ms, Kurve `1 − (1 − t)³`. Unterwegs wechselt das Zeichen mit 35 % pro Bild, am Ziel steht das richtige.
- Erscheinen: Ist das Feld zu 60 % im Bild, setzt sich die Form aus dem Staub zusammen; scrollt sie nach oben aus dem Bild, zerfällt sie wieder.
- Maus: Zeichen im Umkreis von 34 px verwürfeln sich (45 % pro Bild) und rasten nach `380 + (1 − Abstand/34) × 520 + 0–260` ms wieder ein.
- „Pro Bild“ gilt für 60 Bilder je Sekunde. Die Block-Zeichen sind wie im Namen als Punktraster gezeichnet.

**5 · So läuft es ab** (`AblaufNummern.tsx`): links die Nummer des gewählten Schritts als großes Zeichen-Bild mit „/ 03“, rechts die drei Schritte. Alle drei sind immer zu lesen; ein Klick auf einen Schritt lässt die Zeichen zur neuen Nummer umfliegen. (Der Gold-Tropfen auf der Lichtbahn ist damit ersetzt.)

**6 · Warum wir mit „Unser Versprechen“** (`Warum.tsx`): Überschrift und Text, dann drei leicht schräge Karten (−2,2°, 1,5°, −1,1°): Persönlich, Schnell, Feste Preise. Beim Drüberfahren richtet sich die Karte gerade aus, hebt sich um 10 px und federt (0,6 s, leichtes Überschwingen); die anderen werden blasser (60 %). Darunter läuft ein um 2° schräges Band mit den vier Wörtern, getrennt durch den Stern des Logos (eine Runde in 46 s).

**7 · Kundenstimmen** (`Stimmen` in `Warum.tsx`): fertig gebaut (drei Karten), aber aus. Der Schalter ist `testimonials.aktiv` in `lib/content.ts`; dort stehen bis dahin nur Platzhalter, die nie auf der Seite erscheinen.

**8 · Kontakt und Fuß:** Kontakt unverändert (Anruf-Leiste, WhatsApp, Formular). In der Fußleiste liegt über dem stehenden Riesenschriftzug ein kleiner Strahl aus Zeichen (`FussStrahl.tsx`, dieselbe Technik) mit weichem Lichtschein dahinter.

## 4i. Mauszeiger (12.11.2026)

Code: `components/neu/seite/Zeiger.tsx`, Stile in `seite.css`. Nur bei echter Maus, nicht am Handy, nicht bei „weniger Bewegung“. In Eingabefeldern und über dem Chat-Fenster gilt der gewöhnliche Zeiger.
- **Normal:** ein kleiner goldener Punkt (8 px), dem ein dezenter goldener Schein folgt (je Bild `1 − 0,8^(dt × 60)`).
- **Über Links und Knöpfen:** Der Punkt wird zu einem feinen Ring.
- **Über Karten und Bildern** (`data-zeiger="ansehen"`): eine Glasblase von 56 px mit „Ansehen“. Durchsichtig, mit heller Lichtkante oben, feinem Goldschimmer am Rand und weichem Schatten; der Text hat einen leichten Schatten. Wo der Browser es kann (Chrome, Edge), verzerrt eine Linse den Hintergrund leicht (SVG-Filter `#ag-linse` als `backdrop-filter`); sonst bleibt es bei weichgezeichnetem Glas. Sie sitzt genau auf der Maus (wird im Maus-Ereignis selbst gesetzt, ohne Nachziehen), wächst federnd in 0,35 s und wird beim Klicken kurz kleiner.

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
- Leistung: Der Ladebildschirm darf die Seite nicht blockieren (Inhalt steht im HTML). Das Licht (three.js mit postprocessing) wird nachgeladen und rechnet nur, wenn es zu sehen ist; ruckelt es, steht ein Bild. Glas-Effekt nur an Kopfleiste, „Anrufen“, Chat-Knopf und an der Glasblase des Mauszeigers.

## 8. Was die Code-Fehlersuche in Schritt 2 gelehrt hat (im Bau von Anfang an vermeiden)
- Keine kursive Serife in Riesen-Überschriften: Betonungswörter stehen aufrecht (von David bestätigt, 11.11.2026).
- Keine farbigen Leuchtschein-Schatten und keine runden Lichthöfe im Hintergrund: Licht als gerade Verläufe und Bänder. Ausnahmen, von David gewünscht (4d–4i): das Licht-Logo im Kopfbereich, der Lichtstreifen als Scroll-Hinweis, das leichte Leuchten von Logo und „Anrufen“ in der Kopfleiste, der warme Schein an den goldenen Wörtern der Überschriften und an der Anruf-Leiste („die Seite leuchtet selbst“), der Lichtschein hinter dem Zeichen-Strahl im Fuß.
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
8. **Kopfbild:** Kern im Schriftzug (Schritt 4) – der Name riesig quer über die Mitte, das Logo genau darin. Die Ausführung mit 3D-Zeichen ist durch Entscheidung 9 ersetzt. Die Anordnung „Logo genau im Namen“ ist durch Entscheidung 14 ersetzt.
9. **Richtungswechsel (Zwischenauftrag vor Schritt 5):** Das 3D-Logo fällt weg. Kopfbereich in zwei Ebenen: hinten das Logo aus Licht, vorn der Name aus Zeichen-Teilchen (erster Wurf, Abschnitt 4c).
10. **Korrektur Kopfbereich (12.11.2026):** Licht und Name komplett neu gebaut (Licht mit God Rays, three.js mit postprocessing; Name als Zeichen-Raster, fast über die ganze Breite). Kopfbereich ohne Text, neue Navigationsleiste aus dunklem Glas mit Lichtpunkt, Scroll-Hinweis nur durch goldenes Licht von unten; Überschrift, Unterzeile und Telefon-Block vorerst direkt darunter (Abschnitt 4d). Stil: fast schwarz mit dunkelblauen Akzenten, Name grau, Gold beim Licht und bei wichtigen Wörtern, nichts Helles.
11. **Licht neu, mit dem fertigen Effekt (12.11.2026):** Der eigene Strahlen-Effekt, die Balken als Körper, die goldenen Kanten und der weiße Blitz sind gelöscht. Das Licht kommt jetzt vom fertigen `GodRaysEffect` der Bibliothek, richtig eingebunden: Wand mit Logo-Loch in der Szene, Lichtscheibe nur als Lichtquelle (Abschnitt 4d, Punkt 1). Zuerst auf der Testseite `/varianten/licht-test` mit madebyigor.com/lab abgeglichen, dann in den Kopfbereich gebaut. Am Handy läuft es live mit 60 Proben; das ruhige Bild steht nur, wenn es ruckelt, und bei „weniger Bewegung“.
12. **Licht, dritte Runde (12.11.2026): feiner und dunkler, wie das Vorbild.** Der Aufbau bleibt (Wand mit Logo-Loch, Lichtscheibe nur als Lichtquelle, fertiger `GodRaysEffect`). Neu: Lichtscheibe 100 Einheiten hinter der Wand (Kamera 14 davor), schmale, spitz auslaufende Öffnungen, Logo-Loch etwa so breit wie „TS“ im Namen, nur noch Gold (kein Weiß), Korn als `COLOR_DODGE` mit 0,2 Deckkraft, Strahlen enden auf etwa halber Strecke im reinen Schwarz, Grund des Kopfbereichs rein schwarz ohne blauen Verlauf, Atmen fast unmerklich. Am Handy: Logo 35 % der Bildbreite, im oberen Drittel, der Rest schwarz. **Entfallen:** das goldene Scroll-Licht von unten (kein goldener Streifen am unteren Rand). Einzelheiten in 4d, Punkt 1.
13. **Licht, Runde 3b (12.11.2026):** Die vier äußeren Öffnungen sind rund 11 % länger und in der Mitte 15 % breiter (Enden bleiben spitz; Stern, Gesamtbreite des Lochs und Licht-Werte unverändert). Der Scroll-Hinweis ist zurück, aber dezent: nach 4 Sekunden ein sehr schwacher, breiter Goldschein von unten, der langsam pulsiert und beim Scrollen ausblendet (4d).
14. **Licht und Aufbau, Runde 4 (12.11.2026):** (a) Logo eindeutig erkennbar: Die vier Balken-Öffnungen haben wieder Form und Winkel der Balken des echten Logos, 85 % so breit, Enden nur leicht angespitzt; Stern und Gesamtbreite des Lochs (rund 245 px) unverändert. Die Helligkeit der Speichen ist nur über die Belichtung ausgeglichen. Dazu läuft derselbe Bibliotheks-Effekt ein zweites Mal mit kurzer Reichweite und zeigt das Licht direkt in den Öffnungen; ohne ihn lösen sich die Außenkanten der Balken in den Strahlen auf. (b) Der Name steht jetzt unter dem Licht, auch am Computer: Licht-Logo oben mittig, Name mittig darunter mit Abstand, rund 76 % der Bildbreite; nichts überdeckt sich. Am Handy besteht der Name nur aus feinen Zeichen. Der Scroll-Hinweis bleibt am unteren Rand (4d).
15. **Strahlen wieder wie in 8c455bd (12.11.2026):** Stern, Balkenbreite und der zweite Durchgang bleiben. Die langen Strahlen waren seit der Senkung der Belichtung auf 0,15 zu schwach und zu kurz; der erste Durchgang steht jetzt auf 0,21, der zweite zum Ausgleich auf 0,24. Maßstab und Messung stehen in 4d unter „Werte der Strahlen“.
16. **Zeichen-Name mit Startflug, Maus und Welle (12.11.2026):** Licht, Stern, Balken und Strahlen bleiben wie in 66da8be. Der Name ist nach den Zahlen des Vorbilds ksenpanchenko.com neu gebaut (Raster, Dichte, Deckkraft, Startflug vom Rand in 2,2 s, Maus, Welle; eigene Umsetzung). Am Handy ist eine Zelle 5 px breit, die Buchstaben wirken geschlossen. Vor dem Start blitzt nichts auf. Der Name oben links und die Menüpunkte werden beim Drüberfahren golden und verwürfeln sich 0,5 s lang (4d).
17. **Startflug sichtbarer (12.11.2026):** Fliegende Zeichen sind heller und warm getönt, ihre Deckkraft unterwegs ist höher (Exponent 0,8 statt 1,6, mindestens 0,22), darunter liegt ein schwaches Feld. Angeglichen an die Wirkung des Vorbilds, nicht an dessen Formel. Takt, Bahnen, Reihenfolge, Welle und der Name am Handy bleiben. Der Hinweis „1 Issue“ in der Entwicklungsansicht bleibt, wie er ist: Er kommt von einer Erweiterung in Davids Browser.
18. **Kopfleiste und Chat-Knopf neu gestaltet (12.11.2026):** einheitliches Glas, Glimmrand nahe der Maus, Menüpunkte in der Schrift des Namens, das kleine Logo leuchtet selbst (Mini-Licht), „Anrufen“ mit pulsierendem Lichtkreis und Lichtstreifen, Chat-Knopf als magnetische Glas-Kugel mit Sprechblase aus einrastenden Zeichen. Funktionen unverändert (Abschnitt 4e).
19. **Zeichen wie beim Vorbild, Maus enger, Licht hinter dem Glas (12.11.2026):** Licht, Takt des Startflugs, Anrufen und Chat-Knopf bleiben wie in d390d4a. (a) Der Name wirkt nicht mehr „verpixelt“: Schrift JetBrains Mono 500 statt Cutive Mono, die dichten Stellen bestehen aus den Block-Zeichen `▓` und `▒` (Zeichen je Dichte wie beim Vorbild gezählt), am Handy derselbe Satz. Weg sind das Feld unter fliegenden Zeichen, der Grund unter dichten Zeichen am Handy und der dunkle Saum. Jedes Zeichen ist mit 1,8 × Pixeldichte vorgerendert und bleibt im Flug scharf. Fliegende Zeichen sind hellgrau, golden nur unter dem Licht. (b) Maus: Umkreis 40 px, Ausweichen bis 10 px. (c) Welle: Ausschlag höchstens 40 px, Band 80 px; Tempo und Dauer bleiben. Alles läuft unabhängig von der Bildrate. (d) Kopfleiste: Der kleine Lichtpunkt ist weg; dafür liegt hinter dem Glas ein weiches goldenes Licht, das der Maus folgt, und hinter dem aktiven Menüpunkt (golden) ein schwacher Schein (4d, 4e).
20. **Startanimation (12.11.2026):** erst laden (Stern im Dunkeln), dann Licht (Dimmer: Balken, dann Strahlen), dann Zeichen bei 40 % Lichtstärke; Kopfleiste und Knöpfe erscheinen beim Landen. Das Licht folgt der Maus erst, wenn es hell ist. Klick, Taste oder Scrollen überspringt. Ersetzt den Ladebildschirm mit Balken. Gemessene Ladezeiten in 4f.
21. **Scroll-Hinweis (12.11.2026):** Lichtstreifen am unteren Rand statt des ruhenden Goldscheins (4g).
22. **Rest der Seite (12.11.2026):** Zeichen fliegen beim Scrollen auseinander; erste Aussage mit Entschlüsselungs-Effekt; Lichtstrahl als Übergang; Leistungen als Karten mit kleinen Szenen und Zeichen-Nummern; Ablauf mit großen Zeichen-Nummern; „Unser Versprechen“ mit schrägen Karten und Band; Kundenstimmen gebaut, aber aus; Zeichen-Strahl im Fuß (4h). Damit ist Entscheidung 1 („Kundenstimmen ganz weglassen“) so geändert: gebaut, aber ausgeschaltet. Die Zufallszeichen in JetBrains Mono auch bei „Anrufen“ und in der Sprechblase bleiben (Davids Entscheidung).
23. **Mauszeiger (12.11.2026):** Punkt mit Schein, Ring über Links, Glasblase „Ansehen“ über Karten und Bildern (4i).
