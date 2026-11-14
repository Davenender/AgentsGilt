"use client";

import { useEffect, useRef, useState } from "react";
import { chat } from "@/lib/inhalt-neu";
import { useChatZugang } from "../chat/ChatAnbieter";
import { richteGlimmrandEin } from "./glimmrand";
import { richteMagnetEin } from "./magnet";
import { LADEN_FERTIG, LADEN_FERTIG_KLASSE } from "./umgebung";
import { enthuelleText } from "./verwuerfeln";

// Merkt sich für diese Sitzung, dass die Sprechblase geschlossen oder (am Handy) gezeigt wurde.
const MERKER = "ag-neu-blase-zu";
// Setzt der Chat selbst, sobald er geöffnet oder sein eigener Hinweis geschlossen wurde. Wird hier nur gelesen.
const MERKER_CHAT = "ag-assistant-dismissed";

/**
 * Chat-Knopf unten rechts, neu gestaltet: eine runde Glas-Kugel mit einem kleinen goldenen
 * Licht in Logo-Form.
 *
 * - Magnetisch: Ist die Maus näher als 160 px, zieht es die Kugel zu ihr hin (bis zu 35 % des
 *   Abstands, höchstens 28 px, je näher desto stärker); das innere Licht bewegt sich 40 % mehr
 *   mit, die Kugel wächst bis 1,08. Entfernt sich die Maus, federt sie zurück.
 * - Sprechblase: etwa 6 s nach dem Laden (oder beim Drüberfahren) wächst sie federnd aus dem
 *   Knopf. Ihr Text besteht zuerst aus Zufallszeichen und rastet von links nach rechts ein.
 *   Sie lässt sich wegklicken und kommt in dieser Sitzung nicht wieder. Am Handy erscheint sie
 *   einmal für 4 s und verschwindet von selbst.
 *
 * Klick auf Kugel oder Sprechblase öffnet den Chat (derselbe Chat wie überall, components/chat;
 * auf der neuen Seite zeigt ihn das Glasfenster components/neu/chat/ChatFenster.tsx). Ist er
 * offen, ruht der Knopf.
 */
export function ChatKnopf() {
  const wurzel = useRef<HTMLDivElement>(null);
  const kugel = useRef<HTMLButtonElement>(null);
  const [blase, setBlase] = useState(false);
  // Der Zustand des Chats kommt direkt vom Chat selbst.
  const { chat: derChat } = useChatZugang();
  const chatOffen = derChat.open;
  const ungelesen = derChat.unread;
  const offenJetzt = useRef(chatOffen);
  useEffect(() => {
    offenJetzt.current = chatOffen;
  }, [chatOffen]);

  // Sprechblase: 6 s nach „Laden fertig“ oder beim Drüberfahren, einmal je Sitzung.
  useEffect(() => {
    const zu = () => {
      try {
        return !!(sessionStorage.getItem(MERKER) || sessionStorage.getItem(MERKER_CHAT));
      } catch {
        return false;
      }
    };
    if (zu()) return;
    const maus = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const uhren: number[] = [];
    let gezeigt = false;
    const zeigen = () => {
      if (gezeigt || zu()) return;
      // Ist gerade das Menü offen oder der Chat, kann die Sprechblase nicht zu sehen sein: Dann
      // wartet sie und versucht es jede Sekunde wieder. Erst wenn sie wirklich erscheint, zählt
      // sie als gezeigt (Sitzungs-Merker und die 4 Sekunden am Handy beginnen erst dann).
      if (document.documentElement.classList.contains("ag-menue-offen") || offenJetzt.current) {
        uhren.push(window.setTimeout(zeigen, 1000));
        return;
      }
      gezeigt = true;
      setBlase(true);
      if (!maus) {
        // Am Handy: einmal kurz zeigen, dann von selbst verschwinden.
        merken();
        uhren.push(window.setTimeout(() => setBlase(false), 4000));
      }
    };
    const planen = () => uhren.push(window.setTimeout(zeigen, 6000));
    if (document.documentElement.classList.contains(LADEN_FERTIG_KLASSE)) planen();
    else window.addEventListener(LADEN_FERTIG, planen, { once: true });
    const knopf = kugel.current;
    const drauf = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse") zeigen();
    };
    knopf?.addEventListener("pointerenter", drauf);
    return () => {
      uhren.forEach((u) => window.clearTimeout(u));
      window.removeEventListener(LADEN_FERTIG, planen);
      knopf?.removeEventListener("pointerenter", drauf);
    };
  }, []);

  // Der Text der Sprechblase rastet aus Zufallszeichen ein.
  useEffect(() => {
    if (!blase) return;
    const huelle = wurzel.current?.querySelector<HTMLElement>(".ag-chat__blase .ag-wuerfel");
    if (!huelle) return;
    return enthuelleText(huelle);
  }, [blase]);

  // Magnet für die Kugel, Glimmrand für Kugel und Sprechblase.
  useEffect(() => {
    if (!kugel.current) return;
    return richteMagnetEin(kugel.current, { bereich: 160, anteil: 0.35, hoechstens: 28, wachsen: 0.08 });
  }, []);
  useEffect(() => {
    if (!wurzel.current) return;
    return richteGlimmrandEin(wurzel.current);
  }, [blase]);

  const oeffnen = () => {
    setBlase(false);
    merken();
    derChat.openChat();
  };
  const schliessen = () => {
    setBlase(false);
    merken();
  };

  return (
    <div ref={wurzel} className="ag-chat" data-offen={chatOffen}>
      {blase && !chatOffen && (
        <div className="ag-chat__blase ag-glas ag-glimm" data-glimm>
          <button type="button" className="ag-chat__text" onClick={oeffnen}>
            <span className="ag-wuerfel">
              <span className="ag-wuerfel__echt">{chat.blase}</span>
            </span>
          </button>
          <button type="button" className="ag-chat__zu" aria-label={chat.blaseSchliessen} onClick={schliessen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
      <button ref={kugel} type="button" className="ag-chat__kugel ag-glas ag-glimm" data-glimm aria-label={chat.oeffnen} onClick={oeffnen}>
        <span className="ag-chat__licht" aria-hidden="true" />
        {ungelesen && <span className="ag-chat__neu" aria-hidden="true" />}
      </button>
    </div>
  );
}

function merken() {
  try {
    sessionStorage.setItem(MERKER, "1");
  } catch {
    /* Speicher gesperrt: Dann kommt die Sprechblase beim nächsten Seitenaufruf eben noch einmal. */
  }
}
