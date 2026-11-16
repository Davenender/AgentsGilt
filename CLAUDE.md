# Agents Gilt – Projekt-Website

Moderne, animierte Marketing-Website der KI-Agentur **Agents Gilt** (Domain: agentsgilt.com).
Apple-artiger Look: viel Weißraum, große Typografie, sanfte Scroll-Animationen, Gold-Akzente aus dem Logo.

## Tech-Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (Konfiguration in `app/globals.css` über `@theme`, KEINE `tailwind.config.js`)
- **GSAP** (Scroll-Animationen, Schreibmaschinen-Effekt)
- **Resend** (Mailversand des Kontaktformulars)
- **Zod** (Validierung der Formular-Eingaben)
- Deployment: **Vercel** → Domain agentsgilt.com (Push auf main deployt automatisch)
- Dazu: Discord-Bot, Vapi (Telefon-Assistent), Twilio (SMS, Rufgruppe), Notion, Google Kalender, Gmail-Brücke, ntfy. Alle Einstellungen: `.env.example`

> Hinweis: Dieses Next.js (16) kann von älterem Wissen abweichen. Im Zweifel die
> Docs in `node_modules/next/dist/docs/` lesen, bevor Code geschrieben wird.

## Befehle

```bash
npm install     # einmalig / nach Änderungen an package.json
npm run dev      # lokaler Server → http://localhost:3000
npm run build    # Produktions-Build (fängt Fehler vor dem Deploy)
npm run lint     # ESLint
```

## Ordnerstruktur

```
app/
  layout.tsx          Root-Layout, Metadaten, JSON-LD, Statistik, Chat für alle Seiten
  page.tsx            Startseite (die neue Seite, seit 15.11.2026; vorher /varianten/kopf/kern)
  globals.css         Tailwind-Theme und Grundwerte (body im Stammlayout, Seite „nicht gefunden“)
  icon.png            Favicon (Gold-Diamant aus dem Logo)
  impressum/page.tsx  Impressum (neues Design, Wortlaut in components/neu/recht/Rechtstexte.tsx)
  datenschutz/page.tsx Datenschutz (neues Design, ebenso)
  termin/[code], t/[code]  Terminseite aus der SMS (neues Design: components/neu/termin)
  api/…               Schnittstellen (Kontakt, Chat, Support, Termine, Discord, …)
components/
  neu/                Die neue Welt: Welt.tsx + welt.css (Hülle), Rahmen.tsx (Kopf-/Fußleiste),
                      kopf/ (Licht, Name aus Zeichen, Startanimation), seite/ (Abschnitte der
                      Startseite), chat/ (Kugel und Glasfenster, ChatUeberall.tsx), recht/,
                      termin/ (Glaskarte der Terminseite)
  chat/               Die Chat-Logik (useChat.ts, ChatAnbieter.tsx), einmal für alle Seiten
  TerminAntwort.tsx   Antwort-Formular der Terminseite
lib/
  inhalt-neu.ts       ALLE Texte der Startseite – hier Inhalte ändern, nicht im Code
  content.ts          Kontaktdaten, Leistungstitel (Schnittstellenwerte), Zertifikate
  neue-seite.ts       Adresse der neuen Seite ("/")
  mail.ts             Resend-Wrapper (degradet sauber ohne API-Key)
public/
  logo-full.png       Wortmarke (dunkler Text + Diamant)
  logo-mark.png       Nur der Gold-Diamant
```

Die früheren Arbeitsstände unter `/varianten` gibt es nicht mehr; ihre Adressen leiten
dauerhaft auf `/` weiter (`next.config.ts`). Funktionsliste: `docs/funktionen.md`.

## Konventionen

- **Texte ändern** → in `lib/inhalt-neu.ts` (Startseite) bzw. `lib/content.ts`, nicht in den Komponenten.
- **Farben** → neue Welt in `components/neu/welt.css` (Variablen an `.ag-neu`); `app/globals.css` (`@theme`) nur noch für die Grundwerte im Stammlayout (z. B. Seite „nicht gefunden“).
- Komponenten mit Animationen oder State brauchen `"use client"` ganz oben.
- Server-Komponenten dürfen Client-Komponenten importieren (nicht umgekehrt).

## Do's & Don'ts

- ✅ Keys nur in `.env.local` (steht in `.gitignore`), niemals committen.
- ✅ Vor dem Deploy `npm run build` laufen lassen.
- ⚠️ Impressum & Datenschutz bleiben wortgleich (Text in `components/neu/recht/Rechtstexte.tsx`).
