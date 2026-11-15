"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useChatZugang } from "@/components/chat/ChatAnbieter";
import { site } from "@/lib/content";
import { hero, kontakt, marke } from "@/lib/inhalt-neu";
import { Anfrage } from "../Anfrage";
import { Knopf } from "../Knoepfe";
import { GoldMarke } from "../Marke";
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
 * - Darunter der Hinweis auf den Chat als schmale Glaszeile: links unser kleines Logo, daneben
 *   der Satz, rechts der Glasknopf „Jetzt chatten“. Fährt die Maus über den Knopf, leuchtet die
 *   Chat-Kugel unten rechts kurz auf (nur eine Klasse am <html>, die das Stylesheet auswertet);
 *   ein Klick öffnet den Chat mit seiner gewöhnlichen Kugel-Animation.
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

  const { chat } = useChatZugang();
  const winkUhr = useRef(0);

  useEffect(() => {
    const el = wurzel.current;
    if (!el || istVorschau()) return;
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
    return () => {
      waechter?.disconnect();
      delete el.dataset.an;
      delete el.dataset.da;
    };
  }, [wechsel]);
  // Der Zeitgeber fürs Aufleuchten endet mit dem Baustein.
  useEffect(
    () => () => {
      window.clearTimeout(winkUhr.current);
      document.documentElement.classList.remove(WINK_KLASSE);
    },
    [],
  );

  // Die Maus fährt über „Jetzt chatten“: Die Chat-Kugel unten rechts leuchtet kurz auf.
  const winken = (ev: ReactPointerEvent<HTMLButtonElement>) => {
    if (ev.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;
    if (html.classList.contains(WINK_KLASSE)) return;
    html.classList.add(WINK_KLASSE);
    window.clearTimeout(winkUhr.current);
    winkUhr.current = window.setTimeout(() => html.classList.remove(WINK_KLASSE), WINK_DAUER);
  };

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

        {/* Der Hinweis auf den Chat: eine schmale Glaszeile mit Knopf. Ihr Rand glimmt unter der Maus. */}
        <div className="ag-kon__teil ag-kon__zeile">
          <span className="ag-kon__glas" aria-hidden="true" data-glimm />
          <div className="ag-kon__zeile-innen">
            <GoldMarke className="ag-kon__zeile-logo" />
            <p className="ag-kon__zeile-text">{kontakt.chatHinweis}</p>
            <button type="button" className="ag-kon__chatknopf" onClick={chat.openChat} onPointerEnter={winken}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5Z" />
                <path d="M9 10.5h6M9 13.5h3.5" />
              </svg>
              {kontakt.chatKnopf}
            </button>
          </div>
        </div>

        {/* „Lieber schreiben?“: klein, als Glaskarte; ein Klick öffnet das Formular. */}
        <div className="ag-kon__teil ag-kon__schreiben">
          <Anfrage glas />
        </div>
      </div>
    </div>
  );
}
