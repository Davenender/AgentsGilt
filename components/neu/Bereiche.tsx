"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { site } from "@/lib/content";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ablauf, ausbildung, hero, kontakt, marke, wasWirMachen } from "@/lib/inhalt-neu";
import { Anfrage } from "./Anfrage";
import { AnrufLeiste, Knopf } from "./Knoepfe";
import { Schreibmaschine } from "./Schreibmaschine";
import { WortFarbe } from "./WortFarbe";
import { Zeilen } from "./Zeilen";
import { istVorschau, willWenigerBewegung } from "./umgebung";

gsap.registerPlugin(useGSAP, MotionPathPlugin);

/* ───────────── Was wir machen ───────────── */

export function WasWirMachen({ mitte = false }: { mitte?: boolean }) {
  return (
    <div className={`ag-wrap ag-abschnitt ag-machen ${mitte ? "ag-machen--mitte" : ""}`}>
      <Schreibmaschine />
      <WortFarbe className="ag-machen__text">{wasWirMachen.text}</WortFarbe>
      <p className="ag-fussnote">{wasWirMachen.fussnote}</p>
    </div>
  );
}

/* ───────────── So läuft es ab: der Gold-Tropfen ───────────── */

type Bahn = { pfad: string; hoehe: number; stationen: [number, number][] };

// Drei Formen derselben Idee: Eine einzige Lichtbahn trägt die drei Schritte,
// der Tropfen fließt auf ihr von Station zu Station.
const BAHNEN: Record<"welle" | "gerade" | "bogen", Bahn> = {
  welle: {
    hoehe: 500,
    pfad: "M20,220C60,140 100,120 150,120S420,270 600,270S900,120 1050,120S1160,170 1180,220",
    stationen: [[150, 120], [600, 270], [1050, 120]],
  },
  gerade: {
    hoehe: 540,
    pfad: "M30,58L1170,342",
    stationen: [[160, 90.4], [600, 200], [1040, 309.6]],
  },
  bogen: {
    hoehe: 440,
    pfad: "M60,330A540,270 0 0 1 1140,330",
    stationen: [[132.3, 195], [600, 60], [1067.7, 195]],
  },
};

