"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
// Als Datei eingebunden: Die Adresse trägt dann eine Prüfsumme, ein neu aufgenommenes Bild kommt sicher an.
import lichtBild from "@/public/kopf/licht-logo.jpg";
import sternBild from "@/public/kopf/licht-stern.webp";
import { marke } from "@/lib/inhalt-neu";
import { Wortmarke } from "../Rahmen";
import { INTRO_FERTIG, INTRO_FERTIG_KLASSE, LADEN_FERTIG, LADEN_FERTIG_KLASSE, START_FERTIG, START_FERTIG_KLASSE, istVorschau, vorarbeit } from "../umgebung";
import type { LichtLage, LichtSzene } from "./lichtszene";
import { erzeugeZeichenname } from "./zeichenname";

/**
 * Der Kopfbereich in zwei Ebenen, durchscheinend übereinander: hinten das
 * Licht-Logo, vorn der Name aus Zeichen-Teilchen. Diese Datei hält beide im
 * Takt und führt die Startanimation.
 *
 * Startanimation (bei jedem Laden der Seite):
 *   1. Warten: Der Bildschirm ist schwarz, in der Mitte schimmert nur der Stern
 *      des Logos (ein vorgerendertes Bild, genau an der Stelle des späteren
 *      Sterns). Währenddessen wird alles fertig gemacht: Schriften, Raster und
 *      Vorrat der Zeichen, die Licht-Szene (Shader übersetzt, die echte Szene
 *      in voller Größe unsichtbar vorgezeichnet), die Bilder der ersten
 *      Abschnitte und alles, was sich für das erste Scrollen angemeldet hat
 *      (die zweite Licht-Szene im Wörter-Feld). Zum Schluss die Probe unter
 *      echter Last: 30 Bilder hintereinander unter 17 ms.
 *   2. Weiter geht es, wenn alles fertig ist: frühestens 3 s, spätestens 6 s
 *      nach dem ersten Bild.
 *   3. Das Licht baut sich von innen nach außen auf, jeder Schritt weich in
 *      den nächsten: Der Stern wird heller (0,7 s; er geht ohne Sprung vom
 *      Bild in die Szene über), dann kommen die vier Balken (0,6 s), dann
 *      wachsen die Strahlen (1,2 s). Am Handy etwas kürzer.
 *   4. Bei 60 % der Lichtstärke fliegen die Zeichen ein (2,2 s); 250 ms nach
 *      der Landung läuft die Welle aus der Namensmitte.
 *   5. Während die Zeichen landen, erscheinen Kopfleiste, „Anrufen“ und
 *      Chat-Knopf (Stylesheet, über data-start am Kopfbereich).
 * Solange das läuft, steht das Licht ruhig in der Mitte. Wenn alles steht
 * (Zeichen gelandet, Welle vorbei), wartet es 1 s und dreht sich dann langsam
 * zur Maus (1,5 s). Klick, Taste oder Scrollen überspringen: Dann steht alles
 * sofort. Bei „weniger Bewegung“ blendet alles ruhig ein.
 *
 * Danach: Die Zeichen weichen dem Zeiger aus, ein Klick auf den Namen schickt
 * eine Welle hindurch. Beim Runterscrollen fliegen die Zeichen auf den Bahnen
 * des Startflugs wieder auseinander, das Licht wird schwächer; zurück am
 * Seitenanfang leuchtet es kurz etwas heller auf.
 *
 * Am Handy läuft dieselbe Szene mit 60 Proben, solange es flüssig bleibt;
 * ruckelt es, steht ein ruhiges Bild des Lichts. Gerechnet wird nur, solange
 * der Kopfbereich zu sehen ist. Der gewöhnliche Schriftzug ist unsichtbar und
 * nur für Vorleseprogramme da; ohne Skript steht er als Grafik da.
 */
// Die Licht-Szene (three.js) wird schon geholt, während die Seite noch startet, nicht erst, wenn der
// Kopfbereich eingerichtet ist: Das spart beim ersten Laden einige Zehntelsekunden. Nicht bei
// „weniger Bewegung“ (dort steht das ruhige Bild). Scheitert das Holen, versucht es der Kopfbereich selbst noch einmal.
const szeneVorab =
  typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !new URLSearchParams(window.location.search).has("vorschau")
    ? import("./lichtszene").catch(() => undefined)
    : undefined;

