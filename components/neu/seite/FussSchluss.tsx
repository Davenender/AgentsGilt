"use client";

import { useEffect, useRef } from "react";
import { marke } from "@/lib/inhalt-neu";
import { Wortmarke } from "../Rahmen";
import { istVorschau } from "../umgebung";
import type { LichtLage } from "../kopf/lichtszene";
import { erzeugeZeichenname } from "../kopf/zeichenname";
import { useBewegungsWechsel } from "./einstellung";
import { Leuchtstern } from "./Leuchtstern";
import { Lichtleiste } from "./Lichtleiste";

// Die Zeichen fliegen hier kürzer ein als am Start (dort 2,2 s).
const FLUG_DAUER = 1.5;
// Solange die Fußleiste oben unter der Kopfleiste liegt, tritt der Name der Kopfleiste zurück
// (die Fußleiste nennt ihn selbst): So überlappt ganz unten nichts.
const FUSS_OBEN = "ag-fuss-oben";

/**
 * Der Schluss der Seite: Sie endet, wie sie beginnt. Im Dunkeln steht wieder der Stern des Logos
 * als Licht: der leichte Stern (Leuchtstern.tsx), der atmet, sich leicht dreht, dessen Strahlen
 * schimmern und über dem feines Korn tanzt. Darunter „AGENTS GILT“ aus denselben Zeichen
 * wie der Name oben (dieselbe Technik, dasselbe Raster: kopf/zeichenname.ts). Kommt man unten an,
 * fliegen die Zeichen vom Rand herein und setzen sich zusammen (1,5 s, einmal je Seitenaufruf).
 * Danach weichen sie der Maus aus, und ein Klick auf den Namen schickt eine Welle hindurch.
 * Ganz unten am Rand liegt die Lichtleiste, hier ruhig, wie ein Sonnenaufgang zum Abschluss.
 *
 * Bei „weniger Bewegung“ steht alles sofort. Ohne Skript steht der gewöhnliche Schriftzug da.
 * Die Zeichenfläche liegt über der ganzen Fußleiste (sie fängt keine Klicks ab): So kommen die
 * Zeichen wirklich vom Rand.
 */
