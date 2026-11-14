"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { site } from "@/lib/content";
import { gsap } from "@/lib/gsap";
import { hero, kontakt, marke } from "@/lib/inhalt-neu";
import { Anfrage } from "../Anfrage";
import { Knopf } from "../Knoepfe";
import { istVorschau } from "../umgebung";
import { useBewegungsWechsel } from "./einstellung";

// So lange leuchtet der Chat-Knopf auf (Millisekunden, wie im Stylesheet).
const WINK_DAUER = 1400;
const WINK_KLASSE = "ag-chat-wink";

/**
 * „Sprechen wir über Ihr Projekt“ auf der neuen Seite: Anrufen steht klar im Mittelpunkt.
 *
 * - Hauptsatz, darunter die Anruf-Karte aus Glas: „KI-Assistent bereit“ mit einem grünen Punkt,
 *   der sanft atmet wie ein Statuslicht, daneben die Nummer und der Knopf „Jetzt anrufen“. Hinter
 *   der Karte liegt ein schwacher goldener Schein; unter der Maus wird er etwas heller.
 * - Klein darunter der Hinweis auf den Chat. Fährt die Maus über den Satz, läuft ein feiner
 *   goldener Lichtpunkt zum Chat-Knopf unten rechts, und der leuchtet kurz auf. Der Chat selbst
 *   wird dabei nicht angefasst (nur eine Klasse am <html>, die das Stylesheet auswertet).
 * - Ganz unten, am kleinsten: „Lieber schreiben?“ als Glaskarte. Ein Klick öffnet das Formular
 *   (Anfrage.tsx; Felder, Prüfung und Senden sind unverändert).
 * - „Per WhatsApp schreiben“ gibt es nur, wenn der Schalter in lib/content.ts an ist (Standard aus).
 *
 * Beim Hinscrollen schweben die Karten nacheinander als Glas ein (je 120 ms versetzt), einmal je
 * Seitenaufruf. Ohne Skript, bei „weniger Bewegung“ und in der Vorschau steht alles sofort da.
 * Alle Wege sind echte Verweise (tel:), keine neue Logik.
 */
