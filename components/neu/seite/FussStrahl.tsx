"use client";

import { useEffect, useRef } from "react";
import { istVorschau } from "../umgebung";
import { erzeugeZeichenbild } from "./zeichenbild";

/**
 * Fußleiste: ein kleiner Strahl aus Schriftzeichen (dieselbe Technik wie die Nummern,
 * zeichenbild.ts) mit einem weichen Lichtschein dahinter. Kommt er ins Bild, setzt er sich aus
 * Staub zusammen; unter der Maus verwürfeln sich die Zeichen kurz.
 */
export function FussStrahl() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const leinwand = ref.current;
    if (!leinwand) return;
    const still = istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bild = erzeugeZeichenbild(leinwand, {
      zelle: [7, 11],
      mono: getComputedStyle(leinwand).getPropertyValue("--font-mono-ag").trim() || "monospace",
      ueberschuss: 1.4,
      still,
    });
    if (!bild) return;
    let uhr = 0;
    let da = false;
    const einrichten = () => {
      const b = leinwand.clientWidth;
      const h = leinwand.clientHeight;
      if (b < 2 || h < 2) return;
      bild.einrichten(b, h, [
        (c, breite, hoehe) => {
          // Ein schräger Strahl, der von links unten nach rechts oben läuft und sich verjüngt
          // (die Form eines Logo-Balkens, lang gezogen), dazu zwei feine Nebenstrahlen.
          const strahl = (x0: number, y0: number, x1: number, y1: number, dick: number) => {
            const verlauf = c.createLinearGradient(x0, y0, x1, y1);
            verlauf.addColorStop(0, "rgba(255,255,255,0)");
            verlauf.addColorStop(0.18, "rgba(255,255,255,0.95)");
            verlauf.addColorStop(0.7, "rgba(255,255,255,0.7)");
            verlauf.addColorStop(1, "rgba(255,255,255,0)");
            c.strokeStyle = verlauf;
            c.lineCap = "round";
            c.lineWidth = dick;
            c.beginPath();
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
            c.stroke();
          };
          strahl(breite * 0.04, hoehe * 0.92, breite * 0.96, hoehe * 0.1, hoehe * 0.2);
          strahl(breite * 0.2, hoehe * 0.98, breite * 0.82, hoehe * 0.42, hoehe * 0.07);
          strahl(breite * 0.12, hoehe * 0.6, breite * 0.7, hoehe * 0.06, hoehe * 0.06);
        },
      ]);
      if (da || still) bild.zeige(0, true);
    };
    einrichten();
    const groesse = new ResizeObserver(() => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(einrichten, 200);
    });
    groesse.observe(leinwand);
    const waechter = new IntersectionObserver(
      (eintraege) => {
        const e = eintraege[eintraege.length - 1];
        bild.sichtbar(e.isIntersecting);
        if (e.intersectionRatio >= 0.6 && !da) {
          da = true;
          bild.zeige(0);
        }
      },
      { threshold: [0, 0.6] },
    );
    waechter.observe(leinwand);
    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = leinwand.getBoundingClientRect();
      bild.zeiger(ev.clientX - r.left, ev.clientY - r.top, true);
    };
    const weg = () => bild.zeiger(-9999, -9999, false);
    leinwand.addEventListener("pointermove", bewegt);
    leinwand.addEventListener("pointerleave", weg);
    return () => {
      window.clearTimeout(uhr);
      groesse.disconnect();
      waechter.disconnect();
      leinwand.removeEventListener("pointermove", bewegt);
      leinwand.removeEventListener("pointerleave", weg);
      bild.ende();
    };
  }, []);

  return (
    <div className="ag-fstrahl" aria-hidden="true">
      <span className="ag-fstrahl__schein" />
      <canvas ref={ref} className="ag-fstrahl__zeichen" />
    </div>
  );
}
