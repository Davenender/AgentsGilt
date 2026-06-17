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
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)
          </h2>
          <p className="mt-3">
            David Hesse
            <br />
            Agents Gilt (Einzelunternehmen)
            <br />
            Lämmerspieler Straße 100
            <br />
            63165 Mühlheim am Main
            <br />
            Deutschland
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">Kontakt</h2>
          <p className="mt-3">
            E-Mail: kontakt@agents-gilt.agency
            <br />
            Telefon: +49 1609 8427943
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">Umsatzsteuer</h2>
          <p className="mt-3">
            Als Kleinunternehmer im Sinne von § 19 UStG wird keine Umsatzsteuer
            ausgewiesen.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <p className="mt-3">
            David Hesse (Anschrift wie oben)
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

        <div>
          <h2 className="font-display text-lg font-bold text-ink">Haftung für Inhalte</h2>
          <p className="mt-3">
            Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach
            den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
            verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
            überwachen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
            von Informationen nach den allgemeinen Gesetzen bleiben hiervon
            unberührt.
          </p>
        </div>
      </div>
    </main>
  );
}
