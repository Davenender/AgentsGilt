// Glimmrand: ein feiner Goldrand, der nur dort aufglimmt, wo die Maus in der Nähe ist.
//
// Ein weicher Lichtfleck (im Stylesheet rund 120 px breit) sitzt immer an der Stelle des Randes,
// die der Maus am nächsten ist: sofort, ohne Nachziehen. Weich ist nur das Auf- und Abblenden
// (die Nähe, etwa 0,15 s). Ist die Maus weiter als 200 px weg, bleibt nur der ganz schwache
// Grundrand. Gesetzt werden drei Werte am Element: --gx und --gy (Ort des Flecks) und --gn
// (Nähe, 0 bis 1).
//
// Nur bei echter Maus, nicht bei „weniger Bewegung“.
//
// Eine gemeinsame Schleife für die ganze Seite (seit 14.11.2026): Alle Teile mit `data-glimm`
// melden sich hier an, egal von welchem Baustein. Es gibt einen Maus-Lauscher und eine
// Bildschleife, nicht je Karte eine eigene.
//
// Leistung: Je Bild werden erst alle Flächen gemessen und danach alle Werte gesetzt (gemischt
// müsste der Browser die Seite für jedes Element neu durchrechnen). Gemessen wird nur, was im
// Bild oder knapp daneben ist. Ein Teil, das fern der Maus dunkel ruht, wird gar nicht angefasst,
// und gesetzt wird nur, was sich geändert hat.

const BEREICH = 200;
/** So schnell blendet der Rand auf und ab (Zeitkonstante in Sekunden: Nach rund 0,15 s steht er). */
const BLENDE = 0.05;

/** Ein zweites Licht für den Rand (der Stern hinter einer Nachbarkarte): Stelle am Teil und Stärke. */
export type GlimmLicht = { x: number; y: number; n: number };

type Teil = {
  el: HTMLElement;
  /** So viele Bausteine haben das Teil angemeldet. */
  zahl: number;
  /** Nähe, wie sie gerade gezeichnet ist (0 bis 1). */
  n: number;
  /** Im Bild oder knapp daneben? */
  imBild: boolean;
  licht: GlimmLicht | null;
  gx: string;
  gy: string;
  gn: string;
};

const teile = new Map<HTMLElement, Teil>();
let maus: { x: number; y: number } | null = null;
let rahmen = 0;
let zuletzt = 0;
let abbau: (() => void) | null = null;
let sicht: IntersectionObserver | null = null;
let erlaubt = () => false;

function bild(jetzt: number) {
  rahmen = 0;
  const dt = zuletzt ? Math.min(0.1, (jetzt - zuletzt) / 1000) : 1 / 60;
  zuletzt = jetzt;
  const zug = 1 - Math.exp(-dt / BLENDE);
  let weiter = false;
  // Erst messen (eine Durchrechnung der Seite für alle zusammen) …
  const dran: Teil[] = [];
  for (const t of teile.values()) if (t.imBild || t.n > 0 || t.licht) dran.push(t);
  const flaechen = dran.map((t) => t.el.getBoundingClientRect());
  // … dann rechnen und setzen.
  for (let i = 0; i < dran.length; i++) {
    const t = dran[i];
    const r = flaechen[i];
    let zn = 0;
    let zx = 0;
    let zy = 0;
    if (maus && r.width) {
      const fern = Math.hypot(Math.max(r.left - maus.x, 0, maus.x - r.right), Math.max(r.top - maus.y, 0, maus.y - r.bottom));
      zn = Math.max(0, 1 - fern / BEREICH);
      // Die Stelle am Element, die der Maus am nächsten ist.
      zx = Math.max(0, Math.min(r.width, maus.x - r.left));
      zy = Math.max(0, Math.min(r.height, maus.y - r.top));
    }
    // Scheint ein zweites Licht stärker auf den Rand (der Stern hinter der Nachbarkarte), gilt seine Stelle.
    if (t.licht && t.licht.n > zn) {
      zn = Math.min(1, t.licht.n);
      zx = Math.max(0, Math.min(r.width, t.licht.x));
      zy = Math.max(0, Math.min(r.height, t.licht.y));
    }
    // Fern der Maus und schon dunkel: nichts zu tun.
    if (zn === 0 && t.n === 0) continue;
    if (zn > 0) {
      // Die Stelle sitzt sofort, ohne Nachziehen.
      const gx = `${zx.toFixed(1)}px`;
      const gy = `${zy.toFixed(1)}px`;
      if (gx !== t.gx) t.el.style.setProperty("--gx", (t.gx = gx));
      if (gy !== t.gy) t.el.style.setProperty("--gy", (t.gy = gy));
    }
    // Nur das Auf- und Abblenden ist weich.
    t.n += (zn - t.n) * zug;
    if (Math.abs(zn - t.n) > 0.004) weiter = true;
    else t.n = zn;
    const gn = t.n.toFixed(3);
    if (gn !== t.gn) t.el.style.setProperty("--gn", (t.gn = gn));
  }
  if (weiter) rahmen = requestAnimationFrame(bild);
  else zuletzt = 0;
}

