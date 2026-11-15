"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { leistungen, leistungenKopf, szeneZu, szenen, type Leistung, type SzenenArt } from "@/lib/inhalt-neu";
import { richteGlimmrandEin } from "../glimmrand";
import { MITTE_EREIGNIS, meldeMitte } from "../mitte";
import { AuswahlKnopf, LeistungsZeichen } from "../Leistungsteile";
import { Zeilen } from "../Zeilen";
import { istVorschau } from "../umgebung";
import { Entschluesselt } from "./Entschluesselt";
import { ZeichenNummer } from "./ZeichenNummer";

type Lage = [x: number, y: number, drehung: number, deckkraft: number];

/**
 * Eine Ebene der Szene: Sie hat eine Ruhe-Lage und eine Hover-Lage (Versatz zur Mitte der Szene in
 * Pixeln, Drehung in Grad, Deckkraft). Das Stylesheet lässt sie federnd von der einen in die
 * andere springen, jede Ebene 35 ms nach der vorigen (`i`); `spaeter` verzögert zusätzlich.
 */
function Ebene({ i, ruhe, hover, spaeter = 0, className, children }: { i: number; ruhe: Lage; hover: Lage; spaeter?: number; className?: string; children: ReactNode }) {
  const stil = {
    "--i": i,
    "--spaeter": `${spaeter}ms`,
    "--rx": `${ruhe[0]}px`,
    "--ry": `${ruhe[1]}px`,
    "--rr": `${ruhe[2]}deg`,
    "--rd": ruhe[3],
    "--hx": `${hover[0]}px`,
    "--hy": `${hover[1]}px`,
    "--hr": `${hover[2]}deg`,
    "--hd": hover[3],
  } as CSSProperties;
  return (
    <div className={`ag-sz__ebene ${className ?? ""}`} style={stil}>
      {children}
    </div>
  );
}

/** Gezeichnetes Häkchen (zieht sich beim Hover). */
function Haken() {
  return (
    <svg className="ag-sz__haken" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 10.5 8.5 14.5 15.5 6" pathLength="1" />
    </svg>
  );
}

/** Kleines Schild „Beispiel“: Die Zahlen in den Szenen sind keine Versprechen. */
function Beispiel() {
  return <span className="ag-sz__beispiel ag-mono">{szenen.beispiel}</span>;
}

