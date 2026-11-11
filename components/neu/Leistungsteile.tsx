"use client";

import { leistungenKopf } from "@/lib/inhalt-neu";
import { Pfeil } from "./Marke";

const strich = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Sechs selbst gezeichnete Zeichen, eines je Leistung (dünne Linien, eine Strichstärke). */
const ZEICHNUNGEN = [
  // Websites & Landingpages: Browserfenster
  <g key="web" {...strich}>
    <rect x="6" y="9" width="36" height="30" rx="4" />
    <path d="M6 17h36M12 25h14M12 31h22" />
    <path d="M11 13h.01M15 13h.01" strokeWidth="2.2" />
  </g>,
  // KI-Chatbots: Sprechblase
  <g key="chat" {...strich}>
    <path d="M8 12a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-8 7v-7h-2a4 4 0 0 1-4-4Z" />
    <path d="M17 20h.01M24 20h.01M31 20h.01" strokeWidth="2.6" />
  </g>,
  // Voice-Agenten: Hörer mit Schallwellen
  <g key="voice" {...strich}>
    <path d="M7 12c0-2 1.6-3.6 3.6-3.6h3.6c1.6 0 3 1 3.4 2.6l1.2 4.6c.4 1.3 0 2.7-1 3.6l-2.4 2a23 23 0 0 0 10.6 10.6l2-2.4c.9-1 2.3-1.4 3.6-1l4.6 1.2c1.6.4 2.6 1.8 2.6 3.4V37c0 2-1.6 3.6-3.6 3.6C19.6 40.6 7 28 7 12Z" />
    <path d="M30 8a10 10 0 0 1 10 10M30 14a4 4 0 0 1 4 4" />
  </g>,
  // Online-Terminbuchung: Kalender mit Haken
  <g key="termin" {...strich}>
    <rect x="7" y="10" width="34" height="31" rx="5" />
    <path d="M7 19h34M16 6v7M32 6v7M17 30l5 5 9-10" />
  </g>,
  // Automatisierungen: verbundene Knoten
  <g key="auto" {...strich}>
    <circle cx="10" cy="24" r="4" />
    <circle cx="38" cy="12" r="4" />
    <circle cx="38" cy="36" r="4" />
    <path d="M13.7 22.4 34.3 13.6M13.7 25.6l20.6 8.8" />
  </g>,
  // KI-Beratung & Audit: Kompass
  <g key="rat" {...strich}>
    <circle cx="24" cy="24" r="17" />
    <path d="m30.5 17.5-3.6 9.4-9.4 3.6 3.6-9.4Z" />
  </g>,
];

export function LeistungsZeichen({ nr, className }: { nr: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      {ZEICHNUNGEN[nr % ZEICHNUNGEN.length]}
    </svg>
  );
}

/**
 * „Anfragen“ an einer Leistung: wählt die Leistung im Anfrage-Formular vor
 * (Ereignis ag:select-service, wie bisher) und springt zum Kontakt.
 */
export function AuswahlKnopf({ titel }: { titel: string }) {
  const waehlen = () => {
    window.dispatchEvent(new CustomEvent("ag:select-service", { detail: titel }));
    document.getElementById("kontakt")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <button type="button" className="ag-wahl" aria-label={`${titel} für Anfrage auswählen`} onClick={waehlen}>
      {leistungenKopf.waehlen}
      <span className="ag-kreis">
        <Pfeil />
      </span>
    </button>
  );
}