// Hat das Gerät bei diesem Besuch schon einmal geruckelt, versucht es die Seite nicht noch einmal
// (nur im Arbeitsspeicher gemerkt, nichts wird im Browser abgelegt).
let geraetRuckelt = false;

// Der Stern steht jedes Mal mindestens so lange im Dunkeln (Sekunden seit dem ersten Bild) …
const WARTEN_MIN = 3;
// … und höchstens so lange: Dann geht es los, auch wenn noch nicht alles fertig ist.
const WARTEN_MAX = 6;
// Aufbau des Lichts von innen nach außen (Sekunden): Der Stern wird heller, dann kommen die vier
// Balken, dann wachsen die Strahlen. Am Handy etwas kürzer.
const LICHT_STUFEN: [number, number, number] = [0.7, 0.6, 1.2];
const LICHT_STUFEN_HANDY: [number, number, number] = [0.5, 0.45, 0.9];
// Die Zeichen fliegen los, sobald das Licht diese Stärke hat (die Balken stehen, die Strahlen beginnen).
const FLUG_AB_PEGEL = 0.6;
// So lange nach Beginn des Flugs erscheinen Kopfleiste, „Anrufen“ und Chat-Knopf (die Zeichen landen dann).
const LEISTE_NACH = 1.1;
// Wenn alles steht (Zeichen gelandet, Welle vorbei: 0,25 s Pause + 1,3 s Welle), wartet das Licht
// noch 1 s. Dann dreht es sich langsam zur Maus (1,5 s) und folgt ihr danach wie immer.
const MAUS_NACH = 0.25 + 1.3 + 1;
const MAUS_DREHEN = 1.5;
// Probe vor dem Start: so viele Bilder hintereinander müssen schneller sein als diese Zeit
// (17 ms, mit einer halben Millisekunde Luft für Browser, die Zeiten runden).
const PROBE_BILDER = 30;
const PROBE_MS = 17.5;

