"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { hero, marke, navigation } from "@/lib/inhalt-neu";
import { richteGlimmrandEin } from "./glimmrand";
import { Knopf } from "./Knoepfe";
import { richteMagnetEin } from "./magnet";
import { GoldMarke } from "./Marke";
import { scrollZiel } from "./umgebung";
import { richteVerwuerfelnEin } from "./verwuerfeln";

gsap.registerPlugin(useGSAP);

/**
 * Schwebende Kopfleiste aus Glas (überall dasselbe: dunkle, fast durchsichtige
 * Fläche, Unschärfe, oben eine helle Lichtkante, weicher Schatten).
 *
 * - Links das kleine Logo, flach und golden (dasselbe wie in der Chat-Kugel und im
 *   Kopf des Chat-Fensters: GoldMarke), daneben der Name in Grau.
 * - In der Mitte die Navigation: Der feine Goldrand glimmt nur dort auf, wo die
 *   Maus in der Nähe ist (glimmrand.ts). Die Menüpunkte stehen in der Schrift
 *   des Namens. Hinter dem Glas liegt Licht: unter der Maus ein weiches goldenes
 *   Licht, das ihr folgt, und hinter dem Menüpunkt des aktiven Abschnitts (er ist
 *   golden) dauerhaft ein ganz schwacher Schein.
 *   Nach dem ersten Bildschirm wird die Leiste schmaler und dunkler; beim
 *   Runterscrollen gleitet sie nach oben weg, beim Hochscrollen kommt sie wieder.
 * - Rechts „Anrufen“: Glas-Knopf mit Goldrand, der Hörer in einem pulsierenden
 *   Lichtkreis, alle 6 s ein Lichtstreifen, leicht magnetisch (magnet.ts).
 * - Beim Drüberfahren werden Name, Menüpunkte und „Anrufen“ golden und
 *   verwürfeln sich eine halbe Sekunde lang (verwuerfeln.ts).
 *
 * Am Handy schwebt alles als eine Glas-Kachel, das Menü öffnet sich über den
 * ganzen Bildschirm.
 *
 * Das offene Menü ist ein echter Dialog: Es liegt über der ganzen Seite und
 * bringt seine eigene Kopfzeile mit Schließen-Knopf mit. Alles andere ist
 * stillgelegt (inert) – Kopfleiste, Inhalt, Fußleiste; der Chat-Knopf des
 * Stammlayouts ruht über die Klasse „ag-menue-offen“ (welt.css). Der Fokus
 * springt auf den ersten Menüpunkt, bleibt mit Tab im Menü und kehrt beim
 * Schließen zum Menü-Knopf zurück. Escape schließt.
 */
