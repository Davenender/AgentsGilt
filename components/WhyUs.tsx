import { why } from "@/lib/content";
import { Reveal } from "./Reveal";

export function WhyUs() {
  return (
    <section id="warum" className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
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
            <Reveal key={item.title} delay={(i % 4) * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-white p-7">
                <div className="mb-4 h-1 w-10 rounded-full bg-gold" />
                <h3 className="font-display text-lg font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
