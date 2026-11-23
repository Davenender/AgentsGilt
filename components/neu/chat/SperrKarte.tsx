"use client";

// Die Sperr-Karte über dem Eingabefeld (Prompt 18b, 23.11.2026): ersetzt die Sperr-Zeile bei jedem Grund, auch im
// Team-Chat ohne Uhr. Rotes Milchglas, etwa 58 px hoch; darin Schloss, Grund und (mit Uhr) die Restzeit mit
// kippenden Ziffern, immer gut lesbar (leichter Schatten). Hinter dem Glas eine Lavalampe (lava.ts): zwei rote
// Kugeln schweben, prallen ab, verschmelzen, atmen. Darüberfahren: „Venom“ (die Kugeln wachsen mit Ranken über die
// ganze Karte), Wegfahren: sie ziehen sich zurück; am Handy ein Tippen, dann 1,6 s. Nichts blinkt.
//
// Leicht: eine kleine Leinwand (ein Bildpunkt je 2 × 2 CSS-Pixel), nur solange die Karte zu sehen und der Tab offen
// ist. Weniger Bewegung: Die Kugeln stehen still, ein ruhiger Schein, kein Venom.
import { useEffect, useRef, type ReactNode } from "react";
import { TIPP_MS, neueLava, schritt, zeichne, type Lava } from "./lava";

const ZELLE = 2;

export function SperrKarte({ ruhig, children }: { ruhig: boolean; children: ReactNode }) {
  const karte = useRef<HTMLDivElement>(null);
  const leinwand = useRef<HTMLCanvasElement>(null);
  const lava = useRef<Lava | null>(null);
  const tipp = useRef(0);

  useEffect(() => {
    const k = karte.current;
    const c = leinwand.current;
    const ctx = c?.getContext("2d");
    if (!k || !c || !ctx) return;
    let gw = 0;
    let gh = 0;
    let bild: ImageData | null = null;
    let raf = 0;
    let t0 = 0;
    let sichtbar = true;
    const male = (t: number) => {
      if (!lava.current || !bild) return;
      zeichne(lava.current, t / 1000, bild.data, gw, gh, ZELLE);
      ctx.putImageData(bild, 0, 0);
    };
    const mess = () => {
      const r = k.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      const nw = Math.ceil(w / ZELLE);
      const nh = Math.ceil(h / ZELLE);
      if (nw !== gw || nh !== gh) {
        gw = nw;
        gh = nh;
        c.width = gw;
        c.height = gh;
        bild = ctx.createImageData(gw, gh);
      }
      if (!lava.current) lava.current = neueLava(w, h);
      else Object.assign(lava.current, { w, h });
      if (ruhig || !raf) male(performance.now());
    };
    const bildchen = (t: number) => {
      raf = 0;
      const l = lava.current;
      if (!l) return;
      schritt(l, t0 ? (t - t0) / 1000 : 0);
      t0 = t;
      male(t);
      plane();
    };
    const laeuft = () => !ruhig && sichtbar && !document.hidden;
    const plane = () => {
      if (!raf && laeuft()) raf = requestAnimationFrame(bildchen);
    };
    const halt = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      t0 = 0;
    };
    mess();
    const ro = new ResizeObserver(mess);
    ro.observe(k);
    const io = new IntersectionObserver(([e]) => {
      sichtbar = e?.isIntersecting ?? true;
      if (laeuft()) plane();
      else halt();
    });
    io.observe(k);
    const tab = () => (laeuft() ? plane() : halt());
    document.addEventListener("visibilitychange", tab);
    plane();
    return () => {
      halt();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", tab);
      window.clearTimeout(tipp.current);
    };
  }, [ruhig]);

  const ziel = (z: number) => {
    if (!ruhig && lava.current) lava.current.ziel = z;
  };

  return (
    <div
      ref={karte}
      className="ag-cf__sperrkarte"
      role="status"
      onPointerEnter={(e) => e.pointerType === "mouse" && ziel(1)}
      onPointerLeave={(e) => e.pointerType === "mouse" && ziel(0)}
      onPointerDown={(e) => {
        // Am Handy (Finger, Stift): ein Tippen lässt das Venom 1,6 s stehen.
        if (e.pointerType === "mouse") return;
        ziel(1);
        window.clearTimeout(tipp.current);
        tipp.current = window.setTimeout(() => ziel(0), TIPP_MS);
      }}
    >
      <canvas ref={leinwand} className="ag-cf__lava" aria-hidden="true" />
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
