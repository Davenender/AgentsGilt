import { aussage } from "@/lib/inhalt-neu";
import { Entschluesselt } from "./Entschluesselt";
import { LeuchtText } from "./LeuchtText";

/**
 * Die erste Aussage unter dem Kopfbereich und zugleich die Hauptüberschrift der Seite. Sie steht
 * als Zufallszeichen da und setzt sich beim Hinscrollen von links nach rechts zum Satz zusammen,
 * zuerst mit „Tagen“. Dann zerfällt „Tagen“ in Zufallszeichen und rastet als „Stunden“ ein, das
 * golden aufleuchtet (Entschluesselt.tsx, Gruppe mit `data-erst`).
 *
 * Darunter steht Davids Text, zuerst gedämpft: Beim Runterscrollen leuchtet er Zeile für Zeile
 * auf, danach blendet die Fußnote ein (LeuchtText.tsx).
 */
export function Aussage() {
  return (
    <section className="ag-aussage" aria-label="Was wir machen">
      <div className="ag-wrap ag-aussage__innen">
        <Entschluesselt als="h1" className="ag-versal ag-aussage__satz" dauer={1300}>
          {aussage.vor}{" "}
          {/* Diese Gruppe rastet zuerst als „Tagen,“ ein und erst danach als „Stunden*,“. */}
          <span data-erst={`${aussage.erst}${aussage.nach.slice(0, 1)}`}>
            <em className="ag-gold ag-leuchtet">{aussage.gold}</em>
            <span className="ag-aussage__stern">*</span>
            {aussage.nach.slice(0, 1)}
          </span>
          {aussage.nach.slice(1)}
        </Entschluesselt>
        <LeuchtText className="ag-aussage__text" text={aussage.text} fussnote={aussage.fussnote} />
      </div>
    </section>
  );
}
