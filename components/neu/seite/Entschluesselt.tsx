"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { istVorschau } from "../umgebung";
import { useBewegungsWechsel } from "./einstellung";

const ZEICHEN = ["#", "+", "=", "-", ":", ".", "*", "/", "%", "·"];
// Unter der Maus verbuggen die Buchstaben in diesem Umkreis (Pixel).
const STOER_UMKREIS = 46;

const zufall = () => ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];

type Ort = { l: number; t: number; b: number; h: number };

type Feld = {
  el: HTMLSpanElement;
  /** Der echte Buchstabe und der Stil seines Elternelements (Schrift, Farbe). */
  zeichen: string;
  stil: CSSStyleDeclaration;
  /** Zwischenwort: das Zeichen, das hier zuerst einrastet (leer = nichts); null = keines. */
  erst: string | null;
  /** Platz des Buchstabens im echten Text und, fürs Zwischenwort, der Platz seines ersten Zeichens. */
  ort: Ort;
  erstOrt: Ort | null;
  /** Mitte des Buchstabens, bezogen auf die Hülle. */
  x: number;
  y: number;
  wirr: boolean;
  /** Wann der Buchstabe einrastet (Zeit von performance.now(); 0 = noch offen) und als was. */
  rastet: number;
  ziel: "echt" | "erst";
};

export type Buchstabenspiel = {
  /** Vor dem ersten Hinscrollen: Die Überschrift steht als Zufallszeichen da. */
  verhuellen: () => void;
  /** Die Zeichen rasten von links nach rechts ein (einmal je Seitenaufruf). */
  loesen: (dauer?: number) => void;
  /** Ohne Spiel als fertig gelten (die Überschrift lag beim Laden schon über dem Bild). */
  stehen: () => void;
  /** Maus bei (x, y) im Fenster: Die Buchstaben in der Nähe verbuggen kurz und rasten wieder ein. */
  stoeren: (x: number, y: number) => void;
  ende: () => void;
};

/**
 * Das Spiel mit den Buchstaben einer Überschrift.
 *
 * Der echte Text bleibt die ganze Zeit im Dokument (für Vorleseprogramme und Suchmaschinen) und
 * wird nur durchsichtig; das Spiel läuft in einer Ebene darüber. Jeder Buchstabe hat dort genau
 * seinen Platz aus dem echten Text, auch über mehrere Zeilen und über Wörter in anderer Farbe
 * (das goldene Wort). Zufallszeichen stehen in JetBrains Mono wie beim Namen aus Zeichen; beim
 * Einrasten bekommt jeder Buchstabe die Schrift und Farbe, die er im echten Text hat.
 *
 * Zwischenwort: Steht im Text eine Gruppe mit `data-erst="Tagen,"`, rasten ihre Plätze zuerst
 * mit diesen Zeichen ein (in der Farbe des übrigen Satzes). Kurz darauf zerfällt die Gruppe
 * wieder in Zufallszeichen und rastet als das echte Wort ein.
 *
 * Erwartet wird dieser Aufbau:
 *   <span class="ag-wuerfel"><span class="ag-wuerfel__echt">Text</span></span>
 */
