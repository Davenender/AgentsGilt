"use client";

import { useEffect, useRef } from "react";
import { START_FERTIG, START_FERTIG_KLASSE } from "../umgebung";
import { Lichtleiste } from "./Lichtleiste";

// So lange nach der Landung des Namens erscheint die Leiste (wenn man dann noch ganz oben steht).
const WARTEN = 2000;

/**
 * Scroll-Hinweis nur aus Licht, ohne Text und ohne Pfeil: Am unteren Bildschirmrand liegt eine
 * durchgehende, leuchtende Leiste über die ganze Breite (Lichtleiste.tsx). Sie bewegt sich nicht
 * seitlich; sie atmet nur ganz leicht von unten nach oben (Höhe und Helligkeit, 3 s je Atemzug),
 * höchstens dreimal, und blendet dann wieder aus (Stylesheet).
 *
 * Sie erscheint bei jedem Seitenaufruf 2 s nach der Landung des Namens, wenn man dann noch ganz
 * oben steht. Beim ersten Scrollen ist sie sofort weg und kommt bei diesem Aufruf nicht wieder.
 * Nur echtes Scrollen zählt: Während der Startanimation ist das Scrollen gesperrt, ein Dreh am
 * Mausrad oder ein Tastendruck in dieser Zeit nimmt die Leiste also nicht weg. (Früher merkte sie
 * sich das erste Scrollen für die ganze Sitzung des Tabs und verschwand schon bei Mausrad oder
 * Taste während des Starts: Deshalb kam sie nach dem ersten Besuch nie wieder.)
 * Bei „weniger Bewegung“ steht nur ein ruhiger, schwacher Schein.
 */
export function ScrollHinweis() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let weg = false;
    let uhr = 0;
    const planen = () => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(() => {
        if (!weg && window.scrollY <= 24) el.dataset.an = "1";
      }, WARTEN);
    };
    const beimScrollen = () => {
      if (weg || window.scrollY <= 24) return;
      weg = true;
      window.clearTimeout(uhr);
      delete el.dataset.an;
      abbau();
    };
    const abbau = () => {
      window.removeEventListener(START_FERTIG, planen);
      window.removeEventListener("scroll", beimScrollen);
    };
    // Die Wartezeit zählt ab der Landung des Namens („Start fertig“).
    if (document.documentElement.classList.contains(START_FERTIG_KLASSE)) planen();
    else window.addEventListener(START_FERTIG, planen, { once: true });
    window.addEventListener("scroll", beimScrollen, { passive: true });
    return () => {
      window.clearTimeout(uhr);
      abbau();
      delete el.dataset.an;
    };
  }, []);

  return (
    <div ref={ref} className="ag-hinweis" aria-hidden="true">
      <Lichtleiste />
    </div>
  );
}
