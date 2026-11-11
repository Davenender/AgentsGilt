"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { marke } from "@/lib/inhalt-neu";
import { Wortmarke } from "../Rahmen";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, istVorschau } from "../umgebung";
import type { LichtLage, LichtSzene } from "./lichtszene";
import { erzeugeZeichenname } from "./zeichenname";

/**
 * Der Kopfbereich in zwei Ebenen, durchscheinend übereinander:
 * hinten das Licht-Logo, vorn der Name aus Zeichen-Teilchen. Diese Datei hält
 * beide im Takt und steuert das goldene Licht von unten (Scroll-Hinweis).
 *
 * - Am Computer läuft das Licht als three.js-Szene mit God Rays (lichtszene.ts,
 *   wird nachgeladen): Das Logo dreht und neigt sich leicht mit der Maus, die
 *   Strahlen wandern. Die Zeichen weichen dem Zeiger aus; ein Klick schickt
 *   eine Welle hindurch.
 * - Am Handy und bei „weniger Bewegung“ steht das Licht als ruhiges Bild
 *   (einmal aus derselben Szene aufgenommen, am Handy atmet es leicht).
 *   Tippen löst die Welle aus; bei „weniger Bewegung“ ist alles still.
 * - Scroll-Hinweis nur durch Licht: Wer nach etwa 4 Sekunden nicht gescrollt
 *   hat, sieht von unten ein warmes goldenes Licht hereinstrahlen. Beim
 *   Scrollen blendet es aus.
 *
 * Gerechnet wird nur, solange der Kopfbereich zu sehen ist. Ohne Skript stehen
 * Name und Logo als gewöhnliche Grafik da.
 */
