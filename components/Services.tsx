import { services } from "@/lib/content";
import { Reveal } from "./Reveal";
import { ServiceCard } from "./ServiceCard";

export function Services() {
  return (
    <section id="leistungen" className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Leistungen
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
            Alles, was dein Geschäft digital braucht.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            Von der Website bis zum Telefon-Agenten – wir bauen die Lösung, die
            zu deinem Problem passt. Einzeln oder als Komplettpaket.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <ServiceCard key={s.title} service={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