export function LichtName() {
  const ebene = useRef<HTMLDivElement>(null);
  const zeichenLeinwand = useRef<HTMLCanvasElement>(null);
  // Zählt hoch, wenn der Besucher „weniger Bewegung“ umstellt oder das Zeigegerät wechselt:
  // Dann wird alles abgebaut und mit der neuen Einstellung frisch eingerichtet.
  const [einstellung, setEinstellung] = useState(0);
  // Die Startanimation läuft einmal je Laden der Seite. Wird später nur neu eingerichtet (andere
  // Einstellung), steht alles sofort.
  const startGelaufen = useRef(false);

  useEffect(() => {
    const el = ebene.current;
    const leinwand = zeichenLeinwand.current;
    const held = el?.closest<HTMLElement>(".ag-hero");
    const platz = held?.querySelector<HTMLElement>(".ag-ln__platz");
    const loch = platz?.querySelector<HTMLElement>(".ag-ln__loch");
    const stern = loch?.querySelector<HTMLElement>(".ag-ln__stern");
    const wort = platz?.querySelector<SVGElement>(".ag-wortmarke");
    const wortText = wort?.querySelector("text");
    if (!el || !leinwand || !held || !platz || !loch || !wort || !wortText) return;

    const wurzel = document.documentElement;
    const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
    const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = wenigBewegung.matches || istVorschau();
    const maus = feinerZeiger.matches && !still;
    // Meldungen an den Rest der Seite. Sie gehören zu genau diesem Start: Eine Freigabe von einem
    // früheren Besuch der Seite gilt nicht.
    const KLASSEN = [INTRO_FERTIG_KLASSE, LADEN_FERTIG_KLASSE, START_FERTIG_KLASSE];
    wurzel.classList.remove(...KLASSEN);
    const melden = (ereignis: string, klasse: string) => {
      wurzel.classList.add(klasse);
      window.dispatchEvent(new Event(ereignis));
    };
    const allesGemeldet = () => {
      if (!wurzel.classList.contains(LADEN_FERTIG_KLASSE)) {
        melden(INTRO_FERTIG, INTRO_FERTIG_KLASSE);
        melden(LADEN_FERTIG, LADEN_FERTIG_KLASSE);
      }
      if (!wurzel.classList.contains(START_FERTIG_KLASSE)) melden(START_FERTIG, START_FERTIG_KLASSE);
    };

    const feld = erzeugeZeichenname(leinwand, still);
    if (!feld) {
      // Die Zeichen lassen sich nicht zeichnen: Dann steht der gewöhnliche Schriftzug da, und alles ist sofort frei.
      held.dataset.ln = "ersatz";
      held.dataset.start = "fertig";
      held.dataset.licht = "bild";
      allesGemeldet();
      return () => {
        delete held.dataset.ln;
        delete held.dataset.licht;
        held.dataset.start = "warten";
        wurzel.classList.remove(...KLASSEN);
      };
    }
    // Erst jetzt lauschen: Alles, was ab hier eingerichtet wird, räumt die Rückgabe unten wieder ab.
    const umstellen = () => setEinstellung((n) => n + 1);
    wenigBewegung.addEventListener("change", umstellen);
    feinerZeiger.addEventListener("change", umstellen);

    let szene: LichtSzene | undefined;
    let vorbei = false;
    let gebaut = false;
    // Startanimation: läuft der Auftritt des Lichts, sind die Zeichen losgeflogen, steht alles?
    let lichtAn = false;
    let fliegt = false;
    let fertig = false;
    let sofortNachBau = false;
    let uebersprungenUm = 0;
    // Solange die Zeichen als Ganzes unterwegs sind (Startflug, Welle, Scrollen), darf das Licht
    // kürzertreten: Hält das Gerät den Takt des Bildschirms nicht, wird es nur in jedem zweiten Bild
    // neu gezeichnet (sonst in jedem). Am Bild des Lichts ändert das nichts.
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

    // ── Messung: Wie lange dauert jede Ladephase? Nachzulesen über performance.getEntriesByType("measure").
    const erstesBild = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint")?.startTime ?? performance.now();
    const gemessen = async <T,>(name: string, arbeit: () => Promise<T> | T): Promise<T | undefined> => {
      const von = performance.now();
      try {
        return await arbeit();
      } catch {
        return undefined;
      } finally {
        try {
          performance.measure(`ag-start:${name}`, { start: von, end: performance.now() });
        } catch {
          /* ältere Browser: dann eben ohne Messung */
        }
      }
    };
    // Wartet höchstens so lange auf eine Arbeit (eigene Uhren: Überspringen hält sie nicht an).
    const uhren: number[] = [];
    const hoechstens = <T,>(arbeit: Promise<T>, sekunden: number) =>
      Promise.race([arbeit, new Promise<undefined>((weiter) => uhren.push(window.setTimeout(() => weiter(undefined), sekunden * 1000)))]);

    // Lage des Lichts ohne laufende Szene: Die Wand steht gerade, nichts kippt.
    const ruheLage = (): LichtLage => {
      const e = el.getBoundingClientRect();
      const l = loch.getBoundingClientRect();
      return { mitteX: l.left + l.width / 2 - e.left, mitteY: l.top + l.height / 2 - e.top, radius: l.height / 2, kippX: 0, kippY: 0, hell: 1 };
    };

    // ── Phase „Schriften“ und „Zeichen“: Schriften laden (auf echte Zeichen), dann Raster und Vorrat bauen.
    const schriftArt = (name: string) => getComputedStyle(held).getPropertyValue(name).trim();
    const schriftenLaden = async () => {
      if (!document.fonts?.load) return;
      const stil = getComputedStyle(wortText);
      const mono = schriftArt("--font-mono-ag") || "monospace";
      const lasten = [
        document.fonts.load(`800 120px ${stil.fontFamily}`, marke.name),
        document.fonts.load(`500 12px ${mono}`, "#%=+-:.*/·"),
        document.fonts.load(`400 13px ${mono}`, "0123456789 Assistent"),
      ];
      const serife = schriftArt("--font-serife");
      const text = schriftArt("--font-text");
      if (serife) lasten.push(document.fonts.load(`400 60px ${serife}`, "Stunden 0123"));
      if (text) lasten.push(document.fonts.load(`400 18px ${text}`, "Wir bauen"), document.fonts.load(`500 18px ${text}`, "Jetzt anrufen"));
      // Spätestens nach 2,5 s geht es mit den Schriften weiter, die da sind.
      await hoechstens(Promise.allSettled(lasten), 2.5);
    };
    let schriftenDa: Promise<unknown> | undefined;
    let obenImDokument = 0;
    const vermessen = async () => {
      schriftenDa ??= gemessen("schriften", schriftenLaden);
      await schriftenDa;
      if (vorbei) return;
      const stil = getComputedStyle(wortText);
      const mono = schriftArt("--font-mono-ag") || "monospace";
      const e = el.getBoundingClientRect();
      const w = wort.getBoundingClientRect();
      const ruhe = ruheLage();
      obenImDokument = e.top + window.scrollY;
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
      const bauen = () =>
        feld.bauen(
          {
            breite: Math.max(1, e.width),
            hoehe: Math.max(1, e.height),
            name,
            // Unter 768 px Breite ist eine Zelle 5 px breit, sonst 6,5 px.
            zelle: handyBreite ? 5 : 6.5,
            schrift: stil.fontFamily,
            mono,
            zeilen: gestapelt ? woerter : [woerter.join(" ")],
            // Am Handy: kräftigere Striche, helleres Grau, Strahlen nach unten halb so lang (gleicher Zeichensatz).
            fein: handyBreite,
            // Pixeldichte: am Handy höchstens 1,5, am Computer höchstens 2.
            dichteMax: handyBreite ? 1.5 : 2,
            schirm: Math.max(window.innerWidth, window.innerHeight),
            // Beim Scrollen fliegen die Zeichen auseinander: Die Fläche reicht deshalb 90 % der
            // Bildschirmhöhe unter den Kopfbereich hinaus (so weit, wie man dabei scrollt).
            ueberhang: still ? 0 : Math.round(window.innerHeight * 0.9),
          },
          // Am Handy steht der Schimmer ruhig, auch wenn sich das Licht dort leicht wiegt.
          szene ? (maus ? szene.lage : { ...szene.lage, kippX: 0, kippY: 0 }) : ruhe,
        );
      const anzahl = gebaut ? bauen() : ((await gemessen("zeichen", bauen)) ?? 0);
      gebaut = true;
      if (anzahl > 0) held.dataset.ln = "bereit";
      else delete held.dataset.ln;
      if (sofortNachBau) feld.sofort();
      beimScrollen();
    };

    // ── Phase „Licht“: Szene nachladen, anlegen, Shader übersetzen, Bilder vorzeichnen.
    // Kann sie nicht starten oder kommt das Gerät nicht flüssig mit, steht das ruhige Bild des Lichts
    // (während des Wartens noch nicht: Dort schimmert weiter der Stern, das Bild kommt mit dem Auftritt).
    const stattBild = () => {
      if (vorbei) return;
      szene?.ende();
      szene = undefined;
      ohneSzene = true;
      if (lichtAn) mitRuhigemBild(0.6);
    };
    // Der Stern beginnt in der Szene so schwach, wie sein Bild gerade ist (wird beim Übergang gesetzt).
    const stufen = { stern: 0.05, zeiten: maus ? LICHT_STUFEN : LICHT_STUFEN_HANDY };
    // Kommt die Szene gar nicht (kein WebGL, Laden gescheitert, Gerät ruckelt)? Dann gehört das ruhige Bild hin.
    let ohneSzene = still || geraetRuckelt;
    const lichtLaden = async () => {
      if (ohneSzene) return;
      try {
        await lichtHolen();
      } catch {
        if (vorbei) return;
        ohneSzene = true;
        // Der Start läuft schon: Statt der Szene blendet das ruhige Bild ein.
        if (lichtAn) mitRuhigemBild(0.9);
      }
    };
    const lichtHolen = async () => {
      const geholt = await gemessen("licht-laden", async () => (await szeneVorab) ?? import("./lichtszene"));
      if (vorbei) return;
      // Ließ sich die Szene nicht holen, gehört das ruhige Bild hin (lichtLaden() fängt das ab).
      if (!geholt) throw new Error("Licht-Szene nicht geladen");
      const { starteLichtSzene } = geholt;
      const anlegenAb = performance.now();
      const neu = starteLichtSzene(el, loch, {
        // Am Computer 80 Proben je Bildpunkt, am Handy 60.
        proben: maus ? 80 : 60,
        // Rein schwarz: Kopfbereich, Wand und Grund der Szene haben denselben Ton.
        wand: 0x000000,
        maus,
        stufen,
        // Die Zeichen erfahren, wie hell das Licht gerade ist. Am Computer wandert ihr Schimmer
        // außerdem mit dem Lichtkegel; am Handy steht er ruhig (das Licht wiegt sich nur leicht).
        beiBild: (lage) => feld.licht(maus ? lage : { ...lage, kippX: 0, kippY: 0 }),
        beiAusfall: () => {
          geraetRuckelt = true;
          stattBild();
        },
      });
      await neu.aufwaermen();
      try {
        performance.measure("ag-start:licht-anlegen", { start: anlegenAb, end: performance.now() });
      } catch {
        /* ohne Messung */
      }
      // Abgebaut, oder die Szene ist schon beim Aufwärmen ausgefallen: wieder wegräumen.
      if (vorbei || ohneSzene) return neu.ende();
      szene = neu;
      szene.schonen(schont);
      if (!lichtAn) return;
      // Der Start läuft schon (die Szene kam zu spät): Das Licht kommt jetzt nach.
      if (held.dataset.licht !== "bild") {
        // Bis jetzt schimmert noch der Stern: Das Licht baut sich ganz normal auf.
        lichtAuftritt();
        return;
      }
      // Steht schon das ruhige Bild (übersprungen), wird überblendet: Die Szene ist sofort voll da
      // und blendet darunter ein, das ruhige Bild blendet darüber aus und verschwindet erst danach.
      held.dataset.lichtwechsel = "1";
      spaeter.push(gsap.delayedCall(1.1, () => delete held.dataset.lichtwechsel));
      szene.zeigen(true);
      szene.mausFolgen(true);
      held.dataset.licht = "live";
    };

    // ── Phase „Bilder“: Bilder der ersten Abschnitte fertig dekodieren.
    const bilderLaden = async () => {
      const bilder = Array.from(document.querySelectorAll<HTMLImageElement>(".ag-neu img")).filter(
        (bild) => bild.loading !== "lazy" && bild.getBoundingClientRect().top < window.innerHeight * 3,
      );
      // Das kleine Licht von Logo und Chat-Knopf liegt als Hintergrund im Stylesheet.
      const mini = new window.Image();
      mini.src = "/kopf/licht-mini.webp";
      await hoechstens(Promise.allSettled([...bilder, mini].map((bild) => bild.decode?.())), 2.5);
    };

    // ── Phase „Probe“: Läuft es unter echter Last ruhig? In jedem Bild wird das volle Licht mit
    // allen Teilen gezeichnet und dazu die Zeichen wie mitten im Flug. Beide Flächen sind dabei
    // fast unsichtbar (unter 1 % Deckkraft), aber nicht ganz: So bringt der Browser die Bilder
    // wirklich auf den Bildschirm, und ihr Abstand ist die echte Bildzeit unter voller Last.
    // Weiter geht es, wenn 30 Bilder hintereinander unter 17 ms lagen. Danach laufen die Probebilder
    // weiter, bis das Licht angeht: So bleibt die Grafikkarte bis zum Start auf Touren.
    let probeAus: (() => void) | undefined;
    const probe = () =>
      new Promise<void>((ruhig) => {
        // Inzwischen abgebaut oder schon gestartet (übersprungen): keine Probe mehr, nichts anfassen.
        if (vorbei || lichtAn) return ruhig();
        let zuletzt = 0;
        let folge = 0;
        let zahl = 0;
        let summe = 0;
        let laengstes = 0;
        let gemeldet = false;
        let aus = false;
        feld.probe(true);
        szene?.probe(true);
        const melde = (bestanden: boolean) => {
          if (gemeldet) return;
          gemeldet = true;
          try {
            // Nachzulesen über performance.getEntriesByName("ag-start:probe-bilder").
            performance.mark("ag-start:probe-bilder", { detail: { bilder: zahl, mittel: zahl ? summe / zahl : 0, laengstes, bestanden } });
          } catch {
            /* ohne Messung */
          }
          ruhig();
        };
        probeAus = () => {
          if (aus) return;
          aus = true;
          probeAus = undefined;
          feld.probe(false);
          szene?.probe(false);
          melde(false);
        };
        const bild = (jetzt: number) => {
          if (aus) return;
          if (vorbei || lichtAn) return probeAus?.();
          // Kommt die Grafikkarte nicht nach, zeichnet die Szene nicht: Das Bild zählt als zu langsam.
          const imTritt = !szene || szene.probeBild();
          if (imTritt) feld.probeBild();
          if (zuletzt && !gemeldet) {
            const dauer = jetzt - zuletzt;
            zahl += 1;
            summe += dauer;
            laengstes = Math.max(laengstes, dauer);
            folge = imTritt && dauer < PROBE_MS ? folge + 1 : 0;
            if (folge >= PROBE_BILDER) melde(true);
          }
          zuletzt = jetzt;
          requestAnimationFrame(bild);
        };
        requestAnimationFrame(bild);
      });

    // ── Der Auftritt.
    const sternAus = (dauer: number) => {
      if (!stern) return;
      gsap.killTweensOf(stern);
      // Aus dem Atmen (Stylesheet) in den festen Wert übernehmen, dann ausblenden.
      const jetzt = Number(getComputedStyle(stern).opacity) || 0;
      gsap.set(stern, { opacity: jetzt, animation: "none" });
      spaeter.push(gsap.to(stern, { opacity: 0, duration: dauer, ease: "power1.out" }));
      return jetzt;
    };
    const stehen = () => {
      if (fertig || vorbei) return;
      fertig = true;
      startGelaufen.current = true;
      // Kommt die Szene gar nicht mehr, steht spätestens jetzt das ruhige Bild.
      if (!szene && ohneSzene && held.dataset.licht !== "bild") mitRuhigemBild(0.6);
      held.dataset.start = "fertig";
      allesGemeldet();
    };
    const fliegen = () => {
      if (fliegt || fertig || vorbei) return;
      fliegt = true;
      schonen(true);
      // 250 ms nach dem Ende des Flugs läuft einmal von selbst eine Welle aus der Mitte des Namens:
      // der Hinweis, dass man klicken kann. (War der Kopfbereich beim Start nicht zu sehen, fliegen
      // die Zeichen erst ein, wenn er ins Bild kommt.)
      feld.starten(() => {
        // Bis diese Welle durch ist (0,25 s Pause + 1,3 s), bleibt das Licht geschont.
        schoneFuer(1.6);
        spaeter.push(gsap.delayedCall(0.25, feld.welleMitte));
        // Wenn alles steht, wartet das Licht 1 s und dreht sich dann langsam zur Maus.
        spaeter.push(gsap.delayedCall(MAUS_NACH, () => szene?.mausFolgen(true, MAUS_DREHEN)));
        stehen();
      });
      // Während die Zeichen landen, erscheinen Kopfleiste, „Anrufen“ und Chat-Knopf.
      spaeter.push(
        gsap.delayedCall(LEISTE_NACH, () => {
          if (!fertig) held.dataset.start = "landen";
        }),
      );
    };
    // Die Szene ist da: Das Licht baut sich von innen nach außen auf (Stern, Balken, Strahlen).
    const lichtAuftritt = () => {
      if (!szene || vorbei) return;
      const dauer = stufen.zeiten[0] + stufen.zeiten[1] + stufen.zeiten[2];
      // Übergang ohne Sprung: Die Szene zeigt zuerst nur den Stern, genau so hell wie sein Bild
      // gerade ist (Deckkraft des Bildes, in die lineare Helligkeit der Szene umgerechnet).
      stufen.stern = Math.pow(sternAus(0.35) ?? 0.2, 2.2);
      held.dataset.licht = "live";
      szene.zeigen(false, dauer, undefined, (pegel) => {
        if (pegel >= FLUG_AB_PEGEL) fliegen();
      });
      // Standen die Zeichen schon (die Szene kam erst danach), dreht sich das Licht nach seinem Auftritt zur Maus.
      if (fertig) spaeter.push(gsap.delayedCall(dauer + 1, () => szene?.mausFolgen(true, MAUS_DREHEN)));
    };
    // Statt der Szene das ruhige Bild des Lichts: Es blendet ein, der Stern blendet darunter aus.
    const mitRuhigemBild = (sternDauer: number) => {
      sternAus(sternDauer);
      held.dataset.licht = "bild";
      feld.licht(ruheLage());
    };
    const lichtAnmachen = () => {
      if (lichtAn || fertig || vorbei) return;
      lichtAn = true;
      probeAus?.();
      melden(INTRO_FERTIG, INTRO_FERTIG_KLASSE);
      melden(LADEN_FERTIG, LADEN_FERTIG_KLASSE);
      held.dataset.start = "licht";
      if (szene) return lichtAuftritt();
      // Die Szene kommt nicht (das Gerät kommt nicht mit): Es steht das ruhige Bild des Lichts.
      // Lädt sie nur noch (spätestens nach 6 s geht es trotzdem los), schimmert der Stern weiter,
      // und das Licht geht an, sobald sie da ist. In beiden Fällen fliegen die Zeichen schon.
      if (ohneSzene) mitRuhigemBild(0.9);
      spaeter.push(gsap.delayedCall(0.4, fliegen));
    };
    // Überspringen (Klick, Taste, Scrollen): Alles steht sofort.
    const ueberspringen = () => {
      if (fertig || vorbei) return;
      uebersprungenUm = performance.now();
      spaeter.forEach((t) => t.kill());
      lichtAn = true;
      probeAus?.();
      if (szene) {
        sternAus(0.2);
        held.dataset.licht = "live";
        szene.zeigen(true);
        szene.mausFolgen(true);
      } else mitRuhigemBild(0.4);
      if (gebaut) feld.sofort();
      else sofortNachBau = true;
      schonen(false);
      stehen();
    };

    // Klick oder Tippen auf den Namen (plus 40 px Rand, nicht auf Knöpfe und Links, nicht im Startflug): eine Welle.
    const klick = (ev: MouseEvent) => {
      // Der Klick, der die Startanimation übersprungen hat, löst nicht auch noch eine Welle aus.
      if (!gebaut || !fertig || performance.now() - uebersprungenUm < 400) return;
      if ((ev.target as Element | null)?.closest("a, button, input, select, textarea, label")) return;
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

    // ── Scrollen: Die Zeichen fliegen auseinander, das Licht wird schwächer. Zurück am
    // Seitenanfang leuchtet es kurz etwas heller auf.
    let warWeg = false;
    let rollZuletzt = -1;
    const beimScrollen = () => {
      const y = window.scrollY;
      const hoch = window.innerHeight;
      // Wer während der Startanimation scrollt, will weiter: Dann steht alles sofort.
      if (y > 24 && !fertig && !still) ueberspringen();
      // Scroll-Fortschritt: scrollY ÷ (0,9 × Bildschirmhöhe), begrenzt auf 0 bis 1.
      const s = Math.max(0, Math.min(1, y / (0.9 * hoch)));
      if (gebaut) feld.rollen(s, Math.max(0, y - obenImDokument), hoch);
      if (s === rollZuletzt) return;
      rollZuletzt = s;
      // Das Licht tritt zurück (bis auf 14 %), je weiter man scrollt.
      const zurueck = Math.max(0, Math.min(1, (s - 0.12) / 0.8));
      held.style.setProperty("--licht-deck", (1 - 0.86 * zurueck).toFixed(3));
      if (s > 0 && s < 1 && !still) schoneFuer(0.3);
      if (s >= 0.6) warWeg = true;
      else if (s <= 0.01 && warWeg) {
        warWeg = false;
        szene?.aufleuchten();
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
    // zählt die letzte: Sie beschreibt den jetzigen Stand. Die Zeichenfläche reicht unter den
    // Kopfbereich hinaus; gerechnet wird, solange irgendein Teil von ihr im Bild ist.
    const waechter = new IntersectionObserver((eintraege) => feld.sichtbar(eintraege[eintraege.length - 1].isIntersecting));
    waechter.observe(leinwand);
    window.addEventListener("scroll", beimScrollen, { passive: true });

    const taste = (ev: KeyboardEvent) => {
      if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) ueberspringen();
    };
    if (still) {
      // „Weniger Bewegung“: Es steht das ruhige Bild, der Name blendet ein, alles ist sofort da.
      held.dataset.licht = "bild";
      lichtAn = true;
      stehen();
    } else {
      held.dataset.start = "warten";
      held.addEventListener("click", klick);
      window.addEventListener("pointerdown", ueberspringen);
      window.addEventListener("keydown", taste);
      if (maus) {
        window.addEventListener("pointermove", zeigerBewegt, { passive: true });
        wurzel.addEventListener("pointerleave", zeigerWeg);
      }
      beimScrollen();
      // Alles fertig machen, während der Stern schimmert; zum Schluss die Probe.
      const allesDa = Promise.allSettled([vermessen(), gemessen("licht", lichtLaden), gemessen("bilder", bilderLaden)])
        // Alles, was sich für das erste Scrollen angemeldet hat (die zweite Licht-Szene im
        // Wörter-Feld, die Bilder der Abschnitte darunter). Höchstens 2,5 s.
        .then(() => (vorbei ? undefined : gemessen("vorarbeit", () => hoechstens(vorarbeit.alle(), 2.5))))
        .then(() => (vorbei ? undefined : gemessen("probe", probe)));
      // Frühestens 3 s, spätestens 6 s nach dem ersten Bild.
      const seitErstemBild = () => (performance.now() - erstesBild) / 1000;
      spaeter.push(gsap.delayedCall(Math.max(0, WARTEN_MAX - seitErstemBild()), lichtAnmachen));
      // Lief die Startanimation bei diesem Laden schon, steht alles sofort.
      if (startGelaufen.current) ueberspringen();
      allesDa.then(() => {
        if (vorbei) return;
        try {
          performance.measure("ag-start:warten", { start: erstesBild, end: performance.now() });
        } catch {
          /* ohne Messung */
        }
        spaeter.push(gsap.delayedCall(Math.max(0, WARTEN_MIN - seitErstemBild()), lichtAnmachen));
      });
    }

    return () => {
      vorbei = true;
      probeAus?.();
      wenigBewegung.removeEventListener("change", umstellen);
      feinerZeiger.removeEventListener("change", umstellen);
      window.clearTimeout(warten);
      beobachter.disconnect();
      waechter.disconnect();
      window.removeEventListener("scroll", beimScrollen);
      held.removeEventListener("click", klick);
      window.removeEventListener("pointerdown", ueberspringen);
      window.removeEventListener("keydown", taste);
      window.removeEventListener("pointermove", zeigerBewegt);
      wurzel.removeEventListener("pointerleave", zeigerWeg);
      spaeter.forEach((t) => t.kill());
      uhren.forEach((u) => window.clearTimeout(u));
      schonEnde?.kill();
      if (stern) {
        gsap.killTweensOf(stern);
        gsap.set(stern, { clearProps: "opacity,animation" });
      }
      szene?.ende();
      feld.ende();
      wurzel.classList.remove(...KLASSEN);
      held.style.removeProperty("--licht-deck");
      held.dataset.start = "warten";
      delete held.dataset.ln;
      delete held.dataset.licht;
      delete held.dataset.lichtwechsel;
    };
  }, [einstellung]);

  // Drei Schichten, von hinten nach vorn: das Licht, der gewöhnliche Schriftzug
  // (ohne Skript sichtbar, sonst nur Maß und Name für Vorleseprogramme), die Zeichen.
  return (
    <>
      {/* Hinten: Hierhin setzt die Licht-Szene ihre Zeichenfläche. */}
      <div ref={ebene} className="ag-ln ag-ln--hinten" aria-hidden="true" />
      <div className="ag-kopf5__mitte">
        {/* Oben der Platz des Licht-Logos (so groß wie das Logo-Loch), darunter mit Abstand der Schriftzug. */}
        <div className="ag-ln__platz">
          <span className="ag-ln__loch" aria-hidden="true">
            {/* Ruhiges Bild des Lichts: nur bei „weniger Bewegung“ oder wenn die Szene nicht flüssig läuft. Sonst wird es nicht geladen. */}
            <Image className="ag-ln__standbild" src={lichtBild} alt="" sizes="(max-width: 767px) 150vw, min(72vw, 1260px)" loading="lazy" />
            {/* Stern im Dunkeln: Er schimmert, während alles lädt, genau an der Stelle des späteren Sterns. */}
            <Image className="ag-ln__stern" src={sternBild} alt="" sizes="(max-width: 767px) 53vw, min(26vw, 450px)" priority />
          </span>
          <Wortmarke />
        </div>
      </div>
      <div className="ag-ln ag-ln--vorn" aria-hidden="true">
        <canvas ref={zeichenLeinwand} className="ag-ln__zeichen" />
      </div>
    </>
  );
}
