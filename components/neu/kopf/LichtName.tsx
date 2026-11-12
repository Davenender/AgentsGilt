"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
// Als Datei eingebunden: Die Adresse trägt dann eine Prüfsumme, ein neu aufgenommenes Bild kommt sicher an.
import lichtBild from "@/public/kopf/licht-logo.jpg";
import { marke } from "@/lib/inhalt-neu";
import { Wortmarke } from "../Rahmen";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, istVorschau } from "../umgebung";
import type { LichtLage, LichtSzene } from "./lichtszene";
import { erzeugeZeichenname } from "./zeichenname";

/**
 * Der Kopfbereich in zwei Ebenen, durchscheinend übereinander:
 * hinten das Licht-Logo, vorn der Name aus Zeichen-Teilchen. Das Licht-Logo
 * steht oben mittig, der Name mittig darunter (er liegt nicht mehr im Kern des
 * Lichts; die Strahlen laufen weich hinter seinem oberen Rand aus). Diese
 * Datei hält beide im Takt.
 *
 * - Das Licht läuft als three.js-Szene mit dem God-Rays-Effekt der Bibliothek
 *   postprocessing (lichtszene.ts, wird nachgeladen). Am Computer mit 80 Proben:
 *   Die Wand mit dem Logo-Loch kippt zur Maus, das Licht fächert sich als Kegel
 *   auf. Die Zeichen weichen dem Zeiger aus; ein Klick schickt eine Welle hindurch.
 * - Am Handy läuft dieselbe Szene mit 60 Proben, solange es flüssig bleibt.
 *   Ruckelt es, steht stattdessen ein ruhiges Bild des Lichts (einmal aus
 *   derselben Szene aufgenommen). Tippen löst die Welle aus.
 * - Bei „weniger Bewegung“ steht das ruhige Bild, alles ist still.
 *
 * - Scroll-Hinweis nur durch Licht, sehr dezent: Wer nach 4 Sekunden nicht
 *   gescrollt hat, sieht von ganz unten einen schwachen Goldschein. Beim
 *   Scrollen blendet er aus.
 *
 * Gerechnet wird nur, solange der Kopfbereich zu sehen ist. Ohne Skript stehen
 * Name und Logo als gewöhnliche Grafik da.
 */
