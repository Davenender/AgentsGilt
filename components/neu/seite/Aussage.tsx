"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { aussage } from "@/lib/inhalt-neu";
import { istVorschau } from "../umgebung";
import { useBewegungsWechsel } from "./einstellung";
import { erzeugeSpiel } from "./Entschluesselt";

// Tippen: alle 45 ms ein neuer Platz, jeder flackert 250 ms durch Zufallszeichen.
const TIPP_ABSTAND = 45;
const TIPP_FLACKERN = 250;
// Der Absatz verwandelt sich in dieser Zeit (Millisekunden) von links nach rechts.
const ABSATZ_DAUER = 800;

/**
 * Die erste Aussage unter dem Kopfbereich und zugleich die Hauptüberschrift der Seite.
 *
 * Die Überschrift tippt sich verbuggt, wie ein Spielautomat: Vorher ist ihr Platz leer (die Zeilen
 * bleiben frei, nichts springt). Beim Hinscrollen erscheint Platz für Platz ein Zufallszeichen
 * (alle 45 ms der nächste), flackert rund 250 ms und rastet als richtiger Buchstabe ein. So läuft
 * vorn eine verbuggte Kante durch den Satz, dahinter steht schon das fertige Wort. Getippt wird
 * zuerst „Tagen“. Steht der Satz, zerfällt „Tagen“ in Zufallszeichen und rastet als „Stunden“ ein,
 * das golden aufleuchtet; das Sternchen kommt mit (Entschluesselt.tsx, Gruppe mit `data-erst`).
 * Unter der Maus verbuggt diese Überschrift nicht.
 *
 * Der Text darunter ist bis dahin unsichtbar. Direkt nachdem „Stunden“ eingerastet ist, steht der
 * ganze Absatz auf einmal als Zufallszeichen da und rastet in 0,8 s von links nach rechts ein.
 * Danach blendet die Fußnote ein.
 *
 * Alles nur einmal je Seitenaufruf. Der echte Text steht die ganze Zeit im Dokument. Ohne Skript,
 * bei „weniger Bewegung“ und in der Vorschau steht alles sofort da.
 */
export function Aussage() {
  const wurzel = useRef<HTMLElement>(null);
  // Stellt der Besucher „weniger Bewegung“ um, richtet sich alles neu ein. Was bei diesem
  // Seitenaufruf schon lief, läuft danach nicht noch einmal.
  const wechsel = useBewegungsWechsel();
  const lief = useRef(false);

  useEffect(() => {
    const el = wurzel.current;
    const satz = el?.querySelector<HTMLElement>(".ag-aussage__satz .ag-wuerfel");
    const absatz = el?.querySelector<HTMLElement>(".ag-aussage__absatz .ag-wuerfel");
    if (!el || !satz || !absatz || istVorschau()) return;
    // „Weniger Bewegung“, schon gelaufen, oder die Seite wurde weiter unten geladen und die Aussage
    // liegt über dem Bild: Alles steht einfach da.
    if (lief.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches || satz.getBoundingClientRect().bottom < 0) {
      lief.current = true;
      return;
    }
    // Die Fußnote wartet auf den Absatz.
    el.dataset.an = "1";
    const text = erzeugeSpiel(absatz, () => {
      el.dataset.hell = "1";
    });
    const titel = erzeugeSpiel(satz, () => text.wandeln(ABSATZ_DAUER));
    titel.leeren();
    text.leeren();
    const waechter = ScrollTrigger.create({
      trigger: satz,
      start: "top 84%",
      once: true,
      onEnter: () => {
        lief.current = true;
        titel.tippen(TIPP_ABSTAND, TIPP_FLACKERN);
      },
    });
    return () => {
      waechter.kill();
      titel.ende();
      text.ende();
      delete el.dataset.an;
      delete el.dataset.hell;
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
        <div className="ag-aussage__text">
          <p className="ag-aussage__absatz">
            <span className="ag-wuerfel ag-wuerfel--satz">
              <span className="ag-wuerfel__echt">{aussage.text}</span>
            </span>
          </p>
          <p className="ag-fussnote ag-aussage__fussnote">{aussage.fussnote}</p>
        </div>
      </div>
    </section>
  );
}
