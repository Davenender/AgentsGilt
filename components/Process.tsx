import { workflow } from "@/lib/content";
import { Reveal } from "./Reveal";

export function Process() {
  return (
    <section id="ablauf" className="bg-ink py-24 text-white md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {workflow.kicker}
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            {workflow.headline}
          </h2>
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {workflow.steps.map((step, i) => (
            <Reveal key={step.no} delay={i * 0.12}>
              <div className="relative">
                <div className="font-display text-5xl font-extrabold text-gold/30">
                  {step.no}
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
