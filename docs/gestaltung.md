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

> **Stand 13.11.2026:** Zeiten, Aufbau des Lichts, Probe und das Hindrehen zur Maus sind geändert, siehe **4j, Punkte 0 und 1**. Was hier steht und dort nicht genannt ist, gilt weiter.

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

> **Stand 13.11.2026:** Der wandernde Lichtfleck ist durch die Lichtleiste ersetzt, siehe **4j, Punkt 2**.
> **Stand 14.11.2026:** Wann sie kommt, wie lange sie atmet und wie sie verschwindet, steht in **4m, Punkt 3** (3 s nach dem Start, atmet bis zum Scrollen, blendet in 1,2 s aus).

Code: `components/neu/seite/ScrollHinweis.tsx`, Stile in `kopf.css`. Kein Text, kein Pfeil.
- **Wann:** Steht man nach dem Ende der Startanimation 4,5 s ganz oben, ohne zu scrollen.
- **Aussehen:** Ein weicher goldener Lichtfleck (240 px breit, 60 px hoch, nach oben auslaufend, höchstens 25 % Deckkraft) gleitet in 2,4 s von links unten nach rechts unten. Danach pulsiert der ganze untere Rand einmal leicht (höchstens 13 %). Das wiederholt sich alle 6 s, höchstens dreimal.
- **Weg:** Beim ersten Scrollen, Wischen oder Tastendruck blendet er in 0,2 s aus und kommt in dieser Sitzung nicht wieder (`sessionStorage`, Merker `ag-scroll-hinweis-weg`).
- **Handy:** gleich, der Fleck ist 160 px breit. **„Weniger Bewegung“:** nur ein ruhiger, schwacher Schein am Rand, nichts gleitet.

## 4h. Beim Runterscrollen: die Abschnitte der neuen Seite (12.11.2026)

> **Stand 13.11.2026:** Geändert sind die erste Aussage (Punkt 2), die Überschriften, der Übergang (Punkt 3, jetzt das Wörter-Feld), der Ablauf (Punkt 5), der Text unter „Warum wir“ und das Band (Punkt 6) sowie der Fuß (Punkt 8): siehe **4j, Punkte 3 bis 9**. Das Auseinanderfliegen, die Leistungs-Szenen, die Zeichen-Bilder und die Ablauf-Nummern selbst bleiben.

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

> **Stand 13.11.2026:** Die Glasblase „Ansehen“ gibt es nur noch über den Zertifikaten, siehe **4j, Punkt 6**.
> **Stand 14.11.2026:** Der goldene Punkt ist jetzt der Mauszeiger des Betriebssystems selbst, siehe **4m, Punkt 2**.

Code: `components/neu/seite/Zeiger.tsx`, Stile in `seite.css`. Nur bei echter Maus, nicht am Handy, nicht bei „weniger Bewegung“. In Eingabefeldern und über dem Chat-Fenster gilt der gewöhnliche Zeiger.
- **Normal:** ein kleiner goldener Punkt (8 px), dem ein dezenter goldener Schein folgt (je Bild `1 − 0,8^(dt × 60)`).
- **Über Links und Knöpfen:** Der Punkt wird zu einem feinen Ring.
- **Über Karten und Bildern** (`data-zeiger="ansehen"`): eine Glasblase von 56 px mit „Ansehen“. Durchsichtig, mit heller Lichtkante oben, feinem Goldschimmer am Rand und weichem Schatten; der Text hat einen leichten Schatten. Wo der Browser es kann (Chrome, Edge), verzerrt eine Linse den Hintergrund leicht (SVG-Filter `#ag-linse` als `backdrop-filter`); sonst bleibt es bei weichgezeichnetem Glas. Sie sitzt genau auf der Maus (wird im Maus-Ereignis selbst gesetzt, ohne Nachziehen), wächst federnd in 0,35 s und wird beim Klicken kurz kleiner.

## 4j. Feinschliff vom 13.11.2026: Start ohne Ruckeln, Lichtleiste, Geister-Wörter, Überschriften, Ablauf, Fuß

**Durch 4k ersetzt (zweite Runde vom 13.11.2026):** die Ruckel-Wache und das ruhige Bild am Computer, die Dauer des Sterns (jetzt 1,5 s) und das Überspringen, der Zeitpunkt der Lichtleiste, die erste Aussage (sie tippt sich), der Stern im Wörter-Feld und im Fuß (leichter Stern statt zweiter Licht-Szene) und der Takt des Ablaufs (6 s). Die Messwerte hier unten galten für nachgestellte Fenster; wie bei David gemessen wird in 4k.

Davids Rückmeldung zum Stand cca6960: Fast alles bleibt genau so (die Startanimation an sich, der goldene Punkt als Mauszeiger, das Auseinanderfliegen, die Leistungs-Szenen, die Ablauf-Nummern, das Band). Geändert ist nur, was hier steht. Vorbilder für die Wirkung bleiben ksenpanchenko.com und madebyigor.com; alles ist selbst umgesetzt.

### 0 · Fehler

**Ruckeln am Anfang: Ursache.** Die Lichtstrahlen ruckelten nicht, weil etwas nachgeladen wurde, sondern weil das Licht absichtlich selten neu gezeichnet wurde: Solange die Zeichen flogen oder die Welle lief (die ersten rund 4 s), höchstens alle 50 ms („Schonen“). Gemessen in den ersten 3 s nach dem Licht-Start: nur 20 bis 33 neue Licht-Bilder je Sekunde, im Mittel 30 bis 51 ms Abstand, einzelne über 90 ms. Diese Bremse stammte aus der Zeit, als ein Licht-Bild in großen Fenstern rund 20 ms kostete.

**Was geändert ist** (`components/neu/kopf/lichtszene.ts`, `LichtName.tsx`, `zeichenname.ts`):
- **Das Licht ist viel billiger geworden, bei gleichem Bild.** (a) Das Zwischenbild der langen Strahlen hat höchstens 330 000 Bildpunkte (so viele wie bei 1440 × 900 in halber Auflösung); die Strahlen sind von sich aus weich. (b) Die Lichtquelle jedes Effekts wird nur so fein gezeichnet wie sein Zwischenbild (die Bibliothek nähme die volle Auflösung). (c) Die unsichtbare Vorstufe (schwarze Wand und ihre Tiefe) wird in halber Auflösung gerechnet; das fertige Bild mit Strahlen, Licht in den Öffnungen und Korn entsteht weiter in voller Auflösung. (d) Strahlen und Licht in den Öffnungen werden nur dort gerechnet, wo überhaupt Licht hinkommen kann (Ausschnitt), und die Wand rechnet außerhalb des Logos nichts mehr. Ein volles Licht-Bild kostet die Grafikkarte jetzt rund 2,4 ms bei 1440 × 900 und rund 5,5 ms bei 2560 × 1440 (Apple M1). Vorher und nachher Seite an Seite verglichen: Balken, Stern, Strahlen und Korn sehen gleich aus.
- **Kein festes Schonen mehr.** Das Licht wird in jedem Bild neu gezeichnet. Nur wenn das Gerät den Takt des Bildschirms nicht hält, während die Zeichen fliegen, zeichnet es das Licht in jedem zweiten Bild.
- **Aufwärmen mit der echten Szene:** Shader übersetzen (`renderer.compile`), dann die Szene fünf Bilder lang in voller Größe mit allen Teilen (Balken, Strahlen, Schein, Nachbearbeitung) unsichtbar zeichnen, dann warten, bis die Grafikkarte wirklich fertig ist (einen Bildpunkt zurücklesen; `gl.finish()` wartet in Chrome nicht).
- **Probe unter echter Last:** In jedem Bild werden das volle Licht und die Zeichen wie mitten im Flug gezeichnet. Beide Flächen stehen dabei im Bild, sind aber nicht zu sehen (das Licht ist 0,015 % belichtet, die Zeichen haben 0,5 % Deckkraft; beides bleibt unter einer halben Helligkeitsstufe). So bringt der Browser die Bilder wirklich auf den Bildschirm, und ihr Abstand ist die echte Bildzeit. **Weiter geht es erst, wenn 30 Bilder hintereinander unter 17 ms lagen** (im Code 17,5 ms: eine halbe Millisekunde Luft, weil manche Browser die Zeiten auf ganze Millisekunden runden und ein Bild bei 60 Hz 16,7 ms dauert). Danach laufen die Probebilder weiter, bis das Licht angeht: Die Grafikkarte bleibt bis zum Start auf Touren. **Besteht die Probe nicht, bleibt der Stern länger stehen, höchstens 6 s nach dem ersten Bild; dann geht das Licht trotzdem an** (so steht es im Auftrag: „bleibt er länger, höchstens 6 s“). Kommt das Gerät danach wirklich nicht mit (im Mittel über 30 ms je Bild, auch nach gröberem Rechnen), greift wie bisher das ruhige Bild. **Entschieden von David am 13.11.2026 (siehe 4k):** Nach der Höchstzeit geht das Licht an; am Computer gibt es danach nie ein ruhiges Bild, nur Sparstufen. Die Frage war: Die zweite KI (Codex) liest den Auftrag strenger: Ohne bestandene Probe dürfe das Licht gar nicht starten; nach 6 s solle dann das ruhige Bild stehen. Gebaut ist die erste Lesart, weil sonst ein Gerät mit 18–20 ms je Bild das Licht ganz verlöre. Die andere Lesart wäre eine Änderung von wenigen Zeilen in `LichtName.tsx`. Die Messung steht in `performance.getEntriesByName("ag-start:probe-bilder")`.
- **Erstes Scrollen:** Die Probebilder der Zeichen bereiten auch das Auseinanderfliegen vor (die Zeichenfläche reicht von Anfang an unter den Kopfbereich). Die zweite Licht-Szene (Wörter-Feld) wird schon angelegt und aufgewärmt, während oben der Stern steht; sie meldet sich dafür als „Vorarbeit“ an (`vorarbeit` in `umgebung.ts`), die Startanimation wartet darauf (höchstens 2,5 s).

**Gemessen am 13.11.2026** (Apple M1, sichtbares Chrome ohne Bildaufnahme, je drei Läufe, jeder in einem frischen Browser; „vorher“ ist der Stand cca6960). Abstand zweier Bilder, in denen das Licht neu gezeichnet wurde, in den ersten 3 s nach dem Licht-Start:

| Fassung | Fenster | vorher: Licht-Bilder je Sekunde · Abstand im Mittel · längster | nachher: Licht-Bilder je Sekunde · Abstand im Mittel · längster | Bilder der Seite je Sekunde vorher → nachher |
|---|---|---|---|---|
| fertiger Build | 1440 × 900 | 32 · 30 ms · 84 ms | 161 · 6,3 ms · 18 ms | 129 → 164 |
| fertiger Build | 2560 × 1440 | 21 · 46 ms · 91 ms | 137 · 7,3 ms · 36 ms | 74 → 150 |
| fertiger Build | Handy 390 × 844, 4-fache Prozessorbremse | 21 · 46 ms · 109 ms | 106 · 9,4 ms · 37 ms | 85 → 131 |
| Dev-Server | 1440 × 900 | 27 · 37 ms · 85 ms | 160 · 6,3 ms · 24 ms | 115 → 164 |
| Dev-Server | 2560 × 1440 | 20 · 49 ms · 91 ms | 139 · 7,2 ms · 30 ms | 64 → 151 |
| Dev-Server | Handy 390 × 844, 4-fache Prozessorbremse | 19 · 51 ms · 103 ms | 99 · 10,2 ms · 44 ms | 74 → 123 |

Die Startanimation an der fertigen Fassung (Zeiten ab dem ersten Bild der Seite; „Probe“ = so viele Probebilder waren nötig, bis 30 hintereinander unter 17 ms lagen, und ihre mittlere Bildzeit):

| Fenster | Probe | Stern steht | alles steht | Bilder/s: Licht geht an · Flug · Welle · erstes Scrollen | längstes Bild dabei |
|---|---|---|---|---|---|
| 1440 × 900 | 30–38 Bilder, 7–9 ms | 3,0 s | 6,7 s | 163 · 163 · 140 · 158 | 8 · 13 · 14 · 19 ms |
| 1440 × 900, Maus bewegt sich | 31–52 Bilder, 9–10 ms | 3,0 s | 6,7 s | 160 · 164 · 103–132 · 150–156 | 12 · 13 · 36 · 30 ms |
| 2560 × 1440 | 30–33 Bilder, 10–12 ms | 3,0 s | 6,7 s | 162 · 155 · 102 · 153 | 13 · 17 · 13 · 18 ms |
| 1440 × 900, doppelte Pixeldichte | 58–95 Bilder, 9–11 ms | 3,0 s | 6,7 s | 152–161 · 161 · 122 · 155 | 19 · 18 · 13 · 24 ms |
| Handy 390 × 844, 4-fache Prozessorbremse | 32–72 Bilder, 11–12 ms | 3,0 s | 6,3 s | 150–157 · 129 · 77 · 133–165 | 13 · 32 · 29 · 68 ms |

Der Bildschirm des Messrechners läuft mit rund 160 Bildern je Sekunde; mehr geht dort nicht. Bei doppelter Pixeldichte braucht die Probe etwas länger (bis rund 1,5 s), weil einzelne Probebilder 18 ms dauern; sie besteht aber innerhalb der 3 s, die der Stern ohnehin steht. Besteht sie auf einem Gerät gar nicht, bleibt der Stern bis zu 6 s stehen, dann geht es trotzdem los.

Schaubild und Bildreihen liegen im Bericht zum Auftrag (nicht im Projekt).

**Überlappung im Fuß.** Ganz unten lag das Ende des Kontakt-Bereichs („Lieber schreiben? / Anfrage-Formular öffnen“) unter der fest stehenden Kopfleiste und ihrem Logo. Die neue Fußleiste ist mindestens so hoch wie der Bildschirm und lässt oben Platz für die Kopfleiste: Ganz unten liegt vom Kontakt-Bereich nichts mehr darunter. Reicht die Fensterhöhe nicht für die ganze Fußleiste (kleine Fenster, Handy), tritt der Name der Kopfleiste zurück, solange die Fußleiste unter ihr liegt, also in den obersten 120 px des Bildes (die Fußleiste nennt ihn selbst).

**Sprungziel „Kontakt“ landete zu hoch (beim Prüfen gefunden).** Die Zertifikat-Bilder hielten ihren Platz nicht frei: Der Abschnitt „Ausbildung“ wurde 235 px höher, sobald sie geladen waren, und alles darunter rutschte nach. Der Platz der Bilder steht jetzt von Anfang an fest (`.ag-zert__bild` mit festem Seitenverhältnis, `welt.css`).

### 1 · Startanimation: Stern länger, Aufbau von innen nach außen
1. **Der Stern steht jedes Mal mindestens 3 s** im Dunkeln und atmet dabei leicht. Dauert das Fertigmachen oder die Probe länger, bleibt er länger, höchstens 6 s (`WARTEN_MIN`, `WARTEN_MAX`; die alten 0,8 s / 4 s entfallen).
2. **Aufbau von innen nach außen,** jeder Schritt weich in den nächsten (0,15 s Überlappung): erst wird der **Stern heller** (0,7 s), dann öffnen sich die **vier Balken** (0,6 s), dann wachsen die **Strahlen** nach außen (1,2 s). Am Handy 0,5 / 0,45 / 0,9 s. (`LICHT_STUFEN`, in der Szene `stufen.zeiten`.)
3. **Die Zeichen fliegen bei 60 % der Lichtstärke** (statt 40 %). Stern und Balken zählen dabei je ein Viertel, die Strahlen die Hälfte: Die Balken stehen, die Strahlen haben begonnen (rund 1,5 s nach Beginn des Lichts). Danach wie bisher: Flug 2,2 s, Welle 250 ms nach der Landung, Kopfleiste und Knöpfe beim Landen.
4. **Licht und Maus:** Wenn alles steht (Zeichen gelandet, Welle vorbei), wartet das Licht 1 s. Dann dreht es sich in 1,5 s weich zur Maus (weich anfahren, weich ankommen) und folgt ihr danach wie bisher.
- Alles steht jetzt nach rund 6,7 s (Handy 6,3 s), davon 3 s Stern. Überspringen (Klick, Taste, Scrollen) gilt weiter.

### 2 · Scroll-Hinweis: Lichtleiste über die ganze Breite
`seite/Lichtleiste.tsx` (auch im Fuß), `seite/ScrollHinweis.tsx`, Stile in `kopf.css` und `seite.css`. Eine durchgehende, leuchtende Leiste von links unten bis rechts unten: am Rand am hellsten (30 % Gold), nach oben weich auslaufend (110 px hoch), dazu ein 1,5 px feiner, hellerer Goldstreifen genau an der Kante. **Sie bewegt sich nicht seitlich.** Sie atmet nur leicht von unten nach oben: Höhe (70–100 %) und Helligkeit (58–100 %) in 3 s je Atemzug, höchstens dreimal, dann blendet sie aus. Wann und wie sie verschwindet, bleibt (4,5 s nach der Startanimation, beim ersten Scrollen sofort weg). „Weniger Bewegung“: ein ruhiger, schwacher Schein.

### 3 · Erste Aussage
`seite/Aussage.tsx`, `seite/LeuchtText.tsx`.
- **Weg:** die Zeile „KI-Telefonassistent, Website und Chatbot …“ und die Anruf-Leiste.
- **Überschrift:** Sie steht als Zufallszeichen da und setzt sich beim Hinscrollen von links nach rechts zum Satz zusammen (1,3 s), zuerst mit „Tagen“ (in der Schrift und Farbe des Satzes; der Rest der Zeile rückt dafür zusammen und bleibt mittig). Nach 0,55 s zerfällt „Tagen“ Buchstabe für Buchstabe in Zufallszeichen und rastet nach 0,6 s als „Stunden“ ein (0,45 s), das golden aufleuchtet.
- **Text darunter** (Davids Text aus `intro.text`, in der Sie-Form): Er steht von Anfang an da, gedämpft (25 % Deckkraft), und leuchtet beim Runterscrollen Zeile für Zeile auf. Das hängt direkt am Scrollen: Es beginnt, wenn die Oberkante des Textes bei 88 % der Bildhöhe steht, und ist fertig, wenn seine Mitte die Bildschirmmitte erreicht. Danach blendet die Fußnote ein. Beim Hochscrollen bleibt alles hell.

**Überschriften allgemein** (`seite/Entschluesselt.tsx`, gilt für die erste Aussage, Leistungen, Ablauf, „Großer Anspruch. Persönlich umgesetzt.“, Ausbildung und Kontakt):
- Jede steht als Zufallszeichen da (JetBrains Mono, wechselt gemächlich) und setzt sich beim ersten Hinscrollen von links nach rechts zusammen (0,9 s; Auslöser: Oberkante bei 84 % der Bildhöhe). **Nur einmal je Seitenaufruf:** Danach bleibt sie stehen, auch beim Wegscrollen. Die Startanimation oben kommt weiter bei jedem Laden.
- Danach leuchtet das goldene Schlüsselwort einmal auf (1,6 s) und kommt in seinem gewohnten Schein zur Ruhe.
- **Maus:** Buchstaben im Umkreis von 46 px verbuggen kurz (0,22–0,48 s) und rasten wieder ein.
- Der echte Text bleibt immer im Dokument (Vorleseprogramme, Suchmaschinen). Ohne Skript, bei „weniger Bewegung“ und in der Vorschau steht er einfach da.
- **„Großer Anspruch. Persönlich umgesetzt.“** hat statt des langen Textes nur noch den Satz „Technik wie bei den Großen – persönlich betreut.“

### 4 · Wörter-Feld mit dem Stern
`seite/Uebergang.tsx`, `lichtszene.ts` (`nurStern`, `sternForm`). Der schräge Lichtstrahl ist ersetzt.
- **Der Stern:** dieselbe Licht-Szene wie im Kopfbereich, aber die Wand hat nur den Stern als Öffnung. Satteres, wärmeres Gold, heller Kern, Strahlen 1,5-mal so stark, dahinter ein weicher Schein. Er lebt: Er atmet (± 7 %) und dreht sich ganz leicht hin und her (± 5°, eine Runde in 14 s).
- **Auftritt** (einmal, wenn der Abschnitt zu gut einem Drittel im Bild ist): Aus einem Lichtpunkt wächst der Stern (0,25 s Punkt, dann 1 s mit leichtem Überschwingen), ab 0,75 s fächern die Strahlen auf (1,5 s), ab 1 s schweben die Wörter aus der Tiefe herein (von der Mitte her, klein und unscharf, jedes 0,13 s nach dem vorigen).
- **Sechs Wörter:** Persönlich · Schnell · Feste Preise · Aus Rhein-Main · Modern · Rund um die Uhr.
- **Geister in der Schwerelosigkeit:** Die Maus geht durch die Wörter hindurch. Fährt sie durch ein Wort (Umkreis 90 px), bekommt es einen sanften Schubs in ihre Bewegungsrichtung, nach Geschwindigkeit und Nähe (höchstens rund 140 px je Sekunde). Es treibt weiter, wird weich gebremst (insgesamt höchstens gut 150 px) und dreht sich leicht (höchstens 6°). Die Buchstaben im Umkreis von 46 px um die Maus werden kurz zu goldenen Zufallszeichen in JetBrains Mono und rasten wieder ein. Am Rand des Feldes prallen die Wörter weich ab. 8 s nach dem letzten Schubs treiben sie langsam an ihren Platz zurück.
- **Handy:** Die Wörter treiben ganz langsam von selbst; Antippen gibt dem Wort einen Schubs vom Finger weg und verbuggt es. **„Weniger Bewegung“:** Alles steht still, statt der Szene das ruhige Bild des Sterns.

