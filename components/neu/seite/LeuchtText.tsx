"use client";

import { useEffect, useRef } from "react";
import { istVorschau } from "../umgebung";
import { useBewegungsWechsel } from "./einstellung";

/**
 * Text, der beim Runterscrollen Zeile für Zeile aufleuchtet. Er steht von Anfang an da, aber
 * gedämpft (25 % Deckkraft). Das Aufleuchten hängt direkt am Scrollen, nicht an einer Uhr: Es
 * beginnt, wenn die Oberkante des Textes bei 88 % der Bildhöhe steht, und ist fertig, wenn seine
 * Mitte die Bildschirmmitte erreicht. Erst die erste Zeile, dann die zweite, dann die dritte.
 * Danach blendet die Fußnote ein. Beim Hochscrollen bleibt alles hell.
 *
 * Ohne Skript, bei „weniger Bewegung“ und in der Vorschau steht alles sofort hell da.
 */
export function LeuchtText({ text, fussnote, className }: { text: string; fussnote?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const wechsel = useBewegungsWechsel();
  // Wie weit das Aufleuchten bei diesem Seitenaufruf schon war (0 bis 1): Es geht nur vorwärts.
  const weit = useRef(0);

  useEffect(() => {
    const el = ref.current;
    const absatz = el?.querySelector<HTMLElement>(".ag-lt__text");
    if (!el || !absatz || istVorschau()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // „Weniger Bewegung“: Alles steht hell da. Das gilt dann als gesehen: Später wird nichts wieder gedämpft.
      weit.current = 1;
      return;
    }
    let vorbei = false;
    const woerter = Array.from(absatz.querySelectorAll<HTMLElement>("span"));
    let zeilen: HTMLElement[][] = [];
    let stand = weit.current;
    let gemalt = -1;
    const ordnen = () => {
      zeilen = [];
      let oben = -1;
      for (const w of woerter) {
        if (w.offsetTop !== oben) {
          oben = w.offsetTop;
          zeilen.push([]);
        }
        zeilen[zeilen.length - 1].push(w);
      }
      gemalt = -1;
    };
    const male = () => {
      const r = absatz.getBoundingClientRect();
      const hoch = window.innerHeight;
      const von = hoch * 0.88;
      const bis = hoch * 0.5 - r.height / 2;
      stand = Math.max(stand, Math.min(1, Math.max(0, (von - r.top) / Math.max(1, von - bis))));
      weit.current = stand;
      if (stand === gemalt) return;
      gemalt = stand;
      const n = zeilen.length;
      zeilen.forEach((zeile, i) => {
        // Jede Zeile hat ihr eigenes Stück des Wegs; die nächste beginnt, kurz bevor die vorige ganz hell ist.
        const x = Math.min(1, Math.max(0, (stand * (n + 0.35) - i) / 1.35));
        const deck = (0.25 + 0.75 * x * x * (3 - 2 * x)).toFixed(3);
        for (const w of zeile) w.style.opacity = deck;
      });
      if (stand >= 1) el.dataset.hell = "1";
    };
    el.dataset.an = "1";
    ordnen();
    male();
    const neu = () => {
      // Kommt die Meldung erst nach dem Abbau (Schriften laden noch), bleibt alles, wie es ist.
      if (vorbei) return;
      ordnen();
      male();
    };
    const groesse = new ResizeObserver(neu);
    groesse.observe(absatz);
    document.fonts?.ready.then(neu).catch(() => undefined);
    window.addEventListener("scroll", male, { passive: true });
    return () => {
      vorbei = true;
      groesse.disconnect();
      window.removeEventListener("scroll", male);
      delete el.dataset.an;
      delete el.dataset.hell;
      for (const w of woerter) w.style.opacity = "";
    };
  }, [wechsel]);

  return (
    <div ref={ref} className={`ag-lt ${className ?? ""}`}>
      <p className="ag-lt__text">
        {text.split(" ").map((wort, i) => (
          <span key={i}>{wort} </span>
        ))}
      </p>
      {fussnote && <p className="ag-fussnote ag-lt__fussnote">{fussnote}</p>}
    </div>
  );
}
