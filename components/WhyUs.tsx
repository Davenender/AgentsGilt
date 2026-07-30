import Image from "next/image";
import { why } from "@/lib/content";
import { Reveal } from "./Reveal";

/**
 * Vorteils-Karten in warmweißer Glas-Optik:
 *  - dezentes Logo-Wasserzeichen hinter dem Glas
 *  - diagonale Goldecke mit Diamant-Symbol (bewusst OHNE Nummer, damit es sich
 *    nicht mit dem nummerierten Ablauf-Bereich verwechselt)
 *  - beim Hover wächst ein goldener Glasverlauf aus der Ecke über die Karte
 *
 * Der Hover-Teil läuft rein über CSS. Tailwind bindet `hover:` an
 * `@media (hover: hover)` – auf Touch-Geräten passiert also nichts, dort
 * bleiben die Karten ruhig und die Goldecke ist der sichtbare Akzent.
 */

const icons = [
  // Schnell – Blitz
  <path key="a" d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />,
  // Modern – Chip / Technik
  <g key="b">
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3" />
  </g>,
  // Persönlich – Person
  <g key="c">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </g>,
  // Planbar – Kalender
  <g key="d">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </g>,
];

export function WhyUs() {
  return (
    <section id="warum" className="relative overflow-hidden bg-cream py-24 md:py-32">
      {/* sehr dezenter warmer Verlauf */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_15%,_rgba(212,162,60,0.10),_transparent_60%)]" />

      {/* EIN großes Logo fest im Hintergrund der ganzen Sektion – liegt hinter
          Kicker, Überschrift und Karten. Bewegt sich bewusst NICHT mit, wenn
          sich eine Karte beim Hover anhebt: die Karte gleitet wie eine
          Glasscheibe darüber. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/logo-mark.png"
          alt=""
          width={900}
          height={900}
          className="w-[min(90vw,720px)] opacity-[0.12]"
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            {why.kicker}
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
            {why.headline}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {why.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 4) * 0.08} className="h-full">
              <div className="group relative h-full overflow-hidden rounded-2xl border border-gold/25 bg-white/40 p-7 shadow-[0_2px_20px_-8px_rgba(184,132,43,0.25)] backdrop-blur-[2px] transition duration-500 ease-out hover:-translate-y-1.5 hover:border-gold/50 hover:shadow-[0_18px_40px_-14px_rgba(184,132,43,0.45)]">
                {/* Goldener Glasverlauf: startet oben rechts in GENAU der Farbe
                    der Goldecke (#d4a23c) und wird nach unten links heller.
                    Beide nutzen denselben Startwert – dadurch ist der Übergang
                    von der Ecke in die Fläche nahtlos. */}
                <div className="pointer-events-none absolute inset-0 origin-top-right scale-0 bg-[linear-gradient(215deg,_#cf9d37_0%,_#cf9d37_24%,_#d8ac52_40%,_#e5c384_62%,_#f0dbae_80%,_#faf2e2_100%)] opacity-0 transition-all duration-[650ms] ease-out group-hover:scale-[1.7] group-hover:opacity-100" />

                {/* diagonale Goldecke – einfarbig im selben Ton wie der Verlauf */}
                <div
                  className="pointer-events-none absolute right-0 top-0 h-16 w-16 bg-[#cf9d37] transition-transform duration-500 group-hover:scale-110"
                  style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
                />

                {/* Inhalt */}
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-gold-dark transition-colors duration-500 group-hover:text-ink"
                  >
                    {icons[i % icons.length]}
                  </svg>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft transition-colors duration-500 group-hover:text-ink">
                    {item.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
