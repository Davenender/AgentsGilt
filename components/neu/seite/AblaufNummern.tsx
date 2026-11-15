"use client";

import { useEffect, useRef, useState } from "react";
import { ablauf } from "@/lib/inhalt-neu";
import { HANDY, istVorschau } from "../umgebung";
import { Entschluesselt } from "./Entschluesselt";
import { erzeugeZeichenbild, type Zeichenbild } from "./zeichenbild";

// So lange füllt sich die Überschrift eines Schritts mit Gold (dieselbe Dauer hat ag-abn-fuellen im Stylesheet) …
const FUELLEN_MS = 6000;
// … so lange bleibt sie danach ganz voll stehen, bevor der nächste Schritt kommt …
const VOLL_MS = 500;
// … und so lange bleibt ein angeklickter Schritt stehen, bevor der Lauf weitergeht.
const PAUSE_NACH_KLICK_MS = 6000;

/**
 * „So läuft es ab“ mit Zeichen-Nummern: Neben den drei Schritten steht die Nummer des aktiven
 * Schritts als großes Bild aus Schriftzeichen (zeichenbild.ts).
 *
 * Der Ablauf geht von selbst durch die Schritte, sobald er im Bild ist (wie auf der alten Seite):
 * Die Überschrift des aktiven Schritts füllt sich in 6 s von links nach rechts mit Gold, wie ein
 * Ladebalken in den Buchstaben, bis zum letzten Buchstaben. Dann bleibt sie 0,5 s ganz voll
 * stehen, erst danach kommt der nächste Schritt; nach Schritt 3 beginnt es wieder bei Schritt 1.
 * Die anderen Überschriften bleiben gedämpft. Mit jedem Wechsel fliegen die Zeichen der großen
 * Nummer zur neuen Nummer um.
 *
 * Ein Klick auf einen Schritt macht ihn aktiv und sofort ganz gefüllt, der Lauf pausiert (6 s).
 * Danach läuft er mit dem nächsten Schritt weiter. Bei „weniger Bewegung“ sind alle Überschriften
 * gefüllt, und es läuft nichts.
 *
 * Ist das Zeichen-Feld zu 60 % im Bild, setzt sich die Nummer aus Staub zusammen; scrollt sie
 * nach oben aus dem Bild, zerfällt sie wieder. Unter der Maus verwürfeln sich die Zeichen kurz.
 * Alle drei Schritte sind immer zu lesen.
 *
 * Am Handy (ohne Maus, entschieden am Gerät) gibt es die große Nummer nicht (seit dem 15.11.2026):
 * Sie wird gar nicht erst gezeichnet. Der Lauf durch die drei Schritte ist derselbe wie am Computer.
 */
