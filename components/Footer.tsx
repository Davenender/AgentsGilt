import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/content";

export function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Image src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
              <span className="font-display text-[15px] font-bold uppercase tracking-[0.12em] text-white">
                Agents Gilt
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              KI-Lösungen für lokale Unternehmen – moderne Websites, Chatbots,
              Voice-Agenten und Automatisierungen.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Navigation
            </span>
            <a href="#leistungen" className="hover:text-white">Leistungen</a>
            <a href="#ablauf" className="hover:text-white">Ablauf</a>
            <a href="#warum" className="hover:text-white">Warum wir</a>
            <a href="#kontakt" className="hover:text-white">Kontakt</a>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Kontakt & Recht
            </span>
            <a href={`mailto:${site.email}`} className="hover:text-white">
              {site.email}
            </a>
            <Link href="/impressum" className="hover:text-white">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} Agents Gilt. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
}
