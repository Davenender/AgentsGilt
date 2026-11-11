"use client";

import Lenis from "lenis";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { fuss, hero, marke, navigation } from "@/lib/inhalt-neu";
import { Knopf } from "./Knoepfe";
import { Kopfleiste } from "./Kopfleiste";
import { Ladebildschirm } from "./Ladebildschirm";
import { Marke } from "./Marke";
import { istVorschau, willWenigerBewegung } from "./umgebung";

/**
 * Weiches Scrollen mit Lenis, im Takt von GSAP, damit ScrollTrigger und Lenis
 * dieselbe Uhr haben. Das Scrollen bleibt das normale Scrollen des Browsers
 * (kein Scroll-Zwang); bei „weniger Bewegung“ und in der Vorschau bleibt Lenis aus.
 */
function WeichesScrollen() {
  useEffect(() => {
    if (willWenigerBewegung() || istVorschau()) return;
    // allowNestedScroll: Das Chat-Fenster scrollt weiter für sich.
    const lenis = new Lenis({ anchors: true, allowNestedScroll: true, lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    const takt = (zeit: number) => lenis.raf(zeit * 1000);
    gsap.ticker.add(takt);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(takt);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
  return null;
}

/**
 * Anrufen-Knopf am Daumen (nur Handy): erscheint, sobald keine Anruf-Leiste
 * mehr im Bild ist. So bleibt Anrufen immer erreichbar, ohne doppelt zu stehen.
 */
function DaumenLeiste() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const imBild = new Set<Element>();
    const waechter = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) {
        if (e.isIntersecting) imBild.add(e.target);
        else imBild.delete(e.target);
      }
      el.setAttribute("data-da", String(imBild.size === 0));
    });
    document.querySelectorAll("main .ag-anruf, .ag-fuss").forEach((leiste) => waechter.observe(leiste));
    return () => waechter.disconnect();
  }, []);

  return (
    <div ref={ref} className="ag-daumen" data-da="false">
      <Knopf href={`tel:${marke.telefon}`}>{hero.anrufen}</Knopf>
    </div>
  );
}

function Fusszeile() {
  return (
    <footer className="ag-fuss">
      <div className="ag-wrap ag-fuss__oben">
        <div>
          <div className="ag-fuss__marke">
            <Marke />
            {marke.name}
          </div>
          <p className="ag-fuss__text">{fuss.text}</p>
        </div>
        <ul className="ag-fuss__spalte" aria-label="Navigation">
          {navigation.map((n) => (
            <li key={n.href}>
              <a href={n.href}>{n.label}</a>
            </li>
          ))}
        </ul>
        <ul className="ag-fuss__spalte" aria-label="Kontakt und Recht">
          <li>
            <a href={`tel:${marke.telefon}`}>{marke.telefonAnzeige}</a>
          </li>
          <li>
            <a href={`mailto:${marke.email}`}>{marke.email}</a>
          </li>
          <li>
            <Link href="/impressum">Impressum</Link>
          </li>
          <li>
            <Link href="/datenschutz">Datenschutz</Link>
          </li>
        </ul>
      </div>
      {/* Stehender Riesen-Schriftzug (kein Laufband). */}
      <div className="ag-wrap ag-fuss__wort">
        <Wortmarke />
      </div>
      <p className="ag-wrap ag-fuss__unten">
        © {new Date().getFullYear()} {marke.name}. {fuss.rechte}
      </p>
    </footer>
  );
}

/** Der Name in Riesengröße, immer genau so breit wie der Inhalt der Seite. */
export function Wortmarke({ className }: { className?: string }) {
  return (
    <svg className={`ag-wortmarke ${className ?? ""}`} viewBox="0 0 1000 212" role="img" aria-label={marke.name}>
      <text x="0" y="205" textLength="1000" lengthAdjust="spacingAndGlyphs">
        AGENTS GILT
      </text>
    </svg>
  );
}

/** Rahmen jeder Variante: Ladebildschirm, Kopfleiste, Inhalt, Fußleiste. */
export function Rahmen({ children, klasse }: { children: ReactNode; klasse?: string }) {
  return (
    <>
      <Ladebildschirm />
      <WeichesScrollen />
      <Kopfleiste />
      <main className={klasse}>{children}</main>
      <Fusszeile />
      <DaumenLeiste />
    </>
  );
}
