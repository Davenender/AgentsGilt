// Verwürfeln beim Drüberfahren: der Name oben links und die Menüpunkte.
//
// Fährt die Maus auf einen Eintrag, verwürfelt sich sein Text 0,5 Sekunden lang.
// Jeder Buchstabe rastet zu einer eigenen Zeit zwischen 20 % und 100 % der Dauer
// ein. Bis dahin zeigt er mit 40 % Wahrscheinlichkeit pro Bild ein Zufallszeichen.
// Jeder Buchstabe behält seine Breite und seinen Platz, nichts springt.
//
// Der echte Text bleibt die ganze Zeit im Dokument (für Vorleseprogramme); das
// Spiel läuft in einer Ebene darüber, die für sie unsichtbar ist. Nur bei echter
// Maus, nicht bei „weniger Bewegung“.

const ZEICHEN = ["#", "+", "=", "-", ":", ".", "*", "/", "%", "·"];
const DAUER = 500; // ms

/**
 * Richtet das Verwürfeln für alle Einträge mit `data-wuerfel` unter „wurzel“ ein.
 * Erwartet in jedem Eintrag: <span class="ag-wuerfel"><span class="ag-wuerfel__echt">Text</span></span>.
 * Gibt die Funktion zum Abbauen zurück.
 */
export function richteVerwuerfelnEin(wurzel: HTMLElement): () => void {
  const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
  const abbau: (() => void)[] = [];

  wurzel.querySelectorAll<HTMLElement>("[data-wuerfel]").forEach((eintrag) => {
    const huelle = eintrag.querySelector<HTMLElement>(".ag-wuerfel");
    const echt = huelle?.querySelector<HTMLElement>(".ag-wuerfel__echt");
    if (!huelle || !echt) return;
    let spiel: HTMLSpanElement | null = null;
    let rahmen = 0;

    const stopp = () => {
      cancelAnimationFrame(rahmen);
      rahmen = 0;
      spiel?.remove();
      spiel = null;
      delete huelle.dataset.spiel;
    };

    const los = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || !feinerZeiger.matches || wenigBewegung.matches) return;
      const knoten = echt.firstChild;
      if (!(knoten instanceof Text) || !knoten.data.trim()) return;
      stopp();
      const text = knoten.data;
      // Jeder Buchstabe bekommt genau den Platz und die Breite, die er im echten Text hat.
      const kasten = huelle.getBoundingClientRect();
      const sperrung = parseFloat(getComputedStyle(echt).letterSpacing) || 0;
      const bereich = document.createRange();
      const ebene = document.createElement("span");
      ebene.className = "ag-wuerfel__spiel";
      ebene.setAttribute("aria-hidden", "true");
      const felder: { el: HTMLSpanElement; zeichen: string; rastet: number; fest: boolean }[] = [];
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        bereich.setStart(knoten, i);
        bereich.setEnd(knoten, i + 1);
        const b = bereich.getBoundingClientRect();
        const el = document.createElement("span");
        el.style.left = `${b.left - kasten.left}px`;
        el.style.width = `${Math.max(1, b.width - sperrung)}px`;
        el.textContent = text[i];
        ebene.append(el);
        // Eigene Einrast-Zeit: zwischen 20 % und 100 % der Dauer.
        felder.push({ el, zeichen: text[i], rastet: 0.2 + Math.random() * 0.8, fest: false });
      }
      spiel = ebene;
      huelle.append(ebene);
      huelle.dataset.spiel = "1";

      const start = performance.now();
      let zuletzt = start;
      const bild = (jetzt: number) => {
        const t = (jetzt - start) / DAUER;
        // „Pro Bild“ gilt für 60 Bilder je Sekunde.
        const wechsel = 1 - Math.pow(0.6, Math.max(0.25, (jetzt - zuletzt) / (1000 / 60)));
        zuletzt = jetzt;
        let offen = false;
        for (const f of felder) {
          if (f.fest) continue;
          if (t >= f.rastet) {
            f.fest = true;
            f.el.textContent = f.zeichen;
          } else {
            offen = true;
            if (Math.random() < wechsel) f.el.textContent = ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
          }
        }
        if (offen) rahmen = requestAnimationFrame(bild);
        else stopp();
      };
      rahmen = requestAnimationFrame(bild);
    };

    eintrag.addEventListener("pointerenter", los);
    abbau.push(() => {
      eintrag.removeEventListener("pointerenter", los);
      stopp();
    });
  });

  return () => abbau.forEach((f) => f());
}
