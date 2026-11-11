"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { gsap } from "@/lib/gsap";
import { istVorschau } from "./umgebung";

gsap.registerPlugin(useGSAP, SplitText);

/**
 * Ein Absatz, der sich beim Lesen Wort für Wort einfärbt: Die Wörter stehen
 * gedämpft da (gut lesbar) und werden hell, während man daran vorbeiscrollt.
 * Ohne Skript oder bei „weniger Bewegung“ bleibt der Text in seiner Grundfarbe.
 */
export function WortFarbe({ className, children }: { className?: string; children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || istVorschau()) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const teilung = SplitText.create(el, { type: "words" });
        gsap.fromTo(
          teilung.words,
          { color: "#7c84a2" },
          {
            color: "#f1eee6",
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 52%", scrub: true },
          },
        );
        return () => teilung.revert();
      });
    },
    { scope: ref },
  );

  return (
    <p ref={ref} className={className}>
      {children}
    </p>
  );
}
