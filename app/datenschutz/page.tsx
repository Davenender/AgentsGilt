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
        <p className="rounded-xl border border-line bg-cream-dark/40 p-4 text-ink">
          ⚠️ <strong>Platzhalter / Entwurf</strong> – vor dem Live-Gang mit einem
          DSGVO-Generator (z.&nbsp;B. e-recht24.de) vervollständigen und vom Anwalt
          prüfen lassen.
        </p>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            1. Verantwortlicher
          </h2>
          <p className="mt-3">
            [Vorname Nachname], Agents Gilt, [Adresse], kontakt@agents-gilt.agency
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            2. Kontaktformular
          </h2>
          <p className="mt-3">
            Wenn du uns über das Kontaktformular eine Anfrage schickst, verarbeiten
            wir deine Angaben (Name, E-Mail, Unternehmen, Nachricht) ausschließlich
            zur Bearbeitung deiner Anfrage. Der Versand erfolgt über unseren
            Dienstleister Resend. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f
            DSGVO.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            3. Hosting
          </h2>
          <p className="mt-3">
            Diese Website wird bei Vercel gehostet. Dabei können technisch
            erforderliche Daten (z.&nbsp;B. IP-Adresse, Zeitpunkt des Zugriffs) in
            Server-Logs verarbeitet werden.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            4. Deine Rechte
          </h2>
          <p className="mt-3">
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
            der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu
            an kontakt@agents-gilt.agency.
          </p>
        </div>
      </div>
    </main>
  );
}
