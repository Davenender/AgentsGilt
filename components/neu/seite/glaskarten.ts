// Glaskarten unter der ersten Aussage (Aussage.tsx): wann der Stern leuchtet, und das Mauslicht.
//
// Der Stern selbst und seine Strahlen sind reines Stylesheet (seite.css): Er sitzt fest in der
// Mitte der Karte, dreht und wiegt sich leicht, seine Strahlen brechen sich am Glasrand und
// strahlen hinaus. Jede Karte hat ihr eigenes, fest vorgegebenes Strahlenbild, das einfach
// abgespielt wird. Dieses Skript schaltet nur ein und aus:
//   - Maus: Solange die Maus auf einer Karte ist, trägt sie `data-an` (der Stern blendet ein und
//     spielt). Danach trägt sie für 0,65 s `data-geht` (er blendet aus und ruht dabei), dann
//     nichts mehr: In Ruhe gibt es Stern und Strahlen für den Browser gar nicht (keine
//     Animationen, keine eigenen Ebenen; seite.css).
//   - Handy (ohne Maus): Ist eine Karte gut zur Hälfte im Bild, taucht ihr Stern einmal auf,
//     strahlt kurz (`data-an`) und bleibt dann ruhig stehen (`data-steht`; die Strahlen blenden
//     dabei aus, `data-geht`); der Text ist dann hell.
// Je Bild rechnet hier nichts für den Stern. Einmal gemessen wird nur, wo jeder Strahl den Rand
// seiner Karte trifft und wie er dort abknickt (`strahlKnick`, beim Einrichten und wenn sich die
// Größe der Karte ändert): Daraus macht das Stylesheet den Knick genau an der Glaskante.
//
// Mauslicht: Der Text der Karten steht gedämpft da. Wörter im Umkreis von 120 px um die Maus
// leuchten warm auf (--h je Wort, 0 bis 1) und klingen weich wieder ab. Das ist die einzige
// Bildschleife hier, und sie läuft nur, solange sich ein Wort noch ändert.

/** Mauslicht: Wörter in diesem Umkreis um die Maus leuchten auf (Pixel). */
export const UMKREIS = 120;
/** Wörter werden schnell hell und klingen weich wieder ab (je Sekunde). */
const AUF = 14;
const AB = 2.6;
/** Handy: So lange strahlt der Stern, bevor er ruhig stehen bleibt (Millisekunden). */
export const STRAHLT = 2600;
/** Handy: Kommen mehrere Karten zugleich ins Bild, tauchen ihre Sterne nacheinander auf (Abstand in Millisekunden). */
export const NACHEINANDER = 450;
/** Maus: So lange nach dem Verlassen blendet der Stern noch aus (Millisekunden, etwas länger als im Stylesheet). */
export const GEHT = 650;
/** Die Karten schweben nacheinander ein: Abstand und Dauer in Millisekunden (wie im Stylesheet). */
const VERSATZ = 120;
const EINSCHWEBEN = 520;

/** Der Knick an der Glaskante in Grad: mindestens so viel, bei flachem Auftreffen entsprechend mehr. */
const KNICK_MIN = 2;
const KNICK_MEHR = 5;

/**
 * Ein Strahl geht aus der Mitte einer Karte (`breite` × `hoehe`) im Winkel `grad` (im Uhrzeigersinn
 * ab „nach rechts“). `weit`: so weit ist es bis zum Rand der Karte. `knick`: um so viele Grad
 * knickt er dort ab, von der Senkrechten zur Kante weg (wie Licht, das aus Glas austritt); je
 * flacher er auf die Kante trifft, desto stärker.
 */
