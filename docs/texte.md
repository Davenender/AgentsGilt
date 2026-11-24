# Sichtbare Texte der Website – Bestandsaufnahme

Stand: 11.11.2026 (Zweig `website-neu`, Quelle: laufende Seite + `lib/content.ts` + Komponenten).

> **Seit 15.11.2026 (Prompt 15):** Die neue Seite ist die Startseite `/`, die alte Startseite ist ersetzt und ihr Code entfernt. Die Abschnitte von „Kopfleiste“ bis vor „Neue Seite“ beschreiben die **alte** Seite (Bestand vom 11.11.2026). Gültig sind die Texte unter „Neue Seite“ und in `lib/inhalt-neu.ts`.
Die neue Seite darf Texte kürzen und verbessern. **Aussagen, Preise, Fakten und die rechtlichen Texte bleiben.**

> **Hinweis Anrede:** Die heutige Seite duzt („dein Geschäft“). Der Brief verlangt „Sie“.
> Beim Neubau werden die Werbetexte auf „Sie“ umgestellt. Die Datenschutzerklärung duzt ebenfalls –
> sie ist ein rechtlicher Text und bleibt wortgleich, bis David entscheidet (siehe Ende).

Belegte Fakten (nicht ändern): Telefon +49 6108 9694027 (KI-Assistent nimmt ab) · E-Mail kontakt@agentsgilt.com ·
WhatsApp 4916098427943 · Lämmerspieler Straße 100, 63165 Mühlheim am Main · Einzugsgebiet Mühlheim, Offenbach, Frankfurt, Hanau ·
„meist innerhalb eines Werktages“ · Zertifikate von Anthropic (4 Kurse, David Hesse und Mijo Schulz) · Preismodell: „Fairer Setup-Preis plus transparente monatliche Betreuung“ (keine Zahlen auf der Seite).

---

## Kopfleiste
- Logo-Text: **Agents Gilt**
- Navigation: Leistungen · Ablauf · Warum wir · Kontakt
- Knopf: **Projekt anfragen**
- Handy: „Menü öffnen“ / „Menü schließen“ (Screenreader)

## Hero
- Etikett: DEINE KI-AGENTUR FÜR LOKALE UNTERNEHMEN
- Überschrift: **KI-Lösungen, / die dein Geschäft voranbringen.** (zweite Zeile gold)
- Unterzeile: Moderne Websites, Chatbots, Voice-Agenten und Automatisierungen für lokale Unternehmen.
- Knöpfe: **Projekt anfragen** · **Leistungen ansehen**

## Was wir machen (Schreibmaschine)
- Etikett: WAS WIR MACHEN
- Überschrift: Wir bauen in ~~Tagen~~ **Stunden\***, wofür Agenturen Wochen brauchen.
- Text: Mit modernster KI entwickeln wir maßgeschneiderte digitale Lösungen für kleine und mittlere Unternehmen – schnell, bezahlbar und auf neuestem Stand. Du bekommst Technik, die sonst großen Firmen vorbehalten ist.
- Fußnote: \* Gilt nur bei sehr einfachen Projekten und ist kein Versprechen.

## Leistungen
- Etikett: LEISTUNGEN
- Überschrift: Alles, was dein Geschäft digital braucht.
- Text: Von der Website bis zum Telefon-Agenten – wir bauen die Lösung, die zu deinem Problem passt. Einzeln oder als Komplettpaket.
- Karten-Hinweis beim Überfahren: Auswählen →

| Nr | Titel | Kurz | Beschreibung | Punkte |
|---|---|---|---|---|
| 01 | Websites & Landingpages | Moderne Seiten, die Anfragen bringen. | Schnelle, mobil-optimierte Websites mit klarem Design, die aus Besuchern echte Kunden machen. | Modernes, individuelles Design · Für Google optimiert (SEO) · Kontakt- & Buchungsformulare |
| 02 | KI-Chatbots | Dein Assistent, der nie schläft. | Ein intelligenter Chat-Assistent auf deiner Website, der rund um die Uhr Fragen beantwortet und Anfragen sammelt – auch nachts und am Wochenende. | Antwortet 24/7 automatisch · Beantwortet aus deinen Infos · Sammelt Leads & Kontakte |
| 03 | Voice-Agenten | Kein verpasster Anruf mehr. | Ein KI-Telefonassistent, der Anrufe annimmt, häufige Fragen beantwortet und Termine direkt einträgt – damit keine Anfrage verloren geht. | Nimmt Anrufe rund um die Uhr an · Bucht & verschiebt Termine · Leitet Notfälle an Menschen weiter |
| 04 | Online-Terminbuchung | Schluss mit Telefon-Pingpong. | Ein Buchungssystem, mit dem Kunden selbst Termine wählen – inklusive automatischer Erinnerungen gegen No-Shows. | Self-Service rund um die Uhr · Automatische Erinnerungen · Weniger Ausfälle (No-Shows) |
| 05 | Automatisierungen | Lass die Routine sich selbst erledigen. | Wir automatisieren wiederkehrende Abläufe – von Lead-Erfassung bis Rechnungsversand – und schenken dir Stunden zurück. | Spart Zeit & vermeidet Fehler · Verbindet deine Tools · Berichte & Benachrichtigungen |
| 06 | KI-Beratung & Audit | Wo lohnt sich KI für dich? | Wir analysieren deine Abläufe und zeigen dir eine klare, priorisierte Roadmap, wo KI dir am meisten Zeit und Umsatz bringt. | Analyse deiner Prozesse · Priorisierte Roadmap · Konkrete Umsetzungs-Schritte |

**Erweiterung für den Neubau (entschieden 11.11.2026, Namen unverändert, nur Beschreibungen/Punkte ergänzen, keine Preise, keine eigenen Software-Produkte):**
- 05 **Automatisierungen** – zusätzlich: CRM einrichten und interne Werkzeuge.
- 02 **KI-Chatbots** – zusätzlich: Wissens-KI, die die eigenen Unterlagen eines Betriebs kennt.
- 06 **KI-Beratung & Audit** – zusätzlich: individuelle KI-Systeme, z. B. ein Kundenportal.
Die genaue Formulierung entsteht in Schritt 2 in `lib/content.ts` (gesiezt). Hinweis: Das Wissen des Chat-Assistenten (`lib/chatbot-knowledge.ts`) beschreibt die Leistungen ebenfalls; damit er dasselbe sagt wie die Seite, müsste es mit angepasst werden – nur Text, die festen `service`-Werte bleiben.

**Die Leistungstitel sind Schnittstellenwerte und dürfen nicht umbenannt werden.** Sie werden wörtlich verglichen in `lib/content.ts`, `components/Contact.tsx` (Chat-Übernahme verwirft unbekannte Werte), `lib/chatbot-knowledge.ts` (feste Werte im `[DATEN]`-Marker) und `lib/notion-api.ts` (Notion-Angebote, Lead-Übernahme über `lib/anfrage-handlers.ts`). Ein anderer sichtbarer Name geht nur über einen getrennten Anzeigetext (siehe `docs/funktionen.md` Abschnitt 4a).

## Ablauf
- Etikett: SO ARBEITEN WIR
- Überschrift: In drei Schritten zu deiner Lösung.
- 01 **Gespräch & Analyse** – Wir hören zu und finden gemeinsam, wo dir KI am meisten Zeit und Umsatz bringt.
- 02 **Bau mit KI** – Wir entwickeln deine Lösung in Tagen statt Wochen – und halten dich auf dem Laufenden.
- 03 **Setup & Betreuung** – Wir richten alles startklar ein und betreuen dein System laufend weiter.

(Neuer Brief nennt den Bereich „So läuft es ab“.)

## Warum Agents Gilt
- Etikett: WARUM AGENTS GILT
- Überschrift: Großer Anspruch. Persönlich umgesetzt.
- **Schnell** – Erste Ergebnisse in Tagen, nicht Monaten.
- **Modern** – Technik auf dem neuesten Stand – wie bei den Großen.
- **Persönlich** – Ein direkter Ansprechpartner statt Hotline-Warteschleife.
- **Planbar** – Fairer Setup-Preis plus transparente monatliche Betreuung.

## Ausbildung & Weiterbildung
- Etikett: AUSBILDUNG & WEITERBILDUNG
- Überschrift: Ausgebildet in Anthropics KI-Technologie.
- Text: Wir bilden uns direkt bei Anthropic weiter – dem Unternehmen hinter Claude, einer der führenden KIs weltweit.
- Kurse (je David Hesse und Mijo Schulz): AI Fluency: Framework & Foundations · Claude 101 · Claude Code in Action · Model Context Protocol: Advanced Topics
- Link je Zertifikat: Zertifikat ansehen →
- Bildbeschreibung: „Zertifikat <Kurs> von <Name>“

