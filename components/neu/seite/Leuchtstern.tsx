"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import kernKlar from "@/public/stern/kern-klar.webp";
import kernBild from "@/public/stern/kern.webp";
import strahlenKlar1 from "@/public/stern/strahlen-1-klar.webp";
import strahlen1 from "@/public/stern/strahlen-1.webp";
import strahlen2 from "@/public/stern/strahlen-2.webp";
import strahlenKlar3 from "@/public/stern/strahlen-3-klar.webp";
import strahlen3 from "@/public/stern/strahlen-3.webp";
import strahlen4 from "@/public/stern/strahlen-4.webp";
import "./leuchtstern.css";

const STRAHLEN = [strahlen1, strahlen2, strahlen3, strahlen4];
// Die durchsichtigen Fassungen (für den kleinen Stern in den Glaskarten): der Stern und zwei Muster.
const STRAHLEN_KLAR = [strahlenKlar1, strahlenKlar3];
// Kantenlänge der Korn-Kachel in Bildpunkten des Bildschirms.
const KORN_KACHEL = 256;

let kornAdresse: Promise<string | null> | undefined;
/**
 * Die Korn-Kachel: Zufallswerte, einmal je Seitenaufruf erzeugt. Sie ist so verteilt, dass „farbig
 * abwedeln“ (color-dodge) im Browser denselben Goldstaub ergibt wie das Filmkorn der Licht-Szene.
 * Dort wird linear gerechnet: Ein Bildpunkt der Helligkeit x blitzt auf, wenn der Zufallswert u
 * kleiner als x ist. Der Browser mischt in sRGB: Ein Bildpunkt b blitzt auf, wenn der Wert der
 * Kachel mindestens 1 − b ist. Mit Kachel = 1 − sRGB(u) blitzen überall gleich viele Punkte auf.
 */
function kornKachel(): Promise<string | null> {
  kornAdresse ??= new Promise((fertig) => {
    try {
      const flaeche = document.createElement("canvas");
      flaeche.width = flaeche.height = KORN_KACHEL;
      const stift = flaeche.getContext("2d");
      if (!stift) return fertig(null);
      const bild = stift.createImageData(KORN_KACHEL, KORN_KACHEL);
      for (let i = 0; i < bild.data.length; i += 4) {
        const u = Math.random();
        // Linear nach sRGB.
        const kodiert = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
        const s = Math.floor(255 * (1 - kodiert));
        bild.data[i] = bild.data[i + 1] = bild.data[i + 2] = s;
        bild.data[i + 3] = 255;
      }
      stift.putImageData(bild, 0, 0);
      flaeche.toBlob((blob) => fertig(blob ? URL.createObjectURL(blob) : null), "image/png");
    } catch {
      fertig(null);
    }
  });
  return kornAdresse;
}

let kornKlarAdresse: Promise<string | null> | undefined;
/**
 * Die Korn-Kachel der durchsichtigen Fassung: feiner Goldstaub mit eigener Deckkraft (rund jeder
 * sechste Bildpunkt blitzt, unterschiedlich hell). Sie wird gewöhnlich über den Stern gelegt, ohne
 * Mischart.
 */
function kornKachelKlar(): Promise<string | null> {
  kornKlarAdresse ??= new Promise((fertig) => {
    try {
      const flaeche = document.createElement("canvas");
      flaeche.width = flaeche.height = KORN_KACHEL;
      const stift = flaeche.getContext("2d");
      if (!stift) return fertig(null);
      const bild = stift.createImageData(KORN_KACHEL, KORN_KACHEL);
      for (let i = 0; i < bild.data.length; i += 4) {
        const u = Math.random();
        const t = u < 0.83 ? 0 : (u - 0.83) / 0.17;
        bild.data[i] = 255;
        bild.data[i + 1] = 233;
        bild.data[i + 2] = 180;
        bild.data[i + 3] = Math.round(255 * t * t);
      }
      stift.putImageData(bild, 0, 0);
      flaeche.toBlob((blob) => fertig(blob ? URL.createObjectURL(blob) : null), "image/png");
    } catch {
      fertig(null);
    }
  });
  return kornKlarAdresse;
}

