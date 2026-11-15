"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ausbildung } from "@/lib/inhalt-neu";

// „Ausgebildet in Anthropics KI-Technologie“: die vier Zertifikate (je zwei Personen, per Knopf
// umzuschalten). Stand bis 15.11.2026 in components/neu/Bereiche.tsx, zusammen mit den Abschnitten
// der früheren Aufbau-Varianten; die gibt es nicht mehr.

/* ───────────── Ausbildung: Zertifikate ───────────── */

function ZertifikatKarte({ kurs, i }: { kurs: (typeof ausbildung.kurse)[number]; i: number }) {
  // Je Kurs gibt es zwei Zertifikate (wie bisher); hier wechselt man per Knopf.
  const [wer, setWer] = useState(0);
  const z = kurs.certs[wer];
  return (
    <li className="ag-zert__karte" style={{ "--i": i } as CSSProperties}>
      {/* Ein Klick auf das Bild öffnet dasselbe Zertifikat wie der Link darunter (auf der neuen
          Seite zeigt die Maus hier die Glasblase „Ansehen“). Mit der Tastatur bleibt es bei dem
          einen Halt auf „Zertifikat ansehen“; die Bildbeschreibung bleibt für Vorleseprogramme. */}
      <a className="ag-zert__bild" href={z.pdf} target="_blank" rel="noopener noreferrer" data-zeiger="ansehen" data-glimm tabIndex={-1}>
        <Image src={z.img} alt={`Zertifikat ${kurs.title} von ${z.name}`} width={792} height={612} sizes="(max-width: 599px) 92vw, (max-width: 1023px) 46vw, 320px" />
      </a>
      <h3 className="ag-zert__titel">{kurs.title}</h3>
      <div className="ag-zert__wer" role="group" aria-label={`Zertifikat ${kurs.title} von`}>
        {kurs.certs.map((c, n) => (
          <button key={c.name} type="button" aria-pressed={n === wer} onClick={() => setWer(n)}>
            {c.name}
          </button>
        ))}
      </div>
      <a className="ag-link" href={z.pdf} target="_blank" rel="noopener noreferrer">
        {ausbildung.ansehen}
      </a>
    </li>
  );
}

/** `titel`: die Überschrift (die Seite setzt sie mit dem Entschlüsselungs-Effekt). */
export function Ausbildung({ titel }: { titel: ReactNode }) {
  return (
    <div className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile">
        {titel}
        <p className="ag-text">{ausbildung.text}</p>
      </header>
      <ul className="ag-zert">
        {ausbildung.kurse.map((kurs, i) => (
          <ZertifikatKarte key={kurs.title} kurs={kurs} i={i} />
        ))}
      </ul>
    </div>
  );
}