export function Kopfleiste({ basis = "", start }: { basis?: string; start?: string }) {
  // `start`: Auf Seiten mit Startanimation trägt die Leiste von Anfang an deren Stand (kopf.css).
  // `basis`: Auf einer Unterseite (Impressum, Datenschutz) die Adresse der neuen Seite. Dann führen
  // Logo und Menüpunkte dorthin (zu ihren Abschnitten) statt zu Stellen auf dieser Seite.
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

  // Name oben links, Menüpunkte und „Anrufen“ verwürfeln sich beim Drüberfahren; der Goldrand
  // glimmt nahe der Maus auf; „Anrufen“ ist leicht magnetisch (Fangbereich 100 px, höchstens 8 px).
  useEffect(() => {
    const el = kopf.current;
    if (!el) return;
    const abbau = [richteVerwuerfelnEin(el), richteGlimmrandEin(el)];
    const ruf = el.querySelector<HTMLElement>(".ag-ruf");
    if (ruf) abbau.push(richteMagnetEin(ruf, { bereich: 100, anteil: 0.2, hoechstens: 8, abRand: true }));
    return () => abbau.forEach((f) => f());
  }, []);

  // Beim Scrollen: Nach dem ersten Bildschirm wird die Leiste schmaler und dunkler. Beim
  // Runterscrollen gleitet sie nach oben weg, beim Hochscrollen kommt sie wieder (erst ab 8 px
  // Bewegung in eine Richtung, damit sie nicht zittert).
  useEffect(() => {
    const nav = leiste.current;
    if (!nav) return;
    let anker = window.scrollY;
    const beimScrollen = () => {
      const y = window.scrollY;
      nav.dataset.eng = String(y > window.innerHeight * 0.9);
      if (Math.abs(y - anker) < 8) return;
      const weg = y > anker && y > 80;
      nav.dataset.weg = String(weg);
      // Gleitet die Leiste weg, gehen auch die Lichter hinter ihr aus.
      if (kopf.current) {
        kopf.current.dataset.leisteweg = String(weg);
        if (weg) kopf.current.dataset.licht = "aus";
      }
      anker = y;
    };
    beimScrollen();
    window.addEventListener("scroll", beimScrollen, { passive: true });
    return () => window.removeEventListener("scroll", beimScrollen);
  }, []);

  // Aktiver Abschnitt: Der Menüpunkt ist golden, und hinter dem Glas liegt dort dauerhaft ein ganz
  // schwacher Schein. Dasselbe gilt für den Menüpunkt im Handy-Menü.
  useEffect(() => {
    const nav = leiste.current;
    const el = kopf.current;
    if (!nav || !el) return;
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a"));
    const imMenue = Array.from(menue.current?.querySelectorAll<HTMLAnchorElement>("a.ag-menue__punkt") ?? []);
    let aktiv: HTMLAnchorElement | null = null;
    const setzen = () => {
      // Nur messen, wenn die Leiste zu sehen ist (unter 1100 px ist sie ausgeblendet).
      if (aktiv && aktiv.offsetWidth > 0) {
        const a = aktiv.getBoundingClientRect();
        el.style.setProperty("--ax", `${(a.left + a.width / 2 - el.getBoundingClientRect().left).toFixed(1)}px`);
      }
      el.dataset.aktiv = aktiv ? "an" : "aus";
    };
    // Aktiv ist der Abschnitt, der gerade die Lesehöhe (55 % des Bildschirms) kreuzt.
    const spuren = links.map((link) => {
      // Nur Sprungziele auf dieser Seite haben einen Abschnitt (auf Unterseiten keiner).
      const ziel = link.getAttribute("href") ?? "";
      const abschnitt = ziel.startsWith("#") ? document.querySelector<HTMLElement>(ziel) : null;
      if (!abschnitt) return null;
      return ScrollTrigger.create({
        trigger: abschnitt,
        start: "top 55%",
        end: "bottom 55%",
        // Nach Größenänderungen neu messen: Der Schein bleibt hinter seinem Menüpunkt.
        onRefresh: setzen,
        onToggle: (st) => {
          if (st.isActive) aktiv = link;
          else if (aktiv === link) aktiv = null;
          const ziel = aktiv?.getAttribute("href");
          [...links, ...imMenue].forEach((l) => {
            if (ziel && l.getAttribute("href") === ziel) l.setAttribute("aria-current", "true");
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
      spuren.forEach((st) => st?.kill());
      delete el.dataset.aktiv;
      el.style.removeProperty("--ax");
    };
  }, []);

  // Licht hinter dem Glas: Fährt die Maus über die Leiste, liegt unter ihr ein weiches goldenes
  // Licht (wie durch Milchglas). Es folgt der Maus waagerecht, je Bild 1 − 0,82^(dt × 60) zum Ziel
  // hin, blendet beim Betreten ein und beim Verlassen aus (im Stylesheet). Nur bei echter Maus und
  // nicht bei „weniger Bewegung“.
  useEffect(() => {
    const nav = leiste.current;
    const el = kopf.current;
    if (!nav || !el) return;
    const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
    const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
    const erlaubt = () => feinerZeiger.matches && !wenigBewegung.matches;
    let ziel = 0;
    let ist = 0;
    let rahmen = 0;
    let zuletzt = 0;
    let mausX = 0;
    const setzen = () => el.style.setProperty("--lx", `${ist.toFixed(1)}px`);
    const bild = (jetzt: number) => {
      rahmen = 0;
      const dt = zuletzt ? Math.min(0.1, (jetzt - zuletzt) / 1000) : 1 / 60;
      zuletzt = jetzt;
      ist += (ziel - ist) * (1 - Math.pow(0.82, dt * 60));
      if (Math.abs(ziel - ist) < 0.3) {
        ist = ziel;
        zuletzt = 0;
      } else rahmen = requestAnimationFrame(bild);
      setzen();
    };
    const aus = () => {
      cancelAnimationFrame(rahmen);
      rahmen = 0;
      zuletzt = 0;
      el.dataset.licht = "aus";
    };
    /** Wo das Licht stehen soll: unter der Maus, höchstens bis 36 px an die Enden der Leiste. */
    const messen = () => {
      const r = nav.getBoundingClientRect();
      ziel = Math.max(r.left + 36, Math.min(r.right - 36, mausX)) - el.getBoundingClientRect().left;
      return mausX >= r.left && mausX <= r.right;
    };
    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || !erlaubt()) return aus();
      mausX = ev.clientX;
      messen();
      if (el.dataset.licht !== "an") {
        // Beim Betreten (auch wenn die Leiste zurückkommt) sitzt das Licht gleich unter der Maus
        // und blendet dort ein.
        ist = ziel;
        setzen();
        el.dataset.licht = "an";
      }
      if (!rahmen) rahmen = requestAnimationFrame(bild);
    };
    // Ändert sich die Fenstergröße bei ruhender Maus, rückt die Leiste: Das Licht wird neu
    // eingemessen (oder geht aus, wenn die Maus nicht mehr über der Leiste steht).
    const neuMessen = () => {
      if (el.dataset.licht !== "an") return;
      if (!messen()) return aus();
      ist = ziel;
      setzen();
    };
    // Wird „weniger Bewegung“ eingeschaltet oder der Zeiger grob, geht das Licht sofort aus.
    const umstellen = () => {
      if (!erlaubt()) aus();
    };
    nav.addEventListener("pointerenter", bewegt);
    nav.addEventListener("pointermove", bewegt);
    nav.addEventListener("pointerleave", aus);
    window.addEventListener("resize", neuMessen);
    feinerZeiger.addEventListener("change", umstellen);
    wenigBewegung.addEventListener("change", umstellen);
    return () => {
      cancelAnimationFrame(rahmen);
      nav.removeEventListener("pointerenter", bewegt);
      nav.removeEventListener("pointermove", bewegt);
      nav.removeEventListener("pointerleave", aus);
      window.removeEventListener("resize", neuMessen);
      feinerZeiger.removeEventListener("change", umstellen);
      wenigBewegung.removeEventListener("change", umstellen);
      delete el.dataset.licht;
      el.style.removeProperty("--lx");
    };
  }, []);

  useEffect(() => {
    if (!offen) return;
    const dialog = menue.current;
    if (!dialog) return;
    // Alles neben dem Dialog ruht: Kopfleiste, Inhalt, Fußleiste.
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
      <header ref={kopf} className="ag-kopf" data-los="false" data-start={start}>
        <a className="ag-kopf__marke" href={basis || "#top"} aria-label={basis ? `${marke.name}, zur Startseite` : `${marke.name}, zum Seitenanfang`} data-wuerfel>
          <GoldMarke className="ag-kopf__logo" />
          <span className="ag-wuerfel">
            <span className="ag-wuerfel__echt">{marke.name}</span>
          </span>
        </a>
        {/* Hinter dem Glas der Leiste: der schwache Schein des aktiven Abschnitts und das Licht unter der Maus. */}
        <span className="ag-kopf__schein" aria-hidden="true" />
        <span className="ag-kopf__licht" aria-hidden="true" />
        <nav ref={leiste} className="ag-kopf__kachel ag-glas ag-glimm" aria-label="Hauptnavigation" data-glimm>
          {navigation.map((n) => (
            <a key={n.href} href={`${basis}${n.href}`} data-wuerfel>
              <span className="ag-wuerfel">
                <span className="ag-wuerfel__echt">{n.label}</span>
              </span>
            </a>
          ))}
        </nav>
        <div className="ag-kopf__rechts">
          <Anruf basis={basis} />
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
            <GoldMarke className="ag-kopf__logo" />
            {marke.name}
          </span>
          <div className="ag-kopf__rechts">
            <Anruf basis={basis} />
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
            href={`${basis}${n.href}`}
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

/**
 * „Anrufen“ in der Kopfleiste: ein Glas-Knopf mit Goldrand, der Hörer sitzt in einem kleinen
 * goldenen Lichtkreis. Es bleibt ein gewöhnlicher tel:-Link: Am Handy ruft ein Tipp direkt an.
 * Am Computer (Maus) scrollt ein Klick stattdessen weich nach unten zum Kontakt-Bereich
 * („Sprechen wir über Ihr Projekt“), wenn die Seite einen hat; dort stehen Nummer und Formular.
 */
function Anruf({ basis = "" }: { basis?: string }) {
  const router = useRouter();
  const zumKontakt = (ev: MouseEvent<HTMLAnchorElement>) => {
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const ziel = document.getElementById("kontakt");
    if (!ziel) {
      // Auf einer Unterseite: zum Kontakt-Bereich der neuen Seite.
      if (!basis) return;
      ev.preventDefault();
      router.push(`${basis}#kontakt`);
      return;
    }
    ev.preventDefault();
    scrollZiel.zu(ziel);
  };
  return (
    <a className="ag-ruf ag-glas ag-glimm" href={`tel:${marke.telefon}`} onClick={zumKontakt} data-wuerfel data-glimm>
      <span className="ag-ruf__kreis" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.7 3.5h2.5l1.5 3.9-2 1.4a11.4 11.4 0 0 0 6.5 6.5l1.4-2 3.9 1.5v2.5a1.9 1.9 0 0 1-1.9 1.9A14.8 14.8 0 0 1 4.8 5.4a1.9 1.9 0 0 1 1.9-1.9z" />
        </svg>
      </span>
      <span className="ag-wuerfel">
        <span className="ag-wuerfel__echt">Anrufen</span>
      </span>
      <span className="ag-ruf__streif" aria-hidden="true" />
    </a>
  );
}