export function KontaktBereich({ titel }: { titel: ReactNode }) {
  const wurzel = useRef<HTMLDivElement>(null);
  const wechsel = useBewegungsWechsel();
  // Der Hauptsatz: der Aufruf vor dem Doppelpunkt, dann der Rest.
  const [aufruf, ...teile] = kontakt.haupt.split(": ");
  const rest = teile.join(": ");
  const war = useRef(false);

  useEffect(() => {
    const el = wurzel.current;
    const satz = el?.querySelector<HTMLElement>(".ag-kon__chat");
    const funke = el?.querySelector<HTMLElement>(".ag-kon__funke");
    if (!el || !satz || !funke || istVorschau()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      war.current = true;
      return;
    }
    // ── Auftritt: einmal je Seitenaufruf, sobald die Karten ins Bild kommen.
    let waechter: IntersectionObserver | undefined;
    if (!war.current && el.getBoundingClientRect().bottom > 0) {
      el.dataset.an = "1";
      waechter = new IntersectionObserver(
        (eintraege) => {
          if (!eintraege.some((e) => e.isIntersecting)) return;
          war.current = true;
          el.dataset.da = "1";
          waechter?.disconnect();
        },
        { rootMargin: "0px 0px -12% 0px" },
      );
      const karten = el.querySelector(".ag-kon__karten");
      if (karten) waechter.observe(karten);
    } else war.current = true;

    // ── Der Lichtpunkt zum Chat-Knopf: nur mit Maus.
    const html = document.documentElement;
    let lauf: gsap.core.Timeline | undefined;
    let uhr = 0;
    const winken = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || lauf?.isActive()) return;
      const knopf = document.querySelector<HTMLElement>(".ag-chat__kugel");
      const k = knopf?.getBoundingClientRect();
      // Ist der Chat offen oder der Knopf nicht zu sehen, gibt es nichts zu zeigen.
      if (!knopf || !k || k.width === 0 || getComputedStyle(knopf).visibility === "hidden") return;
      const s = satz.getBoundingClientRect();
      const von = { x: Math.min(s.right, window.innerWidth - 40), y: s.top + s.height / 2 };
      const zu = { x: k.left + k.width / 2, y: k.top + k.height / 2 };
      const dauer = Math.min(1.1, Math.max(0.55, Math.hypot(zu.x - von.x, zu.y - von.y) / 1500));
      lauf = gsap
        .timeline()
        .set(funke, { x: von.x, y: von.y, opacity: 0, scale: 0.6 })
        .to(funke, { opacity: 1, scale: 1, duration: 0.16, ease: "power1.out" }, 0)
        // Waagerecht gleichmäßig, senkrecht erst spät: ein flacher Bogen zum Knopf.
        .to(funke, { x: zu.x, duration: dauer, ease: "power1.inOut" }, 0)
        .to(funke, { y: zu.y, duration: dauer, ease: "power2.in" }, 0)
        .to(funke, { opacity: 0, scale: 0.4, duration: 0.18, ease: "power1.in" }, dauer - 0.1)
        .call(
          () => {
            html.classList.add(WINK_KLASSE);
            window.clearTimeout(uhr);
            uhr = window.setTimeout(() => html.classList.remove(WINK_KLASSE), WINK_DAUER);
          },
          undefined,
          dauer - 0.12,
        );
    };
    satz.addEventListener("pointerenter", winken);
    return () => {
      waechter?.disconnect();
      satz.removeEventListener("pointerenter", winken);
      lauf?.kill();
      window.clearTimeout(uhr);
      html.classList.remove(WINK_KLASSE);
      gsap.set(funke, { clearProps: "all" });
      delete el.dataset.an;
      delete el.dataset.da;
    };
  }, [wechsel]);

  return (
    <div ref={wurzel} className="ag-wrap ag-abschnitt ag-kon">
      {titel}
      {/* „Rufen Sie uns an:“ steht in Gold: Anrufen ist die Hauptsache. */}
      <p className="ag-kon__haupt">
        <strong>{aufruf}:</strong> {rest}
      </p>

      <div className="ag-kon__karten">
        {/* Die Anruf-Karte: das Wichtigste im ganzen Abschnitt. */}
        <div className="ag-kon__teil ag-kon__anruf">
          <span className="ag-kon__schein" aria-hidden="true" />
          <div className="ag-kon__karte">
            <span className="ag-kon__glas" aria-hidden="true" data-glimm />
            <div className="ag-kon__innen">
              <span className="ag-kon__status">
                <i aria-hidden="true" />
                {kontakt.anrufStatus}
              </span>
              <a className="ag-kon__nummer" href={`tel:${marke.telefon}`}>
                {marke.telefonAnzeige}
              </a>
              <Knopf href={`tel:${marke.telefon}`}>{hero.anrufen}</Knopf>
            </div>
          </div>
        </div>

        {/* WhatsApp: über den Schalter in lib/content.ts (Standard aus). */}
        {site.whatsappAnzeigen && (
          <div className="ag-kon__teil ag-kon__whatsapp">
            <Knopf art="linie" href={marke.whatsapp} neu>
              {kontakt.whatsapp}
            </Knopf>
          </div>
        )}

        <p className="ag-kon__teil ag-kon__chat">{kontakt.chatHinweis}</p>

        {/* „Lieber schreiben?“: klein, als Glaskarte; ein Klick öffnet das Formular. */}
        <div className="ag-kon__teil ag-kon__schreiben">
          <Anfrage glas />
        </div>
      </div>

      {/* Der Lichtpunkt, der zum Chat-Knopf läuft. */}
      <span className="ag-kon__funke" aria-hidden="true" />
    </div>
  );
}
