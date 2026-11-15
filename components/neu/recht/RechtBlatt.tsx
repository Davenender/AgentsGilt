"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NEUE_SEITE } from "@/lib/neue-seite";
import { Fusszeile } from "../Rahmen";
import { FussSchluss } from "../seite/FussSchluss";
import { scrollRuhe, scrollZiel } from "../umgebung";
import { Rechtsseite, ZurueckPfeil } from "./Rechtsseite";
import { RECHT_TAB, RECHT_TITEL, type RechtArt } from "./Rechtstexte";
import "./recht.css";

/** Führt die Adresse zu Impressum oder Datenschutz? */
function artVon(pfad: string): RechtArt | null {
  const sauber = pfad.replace(/\/+$/, "");
  return sauber === "/impressum" ? "impressum" : sauber === "/datenschutz" ? "datenschutz" : null;
}

/**
 * Impressum und Datenschutz als Blatt über der neuen Seite.
 *
 * Klickt man auf der neuen Seite auf „Impressum“ oder „Datenschutz“ (im Fuß, im Chat, im
 * Formular), öffnet sich der Text als Blatt über der Seite, im selben Design wie die eigene Seite
 * (/impressum, /datenschutz); die Adresse im Browser ist dieselbe. Die Seite darunter bleibt genau
 * so stehen, wie sie war: „Zurück“ (der Verweis oben, die Zurück-Taste des Browsers oder Escape)
 * schließt das Blatt, und man ist wieder an genau derselben Stelle, ohne dass die Seite neu lädt
 * oder ihre Startanimation noch einmal läuft. Ein Neuladen bei offenem Blatt zeigt die eigene
 * Seite; ihr „Zurück“ führt dann zum Fuß der neuen Seite.
 *
 * Solange das Blatt offen ist, ruht die Seite darunter (inert, sie scrollt nicht); die Kopfleiste,
 * der Chat und der Mauspunkt bleiben. Die Kopfleiste zeigt sich dabei wie oben auf einer Seite (mit
 * Namen und Menü; das Menü gleitet beim Hinunterscrollen im Blatt weg und kommt beim Hochscrollen
 * wieder). Ein Menüpunkt der Kopf- oder Fußleiste schließt das Blatt und scrollt dorthin.
 * Kommt man aus dem offenen Chat (Verweis „Datenschutz“ im Mitarbeiter-Formular), tritt das
 * Chat-Fenster so lange zurück und ist nach „Zurück“ wieder da, wie es war.
 */
