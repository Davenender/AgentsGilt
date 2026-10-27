import type { Metadata } from "next";
import TerminAntwort from "@/components/TerminAntwort";
import { berlinNow } from "@/lib/termin";
import { ladeVorschlag } from "@/lib/termin-kunde";

export const metadata: Metadata = {
  title: "Ihr Terminvorschlag – Agents Gilt",
  robots: { index: false, follow: false },
};

// Jeder Aufruf liest den aktuellen Stand aus Discord.
export const dynamic = "force-dynamic";

export default async function TerminSeite({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const v = await ladeVorschlag(code);

  // Frühester wählbarer Tag im Datumsfeld: morgen (Berliner Zeit).
  const h = berlinNow();
  const fruehestens = new Date(Date.UTC(h.year, h.month - 1, h.day + 1))
    .toISOString()
    .slice(0, 10);

  let inhalt: React.ReactNode;
  if (!v.ok) {
    inhalt = (
      <p className="mt-6 text-ink-soft">
        Dieser Link ist leider ungültig oder abgelaufen. Rufen Sie uns gern an:
        +49 6108 9694027
      </p>
    );
  } else if (v.state === "confirmed") {
    inhalt = (
      <p className="mt-6 text-ink-soft">
        Ihr Termin ist bestätigt. Vielen Dank, wir freuen uns auf das Gespräch.
      </p>
    );
  } else if (v.state === "customer_alt") {
    inhalt = (
      <p className="mt-6 text-ink-soft">
        Vielen Dank, wir haben Ihren Wunsch erhalten und melden uns per SMS.
      </p>
    );
  } else if (v.state !== "proposed" || !v.termin) {
    inhalt = (
      <p className="mt-6 text-ink-soft">
        Dieser Vorschlag ist nicht mehr aktuell. Rufen Sie uns gern an:
        +49 6108 9694027
      </p>
    );
  } else {
    inhalt = (
      <>
        <p className="mt-6 text-ink-soft">Wir schlagen Ihnen folgenden Termin vor:</p>
        <p className="mt-2 font-display text-2xl font-bold text-ink">{v.termin}</p>
        <TerminAntwort code={code} termin={v.termin} fruehestens={fruehestens} />
      </>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-28">
      <p className="text-sm font-medium text-gold-dark">Agents Gilt</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">
        Ihr Terminvorschlag
      </h1>
      {inhalt}
    </main>
  );
}
