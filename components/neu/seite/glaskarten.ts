// Glaskarten unter der ersten Aussage (Aussage.tsx): welche Karte hervorgehoben ist, und das Mauslicht.
//
// Hervorgehoben (`data-an`) ist eine Karte so: In ihrer Mitte erscheint hinter Milchglas der kleine
// Stern (weich, er dreht und wiegt sich leicht), die Glasfläche wird eine Spur heller, die Karte
// hebt sich leicht, und ihr Text wird hell. Stern, Glas und Heben sind reines Stylesheet
// (seite.css: nur Verschieben, Drehen und Deckkraft, die Unschärfe des Sterns steckt fest in seinen
// Bildern). Dieses Skript schaltet nur, welche Karte es ist:
//   - Maus: die Karte unter der Maus.
//   - Handy (ohne Maus): die Karte, die gerade in der Mitte des Bildschirms steht (mitte.ts).
//     Scrollt man weiter, blendet sie aus, und die nächste leuchtet auf.
// Hervorgehoben wird erst, wenn die Karte ganz eingeschwebt ist (vorher gibt es keinen Stern,
// auch wenn die Maus schon auf ihr liegt oder sie schon in der Mitte steht). Nach dem Verlassen
// trägt die Karte für 0,65 s `data-geht` (der Stern blendet aus und ruht dabei), dann nichts mehr:
// In Ruhe gibt es den Stern für den Browser gar nicht (keine Animationen, keine eigenen Ebenen).
//
// Mauslicht (nur mit Maus): Der Text der Karten steht gedämpft da. Wörter im Umkreis von 120 px
// um die Maus leuchten warm auf (--h je Wort, 0 bis 1) und klingen weich wieder ab. Der Text einer
// hervorgehobenen Karte ist ganz hell. Das ist die einzige Bildschleife hier, und sie läuft nur,
// solange sich ein Wort noch ändert.

import { beobachteMitte } from "../mitte.ts";

/** Mauslicht: Wörter in diesem Umkreis um die Maus leuchten auf (Pixel). */
export const UMKREIS = 120;
/** Wörter werden schnell hell und klingen weich wieder ab (je Sekunde). */
const AUF = 9;
const AB = 2.6;
/** So lange nach dem Verlassen blendet der Stern noch aus (Millisekunden, etwas länger als im Stylesheet). */
export const GEHT = 650;
/** Die Karten schweben nacheinander ein: Abstand und Dauer in Millisekunden (wie im Stylesheet: Verzug 0,65 s ist schon in `zeigen` enthalten, Dauer 1 s). */
export const VERSATZ = 120;
export const EINSCHWEBEN = 1000;

/** Ab wann Karte `nr` ganz eingeschwebt ist, wenn die erste ab `stehtAb` einschwebt (Millisekunden). */
export function eingeschwebtAb(stehtAb: number, nr: number): number {
  return stehtAb + nr * VERSATZ + EINSCHWEBEN;
}

type Wort = { el: HTMLElement; x: number; y: number; h: number; gemalt: number };
type Karte = {
  /** Das Listenelement: Es nimmt die Maus an und trägt `data-an`. */
  el: HTMLElement;
  /** Die sichtbare Karte (sie hebt sich leicht an, wenn sie hervorgehoben ist). */
  flaeche: HTMLElement;
  /** Gewünscht (Maus darauf bzw. in der Mitte) und tatsächlich hervorgehoben. */
  gewuenscht: boolean;
  an: boolean;
  woerter: Wort[];
  geht: number;
  wartet: number;
};

export type Glaskarten = {
  /**
   * Die Karten schweben jetzt ein (nach `warten` ms). Erst wenn eine Karte ganz da ist, kann sie
   * leuchten. `stehen`: Die Karten stehen schon (kein Einschweben), sie können sofort leuchten.
   */
  zeigen: (warten?: number, stehen?: boolean) => void;
  ende: () => void;
};

