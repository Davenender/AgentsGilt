"use client";

import { useEffect, useRef, useState } from "react";
import { workflow } from "@/lib/content";
import { Reveal } from "./Reveal";

// Muss zur Dauer von .step-fill in globals.css passen (aktuell 5s)
const STEP_MS = 5000;
// Kurzer Vorlauf, damit man die leere Zahl erst sieht, bevor sie sich füllt
const START_DELAY_MS = 1000;

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
  const [started, setStarted] = useState(false);
  // Beobachtet wird die ZAHLEN-REIHE, nicht die ganze Sektion: die ist so hoch,
  // dass sie schon als sichtbar gilt, wenn erst die Überschrift im Bild ist –
  // der Durchlauf wäre dann schon halb vorbei, bevor man die Zahlen sieht.
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stepsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Beim Reinscrollen kurz warten, dann bei Schritt 1 starten
  useEffect(() => {
    if (!visible) {
      setStarted(false);
      setActive(0);
      return;
    }
    const t = setTimeout(() => setStarted(true), START_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible]);

  // Weiterschalten zum nächsten Schritt
  useEffect(() => {
    if (!started || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(
      () => setActive((i) => (i + 1) % workflow.steps.length),
      STEP_MS,
    );
    return () => clearTimeout(t);
  }, [active, started, paused]);

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

        <div
          ref={stepsRef}
          className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8"
        >
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
                      key={`${step.no}-${isActive}-${paused}-${started}`}
                      className={`absolute inset-0 text-[#f5cb52] ${
                        isActive && !paused && started ? "step-fill" : ""
                      }`}
                      style={
                        isActive && paused
                          ? { clipPath: "inset(0 0 0 0)" } // Hover: sofort ganz voll
                          : isActive && started
                            ? undefined // Füllung läuft über .step-fill
                            : { clipPath: "inset(0 100% 0 0)" } // leer: inaktiv oder Vorlauf
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
