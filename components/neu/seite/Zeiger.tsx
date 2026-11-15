"use client";

import { useEffect, useRef } from "react";
import { zeiger } from "@/lib/inhalt-neu";
import { istVorschau } from "../umgebung";

const KLASSE = "ag-maus-an";
// Der gedrückte Punkt (etwas kleiner) gilt nur für das Teil unter der Maus, und nur, wenn es klein
// ist: So rechnet der Browser bei einem Klick nicht die ganze Seite neu.
const DRUCK_HOECHSTENS = 60;

/**
 * Mauszeiger der neuen Seite (nur bei echter Maus, nicht bei „weniger Bewegung“):
 *   - Normal: ein kleiner goldener Punkt mit einem dezenten goldenen Schein, beide genau auf der Maus.
 *   - Über Links und Knöpfen: Der Punkt wird zu einem feinen Ring.
 *   - Über einem Zertifikat (`data-zeiger="ansehen"`, nur dort, wo ein Klick etwas öffnet): eine
 *     kleine Glasblase mit „Ansehen“.
 *     Sie sitzt genau auf der Maus, wächst federnd und wird beim Klicken kurz kleiner. Echter
 *     Glas-Effekt: durchsichtig, mit leichter Linsen-Verzerrung über einen SVG-Filter (wo der
 *     Browser das kann), heller Lichtkante oben und feinem Goldschimmer.
 * In Eingabefeldern und über dem Chat-Fenster gilt der gewöhnliche Zeiger.
 *
 * Punkt und Schein hängen nie hinter der Maus her: Beide sind der echte Mauszeiger des Systems
 * (ein kleines Bild: Goldpunkt mit Goldschein, Stylesheet). Das System zeichnet ihn sofort, ohne auf
 * das nächste Bild der Seite zu warten, bei jeder Bildrate. (Bis zum 14.11.2026 zeichnete die Seite
 * den Schein: Er kam immer mindestens ein Bild nach dem Punkt, bei schnellen Bewegungen sichtbar.)
 * Was die Seite selbst zeichnet (Ring mit seinem Schein, Glasblase), sitzt ohne Nachziehen auf der
 * Maus: Die Stelle wird direkt gesetzt, in `pointermove` und, wo der Browser es kann, schon in
 * `pointerrawupdate` (jede Meldung der Maus, nicht erst zum nächsten Bild). Dieser Handler setzt
 * nur die Stelle; es gibt dafür keine Übergangszeit und kein Nachziehen. Alles andere (welche Art
 * Zeiger) läuft einmal je Bild.
 */
