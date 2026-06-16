# Agents Gilt – Projekt-Website

Moderne, animierte Marketing-Website der KI-Agentur **Agents Gilt** (Domain: agents-gilt.agency).
Apple-artiger Look: viel Weißraum, große Typografie, sanfte Scroll-Animationen, Gold-Akzente aus dem Logo.

## Tech-Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (Konfiguration in `app/globals.css` über `@theme`, KEINE `tailwind.config.js`)
- **Framer Motion** (Scroll-Animationen, Hover-Effekte)
- **Resend** (Mailversand des Kontaktformulars)
- **Zod** (Validierung der Formular-Eingaben)
- Deployment: **Vercel** → Domain agents-gilt.agency

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
  layout.tsx          Root-Layout, Schriften (Inter + Sora), Metadaten
  page.tsx            Startseite (komponiert alle Sektionen)
  globals.css         Tailwind-Theme: Marken-Farben & Schriften
  icon.png            Favicon (Gold-Diamant aus dem Logo)
  impressum/page.tsx  Impressum (PLATZHALTER – vor Live-Gang ausfüllen!)
  datenschutz/page.tsx Datenschutz (PLATZHALTER)
  api/contact/route.ts Kontaktformular-Endpoint (POST → 2 Mails via Resend)
components/
  Header.tsx          Fixierte Navigation (transparent → solid beim Scrollen)
  Hero.tsx            Startbereich mit animiertem Diamant
  DiamondBackground.tsx  Gold-Diamant mit Parallax/Schwebe-Animation (Client)
  Reveal.tsx          Wiederverwendbare Scroll-Einblendung (Client)
  Services.tsx        6 Leistungs-Karten (Client, Hover-Animation)
  Process.tsx         3-Schritte-Ablauf (dunkle Sektion)
  WhyUs.tsx           4 Vorteile
  Contact.tsx         Kontaktformular (Client)
  Footer.tsx          Footer mit Links zu Impressum/Datenschutz
lib/
  content.ts          ALLE Texte zentral – hier Inhalte ändern, nicht im Code
  mail.ts             Resend-Wrapper (degradet sauber ohne API-Key)
public/
  logo-full.png       Wortmarke (dunkler Text + Diamant)
  logo-mark.png       Nur der Gold-Diamant
```

## Konventionen

- **Texte ändern** → in `lib/content.ts`, nicht in den Komponenten.
- **Farben** → in `app/globals.css` im `@theme`-Block (gold / ink / cream / line).
- Komponenten mit Animationen oder State brauchen `"use client"` ganz oben.
- Server-Komponenten dürfen Client-Komponenten importieren (nicht umgekehrt).

## Do's & Don'ts

- ✅ Keys nur in `.env.local` (steht in `.gitignore`), niemals committen.
- ✅ Vor dem Deploy `npm run build` laufen lassen.
- ⚠️ **Impressum & Datenschutz sind Platzhalter** – echte Daten vor dem Live-Gang
  einsetzen und rechtlich prüfen lassen.
