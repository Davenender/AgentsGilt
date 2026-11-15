"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { aussage } from "@/lib/inhalt-neu";
import { istVorschau } from "../umgebung";
import { useBewegungsWechsel } from "./einstellung";
import { erzeugeSpiel } from "./Entschluesselt";
import { richteGlaskartenEin } from "./glaskarten";
import { Leuchtstern } from "./Leuchtstern";

// Tippen: alle 45 ms ein neuer Platz, jeder flackert 250 ms durch Zufallszeichen.
const TIPP_ABSTAND = 45;
const TIPP_FLACKERN = 250;
// So lange nach dem Start des Wettlaufs schweben die Karten ein (Millisekunden, wie im Stylesheet).
const KARTEN_AB = 650;

// Die Symbole der Karten: feine Goldlinien (Strichstärke im Stylesheet).
const SYMBOLE: Record<string, ReactNode> = {
  // Maßgeschneidert: vier Passmarken, genau um den Stern des Logos gesetzt.
  mass: (
    <>
      <path className="ag-gk__fein" d="M8 17v-6a3 3 0 0 1 3-3h6M31 8h6a3 3 0 0 1 3 3v6M40 31v6a3 3 0 0 1-3 3h-6M17 40h-6a3 3 0 0 1-3-3v-6" />
      <path d="M24 13.5c.8 6.3 4.2 9.7 10.5 10.5-6.3.8-9.7 4.2-10.5 10.5-.8-6.3-4.2-9.7-10.5-10.5 6.3-.8 9.7-4.2 10.5-10.5Z" />
    </>
  ),
  // Schnell: eine Stoppuhr, der Zeiger steht noch fast am Anfang.
  tempo: (
    <>
      <circle cx="24" cy="27" r="14" />
      <path d="M20.5 7h7M24 7v6M35.2 15.8l2.6-2.6" />
      <path d="M24 27l6.2-7.4" />
      <path className="ag-gk__fein" d="M24 17v2.2M34 27h-2.2M24 37v-2.2M14 27h2.2" />
    </>
  ),
  // Technik wie bei den Großen: ein Chip mit dem Stern im Kern.
  technik: (
    <>
      <rect x="13" y="13" width="22" height="22" rx="4" />
      <path className="ag-gk__fein" d="M19 13V7.5M24 13V7.5M29 13V7.5M19 40.5V35M24 40.5V35M29 40.5V35M13 19H7.5M13 24H7.5M13 29H7.5M40.5 19H35M40.5 24H35M40.5 29H35" />
      <path d="M24 18.6c.4 3.2 2.2 5 5.4 5.4-3.2.4-5 2.2-5.4 5.4-.4-3.2-2.2-5-5.4-5.4 3.2-.4 5-2.2 5.4-5.4Z" />
    </>
  ),
};

/** Jedes Wort bekommt sein eigenes Feld: So kann das Mauslicht es einzeln aufleuchten lassen. */
function Woerter({ text }: { text: string }) {
  const woerter = text.split(" ");
  return woerter.map((wort, i) => (
    <span key={i}>
      <span className="ag-gk__wort">{wort}</span>
      {i < woerter.length - 1 ? " " : ""}
    </span>
  ));
}

/**
 * Die erste Aussage unter dem Kopfbereich und zugleich die Hauptüberschrift der Seite.
 *
 * Die Überschrift tippt sich verbuggt, wie ein Spielautomat: Vorher ist ihr Platz leer (die Zeilen
 * bleiben frei, nichts springt). Beim Hinscrollen erscheint Platz für Platz ein Zufallszeichen
 * (alle 45 ms der nächste), flackert rund 250 ms und rastet als richtiger Buchstabe ein. So läuft
 * vorn eine verbuggte Kante durch den Satz, dahinter steht schon das fertige Wort. Getippt wird
 * zuerst „Tagen“. Steht der Satz, zerfällt „Tagen“ in Zufallszeichen und rastet als „Stunden“ ein,
 * das golden aufleuchtet; das Sternchen kommt mit (Entschluesselt.tsx, Gruppe mit `data-erst`).
 * Danach verbuggt sie unter der Maus wie alle anderen Überschriften.
 *
 * Darunter, sobald die Überschrift steht:
 * 1. Der Wettlauf zeigt die Überschrift als Bild. Zwei schmale Balken laufen los: „Agentur“ in Grau
 *    kriecht und ist nach 4 s erst zu einem Drittel voll („Wochen“); „Agents Gilt“ in Gold ist nach
 *    0,8 s voll und leuchtet kurz auf („Stunden*“). Keine Zahlen. Darunter steht die Fußnote.
 * 2. Drei Glaskarten schweben nacheinander ein (je 120 ms versetzt). Fährt die Maus auf eine
 *    Karte (am Handy: steht sie in der Mitte des Bildschirms), wird sie hervorgehoben: In ihrer
 *    Mitte erscheint hinter Milchglas ein kleiner Stern (derselbe wie im Wörter-Feld darunter, weich
 *    und doch gut zu erkennen); er dreht und wiegt sich leicht. Die Glasfläche wird eine Spur
 *    heller, die Karte hebt sich, ihr Text wird hell. Das geht erst, wenn die Karte ganz
 *    eingeschwebt ist. Alles reines Stylesheet (nur Verschieben, Drehen, Deckkraft); welches die
 *    Karte ist, sagt glaskarten.ts. Mit Maus leuchtet der Text auch in ihrer Nähe warm auf.
 *
 * Am Handy läuft dasselbe wie am Computer; nur das Verbuggen unter der Maus gibt es dort nicht.
 *
 * Alles nur einmal je Seitenaufruf. Der echte Text steht die ganze Zeit im Dokument. Ohne Skript,
 * bei „weniger Bewegung“ und in der Vorschau steht alles sofort da: der goldene Balken voll, der
 * graue bei einem Drittel, die Karten an ihrem Platz, der Text hell, kein Stern.
 */