export function LichtName() {
  const ebene = useRef<HTMLDivElement>(null);
  const zeichenLeinwand = useRef<HTMLCanvasElement>(null);
  // Zählt hoch, wenn der Besucher „weniger Bewegung“ umstellt oder das Zeigegerät wechselt:
  // Dann wird alles abgebaut und mit der neuen Einstellung frisch eingerichtet.
  const [einstellung, setEinstellung] = useState(0);

  useEffect(() => {
    const el = ebene.current;
    const leinwand = zeichenLeinwand.current;
    const held = el?.closest<HTMLElement>(".ag-hero");
    const platz = held?.querySelector<HTMLElement>(".ag-ln__platz");
    const wort = platz?.querySelector<SVGElement>(".ag-wortmarke");
    const wortText = wort?.querySelector("text");
    if (!el || !leinwand || !held || !platz || !wort || !wortText) return;

    const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
    const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = wenigBewegung.matches || istVorschau();
    const maus = feinerZeiger.matches && !still;
    const feld = erzeugeZeichenname(leinwand, still);
    if (!feld) return;
    // Erst jetzt lauschen: Alles, was ab hier eingerichtet wird, räumt die Rückgabe unten wieder ab.
    const umstellen = () => setEinstellung((n) => n + 1);
    wenigBewegung.addEventListener("change", umstellen);
    feinerZeiger.addEventListener("change", umstellen);

    let szene: LichtSzene | undefined;
    let vorbei = false;
    let gebaut = false;
    let aufgetreten = still;
    let eingeblendet = still;

    // Lage des Lichts ohne laufende Szene: Logo steht gerade, Strahlen nach oben, unten, links, rechts.
    const ruheLage = (): LichtLage => {
      const e = el.getBoundingClientRect();
      const p = platz.getBoundingClientRect();
      return {
        mitteX: p.left + p.width / 2 - e.left,
        mitteY: p.top + p.height / 2 - e.top,
        radius: p.height / 2,
        winkel: [-Math.PI / 2, Math.PI / 2, Math.PI, 0],
        hell: 1,
      };
    };

    const vermessen = async () => {
      const stil = getComputedStyle(wortText);
      const mono = getComputedStyle(held).getPropertyValue("--font-mono-ag").trim() || "monospace";
      // Erst zeichnen, wenn die Schriften wirklich geladen sind.
      await Promise.all([document.fonts.load(`800 120px ${stil.fontFamily}`, marke.name), document.fonts.load(`500 12px ${mono}`, "#%=+")]).catch(() => {});
      if (vorbei) return;
      const e = el.getBoundingClientRect();
      const w = wort.getBoundingClientRect();
      const p = platz.getBoundingClientRect();
      const ruhe = ruheLage();
      // Das ruhige Bild des Lichts sitzt genau auf der Logo-Mitte.
      el.style.setProperty("--lx", `${ruhe.mitteX}px`);
      el.style.setProperty("--ly", `${ruhe.mitteY}px`);
      el.style.setProperty("--lr", `${ruhe.radius}px`);
      // Am Computer steht der Name in einer Zeile über fast die ganze Breite. Am
      // Handy wäre er so zu klein: Dort stehen die beiden Wörter übereinander.
      const woerter = marke.name.toUpperCase().split(" ");
      const gestapelt = e.width < 600 && woerter.length > 1;
      let name = { x: w.left - e.left, y: w.top - e.top, b: w.width, h: w.height };
      if (gestapelt) {
        const probe = document.createElement("canvas").getContext("2d");
        if (probe) {
          probe.font = `800 100px ${stil.fontFamily}`;
          const breiteste = Math.max(...woerter.map((wortTeil) => probe.measureText(wortTeil).width || 1));
          const zeilenHoehe = ((p.width / breiteste) * 100 * 212) / 285;
          const h = (zeilenHoehe * woerter.length) / (1 - 0.045 * (woerter.length - 1));
          name = { x: p.left - e.left, y: ruhe.mitteY - h / 2, b: p.width, h };
        }
      }
      const anzahl = feld.bauen(
        {
          breite: Math.max(1, e.width),
          hoehe: Math.max(1, e.height),
          name,
          zelle: e.width < 768 ? 5 : 6.5,
          schrift: stil.fontFamily,
          mono,
          zeilen: gestapelt ? woerter : [woerter.join(" ")],
        },
        szene?.lage ?? ruhe,
        eingeblendet,
      );
      gebaut = true;
      // Der gewöhnliche Schriftzug tritt erst zurück, wenn das Zeichenraster wirklich steht.
      if (anzahl > 0) held.dataset.ln = "bereit";
      else delete held.dataset.ln;
    };

    // Am Computer: die Licht-Szene nachladen.
    if (maus) {
      import("./lichtszene")
        .then(({ starteLichtSzene }) => {
          if (vorbei) return;
          szene = starteLichtSzene(el, platz, (lage) => feld.licht(lage));
          held.dataset.licht = "live";
          // Läuft der Auftritt schon, ist das Licht sofort da.
          if (aufgetreten) szene.zeigen(true);
        })
        .catch(() => {
          // Kein WebGL: Dann steht das ruhige Bild des Lichts.
          if (!vorbei) held.dataset.licht = "bild";
        });
    } else {
      held.dataset.licht = "bild";
    }

    // Auftritt. (Die eigentliche Startanimation folgt in einem späteren Auftrag.)
    const spaeter: gsap.core.Tween[] = [];
    const mitteWelle = () => {
      const r = ruheLage();
      feld.welle(r.mitteX, r.mitteY);
    };
    const auftritt = () => {
      if (aufgetreten || vorbei) return;
      aufgetreten = true;
      szene?.zeigen(false);
      spaeter.push(
        gsap.delayedCall(0.45, () => {
          eingeblendet = true;
          // Einmal läuft von selbst eine Welle durch den Namen: der Hinweis, dass man klicken
          // kann. Sie startet erst, wenn der Name wirklich fertig eingeblendet ist (auch wenn
          // der Kopfbereich beim Auftritt gerade nicht zu sehen war).
          feld.einblenden(() => spaeter.push(gsap.delayedCall(0.4, mitteWelle)));
        }),
      );
      lockPlanen();
    };

    // Klick oder Tippen irgendwo im Kopfbereich (nicht auf Knöpfe und Links): eine Welle.
    const klick = (ev: MouseEvent) => {
      if (!gebaut || (ev.target as Element | null)?.closest("a, button, input, select, textarea, label")) return;
      const e = el.getBoundingClientRect();
      feld.welle(ev.clientX - e.left, ev.clientY - e.top);
      // Am Handy dazu eine kurze Vibration (wo das Gerät es kann).
      if (!maus) navigator.vibrate?.(12);
    };
    const zeigerBewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const e = el.getBoundingClientRect();
      const y = ev.clientY - e.top;
      feld.zeiger(ev.clientX - e.left, y, y > -80 && y < e.height + 80);
    };
    const zeigerWeg = () => feld.zeiger(-9999, -9999, false);

    // Scroll-Hinweis nur durch Licht: nach 4 Sekunden ohne Scrollen, weg beim Scrollen.
    let lockUhr = 0;
    const lockPlanen = () => {
      window.clearTimeout(lockUhr);
      if (window.scrollY > 24) return;
      lockUhr = window.setTimeout(() => {
        if (!vorbei && window.scrollY <= 24) held.dataset.lockruf = "1";
      }, 4000);
    };
    const beimScrollen = () => {
      if (window.scrollY > 24) {
        window.clearTimeout(lockUhr);
        delete held.dataset.lockruf;
      } else if (!held.dataset.lockruf && aufgetreten) {
        lockPlanen();
      }
    };

    let warten = 0;
    const beobachter = new ResizeObserver(() => {
      window.clearTimeout(warten);
      warten = window.setTimeout(vermessen, gebaut ? 180 : 0);
    });
    beobachter.observe(el);
    beobachter.observe(platz);
    const waechter = new IntersectionObserver(([eintrag]) => feld.sichtbar(eintrag.isIntersecting));
    waechter.observe(el);
    window.addEventListener("scroll", beimScrollen, { passive: true });

    if (still) {
      lockPlanen();
    } else {
      held.addEventListener("click", klick);
      if (maus) {
        window.addEventListener("pointermove", zeigerBewegt, { passive: true });
        document.documentElement.addEventListener("pointerleave", zeigerWeg);
      }
      if (document.documentElement.classList.contains(INTRO_FERTIG_KLASSE)) auftritt();
      else window.addEventListener(INTRO_FERTIG, auftritt, { once: true });
    }

    return () => {
      vorbei = true;
      wenigBewegung.removeEventListener("change", umstellen);
      feinerZeiger.removeEventListener("change", umstellen);
      window.clearTimeout(warten);
      window.clearTimeout(lockUhr);
      beobachter.disconnect();
      waechter.disconnect();
      window.removeEventListener("scroll", beimScrollen);
      held.removeEventListener("click", klick);
      window.removeEventListener("pointermove", zeigerBewegt);
      document.documentElement.removeEventListener("pointerleave", zeigerWeg);
      window.removeEventListener(INTRO_FERTIG, auftritt);
      spaeter.forEach((t) => t.kill());
      szene?.ende();
      feld.ende();
      delete held.dataset.ln;
      delete held.dataset.licht;
      delete held.dataset.lockruf;
    };
  }, [einstellung]);

  // Drei Schichten, von hinten nach vorn: das Licht, der gewöhnliche Schriftzug
  // (ohne Skript sichtbar, sonst nur Maß und Name für Vorleseprogramme), die Zeichen.
  return (
    <>
      <div ref={ebene} className="ag-ln ag-ln--hinten" data-weg="buehne" aria-hidden="true">
        {/* Ruhiges Bild des Lichts für Handy und „weniger Bewegung“. Am Computer bleibt es ausgeblendet und wird nicht geladen. */}
        <Image className="ag-ln__standbild" src="/kopf/licht-logo.jpg" alt="" width={1472} height={1472} sizes="(max-width: 767px) 250vw, 1472px" loading="lazy" />
      </div>
      <div className="ag-kopf5__mitte" data-weg="oben">
        {/* Der Kasten ist so hoch wie das Licht-Logo, der Schriftzug steht mittig darin. */}
        <div className="ag-ln__platz">
          <Wortmarke />
        </div>
      </div>
      <div className="ag-ln ag-ln--vorn" data-weg="buehne" aria-hidden="true">
        <canvas ref={zeichenLeinwand} className="ag-ln__zeichen" />
      </div>
    </>
  );
}
