"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
// Als Datei eingebunden: Die Adresse trägt dann eine Prüfsumme, ein neu aufgenommenes Bild kommt sicher an.
import lichtBild from "@/public/kopf/licht-logo.jpg";
import { marke } from "@/lib/inhalt-neu";
import { Wortmarke } from "../Rahmen";
import { LADEN_FERTIG, LADEN_FERTIG_KLASSE, istVorschau } from "../umgebung";
import type { LichtLage, LichtSzene } from "./lichtszene";
import { erzeugeZeichenname } from "./zeichenname";

/**
 * Der Kopfbereich in zwei Ebenen, durchscheinend übereinander:
 * hinten das Licht-Logo, vorn der Name aus Zeichen-Teilchen. Das Licht-Logo
 * steht oben mittig, der Name mittig darunter (er liegt nicht mehr im Kern des
 * Lichts; die Strahlen laufen weich hinter seinem oberen Rand aus). Diese
 * Datei hält beide im Takt.
 *
 * - Start: Sobald der Ladebildschirm das Bild freigegeben hat („Laden fertig“),
 *   geht das Licht an, und im selben Moment fliegen die Zeichen von außerhalb
 *   des Bildes an ihren Platz (2,2 Sekunden). 250 ms danach läuft einmal von
 *   selbst eine Welle aus der Mitte des Namens.
 * - Das Licht läuft als three.js-Szene mit dem God-Rays-Effekt der Bibliothek
 *   postprocessing (lichtszene.ts, wird nachgeladen). Am Computer mit 80 Proben:
 *   Die Wand mit dem Logo-Loch kippt zur Maus, das Licht fächert sich als Kegel
 *   auf. Die Zeichen weichen dem Zeiger aus; ein Klick auf den Namen schickt
 *   eine Welle hindurch.
 * - Am Handy läuft dieselbe Szene mit 60 Proben, solange es flüssig bleibt.
 *   Ruckelt es, steht stattdessen ein ruhiges Bild des Lichts (einmal aus
 *   derselben Szene aufgenommen). Tippen auf den Namen löst die Welle aus.
 * - Bei „weniger Bewegung“ steht das ruhige Bild, der Name blendet einfach ein
 *   (kein Flug, keine Welle).
 *
 * - Scroll-Hinweis nur durch Licht, sehr dezent: Wer nach 4 Sekunden nicht
 *   gescrollt hat, sieht von ganz unten einen schwachen Goldschein. Beim
 *   Scrollen blendet er aus.
 *
 * Gerechnet wird nur, solange der Kopfbereich zu sehen ist. Der gewöhnliche
 * Schriftzug ist unsichtbar und nur für Vorleseprogramme da; ohne Skript (oder
 * wenn die Zeichen nicht gezeichnet werden können) steht er als Grafik da.
 */
// Hat das Gerät bei diesem Besuch schon einmal geruckelt, versucht es die Seite nicht noch einmal
// (nur im Arbeitsspeicher gemerkt, nichts wird im Browser abgelegt).
let geraetRuckelt = false;

