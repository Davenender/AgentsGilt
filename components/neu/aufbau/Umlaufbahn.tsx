"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { hero, leistungen, leistungenKopf, warum } from "@/lib/inhalt-neu";
import { Ablauf, Ausbildung, Kontakt, WasWirMachen } from "../Bereiche";
import { Buehne } from "../Buehne";
import { AnrufLeiste, Knopf } from "../Knoepfe";
import { AuswahlKnopf, LeistungsZeichen } from "../Leistungsteile";
import { Rahmen } from "../Rahmen";
import { Zeichen } from "../Zeichen";
import { Zeilen } from "../Zeilen";
import { istVorschau } from "../umgebung";

gsap.registerPlugin(useGSAP);

// Plätze der sechs Leistungen auf der Umlaufbahn (Grad, 0 = rechts, 90 = oben).
const WINKEL = [158, 190, 222, 22, -10, -42];
const GITTER = ["a", "b", "c", "d"];

/**
 * Aufbau „Umlaufbahn“: In der Mitte steht nur die Überschrift. Um sie herum
 * kreist ein Ring aus Punkten, auf dem die sechs Leistungen als kleine runde
 * Kacheln sitzen; das Zeichen steht oben auf der Bahn. Beim Scrollen fliegen
 * die Kacheln zur Mitte und tauchen bei den Leistungen als Wählscheibe wieder
 * auf.
 */
function UmlaufHelfer() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1100px) and (prefers-reduced-motion: no-preference)", () => {
      if (istVorschau()) return;
      const kacheln = gsap.utils.toArray<HTMLElement>(".ag-umlauf__kachel");
      // Leichtes Schweben, jede Kachel in ihrem eigenen Takt. Läuft nur, solange
      // der Kopfbereich im Bild ist: Die Schleifen entstehen angehalten und
      // richten sich beim Anlegen, bei jeder Neuberechnung und bei jedem Wechsel
      // nach der Sichtbarkeit (auch wenn die Seite weiter unten erst breit wird).
      const schweben = kacheln.map((k, i) =>
        gsap.to(k.firstElementChild, {
          y: i % 2 ? 9 : -9,
          duration: 2.6 + i * 0.35,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          paused: true,
        }),
      );
      const takt = (s: ScrollTrigger) => schweben.forEach((t) => t.paused(!s.isActive));
      takt(ScrollTrigger.create({ trigger: "#top", start: "top bottom", end: "bottom top", onToggle: takt, onRefresh: takt }));
      // Beim Hinausscrollen fliegen die Kacheln über die Überschrift zur Mitte.
      gsap.to(kacheln, {
        x: (_, k: HTMLElement) => (window.innerWidth / 2 - (k.getBoundingClientRect().left + k.offsetWidth / 2)) * 0.72,
        y: 120,
        scale: 0.5,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: "#top", start: "top top", end: "70% top", scrub: 0.4, invalidateOnRefresh: true },
      });
    });
  });
  return null;
}

