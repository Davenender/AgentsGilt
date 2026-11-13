"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap";
import sternBild from "@/public/kopf/licht-stern.webp";
import { worte } from "@/lib/inhalt-neu";
import { istVorschau, vorarbeit } from "../umgebung";
import type { LichtSzene } from "../kopf/lichtszene";
import { useBewegungsWechsel } from "./einstellung";

const ZEICHEN = ["#", "+", "=", "-", ":", ".", "*", "/", "%", "·"];
// Schubs: Umkreis um das Wort, in dem die Maus es mitnimmt, und der Anteil ihrer Geschwindigkeit.
const SCHUBS_UMKREIS = 90;
const SCHUBS_ANTEIL = 0.22;
// Schneller als so (Pixel je Sekunde) zählt die Maus nicht: Der Schubs bleibt sanft.
const SCHUBS_TEMPO = 650;
// Buchstaben in diesem Umkreis um die Maus „verbuggen“ kurz.
const WIRR_UMKREIS = 46;
// So lange nach dem letzten Schubs treibt ein Wort langsam an seinen Platz zurück.
const HEIMWEG_NACH = 8;

type Wort = {
  el: HTMLElement;
  buchstaben: { el: HTMLElement; echt: string; x: number; y: number; wirrBis: number; naechster: number }[];
  // Platz (Mitte des Wortes, aus dem Stylesheet), Größe, Versatz, Geschwindigkeit, Drehung.
  hx: number;
  hy: number;
  b: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  schubs: number;
};

/**
 * Wörter-Feld mit dem Stern (Übergang zu den Leistungen).
 *
 * Der Stern in der Mitte ist dasselbe Licht wie das Logo im Kopfbereich (Wand mit Öffnung, Licht
 * dahinter; lichtszene.ts mit `nurStern`), satter und mit hellem Kern. Beim Hinscrollen tritt er
 * auf: Er wächst aus einem Lichtpunkt, die Strahlen fächern auf, die Wörter schweben aus der
 * Tiefe herein. Danach lebt er: Er atmet und dreht sich ganz leicht.
 *
 * Die Wörter sind Geister in der Schwerelosigkeit: Die Maus geht durch sie hindurch. Fährt sie
 * durch ein Wort, bekommt es einen sanften Schubs in ihre Bewegungsrichtung (nach Geschwindigkeit
 * und Nähe, Umkreis 90 px; höchstens rund 140 px je Sekunde), treibt weiter (insgesamt höchstens
 * gut 150 px), wird weich gebremst und dreht sich leicht (höchstens 6°); die
 * Buchstaben nahe der Maus werden kurz zu Zufallszeichen. Am Rand des Feldes prallen die Wörter
 * weich ab; 8 s nach dem letzten Schubs treiben sie an ihren Platz zurück. Am Handy treiben sie
 * ganz langsam von selbst und reagieren auf Antippen. Bei „weniger Bewegung“ steht alles still
 * (statt der Szene das ruhige Bild des Sterns).
 *
 * Die Szene wird schon angelegt und aufgewärmt, während oben der Stern im Dunkeln steht
 * (Vorarbeit der Startanimation): Beim Hinscrollen ruckelt nichts. Sie rechnet nur im Bild.
 */
