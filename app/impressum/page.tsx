import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum – Agents Gilt",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-28">
      <Link href="/" className="text-sm font-medium text-gold-dark hover:underline">
        ← Zurück zur Startseite
      </Link>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-ink">
        Impressum
      </h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
        <p className="rounded-xl border border-line bg-cream-dark/40 p-4 text-ink">
          ⚠️ <strong>Platzhalter</strong> – diese Angaben müssen vor dem
          Live-Gang durch deine echten Daten ersetzt und (idealerweise) rechtlich
          geprüft werden.
        </p>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)
          </h2>
          <p className="mt-3">
            [Vorname Nachname]
            <br />
            Agents Gilt
            <br />
            [Straße &amp; Hausnummer]
            <br />
            [PLZ Ort]
            <br />
            Deutschland
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">Kontakt</h2>
          <p className="mt-3">
            E-Mail: kontakt@agents-gilt.agency
            <br />
            Telefon: [optional]
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Umsatzsteuer
          </h2>
          <p className="mt-3">
            Als Kleinunternehmer im Sinne von § 19 UStG wird keine Umsatzsteuer
            ausgewiesen.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Verbraucherstreitbeilegung
          </h2>
          <p className="mt-3">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
            vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </div>
    </main>
  );
}
