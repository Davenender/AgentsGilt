import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import TerminAntwort from "@/components/TerminAntwort";
import { kundenName } from "@/lib/discord-calls";
import { site } from "@/lib/content";
import { berlinNow } from "@/lib/termin";
import { ladeVorschlag } from "@/lib/termin-kunde";

export const metadata: Metadata = {
  title: "Ihr Terminvorschlag – Agents Gilt",
  robots: { index: false, follow: false },
};

// Jeder Aufruf liest den aktuellen Stand aus Discord.
export const dynamic = "force-dynamic";

const feld = (embed: { fields?: { name: string; value: string }[] }, name: string) =>
  embed.fields?.find((f) => f.name === name)?.value?.trim() ?? "";

export default async function TerminSeite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const v = await ladeVorschlag(code);

  // Frühester wählbarer Tag im Datumsfeld: morgen (Berliner Zeit).
  const h = berlinNow();
  const fruehestens = new Date(Date.UTC(h.year, h.month - 1, h.day + 1)).toISOString().slice(0, 10);

  const name = v.ok ? kundenName(v.embed) : "";
  const zeit = v.ok ? feld(v.embed, "Zeitpunkt") : "";
  const betrieb = v.ok ? feld(v.embed, "Betrieb") : "";
  const anlass = zeit
    ? `Sie haben am ${/\d{2}:\d{2}$/.test(zeit) ? `${zeit} Uhr` : zeit} bei uns angerufen${betrieb ? ` (${betrieb})` : ""}.`
    : "Sie haben bei uns angerufen.";

  const hinweis = (text: string) => <p className="mt-5 text-ink-soft/80">{text}</p>;

  let inhalt: React.ReactNode;
  if (!v.ok) {
    inhalt = hinweis(`Dieser Link ist leider ungültig oder abgelaufen. Rufen Sie uns gern an: ${site.phoneDisplay}`);
  } else if (v.state === "confirmed") {
    inhalt = hinweis("Ihr Termin ist bestätigt. Vielen Dank, wir freuen uns auf das Gespräch.");
  } else if (v.state === "customer_alt") {
    inhalt = hinweis("Vielen Dank, wir haben Ihren Wunsch erhalten und melden uns per SMS.");
  } else if (v.state !== "proposed" || !v.termin) {
    inhalt = hinweis(`Dieser Vorschlag ist nicht mehr aktuell. Rufen Sie uns gern an: ${site.phoneDisplay}`);
  } else {
    inhalt = (
      <>
        <p className="mt-5 leading-relaxed text-ink-soft/80">
          {anlass} Dazu haben wir einen Terminvorschlag für Sie:
        </p>
        <div className="mt-5 rounded-2xl border border-gold/40 bg-cream p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">
            Unser Vorschlag
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink">{v.termin}</p>
          <p className="mt-1 text-sm text-ink-soft/70">Erstgespräch mit Agents Gilt</p>
        </div>
        <TerminAntwort code={code} termin={v.termin} fruehestens={fruehestens} />
      </>
    );
  }

  const vertrauen = [
    "Dieser Link ist nur für Sie und gilt nur für diesen Terminvorschlag.",
    "Keine Anmeldung und keine Zahlungsdaten: Wir fragen nur nach Ihrem Terminwunsch.",
    "Sie können jederzeit anrufen oder schreiben, wenn Sie lieber so antworten möchten.",
  ];

  return (
    <main className="min-h-screen bg-cream-dark/60 px-5 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center gap-3">
          <Image src="/logo-mark.png" alt="" width={44} height={44} className="h-11 w-11" priority />
          <div>
            <p className="font-display text-[15px] font-bold uppercase tracking-[0.12em] text-ink">
              Agents Gilt
            </p>
            <p className="text-xs text-ink-soft/60">KI-Lösungen für lokale Unternehmen</p>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">
            Terminvorschlag
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">
            {name ? `Guten Tag, ${name}` : "Guten Tag"}
          </h1>
          {inhalt}
        </section>

        <ul className="mt-6 space-y-2.5 px-1 text-sm text-ink-soft/80">
          {vertrauen.map((t) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 text-gold-dark">✓</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 px-1 text-sm text-ink-soft/80">
          Fragen? <a className="font-medium text-ink underline-offset-2 hover:underline" href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
          {" · "}
          <a className="font-medium text-ink underline-offset-2 hover:underline" href={`mailto:${site.email}`}>{site.email}</a>
        </p>

        <footer className="mt-10 border-t border-line px-1 pt-5 text-xs text-ink-soft/60">
          <p>
            Sie sind auf <span className="font-medium">agentsgilt.com</span>, der Website von Agents Gilt.
          </p>
          <p className="mt-2 flex gap-4">
            <Link href="/impressum" className="hover:text-ink">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