/** Leistungen an der Wählscheibe: links dreht sich der Bogen mit, rechts stehen die sechs Texte. */
function LeistungsBogen() {
  const wurzel = useRef<HTMLDivElement>(null);
  const [aktiv, setAktiv] = useState(0);

  useGSAP(
    () => {
      const bloecke = gsap.utils.toArray<HTMLElement>(".ag-bogenwahl__block", wurzel.current);
      // Aktiv ist der Block, der gerade die Lesehöhe (55 % des Bildschirms) kreuzt.
      // Aus der Lage gelesen statt mitgezählt: So stimmt es auch nach Sprüngen.
      const lesen = () => {
        const linie = window.innerHeight * 0.55;
        let treffer = 0;
        bloecke.forEach((block, i) => {
          if (block.getBoundingClientRect().top <= linie) treffer = i;
        });
        setAktiv(treffer);
      };
      ScrollTrigger.create({ trigger: ".ag-bogenwahl", start: "top bottom", end: "bottom top", onUpdate: lesen, onRefresh: lesen });
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile ag-kopfzeile--mitte">
        <Zeilen als="h2" className="ag-versal ag-titel">
          {leistungenKopf.vor} <em className="ag-gold">{leistungenKopf.gold}</em> {leistungenKopf.nach}
        </Zeilen>
        <p className="ag-text">{leistungenKopf.text}</p>
      </header>
      <div className="ag-bogenwahl">
        <div className="ag-bogenwahl__links" aria-hidden="true">
          <div className="ag-bogenwahl__rad" style={{ "--aktiv": aktiv } as CSSProperties}>
            {leistungen.map((l, i) => (
              <span key={l.titel} className="ag-bogenwahl__kachel" data-aktiv={i === aktiv} style={{ "--i": i } as CSSProperties}>
                <LeistungsZeichen nr={i} />
              </span>
            ))}
          </div>
          <p className="ag-versal ag-bogenwahl__nummer">{leistungen[aktiv].nr}</p>
        </div>
        <ol>
          {leistungen.map((l, i) => (
            <li key={l.titel} id={`leistung-${l.nr}`} className="ag-bogenwahl__block">
              <LeistungsZeichen nr={i} className="ag-bogenwahl__klein" />
              <span className="ag-mono">{l.nr}</span>
              <h3 className="ag-versal">{l.titel}</h3>
              <p className="ag-bogenwahl__kurz">{l.kurz}</p>
              <p className="ag-text">{l.text}</p>
              <ul className="ag-punkte">
                {l.punkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <AuswahlKnopf titel={l.titel} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Vier Vorteile als Trabanten um eine Aussage in der Mitte. */
function WarumTrabanten() {
  return (
    <div className="ag-wrap ag-abschnitt">
      <div className="ag-trabanten">
        <div className="ag-trabanten__ring" aria-hidden="true" />
        <div className="ag-trabanten__mitte">
          <Zeilen als="h2" className="ag-versal ag-titel">
            {warum.vor} <em className="ag-gold">{warum.gold}</em> {warum.nach}
          </Zeilen>
        </div>
        {warum.punkte.map((p, i) => (
          <div key={p.titel} className="ag-trabant" style={{ gridArea: GITTER[i] }}>
            <h3 className="ag-versal">{p.titel}</h3>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Umlaufbahn() {
  return (
    <Rahmen>
      <UmlaufHelfer />

      <section id="top" className="ag-hero ag-hero--umlauf">
        <Buehne className="ag-umlauf__bahn" punkte={520} radius={0.22} flach={0.965} kippung={0} streuung={0.035} mitteY={0.55} baender={false} />
        <Zeichen className="ag-umlauf__zeichen" />
        <ul className="ag-umlauf__kacheln">
          {leistungen.map((l, i) => {
            const bogen = (WINKEL[i] * Math.PI) / 180;
            return (
              <li key={l.titel}>
                <a
                  className="ag-umlauf__kachel"
                  href={`#leistung-${l.nr}`}
                  style={{ "--cos": Math.cos(bogen).toFixed(4), "--sin": Math.sin(bogen).toFixed(4) } as CSSProperties}
                >
                  <span>
                    <LeistungsZeichen nr={i} />
                  </span>
                  <span className="ag-mono">{l.titel}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="ag-wrap ag-hero__inhalt">
          <Zeilen als="h1" start="intro" className="ag-versal ag-hero__h1">
            <span className="ag-matt">{hero.leise}</span>
            <br />
            {hero.laut} <em className="ag-gold">{hero.gold}</em>
          </Zeilen>
          <p className="ag-hero__sub">{hero.unterzeile}</p>
          <div className="ag-hero__aktionen">
            <AnrufLeiste />
            <Knopf art="linie" href="#leistungen">
              {hero.zweitknopf}
            </Knopf>
          </div>
        </div>
      </section>

      <section aria-label="Was wir machen">
        <WasWirMachen mitte />
      </section>
      <section id="leistungen">
        <LeistungsBogen />
      </section>
      <section id="ablauf">
        <Ablauf bahn="bogen" mitte />
      </section>
      <section id="warum">
        <WarumTrabanten />
      </section>
      <section id="ausbildung">
        <Ausbildung mitte />
      </section>
      <section id="kontakt">
        <Kontakt mitte />
      </section>
    </Rahmen>
  );
}