### 5 · Glasblase „Ansehen“
Weg bei den Leistungs-Szenen (dort bleibt der goldene Punkt). Neu nur über den Zertifikaten: Über einem Zertifikat-Bild erscheint die Glasblase; ein Klick öffnet dasselbe Zertifikat wie „Zertifikat ansehen“ (das Bild ist dafür ein Link auf dieselbe Datei, ohne eigenen Tab-Halt; mit der Tastatur bleibt es bei dem einen Text-Link).

### 6 · Ablauf: läuft von selbst durch
`seite/AblaufNummern.tsx`. Wie auf der alten Seite geht der Ablauf von selbst durch die Schritte, sobald er zu gut einem Drittel im Bild ist: Jeder Schritt dauert 4 s, nach Schritt 3 beginnt es wieder bei Schritt 1. Die Überschrift des aktiven Schritts füllt sich von links nach rechts mit Gold (Ladebalken in den Buchstaben), die anderen bleiben gedämpft. Mit jedem Wechsel fliegen die Zeichen der großen Nummer zur neuen Nummer um. Ein Klick macht einen Schritt aktiv und sofort ganz gefüllt, der Lauf pausiert 6 s und geht dann mit dem nächsten Schritt weiter. „Weniger Bewegung“: alle Überschriften gefüllt, nichts läuft.

### 7 · Band und „Anrufen“
- **Band:** jetzt sechs Wörter (dazu „Modern“ und „Rund um die Uhr“).
- **„Anrufen“ oben rechts:** Am Computer (Maus) scrollt ein Klick weich nach unten zum Kontakt-Bereich; am Handy bleibt es ein direkter Anruf. Der Knopf bleibt ein `tel:`-Link (ohne Skript und auf Seiten ohne Kontakt-Bereich ruft er an).

### 8 · Fuß: Die Seite endet, wie sie beginnt
`seite/FussSchluss.tsx` (ersetzt `FussStrahl.tsx`).
- **Weg:** der große blaue Schriftzug, der orange Schein und der schräge Zeichen-Strahl. Der Grund ist schwarz.
- **Der Stern im Dunkeln:** wieder der Stern des Logos (dasselbe Bild wie am Start), schwach leuchtend und langsam atmend.
- **Darunter „AGENTS GILT“ aus Zeichen:** dieselbe Technik und dasselbe Raster wie der Name oben (`kopf/zeichenname.ts`). Kommt man unten an (der Platz des Namens ist gut zur Hälfte im Bild), fliegen die Zeichen vom Rand herein und setzen sich zusammen (1,5 s, einmal je Seitenaufruf). Danach weichen sie der Maus aus, ein Klick auf den Namen schickt eine Welle hindurch.
- **Ganz unten am Rand die Lichtleiste,** hier ruhig und ohne Atmen (150 px hoch).
- Navigation, Telefon, Mail, Impressum und Datenschutz bleiben und stehen darüber.
- **Handy:** gleich; der Name steht wie oben in zwei Zeilen. **„Weniger Bewegung“:** Alles steht sofort. Ohne Skript steht der gewöhnliche Schriftzug da.

### 9 · „Weniger Bewegung“ während des Besuchs umstellen
Überschriften, Text der ersten Aussage, Wörter-Feld, Ablauf und Fuß richten sich neu ein, wenn der Besucher die Einstellung umstellt (`seite/einstellung.ts`): Laufende Animationen enden, die ruhigen Endzustände stehen. Was bei diesem Seitenaufruf schon aufgetreten ist (Überschrift zusammengesetzt, Stern erschienen, Name im Fuß eingeflogen), wiederholt sich danach nicht.

### 10 · Nicht angefasst
Der Kontakt-Bereich bleibt, wie er ist (nur seine Überschrift entschlüsselt sich wie die anderen). Chat-Fenster, Formular, Anruf-Links und Rechtliches sind unverändert.

## 4k. Zweite Runde vom 13.11.2026: Licht friert nie ein, Korn wie früher, Sterne lebendig, Überschrift tippt sich

**Durch 4l ersetzt (dritte Runde vom 14.11.2026):** die Höchstzeit von 6 s am Start (jetzt wartet der Stern, bis alles bereit ist, Sicherheitsgrenze 15 s), „steht alles sofort“ bei einem Ziel in der Adresse und nach Neuladen oder Zurück (jetzt beginnt die Seite immer oben, und der Start läuft ganz), die halbfeste Sperre in den ersten 0,3 s (jetzt immer fest), „kein Verbuggen unter der Maus“ bei der ersten Überschrift (jetzt verbuggt sie wie alle) und der Absatz unter der ersten Aussage (jetzt Wettlauf und drei Glaskarten).

Davids Rückmeldung zu 6d45187: Die Startanimation, die Geister-Wörter, das Verbuggen der Überschriften, „Großer Anspruch“ und die Zertifikate mit Glasblase bleiben. Auf seinem Bildschirm (MacBook Pro M1, außen ein OMEN 32q mit 2560 × 1440 bei 165 Hz, Pixeldichte 1; manchmal der eingebaute Bildschirm mit Pixeldichte 2) gab es vier Probleme: Das Licht wurde nach ein paar Sekunden zum Standbild, das Korn war unsauber, der Stern im Wörter-Feld war ein Standbild mit sichtbarem Viereck, der Stern im Fuß bewegte sich nicht.

### 0 · Ursache
- **Die Ruckel-Wache maß das Falsche.** Sie sah auf den Abstand zwischen zwei Bildern: im Mittel über 30 ms, zweimal in Folge → erst gröber rechnen (kleinere Zeichenfläche, daher gröberes Korn), dann das ruhige Bild, und das blieb für den ganzen Besuch. Der Abstand zwischen zwei Bildern sagt aber nichts über die Grafikkarte. Er wird auch lang, wenn der Browser die Bilder selbst drosselt (verdecktes Fenster, gesperrter oder schlafender Bildschirm: 1 bis 5 Bilder je Sekunde) oder wenn andere Programme den Rechner belegen. In Davids echtem Chrome nachgewiesen: In einem gedrosselten Fenster schaltete die alte Fassung nach 41,6 s auf das Standbild, ganz ohne Last. Bei doppelter Pixeldichte wurde die Zeichenfläche unter Last von 2994 × 1964 auf 1871 × 1227 (nach 4 bis 17 s) und 1497 × 982 (nach 31 s) verkleinert.
- **Davids Vermutung** zur Wache (erst `grenze`, dann `beiAusfall`) stimmt. Die Vermutung „gemessen wurde mit 60 Bildern je Sekunde“ stimmt nicht ganz: Gemessen wurde mit rund 160, aber in nachgestellten, verkleinert dargestellten Fenstern. Die sind viel billiger als ein echtes großes Fenster und zeigen das Problem nicht.
- **Das unsaubere Korn** war nicht das lebende Korn, sondern die gröbere Zeichenfläche und danach das hochgezogene Standbild. Am lebenden Licht ist das Korn so fein wie in 69a8a58 (Abschnitt 2).
- **Wörter-Feld und Fuß:** Im Wörter-Feld lief eine zweite Licht-Szene mit derselben Wache; ihr ruhiges Bild hat Kanten, das war das Viereck. Im Fuß stand von Anfang an nur ein Bild, das die Deckkraft wechselte.

### 1 · Das Licht friert am Computer nie ein
`kopf/lichtszene.ts`, `kopf/LichtName.tsx`.
- **Kein Standbild am Computer.** Die Wache kann dort nur Sparstufen einstellen. Das ruhige Bild gibt es nur noch bei „weniger Bewegung“, wenn die Szene gar nicht zeichnen kann, und als letzte Rettung auf Geräten ohne feine Maus (Handy), wenn auch die sparsamste Stufe nicht reicht (`letzteRettung`). Geht der Grafikkarte der Zusammenhang verloren, baut sich die Szene einmal neu auf.
- **Höchstens 60 Licht-Bilder je Sekunde,** gleichmäßig auf den Takt des Bildschirms verteilt: bei 165 Hz jedes dritte Bild (55 je Sekunde), bei 120 Hz jedes zweite, bei 60 Hz jedes. Die Zeichen und die Maus laufen weiter im vollen Takt. Steht das Licht still (nichts bewegt sich), reicht auch an einem Bildschirm mit 60 Hz jedes zweite Bild.
- **Die Wache misst die echte Arbeitszeit der Grafikkarte** je Licht-Bild (Zeitmessung der Grafikkarte, `EXT_disjoint_timer_query_webgl2`). Wo es die nicht gibt (etwa Safari), zählt nur nachgewiesener Rückstau: Alle paar Millisekunden wird nachgesehen, ob die Grafikkarte mit dem Licht-Bild fertig ist; gezählt wird die Zeit bis zu dem Augenblick, in dem sie zuletzt nachweislich noch beschäftigt war. Kommt das Nachsehen zu spät (Skript blockiert, Fenster gedrosselt), wird höchstens zu wenig gezählt, nie zu viel. Sie mittelt 60 Messungen und greift ein, wenn das Mittel zweimal in Folge über 72 % der Zeit bis zum nächsten Licht-Bild liegt. Im verdeckten Fenster misst sie nicht.
- **Sparstufen** (`SPARSTUFEN`), jede bleibt lebendig und folgt der Maus:

| Stufe | Zwischenbild der langen Strahlen | Licht in den Öffnungen | Proben | Takt |
|---|---|---|---|---|
| 0 (volle Güte) | höchstens 330 000 Bildpunkte | volle Größe | 80 / 30 | bis 60 je Sekunde |
| 1 | 250 000 | 90 % | wie 0 | wie 0 |
| 2 | 190 000 | 80 % | wie 0 | wie 0 |
| 3 | 190 000 | 80 % | 60 % / 20 | wie 0 |
| 4 | wie 3 | wie 3 | wie 3 | jedes zweite Licht-Bild (27 bis 30 je Sekunde) |

  Die Stufen 1 und 2 verkleinern nur Zwischenbilder, die ohnehin weich sind: Das Umschalten stockt nicht (kein neues Shader-Programm) und ist nicht zu sehen. Die Stufen 3 und 4 kommen erst, wenn die Grafikkarte ein Licht-Bild nicht einmal mehr in der Zeit bis zum nächsten schafft.
- **Das Korn und die Zeichenfläche bleiben immer in voller Auflösung** (Pixeldichte bis 2) und ändern sich nie mit der Sparstufe.
- **Billiger bei doppelter Pixeldichte:** Das Licht in den Öffnungen (zweiter Durchgang) rechnet in halber Fensterauflösung, auch bei Pixeldichte 2. Vorher kostete es dort 5,2 von 11 ms je Licht-Bild.
- **Nur eine schwere Licht-Szene:** Die zweite Szene im Wörter-Feld gibt es nicht mehr (Abschnitt 3). Die Szene im Kopfbereich rechnet nur, solange er im Bild ist.
- **Davids Entscheidung zur offenen Frage aus 4j:** Nach der Höchstzeit (6 s) geht das Licht an, auch wenn die Probe nicht bestanden ist. Am Computer gibt es danach nie ein ruhiges Bild, nur Sparstufen. **Grenzfall, offen (zweite KI sieht es strenger):** Ist die Licht-Szene nach 6 s noch gar nicht geladen (sehr langsames Netz), gibt es noch kein Licht, das angehen könnte. Dann schimmert der Stern weiter, die Zeichen fliegen schon ein, und das Licht baut sich auf, sobald die Szene da ist; scheitert das Laden, steht das ruhige Bild.

### 2 · Korn 1:1 wie früher
Das Licht in Ruhe, 69a8a58 gegen neu, im selben Fenster aufgenommen (Ausschnitt 400 × 400 px um den Stern):

| Fenster | Kornstärke 69a8a58 → neu | Zusammenhang benachbarter Punkte | Wechsel von Bild zu Bild |
|---|---|---|---|
| OMEN, Pixeldichte 1 | 13,88 → 13,87 | 0,009 → −0,003 | 19,6 → 19,7 |
| 1512 × 982, Pixeldichte 2 | 13,06 → 13,12 | 0,003 → −0,001 | 18,5 → 18,6 |

Kornstärke = Streuung der Helligkeit gegenüber dem weichgezeichneten Bild. Ein Zusammenhang nahe 0 heißt: Jeder Bildpunkt hat sein eigenes Korn, es ist gleich fein. Das Korn ist also gleich fein, gleich dicht und gleich lebendig.

### 3 · Der leichte Stern im Wörter-Feld und im Fuß
`seite/Leuchtstern.tsx`, `seite/leuchtstern.css`, Bilder in `public/stern/`.
- **Keine Licht-Szene.** Fünf Bilder, von der eigenen Szene aufgenommen (Testseite `/varianten/licht-test?ebene=kern` und `?ebene=ganz&zeit=…`): der Stern selbst (`kern.webp`, 640 px) und vier Muster der langen Strahlen (`strahlen-1…4.webp`, 960 px; zusammen rund 38 kB). Die Strahlen-Bilder sind so gerechnet, dass „aufgehellt gemischt“ über dem Stern genau wieder die volle Aufnahme ergibt.
- **Er bewegt sich immer,** nur mit Drehen, Größe und Deckkraft (das rechnet die Grafikkarte nebenbei): Er dreht sich leicht hin und her (± 5°, eine Runde in 14 s), die Strahlen wiegen sich etwas anders (± 2°) und atmen (6,5 s), die vier Strahlen-Muster blenden reihum ineinander (je 6 s): Die Strahlen schimmern.
- **Feines Korn tanzt:** eine Kachel aus Zufallswerten in den Bildpunkten des Bildschirms (256 × 256, einmal je Seitenaufruf erzeugt), „farbig abgewedelt“ gemischt wie das Filmkorn der Szene: Es ist nur im Licht zu sehen, Schwarz bleibt schwarz. Sie springt 60-mal je Sekunde an eine andere Stelle; zwei Sprungfolgen liegen ineinander, erst nach gut 9 s wiederholt sich eine Stelle. Die Szene rechnet linear, der Browser in sRGB: Die Werte der Kachel sind umgerechnet (1 − sRGB(u)), die Deckkraft ist 0,2 hoch 1/2,2 und nimmt zur hellen Mitte hin ab.
- **Mit der echten Szene abgeglichen** (Testseite, gleiche Größe, schwarzer Grund; `?ebene=ganz&korn=1` gegen `?ebene=leicht`): Helligkeit in Ringen um den Stern auf rund 3 % gleich; Kornstärke in der Mitte 4,9 gegen 5,1, im Strahl 15,2 gegen 15,4 und 13,6 gegen 13,6; bei Pixeldichte 2 ebenso.
- **Kein Viereck:** Die Bilder sind am Rand ganz schwarz, das Feld wird aufgehellt über den Grund gemischt (Schwarz verändert nichts) und läuft rund aus. Dafür steht der Platz des Sterns ohne Verschieben mittig (ein verschobenes Element wäre eine eigene Ebene, und der Stern stünde auf einer schwarzen Scheibe).
- **Auftritt im Wörter-Feld** bleibt: Aus einem Lichtpunkt wächst der Stern (0,25 s Punkt, dann 1 s mit leichtem Überschwingen), ab 0,75 s fächern die Strahlen auf (1,5 s), ab 1 s kommen die Wörter. Einmal je Seitenaufruf. Der Schein dahinter bleibt.
- **Im Fuß** steht derselbe Stern (Platz bis 190 px), ohne Auftritt.
- Nicht im Bild, ruht alles. Bei „weniger Bewegung“ steht der Stern still (mit Korn). Ohne Skript steht er ohne Korn da.
- **Kosten:** Mit dem Stern im Bild läuft die Seite mit 126 bis 165 Bildern je Sekunde (ohne ihn 142 bis 165).

### 4 · Erste Aussage: Die Überschrift tippt sich
`seite/Aussage.tsx`, `seite/Entschluesselt.tsx` (`leeren`, `tippen`, `wandeln`). `LeuchtText.tsx` entfällt.
- **Vorher** ist der Platz leer; die Zeilen sind frei gehalten (der echte Text steht unsichtbar im Dokument), nichts springt.
- **Tippen:** Beim Hinscrollen (Oberkante bei 84 % der Bildhöhe) erscheint Platz für Platz ein Zufallszeichen, alle 45 ms der nächste. Jeder flackert rund 250 ms und rastet als richtiger Buchstabe ein. Vorn läuft eine verbuggte Kante durch den Satz, dahinter steht schon das fertige Wort.
- **Erst „Tagen“:** Getippt wird „Wir bauen in Tagen, wofür Agenturen Wochen brauchen.“ (45 Plätze, rund 2,2 s). 0,55 s später zerfällt „Tagen“ in Zufallszeichen und rastet nach 0,6 s als „Stunden“ ein (0,45 s), das golden aufleuchtet; das Sternchen kommt mit.
- **Kein Verbuggen unter der Maus** bei dieser Überschrift. Bei den anderen bleibt es.
- **Der Text darunter** ist bis dahin unsichtbar. Direkt nachdem „Stunden“ eingerastet ist, steht der ganze Absatz auf einmal als Zufallszeichen da und rastet in 0,8 s von links nach rechts ein (nach dem Ort im Text, alle Zeilen zugleich). Danach blendet die Fußnote ein.
- **Alles nur einmal je Seitenaufruf.** Ohne Skript, bei „weniger Bewegung“ und in der Vorschau steht alles sofort da. Ändert sich mitten im Tippen die Größe der Überschrift (Fenster schmaler, Handy gedreht), steht der Text sofort fertig da, statt Zeichen an falschen Stellen zu zeigen; das gilt für alle Überschriften.

### 5 · Start: Stern 1,5 s, kein Scrollen, kein Überspringen
- **Der Stern steht mindestens 1,5 s** (statt 3 s), höchstens 6 s (`WARTEN_MIN`).
- **Während der ganzen Startanimation steht die Seite oben:** kein Mausrad, kein Wischen, keine Scroll-Tasten, kein Scrollbalken, kein Sprung zu einem Ziel auf der Seite. Die Sperre gilt vom ersten Bild an (eine Regel im Stylesheet, noch bevor das Skript läuft; `welt.css`), das Skript übernimmt sie und hält dazu das weiche Scrollen an (`scrollSperre` in `umgebung.ts`). Ist die Sperre fest (Klasse `ag-scroll-fest`), ist die Seite nur so hoch wie das Bild und schneidet alles darunter ab: Es gibt dann nichts, wohin sie scrollen könnte, und kein Abschnitt weiter unten löst seinen Auftritt aus. Bei einem frischen Aufruf ist sie sofort fest; nach Neuladen oder Zurück erst 0,3 s nach dem Laden, damit der Browser die frühere Lage noch herstellen kann (in dieser kurzen Zeit tut die Tab-Taste nichts). **Überspringen gibt es nicht mehr** (kein Klick, keine Taste).
- **Frei** ist das Scrollen, sobald der Name gelandet und die Welle durch ist (1,55 s nach der Landung; Ereignis `ag:start-frei`). Sicherheitsnetz: Käme das Skript nie, gibt das Stylesheet nach 14 s frei.
- Stellt der Browser die Seite selbst woanders hin, steht alles sofort: bei einem Ziel in der Adresse (`#kontakt`; der Browser springt oft erst nach dem Skript, deshalb wird das Ziel beim Einrichten erkannt) und nach Neuladen oder Zurück mit wiederhergestellter Lage.
- **Tastatur:** Die Tab-Taste kann die Seite während der festen Sperre nicht bewegen (sie ist nur so hoch wie das Bild). Der Fokus darf wandern; steht er bei der Freigabe auf einem Feld weiter unten, kommt es dann ins Bild. Der Inhalt bleibt die ganze Zeit im Dokument, Vorleseprogramme erreichen ihn. Hat ein Fokus-Sprung die Seite schon bewegt, bevor das Skript lief (frischer Aufruf ohne Ziel in der Adresse), geht es zurück nach oben, und der Start läuft normal.
- **„Weniger Bewegung“** bleibt wie bisher: ruhiges Einblenden, keine Sperre.

### 6 · Lichtleiste unten: zeigt sich zuverlässig
`seite/ScrollHinweis.tsx`.
- **Warum sie bei David nie kam:** Sie merkte sich das erste Scrollen für die ganze Sitzung des Tabs (auch über Neuladen hinweg). Dazu verschwand sie schon bei einem Dreh am Mausrad oder einem Tastendruck während des Starts, und sie wartete 4,5 s.
- **Neu:** Sie erscheint bei jedem Seitenaufruf 2 s nach der Landung des Namens, wenn man dann noch ganz oben ist. Nur echtes Scrollen nimmt sie weg (sofort, für diesen Aufruf). Sonst wie bisher: Sie atmet höchstens dreimal und blendet aus. **(Seit 14.11.2026: 3 s nach dem Ende des Starts, atmet bis zum Scrollen, siehe 4m, Punkt 3.)**

### 7 · Ablauf: langsamer und ganz voll
`seite/AblaufNummern.tsx`. Der Gold-Balken in der Überschrift läuft 6 s je Schritt, bis zum letzten Buchstaben. Dann bleibt er 0,5 s ganz voll stehen, erst danach kommt der nächste Schritt. Nach einem Klick pausiert der Lauf weiter 6 s.

