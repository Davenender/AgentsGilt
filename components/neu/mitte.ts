// Am Handy (ohne Maus): Welche Karte steht gerade in der Mitte des Bildschirms?
//
// Was am Computer die Maus auslöst (die Karte unter der Maus leuchtet, ihre Szene spielt), macht
// am Handy die Bildschirmmitte: Es gilt immer höchstens eine Karte, nämlich die, die in einem
// schmalen Bereich um die Mitte des Bildschirms steht. Scrollt man weiter, ist es die nächste; im
// Spalt zwischen zwei Karten keine. Erkannt wird mit einem IntersectionObserver auf diesen Bereich;
// nur solange zwei Karten zugleich darin stehen, wird beim Scrollen (einmal je Bild) nachgemessen.

/**
 * Ereignis an einer Karte: Sie steht jetzt in der Mitte (`detail: true`) oder nicht mehr (`false`).
 * So kann jede Karte selbst darauf reagieren (Leistungen.tsx, ZeichenNummer.tsx).
 */
export const MITTE_EREIGNIS = "ag:mitte";

/** Meldet den Elementen über `MITTE_EREIGNIS`, welches gerade in der Mitte steht. Gibt den Abbau zurück. */
export function meldeMitte(elemente: readonly HTMLElement[]): () => void {
  let vorher: HTMLElement | null = null;
  const abbau = beobachteMitte(elemente, (nr) => {
    const neu = elemente[nr] ?? null;
    if (vorher && vorher !== neu) vorher.dispatchEvent(new CustomEvent(MITTE_EREIGNIS, { detail: false }));
    if (neu) neu.dispatchEvent(new CustomEvent(MITTE_EREIGNIS, { detail: true }));
    vorher = neu;
  });
  return () => {
    abbau();
    vorher?.dispatchEvent(new CustomEvent(MITTE_EREIGNIS, { detail: false }));
    vorher = null;
  };
}

/** Höhe des Bereichs um die Bildschirmmitte, als Anteil der Bildhöhe. */
export const MITTE_BAND = 0.12;

type Flaeche = { top: number; bottom: number };

/**
 * Welche der Flächen (in Lesereihenfolge) steht in der Mitte eines Bildes der Höhe `hoehe`?
 * Die Fläche, die die Mittellinie überdeckt; überdeckt sie keine (Spalt zwischen zwei Karten), die
 * nächste, sofern sie noch im Bereich `band` um die Mitte liegt. Sonst -1.
 */
export function karteInDerMitte(flaechen: readonly Flaeche[], hoehe: number, band = MITTE_BAND): number {
  const mitte = hoehe / 2;
  const halb = (hoehe * band) / 2;
  let beste = -1;
  let besterAbstand = Infinity;
  flaechen.forEach((f, nr) => {
    const abstand = mitte < f.top ? f.top - mitte : mitte > f.bottom ? mitte - f.bottom : 0;
    if (abstand <= halb && abstand < besterAbstand) {
      beste = nr;
      besterAbstand = abstand;
    }
  });
  return beste;
}

/**
 * Beobachtet die Elemente und meldet, welches gerade in der Mitte steht (Nummer, -1 = keins), jedes
 * Mal, wenn sich das ändert. Gibt den Abbau zurück.
 */
export function beobachteMitte(elemente: readonly HTMLElement[], beiWechsel: (nr: number) => void, band = MITTE_BAND): () => void {
  const imBand = new Set<HTMLElement>();
  let jetzt = -1;
  let rahmen = 0;
  let vorbei = false;
  const pruefen = () => {
    rahmen = 0;
    if (vorbei) return;
    const kandidaten = elemente.filter((el) => imBand.has(el));
    let nr = -1;
    if (kandidaten.length === 1) nr = elemente.indexOf(kandidaten[0]);
    else if (kandidaten.length > 1) {
      const wahl = karteInDerMitte(
        kandidaten.map((el) => el.getBoundingClientRect()),
        window.innerHeight,
        band,
      );
      nr = wahl < 0 ? -1 : elemente.indexOf(kandidaten[wahl]);
    }
    if (nr !== jetzt) {
      jetzt = nr;
      beiWechsel(nr);
    }
  };
  // Stehen zwei Elemente zugleich im Bereich, entscheidet beim Scrollen die genaue Lage.
  const gescrollt = () => {
    if (!rahmen && imBand.size > 1) rahmen = requestAnimationFrame(pruefen);
  };
  const rand = `${(((1 - band) / 2) * 100).toFixed(2)}%`;
  const waechter = new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) imBand.add(el);
        else imBand.delete(el);
      }
      pruefen();
    },
    { rootMargin: `-${rand} 0px -${rand} 0px` },
  );
  for (const el of elemente) waechter.observe(el);
  window.addEventListener("scroll", gescrollt, { passive: true });
  return () => {
    vorbei = true;
    cancelAnimationFrame(rahmen);
    waechter.disconnect();
    window.removeEventListener("scroll", gescrollt);
  };
}
