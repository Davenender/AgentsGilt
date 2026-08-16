"use client";

import { useEffect, useState } from "react";

/**
 * Punkte-Leiste am rechten Rand, nur auf dem Handy.
 *
 * Auf kleinen Bildschirmen liegen die sechs Leistungen untereinander — beim
 * Scrollen verliert man leicht den Überblick, die wievielte man gerade sieht
 * und wie viele noch kommen. Die Leiste zeigt beides auf einen Blick, wie die
 * Seitenpunkte auf dem iPhone-Homescreen.
 *
 * Sie erscheint nur, solange man sich wirklich in der Leistungen-Sektion
 * befindet — sonst würde sie den Rest der Seite überlagern.
 */
export function ServiceProgress({ count }: { count: number }) {
  const [aktiv, setAktiv] = useState(0);
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    // Karten und Sektion bei JEDER Messung neu abfragen statt einmal beim
    // Mounten: Diese Komponente wird zusammen mit den Karten gerendert, steht
    // beim ersten Durchlauf also unter Umständen noch vor ihnen im DOM.
    // Bewusst ohne requestAnimationFrame gedrosselt: Bei sechs Karten kostet
    // die Messung praktisch nichts, und rAF läuft in Hintergrund-Tabs gar
    // nicht — die Leiste stünde dann beim Zurückkehren auf altem Stand.
    const messen = () => {
      const karten = document.querySelectorAll<HTMLElement>(
        "[data-service-index]",
      );
      const sektion = document.getElementById("leistungen");
      if (karten.length === 0 || !sektion) {
        setSichtbar(false);
        return;
      }

      const mitte = window.innerHeight / 2;

      // Welche Karte ist der Bildschirmmitte am nächsten? Das ist zuverlässiger
      // als "welche ist sichtbar" — beim schnellen Scrollen sind oft mehrere
      // gleichzeitig im Bild.
      let beste = 0;
      let kleinsterAbstand = Infinity;
      karten.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const abstand = Math.abs(r.top + r.height / 2 - mitte);
        if (abstand < kleinsterAbstand) {
          kleinsterAbstand = abstand;
          beste = i;
        }
      });
      setAktiv(beste);

      const s = sektion.getBoundingClientRect();
      // Sichtbar, solange die Sektion den mittleren Bildschirmbereich füllt.
      setSichtbar(s.top < mitte && s.bottom > mitte);
    };

    messen();
    window.addEventListener("scroll", messen, { passive: true });
    window.addEventListener("resize", messen, { passive: true });
    return () => {
      window.removeEventListener("scroll", messen);
      window.removeEventListener("resize", messen);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed right-2.5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 transition-opacity duration-300 sm:hidden ${
        sichtbar ? "opacity-100" : "opacity-0"
      }`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ${
            i === aktiv
              ? "h-5 w-1.5 bg-gold"
              : "h-1.5 w-1.5 bg-ink/25"
          }`}
        />
      ))}
    </div>
  );
}