## Kontakt
- Etikett: KONTAKT
- Überschrift: Lass uns über dein Projekt sprechen.
- Text: Erzähl uns kurz, worum es geht – wir melden uns meist innerhalb eines Werktages.
- Felder: Name \* (Platzhalter „Dein Name“) · E-Mail \* („du@firma.de“) · Unternehmen („Optional“) · Gewünschte Leistung (Allgemeine Anfrage · 6 Leistungen · Sonstiges (selbst beschreiben)) · Worum geht's? \* („Erzähl uns kurz von deinem Projekt oder Problem…“) – bei Sonstiges: „Beschreibe deine Leistung \*“ („Beschreibe kurz, welche Leistung du dir vorstellst…“)
- Hinweis nach Chat-Übernahme: Wir haben Angaben aus dem Chat übernommen — bitte überprüfe diese nochmal auf Fehler.
- Knopf: **Anfrage absenden** / „Wird gesendet…“
- Darunter: Oder direkt: · **+49 6108 9694027** · WhatsApp
- Erfolg: **Danke! Deine Anfrage ist da.** – Wir melden uns meist innerhalb eines Werktages bei dir.
- Fehlermeldungen vom Server (`app/api/contact/route.ts`, Logik – nicht ändern): „Bitte gib deinen Namen an“, „Bitte gib eine gültige E-Mail an“, „Bitte schreib uns kurz, worum es geht“, „Zu viele Anfragen. Bitte versuch es später noch einmal.“, „Ungültige Anfrage“ (+ Netzfehler-Text aus `lib/kontakt-ablauf.ts`)
- WhatsApp-Vortext: Hey, ich hätte Interesse an einer Dienstleistung bzw. habe allgemeine Fragen dazu!

## Fußleiste
- Agents Gilt · KI-Lösungen für lokale Unternehmen – moderne Websites, Chatbots, Voice-Agenten und Automatisierungen.
- NAVIGATION: Leistungen · Ablauf · Warum wir · Kontakt
- KONTAKT & RECHT: +49 6108 9694027 · kontakt@agentsgilt.com · Impressum · Datenschutz
- © 2026 Agents Gilt. Alle Rechte vorbehalten.

## Chat-Assistent
- Knopf: „Chat mit Agents Gilt öffnen“ (Screenreader)
- Sprechblase: Bei Fragen helfe ich dir gerne weiter ✨ (Schließen-Kreuz)
- Kopf: AGENTS GILT · KI-ASSISTENT (im Support: „Support-Chat mit dem Team“)
- Begrüßung: Hey! 👋 Ich bin der KI-Assistent von Agents Gilt. Bei Fragen zu unseren Leistungen helfe ich dir gern weiter!
- Startfragen (seit 23.11.2026, Prompt 18): Was macht ihr genau? · Passt das zu meinem Betrieb? · Wie schnell geht das? (bis 22.11.2026: „Wie läuft die Zusammenarbeit ab?“ und „Was braucht ihr von mir?“)
- Eingabe: Frag mich etwas… (Support: „Schreib dem Team …“) · Senden
- Fußzeile: Agents Gilt ist eine KI · mit einem Mitarbeiter sprechen (Support: „Du schreibst mit unserem Team · Antworten erscheinen hier im Chat“)
- Kontakt-Knöpfe: Mit einem Mitarbeiter chatten · Jetzt anrufen · Anfrage schicken → · „Am Telefon nimmt unser KI-Assistent ab und macht direkt einen Termin aus.“
- Übergabe-Formular: Mit einem Mitarbeiter sprechen · „Wir übergeben dein Anliegen an unser Team. Es antwortet dir bald hier im Chat. Falls du die Seite verlässt, melden wir uns über den Kontakt, den du angibst.“ · Dein Name · E-Mail oder Telefonnummer · Worum geht es? · „Mit dem Absenden wird dein Anliegen samt Chatverlauf an unser Team übergeben (siehe Datenschutz).“ · Verbinden / „Wird übergeben …“ · Abbrechen
- Nach Übergabe: Danke, <Name>! Ich habe dein Anliegen an unser Team übergeben. Hier im Chat antwortet dir bald ein Mitarbeiter. Du kannst in der Zwischenzeit gern weiterschreiben.
- Chat beendet: Der Chat mit dem Team wurde beendet. Bei weiteren Fragen helfe ich dir wieder gern, oder du verbindest dich erneut mit einem Mitarbeiter.

**Chat-Assistent: Chat-Schutz (neu am 23.11.2026, Prompt 17, Runde 2 in Prompt 18; Quelle `lib/inhalt-neu.ts` `chat.schutz`)**
- Sperre im Assistenten und nach dem Wechsel zum Team, solange die Uhr läuft (`sperre`, über dem Eingabefeld, mit Countdown; die Zeile nennt den Grund, Davids Variante A):
  - „Zu viele Nachrichten – wieder frei in 4:32“ (mehr als 8 Nachrichten in 60 s)
  - „Gleiche Nachricht zu oft – wieder frei in 4:32“ (3-mal gleiche oder fast gleiche Nachricht)
  - „Bitte nur echte Nachrichten – wieder frei in 4:32“ (4 unverständliche Nachrichten in 60 s)
  - „Gesperrt wegen Beleidigung – wieder frei in 4:32“
  - Dauer jeweils 5 Minuten
- Nach Ablauf (6 s lang): „Du kannst wieder schreiben.“
- Support-Chat, Besucher gesperrt, ohne Uhr (`team`, frei gibt ein Mitarbeiter in Discord; der alte Satz „Du kannst gerade nicht schreiben. Ein Mitarbeiter schaltet dich gleich wieder frei.“ ist weg):
  - „Zu viele Nachrichten – ein Mitarbeiter gibt den Chat wieder frei.“
  - „Gleiche Nachricht zu oft – ein Mitarbeiter gibt den Chat wieder frei.“
  - „Bitte nur echte Nachrichten – ein Mitarbeiter gibt den Chat wieder frei.“
  - „Gesperrt wegen Beleidigung.“
  - „Gesperrt wegen Spam.“
  - „Gesperrt wegen Drohung.“
  - „Der Chat ist gesperrt.“ (Sonstiges)
  - danach, nach dem Entsperren durch das Team: „Du kannst wieder schreiben.“
- Das Team beendet den Chat eines gesperrten Kunden (`beendet`): „Der Chat wurde beendet.“
- Beleidigung (`freundlich`): „Bitte bleib freundlich.“ · einmal beim ersten Mal, als ruhige Zeile im Chat (nicht als Nachricht eines Mitarbeiters; leuchtet 5-mal rot, danach feiner roter Rand); beim zweiten Mal folgt die Sperre
- Bündel kam nicht an (`nichtAngekommen`, `nochmal`, `sendet`): „nicht angekommen“ · Knopf „Nochmal senden“ · während des Sendens „wird gesendet …“

**Chat-Assistent: neue Karten unter Antworten (neu am 23.11.2026, Prompt 18; Quelle `lib/inhalt-neu.ts` `chat.karten`; Regeln 11 bis 14 in `lib/chatbot-knowledge.ts`)**
- A · Folgefragen (`[FRAGEN]["…","…"][/FRAGEN]`, höchstens 2, je höchstens 40 Zeichen, unter der neuesten Antwort; für Vorleseprogramme die Gruppe „Weiterfragen“)
- B · Link zur Leistung (`[LEISTUNG:…]`, „Mehr zu … →“, scrollt zur Karte im Abschnitt `#leistungen`): „Mehr zu Websites“ (`web`) · „Mehr zu KI-Chatbots“ (`chat`) · „Mehr zum Telefon-Assistenten“ (`voice`) · „Mehr zur Online-Terminbuchung“ (`termin`) · „Mehr zu Automatisierungen“ (`auto`) · „Mehr zur KI-Beratung“ (`rat`)
- C · Anruf-Karte zum Ausprobieren (`[ANRUFEN:TESTEN]`): „Ruf an und hör ihn selbst“ · „Unser Telefon-Assistent nimmt sofort ab.“ · Knopf „Jetzt anrufen“
- Regel 11 (Folgefragen): nur Fragen, die er selbst beantworten kann, nie zusammen mit `[KONTAKT]`, `[ANRUFEN]`, `[ANRUFEN:TESTEN]` oder `[MITARBEITER]`, keine Fragen nach Preisen, Terminen oder Kontaktdaten. Beispiel: „Wie schnell geht das?“ · „Passt das zu meinem Betrieb?“
- Regel 12 (Leistung): genau ein Marker, wenn er eine bestimmte Leistung erklärt; bei mehreren oder keiner keiner. Beispiel: „Deine Kunden buchen selbst rund um die Uhr, und automatische Erinnerungen sorgen für weniger Ausfälle.“
- Regel 13 (Telefon-Assistent ausprobieren): in einem Satz „Ruf einfach an“, keine Nummer im Text. Beispiel: „Am besten hörst du ihn dir selbst an: Ruf einfach an, unser Telefon-Assistent nimmt sofort ab.“
- Regel 14 („Passt das zu meinem Betrieb?“): freundlich nach der Branche fragen, ohne Kontaktdaten zu verlangen; dann in ein, zwei Sätzen, welche Leistungen oft passen, und für den konkreten Fall ein Mitarbeiter. Beispiel: „Sehr wahrscheinlich, wir arbeiten mit vielen lokalen Betrieben. Was für einen Betrieb hast du denn?“

**Schnellantworten (Stand 23.11.2026, Prompt 18; Quelle `lib/chat-schnellantworten.ts`; Knopf „💬 Schnellantwort“ an der Ticket-Karte, nur das Team wählt, der Kunde sieht den gewählten Satz als Team-Antwort mit dem Namen des Mitarbeiters; im Fenster änderbar)**
1. „Einen Moment, ich schaue kurz nach.“
2. „Danke für deine Geduld!“
3. „Bitte bleib sachlich, sonst müssen wir den Chat beenden.“
4. „Wir melden uns per E-Mail bei dir.“
5. „Am schnellsten klären wir das am Telefon: Ruf uns einfach an.“ (bis 22.11.2026: „Möchtest du, dass wir dich anrufen?“; wir rufen nicht zurück)