export function strahlKnick(grad: number, breite: number, hoehe: number): { weit: number; knick: number } {
  const w = (grad * Math.PI) / 180;
  const c = Math.cos(w);
  const s = Math.sin(w);
  const zurSeite = Math.abs(c) < 1e-6 ? Infinity : breite / 2 / Math.abs(c);
  const nachOben = Math.abs(s) < 1e-6 ? Infinity : hoehe / 2 / Math.abs(s);
  const seitlich = zurSeite <= nachOben;
  // Die Senkrechte der getroffenen Kante zeigt nach außen; `quer` ist der Sinus des Winkels dazu.
  const quer = seitlich ? Math.sign(c) * s : -Math.sign(s) * c;
  return { weit: Math.min(zurSeite, nachOben), knick: (quer < 0 ? -1 : 1) * (KNICK_MIN + KNICK_MEHR * Math.abs(quer)) };
}

type Wort = { el: HTMLElement; x: number; y: number; h: number; gemalt: number };
type Karte = {
  /** Das Listenelement: Es nimmt die Maus an und trägt `data-an`. */
  el: HTMLElement;
  /** Die sichtbare Karte (sie hebt sich unter der Maus leicht an). */
  flaeche: HTMLElement;
  /** Handy: gut zur Hälfte im Bild? Hat der Stern schon geleuchtet? Ist der Text hell? */
  imBild: boolean;
  war: boolean;
  hell: boolean;
  woerter: Wort[];
  /** Die Strahlen außerhalb der Karte (sie knicken an der Glaskante ab) und die Größe, für die das gemessen ist. */
  strahlen: HTMLElement[];
  breite: number;
  hoehe: number;
};

export type Glaskarten = {
  /** Die Karten schweben jetzt ein (nach `warten` ms). Erst danach taucht am Handy der Stern auf. */
  zeigen: (warten?: number) => void;
  ende: () => void;
};

const weich = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** So hell leuchtet ein Wort im Abstand `abstand` zur Maus (0 bis 1). */
export function wortLicht(abstand: number): number {
  return weich(1 - abstand / UMKREIS);
}

/**
 * Richtet Stern-Schalter und Mauslicht für alle Karten (`.ag-gk`) unter „reihe“ ein.
 * Nicht aufrufen bei „weniger Bewegung“: Dann stehen die Karten einfach da, der Text ist hell,
 * es gibt keinen Stern und keine Strahlen.
 */
