"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

type Cert = {
  name: string;
  img: string;
  pdf: string;
};

type Props = {
  title: string;
  certs: Cert[];
  /** Bildgrößen-Hinweis für Next/Image */
  sizes: string;
};

/**
 * Zwei komplette Zertifikats-Karten, die schräg versetzt übereinanderliegen –
 * jede mit eigenem Bild, Titel, Namen und eigenem Link.
 *
 * RUHEZUSTAND: Davids Karte liegt vorne, Mijos schaut leicht gedreht rechts
 * dahinter hervor.
 * ÜBERFAHREN: Kommt die Maus ins rechte Drittel, tauschen die beiden KOMPLETTEN
 * Karten die Plätze. Das RASTET EIN – es bleibt so, auch wenn man wieder nach
 * links fährt. Erst wenn die Maus den Bereich ganz verlässt, kommt Davids Karte
 * zurück nach vorne.
 *
 * Jeder Kurs macht das für sich allein, die vier Kurse hängen nicht zusammen.
 *
 * Auf Touch-Geräten gibt es kein Überfahren: Dort tippt man auf die hintere
 * Karte, um sie nach vorne zu holen. Die vordere Karte bleibt normal anklickbar,
 * ihr Link öffnet das PDF.
 */

// Die Karten bewegen sich in ECHTER räumlicher Tiefe (translateZ), nicht über
// z-index. Grund: Mit z-index gibt es nur "ganz vorne" oder "ganz hinten" –
// beim Umschalten würde die Karte mitten im Überlappen schlagartig springen,
// was aussieht, als schnitte sie durch die andere hindurch. Mit echter Tiefe
// sortiert der Browser selbst, und die Karte wandert sauber AUSSEN HERUM.
//
// z ist in Pixeln: 0 = vorne, negativ = weiter hinten.
const VORNE = { x: 0, y: 0, rot: 0, z: 0, hell: 1 };
const HINTEN_RECHTS = { x: 12, y: -6, rot: 6, z: -150, hell: 0.94 };
const HINTEN_LINKS = { x: -12, y: -6, rot: -6, z: -150, hell: 0.94 };
// Auf dem Handy liegt die hintere Karte deutlicher versetzt – dort gibt es
// keinen Mauszeiger, der auf sie aufmerksam macht, also muss sie von selbst
// klar erkennbar sein.
const HINTEN_RECHTS_MOBIL = { x: 20, y: -9, rot: 8, z: -170, hell: 0.94 };

// Ab wo das Umschalten auslöst: rechtes Drittel
const AUSLOESER = 2 / 3;
// Anstupsen beim Drüberfahren: die hintere Karte rutscht weiter nach rechts,
// kommt etwas näher und wird heller – das Signal "hier liegt noch was".
const STUPS = { x: 18, y: -7, rot: 7.5, z: -110, hell: 1 };
// Dauer des Wechsels in Sekunden. Länger als vorher, weil der Wechsel jetzt
// aus drei aufeinanderfolgenden Phasen besteht statt aus einer Bewegung.
const DAUER = 0.9;

// Der Wechsel läuft in drei Phasen ab, damit die vordere Karte NIE durch die
// andere hindurchfährt:
//   Phase 1 (bis P_SEITE):   fährt vorne bleibend nach links, bis sie komplett
//                            frei neben der anderen steht
//   Phase 2 (bis P_ABTAUCH): taucht dort nach hinten ab – ohne Überlappung
//   Phase 3 (bis 1):         schiebt sich hinter der anderen zurück an ihren Platz
const P_SEITE = 0.45;
const P_ABTAUCH = 0.62;
// Wie weit nach links, um wirklich frei zu sein: etwas mehr als die eigene
// Breite (100 %) plus der Versatz der anderen Karte (12 %).
const FREI_X = -96;
// Perspektive des Stapels – je kleiner, desto stärker der räumliche Eindruck
const PERSPEKTIVE = 1100;

