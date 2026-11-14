"use client";

import { useEffect, useRef } from "react";
import { START_FREI, START_FREI_KLASSE } from "../umgebung";
import { Lichtleiste } from "./Lichtleiste";

// So lange nach dem Ende der Startanimation erscheint die Leiste (wenn man dann noch ganz oben steht).
const WARTEN = 3000;
// So lange blendet sie beim ersten Scrollen aus (wie im Stylesheet); danach ruht alles.
const AUSBLENDEN = 1200;

/**
 * Scroll-Hinweis nur aus Licht, ohne Text und ohne Pfeil: Am unteren Bildschirmrand liegt eine
 * durchgehende, leuchtende Leiste über die ganze Breite (Lichtleiste.tsx). Sie bewegt sich nicht
 * seitlich; sie atmet nur ganz leicht von unten nach oben (Höhe und Helligkeit, 3 s je Atemzug).
 *
 * Sie blendet 3 s nach dem Ende der Startanimation weich ein (Name gelandet, Welle durch: ab da
 * kann man scrollen), wenn man dann noch ganz oben steht. Danach atmet sie ununterbrochen weiter,
 * bis gescrollt wird. Beim ersten Scrollen blendet sie langsam aus (1,2 s) und kommt bei diesem
 * Seitenaufruf nicht wieder, auch nicht, wenn man wieder hochscrollt. Nur echtes Scrollen zählt:
 * Während der Startanimation ist das Scrollen gesperrt. Nach einem neuen Laden kommt sie wieder.
 * (Früher merkte sie sich das erste Scrollen für die ganze Sitzung des Tabs: Deshalb kam sie nach
 * dem ersten Besuch nie wieder.)
 * Bei „weniger Bewegung“ steht nur ein ruhiger, schwacher Schein.
 */
export function ScrollHinweis() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let weg = false;
    let uhr = 0;
    let ruhe = 0;
    const planen = () => {
      window.clearTimeout(uhr);
      if (weg) return;
      // Die Wartezeit beginnt mit jeder Freigabe neu: Läuft die Startanimation noch einmal (etwa
      // nach „Zurück“ aus dem Zwischenspeicher des Browsers), kommt auch die Leiste erst danach wieder.
      delete el.dataset.an;
      uhr = window.setTimeout(() => {
        if (!weg && window.scrollY <= 24) el.dataset.an = "1";
      }, WARTEN);
    };
    const beimScrollen = () => {
      if (weg || window.scrollY <= 24) return;
      weg = true;
      window.clearTimeout(uhr);
      abbau();
      if (!el.dataset.an) return;
      // Langsam ausblenden; sie atmet dabei weiter und ruht erst, wenn sie nicht mehr zu sehen ist.
      el.dataset.an = "weg";
      ruhe = window.setTimeout(() => delete el.dataset.an, AUSBLENDEN + 100);
    };
    const abbau = () => {
      window.removeEventListener(START_FREI, planen);
      window.removeEventListener("scroll", beimScrollen);
    };
    // Die Wartezeit zählt ab dem Ende der Startanimation („Start frei“).
    if (document.documentElement.classList.contains(START_FREI_KLASSE)) planen();
    window.addEventListener(START_FREI, planen);
    window.addEventListener("scroll", beimScrollen, { passive: true });
    return () => {
      window.clearTimeout(uhr);
      window.clearTimeout(ruhe);
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