(Der Abschluss-Satz „Danke für deine Nachricht – ich beende den Chat jetzt. Schönen Tag noch!“ steht seit Prompt 18 nicht mehr in der Liste, er kommt nur über den Knopf „Abschluss“, siehe unten.)

**Chat-Assistent: Regeln zu Preisen, Terminen und Gesprächen (16.11.2026, `lib/chatbot-knowledge.ts` Regeln 3, 8, 9; Anruf-Karte siehe oben „Kontakt-Knöpfe“)**
- Regel 3 (Preise, nie eine Zahl): Der Preis „wird in einem kurzen Gespräch festgelegt“. Am schnellsten geht das am Telefon, dort nimmt der KI-Telefonassistent ab und macht direkt einen Termin aus; zusätzlich Angebot, mit einem Mitarbeiter zu verbinden. Marker am Ende immer `[KONTAKT] [ANRUFEN] [MITARBEITER]` (vorher nur `[KONTAKT] [MITARBEITER]`).
- Regel 8 ([MITARBEITER]): bei Preisen, Zeitplänen, Interna zusätzlich `[ANRUFEN]` (Regel 3).
- Regel 9, jetzt „Termine und Gespräche: immer anrufen“: gilt auch, wenn jemand mit uns sprechen, telefonieren oder zurückgerufen werden möchte. Neues Beispiel: „Kann ich mal mit jemandem von euch sprechen?“ → „Sehr gern! Gespräche machen wir am liebsten direkt am Telefon aus, dort nimmt unser KI-Telefonassistent ab und findet sofort einen passenden Termin. [ANRUFEN] [MITARBEITER]“
- Die Website zeigt die Anruf-Karte auch, wenn der Assistent den Marker vergisst und die Frage nach Preis, Erstgespräch, Termin oder Gespräch fragt (`angebote()` in `lib/chat-text.ts`).

(Emojis 👋 ✨ stehen heute im Text. Brief: keine Emojis als Symbole – beim Neubau als Gestaltungsfrage behandeln; die Begrüßung ist Inhalt des Chat-Widgets.)

## Terminseite `/termin/<code>` (siezt bereits)
- Tab-Titel: Ihr Terminvorschlag – Agents Gilt
- Kopf: Agents Gilt · KI-Lösungen für lokale Unternehmen
- Etikett: TERMINVORSCHLAG · Überschrift: Guten Tag, <Name> / Guten Tag
- Text: Sie haben am <Zeit> Uhr bei uns angerufen. Dazu haben wir einen Terminvorschlag für Sie:
- Kasten: UNSER VORSCHLAG · <Termin> · Erstgespräch mit Agents Gilt
- Knöpfe: **Passt** · **Anderer Termin** → „Wann passt es Ihnen?“ · Datum · Uhrzeit · **Wunsch senden** · Zurück
- Ergebnisse: „Vielen Dank! Ihr Termin am <t> ist bestätigt. Wir freuen uns auf das Gespräch.“ · „Vielen Dank! Wir haben Ihren Wunsch (<t>) notiert und melden uns per SMS oder Rückruf.“
- Zustände: „Dieser Link ist leider ungültig oder abgelaufen. Rufen Sie uns gern an: +49 6108 9694027“ · „Ihr Termin ist bestätigt. Vielen Dank, wir freuen uns auf das Gespräch.“ · „Vielen Dank, wir haben Ihren Wunsch erhalten und melden uns per SMS oder Rückruf.“ · „Dieser Vorschlag ist nicht mehr aktuell. Rufen Sie uns gern an: …“
- Fehler: „Das hat leider nicht geklappt. Bitte rufen Sie uns an.“ · „Keine Verbindung. Bitte versuchen Sie es nochmal oder rufen Sie uns an.“
- Vertrauen: ✓ Persönlicher Link, nur für Sie. · ✓ Keine Anmeldung, keine Zahlungsdaten.
- Fragen? +49 6108 9694027 · kontakt@agentsgilt.com
- Fuß: Sie sind auf agentsgilt.com, der Website von Agents Gilt. · Impressum · Datenschutz

## Impressum `/impressum` (wortgleich lassen)
← Zurück zur Startseite · **Impressum** · Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz) ·
David Hesse · Agents Gilt (Einzelunternehmen) · Lämmerspieler Straße 100 · 63165 Mühlheim am Main · Deutschland ·
**Kontakt** E-Mail: kontakt@agentsgilt.com · Telefon: +49 6108 9694027 ·
**Umsatzsteuer** Als Kleinunternehmer im Sinne von § 19 UStG wird keine Umsatzsteuer ausgewiesen. ·
**Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV** David Hesse (Anschrift wie oben) ·
**Verbraucherstreitbeilegung** Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. ·
**Haftung für Inhalte** Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.

## Datenschutz `/datenschutz` (wortgleich lassen, Volltext von der laufenden Seite)

← Zurück zur Startseite

### Datenschutzerklärung

**1. Verantwortlicher**

David Hesse · Agents Gilt  
Lämmerspieler Straße 100, 63165 Mühlheim am Main, Deutschland  
E-Mail: kontakt@agentsgilt.com

**2. Hosting (Vercel)**

Diese Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf der Seite verarbeitet Vercel technisch erforderliche Server-Log-Daten (z. B. IP-Adresse, Datum/Uhrzeit, abgerufene Seite, Browsertyp), um die Auslieferung und Sicherheit der Website zu gewährleisten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb). Eine Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln.

**3. Kontaktformular**

Wenn du uns über das Kontaktformular eine Anfrage schickst, verarbeiten wir deine Angaben (Name, E-Mail-Adresse, optional Unternehmen, gewünschte Leistung und deine Nachricht) ausschließlich zur Bearbeitung deiner Anfrage. Der technische Versand der E-Mails erfolgt über unseren Dienstleister Resend (Resend, Inc., USA) als Auftragsverarbeiter. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Anbahnung/Erfüllung eines Vertrags) bzw. lit. f DSGVO. Die Daten werden gelöscht, sobald sie für die Bearbeitung nicht mehr erforderlich sind.

**4. KI-Chat-Assistent**

Auf der Website kannst du freiwillig einen KI-Chat-Assistenten nutzen. Deine eingegebenen Nachrichten werden zur Erzeugung einer Antwort an unseren Dienstleister Anthropic (Anthropic PBC, USA) übermittelt und dort verarbeitet. Bitte gib im Chat keine sensiblen oder besonders schützenswerten personenbezogenen Daten ein. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer schnellen Beantwortung von Anfragen). Eine Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln.

Damit wir erkennen, welche Fragen häufig gestellt werden und wo unsere Antworten nicht weiterhelfen, wird der Gesprächsverlauf beim Verlassen der Seite an uns übermittelt und dort ausgewertet. Dabei werden keine Daten an Dritte weitergegeben, die über die oben genannten Dienstleister hinausgehen. Die Verläufe werden gelöscht, sobald sie für diesen Zweck nicht mehr erforderlich sind.

Möchtest du im Chat mit einem Mitarbeiter sprechen, gibst du dafür freiwillig deinen Namen, eine E-Mail-Adresse oder Telefonnummer und dein Anliegen an. Diese Angaben und der bisherige Chatverlauf werden an unser Team übergeben und dort in einem internen, nur für unser Team sichtbaren Kanal bei Discord Inc. (USA) bearbeitet; zusätzlich erhalten wir eine E-Mail über die Anfrage. Deine Antworten und unsere Rückfragen laufen über diesen Kanal. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Beantwortung deiner Anfrage). Die Daten werden gelöscht, sobald dein Anliegen erledigt ist und keine Aufbewahrungspflichten entgegenstehen. Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln.

**5. Telefonischer KI-Assistent (Voice-Agent)**

Rufst du unsere Telefonnummer an, nimmt zunächst ein KI-gestützter Telefonassistent das Gespräch entgegen. Er weist zu Beginn des Gesprächs darauf hin, dass es sich um eine KI handelt. Du kannst jederzeit verlangen, mit einem Menschen zu sprechen; das Gespräch wird dann weitergeleitet.

Dabei werden verarbeitet: deine Rufnummer, der Zeitpunkt und die Dauer des Anrufs sowie die Inhalte des Gesprächs. Das gesprochene Wort wird zur Verarbeitung in Text umgewandelt, eine Antwort erzeugt und wieder als Sprache ausgegeben. Nennst du uns dabei Angaben wie Namen, Rufnummer oder einen Terminwunsch, verarbeiten wir diese zur Bearbeitung deines Anliegens.

Eingesetzte Dienstleister als Auftragsverarbeiter: Twilio Inc. (USA) für die Telefonie sowie Vapi Labs, Inc. (USA) für den Betrieb des Sprachassistenten; dabei kommen Dienste zur Spracherkennung, Sprachausgabe und Sprachverarbeitung zum Einsatz. Eine Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln.

Das Gespräch wird aufgezeichnet. Darauf weisen wir dich zu Beginn des Telefonats ausdrücklich hin, bevor du dein Anliegen schilderst. Setzt du das Gespräch nach diesem Hinweis fort, verstehen wir das als Einwilligung in die Aufzeichnung (Art. 6 Abs. 1 lit. a DSGVO). Möchtest du das nicht, sag es einfach — dann brechen wir die Aufzeichnung ab und du kannst uns stattdessen per E-Mail erreichen. Eine bereits erteilte Einwilligung kannst du jederzeit für die Zukunft widerrufen; melde dich dazu an kontakt@agentsgilt.com.