export function CertificateCard({ title, certs, sizes }: Props) {
  const [erste, zweite] = certs;
  const root = useRef<HTMLDivElement>(null);
  const ersteRef = useRef<HTMLDivElement>(null);
  const zweiteRef = useRef<HTMLDivElement>(null);
  // Der Handy-Knopf löst denselben Wechsel aus wie die Maus – die Funktion
  // dafür lebt im Effekt, deshalb wird sie hier hinterlegt.
  const umschaltenRef = useRef<(() => void) | null>(null);

  // Welche Karte liegt vorne? Steuert, welche anklickbar/vorlesbar ist.
  const [zweiteVorne, setZweiteVorne] = useState(false);

  useEffect(() => {
    const el = root.current;
    const a = ersteRef.current;
    const b = zweiteRef.current;
    if (!el || !a || !b) return;
    if (!zweite) return; // nur eine Urkunde -> nichts zu stapeln

    // p = Wechsel (0 = erste vorne, 1 = zweite vorne)
    // s = Anstupsen beim Drüberfahren (0 = Ruhe, 1 = angestupst)
    const state = { p: 0, s: 0 };
    // Ruheplatz der hinteren Karte – am Handy deutlicher versetzt.
    let platzRechts = HINTEN_RECHTS;
    let letzte = false;

    type Platz = {
      x: number;
      y: number;
      rot: number;
      z: number;
      hell: number;
    };

    const misch = (von: number, nach: number, t: number) =>
      von + (nach - von) * t;

    const mischePlatz = (von: Platz, nach: Platz, t: number): Platz => ({
      x: misch(von.x, nach.x, t),
      y: misch(von.y, nach.y, t),
      rot: misch(von.rot, nach.rot, t),
      z: misch(von.z, nach.z, t),
      hell: misch(von.hell, nach.hell, t),
    });

    const setze = (el: HTMLElement, pl: Platz) => {
      el.style.transform = `translate3d(${pl.x}%, ${pl.y}%, ${pl.z}px) rotate(${pl.rot}deg)`;
      el.style.filter = `brightness(${pl.hell})`;
    };

    // Fortschritt innerhalb einer Phase, auf 0..1 begrenzt
    const phase = (p: number, von: number, bis: number) =>
      Math.min(1, Math.max(0, (p - von) / (bis - von)));

    const zeichne = () => {
      const { p, s } = state;

      // --- Erste Karte: erst zur Seite, dann abtauchen, dann zurück --------
      const aPlatz: Platz = { ...VORNE };
      if (p <= P_SEITE) {
        // Phase 1: bleibt vorne (z=0) und fährt nach links frei
        const t = phase(p, 0, P_SEITE);
        aPlatz.x = misch(0, FREI_X, t);
        aPlatz.y = misch(0, HINTEN_LINKS.y, t);
        aPlatz.rot = misch(0, HINTEN_LINKS.rot, t);
        aPlatz.z = 0;
      } else if (p <= P_ABTAUCH) {
        // Phase 2: steht frei neben der anderen und sinkt nach hinten
        const t = phase(p, P_SEITE, P_ABTAUCH);
        aPlatz.x = FREI_X;
        aPlatz.y = HINTEN_LINKS.y;
        aPlatz.rot = HINTEN_LINKS.rot;
        aPlatz.z = misch(0, HINTEN_LINKS.z, t);
      } else {
        // Phase 3: schiebt sich hinter der anderen an ihren Platz zurück
        const t = phase(p, P_ABTAUCH, 1);
        aPlatz.x = misch(FREI_X, HINTEN_LINKS.x, t);
        aPlatz.y = HINTEN_LINKS.y;
        aPlatz.rot = HINTEN_LINKS.rot;
        aPlatz.z = HINTEN_LINKS.z;
      }
      aPlatz.hell = misch(1, HINTEN_LINKS.hell, Math.min(1, p / P_ABTAUCH));
      setze(a, aPlatz);

      // --- Zweite Karte: kommt erst nach vorne, wenn die andere weg ist ----
      const ruhe = mischePlatz(platzRechts, STUPS as Platz, s);
      setze(b, mischePlatz(ruhe, VORNE, phase(p, P_ABTAUCH, 1)));

      // Für den Link: sobald die erste Karte abgetaucht ist, gilt die zweite.
      const zweiteVornAn = p > P_ABTAUCH;
      if (zweiteVornAn !== letzte) {
        letzte = zweiteVornAn;
        setZweiteVorne(zweiteVornAn);
      }
    };

    zeichne();

    const animiereZu = (ziel: number, ease = "power3.out") =>
      gsap.to(state, {
        p: ziel,
        duration: DAUER,
        ease,
        overwrite: "auto",
        onUpdate: zeichne,
      });

    const stupseZu = (ziel: number) =>
      gsap.to(state, {
        s: ziel,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
        onUpdate: zeichne,
      });

    const mm = gsap.matchMedia();

    // --- Maus-Geräte: erst mitkriechen, im rechten Drittel einrasten ----
    mm.add(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        // eingerastet = umgeschaltet, bleibt bis die Maus die Karte verlässt
        let eingerastet = false;

        // Betreten: hintere Karte rutscht ein Stück weiter raus und wird heller
        const onEnter = () => {
          if (!eingerastet) stupseZu(1);
        };

        const onMove = (e: PointerEvent) => {
          if (eingerastet) return;
          const r = el.getBoundingClientRect();
          if ((e.clientX - r.left) / r.width >= AUSLOESER) {
            eingerastet = true;
            // Leichtes Überschwingen: lässt den Wechsel entschieden wirken
            // statt weichgespült.
            animiereZu(1, "back.out(1.3)");
          }
        };

        const onLeave = () => {
          eingerastet = false;
          stupseZu(0);
          animiereZu(0);
        };

        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
          gsap.killTweensOf(state);
          state.p = 0;
          state.s = 0;
          zeichne();
        };
      },
    );

    // --- Touch: hintere Karte deutlicher versetzt, Wechsel per Knopf ----
    // Die Karten selbst bleiben normale Links zum PDF – umgeschaltet wird nur
    // über den runden Knopf. So weiß man immer, was ein Tippen bewirkt.
    mm.add("(hover: none), (pointer: coarse)", () => {
      platzRechts = HINTEN_RECHTS_MOBIL;
      zeichne();
      umschaltenRef.current = () => animiereZu(state.p > 0.5 ? 0 : 1);
      return () => {
        umschaltenRef.current = null;
        platzRechts = HINTEN_RECHTS;
        gsap.killTweensOf(state);
        state.p = 0;
        zeichne();
      };
    });

    // --- Weniger Bewegung: Umschalten ohne Animation --------------------
    mm.add("(prefers-reduced-motion: reduce)", () => {
      platzRechts = HINTEN_RECHTS_MOBIL;
      zeichne();
      umschaltenRef.current = () => {
        state.p = state.p > 0.5 ? 0 : 1;
        zeichne();
      };
      return () => {
        umschaltenRef.current = null;
        platzRechts = HINTEN_RECHTS;
        state.p = 0;
        zeichne();
      };
    });

    return () => mm.revert();
  }, [zweite]);

  const karte = (cert: Cert, istVorne: boolean) => (
    <a
      href={cert.pdf}
      target="_blank"
      rel="noopener noreferrer"
      // Die hintere Karte ist nicht per Tastatur erreichbar – sonst würde man
      // in einen unsichtbaren Link tabben.
      tabIndex={istVorne ? undefined : -1}
      aria-hidden={istVorne ? undefined : true}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <Image
          src={cert.img}
          alt={`Zertifikat ${title} von ${cert.name}`}
          fill
          sizes={sizes}
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold leading-snug text-ink">
          {title}
        </h3>
        <span className="mt-1 text-sm text-ink-soft">{cert.name}</span>
        <span className="mt-auto inline-flex w-fit items-center gap-1 pt-4 text-sm font-semibold text-gold-dark">
          Zertifikat ansehen
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </a>
  );

  // Nur eine Urkunde vorhanden -> ganz normale Einzelkarte
  if (!zweite) {
    return <div className="h-full">{karte(erste, true)}</div>;
  }

  return (
    // perspective + preserve-3d: nur so wirkt translateZ räumlich und der
    // Browser entscheidet selbst, welche Karte vorne liegt.
    <div
      ref={root}
      className="relative h-full"
      style={{
        perspective: `${PERSPEKTIVE}px`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Platzhalter hält die Höhe – die beiden Karten liegen absolut darüber */}
      <div className="invisible">{karte(erste, false)}</div>

      <div
        ref={zweiteRef}
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${HINTEN_RECHTS.x}%, ${HINTEN_RECHTS.y}%, ${HINTEN_RECHTS.z}px) rotate(${HINTEN_RECHTS.rot}deg)`,
          filter: `brightness(${HINTEN_RECHTS.hell})`,
        }}
      >
        {karte(zweite, zweiteVorne)}
      </div>

      <div
        ref={ersteRef}
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${VORNE.x}%, ${VORNE.y}%, ${VORNE.z}px) rotate(${VORNE.rot}deg)`,
        }}
      >
        {karte(erste, !zweiteVorne)}
      </div>

      {/* Umschalt-Knopf – nur auf Touch-Geräten. Am Computer übernimmt das die
          Maus, dort wäre der Knopf überflüssig.
          Der Rahmen hat dieselbe Form wie der Bildbereich der Karte
          (aspect-[4/3]), dadurch sitzt der Knopf exakt mittig am rechten Rand
          des Zertifikats.
          translateZ hebt ihn über die Karten – bewusst nur 10px: Durch die
          Perspektive erscheint alles Näherliegende größer, bei 60px saß der
          Knopf sichtbar zu weit rechts und zu hoch. 10px reichen, weil keine
          Karte je vor die Ebene 0 kommt. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3] [@media(hover:hover)]:hidden"
        style={{ transform: "translateZ(10px)" }}
      >
        <button
          type="button"
          onClick={() => umschaltenRef.current?.()}
          aria-label={`Zwischen den Zertifikaten von ${erste.name} und ${zweite.name} wechseln`}
          className="pointer-events-auto absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold/40 bg-ink/85 text-gold shadow-lg backdrop-blur-sm transition active:scale-95"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
