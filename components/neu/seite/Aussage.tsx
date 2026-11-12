import { aussage } from "@/lib/inhalt-neu";
import { AnrufLeiste } from "../Knoepfe";
import { Zeilen } from "../Zeilen";
import { Entschluesselt } from "./Entschluesselt";

/**
 * Die erste Aussage unter dem Kopfbereich und zugleich die Hauptüberschrift der Seite: Während die
 * Zeichen des Namens auseinanderfliegen, erscheint sie groß und entschlüsselt sich von links nach
 * rechts. Das Schlüsselwort leuchtet golden. Darunter ein kurzer Satz und „Jetzt anrufen“.
 */
export function Aussage() {
  return (
    <section className="ag-aussage" aria-label="Was wir machen">
      <div className="ag-wrap ag-aussage__innen">
        <Entschluesselt als="h1" className="ag-versal ag-aussage__satz">
          {aussage.vor} <em className="ag-gold ag-leuchtet">{aussage.gold}</em>
          <span className="ag-aussage__stern">*</span>
          {aussage.nach}
        </Entschluesselt>
        <Zeilen als="p" className="ag-aussage__text">
          {aussage.satz}
        </Zeilen>
        <AnrufLeiste />
        <p className="ag-fussnote">{aussage.fussnote}</p>
      </div>
    </section>
  );
}
