"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useChatZugang } from "@/components/chat/ChatAnbieter";
import type { ChatZustand } from "@/components/chat/useChat";
import { holeZusammenfassung } from "@/components/chat/zusammenfassung";
import { CHAT_ZEICHEN, STARTER_QUESTIONS, ZEICHEN_WECHSEL, reichTeile, wellenPlan, woerter, type Message } from "@/lib/chat-text";
import { gsap } from "@/lib/gsap";
import { chat as chatTexte, kontakt, marke } from "@/lib/inhalt-neu";
import { glimme } from "../glimmrand";
import { LogoFormen } from "../Marke";
import { LADEN_FERTIG, LADEN_FERTIG_KLASSE } from "../umgebung";
import { enthuelleText, richteVerwuerfelnEin } from "../verwuerfeln";
import "./chat.css";

const t = chatTexte.fenster;
const zufall = () => CHAT_ZEICHEN[Math.floor(Math.random() * CHAT_ZEICHEN.length)];
const klemme = (x: number, von = 0, bis = 1) => Math.min(bis, Math.max(von, x));
const weich = (x: number) => {
  const k = klemme(x);
  return k * k * (3 - 2 * k);
};

/** Klasse am <html>, solange das Fenster nicht ganz zu ist: Dann zeigt die Kugel des Fensters den Chat-Knopf. */
const FENSTER_AN = "ag-cf-an";
/** Eckenradius des offenen Fensters und Durchmesser des Chat-Knopfs (wie im Stylesheet). */
const ECKE = 26;
const KUGEL = 64;
/** So lange leuchtet ein eingerastetes Wort nach, bevor die Antwort gewöhnlicher Text wird (ms). */
const NACHLEUCHTEN = 520;
/** So lange wächst die Blase von den drei Punkten auf ihre endgültige Größe (ms). */
const WACHSEN = 400;

/**
 * Wie weit Öffnen und Schließen gerade sind. Jede Größe läuft für sich von 0 bis 1:
 * f = Form (0 Kugel auf dem Chat-Knopf, 1 Fenster), i = Inhalt (0 aufgelöst, 1 da),
 * l = Logo in der Kugel (0 leer, bis 1 erst der Stern, dann die Balken, zuletzt das Licht des Knopfs),
 * k = das Logo zieht sich zum Lichtpunkt zusammen, p = Helligkeit des Lichtpunkts,
 * q = der Lichtpunkt wandert dorthin, wo die Begrüßung beginnt, h = die Kugel hebt sich an.
 */
