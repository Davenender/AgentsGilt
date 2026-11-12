// Magnet: Ein Knopf wird zur Maus hingezogen, wenn sie in der Nähe ist, und
// federt mit leichtem Überschwingen zurück (etwa 0,6 s), wenn sie sich entfernt.
//
// Gesetzt werden am Element: --mx und --my (Versatz in px) und --ms (Größe).
// Das Stylesheet verschiebt und vergrößert damit; ein inneres Teil darf sich
// über dieselben Werte stärker mitbewegen (Tiefenwirkung).
//
// Nur bei echter Maus, nicht bei „weniger Bewegung“.

export type MagnetWahl = {
  /** Fangbereich in px. */
  bereich: number;
  /** Zug als Anteil des Abstands zur Maus (0,35 = bis zu 35 %). */
  anteil: number;
  /** Höchster Versatz in px. */
  hoechstens: number;
  /** Wie viel der Knopf höchstens wächst (0,08 = bis 1,08). */
  wachsen?: number;
  /** Abstand ab dem Rand des Knopfs messen statt ab seiner Mitte (für breite Knöpfe). */
  abRand?: boolean;
};

// Feder: leicht unterdämpft, schwingt etwa 5 % über und steht nach rund 0,6 s.
const HAERTE = 170;
const DAEMPFUNG = 18;

export function richteMagnetEin(el: HTMLElement, wahl: MagnetWahl): () => void {
  const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Gilt auch, wenn jemand die Einstellung bei offener Seite umstellt.
  const erlaubt = () => feinerZeiger.matches && !wenigBewegung.matches;

  const ist = { x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0 };
  const ziel = { x: 0, y: 0, s: 1 };
  let maus: { x: number; y: number } | null = null;
  let rahmen = 0;
  let zuletzt = 0;

  const zielen = () => {
    ziel.x = 0;
    ziel.y = 0;
    ziel.s = 1;
    if (!maus) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    // Ruhelage: die Mitte ohne den jetzigen Versatz.
    const mx = r.left + r.width / 2 - ist.x;
    const my = r.top + r.height / 2 - ist.y;
    const dx = maus.x - mx;
    const dy = maus.y - my;
    const mitte = Math.hypot(dx, dy);
    const fern = wahl.abRand ? Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0)) : mitte;
    if (fern >= wahl.bereich || mitte < 0.5) return;
    // Je näher die Maus, desto stärker der Zug.
    const naehe = 1 - fern / wahl.bereich;
    const zug = Math.min(wahl.hoechstens, mitte * wahl.anteil) * naehe;
    ziel.x = (dx / mitte) * zug;
    ziel.y = (dy / mitte) * zug;
    ziel.s = 1 + (wahl.wachsen ?? 0) * naehe;
  };

  const bild = (jetzt: number) => {
    rahmen = 0;
    const dt = zuletzt ? Math.min(0.032, (jetzt - zuletzt) / 1000) : 1 / 60;
    zuletzt = jetzt;
    zielen();
    ist.vx += (HAERTE * (ziel.x - ist.x) - DAEMPFUNG * ist.vx) * dt;
    ist.vy += (HAERTE * (ziel.y - ist.y) - DAEMPFUNG * ist.vy) * dt;
    ist.vs += (HAERTE * (ziel.s - ist.s) - DAEMPFUNG * ist.vs) * dt;
    ist.x += ist.vx * dt;
    ist.y += ist.vy * dt;
    ist.s += ist.vs * dt;
    const ruht = Math.abs(ziel.x - ist.x) < 0.05 && Math.abs(ziel.y - ist.y) < 0.05 && Math.abs(ziel.s - ist.s) < 0.001 && Math.abs(ist.vx) < 0.5 && Math.abs(ist.vy) < 0.5 && Math.abs(ist.vs) < 0.01;
    if (ruht) {
      ist.x = ziel.x;
      ist.y = ziel.y;
      ist.s = ziel.s;
      ist.vx = ist.vy = ist.vs = 0;
      zuletzt = 0;
    } else rahmen = requestAnimationFrame(bild);
    el.style.setProperty("--mx", `${ist.x.toFixed(2)}px`);
    el.style.setProperty("--my", `${ist.y.toFixed(2)}px`);
    el.style.setProperty("--ms", ist.s.toFixed(4));
  };
  const wecken = () => {
    if (!rahmen) rahmen = requestAnimationFrame(bild);
  };
  const ruhe = () => {
    cancelAnimationFrame(rahmen);
    rahmen = 0;
    zuletzt = 0;
    maus = null;
    ist.x = ist.y = ist.vx = ist.vy = ist.vs = 0;
    ist.s = 1;
    el.style.removeProperty("--mx");
    el.style.removeProperty("--my");
    el.style.removeProperty("--ms");
  };
  const bewegt = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse" || !erlaubt()) return;
    maus = { x: ev.clientX, y: ev.clientY };
    wecken();
  };
  const weg = () => {
    if (!maus) return;
    maus = null;
    wecken();
  };
  const umgestellt = () => {
    if (!erlaubt()) ruhe();
  };
  window.addEventListener("pointermove", bewegt, { passive: true });
  document.documentElement.addEventListener("pointerleave", weg);
  wenigBewegung.addEventListener("change", umgestellt);
  feinerZeiger.addEventListener("change", umgestellt);

  return () => {
    window.removeEventListener("pointermove", bewegt);
    document.documentElement.removeEventListener("pointerleave", weg);
    wenigBewegung.removeEventListener("change", umgestellt);
    feinerZeiger.removeEventListener("change", umgestellt);
    ruhe();
  };
}
