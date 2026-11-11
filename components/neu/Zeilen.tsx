"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, istVorschau } from "./umgebung";

gsap.registerPlugin(useGSAP, SplitText);

type Props = {
  als?: "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  children: ReactNode;
  /** "intro": wartet auf den Ladebildschirm. "scroll": startet, wenn der Text ins Bild kommt. */
  start?: "intro" | "scroll";
  verzug?: number;
};

/**
 * Text läuft Zeile für Zeile ein (jede Zeile steigt aus einer Maske).
 *
 * Der Text ist im Grundzustand sichtbar: Erst in dem Moment, in dem er von
 * unten ins Bild kommt, wird er zerlegt und eingefahren. Läuft kein Skript oder
 * ist „weniger Bewegung“ eingestellt, steht er einfach da. Nach dem Einlaufen
 * wird die Zerlegung zurückgenommen, damit der Text bei anderer Fensterbreite
 * wieder normal umbricht.
 */
export function Zeilen({ als: Tag = "div", className, children, start = "scroll", verzug = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || istVorschau()) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let teilung: SplitText | undefined;
        const zerlegen = () => {
          teilung = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "ag-zeile" });
          gsap.set(teilung.lines, { yPercent: 112 });
        };
        const spielen = () => {
          if (!teilung) zerlegen();
          gsap.to(teilung!.lines, {
            yPercent: 0,
            duration: 1.05,
            ease: "power4.out",
            stagger: 0.09,
            delay: verzug,
            onComplete: () => teilung?.revert(),
          });
        };

        if (start === "intro") {
          if (document.documentElement.classList.contains(INTRO_FERTIG_KLASSE)) {
            spielen();
          } else {
            // Der Ladebildschirm liegt darüber: schon jetzt in die Maske legen.
            zerlegen();
            window.addEventListener(INTRO_FERTIG, spielen, { once: true });
          }
        } else {
          ScrollTrigger.create({ trigger: el, start: "top bottom", once: true, onEnter: spielen });
        }

        return () => {
          window.removeEventListener(INTRO_FERTIG, spielen);
          teilung?.revert();
        };
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
