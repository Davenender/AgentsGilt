"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { BALKEN, STERN } from "./Marke";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, LADEN_FERTIG, LADEN_FERTIG_KLASSE, istVorschau, willWenigerBewegung } from "./umgebung";

gsap.registerPlugin(useGSAP);

const MERKER = "ag-neu-intro";

/**
 * Startanimation, die zugleich der Ladebildschirm ist: Die vier Balken und der
 * Stern des Logos gleiten einzeln herein und rasten ein, darunter laufen
 * Ladebalken und Prozentzahl. Danach hebt sich der Schirm und gibt den
 * Kopfbereich frei. Dauer höchstens gut zwei Sekunden, beim zweiten Besuch in
 * derselben Sitzung kürzer.
 *
 * Zwei Meldungen: „Intro fertig“, sobald sich der Schirm zu heben beginnt (die
 * Texte treten auf), und „Laden fertig“, sobald er das Bild freigegeben hat
 * und die Schriften da sind, plus 120 ms (das Licht geht an, der Name fliegt ein).
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
      // „Laden fertig“: erst wenn die Schriften fertig sind, plus 120 ms. Die Meldung gehört zu
      // genau diesem Ladebildschirm: Eine Freigabe von einem früheren Besuch der Seite gilt nicht.
      document.documentElement.classList.remove(LADEN_FERTIG_KLASSE);
      let uhr = 0;
      let abgebaut = false;
      const ladenFertig = () => {
        const melden = () => {
          if (abgebaut) return;
          uhr = window.setTimeout(() => {
            document.documentElement.classList.add(LADEN_FERTIG_KLASSE);
            window.dispatchEvent(new Event(LADEN_FERTIG));
          }, 120);
        };
        if (document.fonts?.ready) document.fonts.ready.then(melden, melden);
        else melden();
      };
      const abbau = () => {
        abgebaut = true;
        window.clearTimeout(uhr);
        document.documentElement.classList.remove(LADEN_FERTIG_KLASSE);
      };

      if (willWenigerBewegung() || istVorschau()) {
        gsap.set(el, { display: "none" });
        fertig();
        ladenFertig();
        return abbau;
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
        // Nach 0,6 s ist der Schirm fast ganz oben: Das Bild ist frei.
        .call(ladenFertig, undefined, dauer + 0.7)
        .set(el, { display: "none" });
      return abbau;
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
