"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { istVorschau } from "../umgebung";

const ZEICHEN = ["#", "+", "=", "-", ":", ".", "*", "/", "%", "·"];

/**
 * Entschlüsseln: Die Buchstaben laufen kurz als Zufallszeichen durch und rasten von links nach
 * rechts ein (etwa 0,9 s). Anders als das Verwürfeln der Kopfleiste (verwuerfeln.ts) geht das
 * auch über mehrere Zeilen und über Wörter in anderer Schrift und Farbe (das goldene Wort):
 * Jeder Buchstabe bekommt beim Einrasten genau die Schrift und Farbe, die er im echten Text hat.
 *
 * Der echte Text bleibt die ganze Zeit im Dokument (für Vorleseprogramme) und wird nur
 * durchsichtig; das Spiel läuft in einer Ebene darüber. Gibt den Abbruch zurück.
 */
export function entschluessle(huelle: HTMLElement, dauer = 900): () => void {
  const echt = huelle.querySelector<HTMLElement>(".ag-wuerfel__echt");
  if (!echt) return () => {};
  huelle.querySelector(".ag-wuerfel__spiel")?.remove();
  const kasten = huelle.getBoundingClientRect();
  if (kasten.width < 1) return () => {};
  const ebene = document.createElement("span");
  ebene.className = "ag-wuerfel__spiel";
  ebene.setAttribute("aria-hidden", "true");
  const bereich = document.createRange();
  const felder: { el: HTMLSpanElement; zeichen: string; stil: CSSStyleDeclaration; rastet: number; fest: boolean }[] = [];
  const stile = new Map<Element, CSSStyleDeclaration>();
  const lauf = document.createTreeWalker(echt, NodeFilter.SHOW_TEXT);
  for (let knoten = lauf.nextNode() as Text | null; knoten; knoten = lauf.nextNode() as Text | null) {
    const eltern = knoten.parentElement;
    if (!eltern) continue;
    let stil = stile.get(eltern);
    if (!stil) {
      stil = getComputedStyle(eltern);
      stile.set(eltern, stil);
    }
    let stelle = 0;
    for (const zeichen of knoten.data) {
      const von = stelle;
      stelle += zeichen.length;
      if (!zeichen.trim()) continue;
      bereich.setStart(knoten, von);
      bereich.setEnd(knoten, stelle);
      const b = bereich.getBoundingClientRect();
      if (b.width < 0.5) continue;
      const el = document.createElement("span");
      el.className = "ag-zufall";
      el.style.left = `${b.left - kasten.left}px`;
      el.style.top = `${b.top - kasten.top}px`;
      el.style.width = `${b.width}px`;
      el.style.height = `${b.height}px`;
      el.style.lineHeight = `${b.height}px`;
      el.style.color = stil.color;
      el.textContent = ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
      ebene.append(el);
      felder.push({ el, zeichen, stil, rastet: 0, fest: false });
    }
  }
  if (!felder.length) return () => {};
  // Von links nach rechts (in Lesereihenfolge): Der letzte Buchstabe rastet am Ende der Dauer ein.
  felder.forEach((f, i) => (f.rastet = (i + 1) / felder.length));
  huelle.append(ebene);
  huelle.dataset.spiel = "1";

  let rahmen = 0;
  const ende = () => {
    cancelAnimationFrame(rahmen);
    ebene.remove();
    if (!huelle.querySelector(".ag-wuerfel__spiel")) delete huelle.dataset.spiel;
  };
  const start = performance.now();
  let zuletzt = start;
  const bild = (jetzt: number) => {
    const t = (jetzt - start) / dauer;
    // 40 % Wechsel je Bild, auf 60 Bilder je Sekunde bezogen.
    const wechsel = 1 - Math.pow(0.6, Math.max(0.25, (jetzt - zuletzt) / (1000 / 60)));
    zuletzt = jetzt;
    let offen = false;
    for (const f of felder) {
      if (f.fest) continue;
      if (t >= f.rastet) {
        // Eingerastet: der echte Buchstabe in seiner echten Schrift.
        f.fest = true;
        f.el.className = "";
        f.el.style.fontFamily = f.stil.fontFamily;
        f.el.style.fontSize = f.stil.fontSize;
        f.el.style.fontWeight = f.stil.fontWeight;
        f.el.style.fontStyle = f.stil.fontStyle;
        f.el.style.textTransform = f.stil.textTransform;
        f.el.textContent = f.zeichen;
      } else {
        offen = true;
        if (Math.random() < wechsel) f.el.textContent = ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
      }
    }
    if (offen) rahmen = requestAnimationFrame(bild);
    else ende();
  };
  rahmen = requestAnimationFrame(bild);
  return ende;
}

type Props = {
  als?: "h1" | "h2" | "h3" | "p";
  className?: string;
  children: ReactNode;
  /** Dauer in Millisekunden. */
  dauer?: number;
};

/**
 * Überschrift mit Entschlüsselungs-Effekt: Kommt sie ins Bild, laufen die Buchstaben als
 * Zufallszeichen durch und rasten von links nach rechts ein. Ohne Skript, bei „weniger
 * Bewegung“ und in der Vorschau steht sie einfach da.
 */
export function Entschluesselt({ als: Tag = "h2", className, children, dauer = 900 }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const huelle = ref.current?.querySelector<HTMLElement>(".ag-wuerfel");
    if (!huelle || istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stopp = () => {};
    const waechter = ScrollTrigger.create({
      trigger: huelle,
      start: "top 92%",
      once: true,
      onEnter: () => {
        stopp = entschluessle(huelle, dauer);
      },
    });
    return () => {
      waechter.kill();
      stopp();
    };
  }, [dauer]);

  return (
    <Tag ref={ref as never} className={className}>
      <span className="ag-wuerfel ag-wuerfel--satz">
        <span className="ag-wuerfel__echt">{children}</span>
      </span>
    </Tag>
  );
}