### 8 · Wie bei David gemessen
- **So wird gemessen:** echtes, sichtbares Chrome auf dem OMEN, keine nachgestellte Größe; 60 s, die Maus fährt die ganze Zeit in weiten Bögen. Mitgeschrieben werden die Bilder der Seite, die Licht-Bilder, die Arbeitszeit der Grafikkarte je Licht-Bild, die Sparstufe und die Größe der Zeichenfläche. Der eingebaute Bildschirm spiegelt den OMEN und lässt sich nicht einzeln ansteuern; Pixeldichte 2 ist deshalb in einem Fenster von 1512 × 982 nachgestellt (strenger als der echte Bildschirm, weil dort 165 statt 60 Hz anliegen).
- **Zwei Einschränkungen der Messung:** Während der Schlussmessung war Davids Bildschirm gesperrt, echtes Vollbild ließ sich nicht schalten; gemessen ist im größtmöglichen Fenster (2560 × 1238 sichtbar). Und eine andere Arbeit auf dem Rechner belegte die ganze Zeit den Prozessor (im Mittel 2 bis 4,6 Kerne, in der Spitze fast 7). Vorher und nachher sind direkt hintereinander unter derselben Last gemessen.

| Fassung, Fenster | Stand | Bilder der Seite je s | Licht-Bilder je s | Grafikkarte je Licht-Bild | längstes Bild | Zeichenfläche am Ende | Sparstufe |
|---|---|---|---|---|---|---|---|
| Build, OMEN 2560 × 1238 | 6d45187 | 98 | 96 | 7,3 ms | 55 ms | 2545 × 1238 | (keine) |
| Build, OMEN 2560 × 1238 | neu | 125 | 49 | 7,8 ms | 61 ms | 2545 × 1238 | 0 |
| Build, 1512 × 982, Pixeldichte 2 | 6d45187 | 83 | 81 | 12,2 ms | 91 ms | 2994 × 1964 | (keine) |
| Build, 1512 × 982, Pixeldichte 2 | neu | 123 | 49 | 5,8 ms | 86 ms | 2994 × 1964 | 0 |
| Dev-Server, OMEN 2560 × 1238 | neu | 132 | 50 | 6,6 ms | 47 ms | 2545 × 1238 | 0 |
| Dev-Server, 1512 × 982, Pixeldichte 2 | neu | 118 | 48 | 5,9 ms | 79 ms | 2994 × 1964 | 0 |

- **Früher am selben Tag** (Bildschirm offen, echtes Vollbild 2560 × 1352): alter Stand 92 Bilder der Seite und 90 Licht-Bilder je Sekunde, 7,7 ms; neuer Stand 110 und 48, 8,7 ms, Sparstufe 0, Zeichenfläche unverändert, kein Standbild.
- **Der alte Stand unter ungünstigen Bedingungen** (Pixeldichte 2, Dev-Server und Build, morgens): 45 bis 48 Bilder je Sekunde, Grafikkarte 16 bis 18 ms je Licht-Bild, die Zeichenfläche wurde auf 1871 × 1227 und 1497 × 982 verkleinert. Der neue Stand ging in einem ähnlich schlechten Lauf (45 Bilder je Sekunde) auf Sparstufe 2, behielt aber die volle Zeichenfläche und blieb lebendig.
- **Gedrosselte Bilder** (rund 3 je Sekunde, 60 s lang, wie in einem verdeckten Fenster): Das Licht bleibt an, keine Sparstufe, danach wieder 166 Bilder je Sekunde. In Davids echtem Chrome (Fenster 2367 × 1215): 107 s lang 165 Bilder je Sekunde, Sparstufe 0.
- **Start an der fertigen Fassung:** Mausrad, Leertaste, Bild ab, Ende, Pfeil ab, Klick, Escape, Eingabe, Wischen und ein Klick auf ein Sprungziel bewegen die Seite während des Starts nicht und überspringen nichts. Die Lichtleiste erscheint 2,0 s nach der Landung.

### 9 · Nicht angefasst
Alles andere bleibt genau so. Kontakt-Bereich und Chat-Fenster kommen später. Nichts wurde echt abgesendet.

## 4l. Dritte Runde vom 14.11.2026: Start immer komplett, Name hängt nie, Glaskarten unter der ersten Aussage

Davids Rückmeldung zu fcbeb26: „wunschlos glücklich“. Licht, Sterne, Geister-Wörter, Leistungen, Ablauf, „Großer Anspruch“, Band, Zertifikate und Fuß bleiben genau so. Es ging nur um vier Punkte.

### 0 · Die Startanimation läuft immer ganz
`kopf/LichtName.tsx`, `kopf/startlogik.ts` (reine Rechenregeln, mit Tests), `kopf/sternbild.ts`, `kopf/notlicht.ts`, `umgebung.ts`, `Rahmen.tsx`, `welt.css`, `kopf/kopf.css`.

**Was David sah:** Nach dem Neuladen kam der Stern, dann stand sofort der fertige Zustand; einmal kam die Startanimation gar nicht. **Ursachen (beide nachgestellt):**
- Im Dev-Server dauerte das Laden länger als die Höchstzeit von 6 s (gemessen: Bilder 9,0 s, Licht 9,2 s). Dann flogen die Zeichen schon los, und das Licht sprang später voll an.
- Nach Neuladen mitten auf der Seite stellte der Browser die frühere Lage wieder her. Für diesen Fall galt die Regel „steht alles sofort“ (4k).

**So ist es jetzt:**
- **Nie direkt in den fertigen Zustand.** Der Stern pulsiert, bis alles bereit ist: Schriften, Zeichen, Licht-Szene (angelegt und einmal gezeichnet) und die Bilder des ersten Bildschirms. „Bereit“ heißt wirklich geladen: Für Bilder gibt es keine eigene kürzere Frist mehr (kommen sie 8 s zu spät, wartet der Stern 8 s). Die Probe unter echter Last (30 Bilder unter 17 ms) hält den Start danach nur begrenzt auf: bis 6 s nach dem ersten Bild, mindestens aber 1 s (`probeFrist`). **Sicherheitsgrenze: 15 s** nach dem ersten Bild (`WARTEN_GRENZE`). Danach läuft immer die ganze Abfolge: Stern hell, Balken, Strahlen, Zeichen, Welle.
- **Der wartende Stern ist sofort da.** Sein Bild (4 kB) steht fest im Dokument (`kopf/sternbild.ts`) und muss nicht geladen werden: Auch bei langsamer Leitung ist er das Erste, was man sieht. Vorher blieb der Bildschirm schwarz, solange sein Bild unterwegs war.
- **Fällt das Licht wirklich aus** (kein WebGL, Szene lädt nicht, oder sie ist an der Sicherheitsgrenze noch nicht da), läuft dieselbe Abfolge mit dem ruhigen Bild (`bildAuftritt`): Eine runde Maske gibt erst den Stern frei, dann die Balken, dann die Strahlen (`--bild-r`, `--bild-hell`; dieselben Zeiten wie beim Licht), die Zeichen fliegen bei 60 % (seit 4m: 0,7 s nach dem vollen Licht). Auch auf das ruhige Bild wartet der Stern, bis es wirklich da ist. Kommt die Szene später doch noch, blendet das Bild in das lebende Licht über.
- **Es gibt immer ein Licht (Not-Licht).** Sind an der Sicherheitsgrenze weder die Szene noch das große ruhige Bild geladen (sehr langsame Leitung), läuft die Abfolge mit dem Not-Licht (`lichtQuelle`, `kopf/notlicht.ts`): dasselbe Bild in klein (640 × 640, 4 kB), fest im Skript, es braucht keine Leitung. Es liegt als Hintergrund im selben Bild-Element; das große Bild lädt weiter und legt sich darüber, sobald es da ist (gleiches Bild, nur schärfer). So bleibt die Reihenfolge immer dieselbe: Stern, Balken, Strahlen, dann erst die Zeichen, die Welle und die Freigabe. Auch späte Ausfälle (die Szene kommt nach der Grenze und scheitert dann) gehen diesen Weg (`bildNachholen`): Nichts steht auf einmal ganz da.
- **Fällt die Grafik mitten im Lichtaufbau aus** (bevor die Zeichen losfliegen), beginnt der Aufbau neu, in Stufen: mit der neu aufgebauten Szene, oder mit dem ruhigen Bild, wenn auch der Neuaufbau scheitert (`wennSzeneKommt`, `wennBildKommt` in `startlogik.ts`). Vorher kam das Licht danach auf einmal, und die Zeichen flogen nie los (der Name blieb weg).
- **Verdeckter Tab:** Ist die Seite während des Starts verdeckt (anderer Tab), bleibt die Abfolge stehen und läuft danach dort weiter, wo sie war. Vorher sprang das Licht beim Zurückkommen ans Ende, und die Freigabe kam, bevor die Welle zu sehen war. Dafür gleicht GSAP lange Pausen aus, solange die Seite gesperrt ist (`lagSmoothing(500, 33)` in `Rahmen.tsx`; mit der Freigabe gilt wieder der genaue Takt für das weiche Scrollen), und alle Fristen des Starts rechnen mit sichtbarer Zeit (`erzeugeSichtUhr`, `gesehen()`): Mindestzeit, Probe, Sicherheitsgrenze und das Sicherheitsnetz des Skripts (24 s). Die Mindestzeit prüft `lichtAnmachen` selbst, gleich welcher Auslöser zuerst kommt: Der Stern war immer mindestens 1,5 s zu sehen. Von der Zeit zwischen dem ersten Bild und dem Einrichten des Skripts zählt nur, was laut Sichtbarkeits-Protokoll des Browsers zu sehen war (`sichtbarZwischen`); kennt der Browser kein Protokoll, zählt davon nichts, dann pulsiert der Stern eher einen Augenblick länger. Lädt die Seite in einem Tab im Hintergrund, beginnt die Abfolge, wenn man hinsieht.
- **Nicht auf alle Bilder warten.** Abgewartet werden nur Bilder, die im ersten Bildschirm stehen. Alles weiter unten lädt im Hintergrund; der leichte Stern und der Stern der Glaskarten laden mit niedrigem Rang (`fetchPriority="low"`).
- **Immer oben beginnen.** `history.scrollRestoration = "manual"`, und die Sperre im Stylesheet ist vom ersten gezeichneten Bild an fest (die Seite ist nur so hoch wie das Bild): Der Browser kann weder eine frühere Lage wiederherstellen noch zu einem Ziel springen, bevor der Start gelaufen ist. Die Regeln im Stylesheet gelten nur, bis das Skript die Sperre übernommen hat (`data-skript`): Ihr eigenes Netz von 14 s gäbe die Seite sonst frei, während der Stern bei langsamer Leitung noch wartet. Bei „weniger Bewegung“ bleibt alles beim Üblichen (`auto`, keine Sperre).
- **Sprungziel (#kontakt):** Erst läuft der Start, danach scrollt die Seite weich dorthin. Dasselbe gilt für einen Klick auf ein Sprungziel während des Starts (etwa „Anrufen“ am Computer): Die Seite merkt sich das Ziel (`scrollZiel` in `umgebung.ts`) und scrollt mit der Freigabe hin. Vorher ging so ein Klick verloren. Das zuletzt gewünschte Ziel zählt: Ändert sich das Ziel in der Adresse während des Starts, gilt das neue; ein Klick auf „nach oben“ (#top) hebt ein früheres Ziel auf. **Dabei gefunden und behoben:** Lädt die Seite noch, wenn der Start vorbei ist (etwa ein Bild weiter unten), stellt der Browser sie beim Entsperren selbst zum Ziel in der Adresse. Das weiche Scrollen wusste davon nichts und setzte die Seite zurück an den Anfang; sie blieb dann oben. Jetzt beendet ein eigener kleiner Schritt (1 px und zurück, nicht zu sehen) diesen Sprung des Browsers mit der Freigabe (`scrollSperre.setze` in `umgebung.ts`), und die Seite scrollt von oben weich zum Ziel. Misst ScrollTrigger unterwegs neu, fasst der Rahmen nach, bis das Ziel erreicht ist (`Rahmen.tsx`); greift der Besucher selbst ein (Mausrad, Finger, Taste, jeder Klick, ein neues Ziel in der Adresse), endet das Nachfassen sofort.
- **Zurück:** Innerhalb der Website (Impressum und zurück) wird der Kopfbereich neu eingerichtet, der Start läuft ganz; seine Wartezeiten zählen ab diesem Start, nicht ab dem ersten Laden (`ersterStart`). Holt der Browser die Seite aus seinem Zwischenspeicher (sie käme so wieder, wie sie verlassen wurde: mitten auf der Seite, Start längst vorbei), wird sie beim Verlassen verdeckt (`html.ag-zurueck`) und bei der Rückkehr frisch eingerichtet: Sie steht oben, und der Start läuft noch einmal ganz. Es wird dabei nichts neu geladen, Eingaben im Formular bleiben erhalten.
- **Nur im Dev-Server** darf der Start übersprungen werden: nach einem Fast Refresh (und wenn der Besucher „weniger Bewegung“ oder das Zeigegerät umstellt; dann lief er bei diesem Laden schon).
- **Fertige Fassung zum Anschauen:** `npm run build`, dann der Eintrag `agentsgilt-fertig` in `.claude/launch.json` (`next start -p 3200`). David beurteilt dort; der Dev-Server (Port 3100) bleibt zum Bauen.

**Geprüft in der fertigen Fassung** (echtes Chrome, Skript `p7/start-faelle.cjs`; Zeiten in Sekunden seit dem Laden bzw. seit der Rückkehr; in jedem Fall alle vier Zustände in der richtigen Reihenfolge, und die Seite stand bis zur Freigabe bei 0 px):

| Fall | Licht geht an | frei | Bemerkung |
|---|---|---|---|
| gewöhnlicher Aufruf | 2,2 | 7,5 | |
| Neuladen mitten auf der Seite (3200 px) | 1,7 | 7,0 | beginnt oben |
| Zurück innerhalb der Website | 1,1 | 6,4 | beginnt oben |
| Zurück aus dem Zwischenspeicher des Browsers | 1,8 | 7,1 | 0,2 s verdeckt, dann oben |
| Ziel in der Adresse (#kontakt) | 1,7 | 7,1 | danach weich zum Kontakt |
| Klick auf „Anrufen“ mitten im Start | 1,7 | 7,1 | danach weich zum Kontakt |
| Ziel wechselt im Start von #kontakt zu #leistungen | 1,9 | 7,2 | danach weich zu den Leistungen |
| Ziel #kontakt, im Start Klick auf „nach oben“ | 1,7 | 6,9 | Seite bleibt oben |
| nur Bilder 8 s verzögert | 8,7 | 14,0 | Stern wartet auf die Bilder |
| Bilder und Licht-Szene 8 s verzögert | 8,9 | 14,2 | Stern wartet, dann alles |
| kein WebGL | 1,7 | 7,0 | ruhiges Bild in Stufen |
| kein WebGL, Bilder 8 s verzögert | 11,6 | 16,9 | Stern wartet auf das ruhige Bild, dann in Stufen |
| Licht-Szene 20 s verzögert | 15,2 | 20,7 | Start an der Grenze mit dem Bild, später lebendes Licht |
| Szene und alle Bilder 20 s verzögert, Ziel #kontakt | 15,6 | 20,9 | Not-Licht in Stufen, danach zum Kontakt, später lebendes Licht |
| Szene kommt nach 16 s und scheitert (kein WebGL), Bilder 20 s verzögert | 15,6 | 20,9 | Not-Licht in Stufen, das große Bild legt sich später darüber |
| Ziel #kontakt, die Seite lädt beim Ende des Starts noch | 1,7 | 7,1 | danach weich zum Kontakt (vorher blieb sie oben) |
| im Hintergrund geladen, nach 17 s hingesehen | danach | danach | der Stern ist erst noch mindestens 1,5 s zu sehen |
| Grafik fällt 0,4 s nach „Licht an“ aus | wie sonst | rund 1,4 s später | Szene baut sich neu in Stufen auf, Zeichen fliegen |
| Grafik fällt zweimal aus | wie sonst | rund 1,3 s später | ruhiges Bild in Stufen, Zeichen fliegen |
| Tab 4 s verdeckt, mitten im Lichtaufbau | 1,7 | 11,0 | nach der Rückkehr läuft der Aufbau noch 2,0 s weiter |
| Tab 5 s verdeckt, während die Welle läuft | 1,7 | 12,1 | Freigabe erst 1,3 s nach der Rückkehr |
| im Hintergrund geladen, nach 9 s hingesehen | 9,7 | 15,0 | die Abfolge beginnt erst dann |

**Zum Verdecken:** Unter Playwright bleibt jede Seite „sichtbar“, auch wenn ein anderer Tab vorn liegt oder das Fenster im Dock ist (ausprobiert). Die drei Fälle mit verdecktem Tab sind deshalb in der Seite nachgestellt (`p7/verdeckt.cjs`): Der Browser zeichnet keine Bilder mehr, und die Seite meldet „verdeckt“. Ein echter Tab-Wechsel in Davids Chrome ist damit nicht aufgenommen.

Während des Starts bewegen die Seite weder Mausrad, Bild-ab, Ende, Leertaste, Pfeiltaste, zwölfmal Tab, `scrollTo`, `scrollIntoView` noch ein neues Ziel in der Adresse (`p7/sperre.cjs`: weiteste Lage 0 px; das neue Ziel in der Adresse wird nach dem Start angesteuert). Hinweis zur Messung: Vor dem ersten gezeichneten Bild (das Stylesheet ist noch nicht da) kann der Browser eine Lage melden; zu sehen ist davon nichts, im ersten gezeichneten Bild steht die Seite oben.

### 1 · Der Name reagiert immer auf die Maus
`kopf/zeichenname.ts`, `kopf/startlogik.ts` (`rollStand`, `OBEN_PX`), `kopf/LichtName.tsx`.
- **Der Fall:** Die Zeichen weichen der Maus nur, solange der Name nicht „wegrollt“ (beim Scrollen fliegen sie auseinander). Dieser Stand war `Lage ÷ (0,9 × Bildhöhe)`, also schon bei 1 px über null: Die Maus war dann abgeschaltet. Nach dem Hochscrollen bleibt die Seite aber oft ein paar Pixel unter dem Anfang stehen (Trackpad, weiches Scrollen, ein Sprung). Der Name stand heil da und reagierte nicht mehr, bis man neu lud. Nachgestellt mit 10 px und mit 3 px Rest.
- **Behoben:** `rollStand` hat eine tote Zone von 24 px. Bis dahin gilt die Seite als oben, erst danach beginnt das Wegrollen (sanft ab null, ohne Sprung).
- **Zweiter Fund, beim Prüfen mit nachgestelltem Tab-Wechsel:** Ruhte die Maus im Namen, fiel das Loch immer wieder für einen Augenblick zu (in 5 bis 13 % der Messpunkte, gemessen alle 100 ms über 6 s). Kam ein Bild, in dem sich nichts änderte (etwa weil der Zeitgeber des Flimmerns einen Augenblick zu früh weckte), legte die Fläche das ruhende Bild des Namens darüber, also den Namen ohne Loch; erst das nächste Flimmern öffnete es wieder. Jetzt bleibt die Fläche, wie sie ist, solange Zeichen neben ihrem Platz stehen (`zeichenname.ts`). Gemessen danach: 0 von 60 Messpunkten zu, mit und ohne Tab-Wechsel. Dazu ein eigener Test.
- **Die anderen Verdachtsfälle waren es nicht,** sie sind jetzt aber alle mit Test belegt: später Licht-Start (Szene 8 s verzögert, auch mit bewegter Maus), Tab-Wechsel während und nach dem Start (im Browser nachgestellt, siehe oben), ganz runter und wieder hoch, Fenstergröße während und nach dem Start geändert.
- **Tests:** `tests/zeichenname.test.ts` (je Fall: Nach der Startanimation gehen die Zeichen unter der Maus auseinander; nachgebaute Zeichenfläche) und `tests/kopf-start.test.ts` (tote Zone, Stufen, Fristen, gemerkte Sprungziele, Freigabe, Sicht-Uhr, sichtbare Zeit vor dem Einrichten, Lichtquelle, Licht kommt mitten im Start). Im echten Vollbild 2560 × 1440 der fertigen Fassung: Dichte der Zeichen an der Stelle 101 ohne Maus, 1 mit Maus, in allen zehn Fällen (`p7/name-echt.cjs`).

### 2 · „Wir bauen in Stunden …“ verbuggt unter der Maus
`seite/Aussage.tsx`. Davids neue Entscheidung: Auch diese Überschrift verbuggt unter der Maus, genau wie alle anderen (Buchstaben im Umkreis werden kurz zu Zufallszeichen und rasten nach 0,22 bis 0,48 s wieder ein). Das Tippen beim Erscheinen bleibt.

### 3 · Unter der ersten Aussage: Wettlauf, drei Glaskarten, Mauslicht
`seite/Aussage.tsx`, `seite/glaskarten.ts`, `seite/seite.css` (Blöcke „Der Wettlauf“ und „Drei Glaskarten“), Texte in `lib/inhalt-neu.ts` (`aussage.lauf`, `aussage.karten`), `public/stern/stern-glas.webp`. Das Auftauchen des Absatzes aus Zufallszeichen ist weg.

**a) Der Wettlauf (die Überschrift als Bild)**
- Zwei schmale Balken (4 px) untereinander, je mit Name links und Zeit rechts in der kleinen Zeichen-Schrift. Sie laufen los, sobald die Überschrift steht („Stunden“ ist eingerastet).
- **„Agentur“ in Grau** kriecht und ist nach 4 s bei einem Drittel; dort bleibt er stehen. Daneben „Wochen“.
- **„Agents Gilt“ in Gold** ist nach 0,8 s voll und leuchtet kurz auf (warmes Weiß über dem Gold, weiter Schein; auch „Stunden*“ leuchtet mit). Danach bleibt ein ruhiger Goldschein.
- Keine Zahlen. Das Sternchen verweist auf die Fußnote; sie steht direkt unter dem Wettlauf und blendet ein, wenn der goldene Balken voll ist.
- Für Vorleseprogramme ist der Wettlauf ein Bild mit Beschreibung („Vergleich: Eine Agentur braucht Wochen, Agents Gilt Stunden (siehe Fußnote).“).
- Schmal (bis 560 px): Name links, Zeit rechts, der Balken darunter über die ganze Breite.

**b) Drei Glaskarten statt Absatz**
- Inhalt aus dem alten Absatz, in drei Aussagen (Sie-Form): „Maßgeschneidert mit KI“, „Schnell und bezahlbar“, „Technik wie bei den Großen“ (Wortlaut in `docs/texte.md`).
- Oben je ein fein gezeichnetes Symbol in Gold (Strich 1,3): Passmarken um den Stern des Logos, eine Stoppuhr, ein Chip mit dem Stern im Kern.
- Die Karten schweben 0,65 s nach dem Start des Wettlaufs nacheinander ein: je 120 ms versetzt, 30 px von unten, 1 s, weich.
- **Echtes Glas:** Milchglas, das weich zeichnet, was dahinter liegt (`backdrop-filter: blur(11px)`): ein ruhiger Lichtschein hinter der Reihe (Gold in der Mitte, kühles Blau an den Seiten) und der Stern. Oben eine feine helle Lichtkante, am Rand ein dünner Goldschimmer (1 px, unten etwas kräftiger), darunter ein weicher Schatten. Radius 22 px, alle drei gleich hoch, gerade ausgerichtet, keine Schrägen.
- Eingeblendet werden Glas und Inhalt einzeln, nicht die ganze Karte. Eine durchscheinende Karte wäre für ihr Glas eine eigene Welt: Das Glas sähe erst nach dem Einblenden, was hinter der Karte liegt, und spränge um.

