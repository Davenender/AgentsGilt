"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { glimme } from "../glimmrand";

/** Die Glaskarte der Terminseite: Milchglas mit Lichtkante, der goldene Rand glimmt unter der Maus. */
export function TerminKarte({ children }: { children: ReactNode }) {
  const rand = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!rand.current) return;
    return glimme(rand.current);
  }, []);
  return (
    <div className="ag-ts__karte">
      <span ref={rand} className="ag-ts__glas" aria-hidden="true" data-glimm />
      <div className="ag-ts__inhalt">{children}</div>
    </div>
  );
}
