"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { site } from "@/lib/content";

/**
 * Hero-Texte mit cinematic Intro-Timeline (läuft einmal beim Laden):
 * Eyebrow -> Überschrift (Zeilen gleiten aus einer Maske hoch) -> Untertitel -> Buttons.
 */
export function HeroContent() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from(".hero-eyebrow", { y: 24, opacity: 0, duration: 0.8 })
          .from(
            ".hero-line",
            { yPercent: 120, opacity: 0, duration: 1.1, stagger: 0.12 },
            "-=0.4",
          )
          .from(".hero-sub", { y: 30, opacity: 0, duration: 0.9 }, "-=0.6")
          // Den ganzen Button-CONTAINER animieren (nicht die Buttons einzeln),
          // damit sie sich niemals gegeneinander verschieben können.
          .from(".hero-cta-row", { y: 24, opacity: 0, duration: 0.8 }, "-=0.6");
      }, el);
      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="relative z-10 mx-auto max-w-4xl px-6 text-center">
      <span className="hero-eyebrow inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-white/75 backdrop-blur-sm">
        Deine KI-Agentur für lokale Unternehmen
      </span>

      <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl md:text-7xl">
        <span className="block overflow-hidden pb-[0.12em]">
          <span className="hero-line block">{site.claimLine1}</span>
        </span>
        <span className="block overflow-hidden pb-[0.12em]">
          <span className="hero-line block text-gold-gradient">
            {site.claimLine2}
          </span>
        </span>
      </h1>

      <p className="hero-sub mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
        {site.heroSub}
      </p>

      <div className="hero-cta-row mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-stretch">
        <a
          href="#kontakt"
          className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.04] sm:w-auto"
        >
          {site.heroCtaPrimary}
        </a>
        <a
          href="#leistungen"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
        >
          {site.heroCtaSecondary}
        </a>
      </div>
    </div>
  );
}
