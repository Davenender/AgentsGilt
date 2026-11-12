"use client";

import { useEffect, useRef } from "react";
import { istVorschau } from "../umgebung";
import { erzeugeZeichenbild } from "./zeichenbild";

/**
 * Eine Nummer (01–06) als kleines Zeichen-Bild (Technik: zeichenbild.ts). Kommt sie ins Bild, setzt
 * sie sich aus Staub zusammen. Fährt die Maus auf die Karte, zerfällt sie kurz zu Staub und setzt
 * sich nach 260 ms neu zusammen. Für Vorleseprogramme ist sie Schmuck (die Reihenfolge der Liste
 * sagt dasselbe).
 */
export function ZeichenNummer({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const leinwand = ref.current;
    if (!leinwand) return;
    const stil = getComputedStyle(leinwand);
    const still = istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bild = erzeugeZeichenbild(leinwand, {
      zelle: [6, 9.5],
      mono: stil.getPropertyValue("--font-mono-ag").trim() || "monospace",
      still,
    });
    if (!bild) return;
    const serife = stil.getPropertyValue("--font-serife").trim() || "Georgia, serif";
    let vorbei = false;
    let uhr = 0;
    let imBild = false;
    const einrichten = () => {
      const b = leinwand.clientWidth;
      const h = leinwand.clientHeight;
      if (b < 2 || h < 2) return;
      bild.einrichten(b, h, [
        (c, breite, hoehe) => {
          // Die Nummer in kursiver Serifenschrift, so groß wie die Fläche hoch ist.
          c.font = `italic 400 ${Math.round(hoehe * 1.04)}px ${serife}`;
          c.textAlign = "left";
          c.textBaseline = "alphabetic";
          // Etwas kräftiger gezeichnet: So bleiben die feinen Striche der Serifenschrift im kleinen Raster erhalten.
          c.lineJoin = "round";
          c.lineWidth = hoehe * 0.05;
          c.strokeText(text, breite * 0.05, hoehe * 0.87);
          c.fillText(text, breite * 0.05, hoehe * 0.87);
        },
      ]);
      if (imBild || still) bild.zeige(0, true);
    };
    // Erst zeichnen, wenn die Serifenschrift da ist.
    const schrift = document.fonts?.load ? document.fonts.load(`400 40px ${serife}`, text).catch(() => undefined) : Promise.resolve(undefined);
    schrift.then(() => {
      if (!vorbei) einrichten();
    });
    const groesse = new ResizeObserver(() => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(einrichten, 200);
    });
    groesse.observe(leinwand);
    const waechter = new IntersectionObserver(
      (eintraege) => {
        const e = eintraege[eintraege.length - 1];
        bild.sichtbar(e.isIntersecting);
        // Ist sie zu 60 % im Bild, setzt sie sich zusammen.
        if (e.intersectionRatio >= 0.6 && !imBild) {
          imBild = true;
          bild.zeige(0);
        }
      },
      { threshold: [0, 0.6] },
    );
    waechter.observe(leinwand);
    // Maus auf der Karte: kurz zu Staub, nach 260 ms wieder da.
    const karte = leinwand.closest<HTMLElement>("[data-glimm]");
    let zurueck = 0;
    const rein = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || still || !imBild) return;
      window.clearTimeout(zurueck);
      bild.zerfalle();
      zurueck = window.setTimeout(() => bild.zeige(0), 260);
    };
    karte?.addEventListener("pointerenter", rein);
    return () => {
      vorbei = true;
      window.clearTimeout(uhr);
      window.clearTimeout(zurueck);
      groesse.disconnect();
      waechter.disconnect();
      karte?.removeEventListener("pointerenter", rein);
      bild.ende();
    };
  }, [text]);

  return <canvas ref={ref} className={`ag-znr ${className ?? ""}`} aria-hidden="true" />;
}
