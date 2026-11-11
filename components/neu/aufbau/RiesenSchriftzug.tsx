"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { hero, leistungen, leistungenKopf, warum } from "@/lib/inhalt-neu";
import { Ablauf, Ausbildung, Kontakt, WasWirMachen } from "../Bereiche";
import { Buehne } from "../Buehne";
import { AnrufLeiste, Knopf } from "../Knoepfe";
import { AuswahlKnopf, LeistungsZeichen } from "../Leistungsteile";
import { Rahmen, Wortmarke } from "../Rahmen";
import { Zeichen } from "../Zeichen";
import { Zeilen } from "../Zeilen";
import { istVorschau } from "../umgebung";

gsap.registerPlugin(useGSAP);

/**
 * Aufbau „Riesen-Schriftzug“: Der Name steht in Riesengröße über die ganze
 * Breite, das Zeichen sitzt mitten darin. Beim Scrollen tauchen Schriftzug und
 * Überschrift langsam weg, eine große Tafel kommt von unten herein. Danach
 * linksbündige Kapitel mit sehr großer Schrift.
 */
function SchriftHelfer() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
      if (istVorschau()) return;
      const weg = { trigger: "#top", start: "top top", end: "bottom top", scrub: true };
      if (document.querySelector("#top.ag-kopf4")) {
        // Kopfbild-Varianten (Schritt 4): Bild und Zeichen ziehen nach oben weg,
        // der Text taucht etwas früher ab, der Name am Boden steigt mit.
        const teile = (name: string) => gsap.utils.toArray<HTMLElement>(`#top [data-weg='${name}']`);
        gsap.to([...teile("oben"), ...teile("buehne")], { y: -110, opacity: 0.12, ease: "none", scrollTrigger: weg });
        gsap.to(teile("unten"), { y: -50, opacity: 0, ease: "none", scrollTrigger: { ...weg, end: "62% top" } });
        if (teile("tief").length) gsap.to(teile("tief"), { yPercent: -45, ease: "none", scrollTrigger: weg });
        if (teile("flug").length) gsap.to(teile("flug"), { opacity: 0.2, ease: "none", scrollTrigger: { ...weg, start: "45% top" } });
      } else if (document.querySelector("#top.ag-kopf5")) {
        // Kopfbereich ohne Text: Licht und Name treten beim Hinausscrollen zurück.
        gsap.to(gsap.utils.toArray<HTMLElement>("#top [data-weg]"), { opacity: 0.18, ease: "none", scrollTrigger: { ...weg, start: "18% top" } });
      } else {
        gsap.to(".ag-schrift__oben", { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: weg });
        gsap.to(".ag-schrift__unten", { yPercent: -8, opacity: 0, ease: "none", scrollTrigger: { ...weg, end: "62% top" } });
      }
      gsap.from(".ag-tafel", {
        scale: 0.9,
        ease: "none",
        scrollTrigger: { trigger: ".ag-tafel", start: "top bottom", end: "top 30%", scrub: true },
      });
    });
  });
  return null;
}