export function LichtName() {
  const ebene = useRef<HTMLDivElement>(null);
  const zeichenLeinwand = useRef<HTMLCanvasElement>(null);
  // Zählt hoch, wenn der Besucher „weniger Bewegung“ umstellt oder das Zeigegerät wechselt:
  // Dann wird alles abgebaut und mit der neuen Einstellung frisch eingerichtet.
  const [einstellung, setEinstellung] = useState(0);

  useEffect(() => {
    const el = ebene.current;
    const leinwand = zeichenLeinwand.current;
    const held = el?.closest<HTMLElement>(".ag-hero");
    const platz = held?.querySelector<HTMLElement>(".ag-ln__platz");
    const loch = platz?.querySelector<HTMLElement>(".ag-ln__loch");
    const wort = platz?.querySelector<SVGElement>(".ag-wortmarke");
    const wortText = wort?.querySelector("text");
    if (!el || !leinwand || !held || !platz || !loch || !wort || !wortText) return;

    const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
    const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = wenigBewegung.matches || istVorschau();
    const maus = feinerZeiger.matches && !still;
    const feld = erzeugeZeichenname(leinwand, still);
    if (!feld) {
      // Die Zeichen lassen sich nicht zeichnen: Dann steht der gewöhnliche Schriftzug da.
      held.dataset.ln = "ersatz";
      return () => {
        delete held.dataset.ln;
      };
    }
    // Erst jetzt lauschen: Alles, was ab hier eingerichtet wird, räumt die Rückgabe unten wieder ab.
    const umstellen = () => setEinstellung((n) => n + 1);
    wenigBewegung.addEventListener("change", umstellen);
    feinerZeiger.addEventListener("change", umstellen);

    let szene: LichtSzene | undefined;
    let vorbei = false;
    let gebaut = false;
    // Start: „Laden fertig“ ist gemeldet, das Raster steht, und das Licht ist bereit (oder kommt nicht).
    let ladenFertig = false;
    let lichtBereit = still;
    let gestartet = still;
    // Solange die Zeichen als Ganzes unterwegs sind (Startflug, Welle), wird das Licht seltener neu
    // gezeichnet (höchstens 20-mal je Sekunde): So bleibt die Bewegung der Zeichen auch in großen
    // Fenstern flüssig. Am Bild des Lichts ändert das nichts.
    const spaeter: gsap.core.Tween[] = [];
    let schont = false;
    let schonEnde: gsap.core.Tween | undefined;
    const schonen = (ja: boolean) => {
      schont = ja;
      szene?.schonen(ja);
    };
    const schoneFuer = (sekunden: number) => {
      schonEnde?.kill();
      schonen(true);
      schonEnde = gsap.delayedCall(sekunden, () => schonen(false));
    };

    // Lage des Lichts ohne laufende Szene: Die Wand steht gerade, nichts kippt.
    const ruheLage = (): LichtLage => {
      const e = el.getBoundingClientRect();
      const l = loch.getBoundingClientRect();
      return { mitteX: l.left + l.width / 2 - e.left, mitteY: l.top + l.height / 2 - e.top, radius: l.height / 2, kippX: 0, kippY: 0, hell: 1 };
    };

    const vermessen = async () => {
      const stil = getComputedStyle(wortText);
      const mono = getComputedStyle(held).getPropertyValue("--font-mono-ag").trim() || "monospace";
      // Erst zeichnen, wenn die Schriften wirklich geladen sind. Kennt der Browser diese Abfrage
      // nicht oder schlägt sie fehl, geht es mit den vorhandenen Schriften weiter.
      try {
        if (document.fonts?.load) await Promise.all([document.fonts.load(`800 120px ${stil.fontFamily}`, marke.name), document.fonts.load(`500 12px ${mono}`, "#%=+")]);
      } catch {
        /* dann eben mit den Schriften, die da sind */
      }
      if (vorbei) return;
      const e = el.getBoundingClientRect();
      const w = wort.getBoundingClientRect();
      const ruhe = ruheLage();
      // Der Name steht unter dem Licht-Logo, genau dort, wo das Stylesheet den gewöhnlichen
      // Schriftzug hinsetzt. Am Computer in einer Zeile; am Handy wäre er so zu klein: Dort
      // stehen die beiden Wörter übereinander (gleiche Breite, entsprechend höher).
      const woerter = marke.name.toUpperCase().split(" ");
      // Dieselben Grenzen wie im Stylesheet (kopf.css), an der Fensterbreite gemessen: Nur so
      // passen die dort freigehaltene Höhe und der gezeichnete Name sicher zusammen.
      const schmal = window.matchMedia("(max-width: 599px)").matches;
      const handyBreite = window.matchMedia("(max-width: 767px)").matches;
      const gestapelt = schmal && woerter.length > 1;
      let name = { x: w.left - e.left, y: w.top - e.top, b: w.width, h: w.height };
      if (gestapelt) {
        const probe = document.createElement("canvas").getContext("2d");
        if (probe) {
          probe.font = `800 100px ${stil.fontFamily}`;
          const breiteste = Math.max(...woerter.map((wortTeil) => probe.measureText(wortTeil).width || 1));
          const zeilenHoehe = ((w.width / breiteste) * 100 * 212) / 285;
          const h = (zeilenHoehe * woerter.length) / (1 - 0.045 * (woerter.length - 1));
          // Das Stylesheet hält unter 600 px Breite die Höhe für zwei Zeilen frei: mittig hineinsetzen.
          name = { x: w.left - e.left, y: w.top - e.top + Math.max(0, (w.height - h) / 2), b: w.width, h };
        }
      }
      const anzahl = feld.bauen(
        {
          breite: Math.max(1, e.width),
          hoehe: Math.max(1, e.height),
          name,
          // Unter 768 px Breite ist eine Zelle 5 px breit, sonst 6,5 px.
          zelle: handyBreite ? 5 : 6.5,
          schrift: stil.fontFamily,
          mono,
          zeilen: gestapelt ? woerter : [woerter.join(" ")],
          // Am Handy nur feine Zeichen (· . : - = +), keine schweren; Strahlen nach unten halb so lang.
          fein: handyBreite,
          // Pixeldichte: am Handy höchstens 1,5, am Computer höchstens 2.
          dichteMax: handyBreite ? 1.5 : 2,
          schirm: Math.max(window.innerWidth, window.innerHeight),
        },
        // Am Handy steht der Schimmer ruhig, auch wenn sich das Licht dort leicht wiegt.
        szene ? (maus ? szene.lage : { ...szene.lage, kippX: 0, kippY: 0 }) : ruhe,
      );
      gebaut = true;
      if (anzahl > 0) held.dataset.ln = "bereit";
      else delete held.dataset.ln;
      starten();
    };

    // Die Licht-Szene nachladen (nicht bei „weniger Bewegung“). Kann sie nicht starten oder
    // kommt das Gerät nicht flüssig mit, steht stattdessen das ruhige Bild des Lichts.
    const stattBild = () => {
      if (vorbei) return;
      szene?.ende();
      szene = undefined;
      held.dataset.licht = "bild";
      feld.licht(ruheLage());
    };
    // Ersatz-Licht: Das ruhige Bild einschalten und den Start erst freigeben, wenn es wirklich
    // geladen ist (oder nicht geladen werden kann), spätestens nach anderthalb Sekunden. Alle Wege
    // zum ruhigen Bild vor dem Start laufen hier durch.
    let bildWache: AbortController | undefined;
    const mitRuhigemBild = () => {
      if (lichtBereit || vorbei || bildWache) return;
      held.dataset.licht = "bild";
      const wache = new AbortController();
      bildWache = wache;
      const freigeben = () => {
        wache.abort();
        frist.kill();
        if (lichtBereit || vorbei) return;
        lichtBereit = true;
        starten();
      };
      const frist = gsap.delayedCall(1.5, freigeben);
      spaeter.push(frist);
      const bild = loch.querySelector("img");
      if (!bild || (bild.complete && bild.naturalWidth > 0)) return freigeben();
      bild.addEventListener("load", freigeben, { signal: wache.signal });
      bild.addEventListener("error", freigeben, { signal: wache.signal });
    };

    if (still) {
      held.dataset.licht = "bild";
      lichtBereit = true;
    } else if (geraetRuckelt) {
      // Gleich nach dem Einrichten (alles Weitere unten muss erst stehen).
      spaeter.push(gsap.delayedCall(0, mitRuhigemBild));
    } else {
      import("./lichtszene")
        .then(({ starteLichtSzene }) => {
          if (vorbei) return;
          szene = starteLichtSzene(el, loch, {
            // Am Computer 80 Proben je Bildpunkt, am Handy 60.
            proben: maus ? 80 : 60,
            // Rein schwarz: Kopfbereich, Wand und Grund der Szene haben denselben Ton.
            wand: 0x000000,
            maus,
            // Die Zeichen erfahren, wie hell das Licht gerade ist. Am Computer wandert ihr Schimmer
            // außerdem mit dem Lichtkegel; am Handy steht er ruhig (das Licht wiegt sich nur leicht).
            beiBild: (lage) => feld.licht(maus ? lage : { ...lage, kippX: 0, kippY: 0 }),
            beiAusfall: () => {
              geraetRuckelt = true;
              stattBild();
            },
          });
          lichtBereit = true;
          if (!gestartet) {
            held.dataset.licht = "live";
            starten();
            return;
          }
          // Der Start läuft schon (die Szene kam spät): Das Licht kommt jetzt nach. Steht bis dahin
          // das ruhige Bild, wird überblendet: Die Szene ist sofort voll da und blendet darunter
          // ein, das ruhige Bild blendet darüber aus und verschwindet erst danach.
          szene.schonen(schont);
          if (held.dataset.licht === "bild") {
            held.dataset.lichtwechsel = "1";
            spaeter.push(gsap.delayedCall(1.1, () => delete held.dataset.lichtwechsel));
            szene.zeigen(true);
          } else szene.zeigen(false);
          held.dataset.licht = "live";
        })
        .catch(() => {
          // Die Szene kann nicht starten: Es steht das ruhige Bild (läuft der Start noch nicht,
          // wartet er, bis es geladen ist).
          stattBild();
          mitRuhigemBild();
        });
    }

    // Start: Das Licht geht an, und im selben Moment fliegen die Zeichen von außen an ihren Platz.
    const starten = () => {
      if (gestartet || vorbei || !ladenFertig || !gebaut || !lichtBereit) return;
      gestartet = true;
      schonen(true);
      szene?.zeigen(false);
      // 250 ms nach dem Ende des Flugs läuft einmal von selbst eine Welle aus der Mitte des Namens:
      // der Hinweis, dass man klicken kann. (War der Kopfbereich beim Start nicht zu sehen, fliegen
      // die Zeichen erst ein, wenn er ins Bild kommt.)
      feld.starten(() => {
        // Bis diese Welle durch ist (0,25 s Pause + 1,3 s), bleibt das Licht geschont.
        schoneFuer(1.6);
        spaeter.push(gsap.delayedCall(0.25, feld.welleMitte));
      });
      lockPlanen();
    };
    const ladenGemeldet = () => {
      if (ladenFertig || vorbei) return;
      ladenFertig = true;
      // Kommt die Licht-Szene nicht rechtzeitig nach, steht nach gut einer Sekunde das ruhige Bild
      // des Lichts, und der Name fliegt ein, sobald es geladen ist.
      spaeter.push(gsap.delayedCall(1.2, mitRuhigemBild));
      starten();
    };

    // Klick oder Tippen auf den Namen (plus 40 px Rand, nicht auf Knöpfe und Links, nicht im Startflug): eine Welle.
    const klick = (ev: MouseEvent) => {
      if (!gebaut || (ev.target as Element | null)?.closest("a, button, input, select, textarea, label")) return;
      const e = el.getBoundingClientRect();
      const ausgeloest = feld.welle(ev.clientX - e.left, ev.clientY - e.top);
      if (!ausgeloest) return;
      // Solange die Welle läuft (1,3 s), wird das Licht geschont.
      schoneFuer(1.35);
      // Am Handy dazu eine kurze Vibration (wo das Gerät es kann).
      if (!maus) navigator.vibrate?.(6);
    };
    const zeigerBewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const e = el.getBoundingClientRect();
      const y = ev.clientY - e.top;
      feld.zeiger(ev.clientX - e.left, y, y > -80 && y < e.height + 80);
    };
    const zeigerWeg = () => feld.zeiger(-9999, -9999, false);

    // Scroll-Hinweis, sehr dezent: Wer nach 4 Sekunden nicht gescrollt hat, sieht von ganz unten
    // einen schwachen Goldschein. Beim Scrollen blendet er aus.
    let lockUhr = 0;
    const lockPlanen = () => {
      window.clearTimeout(lockUhr);
      if (window.scrollY > 24) return;
      lockUhr = window.setTimeout(() => {
        if (!vorbei && window.scrollY <= 24) held.dataset.lockruf = "1";
      }, 4000);
    };
    const beimScrollen = () => {
      if (window.scrollY > 24) {
        window.clearTimeout(lockUhr);
        delete held.dataset.lockruf;
      } else if (!held.dataset.lockruf && gestartet) {
        lockPlanen();
      }
    };

    let warten = 0;
    const beobachter = new ResizeObserver(() => {
      window.clearTimeout(warten);
      warten = window.setTimeout(vermessen, gebaut ? 180 : 0);
    });
    beobachter.observe(el);
    beobachter.observe(platz);
    beobachter.observe(loch);
    // Kommen mehrere Meldungen auf einmal (etwa wenn die Seite beim Laden gleich nach unten springt),
    // zählt die letzte: Sie beschreibt den jetzigen Stand.
    const waechter = new IntersectionObserver((eintraege) => feld.sichtbar(eintraege[eintraege.length - 1].isIntersecting));
    waechter.observe(el);
    window.addEventListener("scroll", beimScrollen, { passive: true });

    if (still) {
      lockPlanen();
    } else {
      held.addEventListener("click", klick);
      if (maus) {
        window.addEventListener("pointermove", zeigerBewegt, { passive: true });
        document.documentElement.addEventListener("pointerleave", zeigerWeg);
      }
      if (document.documentElement.classList.contains(LADEN_FERTIG_KLASSE)) ladenGemeldet();
      else {
        window.addEventListener(LADEN_FERTIG, ladenGemeldet, { once: true });
        // Sicherheitsnetz: Bleibt die Meldung aus, startet der Kopfbereich nach 6 Sekunden von selbst.
        spaeter.push(gsap.delayedCall(6, ladenGemeldet));
      }
    }

    return () => {
      vorbei = true;
      wenigBewegung.removeEventListener("change", umstellen);
      feinerZeiger.removeEventListener("change", umstellen);
      window.clearTimeout(warten);
      window.clearTimeout(lockUhr);
      beobachter.disconnect();
      waechter.disconnect();
      window.removeEventListener("scroll", beimScrollen);
      held.removeEventListener("click", klick);
      window.removeEventListener("pointermove", zeigerBewegt);
      document.documentElement.removeEventListener("pointerleave", zeigerWeg);
      window.removeEventListener(LADEN_FERTIG, ladenGemeldet);
      spaeter.forEach((t) => t.kill());
      schonEnde?.kill();
      bildWache?.abort();
      szene?.ende();
      feld.ende();
      delete held.dataset.ln;
      delete held.dataset.licht;
      delete held.dataset.lichtwechsel;
      delete held.dataset.lockruf;
    };
  }, [einstellung]);

  // Drei Schichten, von hinten nach vorn: das Licht, der gewöhnliche Schriftzug
  // (ohne Skript sichtbar, sonst nur Maß und Name für Vorleseprogramme), die Zeichen.
  return (
    <>
      {/* Hinten: Hierhin setzt die Licht-Szene ihre Zeichenfläche. */}
      <div ref={ebene} className="ag-ln ag-ln--hinten" data-weg="buehne" aria-hidden="true" />
      <div className="ag-kopf5__mitte" data-weg="oben">
        {/* Oben der Platz des Licht-Logos (so groß wie das Logo-Loch), darunter mit Abstand der Schriftzug. */}
        <div className="ag-ln__platz">
          <span className="ag-ln__loch" aria-hidden="true">
            {/* Ruhiges Bild des Lichts: nur bei „weniger Bewegung“ oder wenn die Szene nicht flüssig läuft. Sonst wird es nicht geladen. */}
            <Image className="ag-ln__standbild" src={lichtBild} alt="" sizes="(max-width: 767px) 150vw, min(72vw, 1260px)" loading="lazy" />
          </span>
          <Wortmarke />
        </div>
      </div>
      <div className="ag-ln ag-ln--vorn" data-weg="buehne" aria-hidden="true">
        <canvas ref={zeichenLeinwand} className="ag-ln__zeichen" />
      </div>
    </>
  );
}