const OFFEN_KLASSE = "ag-recht-offen";
const UNTEN_KLASSE = "ag-recht-unten";
export function RechtBlatt() {
  const [art, setArt] = useState<RechtArt | null>(null);
  const blatt = useRef<HTMLDivElement>(null);
  // Wohin es nach dem Schließen geht (ein Menüpunkt wurde gewählt) und woher der Fokus kam.
  const danach = useRef<string | null>(null);
  const kamVon = useRef<HTMLElement | null>(null);
  const titelVorher = useRef("");

  const schliessen = useCallback(() => window.history.back(), []);

  useEffect(() => {
    // Die Adresse sagt, ob das Blatt offen ist (auch bei Vor und Zurück im Browser).
    const lesen = () => setArt(artVon(window.location.pathname));
    const klick = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const link = (ev.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      let ziel: URL;
      try {
        ziel = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (ziel.origin !== window.location.origin) return;
      const offen = artVon(window.location.pathname);
      const neu = artVon(ziel.pathname);
      if (neu) {
        // Impressum oder Datenschutz: als Blatt über der Seite, nicht als neue Seite.
        ev.preventDefault();
        ev.stopPropagation();
        if (neu === offen) return;
        if (!offen) kamVon.current = link;
        // Ist schon ein Blatt offen, tauscht es nur den Text (ein „Zurück“ führt dann gleich zur Seite).
        if (offen) window.history.replaceState(window.history.state, "", ziel.pathname);
        else window.history.pushState(window.history.state, "", ziel.pathname);
        lesen();
        return;
      }
      // Bei offenem Blatt: Ein Sprungziel der Seite darunter schließt das Blatt und scrollt dorthin.
      // (Der Klick läuft weiter: Das Handy-Menü schließt sich dabei wie gewohnt selbst.)
      if (offen && ziel.hash && (ziel.pathname === NEUE_SEITE || link.getAttribute("href")?.startsWith("#"))) {
        ev.preventDefault();
        danach.current = ziel.hash.slice(1);
        window.history.back();
      }
    };
    // Vor den Verweisen der Seite selbst (auch vor denen von Next) an der Reihe.
    document.addEventListener("click", klick, true);
    window.addEventListener("popstate", lesen);
    return () => {
      document.removeEventListener("click", klick, true);
      window.removeEventListener("popstate", lesen);
    };
  }, []);

  // Offen: Die Seite darunter ruht, der Titel des Tabs nennt den Text, der Fokus geht ins Blatt.
  useEffect(() => {
    if (!art) return;
    const html = document.documentElement;
    const el = blatt.current;
    const ruhend = Array.from(document.querySelectorAll<HTMLElement>("main.ag-seite, footer.ag-fuss:not(.ag-rechtblatt footer), .ag-daumen"));
    ruhend.forEach((teil) => teil.setAttribute("inert", ""));
    // Die Seite darunter scrollt nicht mehr; gemerkt wird, wo sie steht.
    const lage = window.scrollY;
    scrollRuhe.setze(true);
    html.classList.add(OFFEN_KLASSE);
    titelVorher.current = document.title;
    document.title = RECHT_TAB[art];
    el?.scrollTo(0, 0);
    el?.querySelector<HTMLElement>(".ag-recht__zurueck")?.focus({ preventScroll: true });
    // Das Menü der Kopfleiste: beim Hinunterscrollen im Blatt weg, beim Hochscrollen wieder da
    // (erst ab 8 px Bewegung in eine Richtung, wie auf der Seite).
    let anker = 0;
    const rollt = () => {
      const y = el?.scrollTop ?? 0;
      if (Math.abs(y - anker) < 8) return;
      html.classList.toggle(UNTEN_KLASSE, y > anker && y > 80);
      anker = y;
    };
    el?.addEventListener("scroll", rollt, { passive: true });
    const taste = (ev: KeyboardEvent) => {
      // Escape schließt das Blatt, und nur das Blatt: Ein offener Chat darunter bleibt offen. (Ist
      // gerade das Handy-Menü offen, schließt Escape erst das Menü.)
      if (ev.key !== "Escape" || html.classList.contains("ag-menue-offen")) return;
      ev.stopPropagation();
      window.history.back();
    };
    window.addEventListener("keydown", taste, true);
    // „Anrufen“ in der Kopfleiste (am Computer: zum Kontakt-Bereich) schließt das Blatt und scrollt dorthin.
    scrollRuhe.beiZiel((ziel) => {
      danach.current = ziel.id || null;
      window.history.back();
    });
    return () => {
      window.removeEventListener("keydown", taste, true);
      scrollRuhe.beiZiel(undefined);
      el?.removeEventListener("scroll", rollt);
      ruhend.forEach((teil) => teil.removeAttribute("inert"));
      html.classList.remove(OFFEN_KLASSE, UNTEN_KLASSE);
      document.title = titelVorher.current;
      // Sicherheitsnetz: Hat sich die Seite darunter doch bewegt, steht sie wieder genau wie zuvor.
      if (Math.abs(window.scrollY - lage) > 1) window.scrollTo({ top: lage, behavior: "instant" });
      scrollRuhe.setze(false);
    };
  }, [art]);

  // Geschlossen: zurück zum Verweis, von dem man kam, oder zum gewählten Abschnitt der Seite.
  const warOffen = useRef(false);
  useEffect(() => {
    if (art) {
      warOffen.current = true;
      return;
    }
    if (!warOffen.current) return;
    warOffen.current = false;
    const ziel = danach.current ? document.getElementById(danach.current) : null;
    danach.current = null;
    if (ziel) scrollZiel.zu(ziel);
    else kamVon.current?.focus({ preventScroll: true });
    kamVon.current = null;
  }, [art]);

  // Das Blatt hängt neben der Seite (nicht in ihr): So kann die Seite ruhen, während es offen ist.
  const welt = typeof document === "undefined" ? null : document.querySelector(".ag-neu");
  if (!art || !welt) return null;
  return createPortal(
    <div ref={blatt} className="ag-rechtblatt" role="dialog" aria-modal="true" aria-label={RECHT_TITEL[art]} tabIndex={-1} data-lenis-prevent>
      <Rechtsseite
        key={art}
        art={art}
        ueberschrift="h2"
        zurueck={
          <button type="button" className="ag-recht__zurueck" onClick={schliessen}>
            <ZurueckPfeil />
            Zurück
          </button>
        }
      />
      {/* Die Fußleiste der neuen Seite, wie auf der eigenen Seite von Impressum und Datenschutz. */}
      <Fusszeile basis={NEUE_SEITE} anker={false} schluss={<FussSchluss />} />
    </div>,
    welt,
  );
}
