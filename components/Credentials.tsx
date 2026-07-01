import Image from "next/image";
import { credentials } from "@/lib/content";
import { Reveal } from "./Reveal";

export function Credentials() {
  return (
    <section id="ausbildung" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
              {credentials.kicker}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
              {credentials.headline}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 text-base leading-relaxed text-ink-soft">
              {credentials.text}
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {credentials.items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 4) * 0.08}>
              <a
                href={item.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-cream">
                  <Image
                    src={item.img}
                    alt={`Zertifikat: ${item.title}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-base font-bold leading-snug text-ink">
                    {item.title}
                  </h3>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-dark">
                    Zertifikat ansehen
                    <span aria-hidden className="transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
