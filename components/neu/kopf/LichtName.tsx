"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { hero, marke } from "@/lib/inhalt-neu";
import { Marke } from "../Marke";
import { Wortmarke } from "../Rahmen";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, istVorschau } from "../umgebung";
import { BALKEN_MITTE, erzeugeLicht } from "./licht";
import { erzeugeZeichenfeld } from "./zeichenfeld";

// Mitten der vier Balken: oben links, oben rechts, unten links, unten rechts (y nach oben).
const BALKEN = [
  [-BALKEN_MITTE, BALKEN_MITTE],
  [BALKEN_MITTE, BALKEN_MITTE],
  [-BALKEN_MITTE, -BALKEN_MITTE],
  [BALKEN_MITTE, -BALKEN_MITTE],
];
// Beim Aufbau zünden die Balken reihum: oben links, oben rechts, unten rechts, unten links.
const REIHE = [0, 1, 3, 2];
const weich = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Der Kopfbereich in zwei Ebenen, durchscheinend übereinander:
 * hinten das Logo aus Licht (licht.ts), vorn der Name aus Zeichen-Teilchen
 * (zeichenfeld.ts). Diese Datei hält beide im Takt.
 *
 * - Am Computer folgt der Stern sanft der Maus (bleibt nahe der Mitte), die
 *   Zeichen weichen dem Zeiger aus, ein Klick schickt eine Welle hindurch und
 *   lässt das Licht kurz aufleuchten.
 * - Am Handy steht beides ruhig (das Licht atmet nur über die Deckkraft),
 *   Tippen löst die Welle aus.
 * - Bei „weniger Bewegung“ ist alles still.
 * - Startanimation: erst baut sich das Licht-Logo auf, dann sammeln sich die
 *   Zeichen zum Namen.
 *
 * Gerechnet wird nur, solange der Kopfbereich zu sehen ist. Ohne Skript und
 * bis alles bereit ist, stehen Name und Logo als gewöhnliche Grafik da.
 */
