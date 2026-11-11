"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { hero, marke, navigation } from "@/lib/inhalt-neu";
import { Knopf } from "./Knoepfe";
import { Marke } from "./Marke";

gsap.registerPlugin(useGSAP);

/**
 * Schwebende Kopfleiste: Marke links (leicht golden leuchtend), Navigation in
 * der Mitte als Leiste aus dunklem Glas mit feinem Goldrand, „Anrufen“ rechts
 * (sanft golden glühend). Unter dem Menüpunkt, über dem die Maus ist, gleitet
 * ein kleiner Lichtpunkt mit; sonst bleibt er unter dem Abschnitt, der gerade
 * zu sehen ist. Am Handy schwebt alles als eine Kachel, das Menü öffnet sich
 * über den ganzen Bildschirm.
 *
 * Das offene Menü ist ein echter Dialog: Es liegt über der ganzen Seite und
 * bringt seine eigene Kopfzeile mit Schließen-Knopf mit. Alles andere ist
 * stillgelegt (inert) – Kopfleiste, Inhalt, Fußleiste; der Chat-Knopf des
 * Stammlayouts ruht über die Klasse „ag-menue-offen“ (welt.css). Der Fokus
 * springt auf den ersten Menüpunkt, bleibt mit Tab im Menü und kehrt beim
 * Schließen zum Menü-Knopf zurück. Escape schließt.
 */