/** Leistungen als Riesen-Zeilen; ein goldenes Zeichen folgt dem Zeiger über die Liste. */
function LeistungsRiesen() {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const liste = wurzel.current?.querySelector<HTMLElement>(".ag-gross");
        const zeiger = wurzel.current?.querySelector<HTMLElement>(".ag-zeiger");
        if (!liste || !zeiger) return;
        const x = gsap.quickTo(zeiger, "x", { duration: 0.55, ease: "power3" });
        const y = gsap.quickTo(zeiger, "y", { duration: 0.55, ease: "power3" });
        const bewegt = (e: PointerEvent) => {
          const r = liste.getBoundingClientRect();
          x(e.clientX - r.left + 26);
          y(e.clientY - r.top + 26);
          const zeile = (e.target as Element).closest<HTMLElement>(".ag-gross__zeile");
          if (zeile?.dataset.nr) zeiger.setAttribute("data-nr", zeile.dataset.nr);
          zeiger.setAttribute("data-da", String(Boolean(zeile)));
        };
        const raus = () => zeiger.setAttribute("data-da", "false");
        liste.addEventListener("pointermove", bewegt);
        liste.addEventListener("pointerleave", raus);
        return () => {
          liste.removeEventListener("pointermove", bewegt);
          liste.removeEventListener("pointerleave", raus);
        };
      });
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile">
        <Zeilen als="h2" className="ag-versal ag-titel">
          {leistungenKopf.vor} <em className="ag-gold">{leistungenKopf.gold}</em> {leistungenKopf.nach}
        </Zeilen>
        <p className="ag-text">{leistungenKopf.text}</p>
      </header>
      <ol className="ag-gross">
        <li className="ag-zeiger ag-wechsel" data-nr="0" data-da="false" aria-hidden="true">
          {leistungen.map((l, i) => (
            <LeistungsZeichen key={l.titel} nr={i} />
          ))}
        </li>
        {leistungen.map((l, i) => (
          <li key={l.titel} className="ag-gross__zeile" data-nr={i}>
            <span className="ag-mono">{l.nr}</span>
            <div>
              <h3 className="ag-versal ag-gross__titel">{l.titel}</h3>
              <p className="ag-gross__kurz">{l.kurz}</p>
            </div>
            <div className="ag-gross__rechts">
              <p>{l.text}</p>
              <ul className="ag-punkte">
                {l.punkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <AuswahlKnopf titel={l.titel} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Vier Vorteile als Riesen-Wörter; das Wort in der Bildmitte wird hell. */
function WarumWorte() {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".ag-worte li", wurzel.current).forEach((zeile) => {
        ScrollTrigger.create({ trigger: zeile, start: "top 64%", end: "bottom 36%", toggleClass: "ist-da" });
      });
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile">
        <Zeilen als="h2" className="ag-versal ag-titel">
          {warum.vor} <em className="ag-gold">{warum.gold}</em> {warum.nach}
        </Zeilen>
      </header>
      <ul className="ag-worte">
        {warum.punkte.map((p) => (
          <li key={p.titel}>
            <h3 className="ag-versal">{p.titel}</h3>
            <p>{p.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Der Kopfbereich aus Schritt 3: Schriftzug oben, Überschrift und Anruf-Leiste darunter. */
function StandardKopf() {
  return (
    <section id="top" className="ag-hero ag-hero--schrift">
      <div className="ag-wrap ag-schrift__oben">
        <Wortmarke />
        <Buehne radius={0.2} flach={0.4} punkte={380} baender={false}>
          <Zeichen />
        </Buehne>
      </div>
      <div className="ag-wrap ag-schrift__unten">
        <Zeilen als="h1" start="intro" className="ag-versal ag-schrift__h1">
          <span className="ag-matt">{hero.leise}</span>
          <br />
          {hero.laut} <em className="ag-gold">{hero.gold}</em>
        </Zeilen>
        <div className="ag-schrift__rechts">
          <p className="ag-hero__sub">{hero.unterzeile}</p>
          <AnrufLeiste />
          <Knopf art="linie" href="#leistungen">
            {hero.zweitknopf}
          </Knopf>
        </div>
      </div>
    </section>
  );
}

/**
 * Seite im Aufbau „Riesen-Schriftzug“. Ohne Angabe mit dem Kopfbereich aus
 * Schritt 3; die Kopfbild-Varianten aus Schritt 4 setzen ihren eigenen ein.
 */
export function RiesenSchriftzug({ kopf }: { kopf?: ReactNode } = {}) {
  return (
    <Rahmen>
      <SchriftHelfer />

      {kopf ?? <StandardKopf />}

      <section className="ag-tafel" aria-label="Was wir machen">
        <WasWirMachen />
      </section>
      <section id="leistungen">
        <LeistungsRiesen />
      </section>
      <section id="ablauf">
        <Ablauf bahn="gerade" />
      </section>
      <section id="warum">
        <WarumWorte />
      </section>
      <section id="ausbildung">
        <Ausbildung />
      </section>
      <section id="kontakt">
        <Kontakt />
      </section>
    </Rahmen>
  );
}
