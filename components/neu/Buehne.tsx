"use client";

import { useId, useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { istVorschau, willWenigerBewegung, zufall } from "./umgebung";

gsap.registerPlugin(useGSAP);

type Props = {
  className?: string;
  /** Das Zeichen in der Mitte der Punktwolke. */
  children?: ReactNode;
  punkte?: number;
  /** Radius des Rings als Anteil der Bühnenbreite. */
  radius?: number;
  /** Streckung des Rings in die Breite und Stauchung in die Höhe. */
  strecken?: number;
  flach?: number;
  kippung?: number;
  /** Wie breit das Band der Punkte um den Ring streut (0.05 = schmal). */
  streuung?: number;
  /** Mitte des Rings als Anteil der Bühnenhöhe. */
  mitteY?: number;
  baender?: boolean;
};

type Punkt = { winkel: number; abstand: number; groesse: number; glanz: number; gold: boolean; tempo: number };

const BAND_VORN = "M230,317C470,95 610,415 760,237S1050,73 1236,263";
const BAND_HINTEN = "M300,141C520,275 640,41 820,191S1040,365 1180,159";

/**
 * Bühne des Zeichens: ein Ring aus Punkten, der das Zeichen umkreist (hinten
 * vorbei und vorn vorbei), dazu zwei Lichtbänder. Die Punkte weichen dem
 * Zeiger aus und leuchten in seiner Nähe auf („Licht folgt dem Zeiger“).
 *
 * Leicht gehalten: einfache 2D-Leinwand, läuft nur im Bild. Am Handy, bei
 * „weniger Bewegung“ und in der Vorschau wird ein einziges Standbild gezeichnet.
 */
export function Buehne({
  className,
  children,
  punkte = 440,
  radius = 0.17,
  strecken = 1.95,
  flach = 0.5,
  kippung = 0.1,
  streuung = 0.19,
  mitteY = 0.5,
  baender = true,
}: Props) {
  const wurzel = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useGSAP(
    () => {
      const el = wurzel.current;
      const hinten = el?.querySelector<HTMLCanvasElement>("canvas.ag-buehne__hinten");
      const vorn = el?.querySelector<HTMLCanvasElement>("canvas.ag-buehne__vorn");
      const stiftH = hinten?.getContext("2d");
      const stiftV = vorn?.getContext("2d");
      if (!el || !hinten || !vorn || !stiftH || !stiftV) return;

      const schmal = window.matchMedia("(max-width: 767px)").matches;
      const still = schmal || willWenigerBewegung() || istVorschau();
      const wuerfel = zufall(7);
      const gauss = () => (wuerfel() + wuerfel() + wuerfel() + wuerfel() - 2) / 2;
      const menge = schmal ? Math.round(punkte * 0.32) : punkte;
      const ring: Punkt[] = Array.from({ length: menge }, () => ({
        winkel: wuerfel() * Math.PI * 2,
        abstand: 1 + gauss() * streuung * 1.7,
        groesse: [0.9, 1.1, 1.3, 1.6, 2.1][Math.floor(wuerfel() * 5)],
        glanz: 0.6 + wuerfel() * 0.4,
        gold: wuerfel() < 0.3,
        tempo: 0.018 + wuerfel() * 0.03,
      }));
      const ferne = Array.from({ length: schmal ? 24 : 70 }, () => ({
        x: wuerfel(),
        y: wuerfel() * 0.8,
        groesse: [0.7, 0.9, 1.2][Math.floor(wuerfel() * 3)],
        glanz: 0.08 + wuerfel() * 0.2,
      }));

      let breite = 0;
      let hoehe = 0;
      const zeiger = { x: -9999, y: -9999 };
      const schub = { x: 0, y: 0 };

      const zeichne = (zeit: number) => {
        const cx = breite / 2 + schub.x;
        const cy = hoehe * mitteY + schub.y;
        const basis = breite * radius;
        stiftH.clearRect(0, 0, breite, hoehe);
        stiftV.clearRect(0, 0, breite, hoehe);

        stiftH.fillStyle = "#e8e6e1";
        for (const f of ferne) {
          stiftH.globalAlpha = f.glanz;
          stiftH.beginPath();
          stiftH.arc(f.x * breite, f.y * hoehe, f.groesse, 0, Math.PI * 2);
          stiftH.fill();
        }

        for (const p of ring) {
          const w = p.winkel + zeit * p.tempo;
          const tiefe = Math.sin(w);
          const r = basis * p.abstand;
          let x = cx + Math.cos(w) * r * strecken;
          let y = cy + tiefe * r * flach + Math.cos(w) * r * kippung;
          let hell = 0.22 + ((0.62 * (tiefe + 1)) / 2) * p.glanz;

          const dx = x - zeiger.x;
          const dy = y - zeiger.y;
          const d = Math.hypot(dx, dy);
          if (d < 120) {
            const kraft = 1 - d / 120;
            x += (dx / (d || 1)) * kraft * 16;
            y += (dy / (d || 1)) * kraft * 16;
            hell = Math.min(1, hell + kraft * 0.45);
          }

          const stift = tiefe > 0 ? stiftV : stiftH;
          stift.globalAlpha = hell;
          stift.fillStyle = p.gold ? "#f3d27a" : "#e8e6e1";
          stift.beginPath();
          stift.arc(x, y, p.groesse * (tiefe > 0 ? 1.25 : 1), 0, Math.PI * 2);
          stift.fill();
        }
      };

      const messen = () => {
        const r = el.getBoundingClientRect();
        const dichte = Math.min(window.devicePixelRatio || 1, 2);
        breite = r.width;
        hoehe = r.height;
        for (const [leinwand, stift] of [
          [hinten, stiftH],
          [vorn, stiftV],
        ] as const) {
          leinwand.width = Math.round(breite * dichte);
          leinwand.height = Math.round(hoehe * dichte);
          stift.setTransform(dichte, 0, 0, dichte, 0, 0);
        }
        if (still) zeichne(0);
      };
      const groesse = new ResizeObserver(messen);
      groesse.observe(el);
      messen();

      if (still) return () => groesse.disconnect();

      // Das Licht wandert langsam die Bänder entlang.
      const lichter = gsap.utils.toArray<SVGLinearGradientElement>("linearGradient", el);
      const lichtlauf = lichter.length
        ? gsap.fromTo(
            lichter,
            { attr: { gradientTransform: "translate(-0.22 0)" } },
            { attr: { gradientTransform: "translate(0.22 0)" }, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true },
          )
        : undefined;

      // Außerhalb des Bildes ruht alles: Leinwand und Lichtlauf.
      let sichtbar = true;
      const waechter = new IntersectionObserver(([eintrag]) => {
        sichtbar = eintrag.isIntersecting;
        lichtlauf?.paused(!sichtbar);
      });
      waechter.observe(el);

      const bewegt = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        zeiger.x = e.clientX - r.left;
        zeiger.y = e.clientY - r.top;
      };
      const fein = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (fein) window.addEventListener("pointermove", bewegt, { passive: true });

      const takt = (zeit: number) => {
        if (!sichtbar) return;
        // Der ganze Ring gibt dem Zeiger ein wenig nach.
        const zielX = fein && zeiger.x > -999 ? (zeiger.x - breite / 2) * 0.03 : 0;
        const zielY = fein && zeiger.y > -999 ? (zeiger.y - hoehe * mitteY) * 0.03 : 0;
        schub.x += (zielX - schub.x) * 0.05;
        schub.y += (zielY - schub.y) * 0.05;
        zeichne(zeit);
      };
      gsap.ticker.add(takt);

      return () => {
        gsap.ticker.remove(takt);
        groesse.disconnect();
        waechter.disconnect();
        window.removeEventListener("pointermove", bewegt);
      };
    },
    { scope: wurzel },
  );

  const band = (pfad: string, ebene: string) => (
    <svg className={`ag-buehne__baender ${ebene}`} viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d={pfad} fill="none" stroke={`url(#${id}l)`} strokeWidth="9" opacity="0.28" filter={`url(#${id}w)`} />
      <path d={pfad} fill="none" stroke={`url(#${id}l)`} strokeWidth="1.8" />
    </svg>
  );

  return (
    <div ref={wurzel} className={`ag-buehne ${className ?? ""}`} style={{ "--mitte-y": `${mitteY * 100}%` } as React.CSSProperties}>
      {baender && (
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <defs>
            <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f3d27a" stopOpacity="0" />
              <stop offset="0.35" stopColor="#f3d27a" stopOpacity="0.9" />
              <stop offset="0.7" stopColor="#fff3cf" stopOpacity="0.95" />
              <stop offset="1" stopColor="#f3d27a" stopOpacity="0" />
            </linearGradient>
            <filter id={`${id}w`} x="-10%" y="-60%" width="120%" height="220%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
        </svg>
      )}
      <canvas className="ag-buehne__hinten" aria-hidden="true" />
      {baender && band(BAND_HINTEN, "")}
      {children && <div className="ag-buehne__mitte">{children}</div>}
      {baender && band(BAND_VORN, "ag-buehne__vorn")}
      <canvas className="ag-buehne__vorn" aria-hidden="true" />
    </div>
  );
}
