"use client";

import { Fragment, useCallback, useEffect, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useChatZugang } from "@/components/chat/ChatAnbieter";
import type { ChatSperre, ChatZustand } from "@/components/chat/useChat";
import { holeZusammenfassung } from "@/components/chat/zusammenfassung";
import { CHAT_ZEICHEN, STARTER_QUESTIONS, ZEICHEN_WECHSEL, reichTeile, wellenPlan, woerter, type LeistungArt, type Message } from "@/lib/chat-text";
import { restText } from "@/lib/chat-schutz";
import type { SperrArt } from "@/lib/support-sperre";
import { chat as chatTexte, kontakt, marke } from "@/lib/inhalt-neu";
import { glimme } from "../glimmrand";
import { GoldMarke } from "../Marke";
import { LADEN_FERTIG, LADEN_FERTIG_KLASSE, scrollZiel } from "../umgebung";
import { enthuelleText, richteVerwuerfelnEin } from "../verwuerfeln";
import { SELBST_MS, erstelleEndeHalter } from "./endeHalten";
import { DAUER, KUGEL, PHASEN, SCHLIESSEN, zeitleiste, type Bild, type Masse } from "./kugel";
import "./chat.css";

const t = chatTexte.fenster;
const schutz = chatTexte.schutz;
const karten = chatTexte.karten;

/**
 * Wurde der Chat in diesem Besuch (bis die Seite neu geladen wird) schon einmal geöffnet? Beim ersten Öffnen
 * stehen Begrüßung und Vorschläge sofort da, ohne Glitch (Prompt 18); danach wie bisher.
 */
let schonGeoeffnet = false;

/** Wohin „Mehr zu … →“ führt: die Karte der Leistung im Abschnitt #leistungen (sonst der Abschnitt; fehlt er, kein Link). */
function leistungsZiel(art: LeistungArt): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`${karten.leistungAnker} .ag-lk[data-art="${art}"]`) ?? document.querySelector<HTMLElement>(karten.leistungAnker);
}
const zufall = () => CHAT_ZEICHEN[Math.floor(Math.random() * CHAT_ZEICHEN.length)];
const klemme = (x: number, von = 0, bis = 1) => Math.min(bis, Math.max(von, x));

/** Klasse am <html>, solange das Fenster offen steht: Dann ruht der Chat-Knopf (welt.css). */
const OFFEN_KLASSE = "ag-cf-offen";
/** So lange leuchtet ein eingerastetes Wort nach, bevor die Antwort gewöhnlicher Text wird (ms). */
const NACHLEUCHTEN = 520;
/** So lange wächst die Blase von den drei Punkten auf ihre endgültige Größe (ms). */
const WACHSEN = 400;

/**
 * Das Chat-Fenster der neuen Seite: dunkles Glas, Gold, Zeichen-Effekte.
 *
 * Es ist nur die Hülle. Was der Chat tut (Antworten über /api/chat, Übergabe an das Team über
 * das Support-Ticket, Übernahme ins Kontaktformular, Verlauf, Schutzregeln), steht unverändert
 * in components/chat/useChat.ts und läuft einmal im Stammlayout. Solange dieses Fenster auf der
 * Seite ist, zeichnet das alte Fenster (components/ChatWidget.tsx) nichts.
 *
 * - Öffnen und Schließen: Das Fenster wird zur Kugel und wieder zurück. Beim Schließen verdichtet
 *   sich der Inhalt zu einem goldenen Schein, das Glasviereck schrumpft zur Kugel in der Größe des
 *   Chat-Knopfs (die Ecken werden immer runder, der Goldrand bleibt sichtbar), in der Kugel baut
 *   sich das Logo auf, dann ist sie wieder der Knopf. Öffnen ist dieselbe Zeitleiste vorwärts: Die
 *   Kugel hebt sich, ihr Logo löst sich auf, sie dehnt sich zum Fenster, der Inhalt baut sich auf.
 *   Während der Bewegung zeichnet der Browser nichts neu: Die Form besteht aus Rechtecken und
 *   Kreisen, die nur verschoben und skaliert werden (kugel.ts); das echte Glas mit seiner
 *   Unschärfe blendet erst ein, wenn das Fenster seine Größe hat. Ein Klick mitten in der Bewegung
 *   dreht nur die Richtung um.
 * - Nachdenken: drei goldene Punkte in einer kleinen Glasblase, solange der Assistent nachdenkt
 *   und solange die Antwort ankommt (man sieht nie halbe Sätze). Ist sie ganz da, wächst die
 *   Blase auf ihre Größe, die Punkte fliegen auseinander und gehen in die Zeichen über.
 * - Antworten entschlüsseln sich als ruhige Welle: Wort für Wort erscheinen goldene Zufallszeichen
 *   in voller Wortlänge, mit Abstand dahinter rasten die Wörter ein. Danach ist es gewöhnlicher
 *   Text (markierbar, kopierbar). Für Vorleseprogramme steht er sofort ganz da.
 * - Was der Assistent anbietet, steht unter der Nachricht: die kleine Anruf-Karte ([ANRUFEN])
 *   und der Knopf „Mit einem Mitarbeiter schreiben“ ([MITARBEITER]), nicht mehr im Text.
 * - Am Handy ist das Fenster ein Glasblatt von unten (am Griff hinunterwischbar, immer über der
 *   Tastatur); auch dort wird es zur Kugel des Chat-Knopfs.
 * - „Weniger Bewegung“: Das Fenster blendet nur weich ein und aus, alles steht sofort da.
 * - Leistung: Zeichen laufen nur, solange sich eine sichtbare Nachricht entschlüsselt. Ist das
 *   Fenster zu, läuft nichts.
 */