export function LichtName() {
  const ebene = useRef<HTMLDivElement>(null);
  const lichtLeinwand = useRef<HTMLCanvasElement>(null);
  const zeichenLeinwand = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ebene.current;
    const held = el?.closest<HTMLElement>(".ag-hero");
    const platz = held?.querySelector<HTMLElement>(".ag-ln__platz");
    const wort = platz?.querySelector<SVGElement>(".ag-wortmarke");
    const wortText = wort?.querySelector("text");
    if (!el || !held || !platz || !wort || !wortText || !lichtLeinwand.current || !zeichenLeinwand.current) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || istVorschau();
    const maus = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !still;
    const licht = erzeugeLicht(lichtLeinwand.current);
    const feld = erzeugeZeichenfeld(zeichenLeinwand.current);
    if (!feld) return;

    const z = { aufbau: still ? 1 : 0, blitz: 0 };
    const stern = { x: 0, y: 0, zx: 0, zy: 0 };
    const zeiger = { x: -9999, y: -9999, aktiv: false };
    const balken: [number, number, number, number] = [0, 0, 0, 0];
    const masse = { breite: 1, hoehe: 1, logoX: 0, logoY: 0, logoR: 1, lichtMass: 1 };
    let zeit = 0;
    let letzte = 0;
    let rahmen = 0;
    let sichtbar = true;
    let vorbei = false;
    let gebaut = false;
    let aufgetreten = still;
    let introLaeuft = false;
    let feldAktiv = false;
    let zuletztMaus = 0;
    let neuZeichnen = true;
    // Schonung: Bildzähler und gemessene Bilddauer, um das Licht notfalls gröber zu rechnen.
    let bildNr = 0;
    let dauerSumme = 0;
    let dauerZahl = 0;

    const bild = (jetzt: number) => {
      rahmen = 0;
      if (!gebaut) return;
      const dt = letzte ? Math.min(0.05, (jetzt - letzte) / 1000) : 0.016;
      letzte = jetzt;
      if (!still) zeit += dt;

      // Der Stern folgt der Maus sanft und mit Verzögerung, bleibt aber nahe der Mitte.
      if (maus && jetzt - zuletztMaus > 4000) {
        stern.zx = 0;
        stern.zy = 0;
      }
      const vorherX = stern.x;
      const vorherY = stern.y;
      const zug = 1 - Math.exp(-dt * 3.2);
      stern.x += (stern.zx - stern.x) * zug;
      stern.y += (stern.zy - stern.y) * zug;
      const wandert = Math.abs(stern.x - vorherX) + Math.abs(stern.y - vorherY) > 0.0004;

      z.blitz *= Math.exp(-dt * 2.4);
      if (z.blitz < 0.004) z.blitz = 0;

      // Balken: reihum aufbauen; heller, wenn der Stern näherkommt.
      for (let i = 0; i < 4; i++) {
        const dx = stern.x - BALKEN[i][0];
        const dy = stern.y - BALKEN[i][1];
        const naehe = Math.exp(-(dx * dx + dy * dy) / 0.5);
        const platzNr = REIHE.indexOf(i);
        balken[i] = weich(platzNr * 0.17, platzNr * 0.17 + 0.36, z.aufbau) * (0.82 + 0.8 * (naehe - 0.383));
      }
      const sternHell = weich(0.6, 1, z.aufbau);

      const lichtWandert = wandert || z.blitz > 0 || z.aufbau < 1 || neuZeichnen;
      bildNr += 1;
      // In Ruhe atmet das Licht nur: Dann genügt jedes zweite Bild.
      if (licht && (lichtWandert || (maus && bildNr % 2 === 0))) {
        licht.zeichnen({
          mitteX: masse.logoX * masse.lichtMass,
          mitteY: (masse.hoehe - masse.logoY) * masse.lichtMass,
          radius: masse.logoR * masse.lichtMass,
          sternX: stern.x,
          sternY: stern.y,
          balken,
          sternHell,
          zeit,
          blitz: z.blitz,
          hell: maus ? 1 : 0.8,
        });
      }
      // Kommt der Rechner nicht mit (unter etwa 35 Bildern pro Sekunde), wird das
      // Licht gröber gerechnet. Es ist weich, man sieht den Unterschied kaum.
      if (maus && licht && letzte) {
        dauerSumme += dt;
        dauerZahl += 1;
        if (dauerZahl >= 45) {
          if (dauerSumme / dauerZahl > 0.028 && masse.lichtMass > 0.42) {
            masse.lichtMass *= 0.75;
            licht.groesse(Math.round(masse.breite * masse.lichtMass), Math.round(masse.hoehe * masse.lichtMass));
            neuZeichnen = true;
          }
          dauerSumme = 0;
          dauerZahl = 0;
        }
      }
      feldAktiv = feld.schritt(
        dt,
        {
          sternX: masse.logoX + stern.x * masse.logoR,
          sternY: masse.logoY - stern.y * masse.logoR,
          sternHell: sternHell * (1 + z.blitz * 0.6),
          balken: balken.map((b) => b * (1 + z.blitz * 0.7)),
        },
        zeiger,
        lichtWandert,
      );
      neuZeichnen = false;
      weiter();
    };

    // Nur rechnen, wenn es etwas zu sehen und zu tun gibt.
    const weiter = () => {
      if (rahmen || vorbei || !gebaut || !sichtbar || document.hidden) return;
      const zuTun = neuZeichnen || introLaeuft || feldAktiv || z.blitz > 0 || z.aufbau < 1 || (maus && aufgetreten);
      if (zuTun) rahmen = requestAnimationFrame(bild);
      else letzte = 0;
    };

    // Lage und Größe: Das Licht-Logo sitzt mittig auf dem Platz, der Name im Kasten des Schriftzugs.
    const vermessen = async () => {
      const stil = getComputedStyle(wortText);
      const mono = getComputedStyle(held).getPropertyValue("--font-mono-ag").trim() || "monospace";
      // Erst zeichnen, wenn die Schriften wirklich geladen sind.
      await Promise.all([document.fonts.load(`800 120px ${stil.fontFamily}`, marke.name), document.fonts.load(`12px ${mono}`, "#=+-:·")]).catch(() => {});
      if (vorbei) return;
      const e = el.getBoundingClientRect();
      const p = platz.getBoundingClientRect();
      const w = wort.getBoundingClientRect();
      masse.breite = Math.max(1, e.width);
      masse.hoehe = Math.max(1, e.height);
      masse.logoX = p.left + p.width / 2 - e.left;
      masse.logoY = p.top + p.height / 2 - e.top;
      masse.logoR = p.height / 2;
      // Weiches Licht braucht keine volle Auflösung.
      masse.lichtMass = Math.min(window.devicePixelRatio || 1, 1) * (maus ? 0.8 : 1);
      licht?.groesse(Math.round(masse.breite * masse.lichtMass), Math.round(masse.hoehe * masse.lichtMass));
      feld.bauen(
        {
          breite: masse.breite,
          hoehe: masse.hoehe,
          name: { x: w.left - e.left, y: w.top - e.top, b: w.width, h: w.height },
          logo: { x: masse.logoX, y: masse.logoY, r: masse.logoR },
          schrift: stil.fontFamily,
          mono,
          text: marke.name.toUpperCase(),
        },
        aufgetreten && !introLaeuft,
      );
      gebaut = true;
      neuZeichnen = true;
      held.dataset.ln = licht ? "licht" : "zeichen";
      weiter();
    };

    // Startanimation: erst das Licht, dann sammeln sich die Zeichen.
    const verzoegert: gsap.core.Tween[] = [];
    const auftritt = () => {
      if (aufgetreten || vorbei) return;
      aufgetreten = true;
      introLaeuft = true;
      gsap.to(z, { aufbau: 1, duration: 1.35, ease: "power2.inOut", delay: 0.15 });
      verzoegert.push(
        gsap.delayedCall(0.85, () => {
          feld.sammeln();
          weiter();
        }),
        gsap.delayedCall(2.7, () => {
          introLaeuft = false;
          held.dataset.lnHinweis = "1";
        }),
      );
      weiter();
    };

    const zeigerBewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const e = el.getBoundingClientRect();
      zeiger.x = ev.clientX - e.left;
      zeiger.y = ev.clientY - e.top;
      zeiger.aktiv = zeiger.y > -60 && zeiger.y < masse.hoehe + 60;
      // Ziel des Sterns: ein Stück in Richtung Maus, sanft begrenzt.
      const ox = ((zeiger.x - masse.logoX) / masse.logoR) * 0.3;
      const oy = (-(zeiger.y - masse.logoY) / masse.logoR) * 0.3;
      const lang = Math.hypot(ox, oy) || 1;
      const grenze = (0.42 * Math.tanh(lang / 0.42)) / lang;
      stern.zx = zeiger.aktiv ? ox * grenze : 0;
      stern.zy = zeiger.aktiv ? oy * grenze : 0;
      zuletztMaus = performance.now();
      weiter();
    };
    const zeigerWeg = () => {
      zeiger.aktiv = false;
      stern.zx = 0;
      stern.zy = 0;
      weiter();
    };
    // Klick oder Tippen irgendwo im Kopfbereich (nicht auf Knöpfe und Links): Welle und kurzes Aufleuchten.
    const klick = (ev: MouseEvent) => {
      if (!gebaut || introLaeuft || (ev.target as Element | null)?.closest("a, button, input, select, textarea, label")) return;
      const e = el.getBoundingClientRect();
      feld.welle(ev.clientX - e.left, ev.clientY - e.top);
      z.blitz = 1;
      feldAktiv = true;
      held.dataset.lnGeklickt = "1";
      weiter();
    };

    let warten = 0;
    const beobachter = new ResizeObserver(() => {
      window.clearTimeout(warten);
      warten = window.setTimeout(vermessen, gebaut ? 160 : 0);
    });
    beobachter.observe(el);
    beobachter.observe(platz);
    const waechter = new IntersectionObserver(([eintrag]) => {
      sichtbar = eintrag.isIntersecting;
      // Nach einer Pause einmal frisch zeichnen (manche Browser leeren die Leinwand).
      if (sichtbar) neuZeichnen = true;
      weiter();
    });
    waechter.observe(el);
    const wiederDa = () => {
      neuZeichnen = true;
      weiter();
    };
    document.addEventListener("visibilitychange", wiederDa);

    if (!still) {
      held.addEventListener("click", klick);
      if (maus) {
        window.addEventListener("pointermove", zeigerBewegt, { passive: true });
        document.documentElement.addEventListener("pointerleave", zeigerWeg);
      }
      if (document.documentElement.classList.contains(INTRO_FERTIG_KLASSE)) auftritt();
      else window.addEventListener(INTRO_FERTIG, auftritt, { once: true });
    }

    return () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      window.clearTimeout(warten);
      beobachter.disconnect();
      waechter.disconnect();
      document.removeEventListener("visibilitychange", wiederDa);
      held.removeEventListener("click", klick);
      window.removeEventListener("pointermove", zeigerBewegt);
      document.documentElement.removeEventListener("pointerleave", zeigerWeg);
      window.removeEventListener(INTRO_FERTIG, auftritt);
      gsap.killTweensOf(z);
      verzoegert.forEach((t) => t.kill());
      licht?.ende();
      delete held.dataset.ln;
      delete held.dataset.lnHinweis;
      delete held.dataset.lnGeklickt;
    };
  }, []);

  return (
    <div ref={ebene} className="ag-ln" data-weg="buehne" aria-hidden="true">
      <canvas ref={lichtLeinwand} className="ag-ln__licht" />
      <canvas ref={zeichenLeinwand} className="ag-ln__zeichen" />
    </div>
  );
}

/**
 * Platz von Logo und Name im Text. Die beiden Ebenen richten sich daran aus.
 * Der Schriftzug und das Logo stehen hier als gewöhnliche Grafik: ohne Skript
 * sichtbar, sonst nur als Maß und als Name für Vorleseprogramme.
 */
export function LichtPlatz() {
  return (
    <div className="ag-ln__platz">
      <Marke className="ag-ln__ersatz" />
      <Wortmarke />
    </div>
  );
}

/** Kleiner Hinweis: Ein Klick (am Handy ein Tippen) schickt eine Welle durch den Namen. */
export function KlickHinweis() {
  return (
    <p className="ag-mono ag-ln__hinweis" aria-hidden="true">
      <span className="ag-ln__maus">{hero.klickHinweis}</span>
      <span className="ag-ln__finger">{hero.tippHinweis}</span>
    </p>
  );
}