export function Ablauf({ bahn = "welle", mitte = false }: { bahn?: keyof typeof BAHNEN; mitte?: boolean }) {
  const wurzel = useRef<HTMLDivElement>(null);
  const form = BAHNEN[bahn];

  useGSAP(
    () => {
      const el = wurzel.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      // Breite Bildschirme: Tropfen auf der Lichtbahn.
      mm.add("(min-width: 900px)", () => {
        const pfad = el.querySelector<SVGPathElement>(".ag-ablauf__bahn");
        const tropfen = gsap.utils.toArray<SVGGraphicsElement>(".ag-tropfen", el);
        const marken = gsap.utils.toArray<Element>(".ag-ablauf__bild .ag-ablauf__station, .ag-ablauf__schritt", el);
        if (!pfad) return;

        // Wo auf der Bahn liegt jede Station (0 bis 1)?
        const laenge = pfad.getTotalLength();
        const schwellen = form.stationen.map(([sx, sy]) => {
          let beste = 0;
          let abstand = Infinity;
          for (let i = 0; i <= 240; i++) {
            const p = pfad.getPointAtLength((laenge * i) / 240);
            const d = Math.hypot(p.x - sx, p.y - sy);
            if (d < abstand) {
              abstand = d;
              beste = i / 240;
            }
          }
          return beste;
        });
        const einrasten = (stand: number) => {
          marken.forEach((m) => {
            const nr = Number(m.getAttribute("data-nr"));
            m.classList.toggle("ist-da", stand >= schwellen[nr] - 0.015);
          });
        };
        const aufBahn = (start: number) => ({ path: pfad, align: pfad, alignOrigin: [0.5, 0.5], start, end: start });

        if (willWenigerBewegung() || istVorschau()) {
          // Endzustand: Tropfen am Ziel, alle Schritte eingerastet.
          gsap.set(tropfen, { motionPath: aufBahn(schwellen[2]) });
          einrasten(1);
          return;
        }

        gsap.set(tropfen, { motionPath: aufBahn(0) });
        const bereich = { trigger: el, start: "top 72%", end: "bottom 78%" };
        // Der Haupttropfen führt, zwei kleinere ziehen nach: So wirkt das Gold flüssig.
        // Der vierte Teil ist das Glanzlicht, es bleibt beim Haupttropfen.
        const nachlauf = [0.5, 0.95, 1.4, 0.5];
        tropfen.forEach((t, i) => {
          gsap.to(t, {
            motionPath: { path: pfad, align: pfad, alignOrigin: [0.5, 0.5], start: 0, end: schwellen[2] },
            ease: "none",
            scrollTrigger: { ...bereich, scrub: nachlauf[i] ?? 0.5 },
          });
        });
        ScrollTrigger.create({ ...bereich, onUpdate: (s) => einrasten(s.progress * schwellen[2]) });
      });

      // Handy: einfache senkrechte Linie mit einer Perle.
      mm.add("(max-width: 899px) and (prefers-reduced-motion: no-preference)", () => {
        const liste = el.querySelector<HTMLElement>(".ag-ablauf__schmal");
        const perle = el.querySelector<HTMLElement>(".ag-ablauf__perle");
        if (!liste || !perle || istVorschau()) return;
        gsap.to(perle, {
          y: () => liste.offsetHeight - 24,
          ease: "none",
          scrollTrigger: { trigger: liste, start: "top 65%", end: "bottom 65%", scrub: 0.4, invalidateOnRefresh: true },
        });
      });
    },
    { scope: wurzel, dependencies: [bahn] },
  );

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt ag-ablauf">
      <header className={`ag-kopfzeile ${mitte ? "ag-kopfzeile--mitte" : ""}`}>
        <Zeilen als="h2" className="ag-versal ag-titel">
          {ablauf.vor} <em className="ag-gold">{ablauf.gold}</em>
        </Zeilen>
      </header>

      <div className="ag-ablauf__bild" style={{ "--hoehe": form.hoehe } as CSSProperties}>
        <svg viewBox={`0 0 1200 ${form.hoehe}`} aria-hidden="true">
          <defs>
            <filter id={`fluss-${bahn}`} x="-5%" y="-20%" width="110%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="weich" />
              <feColorMatrix in="weich" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="tropfen" />
              <feComposite in="SourceGraphic" in2="tropfen" operator="atop" />
            </filter>
            <radialGradient id={`gold-${bahn}`} cx="0.36" cy="0.32" r="0.8">
              <stop offset="0" stopColor="#fff3cf" />
              <stop offset="0.4" stopColor="#f3d27a" />
              <stop offset="1" stopColor="#b8842b" />
            </radialGradient>
          </defs>
          <path className="ag-ablauf__bahn" d={form.pfad} />
          {form.stationen.map(([x, y], i) => (
            <circle key={i} className="ag-ablauf__station" data-nr={i} cx={x} cy={y} r="9" />
          ))}
          <g filter={`url(#fluss-${bahn})`} fill={`url(#gold-${bahn})`}>
            <circle className="ag-tropfen" r="15" />
            <circle className="ag-tropfen" r="10" />
            <circle className="ag-tropfen" r="6.5" />
          </g>
          <g className="ag-tropfen">
            <circle r="15" fill="none" />
            <circle cx="-5" cy="-5" r="3.4" fill="#fffaf0" opacity="0.85" />
          </g>
        </svg>
        {ablauf.schritte.map((s, i) => (
          <div
            key={s.nr}
            className="ag-ablauf__schritt"
            data-nr={i}
            style={{ "--x": (form.stationen[i][0] / 1200) * 100, "--y": ((form.stationen[i][1] + 44) / form.hoehe) * 100 } as CSSProperties}
          >
            <span className="ag-mono">
              {ablauf.schritt} {i + 1}
            </span>
            <h3 className="ag-versal">{s.titel}</h3>
            <p>{s.text}</p>
            {i === 2 && <span className="ag-mono ag-ablauf__ziel">{ablauf.ziel}</span>}
          </div>
        ))}
      </div>

      {/* Am Handy: dieselben drei Schritte als Liste an einer senkrechten Linie. */}
      <ol className="ag-ablauf__schmal">
        <li className="ag-ablauf__perle" aria-hidden="true" />
        {ablauf.schritte.map((s, i) => (
          <li key={s.nr}>
            <span className="ag-mono">
              {ablauf.schritt} {i + 1}
            </span>
            <h3 className="ag-versal">{s.titel}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ───────────── Ausbildung: Zertifikate ───────────── */

function ZertifikatKarte({ kurs, i }: { kurs: (typeof ausbildung.kurse)[number]; i: number }) {
  // Je Kurs gibt es zwei Zertifikate (wie bisher); hier wechselt man per Knopf.
  const [wer, setWer] = useState(0);
  const z = kurs.certs[wer];
  return (
    <li className="ag-zert__karte" style={{ "--i": i } as CSSProperties}>
      {/* Ein Klick auf das Bild öffnet dasselbe Zertifikat wie der Link darunter (auf der neuen
          Seite zeigt die Maus hier die Glasblase „Ansehen“). Mit der Tastatur bleibt es bei dem
          einen Halt auf „Zertifikat ansehen“; die Bildbeschreibung bleibt für Vorleseprogramme. */}
      <a className="ag-zert__bild" href={z.pdf} target="_blank" rel="noopener noreferrer" data-zeiger="ansehen" tabIndex={-1}>
        <Image src={z.img} alt={`Zertifikat ${kurs.title} von ${z.name}`} width={792} height={612} sizes="(max-width: 599px) 92vw, (max-width: 1023px) 46vw, 320px" />
      </a>
      <h3 className="ag-zert__titel">{kurs.title}</h3>
      <div className="ag-zert__wer" role="group" aria-label={`Zertifikat ${kurs.title} von`}>
        {kurs.certs.map((c, n) => (
          <button key={c.name} type="button" aria-pressed={n === wer} onClick={() => setWer(n)}>
            {c.name}
          </button>
        ))}
      </div>
      <a className="ag-link" href={z.pdf} target="_blank" rel="noopener noreferrer">
        {ausbildung.ansehen}
      </a>
    </li>
  );
}

/** `titel` ersetzt die Überschrift (die neue Seite setzt sie mit dem Entschlüsselungs-Effekt). */
export function Ausbildung({ mitte = false, titel }: { mitte?: boolean; titel?: ReactNode }) {
  return (
    <div className="ag-wrap ag-abschnitt">
      <header className={`ag-kopfzeile ${mitte ? "ag-kopfzeile--mitte" : ""}`}>
        {titel ?? (
          <Zeilen als="h2" className="ag-versal ag-titel">
            {ausbildung.vor} <em className="ag-gold">{ausbildung.gold}</em> {ausbildung.nach}
          </Zeilen>
        )}
        <p className="ag-text">{ausbildung.text}</p>
      </header>
      <ul className="ag-zert">
        {ausbildung.kurse.map((kurs, i) => (
          <ZertifikatKarte key={kurs.title} kurs={kurs} i={i} />
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Kontakt ───────────── */

/** `titel` ersetzt die Überschrift (die neue Seite setzt sie mit dem Entschlüsselungs-Effekt). */
export function Kontakt({ mitte = false, titel }: { mitte?: boolean; titel?: ReactNode }) {
  return (
    <div className={`ag-wrap ag-abschnitt ag-kontakt ${mitte ? "ag-kontakt--mitte" : ""}`}>
      {titel ?? (
        <Zeilen als="h2" className="ag-versal ag-titel">
          {kontakt.vor} <em className="ag-gold">{kontakt.gold}</em>
        </Zeilen>
      )}
      <p className="ag-text">{kontakt.text}</p>
      <div className="ag-kontakt__wege">
        <AnrufLeiste />
        {/* WhatsApp: über den Schalter in lib/content.ts (Standard aus). */}
        {site.whatsappAnzeigen && (
          <Knopf art="linie" href={marke.whatsapp} neu>
            {kontakt.whatsapp}
          </Knopf>
        )}
      </div>
      <p className="ag-mono">{hero.anrufHinweis}</p>
      <Anfrage />
    </div>
  );
}
