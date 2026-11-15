import type { ReactNode } from "react";
import { DatenschutzText, ImpressumText, RECHT_TITEL, type RechtArt } from "./Rechtstexte";

/**
 * Impressum oder Datenschutzerklärung im Design der neuen Seite: dunkler Grund, Überschriften in
 * der Schrift der Seite, ruhige Abstände, angenehme Zeilenbreite (recht.css). Der Wortlaut kommt
 * unverändert aus Rechtstexte.tsx. `zurueck` ist der Verweis über der Überschrift.
 */
export function Rechtsseite({ art, zurueck, ueberschrift = "h1" }: { art: RechtArt; zurueck: ReactNode; ueberschrift?: "h1" | "h2" }) {
  const Titel = ueberschrift;
  return (
    <article className="ag-recht">
      <div className="ag-recht__innen">
        {zurueck}
        <Titel className="ag-versal ag-recht__titel">{RECHT_TITEL[art]}</Titel>
        <div className="ag-recht__text">{art === "impressum" ? <ImpressumText /> : <DatenschutzText />}</div>
      </div>
    </article>
  );
}

/** Der Pfeil vor „Zurück“. */
export function ZurueckPfeil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
