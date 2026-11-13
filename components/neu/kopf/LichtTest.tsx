"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import lichtBild from "@/public/kopf/licht-logo.jpg";
import { Leuchtstern } from "../seite/Leuchtstern";
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
 *
 * Mit ?ebene=kern oder ?ebene=ganz (dazu &zeit=…, &groesse=…) zeigt die Seite nur den Stern, ohne
 * oder mit den langen Strahlen, still und ohne Korn: Davon sind die Bilder des leichten Sterns aus
 * dem Wörter-Feld und dem Fuß aufgenommen (public/stern/*.webp, seite/Leuchtstern.tsx). Mit
 * &korn=1 bleibt das Korn an. Mit ?ebene=alles lebt derselbe Stern als echte Licht-Szene: das
 * Vorbild, mit dem der leichte Stern abgeglichen ist. Mit ?ebene=leicht steht an derselben Stelle
 * der leichte Stern selbst (ohne Licht-Szene), zum Vergleich Seite an Seite.
 */
export function LichtTest() {
  const halter = useRef<HTMLDivElement>(null);
  const platz = useRef<HTMLDivElement>(null);
  // Ändert der Besucher „weniger Bewegung“ oder das Zeigegerät, wird neu eingerichtet.
  const [einstellung, setEinstellung] = useState(0);
  // ?ebene=leicht: statt der Licht-Szene der leichte Stern (erst im Browser bekannt).
  const leicht = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get("ebene") === "leicht",
    () => false,
  );

  useEffect(() => {
    const el = halter.current;
    const anker = platz.current;
    if (!el || !anker) return;
    let szene: LichtSzene | undefined;
    let vorbei = false;
    const abfrage = new URLSearchParams(window.location.search);
    const ebene = abfrage.get("ebene");
    const groesse = Number(abfrage.get("groesse"));
    if (ebene && groesse > 0) el.style.setProperty("--licht", `${groesse}px`);
    if (ebene === "leicht") return;
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
          const wunsch = abfrage.get("wand");
          const wand = wunsch && /^[0-9a-f]{6}$/i.test(wunsch) ? parseInt(wunsch, 16) : 0x000000;
          // ?nur=stern zeigt den ersten Zustand der Startanimation: nur der Stern, Balken zu, keine
          // langen Strahlen. Davon wird das Stern-Bild aufgenommen (public/kopf/licht-stern.webp).
          const nurStern = abfrage.get("nur") === "stern";
          // ?ebene=kern|ganz|alles: die Szene nur mit dem Stern (Bilder und Vorbild des leichten Sterns).
          if (ebene === "kern" || ebene === "ganz" || ebene === "alles") {
            const aufnahme = ebene === "alles" ? undefined : { teil: ebene === "kern" ? ("kern" as const) : ("ganz" as const), zeit: Number(abfrage.get("zeit")) || 0, korn: abfrage.has("korn") };
            szene = starteLichtSzene(el, anker, { proben: 80, wand, maus: false, nurStern: true, aufnahme });
            szene.sternForm(1, 1, 0);
            szene.pegel(1);
            return;
          }
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
      <div ref={platz} className="ag-lichttest__platz">
        {leicht ? <Leuchtstern /> : null}
      </div>
    </div>
  );
}
