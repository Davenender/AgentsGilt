# Funktionen der Website – Bestandsaufnahme

Stand: 11.11.2026, Zweig `website-neu` (gleicher Stand wie `luca-live`, Commit ce2eac7).
Zweck: Beim Neugestalten muss **jede** Funktion hier erhalten bleiben. Nach jedem Schritt diese Liste durchgehen.

> **Wichtig beim Prüfen:** In `.env.local` stehen echte Schlüssel. Auch die lokale Testseite
> (`npm run dev`) schickt deshalb **echte** Mails (Resend), **echte** Discord-Meldungen und
> **echte** Chat-Anfragen an Anthropic. Darum: Formulare **nie** abschicken, den Chat **nie**
> mit Nachrichten füttern, keine Schnittstelle unter `app/api` mit POST aufrufen.
> Geprüft wird nur: Felder da, Pflichtfeld-Prüfung greift, Knöpfe da und reagieren.

### Sichere Prüfumgebung (Pflicht vor jeder Sichtprüfung)

„Nicht absenden“ allein reicht nicht. Das Chat-Widget sendet auch ohne Klick:
- Beim Laden stellt es ein gespeichertes Support-Ticket aus `sessionStorage` wieder her und meldet dem Team per POST `/api/support` „Besucher ist zurück“ (`ChatWidget.tsx`, Ladeeffekt).
- Beim Verlassen schickt es per `sendBeacon` laufende Support-Anwesenheit (`/api/support`) und Gespräche ab 2 Besucher-Nachrichten (`/api/chat-log` → Mail).

Darum:
1. Nur in einem **frischen, isolierten Browser-Tab bzw. Profil** prüfen (kein vorher benutzter Tab, keine übernommene Sitzung). Vor dem ersten Aufruf `sessionStorage` leer.
2. Wo das Werkzeug es erlaubt, **vor dem Seitenaufruf** Anfragen an `/api/contact`, `/api/chat`, `/api/chat-log`, `/api/support`, `/api/termin` sperren (z. B. Playwright `page.route('**/api/**', r => r.abort())`).
3. Nie die Browser-Sitzung von David oder einem Kunden verwenden.

Legende Prüfweg: **Sichtprüfung** = im Browser ansehen/anklicken ohne Absenden. **Code** = Datei lesen, nichts ausführen.

---

## 1. Startseite (`/`)

