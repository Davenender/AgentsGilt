"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  INTRO_TYPING_STARTED,
  PREFILL_CONTACT,
  type PrefillContactDetail,
} from "@/lib/events";
import { site } from "@/lib/content";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const KONTAKT_MARKER = "[KONTAKT]";
// Der Assistent hängt hier Angaben an, die der Besucher im Gespräch genannt
// hat. Sie werden nie angezeigt, sondern nur ins Kontaktformular übernommen.
const DATEN_REGEX = /\[DATEN\]([\s\S]*?)\[\/DATEN\]/;
const STORAGE_DISMISSED = "ag-assistant-dismissed";
// Der Verlauf überlebt einen Seitenwechsel (Impressum, Datenschutz) und ein
// versehentliches Neuladen. Bewusst sessionStorage: Beim Schließen des Tabs
// soll nichts zurückbleiben.
const STORAGE_MESSAGES = "ag-assistant-messages";
const STORAGE_PREFILL = "ag-assistant-prefill";
const MAX_STORED_MESSAGES = 30;

const GREETING: Message = {
  role: "assistant",
  content:
    "Hey! 👋 Ich bin der KI-Assistent von Agents Gilt. Bei Fragen zu unseren Leistungen helfe ich dir gern weiter!",
};

// Einstiegsfragen. Vor einem leeren Eingabefeld zu sitzen ist die größte
// Hürde — ein Klick ist leichter als ein erster Satz.
//
// Bewusst nur Fragen, die der Assistent aus seinem Wissen wirklich beantworten
// kann und bei denen sich eine Rückfrage anbietet. Nach dem Preis wird hier
// nicht gefragt: Darauf darf er keine Zahl nennen, das wäre eine Sackgasse
// direkt zu Beginn.
const STARTER_QUESTIONS = [
  "Was macht ihr genau?",
  "Wie läuft die Zusammenarbeit ab?",
  "Was braucht ihr von mir?",
];

/**
 * Entfernt die Steuer-Marker aus dem Antworttext. Läuft auch währenddessen
 * beim Streamen, wo ein Marker erst halb angekommen sein kann ("[DAT",
 * "[DATEN]{\"na") — der Besucher soll davon nie ein Zeichen sehen.
 */
function stripMarkers(text: string): string {
  let out = text.replace(DATEN_REGEX, "").replace(KONTAKT_MARKER, "");

  // Angefangener Daten-Block: alles ab dort abschneiden.
  const datenStart = out.indexOf("[DATEN]");
  if (datenStart !== -1) out = out.slice(0, datenStart);

  // Angefangene eckige Klammer am Ende (z.B. "[KONT") – die gehört zu einem
  // Marker, der gleich vollständig wird.
  const lastOpen = out.lastIndexOf("[");
  if (lastOpen !== -1 && !out.slice(lastOpen).includes("]")) {
    out = out.slice(0, lastOpen);
  }

  return out.trimEnd();
}

/**
 * Liest die Angaben aus dem [DATEN]-Marker. Der Inhalt kommt aus einem
 * Sprachmodell, ist also nicht garantiert gültiges JSON — deshalb still
 * scheitern statt den Chat abbrechen.
 */
