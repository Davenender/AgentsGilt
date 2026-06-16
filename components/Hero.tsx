import { DiamondBackground } from "./DiamondBackground";
import { HeroTrail } from "./HeroTrail";
import { HeroContent } from "./HeroContent";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink text-white"
    >
      <DiamondBackground />
      <HeroTrail />
      {/* sanfter Gold-Schimmer in der Mitte */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,162,60,0.10),_transparent_62%)]" />
      {/* Abdunkeln nach unten für den Übergang */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />

      <HeroContent />

      {/* Scroll-Hinweis */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40">
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/25 p-1.5">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/50" />
        </div>
      </div>
    </section>
  );
}
