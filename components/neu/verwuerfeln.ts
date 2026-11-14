// Verwürfeln: Text aus Zufallszeichen, die nach und nach einrasten.
//
// Zwei Anwendungen:
//   - Beim Drüberfahren (Name oben links, Menüpunkte, „Anrufen“): Der Text
//     verwürfelt sich 0,5 Sekunden lang. Jeder Buchstabe rastet zu einer
//     eigenen Zeit zwischen 20 % und 100 % der Dauer ein.
//   - Enthüllen (Sprechblase am Chat-Knopf): Der Text besteht zuerst nur aus
//     Zufallszeichen und rastet über 0,7 Sekunden von links nach rechts ein.
// Bis zum Einrasten zeigt ein Buchstabe mit 40 % Wahrscheinlichkeit pro Bild ein
// neues Zufallszeichen. Jeder Buchstabe behält Platz und Breite, nichts springt.
//
// Der echte Text bleibt die ganze Zeit im Dokument (für Vorleseprogramme) und
// wird nur durchsichtig; das Spiel läuft in einer Ebene darüber, die für sie
// unsichtbar ist. Erwartet wird dieser Aufbau:
//   <span class="ag-wuerfel"><span class="ag-wuerfel__echt">Text</span></span>

const ZEICHEN = ["#", "+", "=", "-", ":", ".", "*", "/", "%", "·"];

type Spiel = {
  /** Dauer in Millisekunden. */
  dauer: number;
  /** Wann der Buchstabe einrastet (0 bis 1), aus seiner Stelle und der Anzahl. */
  rastet: (stelle: number, anzahl: number) => number;
  /** Zeigt jeder Buchstabe schon im ersten Bild ein Zufallszeichen? */
  gleichZufall: boolean;
};

/** Setzt ein Zufallszeichen in das Feld (in der Schrift der Zeichen, JetBrains Mono). */
const zufaellig = (el: HTMLElement) => {
  el.className = "ag-zufall";
  el.textContent = ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
};

/** Startet das Spiel über dem Text von „huelle“. Gibt eine Funktion zurück, die es sofort beendet. */
function spiele(huelle: HTMLElement, spiel: Spiel): () => void {
  const echt = huelle.querySelector<HTMLElement>(".ag-wuerfel__echt");
  const knoten = echt?.firstChild;
  if (!echt || !(knoten instanceof Text) || !knoten.data.trim()) return () => {};
  huelle.querySelector(".ag-wuerfel__spiel")?.remove();

  // Jeder Buchstabe bekommt genau den Platz und die Breite, die er im echten Text hat
  // (auch über mehrere Zeilen).
  const kasten = huelle.getBoundingClientRect();
  // Wird das Element gerade vergrößert oder verkleinert dargestellt (die Sprechblase wächst aus
  // dem Knopf heraus), sind die gemessenen Maße mit diesem Maßstab zurückzurechnen.
  const massstab = huelle.offsetWidth > 0 ? kasten.width / huelle.offsetWidth || 1 : 1;
  const sperrung = parseFloat(getComputedStyle(echt).letterSpacing) || 0;
  const bereich = document.createRange();
  const ebene = document.createElement("span");
  ebene.className = "ag-wuerfel__spiel";
  ebene.setAttribute("aria-hidden", "true");
  const felder: { el: HTMLSpanElement; zeichen: string; rastet: number; fest: boolean }[] = [];
  let stelle = 0;
  for (const zeichen of knoten.data) {
    const von = stelle;
    stelle += zeichen.length;
    if (!zeichen.trim()) continue;
    bereich.setStart(knoten, von);
    bereich.setEnd(knoten, stelle);
    const b = bereich.getBoundingClientRect();
    const el = document.createElement("span");
    el.style.left = `${(b.left - kasten.left) / massstab}px`;
    el.style.top = `${(b.top - kasten.top) / massstab}px`;
    el.style.width = `${Math.max(1, b.width / massstab - sperrung)}px`;
    el.style.height = `${b.height / massstab}px`;
    el.style.lineHeight = `${b.height / massstab}px`;
    if (spiel.gleichZufall) zufaellig(el);
    else el.textContent = zeichen;
    ebene.append(el);
    felder.push({ el, zeichen, rastet: 0, fest: false });
  }
  felder.forEach((f, i) => (f.rastet = spiel.rastet(i, felder.length)));
  huelle.append(ebene);
  huelle.dataset.spiel = "1";

  let rahmen = 0;
  const ende = () => {
    cancelAnimationFrame(rahmen);
    rahmen = 0;
    ebene.remove();
    if (!huelle.querySelector(".ag-wuerfel__spiel")) delete huelle.dataset.spiel;
  };
  const start = performance.now();
  let zuletzt = start;
  const bild = (jetzt: number) => {
    const t = (jetzt - start) / spiel.dauer;
    // „Pro Bild“ gilt für 60 Bilder je Sekunde.
    const wechsel = 1 - Math.pow(0.6, Math.max(0.25, (jetzt - zuletzt) / (1000 / 60)));
    zuletzt = jetzt;
    let offen = false;
    for (const f of felder) {
      if (f.fest) continue;
      if (t >= f.rastet) {
        f.fest = true;
        f.el.className = "";
        f.el.textContent = f.zeichen;
      } else {
        offen = true;
        if (Math.random() < wechsel) zufaellig(f.el);
      }
    }
    if (offen) rahmen = requestAnimationFrame(bild);
    else ende();
  };
  rahmen = requestAnimationFrame(bild);
  return ende;
}

/**
 * Verwürfeln beim Drüberfahren für alle Einträge mit `data-wuerfel` unter „wurzel“.
 * Nur bei echter Maus, nicht bei „weniger Bewegung“. Gibt die Funktion zum Abbauen zurück.
 */
export function richteVerwuerfelnEin(wurzel: HTMLElement): () => void {
  const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
  const abbau: (() => void)[] = [];

  wurzel.querySelectorAll<HTMLElement>("[data-wuerfel]").forEach((eintrag) => {
    const huelle = eintrag.querySelector<HTMLElement>(".ag-wuerfel");
    if (!huelle) return;
    let stopp = () => {};
    const los = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || !feinerZeiger.matches || wenigBewegung.matches) return;
      stopp();
      // Eigene Einrast-Zeit je Buchstabe: zwischen 20 % und 100 % der Dauer.
      stopp = spiele(huelle, { dauer: 500, rastet: () => 0.2 + Math.random() * 0.8, gleichZufall: false });
    };
    eintrag.addEventListener("pointerenter", los);
    abbau.push(() => {
      eintrag.removeEventListener("pointerenter", los);
      stopp();
    });
  });

  return () => abbau.forEach((f) => f());
}

/**
 * Enthüllen: Der Text von „huelle“ besteht zuerst nur aus Zufallszeichen und rastet über 0,7 s
 * (oder die genannte Dauer) von links nach rechts ein. Bei „weniger Bewegung“ steht er sofort da. Gibt den Abbruch zurück.
 */
export function enthuelleText(huelle: HTMLElement, dauer = 700): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  return spiele(huelle, { dauer, rastet: (stelle, anzahl) => (stelle + 1) / anzahl, gleichZufall: true });
}