**c) Der goldene Stern schlüpft hinter dem Glas durch**
- Hinter jeder Karte wartet unsichtbar derselbe leichte Stern (ein Bild mit durchsichtigem Grund, kleiner). Er liegt unter dem Glas und wird am Rand der Karte abgeschnitten.
- Kommt die Maus auf die Karte, gleitet er von der Kante herein, über die sie kam, und folgt ihr weich (er holt je Sekunde gut das Fünffache des Abstands auf, das wirkt wie rund 0,2 s Verzögerung). Durch das Glas sieht man ihn verschwommen leuchten; er dreht sich dabei leicht (± 9°, 9 s) und atmet (4,6 s).
- **Lichtkante und Goldrand fangen sein Licht** dort, wo er gerade ist: ein weicher Fleck von 210 px wandert mit ihm über den 1 px feinen Rand.
- Die Karte hebt sich um 5 px. Die Fläche, die die Maus annimmt, bleibt dabei liegen (sonst rutschte die Karte der Maus am unteren Rand unter dem Zeiger weg und flackerte).
- Geht die Maus weg, gleitet er an der Kante hinaus, über die sie die Karte verlassen hat, und verblasst.

**d) Das Mauslicht liest mit**
- Der Text der Karten steht etwas gedämpft da (Text #9499ae, Titel #e4e1da). Wörter im Umkreis von 120 px um den goldenen Mauspunkt leuchten warm auf (bis #fff0cc mit feinem Goldschein), schnell hinein und weich wieder hinaus. Jedes Wort hat dafür ein eigenes Feld; für Vorleseprogramme bleibt es gewöhnlicher Text.
- **Am Handy** stehen die Karten untereinander. Kommt eine Karte gut zur Hälfte ins Bild (und steht sie schon da), zieht ihr Stern einmal in 1,9 s von links nach rechts hinter dem Glas durch; der Text leuchtet dabei von links nach rechts auf und bleibt hell.
- **„Weniger Bewegung“, ohne Skript, in der Vorschau:** der goldene Balken voll, der graue bei einem Drittel, die Karten an ihrem Platz, der Text hell, kein Stern.

**Meine Lesarten, zu denen David anders entscheiden kann:**
1. „Balken voll“ bei „weniger Bewegung“: Gezeigt wird der Endstand des Wettlaufs (Gold voll, Grau ein Drittel). Wären beide voll, sagte das Bild das Gegenteil der Überschrift.
2. Der Stern verlässt die Karte dort, wo die Maus sie verlässt. Kommt und geht die Maus über dieselbe Kante, geht er also auch dort hinaus (nicht „auf der anderen Seite“).
3. Die Fußnote steht direkt unter dem Wettlauf (dort steht auch das Sternchen), nicht unter den Karten.

### 4 · Bilder und Prüfung
- Bildbögen im echten Vollbild 2560 × 1440 der fertigen Fassung (eigenes Chrome-Profil ohne Leisten, Vollbild über CDP; `p7/echt.cjs`): Start nach Neuladen mitten auf der Seite und bei langsamem Laden (alle 300 ms), der Name unter der Maus je Sonderfall, der Wettlauf bei 0,4 s, 0,8 s und 4 s, die Glaskarten in vier Zuständen. Das Handy-Bild ist nachgestellt (390 × 844).
- Build, Lint und alle Tests bestehen. Funktionsprüfung nach `docs/funktionen.md` in der fertigen Fassung ohne Befund; lokal fehlt dort nur das Statistik-Skript von Vercel (`/_vercel/insights/script.js`), das es nur auf Vercel gibt.

### 5 · Nicht angefasst
Alles andere bleibt genau so. Kontakt-Bereich und Chat-Fenster kommen später. Nichts wurde echt abgesendet, nichts gepusht.

## 4m. Vierte Runde vom 14.11.2026: Zeichen später, Mauspunkt ohne Verzögerung, Scroll-Hinweis atmet, Kontakt als Glaskarten, schwache Geräte

Davids Rückmeldung zu b95adb9: Die Seite gefällt ihm sehr. Alles bleibt genau so, nur diese Punkte ändern sich. Das Chat-Fenster kommt danach in einem eigenen Auftrag.

### 1 · Start: Die Zeichen kommen später
`kopf/LichtName.tsx` (`FLUG_NACH_LICHT`).
- Die Zeichen fliegen erst los, wenn das Licht **ganz** an ist (Stern, Balken und Strahlen fertig: 2,5 s nach „Licht an“, am Handy 1,85 s), und dann noch **0,7 s später**. Bisher flogen sie bei 60 % der Lichtstärke los.
- Der Startflug selbst ist unverändert (2,2 s). Alles danach hängt am Flug und verschiebt sich mit: Kopfleiste und Knöpfe 1,1 s nach dem Abflug, die Welle 0,25 s nach der Landung, Freigabe 1,55 s nach der Landung, das Licht dreht sich 1 s später zur Maus.
- Das gilt für jede Lichtquelle (lebendes Licht, ruhiges Bild, Not-Licht) und übersteht einen Ausfall der Grafik in der Wartezeit: Der Abflug hängt nicht an der Szene.
- Nachzulesen im Browser: `performance.getEntriesByName("ag-start:licht-an")` und `"ag-start:flug"`. Gemessen in der fertigen Fassung (echtes Vollbild 2560 × 1440): Licht an bei 1,86 s, ganz an bei 4,32 s, die ersten Zeichen fliegen bei 5,02 s (0,70 s später), Kopfleiste bei 6,14 s, der Name steht bei 7,23 s, frei bei 8,82 s.

### 2 · Der goldene Mauspunkt folgt ohne Verzögerung
`seite/Zeiger.tsx`, Zeiger-Bilder in `seite/seite.css`.

**Gemessen (vorher):** Von der Mausbewegung bis zum Bild auf dem Schirm vergingen über dem Licht in der Mitte 46 ms, das sind 7,6 Bilder (165 Hz; 95 % unter 10,5 Bildern), in einem ruhigen Abschnitt 31 ms = 5,1 Bilder. Gemessen mit der Zeitaufzeichnung von Chrome (Abschnitte `EventLatency` für jede Mausbewegung bis zur Ausgabe des Bildes), rund 1000 Bewegungen je Messung, alter und neuer Stand direkt hintereinander.

**Ursache:** Das Setzen der Position kostete nur 0,5 ms. Die Zeit vergeht danach: Jedes Bild der Seite muss durch Stil, Zeichnen, Übergabe und die Grafikkarte, und davor steht meist schon das nächste an. Der Weg, den David vorgeschlagen hat (Position direkt im `pointermove` und `pointerrawupdate` setzen, nur `transform`, kein Glätten), war zum großen Teil schon gebaut und ist jetzt ganz so umgesetzt. Er kann diese Strecke aber nicht verkürzen: Alles, was die Seite zeichnet, kommt frühestens mit dem nächsten fertigen Bild der Seite auf den Schirm. Derselbe Weg gemessen nach dem Umbau: 49 ms = 8,0 Bilder über dem Licht, 37 ms = 6,1 Bilder im ruhigen Abschnitt (unverändert, im Rahmen der Schwankung).

**Deshalb ist der Punkt jetzt der Mauszeiger selbst.** Der goldene Punkt (8 px, mit feinem Schein) ist ein Zeiger-Bild, das der Browser dem Betriebssystem übergibt (`cursor: url(…) 16 16`, in einfacher und doppelter Auflösung; gedrückt etwas kleiner). Das Betriebssystem zeichnet den Zeiger selbst, unabhängig von den Bildern der Seite: Er sitzt immer genau dort, wo die Maus ist, so wie der gewöhnliche Pfeil. Ziel „höchstens 1 Bild“: erreicht, weil der Punkt auf kein Bild der Seite mehr wartet (das lässt sich in der Seite nicht mehr messen; die Zeitaufzeichnung sieht nur, was die Seite zeichnet).
- **Von der Seite gezeichnet** werden nur noch: der weiche goldene Schein hinter dem Punkt (zieht leicht nach, wie gewünscht), der Ring über Links und Knöpfen und die Glasblase „Ansehen“. Ihre Position wird direkt im Maus-Ereignis gesetzt (`pointermove`, in Chrome zusätzlich `pointerrawupdate`), nur mit `transform: translate3d`, mit `will-change: transform`, ohne Glätten; alles andere (welche Form gerade gilt) rechnet einmal je Bild.
- Über Links und Knöpfen ist der Zeiger des Betriebssystems ausgeblendet; dort zeigt die Seite den Ring. In Eingabefeldern und über dem Chat-Fenster gilt der gewöhnliche Zeiger. Ohne Skript, am Handy und bei „weniger Bewegung“ gibt es keinen eigenen Zeiger.

### 3 · Scroll-Hinweis: kommt nach 3 s und atmet, bis gescrollt wird
`seite/ScrollHinweis.tsx`, Stile in `kopf/kopf.css`.
- **3 s** nach dem Ende der Startanimation (Welle durch, Scrollen frei: `ag:start-frei`) blendet die Lichtleiste unten weich ein (0,9 s), wenn man dann noch ganz oben ist.
- Danach **atmet sie ununterbrochen** (ein Atemzug 3 s), bis man scrollt. Die Regel „höchstens dreimal“ ist entfallen.
- Beim ersten Scrollen blendet sie **langsam aus (1,2 s, gleichmäßig; gemessen 1,1 s)** und kommt bei diesem Seitenaufruf nicht wieder, auch nicht, wenn man wieder ganz nach oben scrollt.
- „Weniger Bewegung“: Sie steht ruhig da (55 % Deckkraft), ohne Atmen.

### 4 · „Sprechen wir über Ihr Projekt“: Anrufen steht klar im Mittelpunkt
`seite/KontaktBereich.tsx` (neu), `Anfrage.tsx` (Schalter `glas`), `anfrage-fehlt.ts` (reine Regeln, mit Tests), `seite/seite.css` (Block „Kontakt“), Texte in `lib/inhalt-neu.ts` (`kontakt`), Schalter in `lib/content.ts`. Anker `#kontakt` unverändert.

**a) Texte:** Hauptsatz „Rufen Sie uns an: Unser KI-Assistent nimmt sofort ab und macht direkt einen Termin mit Ihnen aus.“ („Rufen Sie uns an:“ in Gold). Darunter klein: „Kurze Frage? Unser KI-Chat unten rechts antwortet sofort.“ Am kleinsten, ganz unten: „Lieber schreiben?“ mit „Meist antworten wir innerhalb eines Werktages.“

**b) Anruf-Karte** (Glaskarte, das Wichtigste im Abschnitt):
- Links **„KI-Assistent bereit“** mit einem **grünen Punkt** (#4fdc92), der sanft atmet wie ein Statuslicht (ein weicher Ring pulsiert in 2,6 s). Daneben die Nummer, rechts der Knopf „Jetzt anrufen“ (Nummer und Knopf sind `tel:`-Verweise).
- Hinter der Karte liegt ein schwacher goldener Schein, leise wie der Logo-Stern; er atmet kaum merklich (5,4 s). Unter der Maus wird er etwas heller, und die Karte hebt sich um 3 px.
- Schmal (bis 720 px) stehen Status, Nummer und Knopf untereinander; der Knopf ist dann so breit wie die Karte.

**c) Chat-Hinweis:** Fährt die Maus über den Satz, läuft ein feiner goldener Lichtpunkt (6 px) in einem flachen Bogen vom Satz zum Chat-Knopf unten rechts (0,55 bis 1,1 s, je nach Weg), und der Knopf leuchtet kurz auf (1,4 s). Der Chat wird dabei nicht geöffnet und nicht angefasst: Gesetzt wird nur eine Klasse am `html`, die das Stylesheet auswertet. Ist der Chat offen, passiert nichts.

**d) WhatsApp ist ausgeschaltet.** Der Knopf „Per WhatsApp schreiben“ ist nicht gelöscht: Schalter `site.whatsappAnzeigen` in `lib/content.ts`, Standard `false`. Auf `true` steht er wieder unter der Anruf-Karte. Der Schalter gilt für die neue Seite und die Vergleichs-Varianten; die bisherige Startseite (`components/Contact.tsx`) ist nicht angefasst.

**e) Auftritt:** Beim Hinscrollen schweben die Karten nacheinander als Glas ein: Anruf-Karte, Chat-Hinweis, „Lieber schreiben?“, je 120 ms versetzt, 28 px von unten, weich, ohne Hüpfen, einmal je Seitenaufruf. Wie bei den Glaskarten oben blenden Glas und Inhalt einzeln ein (sonst spränge das Glas um).

**f) „Lieber schreiben?“ als Glaskarte mit Formular:**
- Klein unter der Anruf-Karte. Ein Klick öffnet die Karte; sie gleitet weich auf (die Höhe wächst, die Seite springt nicht). Sie öffnet sich auch, wenn oben bei einer Leistung „Anfragen“ gedrückt wird oder der Chat Angaben übergibt (wie bisher).
- **Goldenes Licht beim Ausfüllen:** Hinter dem Feld, in dem man gerade schreibt, liegt ein weicher goldener Schein (so groß wie das Feld, weit auslaufend). Ist ein Feld ausgefüllt, bleibt ein ganz leichter Goldschimmer.
- **Rotes Licht bei fehlenden Pflichtfeldern:** Drückt man „Anfrage absenden“ und ein Pflichtfeld ist leer, erscheint hinter genau diesem Feld ein weicher roter Schein, darunter ein kurzer Satz, was fehlt (Wortlaut in `docs/texte.md`); das erste fehlende Feld bekommt den Fokus. Sobald das Feld ausgefüllt ist, wird der Schein golden und der Satz verschwindet.
- **Die Prüfung ist dieselbe wie bisher:** Der Browser prüft (`required`, `type="email"`, Höchstlängen) und sendet bei einem Fehler nichts. Neu ist nur die Anzeige: Statt der Sprechblase des Browsers leuchtet das Feld. Zustand, Felder, Aufruf von `/api/contact` und die Meldungen des Servers sind unverändert (`useAnfrage`).
- Für Vorleseprogramme: Das Feld ist als ungültig gekennzeichnet (`aria-invalid`), der Satz ist mit ihm verbunden und wird angesagt.

### 5 · Auf anderen Rechnern flüssig: was auf schwachen Geräten automatisch leichter wird

**Geprüft** in der fertigen Fassung (Port 3200): im echten Vollbild 2560 × 1440, im Fenster 1366 × 768 und am nachgestellten Handy (375 × 812, Pixeldichte 3), je 20 s im Kopfbereich mit bewegter Maus und 14 s Scrollen durch die ganze Seite; mit 4-fach gebremstem Prozessor (Bremse der Entwicklerwerkzeuge von Chrome) und mit Software-Grafik (Chrome rechnet ohne Grafikkarte: SwiftShader).

**a) Bildschirm entsperrt, gewöhnlicher Betrieb** (alter Stand b95adb9 am Vormittag, neuer Stand am Nachmittag des 14.11.2026; dazwischen lief anderes auf dem Rechner):

| Fall | Kopfbereich mit bewegter Maus: alt → neu | Scrollen: alt → neu | längstes Bild beim Scrollen: alt → neu | Sparstufe neu | Licht |
|---|---|---|---|---|---|
| Echtes Vollbild 2560 × 1440, ungebremst | 110 → **129** Bilder/s | 116 → **151** Bilder/s | 67 → 54 ms | 0 | lebendig |
| Fenster 1366 × 768, ungebremst | 56 → **74** Bilder/s | 62 → **84** Bilder/s | 206 → 104 ms | 0 | lebendig |
| Fenster 1366 × 768, Prozessor 4-fach gebremst | 14,4 → **21** Bilder/s | 16,3 → **27** Bilder/s | 1965 → 545 ms | 0 | lebendig |
| Handy 375 × 812 (Pixeldichte 3), Prozessor 4-fach gebremst | 67 → **90** Bilder/s (ohne Maus) | 6,2 → **44** Bilder/s | 1456 → 121 ms | 0 | lebendig |
| Fenster 1366 × 768, Software-Grafik (ohne Grafikkarte) | 2,6 → **4,4** Bilder/s | 2,1 → **4,6** Bilder/s | 831 → 479 ms | 4 | lebendig |
| Fenster 1366 × 768, Software-Grafik und Prozessor 4-fach gebremst | 0,5 → **3** Bilder/s | 0,4 → **3,9** Bilder/s | 4641 → 472 ms | 4 | lebendig |

**b) Alt und neu abwechselnd unter gleichen Bedingungen** (dabei war Davids Bildschirm gesperrt; dann läuft alles schneller als sonst, der Vergleich ist aber der sauberste):

| Fall | Kopfbereich mit bewegter Maus: alt → neu | Scrollen: alt → neu | längstes Bild beim Scrollen: alt → neu | Sparstufe neu | Licht |
|---|---|---|---|---|---|
| Fenster 1366 × 768, ungebremst | 144 → **157** Bilder/s | 139 → **156** Bilder/s | 73 → 74 ms | 0 | lebendig |
| Fenster 1366 × 768, Prozessor 4-fach gebremst | 33 → **46** Bilder/s | 44 → **60** Bilder/s | 345 → 60 ms | 0 | lebendig |
| Handy 375 × 812 (Pixeldichte 3), Prozessor 4-fach gebremst | 156 → **164** Bilder/s (ohne Maus) | 33 → **98** Bilder/s | 436 → 50 ms | 0 | lebendig |
| Fenster 1366 × 768, Software-Grafik (ohne Grafikkarte) | 2,8 → **7** Bilder/s | 3,5 → **15,2** Bilder/s | 455 → 437 ms | 4 | lebendig |

**Gefunden und behoben (gilt für alle Geräte, auf schwachen merkt man es am meisten):**
1. **Eine Stil-Regel ließ den Browser die ganze Seite neu rechnen,** sobald irgendwo ein Zeichen wechselte (Überschriften, Geister-Wörter, Sprechblase): „alle Teile von Kopfleiste und Chat-Knopf sind vor dem Start nicht klickbar“, geschrieben mit `:has()` und `> *`. Bei jedem zehnten Stil-Durchgang rechnete er rund 2300 Elemente neu statt rund 30. Jetzt setzt die Regel nur einen Wert an den drei Behältern, der sich vererbt (`--ag-klick`, `kopf.css`, `welt.css`); das Verhalten ist dasselbe. Stil-Arbeit beim Scrollen: mehr als halbiert.
2. **Die Überschriften fragten für jeden Buchstaben Schrift und Farbe neu beim Browser ab** (ein „lebendes“ Stil-Objekt); nach jedem geänderten Buchstaben rechnete er dafür die Seite durch. Jetzt werden die Werte einmal beim Aufbau abgelesen (`seite/Entschluesselt.tsx`). Das war beim Scrollen rund ein Viertel der Rechenzeit.
3. **Der Glimmrand der Kopfleiste** maß und schrieb je Bild abwechselnd (für jedes Teil eine Durchrechnung der Seite). Jetzt: erst alle messen, dann alle setzen; ein Teil, das fern der Maus dunkel ruht, wird gar nicht angefasst (`glimmrand.ts`). Das war bei bewegter Maus rund ein Fünftel der Rechenzeit.