export function richteGlaskartenEin(reihe: HTMLElement): Glaskarten {
  const mitMaus = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const karten: Karte[] = Array.from(reihe.querySelectorAll<HTMLElement>(".ag-gk")).map((el) => ({
    el,
    flaeche: el.querySelector<HTMLElement>(".ag-gk__karte") ?? el,
    imBild: false,
    war: false,
    hell: false,
    woerter: [],
    strahlen: Array.from(el.querySelectorAll<HTMLElement>(".ag-gk__rad--aussen i")),
    breite: 0,
    hoehe: 0,
  }));
  let vorbei = false;
  let rahmen = 0;
  let zuletzt = 0;
  let maus: { x: number; y: number } | null = null;
  /** Ab wann die erste Karte dasteht (Zeit des Browsers). */
  let stehtAb = Infinity;
  const uhren: number[] = [];
  const abbau: (() => void)[] = [];

  /** Die Mitten der Wörter merken (bezogen auf ihre Karte) und den Knick der Strahlen an der Glaskante setzen. */
  const vermessen = () => {
    // Erst alles messen, dann setzen.
    const flaechen = karten.map((k) => k.flaeche.getBoundingClientRect());
    karten.forEach((k, nr) => {
      const r = flaechen[nr];
      if (r.width < 2 || r.height < 2 || (k.breite === r.width && k.hoehe === r.height)) return;
      k.breite = r.width;
      k.hoehe = r.height;
      for (const strahl of k.strahlen) {
        const { weit, knick } = strahlKnick(Number(strahl.dataset.w) || 0, r.width, r.height);
        strahl.style.setProperty("--d", `${weit.toFixed(1)}px`);
        strahl.style.setProperty("--k", `${knick.toFixed(2)}deg`);
      }
    });
    for (const k of karten) {
      const r = k.flaeche.getBoundingClientRect();
      const alt = k.woerter;
      k.woerter = Array.from(k.el.querySelectorAll<HTMLElement>(".ag-gk__wort")).map((el, i) => {
        const w = el.getBoundingClientRect();
        return { el, x: w.left + w.width / 2 - r.left, y: w.top + w.height / 2 - r.top, h: alt[i]?.h ?? 0, gemalt: alt[i]?.gemalt ?? -1 };
      });
    }
  };

  // ── Das Licht auf dem Text: unter der Maus; am Handy ganz, sobald der Stern da war.
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
        if (k.hell) ziel = 1;
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

  let zeigen: Glaskarten["zeigen"] = () => {};

  if (mitMaus) {
    // ── Maus: Der Stern der Karte leuchtet, solange die Maus auf ihr ist; dazu das Mauslicht.
    reihe.dataset.licht = "maus";
    for (const k of karten) {
      let geht = 0;
      const hinein = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse") return;
        window.clearTimeout(geht);
        delete k.el.dataset.geht;
        k.el.dataset.an = "1";
      };
      const hinaus = () => {
        if (!k.el.dataset.an) return;
        delete k.el.dataset.an;
        // Er blendet noch aus; erst danach ist für den Browser nichts mehr da.
        k.el.dataset.geht = "1";
        window.clearTimeout(geht);
        geht = window.setTimeout(() => delete k.el.dataset.geht, GEHT);
      };
      k.el.addEventListener("pointerenter", hinein);
      k.el.addEventListener("pointerleave", hinaus);
      abbau.push(() => {
        window.clearTimeout(geht);
        k.el.removeEventListener("pointerenter", hinein);
        k.el.removeEventListener("pointerleave", hinaus);
      });
    }
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
    // ── Handy: Kommt eine Karte gut zur Hälfte ins Bild, taucht ihr Stern einmal in der Mitte auf,
    // strahlt kurz und bleibt dann ruhig stehen.
    reihe.dataset.licht = "finger";
    let letzterStart = -Infinity;
    const pruefen = () => {
      if (vorbei) return;
      const jetzt = performance.now();
      karten.forEach((k, i) => {
        if (k.war || !k.imBild) return;
        // Erst wenn die Karte auch wirklich dasteht (sie schwebt mit den anderen ein), und nicht
        // zugleich mit dem Stern einer anderen Karte.
        const ab = Math.max(stehtAb + i * VERSATZ + EINSCHWEBEN, letzterStart + NACHEINANDER);
        if (jetzt >= ab) {
          letzterStart = jetzt;
          k.war = true;
          k.hell = true;
          k.el.dataset.an = "1";
          waechter.unobserve(k.el);
          wecken();
          uhren.push(
            window.setTimeout(() => {
              if (vorbei) return;
              delete k.el.dataset.an;
              k.el.dataset.steht = "1";
              // Die Strahlen blenden noch aus; danach sind sie für den Browser weg.
              k.el.dataset.geht = "1";
              uhren.push(window.setTimeout(() => delete k.el.dataset.geht, GEHT));
            }, STRAHLT),
          );
        } else if (Number.isFinite(ab)) uhren.push(window.setTimeout(pruefen, ab - jetzt + 20));
      });
    };
    const waechter = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          const k = karten.find((karte) => karte.el === e.target);
          if (k) k.imBild = e.intersectionRatio >= 0.55;
        }
        pruefen();
      },
      { threshold: [0, 0.55, 0.9] },
    );
    for (const k of karten) waechter.observe(k.el);
    abbau.push(() => waechter.disconnect());
    zeigen = (warten = 0) => {
      stehtAb = Math.min(stehtAb, performance.now() + warten);
      pruefen();
    };
  }

  return {
    zeigen,
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      uhren.forEach((u) => window.clearTimeout(u));
      for (const wie of abbau) wie();
      delete reihe.dataset.licht;
      for (const k of karten) {
        delete k.el.dataset.an;
        delete k.el.dataset.geht;
        delete k.el.dataset.steht;
        for (const w of k.woerter) w.el.style.removeProperty("--h");
        for (const strahl of k.strahlen) {
          strahl.style.removeProperty("--d");
          strahl.style.removeProperty("--k");
        }
      }
    },
  };
}
