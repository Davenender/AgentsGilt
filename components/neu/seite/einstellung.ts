"use client";

import { useEffect, useState } from "react";

/**
 * Zählt hoch, wenn der Besucher „weniger Bewegung“ während des Besuchs umstellt. Effekte, die
 * diese Zahl als Abhängigkeit haben, bauen sich dann ab und richten sich mit der neuen
 * Einstellung frisch ein (laufende Animationen enden, ruhige Endzustände stehen).
 */
export function useBewegungsWechsel(): number {
  const [zaehler, setZaehler] = useState(0);
  useEffect(() => {
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const umstellen = () => setZaehler((n) => n + 1);
    ruhig.addEventListener("change", umstellen);
    return () => ruhig.removeEventListener("change", umstellen);
  }, []);
  return zaehler;
}
