"use client";

import { useEffect } from "react";
import { richteGlimmrandEin } from "../glimmrand";

/**
 * Meldet alle Karten der Seite mit `data-glimm` für den Glimmrand an: die drei Glaskarten, die
 * Leistungen, die Karten bei „Unser Versprechen“, die Zertifikate und die zwei Kontakt-Karten.
 * Der Rand glimmt dort auf, wo die Maus in der Nähe ist. Es gibt dafür eine gemeinsame
 * Mausschleife für die ganze Seite (glimmrand.ts), nicht je Karte eine eigene. Zeichnet selbst nichts.
 */
export function GlimmAlle() {
  useEffect(() => {
    const seite = document.querySelector<HTMLElement>("main.ag-seite");
    if (!seite) return;
    return richteGlimmrandEin(seite);
  }, []);
  return null;
}
