"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
// Als Datei eingebunden: Die Adresse trägt dann eine Prüfsumme, ein neu aufgenommenes Bild kommt sicher an.
import lichtBild from "@/public/kopf/licht-logo.jpg";
import { marke } from "@/lib/inhalt-neu";
import { Wortmarke } from "../Rahmen";
import {
  INTRO_FERTIG,
  INTRO_FERTIG_KLASSE,
  LADEN_FERTIG,
  LADEN_FERTIG_KLASSE,
  START_FERTIG,
  START_FERTIG_KLASSE,
  START_FREI,
  START_FREI_KLASSE,
  istVorschau,
  scrollSperre,
  scrollZiel,
} from "../umgebung";
import type { LichtLage, LichtSzene } from "./lichtszene";
import { OBEN_PX, erzeugeSichtUhr, lichtQuelle, lichtStaerke, probeFrist, rollStand, sichtbarZwischen, stufenWerte, wennBildKommt, wennSzeneKommt, type StartStand } from "./startlogik";
import { NOT_LICHT } from "./notlicht";
import { STERN_BILD } from "./sternbild";
import { erzeugeZeichenname } from "./zeichenname";

/**
 * Der Kopfbereich in zwei Ebenen, durchscheinend übereinander: hinten das
 * Licht-Logo, vorn der Name aus Zeichen-Teilchen. Diese Datei hält beide im
 * Takt und führt die Startanimation.
 *
 * Startanimation (bei jedem Laden der Seite, immer ganz und immer von oben):
 *   1. Warten: Der Bildschirm ist schwarz, in der Mitte schimmert nur der Stern
 *      des Logos (ein vorgerendertes Bild, genau an der Stelle des späteren
 *      Sterns). Währenddessen wird alles fertig gemacht: Schriften, Raster und
 *      Vorrat der Zeichen, die Licht-Szene (Shader übersetzt, die echte Szene
 *      in voller Größe unsichtbar vorgezeichnet) und die Bilder des ersten
 *      Bildschirms (alles weiter unten lädt danach im Hintergrund). Zum Schluss
 *      die Probe unter echter Last: 30 Bilder hintereinander unter 17 ms.
 *   2. Weiter geht es erst, wenn alles bereit ist, frühestens 1,5 s nach dem
 *      ersten Bild. Dauert das Laden länger, pulsiert der Stern weiter, bis
 *      alles da ist (Sicherheitsgrenze 15 s). Die Probe allein hält den Start
 *      höchstens bis 6 s nach dem ersten Bild auf. Nie springt die Seite direkt
 *      in den fertigen Zustand.
 *   3. Das Licht baut sich von innen nach außen auf, jeder Schritt weich in
 *      den nächsten: Der Stern wird heller (0,7 s; er geht ohne Sprung vom
 *      Bild in die Szene über), dann kommen die vier Balken (0,6 s), dann
 *      wachsen die Strahlen (1,2 s). Am Handy etwas kürzer. Gibt es kein Licht
 *      aus der Szene (kein WebGL, Laden gescheitert), läuft dieselbe Abfolge
 *      mit dem ruhigen Bild: Es wird von der Mitte her freigegeben.
 *   4. Bei 60 % der Lichtstärke fliegen die Zeichen ein (2,2 s); 250 ms nach
 *      der Landung läuft die Welle aus der Namensmitte.
 *   5. Während die Zeichen landen, erscheinen Kopfleiste, „Anrufen“ und
 *      Chat-Knopf (Stylesheet, über data-start am Kopfbereich).
 * Solange das läuft, steht das Licht ruhig in der Mitte. Wenn alles steht
 * (Zeichen gelandet, Welle vorbei), wartet es 1 s und dreht sich dann langsam
 * zur Maus (1,5 s). Während der ganzen Startanimation steht die Seite oben:
 * Man kann nicht scrollen und nichts überspringen, bis der Name gelandet und
 * die Welle durch ist. Der Browser stellt nach Neuladen oder Zurück keine
 * frühere Lage wieder her (`history.scrollRestoration = "manual"`); steht ein
 * Ziel in der Adresse (#kontakt), läuft erst der Start, danach scrollt die
 * Seite weich dorthin. Holt der Browser die Seite bei „Zurück“ aus seinem
 * Zwischenspeicher (sie käme so wieder, wie sie verlassen wurde), wird alles
 * frisch eingerichtet und der Start läuft noch einmal ganz. Nur wenn der Start
 * bei diesem Laden schon lief (neu eingerichtet nach einer Umstellung, im
 * Dev-Server nach einem Fast Refresh), steht alles sofort. Bei „weniger
 * Bewegung“ blendet alles ruhig ein.
 *
 * Danach: Die Zeichen weichen dem Zeiger aus, ein Klick auf den Namen schickt
 * eine Welle hindurch. Beim Runterscrollen fliegen die Zeichen auf den Bahnen
 * des Startflugs wieder auseinander, das Licht wird schwächer; zurück am
 * Seitenanfang leuchtet es kurz etwas heller auf.
 *
 * Am Computer wird das Licht nie zum Standbild: Wird es knapp, rechnet die
 * Szene billiger (Sparstufen in lichtszene.ts), lebt aber weiter und folgt der
 * Maus. Am Handy läuft dieselbe Szene mit 60 Proben; nur dort steht als letzte
 * Rettung ein ruhiges Bild des Lichts, wenn es trotz aller Sparstufen ruckelt.
 * Gerechnet wird nur, solange der Kopfbereich zu sehen ist. Der gewöhnliche Schriftzug ist unsichtbar und
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

// Der Stern steht jedes Mal mindestens so lange im Dunkeln (Sekunden seit dem ersten Bild).
const WARTEN_MIN = 1.5;
// Die Probe darf den Start höchstens bis hierhin aufhalten …
const PROBE_BIS = 6;
// … Laden und Aufwärmen dagegen bis zur Sicherheitsgrenze: So lange pulsiert der Stern notfalls
// weiter. Erst danach geht es mit dem los, was da ist.
const WARTEN_GRENZE = 15;
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
const WELLE_ENDE = 0.25 + 1.3;
const MAUS_NACH = WELLE_ENDE + 1;
const MAUS_DREHEN = 1.5;
// Probe vor dem Start: so viele Bilder hintereinander müssen schneller sein als diese Zeit
// (17 ms, mit einer halben Millisekunde Luft für Browser, die Zeiten runden).
const PROBE_BILDER = 30;
// Diese Tasten scrollen die Seite; während der Startanimation tun sie nichts.
const SCROLL_TASTEN = [" ", "PageDown", "PageUp", "End", "Home", "ArrowDown", "ArrowUp"];
const PROBE_MS = 17.5;
// Der erste Start nach dem Laden der Seite misst seine Wartezeiten ab dem ersten Bild der Seite.
let ersterStart = true;
// Verdeckt die Seite, während sie im Zwischenspeicher des Browsers liegt (Stylesheet).
const ZURUECK_KLASSE = "ag-zurueck";

export function LichtName() {
  const ebene = useRef<HTMLDivElement>(null);
  const zeichenLeinwand = useRef<HTMLCanvasElement>(null);
  // Zählt hoch, wenn der Besucher „weniger Bewegung“ umstellt oder das Zeigegerät wechselt:
  // Dann wird alles abgebaut und mit der neuen Einstellung frisch eingerichtet.
  const [einstellung, setEinstellung] = useState(0);
  // Die Startanimation läuft einmal je Laden der Seite. Wird später nur neu eingerichtet (andere
  // Einstellung), steht alles sofort.
  const startGelaufen = useRef(false);
  // Zählt hoch, wenn der Browser die Seite bei „Zurück“ aus seinem Zwischenspeicher holt. Sie käme
  // so wieder, wie sie verlassen wurde: mitten auf der Seite, der Start längst vorbei. Dann wird
  // alles frisch eingerichtet, und die Startanimation läuft noch einmal ganz, von oben.
  const [rueckkehr, setRueckkehr] = useState(0);

  useEffect(() => {
    const wurzel = document.documentElement;
    const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || istVorschau();
    let uhr = 0;
    // Beim Verlassen wird die Seite verdeckt: Kommt sie aus dem Zwischenspeicher zurück, blitzt
    // nicht erst der alte Stand auf. (Bei „weniger Bewegung“ kommt sie einfach so wieder.)
    const weg = (ev: PageTransitionEvent) => {
      if (ev.persisted && !still()) wurzel.classList.add(ZURUECK_KLASSE);
    };
    const zurueck = (ev: PageTransitionEvent) => {
      if (!ev.persisted) return;
      if (!still()) {
        startGelaufen.current = false;
        setRueckkehr((n) => n + 1);
      }
      // Sicherheitsnetz: Spätestens dann ist die Seite wieder zu sehen.
      uhr = window.setTimeout(() => wurzel.classList.remove(ZURUECK_KLASSE), 1500);
    };
    window.addEventListener("pagehide", weg);
    window.addEventListener("pageshow", zurueck);
    return () => {
      window.removeEventListener("pagehide", weg);
      window.removeEventListener("pageshow", zurueck);
      window.clearTimeout(uhr);
      wurzel.classList.remove(ZURUECK_KLASSE);
    };
  }, []);

  useEffect(() => {
    const el = ebene.current;
    const leinwand = zeichenLeinwand.current;
    const held = el?.closest<HTMLElement>(".ag-hero");
    const platz = held?.querySelector<HTMLElement>(".ag-ln__platz");
    const loch = platz?.querySelector<HTMLElement>(".ag-ln__loch");
    const stern = loch?.querySelector<HTMLElement>(".ag-ln__stern");
    const standbild = loch?.querySelector<HTMLImageElement>(".ag-ln__standbild");
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
    const KLASSEN = [INTRO_FERTIG_KLASSE, LADEN_FERTIG_KLASSE, START_FERTIG_KLASSE, START_FREI_KLASSE];
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
      melden(START_FREI, START_FREI_KLASSE);
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
    const spaeter: gsap.core.Tween[] = [];
    // Scrollen ist frei, sobald die Startanimation ganz vorbei ist (Name gelandet, Welle durch).
    let frei = false;
    // Solange gesperrt ist, tun Mausrad, Wischen und die Scroll-Tasten nichts (das Stylesheet sperrt
    // dazu das gewöhnliche Scrollen samt Scrollbalken, das weiche Scrollen hält an).
    const haltAn = (ev: Event) => {
      if (!frei && ev.cancelable) ev.preventDefault();
    };
    const haltTaste = (ev: KeyboardEvent) => {
      if (frei || !SCROLL_TASTEN.includes(ev.key)) return;
      if ((ev.target as Element | null)?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      ev.preventDefault();
    };
    // Auch ein Klick auf ein Sprungziel der Seite („#kontakt“) bewegt sie solange nicht. Die Seite
    // merkt sich das Ziel und scrollt nach dem Start dorthin.
    const haltSprung = (ev: MouseEvent) => {
      if (frei) return;
      const verweis = (ev.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!verweis?.getAttribute("href")?.includes("#")) return;
      ev.preventDefault();
      if (verweis.origin !== window.location.origin || verweis.pathname !== window.location.pathname) return;
      merkeZiel(verweis.hash);
    };
    /** Das zuletzt gewünschte Ziel zählt. Ein Ziel ganz oben (#top) oder gar keines hebt ein früheres auf. */
    const merkeZiel = (hash: string) => {
      const ziel = zielVon(hash);
      if (ziel) scrollZiel.zu(ziel);
      else scrollZiel.vergiss();
    };
    // Ändert sich das Ziel in der Adresse während des Starts, gilt das neue.
    const beiHash = () => merkeZiel(window.location.hash);
    /** Das Element zu einem Ziel wie „#kontakt“; ein Ziel ganz oben (#top) ist kein Sprung. */
    const zielVon = (hash: string): HTMLElement | null => {
      let ziel: HTMLElement | null = null;
      try {
        ziel = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        return null;
      }
      return ziel && ziel.getBoundingClientRect().top + window.scrollY > OBEN_PX ? ziel : null;
    };
    let gesperrt = false;
    // Sichtbare Zeit seit dem Beginn der Sperre (für das Sicherheitsnetz).
    let sichtUhr: ReturnType<typeof erzeugeSichtUhr> | undefined;
    const sichtWechsel = () => sichtUhr?.wechsel();
    // Wie lange der Stern schon zu sehen war (Sekunden seit dem ersten Bild; Zeit in einem verdeckten
    // Tab zählt nicht mit). Alle Fristen des Starts rechnen damit. Von der Zeit vor dem Einrichten
    // (zwischen dem ersten Bild und dem Skript) zählt nur, was laut Sichtbarkeits-Protokoll des
    // Browsers zu sehen war; kennt er keines, zählt davon nichts (startlogik.ts).
    let vorEinrichten = 0;
    const sichtProtokoll = () => {
      try {
        return PerformanceObserver.supportedEntryTypes?.includes("visibility-state") ? performance.getEntriesByType("visibility-state") : null;
      } catch {
        return null;
      }
    };
    const gesehen = () => (sichtUhr ? vorEinrichten + sichtUhr.ms() : performance.now() - erstesBild) / 1000;
    const netz = () => {
      if (frei || vorbei || !sichtUhr) return;
      const rest = (WARTEN_GRENZE + 9) * 1000 - sichtUhr.ms();
      if (rest <= 0) return freigeben();
      uhren.push(window.setTimeout(netz, Math.max(250, rest)));
    };
    // Die Sperre ist fest: Die Seite ist nur so hoch wie das Bild und kann gar nicht scrollen, auch
    // nicht durch die Tab-Taste, ein Skript oder einen Sprung des Browsers zum Ziel in der Adresse.
    const sperren = () => {
      gesperrt = true;
      scrollSperre.setze(true, true);
      window.addEventListener("wheel", haltAn, { passive: false });
      window.addEventListener("touchmove", haltAn, { passive: false });
      window.addEventListener("keydown", haltTaste);
      window.addEventListener("click", haltSprung, true);
      window.addEventListener("hashchange", beiHash);
    };
    /** Gibt zurück, ob die Seite jetzt zu einem gemerkten Ziel scrollt. */
    const entsperren = (): boolean => {
      const zumZiel = scrollSperre.setze(false);
      window.removeEventListener("wheel", haltAn);
      window.removeEventListener("touchmove", haltAn);
      window.removeEventListener("keydown", haltTaste);
      window.removeEventListener("click", haltSprung, true);
      window.removeEventListener("hashchange", beiHash);
      return zumZiel;
    };
    const freigeben = () => {
      if (frei || vorbei) return;
      const warGesperrt = gesperrt;
      frei = true;
      gesperrt = false;
      // Ziel in der Adresse (#kontakt) oder ein Klick auf ein Sprungziel während des Starts: Erst
      // lief der Start, jetzt scrollt die Seite weich dorthin.
      const zumZiel = entsperren();
      melden(START_FREI, START_FREI_KLASSE);
      if (!warGesperrt || zumZiel) return;
      // Ist der Tastatur-Fokus während der Sperre zu einem Feld weiter unten gesprungen (die Seite
      // selbst konnte nicht mit), kommt es jetzt ins Bild.
      const ziel = document.activeElement;
      if (ziel instanceof HTMLElement && ziel !== document.body) {
        const r = ziel.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) ziel.scrollIntoView({ block: "center" });
      }
    };

    // ── Messung: Wie lange dauert jede Ladephase? Nachzulesen über performance.getEntriesByType("measure").
    // Ab wann der Stern pulsiert. Beim ersten Start nach dem Laden ist das das erste Bild der Seite.
    // Jeder spätere Start (zurück innerhalb der Website, zurück aus dem Zwischenspeicher) rechnet ab
    // jetzt: Sonst wären Mindestzeit und Sicherheitsgrenze längst abgelaufen, bevor etwas geladen ist.
    const erstesBild = (ersterStart ? performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint")?.startTime : undefined) ?? performance.now();
    ersterStart = false;
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
      if (lichtAn) bildNachholen();
      else void standbildLaden();
    };
    // Das ruhige Bild wird sonst gar nicht geladen. Braucht der Start es (kein WebGL, die Szene kommt
    // nicht), wird es geholt, während der Stern noch pulsiert: So ist es da, wenn es los geht.
    // Gewartet wird, bis es wirklich da ist (oder nicht zu laden war): Sonst liefe sein Auftritt ins
    // Leere, und das Bild stünde später auf einmal ganz da. Zu lange hält es den Start trotzdem nicht
    // auf: Dafür sorgt die Sicherheitsgrenze (lichtAnmachen).
    let standbildDa: Promise<unknown> | undefined;
    const standbildLaden = () =>
      (standbildDa ??= (async () => {
        if (!standbild) return;
        // Im Dokument, aber unsichtbar (Stylesheet): Erst dann lädt der Browser es.
        held.dataset.bildvor = "1";
        standbild.loading = "eager";
        await (standbild.decode?.().catch(() => undefined) ?? Promise.resolve());
      })());
    const bildBereit = () => !!standbild && standbild.complete && standbild.naturalWidth > 0;
    // ── Not-Licht: Ist das große ruhige Bild noch nicht geladen, wenn es gebraucht wird, steht an
    // seiner Stelle sofort dasselbe Bild in klein (fest im Skript, braucht keine Leitung): als
    // Hintergrund desselben Elements. Das große lädt weiter und legt sich darüber, sobald es da
    // ist: gleiches Bild, nur schärfer, ohne Sprung.
    let notlichtAn = false;
    const notlichtEinsetzen = () => {
      if (!standbild || notlichtAn || bildBereit()) return;
      notlichtAn = true;
      standbild.style.backgroundImage = `url("${NOT_LICHT}")`;
      standbild.style.backgroundSize = "100% 100%";
      void standbildLaden();
    };
    // Der Start läuft schon oder ist vorbei, und die Szene kommt nicht (mehr): Das ruhige Bild
    // übernimmt. Stand schon lebendes Licht, blendet es weich ein; war noch keines zu sehen, baut
    // es sich in Stufen auf. Ist das große Bild noch nicht geladen, steht solange das Not-Licht.
    const bildNachholen = () => {
      if (vorbei || szene || held.dataset.licht === "bild") return;
      notlichtEinsetzen();
      // Wurde der Lichtaufbau unterbrochen, bevor die Zeichen losflogen (die Grafik fiel mittendrin
      // aus), baut sich auch das Bild in Stufen auf: Nur so fliegen die Zeichen los.
      if (wennBildKommt(startStand()) === "einblenden") mitRuhigemBild(0.6);
      else bildAuftritt();
    };
    const startStand = (): StartStand => ({ fertig, fliegt, zeigt: held.dataset.licht === "live" ? "live" : held.dataset.licht === "bild" ? "bild" : "nichts" });
    // Der Stern beginnt in der Szene so schwach, wie sein Bild gerade ist (wird beim Übergang gesetzt).
    const stufen = { stern: 0.05, zeiten: maus ? LICHT_STUFEN : LICHT_STUFEN_HANDY };
    // Kommt die Szene gar nicht (kein WebGL, Laden gescheitert, Gerät ruckelt)? Dann gehört das ruhige Bild hin.
    let ohneSzene = still || (geraetRuckelt && !maus);
    let neuAufbau = 0;
    // Zählt jeden Versuch, die Szene anzulegen: Fällt die Grafik aus, während eine Szene noch
    // aufwärmt, ist dieser Versuch hinfällig (die Szene darf danach nicht mehr eingesetzt werden).
    let lichtVersuch = 0;
    const lichtLaden = async () => {
      if (ohneSzene) return void (await standbildLaden());
      try {
        await lichtHolen();
      } catch {
        if (vorbei) return;
        ohneSzene = true;
        // Der Start läuft schon: Statt der Szene kommt das ruhige Bild (bildNachholen). Sonst wird
        // es jetzt geholt, und der Start läuft danach mit dem Bild.
        if (lichtAn) bildNachholen();
        else await standbildLaden();
      }
    };
    const lichtHolen = async () => {
      const geholt = await gemessen("licht-laden", async () => (await szeneVorab) ?? import("./lichtszene"));
      if (vorbei) return;
      // Ließ sich die Szene nicht holen, gehört das ruhige Bild hin (lichtLaden() fängt das ab).
      if (!geholt) throw new Error("Licht-Szene nicht geladen");
      const { starteLichtSzene } = geholt;
      const anlegenAb = performance.now();
      lichtVersuch += 1;
      const versuch = lichtVersuch;
      const neu: LichtSzene = starteLichtSzene(el, loch, {
        // Am Computer 80 Proben je Bildpunkt, am Handy 60.
        proben: maus ? 80 : 60,
        // Rein schwarz: Kopfbereich, Wand und Grund der Szene haben denselben Ton.
        wand: 0x000000,
        maus,
        stufen,
        // Die Zeichen erfahren, wie hell das Licht gerade ist. Am Computer wandert ihr Schimmer
        // außerdem mit dem Lichtkegel; am Handy steht er ruhig (das Licht wiegt sich nur leicht).
        beiBild: (lage) => feld.licht(maus ? lage : { ...lage, kippX: 0, kippY: 0 }),
        // Nur sehr schwache Handys dürfen auf das ruhige Bild ausweichen; am Computer spart die Szene nur.
        letzteRettung: !maus,
        beiAusfall: (grund) => {
          if (vorbei) return;
          // Die Grafik ist ausgefallen: einmal frisch aufbauen. Gelingt auch das nicht, steht das ruhige Bild.
          if (grund === "verlust" && neuAufbau < 1) {
            neuAufbau += 1;
            // Die ausgefallene Szene abbauen, auch wenn sie noch aufwärmt und noch nicht eingesetzt ist.
            lichtVersuch += 1;
            neu.ende();
            if (szene === neu) szene = undefined;
            uhren.push(window.setTimeout(() => void lichtLaden(), 400));
            return;
          }
          if (grund === "last") geraetRuckelt = true;
          stattBild();
        },
      });
      await neu.aufwaermen();
      try {
        performance.measure("ag-start:licht-anlegen", { start: anlegenAb, end: performance.now() });
      } catch {
        /* ohne Messung */
      }
      // Die Grafik ist beim Aufwärmen ausgefallen: Diese Szene ist schon abgebaut, ein neuer Versuch läuft.
      if (versuch !== lichtVersuch) return;
      // Abgebaut, oder das ruhige Bild gilt inzwischen: wieder wegräumen.
      if (vorbei || ohneSzene) {
        neu.ende();
        if (!vorbei && !lichtAn) await standbildLaden();
        return;
      }
      szene = neu;
      if (!lichtAn) return;
      const weg = wennSzeneKommt(startStand());
      // Neu aufgebaut, nachdem alles schon stand (die Grafik war ausgefallen): Das Licht ist sofort wieder da.
      if (weg === "sofort") {
        szene.zeigen(true);
        szene.mausFolgen(true);
        return;
      }
      // Die Grafik fiel mitten im Lichtaufbau aus, bevor die Zeichen losflogen: Der Aufbau beginnt
      // neu, in Stufen. Sonst käme das Licht auf einmal, und die Zeichen flögen nie los.
      if (weg === "aufbauen") return lichtAuftritt();
      // Der Start läuft schon mit dem ruhigen Bild (die Szene kam erst nach der Sicherheitsgrenze):
      // Es wird überblendet. Die Szene ist voll da und blendet darunter ein, das ruhige Bild blendet
      // darüber aus und verschwindet erst danach. Baut sich das Bild gerade noch auf, wartet der
      // Wechsel, bis es ganz steht.
      const wechseln = () => {
        if (vorbei || !szene) return;
        delete held.dataset.bildstufen;
        held.dataset.lichtwechsel = "1";
        spaeter.push(gsap.delayedCall(1.1, () => delete held.dataset.lichtwechsel));
        szene.zeigen(true);
        szene.mausFolgen(true);
        held.dataset.licht = "live";
      };
      if (held.dataset.bildstufen === "lauf") nachBild = wechseln;
      else wechseln();
    };
    // Was kommen soll, sobald das ruhige Bild ganz aufgebaut ist.
    let nachBild: (() => void) | undefined;

    // ── Phase „Bilder“: nur die Bilder des ersten Bildschirms fertig dekodieren. Alles weiter
    // unten lädt danach im Hintergrund und hält den Start nicht auf.
    const bilderLaden = async () => {
      const bilder = Array.from(document.querySelectorAll<HTMLImageElement>(".ag-neu img")).filter((bild) => {
        if (bild.loading === "lazy") return false;
        const r = bild.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
      // Das kleine Licht von Logo und Chat-Knopf liegt als Hintergrund im Stylesheet.
      const mini = new window.Image();
      mini.src = "/kopf/licht-mini.webp";
      // Gewartet wird, bis sie wirklich da sind (oder nicht zu laden waren). Zu lange halten sie den
      // Start trotzdem nicht auf: Dafür sorgt die Sicherheitsgrenze.
      await Promise.allSettled([...bilder, mini].map((bild) => bild.decode?.()));
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
      if (!szene && ohneSzene) bildNachholen();
      held.dataset.start = "fertig";
      allesGemeldet();
    };
    const fliegen = () => {
      if (fliegt || fertig || vorbei) return;
      fliegt = true;
      // 250 ms nach dem Ende des Flugs läuft einmal von selbst eine Welle aus der Mitte des Namens:
      // der Hinweis, dass man klicken kann. (War der Kopfbereich beim Start nicht zu sehen, fliegen
      // die Zeichen erst ein, wenn er ins Bild kommt.)
      feld.starten(() => {
        spaeter.push(gsap.delayedCall(0.25, feld.welleMitte));
        // Ist die Welle durch (0,25 s Pause + 1,3 s), ist die Startanimation vorbei: Scrollen ist frei.
        spaeter.push(gsap.delayedCall(WELLE_ENDE, freigeben));
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
      delete held.dataset.bildvor;
      held.dataset.licht = "bild";
      feld.licht(ruheLage());
    };
    // Kein Licht aus der Szene: Die Startanimation läuft trotzdem ganz, mit dem ruhigen Bild. Es
    // wird im Takt der Szene von der Mitte her freigegeben: Erst wird der Stern heller, dann kommen
    // die Balken, dann die Strahlen. Bei 60 % der Lichtstärke fliegen die Zeichen ein.
    const bildAuftritt = () => {
      if (vorbei) return;
      const zeiten = stufen.zeiten;
      sternAus(zeiten[0]);
      delete held.dataset.bildvor;
      held.dataset.bildstufen = "lauf";
      held.dataset.licht = "bild";
      // Größe des Logos: Der Stern reicht bis rund ein Viertel davon, die Balken bis zur Hälfte,
      // die Strahlen bis an den Rand des Bildes (das 2,1-Fache).
      const logo = loch.getBoundingClientRect().width;
      const lauf = { p: 0 };
      const setze = () => {
        const w = stufenWerte(lauf.p, zeiten);
        const r = logo * (0.12 + 0.22 * w.stern + 0.42 * w.balken + 1.6 * w.strahlen);
        standbild?.style.setProperty("--bild-r", `${r.toFixed(1)}px`);
        standbild?.style.setProperty("--bild-hell", (0.2 + 0.8 * w.stern).toFixed(3));
        const hell = lichtStaerke(lauf.p, zeiten);
        feld.licht({ ...ruheLage(), hell });
        if (hell >= FLUG_AB_PEGEL) fliegen();
      };
      setze();
      spaeter.push(
        gsap.to(lauf, {
          p: 1,
          duration: zeiten[0] + zeiten[1] + zeiten[2],
          ease: "none",
          onUpdate: setze,
          onComplete: () => {
            held.dataset.bildstufen = "fertig";
            standbild?.style.removeProperty("--bild-r");
            standbild?.style.removeProperty("--bild-hell");
            const danach = nachBild;
            nachBild = undefined;
            danach?.();
          },
        }),
      );
    };
    const lichtAnmachen = () => {
      if (lichtAn || fertig || vorbei) return;
      // Welcher Auslöser auch immer zuerst kommt: Der Stern war mindestens 1,5 s zu sehen.
      const fehlt = WARTEN_MIN - gesehen();
      if (fehlt > 0.02) return void spaeter.push(gsap.delayedCall(fehlt, lichtAnmachen));
      lichtAn = true;
      probeAus?.();
      melden(INTRO_FERTIG, INTRO_FERTIG_KLASSE);
      melden(LADEN_FERTIG, LADEN_FERTIG_KLASSE);
      held.dataset.start = "licht";
      const quelle = lichtQuelle(!!szene, bildBereit());
      if (quelle === "szene") return lichtAuftritt();
      // Kein Licht aus der Szene (kein WebGL, das Laden ist gescheitert, oder sie ist auch nach der
      // Sicherheitsgrenze noch nicht da): Es läuft dieselbe Abfolge mit dem ruhigen Bild. Kommt die
      // Szene später doch, wird überblendet (lichtHolen).
      if (quelle === "bild") return bildAuftritt();
      // Weder Szene noch das große Bild sind da (nur an der Sicherheitsgrenze, bei sehr langsamer
      // Leitung): Die Abfolge läuft mit dem Not-Licht, in derselben Reihenfolge. Die Zeichen fliegen
      // erst, wenn das Licht bei 60 % ist, und die Freigabe kommt erst nach der Welle.
      notlichtEinsetzen();
      bildAuftritt();
    };
    // Alles steht sofort, ohne Startanimation. Das gilt nur, wenn sie bei diesem Laden schon lief
    // und der Kopfbereich neu eingerichtet wird (andere Einstellung; im Dev-Server nach einem Fast
    // Refresh). Der Besucher kann es nicht auslösen, und beim Laden der Seite passiert es nie.
    const sofortStehen = () => {
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
      } else {
        notlichtEinsetzen();
        mitRuhigemBild(0.4);
      }
      if (gebaut) feld.sofort();
      else sofortNachBau = true;
      stehen();
      freigeben();
    };

    // Klick oder Tippen auf den Namen (plus 40 px Rand, nicht auf Knöpfe und Links, nicht im Startflug): eine Welle.
    const klick = (ev: MouseEvent) => {
      // Der Klick, der die Startanimation übersprungen hat, löst nicht auch noch eine Welle aus.
      if (!gebaut || !fertig || performance.now() - uebersprungenUm < 400) return;
      if ((ev.target as Element | null)?.closest("a, button, input, select, textarea, label")) return;
      const e = el.getBoundingClientRect();
      const ausgeloest = feld.welle(ev.clientX - e.left, ev.clientY - e.top);
      if (!ausgeloest) return;
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
      // Scroll-Fortschritt 0 bis 1 über 90 % der Bildhöhe. Solange die Seite oben ist (bis 24 px),
      // bleibt er genau 0: Nur dann reagieren die Zeichen auf die Maus (startlogik.ts).
      const s = rollStand(y, hoch);
      if (gebaut) feld.rollen(s, Math.max(0, y - obenImDokument), hoch);
      if (s === rollZuletzt) return;
      rollZuletzt = s;
      // Das Licht tritt zurück (bis auf 14 %), je weiter man scrollt.
      const zurueck = Math.max(0, Math.min(1, (s - 0.12) / 0.8));
      held.style.setProperty("--licht-deck", (1 - 0.86 * zurueck).toFixed(3));
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

    if (still) {
      // „Weniger Bewegung“: Es steht das ruhige Bild, der Name blendet ein, alles ist sofort da.
      // Der Browser darf hier wie gewohnt die frühere Lage wiederherstellen.
      try {
        window.history.scrollRestoration = "auto";
      } catch {
        /* dann eben ohne */
      }
      held.dataset.licht = "bild";
      lichtAn = true;
      stehen();
      freigeben();
    } else {
      held.dataset.start = "warten";
      // Das Skript läuft: Das Sicherheitsnetz des Stylesheets (Kopfleiste nach 8 s von selbst) gilt nicht mehr.
      held.dataset.skript = "1";
      held.addEventListener("click", klick);
      if (maus) {
        window.addEventListener("pointermove", zeigerBewegt, { passive: true });
        wurzel.addEventListener("pointerleave", zeigerWeg);
      }
      // Immer oben beginnen: Der Browser stellt nach Neuladen oder Zurück keine frühere Lage wieder her.
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        /* dann eben ohne */
      }
      // Lief die Startanimation bei diesem Laden schon, steht alles sofort (siehe sofortStehen).
      const schonGelaufen = startGelaufen.current;
      if (!schonGelaufen) {
        // Hat der Browser die Seite schon bewegt (Ziel in der Adresse, erste Wiederherstellung),
        // geht es zurück nach oben. Ein Ziel in der Adresse merkt sich die Seite für danach.
        const sprungziel = zielVon(window.location.hash);
        if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
        // Während der ganzen Startanimation steht die Seite oben: kein Scrollen, kein Überspringen.
        sperren();
        if (sprungziel) scrollZiel.zu(sprungziel);
        vorEinrichten = sichtbarZwischen(erstesBild, performance.now(), sichtProtokoll());
        sichtUhr = erzeugeSichtUhr(() => performance.now(), () => document.hidden);
        document.addEventListener("visibilitychange", sichtWechsel);
        // Sicherheitsnetz: Spätestens dann ist das Scrollen frei, was auch immer geschieht. Gezählt
        // wird nur Zeit, in der die Seite zu sehen war (verdeckt wartet die Abfolge).
        netz();
      }
      beimScrollen();
      // Alles fertig machen, während der Stern pulsiert.
      const geladen = Promise.allSettled([vermessen(), gemessen("licht", lichtLaden), gemessen("bilder", bilderLaden)]);
      if (schonGelaufen) {
        sofortStehen();
      } else {
        // Sicherheitsgrenze: Nach 15 s geht es in jedem Fall los, mit dem, was da ist. Fehlt 5 s
        // davor die Szene noch, wird das ruhige Bild geholt, damit dann wenigstens es bereitsteht.
        spaeter.push(gsap.delayedCall(Math.max(0, WARTEN_GRENZE - gesehen()), lichtAnmachen));
        spaeter.push(
          gsap.delayedCall(Math.max(0, WARTEN_GRENZE - 5 - gesehen()), () => {
            if (!szene && !lichtAn) void standbildLaden();
          }),
        );
        void geladen.then(() => {
          if (vorbei || lichtAn) return;
          try {
            performance.measure("ag-start:laden", { start: erstesBild, end: performance.now() });
          } catch {
            /* ohne Messung */
          }
          // Alles ist da. Zum Schluss die Probe unter echter Last; sie hält den Start nur begrenzt auf.
          spaeter.push(gsap.delayedCall(probeFrist(gesehen(), PROBE_BIS, WARTEN_GRENZE), lichtAnmachen));
          void gemessen("probe", probe).then(() => {
            if (vorbei || lichtAn) return;
            try {
              performance.measure("ag-start:warten", { start: erstesBild, end: performance.now() });
            } catch {
              /* ohne Messung */
            }
            // Frühestens, wenn der Stern 1,5 s zu sehen war.
            spaeter.push(gsap.delayedCall(Math.max(0, WARTEN_MIN - gesehen()), lichtAnmachen));
          });
        });
      }
    }
    // Nach „Zurück“ aus dem Zwischenspeicher: Jetzt steht die Seite oben und wartet auf den Start.
    wurzel.classList.remove(ZURUECK_KLASSE);

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
      window.removeEventListener("pointermove", zeigerBewegt);
      wurzel.removeEventListener("pointerleave", zeigerWeg);
      spaeter.forEach((t) => t.kill());
      uhren.forEach((u) => window.clearTimeout(u));
      document.removeEventListener("visibilitychange", sichtWechsel);
      // Die Seite wird abgebaut: Ein gemerktes Ziel gilt nicht mehr.
      scrollZiel.vergiss();
      entsperren();
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
      // Verlässt der Besucher die Seite innerhalb der Website, gilt für die nächste wieder das Übliche.
      try {
        window.history.scrollRestoration = "auto";
      } catch {
        /* dann eben ohne */
      }
      delete held.dataset.skript;
      delete held.dataset.bildvor;
      delete held.dataset.bildstufen;
      standbild?.style.removeProperty("--bild-r");
      standbild?.style.removeProperty("--bild-hell");
      standbild?.style.removeProperty("background-image");
      standbild?.style.removeProperty("background-size");
    };
  }, [einstellung, rueckkehr]);

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
            {/* Stern im Dunkeln: Er schimmert, während alles lädt, genau an der Stelle des späteren Sterns.
                Sein Bild steht fest im Dokument (sternbild.ts): Er ist sofort da, auch bei langsamer Leitung. */}
            <Image className="ag-ln__stern" src={STERN_BILD} alt="" width={512} height={512} unoptimized loading="eager" decoding="sync" />
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