export function Aussage() {
  const wurzel = useRef<HTMLElement>(null);
  // Stellt der Besucher „weniger Bewegung“ um, richtet sich alles neu ein. Was bei diesem
  // Seitenaufruf schon lief, läuft danach nicht noch einmal.
  const wechsel = useBewegungsWechsel();
  const lief = useRef(false);

  useEffect(() => {
    const el = wurzel.current;
    const kopf = el?.querySelector<HTMLElement>(".ag-aussage__satz");
    const satz = kopf?.querySelector<HTMLElement>(".ag-wuerfel");
    const reihe = el?.querySelector<HTMLElement>(".ag-gk__reihe");
    if (!el || !kopf || !satz || !reihe || istVorschau()) return;
    // „Weniger Bewegung“: Alles steht einfach da.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lief.current = true;
      return;
    }
    const karten = richteGlaskartenEin(reihe);
    // Die Überschrift steht: Der Wettlauf läuft los, kurz danach schweben die Karten ein.
    const titel = erzeugeSpiel(satz, () => {
      el.dataset.lauf = "1";
      karten.zeigen(KARTEN_AB);
    });
    let waechter: ScrollTrigger | undefined;
    // Schon gelaufen, oder die Seite wurde weiter unten geladen und die Aussage liegt über dem Bild:
    // Überschrift, Balken und Karten stehen einfach da.
    if (lief.current || satz.getBoundingClientRect().bottom < 0) {
      lief.current = true;
      titel.stehen();
      karten.zeigen(0, true);
    } else {
      el.dataset.an = "1";
      titel.leeren();
      waechter = ScrollTrigger.create({
        trigger: satz,
        start: "top 84%",
        once: true,
        onEnter: () => {
          lief.current = true;
          titel.tippen(TIPP_ABSTAND, TIPP_FLACKERN);
        },
      });
    }
    // Unter der Maus verbuggen die Buchstaben in der Nähe kurz und rasten wieder ein.
    const maus = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse") titel.stoeren(ev.clientX, ev.clientY);
    };
    kopf.addEventListener("pointermove", maus, { passive: true });
    return () => {
      waechter?.kill();
      kopf.removeEventListener("pointermove", maus);
      titel.ende();
      karten.ende();
      delete el.dataset.an;
      delete el.dataset.lauf;
    };
  }, [wechsel]);

  return (
    <section ref={wurzel} className="ag-aussage" aria-label="Was wir machen">
      <div className="ag-wrap ag-aussage__innen">
        <h1 className="ag-versal ag-aussage__satz">
          <span className="ag-wuerfel ag-wuerfel--satz">
            <span className="ag-wuerfel__echt">
              {aussage.vor}{" "}
              {/* Diese Gruppe wird zuerst als „Tagen,“ getippt und rastet danach als „Stunden*,“ ein. */}
              <span data-erst={`${aussage.erst}${aussage.nach.slice(0, 1)}`}>
                <em className="ag-gold ag-leuchtet">{aussage.gold}</em>
                <span className="ag-aussage__stern">*</span>
                {aussage.nach.slice(0, 1)}
              </span>
              {aussage.nach.slice(1)}
            </span>
          </span>
        </h1>

        {/* Der Wettlauf: die Überschrift als Bild. */}
        <div className="ag-lauf" role="img" aria-label={aussage.lauf.beschreibung}>
          <div className="ag-lauf__zeile ag-lauf__zeile--agentur">
            <span className="ag-lauf__name">{aussage.lauf.agentur.name}</span>
            <span className="ag-lauf__bahn">
              <span className="ag-lauf__balken" />
            </span>
            <span className="ag-lauf__zeit">{aussage.lauf.agentur.zeit}</span>
          </div>
          <div className="ag-lauf__zeile ag-lauf__zeile--wir">
            <span className="ag-lauf__name">{aussage.lauf.wir.name}</span>
            <span className="ag-lauf__bahn">
              <span className="ag-lauf__balken" />
            </span>
            <span className="ag-lauf__zeit">
              {aussage.lauf.wir.zeit}
              <span className="ag-aussage__stern">*</span>
            </span>
          </div>
        </div>
        <p className="ag-fussnote ag-aussage__fussnote">{aussage.fussnote}</p>

        {/* Drei Glaskarten: Hinter jeder wartet unsichtbar ein goldener Stern hinter Milchglas. */}
        <ul className="ag-gk__reihe">
          {aussage.karten.map((karte, i) => (
            <li key={karte.titel} className="ag-gk" style={{ "--i": i } as CSSProperties} data-bild={i}>
              <div className="ag-gk__karte">
                {/* Lichtkante und Rand. Der Rand glimmt unter der Maus (glimmrand.ts); die Werte hängen an
                    diesem Teil ohne Kinder, damit der Browser je Bild nur den Rand neu rechnet. */}
                <span className="ag-gk__glas" aria-hidden="true" data-glimm />
                {/* Der Stern in der Mitte der Karte, hinter Milchglas (weich, aber gut zu erkennen). */}
                <span className="ag-gk__licht" aria-hidden="true">
                  <span className="ag-gk__stern">
                    <Leuchtstern milchig />
                  </span>
                </span>
                <div className="ag-gk__inhalt">
                  <svg className="ag-gk__symbol" viewBox="0 0 48 48" aria-hidden="true">
                    {SYMBOLE[karte.symbol]}
                  </svg>
                  <h2 className="ag-gk__titel">
                    <Woerter text={karte.titel} />
                  </h2>
                  <p className="ag-gk__text">
                    <Woerter text={karte.text} />
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
