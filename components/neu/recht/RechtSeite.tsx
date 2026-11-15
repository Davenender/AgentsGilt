"use client";

import type { MouseEvent } from "react";
import { FUSS_ANKER, NEUE_SEITE } from "@/lib/neue-seite";
import { Rahmen } from "../Rahmen";
import { FussSchluss } from "../seite/FussSchluss";
import { Zeiger } from "../seite/Zeiger";
import { Rechtsseite, ZurueckPfeil } from "./Rechtsseite";
import type { RechtArt } from "./Rechtstexte";
import "../seite/seite.css";
import "./recht.css";

/**
 * Impressum und Datenschutz als eigene Seite (/impressum, /datenschutz), im Design der neuen Seite:
 * ihre Kopfleiste, ihre Fußleiste (mit ihrem Schluss: Stern, Name aus Zeichen, Lichtleiste), ihr
 * Mauspunkt, ihr Chat. Keine Startanimation, kein großer Stern, keine schweren Effekte.
 *
 * „Zurück“ führt dorthin, wo man herkam, an genau dieselbe Stelle (der Browser stellt sie wieder
 * her). Kam man von außen direkt auf die Seite, führt es auf die neue Seite, ganz nach unten zum
 * Fuß. (Auf der neuen Seite selbst öffnen sich Impressum und Datenschutz als Blatt über der Seite:
 * RechtBlatt.tsx. Dort bleibt die Seite darunter einfach stehen.)
 */
export function RechtSeite({ art }: { art: RechtArt }) {
  const zurueck = (ev: MouseEvent<HTMLAnchorElement>) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
    if (!kamVonHier()) return;
    ev.preventDefault();
    window.history.back();
  };
  return (
    <Rahmen start="ohne" klasse="ag-seite ag-rechtseite" basis={NEUE_SEITE} fussSchluss={<FussSchluss />}>
      <Zeiger />
      <Rechtsseite
        art={art}
        zurueck={
          <a className="ag-recht__zurueck" href={`${NEUE_SEITE}#${FUSS_ANKER}`} onClick={zurueck}>
            <ZurueckPfeil />
            Zurück
          </a>
        }
      />
    </Rahmen>
  );
}

/** Gibt es in diesem Tab eine Seite dieser Website, zu der „Zurück“ führen kann? */
function kamVonHier(): boolean {
  // Die genaue Auskunft des Browsers, wo es sie gibt.
  const verlauf = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
  if (typeof verlauf?.canGoBack === "boolean") return verlauf.canGoBack;
  // Sonst: Die Seite wurde von einer Seite dieser Website aus geladen.
  try {
    return window.history.length > 1 && !!document.referrer && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}