**Was auf schwachen Geräten automatisch leichter wird** (in dieser Reihenfolge; Inhalt und Funktionen bleiben immer dieselben):
- **Licht, Sparstufen 1 und 2** (die Grafikkarte braucht für ein Licht-Bild länger als 72 % der Zeit bis zum nächsten): kleinere Zwischenbilder der Strahlen (250 000, dann 190 000 Bildpunkte statt 330 000) und der Öffnungen (90 %, 80 %). Nicht zu sehen.
- **Sparstufe 3:** dazu weniger Proben je Bildpunkt (60 %) und 20 statt 30 Proben in den Öffnungen.
- **Sparstufe 4** (sparsamste): dazu nur jedes zweite Licht-Bild (27 bis 30 je Sekunde). **Neu:** In dieser Stufe trägt die Seite die Klasse `ag-sparsam`: Glas (Kopfleiste, Chat-Knopf, Karten, Glasblase) zeichnet dann nicht mehr weich, was dahinter liegt, und ist dafür dunkler getönt. Form, Lichtkante, Goldrand und Schatten bleiben.
- **Neu: Die Wache reagiert auch bei wenigen Bildern je Sekunde binnen Sekunden.** Ein Messfenster schließt nach 60 Messungen oder spätestens nach 2 s (mit mindestens 8 Messungen); vorher brauchte ein Schritt bei 3 Bildern je Sekunde rund eine Minute (`wachFensterVoll`, `schonfristVorbei` in `kopf/startlogik.ts`).
- **Neu: Ohne Grafikkarte** (der Browser rechnet die Grafik in Software; erkannt am Namen des Grafik-Treibers, `softwareGrafik`) beginnt das Licht sofort in der sparsamsten Stufe, und die Seite ist von Anfang an im sparsamen Modus.
- **Nie ein Standbild am Computer.** Das Licht bleibt in jeder Stufe lebendig (`data-licht="live"` in allen Fällen oben). Die Zeichenfläche und das Korn bleiben immer in voller Auflösung. Ein ruhiges Bild gibt es nur bei „weniger Bewegung“, ohne WebGL und als letzte Rettung für sehr schwache Handys.
- **Handy** (wie bisher): Licht mit 60 statt 80 Proben, ohne Maus; der Name steht still; kein eigener Mauszeiger; Glaskarten untereinander, der Stern zieht einmal durch.
- **Der goldene Mauspunkt** bleibt auf jedem Gerät genau auf der Maus, auch wenn die Seite ruckelt (Punkt 2).

**Zur Software-Grafik:** Dort kostet schon das Zusammensetzen der Seite selbst die meiste Zeit; versuchsweise das Licht in halber Feinheit zu zeichnen, brachte fast nichts (5,0 → 5,5 Bilder je Sekunde) und ist deshalb nicht eingebaut (das Korn bleibt überall in voller Auflösung). Solche Rechner sind selten (Grafik-Beschleunigung im Browser abgeschaltet, virtuelle Maschinen, Fernsteuerung).

**Zur Messung:** Die Prozessor-Bremse und die Software-Grafik sind Nachstellungen auf Davids MacBook (M1), kein echter schwacher Rechner. Die 4-fache Bremse entspricht einem deutlich älteren Bürorechner. Tabelle a zeigt, was auf einem echten Bildschirm ankommt, hat aber unterschiedliche Fremdlast zwischen alt und neu; Tabelle b vergleicht alt und neu unmittelbar nacheinander, lief aber bei gesperrtem Bildschirm und zeigt deshalb höhere Zahlen. Beide zeigen dieselbe Richtung.

**Was bleibt:** Mit 4-fach gebremstem Prozessor läuft die Seite am Computer bei entsperrtem Bildschirm mit gut 20 Bildern je Sekunde (bewegte Maus über dem Namen) und knapp 30 beim Scrollen: besser als vorher (14 und 16), aber nicht flüssig. Die Sparstufen des Lichts greifen dort nicht, weil nicht die Grafikkarte der Engpass ist, sondern der Prozessor (das Zeichnen der rund 900 Zeichen des Namens je Bild und die Stil-Arbeit des Browsers). Ohne Grafikkarte bleibt die Seite benutzbar, aber ruckelig.

### 6 · Meine Lesarten, zu denen David anders entscheiden kann
1. **Mauspunkt als Zeiger des Betriebssystems** statt eines von der Seite gezeichneten Punkts: Nur so sitzt er wirklich auf der Maus (Punkt 2). Folge: Der Punkt wechselt Farbe und Größe nicht mehr weich, sondern in einem Schritt (gedrückt), und in Bildern der Seite ist er nicht zu sehen.
2. **„3 s, nachdem die Startanimation fertig ist“** zählt ab der Freigabe (Welle durch, Scrollen frei), nicht ab der Landung des Namens.
3. **„Kommt in dieser Sitzung nicht wieder“** heißt: nicht bei diesem Seitenaufruf. Nach dem Neuladen zeigt sie sich wieder (ein Merker über das Neuladen hinweg war der Grund, warum David sie früher nie sah).
4. **WhatsApp** ist nur im Kontakt-Bereich der neuen Seite (und der Vergleichs-Varianten) ausgeschaltet. Datenschutz-Text und die bisherige Startseite sind nicht angefasst.
5. **Der Lichtpunkt zum Chat** läuft nur mit Maus (am Handy gibt es kein Drüberfahren) und höchstens einer zugleich.

### 7 · Bilder und Prüfung
- Bildbögen aus der fertigen Fassung (Port 3200): Start als Bildreihe mit den Zeiten aus der Seite; Mauspunkt vorher und nachher; Scroll-Hinweis bei 3 s, 8 s, 20 s und beim Ausblenden; Kontakt am Computer und am Handy; Formular mit goldenem und rotem Schein; Bildraten auf den nachgestellten schwachen Geräten. Start und Scroll-Hinweis im echten Vollbild 2560 × 1440; der Kontakt in 1920 × 1080 und am nachgestellten Handy (375 × 812).
- Geprüft in der fertigen Fassung: alle 24 Fälle der Startanimation (Liste in 4l) (jeder mit allen Zuständen in der richtigen Reihenfolge, die Seite bis zur Freigabe bei 0 px), die Sperre gegen Scrollen, der Name unter der Maus, der Kontakt-Bereich am Computer, am Handy und bei „weniger Bewegung“. Dabei ging keine Anfrage an `/api` (alle gesperrt), und „Anfrage absenden“ wurde nur mit leeren Pflichtfeldern gedrückt (der Browser sendet dann nichts).
- Build, Lint und alle Tests bestehen (264 Tests; neu: `tests/anfrage-fehlt.test.ts`, drei weitere in `tests/kopf-start.test.ts`).
- **Ohne zweite KI geprüft:** Codex war nicht erreichbar (Nutzungsgrenze des Kontos erreicht, laut Meldung bis 18.11.2026). Stattdessen habe ich die Punkte, die Codex prüfen sollte, selbst im Browser nachgemessen: Kopfleiste, „Anrufen“, Chat-Knopf und Daumen-Knopf sind vor der Landung nicht klickbar und danach klickbar (Computer und Handy); der Zeiger ist im Kopfbereich das Goldpunkt-Bild, über Links der Ring, in Eingabefeldern der gewöhnliche Zeiger.
- **Beim Prüfen aufgefallen, nicht angefasst:** Am Handy liegt der Anrufen-Knopf am Daumen auch im Kontakt-Abschnitt über dem unteren Rand und verdeckt dort ein Stück des Formulars (er war schon vorher da). Im Kontakt steht ohnehin „Jetzt anrufen“; dort könnte er ausgeblendet werden.

### 8 · Nicht angefasst
Alles andere bleibt. Das Chat-Fenster kommt im nächsten Auftrag. Nichts wurde echt abgesendet, nichts gepusht.

## 4n. Fünfte Runde vom 14.11.2026: Das Chat-Fenster im neuen Stil

**Stand 14.11.2026, sechste Runde: Öffnen, Kopf-Logo, Nachdenken, Entschlüsseln, Anruf-Chip, Kontakt-Block und Vorschläge sind in Abschnitt 4o neu geregelt.** Was hier dazu steht, beschreibt den Stand davor.

Davids Auftrag: Das Chat-Fenster bekommt das Design der neuen Seite (dunkles Glas, Gold, Zeichen-Effekte). Die Logik bleibt genau so. Die alte Startseite (`/`) behält ihr altes Fenster, bis David die Startseite umstellt.

### 0 · Aufbau: eine Logik, zwei Hüllen
- **Die Logik ist unverändert herausgezogen** (wörtlich verschoben, nichts umgeschrieben): `components/chat/useChat.ts`. Sie läuft genau einmal, im Stammlayout um alle Seiten (`components/chat/ChatAnbieter.tsx`): Antworten über `/api/chat`, Übergabe an das Team über das Support-Ticket (`/api/support`; Antworten aus Discord erscheinen im Chat), Übernahme ins Kontaktformular, Verlauf, Gesprächsprotokoll, alle Schutzregeln. An `app/api`, `lib/support.ts` und den Schnittstellen ist nichts geändert.
- **Zwei Hüllen zeigen denselben Chat:** das bisherige Fenster (`components/ChatWidget.tsx`, jetzt nur noch Anzeige) und das Glasfenster der neuen Seite (`components/neu/chat/ChatFenster.tsx`, `chat.css`). Ist das Glasfenster auf der Seite, zeichnet das alte nichts. Der Verlauf bleibt beim Wechsel zwischen den Seiten derselbe.
- Reine Text-Regeln stehen in `lib/chat-text.ts` (Marker entfernen, Verlauf für die KI; neu: Wörter, Takt, Links, Telefonnummern), mit Tests.
- Der Chat-Knopf der neuen Seite öffnet den Chat jetzt direkt (vorher klickte er den verborgenen alten Knopf an).

### 1 · Öffnen und Fenster
- **Öffnen:** Der Stern im Chat-Knopf wächst auf (bis zum 7,5-Fachen, er vergeht dabei), und das Fenster faltet sich als Raute aus der Mitte des Knopfs aus (0,58 s, weich auslaufend; `--cf-r` als Halbmesser der Raute). 0,14 s nach dem Klick setzt sich der Kopf aus Zeichen zusammen (0,62 s). Schließen: umgekehrt, zügiger (0,4 s). Gemessen in echtem Chrome, fertige Fassung: erstes Öffnen beginnt nach 0,12 s und ist nach 0,58 s ganz offen; jedes weitere 0,02 s und 0,47 s. (Der Inhalt wird dafür schon vorher in einer ruhigen Minute vorbereitet; solange das Fenster zu ist, läuft darin nichts.)
- **Glasfenster:** 404 × 660 px unten rechts, dunkles Milchglas wie die Kopfleiste (`blur(18px)`), feine Goldkante (oben links und unten rechts kräftiger), weicher Schatten, Radius 26 px. Dahinter ganz schwach der Logo-Stern als Lichtschein (durch das Glas weichgezeichnet).
- **Kopf:** Das Logo ist ein Kreis von 48 px, den der Stern fast ganz ausfüllt (kein breiter schwarzer Rand); er atmet leicht (4,6 s), feine Strahlen wiegen sich dazu: die Bilder des leichten Sterns, ohne Korn. Daneben „Agents Gilt“, darunter „KI-Assistent · online“ mit grünem Punkt, der sanft atmet (2,6 s). Schließen: ein kleiner Glasknopf. Esc schließt ebenfalls; der Fokus geht zurück zum Chat-Knopf.

### 2 · Nachrichten
- **Antworten entschlüsseln sich:** Jedes Wort erscheint erst als goldene Zufallszeichen (`▓ # % = ▒ + : /` in JetBrains Mono), 0,15 s lang, und rastet dann in normale Schrift ein, Wort für Wort von links nach rechts. Jedes Wort hat von Anfang an seinen endgültigen Platz: nichts springt. **Tempo:** Eine Antwort, die schon ganz da ist, steht nach etwa 1 s (850 ms geteilt durch die Zahl der Wörter, mindestens 12, höchstens 45 ms je Wort; `wortTakt`). Kommt sie noch an (Streaming), entschlüsselt sie sich fortlaufend und holt auf, nie langsamer als 40 ms je Wort.
- **Ist der Text fertig, ist er gewöhnlicher Text:** markierbar, kopierbar. Für Vorleseprogramme steht er von Anfang an vollständig da (die Zeichen-Ebene ist für sie unsichtbar).
- **„Schreibt gerade“:** drei kleine Zeichen, die alle 0,11 s durcheinanderwürfeln.
- **Die eigene Nachricht** erscheint verbuggt und rastet nach 0,25 s von links nach rechts als der getippte Text ein, in einer leicht goldenen Glasblase rechts.
- **Die 3 Vorschläge** (unverändert aus der Logik): Sie erscheinen nacheinander (je 140 ms versetzt), sobald die Begrüßung steht, zuerst als schwache Zeichenreihen. Beim Drüberfahren (oder mit der Tastatur) setzen sie sich zum Text zusammen (0,42 s) und bleiben lesbar. Ein Klick lässt den Vorschlag ins Eingabefeld fliegen (0,36 s) und schickt ihn ab. Am Handy stehen sie gleich lesbar da. Für Vorleseprogramme tragen die Knöpfe immer ihren Text.
- **Links und Nummern:** Adressen im Netz und E-Mail-Adressen sind golden mit einer schwachen Unterstreichung, über die sich beim Drüberfahren eine kräftige zieht (0,4 s). Telefonnummern werden zu einem kleinen Glas-Chip „Jetzt anrufen“ mit der Nummer (`tel:`-Verweis). Erkannt werden nur Nummern mit +49 oder führender Null und mindestens 7 Ziffern (`reichTeile`).
- Nur frische Nachrichten entschlüsseln sich: Der Verlauf von vorher und alles, was bei geschlossenem Fenster ankommt, steht einfach da.

### 3 · Eingabe und Knöpfe
- **Eingabefeld:** Glas; mit Fokus oder Text liegt ein goldener Schein dahinter (wie im Kontaktformular). Der Platzhalter wechselt alle 3,6 s verbuggt zwischen den Beispielfragen (Wortlaut in `docs/texte.md`). Das Feld wächst mit dem Text bis 120 px; Enter sendet, Umschalt+Enter macht eine neue Zeile (wie bisher).
- **Senden-Knopf:** der kleine Logo-Stern. Dunkel, solange nichts eingetippt ist (und gesperrt, wie bisher); golden leuchtend, sobald Text da ist. Beim Senden zieht ein feiner Lichtstrich nach oben in den Verlauf (0,52 s).
- **„Mit einem Mitarbeiter sprechen“:** ein Glasknopf mit Sprechblasen-Zeichen (kein Hörer), immer unter dem Eingabefeld neben „Agents Gilt ist eine KI“; beim Drüberfahren verbuggt der Text kurz. Er führt nur zu einem Weg: dem bestehenden Support-Ticket. Bietet der Assistent ihn an (Marker), steht er zusätzlich groß unter der Antwort, darunter klein der Chip „Jetzt anrufen“ und „Anfrage schicken“ (führt wie bisher mit den übernommenen Angaben zum Kontaktformular).
- **Das Ticket-Formular** ist eine Glaskarte im Chat. Darüber steht: „Du schreibst gleich mit einem echten Mitarbeiter aus unserem Team. Er antwortet hier im Chat.“ Felder, Prüfung und Senden sind die bisherigen (Name, E-Mail oder Telefon, Anliegen, das unsichtbare Feld gegen Roboter). Neu ist nur die Anzeige wie im Kontaktformular: goldener Schein mit Fokus, leichter Goldschimmer bei ausgefüllten Feldern, roter Schein mit kurzem Satz bei fehlenden Pflichtfeldern (der Browser sendet dann wie bisher nichts).
- **Verbunden:** Der Kopf zeigt statt „KI-Assistent · online“ „Team · verbunden“ mit grünem Punkt, der Platzhalter „Schreib dem Team …“. Endet der Chat mit dem Team, zeigt der Kopf wieder „KI-Assistent“.

### 4 · Was der Assistent rät (`lib/chatbot-knowledge.ts`)
- **Termin ausmachen:** Er verweist immer aufs Anrufen und schreibt die Nummer aus; das Fenster macht daraus den Chip „Jetzt anrufen“ (neue Regel 9).
- **Fragen, die er nicht klären kann:** Er bietet an, mit einem Mitarbeiter zu sprechen; der Knopf öffnet das Support-Ticket (Regeln 3 und 4, Marker unverändert).
- **WhatsApp** ist aus den Kontaktwegen heraus. Fragt jemand ausdrücklich danach, sagt er, dass das Team es gern gibt, und bietet den Mitarbeiter-Chat an (neue Regel 10).
- Wissen, Ton und die übrigen Regeln sind unverändert. Das Wissen gilt für den Chat auf allen Seiten, auch auf der alten Startseite.

### 5 · Handy, Ruhe, Leistung
- **Am Handy** (bis 767 px) gleitet das Fenster als Glasblatt von unten hoch (0,5 s), 94 % der sichtbaren Höhe, mit Griff. Am Griff oder Kopf hinunterwischen schließt es (ab 120 px oder bei schnellem Zug; sonst federt es zurück), ein Tipp auf den abgedunkelten Rest ebenso. **Die Tastatur verdeckt das Eingabefeld nie:** Das Blatt richtet sich nach dem sichtbaren Teil des Bildschirms (`visualViewport`) und schrumpft mit. Schrift in den Feldern 16 px (sonst vergrößert das iPhone die Seite). Am Handy bekommt das Eingabefeld beim Öffnen nicht von selbst den Fokus (die Tastatur schöbe sonst Begrüßung und Vorschläge weg).
- **„Weniger Bewegung“:** Alles steht sofort da: kein Ausfalten, keine Zeichen-Effekte, kein Atmen, kein wechselnder Platzhalter.
- **Leistung:** Zeichen laufen nur, solange sich eine sichtbare Nachricht entschlüsselt. Ist das Fenster zu, läuft nichts (keine Schleife, kein Zeitgeber, die Animationen des Kopfs ruhen). Im sparsamen Modus (4m) zeichnet auch dieses Glas nicht weich.

### 6 · Meine Lesarten, zu denen David anders entscheiden kann
1. **„Anfrage schicken“ bleibt** als kleiner dritter Weg unter dem Mitarbeiter-Knopf (es ist eine bestehende Funktion mit Übernahme ins Kontaktformular). Der Mitarbeiter-Knopf selbst führt nur zum Ticket.
2. **Die Begrüßung mit 👋 und das Du** bleiben, wie sie sind (Text der Logik; die offene Frage dazu steht in `docs/texte.md`).
3. **Vorschläge bleiben nach dem ersten Drüberfahren lesbar** (sie fallen nicht in Zeichen zurück).
4. **Auch Antworten des Teams entschlüsseln sich,** wenn sie bei offenem Fenster ankommen.
5. **Der Chip heißt überall „Jetzt anrufen“** (im Auftrag einmal „Anrufen“, einmal „Jetzt anrufen“).

### 7 · Prüfung
- **Nichts wurde echt abgesendet.** Alle Durchläufe liefen mit nachgestelltem Netz: In der Seite antworten `fetch` und `sendBeacon` für `/api/chat`, `/api/support` und `/api/chat-log` selbst (auch gestreamt), und zusätzlich wurde jede echte Anfrage an `/api/**` im Browser abgebrochen und gezählt: in allen Durchläufen 0.
- Fertige Fassung, Computer: Öffnen, Vorschläge, Frage und Antwort mit Anruf-Chip, Link, Preisfrage mit Mitarbeiter-Knopf, Ticket mit leeren Pflichtfeldern (rot, keine Anfrage, auch nicht ans nachgestellte Netz), „Team · verbunden“, Antwort des Teams, Ende des Team-Chats, Esc. Handy (375 × 812): Blatt, Vorschläge lesbar, nachgestellte Tastatur (Feld bleibt zu sehen), Ticket, Hinunterwischen; keine Tippfläche unter 40 px, nichts ragt über den Rand. „Weniger Bewegung“: kein einziger Zeichen-Effekt. **Alte Startseite `/`:** altes Fenster wie bisher (Begrüßung, 3 Fragen, drei Wege, Übergabe-Formular). Wechsel zwischen den Seiten: derselbe Verlauf, immer genau ein Fenster.
- Die Tastatur am Handy ist nachgestellt (kleinere sichtbare Höhe), nicht auf einem echten Telefon geprüft.
- **Logik wörtlich verschoben:** maschinell verglichen mit dem Stand vor dem Umbau (2fcf4b9): Der Rumpf der Logik (456 Zeilen), alle Hilfsfunktionen und Konstanten und die Anzeige des alten Fensters sind Zeichen für Zeichen gleich.
- Build, Lint und alle Tests bestehen (275 Tests; neu: `tests/chat-text.test.ts`).
- **Ohne zweite KI geprüft:** Codex war nicht erreichbar (Nutzungsgrenze des Kontos, laut Meldung bis 18.11.2026).
- **Beim Prüfen aufgefallen, nicht angefasst:** Die Meldung des Kontaktformulars bei einem Zustellfehler (`lib/kontakt-ablauf.ts`, Logik) nennt weiter WhatsApp („Bitte ruf uns kurz an oder schreib uns per WhatsApp.“).

### 8 · Nicht angefasst
Schnittstellen (`app/api`), `lib/support.ts`, das Wissen des Telefon-Assistenten (`voice-agent-prompt.md`), die alte Startseite und ihr Fenster (nur die Logik liegt jetzt in einer eigenen Datei). Nichts gepusht.

## 4o. Sechste Runde vom 14.11.2026: Chat-Feinschliff, Lichtreflex an allen Karten, Stern bricht durchs Glas

Davids Auftrag (Prompt 10). Ersetzt aus 4n: das Ausfalten als Raute, den Stern im Kopf, die würfelnden Zeichen beim Nachdenken, das schnelle Entschlüsseln, den Anruf-Chip im Text, den Block „Der Assistent kommt nicht weiter“ und die Vorschläge als Zeichenreihen. Ersetzt aus 4m: „Nur der Schein zieht nach“.

### 1 · Logo oben links im Chat
- Im Kopf steht **unser Logo**: der vierzackige Stern mit den vier schrägen Balken (`LogoFormen` aus `components/neu/Marke.tsx`), in Gold (Verlauf von hellem zu sattem Gold) mit leichtem Schein, im dunklen Kreis von 48 px mit feinem Goldring.
- Beim Öffnen baut es sich auf: erst der Stern (0,38 s), dann die vier Balken nacheinander von außen an ihren Platz (je 0,34 s, 70 ms versetzt).

