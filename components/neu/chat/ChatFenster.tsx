"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useChatZugang } from "@/components/chat/ChatAnbieter";
import type { ChatZustand } from "@/components/chat/useChat";
import { CHAT_ZEICHEN, STARTER_QUESTIONS, WORT_FLACKERN, reichTeile, woerter, wortTakt, type Message } from "@/lib/chat-text";
import { chat as chatTexte, marke } from "@/lib/inhalt-neu";
import kernBild from "@/public/stern/kern.webp";
import strahlenBild from "@/public/stern/strahlen-1.webp";
import { enthuelleText, richteVerwuerfelnEin } from "../verwuerfeln";
import "./chat.css";

const t = chatTexte.fenster;
const zufall = () => CHAT_ZEICHEN[Math.floor(Math.random() * CHAT_ZEICHEN.length)];

/**
 * Das Chat-Fenster der neuen Seite: dunkles Glas, Gold, Zeichen-Effekte.
 *
 * Es ist nur die Hülle. Was der Chat tut (Antworten über /api/chat, Übergabe an das Team über
 * das Support-Ticket, Übernahme ins Kontaktformular, Verlauf, Schutzregeln), steht unverändert
 * in components/chat/useChat.ts und läuft einmal im Stammlayout. Solange dieses Fenster auf der
 * Seite ist, zeichnet das alte Fenster (components/ChatWidget.tsx) nichts.
 *
 * - Öffnen: Der Stern des Chat-Knopfs wächst auf, das Fenster faltet sich in Rautenform aus ihm
 *   aus (0,5 s, weich auslaufend); der Kopf setzt sich aus Zeichen zusammen. Schließen: umgekehrt.
 * - Antworten entschlüsseln sich Wort für Wort aus goldenen Zufallszeichen; ist der Text fertig,
 *   ist er gewöhnlicher Text (markierbar, kopierbar). Für Vorleseprogramme steht er sofort ganz da.
 * - Am Handy gleitet das Fenster als Glasblatt von unten hoch und lässt sich am Griff
 *   hinunterwischen; es bleibt immer über der Tastatur.
 * - „Weniger Bewegung“: Alles steht sofort da.
 * - Leistung: Zeichen laufen nur, solange sich eine sichtbare Nachricht entschlüsselt. Ist das
 *   Fenster zu, läuft nichts.
 */