/**
 * Der leichte Stern (Wörter-Feld und Fuß): Er sieht aus wie der Stern des Logos im Licht, kostet
 * aber fast nichts. Keine Licht-Szene, sondern fünf Bilder, die von der eigenen Szene aufgenommen
 * sind (Testseite, ?ebene=…): der Stern selbst und vier Muster der langen Strahlen. Bewegt wird
 * nur mit Verschieben, Drehen und Deckkraft (Stylesheet), das rechnet die Grafikkarte nebenbei:
 *
 * - Er dreht sich ganz leicht hin und her (± 5°), die Strahlen wiegen sich dazu ein wenig.
 * - Die Strahlen schimmern: Die vier Muster blenden langsam ineinander.
 * - Er atmet: Stern und Strahlen werden langsam etwas heller und dunkler.
 * - Feines Korn tanzt darüber, wie in der Licht-Szene nur dort, wo Licht ist: eine Kachel aus
 *   Zufallswerten, die 60-mal je Sekunde springt und „farbig abgewedelt“ gemischt wird.
 *
 * Die Bilder sind am Rand ganz schwarz, das Feld wird aufgehellt über den Grund gemischt und läuft
 * rund aus: Es gibt keine Kante und kein Viereck. Nicht im Bild, ruht alles. Bei „weniger
 * Bewegung“ steht der Stern still (mit Korn). Der Platz des Sterns ist das umgebende Element; der
 * Stern füllt die Hälfte davon, die Strahlen reichen bis zum Doppelten.
 *
 * `klar`: die durchsichtige Fassung für den kleinen Stern in den Glaskarten. Derselbe Stern, aber
 * aus Bildern mit eigener Deckkraft (aus denselben Aufnahmen errechnet), ohne schwarzes Feld und
 * ohne Mischart: Auf dem halb durchsichtigen Glas einer Karte stünde das schwarze Feld sonst als
 * dunkle Scheibe da. Zwei Strahlenmuster blenden ineinander, der Goldstaub hat eine eigene Kachel.
 */
export function Leuchtstern({ className = "", klar = false }: { className?: string; klar?: boolean }) {
  const wurzel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wurzel.current;
    if (!el) return;
    let vorbei = false;
    // Die Kachel hat die Bildpunkte des Bildschirms: Das Korn ist auf jedem Bildschirm gleich fein.
    const dichte = () => el.style.setProperty("--korn-mass", `${(KORN_KACHEL / Math.max(1, window.devicePixelRatio || 1)).toFixed(3)}px`);
    dichte();
    (klar ? kornKachelKlar() : kornKachel()).then((adresse) => {
      if (!vorbei && adresse) el.style.setProperty("--korn-bild", `url("${adresse}")`);
    });
    window.addEventListener("resize", dichte);
    // Nur im Bild bewegt sich etwas.
    const sicht = new IntersectionObserver(
      (eintraege) => {
        if (eintraege[eintraege.length - 1].isIntersecting) delete el.dataset.ruht;
        else el.dataset.ruht = "1";
      },
      { rootMargin: "120px" },
    );
    sicht.observe(el);
    return () => {
      vorbei = true;
      window.removeEventListener("resize", dichte);
      sicht.disconnect();
      delete el.dataset.ruht;
    };
  }, [klar]);

  // Die durchsichtige Fassung lädt erst, wenn sie in die Nähe des Bildes kommt (sie liegt weiter unten).
  const laden = klar ? "lazy" : "eager";
  return (
    <span ref={wurzel} className={`ag-stern ${klar ? "ag-stern--klar" : ""} ${className}`.replace(/\s+/g, " ").trim()} aria-hidden="true">
      <span className="ag-stern__feld">
        <span className="ag-stern__dreh">
          <span className="ag-stern__auf">
            <span className="ag-stern__strahlen">
              {(klar ? STRAHLEN_KLAR : STRAHLEN).map((bild, i) => (
                <Image key={i} className="ag-stern__strahl" src={bild} alt="" unoptimized loading={laden} fetchPriority="low" decoding="async" draggable={false} />
              ))}
            </span>
          </span>
          <span className="ag-stern__mitte">
            <Image className="ag-stern__kern" src={klar ? kernKlar : kernBild} alt="" unoptimized loading={laden} fetchPriority="low" decoding="async" draggable={false} />
          </span>
        </span>
        <span className="ag-stern__korn">
          <span className="ag-stern__kachel" />
        </span>
      </span>
    </span>
  );
}
