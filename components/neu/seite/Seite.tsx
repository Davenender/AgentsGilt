import { ausbildung, kontakt } from "@/lib/inhalt-neu";
import { Ausbildung, Kontakt } from "../Bereiche";
import { LichtName } from "../kopf/LichtName";
import { Rahmen } from "../Rahmen";
import { AblaufNummern } from "./AblaufNummern";
import { Aussage } from "./Aussage";
import { Entschluesselt } from "./Entschluesselt";
import { FussSchluss } from "./FussSchluss";
import { Leistungen } from "./Leistungen";
import { ScrollHinweis } from "./ScrollHinweis";
import { Uebergang } from "./Uebergang";
import { Stimmen, Warum } from "./Warum";
import { Zeiger } from "./Zeiger";
import "./seite.css";

/**
 * Kopfbereich ohne Text: das Licht-Logo, darunter der Name aus Zeichen (kopf/LichtName.tsx, dort
 * läuft auch die Startanimation). Am unteren Rand der Scroll-Hinweis aus Licht.
 * `data-start` beginnt mit „warten“: Bis die Startanimation so weit ist, bleiben Kopfleiste,
 * „Anrufen“ und Chat-Knopf verborgen (Stylesheet).
 */
function Kopf() {
  return (
    <section id="top" className="ag-hero ag-kopf5" aria-label="Agents Gilt" data-start="warten">
      <LichtName />
      <ScrollHinweis />
    </section>
  );
}

/**
 * Die neue Seite: Kopfbereich mit Licht und Namen, dann die erste Aussage, das Wörter-Feld mit
 * dem Stern, die Leistungen mit ihren kleinen Szenen, der Ablauf mit Zeichen-Nummern, „Warum wir“
 * mit dem Versprechen, die Ausbildung, (Kundenstimmen, solange aus) und der Kontakt. Die Fußleiste
 * endet, wie die Seite beginnt: Stern im Dunkeln, der Name aus Zeichen, eine Lichtleiste.
 * Alle Anker bleiben: #top #leistungen #ablauf #warum #ausbildung #kontakt.
 */
export function Seite() {
  return (
    <Rahmen start="licht" klasse="ag-seite" fussSchluss={<FussSchluss />}>
      <Zeiger />
      <Kopf />
      <Aussage />
      <Uebergang />
      <section id="leistungen">
        <Leistungen />
      </section>
      <section id="ablauf">
        <AblaufNummern />
      </section>
      <section id="warum">
        <Warum />
      </section>
      <section id="ausbildung">
        <Ausbildung
          titel={
            <Entschluesselt als="h2" className="ag-versal ag-titel">
              {ausbildung.vor} <em className="ag-gold ag-leuchtet">{ausbildung.gold}</em> {ausbildung.nach}
            </Entschluesselt>
          }
        />
      </section>
      <Stimmen />
      <section id="kontakt">
        {/* Der Kontakt-Bereich bleibt, wie er ist; nur seine Überschrift entschlüsselt sich wie die anderen. */}
        <Kontakt
          titel={
            <Entschluesselt als="h2" className="ag-versal ag-titel">
              {kontakt.vor} <em className="ag-gold ag-leuchtet">{kontakt.gold}</em>
            </Entschluesselt>
          }
        />
      </section>
    </Rahmen>
  );
}
