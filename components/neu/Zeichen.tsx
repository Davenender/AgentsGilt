"use client";

import { useId, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { BALKEN, STERN } from "./Marke";
import { istVorschau } from "./umgebung";

gsap.registerPlugin(useGSAP);

const SCHICHTEN = 12;

const CHROM: [number, string][] = [
  [0, "#fdfbf3"],
  [0.16, "#c9ced9"],
  [0.3, "#4a5676"],
  [0.44, "#0e1630"],
  [0.56, "#d4a23c"],
  [0.7, "#f6e2a8"],
  [0.86, "#7b6a3b"],
  [1, "#f3f0e6"],
];
const GOLD: [number, string][] = [
  [0, "#fff1c2"],
  [0.22, "#f0cc74"],
  [0.45, "#c8932f"],
  [0.62, "#8a611a"],
  [0.8, "#d9ad4e"],
  [1, "#f6dc96"],
];

/**
 * Das Logo als glänzendes 3D-Zeichen.
 *
 * Kein WebGL: Zwölf hauchdünne Lagen liegen im Raum hintereinander und ergeben
 * die Tiefe, die oberste trägt den Chrom-Verlauf. Das Zeichen neigt sich zum
 * Zeiger und der Glanz wandert mit. Am Handy (unter 768 px) wird stattdessen
 * eine leichte Rasterpunkt-Zeichnung gezeigt, bei „weniger Bewegung“ steht es
 * still.
 */
export function Zeichen({ className, material = "chrom" }: { className?: string; material?: "chrom" | "gold" }) {
  const wurzel = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useGSAP(
    () => {
      const el = wurzel.current;
      const koerper = el?.querySelector<HTMLElement>(".ag-zeichen__koerper");
      const verlauf = el?.querySelector<SVGLinearGradientElement>("linearGradient");
      if (!el || !koerper || !verlauf || istVorschau()) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const ziel = { x: 0, y: 0 };
        const ist = { x: 0, y: 0 };
        let sichtbar = true;
        const waechter = new IntersectionObserver((eintraege) => {
          // Kommen mehrere Meldungen auf einmal, zählt die letzte (der jetzige Stand).
          sichtbar = eintraege[eintraege.length - 1].isIntersecting;
        });
        waechter.observe(el);

        const zeiger = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          ziel.x = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
          ziel.y = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
        };
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          window.addEventListener("pointermove", zeiger, { passive: true });
        }

        const takt = (zeit: number) => {
          if (!sichtbar) return;
          ist.x += (ziel.x - ist.x) * 0.07;
          ist.y += (ziel.y - ist.y) * 0.07;
          // Ruhiges Wiegen, damit das Zeichen auch ohne Zeiger lebt.
          const wiegeX = Math.sin(zeit * 0.6) * 5;
          const wiegeY = Math.cos(zeit * 0.45) * 3.5;
          koerper.style.transform = `rotateX(${(-ist.y * 16 + wiegeY).toFixed(2)}deg) rotateY(${(ist.x * 24 + wiegeX).toFixed(2)}deg)`;
          verlauf.setAttribute(
            "gradientTransform",
            `translate(${(ist.x * 26 + wiegeX * 2.4).toFixed(1)} ${(ist.y * 26 + wiegeY * 2.4).toFixed(1)})`,
          );
        };
        gsap.ticker.add(takt);

        return () => {
          gsap.ticker.remove(takt);
          waechter.disconnect();
          window.removeEventListener("pointermove", zeiger);
          koerper.style.transform = "";
          verlauf.removeAttribute("gradientTransform");
        };
      });
    },
    { scope: wurzel },
  );

  const stufen = material === "gold" ? GOLD : CHROM;

  return (
    <div ref={wurzel} className={`ag-zeichen ${className ?? ""}`} aria-hidden="true">
      <div className="ag-zeichen__koerper">
        {Array.from({ length: SCHICHTEN }, (_, i) => (
          <svg
            key={i}
            viewBox="-56 -56 112 112"
            style={{ transform: `translateZ(calc(var(--schritt, 1.8px) * ${i - SCHICHTEN}))` }}
          >
            <g fill={material === "gold" ? `hsl(40 68% ${12 + i * 1.5}%)` : `hsl(226 46% ${6 + i * 1.3}%)`}>
              {BALKEN.map((punkte) => (
                <polygon key={punkte} points={punkte} />
              ))}
              <path d={STERN} />
            </g>
          </svg>
        ))}
        <svg viewBox="-56 -56 112 112">
          <defs>
            <linearGradient id={`${id}b`} gradientUnits="userSpaceOnUse" x1="-46" y1="-46" x2="46" y2="46">
              {stufen.map(([o, farbe]) => (
                <stop key={o} offset={o} stopColor={farbe} />
              ))}
            </linearGradient>
            <radialGradient id={`${id}s`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="21" fx="-5" fy="-6">
              <stop offset="0" stopColor="#fff8de" />
              <stop offset="0.45" stopColor="#f3d27a" />
              <stop offset="1" stopColor="#c08a2a" />
            </radialGradient>
          </defs>
          <g fill={`url(#${id}b)`}>
            {BALKEN.map((punkte) => (
              <polygon key={punkte} points={punkte} />
            ))}
          </g>
          <path d={STERN} fill={`url(#${id}s)`} />
          <g fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="0.5" strokeLinecap="round">
            <path d="M-46,-6.4L-6.2,-45.8" />
            <path d="M6.2,-45.8L46,-6.4" />
            <path d="M-46,6.4L-33,6.4" />
            <path d="M33,6.4L46,6.4" />
          </g>
        </svg>
      </div>

      {/* Handy: Rasterpunkte, die Dichte steht für die Helligkeit. */}
      <svg className="ag-zeichen__raster" viewBox="-56 -56 112 112">
        <defs>
          {[0.92, 0.74, 0.6, 0.48].map((r, i) => (
            <pattern key={r} id={`${id}p${i}`} width="2.5" height="2.5" patternUnits="userSpaceOnUse">
              <circle cx="1.25" cy="1.25" r={r} fill="#f3d27a" />
            </pattern>
          ))}
        </defs>
        {BALKEN.map((punkte, i) => (
          <polygon key={punkte} points={punkte} fill={`url(#${id}p${i})`} stroke="#d4a23c" strokeWidth="0.5" />
        ))}
        <path d={STERN} fill="#f3d27a" />
      </svg>
    </div>
  );
}