export function Uebergang() {
  const wurzel = useRef<HTMLElement>(null);
  const halter = useRef<HTMLDivElement>(null);
  const platz = useRef<HTMLSpanElement>(null);
  // Stellt der Besucher „weniger Bewegung“ um, richtet sich alles neu ein. Der Auftritt kommt nur
  // einmal je Seitenaufruf: War er schon da, steht danach alles sofort.
  const wechsel = useBewegungsWechsel();
  const aufgetreten = useRef(false);

  // ── Der Stern.
  useEffect(() => {
    const el = wurzel.current;
    const buehne = halter.current;
    const anker = platz.current;
    if (!el || !buehne || !anker) return;
    const still = istVorschau() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let szene: LichtSzene | undefined;
    let vorbei = false;
    // War der Auftritt bei diesem Seitenaufruf schon da, steht alles sofort.
    let da = aufgetreten.current;
    let imBild = false;
    // Größe des Sterns, Weite der Strahlen: Das fährt der Auftritt hoch.
    const form = { mass: 0, strahlen: 0 };
    if (da) el.dataset.da = "1";
    let auftritt: gsap.core.Timeline | undefined;
    const stattBild = () => {
      szene?.ende();
      szene = undefined;
      if (!vorbei) el.dataset.still = "1";
    };
    // Lebendig: Der Stern dreht sich ganz leicht hin und her (± 5°, eine Runde in 14 s).
    const takt = (zeit: number) => {
      if (!szene || !imBild || !da) return;
      szene.sternForm(form.mass, form.strahlen, 0.09 * Math.sin(zeit * 0.45));
    };
    const tritAuf = () => {
      if (da || vorbei) return;
      da = true;
      aufgetreten.current = true;
      el.dataset.da = "1";
      if (!szene) return;
      // Aus einem Lichtpunkt wächst der Stern (leichtes Überschwingen), dann fächern die Strahlen auf.
      auftritt = gsap
        .timeline()
        .to(form, { mass: 0.07, duration: 0.25, ease: "power2.out" })
        .to(form, { mass: 1, duration: 1, ease: "back.out(1.5)" }, 0.3)
        .to(form, { strahlen: 1, duration: 1.5, ease: "power2.out" }, 0.75);
    };
    if (still) {
      aufgetreten.current = true;
      el.dataset.still = "1";
      el.dataset.da = "1";
    } else {
      // Gleich anlegen und aufwärmen (als Vorarbeit der Startanimation angemeldet).
      vorarbeit.melde(
        import("../kopf/lichtszene")
          .then(async ({ starteLichtSzene }) => {
            if (vorbei) return;
            // Schwarze Wand wie im Kopfbereich (nur auf Schwarz bleibt das Korn unsichtbar); die
            // Fläche läuft oben und unten weich in den Grund der Seite aus (Stylesheet).
            const neu = starteLichtSzene(buehne, anker, { proben: 60, wand: 0x000000, maus: false, nurStern: true, beiAusfall: stattBild });
            await neu.aufwaermen();
            if (vorbei) return neu.ende();
            szene = neu;
            szene.sternForm(0, 0, 0);
            szene.pegel(1);
            el.dataset.licht = "live";
            if (da) {
              // Der Abschnitt war schon im Bild (Laden mitten auf der Seite): Der Stern steht gleich da.
              form.mass = 1;
              form.strahlen = 1;
            }
          })
          .catch(stattBild),
      );
      gsap.ticker.add(takt);
    }
    // Auftritt, sobald der Abschnitt zu gut einem Drittel im Bild ist (einmal je Seitenaufruf).
    const waechter = new IntersectionObserver(
      (eintraege) => {
        const e = eintraege[eintraege.length - 1];
        imBild = e.isIntersecting;
        if (e.intersectionRatio >= 0.35) tritAuf();
      },
      { threshold: [0, 0.35] },
    );
    waechter.observe(el);
    return () => {
      vorbei = true;
      waechter.disconnect();
      gsap.ticker.remove(takt);
      auftritt?.kill();
      szene?.ende();
      delete el.dataset.licht;
      delete el.dataset.still;
      delete el.dataset.da;
    };
  }, [wechsel]);

  // ── Die Wörter: Geister in der Schwerelosigkeit.
  useEffect(() => {
    const el = wurzel.current;
    if (!el || istVorschau()) return;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fein = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (ruhig.matches) return;
    const liste = Array.from(el.querySelectorAll<HTMLElement>(".ag-wf__wort"));
    let breite = 1;
    let hoehe = 1;
    let woerter: Wort[] = [];
    const vermessen = () => {
      const r = el.getBoundingClientRect();
      breite = r.width;
      hoehe = r.height;
      woerter = liste.map((wortEl, i) => {
        const alt = woerter[i];
        // Gemessen wird ohne die Verkleinerung des Auftritts (sie würde die Breiten verfälschen).
        const innen = wortEl.querySelector<HTMLElement>(".ag-wf__innen");
        if (innen) {
          innen.style.transition = "none";
          innen.style.transform = "none";
        }
        const alle = Array.from(wortEl.querySelectorAll<HTMLElement>("i"));
        // Jeder Buchstabe behält seine Breite: Ein Zufallszeichen verschiebt nichts.
        alle.forEach((bEl, n) => {
          bEl.style.width = "";
          if (alt?.buchstaben[n]) bEl.textContent = alt.buchstaben[n].echt;
        });
        const breiten = alle.map((bEl) => bEl.getBoundingClientRect().width);
        alle.forEach((bEl, n) => (bEl.style.width = `${breiten[n].toFixed(2)}px`));
        const b = wortEl.offsetWidth;
        const h = wortEl.offsetHeight;
        const buchstaben = alle.map((bEl, n) => ({
          el: bEl,
          echt: alt?.buchstaben[n]?.echt ?? bEl.textContent ?? "",
          x: bEl.offsetLeft + bEl.offsetWidth / 2 - b / 2,
          y: bEl.offsetTop + bEl.offsetHeight / 2 - h / 2,
          wirrBis: 0,
          naechster: 0,
        }));
        if (innen) {
          innen.style.transform = "";
          // Erst nach dem nächsten Umbruch wieder weich: Sonst liefe der Auftritt von vorn.
          void innen.offsetWidth;
          innen.style.transition = "";
        }
        return { el: wortEl, buchstaben, hx: wortEl.offsetLeft, hy: wortEl.offsetTop, b, h, x: alt?.x ?? 0, y: alt?.y ?? 0, vx: alt?.vx ?? 0, vy: alt?.vy ?? 0, a: alt?.a ?? 0, va: alt?.va ?? 0, schubs: alt?.schubs ?? -99 };
      });
    };

    // Maus: Ort und Geschwindigkeit (geglättet), bezogen auf das Feld.
    const maus = { x: -9999, y: -9999, vx: 0, vy: 0, zeit: 0, da: false };
    let vorbei = false;
    let rahmen = 0;
    let letzte = 0;
    let imBild = false;
    let uhr = 0;

    const verbugge = (w: Wort, jetzt: number, mx: number, my: number, umkreis: number) => {
      const cx = w.hx + w.x;
      const cy = w.hy + w.y;
      for (const bu of w.buchstaben) {
        if (!bu.echt.trim()) continue;
        if (Math.hypot(cx + bu.x - mx, cy + bu.y - my) < umkreis) bu.wirrBis = Math.max(bu.wirrBis, jetzt + 260 + Math.random() * 260);
      }
    };

    const bild = (jetzt: number) => {
      rahmen = 0;
      if (!imBild) return;
      const dt = letzte ? Math.min(0.05, (jetzt - letzte) / 1000) : 1 / 60;
      letzte = jetzt;
      const sek = jetzt / 1000;
      let lebt = false;
      // Bewegt sich die Maus nicht mehr, hat sie auch keine Geschwindigkeit mehr.
      if (jetzt - maus.zeit > 90) {
        maus.vx = 0;
        maus.vy = 0;
      }
      const tempo = Math.hypot(maus.vx, maus.vy);
      for (const w of woerter) {
        const cx = w.hx + w.x;
        const cy = w.hy + w.y;
        if (maus.da) {
          // Abstand der Maus zum Kasten des Wortes.
          const dx = Math.max(Math.abs(maus.x - cx) - w.b / 2, 0);
          const dy = Math.max(Math.abs(maus.y - cy) - w.h / 2, 0);
          const d = Math.hypot(dx, dy);
          if (d < SCHUBS_UMKREIS && tempo > 30) {
            // Schubs in die Richtung der Maus: je näher und je schneller, desto mehr.
            const naehe = 1 - d / SCHUBS_UMKREIS;
            const zug = 1 - Math.exp(-7 * naehe * dt);
            const grenze = Math.min(1, SCHUBS_TEMPO / tempo);
            w.vx += (maus.vx * grenze * SCHUBS_ANTEIL - w.vx) * zug;
            w.vy += (maus.vy * grenze * SCHUBS_ANTEIL - w.vy) * zug;
            // Trifft die Maus neben die Mitte, dreht sich das Wort ganz leicht (je Sekunde gerechnet,
            // damit es auf jedem Bildschirm gleich viel ist).
            w.va += ((maus.x - cx) * maus.vy - (maus.y - cy) * maus.vx) * grenze * 0.000132 * naehe * dt;
            w.schubs = sek;
            verbugge(w, jetzt, maus.x, maus.y, WIRR_UMKREIS);
          }
        } else if (!fein.matches) {
          // Handy: Die Wörter treiben ganz langsam von selbst.
          w.vx += Math.sin(sek * 0.21 + w.hx) * 1.6 * dt;
          w.vy += Math.cos(sek * 0.17 + w.hy) * 1.6 * dt;
        }
        // 8 s nach dem letzten Schubs treibt das Wort langsam an seinen Platz zurück.
        if (sek - w.schubs > HEIMWEG_NACH) {
          w.vx += -w.x * 0.5 * dt - w.vx * 0.9 * dt;
          w.vy += -w.y * 0.5 * dt - w.vy * 0.9 * dt;
          w.va += -w.a * 0.8 * dt;
        }
        // Weich gebremst, wie im Weltall.
        const bremse = Math.exp(-0.9 * dt);
        w.vx *= bremse;
        w.vy *= bremse;
        w.va *= Math.exp(-1.2 * dt);
        w.x += w.vx * dt;
        w.y += w.vy * dt;
        w.a = Math.max(-0.1, Math.min(0.1, w.a + w.va * dt));
        // Die Wörter bleiben im Feld: Am Rand prallen sie weich ab.
        const rand = 14;
        const links = rand + w.b / 2 - w.hx;
        const rechts = breite - rand - w.b / 2 - w.hx;
        const oben = hoehe * 0.06 + w.h / 2 - w.hy;
        const unten = hoehe * 0.94 - w.h / 2 - w.hy;
        if (w.x < links) {
          w.x = links;
          w.vx = Math.abs(w.vx) * 0.55;
        } else if (w.x > rechts) {
          w.x = rechts;
          w.vx = -Math.abs(w.vx) * 0.55;
        }
        if (w.y < oben) {
          w.y = oben;
          w.vy = Math.abs(w.vy) * 0.55;
        } else if (w.y > unten) {
          w.y = unten;
          w.vy = -Math.abs(w.vy) * 0.55;
        }
        w.el.style.transform = `translate3d(${w.x.toFixed(1)}px, ${w.y.toFixed(1)}px, 0) rotate(${w.a.toFixed(4)}rad)`;
        // Verbuggte Buchstaben: alle 55 ms ein neues Zufallszeichen, dann rastet der echte wieder ein.
        for (const bu of w.buchstaben) {
          if (!bu.wirrBis) continue;
          if (jetzt >= bu.wirrBis) {
            bu.wirrBis = 0;
            bu.el.textContent = bu.echt;
            delete bu.el.dataset.wirr;
          } else {
            lebt = true;
            if (jetzt >= bu.naechster) {
              bu.naechster = jetzt + 55;
              bu.el.textContent = ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)];
              bu.el.dataset.wirr = "1";
            }
          }
        }
        if (Math.abs(w.vx) + Math.abs(w.vy) > 0.4 || Math.abs(w.va) > 0.002 || (sek - w.schubs > HEIMWEG_NACH && Math.abs(w.x) + Math.abs(w.y) > 0.5)) lebt = true;
      }
      // Am Handy treiben sie immer; am Computer ruht die Rechnung, wenn alles steht und die Maus weg ist.
      if (lebt || maus.da || !fein.matches) rahmen = requestAnimationFrame(bild);
      else {
        letzte = 0;
        // Zum Heimweg wieder melden.
        window.clearTimeout(uhr);
        uhr = window.setTimeout(wecken, 1000);
      }
    };
    const wecken = () => {
      if (!vorbei && !rahmen && imBild && !document.hidden) rahmen = requestAnimationFrame(bild);
    };

    const bewegt = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      const jetzt = performance.now();
      const dt = Math.max(0.004, (jetzt - maus.zeit) / 1000);
      if (maus.da && dt < 0.2) {
        // Geschwindigkeit geglättet (px je Sekunde).
        maus.vx += ((x - maus.x) / dt - maus.vx) * 0.5;
        maus.vy += ((y - maus.y) / dt - maus.vy) * 0.5;
      }
      maus.x = x;
      maus.y = y;
      maus.zeit = jetzt;
      maus.da = true;
      wecken();
    };
    const weg = () => {
      maus.da = false;
      maus.vx = 0;
      maus.vy = 0;
    };
    // Handy: Antippen gibt dem nächsten Wort einen Schubs vom Finger weg und verbuggt es.
    const getippt = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse") return;
      const r = el.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      const jetzt = performance.now();
      for (const w of woerter) {
        const cx = w.hx + w.x;
        const cy = w.hy + w.y;
        const d = Math.hypot(Math.max(Math.abs(x - cx) - w.b / 2, 0), Math.max(Math.abs(y - cy) - w.h / 2, 0));
        if (d > SCHUBS_UMKREIS) continue;
        const l = Math.hypot(cx - x, cy - y) || 1;
        w.vx += ((cx - x) / l) * 70;
        w.vy += ((cy - y) / l) * 70;
        w.va += (Math.random() - 0.5) * 0.5;
        w.schubs = jetzt / 1000;
        verbugge(w, jetzt, x, y, 400);
      }
      wecken();
    };
    vermessen();
    const groesse = new ResizeObserver(() => {
      vermessen();
      wecken();
    });
    groesse.observe(el);
    // Die Schrift der Wörter bestimmt ihre Breite: Ist sie da, neu vermessen.
    document.fonts?.ready
      .then(() => {
        // Nach dem Abbau (Einstellung umgestellt, Seite verlassen) nichts mehr anfassen.
        if (vorbei) return;
        vermessen();
        wecken();
      })
      .catch(() => undefined);
    const waechter = new IntersectionObserver((eintraege) => {
      imBild = eintraege[eintraege.length - 1].isIntersecting;
      letzte = 0;
      wecken();
    });
    waechter.observe(el);
    el.addEventListener("pointermove", bewegt, { passive: true });
    el.addEventListener("pointerleave", weg);
    el.addEventListener("pointerdown", getippt, { passive: true });
    return () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      window.clearTimeout(uhr);
      groesse.disconnect();
      waechter.disconnect();
      el.removeEventListener("pointermove", bewegt);
      el.removeEventListener("pointerleave", weg);
      el.removeEventListener("pointerdown", getippt);
      for (const w of woerter) {
        w.el.style.transform = "";
        for (const bu of w.buchstaben) {
          bu.el.textContent = bu.echt;
          bu.el.style.width = "";
          delete bu.el.dataset.wirr;
        }
      }
    };
  }, [wechsel]);

  return (
    <section ref={wurzel} className="ag-ueber" aria-label="Wofür wir stehen">
      <div ref={halter} className="ag-ueber__licht" aria-hidden="true">
        <span className="ag-ueber__schein" />
        <span ref={platz} className="ag-ueber__platz">
          {/* Ruhiges Bild des Sterns: nur bei „weniger Bewegung“ oder wenn die Szene nicht zeichnen kann. */}
          <Image className="ag-ueber__standbild" src={sternBild} alt="" sizes="(max-width: 767px) 60vw, 30vw" loading="lazy" />
        </span>
      </div>
      <ul className="ag-wf">
        {worte.map((w, i) => (
          <li key={w} className="ag-wf__wort ag-versal" style={{ "--i": i } as CSSProperties} aria-label={w}>
            <span className="ag-wf__innen" aria-hidden="true">
              {Array.from(w).map((zeichen, n) => (
                <i key={n}>{zeichen === " " ? " " : zeichen}</i>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
