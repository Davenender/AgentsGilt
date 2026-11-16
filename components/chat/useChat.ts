"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  INTRO_TYPING_DONE,
  INTRO_TYPING_STARTED,
  PREFILL_CONTACT,
  PREFILL_SPEICHER,
  type PrefillContactDetail,
} from "@/lib/events";
import {
  GREETING,
  aiHistory,
  angebote,
  parseDaten,
  stripMarkers,
  type Message,
  type Ticket,
} from "@/lib/chat-text";
import { ladeVerlauf, merkeTicket, merkeVerlassen, merkeVerlauf, vergissVerlauf } from "@/lib/chat-speicher";

// Die ganze Logik des Website-Chats, aus components/ChatWidget.tsx herausgezogen (14.11.2026;
// seitdem einzige Änderung: Antworten merken sich, was der Assistent unter ihnen anbietet, dazu
// der neue Marker [ANRUFEN]), damit zwei Hüllen sie teilen können: das bisherige Fenster der alten Startseite
// (components/ChatWidget.tsx) und das Glasfenster der neuen Seite (components/neu/chat). Es läuft
// immer nur EINE Instanz (components/chat/ChatAnbieter.tsx im Stammlayout): ein Verlauf, ein
// Abruf der Team-Antworten, eine Meldung beim Verlassen der Seite.
//
// Was hier steht, bestimmt, was der Chat tut: Antworten über /api/chat (Streaming), Übergabe an
// das Team über das Support-Ticket (/api/support; Antworten aus Discord erscheinen im Chat),
// Übernahme ins Kontaktformular, Verlauf im Browser (lib/chat-speicher.ts), Gesprächsprotokoll beim Verlassen.
// Die Hüllen zeigen nur an.

const STORAGE_DISMISSED = "ag-assistant-dismissed";
// Verlauf, Ticket und „Besucher war weg“ bleiben seit 16.11.2026 (Davids Entscheidung) 24 Stunden nach
// der letzten Nachricht im localStorage, auch über das Schließen des Tabs hinaus (lib/chat-speicher.ts).
// Hat das Team das Ticket inzwischen geschlossen, beginnt der Chat beim nächsten Besuch leer.
// Blase und Formular-Vorschlag bleiben nur in diesem Tab (sessionStorage).
const STORAGE_PREFILL = PREFILL_SPEICHER;

const lokal = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};
// Wartezeit auf Seiten OHNE Startseiten-Aufbau (Impressum, Datenschutz)
const BUBBLE_DELAY_MS = 10_000;
// Wartezeit, nachdem die Schreibmaschinen-Animation FERTIG getippt hat. Kurz
// genug, dass der Besucher die Sektion noch vor Augen hat; lang genug, dass die
// Blase nicht auf dem letzten Buchstaben sitzt und zwei Bewegungen um dieselbe
// Aufmerksamkeit konkurrieren.
const BUBBLE_AFTER_TYPING_MS = 2_000;
// Sicherheitsnetz, gerechnet ab dem Moment, in dem die Sektion ins Bild kommt.
// Greift, falls die Animation sich nie fertig meldet (GSAP bricht ab, Tab läuft
// im Hintergrund und hält die Zeitleiste an). Muss deutlich über der
// Tippdauer liegen – die beträgt bei den jetzigen Texten rund 8,5 Sekunden.
const BUBBLE_FALLBACK_MS = 14_000;

