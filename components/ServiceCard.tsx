"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { Service } from "@/lib/content";

/**
 * Eine Leistungs-Karte mit:
 *  - gestaffeltem Einblenden beim Reinscrollen (GSAP ScrollTrigger)
 *  - 3D-Tilt zur Maus + Glanz-Lichtpunkt (nur an echten Maus-Geräten)
 *
 * Beide Effekte laufen über GSAP, das alle Transforms sauber zusammenführt.
 * Grundzustand ohne JS: voll sichtbar (kein CSS versteckt die Karte).
 */
export function ServiceCard({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    // Einblenden (für alle)
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el, {
        opacity: 0,
        y: 48,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power3.out",
        delay: (index % 3) * 0.08,
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // 3D-Tilt + Glanz nur an Maus-Geräten
    mm.add(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        const rotX = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
        const rotY = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          rotY((px - 0.5) * 10);
          rotX((0.5 - py) * 10);
          if (shineRef.current) {
            shineRef.current.style.opacity = "1";
            shineRef.current.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(212,162,60,0.18), transparent 45%)`;
          }
        };
        const onLeave = () => {
          rotX(0);
          rotY(0);
          if (shineRef.current) shineRef.current.style.opacity = "0";
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      },
    );

    return () => mm.revert();
  }, [index]);

  const handleSelect = () => {
    window.dispatchEvent(
      new CustomEvent("ag:select-service", { detail: service.title }),
    );
    document.getElementById("kontakt")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label={`${service.title} für Anfrage auswählen`}
        onClick={handleSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect();
          }
        }}
        className="group relative h-full cursor-pointer select-none overflow-hidden rounded-2xl border border-line bg-white p-7 transition-[border-color,box-shadow] duration-300 [transform-style:preserve-3d] will-change-transform hover:border-gold/50 hover:shadow-[0_24px_70px_-24px_rgba(12,14,20,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      >
        {/* Glanz-Lichtpunkt (folgt der Maus) */}
        <div
          ref={shineRef}
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300"
        />
        {/* dezenter Hinweis: Karte ist anklickbar */}
        <span className="pointer-events-none absolute right-6 top-8 z-10 text-xs font-semibold text-gold-dark opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Auswählen →
        </span>

        <div className="relative">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-ink font-display text-sm font-bold text-gold">
            {String(index + 1).padStart(2, "0")}
          </div>
          <h3 className="font-display text-xl font-bold text-ink">
            {service.title}
          </h3>
          <p className="mt-1.5 text-sm font-semibold text-gold-dark">
            {service.short}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {service.description}
          </p>
          <ul className="mt-5 space-y-2.5">
            {service.points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2.5 text-sm text-ink-soft"
              >
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