export function ChatFenster() {
  const { chat } = useChatZugang();

  const offen = chat.open;
  // Der Inhalt entsteht vor dem ersten Öffnen (in einer ruhigen Minute) und bleibt dann.
  const [gebaut, setGebaut] = useState(false);
  // Wie viele Nachrichten schon da waren, als der Inhalt entstand: Die stehen einfach da. Nur eine
  // frische Begrüßung (noch kein Gespräch) entschlüsselt sich, und zwar erst, wenn sich der Inhalt
  // beim ersten Öffnen aufbaut.
  const [alt, setAlt] = useState<number | null>(null);
  // Das erste Öffnen in diesem Besuch: Begrüßung und Vorschläge stehen sofort da (gilt bis zum Neuladen der Seite).
  const [erstesMal] = useState(() => !schonGeoeffnet);
  useEffect(() => {
    if (offen) schonGeoeffnet = true;
  }, [offen]);
  if (offen && !gebaut) setGebaut(true);
  // Damit das erste Öffnen ohne Wartezeit beginnt, entsteht der Inhalt schon vorher in einer
  // ruhigen Minute (er steht dann nur da: Es läuft nichts, solange das Fenster zu ist).
  useEffect(() => {
    if (gebaut) return;
    const bauen = () => setGebaut(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(bauen, { timeout: 6000 });
      return () => window.cancelIdleCallback(id);
    }
    const uhr = window.setTimeout(bauen, 3000);
    return () => window.clearTimeout(uhr);
  }, [gebaut]);
  // Beim ersten Öffnen zählt auch die frische Begrüßung schon als da (sie entschlüsselt sich nicht), danach wie bisher.
  if (gebaut && alt === null) setAlt(chat.messages.length <= 1 ? (erstesMal ? 1 : 0) : chat.messages.length);

  const wurzel = useRef<HTMLDivElement>(null);
  const rahmen = useRef<HTMLDivElement>(null);
  const teile = useRef<HTMLDivElement>(null);
  const fenster = useRef<HTMLDivElement>(null);
  const schein = useRef<HTMLSpanElement>(null);
  const kugelLogo = useRef<HTMLSpanElement>(null);
  const blatt = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const eingabe = useRef<HTMLTextAreaElement>(null);
  const strich = useRef<HTMLSpanElement>(null);

  // „Weniger Bewegung“ und Handy (kein Drüberfahren).
  const [ruhig, setRuhig] = useState(false);
  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lesen = () => setRuhig(r.matches);
    lesen();
    r.addEventListener("change", lesen);
    return () => r.removeEventListener("change", lesen);
  }, []);

  const mitTeam = !!chat.ticket && !chat.ticket.closed;
  const [begruessungSteht, setBegruessungSteht] = useState(false);
  // Zählt die Male, die der Inhalt sich aufgebaut hat (0 = noch nie): Damit beginnen Kopf,
  // Begrüßung und Vorschläge bei jedem Öffnen neu.
  const [aufNr, setAufNr] = useState(0);
  // Zählt fertig entschlüsselte Antworten: Darunter erscheinen dann Knöpfe.
  const [stand, setStand] = useState(0);
  const zeigeVorschlaege = alt !== null && chat.messages.length === 1 && !chat.streaming;

  // ───────────── Öffnen und Schließen: das Fenster wird zur Kugel ─────────────
  // Eine Zeitleiste (kugel.ts), vorwärts zum Öffnen (1,1 s), rückwärts zum Schließen (0,6 s). Sie
  // läuft als Animationen des Browsers auf „transform“ und „opacity“: Je Bild rechnet hier kein
  // Skript, und der Browser zeichnet nichts neu.
  const lauf = useRef<Animation[]>([]);
  const warOffen = useRef(false);
  const uhr = useRef(0);
  // Rahmen und Chat-Knopf werden gemessen, bevor React das Dokument für das Öffnen oder Schließen
  // ändert (zu diesem Zeitpunkt muss der Browser dafür nichts neu rechnen). Danach, mit den
  // Änderungen, wäre dieselbe Messung teuer: Der Browser rechnete den ganzen Chat sofort durch,
  // mitten im Klick, und die Bewegung begänne später.
  const vorab = useRef<{ zeit: number; rahmen: DOMRect | null; knopf: DOMRect | null; zugX: number; zugY: number; handy: boolean } | null>(null);
  useInsertionEffect(() => {
    const knopf = document.querySelector<HTMLElement>(".ag-chat__kugel");
    vorab.current = {
      zeit: performance.now(),
      rahmen: document.querySelector(".ag-cf__rahmen")?.getBoundingClientRect() ?? null,
      knopf: knopf?.getBoundingClientRect() ?? null,
      zugX: parseFloat(knopf?.style.getPropertyValue("--mx") ?? "") || 0,
      zugY: parseFloat(knopf?.style.getPropertyValue("--my") ?? "") || 0,
      handy: window.matchMedia("(max-width: 767px)").matches,
    };
  }, [offen]);

  /** Der Inhalt baut sich auf: Ab jetzt ist das Fenster bedienbar. */
  const aufbau = useCallback(() => {
    const el = wurzel.current;
    if (!el) return;
    if (el.dataset.lauf) el.dataset.lauf = "da";
    el.dataset.auf = "1";
    setAufNr((n) => n + 1);
  }, []);

  // Für welche Maße die Zeitleiste angelegt ist, und ob sie nur bereitliegt (siehe `baue`).
  const angelegt = useRef<{ fuer: string; bereit: boolean } | null>(null);
  const leerlauf = useRef(0);

  /**
   * Legt die Zeitleiste neu an: misst dafür einmal den Rahmen und den Chat-Knopf.
   *
   * `nurBereit`: Die Zeitleiste liegt nur bereit (sie wirkt noch nicht und hält nichts fest). So wird
   * sie in einer ruhigen Sekunde angelegt, während das Fenster offen steht; der Klick zum Schließen
   * muss sie dann nur noch starten. Passen die Maße beim Klick nicht mehr (Fenstergröße geändert,
   * der Magnet zieht den Knopf), wird sie dort neu angelegt.
   */
  const baue = useCallback((nurBereit = false): boolean => {
    for (const a of lauf.current) a.cancel();
    lauf.current = [];
    angelegt.current = null;
    const r = rahmen.current;
    const huelle = teile.current;
    const fe = fenster.current;
    const bl = blatt.current;
    if (!r || !huelle || !fe || !bl || typeof bl.animate !== "function") return false;
    const knopf = document.querySelector<HTMLElement>(".ag-chat__kugel");
    // Die Maße von eben (vor den Änderungen dieses Klicks gemessen); nur wenn es sie nicht gibt, wird jetzt gemessen.
    const v = vorab.current && performance.now() - vorab.current.zeit < 250 && vorab.current.rahmen && vorab.current.rahmen.width > 0 ? vorab.current : null;
    const R = v?.rahmen ?? r.getBoundingClientRect();
    const K = v ? v.knopf : knopf?.getBoundingClientRect();
    const da = !!K && K.width > 0;
    const m: Masse = {
      b: Math.max(1, R.width),
      h: Math.max(1, R.height),
      d: da ? K.width : KUGEL,
      kx: da ? K.left + K.width / 2 - R.left : R.width - 40,
      ky: da ? K.top + K.height / 2 - R.top : R.height - 40,
      handy: v ? v.handy : window.matchMedia("(max-width: 767px)").matches,
    };
    // Zieht der Magnet den Knopf gerade zur Maus, sitzt sein Logo etwas versetzt: Das Logo der Kugel beginnt genau dort.
    const zug = v
      ? { x: 0.4 * v.zugX, y: 0.4 * v.zugY }
      : { x: 0.4 * (parseFloat(knopf?.style.getPropertyValue("--mx") ?? "") || 0), y: 0.4 * (parseFloat(knopf?.style.getPropertyValue("--my") ?? "") || 0) };
    const z = zeitleiste(m, zug);
    const wahl: KeyframeAnimationOptions = { duration: DAUER, fill: nurBereit ? "none" : "both", easing: "linear" };
    const neu: Animation[] = [];
    const spiele = (el: Element | null | undefined, bilder: Bild[] | Keyframe[]) => {
      if (el) neu.push(el.animate(bilder as Keyframe[], wahl));
    };
    const P = PHASEN;
    // Die Form: sieben Teile für den Goldrand, sieben für die Fläche. Sie deckt erst den Knopf zu
    // und weicht am Ende dem echten Glas.
    spiele(huelle, [
      { offset: 0, opacity: 0 },
      { offset: P.decken[1], opacity: 1 },
      { offset: P.teileWeg[0], opacity: 1 },
      { offset: P.teileWeg[1], opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    Array.from(huelle.querySelectorAll<HTMLElement>(".ag-cf__teil")).forEach((el, i) => spiele(el, i < 7 ? z.rand[i] : z.flaeche[i - 7]));
    // Der echte Chat-Knopf: Sobald die Kugel ihn deckt, ist er weg; rückwärts kommt er wieder, bevor sie vergeht.
    spiele(knopf, [
      { offset: 0, opacity: 1 },
      { offset: P.knopfWeg, opacity: 1 },
      { offset: P.knopfWeg + 0.001, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    // Das Logo in der Kugel: erst blenden die vier Balken nacheinander aus, dann der Stern
    // (rückwärts: erst der Stern, dann die vier Balken). Es blendet nur: kein Schrumpfen zu einem
    // Punkt, kein Wandern. Es ist ganz weg, bevor die Form sich dehnt.
    const logo = kugelLogo.current;
    spiele(logo, z.logo);
    const balken = Array.from(logo?.querySelectorAll("polygon") ?? []);
    const schritt = (P.balken[1] - P.balken[0] - 0.04) / Math.max(1, balken.length - 1);
    balken.forEach((el, i) =>
      spiele(el, [
        { offset: 0, opacity: 1 },
        { offset: P.balken[0] + i * schritt, opacity: 1 },
        { offset: P.balken[0] + i * schritt + 0.04, opacity: 0 },
        { offset: 1, opacity: 0 },
      ]),
    );
    spiele(logo?.querySelector("path"), [
      { offset: 0, opacity: 1 },
      { offset: P.stern[0], opacity: 1 },
      { offset: P.stern[1], opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    // Das echte Glas blendet ein, sobald die Form ihre Größe hat: Erst dann rechnet der Browser die Unschärfe.
    spiele(fe, [
      { offset: 0, opacity: 0 },
      { offset: P.glas[0], opacity: 0 },
      { offset: P.glas[1], opacity: 1 },
      { offset: 1, opacity: 1 },
    ]);
    // Der Inhalt: rückwärts zieht er sich zur Mitte zusammen, wird kleiner und leicht unscharf.
    spiele(bl, [
      { offset: 0, opacity: 0, transform: "scale(0.84)", filter: "blur(5px)" },
      { offset: P.inhalt[0], opacity: 0, transform: "scale(0.84)", filter: "blur(5px)", easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
      { offset: P.inhalt[1], opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
      { offset: 1, opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
    ]);
    // Der schwache Lichtschein hinter dem Glas gehört zum Glas: Er blendet genau mit ihm ein und
    // aus (kein eigener Auftritt, er steht still).
    spiele(schein.current, [
      { offset: 0, opacity: 0 },
      { offset: P.glas[0], opacity: 0 },
      { offset: P.glas[1], opacity: 0.42 },
      { offset: 1, opacity: 0.42 },
    ]);
    for (const a of neu) {
      a.pause();
      // Nur bereit: hinter dem Ende geparkt, ohne Wirkung auf das stehende Fenster.
      if (nurBereit) a.currentTime = DAUER + 100;
    }
    lauf.current = neu;
    angelegt.current = { fuer: masseSchluessel(m, zug), bereit: nurBereit };
    return neu.length > 0;
  }, []);

  /** Passt die bereitliegende Zeitleiste zu den Maßen von eben (vor diesem Klick gemessen)? */
  const bereitFuerJetzt = useCallback((): boolean => {
    const v = vorab.current;
    const a = angelegt.current;
    if (!a?.bereit || !lauf.current.length || !v?.rahmen || !v.knopf || performance.now() - v.zeit > 250) return false;
    const R = v.rahmen;
    const K = v.knopf;
    const m: Masse = { b: Math.max(1, R.width), h: Math.max(1, R.height), d: K.width, kx: K.left + K.width / 2 - R.left, ky: K.top + K.height / 2 - R.top, handy: v.handy };
    return K.width > 0 && masseSchluessel(m, { x: 0.4 * v.zugX, y: 0.4 * v.zugY }) === a.fuer;
  }, []);

  useLayoutEffect(() => {
    const el = wurzel.current;
    if (!el || offen === warOffen.current) return;
    warOffen.current = offen;
    const html = document.documentElement;
    window.clearTimeout(uhr.current);
    const leerlaufAus = () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(leerlauf.current);
      window.clearTimeout(leerlauf.current);
    };
    leerlaufAus();
    const loesen = () => {
      for (const a of lauf.current) a.cancel();
      lauf.current = [];
      angelegt.current = null;
    };
    // Ganz zu: Das Fenster ist weg, der Chat-Knopf ist wieder er selbst.
    const ganzZu = () => {
      loesen();
      delete el.dataset.da;
      delete el.dataset.lauf;
      html.classList.remove(OFFEN_KLASSE);
      if (rahmen.current) rahmen.current.style.transform = "";
    };
    // Ganz auf: Ab jetzt gilt das ruhende Fenster des Stylesheets (echtes Glas, Inhalt da).
    const ganzAuf = () => {
      html.classList.add(OFFEN_KLASSE);
      delete el.dataset.lauf;
      loesen();
      // In einer ruhigen Sekunde liegt die Zeitleiste für das Schließen schon bereit.
      const vorbereiten = () => {
        if (warOffen.current && !lauf.current.length && !el.dataset.lauf) baue(true);
      };
      leerlauf.current = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(vorbereiten, { timeout: 2500 }) : window.setTimeout(vorbereiten, 900);
    };
    delete el.dataset.warm;
    const laeuft = lauf.current.length > 0 && !!el.dataset.lauf;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Liegt die Zeitleiste für das Schließen schon bereit und passen ihre Maße, wird sie nur scharf gestellt.
    const bereit = !laeuft && !still && !offen && bereitFuerJetzt();
    if (bereit) {
      for (const a of lauf.current) a.effect?.updateTiming({ fill: "both" });
      if (angelegt.current) angelegt.current.bereit = false;
    }
    if (!laeuft && !bereit && (still || !baue())) {
      // „Weniger Bewegung“ (oder ein Browser ohne diese Animationen): Das Fenster blendet nur
      // weich ein und aus (Stylesheet), alles steht da.
      loesen();
      if (offen) {
        el.dataset.da = "1";
        html.classList.add(OFFEN_KLASSE);
        uhr.current = window.setTimeout(aufbau, 0);
      } else {
        delete el.dataset.auf;
        // Der Chat-Knopf ist sofort wieder da (er bekommt gleich den Fokus zurück), das Fenster blendet aus.
        html.classList.remove(OFFEN_KLASSE);
        uhr.current = window.setTimeout(ganzZu, 220);
      }
      return;
    }
    // Frisch angelegt, beginnt die Zeitleiste am passenden Ende; läuft sie schon (ein Klick mitten
    // in der Bewegung), dreht sie nur um und läuft von der aktuellen Stelle zurück.
    el.dataset.da = "1";
    el.dataset.lauf = offen ? "auf" : "zu";
    if (!offen) {
      delete el.dataset.auf;
      html.classList.remove(OFFEN_KLASSE);
    }
    spieleAb(lauf.current, laeuft ? null : offen ? 0 : DAUER, offen ? 1 : -DAUER / SCHLIESSEN);
    const haupt = lauf.current[0];
    haupt.onfinish = () => {
      if (lauf.current[0] !== haupt) return;
      if (warOffen.current) ganzAuf();
      else ganzZu();
    };
    if (offen) {
      // Der Inhalt baut sich auf, sobald die Zeitleiste dort ankommt.
      const bis = PHASEN.inhalt[0] * DAUER - (Number(haupt.currentTime) || 0);
      if (bis <= 0) aufbau();
      else uhr.current = window.setTimeout(aufbau, bis);
    }
  }, [offen, baue, aufbau, bereitFuerJetzt]);
  // Vorzeichnen: Nach dem Start der Seite, in einer ruhigen Sekunde, steht das Fenster zwei Bilder
  // lang fertig da, aber praktisch unsichtbar (1 % Deckkraft, nicht bedienbar). So hat der Browser
  // Glas, Schatten und Bilder schon einmal gezeichnet, und das erste Öffnen stockt nicht.
  useEffect(() => {
    const el = wurzel.current;
    if (!gebaut || !el || warOffen.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let leer = 0;
    let bild1 = 0;
    let bild2 = 0;
    const zurueck = () => delete el.dataset.warm;
    const zeichnen = () => {
      if (warOffen.current || el.dataset.da) return;
      el.dataset.warm = "1";
      bild1 = requestAnimationFrame(() => (bild2 = requestAnimationFrame(zurueck)));
    };
    const planen = () => {
      leer = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(zeichnen, { timeout: 4000 }) : window.setTimeout(zeichnen, 1500);
    };
    if (document.documentElement.classList.contains(LADEN_FERTIG_KLASSE)) planen();
    else window.addEventListener(LADEN_FERTIG, planen, { once: true });
    return () => {
      window.removeEventListener(LADEN_FERTIG, planen);
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(leer);
      window.clearTimeout(leer);
      cancelAnimationFrame(bild1);
      cancelAnimationFrame(bild2);
      zurueck();
    };
  }, [gebaut]);
  useEffect(
    () => () => {
      for (const a of lauf.current) a.cancel();
      lauf.current = [];
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(leerlauf.current);
      window.clearTimeout(leerlauf.current);
      window.clearTimeout(uhr.current);
      document.documentElement.classList.remove(OFFEN_KLASSE);
    },
    [],
  );

  // Immer ganz unten bleiben (Prompt 18): bei jeder neuen Nachricht und auch, wenn der Inhalt nachträglich wächst
  // (die Blase wächst, der Text baut sich aus Zeichen auf, darunter erscheinen Karten, Folgefragen, im Ticket ein
  // Hinweis) oder die Liste kleiner wird (Eingabefeld wächst, Tastatur am Handy). Nur wenn der Besucher gerade
  // selbst scrollt (Eingabe in den letzten 2 s), zieht der Chat nicht dagegen. Regel und Ursache des alten Fehlers:
  // endeHalten.ts.
  const [ende] = useState(() => erstelleEndeHalter());
  const offenZuletzt = useRef(offen);
  const zahlZuletzt = useRef(chat.messages.length);
  const formularZuletzt = useRef(chat.handoff);
  const oeffnenBild = useRef(0);
  useEffect(() => {
    const el = liste.current;
    if (!el) return;
    // Eigene Nachricht oder das Formular für den Mitarbeiter: sofort ans Ende, auch wenn er eben noch gescrollt hat.
    const neu = chat.messages.length > zahlZuletzt.current;
    zahlZuletzt.current = chat.messages.length;
    const eigene = neu && chat.messages[chat.messages.length - 1]?.role === "user";
    const formular = chat.handoff && !formularZuletzt.current;
    formularZuletzt.current = chat.handoff;
    // Im Klick, der das Fenster öffnet oder schließt, wird nichts gemessen (das hielte die Bewegung auf): Die
    // Liste rückt im nächsten Bild ans Ende. Das Bild wird nicht abgebrochen, wenn sich gleich danach etwas ändert
    // (bis Prompt 18 blieb die Liste dann oben stehen).
    if (offenZuletzt.current !== offen) {
      offenZuletzt.current = offen;
      cancelAnimationFrame(oeffnenBild.current);
      oeffnenBild.current = requestAnimationFrame(() => ende.neu(el, true));
      return;
    }
    ende.neu(el, eigene || formular);
  }, [chat.messages, chat.streaming, chat.handoff, chat.error, chat.sperre, offen, begruessungSteht, ende]);
  useEffect(() => {
    const el = liste.current;
    const inhalt = el?.firstElementChild;
    if (!el || !inhalt || !gebaut) return;
    let uhr = 0;
    // Der Besucher scrollt selbst: 2 s lang zieht nichts dagegen, danach geht Neues wieder ans Ende.
    const selbst = () => {
      ende.eingabe();
      window.clearTimeout(uhr);
      uhr = window.setTimeout(() => ende.pruefe(el), SELBST_MS + 60);
    };
    const rad = (ev: WheelEvent) => {
      if (ev.deltaY < 0) selbst();
    };
    const taste = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowUp" || ev.key === "PageUp" || ev.key === "Home") selbst();
    };
    // Ein Druck auf die Liste selbst, nicht auf ihren Inhalt: der Scrollbalken.
    const druck = (ev: PointerEvent) => {
      if (ev.target === el) selbst();
    };
    // Solange er selbst scrollt (Nachlauf nach dem Wischen, Ziehen am Balken), zählt jedes Scroll-Ereignis mit.
    const gescrollt = () => {
      if (ende.selbst) selbst();
    };
    const waechter = new ResizeObserver(() => ende.groesse(el));
    // Der Inhalt wächst, oder die Liste selbst wird kleiner (Eingabefeld, Tastatur am Handy).
    waechter.observe(inhalt);
    waechter.observe(el);
    el.addEventListener("wheel", rad, { passive: true });
    el.addEventListener("touchstart", selbst, { passive: true });
    el.addEventListener("touchmove", selbst, { passive: true });
    el.addEventListener("keydown", taste);
    el.addEventListener("pointerdown", druck);
    el.addEventListener("scroll", gescrollt, { passive: true });
    return () => {
      waechter.disconnect();
      window.clearTimeout(uhr);
      cancelAnimationFrame(oeffnenBild.current);
      el.removeEventListener("wheel", rad);
      el.removeEventListener("touchstart", selbst);
      el.removeEventListener("touchmove", selbst);
      el.removeEventListener("keydown", taste);
      el.removeEventListener("pointerdown", druck);
      el.removeEventListener("scroll", gescrollt);
    };
  }, [gebaut, ende]);

  // Der Inhalt baut sich auf: Name und Rolle setzen sich aus Zeichen zusammen; am Computer bekommt
  // das Eingabefeld den Fokus (am Handy nicht: Dort schöbe die Tastatur sofort Begrüßung und
  // Vorschläge weg).
  // Das geschieht nicht schon im Klick (dann ist der Inhalt noch gar nicht zu sehen, und die Arbeit
  // hielte die Bewegung auf), sondern wenn der Inhalt sich aufbaut (`aufNr` zählt weiter) oder das
  // Team übernimmt.
  const kopfStand = useRef({ aufNr: 0, mitTeam });
  useEffect(() => {
    if (!offen || !aufNr) return;
    if (kopfStand.current.aufNr === aufNr && kopfStand.current.mitTeam === mitTeam) return;
    kopfStand.current = { aufNr, mitTeam };
    const abbruch: (() => void)[] = [];
    wurzel.current?.querySelectorAll<HTMLElement>(".ag-cf__kopf .ag-wuerfel").forEach((el) => abbruch.push(enthuelleText(el, 520)));
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) eingabe.current?.focus({ preventScroll: true });
    return () => abbruch.forEach((a) => a());
  }, [offen, aufNr, mitTeam]);

  // Schließen: Esc, und der Fokus geht zurück zum Chat-Knopf.
  const schliessen = useCallback(() => {
    chat.setOpen(false);
    // Das Mitarbeiter-Formular ist beim nächsten Öffnen wieder zu: Es geht nur auf, wenn man auf
    // „Mit einem Mitarbeiter schreiben“ drückt.
    chat.setHandoff(false);
    window.setTimeout(() => document.querySelector<HTMLElement>(".ag-chat__kugel")?.focus({ preventScroll: true }), 60);
  }, [chat]);
  useEffect(() => {
    if (!offen) return;
    const taste = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") schliessen();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen, schliessen]);
  // Ein Klick mitten in der Bewegung lässt sie von der aktuellen Stelle aus zurücklaufen.
  const umkehren = () => {
    const stand = wurzel.current?.dataset.lauf;
    if (stand !== "auf" && stand !== "zu") return;
    if (chat.open) schliessen();
    else chat.openChat();
  };

  // Texte, die beim Drüberfahren kurz verbuggen (Vorschläge, Mitarbeiter-Knopf).
  useEffect(() => {
    if (!offen || !blatt.current) return;
    return richteVerwuerfelnEin(blatt.current);
  }, [offen, mitTeam, chat.handoff, chat.streaming, aufNr, stand, begruessungSteht, zeigeVorschlaege]);

  // Der Rand des Fensters glimmt, wenn die Maus drumherum gleitet (gemeinsame Schleife: glimmrand.ts).
  useEffect(() => {
    if (!fenster.current) return;
    return glimme(fenster.current);
  }, []);

  // Handy: Das Blatt bleibt im sichtbaren Teil des Bildschirms, also immer über der Tastatur.
  useEffect(() => {
    const el = wurzel.current;
    const sicht = window.visualViewport;
    if (!offen || !el || !sicht) return;
    const messen = () => {
      el.style.setProperty("--cf-hoch", `${sicht.height}px`);
      el.style.setProperty("--cf-oben", `${sicht.offsetTop}px`);
    };
    messen();
    sicht.addEventListener("resize", messen);
    sicht.addEventListener("scroll", messen);
    return () => {
      sicht.removeEventListener("resize", messen);
      sicht.removeEventListener("scroll", messen);
    };
  }, [offen]);

  // Handy: am Griff hinunterwischen schließt das Blatt (es wird von dort aus zur Kugel).
  const zug = useRef<{ y: number; zeit: number } | null>(null);
  const zugAn = (ev: ReactPointerEvent<HTMLElement>) => {
    if (ev.pointerType === "mouse" || !window.matchMedia("(max-width: 767px)").matches || wurzel.current?.dataset.lauf) return;
    zug.current = { y: ev.clientY, zeit: ev.timeStamp };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const zugLauf = (ev: ReactPointerEvent<HTMLElement>) => {
    if (!zug.current || !rahmen.current) return;
    const weg = Math.max(0, ev.clientY - zug.current.y);
    rahmen.current.style.transition = "none";
    rahmen.current.style.transform = `translate3d(0, ${weg}px, 0)`;
  };
  const zugEnde = (ev: ReactPointerEvent<HTMLElement>) => {
    const anfang = zug.current;
    zug.current = null;
    if (!anfang || !rahmen.current) return;
    const weg = Math.max(0, ev.clientY - anfang.y);
    const tempo = weg / Math.max(1, ev.timeStamp - anfang.zeit);
    rahmen.current.style.transition = "";
    // Weit genug oder schnell genug gezogen: schließen. Sonst federt es zurück.
    if (weg > 120 || (weg > 40 && tempo > 0.6)) schliessen();
    else rahmen.current.style.transform = "";
  };

  // Senden: Ein feiner Lichtstrich zieht vom Knopf nach oben in den Verlauf.
  const lichtstrich = () => {
    if (ruhig) return;
    strich.current?.animate(
      [
        { opacity: 0, transform: "translate3d(0, 0, 0) scaleY(0.3)" },
        { opacity: 1, transform: "translate3d(0, -40px, 0) scaleY(1)", offset: 0.25 },
        { opacity: 0, transform: "translate3d(0, -190px, 0) scaleY(0.6)" },
      ],
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  };
  // Chat-Schutz (Prompt 17): Assistent 5 Minuten gesperrt (Countdown) oder Support-Chat gesperrt, bis das Team
  // entsperrt. Seit Prompt 18 mit Grund, Schloss im Senden-Knopf, Ring (nur mit Uhr) und roter Welle beim Tippen.
  const sperre = chat.sperre;
  const gesperrt = !!sperre;
  const feldRef = useRef<HTMLDivElement>(null);
  const wellen = useRef<HTMLSpanElement>(null);
  const schlossRef = useRef<SVGSVGElement>(null);
  const letzterStups = useRef(0);
  // Tippen oder Klicken ins gesperrte Feld: Von der Stelle läuft eine rote Welle durchs Feld, das Schloss ruckt kurz
  // (höchstens einmal je Sekunde). Bei „Bewegung reduzieren“ färbt sich nur das Feld kurz rot.
  const stups = (ev: ReactPointerEvent<HTMLElement>) => {
    const jetzt = ev.timeStamp;
    if (jetzt - letzterStups.current < 1000 && letzterStups.current) return;
    letzterStups.current = jetzt;
    const huelle = wellen.current;
    const feld = feldRef.current;
    if (!huelle || !feld) return;
    const welle = document.createElement("i");
    if (ruhig) {
      // Weniger Bewegung: keine Welle, das Feld färbt sich nur kurz rot.
      welle.className = "ag-cf__welle ag-cf__welle--ruhig";
      huelle.append(welle);
      window.setTimeout(() => welle.remove(), 600);
      return;
    }
    const r = feld.getBoundingClientRect();
    welle.className = "ag-cf__welle";
    welle.style.left = `${(ev.clientX - r.left).toFixed(1)}px`;
    welle.style.top = `${(ev.clientY - r.top).toFixed(1)}px`;
    huelle.append(welle);
    welle.addEventListener("animationend", () => welle.remove(), { once: true });
    window.setTimeout(() => welle.remove(), 1400);
    schlossRef.current?.animate(
      [
        { transform: "translate3d(0, 0, 0) rotate(0deg)" },
        { transform: "translate3d(-1.6px, 0, 0) rotate(-9deg)", offset: 0.2 },
        { transform: "translate3d(1.4px, 0, 0) rotate(7deg)", offset: 0.45 },
        { transform: "translate3d(-0.7px, 0, 0) rotate(-3deg)", offset: 0.7 },
        { transform: "translate3d(0, 0, 0) rotate(0deg)" },
      ],
      { duration: 420, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" },
    );
  };
  // Folgefragen verschwinden, sobald der Besucher selbst tippt: Ab welcher Antwort (Stelle im Verlauf) gelten sie als weg.
  const [fragenAus, setFragenAus] = useState(-1);
  // „Mehr zu … →“: Der Chat schließt sich (am Handy das Glasblatt), die Seite scrollt weich zur Leistung.
  const zurLeistung = (art: LeistungArt) => {
    const ziel = leistungsZiel(art);
    schliessen();
    if (ziel) window.setTimeout(() => scrollZiel.zu(ziel), 90);
  };
  const senden = () => {
    if (!chat.input.trim() || chat.streaming || gesperrt) return;
    lichtstrich();
    void chat.sendMessage();
  };

  // Ein Vorschlag fliegt ins Eingabefeld und wird abgeschickt.
  const waehle = (frage: string, gewaehlt: HTMLElement) => {
    const feld = eingabe.current;
    if (ruhig || !feld) return void chat.sendMessage(frage);
    const von = gewaehlt.getBoundingClientRect();
    const zu = feld.getBoundingClientRect();
    const flug = document.createElement("span");
    flug.className = "ag-cf__flug";
    flug.textContent = frage;
    flug.style.left = `${von.left}px`;
    flug.style.top = `${von.top}px`;
    flug.style.width = `${von.width}px`;
    wurzel.current?.append(flug);
    gewaehlt.style.visibility = "hidden";
    const flugLauf = flug.animate(
      [
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
        { transform: `translate3d(${zu.left + 16 - von.left}px, ${zu.top + zu.height / 2 - von.top - von.height / 2}px, 0) scale(0.94)`, opacity: 0.25 },
      ],
      { duration: 360, easing: "cubic-bezier(0.5, 0, 0.2, 1)" },
    );
    const fertig = () => {
      flug.remove();
      lichtstrich();
      void chat.sendMessage(frage);
    };
    flugLauf.onfinish = fertig;
    flugLauf.oncancel = fertig;
  };

  // Das Eingabefeld wächst mit dem Text (bis 120 px).
  useEffect(() => {
    const feld = eingabe.current;
    if (!feld) return;
    feld.style.height = "auto";
    feld.style.height = `${Math.min(120, feld.scrollHeight)}px`;
  }, [chat.input, gebaut]);

  // „Mit einem Mitarbeiter schreiben“: Das Formular öffnet sich; die Nachricht füllt die
  // KI-Zusammenfassung des Chats (TicketKarte). Was der Besucher selbst getippt hat, bleibt stehen.
  const frageGetippt = useRef(false);
  const zusammenfassung = useRef<{ n: number; text: string } | null>(null);
  const oeffneTicket = () => {
    chat.openHandoff();
    if (!frageGetippt.current || !chat.hFrage.trim()) {
      frageGetippt.current = false;
      chat.setHFrage("");
    }
  };

  const animiert = (i: number) => !ruhig && alt !== null && i >= alt;
  // Der Verlauf, dazu die Antwort, auf die der Besucher gerade wartet: Sie steht schon in der Liste
  // an der Stelle, die sie gleich im Verlauf hat, und zeigt bis dahin die drei Punkte. So wird aus
  // der Punkte-Blase ohne Bruch die Antwort. (Die Nachrichten entstehen schon vor dem ersten
  // Öffnen, damit der Klick nichts mehr aufbauen muss; eine frische Begrüßung wartet dann still.)
  const vorDemErsten = aufNr === 0;
  const wartet = chat.streaming && chat.messages[chat.messages.length - 1]?.role === "user";
  const zeilen: (Message & { wartet?: boolean })[] = alt === null ? [] : wartet ? [...chat.messages, { role: "assistant", content: "", wartet: true }] : chat.messages;
  // Der Mitarbeiter-Knopf unter einer Antwort: nicht, wenn das Formular offen ist oder das Team schon schreibt.
  const mitarbeiterMoeglich = !mitTeam && !chat.handoff;

  return (
    <div ref={wurzel} className="ag-cf" data-offen={offen} data-team={mitTeam} data-lenis-prevent>
      <button type="button" className="ag-cf__dunkel" tabIndex={-1} aria-hidden="true" onClick={schliessen} />
      <div ref={rahmen} className="ag-cf__rahmen">
        {/* Hinter dem Glas: ganz schwach der Logo-Stern als Lichtschein. */}
        <span ref={schein} className="ag-cf__schein" aria-hidden="true" />
        {/* Die Form in Bewegung: Kugel auf dem Chat-Knopf, Fenster und alles dazwischen. Je sieben Teile
            (drei Rechtecke, vier Kreise) für den Goldrand und für die Fläche; sie werden nur verschoben
            und skaliert (kugel.ts). In der Mitte der goldene Schein, in den sich der Inhalt auflöst. */}
        <div ref={teile} className="ag-cf__teile" onClick={umkehren} aria-hidden="true">
          {TEILE.map((klasse, i) => (
            <i key={i} className={klasse} />
          ))}
        </div>
        {/* Das ruhende Fenster: echtes Glas mit Unschärfe, Lichtkante, Goldrand und Schatten. */}
        <div ref={fenster} className="ag-cf__fenster" data-glimm aria-hidden="true" />
        {/* In der Kugel: unser Logo, dasselbe wie im Chat-Knopf. */}
        <span ref={kugelLogo} className="ag-cf__kugellogo" aria-hidden="true">
          <GoldMarke />
        </span>
        <div ref={blatt} className="ag-cf__blatt" role="dialog" aria-label={t.titel} aria-hidden={!offen} inert={!offen}>
          {gebaut && (
            <>
              <header className="ag-cf__kopf" onPointerDown={zugAn} onPointerMove={zugLauf} onPointerUp={zugEnde} onPointerCancel={zugEnde}>
                <span className="ag-cf__griff" aria-hidden="true" />
                {/* Unser Logo: der vierzackige Stern mit den vier schrägen Balken, in Gold. */}
                <span className="ag-cf__logo" aria-hidden="true">
                  <GoldMarke />
                </span>
                <span className="ag-cf__wer">
                  <span className="ag-cf__name">
                    <span className="ag-wuerfel">
                      <span className="ag-wuerfel__echt">{t.name}</span>
                    </span>
                  </span>
                  <span className="ag-cf__rolle">
                    <i aria-hidden="true" />
                    <span className="ag-wuerfel" key={mitTeam ? "team" : "ki"}>
                      <span className="ag-wuerfel__echt">{mitTeam ? `${t.team} · ${t.verbunden}` : `${t.ki} · ${t.online}`}</span>
                    </span>
                  </span>
                </span>
                <button type="button" className="ag-cf__zu" aria-label={t.schliessen} onClick={schliessen} onPointerDown={(ev) => ev.stopPropagation()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </header>

              <div ref={liste} className="ag-cf__liste" role="log" aria-busy={chat.streaming}>
                <div className="ag-cf__inhalt">
                  {zeilen.map((m, i) =>
                    m.role === "user" ? (
                      <Fragment key={`n-${i}`}>
                        <div className="ag-cf__zeile ag-cf__zeile--ich">
                          <div className={`ag-cf__blase ag-cf__blase--ich${m.status ? " ag-cf__blase--fehlt" : ""}`}>
                            <Eigene text={m.content} animiert={offen && !vorDemErsten && animiert(i)} />
                          </div>
                        </div>
                        {/* Kam ein Bündel an das Team nicht an: einmal darunter „nicht angekommen · Nochmal senden“. */}
                        {m.status && m.paket && zeilen[i + 1]?.paket !== m.paket && (
                          <NichtAngekommen status={m.status} aus={!mitTeam || chat.teamGesperrt} beiKlick={() => void chat.nochmalSenden(m.paket!)} />
                        )}
                      </Fragment>
                    ) : m.hinweis ? (
                      // Ein Hinweis des Chat-Schutzes („Bitte bleib freundlich.“): ruhig in der Mitte, keine Antwort.
                      <p key={`n-${i}`} className="ag-cf__hinweis" role="status">
                        {m.content}
                      </p>
                    ) : (
                      <AntwortZeile
                        key={`n-${i}`}
                        m={m}
                        wartet={!!m.wartet}
                        // Was vor dem ersten Öffnen entsteht (die frische Begrüßung), wartet auf das Öffnen;
                        // danach entschlüsselt sich nur, was bei offenem Fenster ankommt.
                        animiert={(offen || vorDemErsten) && animiert(i)}
                        halt={vorDemErsten}
                        beiFertig={() => {
                          if (i === 0) setBegruessungSteht(true);
                          setStand((n) => n + 1);
                        }}
                      >
                        {/* Bei [ANRUFEN] bietet die Anzeige selbst immer beide Wege an, auch wenn der Assistent [MITARBEITER] vergisst.
                            Bei [ANRUFEN:TESTEN] (Karte C) nur die Anruf-Karte mit eigenem Text. */}
                        {(m.anrufen || (m.mitarbeiter && mitarbeiterMoeglich)) && (
                          <Angebot
                            anrufen={!!m.anrufen}
                            testen={m.anrufArt === "testen"}
                            mitarbeiter={(m.anrufArt === "testen" ? !!m.mitarbeiter : !!m.mitarbeiter || !!m.anrufen) && mitarbeiterMoeglich}
                            beiMitarbeiter={oeffneTicket}
                          />
                        )}
                        {/* Karte B: „Mehr zu … →“, nur wenn es den Abschnitt auf dieser Seite gibt. */}
                        {m.leistung && <LeistungLink art={m.leistung} beiKlick={zurLeistung} />}
                        {/* Karte A: Folgefragen unter der neuesten Antwort, bis der Besucher selbst tippt oder sendet. */}
                        {!!m.fragen?.length && !mitTeam && i === zeilen.length - 1 && i > fragenAus && !chat.streaming && <Folgefragen fragen={m.fragen} beiWahl={waehle} />}
                      </AntwortZeile>
                    ),
                  )}
                  {chat.error && (
                    <p className="ag-cf__fehler" role="alert">
                      {chat.error}
                    </p>
                  )}

                  {/* Die drei Vorschläge: nur solange noch nichts gefragt wurde. Sie erscheinen, sobald die Begrüßung steht. */}
                  {zeigeVorschlaege && <Vorschlaege key={aufNr} da={begruessungSteht && aufNr > 0} spielt={!ruhig && !(erstesMal && aufNr <= 1)} sofort={erstesMal && aufNr <= 1} beiWahl={waehle} />}

                  {/* Übergabe an einen Mitarbeiter: das Support-Ticket. */}
                  {chat.handoff && !mitTeam && (
                    <TicketKarte
                      chat={chat}
                      ruhig={ruhig}
                      merker={zusammenfassung}
                      beiTippen={() => {
                        frageGetippt.current = true;
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="ag-cf__unten">
                {(gesperrt || chat.wiederFrei) && <SperrZeile key={sperre ? (sperre.team ? `team-${sperre.art}` : `bis-${sperre.bis}`) : "frei"} sperre={sperre} />}
                <div
                  ref={feldRef}
                  className="ag-cf__feld"
                  data-text={chat.input.trim() ? "" : undefined}
                  data-gesperrt={gesperrt ? "" : undefined}
                  data-schloss={gesperrt ? "zu" : chat.wiederFrei ? "auf" : undefined}
                >
                  <textarea
                    ref={eingabe}
                    value={chat.input}
                    onChange={(ev) => {
                      if (ev.target.value.trim()) setFragenAus(chat.messages.length - 1);
                      chat.setInput(ev.target.value);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" && !ev.shiftKey) {
                        ev.preventDefault();
                        senden();
                      }
                    }}
                    rows={1}
                    aria-label={mitTeam ? t.eingabeTeam : t.eingabe}
                    disabled={gesperrt}
                  />
                  {!chat.input && !gesperrt && <Platzhalter texte={mitTeam ? [t.platzTeam] : t.platz} laeuft={offen && !ruhig} />}
                  {/* Gesperrt: Eine Fläche über dem Feld fängt Tippen und Klicken ab (die Welle läuft von dort). */}
                  {gesperrt && <span className="ag-cf__sperrflaeche" aria-hidden="true" onPointerDown={stups} />}
                  <span ref={wellen} className="ag-cf__wellen" aria-hidden="true" />
                  <button type="button" className="ag-cf__senden" aria-label={t.senden} disabled={chat.streaming || !chat.input.trim() || gesperrt} onClick={senden}>
                    <svg className="ag-cf__stern" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 1.5c.9 7.2 3.3 9.6 10.5 10.5-7.2.9-9.6 3.3-10.5 10.5C11.1 15.3 8.7 12.9 1.5 12 8.7 11.1 11.1 8.7 12 1.5Z" />
                    </svg>
                    {/* Schloss statt Stern, solange gesperrt; nach Ablauf springt es auf. */}
                    <svg ref={schlossRef} className="ag-cf__schloss" viewBox="0 0 24 24" aria-hidden="true">
                      <path className="ag-cf__buegel" d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
                      <rect x="5" y="10.5" width="14" height="10" rx="2.6" />
                    </svg>
                    {/* Der Ring leert sich mit der Restzeit (nur bei Sperren mit Uhr). */}
                    {sperre && !sperre.team && !ruhig && <Ring key={sperre.bis} bis={sperre.bis} ab={sperre.ab} />}
                    <span ref={strich} className="ag-cf__strich" aria-hidden="true" />
                  </button>
                </div>
                {/* Die goldene Linie unter dem Eingabefeld: Sie zieht sich beim Öffnen von links nach rechts. */}
                <span className="ag-cf__linie" aria-hidden="true" />
                <div className="ag-cf__fuss">
                  {mitTeam ? (
                    <span>{t.mitTeam}</span>
                  ) : (
                    <>
                      <span>{t.istKi}</span>
                      <MitarbeiterKnopf klein beiKlick={oeffneTicket} />
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Dünnes Schloss für die Sperre, im Strich der übrigen Zeichen. */
function Schloss() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.6" />
      <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
    </svg>
  );
}

function Haken() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

/**
 * Über dem Eingabefeld (Chat-Schutz, Prompt 17; Grund seit Prompt 18): Der Assistent ist gesperrt (mit Countdown,
 * die Ziffern kippen beim Wechsel), der Support-Chat ist gesperrt, bis das Team entsperrt (ohne Uhr), oder kurz
 * „Du kannst wieder schreiben.“ (blendet nach 6 s aus). Die Zeile bleibt gold und leuchtet etwa alle 8 s einmal rot
 * auf (Stylesheet). Vorlesen: einmal beim Erscheinen, nicht jede Sekunde.
 */
function SperrZeile({ sperre }: { sperre: ChatSperre | null }) {
  const bis = sperre && !sperre.team ? sperre.bis : 0;
  const [rest, setRest] = useState(() => (bis ? restText(bis - Date.now()) : ""));
  const [anfang] = useState(rest);
  useEffect(() => {
    if (!bis) return;
    const takt = window.setInterval(() => setRest(restText(bis - Date.now())), 250);
    return () => window.clearInterval(takt);
  }, [bis]);
  if (!sperre) {
    return (
      <div className="ag-cf__sperre ag-cf__sperre--frei" role="status">
        <Haken />
        <span>{schutz.wiederFrei}</span>
      </div>
    );
  }
  if (!bis) {
    return (
      <div className="ag-cf__sperre" role="status">
        <Schloss />
        <span>{schutz.team[sperre.art]}</span>
      </div>
    );
  }
  const text = schutz.sperre[sperre.art as SperrArt] ?? schutz.sperre.menge;
  return (
    <div className="ag-cf__sperre" role="status">
      <Schloss />
      <span aria-hidden="true">
        {text} <KippZeit text={rest} />
      </span>
      <span className="ag-cf__vorlesen">{`${text} ${anfang}`}</span>
    </div>
  );
}

/** Die Restzeit mit kippenden Ziffern: Jede Ziffer, die wechselt, klappt nach unten weg, die neue klappt herein. */
function KippZeit({ text }: { text: string }) {
  return (
    <span className="ag-cf__rest">
      {Array.from(text).map((z, i) => (z === ":" ? <span key={`t${i}`}>:</span> : <Ziffer key={`z${i}-${text.length}`} z={z} />))}
    </span>
  );
}
function Ziffer({ z }: { z: string }) {
  const [stand, setStand] = useState({ jetzt: z, vorher: "", nr: 0 });
  if (stand.jetzt !== z) setStand({ jetzt: z, vorher: stand.jetzt, nr: stand.nr + 1 });
  return (
    <span className="ag-cf__ziffer">
      <span key={`n${stand.nr}`} className={stand.nr ? "ag-cf__ziffer-neu" : undefined}>
        {stand.jetzt}
      </span>
      {stand.vorher && (
        <span key={`a${stand.nr}`} className="ag-cf__ziffer-alt">
          {stand.vorher}
        </span>
      )}
    </span>
  );
}

/**
 * Der Ring um den Senden-Knopf: leert sich mit der Restzeit. Zwei Halbringe drehen sich nacheinander aus ihrem
 * Ausschnitt (nur transform): erst die rechte Hälfte, dann die linke. Die Zeit läuft als CSS-Animation über die
 * ganze Sperre; die schon vergangene Zeit steht als negativer Beginn darin.
 */
function Ring({ bis, ab }: { bis: number; ab: number }) {
  const dauer = Math.max(1000, bis - ab);
  const [vorbei] = useState(() => Math.min(dauer, Math.max(0, Date.now() - ab)));
  const stil = { "--dauer": `${dauer}ms`, "--vorbei": `-${vorbei}ms` } as CSSProperties;
  return (
    <span className="ag-cf__ring" style={stil} aria-hidden="true">
      <span className="ag-cf__ring-r">
        <i />
      </span>
      <span className="ag-cf__ring-l">
        <i />
      </span>
    </span>
  );
}

/** Unter einem Bündel an das Team, das nicht ankam: „nicht angekommen · Nochmal senden“. */
function NichtAngekommen({ status, aus, beiKlick }: { status: "fehlt" | "sendet"; aus: boolean; beiKlick: () => void }) {
  return (
    <div className="ag-cf__zustellung" role="status">
      {status === "sendet" ? (
        <span className="ag-cf__zustellung-sendet">{schutz.sendet}</span>
      ) : (
        <>
          <span>{schutz.nichtAngekommen}</span>
          <button type="button" className="ag-cf__nochmal" disabled={aus} onClick={beiKlick}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
              <path d="M19.8 4.6v3.6h-3.6" />
            </svg>
            {schutz.nochmal}
          </button>
        </>
      )}
    </div>
  );
}

/** Kennzeichnet die Maße, für die eine Zeitleiste angelegt ist (auf halbe Pixel genau). */
function masseSchluessel(m: Masse, zug: { x: number; y: number }): string {
  return [m.b, m.h, m.d, m.kx, m.ky, zug.x, zug.y].map((x) => Math.round(x * 2) / 2).join("|") + (m.handy ? "|h" : "");
}

/**
 * Spielt die Zeitleiste: ab der Stelle `ab` (Millisekunden) oder, mit `null`, von dort weiter, wo
 * sie gerade ist; `tempo` 1 heißt vorwärts (öffnen), negativ rückwärts (schließen).
 */
function spieleAb(animationen: Animation[], ab: number | null, tempo: number) {
  for (const a of animationen) {
    if (ab !== null) a.currentTime = ab;
    a.playbackRate = tempo;
    a.play();
  }
}

// Die vierzehn Teile der Form (Stylesheet): je drei Rechtecke und vier Kreise, erst der Goldrand, dann die Fläche.
const TEILE = ["--rand", ""].flatMap((art) => ["", "", "", "--rund", "--rund", "--rund", "--rund"].map((form) => `ag-cf__teil${art ? ` ag-cf__teil${art}` : ""}${form ? ` ag-cf__teil${form}` : ""}`));

/** „Mit einem Mitarbeiter schreiben“: Glasknopf mit Sprechblase. Er führt zum Support-Ticket. */
function MitarbeiterKnopf({ beiKlick, klein = false, stil }: { beiKlick: () => void; klein?: boolean; stil?: CSSProperties }) {
  return (
    <button type="button" className={`ag-cf__mensch${klein ? " ag-cf__mensch--klein" : ""}`} style={stil} onClick={beiKlick} data-wuerfel>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5Z" />
        <path d="M9 10.5h6M9 13.5h3.5" />
      </svg>
      <span className="ag-wuerfel">
        <span className="ag-wuerfel__echt">{t.mitarbeiter}</span>
      </span>
    </button>
  );
}

/**
 * Die Anruf-Karte im Chat: die kleine Ausgabe der Karte unten bei „Sprechen wir über Ihr Projekt“.
 * Glas, der grüne atmende Punkt mit „KI-Assistent bereit“, die Nummer und der goldene Knopf
 * „Jetzt anrufen“ (tel:). Ihr Rand glimmt unter der Maus (glimmrand.ts).
 */
function AnrufKarte({ stil, testen = false }: { stil?: CSSProperties; testen?: boolean }) {
  const karte = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!karte.current) return;
    return glimme(karte.current);
  }, []);
  return (
    <div ref={karte} className={`ag-cf__anruf ag-glimm${testen ? " ag-cf__anruf--testen" : ""}`} style={stil} data-glimm>
      {testen ? (
        // Karte C: Wer den Telefon-Assistenten hören will, bekommt dieselbe Karte mit eigenem Text.
        <>
          <span className="ag-cf__anruf-titel">
            <i aria-hidden="true" />
            {karten.testen.titel}
          </span>
          <span className="ag-cf__anruf-zeile">{karten.testen.zeile}</span>
          <a className="ag-cf__anruf-nummer ag-cf__anruf-nummer--klein" href={`tel:${marke.telefon}`}>
            {marke.telefonAnzeige}
          </a>
        </>
      ) : (
        <>
          <span className="ag-cf__anruf-status">
            <i aria-hidden="true" />
            {kontakt.anrufStatus}
          </span>
          <a className="ag-cf__anruf-nummer" href={`tel:${marke.telefon}`}>
            {marke.telefonAnzeige}
          </a>
        </>
      )}
      <a className="ag-cf__gold ag-cf__anruf-knopf" href={`tel:${marke.telefon}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6.6 3.8h2.6l1.5 4-1.9 1.4a11.2 11.2 0 0 0 5.9 5.9l1.4-1.9 4 1.5v2.6a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 6a2 2 0 0 1 2-2.2Z" />
        </svg>
        {testen ? karten.testen.knopf : t.anrufen}
      </a>
    </div>
  );
}

/**
 * Was unter einer Antwort angeboten wird. Bei [ANRUFEN] die Anruf-Karte und darunter immer die
 * Zeile „Lieber vorher noch ein paar Fragen klären? …“ mit dem Knopf „Mit einem Mitarbeiter
 * schreiben“ (einmal, auch wenn der Assistent zusätzlich [MITARBEITER] setzt); bei [MITARBEITER]
 * allein nur der Knopf. Es blendet weich ein, nacheinander.
 */
function Angebot({ anrufen, testen = false, mitarbeiter, beiMitarbeiter }: { anrufen: boolean; testen?: boolean; mitarbeiter: boolean; beiMitarbeiter: () => void }) {
  const nr = (n: number) => ({ "--n": n }) as CSSProperties;
  return (
    <div className="ag-cf__angebot">
      {anrufen && <AnrufKarte stil={nr(0)} testen={testen} />}
      {anrufen && mitarbeiter && (
        <p className="ag-cf__klein ag-cf__weiter" style={nr(1)}>
          {t.weitereFragen}
        </p>
      )}
      {mitarbeiter && <MitarbeiterKnopf beiKlick={beiMitarbeiter} stil={nr(anrufen ? 2 : 0)} />}
    </div>
  );
}

/**
 * Karte B (Prompt 18): Erklärt der Assistent eine bestimmte Leistung, steht darunter „Mehr zu … →“. Gibt es den
 * Abschnitt auf dieser Seite nicht (Impressum, Datenschutz), kommt kein Link. Blendet ein wie die übrigen Karten.
 */
function LeistungLink({ art, beiKlick }: { art: LeistungArt; beiKlick: (art: LeistungArt) => void }) {
  const [da] = useState(() => leistungsZiel(art) !== null);
  if (!da) return null;
  return (
    <div className="ag-cf__angebot">
      <button type="button" className="ag-cf__leistung" style={{ "--n": 0 } as CSSProperties} onClick={() => beiKlick(art)}>
        {karten.leistung[art]}
        <span aria-hidden="true"> →</span>
      </button>
    </div>
  );
}

/**
 * Karte A (Prompt 18): höchstens zwei Folgefragen unter der neuesten Antwort, wie die Startvorschläge, nur kleiner.
 * Ein Klick schickt die Frage ab, als wäre sie getippt. Ohne Glitch; sie blenden ein wie die übrigen Karten.
 */
function Folgefragen({ fragen, beiWahl }: { fragen: string[]; beiWahl: (frage: string, knopf: HTMLElement) => void }) {
  return (
    <div className="ag-cf__angebot ag-cf__folgefragen" role="group" aria-label={karten.fragen}>
      {fragen.map((frage, i) => (
        <button key={frage} type="button" className="ag-cf__vorschlag ag-cf__vorschlag--klein" style={{ "--n": i } as CSSProperties} onClick={(ev) => beiWahl(frage, ev.currentTarget)}>
          {frage}
        </button>
      ))}
    </div>
  );
}

/** Drei goldene Punkte, die nacheinander pulsieren (Stylesheet). */
function Punkte({ flug = false }: { flug?: boolean }) {
  return (
    <span className={`ag-cf__punkte${flug ? " ag-cf__punkte--flug" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * Lässt die Wörter unter „huelle“ (`.ag-cf__w`) als ruhige Welle erscheinen: Von links nach rechts
 * taucht Wort für Wort als goldene Zufallszeichen in voller Wortlänge auf (sie wechseln rund alle
 * 80 ms), mit Abstand dahinter rastet Wort für Wort ein und leuchtet kurz warm nach. Takt und
 * Dauer: wellenPlan (lib/chat-text.ts). Jedes Wort hat von Anfang an seinen Platz, nichts springt.
 * Gibt den Abbruch zurück.
 */
function spieleWelle(huelle: HTMLElement, wahl: { zuegig: boolean; anlauf: number; fertig: () => void }): () => void {
  const felder = Array.from(huelle.querySelectorAll<HTMLElement>(".ag-cf__w"));
  const n = felder.length;
  let rahmen = 0;
  let schluss = 0;
  let vorbei = false;
  if (!n) {
    schluss = window.setTimeout(wahl.fertig, 0);
    return () => window.clearTimeout(schluss);
  }
  const plan = wellenPlan(n, wahl.zuegig);
  // Erst messen: Breite jedes Wortes und die Schriftgröße …
  const basis = parseFloat(getComputedStyle(huelle).fontSize) || 15;
  const breiten = felder.map((f) => f.offsetWidth);
  // … dann setzen: Die Zeichen stehen in voller Wortlänge genau im Platz des Wortes (in der
  // Zeichen-Schrift ist jedes Zeichen 0,6 Schriftgrößen breit; den Rest gleicht der Abstand aus).
  const worte = felder.map((f, i) => {
    delete f.dataset.z;
    const el = f.lastElementChild as HTMLElement;
    const laenge = Math.max(1, Math.min(26, Array.from(f.firstElementChild?.textContent ?? "").length));
    const gross = klemme(breiten[i] / (laenge * 0.6), basis * 0.56, basis * 0.82);
    el.style.fontSize = `${gross.toFixed(2)}px`;
    el.style.letterSpacing = `${((breiten[i] - laenge * 0.6 * gross) / laenge).toFixed(2)}px`;
    return { el, zeichen: Array.from({ length: laenge }, zufall), naechster: 0 };
  });
  // Die Zeichen wechseln ruhig: rund alle 80 ms, und jedes Mal nur etwa die Hälfte.
  const wechsle = (i: number, jetzt: number, alle: boolean) => {
    const w = worte[i];
    for (let k = 0; k < w.zeichen.length; k++) if (alle || Math.random() < 0.55) w.zeichen[k] = zufall();
    w.el.textContent = w.zeichen.join("");
    w.naechster = jetzt + ZEICHEN_WECHSEL - 10 + Math.random() * 20;
  };
  let start = 0;
  let gezeigt = 0;
  let fest = 0;
  const schritt = (jetzt: number) => {
    rahmen = 0;
    if (vorbei) return;
    if (!start) start = jetzt + wahl.anlauf;
    const zeit = jetzt - start;
    // Die Welle der Zeichen …
    while (gezeigt < n && zeit >= gezeigt * plan.takt) {
      wechsle(gezeigt, jetzt, true);
      felder[gezeigt].dataset.z = "1";
      gezeigt += 1;
    }
    // … und mit Abstand dahinter die Welle des Einrastens.
    while (fest < gezeigt && zeit >= fest * plan.takt + plan.zeichenzeit) {
      felder[fest].dataset.z = "2";
      fest += 1;
    }
    for (let i = fest; i < gezeigt; i++) if (jetzt >= worte[i].naechster) wechsle(i, jetzt, false);
    if (fest >= n) {
      // Alles eingerastet: Das letzte Wort leuchtet noch nach, dann ist es gewöhnlicher Text.
      schluss = window.setTimeout(wahl.fertig, NACHLEUCHTEN);
      return;
    }
    rahmen = requestAnimationFrame(schritt);
  };
  rahmen = requestAnimationFrame(schritt);
  return () => {
    vorbei = true;
    cancelAnimationFrame(rahmen);
    window.clearTimeout(schluss);
  };
}

/** Ein Text, der sich als Welle entschlüsselt (Antworten im Verlauf, die Zusammenfassung im Formular). */
function Welle({ text, zuegig = false, anlauf = 0, halt = false, beiFertig }: { text: string; zuegig?: boolean; anlauf?: number; halt?: boolean; beiFertig: () => void }) {
  const huelle = useRef<HTMLSpanElement>(null);
  const teile = useMemo(() => woerter(text), [text]);
  const melden = useRef(beiFertig);
  useEffect(() => {
    melden.current = beiFertig;
  }, [beiFertig]);
  useEffect(() => {
    if (halt || !huelle.current) return;
    return spieleWelle(huelle.current, { zuegig, anlauf, fertig: () => melden.current() });
  }, [halt, zuegig, anlauf, text]);
  return (
    <span ref={huelle} className="ag-cf__spiel" aria-hidden="true">
      {teile.map((teil, i) =>
        teil.leer ? (
          teil.text
        ) : (
          <span key={i} className="ag-cf__w">
            <span className="ag-cf__we">{teil.text}</span>
            <span className="ag-cf__wz" />
          </span>
        ),
      )}
    </span>
  );
}

type Stufe = "punkte" | "welle" | "fertig";

/**
 * Eine Antwort (Assistent oder Team) mit dem, was darunter angeboten wird (`children`).
 *
 * - `wartet`: Die Antwort ist noch nicht da. In der Glasblase pulsieren drei goldene Punkte,
 *   solange der Assistent nachdenkt und solange die Antwort ankommt.
 * - Ist sie da, wächst die Blase weich auf ihre endgültige Größe (0,4 s), die Punkte fliegen
 *   auseinander zu den ersten Wörtern, und der Text entschlüsselt sich als Welle. Jedes Wort hat
 *   von Anfang an seinen Platz. Danach ist es gewöhnlicher Text mit Links.
 * - Ohne `animiert` (Verlauf, Fenster zu, „weniger Bewegung“) steht die Antwort einfach da.
 * - Erst wenn sie fertig entschlüsselt ist, erscheinen darunter die Knöpfe.
 */
function AntwortZeile({ m, wartet, animiert, halt, beiFertig, children }: { m: Message; wartet: boolean; animiert: boolean; halt: boolean; beiFertig: () => void; children?: ReactNode }) {
  const [stufe, setStufe] = useState<Stufe>(wartet ? "punkte" : animiert ? "welle" : "fertig");
  // Begann die Zeile als Punkte-Blase? Nur dann fliegen Punkte in die Zeichen.
  const [ausPunkten] = useState(wartet);
  // Die Antwort ist angekommen: Aus den Punkten wird die Welle (oder gleich der Text).
  if (!wartet && stufe === "punkte") setStufe(animiert ? "welle" : "fertig");
  const blase = useRef<HTMLDivElement>(null);
  // Die Größe der Punkte-Blase: Von ihr aus wächst die Blase.
  const von = useRef<{ b: number; h: number } | null>(null);
  const melden = useRef(beiFertig);
  useEffect(() => {
    melden.current = beiFertig;
  }, [beiFertig]);
  useEffect(() => {
    if (stufe === "fertig") melden.current();
  }, [stufe]);

  useLayoutEffect(() => {
    const el = blase.current;
    if (!el) return;
    if (stufe === "punkte") {
      von.current = { b: el.offsetWidth, h: el.offsetHeight };
      return;
    }
    const start = von.current;
    von.current = null;
    if (stufe !== "welle" || !start) return;
    // Erst messen: die endgültige Größe, die Punkte und die ersten Wörter …
    const satz = el.querySelector<HTMLElement>(".ag-cf__satz");
    const ziel = { b: el.offsetWidth, h: el.offsetHeight };
    const satzBreite = satz?.offsetWidth ?? 0;
    const punkte = Array.from(el.querySelectorAll<HTMLElement>(".ag-cf__punkte i"));
    const erste = Array.from(el.querySelectorAll<HTMLElement>(".ag-cf__w")).slice(0, 3);
    const punktOrte = punkte.map((p) => p.getBoundingClientRect());
    const wortOrte = erste.map((w) => w.getBoundingClientRect());
    // … dann setzen: Die Blase wächst von der Größe der Punkte-Blase auf ihre endgültige Größe.
    // Der Text hat dabei schon seine endgültige Breite, also bricht keine Zeile um.
    if (satz) satz.style.width = `${satzBreite}px`;
    el.style.overflow = "hidden";
    el.style.width = `${start.b}px`;
    el.style.height = `${start.h}px`;
    void el.offsetWidth;
    el.style.transition = `width ${WACHSEN}ms cubic-bezier(0.22, 1, 0.36, 1), height ${WACHSEN}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    el.style.width = `${ziel.b}px`;
    el.style.height = `${ziel.h}px`;
    // Die drei Punkte fliegen auseinander, zu den ersten Wörtern, und gehen dort in die Zeichen über.
    const fluege = punkte.map((p, k) => {
      const w = wortOrte[Math.min(k, wortOrte.length - 1)];
      const dx = w ? w.left + w.width / 2 - (punktOrte[k].left + punktOrte[k].width / 2) : (k - 1) * 30;
      const dy = w ? w.top + w.height / 2 - (punktOrte[k].top + punktOrte[k].height / 2) : -4;
      return p.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
          { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(0.5)`, opacity: 0 },
        ],
        { duration: 360, delay: k * 45, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "forwards" },
      );
    });
    const frei = () => {
      el.style.overflow = el.style.width = el.style.height = el.style.transition = "";
      if (satz) satz.style.width = "";
    };
    const uhr = window.setTimeout(frei, WACHSEN + 60);
    return () => {
      window.clearTimeout(uhr);
      fluege.forEach((f) => f.cancel());
      frei();
    };
  }, [stufe]);

  const team = m.role === "team";
  return (
    <>
      <div className="ag-cf__zeile">
        <div ref={blase} className={`ag-cf__blase${team ? " ag-cf__blase--team" : ""}`} data-stufe={stufe}>
          {stufe === "punkte" ? (
            <>
              <span className="ag-cf__vorlesen" role="status">
                {t.denkt}
              </span>
              <Punkte />
            </>
          ) : (
            <>
              {team && m.von && <span className="ag-cf__von">{m.von}</span>}
              {stufe === "fertig" ? (
                <ReichText text={m.content} />
              ) : (
                <>
                  {/* Für Vorleseprogramme steht der Text sofort ganz da. */}
                  <span className="ag-cf__vorlesen">{m.content}</span>
                  <span className="ag-cf__satz">
                    <Welle text={m.content} halt={halt} anlauf={150} beiFertig={() => setStufe("fertig")} />
                  </span>
                  {ausPunkten && <Punkte flug />}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {stufe === "fertig" && children}
    </>
  );
}

/** Der fertige Text einer Antwort: Links, Telefonnummern und E-Mail-Adressen mit goldener Unterstreichung. */
function ReichText({ text }: { text: string }) {
  const teile = useMemo(() => reichTeile(text), [text]);
  return (
    <>
      {teile.map((teil, i) =>
        teil.art === "text" ? (
          teil.text
        ) : (
          <a key={i} className="ag-cf__link" href={teil.href} {...(teil.art === "netz" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {teil.text}
          </a>
        ),
      )}
    </>
  );
}

/** Die eigene Nachricht: erscheint kurz verbuggt und rastet nach 0,25 s als der getippte Text ein. */
function Eigene({ text, animiert }: { text: string; animiert: boolean }) {
  const huelle = useRef<HTMLSpanElement>(null);
  const [spielt] = useState(animiert);
  useEffect(() => {
    if (!spielt || !huelle.current) return;
    return enthuelleText(huelle.current, 250);
  }, [spielt]);
  return (
    <span ref={huelle} className="ag-wuerfel">
      <span className="ag-wuerfel__echt">{text}</span>
    </span>
  );
}

/**
 * Die drei Vorschläge. Sie stehen sofort lesbar da: Sobald die Begrüßung steht, gleiten sie
 * nacheinander hinein, jeder mit einem kurzen Lichtstreif, und ihr Text entschlüsselt sich kurz.
 * Beim Drüberfahren verbuggen sie wie die anderen Texte (`data-wuerfel`).
 */
function Vorschlaege({ da, spielt, sofort = false, beiWahl }: { da: boolean; spielt: boolean; sofort?: boolean; beiWahl: (frage: string, knopf: HTMLElement) => void }) {
  const reihe = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = reihe.current;
    if (!da || !spielt || !el) return;
    const abbruch: (() => void)[] = [];
    const uhren = Array.from(el.querySelectorAll<HTMLElement>(".ag-wuerfel")).map((huelle, i) => window.setTimeout(() => abbruch.push(enthuelleText(huelle, 380)), 90 + i * 140));
    return () => {
      uhren.forEach((u) => window.clearTimeout(u));
      abbruch.forEach((a) => a());
    };
  }, [da, spielt]);
  return (
    // `sofort`: beim ersten Öffnen in diesem Besuch stehen sie einfach da (Prompt 18), ohne Hineingleiten und Entschlüsseln.
    <div ref={reihe} className="ag-cf__vorschlaege" data-da={da} data-sofort={sofort ? "" : undefined}>
      {STARTER_QUESTIONS.map((frage, i) => (
        <button key={frage} type="button" className="ag-cf__vorschlag" style={{ "--i": i } as CSSProperties} onClick={(ev) => beiWahl(frage, ev.currentTarget)} data-wuerfel>
          <span className="ag-wuerfel">
            <span className="ag-wuerfel__echt">{frage}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Der Platzhalter des Eingabefelds: wechselt alle paar Sekunden verbuggt zwischen Beispielfragen. */
function Platzhalter({ texte, laeuft }: { texte: readonly string[]; laeuft: boolean }) {
  const [nr, setNr] = useState(0);
  const huelle = useRef<HTMLSpanElement>(null);
  const viele = texte.length > 1;
  useEffect(() => {
    if (!laeuft || !viele) return;
    const takt = window.setInterval(() => setNr((n) => n + 1), 3600);
    return () => window.clearInterval(takt);
  }, [laeuft, viele]);
  // Verbuggt wird nur, wenn die Frage wirklich wechselt (nicht schon im Klick, der das Fenster öffnet).
  const gezeigt = useRef(0);
  useEffect(() => {
    if (!laeuft || !viele || nr === gezeigt.current || !huelle.current) return;
    gezeigt.current = nr;
    return enthuelleText(huelle.current, 380);
  }, [nr, laeuft, viele]);
  return (
    <span className="ag-cf__platz" aria-hidden="true">
      <span ref={huelle} className="ag-wuerfel" key={nr % texte.length}>
        <span className="ag-wuerfel__echt">{texte[nr % texte.length]}</span>
      </span>
    </span>
  );
}

type TicketFeld = "name" | "kontakt" | "frage";

/**
 * Das Formular für die Übergabe an einen Mitarbeiter, als Glaskarte im Chat: Name, E-Mail oder
 * Telefon, Nachricht. Felder, Prüfung und Senden sind die des bestehenden Support-Tickets
 * (useChat: submitHandoff).
 *
 * Die Nachricht ist schon ausgefüllt: mit einer KI-Zusammenfassung des bisherigen Chats
 * (components/chat/zusammenfassung.ts, app/api/chat/zusammenfassung). Während sie kommt, stehen
 * im Feld die drei goldenen Punkte; dann entschlüsselt sich der Text kurz (rund 1 s). Klappt es
 * nicht (Fehler, 6 s Zeitgrenze), bleibt das Feld leer mit seinem Platzhalter. Der Besucher kann
 * jederzeit selbst tippen: Was er tippt, wird nie überschrieben.
 *
 * Anzeige wie im Kontaktformular: goldener Schein hinter dem Feld mit Fokus, leichter Schimmer
 * hinter ausgefüllten Feldern, roter Schein mit einem kurzen Satz bei fehlenden Pflichtfeldern
 * (der Browser prüft und sendet dann nichts; nur seine Sprechblase ist ersetzt).
 */
function TicketKarte({ chat, ruhig, merker, beiTippen }: { chat: ChatZustand; ruhig: boolean; merker: { current: { n: number; text: string } | null }; beiTippen: () => void }) {
  const k = t.ticket;
  const karte = useRef<HTMLFormElement>(null);
  const frage = useRef<HTMLTextAreaElement>(null);
  const [fehlt, setFehlt] = useState<Partial<Record<TicketFeld, string>>>({});
  // Die Zusammenfassung: „laedt“ (drei Punkte im Feld), „spielt“ (der Text entschlüsselt sich), „aus“.
  const [zf, setZf] = useState<"aus" | "laedt" | "spielt">(() => (chat.hFrage.trim() ? "aus" : "laedt"));
  const getippt = useRef(false);
  const jetzt = useRef({ chat, ruhig });
  useEffect(() => {
    jetzt.current = { chat, ruhig };
  }, [chat, ruhig]);

  // Beim Öffnen des Formulars: die Zusammenfassung holen (einmal je Stand des Gesprächs).
  useEffect(() => {
    const c = jetzt.current.chat;
    if (c.hFrage.trim()) return;
    const n = c.messages.length;
    const abbruch = new AbortController();
    let lebt = true;
    const holen = merker.current?.n === n ? Promise.resolve(merker.current.text) : holeZusammenfassung(c.messages, abbruch.signal);
    void holen.then((text) => {
      if (!lebt) return;
      if (text) merker.current = { n, text };
      // Hat der Besucher inzwischen selbst getippt, bleibt sein Text stehen.
      if (!text || getippt.current) return setZf("aus");
      jetzt.current.chat.setHFrage(text);
      setZf(jetzt.current.ruhig ? "aus" : "spielt");
    });
    return () => {
      lebt = false;
      abbruch.abort();
    };
  }, [merker]);

  // Das Nachrichtenfeld wächst mit dem Text (bis 220 px): Die Zusammenfassung ist ganz zu sehen.
  useEffect(() => {
    const feld = frage.current;
    if (!feld) return;
    feld.style.height = "auto";
    feld.style.height = `${Math.min(220, Math.max(84, feld.scrollHeight))}px`;
  }, [chat.hFrage]);

  useEffect(() => {
    const el = karte.current;
    if (!el) return;
    let gemeldet: Partial<Record<TicketFeld, string>> = {};
    let erstes: HTMLElement | null = null;
    let geplant = false;
    let uhr = 0;
    const ungueltig = (ev: Event) => {
      const feld = ev.target as HTMLInputElement | HTMLTextAreaElement;
      const name = feld.name as TicketFeld;
      if (name !== "name" && name !== "kontakt" && name !== "frage") return;
      ev.preventDefault();
      gemeldet[name] = k.fehlt[name];
      erstes ??= feld;
      if (geplant) return;
      geplant = true;
      // Der Browser meldet alle ungültigen Felder in einem Zug: danach anzeigen.
      uhr = window.setTimeout(() => {
        setFehlt(gemeldet);
        erstes?.focus();
        gemeldet = {};
        erstes = null;
        geplant = false;
      }, 0);
    };
    el.addEventListener("invalid", ungueltig, true);
    return () => {
      window.clearTimeout(uhr);
      el.removeEventListener("invalid", ungueltig, true);
    };
  }, [k.fehlt]);

  const eingegeben = (ev: FormEvent<HTMLFormElement>) => {
    const feld = ev.target as HTMLInputElement | HTMLTextAreaElement;
    if (!feld.validity?.valid || !(feld.name in fehlt)) return;
    setFehlt((alt) => {
      const rest = { ...alt };
      delete rest[feld.name as TicketFeld];
      return rest;
    });
  };
  // „Fehlt“ gilt nur, solange das Feld leer ist.
  const zeigt = (feld: TicketFeld, wert: string) => (fehlt[feld] && !wert.trim() ? fehlt[feld] : undefined);
  const voll = (wert: string) => (wert.trim() ? "" : undefined);
  const meldung = (feld: TicketFeld, wert: string) => (
    <span className="ag-cf__fehlt" aria-live="polite">
      {zeigt(feld, wert) ?? ""}
    </span>
  );

  return (
    <form ref={karte} className="ag-cf__ticket" onSubmit={chat.submitHandoff} onInput={eingegeben}>
      <p className="ag-cf__ticket-hinweis">{k.hinweis}</p>
      <label className="ag-cf__eingabe" data-voll={voll(chat.hName)} data-fehlt={zeigt("name", chat.hName) ? "" : undefined}>
        <input name="name" value={chat.hName} onChange={(ev) => chat.setHName(ev.target.value)} placeholder={k.name} aria-label={k.name} required maxLength={80} autoComplete="name" />
        {meldung("name", chat.hName)}
      </label>
      <label className="ag-cf__eingabe" data-voll={voll(chat.hKontakt)} data-fehlt={zeigt("kontakt", chat.hKontakt) ? "" : undefined}>
        <input name="kontakt" value={chat.hKontakt} onChange={(ev) => chat.setHKontakt(ev.target.value)} placeholder={k.kontakt} aria-label={k.kontakt} required maxLength={120} />
        {meldung("kontakt", chat.hKontakt)}
      </label>
      <label className="ag-cf__eingabe ag-cf__eingabe--frage" data-voll={voll(chat.hFrage)} data-fehlt={zeigt("frage", chat.hFrage) ? "" : undefined} data-zf={zf === "aus" ? undefined : zf}>
        <span className="ag-cf__frage">
          <textarea
            ref={frage}
            name="frage"
            value={chat.hFrage}
            onChange={(ev) => {
              // Der Besucher tippt selbst: Ab jetzt gehört das Feld ihm.
              getippt.current = true;
              beiTippen();
              if (zf !== "aus") setZf("aus");
              chat.setHFrage(ev.target.value);
            }}
            placeholder={zf === "laedt" ? "" : k.frage}
            aria-label={k.frageName}
            aria-busy={zf === "laedt"}
            required
            rows={3}
            maxLength={1000}
          />
          {zf === "laedt" && (
            <span className="ag-cf__zf-punkte">
              <span className="ag-cf__vorlesen" role="status">
                {k.fasstZusammen}
              </span>
              <Punkte />
            </span>
          )}
          {zf === "spielt" && (
            <span className="ag-cf__zf-spiel">
              <Welle text={chat.hFrage} zuegig beiFertig={() => setZf("aus")} />
            </span>
          )}
        </span>
        {meldung("frage", chat.hFrage)}
      </label>
      {/* Köder für einfache Bots: Menschen sehen das Feld nicht. */}
      <input className="ag-cf__koeder" value={chat.hHoney} onChange={(ev) => chat.setHHoney(ev.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
      <p className="ag-cf__klein">{k.weg}</p>
      <p className="ag-cf__klein">
        {k.datenschutzVor}
        <a className="ag-cf__link" href="/datenschutz">
          {k.datenschutz}
        </a>
        {k.datenschutzNach}
      </p>
      {chat.hError && (
        <p className="ag-cf__fehler" role="alert">
          {chat.hError}
        </p>
      )}
      <div className="ag-cf__ticket-knoepfe">
        <button type="submit" className="ag-cf__gold" disabled={chat.hBusy}>
          {chat.hBusy ? k.laeuft : k.verbinden}
        </button>
        <button type="button" className="ag-cf__leise" onClick={() => chat.setHandoff(false)}>
          {k.abbrechen}
        </button>
      </div>
    </form>
  );
}
