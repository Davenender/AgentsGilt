"use client";

import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { hero, leistungen, leistungenKopf, marke, warum } from "@/lib/inhalt-neu";
import { Ablauf, Ausbildung, Kontakt, WasWirMachen } from "../Bereiche";
import { Buehne } from "../Buehne";
import { AnrufLeiste, Knopf } from "../Knoepfe";
import { AuswahlKnopf, LeistungsZeichen } from "../Leistungsteile";
import { Rahmen } from "../Rahmen";
import { Zeichen } from "../Zeichen";
import { Zeilen } from "../Zeilen";
import { istVorschau, willWenigerBewegung } from "../umgebung";

gsap.registerPlugin(useGSAP);

/**
 * Aufbau „Kartenstapel“: Der Kopfbereich ist die gewählte Skizze (Zeichen
 * mittig über der Überschrift). Danach ist jeder Bereich ein Bogen mit
 * runden Ecken, der sich beim Scrollen über den vorigen schiebt.
 * Das Scrollen bleibt normal: Die Bögen haften nur (position: sticky).
 */
function StapelHelfer() {
  useGSAP(() => {
    const boegen = gsap.utils.toArray<HTMLElement>(".ag-stapel > .ag-hero, .ag-stapel > .ag-bogen");
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      // Bögen, die höher sind als der Bildschirm, haften erst, wenn ihr Ende im Bild ist.
      const messen = () => {
        for (const b of boegen) b.style.setProperty("--oben", `${Math.min(0, window.innerHeight - b.offsetHeight)}px`);
      };
      const groesse = new ResizeObserver(messen);
      boegen.forEach((b) => groesse.observe(b));
      window.addEventListener("resize", messen);
      messen();

      if (!willWenigerBewegung() && !istVorschau()) {
        // Der verdeckte Bogen tritt zurück, während der nächste darüberfährt.
        // Als Auslöser dient eine Marke im normalen Fluss, nicht der haftende Bogen selbst.
        boegen.forEach((b) => {
          const marke = b.nextElementSibling;
          if (!marke?.classList.contains("ag-stapel__marke")) return;
          gsap.to(b.children, {
            opacity: 0.28,
            ease: "none",
            scrollTrigger: { trigger: marke, start: "top bottom", end: "top top", scrub: true },
          });
        });
      }

      return () => {
        groesse.disconnect();
        window.removeEventListener("resize", messen);
        boegen.forEach((b) => b.style.removeProperty("--oben"));
      };
    });
  });
  return null;
}

/** Leistungen als Zeilenliste; in der Überschrift sitzt ein kleines Bild, das mit der Zeile wechselt. */
function LeistungsListe() {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = wurzel.current;
      if (!el) return;
      gsap.utils.toArray<HTMLElement>(".ag-reihe", el).forEach((reihe, i) => {
        ScrollTrigger.create({
          trigger: reihe,
          start: "top 62%",
          end: "bottom 62%",
          onToggle: (s) => {
            if (s.isActive) el.querySelector(".ag-inbild")?.setAttribute("data-nr", String(i));
          },
        });
      });
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile">
        <Zeilen als="h2" className="ag-versal ag-titel">
          {leistungenKopf.vor}{" "}
          <span className="ag-inbild ag-wechsel" data-nr="0" aria-hidden="true">
            {leistungen.map((l, i) => (
              <LeistungsZeichen key={l.titel} nr={i} />
            ))}
          </span>{" "}
          <em className="ag-gold">{leistungenKopf.gold}</em> {leistungenKopf.nach}
        </Zeilen>
        <p className="ag-text">{leistungenKopf.text}</p>
      </header>
      <ol className="ag-liste">
        {leistungen.map((l) => (
          <li key={l.titel} className="ag-reihe">
            <span className="ag-mono ag-reihe__nr">{l.nr}</span>
            <div>
              <h3 className="ag-versal ag-reihe__titel">{l.titel}</h3>
              <p className="ag-reihe__kurz">{l.kurz}</p>
            </div>
            <div className="ag-reihe__text">
              <p>{l.text}</p>
              <ul className="ag-punkte">
                {l.punkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <AuswahlKnopf titel={l.titel} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Vier Vorteile als Fächer: Die Karten liegen übereinander und breiten sich beim Scrollen aus. */
function WarumFaecher() {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const faecher = wurzel.current?.querySelector<HTMLElement>(".ag-faecher");
        const karten = gsap.utils.toArray<HTMLElement>(".ag-faecher__karte", wurzel.current);
        if (!faecher || !karten.length || istVorschau()) return;
        // Der lesbare Zustand (nebeneinander) steht im Stylesheet. Nur hier, wo die
        // Animation wirklich läuft, rücken die Karten erst zur Mitte zusammen und
        // breiten sich beim Scrollen wieder aus.
        const mitte = (karten.length - 1) / 2;
        gsap.fromTo(
          karten,
          { x: (i) => -(i - mitte) * 94, y: (i) => (i - mitte) ** 2 * 9, rotation: (i) => (i - mitte) * 2.4 },
          { x: 0, y: 0, rotation: 0, ease: "none", scrollTrigger: { trigger: faecher, start: "top 88%", end: "top 38%", scrub: 0.5 } },
        );
      });
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile ag-kopfzeile--mitte">
        <Zeilen als="h2" className="ag-versal ag-titel">
          {warum.vor} <em className="ag-gold">{warum.gold}</em> {warum.nach}
        </Zeilen>
      </header>
      <ul className="ag-faecher">
        {warum.punkte.map((p, i) => (
          <li key={p.titel} className="ag-faecher__karte" style={{ "--i": i } as CSSProperties}>
            <h3 className="ag-versal">{p.titel}</h3>
            <p>{p.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Kartenstapel() {
  return (
    <Rahmen klasse="ag-stapel">
      <StapelHelfer />

      <section id="top" className="ag-hero ag-hero--mitte">
        <Buehne>
          <Zeichen />
        </Buehne>
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
        <p className="ag-mono ag-hero__orte">{marke.orte}</p>
      </section>
      <div className="ag-stapel__marke" />

      <section className="ag-bogen" aria-label="Was wir machen">
        <WasWirMachen mitte />
      </section>
      <div className="ag-stapel__marke" />

      <section id="leistungen" className="ag-bogen">
        <LeistungsListe />
      </section>
      <div className="ag-stapel__marke" />

      <section id="ablauf" className="ag-bogen">
        <Ablauf bahn="welle" mitte />
      </section>
      <div className="ag-stapel__marke" />

      <section id="warum" className="ag-bogen">
        <WarumFaecher />
      </section>
      <div className="ag-stapel__marke" />

      <section id="ausbildung" className="ag-bogen">
        <Ausbildung mitte />
      </section>
      <div className="ag-stapel__marke" />

      <section id="kontakt" className="ag-bogen">
        <Kontakt mitte />
      </section>
    </Rahmen>
  );
}
