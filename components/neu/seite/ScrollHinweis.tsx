"use client";

import { useEffect, useRef } from "react";
import { START_FERTIG, START_FERTIG_KLASSE } from "../umgebung";
import { Lichtleiste } from "./Lichtleiste";

// Wer einmal gescrollt hat, sieht den Hinweis in dieser Sitzung nicht wieder.
const MERKER = "ag-scroll-hinweis-weg";
// So lange nach dem Ende der Startanimation erscheint er (wenn man ganz oben steht und nicht scrollt).
const WARTEN = 4500;

/**
 * Scroll-Hinweis nur aus Licht, ohne Text und ohne Pfeil: Am unteren Bildschirmrand liegt eine
 * durchgehende, leuchtende Leiste über die ganze Breite (Lichtleiste.tsx). Sie bewegt sich nicht
 * seitlich; sie atmet nur ganz leicht von unten nach oben (Höhe und Helligkeit, 3 s je Atemzug),
 * höchstens dreimal, und blendet dann wieder aus (Stylesheet). Sie erscheint 4,5 s nach der
 * Startanimation, wenn man ruhig ganz oben steht. Beim ersten Scrollen, Wischen oder Tastendruck
 * ist sie sofort weg und kommt in dieser Sitzung nicht wieder. Bei „weniger Bewegung“ steht nur
 * ein ruhiger, schwacher Schein.
 */
export function ScrollHinweis() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let weg = false;
    try {
      weg = sessionStorage.getItem(MERKER) === "1";
    } catch {
      /* Speicher gesperrt: dann eben ohne Merker */
    }
    if (weg) return;

    let uhr = 0;
    const planen = () => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(() => {
        if (!weg && window.scrollY <= 24) el.dataset.an = "1";
      }, WARTEN);
    };
    const aus = () => {
      if (weg) return;
      weg = true;
      window.clearTimeout(uhr);
      delete el.dataset.an;
      try {
        sessionStorage.setItem(MERKER, "1");
      } catch {
        /* ohne Merker */
      }
      abbau();
    };
    const beimScrollen = () => {
      if (window.scrollY > 24) aus();
    };
    const taste = (ev: KeyboardEvent) => {
      if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) aus();
    };
    const abbau = () => {
      window.removeEventListener(START_FERTIG, planen);
      window.removeEventListener("scroll", beimScrollen);
      window.removeEventListener("wheel", aus);
      window.removeEventListener("touchmove", aus);
      window.removeEventListener("keydown", taste);
    };
    // Erst nach der Startanimation zählt die Wartezeit; Scrollen, Wischen und Tasten gelten von Anfang an.
    if (document.documentElement.classList.contains(START_FERTIG_KLASSE)) planen();
    else window.addEventListener(START_FERTIG, planen, { once: true });
    window.addEventListener("scroll", beimScrollen, { passive: true });
    window.addEventListener("wheel", aus, { passive: true });
    window.addEventListener("touchmove", aus, { passive: true });
    window.addEventListener("keydown", taste);
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
