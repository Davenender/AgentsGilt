"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const KONTAKT_MARKER = "[KONTAKT]";
const STORAGE_DISMISSED = "ag-assistant-dismissed";
const BUBBLE_DELAY_MS = 10_000;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! 👋 Ich bin der KI-Assistent von Agents Gilt. Bei Fragen zu unseren Leistungen helfe ich dir gern weiter!",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Aufmerksamkeits-Bubble nach kurzer Zeit (nur wenn nicht schon weggeklickt)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_DISMISSED)) return;
    const t = setTimeout(() => setBubble(true), BUBBLE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamText, showContact]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  function openChat() {
    setOpen(true);
    setBubble(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_DISMISSED, "1");
    }
  }

  function dismissBubble(e: React.MouseEvent) {
    e.stopPropagation();
    setBubble(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_DISMISSED, "1");
    }
  }

  function goToContact() {
    setOpen(false);
    if (typeof window === "undefined") return;
    const el = document.getElementById("kontakt");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#kontakt";
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamText("");
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("Keine Antwort vom Server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.text) {
              fullText += data.text;
              setStreamText(fullText.replace(KONTAKT_MARKER, "").trimEnd());
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message) throw parseErr;
          }
        }
      }

      const wantsContact = fullText.includes(KONTAKT_MARKER);
      const clean = fullText.replace(KONTAKT_MARKER, "").trim();
      setMessages((m) => [...m, { role: "assistant", content: clean }]);
      setStreamText("");
      if (wantsContact) setShowContact(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setStreamText("");
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Aufmerksamkeits-Bubble */}
      {!open && bubble && (
        <button
          type="button"
          onClick={openChat}
          className="fixed bottom-24 right-5 z-40 max-w-[260px] rounded-2xl bg-white px-4 py-3 text-left text-sm shadow-2xl ring-1 ring-gold/30 transition hover:scale-[1.02] sm:right-7"
        >
          <span
            role="button"
            onClick={dismissBubble}
            aria-label="Schließen"
            className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </span>
          <span className="font-semibold text-gold-dark">
            Bei Fragen helfe ich dir gerne weiter ✨
          </span>
        </button>
      )}

      {/* Runder Logo-Button */}
      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Chat mit Agents Gilt öffnen"
          className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink shadow-xl ring-2 ring-gold/50 transition hover:scale-110 sm:bottom-7 sm:right-7"
        >
          <span className="absolute inset-0 rounded-full ring-2 ring-gold/40 animate-ping opacity-40" />
          <Image
            src="/logo-mark.png"
            alt=""
            width={32}
            height={32}
            className="relative h-8 w-8"
          />
        </button>
      )}

      {/* Chat-Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-line sm:h-[640px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-3xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-line bg-cream px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-ink">
                  <Image src="/logo-mark.png" alt="" width={24} height={24} className="h-6 w-6" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-cream bg-green-500" />
                </div>
                <div className="leading-tight">
                  <div className="font-display text-base font-bold uppercase tracking-wide text-ink">
                    Agents Gilt
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-soft">
                    KI-Assistent
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Chat schließen"
                className="rounded-full p-1.5 text-ink-soft transition hover:bg-line/50 hover:text-ink"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nachrichten */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-cream/30 px-4 py-5">
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role} content={m.content} />
                ))}
                {streaming && streamText && <Bubble role="assistant" content={streamText} />}
                {streaming && !streamText && (
                  <div className="flex items-end gap-2">
                    <Avatar />
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-line">
                      <Dot delay="0s" />
                      <Dot delay="0.15s" />
                      <Dot delay="0.3s" />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Kontakt-Button, wenn Lia nicht weiterweiß */}
              {showContact && !streaming && (
                <button
                  type="button"
                  onClick={goToContact}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
                >
                  Kontakt aufnehmen
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>

            {/* Eingabe */}
            <div className="border-t border-line bg-white px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Frag mich etwas…"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none rounded-2xl border border-line bg-cream/50 px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none disabled:opacity-60"
                  style={{ maxHeight: "120px" }}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={streaming || !input.trim()}
                  aria-label="Senden"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-7 14-2-5-5-2z" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 text-center text-[10px] text-ink-soft">
                Agents Gilt ist eine KI · für ein konkretes Angebot am besten kurz Kontakt aufnehmen
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : ""}`}>
      {!isUser && <Avatar />}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-sm bg-ink text-white"
            : "rounded-bl-sm bg-white text-ink ring-1 ring-line"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink">
      <Image src="/logo-mark.png" alt="" width={16} height={16} className="h-4 w-4" />
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="chat-dot inline-block h-2 w-2 rounded-full bg-ink-soft"
      style={{ animationDelay: delay }}
    />
  );
}