const SZENEN: Record<SzenenArt, () => ReactNode> = {
  // Websites: Browserfenster, „Anfragen +38 %“ zählt hoch, die Linie steigt.
  web: () => (
    <>
      <Ebene i={0} ruhe={[-14, 16, -3, 1]} hover={[-26, 8, 0, 1]} className="ag-sz__fenster">
        <span className="ag-sz__leiste">
          <i />
          <i />
          <i />
          <b className="ag-mono">{szenen.web.adresse}</b>
        </span>
        <span className="ag-sz__zeilen">
          <i />
          <i />
          <i />
        </span>
      </Ebene>
      <Ebene i={1} ruhe={[78, 44, 5, 0]} hover={[86, 36, 2, 1]} className="ag-sz__karte ag-sz__kurve">
        <svg viewBox="0 0 120 56" aria-hidden="true">
          <path d="M4 50C24 48 34 40 48 36S70 30 82 18S104 8 116 5" pathLength="1" />
        </svg>
      </Ebene>
      <Ebene i={2} ruhe={[70, -80, 5, 0.3]} hover={[-74, -64, -3, 1]} className="ag-sz__marke">
        <span>
          {szenen.web.wort} <strong>+<b data-zahl={szenen.web.zahl}>0</b> %</strong>
        </span>
        <Beispiel />
      </Ebene>
    </>
  ),
  // Chatbot: zwei Sprechblasen, Tipp-Punkte, die Antwort erscheint.
  chat: () => (
    <>
      <Ebene i={0} ruhe={[-34, -38, -2, 1]} hover={[-44, -48, 0, 1]} className="ag-sz__blase">
        {szenen.chat.frage}
      </Ebene>
      <Ebene i={1} ruhe={[74, 26, 2, 1]} hover={[74, 30, 0, 0]} className="ag-sz__blase ag-sz__blase--tippt">
        <i />
        <i />
        <i />
      </Ebene>
      <Ebene i={2} spaeter={220} ruhe={[42, 44, 4, 0]} hover={[36, 32, 0, 1]} className="ag-sz__blase ag-sz__blase--antwort">
        {szenen.chat.antwort}
      </Ebene>
    </>
  ),
  // Voice-Agent: Der Hörer klingelt, der Assistent nimmt ab, dann „Termin eingetragen“.
  voice: () => (
    <>
      <Ebene i={0} ruhe={[-104, 2, 0, 1]} hover={[-112, -6, -10, 1]} className="ag-sz__hoerer">
        <LeistungsZeichen nr={2} />
      </Ebene>
      <Ebene i={1} ruhe={[44, -16, 2, 0.45]} hover={[40, -30, 0, 1]} className="ag-sz__karte ag-sz__ansage">
        {szenen.voice.klingelt}
      </Ebene>
      <Ebene i={2} spaeter={420} ruhe={[62, 50, 5, 0]} hover={[54, 40, 0, 1]} className="ag-sz__marke ag-sz__marke--fertig">
        <span>{szenen.voice.fertig}</span>
        <Haken />
      </Ebene>
    </>
  ),
  // Terminbuchung: Kalender, ein Tag leuchtet golden, „Gebucht“.
  termin: () => (
    <>
      <Ebene i={0} ruhe={[-8, 8, -2, 1]} hover={[-30, 2, 0, 1]} className="ag-sz__karte ag-sz__kalender">
        <b className="ag-mono">{szenen.termin.monat}</b>
        <span className="ag-sz__tage">
          {szenen.termin.tage.map((t) => (
            <em key={t} className="ag-mono">
              {t}
            </em>
          ))}
          {Array.from({ length: 21 }, (_, n) => (
            <i key={n} data-tag={n === 10 ? "gewaehlt" : undefined}>
              {n + 5}
            </i>
          ))}
        </span>
      </Ebene>
      <Ebene i={1} ruhe={[92, -50, -4, 0.3]} hover={[104, -58, -2, 1]} className="ag-sz__marke">
        <span className="ag-mono">10:30</span>
      </Ebene>
      <Ebene i={2} spaeter={260} ruhe={[94, 52, 6, 0]} hover={[98, 44, 2, 1]} className="ag-sz__marke ag-sz__marke--fertig">
        <span>{szenen.termin.fertig}</span>
        <Haken />
      </Ebene>
    </>
  ),
  // Automatisierungen: Kärtchen ordnen sich, „Stunden gespart“ zählt hoch.
  auto: () => (
    <>
      {szenen.auto.karten.map((k, n) => (
        <Ebene
          key={k}
          i={n}
          ruhe={[[-74, -18, -13, 1], [14, 34, 9, 1], [-28, 58, -5, 1]][n] as Lage}
          hover={[[-96, 30, 0, 1], [0, 30, 0, 1], [96, 30, 0, 1]][n] as Lage}
          className="ag-sz__karte ag-sz__zettel"
        >
          <i />
          {k}
        </Ebene>
      ))}
      <Ebene i={3} ruhe={[58, -54, 5, 0.3]} hover={[0, -50, 0, 1]} className="ag-sz__marke">
        <span>
          <strong>
            <b data-zahl={szenen.auto.zahl}>0</b>
          </strong>{" "}
          {szenen.auto.einheit}
        </span>
        <Beispiel />
      </Ebene>
    </>
  ),
  // KI-Beratung: Die Checkliste hakt sich ab.
  rat: () => (
    <Ebene i={0} ruhe={[0, 8, 2, 1]} hover={[0, 0, 0, 1]} className="ag-sz__karte ag-sz__liste">
      {szenen.rat.punkte.map((p) => (
        <span key={p}>
          <Haken />
          {p}
        </span>
      ))}
    </Ebene>
  ),
};

/** Zählt alle Zahlen der Karte hoch (1,1 s, weich auslaufend) oder setzt sie zurück. */
function zaehle(karte: HTMLElement, hoch: boolean, sofort: boolean) {
  karte.querySelectorAll<HTMLElement>("[data-zahl]").forEach((feld) => {
    const ziel = Number(feld.dataset.zahl) || 0;
    const stand = { n: Number(feld.textContent) || 0 };
    gsap.killTweensOf(stand);
    const alt = (feld as HTMLElement & { agLauf?: gsap.core.Tween }).agLauf;
    alt?.kill();
    if (sofort || !hoch) {
      feld.textContent = String(hoch ? ziel : 0);
      return;
    }
    (feld as HTMLElement & { agLauf?: gsap.core.Tween }).agLauf = gsap.to(stand, {
      n: ziel,
      duration: 1.1,
      ease: "power3.out",
      delay: 0.15,
      onUpdate: () => {
        feld.textContent = String(Math.round(stand.n));
      },
    });
  });
}

