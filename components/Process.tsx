"use client";

import { useEffect, useRef, useState } from "react";
import { workflow } from "@/lib/content";
import { Reveal } from "./Reveal";

// Muss zur Dauer von .step-fill in globals.css passen (aktuell 5s)
const STEP_MS = 5000;

/**
 * Ablauf-Schritte mit automatischem Durchlauf:
 *  - die Zahl des aktiven Schritts füllt sich in 4 s von links nach rechts
 *    (dunkles Gold -> helles Gold), danach springt es zum nächsten Schritt
 *  - inaktive Schritte bleiben sichtbar, sind aber gedimmt
 *  - Maus über einem Schritt: sofort voll gefüllt, Durchlauf pausiert
 *
 * Der Durchlauf startet erst, wenn die Sektion wirklich im Bild ist – sonst
 * wäre der Zyklus schon durch, bevor man überhaupt hinscrollt.
 */
export function Process() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Nur laufen lassen, wenn die Sektion sichtbar ist
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Weiterschalten zum nächsten Schritt
  useEffect(() => {
    if (!visible || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(
      () => setActive((i) => (i + 1) % workflow.steps.length),
      STEP_MS,
    );
    return () => clearTimeout(t);
  }, [active, visible, paused]);

  return (
    <section
      ref={sectionRef}
      id="ablauf"
      className="bg-ink py-24 text-white md:py-32"
    >
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
          {workflow.steps.map((step, i) => {
            const isActive = i === active;
            return (
              <Reveal key={step.no} delay={i * 0.12}>
                <div
                  onMouseEnter={() => {
                    setActive(i);
                    setPaused(true);
                  }}
                  onMouseLeave={() => setPaused(false)}
                  className={`relative transition-opacity duration-700 ease-out ${
                    isActive ? "opacity-100" : "opacity-45"
                  }`}
                >
                  {/* Zahl: dunkle Basis, darüber die helle Füllung */}
                  <div className="relative inline-block font-display text-5xl font-extrabold leading-none">
                    <span className="text-[#6b5220]">{step.no}</span>
                    <span
                      aria-hidden
                      // key erzwingt den Neustart der Füll-Animation bei jedem Wechsel
                      key={`${step.no}-${isActive}-${paused}`}
                      className={`absolute inset-0 text-[#f5cb52] ${
                        isActive && !paused ? "step-fill" : ""
                      }`}
                      style={
                        isActive
                          ? paused
                            ? { clipPath: "inset(0 0 0 0)" } // Hover: sofort ganz voll
                            : undefined // läuft über .step-fill
                          : { clipPath: "inset(0 100% 0 0)" } // inaktiv: leer
                      }
                    >
                      {step.no}
                    </span>
                  </div>

                  <h3
                    className="mt-3 font-display text-xl font-bold text-white transition-all duration-700"
                    style={
                      isActive
                        ? { textShadow: "0 0 18px rgba(255,255,255,0.38)" }
                        : undefined
                    }
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`mt-3 text-sm leading-relaxed transition-colors duration-700 ${
                      isActive ? "text-white/90" : "text-white/65"
                    }`}
                  >
                    {step.text}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