Die Aufzeichnung dient dazu, dein Anliegen korrekt zu erfassen und die Qualität unseres Assistenten zu verbessern. Zusätzlich erhalten wir nach dem Gespräch eine Zusammenfassung sowie eine Textfassung per E-Mail, damit wir dein Anliegen bearbeiten und dich zurückrufen können. Aufzeichnungen werden gelöscht, sobald sie für diese Zwecke nicht mehr erforderlich sind.

Vereinbarst du am Telefon einen Termin, schicken wir dir an deine Handynummer eine SMS mit der Bestätigung oder einem anderen Terminvorschlag. Ein Vorschlag enthält einen Link auf agentsgilt.com, über den du ihn annehmen oder einen anderen Termin wünschen kannst. Kann der Termin nicht per SMS geklärt werden (zum Beispiel bei einer Festnetznummer) oder erreichen wir dich nicht, ruft dich unser KI-Telefonassistent unter der Nummer an, die du uns genannt hast, und fragt, ob der Termin passt. Für den SMS-Versand nutzen wir Twilio Inc. (USA) als Auftragsverarbeiter. Damit wir dein Anliegen im Team abstimmen können, legen wir Name, Rückrufnummer, Terminwunsch und eine kurze Zusammenfassung des Gesprächs in einem internen, nur für unser Team sichtbaren Kanal bei Discord Inc. (USA) ab. Auch hier erfolgt die Übermittlung in die USA auf Grundlage der EU-Standardvertragsklauseln.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen auf deine Anfrage hin) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer durchgehenden Erreichbarkeit). Die Daten werden gelöscht, sobald sie für die Bearbeitung nicht mehr erforderlich sind. Bitte teile am Telefon keine sensiblen oder besonders schützenswerten personenbezogenen Daten mit.

**6. WhatsApp-Kontakt**

Wenn du den WhatsApp-Button nutzt, wirst du zu WhatsApp (Meta Platforms Ireland Ltd.) weitergeleitet. Für die Verarbeitung deiner Daten bei WhatsApp gelten die Datenschutzbestimmungen von Meta. Die Nutzung ist freiwillig.

**7. Bezahlung über Stripe**

Kundinnen und Kunden bezahlen unsere Leistungen über einen Zahlungslink von Stripe. Die Bezahlseite, die Eingabe der Zahlungsdaten und die Seite zum Erneuern einer Karte liegen direkt bei Stripe. Vollständige Kartendaten sehen und speichern wir nicht.

Dabei werden verarbeitet: Name oder Firma, Rechnungsadresse, E-Mail-Adresse, Zahlungsart und Zahlungsdaten sowie Betrag, Datum und Status der Zahlungen. Stripe verschickt Belege, Rechnungen und Hinweise zu fehlgeschlagenen Zahlungen oder ablaufenden Karten per E-Mail. Den Zahlungsstatus halten wir in unserer Kundenverwaltung bei Notion Labs, Inc. (USA) fest und melden ihn in einem internen, nur für unser Team sichtbaren Kanal bei Discord Inc. (USA).

Anbieter sind die Stripe-Gesellschaften in Irland (Stripe Technology Company, Limited und Stripe Payments Europe, Limited). Stripe handelt teils als unser Auftragsverarbeiter und teils in eigener Verantwortung, etwa zur Betrugsvermeidung und wegen gesetzlicher Pflichten. Näheres steht in der Datenschutzerklärung von Stripe. Eine Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln.

Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Vertrags) und für Rechnungen Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Aufbewahrungspflichten). Rechnungsdaten bewahren wir so lange auf, wie es das Steuer- und Handelsrecht verlangt.

**8. Verträge über Docusign**

Verträge schicken wir zur elektronischen Unterschrift über Docusign. Dabei werden verarbeitet: Namen und E-Mail-Adressen der Unterschreibenden, die Vertragsdokumente samt eingetragener Firmendaten, die Unterschrift sowie Zeitpunkt, IP-Adresse und Angaben zum Gerät als Nachweis der Unterschrift. Das fertige Dokument bewahren wir bei uns auf.

Anbieter ist Docusign, Inc. (USA) mit ihren europäischen Gesellschaften, als unser Auftragsverarbeiter. Eine Übermittlung in die USA erfolgt auf Grundlage geeigneter Garantien wie der EU-Standardvertragsklauseln. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Abschluss und Erfüllung des Vertrags). Die Daten werden gelöscht, sobald sie nicht mehr erforderlich sind und keine Aufbewahrungspflichten entgegenstehen.

**9. Keine Tracking-Cookies**

Diese Website setzt keine Analyse- oder Marketing-Cookies und nutzt kein Tracking. Es werden nur technisch notwendige Daten für den Betrieb der Seite verarbeitet.

**10. Deine Rechte**

Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu an kontakt@agentsgilt.com. Außerdem hast du ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde.

Hinweis: Diese Datenschutzerklärung deckt den aktuellen Funktionsumfang der Website ab. Bei rechtlicher Unsicherheit empfiehlt sich eine Prüfung durch eine fachkundige Person.

## Feste System- und Fehlermeldungen (Quelle · Auslöser)

Feste Texte, die Besucher sehen können. Davon zu unterscheiden: **dynamische** Texte – Antworten des KI-Assistenten (Anthropic) und Nachrichten von Mitarbeitern im Support-Chat – sind nicht festgelegt und stehen hier nicht.

**Kontaktformular**
- `lib/kontakt-ablauf.ts` ZUSTELL_FEHLER · Mail ans Team ging nicht raus: „Deine Anfrage konnte gerade nicht zugestellt werden. Bitte ruf uns kurz an.“ (seit 14.11.2026 ohne WhatsApp, von David beauftragt)
- `lib/kontakt-ablauf.ts` UNBEKANNTER_FEHLER · Fehlerantwort ohne lesbare Meldung: „Etwas ist schiefgelaufen. Bitte versuch es erneut.“
- `lib/kontakt-ablauf.ts` NETZ_FEHLER · keine Verbindung: „Verbindung fehlgeschlagen. Bitte versuch es später erneut.“
- `app/api/contact/route.ts` · Prüfung/Rate-Limit: „Bitte gib deinen Namen an“, „Bitte gib eine gültige E-Mail an“, „Bitte schreib uns kurz, worum es geht“, „Zu viele Anfragen. Bitte versuch es später noch einmal.“, „Ungültige Anfrage“, „Ungültige Eingaben“

**Chat-Assistent** (`app/api/chat/route.ts`)
- Rate-Limit (30 in 5 Min): „Zu viele Anfragen in kurzer Zeit. Bitte warte einen Moment – oder schreib uns über das Kontaktformular weiter unten.“
- Gespräch zu lang: „Diese Unterhaltung ist ganz schön lang geworden. Lade die Seite neu oder schreib uns direkt über das Kontaktformular weiter unten.“
- Kein API-Schlüssel / nicht verfügbar: „Der Chat ist gerade nicht verfügbar. Schreib uns gern direkt über das Kontaktformular weiter unten.“
- Modell lehnt ab: „Dabei kann ich leider nicht helfen. Schreib uns gern über das Kontaktformular, dann meldet sich unser Team.“
- Fehler beim Streamen: „Der Chat hat gerade ein Problem. Bitte versuch es gleich noch einmal oder schreib uns über das Kontaktformular.“
- Technisch: „Ungültige Anfrage“, „Keine Nachrichten“, „Letzte Nachricht muss vom User sein“; im Widget sonst „HTTP <Code>“, „Keine Antwort vom Server“, „Unbekannter Fehler“

**Support-Chat**
- `app/api/support/route.ts` · Eröffnen (open): kein Bot-Zugang „Der Support-Chat ist gerade nicht verfügbar. Bitte nutze das Kontaktformular.“ · Eröffnungs-Limit „Du hast schon mehrere Anfragen geschickt. Bitte schreib uns kurz über das Kontaktformular.“ · Prüfung „Bitte gib deinen Namen an.“, „Bitte gib eine E-Mail-Adresse oder Telefonnummer an.“, „Bitte beschreib kurz dein Anliegen.“ · Ticket ließ sich nicht anlegen „Das hat leider nicht geklappt. Bitte nutze das Kontaktformular.“ · „Ungültige Anfrage“
- `app/api/support/route.ts` · Senden (send) / Abholen: Token ungültig „Diese Verbindung ist nicht mehr gültig.“ · Sendelimit „Bitte einen Moment warten, bevor du weiterschreibst.“ · „Leere Nachricht“ · beendet „Der Chat wurde beendet.“ · Senden fehlgeschlagen „Das hat leider nicht geklappt. Bitte versuch es gleich nochmal.“
- `components/ChatWidget.tsx`: „Das hat leider nicht geklappt.“ · „Die Nachricht ist nicht angekommen.“
- `app/api/discord/route.ts` · Mitarbeiter übernimmt das Ticket in Discord → im Besucher-Chat: „Du bist jetzt mit einem Mitarbeiter verbunden und kannst direkt schreiben.“