export function Kopfleiste() {
  const [offen, setOffen] = useState(false);
  const kopf = useRef<HTMLElement>(null);
  const knopf = useRef<HTMLButtonElement>(null);
  const menue = useRef<HTMLDivElement>(null);
  const leiste = useRef<HTMLElement>(null);
  // Nach einem Klick auf einen Menüpunkt geht es zum Ziel auf der Seite, nicht zurück zum Knopf.
  const fokusZurueck = useRef(true);

  const schliessen = (zurueckZumKnopf: boolean) => {
    fokusZurueck.current = zurueckZumKnopf;
    setOffen(false);
  };

  // Sobald gescrollt wird, bekommt die Marke eine eigene Fläche und bleibt lesbar.
  useGSAP(() => {
    ScrollTrigger.create({
      start: 40,
      end: "max",
      onToggle: (s) => kopf.current?.setAttribute("data-los", String(s.isActive)),
    });
  });

  // Lichtpunkt der Navigation: folgt der Maus, sonst zeigt er den aktiven Abschnitt.
  useEffect(() => {
    const nav = leiste.current;
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a"));
    let aktiv: HTMLAnchorElement | null = null;
    let schwebt: HTMLAnchorElement | null = null;
    const setzen = () => {
      const zielLink = schwebt ?? aktiv;
      // Nur messen, wenn die Leiste zu sehen ist (unter 1100 px ist sie ausgeblendet).
      if (zielLink && zielLink.offsetWidth > 0) nav.style.setProperty("--punkt", `${zielLink.offsetLeft + zielLink.offsetWidth / 2}px`);
      nav.dataset.punkt = zielLink ? "an" : "aus";
    };
    const rein = (ev: Event) => {
      schwebt = ev.currentTarget as HTMLAnchorElement;
      setzen();
    };
    const raus = () => {
      schwebt = null;
      setzen();
    };
    links.forEach((l) => {
      l.addEventListener("pointerenter", rein);
      l.addEventListener("focus", rein);
      l.addEventListener("blur", raus);
    });
    nav.addEventListener("pointerleave", raus);
    // Aktiv ist der Abschnitt, der gerade die Lesehöhe (55 % des Bildschirms) kreuzt.
    const spuren = links.map((link) => {
      const abschnitt = document.querySelector<HTMLElement>(link.getAttribute("href") ?? "#-");
      if (!abschnitt) return null;
      return ScrollTrigger.create({
        trigger: abschnitt,
        start: "top 55%",
        end: "bottom 55%",
        // Nach Größenänderungen neu messen: Der Punkt bleibt unter seinem Menüpunkt.
        onRefresh: setzen,
        onToggle: (st) => {
          if (st.isActive) aktiv = link;
          else if (aktiv === link) aktiv = null;
          links.forEach((l) => {
            if (l === aktiv) l.setAttribute("aria-current", "true");
            else l.removeAttribute("aria-current");
          });
          setzen();
        },
      });
    });
    // Auch wenn die Leiste erst später sichtbar wird oder ihre Breite ändert.
    const groesse = new ResizeObserver(setzen);
    groesse.observe(nav);
    return () => {
      groesse.disconnect();
      links.forEach((l) => {
        l.removeEventListener("pointerenter", rein);
        l.removeEventListener("focus", rein);
        l.removeEventListener("blur", raus);
      });
      nav.removeEventListener("pointerleave", raus);
      spuren.forEach((st) => st?.kill());
    };
  }, []);

  useEffect(() => {
    if (!offen) return;
    const dialog = menue.current;
    if (!dialog) return;
    // Alles neben dem Dialog ruht: Kopfleiste, Inhalt, Fußleiste, Daumenleiste.
    const dahinter = Array.from(dialog.parentElement?.children ?? []).filter((el) => el !== dialog);
    dahinter.forEach((el) => el.setAttribute("inert", ""));
    document.documentElement.classList.add("ag-menue-offen");
    document.documentElement.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("a.ag-menue__punkt")?.focus();

    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        fokusZurueck.current = true;
        setOffen(false);
        return;
      }
      if (e.key !== "Tab") return;
      // Tab läuft im Kreis durch das Menü und verlässt es nicht.
      const ziele = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button"));
      const erstes = ziele[0];
      const letztes = ziele[ziele.length - 1];
      if (e.shiftKey && document.activeElement === erstes) {
        e.preventDefault();
        letztes?.focus();
      } else if (!e.shiftKey && document.activeElement === letztes) {
        e.preventDefault();
        erstes?.focus();
      }
    };
    window.addEventListener("keydown", taste);

    // Wird das Fenster so breit, dass die Navigation in der Kopfleiste steht, schließt das Menü.
    const breit = window.matchMedia("(min-width: 1100px)");
    const zuBreit = () => {
      if (!breit.matches) return;
      fokusZurueck.current = false;
      setOffen(false);
    };
    breit.addEventListener("change", zuBreit);
    const menueKnopf = knopf.current;

    return () => {
      dahinter.forEach((el) => el.removeAttribute("inert"));
      document.documentElement.classList.remove("ag-menue-offen");
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", taste);
      breit.removeEventListener("change", zuBreit);
      if (fokusZurueck.current) menueKnopf?.focus();
      fokusZurueck.current = true;
    };
  }, [offen]);

  return (
    <>
      <header ref={kopf} className="ag-kopf" data-los="false">
        <a className="ag-kopf__marke" href="#top" aria-label={`${marke.name}, zum Seitenanfang`}>
          <Marke />
          {marke.name}
        </a>
        <nav ref={leiste} className="ag-kopf__kachel" aria-label="Hauptnavigation" data-punkt="aus">
          {navigation.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
          <span className="ag-kopf__punkt" aria-hidden="true" />
        </nav>
        <div className="ag-kopf__rechts">
          <Knopf art="rand" href={`tel:${marke.telefon}`}>
            Anrufen
          </Knopf>
          <button
            ref={knopf}
            type="button"
            className="ag-kopf__menue"
            aria-haspopup="dialog"
            aria-expanded={offen}
            aria-controls="ag-menue"
            aria-label="Menü öffnen"
            onClick={() => setOffen(true)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div ref={menue} id="ag-menue" className="ag-menue" role="dialog" aria-modal="true" aria-label="Menü" data-offen={offen} inert={!offen}>
        {/* Eigene Kopfzeile, deckungsgleich mit der Kopfleiste: So gehört der Schließen-Knopf zum Dialog. */}
        <div className="ag-menue__kopf">
          <span className="ag-kopf__marke" aria-hidden="true">
            <Marke />
            {marke.name}
          </span>
          <div className="ag-kopf__rechts">
            <Knopf art="rand" href={`tel:${marke.telefon}`}>
              Anrufen
            </Knopf>
            <button type="button" className="ag-kopf__menue ag-menue__zu" aria-label="Menü schließen" onClick={() => schliessen(true)}>
              <span />
              <span />
            </button>
          </div>
        </div>
        {navigation.map((n, i) => (
          <a
            key={n.href}
            className="ag-versal ag-menue__punkt"
            style={{ "--i": i } as CSSProperties}
            href={n.href}
            onClick={() => schliessen(false)}
          >
            {n.label}
          </a>
        ))}
        <Knopf href={`tel:${marke.telefon}`}>{hero.anrufen}</Knopf>
      </div>
    </>
  );
}