export function Zeiger() {
  const wurzel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wurzel.current;
    const kern = el?.querySelector<HTMLElement>(".ag-maus__kern");
    const schein = el?.querySelector<HTMLElement>(".ag-maus__schein");
    if (!el || !kern || !schein || istVorschau()) return;
    const fein = window.matchMedia("(hover: hover) and (pointer: fine)");
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const html = document.documentElement;
    let erlaubt = fein.matches && !ruhig.matches;
    // Lage und Ziel der Maus: Nur der Handler unten schreibt sie.
    let x = 0;
    let y = 0;
    let ziel: EventTarget | null = null;
    let bewegt = false;
    let andererZeiger = false;
    let rahmen = 0;
    let da = false;

    // ── Der Handler für die Lage: Er setzt die Stelle und sonst nichts.
    const setze = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") andererZeiger = true;
      else {
        x = ev.clientX;
        y = ev.clientY;
        ziel = ev.target;
        bewegt = true;
        // Kern und Schein sitzen sofort auf der Maus (kein Nachziehen).
        const lage = `translate3d(${x}px, ${y}px, 0)`;
        kern.style.transform = lage;
        schein.style.transform = lage;
      }
      if (!rahmen) rahmen = requestAnimationFrame(bild);
    };

    const aus = () => {
      da = false;
      html.classList.remove(KLASSE);
      delete el.dataset.da;
      loslassen();
      cancelAnimationFrame(rahmen);
      rahmen = 0;
    };
    const welcheArt = (wo: Element | null) => {
      // Außerhalb der neuen Seite (das Chat-Fenster) und in Eingabefeldern: der gewöhnliche Zeiger.
      if (!wo?.closest?.(".ag-neu")) return "fremd";
      if (wo.closest("input, textarea, select, [contenteditable='true']")) return "text";
      // Die Glasblase gilt nur, wo man etwas öffnen kann (die Zertifikate): Sie geht dem Ring vor.
      if (wo.closest("[data-zeiger='ansehen']")) return "ansehen";
      if (wo.closest("a, button, [role='button'], label, summary")) return "link";
      return "punkt";
    };
    // ── Einmal je Bild: die Art des Zeigers.
    const bild = () => {
      rahmen = 0;
      if (andererZeiger || !erlaubt) {
        andererZeiger = false;
        return aus();
      }
      if (bewegt) {
        bewegt = false;
        if (!da) {
          da = true;
          el.dataset.da = "1";
        }
        const art = welcheArt(ziel as Element | null);
        if (el.dataset.art !== art) el.dataset.art = art;
        html.classList.toggle(KLASSE, art !== "fremd");
      }
    };
    // Gedrückt: Ring und Glasblase werden kurz kleiner (am Zeiger selbst, `data-druck`). Der Punkt
    // des Systems wird kleiner, indem das Teil unter der Maus für die Dauer des Klicks das kleinere
    // Zeiger-Bild bekommt (Stylesheet: --zeiger-druck). Früher stand dafür eine Klasse am <html>,
    // und der Browser rechnete bei jedem Klick zweimal die ganze Seite neu.
    const stil = getComputedStyle(el);
    const fein2 = stil.getPropertyValue("--zeiger-druck").trim();
    const druckBild = fein2 && CSS.supports("cursor", fein2) ? fein2 : stil.getPropertyValue("--zeiger-druck-einfach").trim();
    let gedrueckt: HTMLElement | null = null;
    const loslassen = () => {
      delete el.dataset.druck;
      gedrueckt?.style.removeProperty("cursor");
      gedrueckt = null;
    };
    const runter = (ev: PointerEvent) => {
      if (!da) return;
      el.dataset.druck = "1";
      const unter = ev.target instanceof HTMLElement ? ev.target : null;
      if (!unter || !druckBild || el.dataset.art !== "punkt" || unter.getElementsByTagName("*").length > DRUCK_HOECHSTENS) return;
      gedrueckt = unter;
      unter.style.setProperty("cursor", druckBild, "important");
    };
    const hoch = () => loslassen();
    const umstellen = () => {
      erlaubt = fein.matches && !ruhig.matches;
      if (!erlaubt) aus();
    };
    // Jede Meldung der Maus, nicht erst die gesammelte zum nächsten Bild (Chrome und Edge).
    const roh = "onpointerrawupdate" in window;
    if (roh) window.addEventListener("pointerrawupdate", setze as EventListener, { passive: true });
    window.addEventListener("pointermove", setze, { passive: true });
    window.addEventListener("pointerdown", runter, { passive: true });
    window.addEventListener("pointerup", hoch, { passive: true });
    html.addEventListener("pointerleave", aus);
    window.addEventListener("blur", aus);
    fein.addEventListener("change", umstellen);
    ruhig.addEventListener("change", umstellen);
    return () => {
      if (roh) window.removeEventListener("pointerrawupdate", setze as EventListener);
      window.removeEventListener("pointermove", setze);
      window.removeEventListener("pointerdown", runter);
      window.removeEventListener("pointerup", hoch);
      html.removeEventListener("pointerleave", aus);
      window.removeEventListener("blur", aus);
      fein.removeEventListener("change", umstellen);
      ruhig.removeEventListener("change", umstellen);
      aus();
    };
  }, []);

  return (
    <div ref={wurzel} className="ag-maus" data-art="punkt" aria-hidden="true">
      <span className="ag-maus__schein" />
      <span className="ag-maus__kern">
        <span className="ag-maus__punkt" />
        <span className="ag-maus__blase">
          <span>{zeiger.ansehen}</span>
        </span>
      </span>
      {/* Linse: Der Hintergrund hinter der Glasblase wird zur Mitte hin leicht vergrößert. Die
          Verschiebungs-Karte ist ein Bild mit Rot = waagerecht und Grün = senkrecht. */}
      <svg className="ag-maus__filter" width="0" height="0" focusable="false">
        <filter id="ag-linse" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage
            width="56"
            height="56"
            result="karte"
            href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Cdefs%3E%3ClinearGradient id='r' x1='0' x2='1' y1='0' y2='0'%3E%3Cstop offset='0' stop-color='%23000'/%3E%3Cstop offset='1' stop-color='%23f00'/%3E%3C/linearGradient%3E%3ClinearGradient id='g' x1='0' x2='0' y1='0' y2='1'%3E%3Cstop offset='0' stop-color='%23000'/%3E%3Cstop offset='1' stop-color='%230f0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='56' height='56' fill='url(%23r)'/%3E%3Crect width='56' height='56' fill='url(%23g)' style='mix-blend-mode:screen'/%3E%3C/svg%3E"
          />
          <feDisplacementMap in="SourceGraphic" in2="karte" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </div>
  );
}
