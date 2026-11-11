"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { gsap } from "@/lib/gsap";
import { hero } from "@/lib/inhalt-neu";
import { AnrufLeiste, Knopf } from "../Knoepfe";
import { Wortmarke } from "../Rahmen";
import { Zeilen } from "../Zeilen";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, istVorschau } from "../umgebung";
import { KopfAnker, KopfBuehne } from "./KopfBuehne";

gsap.registerPlugin(useGSAP, SplitText);

/** Überschrift in zwei Tönen: erste Zeile matt, zweite hell mit goldenem Wort. Läuft Zeile für Zeile ein. */
function Titel() {
  return (
    <Zeilen als="h1" start="intro" className="ag-versal ag-kopf4__h1">
      <span className="ag-matt">{hero.leise}</span>
      <br />
      {hero.laut} <em className="ag-gold">{hero.gold}</em>
    </Zeilen>
  );
}

/** Unterzeile, Anruf-Leiste als Hauptknopf und ein Nebenknopf. */
function Aktionen() {
  return (
    <>
      <p className="ag-hero__sub">{hero.unterzeile}</p>
      <div className="ag-kopf4__aktionen">
        <AnrufLeiste />
        <Knopf art="linie" href="#leistungen">
          {hero.zweitknopf}
        </Knopf>
      </div>
    </>
  );
}

/**
 * Überschrift, deren Wörter einzeln aus allen Richtungen hereinfliegen und
 * sich in der Mitte zusammensetzen. Ohne Skript, bei „weniger Bewegung“ und
 * in der Vorschau steht sie einfach da.
 */
function WortFlug() {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || istVorschau()) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const teilung = SplitText.create(el, { type: "words", wordsClass: "ag-wort" });
        const flug = gsap.from(teilung.words, {
          x: () => gsap.utils.random(-340, 340),
          y: () => gsap.utils.random(-170, 170),
          rotation: () => gsap.utils.random(-14, 14),
          scale: 1.9,
          opacity: 0,
          duration: 1.35,
          ease: "expo.out",
          stagger: 0.09,
          paused: true,
          onComplete: () => teilung.revert(),
        });
        const los = () => flug.play();
        if (document.documentElement.classList.contains(INTRO_FERTIG_KLASSE)) los();
        else window.addEventListener(INTRO_FERTIG, los, { once: true });
        return () => {
          window.removeEventListener(INTRO_FERTIG, los);
          teilung.revert();
        };
      });
    },
    { scope: ref },
  );

  return (
    <h1 ref={ref} className="ag-versal ag-kopf4__h1 ag-kopf4__h1--gross">
      <span className="ag-matt">{hero.leise}</span>
      <br />
      {hero.laut} <em className="ag-gold">{hero.gold}</em>
    </h1>
  );
}

/** 1 · Kern im Schriftzug: Der Name quer über die Mitte, das Zeichen genau darin. */
export function KopfKern() {
  return (
    <section id="top" className="ag-hero ag-kopf4 ag-kopf4--kern">
      <KopfBuehne art="kern" />
      <div className="ag-wrap ag-kopf4__teil" data-weg="oben">
        <div className="ag-kopf4__schrift">
          <Wortmarke />
          <KopfAnker />
        </div>
      </div>
      <div className="ag-wrap ag-kopf4__teil" data-weg="unten">
        <Titel />
        <Aktionen />
      </div>
    </section>
  );
}

/** 2 · Lichtbänder: oben die Überschrift, darunter das Zeichen groß mit kreisenden Bändern. */
export function KopfBaender() {
  return (
    <section id="top" className="ag-hero ag-kopf4 ag-kopf4--baender">
      <KopfBuehne art="baender" />
      <div className="ag-wrap ag-kopf4__teil" data-weg="unten">
        <Titel />
      </div>
      <div className="ag-wrap ag-kopf4__teil" data-weg="oben">
        <div className="ag-kopf4__schrift">
          <Wortmarke className="ag-wortmarke--linie" />
          <KopfAnker />
        </div>
      </div>
      <div className="ag-wrap ag-kopf4__teil" data-weg="unten">
        <Aktionen />
      </div>
    </section>
  );
}

/** 3 · Punktwolke: das Zeichen in einer drehenden Kugel aus Punkten, der Name angeschnitten am Boden. */
export function KopfWolke() {
  return (
    <section id="top" className="ag-hero ag-kopf4 ag-kopf4--wolke">
      <KopfBuehne art="wolke" />
      <div className="ag-wrap ag-kopf4__teil" data-weg="unten">
        <Titel />
      </div>
      <div className="ag-kopf4__teil ag-kopf4__wolke" data-weg="oben">
        <KopfAnker />
      </div>
      <div className="ag-wrap ag-kopf4__teil" data-weg="unten">
        <Aktionen />
      </div>
      <div className="ag-wrap ag-kopf4__boden" data-weg="tief">
        <Wortmarke />
      </div>
    </section>
  );
}

/** 4 · Tiefenflug: das Zeichen am Ende eines Tunnels aus Lichtpunkten, die Überschrift fliegt herein. */
export function KopfTiefe() {
  return (
    <section id="top" className="ag-hero ag-kopf4 ag-kopf4--tiefe">
      <KopfBuehne art="tiefe" />
      {/* Bewegt sich beim Scrollen nicht mit: Hier fliegt die Kamera, das Zeichen bleibt an seinem Platz. */}
      <div className="ag-kopf4__teil ag-kopf4__tunnel" data-weg="flug">
        <KopfAnker />
      </div>
      <div className="ag-wrap ag-kopf4__teil" data-weg="unten">
        <WortFlug />
        <Aktionen />
      </div>
    </section>
  );
}
