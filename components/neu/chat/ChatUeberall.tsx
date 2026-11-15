"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { NEUE_SEITE } from "@/lib/neue-seite";
import { ChatKnopf } from "../ChatKnopf";
import { ChatFenster } from "./ChatFenster";

/**
 * Der Chat auf jeder Seite: die Kugel unten rechts und das Glasfenster (seit dem 15.11.2026 auch
 * auf der Terminseite und „nicht gefunden“, wo vorher das alte Chat-Fenster stand). Er steht einmal
 * im Stammlayout (app/layout.tsx): So bleibt er beim Wechsel zwischen den Seiten derselbe.
 *
 * Auf der Startseite gehört die Kugel zur Startanimation: Sie beginnt im Stand „warten“ und
 * erscheint erst, wenn die Zeichen landen (kopf.css; danach setzt kopf/LichtName.tsx den Stand).
 * Dafür zählt nur die Adresse beim ersten Laden: Öffnet die Startseite Impressum oder Datenschutz
 * als Blatt, ändert sich die Adresse, die Seite aber nicht; die Kugel darf dann nicht wieder in
 * „warten“ fallen. Kommt man später auf die Startseite, setzt LichtName.tsx den Stand selbst.
 */
export function ChatUeberall() {
  const pfad = usePathname();
  const [startseite] = useState(() => pfad === NEUE_SEITE);
  return (
    <>
      <ChatKnopf start={startseite ? "warten" : undefined} />
      <ChatFenster />
    </>
  );
}
