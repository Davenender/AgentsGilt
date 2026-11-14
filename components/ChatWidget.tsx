"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { STARTER_QUESTIONS } from "@/lib/chat-text";
import { site } from "@/lib/content";
import { useChatZugang } from "./chat/ChatAnbieter";

/**
 * Das bisherige Chat-Fenster (alte Startseite, Impressum, Datenschutz, Terminseiten).
 *
 * Seit dem 14.11.2026 ist es nur noch die Hülle: Die Logik steht unverändert in
 * components/chat/useChat.ts und läuft einmal im Stammlayout (components/chat/ChatAnbieter.tsx).
 * Auf der neuen Seite zeigt stattdessen das Glasfenster (components/neu/chat/ChatFenster.tsx)
 * denselben Chat; dann zeichnet dieses Fenster nichts.
 */
export function ChatWidget() {
  const { chat, neueHuelle } = useChatZugang();
  const {
    open,
    setOpen,
    bubble,
    messages,
    input,
    setInput,
    streaming,
    streamText,
    error,
    showContact,
    ticket,
    handoff,
    setHandoff,
    hName,
    setHName,
    hKontakt,
    setHKontakt,
    hFrage,
    setHFrage,
    hHoney,
    setHHoney,
    hBusy,
    hError,
    unread,
    openChat,
    dismissBubble,
    goToContact,
    openHandoff,
    submitHandoff,
    sendMessage,
    handleKey,
  } = chat;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Die neue Seite zeigt den Chat in ihrem eigenen Fenster.
  if (neueHuelle) return null;

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
          {unread && (
            <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
          )}
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
                    {ticket && !ticket.closed ? "Support-Chat mit dem Team" : "KI-Assistent"}
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
                  <Bubble key={i} role={m.role} content={m.content} von={m.von} />
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
              {showContact && !streaming && (!ticket || ticket.closed) && (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={openHandoff}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
                  >
                    Mit einem Mitarbeiter chatten
                  </button>
                  <a
                    href={`tel:${site.phone}`}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-gold hover:text-ink"
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

              {/* Übergabe an einen Mitarbeiter */}
              {handoff && (!ticket || ticket.closed) && (
                <form
                  onSubmit={submitHandoff}
                  className="mt-4 space-y-2.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line"
                >
                  <p className="text-sm font-semibold text-ink">Mit einem Mitarbeiter sprechen</p>
                  <p className="text-xs leading-relaxed text-ink-soft">
                    Wir übergeben dein Anliegen an unser Team. Es antwortet dir bald hier im Chat.
                    Falls du die Seite verlässt, melden wir uns über den Kontakt, den du angibst.
                  </p>
                  <input
                    value={hName}
                    onChange={(e) => setHName(e.target.value)}
                    placeholder="Dein Name"
                    required
                    maxLength={80}
                    className="w-full rounded-xl border border-line bg-cream/50 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                  <input
                    value={hKontakt}
                    onChange={(e) => setHKontakt(e.target.value)}
                    placeholder="E-Mail oder Telefonnummer"
                    required
                    maxLength={120}
                    className="w-full rounded-xl border border-line bg-cream/50 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                  <textarea
                    value={hFrage}
                    onChange={(e) => setHFrage(e.target.value)}
                    placeholder="Worum geht es?"
                    required
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-none rounded-xl border border-line bg-cream/50 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                  {/* Köder für einfache Bots: Menschen sehen das Feld nicht. */}
                  <input
                    value={hHoney}
                    onChange={(e) => setHHoney(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                    name="website"
                  />
                  <p className="text-[10px] leading-relaxed text-ink-soft">
                    Mit dem Absenden wird dein Anliegen samt Chatverlauf an unser Team übergeben
                    (siehe{" "}
                    <a href="/datenschutz" className="underline">
                      Datenschutz
                    </a>
                    ).
                  </p>
                  {hError && <p className="text-xs text-red-700">{hError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={hBusy}
                      className="flex-1 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-ink transition hover:scale-[1.02] disabled:opacity-60"
                    >
                      {hBusy ? "Wird übergeben …" : "Verbinden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHandoff(false)}
                      className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:border-gold"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
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
                  placeholder={ticket && !ticket.closed ? "Schreib dem Team …" : "Frag mich etwas…"}
                  rows={1}
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
                {ticket && !ticket.closed ? (
                  <>Du schreibst mit unserem Team · Antworten erscheinen hier im Chat</>
                ) : (
                  <>
                    Agents Gilt ist eine KI ·{" "}
                    <button type="button" onClick={openHandoff} className="underline hover:text-ink">
                      mit einem Mitarbeiter sprechen
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  content,
  von,
}: {
  role: "user" | "assistant" | "team";
  content: string;
  von?: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : ""}`}>
      {!isUser && <Avatar />}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-sm bg-ink text-white"
            : role === "team"
              ? "rounded-bl-sm bg-gold/15 text-ink ring-1 ring-gold/40"
              : "rounded-bl-sm bg-white text-ink ring-1 ring-line"
        }`}
      >
        {role === "team" && von && (
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-dark">
            {von}
          </div>
        )}
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