**Support-Chat: „Anruf anbieten“ (neu am 16.11.2026, Wortlaut aus `lib/support-anruf.ts` und `app/api/discord/route.ts`)**
- Knopf an der Ticket-Karte und am Hinweis (Discord, nur fürs Team): „📞 Anruf anbieten“ (neben „Übernehmen“ und „Ticket schließen“)
- Fenstertitel: „Anruf anbieten“ · Feldbeschriftung: „Nachricht an den Kunden (änderbar)“
- Die fünf fertigen Sätze im Feld (Lage → Satz):
  - Preis: „Den genauen Preis legen wir am besten in einem kurzen Gespräch fest, dann passt er genau zu dir. Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen Termin ein.“
  - Erstgespräch: „Sehr gern! Ruf uns für das Erstgespräch einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen passenden Termin ein.“
  - Termin: „Gern! Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und findet mit dir direkt einen passenden Termin.“
  - Sprechen: „Klar, lass uns sprechen! Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen Termin ein, an dem wir uns Zeit für dich nehmen.“
  - Allgemein (sonst): „Am besten besprechen wir das kurz am Telefon. Ruf uns einfach an: Unser Telefon-Assistent nimmt sofort ab und trägt dir direkt einen Termin ein.“
- Ins Ticket geschrieben (Format): „💬 **Name:** Satz“, darunter die graue Zeile: „-# 📞 Darunter sieht der Kunde die Anruf-Karte mit „Jetzt anrufen“.“ (beim Kunden wird sie nicht angezeigt, dort steht die Anruf-Karte)
- Automatischer Hinweis nur fürs Team (die erste Zeile je nach Lage), darunter immer die graue Zeile:
  - „📞 **Der Kunde möchte sprechen.** Anruf anbieten?“
  - „📞 **Der Kunde möchte ein Erstgespräch.** Anruf anbieten?“
  - „📞 **Der Kunde möchte einen Termin.** Anruf anbieten?“
  - „📞 **Der Kunde fragt nach dem Preis.** Anruf anbieten?“
  - Graue Zeile: „-# Nur fürs Team, der Kunde sieht das nicht. Erst nach dem Klick bekommt er eine Nachricht.“
- Notiz am Hinweis nach dem Angebot (ohne Knopf): „📞 Anruf angeboten von <@Name> um HH:MM.“
- Bestätigung nur an den Klickenden (Karte): „Gesendet. Der Kunde sieht die Nachricht gleich im Chat, darunter die Anruf-Karte mit „Jetzt anrufen“.“
- Meldung bei geschlossenem Ticket (beim Klick und beim Abschicken): „Das Ticket ist schon geschlossen. Der Kunde bekommt keine Nachrichten mehr.“
- Leeres Fenster: „Die Nachricht war leer.“

**Chat-Schutz: Meldungen der Schnittstellen (neu am 23.11.2026)**
- `app/api/chat/route.ts` · Sperre (HTTP 429, `gesperrt`, `rest` in Sekunden, `art`, `dauer`): „<Grund> <m:ss>“, also „Zu viele Nachrichten – wieder frei in <m:ss>“, „Gleiche Nachricht zu oft – wieder frei in <m:ss>“, „Bitte nur echte Nachrichten – wieder frei in <m:ss>“ oder „Gesperrt wegen Beleidigung – wieder frei in <m:ss>“
- `app/api/support/route.ts` · Besucher im Ticket gesperrt (HTTP 423): der Satz aus `chat.schutz.team` zur Art der Sperre (Wortlaut oben, z. B. „Zu viele Nachrichten – ein Mitarbeiter gibt den Chat wieder frei.“ oder „Gesperrt wegen Beleidigung.“); beendetes Ticket (HTTP 409): „Der Chat wurde beendet.“
- `app/api/support/route.ts` · Bündel konnte nicht an Discord gehen (auch nach den Wiederholungen, `lib/discord-wiederholen.ts`): „Die Nachricht ist nicht angekommen.“ (im Chat: „nicht angekommen · Nochmal senden“)

**Chat-Schutz: Texte in Discord (nur fürs Team, der Kunde sieht sie nicht; Quelle `lib/support-sperre.ts`, `app/api/discord/route.ts`)**
- Sperr-Karte, Kopfzeile (automatisch aus dem Ticket): „🔒 **Besucher gesperrt** – <Grund>“ (Grund z. B. „12 Nachrichten in 1 Minute“, „3-mal dieselbe Nachricht“, „4 unverständliche Nachrichten in 1 Minute“, „Beleidigungen“) oder „🔒 **Besucher gesperrt** – gesperrt von <Name>“ (Knopf „🔒 Sperren“)
- Sperr-Karte, graue Zeile: „-# Der Kunde kann erst wieder schreiben, wenn ihr entsperrt. Was er bis dahin schickt, kommt hier nicht an.“
- Knöpfe an der Sperr-Karte: „🔓 Entsperren“ · „Chat beenden“
- Nach dem Entsperren, unter der Kopfzeile: „Entsperrt von <Name> um HH:MM“ (Knöpfe weg); Feld „Sperre“ an der Ticket-Karte: „Gesperrt – <Grund>“, „Gesperrt von <Name> um HH:MM“, „Entsperrt von <Name> um <Discord-Zeit>“ (seit Prompt 18b, vorher HH:MM)
- Nach „Chat beenden“: „Chat beendet von <Name> um HH:MM“ (Knöpfe weg); im Ticket „🔒 Ticket geschlossen von <Name>.“
- Beleidigung im Ticket: „⚠️ **Beleidigung** – 🗨️ **Besucher:** <Nachricht>“, darunter „-# Nur fürs Team: <Grund>“ (ohne Grund: „Beleidigung erkannt“)
- Automatischer Hinweis an den Kunden, im Ticket: „💬 Bitte bleib freundlich.“ mit der grauen Zeile „-# Automatischer Hinweis an den Kunden (Chat-Schutz).“
- Auswahl „💬 Schnellantwort“ (nur für den Klickenden): „💬 Welche Schnellantwort? Du kannst den Satz danach noch ändern.“ · Platzhalter „Satz auswählen …“ · Fenstertitel „Schnellantwort“ · Feld „Nachricht an den Kunden (änderbar)“ · Bestätigung „Gesendet. Der Kunde sieht die Antwort gleich im Chat.“
- Klick auf „🔒 Sperren“, wenn schon gesperrt (nur der Klickende): „Der Kunde ist schon gesperrt. Entsperren geht an der Sperr-Karte im Ticket.“

