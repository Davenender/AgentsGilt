"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useChat, type ChatZustand } from "./useChat";

type Zugang = {
  chat: ChatZustand;
};

const Zusammenhang = createContext<Zugang | null>(null);

/**
 * Der eine Chat der Website. Er steht im Stammlayout um alle Seiten herum: So gibt es die Logik
 * (components/chat/useChat.ts) genau einmal, und der Verlauf bleibt beim Wechsel zwischen den
 * Seiten derselbe. Gezeigt wird er seit dem 15.11.2026 überall im Glasfenster der neuen Welt
 * (components/neu/chat/ChatUeberall.tsx); das alte Chat-Fenster gibt es nicht mehr.
 */
export function ChatAnbieter({ children }: { children: ReactNode }) {
  const chat = useChat();
  return <Zusammenhang.Provider value={{ chat }}>{children}</Zusammenhang.Provider>;
}

export function useChatZugang(): Zugang {
  const zugang = useContext(Zusammenhang);
  if (!zugang) throw new Error("useChatZugang braucht den ChatAnbieter im Stammlayout.");
  return zugang;
}
