"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { INTRO_TYPING_DONE, INTRO_TYPING_STARTED } from "@/lib/events";
import { wasWirMachen as t } from "@/lib/inhalt-neu";
import { istVorschau, willWenigerBewegung } from "./umgebung";

gsap.registerPlugin(useGSAP);

/**
 * „Was wir machen“: Die Überschrift schreibt sich selbst und korrigiert sich
 * einmal. Erst steht „Tagen“ da, das wird gelöscht und durch „Stunden*“ in
 * Gold ersetzt.
 *
 * Meldet Beginn und Ende des Tippens als Ereignis: Darauf wartet der
 * Chat-Assistent mit seiner Sprechblase (components/ChatWidget.tsx). Bei
 * „weniger Bewegung“ steht der fertige Satz sofort da und beide Ereignisse
 * kommen direkt nacheinander.
 */
export function Schreibmaschine({ className }: { className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const teil = (name: string) => el?.querySelector<HTMLElement>(`[data-t="${name}"]`);
      const vor = teil("vor");
      const tausch = teil("tausch");
      const stern = teil("stern");
      const nach = teil("nach");
      if (!el || !vor || !tausch || !stern || !nach) return;

      ScrollTrigger.create({
        trigger: el,
        start: "top 80%",
        once: true,
        onEnter: () => {
          window.dispatchEvent(new Event(INTRO_TYPING_STARTED));
          if (willWenigerBewegung() || istVorschau()) {
            window.dispatchEvent(new Event(INTRO_TYPING_DONE));
            return;
          }

          // Höhe festhalten, damit beim Tippen nichts springt.
          el.style.minHeight = `${el.offsetHeight}px`;
          vor.textContent = "";
          tausch.textContent = "";
          nach.textContent = "";
          tausch.classList.remove("ag-gold");
          gsap.set(stern, { autoAlpha: 0 });
          el.classList.add("tippt");

          const z = { vor: 0, falsch: 0, richtig: 0, nach: 0 };
          gsap
            .timeline({
              defaults: { ease: "none" },
              onComplete: () => {
                el.classList.remove("tippt");
                el.style.minHeight = "";
                window.dispatchEvent(new Event(INTRO_TYPING_DONE));
              },
            })
            .to(z, { vor: t.vor.length, duration: t.vor.length * 0.05, onUpdate: () => void (vor.textContent = t.vor.slice(0, Math.round(z.vor))) })
            .to(z, { falsch: t.falsch.length, duration: 0.4, onUpdate: () => void (tausch.textContent = t.falsch.slice(0, Math.round(z.falsch))) })
            .to(z, { falsch: 0, duration: 0.3, delay: 0.6, onUpdate: () => void (tausch.textContent = t.falsch.slice(0, Math.round(z.falsch))) })
            .call(() => tausch.classList.add("ag-gold"))
            .to(z, { richtig: t.richtig.length, duration: 0.5, onUpdate: () => void (tausch.textContent = t.richtig.slice(0, Math.round(z.richtig))) })
            .to(stern, { autoAlpha: 1, duration: 0.3 })
            .to(z, { nach: t.nach.length, duration: t.nach.length * 0.04, onUpdate: () => void (nach.textContent = t.nach.slice(0, Math.round(z.nach))) });
        },
      });
    },
    { scope: ref },
  );

  return (
    <h2 ref={ref} className={`ag-versal ag-tipp ${className ?? ""}`} aria-label={`${t.vor}${t.richtig}${t.nach}`}>
      <span aria-hidden="true">
        <span data-t="vor">{t.vor}</span>
        <span data-t="tausch" className="ag-gold">
          {t.richtig}
        </span>
        <sup data-t="stern">*</sup>
        <span data-t="nach">{t.nach}</span>
      </span>
    </h2>
  );
}
