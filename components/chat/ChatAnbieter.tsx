"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useChat, type ChatZustand } from "./useChat";

type Zugang = {
  chat: ChatZustand;
  /** Zeigt gerade das Glasfenster der neuen Seite den Chat? Dann zeichnet das alte Fenster nichts. */
  neueHuelle: boolean;
  /** Das Glasfenster meldet sich an; die Rückgabe meldet es wieder ab. */
  meldeNeueHuelle: () => () => void;
};

const Zusammenhang = createContext<Zugang | null>(null);

/**
 * Der eine Chat der Website. Er steht im Stammlayout um alle Seiten herum: So gibt es die Logik
 * (components/chat/useChat.ts) genau einmal, gleich welche Hülle sie zeigt, und der Verlauf
 * bleibt beim Wechsel zwischen den Seiten derselbe.
 */
export function ChatAnbieter({ children }: { children: ReactNode }) {
  const chat = useChat();
  const [angemeldet, setAngemeldet] = useState(0);
  const meldeNeueHuelle = useCallback(() => {
    setAngemeldet((n) => n + 1);
    return () => setAngemeldet((n) => Math.max(0, n - 1));
  }, []);
  return <Zusammenhang.Provider value={{ chat, neueHuelle: angemeldet > 0, meldeNeueHuelle }}>{children}</Zusammenhang.Provider>;
}

export function useChatZugang(): Zugang {
  const zugang = useContext(Zusammenhang);
  if (!zugang) throw new Error("useChatZugang braucht den ChatAnbieter im Stammlayout.");
  return zugang;
}