// Hat das Gerät bei diesem Besuch schon einmal geruckelt, versucht es die Seite nicht noch einmal
// (nur im Arbeitsspeicher gemerkt, nichts wird im Browser abgelegt).
let geraetRuckelt = false;

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
    const loch = platz?.querySelector<HTMLElement>(".ag-ln__loch");
    const wort = platz?.querySelector<SVGElement>(".ag-wortmarke");
    const wortText = wort?.querySelector("text");
    if (!el || !leinwand || !held || !platz || !loch || !wort || !wortText) return;

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

    // Lage des Lichts ohne laufende Szene: Die Wand steht gerade, nichts kippt.
    const ruheLage = (): LichtLage => {
      const e = el.getBoundingClientRect();
      const l = loch.getBoundingClientRect();
      return { mitteX: l.left + l.width / 2 - e.left, mitteY: l.top + l.height / 2 - e.top, radius: l.height / 2, kippX: 0, kippY: 0, hell: 1 };
    };

    const vermessen = async () => {
      const stil = getComputedStyle(wortText);
      const mono = getComputedStyle(held).getPropertyValue("--font-mono-ag").trim() || "monospace";
      // Erst zeichnen, wenn die Schriften wirklich geladen sind.
      await Promise.all([document.fonts.load(`800 120px ${stil.fontFamily}`, marke.name), document.fonts.load(`500 12px ${mono}`, "#%=+")]).catch(() => {});
      if (vorbei) return;
      const e = el.getBoundingClientRect();
      const w = wort.getBoundingClientRect();
      const ruhe = ruheLage();
      // Der Name steht unter dem Licht-Logo, genau dort, wo das Stylesheet den gewöhnlichen
      // Schriftzug hinsetzt. Am Computer in einer Zeile; am Handy wäre er so zu klein: Dort
      // stehen die beiden Wörter übereinander (gleiche Breite, entsprechend höher).
      const woerter = marke.name.toUpperCase().split(" ");
      // Dieselben Grenzen wie im Stylesheet (kopf.css), an der Fensterbreite gemessen: Nur so
      // passen die dort freigehaltene Höhe und der gezeichnete Name sicher zusammen.
      const schmal = window.matchMedia("(max-width: 599px)").matches;
      const handyBreite = window.matchMedia("(max-width: 767px)").matches;
      const gestapelt = schmal && woerter.length > 1;
      let name = { x: w.left - e.left, y: w.top - e.top, b: w.width, h: w.height };
      if (gestapelt) {
        const probe = document.createElement("canvas").getContext("2d");
        if (probe) {
          probe.font = `800 100px ${stil.fontFamily}`;
          const breiteste = Math.max(...woerter.map((wortTeil) => probe.measureText(wortTeil).width || 1));
          const zeilenHoehe = ((w.width / breiteste) * 100 * 212) / 285;
          const h = (zeilenHoehe * woerter.length) / (1 - 0.045 * (woerter.length - 1));
          // Das Stylesheet hält unter 600 px Breite die Höhe für zwei Zeilen frei: mittig hineinsetzen.
          name = { x: w.left - e.left, y: w.top - e.top + Math.max(0, (w.height - h) / 2), b: w.width, h };
        }
      }
      const anzahl = feld.bauen(
        {
          breite: Math.max(1, e.width),
          hoehe: Math.max(1, e.height),
          name,
          zelle: handyBreite ? 4.4 : 6.5,
          schrift: stil.fontFamily,
          mono,
          zeilen: gestapelt ? woerter : [woerter.join(" ")],
          // Am Handy nur feine Zeichen (· . : - = +), keine schweren.
          fein: handyBreite,
        },
        // Am Handy steht der Schimmer ruhig, auch wenn sich das Licht dort leicht wiegt.
        szene ? (maus ? szene.lage : { ...szene.lage, kippX: 0, kippY: 0 }) : ruhe,
        eingeblendet,
      );
      gebaut = true;
      // Der gewöhnliche Schriftzug tritt erst zurück, wenn das Zeichenraster wirklich steht.
      if (anzahl > 0) held.dataset.ln = "bereit";
      else delete held.dataset.ln;
    };

    // Die Licht-Szene nachladen (nicht bei „weniger Bewegung“). Kann sie nicht starten oder
    // kommt das Gerät nicht flüssig mit, steht stattdessen das ruhige Bild des Lichts.
    const stattBild = () => {
      if (vorbei) return;
      szene?.ende();
      szene = undefined;
      held.dataset.licht = "bild";
      feld.licht(ruheLage());
    };
    if (still || geraetRuckelt) {
      held.dataset.licht = "bild";
    } else {
      import("./lichtszene")
        .then(({ starteLichtSzene }) => {
          if (vorbei) return;
          szene = starteLichtSzene(el, loch, {
            // Am Computer 80 Proben je Bildpunkt, am Handy 60.
            proben: maus ? 80 : 60,
            // Rein schwarz: Kopfbereich, Wand und Grund der Szene haben denselben Ton.
            wand: 0x000000,
            maus,
            // Die Zeichen erfahren, wie hell das Licht gerade ist. Am Computer wandert ihr Schimmer
            // außerdem mit dem Lichtkegel; am Handy steht er ruhig (das Licht wiegt sich nur leicht).
            beiBild: (lage) => feld.licht(maus ? lage : { ...lage, kippX: 0, kippY: 0 }),
            beiAusfall: () => {
              geraetRuckelt = true;
              stattBild();
            },
          });
          held.dataset.licht = "live";
          // Läuft der Auftritt schon, ist das Licht sofort da.
          if (aufgetreten) szene.zeigen(true);
        })
        .catch(stattBild);
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

    // Scroll-Hinweis, sehr dezent: Wer nach 4 Sekunden nicht gescrollt hat, sieht von ganz unten
    // einen schwachen Goldschein. Beim Scrollen blendet er aus.
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
    beobachter.observe(loch);
    // Kommen mehrere Meldungen auf einmal (etwa wenn die Seite beim Laden gleich nach unten springt),
    // zählt die letzte: Sie beschreibt den jetzigen Stand.
    const waechter = new IntersectionObserver((eintraege) => feld.sichtbar(eintraege[eintraege.length - 1].isIntersecting));
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
      {/* Hinten: Hierhin setzt die Licht-Szene ihre Zeichenfläche. */}
      <div ref={ebene} className="ag-ln ag-ln--hinten" data-weg="buehne" aria-hidden="true" />
      <div className="ag-kopf5__mitte" data-weg="oben">
        {/* Oben der Platz des Licht-Logos (so groß wie das Logo-Loch), darunter mit Abstand der Schriftzug. */}
        <div className="ag-ln__platz">
          <span className="ag-ln__loch" aria-hidden="true">
            {/* Ruhiges Bild des Lichts: nur bei „weniger Bewegung“ oder wenn die Szene nicht flüssig läuft. Sonst wird es nicht geladen. */}
            <Image className="ag-ln__standbild" src={lichtBild} alt="" sizes="(max-width: 767px) 150vw, min(72vw, 1260px)" loading="lazy" />
          </span>
          <Wortmarke />
        </div>
      </div>
      <div className="ag-ln ag-ln--vorn" data-weg="buehne" aria-hidden="true">
        <canvas ref={zeichenLeinwand} className="ag-ln__zeichen" />
      </div>
    </>
  );
}