function parseDaten(text: string): PrefillContactDetail | null {
  const match = text.match(DATEN_REGEX);
  if (!match) return null;
  try {
    const raw: unknown = JSON.parse(match[1].trim());
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;
    const out: PrefillContactDetail = {};
    for (const key of ["name", "email", "company", "message"] as const) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        out[key] = value.trim().slice(0, 500);
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [GREETING];
  try {
    const raw = sessionStorage.getItem(STORAGE_MESSAGES);
    if (!raw) return [GREETING];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [GREETING];
    return parsed.filter(
      (m): m is Message =>
        !!m &&
        typeof m === "object" &&
        ((m as Message).role === "user" || (m as Message).role === "assistant") &&
        typeof (m as Message).content === "string",
    );
  } catch {
    return [GREETING];
  }
}
// Wartezeit auf Seiten OHNE Startseiten-Aufbau (Impressum, Datenschutz)
const BUBBLE_DELAY_MS = 10_000;
// Wartezeit, nachdem die Schreibmaschinen-Animation losgelegt hat. Die läuft
// rund 8 Sekunden – ploppt die Blase mittendrin auf, konkurrieren zwei
// Bewegungen um dieselbe Aufmerksamkeit. Deshalb nicht kürzer machen.
const BUBBLE_AFTER_INTRO_MS = 10_000;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [prefill, setPrefill] = useState<PrefillContactDetail | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Der pagehide-Handler wird einmal registriert und sieht deshalb nur den
  // Anfangszustand. Über diese Referenz kommt er an die aktuellen Daten.
  const stateRef = useRef<{
    messages: Message[];
    contacted: boolean;
    sent: boolean;
  }>({ messages: [], contacted: false, sent: false });

  // Verlauf erst nach dem ersten Rendern laden. Server und Client müssen beim
  // ersten Durchgang dasselbe ausgeben, sonst meckert React über abweichendes
  // HTML — sessionStorage gibt es auf dem Server aber nicht.
  useEffect(() => {
    setMessages(loadMessages());
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFILL);
      if (raw) setPrefill(JSON.parse(raw) as PrefillContactDetail);
    } catch {
      /* kaputter Eintrag – dann eben ohne */
    }
  }, []);

  // Gespräch an uns schicken, wenn der Besucher die Seite verlässt. sendBeacon
  // läuft auch dann noch durch, wenn der Tab schon zugeht — ein normales fetch
  // würde abgebrochen. "pagehide" ist zuverlässiger als "beforeunload",
  // besonders auf dem iPhone.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const send = () => {
      const state = stateRef.current;
      if (state.sent) return;
      if (state.messages.filter((m) => m.role === "user").length < 2) return;
      state.sent = true;
      try {
        navigator.sendBeacon?.(
          "/api/chat-log",
          new Blob(
            [
              JSON.stringify({
                messages: state.messages,
                contacted: state.contacted,
              }),
            ],
            { type: "application/json" },
          ),
        );
      } catch {
        /* wenn es nicht klappt, ist der Chat trotzdem gelaufen */
      }
    };

    window.addEventListener("pagehide", send);
    return () => window.removeEventListener("pagehide", send);
  }, []);

  // Verlauf sichern. Die Begrüßung allein ist nichts wert, die entsteht neu.
  useEffect(() => {
    stateRef.current.messages = messages;
    if (typeof window === "undefined" || messages.length <= 1) return;
    try {
      sessionStorage.setItem(
        STORAGE_MESSAGES,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
      );
    } catch {
      /* Speicher voll oder gesperrt – der Chat läuft trotzdem weiter */
    }
  }, [messages]);

  // Aufmerksamkeits-Bubble: Der Zähler startet erst, wenn in der Sektion
  // "Was wir machen" die Schreibanimation losgeht (die meldet sich per
  // Ereignis). Vorher wäre sie im Hero und würde dem "Projekt anfragen"-Button
  // Aufmerksamkeit wegnehmen – und das ist die Aktion, die zählt. Der
  // Chat-BUTTON selbst ist die ganze Zeit da, nur die Sprechblase wartet.
  //
  // Auf Seiten ohne diesen Aufbau (Impressum, Datenschutz) gibt es das
  // Ereignis nicht, dort greift der feste Zeitgeber ab Seitenaufruf.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_DISMISSED)) return;

    let timer: number | undefined;

    // Die Startseite erkennt man am Hero – nur dort gibt es die Intro-Sektion.
    if (!document.getElementById("top")) {
      timer = window.setTimeout(() => setBubble(true), BUBBLE_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    const onIntroStart = () => {
      timer = window.setTimeout(() => setBubble(true), BUBBLE_AFTER_INTRO_MS);
    };
    window.addEventListener(INTRO_TYPING_STARTED, onIntroStart, { once: true });
    return () => {
      window.removeEventListener(INTRO_TYPING_STARTED, onIntroStart);
      window.clearTimeout(timer);
    };
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
    stateRef.current.contacted = true;
    if (typeof window === "undefined") return;

    // Was der Besucher im Chat schon genannt hat, muss er im Formular nicht
    // noch einmal tippen. Das Formular kennzeichnet die Felder als "bitte
    // prüfen" — im Chat vertippt man sich schnell.
    if (prefill && Object.keys(prefill).length > 0) {
      window.dispatchEvent(
        new CustomEvent<PrefillContactDetail>(PREFILL_CONTACT, {
          detail: prefill,
        }),
      );
    }

    const el = document.getElementById("kontakt");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#kontakt";
    }
  }

  async function sendMessage(preset?: string) {
    const text = (preset ?? input).trim();
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
              setStreamText(stripMarkers(fullText));
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message) throw parseErr;
          }
        }
      }

      const wantsContact = fullText.includes(KONTAKT_MARKER);
      const clean = stripMarkers(fullText).trim();
      setMessages((m) => [...m, { role: "assistant", content: clean }]);
      setStreamText("");
      if (wantsContact) setShowContact(true);

      const gathered = parseDaten(fullText);
      if (gathered) {
        // Zusammenführen statt ersetzen: Nennt jemand erst den Namen und
        // später die E-Mail, sollen am Ende beide im Formular stehen.
        setPrefill((prev) => {
          const merged = { ...(prev ?? {}), ...gathered };
          try {
            sessionStorage.setItem(STORAGE_PREFILL, JSON.stringify(merged));
          } catch {
            /* nicht schlimm – dann eben nur für diese Seite */
          }
          return merged;
        });
      }
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
                  <Image src="/logo-mark.png" alt="" width={34} height={34} className="h-[34px] w-[34px]" />
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

              {/* Einstiegsfragen — nur solange der Besucher noch nichts
                  gefragt hat. Danach wären sie nur im Weg. */}
              {messages.length === 1 && !streaming && (
                <div className="mt-3 flex flex-col items-end gap-1.5">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="rounded-2xl border border-line/50 bg-white/70 px-3 py-1.5 text-right text-xs text-ink-soft/80 transition-colors hover:border-gold/60 hover:text-ink"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Zwei Wege zum Kontakt, sobald der Assistent nicht weiterhilft:
                  anrufen (schnellste Antwort) oder Anfrage schicken. */}
              {showContact && !streaming && (
                <div className="mt-4 space-y-2">
                  <a
                    href={`tel:${site.phone}`}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.5 5.5c0-1.1.9-2 2-2h2.2c.9 0 1.7.6 1.9 1.5l.7 2.6c.2.7 0 1.5-.6 2l-1.3 1.1a13 13 0 0 0 5.9 5.9l1.1-1.3c.5-.6 1.3-.8 2-.6l2.6.7c.9.2 1.5 1 1.5 1.9v2.2c0 1.1-.9 2-2 2A17.5 17.5 0 0 1 2.5 5.5Z"
                      />
                    </svg>
                    Jetzt anrufen
                  </a>
                  <button
                    type="button"
                    onClick={goToContact}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-gold hover:text-ink"
                  >
                    Anfrage schicken
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                  <p className="pt-0.5 text-center text-[10px] leading-relaxed text-ink-soft">
                    Am Telefon nimmt unser KI-Assistent ab und macht direkt einen
                    Termin aus.
                  </p>
                </div>
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
                  onClick={() => sendMessage()}
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
