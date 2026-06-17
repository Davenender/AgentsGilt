import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutz – Agents Gilt",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-28">
      <Link href="/" className="text-sm font-medium text-gold-dark hover:underline">
        ← Zurück zur Startseite
      </Link>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-ink">
        Datenschutzerklärung
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            1. Verantwortlicher
          </h2>
          <p className="mt-3">
            David Hesse · Agents Gilt
            <br />
            Lämmerspieler Straße 100, 63165 Mühlheim am Main, Deutschland
            <br />
            E-Mail: kontakt@agents-gilt.agency
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            2. Hosting (Vercel)
          </h2>
          <p className="mt-3">
            Diese Website wird bei Vercel Inc. (USA) gehostet. Beim Aufruf der Seite
            verarbeitet Vercel technisch erforderliche Server-Log-Daten (z.&nbsp;B.
            IP-Adresse, Datum/Uhrzeit, abgerufene Seite, Browsertyp), um die
            Auslieferung und Sicherheit der Website zu gewährleisten.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
            am sicheren Betrieb). Eine Übermittlung in die USA erfolgt auf Grundlage
            der EU-Standardvertragsklauseln.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            3. Kontaktformular
          </h2>
          <p className="mt-3">
            Wenn du uns über das Kontaktformular eine Anfrage schickst, verarbeiten
            wir deine Angaben (Name, E-Mail-Adresse, optional Unternehmen,
            gewünschte Leistung und deine Nachricht) ausschließlich zur Bearbeitung
            deiner Anfrage. Der technische Versand der E-Mails erfolgt über unseren
            Dienstleister Resend (Resend, Inc., USA) als Auftragsverarbeiter.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Anbahnung/Erfüllung
            eines Vertrags) bzw. lit. f DSGVO. Die Daten werden gelöscht, sobald sie
            für die Bearbeitung nicht mehr erforderlich sind.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            4. KI-Chat-Assistent
          </h2>
          <p className="mt-3">
            Auf der Website kannst du freiwillig einen KI-Chat-Assistenten nutzen.
            Deine eingegebenen Nachrichten werden zur Erzeugung einer Antwort an
            unseren Dienstleister Anthropic (Anthropic PBC, USA) übermittelt und
            dort verarbeitet. Bitte gib im Chat keine sensiblen oder besonders
            schützenswerten personenbezogenen Daten ein. Rechtsgrundlage ist
            Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer schnellen
            Beantwortung von Anfragen). Eine Übermittlung in die USA erfolgt auf
            Grundlage der EU-Standardvertragsklauseln.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            5. WhatsApp-Kontakt
          </h2>
          <p className="mt-3">
            Wenn du den WhatsApp-Button nutzt, wirst du zu WhatsApp (Meta Platforms
            Ireland Ltd.) weitergeleitet. Für die Verarbeitung deiner Daten bei
            WhatsApp gelten die Datenschutzbestimmungen von Meta. Die Nutzung ist
            freiwillig.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            6. Keine Tracking-Cookies
          </h2>
          <p className="mt-3">
            Diese Website setzt keine Analyse- oder Marketing-Cookies und nutzt kein
            Tracking. Es werden nur technisch notwendige Daten für den Betrieb der
            Seite verarbeitet.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            7. Deine Rechte
          </h2>
          <p className="mt-3">
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
            der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu
            an kontakt@agents-gilt.agency. Außerdem hast du ein Beschwerderecht bei
            einer Datenschutz-Aufsichtsbehörde.
          </p>
        </div>

        <p className="rounded-xl border border-line bg-cream-dark/40 p-4 text-xs text-ink">
          Hinweis: Diese Datenschutzerklärung deckt den aktuellen Funktionsumfang
          der Website ab. Bei rechtlicher Unsicherheit empfiehlt sich eine Prüfung
          durch eine fachkundige Person.
        </p>
      </div>
    </main>
  );
}
