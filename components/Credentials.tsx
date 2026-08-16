import { credentials } from "@/lib/content";
import { CertificateCard } from "./CertificateCard";
import { Reveal } from "./Reveal";

export function Credentials() {
  return (
    // overflow-x-clip: Beim Wechsel fährt die vordere Karte fast eine ganze
    // Kartenbreite nach links. Bei der ersten Karte reicht der Platz bis zum
    // Fensterrand nicht – ohne das Beschneiden entstünde seitliches Scrollen.
    <section id="ausbildung" className="overflow-x-clip bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              {credentials.kicker}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            {/* Auf dem Handy eine Stufe kleiner als die übrigen Überschriften:
                "Ausgebildet in Anthropics KI-Technologie." ist lang und
                drängte sich bei 30 px zu sehr in den Vordergrund. */}
            <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
              {credentials.headline}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 text-base leading-relaxed text-ink-soft">
              {credentials.text}
            </p>
          </Reveal>
        </div>

        {/* Deutlich größere Abstände als sonst: Hinter jeder Karte liegt eine
            zweite. Im Ruhezustand ragt sie nach RECHTS heraus, beim Wechsel
            fährt die vordere nach LINKS raus – beides zusammen braucht Platz,
            sonst überlappen benachbarte Stapel. Nachgemessen: bei gap-20
            bleiben in beiden Zuständen über 20px Luft. */}
        {/* pr-8 auf dem Handy: Die hintere Karte liegt nach rechts versetzt und
            braucht dort Platz — ohne den Abstand ragt sie aus dem Bildschirm.
            Ab sm gibt es mehrere Spalten, dann ist ohnehin Luft. */}
        <div className="mt-14 grid gap-14 pr-8 sm:grid-cols-2 sm:pr-0 lg:grid-cols-4 lg:gap-20">
          {credentials.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 4) * 0.08} className="h-full">
              <CertificateCard
                title={item.title}
                certs={item.certs}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