export function erzeugeSpiel(huelle: HTMLElement, beiFertig?: () => void): Buchstabenspiel {
  const echt = huelle.querySelector<HTMLElement>(".ag-wuerfel__echt");
  let ebene: HTMLSpanElement | null = null;
  let felder: Feld[] = [];
  // Mitten der Buchstaben vom letzten Aufbau (für die Maus), bis sich die Größe ändert.
  let orte: { x: number; y: number }[] | null = null;
  let grundStil: CSSStyleDeclaration | null = null;
  let zustand: "ruhe" | "verhuellt" | "loest" | "fertig" = "ruhe";
  let rahmen = 0;
  let zuletzt = 0;
  let imBild = true;
  let vorbei = false;
  const uhren: number[] = [];
  const spaeter = (ms: number, was: () => void) => uhren.push(window.setTimeout(was, ms));

  const setzeOrt = (f: Feld, o: Ort) => {
    f.el.style.left = `${o.l}px`;
    f.el.style.top = `${o.t}px`;
    f.el.style.width = `${o.b}px`;
    f.el.style.height = `${o.h}px`;
    f.el.style.lineHeight = `${o.h}px`;
  };
  const zeigeWirr = (f: Feld) => {
    f.wirr = true;
    setzeOrt(f, f.ort);
    f.el.className = "ag-zufall";
    f.el.style.fontFamily = "";
    f.el.style.fontSize = "";
    f.el.style.fontWeight = "";
    f.el.style.fontStyle = "";
    f.el.style.textTransform = "";
    f.el.style.color = f.stil.color;
    f.el.textContent = zufall();
  };
  const zeigeFest = (f: Feld, als: "echt" | "erst") => {
    f.wirr = false;
    f.rastet = 0;
    // Das Zwischenwort steht in der Schrift und Farbe des übrigen Satzes.
    const zwischen = als === "erst" && f.erst !== null;
    const stil = zwischen && grundStil ? grundStil : f.stil;
    setzeOrt(f, als === "erst" && f.erstOrt ? f.erstOrt : f.ort);
    f.el.className = "";
    f.el.style.fontFamily = stil.fontFamily;
    f.el.style.fontSize = stil.fontSize;
    f.el.style.fontWeight = stil.fontWeight;
    f.el.style.fontStyle = stil.fontStyle;
    f.el.style.textTransform = stil.textTransform;
    f.el.style.color = stil.color;
    f.el.textContent = zwischen ? (f.erst ?? "") : f.zeichen;
  };

  const abbauen = () => {
    cancelAnimationFrame(rahmen);
    rahmen = 0;
    zuletzt = 0;
    ebene?.remove();
    ebene = null;
    felder = [];
    delete huelle.dataset.spiel;
  };

  /** Die Ebene (neu) aufbauen: jeder Buchstabe an seinem Platz, als Zufallszeichen oder echt. */
  const baue = (wirr: boolean) => {
    abbauen();
    if (!echt) return false;
    const kasten = huelle.getBoundingClientRect();
    if (kasten.width < 1) return false;
    grundStil = getComputedStyle(huelle);
    const neu = document.createElement("span");
    neu.className = "ag-wuerfel__spiel";
    neu.setAttribute("aria-hidden", "true");
    const bereich = document.createRange();
    const stile = new Map<Element, CSSStyleDeclaration>();
    const gruppen = new Map<Element, number>();
    const zuGruppe = new Map<Feld, Element>();
    const lauf = document.createTreeWalker(echt, NodeFilter.SHOW_TEXT);
    for (let knoten = lauf.nextNode() as Text | null; knoten; knoten = lauf.nextNode() as Text | null) {
      const eltern = knoten.parentElement;
      if (!eltern) continue;
      let stil = stile.get(eltern);
      if (!stil) {
        stil = getComputedStyle(eltern);
        stile.set(eltern, stil);
      }
      const gruppe = eltern.closest<HTMLElement>("[data-erst]");
      const zwischen = gruppe && echt.contains(gruppe) ? Array.from(gruppe.dataset.erst ?? "") : null;
      let stelle = 0;
      for (const zeichen of knoten.data) {
        const von = stelle;
        stelle += zeichen.length;
        if (!zeichen.trim()) continue;
        bereich.setStart(knoten, von);
        bereich.setEnd(knoten, stelle);
        const b = bereich.getBoundingClientRect();
        if (b.width < 0.5) continue;
        let erst: string | null = null;
        if (gruppe && zwischen) {
          const nr = gruppen.get(gruppe) ?? 0;
          gruppen.set(gruppe, nr + 1);
          erst = zwischen[nr] ?? "";
        }
        const inGruppe = gruppe && zwischen ? gruppe : null;
        const el = document.createElement("span");
        const ort = { l: b.left - kasten.left, t: b.top - kasten.top, b: b.width, h: b.height };
        const f: Feld = { el, zeichen, stil, erst, ort, erstOrt: null, x: ort.l + ort.b / 2, y: ort.t + ort.h / 2, wirr: false, rastet: 0, ziel: "echt" };
        if (inGruppe) zuGruppe.set(f, inGruppe);
        if (wirr) zeigeWirr(f);
        else zeigeFest(f, "echt");
        neu.append(el);
        felder.push(f);
      }
    }
    if (!felder.length) return false;
    // Zwischenwort: Seine Buchstaben stehen in der Schrift des Satzes dicht an dicht, vom linken
    // Rand der Gruppe an, auf der Zeile des Satzes (gemessen an einem unsichtbaren Probetext).
    for (const gruppe of gruppen.keys()) {
      const zellen = felder.filter((f) => zuGruppe.get(f) === gruppe);
      const text = (gruppe as HTMLElement).dataset.erst ?? "";
      if (!zellen.length || !text) continue;
      // Zeile des Satzes: ein Zeichen der Gruppe, das in der Schrift des Satzes steht (das Komma); sonst das erste.
      const zeile = zellen.find((f) => f.stil.fontFamily === grundStil?.fontFamily && f.stil.fontSize === grundStil?.fontSize) ?? zellen[0];
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;white-space:pre;pointer-events:none";
      probe.textContent = text;
      huelle.append(probe);
      const knoten = probe.firstChild as Text;
      const probeBreite = probe.getBoundingClientRect().width;
      // Das Zwischenwort ist kürzer oder länger als das echte: Um den Unterschied rückt der Rest
      // der Zeile zusammen. In mittig gesetztem Text bleibt die Zeile so mittig (alles davor rückt
      // um die Hälfte nach rechts, alles danach um die Hälfte nach links), sonst rückt nur der Rest nach.
      const letzte = zellen[zellen.length - 1];
      const luecke = letzte.ort.l + letzte.ort.b - zellen[0].ort.l - probeBreite;
      const mittig = grundStil?.textAlign === "center";
      const davor = mittig ? luecke / 2 : 0;
      const danach = mittig ? -luecke / 2 : -luecke;
      let stelle = 0;
      let links = 0;
      Array.from(text).forEach((zeichen, nr) => {
        bereich.setStart(knoten, stelle);
        stelle += zeichen.length;
        bereich.setEnd(knoten, stelle);
        const b = bereich.getBoundingClientRect();
        if (nr === 0) links = b.left;
        const zelle = zellen[nr];
        if (zelle) zelle.erstOrt = { l: zellen[0].ort.l + davor + (b.left - links), t: zeile.ort.t, b: b.width, h: zeile.ort.h };
      });
      probe.remove();
      // Die übrigen Buchstaben derselben Zeile.
      for (const f of felder) {
        if (zuGruppe.has(f) || Math.abs(f.y - zeile.y) > zeile.ort.h * 0.5) continue;
        f.erstOrt = { ...f.ort, l: f.ort.l + (f.x < zellen[0].ort.l ? davor : danach) };
      }
    }
    orte = felder.map((f) => ({ x: f.x, y: f.y }));
    huelle.append(neu);
    ebene = neu;
    huelle.dataset.spiel = "1";
    return true;
  };

  const wecken = () => {
    if (rahmen || vorbei || !ebene) return;
    rahmen = requestAnimationFrame(bild);
  };
  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei || !ebene) return;
    const dt = zuletzt ? jetzt - zuletzt : 1000 / 60;
    zuletzt = jetzt;
    // Wie oft ein Zufallszeichen wechselt (je Bild, auf 60 Bilder je Sekunde bezogen): beim
    // Einrasten und unter der Maus 40 %, solange die Überschrift nur verhüllt dasteht 5 %.
    const anteil = zustand === "verhuellt" ? 0.05 : 0.4;
    const wechsel = 1 - Math.pow(1 - anteil, Math.max(0.25, dt / (1000 / 60)));
    let offen = false;
    for (const f of felder) {
      if (!f.wirr) continue;
      if (f.rastet && jetzt >= f.rastet) {
        zeigeFest(f, f.ziel);
        continue;
      }
      offen = true;
      if (Math.random() < wechsel) f.el.textContent = zufall();
    }
    if (!offen) {
      zuletzt = 0;
      // Unter der Maus ist alles wieder eingerastet: Die Ebene geht, der echte Text steht da.
      if (zustand === "fertig") abbauen();
      return;
    }
    // Verhüllt wird nur gespielt, solange die Überschrift im Bild ist.
    if (zustand !== "verhuellt" || imBild) wecken();
    else zuletzt = 0;
  };

  const schluss = () => {
    if (vorbei) return;
    zustand = "fertig";
    abbauen();
    // Ab jetzt leuchtet das goldene Schlüsselwort einmal auf (Stylesheet).
    huelle.dataset.fertig = "1";
    beiFertig?.();
  };

  const waechter = new IntersectionObserver((eintraege) => {
    imBild = eintraege[eintraege.length - 1].isIntersecting;
    if (imBild) wecken();
  });
  waechter.observe(huelle);
  // Ändert sich die Größe (Fensterbreite, nachgeladene Schrift), stimmen die Plätze nicht mehr.
  let breiteZuletzt = huelle.offsetWidth;
  let hoeheZuletzt = huelle.offsetHeight;
  const neuVermessen = () => {
    if (vorbei) return;
    orte = null;
    if (zustand === "verhuellt") {
      if (baue(true)) wecken();
    } else if (zustand === "fertig") abbauen();
  };
  const groesse = new ResizeObserver(() => {
    if (huelle.offsetWidth === breiteZuletzt && huelle.offsetHeight === hoeheZuletzt) return;
    breiteZuletzt = huelle.offsetWidth;
    hoeheZuletzt = huelle.offsetHeight;
    neuVermessen();
  });
  groesse.observe(huelle);
  document.fonts?.ready.then(neuVermessen).catch(() => undefined);

  return {
    verhuellen: () => {
      if (vorbei || zustand !== "ruhe") return;
      if (!baue(true)) return;
      zustand = "verhuellt";
      wecken();
    },
    loesen: (dauer = 900) => {
      if (vorbei || zustand === "loest" || zustand === "fertig") return;
      if (!ebene && !baue(true)) return schluss();
      zustand = "loest";
      const ab = performance.now();
      felder.forEach((f, i) => {
        if (!f.wirr) zeigeWirr(f);
        f.ziel = f.erst !== null || f.erstOrt ? "erst" : "echt";
        // Von links nach rechts (in Lesereihenfolge): Der letzte Buchstabe rastet am Ende der Dauer ein.
        f.rastet = ab + (dauer * (i + 1)) / felder.length;
      });
      wecken();
      const gruppe = felder.filter((f) => f.erst !== null);
      if (!gruppe.length) return void spaeter(dauer + 80, schluss);
      // Das Zwischenwort bleibt kurz stehen (0,55 s). Dann zerfällt es Buchstabe für Buchstabe in
      // Zufallszeichen (0,05 s Abstand) und rastet nach 0,6 s von links nach rechts als das
      // echte Wort ein (0,45 s).
      spaeter(dauer + 550, () => {
        if (vorbei) return;
        const zerfall = performance.now();
        // Der Rest der Zeile gleitet an seinen echten Platz zurück.
        for (const f of felder) if (f.erst === null && f.erstOrt) setzeOrt(f, f.ort);
        gruppe.forEach((f, i) =>
          spaeter(i * 50, () => {
            if (vorbei || !ebene) return;
            zeigeWirr(f);
            f.ziel = "echt";
            f.rastet = zerfall + 600 + (450 * (i + 1)) / gruppe.length;
            wecken();
          }),
        );
        spaeter(600 + 450 + 120, schluss);
      });
    },
    stehen: () => {
      if (vorbei || zustand === "fertig") return;
      zustand = "fertig";
      abbauen();
    },
    stoeren: (cx, cy) => {
      if (vorbei || zustand !== "fertig") return;
      const kasten = huelle.getBoundingClientRect();
      const x = cx - kasten.left;
      const y = cy - kasten.top;
      if (x < -STOER_UMKREIS || y < -STOER_UMKREIS || x > kasten.width + STOER_UMKREIS || y > kasten.height + STOER_UMKREIS) return;
      // Liegt gar kein Buchstabe in der Nähe, bleibt der echte Text einfach stehen.
      if (!ebene && orte && !orte.some((o) => Math.hypot(o.x - x, o.y - y) <= STOER_UMKREIS)) return;
      if (!ebene && !baue(false)) return;
      const jetzt = performance.now();
      let getroffen = false;
      for (const f of felder) {
        if (Math.hypot(f.x - x, f.y - y) > STOER_UMKREIS) continue;
        getroffen = true;
        if (!f.wirr) zeigeWirr(f);
        f.ziel = "echt";
        // Nach 0,22 bis 0,48 s rastet der Buchstabe wieder ein.
        f.rastet = jetzt + 220 + Math.random() * 260;
      }
      if (getroffen) wecken();
      else if (!felder.some((f) => f.wirr)) abbauen();
    },
    ende: () => {
      vorbei = true;
      uhren.forEach((u) => window.clearTimeout(u));
      waechter.disconnect();
      groesse.disconnect();
      abbauen();
      delete huelle.dataset.fertig;
    },
  };
}

