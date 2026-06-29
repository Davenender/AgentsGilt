"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Gold-Diamant im Hero:
 *  - scrollgebunden (scrub): wandert nach unten, dreht & skaliert leicht und
 *    blendet aus, während man durch den Hero scrollt (GSAP ScrollTrigger).
 *  - dezenter Maus-Tilt: kippt minimal in Richtung Maus (nur an Maus-Geräten).
 *  - sanftes, endloses Schweben (CSS).
 *
 * Drei verschachtelte Ebenen, damit sich die Transforms nicht gegenseitig
 * überschreiben (Scroll / Maus / Schweben).
 */
export function DiamondBackground() {
  const scrollLayer = useRef<HTMLDivElement>(null);
  const tiltLayer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    // Scroll-Parallax (auch bei reduzierter Bewegung ok – sehr ruhig)
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = scrollLayer.current;
      if (!el) return;
      gsap.to(el, {
        yPercent: 26,
        rotation: 26,
        scale: 1.16,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: "#top",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    });

    // Dezenter Maus-Tilt nur an echten Maus-Geräten
    mm.add(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        const el = tiltLayer.current;
        if (!el) return;
        const rotX = gsap.quickTo(el, "rotationX", { duration: 0.7, ease: "power3" });
        const rotY = gsap.quickTo(el, "rotationY", { duration: 0.7, ease: "power3" });
        const onMove = (e: PointerEvent) => {
          const px = e.clientX / window.innerWidth - 0.5;
          const py = e.clientY / window.innerHeight - 0.5;
          rotY(px * 16);
          rotX(-py * 16);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ perspective: 1200 }}
    >
      {/* Ebene 1: Scroll-Parallax */}
      <div ref={scrollLayer} style={{ opacity: 0.3 }} className="will-change-transform">
        {/* Ebene 2: Maus-Tilt */}
        <div ref={tiltLayer} className="will-change-transform [transform-style:preserve-3d]">
          {/* Ebene 3: sanftes Schweben (CSS) + Aufleuchten via --dg */}
          <div
            className="diamond-float"
            style={{
              filter:
                "brightness(calc(1 + var(--dg, 0) * 0.28)) saturate(calc(1 + var(--dg, 0) * 0.2)) drop-shadow(0 0 calc(46px + var(--dg, 0) * 82px) rgba(212, 162, 60, 0.5)) drop-shadow(0 0 calc(14px + var(--dg, 0) * 28px) rgba(240, 195, 95, 0.55))",
            }}
          >
            <Image
              src="/logo-mark.png"
              alt=""
              width={620}
              height={620}
              priority
              className="w-[72vw] max-w-[560px] select-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