**Chat-Schutz, Runde 2: Texte in Discord (Prompt 18, 23.11.2026; Korrekturen Prompt 18b, 18c und 18d, 24.11.2026; nur fürs Team; Quelle `lib/support-sperre.ts`, `lib/sperr-beleg.ts`, `lib/support-ablauf.ts`, `lib/ticket-handler.ts`, `lib/support.ts`)**
- Feld „Sperre“ an der Ticket-Karte, Sperre aus dem Assistenten-Chat: „Gesperrt bis <Discord-Zeit> – Beleidigung (aus dem Assistenten-Chat)“ (die Gründe: „Zu viele Nachrichten“, „Gleiche Nachricht zu oft“, „Zeichensalat“, „Beleidigung“); abgelaufen: „Sperre abgelaufen um <Discord-Zeit>“; dauerhaft: „Gesperrt – <Grund>, dauerhaft von <Name> um HH:MM“; von Hand: „Gesperrt von <Name> um HH:MM – <Grund>“; nach dem Entsperren seit Prompt 18b mit Discord-Zeitangabe statt Uhrzeit: „Entsperrt von <Name> um <Discord-Zeit>“ (so weiß der Server, ob eine Sperre aus dem Assistenten-Chat erst danach kam; `entsperrtWert` in `lib/support-sperre.ts`). Die Sperr-Karte im Ticket sagt weiter „Entsperrt von <Name> um HH:MM“
- Sperr-Karte aus dem Assistenten-Chat, Kopfzeile: „🔒 **Gesperrt** – Beleidigung (aus dem Assistenten-Chat, frei <in 3 Minuten>)“ · graue Zeile: „-# Läuft die Zeit ab, kann der Kunde wieder schreiben. „Dauerhaft sperren“ hält die Sperre ohne Uhr, bis ihr entsperrt.“ · Knöpfe: „🔓 Entsperren“ · „🔒 Dauerhaft sperren“ · „Chat beenden“
- Nach „Dauerhaft sperren“: „Dauerhaft gesperrt von <Name> um HH:MM“ (Knöpfe: „🔓 Entsperren“, „Chat beenden“) · Zeit abgelaufen: „Sperre abgelaufen um <Discord-Zeit>“ (Knöpfe weg)
- Sperren von Hand, Auswahl (nur für den Klickenden): „🔒 **Warum sperren?** Danach prüft die KI den ganzen Chat des Kunden. Ohne passende Stelle wird nicht gesperrt.“ · Platzhalter „Grund auswählen …“ · Auswahl „Beleidigung“ · „Spam“ · „Drohung“ · „Sonstiges“ (Beschreibung „Kurz beschreiben, was los ist“) · Fenster bei „Sonstiges“: Titel „Sperren: Was ist los?“, Feld „Grund (kurz)“ (Pflicht) · ohne Text: „Bitte kurz beschreiben, was los ist.“
- Während der Prüfung: „🔎 Die KI prüft den Chat auf „<Grund>“ …“ · gesperrt: „Gesperrt. Die Sperr-Karte mit der gefundenen Stelle steht im Ticket.“ · Sperr-Karte mit Beleg: „🔒 **Besucher gesperrt** – <Grund>, gesperrt von <Name>“, darunter das Zitat „> „<Stelle>““ und „-# Erkannt von der KI: <Begründung>“
- Nichts gefunden: „Sperre nicht möglich: kein Grund im Chat gefunden.“ · „-# Stört der Kunde trotzdem und ihr wollt nicht weiterschreiben, beendet „Chat trotzdem beenden“ den Chat ohne Sperre und ohne Abschluss-Satz. Für alles andere: weiter normal antworten.“ · Knopf „Chat trotzdem beenden“ · danach „Chat beendet von <Name> um HH:MM. Das Ticket ist geschlossen.“
- KI antwortet nicht: „Prüfung gerade nicht möglich, versuch es gleich nochmal.“ · unbekannter Grund: „Unbekannter Grund.“
- Erst übernehmen, Knöpfe und Fenster (nur für den Klickenden): „Übernimm zuerst das Ticket.“ · „Das Ticket hat <@…> übernommen.“ · „Du hast das Ticket schon übernommen.“ (`SCHON_UEBERNOMMEN` in `lib/support-ablauf.ts`; seit Prompt 18d auch beim Doppelklick auf „Übernehmen“: ein zweiter Klick derselben Person, wenn sie schon als Übernehmer im Feld „Ablauf“ steht oder der erste Klick noch läuft; der Bot schreibt dann nichts und der Kunde bekommt kein zweites „Du bist jetzt mit einem Mitarbeiter verbunden …“) · „Die Ticket-Karte ist gerade nicht erreichbar. Versuch es gleich nochmal.“ · „Der Kanal ist nicht bekannt.“
- Erst übernehmen, Nachrichten im Kanal (gelöscht, nie an den Kunden; die Warnung ist seit Prompt 18c eine Discord-Antwort auf die fremde Nachricht, ohne deren Text, Wortlaut unverändert; sie geht nach 30 s weg und bleibt stehen, solange die Nachricht, auf die sie antwortet, noch da ist, z. B. wenn dem Bot das Recht zum Löschen fehlt): „<@Name>, übernimm zuerst das Ticket. Deine Nachricht wurde nicht gesendet.“ · „<@Name>, das Ticket hat <@…> übernommen. Deine Nachricht wurde nicht gesendet.“ · Hinweis in der Ticket-Karte (Feld unter dem Verlauf): „Erst übernehmen: Nur wer übernommen hat, schreibt dem Kunden. Andere Nachrichten löscht der Bot. Interne Notizen mit // beginnen.“ (bis 22.11.2026: „Alles, was hier geschrieben wird, sieht der Besucher im Chat. Interne Notizen mit // beginnen.“) · „📧 Per E-Mail antworten“ am Ticket (Prompt 18b): Solange niemand übernommen hat, darf jeder im Team, es gibt keine Meldung; hat jemand übernommen, sagt der Knopf den anderen „Das Ticket hat <@…> übernommen.“ (der alte Satz „Nur wer das Ticket übernommen hat, kann dem Kunden mailen.“ gilt nur noch für Anfragen, `lib/mail-antwort.ts`)
- Feld „Ablauf“ an der Ticket-Karte, Zeilen (Prompt 18b: Übernehmer mit Kennung, dazu zwei neue Zeilen): „Übernommen von <@Kennung> <Discord-Zeit>“ (bis Prompt 18: „Übernommen <Discord-Zeit>“) · „Prüfung ab <Discord-Zeit>“ (neu) · „Zuletzt zugestellt <Discord-Zeit mit Sekunden>“ (neu) · „Freigegeben <Discord-Zeit mit Sekunden> von <@Kennung> (übernommen <Discord-Zeit mit Sekunden>)“ (neu in Prompt 18c; die Klammer fehlt, wenn die Übernahmezeit nicht bekannt ist) · „„Noch Fragen?“ gesendet <Discord-Zeit>“ · „Abschluss gesendet <Discord-Zeit>“ · „Kunde weg seit <Discord-Zeit>“
- Felder „Chat davor“ an der Ticket-Karte (Prompt 18b, bis zu vier): „Chat davor (mit dem Assistenten)“, danach „Chat davor (Fortsetzung)“; Zeilen „Besucher: …“ und „Assistent: …“ (bis Prompt 18: ein Feld „Chat davor (mit dem Assistenten)“ bis 1000 Zeichen)
- Hinweis 1 (nach der KI-Prüfung, nur fürs Team): „✅ **Klingt gelöst.** Noch Fragen stellen? <@Übernehmer>“ · „-# Nur fürs Team. Nach dem Klick bekommt der Kunde: „Hast du sonst noch Fragen?““ · „-# Nimm ihn, wenn du alles beantwortet hast. Fragt der Kunde weiter, schreib einfach normal weiter.“ · Knopf „Noch Fragen?“
- Hinweis 2 (nur nach „Noch Fragen?“): „👋 **Keine Fragen mehr.** Chat abschließen? <@Übernehmer>“ · „-# Nur fürs Team. Nach dem Klick bekommt der Kunde den Abschluss-Satz, danach geht „Ticket schließen“.“ · „-# Nimm ihn, wenn der Kunde nichts mehr wissen will.“ · Knopf „Abschluss“
- Was der Kunde bekommt (als „💬 **Name:** …“): „Hast du sonst noch Fragen?“ · „Danke für deine Nachricht – ich beende den Chat jetzt. Schönen Tag noch!“
- Nach dem Klick: „✅ Nachgefragt von <Name> um HH:MM.“ · „👋 Abschluss gesendet von <Name> um HH:MM. Du kannst das Ticket jetzt schließen.“ · nur der Drückende (Hinweis am Knopf): „Gesendet.“ bzw. „Gesendet. Du kannst das Ticket jetzt schließen.“
- Meldungen nur an den Klickenden: „Frag zuerst, ob noch Fragen offen sind, und schick dann den Abschluss.“ (mit beiden Knöpfen „Noch Fragen?“ und „Abschluss“) · „Schick zuerst „Noch Fragen?“. Danach geht der Abschluss.“ · „Der Abschluss ist schon gesendet. Du kannst das Ticket jetzt schließen.“ · „Schon gesendet.“ (seit Prompt 18b, zweiter Klick auf „Noch Fragen?“ oder „Abschluss“; ersetzt „„Noch Fragen?“ ist eben schon gesendet worden.“ `SCHON_NACHGEFRAGT`, weggefallen) · „Der Kunde antwortet vielleicht noch. Abschluss geht ab <Discord-Zeit>.“ (3 Stunden nach „Noch Fragen?“) · „Der Kunde kommt vielleicht zurück. Schließen geht ab <Discord-Zeit>.“ (3 Stunden nach dem Verlassen des Chats)
- Freigeben und Team-Register (neu in Prompt 18b; `lib/support-ablauf.ts`, `lib/ticket-handler.ts`): Knopf an der übernommenen Karte „Freigeben“ · Status „Freigegeben von <@…> um HH:MM“ (`freigegebenStatus`) · nur an den Klickenden: „Einen Moment …“ (neu in Prompt 18c; wenn der Klick nicht an der Karte selbst war, sofort), danach „Freigegeben. Jetzt kann jemand anderes das Ticket übernehmen.“ (an der Karte selbst antwortet Discord stumm mit „Moment“, ohne Text) · Status, wenn der Bot freigibt: „Frei: <@…> ist nicht mehr aktiv im Team. Wer übernimmt?“ (`freiStatus`) · nur an den Klickenden: „<@…> ist nicht mehr aktiv im Team. Das Ticket ist jetzt frei: Übernimm es zuerst.“ (`nichtMehrAktiv`) · „Du bist im Team-Register nicht als aktiv eingetragen. Übernehmen geht erst danach.“ (`NICHT_IM_TEAM`, beim „Übernehmen“) · Status nach dem Wiederöffnen per Mail: „Wieder offen“ (`WIEDER_OFFEN`)
- Neue Meldungen nur an den Klickenden (Prompt 18b, `lib/ticket-handler.ts`): „Die Nachricht ging nicht hinaus. Bitte gleich nochmal versuchen.“ (Senden von „Noch Fragen?“ oder „Abschluss“ schiefgegangen, Vermerk zurückgenommen) · „Das hat gerade nicht geklappt. Bitte gleich nochmal versuchen.“ (Vermerk an der Karte nicht möglich; seit Prompt 18c auch, wenn „Übernehmen“ oder „Freigeben“ nach dem Nachsehen nicht steht; beim „Übernehmen“ sieht der Klickende stattdessen „Das Ticket hat <@…> übernommen.“, wenn inzwischen ein anderer übernommen hat, und der Kunde bekommt „Du bist jetzt mit einem Mitarbeiter verbunden …“ erst, wenn die Übernahme steht) · „Bitte klick den Knopf gleich nochmal.“ (ein Fenster, das nach „Moment“ nicht mehr aufgehen kann) · „Unbekannter Knopf.“ (statt stiller Antwort ohne Text)
- Ticket schließen: „🔒 Ticket geschlossen von <Name>.“ (unverändert)
- Neue Meldung nur an den Klickenden (Prompt 18d, `KARTE_NICHT_ZU` in `lib/support-ablauf.ts`, gesendet aus `lib/ticket-handler.ts`): „Die Karte ließ sich nicht schließen – drück bitte noch einmal ‚Ticket schließen‘.“ (Schließen der Karte scheiterte; gilt für „Ticket schließen“, „Chat beenden“ an der Sperr-Karte und „Chat trotzdem beenden“; ein zweiter Klick auf „Ticket schließen“ schließt dann nur noch die Karte)
- Klick bei geschlossenem Ticket (Schnellantwort, Sperren, Entsperren, Chat beenden): „Das Ticket ist schon geschlossen. Der Kunde bekommt keine Nachrichten mehr.“