### 2 · Drei Punkte beim Nachdenken
- Drei goldene Punkte in der Glasblase, die nacheinander pulsieren (größer und heller, dann zurück; 0,15 s versetzt; Runde 1,2 s; endlos).
- Sie stehen, **solange der Assistent nachdenkt und solange die Antwort ankommt**. Die Antwort wird im Hintergrund gesammelt; halbe Sätze sieht man nie (`streamText` zeigt das neue Fenster nicht mehr).
- Ist die Antwort ganz da: Die Blase wächst in 0,4 s von der Größe der Punkte-Blase auf ihre endgültige Größe (der Text hat dabei schon seine endgültige Breite, keine Zeile bricht um), die drei Punkte fliegen zu den ersten drei Wörtern und gehen dort in die Zeichen über. Es ist dieselbe Zeile im Verlauf (gleicher Schlüssel), nichts wird ausgetauscht.
- „Weniger Bewegung“: drei ruhige Punkte, die Antwort steht danach einfach da.

### 3 · Entschlüsseln als ruhige Welle
- Die Zufallszeichen tauchen **nacheinander** auf, Wort für Wort von links nach rechts. Jedes Wort besteht zuerst aus gedämpft goldenen Zufallszeichen **in voller Wortlänge** (die Zeichen werden je Wort so gesetzt, dass sie genau in den Platz des Wortes passen), sie wechseln rund alle 80 ms, und jedes Mal nur etwa die Hälfte.
- Jedes Wort bleibt **0,6 s** Zeichen, dann rastet es ein, leuchtet 0,5 s warm nach und wird gewöhnlicher Text. Die Welle des Einrastens läuft der Welle der Zeichen mit festem Abstand hinterher.
- Dauer (`wellenPlan` in `lib/chat-text.ts`, mit Tests): kurze Antwort rund 2 s, normale 2,5 bis 3 s, nie über 3,5 s; bei langen Antworten wird der Takt schneller, die Zeichenzeit bleibt. Gemessen (fertiger Build, 34 Wörter): 2,65 s bis zum letzten Wort, dazu 0,5 s Nachleuchten.
- Jedes Wort hat von Anfang an seinen Platz. Vorleseprogramme bekommen den Text sofort. Die Begrüßung läuft genauso.

### 4 · Knöpfe unter der Nachricht statt im Text
- Neuer Marker `[ANRUFEN]` (Termine), `[MITARBEITER]` auch bei tiefergehenden Fragen (Preise, „Was passt für mich?“, konkretes Projekt, Sonderwünsche, Vergleiche, Beschwerden, Wunsch nach einem Menschen). Regeln 8 und 9 in `lib/chatbot-knowledge.ts` mit Beispielen; bei Terminen schreibt der Assistent **keine Telefonnummer** mehr in den Text.
- `angebote()` in `lib/chat-text.ts` liest aus den Markern, was unter der Antwort angeboten wird; die Nachricht merkt es sich (`anrufen`, `mitarbeiter`).
- Erst wenn die Nachricht fertig entschlüsselt ist, blenden darunter (außerhalb der Blase) weich und nacheinander ein: bei `[ANRUFEN]` die **Anruf-Karte** (kleine Ausgabe der Karte bei „Sprechen wir über Ihr Projekt“: Milchglas, grüner atmender Punkt mit „KI-Assistent bereit“, Nummer, goldener Knopf „Jetzt anrufen“, beides `tel:`), bei `[MITARBEITER]` der Glasknopf **„Mit einem Mitarbeiter schreiben“**, bei beiden dazwischen die kleine Zeile „Für weitere Fragen verbinden wir Sie gern mit einem Mitarbeiter.“
- Eine Telefonnummer im Text ist ein gewöhnlicher goldener Link (kein Chip mehr). Der alte Block mit `showContact` entfällt im neuen Fenster, also auch „Anfrage schicken“ dort; die Übernahme ins Kontaktformular läuft weiter von selbst (Ereignis `ag:prefill-contact`).
- **Alte Startseite:** Ihr Fenster versteht `[ANRUFEN]`: Der Marker erscheint nie, unter der Nachricht steht der alte Knopf „Jetzt anrufen“ mit Nummer (wenn nicht ohnehin der alte Kontakt-Block erscheint).

### 5 · „Mit einem Mitarbeiter schreiben“ und das Formular
- Überall umbenannt (Knopf im Verlauf, kleiner Knopf unten, Regeln des Assistenten).
- Das Formular (Name, E-Mail oder Telefon, Nachricht) füllt die **Nachricht mit einer KI-Zusammenfassung** des bisherigen Chats: 2 bis 3 kurze Sätze in der Ich-Form des Besuchers. Schnittstelle `app/api/chat/zusammenfassung/route.ts` (Modell `claude-haiku-5-5`, `max_tokens` 200, Nachdenken aus, 12 Anfragen je 5 Minuten und IP, dieselben Längengrenzen wie der Chat, nur der Verlauf, den die KI ohnehin sehen darf). Regeln und Säubern in `lib/chat-zusammenfassung.ts`, Abruf mit 6 s Zeitgrenze in `components/chat/zusammenfassung.ts`.
- Während sie kommt: drei goldene Punkte im Feld; dann entschlüsselt sich der Text zügig (rund 1 s). Klappt es nicht: Feld leer mit Platzhalter, nichts hängt. Was der Besucher tippt, wird nie überschrieben; hat er getippt, bleibt sein Text auch beim erneuten Öffnen.
- Name und Kontakt aus `[DATEN]` stehen wie bisher in den Feldern. „Verbinden“, Schutzregeln und alles dahinter sind unverändert.

### 6 · Vorschläge und Beispielfragen
- Die drei Vorschläge stehen sofort lesbar da: Sobald die Begrüßung steht, gleiten sie nacheinander hinein (140 ms versetzt), jeder mit einem kurzen Lichtstreif, und ihr Text entschlüsselt sich kurz. Unter der Maus verbuggen sie wie die anderen Texte.
- Vier neue Beispielfragen im Eingabefeld (jetzt sieben).

### 7 · Alle Lichter folgen der Maus ohne Verzögerung
- **Schein des Mauszeigers** (`Zeiger.tsx`): Seine Stelle wird direkt in `pointermove` und `pointerrawupdate` gesetzt, wie Ring und Glasblase.
- **Glimmrand** (`glimmrand.ts`): Der Lichtfleck sitzt sofort an der Stelle des Randes, die der Maus am nächsten ist. Weich ist nur das Auf- und Abblenden (Zeitkonstante 0,05 s, steht nach rund 0,15 s).
- **Gemessen** (Maus mit festem Tempo, alter und neuer Stand direkt hintereinander): Schein vorher 9 px hinter der Maus bei 400 px/s und 26 px bei 1200 px/s (rund 22 ms), jetzt 0. Glimmrand vorher 22 px bei 400 px/s (56 ms) und 50 px bei 1200 px/s (41 ms), jetzt 0.
- **Eine gemeinsame Schleife:** Alle Teile mit `data-glimm` melden sich bei einer Stelle an (ein Maus-Lauscher, eine Bildschleife). Erst alle Flächen messen, dann setzen; gemessen wird nur, was im Bild oder bis 200 px daneben ist; ferne Teile werden nicht angefasst; nur Geändertes wird geschrieben.

### 8 · Lichtreflex am Rand an allen Karten
- Den Glimmrand haben jetzt auch: das offene Chat-Fenster, die drei Glaskarten, die Karten bei „Unser Versprechen“, die Zertifikate (auf dem hellen Papier 2 px und kräftiger), die Anruf-Karte und „Lieber schreiben?“ im Kontakt, die kleine Anruf-Karte im Chat. Alle bisherigen Effekte dieser Karten bleiben.
- Die Werte hängen wo möglich an einem Teil ohne Kinder (bei den Glaskarten und Kontakt-Karten an der Glasfläche), damit der Browser je Bild nur den Rand neu rechnet und nicht den ganzen Inhalt der Karte.

### 9 · Der Stern hinter den drei Glaskarten bricht durchs Glas
1. **Lichtkreuz:** vier dünne Lichtstreifen aus dem Stern, waagerecht und senkrecht bis an die Kartenränder, in der Mitte hell, zu den Enden auslaufend; zwischen Stern und Glas, mit Aufhellen gemischt, bewegt nur über Verschieben und Deckkraft.
2. **Klares Glas am Stern:** zwei Glas-Ebenen, eine matte (11 px Unschärfe) und eine klare (1,6 px, etwas heller). Solange ein Stern in der Karte ist, stellt eine Maske im Umkreis von 170 px die klare frei. Der Text wird dort etwas heller.
3. **Brechung an der Kante:** je Kante ein heller Saum auf Höhe des Sterns, 2 px nach außen versetzt, außen ein Hauch kühl, innen ein Hauch warm; stark nur nahe der Kante (`kantenLicht`, mit Test).
4. **Licht auf den Nachbarkarten:** Der Rand der Nachbarkarte glimmt an der gegenüberliegenden Stelle mit auf (über den gemeinsamen Glimmrand, gleiche Werte), schwächer mit dem Abstand des Sterns zur Kante und kurz stärker, wenn der Stern zu ihr hinausgleitet.
- Am Handy laufen Lichtkreuz und Brechung beim Durchzug mit, die Nachbarkarte glimmt kurz auf. Bei „weniger Bewegung“ nichts davon. Der Stern bleibt verborgen, bis die Karte eingeschwebt ist.
- **Sparstufen:** Stockt die Bildfolge, solange ein Stern leuchtet (Bilder über 30 ms), fällt zuerst das Licht auf den Nachbarkarten weg, dann das klare Glas; im sparsamen Modus der Seite gleich beides.

### 10 · Öffnen und Schließen: das Fenster wird zur Kugel
- **Schließen (0,6 s):** Der Inhalt zieht sich zur Mitte zusammen, wird kleiner und leicht unscharf und löst sich in einen goldenen Schein auf (0,25 s). Das Glasviereck schrumpft zum Chat-Knopf hin, die Ecken werden immer runder, bis es die Kugel in der Größe des Knopfs ist; der Goldrand bleibt 1 px fein sichtbar. In der Kugel erscheint das Logo (erst der Stern, dann die vier Balken) und wird zum Licht des Knopfs; dann ist die Kugel wieder der Knopf (gleiches Glas, gleicher Rand, gleiches Licht an derselben Stelle).
- **Öffnen (1,1 s):** Die Kugel hebt sich leicht, das Logo zieht sich zum Lichtpunkt zusammen (0,2 s); die Kugel dehnt sich zum Fenster (0,5 s, leichte Feder am Ende), der Lichtpunkt wandert dorthin, wo die Begrüßung beginnt; der Inhalt baut sich auf: Logo, Name und Rolle verbuggt, Begrüßung wächst und entschlüsselt sich, Vorschläge gleiten hinein, die goldene Linie unter dem Eingabefeld zieht sich von links nach rechts, das X dreht sich hinein.
- **Umsetzung:** Form und Größe über `transform` (Verschieben und Skalieren zur Mitte des Knopfs) und `border-radius`; kein `clip-path`. Rand, Lichtkante und Unschärfe gleichen die Verkleinerung aus. Gesteuert von einer GSAP-Zeitleiste über sieben Größen; ein Klick mitten in der Bewegung (auf die Form oder den Knopf) lässt sie von der aktuellen Stelle zurücklaufen. Esc und Fokus wie bisher.
- **Am Handy:** dieselbe Bewegung, das Fenster ist das Blatt von unten; nach dem Hinunterwischen wird es von dort aus zur Kugel.
- **„Weniger Bewegung“:** Das Fenster blendet nur ein und aus (0,2 s).
- **Erstes Öffnen:** Die Nachrichten entstehen schon vorher in einer ruhigen Minute, und das Fenster wird nach dem Start einmal unsichtbar vorgezeichnet. So muss der Klick nichts mehr aufbauen.

### 11 · Meine Lesarten, zu denen David anders entscheiden kann
- **Zeile über dem Mitarbeiter-Knopf:** Sie steht wörtlich so, wie David sie geschrieben hat („… verbinden wir Sie gern …“), obwohl der Chat sonst duzt.
- **„Anfrage schicken“** gibt es im neuen Chat nicht mehr (der Block, in dem es stand, entfällt nach Auftrag).
- **Knöpfe unter älteren Nachrichten bleiben stehen** (jede Nachricht trägt, was sie anbietet). Der Mitarbeiter-Knopf ist verborgen, solange das Formular offen ist oder das Team schon schreibt.
- **Lichtkreuz zwischen Stern und Glas** (wie beauftragt): Durch das matte Glas wirkt es weich, im klaren Kreis um den Stern scharf.
- **Goldene Linie unter dem Eingabefeld:** Es gab dort bisher keine; sie ist neu und bleibt als feine Linie stehen.

### 12 · Prüfung und Messung
- Alles mit nachgestelltem Netz (0 echte Anfragen an `/api`): Öffnen, Schließen, Umkehren, Punkte, Welle, Termin- und Preis-Frage, Formular mit Zusammenfassung, alte Startseite, „weniger Bewegung“, Handy.
- **Bildraten auf dem nachgestellten schwachen Gerät** (Prozessor 4-fach gebremst, alter und neuer Stand abwechselnd, Bildschirm entsperrt, mit Fremdlast auf dem Rechner): Glaskarten mit Stern 27 → 24 bis 28 Bilder je Sekunde (gleich), Scrollen 30 → 25 bis 29, am Handy Durchzug 58 → 57, Scrollen 48 → 44. **Chat öffnen ist auf dem gebremsten Gerät langsamer als vorher** (Rechner 22 → 14, Handy 65 → 33 Bilder je Sekunde; Schließen 31 → 25 und 95 → 51): Der Eckenradius lässt sich nicht von der Grafikkarte allein bewegen, das alte Ausfalten und Hochgleiten schon. Auf dem Mac läuft es flüssig (ab dem zweiten Öffnen rund 60 Bilder je Sekunde).
- **Funde am Rand (nicht angefasst, weil außerhalb des Auftrags):** Jeder Mausklick rechnet die ganze Seite zweimal neu (die Klasse für den gedrückten Mauspunkt sitzt am `html`, die Regel gilt für alle Elemente). Und mehrere `:has()`-Regeln der Startanimation lassen den Browser bei jedem wechselnden Zeichen die Seite absuchen. Beides bremst vor allem schwache Geräte.

### 13 · Nicht angefasst
Startanimation, alle anderen Abschnitte, die alte Startseite außer dem Marker `[ANRUFEN]`. `voice-agent-prompt.md` und `vapi-prompt.txt` (fremde Änderungen).

## 4p. Siebte Runde vom 14.11.2026: ein Logo überall, Chat-Feinschliff, neuer Stern in den Glaskarten, Impressum und Datenschutz

Davids Auftrag (Prompt 11). Ersetzt aus 4o: das Licht im Chat-Knopf, das weiße Licht beim Öffnen, die GSAP-Steuerung der Kugel (Abschnitt 10, „Umsetzung“), den ganzen Stern der Glaskarten (Abschnitt 9: Lichtkreuz, Stern folgt der Maus, klares Glas, Licht auf den Nachbarkarten) und die Zeile mit „Sie“ über dem Mitarbeiter-Knopf. Ersetzt aus 4e: das selbst leuchtende kleine Logo der Kopfleiste. Alles, was David an 4o gefällt (Kugel, Punkte, Welle, Durchsichtigkeit des Glases), bleibt.

### 1 · Sprechblase am Chat-Knopf
- Sie kommt **bei jedem Laden der Seite** wieder (6 s nach „Laden fertig“; am Handy einmal für 4 s).
- Klickt man sie weg oder öffnet den Chat, bleibt sie **bis zum nächsten Neuladen** weg, egal wie viel man scrollt. Gemerkt wird nur noch im Speicher der Seite (`blaseWeg` in `ChatKnopf.tsx`); `sessionStorage` wird dafür weder gelesen noch geschrieben.

### 2 · Ein Logo überall
- **Das** Logo ist das flache goldene: Stern mit vier Balken (`LogoFormen`), Goldverlauf von hell nach satt, leichter Schein. Ein Baustein dafür: `GoldMarke` in `components/neu/Marke.tsx` (der Verlauf steht einmal je Seite, `GoldVerlauf` im Rahmen).
- Es steht jetzt in der **Kopfleiste oben links** (statt des vorgerenderten, selbst leuchtenden Bildes), in der **Chat-Kugel** (statt des „Lichts in Logo-Form“, auch während die Kugel sich öffnet und schließt) und wie bisher im **Kopf des offenen Chats**.
- **Leuchten darf nur noch das große Logo** in der Mitte (Start und Kopfbereich). Magnet, Glimmrand und Größe der Kugel sind geblieben.

### 3 · Kein weißes Licht beim Öffnen und Schließen
- Der Lichtpunkt, der beim Öffnen nach links oben wanderte, ist weg. Das Logo der Kugel löst sich beim Öffnen auf (erst die vier Balken nacheinander, dann der Stern) und baut sich beim Schließen wieder auf. Alles andere an der Bewegung und die Durchsichtigkeit des Glases sind unverändert.

### 4 · Chat: Termine, Formular, Du
- **Bei `[ANRUFEN]` immer beide Wege:** Unter der Anruf-Karte steht immer die Zeile „Lieber vorher noch ein paar Fragen klären? Dann verbinden wir dich gern mit einem Mitarbeiter.“ und darunter „Mit einem Mitarbeiter schreiben“. Das macht die Anzeige selbst (`ChatFenster.tsx`), auch wenn der Assistent `[MITARBEITER]` vergisst; stehen beide Marker da, gibt es den Knopf einmal.
- **Der Chat duzt überall** (Fenster, Formular, Hinweise, Fehlermeldungen, die Zeile oben; die Zusammenfassung bleibt in der Ich-Form des Besuchers). Die Seite selbst siezt weiter.
- **Das Mitarbeiter-Formular ist immer geschlossen**, auch nach Neuladen oder erneutem Öffnen: Beim Schließen des Chats klappt es zu. Es öffnet sich nur über „Mit einem Mitarbeiter schreiben“. Ein laufendes Ticket bleibt wie bisher (Team-Modus).

### 5 · Kontaktformular öffnet sich nur mit Daten aus dem Chat
- Liest der Assistent Angaben heraus (`[DATEN]`), stehen sie sofort im Kontaktformular (und sind für die Sitzung gemerkt): Scrollt man hin, ist es **offen und ausgefüllt**, mit dem Hinweis „aus dem Chat übernommen“. Auch nach einem Neuladen in derselben Sitzung.
- Ohne Angaben bleibt es zu. Geöffnet wird nur, wenn mindestens ein Feld wirklich gefüllt wurde (`uebernimm` in `lib/anfrage-uebernahme.ts`, mit Tests); ein leeres Übergabe-Ereignis öffnet nichts.

### 6 · Chat öffnen auf schwachen Geräten flüssig
- **Die Grafikkarte bewegt alles allein.** Die Form ist aus sieben einfachen Teilen zusammengesetzt (drei Rechtecke, vier Kreise), zweimal: einmal 1 px größer in Gold (der feine Rand), einmal als Fläche. Die Teile werden nur verschoben und skaliert; Rechtecke bleiben Rechtecke und Kreise Kreise, so kann die Ecke jeden Radius annehmen, ohne dass `border-radius` je Bild neu gezeichnet wird. Die Rechnung dazu steht in `components/neu/chat/kugel.ts` (mit Tests).
- **Keine Glas-Unschärfe während der Bewegung:** Die Teile sind eine ruhige dunkle Fläche. Das echte Glas (mit `backdrop-filter`) steht still an seinem Platz und blendet erst ein, wenn das Fenster seine Größe hat; beim Schließen blendet es zuerst aus.
- **Eine Zeitleiste** (Web Animations, 0 = Kugel, 1 = Fenster): vorwärts in 1,1 s öffnen, rückwärts in 0,6 s schließen. Ein Klick mitten in der Bewegung dreht nur die Richtung um, nichts springt. GSAP wird hier nicht mehr gebraucht.
- Das Aussehen ist dasselbe wie in 4o (Kugel hebt sich, dehnt sich mit leichter Feder zum Fenster, Inhalt baut sich auf).
- **Der Klick selbst ist leichter geworden**, damit die Bewegung sofort beginnt: Rahmen und Knopf werden gemessen, bevor React das Dokument ändert (danach müsste der Browser den ganzen Chat mitten im Klick durchrechnen); die Texte im Kopf verwürfeln sich, die Beispielfrage wechselt und das Eingabefeld bekommt den Fokus erst, wenn der Inhalt erscheint (nicht schon im Klick, wo man davon nichts sieht); die Zeitleiste hat 22 statt 44 Stützstellen (alle Teile haben dieselben, sie passen auch dazwischen genau zusammen). Fürs Schließen liegt die Zeitleiste schon bereit: Sie wird in einer ruhigen Sekunde angelegt, während das Fenster offen steht, und im Klick nur gestartet (passen die Maße nicht mehr, wird sie dort neu angelegt).
- **Messung** (fertiger Build, Prozessor 4-fach gebremst, alter Stand 5c3f0dc und neuer Stand abwechselnd, mit einer Spur des Browsers ausgewertet; der Rechner war dabei durch andere Programme stark belastet, der Bildschirm lief mit 165 Hz). Gezählt wird, was man sieht: die Bilder, in denen sich die Form wirklich ändert. Im alten Stand zeichnete die Seite selbst jede Zwischenform (Haupt-Faden), im neuen bewegt die Grafikkarte die fertigen Teile.
  - **Rechner, Öffnen:** Form 2 bis 5 Bilder je Sekunde → **135 bis 157**. Der Klick wird in 120 bis 174 ms verarbeitet (vorher 235 bis 365 ms), die Bewegung beginnt nach 130 bis 186 ms (vorher 248 bis 402 ms).
  - **Rechner, Schließen:** Form 9 bis 17 → **71 bis 114** Bilder je Sekunde; Klick 40 bis 66 ms (vorher 49 bis 63 ms).
  - **Handy, Öffnen:** Form 12 bis 15 → **152 bis 157** Bilder je Sekunde; Klick 76 bis 81 ms (vorher 114 bis 135 ms).
  - **Handy, Schließen:** Form 26 bis 31 → **129 bis 143** Bilder je Sekunde; Klick 42 bis 57 ms (vorher 37 bis 71 ms).
  - **Nach der alten Messart** (Bilder des Haupt-Fadens während des ganzen Öffnens, wie im Bericht zu 4o): Rechner beim Öffnen 9 bis 13 → 17 bis 19 Bilder je Sekunde, beim Schließen 21 bis 22 → 18 bis 21; Handy beim Öffnen 26 → 31 bis 34, beim Schließen 43 bis 46 → 43 bis 49. (Der Rechner war bei dieser Messung viel stärker belastet als bei der zu 4o: Derselbe alte Stand, der dort 14 und 33 zeigte, zeigt jetzt 9 bis 13 und 26.) Diese Zahl misst seit dem Umbau nicht mehr die Bewegung, sondern nur noch, wie beschäftigt die Seite mit dem Aufbau des Inhalts ist (Begrüßung entschlüsseln, Texte verwürfeln): Das ist dieselbe Arbeit wie vorher und läuft, während die Form schon flüssig fährt.

