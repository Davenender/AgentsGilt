import type { CSSProperties } from "react";
import { stimmen, versprechen, warum, worte } from "@/lib/inhalt-neu";
import { STERN } from "../Marke";
import { Zeilen } from "../Zeilen";
import { Entschluesselt } from "./Entschluesselt";

/** Der Stern des Logos als Trennzeichen im Band. */
function Trenner() {
  return (
    <svg className="ag-band__stern" viewBox="-22 -22 44 44" aria-hidden="true">
      <path d={STERN} />
    </svg>
  );
}

/**
 * „Warum wir“ mit „Unser Versprechen“: drei leicht schräge Karten, jede mit eigener kleiner
 * Drehung. Beim Drüberfahren richtet sich die Karte gerade aus, hebt sich etwas und federt; die
 * anderen werden etwas blasser (Stylesheet). Ihr Rand glimmt, wo die Maus in der Nähe ist
 * (glimmrand.ts). Darunter läuft ein schräges Band mit den vier Wörtern.
 */
export function Warum() {
  // Zwei gleiche Hälften: Das Band läuft nahtlos um.
  const haelfte = [0, 1, 2].flatMap((runde) => worte.map((w) => `${runde}-${w}`));
  return (
    <>
      <div className="ag-wrap ag-abschnitt ag-vers">
        <header className="ag-kopfzeile">
          <Entschluesselt als="h2" className="ag-versal ag-titel">
            {warum.vor} <em className="ag-gold ag-leuchtet">{warum.gold}</em> {warum.nach}
          </Entschluesselt>
          <Zeilen als="p" className="ag-text">
            {versprechen.text}
          </Zeilen>
        </header>
        <h3 className="ag-versal ag-vers__titel">{versprechen.titel}</h3>
        <ul className="ag-vers__karten">
          {versprechen.karten.map((k, i) => (
            <li key={k.titel} className="ag-vers__karte ag-glimm" style={{ "--i": i } as CSSProperties} data-glimm>
              <h4 className="ag-versal">{k.titel}</h4>
              <p>{k.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="ag-band" aria-hidden="true">
        <div className="ag-band__lauf">
          {[0, 1].map((teil) => (
            <span key={teil} className="ag-versal">
              {haelfte.map((schluessel) => (
                <span key={schluessel}>
                  {schluessel.slice(2)}
                  <Trenner />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Kundenstimmen: fertig gebaut im gleichen Stil, aber AUS. Eingeschaltet wird der Abschnitt über
 * `testimonials.aktiv` in lib/content.ts, sobald dort echte, freigegebene Stimmen stehen.
 */
export function Stimmen() {
  if (!stimmen.aktiv) return null;
  return (
    <section id="stimmen" aria-label={stimmen.titel}>
      <div className="ag-wrap ag-abschnitt ag-stimmen">
        <header className="ag-kopfzeile">
          <Entschluesselt als="h2" className="ag-versal ag-titel">
            {stimmen.titel}
          </Entschluesselt>
        </header>
        <ul className="ag-stimmen__liste">
          {stimmen.liste.map((s, i) => (
            <li key={i} className="ag-stimmen__karte" style={{ "--i": i } as CSSProperties}>
              <blockquote>
                <p>{s.text}</p>
              </blockquote>
              <p className="ag-stimmen__wer">
                <strong>{s.name}</strong>
                <span className="ag-mono">{s.firma}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
