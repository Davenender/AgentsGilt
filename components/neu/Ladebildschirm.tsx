"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { BALKEN, STERN } from "./Marke";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, istVorschau, willWenigerBewegung } from "./umgebung";

gsap.registerPlugin(useGSAP);

const MERKER = "ag-neu-intro";

/**
 * Startanimation, die zugleich der Ladebildschirm ist: Die vier Balken und der
 * Stern des Logos gleiten einzeln herein und rasten ein, darunter laufen
 * Ladebalken und Prozentzahl. Danach hebt sich der Schirm und gibt den
 * Kopfbereich frei. Dauer höchstens gut zwei Sekunden, beim zweiten Besuch in
 * derselben Sitzung kürzer.
 *
 * Bei „weniger Bewegung“ und in der Vorschau erscheint er nicht. Fällt das
 * Skript aus, blendet ihn ein Sicherheitsnetz im Stylesheet nach 5 Sekunden
 * aus (ohne JavaScript: sofort, siehe noscript im Layout).
 */
export function Ladebildschirm() {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = wurzel.current;
      const prozent = el?.querySelector<HTMLElement>(".ag-lade__prozent");
      const balken = el?.querySelector<HTMLElement>(".ag-lade__balken i");
      if (!el || !prozent || !balken) return;

      const fertig = () => {
        document.documentElement.classList.add(INTRO_FERTIG_KLASSE);
        window.dispatchEvent(new Event(INTRO_FERTIG));
      };

      if (willWenigerBewegung() || istVorschau()) {
        gsap.set(el, { display: "none" });
        fertig();
        return;
      }

      let wieder = false;
      try {
        wieder = sessionStorage.getItem(MERKER) === "1";
        sessionStorage.setItem(MERKER, "1");
      } catch {
        /* Speicher gesperrt: dann eben die volle Fassung */
      }
      const dauer = wieder ? 0.9 : 2;
      const stand = { n: 0 };
      // Jeder Balken kommt auf einer geraden Bahn aus seiner Ecke.
      const ecken = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ];

      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from(".ag-lade__teil", { x: (i) => ecken[i][0] * 420, y: (i) => ecken[i][1] * 420, duration: dauer * 0.6, stagger: dauer * 0.08 }, 0)
        .from(".ag-lade__stern", { scale: 0, rotation: -90, transformOrigin: "50% 50%", duration: dauer * 0.42 }, dauer * 0.42)
        .to(
          stand,
          {
            n: 100,
            duration: dauer,
            ease: "power2.inOut",
            onUpdate: () => {
              prozent.textContent = `${Math.round(stand.n)} %`;
              balken.style.transform = `scaleX(${stand.n / 100})`;
            },
          },
          0,
        )
        .call(fertig, undefined, dauer + 0.1)
        .to(el, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, dauer + 0.1)
        .set(el, { display: "none" });
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="ag-lade" aria-hidden="true">
      <svg viewBox="-56 -56 112 112" fill="#d4a23c">
        {BALKEN.map((punkte) => (
          <polygon key={punkte} className="ag-lade__teil" points={punkte} />
        ))}
        <path className="ag-lade__stern" d={STERN} fill="#f3d27a" />
      </svg>
      <div className="ag-lade__balken">
        <i />
      </div>
      <p className="ag-mono ag-lade__prozent">0 %</p>
    </div>
  );
}