| Funktion | Datei | Was sie tut | Prüfen ohne echte Daten |
|---|---|---|---|
| Aufbau der Startseite | `app/page.tsx` | Reihenfolge: Header, Hero, „Was wir machen“, Leistungen, Ablauf, Warum wir, Ausbildung, Kontakt, Footer | Seite lädt, alle Bereiche sichtbar |
| Sprungmarken | `components/Header.tsx`, `Footer.tsx` | Anker `#top`, `#leistungen`, `#ablauf`, `#warum`, `#ausbildung`, `#kontakt` | Links in Kopf- und Fußleiste anklicken → springt an die Stelle. **Die IDs müssen bleiben** (auch `#kontakt`: Chat und Leistungskarten springen dorthin; `#top`: Header und Chat erkennen daran die Startseite) |
| Kopfleiste | `components/Header.tsx` | fest oben; durchsichtig über dem Hero, deckend danach (IntersectionObserver auf `#top`); Handy-Menü mit `aria-expanded`, `inert` im geschlossenen Zustand | scrollen → Hintergrund wechselt; bei 390 px Menü öffnen/schließen, Tab-Taste erreicht geschlossene Links nicht |
| Hero mit Diamant | `components/Hero.tsx`, `HeroContent.tsx`, `DiamondBackground.tsx`, `HeroTrail.tsx` | Überschrift, Unterzeile, zwei Knöpfe (→ `#kontakt`, → `#leistungen`); Gold-Diamant mit Parallax; Leuchtspur an der Maus; Intro-Animation nur am Computer mit Maus und ohne „weniger Bewegung“ | Sichtprüfung Computer + Handy; mit `prefers-reduced-motion` steht alles still und sichtbar |
| Schreibmaschine „Was wir machen“ | `components/IntroTypewriter.tsx` | tippt „Wir bauen in Tagen“, löscht „Tagen“, schreibt „Stunden*“ (gold); Fußnote. **Sendet die Ereignisse `ag:intro-typing-started` und `ag:intro-typing-done`** (`lib/events.ts`) – der Chat wartet darauf mit seiner Sprechblase | in die Sektion scrollen, Text erscheint vollständig; Screenreader-Text (`aria-label`) = fertiger Satz |
| Leistungskarten | `components/Services.tsx`, `ServiceCard.tsx`, `ServiceProgress.tsx` | 6 Karten aus `lib/content.ts` (**Titel sind Schnittstellenwerte, siehe unten**); Klick/Enter/Leertaste sendet `ag:select-service` und scrollt zu `#kontakt` → Formular wählt die Leistung vor; Handy: Punkte-Leiste zählt mit (`data-service-index`) | Karte anklicken → Formular springt ins Bild, Feld „Gewünschte Leistung“ zeigt die Karte. **Nicht absenden** |
| Ablauf in 3 Schritten | `components/Process.tsx` | Computer: Schritte laufen automatisch durch (4 s), Hover pausiert erst nach der ersten Runde; Handy und „weniger Bewegung“: alle Schritte sofort voll | Sichtprüfung 1440 px und 390 px |
| Warum wir | `components/WhyUs.tsx` | 4 Vorteile, Hover-Effekt nur bei Maus | Sichtprüfung |
| Zertifikate | `components/Credentials.tsx`, `CertificateCard.tsx`, `public/certificates/*` | je Kurs zwei Zertifikate (David Hesse, Mijo Schulz) gestapelt, Wechsel per Knopf/Hover; „Zertifikat ansehen“ öffnet das PDF | Stapel wechseln, PDF-Link öffnet `/certificates/…pdf` (nur ansehen) |
| Einblend-Helfer | `components/Reveal.tsx`, `lib/gsap.ts` | Scroll-Einblendungen mit GSAP/ScrollTrigger | ohne JS bleibt alles sichtbar |

## 2. Kontakt- und Anfrageformular