export function FussSchluss() {
  const wurzel = useRef<HTMLDivElement>(null);
  const ebene = useRef<HTMLDivElement>(null);
  const zeichenLeinwand = useRef<HTMLCanvasElement>(null);
  // Stellt der Besucher „weniger Bewegung“ um, richtet sich alles neu ein; der Flug kommt nur einmal je Seitenaufruf.
  const wechsel = useBewegungsWechsel();
  const geflogen = useRef(false);

  // Liegt der obere Teil der Fußleiste unter der Kopfleiste (in den obersten 120 px des Bildes)?
  useEffect(() => {
    const fuss = wurzel.current?.closest<HTMLElement>(".ag-fuss");
    if (!fuss) return;
    const html = document.documentElement;
    let waechter: IntersectionObserver | undefined;
    let hoehe = 0;
    // Beobachtet wird nur der oberste Streifen des Bildes. Sein unterer Rand steht in Pixeln (nicht
    // in Prozent), deshalb wird der Wächter neu angelegt, wenn sich die Höhe des Fensters ändert.
    const anlegen = () => {
      if (window.innerHeight === hoehe) return;
      hoehe = window.innerHeight;
      waechter?.disconnect();
      waechter = new IntersectionObserver((eintraege) => html.classList.toggle(FUSS_OBEN, eintraege[eintraege.length - 1].isIntersecting), {
        rootMargin: `0px 0px -${Math.max(0, hoehe - 120)}px 0px`,
      });
      waechter.observe(fuss);
    };
    anlegen();
    window.addEventListener("resize", anlegen);
    return () => {
      window.removeEventListener("resize", anlegen);
      waechter?.disconnect();
      html.classList.remove(FUSS_OBEN);
    };
  }, []);

  useEffect(() => {
    const el = wurzel.current;
    const vorn = ebene.current;
    const leinwand = zeichenLeinwand.current;
    const fuss = el?.closest<HTMLElement>(".ag-fuss");
    const loch = el?.querySelector<HTMLElement>(".ag-schluss__loch");
    const wort = el?.querySelector<SVGElement>(".ag-wortmarke");
    const wortText = wort?.querySelector("text");
    if (!el || !vorn || !leinwand || !fuss || !loch || !wort || !wortText) return;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const still = ruhig.matches || istVorschau();
    const feld = erzeugeZeichenname(leinwand, still);
    if (!feld) {
      // Die Zeichen lassen sich nicht zeichnen: Dann steht der gewöhnliche Schriftzug da.
      el.dataset.ln = "ersatz";
      return () => {
        delete el.dataset.ln;
      };
    }
    let vorbei = false;
    let gebaut = false;
    let unten = false;
    let uhr = 0;

    // Das Licht für den Schimmer der Zeichen: der Stern über dem Namen, die Wand steht gerade.
    const lichtLage = (): LichtLage => {
      const e = vorn.getBoundingClientRect();
      const l = loch.getBoundingClientRect();
      return { mitteX: l.left + l.width / 2 - e.left, mitteY: l.top + l.height / 2 - e.top, radius: l.height / 2, kippX: 0, kippY: 0, hell: 1 };
    };
    const starten = () => {
      if (!gebaut) return;
      // Der Flug war bei diesem Seitenaufruf schon da: Der Name steht sofort.
      if (geflogen.current) return feld.sofort();
      // Sonst erst, wenn man unten angekommen ist (einmal je Seitenaufruf).
      if (!unten) return;
      geflogen.current = true;
      feld.starten();
    };
    const vermessen = async () => {
      // Die Schriften des Namens sind vom Kopfbereich her geladen; zur Sicherheit kurz darauf warten.
      await Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((weiter) => window.setTimeout(weiter, 1500))]);
      if (vorbei) return;
      const stil = getComputedStyle(wortText);
      const mono = getComputedStyle(el).getPropertyValue("--font-mono-ag").trim() || "monospace";
      const e = vorn.getBoundingClientRect();
      const w = wort.getBoundingClientRect();
      if (e.width < 2 || w.width < 2) return;
      // Wie im Kopfbereich: Unter 600 px Breite stehen die beiden Wörter übereinander, sonst wäre
      // der Name aus Zeichen zu klein. (Dieselben Grenzen wie im Stylesheet.)
      const woerter = marke.name.toUpperCase().split(" ");
      const schmal = window.matchMedia("(max-width: 599px)").matches;
      const handyBreite = window.matchMedia("(max-width: 767px)").matches;
      const gestapelt = schmal && woerter.length > 1;
      let name = { x: w.left - e.left, y: w.top - e.top, b: w.width, h: w.height };
      if (gestapelt) {
        const probe = document.createElement("canvas").getContext("2d");
        if (probe) {
          probe.font = `800 100px ${stil.fontFamily}`;
          const breiteste = Math.max(...woerter.map((teil) => probe.measureText(teil).width || 1));
          const zeilenHoehe = ((w.width / breiteste) * 100 * 212) / 285;
          const h = (zeilenHoehe * woerter.length) / (1 - 0.045 * (woerter.length - 1));
          name = { x: w.left - e.left, y: w.top - e.top + Math.max(0, (w.height - h) / 2), b: w.width, h };
        }
      }
      const anzahl = feld.bauen(
        {
          breite: Math.max(1, e.width),
          hoehe: Math.max(1, e.height),
          name,
          zelle: handyBreite ? 5 : 6.5,
          schrift: stil.fontFamily,
          mono,
          zeilen: gestapelt ? woerter : [woerter.join(" ")],
          fein: handyBreite,
          dichteMax: handyBreite ? 1.5 : 2,
          schirm: Math.max(window.innerWidth, window.innerHeight),
          flugDauer: FLUG_DAUER,
        },
        lichtLage(),
      );
      gebaut = true;
      if (anzahl > 0) el.dataset.ln = "bereit";
      else delete el.dataset.ln;
      starten();
    };

    const groesse = new ResizeObserver(() => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(vermessen, gebaut ? 180 : 0);
    });
    groesse.observe(vorn);
    groesse.observe(wort);
    // Gerechnet wird nur, solange die Fußleiste im Bild ist.
    const sicht = new IntersectionObserver((eintraege) => feld.sichtbar(eintraege[eintraege.length - 1].isIntersecting));
    sicht.observe(fuss);
    // Unten angekommen: Der Platz des Namens ist gut zur Hälfte im Bild.
    const ankunft = new IntersectionObserver(
      (eintraege) => {
        if (eintraege[eintraege.length - 1].intersectionRatio < 0.55) return;
        unten = true;
        starten();
      },
      { threshold: [0, 0.55] },
    );
    ankunft.observe(wort);

    const zeigerBewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || still) return;
      const e = vorn.getBoundingClientRect();
      feld.zeiger(ev.clientX - e.left, ev.clientY - e.top, true);
    };
    const zeigerWeg = () => feld.zeiger(-9999, -9999, false);
    // Klick oder Tippen auf den Namen (nicht auf Links): eine Welle.
    const klick = (ev: MouseEvent) => {
      if ((ev.target as Element | null)?.closest("a, button")) return;
      const e = vorn.getBoundingClientRect();
      feld.welle(ev.clientX - e.left, ev.clientY - e.top);
    };
    fuss.addEventListener("pointermove", zeigerBewegt, { passive: true });
    fuss.addEventListener("pointerleave", zeigerWeg);
    fuss.addEventListener("click", klick);
    return () => {
      vorbei = true;
      window.clearTimeout(uhr);
      groesse.disconnect();
      sicht.disconnect();
      ankunft.disconnect();
      fuss.removeEventListener("pointermove", zeigerBewegt);
      fuss.removeEventListener("pointerleave", zeigerWeg);
      fuss.removeEventListener("click", klick);
      feld.ende();
      delete el.dataset.ln;
    };
  }, [wechsel]);

  return (
    <div ref={wurzel} className="ag-schluss">
      <div className="ag-schluss__mitte">
        {/* Der Stern im Dunkeln: lebendig wie das Logo im Licht, ohne Licht-Szene. */}
        <span className="ag-schluss__loch" aria-hidden="true">
          <Leuchtstern />
        </span>
        {/* Der gewöhnliche Schriftzug hält den Platz frei und nennt den Namen; zu sehen ist er nur ohne Skript. */}
        <Wortmarke />
      </div>
      {/* Die Zeichen: über der ganzen Fußleiste, damit sie vom Rand hereinfliegen können. */}
      <div ref={ebene} className="ag-schluss__vorn" aria-hidden="true">
        <canvas ref={zeichenLeinwand} className="ag-schluss__zeichen" />
      </div>
      {/* Ganz unten am Rand: die Lichtleiste, hier ruhig. */}
      <Lichtleiste className="ag-schluss__leiste" />
    </div>
  );
}
