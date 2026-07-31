import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { WhyUs } from "@/components/WhyUs";
import { Credentials } from "@/components/Credentials";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { IntroTypewriter } from "@/components/IntroTypewriter";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />

        {/* Intro / Was wir machen */}
        <section className="relative overflow-hidden bg-white py-24 md:py-32">
          {/* Sehr weicher Gold-Schein hinter dem Text – füllt die Fläche,
              ohne ein zusätzliches Element in die Sektion zu setzen. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[540px] w-[920px] max-w-[135%] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(212,162,60,0.14), rgba(212,162,60,0.05) 45%, transparent 70%)",
            }}
          />
          <IntroTypewriter />
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
