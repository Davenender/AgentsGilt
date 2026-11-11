import Image from "next/image";
import { Knopf } from "@/components/neu/Knoepfe";
import { Marke } from "@/components/neu/Marke";
import { AUFBAUTEN } from "@/components/neu/aufbauten";

/**
 * Übersicht: die drei Aufbau-Varianten nebeneinander. Gezeigt werden feste
 * Aufnahmen (erster Bildschirm am Computer und am Handy, dazu die ganze Seite
 * als Streifen), keine eingebetteten Live-Seiten: Sonst würde der
 * Chat-Assistent hier mehrfach mitlaufen. Zum Ausprobieren mit Ladebildschirm
 * und Bewegung führt der Knopf auf die echte Seite.
 *
 * Die Aufnahmen liegen in public/varianten und zeigen den Stand des Tages, an
 * dem sie gemacht wurden (docs/funktionen.md, Abschnitt 9).
 */
export default function VariantenUebersicht() {
  return (
    <main className="ag-wrap ag-uebersicht">
      <header className="ag-uebersicht__kopf">
        <p className="ag-fuss__marke">
          <Marke />
          Agents Gilt
        </p>
        <h1 className="ag-versal">
          Drei Aufbauten, <em className="ag-gold">eine Welt.</em>
        </h1>
        <p className="ag-text">
          Alle drei zeigen die gewählte Richtung „Chromzeichen in der Punktwolke“ mit denselben Texten und Funktionen. Unterschiedlich ist
          nur der Aufbau. Hier sehen Sie Aufnahmen; Ladebildschirm und Bewegung erleben Sie auf der echten Seite.
        </p>
      </header>
      <ul className="ag-uebersicht__reihe">
        {AUFBAUTEN.map((a) => (
          <li key={a.slug} className="ag-uebersicht__karte">
            <h2 className="ag-versal">{a.name}</h2>
            <p>{a.satz}</p>
            <Knopf href={`/varianten/${a.slug}`}>{a.name} öffnen</Knopf>
            <div className="ag-uebersicht__bilder">
              <Image
                className="ag-uebersicht__breit"
                src={`/varianten/${a.slug}-computer.jpg`}
                alt={`${a.name}: erster Bildschirm am Computer`}
                width={1440}
                height={900}
                sizes="(max-width: 1023px) 92vw, 30vw"
                priority
              />
              <Image
                className="ag-uebersicht__handy"
                src={`/varianten/${a.slug}-handy.jpg`}
                alt={`${a.name}: erster Bildschirm am Handy`}
                width={780}
                height={1688}
                sizes="150px"
              />
            </div>
            <Image
              className="ag-uebersicht__ganz"
              src={`/varianten/${a.slug}-ganz.jpg`}
              alt={`${a.name}: die ganze Seite von oben bis unten`}
              width={720}
              height={a.hoehe}
              sizes="(max-width: 1023px) 92vw, 30vw"
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