type Lage = { f: number; i: number; l: number; k: number; p: number; q: number; h: number };

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
 *   sich das Logo auf, dann ist sie wieder der Knopf. Öffnen läuft rückwärts: Die Kugel hebt sich,
 *   das Logo wird zum Lichtpunkt, die Kugel dehnt sich zum Fenster, der Inhalt baut sich auf.
 *   Geformt wird nur mit Verschieben, Größe und Eckenradius, nichts wird abgeschnitten. Ein Klick
 *   mitten in der Bewegung lässt sie von der aktuellen Stelle aus zurücklaufen.
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
  const { chat, meldeNeueHuelle } = useChatZugang();
  useEffect(() => meldeNeueHuelle(), [meldeNeueHuelle]);

  const offen = chat.open;
  // Der Inhalt entsteht vor dem ersten Öffnen (in einer ruhigen Minute) und bleibt dann.
  const [gebaut, setGebaut] = useState(false);
  // Wie viele Nachrichten schon da waren, als der Inhalt entstand: Die stehen einfach da. Nur eine
  // frische Begrüßung (noch kein Gespräch) entschlüsselt sich, und zwar erst, wenn sich der Inhalt
  // beim ersten Öffnen aufbaut.
  const [alt, setAlt] = useState<number | null>(null);
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
  if (gebaut && alt === null) setAlt(chat.messages.length <= 1 ? 0 : chat.messages.length);

  const wurzel = useRef<HTMLDivElement>(null);
  const rahmen = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLDivElement>(null);
  const glut = useRef<HTMLSpanElement>(null);
  const schein = useRef<HTMLSpanElement>(null);
  const kugelSchatten = useRef<HTMLSpanElement>(null);
  const kugelLogo = useRef<HTMLSpanElement>(null);
  const punkt = useRef<HTMLSpanElement>(null);
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
  const lage = useRef<Lage>({ f: 0, i: 0, l: 1, k: 0, p: 0, q: 0, h: 0 });
  const lauf = useRef<gsap.core.Timeline | null>(null);
  const warOffen = useRef(false);
  const knopf = useRef<HTMLElement | null>(null);
  const handy = useRef(false);
  const uhr = useRef(0);
  // Was `male` zuletzt gesetzt hat (je Teil und Eigenschaft).
  const gemalt = useRef<Record<string, string>>({});

  /** Zeichnet den Stand von `lage`: erst messen (Rahmen und Chat-Knopf), dann alles setzen. */
  const male = useCallback(() => {
    const r = rahmen.current;
    const fo = form.current;
    const bl = blatt.current;
    if (!r || !fo || !bl) return;
    const s = lage.current;
    const R = r.getBoundingClientRect();
    const K = knopf.current?.getBoundingClientRect();
    const B = Math.max(1, R.width);
    const H = Math.max(1, R.height);
    const da = !!K && K.width > 0;
    // Mitte und Größe des Chat-Knopfs, bezogen auf den Rahmen des Fensters.
    const d0 = da ? K.width : KUGEL;
    const kx = da ? K.left + K.width / 2 - R.left : B - 40;
    const ky = da ? K.top + K.height / 2 - R.top : H - 40;

    const f = s.f;
    const f01 = klemme(f);
    // Die Kugel hebt sich beim Öffnen leicht an und wird eine Spur größer.
    const hebt = s.h * (1 - f01);
    const d = d0 * (1 + 0.07 * hebt);
    const breit = d + (B - d) * f;
    const hoch = d + (H - d) * f;
    const sx = breit / B;
    const sy = hoch / H;
    // Die Mitte wandert von der Mitte des Fensters zur Mitte des Knopfs.
    const mx = (kx - B / 2) * (1 - f);
    const my = (ky - 6 * hebt - H / 2) * (1 - f);
    // Die Ecken werden immer runder: vom Radius des Fensters bis zum Kreis.
    const ecke = (Math.min(breit, hoch) / 2) * (1 - (1 - ECKE / (Math.min(B, H) / 2)) * f01);
    // Am Handy ist das offene Blatt unten eckig.
    const unten = handy.current ? ecke * (1 - weich(f01)) : ecke;
    const rx = (wert: number) => `${(wert / sx).toFixed(2)}px`;
    const ry = (wert: number) => `${(wert / sy).toFixed(2)}px`;
    // Geschrieben wird nur, was sich geändert hat: So rechnet der Browser je Bild nur die Teile
    // neu, die sich in dieser Phase wirklich bewegen.
    const alt = gemalt.current;
    const stil = (el: HTMLElement | null, name: string, wert: string) => {
      const schluessel = `${el?.className}|${name}`;
      if (!el || alt[schluessel] === wert) return;
      alt[schluessel] = wert;
      if (name.startsWith("--")) el.style.setProperty(name, wert);
      else el.style[name as "transform" | "borderRadius" | "opacity" | "filter" | "visibility"] = wert;
    };
    stil(fo, "transform", `translate3d(${mx.toFixed(2)}px, ${my.toFixed(2)}px, 0) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`);
    stil(fo, "borderRadius", `${rx(ecke)} ${rx(ecke)} ${rx(unten)} ${rx(unten)} / ${ry(ecke)} ${ry(ecke)} ${ry(unten)} ${ry(unten)}`);
    // Rand, Lichtkante und Unschärfe gleichen die Verkleinerung aus: Der Goldrand bleibt 1 px fein.
    stil(fo, "--rx", (1 / sx).toFixed(4));
    stil(fo, "--ry", (1 / sy).toFixed(4));
    stil(fo, "--kd", `${d.toFixed(2)}px`);
    stil(fo, "--fw", klemme(f * 3).toFixed(3));
    stil(fo, "--fs", (f01 * f01).toFixed(3));
    stil(fo, "--cf-blur", `${Math.min(170, (16 + 2 * f01) / Math.sqrt(sx * sy)).toFixed(1)}px`);
    stil(glut.current, "opacity", ((1 - s.i) * Math.pow(f01, 1.5) * 0.9).toFixed(3));

    // Der Inhalt verdichtet sich zur Mitte, wird kleiner und leicht unscharf.
    // (Bewusst nur die Deckkraft, nicht „visibility“: Die vererbt sich und ließe den Browser bei
    // jedem Umschalten den ganzen Inhalt neu durchrechnen. Bedienbar ist der Inhalt ohnehin erst,
    // wenn er sich aufbaut: Stylesheet, `data-lauf`.)
    const i = klemme(s.i);
    stil(bl, "opacity", i.toFixed(3));
    stil(bl, "transform", i < 0.999 ? `scale(${(0.84 + 0.16 * i).toFixed(4)})` : "");
    stil(bl, "filter", i > 0.001 && i < 0.999 ? `blur(${((1 - i) * 5).toFixed(2)}px)` : "");
    stil(schein.current, "opacity", (0.42 * i).toFixed(3));

    // Was nur zur Kugel gehört (ihr Schatten, ihr Logo), sitzt auf der Mitte der Form. Ist die Form
    // schon ein Stück gewachsen, sind beide unsichtbar und werden nicht mehr mitbewegt.
    const cx = B / 2 + mx;
    const cy = H / 2 + my;
    const anKugel = `translate3d(${(cx - KUGEL / 2).toFixed(2)}px, ${(cy - KUGEL / 2).toFixed(2)}px, 0) scale(${(d / KUGEL).toFixed(4)})`;
    const schatten = 1 - klemme(f * 4);
    stil(kugelSchatten.current, "opacity", schatten.toFixed(3));
    if (schatten > 0) stil(kugelSchatten.current, "transform", anKugel);
    const logo = 1 - klemme(f * 5);
    stil(kugelLogo.current, "visibility", logo > 0 ? "" : "hidden");
    if (logo > 0) {
      stil(kugelLogo.current, "opacity", logo.toFixed(3));
      stil(kugelLogo.current, "transform", anKugel);
      stil(kugelLogo.current, "--l", klemme(s.l).toFixed(3));
      stil(kugelLogo.current, "--k", klemme(s.k).toFixed(3));
    }
    // Der Lichtpunkt wandert von der Kugel dorthin, wo die Begrüßung beginnt.
    const hell = klemme(s.p);
    stil(punkt.current, "opacity", hell.toFixed(3));
    if (hell > 0) {
      const px = cx + (46 - cx) * s.q;
      const py = cy + (112 - cy) * s.q;
      stil(punkt.current, "transform", `translate3d(${(px - 60).toFixed(2)}px, ${(py - 60).toFixed(2)}px, 0) scale(${(0.3 + 0.7 * s.p).toFixed(3)})`);
    }
  }, []);

  /** Der Inhalt baut sich auf: Ab jetzt ist das Fenster bedienbar. */
  const aufbau = useCallback(() => {
    const el = wurzel.current;
    if (!el) return;
    delete el.dataset.lauf;
    el.dataset.auf = "1";
    setAufNr((n) => n + 1);
  }, []);

  useLayoutEffect(() => {
    const el = wurzel.current;
    if (!el || offen === warOffen.current) return;
    warOffen.current = offen;
    const html = document.documentElement;
    const s = lage.current;
    knopf.current = document.querySelector<HTMLElement>(".ag-chat__kugel");
    handy.current = window.matchMedia("(max-width: 767px)").matches;
    lauf.current?.kill();
    lauf.current = null;
    window.clearTimeout(uhr.current);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ganzZu = () => {
      delete el.dataset.da;
      delete el.dataset.lauf;
      html.classList.remove(FENSTER_AN);
      if (rahmen.current) rahmen.current.style.transform = "";
    };

    if (offen) {
      delete el.dataset.warm;
      el.dataset.da = "1";
      html.classList.add(FENSTER_AN);
      if (still) {
        // „Weniger Bewegung“: Das Fenster blendet nur weich ein (Stylesheet), alles steht da.
        Object.assign(s, { f: 1, i: 1, l: 0, k: 0, p: 0, q: 1, h: 0 });
        male();
        uhr.current = window.setTimeout(aufbau, 0);
        return;
      }
      el.dataset.lauf = "auf";
      // Die Kugel des Fensters sitzt im selben Bild auf dem Chat-Knopf, in dem der verschwindet.
      male();
      const tl = gsap.timeline({ onUpdate: male });
      // 1. Kugel wird Licht: Sie hebt sich leicht, das Logo zieht sich zum hellen Punkt zusammen.
      tl.to(s, { k: 1, p: 1, h: 1, duration: 0.2 * (1 - s.k) + 0.001, ease: "power2.in" }, 0);
      tl.set(s, { l: 0 });
      // 2. Kugel wird Viereck: weich auslaufend, mit einer leichten Feder am Ende.
      tl.to(s, { f: 1, duration: 0.5 * (0.35 + 0.65 * (1 - klemme(s.f))), ease: "back.out(0.9)" }, ">-0.05");
      tl.to(s, { h: 0, duration: 0.3, ease: "power1.out" }, "<");
      tl.to(s, { q: 1, duration: 0.42, ease: "power2.inOut" }, "<0.04");
      // 3. Der Inhalt baut sich auf (die einzelnen Teile nacheinander: Stylesheet).
      tl.call(aufbau, undefined, ">-0.06");
      tl.to(s, { i: 1, duration: 0.3 * (1 - s.i) + 0.001, ease: "power2.out" }, "<");
      tl.to(s, { p: 0, duration: 0.34, ease: "power1.in" }, "<0.06");
      lauf.current = tl;
      return;
    }

    delete el.dataset.auf;
    if (still) {
      uhr.current = window.setTimeout(() => {
        Object.assign(s, { f: 0, i: 0, l: 1, k: 0, p: 0, q: 0, h: 0 });
        ganzZu();
      }, 220);
      return;
    }
    el.dataset.lauf = "zu";
    const tl = gsap.timeline({ onUpdate: male, onComplete: ganzZu });
    // 1. Der Inhalt verdichtet sich und löst sich in einen goldenen Schein auf.
    const weg = 0.25 * s.i;
    tl.to(s, { i: 0, duration: weg + 0.001, ease: "power2.in" }, 0);
    tl.to(s, { k: 0, p: 0, h: 0, q: 0, duration: 0.14, ease: "power1.out" }, 0);
    // 2. Der Rahmen wird zur Kugel: Er schrumpft von allen Seiten zum Chat-Knopf hin.
    tl.to(s, { f: 0, duration: 0.36 * (0.3 + 0.7 * klemme(s.f)), ease: "power2.inOut" }, Math.max(0, weg - 0.07));
    // 3. In der Kugel erscheint das Logo: erst der Stern, dann die vier Balken, dann ist sie der Knopf.
    tl.to(s, { l: 1, duration: 0.26 * (1 - klemme(s.l)) + 0.001, ease: "none" }, ">-0.2");
    lauf.current = tl;
  }, [offen, male, aufbau]);
  // Vorzeichnen: Nach dem Start der Seite, in einer ruhigen Sekunde, steht das Fenster zwei Bilder
  // lang fertig da, aber praktisch unsichtbar (1 % Deckkraft, nicht bedienbar). So hat der Browser
  // Glas, Schatten und Bilder schon einmal gezeichnet, und das erste Öffnen stockt nicht.
  useEffect(() => {
    const el = wurzel.current;
    if (!gebaut || !el || warOffen.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const s = lage.current;
    let leer = 0;
    let bild1 = 0;
    let bild2 = 0;
    let warm = false;
    const zurueck = () => {
      if (!warm) return;
      warm = false;
      delete el.dataset.warm;
      // Hat der Besucher inzwischen geöffnet, gehört die Form schon dem Öffnen.
      if (warOffen.current || el.dataset.da) return;
      Object.assign(s, { f: 0, i: 0, l: 1, k: 0, p: 0, q: 0, h: 0 });
      male();
    };
    const zeichnen = () => {
      if (warOffen.current || el.dataset.da) return;
      warm = true;
      knopf.current = document.querySelector<HTMLElement>(".ag-chat__kugel");
      handy.current = window.matchMedia("(max-width: 767px)").matches;
      Object.assign(s, { f: 1, i: 1, l: 0.5, k: 0, p: 0.6, q: 1, h: 0 });
      male();
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
  }, [gebaut, male]);
  // Ändert sich die Größe des Fensters, während es offen ruht, sitzt die Form wieder richtig.
  useEffect(() => {
    if (!offen) return;
    const neu = () => {
      handy.current = window.matchMedia("(max-width: 767px)").matches;
      if (!lauf.current?.isActive()) male();
    };
    window.addEventListener("resize", neu);
    return () => window.removeEventListener("resize", neu);
  }, [offen, male]);
  useEffect(
    () => () => {
      lauf.current?.kill();
      window.clearTimeout(uhr.current);
      document.documentElement.classList.remove(FENSTER_AN);
    },
    [],
  );

  // Immer am Ende des Verlaufs bleiben: bei jeder neuen Nachricht, und auch wenn der Inhalt
  // nachträglich wächst (die Blase wächst, unter einer Antwort erscheinen Knöpfe, im Ticket ein
  // Hinweis). Hat der Besucher selbst hochgescrollt, bleibt die Liste, wo er sie hingestellt hat.
  const amEnde = useRef(true);
  useEffect(() => {
    const el = liste.current;
    if (!el) return;
    amEnde.current = true;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.streaming, chat.handoff, chat.error, offen, begruessungSteht]);
  useEffect(() => {
    const el = liste.current;
    const inhalt = el?.firstElementChild;
    if (!el || !inhalt || !gebaut) return;
    const gescrollt = () => {
      amEnde.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    };
    const waechter = new ResizeObserver(() => {
      if (amEnde.current) el.scrollTop = el.scrollHeight;
    });
    waechter.observe(inhalt);
    el.addEventListener("scroll", gescrollt, { passive: true });
    return () => {
      waechter.disconnect();
      el.removeEventListener("scroll", gescrollt);
    };
  }, [gebaut]);

  // Der Inhalt baut sich auf: Name und Rolle setzen sich aus Zeichen zusammen; am Computer bekommt
  // das Eingabefeld den Fokus (am Handy nicht: Dort schöbe die Tastatur sofort Begrüßung und
  // Vorschläge weg).
  useEffect(() => {
    if (!offen || !aufNr) return;
    const abbruch: (() => void)[] = [];
    wurzel.current?.querySelectorAll<HTMLElement>(".ag-cf__kopf .ag-wuerfel").forEach((el) => abbruch.push(enthuelleText(el, 520)));
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) eingabe.current?.focus({ preventScroll: true });
    return () => abbruch.forEach((a) => a());
  }, [offen, aufNr, mitTeam]);

  // Schließen: Esc, und der Fokus geht zurück zum Chat-Knopf.
  const schliessen = useCallback(() => {
    chat.setOpen(false);
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
    if (!wurzel.current?.dataset.lauf) return;
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
    if (!form.current) return;
    return glimme(form.current);
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
  const senden = () => {
    if (!chat.input.trim() || chat.streaming) return;
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
        {/* Der Schatten der Kugel (wie der des Chat-Knopfs). */}
        <span ref={kugelSchatten} className="ag-cf__kugelschatten" aria-hidden="true" />
        {/* Hinter dem Glas: ganz schwach der Logo-Stern als Lichtschein. */}
        <span ref={schein} className="ag-cf__schein" aria-hidden="true" />
        {/* Die Form: Glas und Goldrand. Sie ist offen das Fenster und zu die Kugel auf dem Chat-Knopf. */}
        <div ref={form} className="ag-cf__form" data-glimm onClick={umkehren} aria-hidden="true">
          <span className="ag-cf__schatten" />
          <span className="ag-cf__glas" />
          <span ref={glut} className="ag-cf__glut" />
          <span className="ag-cf__kante" />
        </div>
        {/* In der Kugel: unser Logo (erst der Stern, dann die vier Balken), zuletzt das Licht des Knopfs. */}
        <span ref={kugelLogo} className="ag-cf__kugellogo" aria-hidden="true">
          <i className="ag-cf__kugellicht" />
          <GoldLogo kennung="ag-cf-gold-kugel" />
        </span>
        {/* Der Lichtpunkt, zu dem sich das Logo beim Öffnen zusammenzieht. */}
        <span ref={punkt} className="ag-cf__punkt" aria-hidden="true" />
        <div ref={blatt} className="ag-cf__blatt" role="dialog" aria-label={t.titel} aria-hidden={!offen} inert={!offen}>
          {gebaut && (
            <>
              <header className="ag-cf__kopf" onPointerDown={zugAn} onPointerMove={zugLauf} onPointerUp={zugEnde} onPointerCancel={zugEnde}>
                <span className="ag-cf__griff" aria-hidden="true" />
                {/* Unser Logo: der vierzackige Stern mit den vier schrägen Balken, in Gold. */}
                <span className="ag-cf__logo" aria-hidden="true">
                  <GoldLogo kennung="ag-cf-gold-kopf" />
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
                      <div key={`n-${i}`} className="ag-cf__zeile ag-cf__zeile--ich">
                        <div className="ag-cf__blase ag-cf__blase--ich">
                          <Eigene text={m.content} animiert={offen && !vorDemErsten && animiert(i)} />
                        </div>
                      </div>
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
                        {(m.anrufen || (m.mitarbeiter && mitarbeiterMoeglich)) && <Angebot anrufen={!!m.anrufen} mitarbeiter={!!m.mitarbeiter && mitarbeiterMoeglich} beiMitarbeiter={oeffneTicket} />}
                      </AntwortZeile>
                    ),
                  )}
                  {chat.error && (
                    <p className="ag-cf__fehler" role="alert">
                      {chat.error}
                    </p>
                  )}

                  {/* Die drei Vorschläge: nur solange noch nichts gefragt wurde. Sie erscheinen, sobald die Begrüßung steht. */}
                  {zeigeVorschlaege && <Vorschlaege key={aufNr} da={begruessungSteht && aufNr > 0} spielt={!ruhig} beiWahl={waehle} />}

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
                <div className="ag-cf__feld" data-text={chat.input.trim() ? "" : undefined}>
                  <textarea
                    ref={eingabe}
                    value={chat.input}
                    onChange={(ev) => chat.setInput(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" && !ev.shiftKey) {
                        ev.preventDefault();
                        senden();
                      }
                    }}
                    rows={1}
                    aria-label={mitTeam ? t.eingabeTeam : t.eingabe}
                  />
                  {!chat.input && <Platzhalter texte={mitTeam ? [t.platzTeam] : t.platz} laeuft={offen && !ruhig} />}
                  <button type="button" className="ag-cf__senden" aria-label={t.senden} disabled={chat.streaming || !chat.input.trim()} onClick={senden}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 1.5c.9 7.2 3.3 9.6 10.5 10.5-7.2.9-9.6 3.3-10.5 10.5C11.1 15.3 8.7 12.9 1.5 12 8.7 11.1 11.1 8.7 12 1.5Z" />
                    </svg>
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

/** Unser Logo in Gold: der vierzackige Stern mit den vier schrägen Balken (Marke.tsx). */
function GoldLogo({ kennung }: { kennung: string }) {
  return (
    <svg viewBox="-50 -50 100 100" fill={`url(#${kennung})`} aria-hidden="true">
      <defs>
        <linearGradient id={kennung} gradientUnits="userSpaceOnUse" x1="-46" y1="-46" x2="46" y2="46">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.45" stopColor="#f3d27a" />
          <stop offset="1" stopColor="#d4a23c" />
        </linearGradient>
      </defs>
      <LogoFormen />
    </svg>
  );
}

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
function AnrufKarte({ stil }: { stil?: CSSProperties }) {
  const karte = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!karte.current) return;
    return glimme(karte.current);
  }, []);
  return (
    <div ref={karte} className="ag-cf__anruf ag-glimm" style={stil} data-glimm>
      <span className="ag-cf__anruf-status">
        <i aria-hidden="true" />
        {kontakt.anrufStatus}
      </span>
      <a className="ag-cf__anruf-nummer" href={`tel:${marke.telefon}`}>
        {marke.telefonAnzeige}
      </a>
      <a className="ag-cf__gold ag-cf__anruf-knopf" href={`tel:${marke.telefon}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6.6 3.8h2.6l1.5 4-1.9 1.4a11.2 11.2 0 0 0 5.9 5.9l1.4-1.9 4 1.5v2.6a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 6a2 2 0 0 1 2-2.2Z" />
        </svg>
        {t.anrufen}
      </a>
    </div>
  );
}

/**
 * Was der Assistent unter einer Antwort anbietet. Bei [ANRUFEN] die Anruf-Karte, bei [MITARBEITER]
 * der Glasknopf; bei beiden erst die Karte, dann eine kleine Zeile und der Knopf. Es blendet weich
 * ein, nacheinander.
 */
function Angebot({ anrufen, mitarbeiter, beiMitarbeiter }: { anrufen: boolean; mitarbeiter: boolean; beiMitarbeiter: () => void }) {
  const nr = (n: number) => ({ "--n": n }) as CSSProperties;
  return (
    <div className="ag-cf__angebot">
      {anrufen && <AnrufKarte stil={nr(0)} />}
      {anrufen && mitarbeiter && (
        <p className="ag-cf__klein ag-cf__weiter" style={nr(1)}>
          {t.weitereFragen}
        </p>
      )}
      {mitarbeiter && <MitarbeiterKnopf beiKlick={beiMitarbeiter} stil={nr(anrufen ? 2 : 0)} />}
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
function Vorschlaege({ da, spielt, beiWahl }: { da: boolean; spielt: boolean; beiWahl: (frage: string, knopf: HTMLElement) => void }) {
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
    <div ref={reihe} className="ag-cf__vorschlaege" data-da={da}>
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
  useEffect(() => {
    if (!laeuft || !viele || nr === 0 || !huelle.current) return;
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