- **Glaskarten und Scrollen nach der alten Messart** (alt → neu): Rechner an den Karten in Ruhe 58 bis 68 → 64 bis 67, mit Stern unter der Maus 15 bis 20 → 17 bis 21, Scrollen durch die Seite 20 bis 24 → 23; Handy beim Auftauchen der Sterne 46 bis 48 → 41 (alle drei Sterne strahlen dort kurz nacheinander), Scrollen 34 bis 37 → 33 bis 38.
- **Fund am Rand (nicht angefasst, außerhalb des Auftrags):** Auch wenn nichts geschieht, liefert der Haupt-Faden der Seite ständig Bilder, weil Animationen außerhalb des Bildes weiterlaufen (Laufband bei „Unser Versprechen“, Tipp-Punkte in der Chat-Szene der Leistungen, das Atmen im Kontakt-Bereich). Jede laufende Animation kostet in jedem Bild etwas Stil-Rechnung. Würden sie außerhalb des Bildes ruhen (wie der Leuchtstern es schon tut), hätten schwache Geräte überall mehr Luft.

### 7 · Mausschein wirklich mit der Maus
- **Der Schein gehört jetzt zum Mauszeiger-Bild.** Punkt und Schein sind ein Bild (32 × 32, doppelt aufgelöst für scharfe Bildschirme), das das Betriebssystem selbst zeichnet: sofort, bei jeder Bildrate, ohne ein Bild der Seite abzuwarten. Vorher zeichnete die Seite den Schein; er kam bauartbedingt immer mindestens ein Bild nach dem Punkt, das sah man bei schnellen Bewegungen.
- Der Schein im Bild: Deckkraft 0,30 in der Mitte, 0,12 bei 12 px, aus bei 16 px (vorher lief er sehr schwach bis 22 px aus; größer als 32 × 32 darf ein Zeiger-Bild nicht sein, ohne dass der Browser am Fensterrand auf den gewöhnlichen Pfeil zurückfällt).
- Die Seite zeichnet nur noch den Ring über Links und Knöpfen (mit demselben Schein darum) und die Glasblase. Dafür gibt es keine Übergangszeit und kein Nachziehen auf der Stelle.
- **Geprüft im echten Chrome auf dem 165-Hz-Bildschirm** (das Fenster lief mit 161 Bildern je Sekunde): In Ruhe ist der Zeiger das Bild (Punkt und Schein), die Seite zeichnet nichts dazu, keine Übergangszeit, keine Animation. Über einem Knopf sitzen Ring und Schein in jedem Bild genau auf der zuletzt gemeldeten Maus-Stelle (Abstand 0 px bei 300 und 900 px je Sekunde).

### 8 · Der Stern in den drei Glaskarten (neu und einfacher)
- **Weg** (Code und Stile entfernt): Lichtkreuz, der Stern, der der Maus folgt, das klare Glas um den Stern, die Rechnung für die Nachbarkarten, die Sparstufen dazu und das Bild `public/stern/stern-glas.webp`.
- **Der Stern:** derselbe wie im Wörter-Feld darunter (`Leuchtstern.tsx`), deutlich kleiner (Platz 100 bis 132 px). Für die Karten gibt es eine **durchsichtige Fassung** (`klar`): dieselben Aufnahmen, aber mit eigener Deckkraft (errechnet aus der Helligkeit; `public/stern/*-klar.webp`, zusammen rund 50 kB, laden erst in der Nähe), ohne schwarzes Feld und ohne Mischart. Auf dem halb durchsichtigen Glas stünde das schwarze Feld sonst als dunkle Scheibe da.
- **Wo:** Fährt die Maus auf eine Karte, taucht er in ihrer Mitte auf (blendet ein und wächst leicht, 0,4 s). Er folgt der Maus nicht. Verlässt die Maus die Karte, blendet er weich aus und ruht.
- **Bewegung:** Er dreht und wiegt sich leicht, seine Strahlen schimmern (zwei Muster blenden ineinander), feiner Goldstaub tanzt.
- **Strahlen:** je Karte sechs schmale Lichtkeile aus der Mitte (am Stern haarfein, nach außen breiter und weicher). Sie laufen zum Rand, **brechen sich am Glasrand** (heller Saum genau an der Stelle, auf der einen Seite ein Hauch kühl, auf der anderen ein Hauch warm) und **knicken genau an der Kante ab**, von der Kante weg, wie Licht, das aus Glas austritt (2 bis 7 Grad, bei flachem Auftreffen mehr). Dann strahlen sie auf die Seite hinaus und verlieren sich; die Nachbarkarten werden dabei leicht angestrahlt. Das ganze Strahlenrad schwenkt langsam hin und her; die Strahlen sind unterschiedlich hell.
- **Je Karte ein festes Bild:** eigene Winkel (`STRAHLEN` in `Aussage.tsx`), eigener Takt und eigene Schwenkweite (`.ag-gk[data-bild]` in `seite.css`).
- **Leistung:** nur CSS-Keyframes auf `transform` und `opacity` mit vorbereiteten Verläufen; kein JavaScript je Bild, keine Unschärfe je Bild. Das Skript schaltet nur ein und aus (`data-an`) und misst einmal je Größe der Karte, wo jeder Strahl den Rand trifft (`strahlKnick` in `glaskarten.ts`, mit Test). **Solange eine Karte leuchtet, laufen nur acht Animationen (der Stern mit fünf, dazu das Rad in seinen drei Ausschnitten); die einzelnen Strahlen haben keine eigene. In Ruhe gibt es Stern und Strahlen für den Browser gar nicht** (unsichtbar, keine Animation, keine eigenen Ebenen): Auch angehaltene Animationen hält der Browser als Ebenen bereit (hier wären es rund 80), und jede kostet in jedem Bild der Seite etwas Zeit; das hatte die Seite an den Karten in Ruhe messbar gebremst. Nach dem Verlassen trägt die Karte deshalb 0,65 s lang `data-geht` (der Stern blendet aus und ruht dabei), danach ist alles weg. Die Strahlen-Ebene ragt 340 px über die Karte hinaus, ohne das Layout zu verschieben; nach unten laufen die Strahlen 70 px unter der Karte aus (dort endet der Abschnitt). Alles ruht, solange keine Karte unter der Maus ist.
- **Der Stern liegt über der Glasfläche und unter dem Text**, nicht unter der Unschärfe des Glases: Läge er darunter, müsste der Browser die Unschärfe in jedem Bild neu rechnen.
- **Am Handy:** Sobald eine Karte gut zur Hälfte im Bild ist, taucht ihr Stern einmal in der Mitte auf, strahlt 2,6 s (vier Strahlen, außen nur kurze Stücke) und bleibt dann ruhig und leiser stehen. Kommen mehrere Karten zugleich ins Bild, folgen die Sterne im Abstand von 0,45 s.
- **„Weniger Bewegung“:** kein Stern, keine Strahlen. Der Glimmrand und das Aufleuchten der Wörter unter der Maus sind geblieben.

### 9 · Kontakt: deutlicher auf den Chat hinweisen
- Über dem Kontaktformular steht eine **schmale Glaszeile**: links das kleine Logo, daneben „Kurze Frage? Unser KI-Chat antwortet sofort, rund um die Uhr.“, rechts der Glasknopf **„Jetzt chatten“** mit Sprechblasen-Zeichen. Der Glimmrand gilt auch hier.
- Fährt die Maus über den Knopf, **leuchtet die Chat-Kugel unten rechts kurz auf** (Klasse `ag-chat-wink` am `html`, 1,4 s). Ein Klick öffnet den Chat mit der gewöhnlichen Kugel-Bewegung. Am Handy steht der Knopf unter dem Satz und ist so breit wie die Zeile.

### 10 · Impressum und Datenschutz im neuen Design
- **Der Text ist Wort für Wort derselbe** (maschinell mit dem alten Stand verglichen: 114 und 1235 Wörter, keine Abweichung). Er steht in `components/neu/recht/Rechtstexte.tsx`.
- **Design:** dunkler Grund, Überschrift in der Versal-Schrift der Seite, Abschnitts-Überschriften hell mit feiner Goldlinie, Fließtext 17 px mit höchstens 68 Zeichen je Zeile, Verweise golden. Kopfleiste, Fußleiste (mit ihrem Schluss: Stern, Name aus Zeichen, Lichtleiste), Chat und Mauspunkt der neuen Seite. Keine Startanimation, kein großer Stern; am Handy kein Anrufen-Knopf am Daumen (er läge über dem Text).
- **Von der neuen Seite aus** öffnen sich beide als **Blatt über der Seite** (`RechtBlatt.tsx`); die Adresse ist dieselbe (`/impressum`, `/datenschutz`). Die Seite darunter bleibt genau stehen, wie sie war (sie ruht: `scrollRuhe` in `umgebung.ts`), also führt **„Zurück“ an genau dieselbe Stelle**, ohne Neuladen und ohne neue Startanimation. „Zurück“ ist der Verweis oben, die Zurück-Taste des Browsers oder Escape. Die Kopfleiste zeigt sich über dem Blatt wie oben auf einer Seite; ein Menüpunkt oder „Anrufen“ schließt das Blatt und scrollt dorthin. Kommt man aus dem offenen Chat (Verweis „Datenschutz“ im Formular), tritt das Chat-Fenster so lange zurück und ist danach wieder da, wie es war.
- **Direkt aufgerufen** (von außen, oder nach Neuladen): die eigene Seite im selben Design (`RechtSeite.tsx`). „Zurück“ führt dorthin, wo man in diesem Tab herkam (zum Beispiel zur alten Startseite, an dieselbe Stelle); gibt es das nicht, auf die neue Seite, ganz nach unten zum Fuß (`#fuss`).
- **Die Adresse der neuen Seite steht an einer Stelle:** `NEUE_SEITE` in `lib/neue-seite.ts` (jetzt `/varianten/kopf/kern`; bei der Umstellung nur dort auf `/` ändern).
- Die alte Startseite verlinkt weiter auf beide Seiten.

### 11 · Kleinigkeiten aus dem Bericht zu 4o
- `lib/kontakt-ablauf.ts`: Der Fehlertext nennt WhatsApp nicht mehr.
- **Daumen-Knopf am Handy:** Er blendet aus, solange das Anfrage-Formular offen ist, in ein Feld getippt wird oder die Tastatur da ist.
- **Gedrückter Mauspunkt:** Das kleinere Zeiger-Bild bekommt für die Dauer des Klicks nur das Teil unter der Maus (und nur, wenn es klein ist); am `html` ändert sich nichts mehr. Vorher rechnete jeder Klick die ganze Seite zweimal neu.
- **Startanimation ohne `:has()`:** Kopfleiste, Chat-Knopf und Daumen-Knopf tragen den Stand des Starts selbst (`data-start`, vom Skript gespiegelt), und vor dem Skript hält die Klasse `ag-vorstart` am `html` die Seite oben (ein winziges Skript am Anfang der Seite setzt sie, nur auf der neuen Seite). Aussehen und Ablauf sind gleich: alle Start-Fälle bestehen wie zuvor.

### 12 · Meine Lesarten, zu denen David anders entscheiden kann
- **Impressum und Datenschutz als Blatt:** Nur so bleibt die Seite darunter garantiert an derselben Stelle (ein echter Seitenwechsel würde die Startanimation neu abspielen). Wer die Adresse neu lädt oder teilt, bekommt die eigene Seite.
- **Fuß auf Impressum und Datenschutz:** der Fuß der neuen Seite mit Stern und Namen aus Zeichen (der „leichte“ Stern; der große aus dem Wörter-Feld kommt dort nicht vor).
- **Schein des Mauszeigers:** etwas enger als bisher (bis 16 statt 22 px), weil er jetzt ins Zeiger-Bild passt.
- **Stern über der Glasfläche statt darunter** (siehe 8, wegen der Leistung).
- **Sprechblase:** Sie kommt auch nach einem Neuladen wieder, wenn im Chat schon geschrieben wurde (nach Auftrag: bei jedem Laden).

### 13 · Prüfung
- Alles mit nachgestelltem Netz (0 echte Anfragen an `/api`): Sprechblase (da, weg nach Klick und Scrollen, wieder da nach Neuladen), dasselbe Logo an drei Stellen, Öffnen und Schließen in Zeitlupe, Termin-Frage ohne `[MITARBEITER]` (Karte, Zeile, ein Knopf), Formular nach erneutem Öffnen zu, Chat mit `[DATEN]` (Kontaktformular offen und ausgefüllt; ohne Angaben zu), Chat-Zeile mit aufleuchtender Kugel, Stern je Karte und am Handy, Impressum und Datenschutz als Blatt und als eigene Seite (Computer und Handy), „Zurück“ in allen Fällen, alte Startseite.
- Start-Fälle (23, im fertigen Build): alle bestanden; der Fall „zurück von Impressum“ entfällt, weil die Seite dabei nicht mehr verlassen wird.

### 14 · Nicht angefasst
Startanimation (außer der unsichtbaren Änderung in 11), alle anderen Abschnitte, die alte Startseite. `voice-agent-prompt.md` und `vapi-prompt.txt` (fremde Änderungen).

## 4q. Achte Runde vom 15.11.2026: kein Licht beim Öffnen des Chats, Handy ruhiger

Davids Auftrag (Prompt 12). Ersetzt aus 4p, Abschnitt 3 und 6: den goldenen Schein in der Form und das Logo der Kugel, das zum Punkt schrumpfte. Ersetzt aus 4o, Abschnitt 1: den Aufbau des Logos im Chat-Kopf aus einfliegenden Teilen. Ersetzt aus 4m, Abschnitt 4 und 4p, Abschnitt 11: den Anrufen-Knopf am Daumen. Am Computer bleibt alles andere, wie es war.

### 1 · Chat öffnen und schließen ohne wanderndes Licht
- **Gefunden** (Öffnen und Schließen Bild für Bild, je 50 ms, jede Ebene einzeln vermessen, dazu Echtzeit-Video mit 25 Bildern je Sekunde): Das Licht, das von unten rechts nach oben links wanderte, war der **goldene Schein in der Mitte der Form** (`ag-cf__glut`). Er saß immer in der Mitte der wachsenden Form, also zog er vom Chat-Knopf zur Mitte des Fensters (bis 44 000 px² helle Fläche, Mitte von 1369/839 nach 1198/541). Dazu: Das Logo der Kugel schrumpfte zu einem Punkt, und der **Glimmrand** des Fensters stand während der ganzen Bewegung auf voller Nähe, weil die Maus auf dem Chat-Knopf lag (sein Lichtfleck saß am Rand der wachsenden Form).
- **Jetzt:** Den Schein gibt es nicht mehr. Das Logo der Kugel blendet nur aus (erst die vier Balken, dann der Stern), ganz, bevor die Form sich dehnt; es schrumpft nicht und wandert nicht mit. Der Glimmrand ist während der Bewegung aus, blendet erst **nach dem vollständigen Öffnen** weich ein (0,6 s) und ist mit dem ersten Bild des Schließens weg. Der schwache Logo-Schein hinter dem Glas gehört zum Glas und blendet mit ihm ein, er wandert nicht. Im Inhalt bewegt sich ebenfalls kein Licht mehr: Das Logo im Chat-Kopf baut sich nicht mehr aus einfliegenden Teilen auf, die Vorschläge haben keinen Lichtstreif mehr, die goldene Linie unter dem Eingabefeld zieht sich nicht mehr.
- Form, Glas, Inhalt und Zeiten sind dieselben wie in 4p. Messung nachher: In keinem Schritt gibt es in der Form eine helle Fläche über 200 px² (vorher bis 44 000 px²), und was dort noch hell ist, sind einzelne Punkte am Goldrand der Ecken, die nicht wandern.
- Nebenbei: Nach einem Klick bestimmt der Mauszeiger neu, was unter ihm liegt (sonst blieb der Ring für Knöpfe stehen, wenn sich unter der ruhenden Maus der Chat-Knopf in das Fenster verwandelte).

### 2 · Handy: Logo am Anfang bleibt ruhig
- Am Handy wiegte sich das Licht von selbst leicht hin und her (die Wand mit dem Logo kippte langsam), und ein Tipp auf den Kopfbereich schickte eine Welle durch den Namen (mit kurzer Vibration). Beides ist weg: Ohne Maus steht die Wand still, Tippen löst nichts aus, und der Browser zeigt dort auch keinen grauen Tipp-Kasten.
- Die Startanimation selbst läuft wie bisher (Stern im Dunkeln, Licht, Zeichen).

### 3 · Handy: kein Anrufen-Knopf unten
- Der goldene Knopf, der am Handy unten klebte (`DaumenLeiste`), ist mit Code und Stilen entfernt. Anrufen steht in der Kopfleiste und im Kontakt-Abschnitt.

### 4 · Handy: die drei Schritte ohne große Zahlen
- Am Handy gibt es die große Zahl aus Zeichen nicht mehr (sie wird gar nicht erst gezeichnet). Es bleiben die drei Schritte, alle gleich hell und ganz gefüllt, ohne Lauf; sie blenden beim Hinscrollen ruhig nacheinander ein (je 0,14 s versetzt). Am Computer ist der Abschnitt genau wie vorher.

### 5 · Handy: keine Maus-Effekte
- „Handy“ entscheidet das Gerät: `(hover: none), (pointer: coarse)`, also Touch ohne Maus (`HANDY` in `components/neu/umgebung.ts`), nicht die Breite.
- Weg am Handy: die Welle im Namen oben und unten beim Antippen; das Treiben und der Schubs der Wörter im Feld mit dem Stern (sie stehen nach ihrem Auftritt still, und es rechnet nichts mehr je Bild); Zufallszeichen in Überschriften, auch beim Hinscrollen (sie blenden ruhig ein, die Hauptüberschrift ebenso, gleich mit „Stunden“); Hover-Stile, die nach dem Tippen hängen blieben (sie gelten jetzt nur bei echter Maus). Verwürfeln, Magnet, Glimmrand, Mauslicht und Zeiger liefen schon vorher nur mit Maus.
- Unverändert: Startanimation, Chat-Fenster (Kugel, Punkte, Welle), Stern in den Glaskarten, alles, was beim Scrollen kommt (Karten schweben ein, Zeichen-Nummern der Leistungen, Name aus Zeichen im Fuß).
- **Bildraten am Handy** (Prozessor 4-fach gebremst, Stand Prompt 11 und neu abwechselnd, je zwei Runden): Scrollen durch die Seite 37 bis 40 → **58 bis 62** Bilder je Sekunde, Glaskarten beim Auftauchen der Sterne 47 bis 51 → **55 bis 58**, Chat öffnen 40 bis 45 → 40 bis 45 (gleich), Chat schließen 57 bis 69 → 65 bis 69.

### 6 · Meine Lesarten, zu denen David anders entscheiden kann
- **Überschriften am Handy auch beim Scrollen ohne Zufallszeichen:** „Was beim Scrollen erscheint, bleibt, aber ruhig und leicht“ habe ich so gelesen, dass die Überschriften dort ruhig einblenden statt sich zu entschlüsseln.
- **Logo im Chat-Kopf ohne Aufbau:** Es baute sich aus einfliegenden goldenen Teilen auf; das ist auch ein bewegtes Licht. Es steht jetzt einfach da.
- **Ersatzbild auf sehr schwachen Handys:** Kommt ein Handy mit dem Licht gar nicht mit, wechselt es wie bisher auf das ruhige Bild. Dessen Stern sitzt bis zu 3 px anders als im lebenden Licht; das habe ich nicht angefasst.

### 7 · Nicht angefasst
Alles am Computer außer Abschnitt 1, alle Texte, die alte Startseite. `voice-agent-prompt.md`, `vapi-prompt.txt` und `AGENTS.md` (fremde Dateien).

## 4r. Neunte Runde vom 15.11.2026: Glaskarten nur mit Stern hinter Milchglas, Handy wieder voll animiert