export function useChat() {
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [prefill, setPrefill] = useState<PrefillContactDetail | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [hName, setHName] = useState("");
  const [hKontakt, setHKontakt] = useState("");
  const [hFrage, setHFrage] = useState("");
  const [hHoney, setHHoney] = useState("");
  const [hBusy, setHBusy] = useState(false);
  const [hError, setHError] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);

  // Der pagehide-Handler wird einmal registriert und sieht deshalb nur den
  // Anfangszustand. Über diese Referenz kommt er an die aktuellen Daten.
  const openRef = useRef(false);
  const router = useRouter();
  const ticketRef = useRef<Ticket | null>(null);
  // Der beim Laden gelesene Verlauf: Ihn erneut zu speichern hieße, die 24 Stunden ohne neue Nachricht zu verlängern.
  const geladenRef = useRef<Message[] | null>(null);
  const stateRef = useRef<{
    messages: Message[];
    contacted: boolean;
    sent: boolean;
  }>({ messages: [], contacted: false, sent: false });

  // Verlauf erst nach dem ersten Rendern laden. Server und Client müssen beim
  // ersten Durchgang dasselbe ausgeben, sonst meckert React über abweichendes
  // HTML — den Browser-Speicher gibt es auf dem Server aber nicht.
  useEffect(() => {
    const s = lokal();
    const gemerkt = s ? ladeVerlauf(s, Date.now()) : { messages: null, ticket: null, verlassen: false };
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFILL);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- der Browser-Speicher steht erst im Browser bereit, siehe oben
      if (raw) setPrefill(JSON.parse(raw) as PrefillContactDetail);
    } catch {
      /* kaputter Eintrag – dann eben ohne */
    }
    const zeige = (m: Message[] | null) => {
      geladenRef.current = m;
      setMessages(m ?? [GREETING]);
    };
    const t = gemerkt.ticket;
    if (!t || t.closed) {
      // Kein laufender Support-Chat (oder er endete, während der Besucher noch da war): einfach weiter.
      zeige(gemerkt.messages);
      if (t) setTicket(t);
      return;
    }
    // Ein Support-Chat lief noch: erst fragen, ob das Team ihn inzwischen geschlossen hat.
    // Dann beginnt der Chat leer (Davids Entscheidung), sonst geht es mit demselben Verlauf weiter.
    let aus = false;
    void (async () => {
      let geschlossen = false;
      try {
        const res = await fetch(`/api/support?t=${encodeURIComponent(t.token)}&after=${encodeURIComponent(t.after)}`, { cache: "no-store" });
        if (res.ok) geschlossen = ((await res.json()) as { closed?: boolean }).closed === true;
      } catch {
        /* nicht erreichbar: lieber mit dem alten Stand weiter */
      }
      if (aus) return;
      if (geschlossen) {
        if (s) vergissVerlauf(s);
        zeige(null);
        return;
      }
      zeige(gemerkt.messages);
      setTicket(t);
      // Der Besucher war weg (Tab zu, neu geladen, Seite gewechselt): dem Team sagen, dass er wieder da ist.
      if (gemerkt.verlassen) {
        if (s) merkeVerlassen(s, false);
        void fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "presence", state: "back", token: t.token }),
        }).catch(() => {});
      }
    })();
    return () => {
      aus = true;
    };
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Ticket merken, damit der Support-Chat einen Seitenwechsel und das Schließen des Tabs übersteht.
  useEffect(() => {
    ticketRef.current = ticket;
    const s = lokal();
    if (ticket && s) merkeTicket(s, ticket);
  }, [ticket]);

  // Antworten des Teams abholen, solange ein Support-Chat läuft. Offen alle
  // paar Sekunden, im geschlossenen Fenster seltener.
  useEffect(() => {
    if (!ticket || ticket.closed) return;
    let stop = false;
    let timer: number | undefined;

    const tick = async () => {
      const t = ticketRef.current;
      if (!t || t.closed) return;
      try {
        const res = await fetch(
          `/api/support?t=${encodeURIComponent(t.token)}&after=${encodeURIComponent(t.after)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            messages?: { text: string; von: string; anrufen?: boolean }[];
            last?: string;
            closed?: boolean;
          };
          // Hat das Team einen Anruf angeboten („Anruf anbieten“ in Discord), steht unter der
          // Nachricht dieselbe Anruf-Karte wie beim Assistenten.
          const neu: Message[] = (data.messages ?? []).map((x) => ({
            role: "team",
            content: x.text,
            von: x.von,
            ...(x.anrufen ? { anrufen: true } : {}),
          }));
          if (data.closed) {
            neu.push({
              role: "assistant",
              noAi: true,
              content:
                "Der Chat mit dem Team wurde beendet. Bei weiteren Fragen helfe ich dir wieder gern, oder du verbindest dich erneut mit einem Mitarbeiter.",
            });
          }
          if (neu.length > 0) {
            setMessages((m) => [...m, ...neu]);
            if (!openRef.current) setUnread(true);
          }
          setTicket((cur) =>
            cur ? { ...cur, after: data.last ?? cur.after, closed: data.closed || cur.closed } : cur,
          );
        }
      } catch {
        /* beim nächsten Durchgang nochmal */
      }
      if (!stop) timer = window.setTimeout(tick, openRef.current ? 4000 : 15000);
    };

    timer = window.setTimeout(tick, 2500);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
    // Bewusst nur Token und Ende: Den aktuellen Stand (after) liest tick() über ticketRef, sonst würde jeder Abruf neu starten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.token, ticket?.closed]);

  // Gespräch an uns schicken, wenn der Besucher die Seite verlässt. sendBeacon
  // läuft auch dann noch durch, wenn der Tab schon zugeht — ein normales fetch
  // würde abgebrochen. "pagehide" ist zuverlässiger als "beforeunload",
  // besonders auf dem iPhone.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const send = () => {
      const t = ticketRef.current;
      if (t && !t.closed) {
        // Support-Chat läuft: dem Team melden, dass der Besucher weg ist.
        try {
          const s = lokal();
          if (s) merkeVerlassen(s, true);
          navigator.sendBeacon?.(
            "/api/support",
            new Blob([JSON.stringify({ action: "presence", state: "left", token: t.token })], {
              type: "application/json",
            }),
          );
        } catch {
          /* nicht schlimm */
        }
      }
      const state = stateRef.current;
      if (state.sent) return;
      if (ticketRef.current) return; // Support-Chats gehen bereits an das Team
      if (state.messages.filter((m) => m.role === "user").length < 2) return;
      state.sent = true;
      try {
        navigator.sendBeacon?.(
          "/api/chat-log",
          new Blob(
            [
              JSON.stringify({
                messages: state.messages.filter((m) => m.role !== "team"),
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

  // Verlauf sichern. Die Begrüßung allein ist nichts wert, die entsteht neu. Der gerade geladene
  // Verlauf wird nicht neu gespeichert, sonst liefen die 24 Stunden bei jedem Seitenaufruf neu an.
  useEffect(() => {
    stateRef.current.messages = messages;
    if (messages.length <= 1 || messages === geladenRef.current) return;
    const s = lokal();
    if (s) merkeVerlauf(s, messages, Date.now());
  }, [messages]);

  // Aufmerksamkeits-Bubble: Sie erscheint kurz nachdem in der Sektion
  // "Was wir machen" die Schreibanimation zu Ende getippt hat – beide
  // Zeitpunkte meldet die Sektion selbst per Ereignis. Vorher wäre die Blase
  // im Hero und würde dem "Projekt anfragen"-Button Aufmerksamkeit wegnehmen,
  // und das ist die Aktion, die zählt. Der Chat-BUTTON selbst ist die ganze
  // Zeit da, nur die Sprechblase wartet.
  //
  // Bewusst an das ECHTE Ende der Animation gehängt statt an eine feste Zahl:
  // Wie lange getippt wird, hängt an der Länge der Texte in `content.ts`.
  //
  // Auf Seiten ohne diesen Aufbau (Impressum, Datenschutz) gibt es die
  // Ereignisse nicht, dort greift der feste Zeitgeber ab Seitenaufruf.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_DISMISSED)) return;

    let timer: number | undefined;

    // Die Startseite erkennt man am Hero – nur dort gibt es die Intro-Sektion.
    if (!document.getElementById("top")) {
      timer = window.setTimeout(() => setBubble(true), BUBBLE_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    // Sektion ist im Bild: erst mal nur das Sicherheitsnetz spannen.
    const onIntroStart = () => {
      timer = window.setTimeout(() => setBubble(true), BUBBLE_FALLBACK_MS);
    };
    // Fertig getippt: Netz wieder einholen und die kurze Wartezeit starten.
    const onIntroDone = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setBubble(true), BUBBLE_AFTER_TYPING_MS);
    };
    window.addEventListener(INTRO_TYPING_STARTED, onIntroStart, { once: true });
    window.addEventListener(INTRO_TYPING_DONE, onIntroDone, { once: true });
    return () => {
      window.removeEventListener(INTRO_TYPING_STARTED, onIntroStart);
      window.removeEventListener(INTRO_TYPING_DONE, onIntroDone);
      window.clearTimeout(timer);
    };
  }, []);

  function openChat() {
    setOpen(true);
    setUnread(false);
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
      // Auf Unterseiten (Impressum usw.) gibt es das Formular nicht: zur Startseite wechseln.
      router.push("/#kontakt");
    }
  }

  function openHandoff() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    setHName((v) => v || prefill?.name || "");
    setHKontakt((v) => v || prefill?.email || "");
    setHFrage((v) => v || prefill?.message || lastUser?.content || "");
    setHError(null);
    setHandoff(true);
    setShowContact(false);
  }

  async function submitHandoff(e: React.FormEvent) {
    e.preventDefault();
    if (hBusy) return;
    setHBusy(true);
    setHError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          name: hName,
          kontakt: hKontakt,
          frage: hFrage,
          website: hHoney,
          verlauf: aiHistory(messages).slice(-8),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        token?: string;
        after?: string;
        nummer?: string;
      };
      if (!res.ok || !data.token || !data.after) {
        throw new Error(data.error || "Das hat leider nicht geklappt.");
      }
      setTicket({ token: data.token, after: data.after, nummer: data.nummer ?? "" });
      setHandoff(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          noAi: true,
          content: `Danke, ${hName.trim()}! Ich habe dein Anliegen an unser Team übergeben. Hier im Chat antwortet dir bald ein Mitarbeiter. Du kannst in der Zwischenzeit gern weiterschreiben.`,
        },
      ]);
    } catch (err) {
      setHError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setHBusy(false);
    }
  }

  async function sendSupport(text: string) {
    const t = ticketRef.current;
    if (!t) return;
    setMessages((m) => [...m, { role: "user", content: text, noAi: true }]);
    setInput("");
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", token: t.token, text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; closed?: boolean };
        if (data.closed) setTicket((cur) => (cur ? { ...cur, closed: true } : cur));
        throw new Error(data.error || "Die Nachricht ist nicht angekommen.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  async function sendMessage(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || streaming) return;
    if (ticket && !ticket.closed) {
      await sendSupport(text);
      return;
    }

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
        body: JSON.stringify({
          messages: aiHistory(next),
        }),
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

      // Was der Assistent unter dieser Antwort anbietet: Anrufen ([ANRUFEN], seit 14.11.2026) und
      // den Mitarbeiter ([MITARBEITER], [KONTAKT], oder der Besucher verlangt einen Menschen).
      // Die Antwort merkt es sich; die Fenster zeigen es unter der Nachricht.
      const angebot = angebote(fullText, text);
      const clean = stripMarkers(fullText).trim();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: clean,
          ...(angebot.anrufen ? { anrufen: true } : {}),
          ...(angebot.mitarbeiter ? { mitarbeiter: true } : {}),
        },
      ]);
      setStreamText("");
      if (angebot.mitarbeiter) setShowContact(true);

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
          // Sofort ans Formular geben, nicht erst beim Klick auf "Anfrage
          // schicken" — viele scrollen selbst dorthin, statt den Knopf zu
          // benutzen. Das Formular überschreibt dabei nichts, was der
          // Besucher schon selbst getippt hat.
          window.dispatchEvent(
            new CustomEvent<PrefillContactDetail>(PREFILL_CONTACT, {
              detail: merged,
            }),
          );
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

  return {
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
    prefill,
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
  };
}

export type ChatZustand = ReturnType<typeof useChat>;
