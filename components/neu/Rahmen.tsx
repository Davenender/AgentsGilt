"use client";

import Lenis from "lenis";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { fuss, hero, marke, navigation } from "@/lib/inhalt-neu";
import { FUSS_ANKER } from "@/lib/neue-seite";
import { Knopf } from "./Knoepfe";
import { Kopfleiste } from "./Kopfleiste";
import { ChatFenster } from "./chat/ChatFenster";
import { ChatKnopf } from "./ChatKnopf";
import { Ladebildschirm } from "./Ladebildschirm";
import { GoldVerlauf, Marke } from "./Marke";
import { istVorschau, scrollRuhe, scrollSperre, scrollZiel, willWenigerBewegung } from "./umgebung";

/**
 * Weiches Scrollen mit Lenis, im Takt von GSAP, damit ScrollTrigger und Lenis
 * dieselbe Uhr haben. Das Scrollen bleibt das normale Scrollen des Browsers
 * (kein Scroll-Zwang); bei „weniger Bewegung“ und in der Vorschau bleibt Lenis aus.
 */
function WeichesScrollen() {
  useEffect(() => {
    if (willWenigerBewegung() || istVorschau()) return;
    // allowNestedScroll: Das Chat-Fenster scrollt weiter für sich.
    const lenis = new Lenis({ anchors: true, allowNestedScroll: true, lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    const takt = (zeit: number) => lenis.raf(zeit * 1000);
    gsap.ticker.add(takt);
    gsap.ticker.lagSmoothing(0);
    // „Anrufen“ in der Kopfleiste scrollt am Computer hierüber weich zum Kontakt; nach der
    // Startanimation geht es hierüber zum Sprungziel. Misst ScrollTrigger unterwegs neu (etwa weil
    // die Seite gerade fertig geladen hat), bricht das den weichen Lauf ab: Dann geht es noch einmal
    // los, bis das Ziel erreicht ist. Greift der Besucher selbst ein, hat er das letzte Wort.
    // Womit der Besucher selbst eingreift: Mausrad, Finger, Tasten, und jeder Klick (auch auf ein
    // anderes Sprungziel in der Kopfleiste; die gewöhnlichen Sprungziele scrollt Lenis selbst) sowie
    // ein neues Ziel in der Adresse.
    const EINGRIFFE = ["wheel", "touchstart", "keydown", "pointerdown", "hashchange"];
    let zielAb: (() => void) | undefined;
    scrollZiel.melde((ziel) => {
      zielAb?.();
      const nochmal = () => lenis.scrollTo(ziel, { onComplete: ende });
      const ende = () => {
        if (zielAb !== ende) return;
        zielAb = undefined;
        window.clearTimeout(uhr);
        ScrollTrigger.removeEventListener("refresh", nochmal);
        for (const art of EINGRIFFE) window.removeEventListener(art, ende, true);
      };
      zielAb = ende;
      ScrollTrigger.addEventListener("refresh", nochmal);
      for (const art of EINGRIFFE) window.addEventListener(art, ende, { passive: true, capture: true });
      // Spätestens nach 4 s ist Schluss mit dem Nachfassen.
      const uhr = window.setTimeout(ende, 4000);
      nochmal();
    });
    // Während der Startanimation steht die Seite oben: Solange hält auch das weiche Scrollen an.
    // Die Seite ist in dieser Zeit nur so hoch wie das Bild (Stylesheet); nach der Freigabe messen
    // Lenis und ScrollTrigger deshalb neu.
    // Nur nach einer echten Sperre (dann steht die Seite ganz oben): Beim Neumessen fährt
    // ScrollTrigger die Seite kurz auf 0 und zurück, das darf eine wiederhergestellte Lage nicht stören.
    // Solange die Seite gesperrt ist, scrollt nichts: Dann gleicht GSAP lange Pausen zwischen zwei
    // Bildern aus (über 0,5 s zählen wie 33 ms). Ist der Tab während der Startanimation verdeckt
    // oder hängt der Rechner kurz, läuft die Abfolge danach dort weiter, wo sie war, statt ans Ende
    // zu springen. Mit der Freigabe gilt wieder der genaue Takt, den das weiche Scrollen braucht.
    let warGesperrt = false;
    scrollSperre.melde((an) => {
      if (an) {
        warGesperrt = true;
        gsap.ticker.lagSmoothing(500, 33);
        return lenis.stop();
      }
      if (!warGesperrt) return;
      warGesperrt = false;
      gsap.ticker.lagSmoothing(0);
      lenis.resize();
      lenis.start();
      ScrollTrigger.refresh();
    });
    // Liegt ein Blatt über der Seite (Impressum, Datenschutz), ruht das weiche Scrollen so lange:
    // Die Seite darunter bleibt genau stehen, wo sie ist.
    scrollRuhe.melde((an) => (an ? lenis.stop() : lenis.start()));
    return () => {
      scrollRuhe.melde(undefined);
      scrollSperre.melde(undefined);
      scrollZiel.melde(undefined);
      zielAb?.();
      gsap.ticker.remove(takt);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
  return null;
}

/**
 * Anrufen-Knopf am Daumen (nur Handy): erscheint, sobald weder eine Anruf-Leiste
 * noch der textfreie Kopfbereich im Bild ist. So bleibt Anrufen immer erreichbar, ohne doppelt zu stehen.
 * Er blendet aus, solange ein Formular offen ist oder in ein Feld getippt wird (die Tastatur ist
 * da): Dann verdeckt er nichts.
 */
function DaumenLeiste({ start }: { start?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const imBild = new Set<Element>();
    const waechter = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) {
        if (e.isIntersecting) imBild.add(e.target);
        else imBild.delete(e.target);
      }
      el.setAttribute("data-da", String(imBild.size === 0));
    });
    // Im textfreien Kopfbereich steht „Anrufen“ in der Kopfleiste: Dort bleibt der Daumen-Knopf weg.
    document.querySelectorAll("main .ag-anruf, .ag-fuss, #top.ag-kopf5").forEach((leiste) => waechter.observe(leiste));

    // Der Knopf weicht, solange er etwas verdecken würde: ein offenes Formular (das
    // Anfrage-Formular im Kontakt) oder ein Feld, in das gerade getippt wird (dann ist am Handy
    // die Tastatur da).
    const tippt = () => !!document.activeElement?.matches?.("input:not([type='checkbox'], [type='radio'], [type='button'], [type='submit']), textarea, select, [contenteditable='true']");
    const formularOffen = () => !!document.querySelector(".ag-anfrage[data-offen='true']");
    const sicht = window.visualViewport;
    const tastatur = () => !!sicht && window.innerHeight - sicht.height > 140;
    const pruefen = () => {
      if (tippt() || formularOffen() || tastatur()) el.dataset.weg = "1";
      else delete el.dataset.weg;
    };
    const formulare = new MutationObserver(pruefen);
    document.querySelectorAll(".ag-anfrage").forEach((f) => formulare.observe(f, { attributes: true, attributeFilter: ["data-offen"] }));
    document.addEventListener("focusin", pruefen);
    document.addEventListener("focusout", pruefen);
    sicht?.addEventListener("resize", pruefen);
    pruefen();
    return () => {
      waechter.disconnect();
      formulare.disconnect();
      document.removeEventListener("focusin", pruefen);
      document.removeEventListener("focusout", pruefen);
      sicht?.removeEventListener("resize", pruefen);
    };
  }, []);

  return (
    <div ref={ref} className="ag-daumen" data-da="false" data-start={start}>
      <Knopf href={`tel:${marke.telefon}`}>{hero.anrufen}</Knopf>
    </div>
  );
}

/**
 * Die Fußleiste. `basis`: Auf einer Unterseite (Impressum, Datenschutz) die Adresse der neuen
 * Seite; dann führen die Menüpunkte zu ihren Abschnitten dort. `anker`: Das Sprungziel „fuss“
 * (dorthin führt „Zurück“ von Impressum und Datenschutz) trägt nur die Fußleiste der Seite selbst.
 */
export function Fusszeile({ schluss, basis = "", anker = true }: { schluss?: ReactNode; basis?: string; anker?: boolean }) {
  return (
    <footer id={anker ? FUSS_ANKER : undefined} className={`ag-fuss ${schluss ? "ag-fuss--schluss" : ""}`}>
      <div className="ag-wrap ag-fuss__oben">
        <div>
          <div className="ag-fuss__marke">
            <Marke />
            {marke.name}
          </div>
          <p className="ag-fuss__text">{fuss.text}</p>
        </div>
        <ul className="ag-fuss__spalte" aria-label="Navigation">
          {navigation.map((n) => (
            <li key={n.href}>
              <a href={`${basis}${n.href}`}>{n.label}</a>
            </li>
          ))}
        </ul>
        <ul className="ag-fuss__spalte" aria-label="Kontakt und Recht">
          <li>
            <a href={`tel:${marke.telefon}`}>{marke.telefonAnzeige}</a>
          </li>
          <li>
            <a href={`mailto:${marke.email}`}>{marke.email}</a>
          </li>
          <li>
            <Link href="/impressum">Impressum</Link>
          </li>
          <li>
            <Link href="/datenschutz">Datenschutz</Link>
          </li>
        </ul>
      </div>
      {/* Stehender Riesen-Schriftzug (kein Laufband); auf der neuen Seite stattdessen ihr Schluss. */}
      {schluss ?? (
        <div className="ag-wrap ag-fuss__wort">
          <Wortmarke />
        </div>
      )}
      <p className="ag-wrap ag-fuss__unten">
        © {new Date().getFullYear()} {marke.name}. {fuss.rechte}
      </p>
    </footer>
  );
}

/** Der Name in Riesengröße, immer genau so breit wie der Inhalt der Seite. */
export function Wortmarke({ className }: { className?: string }) {
  return (
    <svg className={`ag-wortmarke ${className ?? ""}`} viewBox="0 0 1000 212" role="img" aria-label={marke.name}>
      <text x="0" y="205" textLength="1000" lengthAdjust="spacingAndGlyphs">
        AGENTS GILT
      </text>
    </svg>
  );
}

/**
 * Rahmen jeder Variante: Ladebildschirm, Kopfleiste, Inhalt, Fußleiste.
 *
 * `start="licht"`: Die Seite hat die neue Startanimation des Kopfbereichs (Stern im Dunkeln, dann
 * Licht, dann Zeichen; kopf/LichtName.tsx). Der alte Ladebildschirm mit den Balken entfällt dann.
 * Kopfleiste, Chat-Knopf und Daumen-Knopf tragen dann von Anfang an den Stand des Starts
 * (`data-start="warten"`): Sie bleiben verborgen, bis die Zeichen landen (kopf.css).
 * `start="ohne"`: keine Startanimation, kein Ladebildschirm (Impressum, Datenschutz).
 * `fussSchluss` ersetzt in der Fußleiste den Riesenschriftzug (die neue Seite endet mit Stern,
 * Namen aus Zeichen und Lichtleiste: seite/FussSchluss.tsx).
 * `basis`: Unterseiten (Impressum, Datenschutz) nennen hier die Adresse der neuen Seite; Kopf- und
 * Fußleiste führen dann zu deren Abschnitten.
 * `daumen={false}`: kein Anrufen-Knopf am Daumen (Impressum, Datenschutz: Dort soll nichts den
 * Text verdecken; „Anrufen“ steht in der Kopfleiste).
 */
export function Rahmen({
  children,
  klasse,
  start = "balken",
  fussSchluss,
  basis = "",
  daumen = true,
}: {
  children: ReactNode;
  klasse?: string;
  start?: "balken" | "licht" | "ohne";
  fussSchluss?: ReactNode;
  basis?: string;
  daumen?: boolean;
}) {
  // Mit der Startanimation beginnen Kopfleiste, Chat-Knopf und Daumen-Knopf im Stand „warten“.
  const stand = start === "licht" ? "warten" : undefined;
  return (
    <>
      {start === "balken" && <Ladebildschirm />}
      <GoldVerlauf />
      <WeichesScrollen />
      <Kopfleiste basis={basis} start={stand} />
      <main className={klasse}>{children}</main>
      <Fusszeile schluss={fussSchluss} basis={basis} />
      {daumen && <DaumenLeiste start={stand} />}
      <ChatKnopf start={stand} />
      <ChatFenster />
    </>
  );
}
