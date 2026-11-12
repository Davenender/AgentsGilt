"use client";

import { useEffect, useRef, useState } from "react";
import { ablauf } from "@/lib/inhalt-neu";
import { istVorschau } from "../umgebung";
import { Entschluesselt } from "./Entschluesselt";
import { erzeugeZeichenbild, type Zeichenbild } from "./zeichenbild";

/**
 * „So läuft es ab“ mit Zeichen-Nummern: Neben den drei Schritten steht die Nummer des gewählten
 * Schritts als großes Bild aus Schriftzeichen (zeichenbild.ts). Ein Klick auf einen Schritt
 * lässt die Zeichen zur neuen Nummer umfliegen. Ist das Feld zu 60 % im Bild, setzt sich die
 * Nummer aus Staub zusammen; scrollt sie nach oben aus dem Bild, zerfällt sie wieder. Unter der
 * Maus verwürfeln sich die Zeichen kurz.
 *
 * Alle drei Schritte sind immer zu lesen; gewählt wird nur, welche Nummer groß dasteht.
 */
export function AblaufNummern() {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const bild = useRef<Zeichenbild | null>(null);
  const zustand = useRef({ da: false, gewaehlt: 0 });
  const [gewaehlt, setGewaehlt] = useState(0);

  useEffect(() => {
    const flaeche = leinwand.current;
    if (!flaeche) return;
    const stil = getComputedStyle(flaeche);
    const still = istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const b = erzeugeZeichenbild(flaeche, { zelle: [7, 11], mono: stil.getPropertyValue("--font-mono-ag").trim() || "monospace", still });
    if (!b) return;
    bild.current = b;
    const serife = stil.getPropertyValue("--font-serife").trim() || "Georgia, serif";
    let vorbei = false;
    let uhr = 0;
    const einrichten = () => {
      const breite = flaeche.clientWidth;
      const hoehe = flaeche.clientHeight;
      if (breite < 2 || hoehe < 2) return;
      b.einrichten(
        breite,
        hoehe,
        ablauf.schritte.map((s) => (c, bb, hh) => {
          // Die Nummer in kursiver Serifenschrift, fast so hoch wie das Feld.
          c.font = `italic 400 ${Math.round(hh * 0.98)}px ${serife}`;
          c.textAlign = "center";
          c.textBaseline = "alphabetic";
          c.fillText(s.nr, bb * 0.48, hh * 0.84);
        }),
      );
      if (zustand.current.da || still) b.zeige(zustand.current.gewaehlt, true);
    };
    const schrift = document.fonts?.load ? document.fonts.load(`400 80px ${serife}`, "0123").catch(() => undefined) : Promise.resolve(undefined);
    schrift.then(() => {
      if (!vorbei) einrichten();
    });
    const groesse = new ResizeObserver(() => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(einrichten, 200);
    });
    groesse.observe(flaeche);
    // Zu 60 % im Bild: zusammensetzen. Nach oben aus dem Bild gescrollt: zerfallen.
    const waechter = new IntersectionObserver(
      (eintraege) => {
        const e = eintraege[eintraege.length - 1];
        b.sichtbar(e.isIntersecting);
        if (e.intersectionRatio >= 0.6) {
          if (!zustand.current.da) {
            zustand.current.da = true;
            b.zeige(zustand.current.gewaehlt);
          }
        } else if (zustand.current.da && e.boundingClientRect.top < 0 && e.intersectionRatio < 0.35 && !still) {
          zustand.current.da = false;
          b.zerfalle();
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );
    waechter.observe(flaeche);
    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = flaeche.getBoundingClientRect();
      b.zeiger(ev.clientX - r.left, ev.clientY - r.top, true);
    };
    const weg = () => b.zeiger(-9999, -9999, false);
    flaeche.addEventListener("pointermove", bewegt);
    flaeche.addEventListener("pointerleave", weg);
    return () => {
      vorbei = true;
      window.clearTimeout(uhr);
      groesse.disconnect();
      waechter.disconnect();
      flaeche.removeEventListener("pointermove", bewegt);
      flaeche.removeEventListener("pointerleave", weg);
      b.ende();
      bild.current = null;
    };
  }, []);

  const waehle = (nr: number) => {
    zustand.current.gewaehlt = nr;
    setGewaehlt(nr);
    if (zustand.current.da) bild.current?.zeige(nr);
  };

  return (
    <div className="ag-wrap ag-abschnitt ag-abn">
      <header className="ag-kopfzeile">
        <Entschluesselt als="h2" className="ag-versal ag-titel">
          {ablauf.vor} <em className="ag-gold ag-leuchtet">{ablauf.gold}</em>
        </Entschluesselt>
      </header>
      <div className="ag-abn__innen">
        <div className="ag-abn__bild" aria-hidden="true">
          <canvas ref={leinwand} className="ag-abn__zeichen" />
          <span className="ag-mono ag-abn__von">/ {String(ablauf.schritte.length).padStart(2, "0")}</span>
        </div>
        <ol className="ag-abn__liste">
          {ablauf.schritte.map((s, i) => (
            <li key={s.nr} data-gewaehlt={i === gewaehlt}>
              <button type="button" aria-pressed={i === gewaehlt} onClick={() => waehle(i)}>
                <span className="ag-mono">{s.nr}</span>
                <span className="ag-versal">{s.titel}</span>
              </button>
              <p>{s.text}</p>
              {i === ablauf.schritte.length - 1 && <span className="ag-mono ag-abn__ziel">{ablauf.ziel}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