export function ChatFenster() {
  const { chat, meldeNeueHuelle } = useChatZugang();
  useEffect(() => meldeNeueHuelle(), [meldeNeueHuelle]);

  const offen = chat.open;
  // Der Inhalt entsteht mit dem ersten Öffnen und bleibt dann (so läuft das Schließen weich).
  const [gebaut, setGebaut] = useState(false);
  // Wie viele Nachrichten beim ersten Öffnen schon da waren: Die stehen einfach da. Nur eine
  // frische Begrüßung (noch kein Gespräch) entschlüsselt sich.
  const [alt, setAlt] = useState<number | null>(null);
  if (offen && !gebaut) setGebaut(true);
  // Damit das erste Öffnen ohne Wartezeit beginnt, entsteht der Inhalt schon vorher in einer
  // ruhigen Minute (er steht dann nur da: Es läuft nichts, solange das Fenster zu ist).
  useEffect(() => {
    if (gebaut) return;
    const bauen = () => setGebaut(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(bauen, { timeout: 6000 });
      return () => window.cancelIdleCallback(id);
    }
    const uhr = window.setTimeout(bauen, 3000);
    return () => window.clearTimeout(uhr);
  }, [gebaut]);
  if (offen && alt === null) setAlt(chat.messages.length <= 1 ? 0 : chat.messages.length);

  const wurzel = useRef<HTMLDivElement>(null);
  const blatt = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const eingabe = useRef<HTMLTextAreaElement>(null);
  const strich = useRef<HTMLSpanElement>(null);

  // „Weniger Bewegung“ und Handy (kein Drüberfahren): einmal je Öffnen abgelesen.
  const [ruhig, setRuhig] = useState(false);
  const [maus, setMaus] = useState(true);
  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const lesen = () => {
      setRuhig(r.matches);
      setMaus(m.matches);
    };
    lesen();
    r.addEventListener("change", lesen);
    m.addEventListener("change", lesen);
    return () => {
      r.removeEventListener("change", lesen);
      m.removeEventListener("change", lesen);
    };
  }, []);

  const mitTeam = !!chat.ticket && !chat.ticket.closed;
  const [begruessungSteht, setBegruessungSteht] = useState(false);
  const zeigeVorschlaege = alt !== null && chat.messages.length === 1 && !chat.streaming;

  // Immer am Ende des Verlaufs bleiben: bei jeder neuen Nachricht, und auch wenn der Inhalt
  // nachträglich wächst (eine Antwort bekommt ihren Anruf-Chip, im Ticket erscheint ein Hinweis).
  // Hat der Besucher selbst hochgescrollt, bleibt die Liste, wo er sie hingestellt hat.
  const amEnde = useRef(true);
  useEffect(() => {
    const el = liste.current;
    if (!el) return;
    amEnde.current = true;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.streamText, chat.showContact, chat.handoff, chat.error, offen, begruessungSteht]);
  useEffect(() => {
    const el = liste.current;
    const inhalt = el?.firstElementChild;
    if (!el || !inhalt || !gebaut) return;
    const gescrollt = () => {
      amEnde.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    };
    const waechter = new ResizeObserver(() => {
      if (amEnde.current) el.scrollTop = el.scrollHeight;
    });
    waechter.observe(inhalt);
    el.addEventListener("scroll", gescrollt, { passive: true });
    return () => {
      waechter.disconnect();
      el.removeEventListener("scroll", gescrollt);
    };
  }, [gebaut]);

  // Die Bilder des Kopfs schon beim Vorbereiten entpacken, damit das erste Öffnen nicht stockt.
  useEffect(() => {
    if (!gebaut) return;
    wurzel.current?.querySelectorAll<HTMLImageElement>(".ag-cf__logo img").forEach((bild) => void bild.decode?.().catch(() => {}));
  }, [gebaut]);

  // Öffnen: Der Kopf setzt sich aus Zeichen zusammen; am Computer bekommt das Eingabefeld den
  // Fokus (am Handy nicht: Dort schöbe die Tastatur sofort Begrüßung und Vorschläge weg).
  useEffect(() => {
    if (!offen) return;
    const abbruch: (() => void)[] = [];
    const uhr = window.setTimeout(() => {
      wurzel.current?.querySelectorAll<HTMLElement>(".ag-cf__kopf .ag-wuerfel").forEach((el) => abbruch.push(enthuelleText(el, 620)));
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) eingabe.current?.focus({ preventScroll: true });
    }, 140);
    return () => {
      window.clearTimeout(uhr);
      abbruch.forEach((a) => a());
    };
  }, [offen, mitTeam]);

  // Schließen: Esc, und der Fokus geht zurück zum Chat-Knopf.
  const schliessen = useCallback(() => {
    chat.setOpen(false);
    window.setTimeout(() => document.querySelector<HTMLElement>(".ag-chat__kugel")?.focus({ preventScroll: true }), 60);
  }, [chat]);
  useEffect(() => {
    if (!offen) return;
    const taste = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") schliessen();
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [offen, schliessen]);

  // Texte, die beim Drüberfahren kurz verbuggen (der Mitarbeiter-Knopf).
  useEffect(() => {
    if (!offen || !blatt.current) return;
    return richteVerwuerfelnEin(blatt.current);
  }, [offen, mitTeam, chat.showContact, chat.handoff, chat.streaming]);

  // Handy: Das Blatt bleibt im sichtbaren Teil des Bildschirms, also immer über der Tastatur.
  useEffect(() => {
    const el = wurzel.current;
    const sicht = window.visualViewport;
    if (!offen || !el || !sicht) return;
    const messen = () => {
      el.style.setProperty("--cf-hoch", `${sicht.height}px`);
      el.style.setProperty("--cf-oben", `${sicht.offsetTop}px`);
    };
    messen();
    sicht.addEventListener("resize", messen);
    sicht.addEventListener("scroll", messen);
    return () => {
      sicht.removeEventListener("resize", messen);
      sicht.removeEventListener("scroll", messen);
    };
  }, [offen]);

  // Handy: am Griff hinunterwischen schließt das Blatt.
  const zug = useRef<{ y: number; zeit: number } | null>(null);
  const zugAn = (ev: ReactPointerEvent<HTMLElement>) => {
    if (ev.pointerType === "mouse" || !window.matchMedia("(max-width: 767px)").matches) return;
    zug.current = { y: ev.clientY, zeit: ev.timeStamp };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const zugLauf = (ev: ReactPointerEvent<HTMLElement>) => {
    if (!zug.current || !blatt.current) return;
    const weg = Math.max(0, ev.clientY - zug.current.y);
    blatt.current.style.transition = "none";
    blatt.current.style.transform = `translate3d(0, ${weg}px, 0)`;
  };
  const zugEnde = (ev: ReactPointerEvent<HTMLElement>) => {
    const anfang = zug.current;
    zug.current = null;
    if (!anfang || !blatt.current) return;
    const weg = Math.max(0, ev.clientY - anfang.y);
    const tempo = weg / Math.max(1, ev.timeStamp - anfang.zeit);
    blatt.current.style.transition = "";
    blatt.current.style.transform = "";
    // Weit genug oder schnell genug gezogen: schließen. Sonst federt es zurück.
    if (weg > 120 || (weg > 40 && tempo > 0.6)) schliessen();
  };

  // Senden: Ein feiner Lichtstrich zieht vom Knopf nach oben in den Verlauf.
  const lichtstrich = () => {
    if (ruhig) return;
    strich.current?.animate(
      [
        { opacity: 0, transform: "translate3d(0, 0, 0) scaleY(0.3)" },
        { opacity: 1, transform: "translate3d(0, -40px, 0) scaleY(1)", offset: 0.25 },
        { opacity: 0, transform: "translate3d(0, -190px, 0) scaleY(0.6)" },
      ],
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  };
  const senden = () => {
    if (!chat.input.trim() || chat.streaming) return;
    lichtstrich();
    void chat.sendMessage();
  };

  // Ein Vorschlag fliegt ins Eingabefeld und wird abgeschickt.
  const waehle = (frage: string, knopf: HTMLElement) => {
    const feld = eingabe.current;
    if (ruhig || !feld) return void chat.sendMessage(frage);
    const von = knopf.getBoundingClientRect();
    const zu = feld.getBoundingClientRect();
    const flug = document.createElement("span");
    flug.className = "ag-cf__flug";
    flug.textContent = frage;
    flug.style.left = `${von.left}px`;
    flug.style.top = `${von.top}px`;
    flug.style.width = `${von.width}px`;
    wurzel.current?.append(flug);
    knopf.style.visibility = "hidden";
    const lauf = flug.animate(
      [
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
        { transform: `translate3d(${zu.left + 16 - von.left}px, ${zu.top + zu.height / 2 - von.top - von.height / 2}px, 0) scale(0.94)`, opacity: 0.25 },
      ],
      { duration: 360, easing: "cubic-bezier(0.5, 0, 0.2, 1)" },
    );
    const fertig = () => {
      flug.remove();
      lichtstrich();
      void chat.sendMessage(frage);
    };
    lauf.onfinish = fertig;
    lauf.oncancel = fertig;
  };

  // Das Eingabefeld wächst mit dem Text (bis 120 px).
  useEffect(() => {
    const feld = eingabe.current;
    if (!feld) return;
    feld.style.height = "auto";
    feld.style.height = `${Math.min(120, feld.scrollHeight)}px`;
  }, [chat.input, gebaut]);

  const animiert = (i: number) => !ruhig && alt !== null && i >= alt;
  // Der Verlauf, dazu die Antwort, die gerade ankommt. Sie steht in derselben Liste an der Stelle,
  // die sie gleich im Verlauf hat: So entschlüsselt sie sich ohne Bruch weiter, wenn sie fertig ist.
  // (Vor dem ersten Öffnen ist die Liste leer: Die Nachrichten entstehen erst mit dem Öffnen, damit
  // sich eine frische Begrüßung dann entschlüsseln kann.)
  const zeilen: (Message & { kommtNoch?: boolean })[] =
    alt === null ? [] : chat.streaming && chat.streamText ? [...chat.messages, { role: "assistant", content: chat.streamText, kommtNoch: true }] : chat.messages;

  return (
    <div ref={wurzel} className="ag-cf" data-offen={offen} data-team={mitTeam} data-lenis-prevent>
      <button type="button" className="ag-cf__dunkel" tabIndex={-1} aria-hidden="true" onClick={schliessen} />
      {/* Der Stern des Chat-Knopfs wächst beim Öffnen auf. */}
      <span className="ag-cf__auf" aria-hidden="true" />
      <div className="ag-cf__rahmen">
        {/* Hinter dem Glas: ganz schwach der Logo-Stern als Lichtschein. */}
        <span className="ag-cf__schein" aria-hidden="true" />
        <span className="ag-cf__schatten" aria-hidden="true" />
        <div ref={blatt} className="ag-cf__blatt" role="dialog" aria-label={t.titel} aria-hidden={!offen} inert={!offen}>
          {gebaut && (
            <>
              <header className="ag-cf__kopf" onPointerDown={zugAn} onPointerMove={zugLauf} onPointerUp={zugEnde} onPointerCancel={zugEnde}>
                <span className="ag-cf__griff" aria-hidden="true" />
                <span className="ag-cf__logo" aria-hidden="true">
                  <Image className="ag-cf__strahlen" src={strahlenBild} alt="" width={92} height={92} unoptimized draggable={false} />
                  <Image className="ag-cf__kern" src={kernBild} alt="" width={92} height={92} unoptimized draggable={false} />
                </span>
                <span className="ag-cf__wer">
                  <span className="ag-cf__name">
                    <span className="ag-wuerfel">
                      <span className="ag-wuerfel__echt">{t.name}</span>
                    </span>
                  </span>
                  <span className="ag-cf__rolle">
                    <i aria-hidden="true" />
                    <span className="ag-wuerfel" key={mitTeam ? "team" : "ki"}>
                      <span className="ag-wuerfel__echt">{mitTeam ? `${t.team} · ${t.verbunden}` : `${t.ki} · ${t.online}`}</span>
                    </span>
                  </span>
                </span>
                <button type="button" className="ag-cf__zu" aria-label={t.schliessen} onClick={schliessen} onPointerDown={(ev) => ev.stopPropagation()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </header>

              <div ref={liste} className="ag-cf__liste" role="log" aria-busy={chat.streaming}>
                <div className="ag-cf__inhalt">
                {zeilen.map((m, i) =>
                  m.role === "user" ? (
                    <div key={`n-${i}`} className="ag-cf__zeile ag-cf__zeile--ich">
                      <div className="ag-cf__blase ag-cf__blase--ich">
                        <Eigene text={m.content} animiert={offen && animiert(i)} />
                      </div>
                    </div>
                  ) : (
                    <div key={`n-${i}`} className="ag-cf__zeile">
                      <div className={`ag-cf__blase${m.role === "team" ? " ag-cf__blase--team" : ""}`}>
                        {m.role === "team" && m.von && <span className="ag-cf__von">{m.von}</span>}
                        <Antwort text={m.content} laeuft={!!m.kommtNoch} animiert={offen && animiert(i)} beiFertig={i === 0 ? () => setBegruessungSteht(true) : undefined} />
                      </div>
                    </div>
                  ),
                )}
                {chat.streaming && !chat.streamText && (
                  <div className="ag-cf__zeile">
                    <div className="ag-cf__blase ag-cf__blase--tippt">
                      <Tippt ruhig={ruhig || !offen} />
                    </div>
                  </div>
                )}
                {chat.error && (
                  <p className="ag-cf__fehler" role="alert">
                    {chat.error}
                  </p>
                )}

                {/* Die drei Vorschläge: nur solange noch nichts gefragt wurde. */}
                {zeigeVorschlaege && <Vorschlaege da={begruessungSteht || !animiert(0)} gleichLesbar={!maus || ruhig} beiWahl={waehle} />}

                {/* Der Assistent kommt nicht weiter: Mitarbeiter (Support-Ticket), anrufen oder Anfrage schicken. */}
                {chat.showContact && !chat.streaming && !mitTeam && !chat.handoff && (
                  <div className="ag-cf__wege">
                    <MitarbeiterKnopf beiKlick={chat.openHandoff} />
                    <div className="ag-cf__wege-klein">
                      <a className="ag-cf__chip" href={`tel:${marke.telefon}`}>
                        {t.anrufen}
                        <span>{marke.telefonAnzeige}</span>
                      </a>
                      <button type="button" className="ag-cf__link ag-cf__link--knopf" onClick={chat.goToContact}>
                        {t.anfrage}
                      </button>
                    </div>
                    <p className="ag-cf__klein">{t.telefonHinweis}</p>
                  </div>
                )}

                {/* Übergabe an einen Mitarbeiter: das Support-Ticket. */}
                {chat.handoff && !mitTeam && <TicketKarte chat={chat} />}
                </div>
              </div>

              <div className="ag-cf__unten">
                <div className="ag-cf__feld" data-text={chat.input.trim() ? "" : undefined}>
                  <textarea
                    ref={eingabe}
                    value={chat.input}
                    onChange={(ev) => chat.setInput(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" && !ev.shiftKey) {
                        ev.preventDefault();
                        senden();
                      }
                    }}
                    rows={1}
                    aria-label={mitTeam ? t.eingabeTeam : t.eingabe}
                  />
                  {!chat.input && <Platzhalter texte={mitTeam ? [t.platzTeam] : t.platz} laeuft={offen && !ruhig} />}
                  <button type="button" className="ag-cf__senden" aria-label={t.senden} disabled={chat.streaming || !chat.input.trim()} onClick={senden}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 1.5c.9 7.2 3.3 9.6 10.5 10.5-7.2.9-9.6 3.3-10.5 10.5C11.1 15.3 8.7 12.9 1.5 12 8.7 11.1 11.1 8.7 12 1.5Z" />
                    </svg>
                    <span ref={strich} className="ag-cf__strich" aria-hidden="true" />
                  </button>
                </div>
                <div className="ag-cf__fuss">
                  {mitTeam ? (
                    <span>{t.mitTeam}</span>
                  ) : (
                    <>
                      <span>{t.istKi}</span>
                      <MitarbeiterKnopf klein beiKlick={chat.openHandoff} />
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** „Mit einem Mitarbeiter sprechen“: Glasknopf mit Sprechblase. Er führt zum Support-Ticket. */
function MitarbeiterKnopf({ beiKlick, klein = false }: { beiKlick: () => void; klein?: boolean }) {
  return (
    <button type="button" className={`ag-cf__mensch${klein ? " ag-cf__mensch--klein" : ""}`} onClick={beiKlick} data-wuerfel>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.4-4.2A7.5 7.5 0 1 1 20 11.5Z" />
        <path d="M9 10.5h6M9 13.5h3.5" />
      </svg>
      <span className="ag-wuerfel">
        <span className="ag-wuerfel__echt">{t.mitarbeiter}</span>
      </span>
    </button>
  );
}

/**
 * Eine Antwort (Assistent oder Team). Mit `animiert` entschlüsselt sie sich: Jedes Wort erscheint
 * erst als goldene Zufallszeichen und rastet dann ein, Wort für Wort von links nach rechts. Eine
 * fertige Antwort steht nach etwa 1 s; eine, die noch ankommt (`laeuft`), entschlüsselt sich
 * fortlaufend und holt auf, wenn viel auf einmal kommt. Jedes Wort hat von Anfang an seinen
 * endgültigen Platz, nichts springt. Danach ist es gewöhnlicher Text mit Links und Anruf-Chip.
 */
function Antwort({ text, laeuft, animiert, beiFertig }: { text: string; laeuft: boolean; animiert: boolean; beiFertig?: () => void }) {
  const [fertig, setFertig] = useState(!animiert);
  const huelle = useRef<HTMLSpanElement>(null);
  const stand = useRef({ gestartet: 0, naechstes: 0, zeiten: [] as number[] });
  const laeuftJetzt = useRef(laeuft);
  const melden = useRef(beiFertig);
  useEffect(() => {
    laeuftJetzt.current = laeuft;
    melden.current = beiFertig;
  }, [laeuft, beiFertig]);
  const teile = useMemo(() => woerter(text), [text]);

  useEffect(() => {
    // Steht sie von Anfang an da (Verlauf, „weniger Bewegung“), gilt sie sofort als fertig.
    if (fertig) return void melden.current?.();
    const el = huelle.current;
    if (!el) return;
    let rahmen = 0;
    let vorbei = false;
    const s = stand.current;
    const schritt = (jetzt: number) => {
      rahmen = 0;
      if (vorbei) return;
      const felder = el.querySelectorAll<HTMLElement>(".ag-cf__w");
      const n = felder.length;
      if (!s.naechstes) s.naechstes = jetzt;
      // Kommt die Antwort noch an, holen die Wörter auf: nie langsamer als 40 ms je Wort.
      const takt = laeuftJetzt.current ? Math.min(40, 480 / Math.max(1, n - s.gestartet)) : wortTakt(n);
      while (s.gestartet < n && s.naechstes <= jetzt) {
        s.zeiten[s.gestartet] = jetzt;
        felder[s.gestartet].dataset.z = "1";
        s.gestartet += 1;
        s.naechstes += takt;
      }
      // Wartet sie auf neue Wörter, staut sich nichts auf.
      if (s.gestartet >= n) s.naechstes = jetzt;
      let offen = false;
      for (let i = 0; i < s.gestartet && i < n; i++) {
        const feld = felder[i];
        if (feld.dataset.z !== "1") continue;
        if (jetzt - s.zeiten[i] >= WORT_FLACKERN) {
          feld.dataset.z = "2";
          continue;
        }
        offen = true;
        const zeichen = feld.lastElementChild as HTMLElement | null;
        if (zeichen && (!zeichen.dataset.zeit || jetzt - Number(zeichen.dataset.zeit) > 48)) {
          zeichen.dataset.zeit = String(jetzt);
          const laenge = Math.max(1, Math.min(14, Math.round((feld.firstElementChild?.textContent ?? "").length * 0.8)));
          let neu = "";
          for (let k = 0; k < laenge; k++) neu += zufall();
          zeichen.textContent = neu;
        }
      }
      if (s.gestartet >= n && !offen && !laeuftJetzt.current) {
        // Fertig: Ab jetzt ist es gewöhnlicher Text (gemeldet wird oben, wenn „fertig“ gilt).
        setFertig(true);
        return;
      }
      rahmen = requestAnimationFrame(schritt);
    };
    rahmen = requestAnimationFrame(schritt);
    return () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
    };
  }, [fertig]);

  if (fertig) return <ReichText text={text} />;
  return (
    <>
      {/* Für Vorleseprogramme steht der Text sofort ganz da. */}
      <span className="ag-cf__vorlesen">{text}</span>
      <span ref={huelle} className="ag-cf__spiel" aria-hidden="true">
        {teile.map((teil, i) =>
          teil.leer ? (
            teil.text
          ) : (
            <span key={i} className="ag-cf__w">
              <span className="ag-cf__we">{teil.text}</span>
              <span className="ag-cf__wz" />
            </span>
          ),
        )}
      </span>
    </>
  );
}

/** Der fertige Text einer Antwort: Links mit goldener Unterstreichung, Telefonnummern als Glas-Chip „Jetzt anrufen“. */
function ReichText({ text }: { text: string }) {
  const teile = useMemo(() => reichTeile(text), [text]);
  return (
    <>
      {teile.map((teil, i) =>
        teil.art === "text" ? (
          teil.text
        ) : teil.art === "tel" ? (
          <a key={i} className="ag-cf__chip" href={teil.href}>
            {t.anrufen}
            <span>{teil.text}</span>
          </a>
        ) : (
          <a key={i} className="ag-cf__link" href={teil.href} {...(teil.art === "netz" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {teil.text}
          </a>
        ),
      )}
    </>
  );
}

/** Die eigene Nachricht: erscheint kurz verbuggt und rastet nach 0,25 s als der getippte Text ein. */
function Eigene({ text, animiert }: { text: string; animiert: boolean }) {
  const huelle = useRef<HTMLSpanElement>(null);
  const [spielt] = useState(animiert);
  useEffect(() => {
    if (!spielt || !huelle.current) return;
    return enthuelleText(huelle.current, 250);
  }, [spielt]);
  return (
    <span ref={huelle} className="ag-wuerfel">
      <span className="ag-wuerfel__echt">{text}</span>
    </span>
  );
}

/** „Schreibt gerade“: drei kleine Zeichen, die durcheinanderwürfeln. */
function Tippt({ ruhig }: { ruhig: boolean }) {
  const huelle = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = huelle.current;
    if (ruhig || !el) return;
    const felder = Array.from(el.children) as HTMLElement[];
    const wuerfeln = () => felder.forEach((f) => (f.textContent = zufall()));
    wuerfeln();
    const takt = window.setInterval(wuerfeln, 110);
    return () => window.clearInterval(takt);
  }, [ruhig]);
  return (
    <span ref={huelle} className="ag-cf__tippt" role="status" aria-label={t.tippt}>
      <i>·</i>
      <i>·</i>
      <i>·</i>
    </span>
  );
}

/** Eine schwache Zeichenreihe in der Länge des Textes (immer dieselbe für denselben Text). */
function zeichenreihe(text: string): string {
  let reihe = "";
  for (let i = 0; i < text.length; i++) reihe += text[i] === " " ? " " : CHAT_ZEICHEN[(text.charCodeAt(i) * 7 + i * 3) % CHAT_ZEICHEN.length];
  return reihe;
}

/**
 * Die drei Vorschläge. Sie stehen zuerst als schwache Zeichenreihen da und erscheinen
 * nacheinander, sobald die Begrüßung steht. Beim Drüberfahren (oder mit der Tastatur) setzen sie
 * sich zum Text zusammen und bleiben lesbar. Am Handy und bei „weniger Bewegung“ stehen sie
 * gleich lesbar da. Für Vorleseprogramme tragen die Knöpfe immer ihren Text.
 */
function Vorschlaege({ da, gleichLesbar, beiWahl }: { da: boolean; gleichLesbar: boolean; beiWahl: (frage: string, knopf: HTMLElement) => void }) {
  const [gelesen, setGelesen] = useState<Record<string, boolean>>({});
  const zeige = (frage: string, knopf: HTMLElement) => {
    if (gleichLesbar || gelesen[frage]) return;
    setGelesen((alt) => ({ ...alt, [frage]: true }));
    const huelle = knopf.querySelector<HTMLElement>(".ag-wuerfel");
    if (huelle) enthuelleText(huelle, 420);
  };
  return (
    <div className="ag-cf__vorschlaege" data-da={da}>
      {STARTER_QUESTIONS.map((frage, i) => {
        const lesbar = gleichLesbar || !!gelesen[frage];
        return (
          <button
            key={frage}
            type="button"
            className="ag-cf__vorschlag"
            data-lesbar={lesbar}
            style={{ "--i": i } as CSSProperties}
            aria-label={frage}
            onPointerEnter={(ev) => zeige(frage, ev.currentTarget)}
            onFocus={(ev) => zeige(frage, ev.currentTarget)}
            onClick={(ev) => beiWahl(frage, ev.currentTarget)}
          >
            <span className="ag-wuerfel">
              <span className="ag-wuerfel__echt">{frage}</span>
            </span>
            {!lesbar && (
              <span className="ag-cf__reihe" aria-hidden="true">
                {zeichenreihe(frage)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Der Platzhalter des Eingabefelds: wechselt alle paar Sekunden verbuggt zwischen Beispielfragen. */
function Platzhalter({ texte, laeuft }: { texte: readonly string[]; laeuft: boolean }) {
  const [nr, setNr] = useState(0);
  const huelle = useRef<HTMLSpanElement>(null);
  const viele = texte.length > 1;
  useEffect(() => {
    if (!laeuft || !viele) return;
    const takt = window.setInterval(() => setNr((n) => n + 1), 3600);
    return () => window.clearInterval(takt);
  }, [laeuft, viele]);
  useEffect(() => {
    if (!laeuft || !viele || nr === 0 || !huelle.current) return;
    return enthuelleText(huelle.current, 380);
  }, [nr, laeuft, viele]);
  return (
    <span className="ag-cf__platz" aria-hidden="true">
      <span ref={huelle} className="ag-wuerfel" key={nr % texte.length}>
        <span className="ag-wuerfel__echt">{texte[nr % texte.length]}</span>
      </span>
    </span>
  );
}

type TicketFeld = "name" | "kontakt" | "frage";

/**
 * Das Formular für die Übergabe an einen Mitarbeiter, als Glaskarte im Chat. Felder, Prüfung und
 * Senden sind die des bestehenden Support-Tickets (useChat: submitHandoff). Neu ist nur die
 * Anzeige wie im Kontaktformular: goldener Schein hinter dem Feld mit Fokus, leichter Schimmer
 * hinter ausgefüllten Feldern, roter Schein mit einem kurzen Satz bei fehlenden Pflichtfeldern
 * (der Browser prüft und sendet dann nichts; nur seine Sprechblase ist ersetzt).
 */
function TicketKarte({ chat }: { chat: ChatZustand }) {
  const k = t.ticket;
  const karte = useRef<HTMLFormElement>(null);
  const [fehlt, setFehlt] = useState<Partial<Record<TicketFeld, string>>>({});

  useEffect(() => {
    const el = karte.current;
    if (!el) return;
    let gemeldet: Partial<Record<TicketFeld, string>> = {};
    let erstes: HTMLElement | null = null;
    let geplant = false;
    let uhr = 0;
    const ungueltig = (ev: Event) => {
      const feld = ev.target as HTMLInputElement | HTMLTextAreaElement;
      const name = feld.name as TicketFeld;
      if (name !== "name" && name !== "kontakt" && name !== "frage") return;
      ev.preventDefault();
      gemeldet[name] = k.fehlt[name];
      erstes ??= feld;
      if (geplant) return;
      geplant = true;
      // Der Browser meldet alle ungültigen Felder in einem Zug: danach anzeigen.
      uhr = window.setTimeout(() => {
        setFehlt(gemeldet);
        erstes?.focus();
        gemeldet = {};
        erstes = null;
        geplant = false;
      }, 0);
    };
    el.addEventListener("invalid", ungueltig, true);
    return () => {
      window.clearTimeout(uhr);
      el.removeEventListener("invalid", ungueltig, true);
    };
  }, [k.fehlt]);

  const getippt = (ev: FormEvent<HTMLFormElement>) => {
    const feld = ev.target as HTMLInputElement | HTMLTextAreaElement;
    if (!feld.validity?.valid || !(feld.name in fehlt)) return;
    setFehlt((alt) => {
      const rest = { ...alt };
      delete rest[feld.name as TicketFeld];
      return rest;
    });
  };
  // „Fehlt“ gilt nur, solange das Feld leer ist.
  const zeigt = (feld: TicketFeld, wert: string) => (fehlt[feld] && !wert.trim() ? fehlt[feld] : undefined);
  const voll = (wert: string) => (wert.trim() ? "" : undefined);
  const meldung = (feld: TicketFeld, wert: string) => (
    <span className="ag-cf__fehlt" aria-live="polite">
      {zeigt(feld, wert) ?? ""}
    </span>
  );

  return (
    <form ref={karte} className="ag-cf__ticket" onSubmit={chat.submitHandoff} onInput={getippt}>
      <p className="ag-cf__ticket-hinweis">{k.hinweis}</p>
      <label className="ag-cf__eingabe" data-voll={voll(chat.hName)} data-fehlt={zeigt("name", chat.hName) ? "" : undefined}>
        <input name="name" value={chat.hName} onChange={(ev) => chat.setHName(ev.target.value)} placeholder={k.name} aria-label={k.name} required maxLength={80} autoComplete="name" />
        {meldung("name", chat.hName)}
      </label>
      <label className="ag-cf__eingabe" data-voll={voll(chat.hKontakt)} data-fehlt={zeigt("kontakt", chat.hKontakt) ? "" : undefined}>
        <input name="kontakt" value={chat.hKontakt} onChange={(ev) => chat.setHKontakt(ev.target.value)} placeholder={k.kontakt} aria-label={k.kontakt} required maxLength={120} />
        {meldung("kontakt", chat.hKontakt)}
      </label>
      <label className="ag-cf__eingabe" data-voll={voll(chat.hFrage)} data-fehlt={zeigt("frage", chat.hFrage) ? "" : undefined}>
        <textarea name="frage" value={chat.hFrage} onChange={(ev) => chat.setHFrage(ev.target.value)} placeholder={k.frage} aria-label={k.frage} required rows={3} maxLength={1000} />
        {meldung("frage", chat.hFrage)}
      </label>
      {/* Köder für einfache Bots: Menschen sehen das Feld nicht. */}
      <input className="ag-cf__koeder" value={chat.hHoney} onChange={(ev) => chat.setHHoney(ev.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
      <p className="ag-cf__klein">{k.weg}</p>
      <p className="ag-cf__klein">
        {k.datenschutzVor}
        <a className="ag-cf__link" href="/datenschutz">
          {k.datenschutz}
        </a>
        {k.datenschutzNach}
      </p>
      {chat.hError && (
        <p className="ag-cf__fehler" role="alert">
          {chat.hError}
        </p>
      )}
      <div className="ag-cf__ticket-knoepfe">
        <button type="submit" className="ag-cf__gold" disabled={chat.hBusy}>
          {chat.hBusy ? k.laeuft : k.verbinden}
        </button>
        <button type="button" className="ag-cf__leise" onClick={() => chat.setHandoff(false)}>
          {k.abbrechen}
        </button>
      </div>
    </form>
  );
}
