// Ruhiges Ersatzbild des Kopfbereichs für das Handy und für „weniger Bewegung“:
// eine leichte 2D-Zeichnung statt der 3D-Szene. Ein paar Lichtpunkte schweben,
// je nach Variante als Staub, als Ring um das Zeichen oder als Ringe, die sich
// nach außen weiten. Ein Tippen auf den Kopfbereich lässt Funken aus der
// Stelle sprühen und das Zeichen kurz aufleuchten. Bei „weniger Bewegung“
// wird ein einziges stilles Bild gezeichnet.
import type { SzenenArt } from "./szene";

type Punkt = { x: number; y: number; r: number; s: number; w: number };
type Funke = { x: number; y: number; vx: number; vy: number; t: number };
type Welle = { x: number; y: number; t: number };

const GOLD = "243, 210, 122";
const BLAU = "188, 195, 226";

export function starteEinfach(leinwand: HTMLCanvasElement, anker: HTMLElement, art: SzenenArt, still: boolean) {
  const ctx = leinwand.getContext("2d");
  if (!ctx) return () => {};
  const held = leinwand.closest<HTMLElement>(".ag-hero") ?? leinwand;

  let breite = 0;
  let hoehe = 0;
  let mx = 0;
  let my = 0;
  let ankerR = 60;
  let punkte: Punkt[] = [];
  const funken: Funke[] = [];
  const wellen: Welle[] = [];

  // Gleichbleibende Zufallszahlen: Server, Browser und Aufnahmen zeigen dasselbe.
  let saat = 7 + art.length * 31;
  const rnd = () => {
    saat = (saat * 16807) % 2147483647;
    return saat / 2147483647;
  };

  const vermessen = () => {
    const dichte = Math.min(window.devicePixelRatio || 1, 2);
    const r = leinwand.getBoundingClientRect();
    breite = r.width;
    hoehe = r.height;
    leinwand.width = Math.round(breite * dichte);
    leinwand.height = Math.round(hoehe * dichte);
    ctx.setTransform(dichte, 0, 0, dichte, 0, 0);
    const a = anker.getBoundingClientRect();
    mx = a.left + a.width / 2 - r.left;
    my = a.top + a.height / 2 - r.top;
    ankerR = a.width / 2;
    saat = 7 + art.length * 31;
    const anzahl = art === "wolke" ? 90 : 46;
    punkte = Array.from({ length: anzahl }, (_, i) => ({
      x: rnd() * breite,
      y: rnd() * hoehe,
      r: 0.6 + rnd() * 1.3,
      s: rnd(),
      w: (i / anzahl) * Math.PI * 2,
    }));
    if (still) zeichnen(0);
  };

  const zeichnen = (zeit: number) => {
    ctx.clearRect(0, 0, breite, hoehe);

    // Ringe weiten sich vom Zeichen aus (Tiefenflug).
    if (art === "tiefe") {
      for (let k = 0; k < 4; k++) {
        const f = (zeit * 0.08 + k / 4) % 1;
        ctx.strokeStyle = `rgba(${BLAU}, ${0.22 * (1 - f)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mx, my, ankerR * (1.25 + f * 3.2), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Zwei geneigte Bahnen um das Zeichen (Lichtbänder).
    if (art === "baender") {
      for (let k = 0; k < 2; k++) {
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(-0.4 + k * 0.75);
        ctx.strokeStyle = `rgba(${GOLD}, ${0.3 - k * 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, ankerR * (1.75 + k * 0.3), ankerR * (0.62 + k * 0.18), 0, 0, Math.PI * 2);
        ctx.stroke();
        // Ein Lichtpunkt läuft auf jeder Bahn.
        const w = zeit * (0.5 + k * 0.2) + k * 2;
        ctx.fillStyle = `rgba(${GOLD}, 0.9)`;
        ctx.beginPath();
        ctx.arc(Math.cos(w) * ankerR * (1.75 + k * 0.3), Math.sin(w) * ankerR * (0.62 + k * 0.18), 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (const p of punkte) {
      let x = p.x;
      let y = p.y;
      if (art === "wolke") {
        // Ring aus Punkten, der sich langsam dreht.
        const w = p.w + zeit * 0.12;
        const r = ankerR * (1.7 + p.s * 0.5);
        x = mx + Math.cos(w) * r;
        y = my + Math.sin(w) * r * 0.92;
      } else {
        y = (((p.y - zeit * (6 + p.s * 10)) % hoehe) + hoehe) % hoehe;
        x = p.x + Math.sin(zeit * 0.4 + p.s * 20) * 6;
      }
      const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(zeit * 1.2 + p.s * 40));
      ctx.fillStyle = `rgba(${p.s > 0.86 ? GOLD : BLAU}, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const w of wellen) {
      ctx.strokeStyle = `rgba(${GOLD}, ${0.55 * (1 - w.t)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 8 + w.t * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const f of funken) {
      ctx.fillStyle = `rgba(${GOLD}, ${1 - f.t})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.8 * (1 - f.t) + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  let zeit = 0;
  let letzte = 0;
  let rahmen = 0;
  let sichtbar = true;
  const schritt = (jetzt: number) => {
    const dt = letzte ? Math.min(0.05, (jetzt - letzte) / 1000) : 0;
    letzte = jetzt;
    zeit += dt;
    for (let i = funken.length - 1; i >= 0; i--) {
      const f = funken[i];
      f.t += dt / 0.9;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= 0.94;
      f.vy *= 0.94;
      if (f.t >= 1) funken.splice(i, 1);
    }
    for (let i = wellen.length - 1; i >= 0; i--) {
      wellen[i].t += dt / 0.8;
      if (wellen[i].t >= 1) wellen.splice(i, 1);
    }
    zeichnen(zeit);
    rahmen = sichtbar ? requestAnimationFrame(schritt) : 0;
  };

  // Tippen: Funken sprühen, das Zeichen leuchtet auf und neigt sich zur Stelle.
  const tippen = (ev: PointerEvent) => {
    if (still || (ev.target as Element | null)?.closest("a, button, input, select, textarea")) return;
    const r = leinwand.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const y = ev.clientY - r.top;
    for (let i = 0; i < 26; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 170;
      funken.push({ x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, t: Math.random() * 0.3 });
    }
    wellen.push({ x, y, t: 0 });
    anker.style.setProperty("--kipp-x", `${(((y - my) / hoehe) * -24).toFixed(1)}deg`);
    anker.style.setProperty("--kipp-y", `${(((x - mx) / breite) * 30).toFixed(1)}deg`);
    anker.classList.remove("ist-hell");
    void anker.offsetWidth;
    anker.classList.add("ist-hell");
  };

  vermessen();
  const beobachter = new ResizeObserver(vermessen);
  beobachter.observe(leinwand);

  let waechter: IntersectionObserver | undefined;
  if (!still) {
    held.addEventListener("pointerdown", tippen);
    waechter = new IntersectionObserver((eintraege) => {
      // Kommen mehrere Meldungen auf einmal, zählt die letzte (der jetzige Stand).
      sichtbar = eintraege[eintraege.length - 1].isIntersecting;
      if (sichtbar && !rahmen) {
        letzte = 0;
        rahmen = requestAnimationFrame(schritt);
      }
    });
    waechter.observe(leinwand);
  }

  return () => {
    sichtbar = false;
    cancelAnimationFrame(rahmen);
    beobachter.disconnect();
    waechter?.disconnect();
    held.removeEventListener("pointerdown", tippen);
  };
}
