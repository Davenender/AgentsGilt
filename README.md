# Agents Gilt – Website

Die offizielle Website der KI-Agentur **Agents Gilt** – moderne, animierte
One-Page-Seite mit Leistungen, Ablauf und Kontaktformular.

## Lokal starten

```bash
npm install
npm run dev
```

Dann im Browser öffnen: <http://localhost:3000>

## Mailversand (optional)

Das Kontaktformular verschickt Mails über [Resend](https://resend.com).
Dazu in `.env.local` den `RESEND_API_KEY` eintragen. Ohne Key läuft die Seite
trotzdem – es werden dann nur keine Mails versendet (Hinweis im Terminal).

## Deployment

Push zu GitHub → in [Vercel](https://vercel.com) importieren → Domain
agents-gilt.agency verbinden. In Vercel die gleichen Umgebungs-Variablen
(`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO`) hinterlegen.

Details siehe [CLAUDE.md](./CLAUDE.md).
