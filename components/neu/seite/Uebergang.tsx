"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { worte } from "@/lib/inhalt-neu";
import { START_FERTIG, START_FERTIG_KLASSE, istVorschau } from "../umgebung";
import type { LichtSzene } from "../kopf/lichtszene";

/**
 * Übergang zu den Leistungen: ein schmaler, schräger goldener Lichtstrahl mit demselben
 * Licht-Aufbau wie das Logo im Kopfbereich (Loch in dunkler Wand, Licht dahinter; lichtszene.ts).
 * Beim Scrollen fächert er sich zum Lichtstern auf. Um ihn herum schweben vier Wörter.
 *
 * Die Szene wird erst geladen, wenn der Abschnitt in die Nähe kommt, und rechnet nur, solange
 * er zu sehen ist. Bei „weniger Bewegung“, ohne WebGL oder wenn das Gerät nicht mitkommt, steht
 * stattdessen ein ruhiger Lichtstrahl aus dem Stylesheet.
 */
export function Uebergang() {
  const wurzel = useRef<HTMLElement>(null);
  const halter = useRef<HTMLDivElement>(null);
  const platz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wurzel.current;
    const buehne = halter.current;
    const anker = platz.current;
    if (!el || !buehne || !anker) return;
    if (istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.still = "1";
      return () => {
        delete el.dataset.still;
      };
    }
    let szene: LichtSzene | undefined;
    let vorbei = false;
    let scroll: ScrollTrigger | undefined;
    const stattBild = () => {
      szene?.ende();
      szene = undefined;
      if (!vorbei) el.dataset.still = "1";
    };
    // Erst laden, wenn die Startanimation durch ist und der Abschnitt bis auf eine halbe
    // Bildschirmhöhe herangekommen ist: Während des Starts wird nichts Zweites angelegt.
    const naehe = new IntersectionObserver(
      (eintraege) => {
        if (!eintraege.some((e) => e.isIntersecting)) return;
        naehe.disconnect();
        import("../kopf/lichtszene")
          .then(({ starteLichtSzene }) => {
            if (vorbei) return;
            // Schwarze Wand wie im Kopfbereich (nur auf Schwarz bleibt das Korn unsichtbar); die
            // Fläche läuft oben und unten weich in den Grund der Seite aus (Stylesheet).
            szene = starteLichtSzene(buehne, anker, { proben: 60, wand: 0x000000, maus: false, strahl: true, beiAusfall: stattBild });
            szene.zeigen(true);
            el.dataset.licht = "live";
            // Beim Scrollen durch den Abschnitt: vom Schlitz (1) zum Stern (0). Kommt die Mitte des
            // Abschnitts unten ins Bild, steht der Strahl; ist sie knapp über der Bildmitte, der Stern.
            const formen = (st: ScrollTrigger) => {
              const f = st.progress;
              szene?.form(1 - f * f * (3 - 2 * f));
            };
            scroll = ScrollTrigger.create({ trigger: el, start: "center 92%", end: "center 44%", onUpdate: formen, onRefresh: formen });
          })
          .catch(stattBild);
      },
      { rootMargin: "50% 0px" },
    );
    const beobachten = () => naehe.observe(el);
    if (document.documentElement.classList.contains(START_FERTIG_KLASSE)) beobachten();
    else window.addEventListener(START_FERTIG, beobachten, { once: true });
    return () => {
      vorbei = true;
      window.removeEventListener(START_FERTIG, beobachten);
      naehe.disconnect();
      scroll?.kill();
      szene?.ende();
      delete el.dataset.licht;
      delete el.dataset.still;
    };
  }, []);

  return (
    <section ref={wurzel} className="ag-ueber" aria-label="Unser Versprechen in vier Wörtern">
      <div ref={halter} className="ag-ueber__licht" aria-hidden="true">
        <span ref={platz} className="ag-ueber__platz" />
      </div>
      <ul className="ag-ueber__worte">
        {worte.map((w, i) => (
          <li key={w} className="ag-versal" style={{ "--i": i } as CSSProperties}>
            {w}
          </li>
        ))}
      </ul>
    </section>
  );
}