**Chat-Schutz, Website-Chat (Prompt 18b, 24.11.2026; 18c: schlichter; keine neuen Sätze, nur anderes Aussehen; `components/neu/chat/SperrKarte.tsx`, `components/neu/chat/chat.css`)**
- „Bitte bleib freundlich.“ vibriert jetzt dreimal, wenn der Hinweis neu ist (vorher fünfmal rotes Aufleuchten); danach bleibt ein feiner roter Rand.
- Der Grund und die Restzeit stehen in der Sperr-Karte statt in der Sperr-Zeile: „Zu viele Nachrichten – wieder frei in 4:32“ usw. (Texte wie bisher in `lib/inhalt-neu.ts` `chat.schutz`); eine Sperre durch das Team zeigt dieselbe Karte ohne Restzeit. Seit Prompt 18c ist die Karte schlicht (rotes, leicht milchiges Glas, ruhig, etwa 46 px hoch) und der Ring um das Schloss ein roter Kreis ohne Lichtschweif; die Lavalampe aus 18b ist entfernt. Alle Wortlaute unverändert.

**Terminseite** (`app/api/termin/route.ts`, `lib/termin-antwort.ts`)
- `lib/termin.ts` · Eingabeprüfung der Wunschzeit: „Das Datum habe ich nicht verstanden. Bitte so: 28.10. oder 28.10.2026.“ · „Das ist ein Wochenende. Termine gibt es nur werktags.“ · „Die Uhrzeit habe ich nicht verstanden. Bitte so: 10:00.“ · „Dieser Zeitpunkt liegt in der Vergangenheit.“ (weitergereicht über `lib/termin-antwort.ts` → `/api/termin` → `TerminAntwort.tsx`)
- Wunschzeit im Kalender belegt: „Zu dieser Zeit sind wir leider nicht frei. Bitte wählen Sie eine andere Zeit.“
- „Zu viele Versuche. Bitte rufen Sie uns kurz an.“ · „Dieser Link ist ungültig.“ · „Dieser Vorschlag ist nicht mehr aktuell. Bitte rufen Sie uns an.“ · „Das hat leider nicht geklappt. Bitte rufen Sie uns an.“ · „Ungültige Anfrage“

(Server-Meldungen gehören zur Logik und bleiben; nur Widget-Texte dürfen beim Neubau auf „Sie“ umgestellt werden.)

## Texte der neuen Seite (Schritt 3)

Die gesiezten Texte der neuen Welt stehen in `lib/inhalt-neu.ts` (Kopfbereich, „Was wir machen“, Leistungen mit den drei erweiterten Beschreibungen, Ablauf, Warum wir, Ausbildung, Kontakt, Formular, Fußleiste). Aussagen und Fakten sind unverändert übernommen; neu formuliert sind nur Anrede und die Überschrift im Kopfbereich: „Es klingelt. Ihr Assistent nimmt ab.“ Die sechs Leistungstitel kommen wörtlich aus `lib/content.ts`.

Noch in der alten Form (du, mit Emojis), weil erst in einem späteren Schritt umgestellt: Texte im Chat-Fenster (`components/ChatWidget.tsx`).

**Korrektur Kopfbereich (12.11.2026):** Der Kopfbereich trägt keinen Text mehr (nur den Namen als Schriftzug und die Kopfleiste). Der Hinweis „Klicken Sie irgendwo“ ist entfallen. Überschrift „Es klingelt. Ihr Assistent nimmt ab.“, Unterzeile und Anruf-Leiste stehen unverändert, vorerst direkt unter dem Kopfbereich.

**Schritt 4 (Kopfbilder):** Die Kopfbereiche nutzen dieselben Texte aus `lib/inhalt-neu.ts` (Überschrift „Es klingelt. Ihr Assistent nimmt ab.“, Unterzeile, Anruf-Leiste, „Leistungen ansehen“). Neu sind nur die Namen und je ein Satz der vier Varianten auf der Übersicht (`components/neu/kopf/kopfbilder.ts`) und deren Überschrift „Vier Kopfbilder, ein Aufbau.“
- Chat-Knopf der neuen Welt (`lib/inhalt-neu.ts`, `chat`): Sprechblase „Bei Fragen helfe ich dir gerne weiter“ (derselbe Satz wie beim bisherigen Chat-Knopf, ohne das Sternchen-Symbol; der Chat duzt), Knopf-Name für Vorleseprogramme „Chat mit Agents Gilt öffnen“, Schließen-Kreuz „Hinweis schließen“.