const weich = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** So hell leuchtet ein Wort im Abstand `abstand` zur Maus (0 bis 1). */
export function wortLicht(abstand: number): number {
  return weich(1 - abstand / UMKREIS);
}

/**
 * Richtet Hervorhebung und Mauslicht für alle Karten (`.ag-gk`) unter „reihe“ ein.
 * Nicht aufrufen bei „weniger Bewegung“: Dann stehen die Karten einfach da, der Text ist hell,
 * es gibt keinen Stern.
 */
export function richteGlaskartenEin(reihe: HTMLElement): Glaskarten {
  const mitMaus = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const karten: Karte[] = Array.from(reihe.querySelectorAll<HTMLElement>(".ag-gk")).map((el) => ({
    el,
    flaeche: el.querySelector<HTMLElement>(".ag-gk__karte") ?? el,
    gewuenscht: false,
    an: false,
    woerter: [],
    geht: 0,
    wartet: 0,
  }));
  let vorbei = false;
  let rahmen = 0;
  let zuletzt = 0;
  let maus: { x: number; y: number } | null = null;
  /** Ab wann die erste Karte einschwebt (Zeit des Browsers); vorher leuchtet keine. */
  let stehtAb = Infinity;
  const abbau: (() => void)[] = [];

  /** Die Mitten der Wörter merken (bezogen auf ihre Karte). */
  const vermessen = () => {
    for (const k of karten) {
      const r = k.flaeche.getBoundingClientRect();
      const alt = k.woerter;
      k.woerter = Array.from(k.el.querySelectorAll<HTMLElement>(".ag-gk__wort")).map((el, i) => {
        const w = el.getBoundingClientRect();
        return { el, x: w.left + w.width / 2 - r.left, y: w.top + w.height / 2 - r.top, h: alt[i]?.h ?? 0, gemalt: alt[i]?.gemalt ?? -1 };
      });
    }
  };

  // ── Das Licht auf dem Text: ganz hell auf der hervorgehobenen Karte, sonst unter der Maus.
  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei) return;
    const dt = zuletzt ? Math.min(0.05, (jetzt - zuletzt) / 1000) : 1 / 60;
    zuletzt = jetzt;
    let weiter = false;
    // Erst messen (nur wenn die Maus in der Nähe ist), dann setzen.
    const flaechen = maus ? karten.map((k) => k.flaeche.getBoundingClientRect()) : null;
    karten.forEach((k, nr) => {
      const r = flaechen?.[nr];
      for (const w of k.woerter) {
        let ziel = 0;
        if (k.an) ziel = 1;
        else if (maus && r) ziel = wortLicht(Math.hypot(maus.x - r.left - w.x, maus.y - r.top - w.y));
        if (ziel !== w.h) {
          w.h += (ziel - w.h) * (1 - Math.exp(-dt * (ziel > w.h ? AUF : AB)));
          if (Math.abs(ziel - w.h) < 0.004) w.h = ziel;
          else weiter = true;
        }
        if (w.h !== w.gemalt && (Math.abs(w.h - w.gemalt) > 0.004 || w.h === ziel)) {
          w.gemalt = w.h;
          w.el.style.setProperty("--h", w.h.toFixed(3));
        }
      }
    });
    if (weiter) wecken();
    else zuletzt = 0;
  };
  const wecken = () => {
    if (!rahmen && !vorbei) rahmen = requestAnimationFrame(bild);
  };

  /** Bringt die Hervorhebung einer Karte auf ihren Wunsch, sobald sie ganz eingeschwebt ist. */
  const stelle = (k: Karte, nr: number) => {
    if (vorbei) return;
    window.clearTimeout(k.wartet);
    if (k.gewuenscht) {
      if (k.an) return;
      const ab = eingeschwebtAb(stehtAb, nr);
      const jetzt = performance.now();
      if (jetzt < ab) {
        // Noch nicht da: später noch einmal (sobald die Karte steht, falls sie dann noch gewünscht ist).
        if (Number.isFinite(ab)) k.wartet = window.setTimeout(() => stelle(k, nr), ab - jetzt + 20);
        return;
      }
      window.clearTimeout(k.geht);
      delete k.el.dataset.geht;
      k.an = true;
      k.el.dataset.an = "1";
    } else {
      if (!k.an) return;
      k.an = false;
      delete k.el.dataset.an;
      // Er blendet noch aus; erst danach ist für den Browser nichts mehr da.
      k.el.dataset.geht = "1";
      window.clearTimeout(k.geht);
      k.geht = window.setTimeout(() => delete k.el.dataset.geht, GEHT);
    }
    wecken();
  };
  const wuensche = (nr: number, an: boolean) => {
    const k = karten[nr];
    if (!k || k.gewuenscht === an) return;
    k.gewuenscht = an;
    stelle(k, nr);
  };

  vermessen();
  const groesse = new ResizeObserver(() => {
    vermessen();
    wecken();
  });
  groesse.observe(reihe);
  for (const k of karten) groesse.observe(k.flaeche);
  abbau.push(() => groesse.disconnect());
  // Die Schrift bestimmt, wo die Wörter stehen.
  document.fonts?.ready
    .then(() => {
      if (!vorbei) vermessen();
    })
    .catch(() => undefined);

  if (mitMaus) {
    // ── Maus: Hervorgehoben ist die Karte unter der Maus; dazu das Mauslicht.
    reihe.dataset.licht = "maus";
    karten.forEach((k, nr) => {
      const hinein = (ev: PointerEvent) => {
        if (ev.pointerType === "mouse") wuensche(nr, true);
      };
      const hinaus = () => wuensche(nr, false);
      k.el.addEventListener("pointerenter", hinein);
      k.el.addEventListener("pointerleave", hinaus);
      abbau.push(() => {
        k.el.removeEventListener("pointerenter", hinein);
        k.el.removeEventListener("pointerleave", hinaus);
      });
    });
    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = reihe.getBoundingClientRect();
      const nah = ev.clientX > r.left - UMKREIS && ev.clientX < r.right + UMKREIS && ev.clientY > r.top - UMKREIS && ev.clientY < r.bottom + UMKREIS;
      if (!nah && !maus) return;
      maus = nah ? { x: ev.clientX, y: ev.clientY } : null;
      wecken();
    };
    const fort = () => {
      if (!maus) return;
      maus = null;
      wecken();
    };
    // Beim Scrollen wandert die Seite unter der ruhenden Maus weiter: Das Licht klingt ab.
    window.addEventListener("pointermove", bewegt, { passive: true });
    window.addEventListener("scroll", fort, { passive: true });
    document.documentElement.addEventListener("pointerleave", fort);
    abbau.push(() => {
      window.removeEventListener("pointermove", bewegt);
      window.removeEventListener("scroll", fort);
      document.documentElement.removeEventListener("pointerleave", fort);
    });
  } else {
    // ── Handy: Hervorgehoben ist die Karte in der Mitte des Bildschirms.
    reihe.dataset.licht = "finger";
    abbau.push(
      beobachteMitte(
        karten.map((k) => k.el),
        (mitte) => karten.forEach((_, nr) => wuensche(nr, nr === mitte)),
      ),
    );
  }

  return {
    zeigen: (warten = 0, stehen = false) => {
      stehtAb = Math.min(stehtAb, stehen ? -Infinity : performance.now() + warten);
      // Wer schon gewünscht ist (Maus darauf, in der Mitte), leuchtet, sobald seine Karte steht.
      karten.forEach((k, nr) => stelle(k, nr));
    },
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      for (const wie of abbau) wie();
      delete reihe.dataset.licht;
      for (const k of karten) {
        window.clearTimeout(k.geht);
        window.clearTimeout(k.wartet);
        delete k.el.dataset.an;
        delete k.el.dataset.geht;
        for (const w of k.woerter) w.el.style.removeProperty("--h");
      }
    },
  };
}
