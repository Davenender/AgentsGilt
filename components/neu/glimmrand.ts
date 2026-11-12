// Glimmrand: ein feiner Goldrand, der nur dort aufglimmt, wo die Maus in der Nähe ist.
//
// Ein weicher Lichtfleck (im Stylesheet rund 120 px breit) folgt der Maus am Rand
// entlang: Er sitzt immer an der Stelle des Elements, die der Maus am nächsten
// ist, und zieht je Bild 20 % nach. Ist die Maus weiter als 200 px weg, bleibt
// nur der ganz schwache Grundrand. Gesetzt werden drei Werte am Element:
// --gx und --gy (Ort des Flecks) und --gn (Nähe, 0 bis 1).
//
// Nur bei echter Maus, nicht bei „weniger Bewegung“.

const BEREICH = 200;

/** Richtet den Glimmrand für alle Elemente mit `data-glimm` unter „wurzel“ ein. Gibt den Abbau zurück. */
export function richteGlimmrandEin(wurzel: ParentNode): () => void {
  const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Gilt auch, wenn jemand die Einstellung bei offener Seite umstellt.
  const erlaubt = () => feinerZeiger.matches && !wenigBewegung.matches;

  const teile = Array.from(wurzel.querySelectorAll<HTMLElement>("[data-glimm]")).map((el) => ({ el, x: 0, y: 0, n: 0, da: false }));
  if (!teile.length) return () => {};
  let maus: { x: number; y: number } | null = null;
  let rahmen = 0;
  let zuletzt = 0;

  const bild = (jetzt: number) => {
    rahmen = 0;
    // 20 % je Bild, auf 60 Bilder je Sekunde bezogen.
    const zug = 1 - Math.pow(0.8, zuletzt ? Math.min(6, (jetzt - zuletzt) / (1000 / 60)) : 1);
    zuletzt = jetzt;
    let weiter = false;
    for (const t of teile) {
      const r = t.el.getBoundingClientRect();
      if (!r.width) continue;
      let zx = t.x;
      let zy = t.y;
      let zn = 0;
      if (maus) {
        // Die Stelle am Element, die der Maus am nächsten ist.
        zx = Math.max(0, Math.min(r.width, maus.x - r.left));
        zy = Math.max(0, Math.min(r.height, maus.y - r.top));
        const fern = Math.hypot(Math.max(r.left - maus.x, 0, maus.x - r.right), Math.max(r.top - maus.y, 0, maus.y - r.bottom));
        zn = Math.max(0, 1 - fern / BEREICH);
      }
      if (!t.da) {
        t.x = zx;
        t.y = zy;
        t.da = true;
      }
      t.x += (zx - t.x) * zug;
      t.y += (zy - t.y) * zug;
      t.n += (zn - t.n) * zug;
      if (Math.abs(zx - t.x) > 0.3 || Math.abs(zy - t.y) > 0.3 || Math.abs(zn - t.n) > 0.004) weiter = true;
      else {
        t.x = zx;
        t.y = zy;
        t.n = zn;
      }
      t.el.style.setProperty("--gx", `${t.x.toFixed(1)}px`);
      t.el.style.setProperty("--gy", `${t.y.toFixed(1)}px`);
      t.el.style.setProperty("--gn", t.n.toFixed(3));
    }
    if (weiter) rahmen = requestAnimationFrame(bild);
    else zuletzt = 0;
  };
  const wecken = () => {
    if (!rahmen) rahmen = requestAnimationFrame(bild);
  };
  const ruhe = () => {
    cancelAnimationFrame(rahmen);
    rahmen = 0;
    zuletzt = 0;
    maus = null;
    for (const t of teile) {
      t.n = 0;
      t.da = false;
      t.el.style.removeProperty("--gx");
      t.el.style.removeProperty("--gy");
      t.el.style.removeProperty("--gn");
    }
  };
  const bewegt = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse" || !erlaubt()) return;
    maus = { x: ev.clientX, y: ev.clientY };
    wecken();
  };
  const gescrollt = () => {
    // Beim Scrollen wandert die Seite unter der ruhenden Maus weiter.
    if (maus && erlaubt()) wecken();
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
  window.addEventListener("scroll", gescrollt, { passive: true });
  document.documentElement.addEventListener("pointerleave", weg);
  wenigBewegung.addEventListener("change", umgestellt);
  feinerZeiger.addEventListener("change", umgestellt);

  return () => {
    window.removeEventListener("pointermove", bewegt);
    window.removeEventListener("scroll", gescrollt);
    document.documentElement.removeEventListener("pointerleave", weg);
    wenigBewegung.removeEventListener("change", umgestellt);
    feinerZeiger.removeEventListener("change", umgestellt);
    ruhe();
  };
}