**Neue Seite (12.11.2026, `lib/inhalt-neu.ts`):** Fakten und Aussagen sind unverändert; neu sind nur Anordnung und einige kurze Beschriftungen.
- **Erste Aussage (Hauptüberschrift, Stand 15.11.2026, Davids Entscheidung):** „Wir bauen in Tagen, wofür Agenturen Monate brauchen.“ Die Überschrift tippt sich Buchstabe für Buchstabe, zuerst mit „Wochen“, und wechselt dann zu „Tagen“ (golden). **Darunter der Wettlauf** (zwei Balken, keine Zahlen): „Agentur“ – „Monate“ und „Agents Gilt“ – „Tage“; für Vorleseprogramme: „Vergleich: Eine Agentur braucht Monate, Agents Gilt Tage.“ Sternchen und Fußnote gibt es nicht mehr (bis 14.11.2026: „Wir bauen in Stunden*, wofür Agenturen Wochen brauchen.“ mit der Fußnote „* Gilt nur bei sehr einfachen Projekten und ist kein Versprechen.“). Alle Zeitangaben lauten einheitlich „Tage statt Wochen oder Monate“ („12 Stunden gespart“ in der Szene der Automatisierungen ist keine Bauzeit und bleibt). **Statt des Absatzes drei Glaskarten** (Davids Vorgabe vom 14.11.2026; derselbe Inhalt wie der frühere Absatz „Mit modernster KI entwickeln wir …“, in drei Aussagen, Sie-Form): (1) **Maßgeschneidert mit KI:** „Wir entwickeln digitale Lösungen, die genau zu Ihrem Betrieb passen: mit modernster KI statt Baukasten von der Stange.“ (2) **Schnell und bezahlbar:** „Erste Ergebnisse in Tagen statt Monaten, zu festen und fairen Preisen für kleine und mittlere Unternehmen.“ (3) **Technik wie bei den Großen:** „Sie bekommen Technik auf dem neuesten Stand, die sonst großen Firmen vorbehalten ist.“ Der frühere Absatz steht auf der neuen Seite nicht mehr als Fließtext (er bleibt in `wasWirMachen.text`; die älteren Varianten gibt es seit 15.11.2026 nicht mehr). Die Zeile „KI-Telefonassistent, Website und Chatbot für lokale Betriebe in Rhein-Main.“ und die Anruf-Leiste stehen hier nicht mehr. Die frühere Überschrift „Es klingelt. Ihr Assistent nimmt ab.“ steht auf der neuen Seite als Zeile in der Szene der Karte „Voice-Agenten“.
- **Sechs Wörter** (Wörter-Feld und laufendes Band; bis 12.11.2026 vier): Persönlich · Schnell · Feste Preise · Aus Rhein-Main · Modern · Rund um die Uhr.
- **Szenen der Leistungskarten** (`szenen`): „Es klingelt – Ihr Assistent nimmt ab“, „Termin eingetragen“ · „Haben Sie morgen noch einen Termin frei?“ / „Ja, um 10:30 Uhr. Soll ich ihn eintragen?“ · „Mai“, „10:30“, „Gebucht“ · „Anfrage“, „Angebot“, „Rechnung“, „12 Stunden gespart“ · „ihr-betrieb.de“, „Anfragen +38 %“ · die drei Punkte der KI-Beratung. **Die Zahlen sind Beispiele und tragen das Schild „Beispiel“.**
- **Warum wir (Stand 13.11.2026):** Überschrift unverändert; darunter nur noch der kurze Satz „Technik wie bei den Großen – persönlich betreut.“ (der lange Absatz steht jetzt unter der ersten Aussage). **„Unser Versprechen“:** Persönlich („Ein direkter Ansprechpartner statt Hotline-Warteschleife.“), Schnell („Erste Ergebnisse in Tagen, nicht Monaten.“), Feste Preise („Fairer Setup-Preis plus transparente monatliche Betreuung.“, bisher unter „Planbar“). Der Punkt „Modern“ steht nicht mehr einzeln da; seine Aussage steckt im Absatz darüber.
- **Mauszeiger:** „Ansehen“ (nur über den Zertifikaten).
- **Kontakt (Stand 14.11.2026, vierte Runde; `kontakt` in `lib/inhalt-neu.ts`):** Überschrift unverändert („Sprechen wir über Ihr Projekt.“). **Hauptsatz:** „Rufen Sie uns an: Unser KI-Assistent nimmt sofort ab und macht direkt einen Termin mit Ihnen aus.“ („Rufen Sie uns an:“ steht in Gold.) **Anruf-Karte:** „KI-Assistent bereit“ (mit grünem Punkt) · +49 6108 9694027 · Knopf „Jetzt anrufen“. **Klein darunter:** „Kurze Frage? Unser KI-Chat unten rechts antwortet sofort.“ **Am kleinsten, in der Glaskarte des Formulars:** „Lieber schreiben?“ · „Meist antworten wir innerhalb eines Werktages.“ (belegte Aussage, bisher im Fließtext). Der Knopf „Per WhatsApp schreiben“ ist **ausgeschaltet** (Schalter `site.whatsappAnzeigen` in `lib/content.ts`, Standard `false`); Text und Verweis bleiben im Code.
- **Formular der neuen Seite, fehlende Pflichtfelder** (`kontakt.formular.fehlt`; nur Anzeige im Browser, die Meldungen des Servers bleiben, wie sie sind): „Bitte tragen Sie Ihren Namen ein.“ · „Bitte tragen Sie Ihre E-Mail-Adresse ein.“ · „Bitte prüfen Sie die E-Mail-Adresse.“ (ausgefüllt, aber ungültig) · „Bitte schreiben Sie kurz, worum es geht.“
- **Chat-Fenster der neuen Seite (14.11.2026, `chat.fenster` in `lib/inhalt-neu.ts`; der Chat duzt weiter):** Kopf „Agents Gilt“ · „KI-Assistent · online“ bzw. „Team · verbunden“. Platzhalter im Eingabefeld, wechselnd: „Was kostet eine Website?“ · „Wie schnell seid ihr?“ · „Was macht ein Telefon-Assistent?“; im Team-Chat „Schreib dem Team …“. Unter dem Feld: „Agents Gilt ist eine KI“ und der Knopf **„Mit einem Mitarbeiter sprechen“**; im Team-Chat „Du schreibst mit unserem Team · Antworten erscheinen hier im Chat“. Chip **„Jetzt anrufen“** mit der Nummer; „Anfrage schicken“; „Am Telefon nimmt unser KI-Assistent ab und macht direkt einen Termin aus.“ **Ticket-Karte:** „Du schreibst gleich mit einem echten Mitarbeiter aus unserem Team. Er antwortet hier im Chat.“ · „Falls du die Seite verlässt, melden wir uns über den Kontakt, den du angibst.“ · Felder „Dein Name“, „E-Mail oder Telefonnummer“, „Worum geht es?“ · Datenschutz-Satz wie bisher · „Verbinden“ / „Wird übergeben …“ / „Abbrechen“. Fehlende Pflichtfelder: „Bitte trag deinen Namen ein.“ · „Bitte gib eine E-Mail-Adresse oder Telefonnummer an.“ · „Bitte schreib kurz, worum es geht.“ Unverändert aus der Logik: Begrüßung („Hey! Ich bin der KI-Assistent von Agents Gilt. …“; seit 15.11.2026 ohne Emoji, der Chat schreibt überhaupt ohne Emojis), die drei Vorschläge (seit 23.11.2026 „Was macht ihr genau?“ · „Passt das zu meinem Betrieb?“ · „Wie schnell geht das?“; vorher „Wie läuft die Zusammenarbeit ab?“ · „Was braucht ihr von mir?“) und die Hinweise nach Übergabe und Ende des Team-Chats.
- **Wissen des Assistenten (14.11.2026, `lib/chatbot-knowledge.ts`, von David beauftragt):** Termine: Der Assistent verweist immer aufs Anrufen und schreibt die Nummer +49 6108 9694027 aus (neue Regel 9). Kann er eine Frage nicht klären, bietet er den Mitarbeiter-Chat an (Regeln 3 und 4; „Alternativ kannst du eine Anfrage schicken oder anrufen“ ist aus den Beispielen heraus; die Marker bleiben). **WhatsApp ist aus den Kontaktwegen heraus;** fragt jemand ausdrücklich danach, sagt der Assistent, dass das Team es gern gibt, und bietet den Mitarbeiter-Chat an (neue Regel 10). Das gilt für den Chat auf allen Seiten, auch auf der alten Startseite. Wissen, Ton und die übrigen Regeln sind unverändert. **Nicht angefasst:** das Wissen des Telefon-Assistenten (`voice-agent-prompt.md`).
- **Chat-Fenster, sechste Runde (14.11.2026, von David beauftragt; `chat.fenster` in `lib/inhalt-neu.ts`):** „Mit einem Mitarbeiter sprechen“ heißt überall **„Mit einem Mitarbeiter schreiben“**. Neu: die kleine Zeile „Für weitere Fragen verbinden wir Sie gern mit einem Mitarbeiter.“ (Davids Wortlaut; der Chat duzt sonst), für Vorleseprogramme „Der Assistent denkt nach“ und „Dein Chat wird zusammengefasst“, das Nachrichtenfeld heißt für Vorleseprogramme „Nachricht“ (Platzhalter weiter „Worum geht es?“). Die Anruf-Karte im Chat nutzt die Texte der Kontakt-Karte („KI-Assistent bereit“, Nummer, „Jetzt anrufen“). Entfallen im neuen Fenster: „Anfrage schicken“, „Am Telefon nimmt unser KI-Assistent ab und macht direkt einen Termin aus.“, „Der Assistent schreibt gerade“. Vier neue Beispielfragen im Eingabefeld: „Kann der Chatbot auch Termine annehmen?“ · „Wie läuft so ein Projekt ab?“ · „Funktioniert das auch für kleine Betriebe?“ · „Was macht der Telefon-Assistent genau?“
- **Wissen des Assistenten, sechste Runde (14.11.2026, von David beauftragt):** Regel 9 (Termine): ein kurzer Satz wie „Termine machen wir am liebsten direkt am Telefon aus, dort nimmt unser KI-Telefonassistent ab und findet sofort einen passenden Termin.“ und der Marker `[ANRUFEN]`, **keine Telefonnummer im Text**; dazu darf „Für weitere Fragen verbinde ich dich gern mit einem Mitarbeiter.“ mit `[MITARBEITER]` stehen. Regel 8 (tiefergehende Fragen: Preise, „Was passt für mich?“, konkretes Projekt, Sonderwünsche, Vergleiche, Beschwerden, Wunsch nach einem Menschen): erst kurz antworten, soweit erlaubt (ohne Preise), dann ein Satz wie „Für so etwas verbinde ich dich am besten mit einem Mitarbeiter, der kann dir genau sagen, was für dich passt.“ und `[MITARBEITER]`. Die Zusammenfassung fürs Formular schreibt ein Modell nach `ZUSAMMENFASSUNG_SYSTEM` in `lib/chat-zusammenfassung.ts` (2 bis 3 Sätze, Ich-Form des Besuchers, nichts erfinden, keine Namen oder Kontaktdaten).
- **Siebte Runde (14.11.2026, von David beauftragt):** **Chat-Fenster:** Die Zeile zwischen Anruf-Karte und Mitarbeiter-Knopf heißt jetzt „Lieber vorher noch ein paar Fragen klären? Dann verbinden wir dich gern mit einem Mitarbeiter.“ (ersetzt „Für weitere Fragen verbinden wir Sie gern mit einem Mitarbeiter.“); sie steht immer unter der Anruf-Karte. Der Chat duzt damit überall. **Kontakt (`kontakt.chatHinweis`, `kontakt.chatKnopf`):** „Kurze Frage? Unser KI-Chat antwortet sofort, rund um die Uhr.“ (ersetzt „Kurze Frage? Unser KI-Chat unten rechts antwortet sofort.“) und der Knopf „Jetzt chatten“. „Rund um die Uhr“ ist belegt (der Chat-Assistent antwortet automatisch, wie in den Leistungen beschrieben). **Impressum und Datenschutz:** Wortlaut unverändert (jetzt in `components/neu/recht/Rechtstexte.tsx`); neu ist nur der Verweis „Zurück“ über der Überschrift (bisher „← Zurück zur Startseite“ auf den alten Seiten). Der Titel des Tabs über dem Blatt: „Impressum – Agents Gilt“ bzw. „Datenschutz – Agents Gilt“ (wie auf den eigenen Seiten).
- **Kundenstimmen (AUS):** Überschrift „Was unsere Kunden sagen.“ und drei Platzhalter in `lib/content.ts` (`testimonials`); sie erscheinen nicht, solange `aktiv` auf `false` steht.

## Platzhalter / fehlt noch (nie als echt ausgeben)
- Kundenstimmen: **keine vorhanden**. Der Abschnitt ist seit 12.11.2026 fertig gebaut, aber **ausgeschaltet** (`testimonials.aktiv = false` in `lib/content.ts`); die Platzhalter dort nie einschalten, erst echte, freigegebene Stimmen eintragen.
- Kennzahlen (Anzahl Kunden, gesparte Stunden, …): **keine belegt** → keine Zahlen erfinden. Die Zahlen in den Szenen der Leistungskarten („+38 %“, „12 Stunden gespart“) sind von David gewünschte Beispiele und als „Beispiel“ beschriftet.
- Fotos von Team/Kunden/Projekten: **keine vorhanden** (nur Logo und Zertifikate) → selbst gezeichnete Grafiken oder frei lizenzierte Web-Bilder mit Quellenangabe (entschieden 11.11.2026); nichts, das Kunden, Projekte oder Team vortäuscht.
- Live-Demo „Nummer eingeben, Assistent ruft an“: **keine Funktion vorhanden** – bräuchte neue Logik; im Neubau höchstens als Anrufen-Knopf auf die echte Nummer.

## Offene Entscheidungen für David
1. Datenschutzerklärung duzt, neue Seite siezt – Datenschutz wortgleich lassen (Vorschlag) oder rechtlich geprüft auf „Sie“ umstellen?
2. Chat-Begrüßung duzt und hat Emojis – auf „Sie“ ohne Emoji umstellen? (Text im Widget, keine Logik; das Wissen des Assistenten in `lib/chatbot-knowledge.ts` müsste dann ebenfalls siezen.)
