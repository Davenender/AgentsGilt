# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Inhaber kleiner und mittlerer lokaler Betriebe (Rhein-Main: Mühlheim am Main, Offenbach, Frankfurt, Hanau), Alter etwa 19–60. Sie verpassen Anrufe, haben wenig Zeit und sind eher nicht technikaffin. Sie wollen in Sekunden verstehen, was es ihnen bringt, und erwarten trotzdem eine moderne, beeindruckende Website als Zeichen, dass die Agentur ihr Handwerk kann.

## Product Purpose

Agents Gilt (agentsgilt.com) baut für lokale Betriebe Websites, KI-Chatbots, Voice-Agenten (KI-Telefonassistent), Online-Terminbuchung, Automatisierungen und KI-Beratung. Die Landingpage soll Besucher zum Anruf bewegen. Erfolg = Anruf auf +49 6108 9694027; zweitens eine Frage im Chat; drittens (dezent) eine Anfrage über das Formular.

## Positioning

Die Agentur verkauft, was sie selbst benutzt: Wer anruft, spricht sofort mit dem eigenen KI-Telefonassistenten, der Termine ausmacht; der Chat unten rechts ist der eigene KI-Chatbot mit Übergabe an einen Menschen. Die Seite ist damit gleichzeitig die Vorführung. Persönlich umgesetzt von einem kleinen Team aus der Region statt Hotline.

## Operating Context

- Termine laufen immer über den Anruf (KI-Assistent bucht, SMS mit Link auf `/termin/<code>`).
- Chat-Assistent auf allen Seiten unten rechts (Anthropic), Übergabe an das Team über Discord.
- Kontaktformular schickt Mails über Resend und meldet nach Discord.
- Vollständige Funktionsliste: `docs/funktionen.md`. Alle Texte: `docs/texte.md`.

## Capabilities and Constraints

- Next.js 16 (App Router), React 19, Tailwind v4 (`@theme` in `app/globals.css`), GSAP. Deployment Vercel; Push auf main deployt.
- Logik, Schnittstellen (`app/api`), Formular-Ziele, Chat-Anbindung, Terminseiten, Weiterleitung `/t/…`, Vercel-Statistik, Umgebungsvariablen und Metadaten bleiben unverändert; nur die Darstellung darf sich ändern.
- Anker `#top`, `#leistungen`, `#ablauf`, `#warum`, `#ausbildung`, `#kontakt` werden von Code benutzt.
- Keine bezahlten Werkzeuge: keine Bild- oder Video-Erzeugung.
- Live-Demo „Nummer eingeben, Assistent ruft an“ existiert nicht; entschieden (11.11.2026): stattdessen ein Probeanruf-Bereich mit der echten Nummer, keine neue Logik.
- Leistungsumfang erweitert (entschieden 11.11.2026), die sechs Leistungsnamen bleiben wörtlich gleich: Automatisierungen umfassen auch CRM einrichten und interne Werkzeuge; KI-Chatbots umfassen auch eine Wissens-KI, die die eigenen Unterlagen eines Betriebs kennt; KI-Beratung & Audit umfasst auch individuelle KI-Systeme wie ein Kundenportal. Keine Preise und keine eigenen Software-Produkte nennen.

## Brand Commitments

- Name „Agents Gilt“, Logo: Wortmarke `public/logo-full.png`, Gold-Diamant `public/logo-mark.png`; Gold aus dem Logo ist die Akzentfarbe.
- Sprache Deutsch, Anrede „Sie“, Ton ausgewogen und freundlich. Entschieden (11.11.2026): Werbetexte und Chat-Oberfläche siezen, Chat ohne Emojis; Impressum und Datenschutz bleiben wortgleich (Datenschutz duzt weiterhin).
- Texte dürfen gekürzt und verbessert werden; Aussagen, Preise, Fakten und rechtliche Texte bleiben.

## Evidence on Hand

- Echte Texte in `lib/content.ts` (siehe `docs/texte.md`).
- Vier Anthropic-Zertifikate je für David Hesse und Mijo Schulz (`public/certificates/`).
- Kontakt: +49 6108 9694027, kontakt@agentsgilt.com, WhatsApp, Lämmerspieler Straße 100, 63165 Mühlheim am Main.
- **Nicht vorhanden, nie erfinden:** Kundenstimmen, Kundenlogos, Kennzahlen, Projekt- oder Teamfotos, Preise in Zahlen.
- Kundenstimmen: Bereich ganz weglassen, auch kein Platzhalter (entschieden 11.11.2026).
- Bilder: selbst gezeichnete Grafiken oder frei lizenzierte Web-Bilder mit Quellenangabe; keine Bild-/Video-Erzeugung; nichts, das Kunden, Projekte oder Team vortäuscht (entschieden 11.11.2026).

## Product Principles

1. Anrufen ist immer einen Daumen weit entfernt.
2. In fünf Sekunden klar: Sie verpassen keine Anrufe mehr.
3. Die Seite beweist das Können, ohne den Besucher zu überfordern; am Handy leichter.
4. Nur Belegtes behaupten.

## Accessibility & Inclusion

Ältere, nicht technikaffine Besucher: gut lesbare Schriftgrößen, große Tippflächen, klare Knöpfe, Bewegung respektiert `prefers-reduced-motion`, kein Scroll-Zwang.
