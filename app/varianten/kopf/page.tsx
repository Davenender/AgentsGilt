import Image from "next/image";
import { Knopf } from "@/components/neu/Knoepfe";
import { Marke } from "@/components/neu/Marke";
import { KOPFBILDER } from "@/components/neu/kopf/kopfbilder";

/**
 * Übersicht: die vier Kopfbild-Varianten nebeneinander, als feste Aufnahmen
 * (Computer und Handy). Keine eingebetteten Live-Seiten: Sonst liefen hier
 * vier 3D-Szenen und mehrere Chat-Assistenten gleichzeitig. Zum Ausprobieren
 * mit Maus, Tippen und Bewegung führt der Knopf auf die echte Seite.
 *
 * Die Aufnahmen liegen in public/varianten/kopf (docs/funktionen.md, Abschnitt 9).
 */
export default function KopfUebersicht() {
  return (
    <main className="ag-wrap ag-uebersicht">
      <header className="ag-uebersicht__kopf">
        <p className="ag-fuss__marke">
          <Marke />
          Agents Gilt
        </p>
        <h1 className="ag-versal">
          Vier Kopfbilder, <em className="ag-gold">ein Aufbau.</em>
        </h1>
        <p className="ag-text">
          Alle vier gehören zum gewählten Aufbau „Riesen-Schriftzug“. Gewählt ist „Kern im Schriftzug“, inzwischen neu gebaut und ohne Text:
          das Logo als Licht, der Name aus Schriftzeichen. Die drei anderen zeigen noch den verworfenen Stand mit 3D-Zeichen. Hier sehen Sie
          Aufnahmen; Maus, Klick und Ladebildschirm erleben Sie auf der echten Seite.
        </p>
      </header>
      <ul className="ag-uebersicht__reihe ag-uebersicht__reihe--vier">
        {KOPFBILDER.map((k) => (
          <li key={k.slug} className="ag-uebersicht__karte">
            <h2 className="ag-versal">{k.name}</h2>
            <p>{k.satz}</p>
            <Knopf href={`/varianten/kopf/${k.slug}`}>{k.name} öffnen</Knopf>
            <div className="ag-uebersicht__bilder">
              <Image
                className="ag-uebersicht__breit"
                src={`/varianten/kopf/${k.slug}-computer.jpg`}
                alt={`${k.name}: Kopfbereich am Computer`}
                width={1440}
                height={900}
                sizes="(max-width: 1023px) 92vw, 46vw"
                priority
              />
              <Image
                className="ag-uebersicht__handy"
                src={`/varianten/kopf/${k.slug}-handy.jpg`}
                alt={`${k.name}: Kopfbereich am Handy`}
                width={780}
                height={1688}
                sizes="150px"
              />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