export function AblaufNummern() {
  const leinwand = useRef<HTMLCanvasElement>(null);
  const innen = useRef<HTMLDivElement>(null);
  const bild = useRef<Zeichenbild | null>(null);
  const zustand = useRef({ da: false, gewaehlt: 0 });
  const [gewaehlt, setGewaehlt] = useState(0);
  // Zählt jeden Wechsel und jedes Wiederkommen ins Bild: Damit beginnt der Ladebalken von vorn.
  const [runde, setRunde] = useState(0);
  const [geklickt, setGeklickt] = useState(false);
  const [imBild, setImBild] = useState(false);
  // „Weniger Bewegung“ oder Vorschau: alles gefüllt, nichts läuft.
  const [still, setStill] = useState(false);
  // Am Handy: keine große Nummer (der Lauf ist derselbe).
  const [handy, setHandy] = useState(false);

  // Läuft überhaupt etwas, und ist der Ablauf im Bild?
  useEffect(() => {
    const el = innen.current;
    if (!el) return;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ohneMaus = window.matchMedia(HANDY);
    const stelle = () => {
      setStill(ruhig.matches || istVorschau());
      setHandy(ohneMaus.matches);
    };
    stelle();
    ruhig.addEventListener("change", stelle);
    ohneMaus.addEventListener("change", stelle);
    const waechter = new IntersectionObserver(
      (eintraege) => {
        const da = eintraege[eintraege.length - 1].intersectionRatio >= 0.35;
        setImBild((vorher) => {
          // Wieder im Bild: Der aktive Schritt beginnt von vorn.
          if (da && !vorher) setRunde((r) => r + 1);
          return da;
        });
      },
      { threshold: [0, 0.35] },
    );
    waechter.observe(el);
    return () => {
      ruhig.removeEventListener("change", stelle);
      ohneMaus.removeEventListener("change", stelle);
      waechter.disconnect();
    };
  }, []);

  // Der Lauf: 6 s füllen, 0,5 s voll stehen, dann der nächste Schritt (nach einem Klick nach 6 s).
  useEffect(() => {
    if (still || !imBild) return;
    const uhr = window.setTimeout(
      () => {
        setGeklickt(false);
        setGewaehlt((g) => (g + 1) % ablauf.schritte.length);
        setRunde((r) => r + 1);
      },
      geklickt ? PAUSE_NACH_KLICK_MS : FUELLEN_MS + VOLL_MS,
    );
    return () => window.clearTimeout(uhr);
  }, [still, imBild, geklickt, runde]);

  // Die große Nummer fliegt zur Nummer des aktiven Schritts um.
  useEffect(() => {
    zustand.current.gewaehlt = gewaehlt;
    if (zustand.current.da) bild.current?.zeige(gewaehlt);
  }, [gewaehlt]);

  useEffect(() => {
    const flaeche = leinwand.current;
    // Am Handy gibt es die große Nummer nicht: Dann wird auch nichts gezeichnet und nichts gerechnet.
    if (!flaeche || handy || window.matchMedia(HANDY).matches) return;
    const stil = getComputedStyle(flaeche);
    const still = istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const b = erzeugeZeichenbild(flaeche, { zelle: [7, 11], mono: stil.getPropertyValue("--font-mono-ag").trim() || "monospace", still });
    if (!b) return;
    bild.current = b;
    const serife = stil.getPropertyValue("--font-serife").trim() || "Georgia, serif";
    let vorbei = false;
    let uhr = 0;
    const einrichten = () => {
      const breite = flaeche.clientWidth;
      const hoehe = flaeche.clientHeight;
      if (breite < 2 || hoehe < 2) return;
      b.einrichten(
        breite,
        hoehe,
        ablauf.schritte.map((s) => (c, bb, hh) => {
          // Die Nummer in kursiver Serifenschrift, fast so hoch wie das Feld.
          c.font = `italic 400 ${Math.round(hh * 0.98)}px ${serife}`;
          c.textAlign = "center";
          c.textBaseline = "alphabetic";
          c.fillText(s.nr, bb * 0.48, hh * 0.84);
        }),
      );
      if (zustand.current.da || still) b.zeige(zustand.current.gewaehlt, true);
    };
    const schrift = document.fonts?.load ? document.fonts.load(`400 80px ${serife}`, "0123").catch(() => undefined) : Promise.resolve(undefined);
    schrift.then(() => {
      if (!vorbei) einrichten();
    });
    const groesse = new ResizeObserver(() => {
      window.clearTimeout(uhr);
      uhr = window.setTimeout(einrichten, 200);
    });
    groesse.observe(flaeche);
    // Zu 60 % im Bild: zusammensetzen. Nach oben aus dem Bild gescrollt: zerfallen.
    const waechter = new IntersectionObserver(
      (eintraege) => {
        const e = eintraege[eintraege.length - 1];
        b.sichtbar(e.isIntersecting);
        if (e.intersectionRatio >= 0.6) {
          if (!zustand.current.da) {
            zustand.current.da = true;
            b.zeige(zustand.current.gewaehlt);
          }
        } else if (zustand.current.da && e.boundingClientRect.top < 0 && e.intersectionRatio < 0.35 && !still) {
          zustand.current.da = false;
          b.zerfalle();
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );
    waechter.observe(flaeche);
    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = flaeche.getBoundingClientRect();
      b.zeiger(ev.clientX - r.left, ev.clientY - r.top, true);
    };
    const weg = () => b.zeiger(-9999, -9999, false);
    flaeche.addEventListener("pointermove", bewegt);
    flaeche.addEventListener("pointerleave", weg);
    return () => {
      vorbei = true;
      window.clearTimeout(uhr);
      groesse.disconnect();
      waechter.disconnect();
      flaeche.removeEventListener("pointermove", bewegt);
      flaeche.removeEventListener("pointerleave", weg);
      b.ende();
      bild.current = null;
    };
    // „still“ wechselt, wenn der Besucher „weniger Bewegung“ umstellt: Dann richtet sich das Zeichen-Bild neu ein.
  }, [still, handy]);

  // Klick: Dieser Schritt ist aktiv und sofort ganz gefüllt, der Lauf pausiert.
  const waehle = (nr: number) => {
    setGewaehlt(nr);
    setGeklickt(true);
    setRunde((r) => r + 1);
  };

  return (
    <div className="ag-wrap ag-abschnitt ag-abn">
      <header className="ag-kopfzeile">
        <Entschluesselt als="h2" className="ag-versal ag-titel">
          {ablauf.vor} <em className="ag-gold ag-leuchtet">{ablauf.gold}</em>
        </Entschluesselt>
      </header>
      <div ref={innen} className="ag-abn__innen">
        {/* Die große Nummer: am Handy gar nicht (das Stylesheet blendet sie dort schon vor dem Skript aus). */}
        {!handy && (
          <div className="ag-abn__bild" aria-hidden="true">
            <canvas ref={leinwand} className="ag-abn__zeichen" />
            <span className="ag-mono ag-abn__von">/ {String(ablauf.schritte.length).padStart(2, "0")}</span>
          </div>
        )}
        <ol className="ag-abn__liste">
          {ablauf.schritte.map((s, i) => (
            <li key={s.nr} data-gewaehlt={i === gewaehlt} data-voll={still || (i === gewaehlt && (geklickt || !imBild))}>
              <button type="button" aria-pressed={i === gewaehlt} onClick={() => waehle(i)}>
                <span className="ag-mono">{s.nr}</span>
                {/* Der Schlüssel wechselt mit jeder Runde: So beginnt der Ladebalken von vorn. */}
                <span key={i === gewaehlt ? `an-${runde}` : "aus"} className="ag-versal ag-abn__titel">
                  {s.titel}
                </span>
              </button>
              <p>{s.text}</p>
              {i === ablauf.schritte.length - 1 && <span className="ag-mono ag-abn__ziel">{ablauf.ziel}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