| Teil | Datei | Was es tut | Prüfen ohne echte Daten |
|---|---|---|---|
| Formular | `components/Contact.tsx` | Felder: Name* (max 120), E-Mail* (type=email, max 160), Unternehmen (max 160), Gewünschte Leistung (Auswahl: Allgemeine Anfrage, 6 Leistungen, Sonstiges), Nachricht* (max 3000; Beschriftung wechselt bei „Sonstiges“). Unsichtbares Spam-Feld `website` (Honigtopf). Knopf „Anfrage absenden“ → „Wird gesendet…“. Erfolg: Dankeschön-Ansicht. Fehler: rote Meldung | Leeres Absenden versuchen → Browser blockiert (Pflichtfelder). Falsche E-Mail eingeben → Browser meckert. „Sonstiges“ wählen → Beschriftung ändert sich. **Nie gültig ausfüllen und absenden** |
| Übernahme aus dem Chat | `Contact.tsx` + `ChatWidget.tsx` | Ereignis `ag:prefill-contact` füllt nur leere Felder; Hinweis „Wir haben Angaben aus dem Chat übernommen…“ | Code lesen (auslösen ginge nur über echten Chat) |
| Antwort auswerten | `lib/kontakt-ablauf.ts` (Tests: `tests/kontakt.test.ts`) | „Danke“ nur, wenn die Mail ans Team rausging | `npm test` (läuft ohne Netz) |
| Schnittstelle | `app/api/contact/route.ts` | POST, Zod-Prüfung, max. 5 Anfragen/Stunde je IP, Honigtopf → still „ok“. Sendet 1) Mail ans Team (`MAIL_TO`, Antwort an Interessent), 2) Bestätigungsmail an den Interessenten, 3) danach Discord (`lib/anfragen.ts`: KI-Spam-Prüfung → #anfragen oder #posteingang) | **Nur Code lesen.** Nie aufrufen |
| Direkt-Kontakt | `Contact.tsx` | Anrufen-Knopf `tel:+4961089694027`, WhatsApp-Link `wa.me/4916098427943` mit Vortext | Links prüfen (href), nicht anrufen |

## 3. Chat-Assistent (unten rechts, auf allen Seiten)

| Teil | Datei | Was es tut | Prüfen ohne echte Daten |
|---|---|---|---|
| Widget | `components/ChatWidget.tsx` (eingebunden in `app/layout.tsx`) | runder Logo-Knopf unten rechts; Sprechblase erscheint 2 s nach Ende der Schreibmaschine (Sicherheitsnetz 14 s; auf Unterseiten nach 10 s), wegklickbar; Fenster mit Begrüßung, 3 Startfragen, Eingabe (Enter sendet, Umschalt+Enter = neue Zeile); Verlauf in sessionStorage (`ag-assistant-*`) | Knopf da, öffnet/schließt, Startfragen sichtbar, Senden-Knopf ist bei leerem Feld gesperrt. **Keine Frage abschicken, keine Startfrage anklicken** (die senden sofort) |
| KI-Antworten | `app/api/chat/route.ts`, `lib/chatbot-knowledge.ts` | POST, Modell `claude-sonnet-5-5`, Streaming, max. 30 Anfragen/5 Min je IP; Marker `[KONTAKT]`, `[MITARBEITER]`, `[DATEN]…[/DATEN]` werden im Widget ausgewertet und nie angezeigt | **Nur Code lesen** |
| Kontakt-Wege im Chat | `ChatWidget.tsx` | nach Marker: „Mit einem Mitarbeiter chatten“, „Jetzt anrufen“ (tel:), „Anfrage schicken“ (→ `#kontakt` bzw. `/#kontakt` von Unterseiten) | Code lesen; Link „mit einem Mitarbeiter sprechen“ unten im Fenster öffnet das Übergabe-Formular → nur ansehen, **nicht „Verbinden“** |
| Übergabe an Mitarbeiter (Support-Chat) | `ChatWidget.tsx`, `app/api/support/route.ts`, `lib/support.ts` | Formular Name*, E-Mail oder Telefon*, Anliegen*, Honigtopf; POST `open` legt Discord-Kanal `ticket-XXXX` an, schickt zusätzlich **eine Mail ans Team** („Support-Anfrage ticket-… von …“) und **eine Push-Nachricht (ntfy)** aufs Handy; Weiterleitung beim Abholen (`lib/support.ts`) auf zwei Wegen: **(a) Nachrichten von Menschen im Ticket-Kanal erscheinen standardmäßig öffentlich im Besucher-Chat** und werden vorher ggf. **von der KI (Anthropic) sprachlich korrigiert** – nur ein führendes `//` macht eine Nachricht intern (keine Weiterleitung, keine Korrektur); **(b) Bot-Nachrichten** werden nur mit Präfix 💬 weitergereicht, unverändert und ohne KI-Korrektur; Übernahme im Discord-Knopf erzeugt im Besucher-Chat „Du bist jetzt mit einem Mitarbeiter verbunden…“ (`app/api/discord/route.ts`); danach Abholen der Team-Antworten (GET alle 4 s offen / 15 s zu), Anwesenheit `left`/`back` per sendBeacon | Formular öffnen, Pflichtfelder prüfen, „Abbrechen“ testen. **Nie „Verbinden“** |
| Gesprächsprotokoll | `app/api/chat-log/route.ts` | beim Verlassen der Seite (ab 2 Besucher-Nachrichten, ohne Support-Ticket) per sendBeacon an uns gemailt | Code lesen |

## 4. Terminseiten (Links aus der SMS)

| Teil | Datei | Was es tut | Prüfen ohne echte Daten |
|---|---|---|---|
| Terminvorschlag | `app/termin/[code]/page.tsx`, `components/TerminAntwort.tsx`, `lib/termin-kunde.ts` | Code ist signiert (`LINK_SECRET`); gültig → „Guten Tag, Name“, Vorschlag, Knöpfe „Passt“ / „Anderer Termin“ (Datum ab morgen, Uhrzeit in 5-Min-Schritten) → „Wunsch senden“ / „Zurück“; Zustände: bestätigt, Wunsch erhalten, abgelaufen; `noindex` | `/termin/test` aufrufen → zeigt „Dieser Link ist leider ungültig oder abgelaufen…“ (falscher Code wird ohne Discord-Abfrage abgelehnt). Gültige Codes nie benutzen |
| Antwort | `app/api/termin/route.ts`, `lib/termin-antwort.ts`, `lib/google-calendar.ts` | POST accept/wish (max. Versuche je IP). „Passt“ **bestätigt den Google-Kalender-Eintrag**; „Anderer Termin“ **prüft im Google-Kalender, ob die Zeit frei ist** (sonst „Zu dieser Zeit sind wir leider nicht frei…“) und schreibt den Wunsch als Antwort in die Discord-Meldung. Der Terminstatus (proposed / confirmed / customer_alt) liegt in der Discord-Meldung und ist mit dem Kalendereintrag verknüpft | **Nur Code lesen.** Nie aufrufen |
| Weiterleitung alter Links | `app/t/[code]/page.tsx` | `/t/<code>` → `/termin/<code>` | `/t/test` aufrufen → landet auf `/termin/test` |

## 4a. Leistungstitel sind Schnittstellenwerte

Die sechs Titel `Websites & Landingpages`, `KI-Chatbots`, `Voice-Agenten`, `Online-Terminbuchung`, `Automatisierungen`, `KI-Beratung & Audit` (+ `Sonstiges`) werden **wörtlich** verglichen in:
- `lib/content.ts` (Quelle für Karten und Formular-Auswahl),
- `components/Contact.tsx` (Chat-Übernahme verwirft unbekannte Werte),
- `lib/chatbot-knowledge.ts` (der Chat-Assistent liefert genau diese Werte im `[DATEN]`-Marker),
- `lib/notion-api.ts` (Zuordnung zu Notion-Angeboten) → `lib/anfrage-handlers.ts` (Lead-Übernahme).

**Beim Neugestalten nicht umbenennen.** Soll eine Leistung anders heißen, getrennten Anzeigetext einführen (z. B. `displayTitle`) und den Schnittstellenwert behalten – oder alle Verbraucher gemeinsam ändern (gesonderter Auftrag).

## 5. Metadaten, Suchmaschinen, Statistik

| Teil | Datei | Was es tut | Prüfen |
|---|---|---|---|
| Metadaten | `app/layout.tsx` | `lang="de"`, Titel „Agents Gilt – KI-Lösungen für lokale Unternehmen“, Beschreibung, canonical `/`, Open Graph + Twitter mit `/logo-full.png` | Seitenquelltext: `<title>`, `og:*`, `twitter:*` |
| Strukturierte Daten | `app/layout.tsx` | zwei JSON-LD-Blöcke: `WebSite` und `ProfessionalService` (Adresse, Telefon, E-Mail, Einzugsgebiet, Fachgebiete, TikTok) | Quelltext: 2× `application/ld+json` |
| Favicon | `app/icon.png` | Gold-Diamant | Tab-Symbol |
| robots.txt | `app/robots.ts` | alles erlaubt außer `/api/`, Sitemap-Hinweis | `/robots.txt` aufrufen |
| Sitemap | `app/sitemap.ts` | nur die Startseite | `/sitemap.xml` aufrufen |
| Besucherstatistik | `app/layout.tsx` (`@vercel/analytics`) | cookiefreie Vercel-Statistik, `<Analytics />` am Ende von `<body>` | Code: Komponente bleibt eingebunden (lokal sendet sie nichts) |
| Unterseiten-Titel | `app/impressum/page.tsx`, `app/datenschutz/page.tsx`, `app/termin/[code]/page.tsx` | eigene Titel; Termin `noindex` | Tab-Titel |
| Schriften | `app/layout.tsx` | derzeit Inter (`--font-body`) + Sora (`--font-head`) über `next/font` | wird beim Neubau ersetzt (Brief: nicht Inter) – nur die Darstellung |

## 6. Rechtliches

| Seite | Datei | Hinweis |
|---|---|---|
| Impressum | `app/impressum/page.tsx` | Text bleibt **wortgleich** (§ 5 DDG, Kleinunternehmer § 19 UStG, MStV, Streitbeilegung, Haftung) |
| Datenschutz | `app/datenschutz/page.tsx` | Text bleibt **wortgleich** (10 Abschnitte: Vercel, Formular/Resend, Chat/Anthropic/Discord, Telefon/Twilio/Vapi, WhatsApp, Stripe, Docusign, Cookies, Rechte) |

Beobachtung (nicht geändert, nur zur Info für David): Abschnitt 9 „nutzt kein Tracking“ steht neben der cookiefreien Vercel-Statistik. Das ist rechtlich zu bewerten, nicht vom Design.

## 7. Schnittstellen unter `app/api` ohne Bezug zur Oberfläche

Diese Routen gehören zu Discord-Bot, Telefon, Zahlungen und Zeitplänen. Beim Neugestalten **nicht anfassen**. Prüfen: nur, dass Datei und Pfad unverändert sind (`git diff --stat app/api lib` muss leer bleiben).

| Pfad | Aufgerufen von | Zweck |
|---|---|---|
| `/api/discord` | Discord | Slash-Befehle und Knöpfe des Bots |
| `/api/vapi` | Vapi | Bericht nach jedem Anruf → Mail + Discord |
| `/api/rufgruppe` | Twilio | Eingehende Anrufe auf +49 6108 9694027 → Vapi, Rufgruppe, Rückrufe |
| `/api/luca` | Twilio/Vapi | Davids persönlicher Telefon-Assistent |
| `/api/rueckruf/wiederholen` | cron-job.org (30 Min) | geplante KI-Rückrufe |
| `/api/erinnerungen` | cron-job.org (10 Min) | Terminerinnerungen in #termine |
| `/api/notion` | Notion-Automation | Kundenkanäle `knd_00X` |
| `/api/kunden/abgleich` | cron-job.org (stündlich) | Status-Farbpunkte abgleichen |
| `/api/kunden/demo` | Zentrale (HELFER_SECRET) | Demo-Anfragen |
| `/api/kunden/statistik` | Vercel-Cron (`vercel.json`, 1. des Monats) | Kundenstatistik |
| `/api/lead-suche/aufraeumen`, `/api/lead-suche/karte` | cron-job.org / Discord | Lead-Suche |
| `/api/posteingang/aufraeumen` | cron-job.org (täglich) | #posteingang aufräumen |
| `/api/mail/eingang` | Google Apps Script | Gmail-Brücke |
| `/api/stripe` | Stripe-Webhook | Zahlungen |
| `/api/standort` | OwnTracks | Standort für Luca |
| `/api/helfer` | Zentrale (HELFER_SECRET) | nur lesen: Discord/Twilio/Vapi |
| `/api/akademie/*` | Zentrale (HELFER_SECRET) | Akademie |
| `/api/willkommen` | Zentrale (HELFER_SECRET) | Anleitungen in #willkommen |

## 8. Einstellungen

- Umgebungsvariablen: Namen in `.env.example`, Werte in `.env.local` (nie committen) und bei Vercel. Bleiben unverändert.
- `vercel.json` (Cron), `next.config.ts` (leer), `package.json`-Befehle bleiben.
- Inhalte: `lib/content.ts` (Texte), `lib/chatbot-knowledge.ts` (Wissen des Chat-Assistenten – Aussagen dort müssen zur neuen Seite passen).

## 9. Aufbau-Varianten der neuen Seite (Schritt 3, Arbeitsstand)

Die alte Startseite (`app/page.tsx`) läuft unverändert weiter. Die drei Varianten liegen daneben und sind für Suchmaschinen gesperrt (`robots: noindex` im Layout, nicht in der Sitemap).

| Teil | Datei | Was es tut | Prüfen ohne echte Daten |
|---|---|---|---|
| Übersicht | `app/varianten/page.tsx`, `public/varianten/*.jpg` | zeigt die drei Aufbauten nebeneinander als **feste Aufnahmen** (erster Bildschirm am Computer und am Handy, ganze Seite als Streifen). Bewusst keine eingebetteten Live-Seiten: Sonst liefe der Chat-Assistent mehrfach mit und könnte Gesprächsprotokolle mehrfach senden. Die Aufnahmen zeigen den Stand vom 11.11.2026; nach Änderungen an den Varianten neu aufnehmen (unsichtbarer Chrome, Adresse mit `?vorschau=1` = ruhige Ansicht ohne Ladebildschirm und Dauer-Animation, `/api/**` gesperrt) | `/varianten` aufrufen, Knöpfe führen auf die echten Seiten |
| Varianten | `app/varianten/[aufbau]/page.tsx`, `components/neu/aufbau/*` | `/varianten/riesen-schriftzug`, `/varianten/kartenstapel`, `/varianten/umlaufbahn`; andere Adressen → 404 | aufrufen, durchscrollen |
| Welt | `app/varianten/layout.tsx`, `app/varianten/welt.css` | Schriften und Farben der neuen Welt, gelten nur unter `.ag-neu` | alte Seiten sehen aus wie vorher |
| Texte | `lib/inhalt-neu.ts` | Sie-Texte; die sechs Leistungstitel kommen wörtlich aus `lib/content.ts` | Auswahl im Formular zeigt dieselben 6 Titel |
| Anfrage-Formular | `components/neu/Anfrage.tsx` | **gleiche Logik wie `components/Contact.tsx`** (Felder, Honigtopf, POST `/api/contact`, Auswertung, Chat-Übernahme `ag:prefill-contact`, Vorauswahl `ag:select-service`), nur eingeklappt; öffnet sich bei Vorauswahl oder Chat-Übernahme. Solange beide Seiten bestehen, gibt es die Logik zweimal: Änderungen an einer Stelle auch an der anderen nachziehen | „Anfragen“ an einer Leistung → Formular klappt auf, Leistung vorgewählt; leeres Absenden blockiert. **Nie abschicken** |
| Leistung wählen | `components/neu/Leistungsteile.tsx` | Knopf „Anfragen“ sendet `ag:select-service` und springt zu `#kontakt` (wie bisher die Karte) | siehe oben |
| Schreibmaschine | `components/neu/Schreibmaschine.tsx` | „Tagen“ → „Stunden*“; sendet weiter `ag:intro-typing-started` / `ag:intro-typing-done` für die Chat-Sprechblase | in den Bereich scrollen, Sprechblase erscheint danach |
| Ladebildschirm | `components/neu/Ladebildschirm.tsx` | Logo setzt sich zusammen, Prozent und Balken, höchstens gut 2 s; meldet `ag:intro-fertig`. Ohne Skript, bei „weniger Bewegung“ und in der Vorschau kein Ladebildschirm; Sicherheitsnetz blendet ihn nach 5 s aus | Seite laden; mit „weniger Bewegung“ ist die Seite sofort da |
| Weiches Scrollen | `components/neu/Rahmen.tsx` (Lenis) | nur auf den Varianten, im Takt von GSAP; Chat-Fenster scrollt für sich (`allowNestedScroll`); bei „weniger Bewegung“ aus | Mausrad, Anker-Links, Chat-Verlauf scrollen |
| Zertifikate | `components/neu/Bereiche.tsx` | je Kurs Wechsel zwischen David Hesse und Mijo Schulz per Knopf, „Zertifikat ansehen“ öffnet das PDF | Knöpfe wechseln Bild und Link |
| Kopf- und Fußleiste | `components/neu/Kopfleiste.tsx`, `Rahmen.tsx` | Anker `#top #leistungen #ablauf #warum #ausbildung #kontakt`, `tel:`-Links, Mail, WhatsApp, Impressum, Datenschutz; am Handy Menü über den ganzen Bildschirm als Dialog (eigener Schließen-Knopf, Esc schließt, Tab bleibt im Menü, alles andere ruht; der Chat-Knopf ist nur solange ausgeblendet, wie das Menü offen ist) und Anrufen-Knopf am Daumen | Links und Menü prüfen: öffnen, Tab-Runde, schließen; danach ist der Chat-Knopf wieder da |

**Kopfbild-Varianten (Schritt 4)** im gewählten Aufbau Riesen-Schriftzug:

| Teil | Datei | Was es tut | Prüfen ohne echte Daten |
|---|---|---|---|
| Übersicht | `app/varianten/kopf/page.tsx`, `public/varianten/kopf/*.jpg` | vier Kopfbilder als **feste Aufnahmen** (Computer und Handy), keine eingebetteten Seiten. Aufnahmen vom 11.11.2026; nach Änderungen neu aufnehmen (unsichtbarer Chrome, `/api/**` gesperrt, nach dem Ladebildschirm, mit kurzer Mausbewegung) | `/varianten/kopf` aufrufen, Knöpfe führen auf die Seiten |
| Seiten | `app/varianten/kopf/[kopf]/page.tsx` | `/varianten/kopf/kern`, `/baender`, `/wolke`, `/tiefe`: ganze Seite im Aufbau Riesen-Schriftzug, nur der Kopfbereich je Variante (`components/neu/kopf/Koepfe.tsx`); andere Adressen → 404. Der Kopfbereich hat weiter `id="top"` (Chat-Sprechblase erkennt daran die Startseite) | aufrufen, durchscrollen |
| **Gewählter Kopfbereich** (seit dem Zwischenauftrag vor Schritt 5) | `components/neu/kopf/LichtName.tsx`, `licht.ts`, `zeichenfeld.ts` | `/varianten/kopf/kern`: hinten das Logo aus Licht (ein WebGL-Shader, **kein three.js**), vorn der Name aus Zeichen-Teilchen (2D-Zeichenfläche). Rechnet nur, solange der Kopfbereich zu sehen ist. Maus: Stern folgt, Zeichen weichen aus. Klick oder Tippen auf freie Fläche: Welle durch die Zeichen, Licht leuchtet auf (auf Links und Knöpfen nicht). „Weniger Bewegung“: alles still. Ohne Skript und ohne WebGL stehen Name und Logo als gewöhnliche Grafik da. Der Schriftzug bleibt als Name für Vorleseprogramme im HTML | Computer: Maus bewegen, klicken; Handy: tippen; „weniger Bewegung“: nichts bewegt sich |
| 3D-Szene (nur noch die drei nicht gewählten Kopfbilder) | `components/neu/kopf/szene.ts`, `KopfBuehne.tsx` | three.js (WebGPU, sonst WebGL 2). Wird nur ab 768 px Breite und ohne „weniger Bewegung“ nachgeladen; rechnet nur, solange der Kopfbereich zu sehen ist. Startet sie nicht, bleibt das Ersatzbild | Computer: Zeichen glänzt, Spuren folgen der Maus |
| Ersatzbild | `components/neu/kopf/einfach.ts` | 2D-Zeichnung für Handy und „weniger Bewegung“; Tippen auf freie Fläche im Kopfbereich sprüht Funken (Tippen auf Links und Knöpfe nicht) | Handy: tippen; „weniger Bewegung“: steht still |

Unverändert und auf den Varianten vorhanden, weil sie im Haupt-Layout hängen: Chat-Assistent (`components/ChatWidget.tsx`), Vercel-Statistik, JSON-LD, Metadaten.

**Prüfen in echtem Tempo:** Ist der Browser-Bereich der App ausgeblendet, laufen Animationen dort nur im Sekundentakt. Dann mit einem unsichtbaren Chrome prüfen (Playwright, `page.route('**/api/**', r => r.abort())` vor dem Laden), nicht im Browser-Bereich.

## Prüfliste nach jedem Schritt

0. Sichere Prüfumgebung (oben) eingerichtet.
1. `git diff --stat main -- app/api lib/*.ts tests vercel.json .env.example` zeigt **keine** Änderung außer `lib/content.ts` und der neuen Textdatei `lib/inhalt-neu.ts`.
2. `npm run build`, `npm run lint`, `npm test` laufen durch.
3. Startseite: alle Anker (`#top #leistungen #ablauf #warum #ausbildung #kontakt`) vorhanden.
4. Leistungstitel in `lib/content.ts` unverändert (Schnittstellenwerte).
5. Formular: 5 Felder + Honigtopf, Pflichtfelder blockieren leeres Absenden, „Sonstiges“ ändert die Beschriftung, Leistungskarte wählt vor. **Nicht absenden.**
6. Chat: Knopf unten rechts, öffnet/schließt, Startfragen sichtbar, Übergabe-Formular öffnet und „Abbrechen“ geht. **Nichts senden.**
7. Anrufen-Knopf (`tel:+4961089694027`) gut sichtbar, WhatsApp-Link korrekt.
8. `/termin/test` zeigt „ungültig“, `/t/test` leitet weiter.
9. `/impressum`, `/datenschutz` Text unverändert; `/robots.txt`, `/sitemap.xml` erreichbar.
10. Quelltext: Titel, Beschreibung, OG/Twitter, 2× JSON-LD, Vercel-Analytics vorhanden.
