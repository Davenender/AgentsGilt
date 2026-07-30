"use client";

import { useEffect, useRef } from "react";

/**
 * Schwebendes Partikelfeld im Hero: kleine Gold-Diamanten (Logo-Motiv) treiben
 * ruhig im Hintergrund. Die Maus stößt sie weg (Repulsion), danach werden sie
 * langsamer (Reibung) und beruhigen sich. Sie prallen physikalisch korrekt am
 * Logo (Mitte) und an den Rändern ab.
 *
 * Setzt außerdem `--dg` auf #top → der Diamant leuchtet auf, wenn die Maus
 * Richtung Mitte wandert.
 *
 * Aus bei "weniger Bewegung".
 */
export function HeroTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Nur auf großen Maus-Geräten (Desktop) – auf Handy/Tablet kein Partikelfeld.
    if (!window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)").matches) return;

    const canvas = canvasRef.current;
    const hero = document.getElementById("top");
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;

    /**
     * Kollisionsfläche des großen Diamanten – als echte RAUTE, nicht als Kreis.
     * Die Maße werden am gerenderten Bild gemessen (nicht geschätzt), damit sie
     * bei jeder Fenstergröße exakt zur sichtbaren Form passen.
     */
    // Die sichtbare Raute füllt nur ~51,7 % der Bilddatei (Rest ist transparenter Rand).
    const DIAMOND_FILL = 0.517;
    let dcx = 0; // Mittelpunkt X
    let dcy = 0; // Mittelpunkt Y
    let dHalfW = 0; // halbe Rauten-Breite (Spitze links/rechts)
    let dHalfH = 0; // halbe Rauten-Höhe (Spitze oben/unten)

    const measureDiamond = () => {
      const el = document.querySelector<HTMLElement>("[data-diamond]");
      const hr = hero.getBoundingClientRect();
      if (el) {
        const r = el.getBoundingClientRect();
        dcx = r.left + r.width / 2 - hr.left;
        dcy = r.top + r.height / 2 - hr.top;
        dHalfW = (r.width * DIAMOND_FILL) / 2;
        dHalfH = (r.height * DIAMOND_FILL) / 2;
      } else {
        // Fallback, falls das Bild (noch) nicht im DOM ist
        const w = Math.min(window.innerWidth * 0.72, 560);
        dcx = W / 2;
        dcy = H / 2;
        dHalfW = (w * DIAMOND_FILL) / 2;
        dHalfH = dHalfW;
      }
    };

    /** < 1 = innerhalb der Raute. Erweitert um den Partikelradius r. */
    const diamondDepth = (x: number, y: number, r: number) =>
      Math.abs(x - dcx) / (dHalfW + r) + Math.abs(y - dcy) / (dHalfH + r);

    const sizeCanvas = () => {
      const r = hero.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureDiamond();
    };
    sizeCanvas();
    // Nachmessen, sobald das Logo-Bild final gelayoutet ist
    const remeasure = window.setTimeout(measureDiamond, 400);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      rot: number;
      spin: number;
      alpha: number;
      seed: number;
    };
    const COUNT = 26;
    const particles: P[] = [];
    for (let i = 0; i < COUNT; i++) {
      let x = 0;
      let y = 0;
      let tries = 0;
      // Nicht im Diamanten starten (inkl. etwas Abstand)
      do {
        x = rand(0, W);
        y = rand(0, H);
        tries++;
      } while (diamondDepth(x, y, 40) < 1 && tries < 30);
      particles.push({
        x,
        y,
        vx: rand(-0.2, 0.2),
        vy: rand(-0.2, 0.2),
        size: rand(5, 11),
        rot: rand(0, Math.PI),
        spin: rand(-0.01, 0.01),
        alpha: rand(0.22, 0.5),
        seed: rand(0, 6.28),
      });
    }

    let mx = -9999;
    let my = -9999;
    let hasMouse = false;
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      hasMouse = mx >= 0 && my >= 0 && mx <= r.width && my <= r.height;
    };
    const onLeave = () => {
      hasMouse = false;
      mx = -9999;
      my = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", sizeCanvas);
    hero.addEventListener("pointerleave", onLeave);

    let glow = 0;
    let raf = 0;
    let tPrev = performance.now();
    const REPEL = 150;

    const render = (now: number) => {
      const dt = Math.min(2.5, (now - tPrev) / 16.67);
      tPrev = now;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const damp = Math.pow(0.94, dt);

      for (const p of particles) {
        // leichte Eigenbewegung (lebendig, aber ruhig)
        p.vx += (Math.random() - 0.5) * 0.015 * dt;
        p.vy += (Math.random() - 0.5) * 0.015 * dt;

        // Maus stößt weg
        if (hasMouse) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const d = Math.hypot(dx, dy);
          if (d < REPEL && d > 0.001) {
            const f = 1 - d / REPEL;
            const force = f * f * 1.7 * dt;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= damp;
        p.vy *= damp;

        const r = p.size * 0.7;
        // Ränder
        if (p.x < r) {
          p.x = r;
          p.vx = Math.abs(p.vx);
        } else if (p.x > W - r) {
          p.x = W - r;
          p.vx = -Math.abs(p.vx);
        }
        if (p.y < r) {
          p.y = r;
          p.vy = Math.abs(p.vy);
        } else if (p.y > H - r) {
          p.y = H - r;
          p.vy = -Math.abs(p.vy);
        }

        // Großer Diamant in der Mitte – als echte RAUTE abprallen
        const ax = dHalfW + r;
        const by = dHalfH + r;
        const ddx = p.x - dcx;
        const ddy = p.y - dcy;
        const depth = Math.abs(ddx) / ax + Math.abs(ddy) / by;
        if (depth < 1 && depth > 0.0001) {
          // exakt auf die Rautenkante zurückschieben
          const k = 1 / depth;
          p.x = dcx + ddx * k;
          p.y = dcy + ddy * k;
          // Normale der getroffenen Schrägkante
          let nx = (ddx >= 0 ? 1 : -1) / ax;
          let ny = (ddy >= 0 ? 1 : -1) / by;
          const nl = Math.hypot(nx, ny) || 1;
          nx /= nl;
          ny /= nl;
          const vdot = p.vx * nx + p.vy * ny;
          if (vdot < 0) {
            p.vx -= 2 * vdot * nx;
            p.vy -= 2 * vdot * ny;
          }
          p.vx *= 0.6;
          p.vy *= 0.6;
        }

        // zeichnen: gedrehtes Quadrat = Diamant
        p.rot += p.spin * dt;
        const bob = Math.sin(now * 0.0015 + p.seed) * 1.5;
        const s = p.size;
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(p.rot + Math.PI / 4);
        ctx.shadowColor = "rgba(212, 162, 60, 0.5)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(216, 168, 70, ${p.alpha})`;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.shadowBlur = 0;

      // Logo-Aufleuchten nach Maus-Nähe zur Mitte
      let gt = 0;
      if (hasMouse) {
        const d = Math.hypot(mx - cx, my - cy);
        gt = Math.max(0, 1 - d / (Math.min(W, H) * 0.34));
      }
      glow += (gt - glow) * 0.08;
      hero.style.setProperty("--dg", glow.toFixed(3));

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(remeasure);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", sizeCanvas);
      hero.removeEventListener("pointerleave", onLeave);
      hero.style.removeProperty("--dg");
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  );
}