Davids Auftrag (Prompt 13). Ersetzt aus 4p, Abschnitt „Stern in den Glaskarten“ und 4o: Strahlen, Brechung am Glasrand, Licht auf den Nachbarkarten. Ersetzt aus 4q, Abschnitt 4 und 5: die beruhigten Überschriften, das stehende Wörter-Feld, „In drei Schritten“ ohne Lauf, und die erste Lesart in 4q, Abschnitt 6. Die Regel für „Handy“ bleibt: erkannt am Gerät (`HANDY`, Touch ohne Maus), die Breite entscheidet nur das Layout.

### 1 · Glaskarten unter „Wir bauen in Stunden …“
- **Weg:** die Strahlen, die Brechung am Rand und das Licht, das aus der Karte auf die Seite fiel (Code in `glaskarten.ts` und `Aussage.tsx`, die Stile und die Bilder `kern-klar`, `strahlen-1-klar`, `strahlen-3-klar`).
- **Nur der Stern:** Unter der Maus erscheint in der Mitte hinter der Karte der kleine Stern (Größe wie bisher, 100 bis 132 px) **hinter leichtem Milchglas**: weich, aber gut als Stern zu erkennen; er wiegt und dreht sich leicht und blendet weich ein und aus (0,65 s). Die Unschärfe steckt fest in drei vorbereiteten, weichen Bildern (`kern-milch`, `strahlen-1-milch`, `strahlen-3-milch`, aus denselben Aufnahmen wie der Stern errechnet); der Browser rechnet keine Unschärfe je Bild. Bewegt wird nur mit Verschieben, Drehen und Deckkraft. Ruht die Karte, hat der Stern weder Animationen noch eigene Ebenen.
- **Die Karte hebt sich hervor:** Titel und Text werden deutlich heller (fast weiß, warm), die Glasfläche eine Spur heller (ein heller Schleier, nur über Deckkraft). Heben und Glimmrand bleiben.
- **Fehler behoben:** Beim schnellen Scrollen erschien der Stern, bevor die Karten eingeschwebt waren. Jetzt leuchtet eine Karte erst, wenn sie ganz eingeschwebt ist (1 s Einschweben, je Karte 120 ms später), auch wenn die Maus schon darauf liegt. Gemessen: vorher nach 0,12 s mit 30 px Versatz und unsichtbarem Glas, jetzt erst, wenn die Karte steht.
- **Am Handy:** Dieselbe Hervorhebung bekommt die Karte in der Mitte des Bildschirms (ein schmaler Bereich von 12 % der Bildhöhe um die Mitte, immer höchstens eine Karte; im Spalt zwischen zwei Karten keine). Scrollt man weiter, blendet sie weich aus und die nächste leuchtet auf (`components/neu/mitte.ts`).

### 2 · Handy: „AGENTS GILT“ springt nicht
- Der kleine Sprung nach dem Bilden des Namens war die Welle durch die Mitte (Hinweis, dass man ihn anklicken kann). Sie kommt nur noch mit Maus; am Handy bildet sich der Name und steht still. Am Computer bleibt sie.

### 3 · Überschriften: wieder animiert, ohne Springen
- Am Handy bauen sich alle Überschriften wieder wie am Computer auf (Tippen, Zufallszeichen, Entschlüsseln, das goldene Wort leuchtet auf). Weg bleibt nur das Verbuggen unter dem Finger.
- **Nichts springt (auch am Computer):** Jedes Zeichen steht die ganze Zeit am Platz seines Buchstabens im fertigen Text. Das Zwischenwort „Tagen,“ steht mittig im Platz von „Stunden*,“; der Rest der Zeile rückt nicht mehr zusammen und gleitet nicht zurück. Gemessen am Handy, Bild für Bild: Höhe und Zeilen jeder Überschrift bleiben gleich (Hauptüberschrift 174 px, 4 Zeilen; die anderen ebenso), kein Zeichen ändert seinen Platz, außer beim Wechsel von „Tagen“ zu „Stunden“ innerhalb des Wortes.
- **Sparstufen (Bildrate):** Am Handy bekommen die Zeichen höchstens alle 50 ms ein neues Bild (20-mal je Sekunde), sonst ist der Ablauf derselbe. Auf allen Geräten wird die Ebene mit den Zeichen nicht gezeichnet, solange die Überschrift mehr als eine Bildhöhe entfernt ist (unsichtbar ist sie dort ohnehin), und Zeichen werden geändert statt ersetzt. Das einmalige Aufleuchten des goldenen Worts hat am Handy kleinere Leuchtkreise.

### 4 · Handy: was beim Scrollen passiert, wieder wie am Computer
- Die zwei Balken „Agenturen“ und „Agents Gilt“ füllen sich, die Karten schweben ein, der Stern im Wörter-Feld bewegt sich und die sechs Wörter treiben wieder (nur ohne Reaktion auf den Finger; das Treiben macht am Handy das Stylesheet, ohne Rechnen je Bild).

### 5 · Handy: „Alles, was Ihr Geschäft digital braucht“
- Es spielt nur die Karte in der Mitte des Bildschirms (derselbe schmale Bereich, höchstens eine Karte), mit Szene, Zahlen, Zeichen-Nummer und leichtem Heben. Scrollt man weiter, springt die alte zurück in die Ruhe-Lage und die neue spielt; kommt man zurück, startet sie von vorn. Wie mit der Maus von Karte zu Karte.
- Die Karten haben am Handy eine feste eigene Ebene (sonst würde beim Heben jedes Mal die ganze Karte neu gerastert). Die Zeichen-Nummer zeichnet am Handy höchstens 30-mal je Sekunde.

### 6 · Handy: „In drei Schritten zu Ihrer Lösung“
- Der Fortschrittsbalken läuft wieder (6 s je Schritt), „Gespräch und Analyse“, „Bau mit KI“ und „Setup und Betreuung“ werden nacheinander hervorgehoben. Die großen Zahlen bleiben am Handy weg.

### 7 · Was am Handy weg bleibt
- Verbuggen beim Antippen, Mauslicht der Wörter, Magnet, Glimmrand, der dem Finger folgt, Hover-Stile, die nach dem Tippen hängen bleiben, der Daumen-Knopf.

### 8 · Geprüft (fertiger Build, Port 3200; Vergleich mit Prompt 12 auf Port 3300)
- Alles mit nachgestelltem Netz (0 echte Anfragen an `/api`).
- **Bildraten am Handy** (375 × 812, Pixeldichte 3, Prozessor 4-fach gebremst, abwechselnd neu und alt, je drei Runden). Neu gemessen auf 60 Hz bezogen (wie viele 60-Hz-Takte ein neues Bild bekommen), weil der Bildschirm des Testrechners zeitweise mit 120 Hz läuft und die Rohwerte dann nicht vergleichbar sind. Während der Messungen lief auf dem Rechner starke Fremdlast (ein Playwright-Browser einer anderen Sitzung mit 100 bis 360 % Prozessor, dazu fileproviderd); die Werte liegen deshalb für beide Fassungen unter denen aus 4q. Scrollen durch die ganze Seite: alt 48 bis 51, **neu 44 bis 46**; Glaskarten (Karte in der Mitte leuchtet): alt 46 bis 49, **neu 54 bis 55**; Chat öffnen alt 37 bis 47, neu 42 bis 48; Chat schließen alt 48 bis 53, neu 50 bis 55. Ohne die Sparstufen aus Abschnitt 3 und 5 lag das Scrollen neu bei 39 bis 44.
- **Nachgemessen ohne den fremden Browser** (15.11.2026 mittags, Rechnerlast 6 bis 10, sonst nur Fenster-Server, Davids Chrome und die Claude-App; gleiche Messung, abwechselnd, je drei Runden): Scrollen durch die ganze Seite alt 50 bis 52, **neu 46 bis 50**; Glaskarten alt 50 bis 52, **neu 55 bis 57**; Chat öffnen alt 41 bis 46, neu 43 bis 45; Chat schließen alt 53 bis 55, neu 55 bis 56. Scrollen je Abschnitt (zweite Messart, ganze Seite in 9 s): alt 53 bis 54, **neu 51 bis 52**; am schwächsten sind bei beiden die Leistungen (neu 40 bis 49, alt 48 bis 50).
- **Stand:** Das Ziel „Scrollen mindestens 50“ erreicht die neue Fassung knapp (je nach Messart 46 bis 52); sie liegt rund 3 Bilder je Sekunde unter der ruhigen Fassung aus Prompt 12, obwohl am Handy wieder alles animiert ist. Weitere Versuche (Ablauf-Balken, Gold-Aufleuchten, Zeichen als eigene Layout-Grenze, Szenen außerhalb des Bildes) brachten keinen messbaren Unterschied; die Schwankung zwischen zwei Läufen ist größer.

### 9 · Nicht angefasst
Chat-Fenster, Startanimation (außer Abschnitt 2), Texte, die alte Startseite. `voice-agent-prompt.md`, `vapi-prompt.txt` und `AGENTS.md` (fremde Dateien).

## 5. Bewegung (Bewegung hoch, Abweichung hoch, Dichte niedrig)
- **Kennzeichen „Das Licht folgt“:** Das Licht in der Form unseres Logos kippt als langer, schmaler Kegel zum Zeiger, der Schimmer wandert über den Namen; die Zeichen weichen aus, ein Klick schickt eine Welle hindurch (4d). Kein 3D-Zeichen mehr.
- Ein Bewegungs-Vokabular: Teile gleiten auf geraden Bahnen herein und rasten ein; Zeilen steigen aus einer Maske; Text färbt sich Wort für Wort.
- Kein Scroll-Zwang: normales Scrollen, kein Festhalten ganzer Bereiche, Animationen begleiten nur. `prefers-reduced-motion` zeigt alles sofort im Endzustand.
- **Schwache Geräte:** Was dort automatisch leichter wird, steht in **4m, Punkt 5**.
- **Handy leichter:** Licht mit 60 statt 80 Proben, ohne Maus, im oberen Drittel, ruhiges Bild nur, wenn es ruckelt; Name aus Zeichen steht still, Tippen löst die Welle aus (4d); kein Zeiger-Effekt, kürzerer Ladebildschirm, Tropfen als einfache Linie mit Punkt, Kopfleiste als schwebende Kachel, Anrufen-Knopf in voller Breite am Daumen.

## 6. Zustände und Mengen
- Formular: leer, Fehler am Feld, sendet, Erfolg (Texte aus `docs/texte.md`, gesiezt). Chat: zu, Sprechblase, offen, Übergabe, Support-Chat. Ladebildschirm: erster Besuch, Wiederkehr, reduzierte Bewegung, kein JavaScript (Seite sofort sichtbar).
- Texte siezen; Datenschutz und Impressum bleiben wortgleich; Chat siezt ohne Emojis. (Stand 14.11.2026: Der Chat duzt weiter und hat seine Begrüßung behalten; das neue Fenster in 4n ändert nur die Gestalt.)

## 7. Grenzen
- Keine Änderung an `app/api`, `lib` (außer Texten in `lib/content.ts` und reinen Anzeige-Texten im Chat-Widget; seit 14.11.2026 von David beauftragt: das Wissen des Assistenten in `lib/chatbot-knowledge.ts`, dazu die herausgezogenen Text-Regeln `lib/chat-text.ts`), Metadaten, Statistik, Terminseiten-Logik, Weiterleitung. Alle Anker-IDs bleiben. Die sechs Leistungstitel bleiben wörtlich (Schnittstellenwerte für Formular, Chat und Notion, siehe `docs/funktionen.md` 4a); ein anderer Anzeigename nur als getrennter Anzeigetext.
- Nie: lila Verläufe, Inter, 3D-Blobs, KI-Standard-Kästchenraster, Emojis als Symbole, Glas überall, reines Schwarz ohne Farbe, erfundene Zahlen oder Stimmen. Keine fremde Seite 1:1.
- Leistung: Der Ladebildschirm darf die Seite nicht blockieren (Inhalt steht im HTML). Das Licht (three.js mit postprocessing) wird nachgeladen und rechnet nur, wenn es zu sehen ist; ruckelt es, steht ein Bild. Glas-Effekt nur an Kopfleiste, „Anrufen“, Chat-Knopf, an der Glasblase des Mauszeigers, an den drei Glaskarten unter der ersten Aussage (4l) und an den Karten im Kontakt (4m). Im sparsamen Modus zeichnet Glas nicht weich (4m, Punkt 5).

## 8. Was die Code-Fehlersuche in Schritt 2 gelehrt hat (im Bau von Anfang an vermeiden)
- Keine kursive Serife in Riesen-Überschriften: Betonungswörter stehen aufrecht (von David bestätigt, 11.11.2026).
- Keine farbigen Leuchtschein-Schatten und keine runden Lichthöfe im Hintergrund: Licht als gerade Verläufe und Bänder. Ausnahmen, von David gewünscht (4d–4i): das Licht-Logo im Kopfbereich, der Lichtstreifen als Scroll-Hinweis, das leichte Leuchten von Logo und „Anrufen“ in der Kopfleiste, der warme Schein an den goldenen Wörtern der Überschriften und an der Anruf-Leiste („die Seite leuchtet selbst“), der Stern mit seinem Schein im Wörter-Feld und im Fuß, die Lichtleiste (4j).
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
24. **Feinschliff (13.11.2026, Abschnitt 4j):** Start ohne Ruckeln (das Licht wird in jedem Bild neu gezeichnet und ist dafür viel billiger geworden; Probe: 30 Bilder hintereinander unter 17 ms); Stern mindestens 3 s, Licht von innen nach außen, Zeichen bei 60 %, Licht dreht sich nach 1 s Pause langsam zur Maus. Lichtleiste statt Lichtfleck. Erste Aussage mit „Tagen“ → „Stunden“ und zeilenweise aufleuchtendem Text. Wörter-Feld mit lebendigem Stern und sechs Geister-Wörtern. Alle Überschriften entschlüsseln sich einmal je Seitenaufruf. Glasblase nur über den Zertifikaten. Ablauf läuft von selbst. „Anrufen“ scrollt am Computer zum Kontakt. Fuß mit Stern, Namen aus Zeichen und Lichtleiste.
25. **Zweite Runde (13.11.2026, Abschnitt 4k):** Das Licht friert am Computer nie ein: höchstens 60 Licht-Bilder je Sekunde, die Wache misst die Arbeitszeit der Grafikkarte und stellt nur Sparstufen ein; das Korn bleibt immer in voller Auflösung. **Davids Entscheidung zur offenen Frage aus 4j:** Nach der Höchstzeit geht das Licht an; ein ruhiges Bild gibt es nur noch als letzte Rettung für sehr schwache Handys. Im Wörter-Feld und im Fuß steht der leichte Stern (Bilder der eigenen Szene, bewegt mit Drehen, Größe und Deckkraft, tanzendes Korn) statt einer zweiten Licht-Szene. Die erste Aussage tippt sich Buchstabe für Buchstabe (erst „Tagen“, dann „Stunden“), der Absatz verwandelt sich danach auf einmal. Der Stern am Start steht 1,5 s; während der Startanimation kann man nicht scrollen und nichts überspringen. Die Lichtleiste kommt 2 s nach der Landung des Namens, bei jedem Seitenaufruf. Der Ablauf-Balken läuft 6 s und bleibt 0,5 s voll stehen.
26. **Dritte Runde (14.11.2026, Abschnitt 4l):** Davids Rückmeldung zu fcbeb26: „wunschlos glücklich“. Die Startanimation läuft immer ganz und beginnt immer oben (kein Sprung in den fertigen Zustand; der Stern wartet, bis alles bereit ist, Sicherheitsgrenze 15 s; ohne WebGL dieselbe Abfolge mit dem ruhigen Bild; Sprungziel erst nach dem Start). Der Name reagiert immer auf die Maus (tote Zone von 24 px am Seitenanfang). Die erste Überschrift verbuggt unter der Maus wie alle anderen. Unter ihr stehen statt des Absatzes der Wettlauf (zwei Balken, keine Zahlen) und drei Glaskarten mit dem goldenen Stern hinter dem Glas und dem Mauslicht auf dem Text. David beurteilt ab jetzt die fertige Fassung auf Port 3200.
27. **Vierte Runde (14.11.2026, Abschnitt 4m):** Davids Rückmeldung zu b95adb9: Die Seite gefällt ihm sehr. Die Zeichen fliegen erst 0,7 s nach dem vollen Licht los. Der goldene Mauspunkt ist der Mauszeiger des Betriebssystems selbst und sitzt immer genau auf der Maus; nur der Schein zieht nach. Die Lichtleiste kommt 3 s nach dem Start, atmet bis zum ersten Scrollen und blendet dann in 1,2 s aus. Im Kontakt steht Anrufen klar im Mittelpunkt: Anruf-Karte aus Glas mit grünem Statuspunkt; der Chat-Hinweis schickt einen Lichtpunkt zum Chat-Knopf; das Formular ist eine kleine Glaskarte mit goldenem Licht beim Ausfüllen und rotem Licht bei fehlenden Pflichtfeldern. WhatsApp ist über einen Schalter ausgeschaltet. Auf schwachen Geräten läuft die Seite deutlich leichter (4m, Punkt 5).
28. **Fünfte Runde (14.11.2026, Abschnitt 4n):** Das Chat-Fenster der neuen Seite ist ein Glasfenster im Stil der Seite: Es faltet sich aus dem Stern des Chat-Knopfs aus, Antworten entschlüsseln sich Wort für Wort, Telefonnummern werden zum Chip „Jetzt anrufen“, „Mit einem Mitarbeiter sprechen“ ist ein Glasknopf, der zum bestehenden Support-Ticket führt; am Handy ein Blatt von unten. Die Logik ist unverändert und läuft einmal für beide Fenster; die alte Startseite behält ihr Fenster. Der Assistent verweist für Termine aufs Anrufen, bietet sonst den Mitarbeiter-Chat an und nennt WhatsApp nicht mehr von sich aus.
29. **Sechste Runde (14.11.2026, Abschnitt 4o):** Das Chat-Fenster wird beim Öffnen und Schließen zur Kugel des Chat-Knopfs (kein Abschneiden mehr). Im Kopf steht unser Logo. Beim Nachdenken drei goldene Punkte, die Antwort erscheint erst ganz und entschlüsselt sich als ruhige Welle (0,6 s Zeichen je Wort, höchstens 3,5 s). Was der Assistent anbietet, steht unter der Nachricht: Anruf-Karte bei `[ANRUFEN]`, „Mit einem Mitarbeiter schreiben“ bei `[MITARBEITER]`; keine Telefonnummer mehr im Text bei Terminen. Das Formular füllt die Nachricht mit einer KI-Zusammenfassung des Chats. Schein und Glimmrand folgen der Maus ohne Verzögerung; der Glimmrand ist an allen Karten. Der Stern hinter den Glaskarten bricht sich im Glas (Lichtkreuz, klares Glas, Brechung an der Kante, Licht auf den Nachbarkarten).
30. **Siebte Runde (14.11.2026, Abschnitt 4p):** Ein Logo überall: flach und golden in Kopfleiste, Chat-Kugel und Chat-Kopf; leuchten darf nur noch das große in der Mitte. Kein weißes Licht mehr beim Öffnen des Chats, und die Kugel-Bewegung läuft jetzt ganz auf der Grafikkarte (sieben verschobene Teile statt Eckenradius, Glas-Unschärfe erst am Ende). Die Sprechblase kommt bei jedem Laden wieder. Bei Terminen bietet der Chat immer beide Wege an und duzt überall; das Mitarbeiter-Formular ist immer zu, das Kontaktformular öffnet sich nur mit Angaben aus dem Chat. Der Stern in den Glaskarten ist neu und einfacher: fest in der Mitte der Karte, Strahlen brechen sich am Glasrand und strahlen hinaus, reines Stylesheet. Der Schein des Mauszeigers gehört jetzt zum Zeiger-Bild des Systems. Im Kontakt weist eine Glaszeile mit „Jetzt chatten“ auf den Chat hin. Impressum und Datenschutz haben das neue Design und öffnen sich von der neuen Seite aus als Blatt, damit „Zurück“ an genau dieselbe Stelle führt.
31. **Achte Runde (15.11.2026, Abschnitt 4q):** Beim Öffnen und Schließen des Chats bewegt sich kein Licht mehr (der Schein in der Form ist weg, das Logo der Kugel blendet nur aus, der Glimmrand kommt erst nach dem Öffnen). Am Handy (am Gerät erkannt, nicht an der Breite): Das Logo am Anfang wackelt nicht und reagiert nicht auf Tippen, der Anrufen-Knopf unten ist weg, „So läuft es ab“ hat keine großen Zahlen, und alles, was für die Maus gedacht ist, fällt weg.
32. **Neunte Runde (15.11.2026, Abschnitt 4r):** Die Glaskarten zeigen nur noch den kleinen Stern hinter Milchglas (weiche, vorbereitete Bilder), die Schrift der hervorgehobenen Karte wird deutlich heller; Strahlen und Licht auf der Seite sind entfernt. Eine Karte leuchtet erst, wenn sie ganz eingeschwebt ist. Am Handy leuchtet die Karte in der Mitte des Bildschirms, und dort ist wieder alles animiert wie am Computer (Überschriften, Wettlauf, Wörter-Feld, „In drei Schritten“, Leistungen nur die Karte in der Mitte, mit Neustart); weg bleibt nur, was Maus oder Finger auf der Fläche braucht, und der Sprung des Namens. Überschriften springen nirgends mehr (Zwischenwort im Platz des echten Wortes). Am Handy greifen Sparstufen (gröberer Takt der Zeichen, feste Ebenen der Leistungs-Karten).
