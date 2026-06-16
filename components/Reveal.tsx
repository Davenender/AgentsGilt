"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  className?: string;
  /** Verzögerung in Sekunden (für gestaffelte Effekte) */
  delay?: number;
};

/**
 * Sanftes Einblenden beim Reinscrollen – mit GSAP + ScrollTrigger.
 *
 * Kugelsicher: Der Inhalt ist im Grundzustand SICHTBAR (kein CSS versteckt ihn).
 * Nur wenn GSAP läuft, wird er per `gsap.from` kurz versteckt und beim
 * Erreichen sauber eingeblendet. Läuft das JS nicht oder hat der Nutzer
 * "weniger Bewegung" aktiviert, bleibt alles einfach sichtbar.
 */
export function Reveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el, {
        opacity: 0,
        y: 44,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power3.out",
        delay,
        scrollTrigger: {
          trigger: el,
          start: "top 86%",
          once: true,
        },
      });
    });

    return () => mm.revert();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
