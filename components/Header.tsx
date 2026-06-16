"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const links = [
  { href: "#leistungen", label: "Leistungen" },
  { href: "#ablauf", label: "Ablauf" },
  { href: "#warum", label: "Warum wir" },
  { href: "#kontakt", label: "Kontakt" },
];

export function Header() {
  // "solid" = heller, lesbarer Header (sobald man am Hero vorbei ist)
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) {
      setSolid(true);
      return;
    }
    // Solange irgendein Teil des (dunklen) Hero hinter dem Header sichtbar ist,
    // bleibt der Header transparent. Danach wird er solide.
    const observer = new IntersectionObserver(
      ([entry]) => setSolid(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Beim offenen Mobil-Menü immer den hellen (lesbaren) Modus nutzen.
  const light = solid || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        light
          ? "border-b border-line bg-cream/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt="Agents Gilt"
            width={34}
            height={34}
            className="h-8 w-8"
          />
          <span
            className={`font-display text-[15px] font-bold uppercase tracking-[0.12em] transition-colors ${
              light ? "text-ink" : "text-white"
            }`}
          >
            Agents Gilt
          </span>
        </a>

        {/* Desktop-Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-gold ${
                light ? "text-ink-soft" : "text-white/85"
              }`}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#kontakt"
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.04]"
          >
            Projekt anfragen
          </a>
        </nav>

        {/* Mobile-Button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden"
          aria-label="Menü öffnen"
        >
          <div className="flex h-6 w-7 flex-col justify-center gap-[5px]">
            <span
              className={`h-[2px] w-full transition-all ${light ? "bg-ink" : "bg-white"} ${open ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span
              className={`h-[2px] w-full transition-all ${light ? "bg-ink" : "bg-white"} ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`h-[2px] w-full transition-all ${light ? "bg-ink" : "bg-white"} ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </div>
        </button>
      </div>

      {/* Mobile-Menü */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-line bg-cream px-6 py-4 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2 text-base font-medium text-ink"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#kontakt"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-gold px-5 py-3 text-center text-sm font-semibold text-ink"
          >
            Projekt anfragen
          </a>
        </nav>
      )}
    </header>
  );
}
