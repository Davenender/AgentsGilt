import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { WhyUs } from "@/components/WhyUs";
import { Credentials } from "@/components/Credentials";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { intro } from "@/lib/content";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />

        {/* Intro / Was wir machen */}
        <section className="bg-white py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
                {intro.kicker}
              </span>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
                {intro.headline}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
                {intro.text}
              </p>
            </Reveal>
          </div>
        </section>

        <Services />
        <Process />
        <WhyUs />
        <Credentials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
