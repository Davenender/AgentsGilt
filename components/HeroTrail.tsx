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

    const canvas = canvasRef.current;
    const hero = document.getElementById("top");
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
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
    };
    sizeCanvas();

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const logoRadius = () => Math.min(W, H) * 0.16; // Kollisionskreis ums Logo

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
      const cx = W / 2;
      const cy = H / 2;
      const safe = logoRadius() + 40;
      let x = 0;
      let y = 0;
      let tries = 0;
      do {
        x = rand(0, W);
        y = rand(0, H);
        tries++;
      } while (Math.hypot(x - cx, y - cy) < safe && tries < 30);
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
      const lr = logoRadius();
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

        // Logo (Kreis in der Mitte) – abprallen
        const ddx = p.x - cx;
        const ddy = p.y - cy;
        const dc = Math.hypot(ddx, ddy);
        if (dc < lr + r && dc > 0.001) {
          const nx = ddx / dc;
          const ny = ddy / dc;
          p.x = cx + nx * (lr + r);
          p.y = cy + ny * (lr + r);
          const vdot = p.vx * nx + p.vy * ny;
          p.vx -= 2 * vdot * nx;
          p.vy -= 2 * vdot * ny;
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
        gt = Math.max(0, 1 - d / (Math.min(W, H) * 0.5));
      }
      glow += (gt - glow) * 0.08;
      hero.style.setProperty("--dg", glow.toFixed(3));

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
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
