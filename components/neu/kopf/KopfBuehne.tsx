"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { BALKEN, STERN } from "../Marke";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE } from "../umgebung";
import { starteEinfach } from "./einfach";
import type { Szene, SzenenArt } from "./szene";

type Modus = "warten" | "3d" | "einfach";

/**
 * Bühne des Kopfbereichs: liegt über die ganze Fläche des Kopfbereichs.
 *
 * Am Computer (ab 768 px, ohne „weniger Bewegung“) wird die 3D-Szene geladen
 * (szene.ts, eigenes Paket, das nur dann nachgeladen wird). Am Handy und bei
 * „weniger Bewegung“ läuft stattdessen das leichte Ersatzbild (einfach.ts).
 * Bis die Szene bereit ist und wenn sie gar nicht starten kann, steht das
 * Zeichen als Bild im Platzhalter (KopfAnker); nichts bleibt leer.
 *
 * Der Zustand steht als data-kb am Kopfbereich: „warten“, „3d“ oder „einfach“.
 */
const VOLL = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

// Erst im Browser entscheiden, was gezeigt wird (auf dem Server: „warten“).
function abonnieren(melden: () => void) {
  const abfrage = window.matchMedia(VOLL);
  abfrage.addEventListener("change", melden);
  return () => abfrage.removeEventListener("change", melden);
}
const imBrowser = (): Modus => (window.matchMedia(VOLL).matches ? "3d" : "einfach");
const aufDemServer = (): Modus => "warten";

export function KopfBuehne({ art }: { art: SzenenArt }) {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const passend = useSyncExternalStore(abonnieren, imBrowser, aufDemServer);
  // Kann die 3D-Szene nicht starten, bleibt es beim ruhigen Ersatzbild.
  const [ohne3d, setOhne3d] = useState(false);
  const modus: Modus = passend === "3d" && ohne3d ? "einfach" : passend;

  useEffect(() => {
    const el = leinwand.current;
    const held = el?.closest<HTMLElement>(".ag-hero");
    const anker = held?.querySelector<HTMLElement>(".ag-kb__anker");
    if (!el || !held || !anker || modus === "warten") return;

    if (modus === "einfach") {
      held.dataset.kb = "einfach";
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return starteEinfach(el, anker, art, still);
    }

    let szene: Szene | undefined;
    let vorbei = false;
    let flug: ScrollTrigger | undefined;
    const auftritt = () => {
      if (!szene) return;
      held.dataset.kb = "3d";
      szene.zeigen();
    };

    import("./szene")
      .then(({ starteSzene }) => starteSzene(el, anker, art))
      .then((s) => {
        if (vorbei) {
          s.ende();
          return;
        }
        szene = s;
        held.dataset.kbBereit = "1";
        if (art === "tiefe") {
          flug = ScrollTrigger.create({
            trigger: held,
            start: "top top",
            end: "bottom top",
            onUpdate: (st) => s.scroll(st.progress),
          });
        }
        if (document.documentElement.classList.contains(INTRO_FERTIG_KLASSE)) auftritt();
        else window.addEventListener(INTRO_FERTIG, auftritt, { once: true });
      })
      .catch(() => {
        // Kein WebGPU und kein WebGL: dann eben das ruhige Ersatzbild.
        if (!vorbei) setOhne3d(true);
      });

    return () => {
      vorbei = true;
      window.removeEventListener(INTRO_FERTIG, auftritt);
      flug?.kill();
      szene?.ende();
      delete held.dataset.kb;
      delete held.dataset.kbBereit;
    };
  }, [modus, art]);

  return (
    <div className="ag-kb" data-weg={art === "tiefe" ? "flug" : "buehne"} aria-hidden="true">
      {/* Neue Leinwand je Modus: Eine Leinwand kann nicht zwischen 3D und 2D wechseln. */}
      {modus !== "warten" && <canvas key={modus} ref={leinwand} className="ag-kb__leinwand" />}
    </div>
  );
}

/**
 * Platz des Zeichens im Text. Die 3D-Szene setzt das glänzende Zeichen genau
 * hierhin. Bis dahin (und ohne Skript) steht hier das Zeichen als goldenes
 * Bild; im Ersatzbild am Handy als feine Linienzeichnung mit wanderndem Licht.
 */
export function KopfAnker({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div className={`ag-kb__anker ${className ?? ""}`} aria-hidden="true">
      <svg viewBox="-56 -56 112 112">
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff1c2" />
            <stop offset="0.38" stopColor="#d9ad4e" />
            <stop offset="0.55" stopColor="#8a611a" />
            <stop offset="0.72" stopColor="#e8c068" />
            <stop offset="1" stopColor="#f6dc96" />
          </linearGradient>
        </defs>
        <g className="ag-kb__voll">
          {BALKEN.map((p) => (
            <polygon key={p} points={p} fill={`url(#${id}g)`} />
          ))}
          <path d={STERN} fill="#f6efdc" />
        </g>
        <g className="ag-kb__linien">
          {BALKEN.map((p) => (
            <polygon key={p} points={p} />
          ))}
          <path d={STERN} />
        </g>
        <g className="ag-kb__lauf">
          {BALKEN.map((p) => (
            <polygon key={p} points={p} pathLength={100} />
          ))}
          <path d={STERN} pathLength={100} />
        </g>
      </svg>
    </div>
  );
}
