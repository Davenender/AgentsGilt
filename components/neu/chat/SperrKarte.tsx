"use client";

// Die Sperr-Karte über dem Eingabefeld (Prompt 18b, 23.11.2026; schlicht seit Prompt 18c, 24.11.2026): ersetzt die
// Sperr-Zeile bei jedem Grund, auch im Team-Chat ohne Uhr. Rotes, leicht milchiges Glas, ruhig und ohne Bewegung,
// etwa 46 px hoch; darin Schloss, Grund und (mit Uhr) die Restzeit mit kippenden Ziffern, immer gut lesbar (leichter
// Schatten). Die Lavalampe aus Prompt 18b ist auf Davids Wunsch ganz weg.
import { useEffect, useRef, type ReactNode } from "react";

export function SperrKarte({ children }: { children: ReactNode }) {
  return (
    <div className="ag-cf__sperrkarte" role="status">
      <span className="ag-cf__milchglas" aria-hidden="true" />
      <div className="ag-cf__sperrkarte-text">{children}</div>
    </div>
  );
}

/**
 * „Bitte bleib freundlich.“ (Prompt 18b): vibriert wie ein iPhone, dreimal: zweimal kurz (je 170 ms, 110 ms
 * dazwischen), leuchtet dabei rot auf und wieder aus, ruckt 2 px; dann 4 s Pause. Danach bleibt ein feiner roter
 * Rand. Werte wie im Probelauf (ease-out je Brummen). Nur dieser Hinweis vibriert, und nur, wenn er neu ist.
 */
export function Hinweis({ text, brummt }: { text: string; brummt: boolean }) {
  const zeile = useRef<HTMLParagraphElement>(null);
  const schein = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const p = zeile.current;
    const s = schein.current;
    if (!p || !s) return;
    if (!brummt || typeof p.animate !== "function") {
      p.dataset.fertig = "";
      return;
    }
    const ruck: Keyframe[] = [
      { transform: "translate3d(0, 0, 0)" },
      { transform: "translate3d(-2px, 0, 0)", offset: 0.25 },
      { transform: "translate3d(2px, 0, 0)", offset: 0.5 },
      { transform: "translate3d(-1px, 0, 0)", offset: 0.75 },
      { transform: "translate3d(0, 0, 0)" },
    ];
    // Der Schein: am stärksten bei einem Viertel, bei drei Vierteln noch knapp die Hälfte (Probelauf: 14 px → 6 px).
    const licht: Keyframe[] = [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.45, offset: 0.75 }, { opacity: 0 }];
    const laeufe: Animation[] = [];
    // Erst wenn der Hinweis eingeblendet ist (0,5 s, chat.css ag-cf-sperre), sonst stören sich beide Bewegungen.
    let at = 500;
    for (let r = 0; r < 3; r++) {
      for (let x = 0; x < 2; x++) {
        const t = { duration: 170, delay: at, easing: "ease-out" };
        laeufe.push(p.animate(ruck, t), s.animate(licht, t));
        at += 170 + (x === 0 ? 110 : 0);
      }
      at += 4000;
    }
    // Nach dem letzten Brummen bleibt der feine rote Rand.
    const fertig = window.setTimeout(() => (p.dataset.fertig = ""), at - 4000 + 50);
    return () => {
      window.clearTimeout(fertig);
      for (const a of laeufe) a.cancel();
    };
  }, [brummt]);
  return (
    <p ref={zeile} className="ag-cf__hinweis" role="status">
      <span ref={schein} className="ag-cf__hinweis-schein" aria-hidden="true" />
      {text}
    </p>
  );
}
