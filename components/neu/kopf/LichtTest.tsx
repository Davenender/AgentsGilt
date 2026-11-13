"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import lichtBild from "@/public/kopf/licht-logo.jpg";
import type { LichtSzene } from "./lichtszene";

/**
 * Testseite für das Licht allein (/varianten/licht-test): nur die schwarze Wand
 * mit Logo-Loch, die Lichtscheibe, God Rays und Filmkorn. Kein Name, keine
 * Kopfleiste. Hier wird das Licht mit dem Vorbild abgeglichen, bevor es in den
 * Kopfbereich kommt.
 *
 * Bei „weniger Bewegung“ (und wenn das Gerät die Szene nicht zeichnen kann)
 * steht auch hier nur das ruhige Bild. Mit ?nur=stern leuchtet nur der Stern
 * (Anfang der Startanimation).
 */
export function LichtTest() {
  const halter = useRef<HTMLDivElement>(null);
  const platz = useRef<HTMLDivElement>(null);
  // Ändert der Besucher „weniger Bewegung“ oder das Zeigegerät, wird neu eingerichtet.
  const [einstellung, setEinstellung] = useState(0);

  useEffect(() => {
    const el = halter.current;
    const anker = platz.current;
    if (!el || !anker) return;
    let szene: LichtSzene | undefined;
    let vorbei = false;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fein = window.matchMedia("(hover: hover) and (pointer: fine)");
    const neuEinrichten = () => setEinstellung((n) => n + 1);
    ruhig.addEventListener("change", neuEinrichten);
    fein.addEventListener("change", neuEinrichten);

    const stattBild = () => {
      if (vorbei) return;
      szene?.ende();
      szene = undefined;
      el.dataset.still = "1";
    };
    if (ruhig.matches) {
      el.dataset.still = "1";
    } else {
      delete el.dataset.still;
      const maus = fein.matches;
      import("./lichtszene")
        .then(({ starteLichtSzene }) => {
          if (vorbei) return;
          // Zum Vergleich mit dem Kopfbereich lässt sich die Wandfarbe mitgeben: ?wand=070b16
          const wunsch = new URLSearchParams(window.location.search).get("wand");
          const wand = wunsch && /^[0-9a-f]{6}$/i.test(wunsch) ? parseInt(wunsch, 16) : 0x000000;
          // ?nur=stern zeigt den ersten Zustand der Startanimation: nur der Stern, Balken zu, keine
          // langen Strahlen. Davon wird das Stern-Bild aufgenommen (public/kopf/licht-stern.webp).
          const nurStern = new URLSearchParams(window.location.search).get("nur") === "stern";
          szene = starteLichtSzene(el, anker, { proben: maus ? 80 : 60, wand, maus, beiAusfall: stattBild, ...(nurStern ? { stufen: { stern: 1, zeiten: [0.7, 0.6, 1.2] as [number, number, number] } } : {}) });
          if (nurStern) szene.pegel(0);
          else szene.zeigen(true);
        })
        .catch(stattBild);
    }
    return () => {
      vorbei = true;
      ruhig.removeEventListener("change", neuEinrichten);
      fein.removeEventListener("change", neuEinrichten);
      szene?.ende();
    };
  }, [einstellung]);

  return (
    <div ref={halter} className="ag-lichttest" aria-hidden="true">
      <Image className="ag-lichttest__bild" src={lichtBild} alt="" sizes="(max-width: 767px) 150vw, min(72vw, 1260px)" loading="lazy" />
      <div ref={platz} className="ag-lichttest__platz" />
    </div>
  );
}