function wecken() {
  if (!rahmen && teile.size) rahmen = requestAnimationFrame(bild);
}

function leeren(t: Teil) {
  t.n = 0;
  t.gx = t.gy = t.gn = "";
  t.el.style.removeProperty("--gx");
  t.el.style.removeProperty("--gy");
  t.el.style.removeProperty("--gn");
}

function starten() {
  if (abbau) return;
  const feinerZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
  const wenigBewegung = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Gilt auch, wenn jemand die Einstellung bei offener Seite umstellt.
  erlaubt = () => feinerZeiger.matches && !wenigBewegung.matches;
  const ruhe = () => {
    cancelAnimationFrame(rahmen);
    rahmen = 0;
    zuletzt = 0;
    maus = null;
    for (const t of teile.values()) leeren(t);
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
  // Nur was im Bild ist (oder bis 200 px daneben), wird je Bild gemessen.
  sicht = new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) {
        const t = teile.get(e.target as HTMLElement);
        if (t) t.imBild = e.isIntersecting;
      }
      if (maus) wecken();
    },
    { rootMargin: `${BEREICH}px` },
  );
  for (const t of teile.values()) sicht.observe(t.el);
  window.addEventListener("pointermove", bewegt, { passive: true });
  window.addEventListener("scroll", gescrollt, { passive: true });
  document.documentElement.addEventListener("pointerleave", weg);
  wenigBewegung.addEventListener("change", umgestellt);
  feinerZeiger.addEventListener("change", umgestellt);
  abbau = () => {
    window.removeEventListener("pointermove", bewegt);
    window.removeEventListener("scroll", gescrollt);
    document.documentElement.removeEventListener("pointerleave", weg);
    wenigBewegung.removeEventListener("change", umgestellt);
    feinerZeiger.removeEventListener("change", umgestellt);
    sicht?.disconnect();
    sicht = null;
    ruhe();
  };
}

/** Meldet ein einzelnes Teil für den Glimmrand an. Gibt die Abmeldung zurück. */
export function glimme(el: HTMLElement): () => void {
  let t = teile.get(el);
  if (t) t.zahl += 1;
  else {
    t = { el, zahl: 1, n: 0, imBild: true, licht: null, gx: "", gy: "", gn: "" };
    teile.set(el, t);
    starten();
    sicht?.observe(el);
  }
  const teil = t;
  let weg = false;
  return () => {
    if (weg) return;
    weg = true;
    teil.zahl -= 1;
    if (teil.zahl > 0) return;
    teile.delete(el);
    sicht?.unobserve(el);
    leeren(teil);
    if (!teile.size) {
      abbau?.();
      abbau = null;
    }
  };
}

/** Richtet den Glimmrand für alle Elemente mit `data-glimm` unter „wurzel“ ein. Gibt den Abbau zurück. */
export function richteGlimmrandEin(wurzel: ParentNode): () => void {
  const ab = Array.from(wurzel.querySelectorAll<HTMLElement>("[data-glimm]")).map(glimme);
  return () => ab.forEach((f) => f());
}

/**
 * Lässt ein zweites Licht auf den Rand eines angemeldeten Teils scheinen (der Stern hinter der
 * Nachbarkarte, seite/glaskarten.ts): Stelle am Teil in Pixeln und Stärke 0 bis 1. `null` löscht
 * es. Der Rand zeigt das stärkere der beiden Lichter (Maus oder dieses), über dieselben Werte
 * --gx, --gy und --gn. Ohne echte Maus und bei „weniger Bewegung“ geschieht nichts, außer `immer`
 * ist gesetzt (der Durchzug des Sterns am Handy).
 */
export function glimmLicht(el: HTMLElement, licht: GlimmLicht | null, immer = false): void {
  const t = teile.get(el);
  if (!t) return;
  if (licht && !immer && !erlaubt()) return;
  if (!licht && !t.licht) return;
  t.licht = licht && licht.n > 0.004 ? licht : null;
  wecken();
}