type Props = {
  als?: "h1" | "h2" | "h3" | "p";
  className?: string;
  children: ReactNode;
  /** Dauer des Einrastens in Millisekunden. */
  dauer?: number;
};

/**
 * Überschrift, die sich entschlüsselt: Sie steht als Zufallszeichen da und setzt sich beim
 * Hinscrollen von links nach rechts zusammen, einmal je Seitenaufruf; danach bleibt sie stehen,
 * auch wenn man wieder wegscrollt. Das goldene Schlüsselwort leuchtet danach kurz auf. Fährt die
 * Maus über die Überschrift, verbuggen die Buchstaben in der Nähe kurz und rasten wieder ein.
 * Ohne Skript, bei „weniger Bewegung“ und in der Vorschau steht sie einfach da.
 */
export function Entschluesselt({ als: Tag = "h2", className, children, dauer = 900 }: Props) {
  const ref = useRef<HTMLElement>(null);
  // Stellt der Besucher „weniger Bewegung“ um, richtet sich die Überschrift neu ein. Was bei diesem
  // Seitenaufruf schon stand, setzt sich danach nicht noch einmal zusammen.
  const wechsel = useBewegungsWechsel();
  const stand = useRef(false);

  useEffect(() => {
    const el = ref.current;
    const huelle = el?.querySelector<HTMLElement>(".ag-wuerfel");
    if (!el || !huelle || istVorschau()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // „Weniger Bewegung“: Die Überschrift steht einfach da.
      stand.current = true;
      return;
    }
    const spiel = erzeugeSpiel(huelle, () => {
      stand.current = true;
    });
    let waechter: ScrollTrigger | undefined;
    // Stand sie schon, oder wurde die Seite weiter unten geladen und sie liegt über dem Bild: Sie steht einfach da.
    if (stand.current || huelle.getBoundingClientRect().bottom < 0) {
      stand.current = true;
      spiel.stehen();
    } else {
      spiel.verhuellen();
      waechter = ScrollTrigger.create({ trigger: huelle, start: "top 84%", once: true, onEnter: () => spiel.loesen(dauer) });
    }
    const maus = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse") spiel.stoeren(ev.clientX, ev.clientY);
    };
    el.addEventListener("pointermove", maus, { passive: true });
    return () => {
      waechter?.kill();
      el.removeEventListener("pointermove", maus);
      spiel.ende();
    };
  }, [dauer, wechsel]);

  return (
    <Tag ref={ref as never} className={className}>
      <span className="ag-wuerfel ag-wuerfel--satz">
        <span className="ag-wuerfel__echt">{children}</span>
      </span>
    </Tag>
  );
}
