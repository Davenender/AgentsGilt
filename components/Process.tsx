"use client";

import { useEffect, useRef, useState } from "react";
import { workflow } from "@/lib/content";
import { Reveal } from "./Reveal";

// Muss zur Dauer von .step-fill in globals.css passen (aktuell 4s)
const STEP_MS = 4000;
// Kurzer Vorlauf, damit man die leere Zahl erst sieht, bevor sie sich füllt
const START_DELAY_MS = 500;

/**
 * Ablauf-Schritte mit automatischem Durchlauf (nur auf großen Bildschirmen):
 *  - die Zahl des aktiven Schritts füllt sich in 5 s von links nach rechts
 *    (dunkles Gold -> helles Gold), danach springt es zum nächsten Schritt
 *  - inaktive Schritte bleiben sichtbar, sind aber gedimmt
 *  - Maus über einem Schritt: sofort voll gefüllt, Durchlauf pausiert
 *
 * Der Durchlauf startet erst, wenn die Sektion wirklich im Bild ist – sonst
 * wäre der Zyklus schon durch, bevor man überhaupt hinscrollt.
 *
 * ERSTE RUNDE IST GESCHÜTZT: Solange der erste komplette Durchlauf (1-2-3 und
 * zurück auf 1) nicht fertig ist, wird der Hover ignoriert. Grund: Liegt der
 * Mauszeiger beim Hereinscrollen zufällig schon über den Schritten, würde er
 * den Durchlauf sofort anhalten – man bekäme die Animation nie zu sehen.
 *
 * AUF DEM HANDY (unter 768px) läuft KEIN Timer: dort stehen alle drei Schritte
 * sofort vollständig da – gefüllte Zahl, volle Deckkraft. Grund: Auf dem Handy
 * liegen die Schritte untereinander, man sieht also nie alle gleichzeitig. Ein
 * Durchlauf würde dann Schritte hell/dunkel schalten, die gerade gar nicht im
 * Bild sind, und man könnte ihn mangels Hover auch nicht anhalten. Dasselbe
 * gilt für Nutzer mit "weniger Bewegung".
 */
export function Process() {
  // `active` ist der echte Stand des Durchlaufs, `hovered` nur eine kurze
  // Vorschau per Maus. Der Hover verschiebt den Durchlauf bewusst NICHT:
  // geht die Maus weg, läuft es dort weiter, wo es vorher stand.
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  // Handy oder "weniger Bewegung": kein Durchlauf, alles steht sofort voll da.
  const [staticAll, setStaticAll] = useState(false);
  // Erste Runde durch? Vorher wird der Hover bewusst ignoriert.
  const [ersteRundeFertig, setErsteRundeFertig] = useState(false);
  // Der Hover zählt erst nach der ersten Runde – vorher tut er nichts.
  const hoverAktiv = ersteRundeFertig ? hovered : null;
  const paused = hoverAktiv !== null;
  const shown = hoverAktiv ?? active;
  // Beobachtet wird die ZAHLEN-REIHE, nicht die ganze Sektion: die ist so hoch,
  // dass sie schon als sichtbar gilt, wenn erst die Überschrift im Bild ist –
  // der Durchlauf wäre dann schon halb vorbei, bevor man die Zahlen sieht.
  const stepsRef = useRef<HTMLDivElement>(null);

  // Entscheidet, ob überhaupt ein Durchlauf stattfindet. Wird bei Größen-
  // änderung (Handy drehen) neu ausgewertet.
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 767px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStaticAll(narrow.matches || calm.matches);
    update();
    narrow.addEventListener("change", update);
    calm.addEventListener("change", update);
    return () => {
      narrow.removeEventListener("change", update);
      calm.removeEventListener("change", update);
    };
  }, []);

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
    if (staticAll) return;
    if (!visible) {
      // Verlässt man die Sektion, startet der Durchlauf beim nächsten Mal
      // wieder bei Schritt 1.
      //
      // `ersteRundeFertig` wird hier BEWUSST NICHT zurückgesetzt: Der Schutz
      // gilt nur für die allererste vollständige Runde pro Seitenaufruf. Wer
      // sie einmal gesehen hat, soll beim Zurückscrollen sofort mit der Maus
      // auswählen können, statt erneut warten zu müssen.
      //
      // Wurde die Runde abgebrochen (weggescrollt, bevor sie durch war), ist
      // das Merkmal noch false – dann läuft sie beim Zurückkommen von vorn.
      setStarted(false);
      setActive(0);
      return;
    }
    const t = setTimeout(() => setStarted(true), START_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, staticAll]);

  // Weiterschalten zum nächsten Schritt.
  // Solange die erste Runde läuft, ignoriert der Durchlauf den Hover (`paused`)
  // – erst danach kann man ihn mit der Maus anhalten.
  useEffect(() => {
    if (staticAll || !started) return;
    if (ersteRundeFertig && paused) return;

    const t = setTimeout(() => {
      const naechster = (active + 1) % workflow.steps.length;
      setActive(naechster);
      // Zurück auf Schritt 1 = eine volle Runde ist durch, ab jetzt zählt
      // der Hover. (Bewusst NICHT in der setActive-Funktion: React darf die
      // doppelt ausführen, Nebenwirkungen gehören da nicht hinein.)
      if (naechster === 0) setErsteRundeFertig(true);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [active, started, paused, staticAll, ersteRundeFertig]);

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
            // hoverAktiv statt hovered: Während der geschützten ersten Runde
            // ist hoverAktiv immer null, dadurch leuchtet auch die Zahl unter
            // der Maus nicht auf.
            const isHovered = hoverAktiv === i;
            // Auf dem Handy sind alle Schritte gleichzeitig "aktiv".
            const isActive = staticAll || i === shown;
            // Zahl komplett gefüllt (ohne Lauf-Animation)
            const filled = staticAll || isHovered;
            // Füll-Animation läuft gerade
            const running = !staticAll && isActive && !paused && started;
            return (
              <Reveal key={step.no} delay={i * 0.12}>
                <div
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
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
                      key={`${step.no}-${isActive}-${isHovered}-${started}-${staticAll}`}
                      className={`absolute inset-0 text-[#f5cb52] ${
                        running ? "step-fill" : ""
                      }`}
                      style={
                        filled
                          ? { clipPath: "inset(0 0 0 0)" } // Handy oder Hover: sofort ganz voll
                          : running
                            ? undefined // Füllung läuft über .step-fill
                            : { clipPath: "inset(0 100% 0 0)" } // leer: inaktiv, Vorlauf oder anderer Hover
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