function Karte({ l }: { l: Leistung }) {
  const ref = useRef<HTMLLIElement>(null);
  const art = szeneZu[l.titel] ?? "web";
  const Szene = SZENEN[art];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fein = window.matchMedia("(hover: hover) and (pointer: fine)");
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const schalte = (an: boolean, sofort = false) => {
      if (an) el.dataset.an = "1";
      else delete el.dataset.an;
      zaehle(el, an, sofort);
    };
    // „Weniger Bewegung“ und Vorschau: sofort das Endbild.
    if (ruhig.matches || istVorschau()) {
      schalte(true, true);
      return () => schalte(false, true);
    }
    if (fein.matches) {
      // Computer: Die Szene spielt beim Drüberfahren (und wenn ein Knopf der Karte den Fokus hat).
      const rein = () => schalte(true);
      const raus = () => schalte(false);
      const fokusRaus = (ev: FocusEvent) => {
        if (!el.contains(ev.relatedTarget as Node | null)) schalte(false);
      };
      el.addEventListener("pointerenter", rein);
      el.addEventListener("pointerleave", raus);
      el.addEventListener("focusin", rein);
      el.addEventListener("focusout", fokusRaus);
      return () => {
        el.removeEventListener("pointerenter", rein);
        el.removeEventListener("pointerleave", raus);
        el.removeEventListener("focusin", rein);
        el.removeEventListener("focusout", fokusRaus);
        schalte(false, true);
      };
    }
    // Handy: Die Szene spielt, solange die Karte in der Mitte des Bildschirms steht (immer höchstens
    // eine Karte, Leistungen meldet es über MITTE_EREIGNIS). Scrollt man weiter, springt sie zurück in
    // die Ruhe-Lage; kommt man zurück, spielt sie von vorn. Wie mit der Maus von Karte zu Karte.
    const mitte = (ev: Event) => schalte((ev as CustomEvent<boolean>).detail === true);
    el.addEventListener(MITTE_EREIGNIS, mitte);
    return () => {
      el.removeEventListener(MITTE_EREIGNIS, mitte);
      schalte(false, true);
    };
  }, []);

  return (
    <li ref={ref} className="ag-lk ag-glimm" data-glimm data-art={art}>
      <div className="ag-sz" aria-hidden="true">
        <Szene />
      </div>
      <div className="ag-lk__text">
        <ZeichenNummer text={l.nr} className="ag-lk__nr" />
        <h3 className="ag-versal ag-lk__titel">{l.titel}</h3>
        <p className="ag-lk__kurz">{l.kurz}</p>
        <p className="ag-lk__lang">{l.text}</p>
        <ul className="ag-punkte">
          {l.punkte.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <AuswahlKnopf titel={l.titel} />
      </div>
    </li>
  );
}

/**
 * Leistungen als sechs Karten. Jede hat oben eine gezeichnete Szene aus mehreren Ebenen, die beim
 * Drüberfahren federnd in ihre zweite Lage springen (am Handy, solange die Karte in der Mitte des
 * Bildschirms steht); Zahlen zählen dabei hoch. Die Nummer der Karte ist ein kleines Zeichen-Bild. Beim
 * Drüberfahren hebt sich die Karte leicht, und ihr Goldrand glimmt nahe der Maus.
 */
export function Leistungen() {
  const liste = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!liste.current) return;
    return richteGlimmrandEin(liste.current);
  }, []);
  // Handy (ohne Maus): Die Karte in der Mitte des Bildschirms spielt ihre Szene (mitte.ts).
  useEffect(() => {
    const el = liste.current;
    if (!el || istVorschau() || window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return meldeMitte(Array.from(el.querySelectorAll<HTMLElement>(":scope > .ag-lk")));
  }, []);

  return (
    <div className="ag-wrap ag-abschnitt">
      <header className="ag-kopfzeile">
        <Entschluesselt als="h2" className="ag-versal ag-titel">
          {leistungenKopf.vor} <em className="ag-gold ag-leuchtet">{leistungenKopf.gold}</em> {leistungenKopf.nach}
        </Entschluesselt>
        <Zeilen als="p" className="ag-text">
          {leistungenKopf.text}
        </Zeilen>
      </header>
      <ol ref={liste} className="ag-lks">
        {leistungen.map((l) => (
          <Karte key={l.titel} l={l} />
        ))}
      </ol>
    </div>
  );
}
