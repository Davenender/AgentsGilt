"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { Reveal } from "@/components/Reveal";
import { intro } from "@/lib/content";

/**
 * "Was wir machen" – die Überschrift schreibt sich selbst und korrigiert sich
 * dabei einmal: erst "Wir bauen in Tagen", dann wird "Tagen" gelöscht und durch
 * "Stunden" ersetzt (das Wort leuchtet danach gold auf). Anschließend erscheint
 * der Untertext, ebenfalls Buchstabe für Buchstabe. Der Cursor bleibt am Ende
 * stehen und blinkt weiter.
 *
 * Kugelsicher wie Reveal.tsx: Der komplette Text steht im HTML und ist der
 * Grundzustand. Nur wenn JavaScript läuft UND der Nutzer keine reduzierte
 * Bewegung eingestellt hat, wird er geleert und neu getippt. Ohne JS oder mit
 * "weniger Bewegung" steht der fertige Satz einfach da – so wie vorher auch.
 */

// ---------------------------------------------------------------------------
// TEMPO – hier kannst du die Animation schneller oder langsamer machen.
// Kleinere Zahl = schneller. Gesamtdauer aktuell ca. 8 Sekunden.
// ---------------------------------------------------------------------------
const START_DELAY = 0.5; // Sekunden warten, nachdem man reingescrollt ist
const CHAR_MS = 48; // pro Buchstabe in der Überschrift
const DELETE_MS = 32; // pro gelöschtem Buchstaben (Löschen darf schneller sein)
const BODY_CHAR_MS = 18; // pro Buchstabe im Untertext (der ist mit 210 Zeichen
// deutlich länger – unter ~17 ms erscheint mehr als ein Buchstabe pro Bild und
// es sieht nicht mehr nach Tippen aus, sondern nach schnellem Aufdecken.)

const WRONG_WORD = "Tagen"; // wird geschrieben und wieder gelöscht
const SWAP_WORD = "Stunden"; // ersetzt es und leuchtet gold auf

// Überschrift in drei Teile zerlegen: vor dem Wechselwort / Wechselwort / danach.
// Falls du die Überschrift in content.ts mal änderst und "Stunden" nicht mehr
// vorkommt, wird sie einfach ohne Korrektur-Effekt getippt.
const swapAt = intro.headline.indexOf(SWAP_WORD);
const hasSwap = swapAt !== -1;
const HEAD_PRE = hasSwap ? intro.headline.slice(0, swapAt) : intro.headline;
const HEAD_SWAP = hasSwap ? SWAP_WORD : "";
const HEAD_POST = hasSwap ? intro.headline.slice(swapAt + SWAP_WORD.length) : "";

/**
 * Misst, an welchen Stellen ein Text in seinem Element umbricht, und macht aus
 * diesen Umbrüchen feste Zeilenumbrüche ("\n").
 *
 * Warum: Beim Tippen wächst der Text. Ohne feste Umbrüche wird ein längeres
 * Wort erst am Ende der oberen Zeile geschrieben und springt dann mitten im
 * Tippen in die nächste Zeile – das sieht unruhig aus.
 *
 * Es wird zur Laufzeit gemessen, also passt es sich automatisch an jede
 * Bildschirmbreite an und bleibt richtig, wenn du die Texte in content.ts
 * änderst. Die Textlänge bleibt gleich (ein Leerzeichen wird zu "\n"), damit
 * man die Stellen weiter zuordnen kann.
 *
 * Wirkt nur, wenn das Element "whitespace-pre-line" gesetzt hat.
 */
function withHardLineBreaks(el: HTMLElement, text: string): string {
  el.textContent = text;
  const node = el.firstChild;
  if (!node) return text;

  const range = document.createRange();
  const chars = text.split("");
  let lastTop: number | null = null;

  for (let i = 0; i < text.length; i++) {
    // Leerzeichen am Zeilenende liefern unsaubere Messwerte -> überspringen.
    if (text[i] === " ") continue;
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const { top } = range.getBoundingClientRect();
    // Rutscht das Zeichen nach unten, beginnt hier eine neue Zeile.
    if (lastTop !== null && top - lastTop > 1 && chars[i - 1] === " ") {
      chars[i - 1] = "\n";
    }
    lastTop = top;
  }

  return chars.join("");
}

export function IntroTypewriter() {
  const root = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const preRef = useRef<HTMLSpanElement>(null);
  const swapRef = useRef<HTMLSpanElement>(null);
  const postRef = useRef<HTMLSpanElement>(null);
  const paraRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const caretHeadRef = useRef<HTMLSpanElement>(null);
  const caretBodyRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const heading = headingRef.current;
    const pre = preRef.current;
    const swap = swapRef.current;
    const post = postRef.current;
    const para = paraRef.current;
    const body = bodyRef.current;
    const caretHead = caretHeadRef.current;
    const caretBody = caretBodyRef.current;
    if (!el || !heading || !pre || !swap || !post || !para || !body) return;
    if (!caretHead || !caretBody) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let ctx: gsap.Context | null = null;
      let cancelled = false;

      const setup = () => {
        if (cancelled) return;

        // --- 1. Umbrüche messen ------------------------------------------
        // Für die Messung steht die komplette Überschrift kurz in EINEM Span,
        // damit sie wie im Endzustand umbricht.
        swap.textContent = "";
        post.textContent = "";
        const brokenHeadline = withHardLineBreaks(pre, intro.headline);
        const brokenBody = withHardLineBreaks(body, intro.text);

        // Gleiche Länge wie vorher -> die drei Teile lassen sich sauber
        // wieder auseinanderschneiden.
        const typedPre = brokenHeadline.slice(0, HEAD_PRE.length);
        const typedSwap = brokenHeadline.slice(
          HEAD_PRE.length,
          HEAD_PRE.length + HEAD_SWAP.length,
        );
        const typedPost = brokenHeadline.slice(HEAD_PRE.length + HEAD_SWAP.length);

        // --- 2. Endgültige Höhe festhalten -------------------------------
        // Sonst wächst die Überschrift beim Tippen von einer auf zwei Zeilen
        // und schiebt alles darunter ruckartig nach unten.
        pre.textContent = typedPre;
        swap.textContent = typedSwap;
        post.textContent = typedPost;
        body.textContent = brokenBody;
        heading.style.minHeight = `${heading.offsetHeight}px`;
        para.style.minHeight = `${para.offsetHeight}px`;

        // --- 3. Leeren ----------------------------------------------------
        // Die Sektion liegt unter dem Hero, ist beim Laden also noch nicht
        // sichtbar – sonst würde der fertige Text kurz aufblitzen.
        pre.textContent = "";
        swap.textContent = "";
        post.textContent = "";
        body.textContent = "";

        // --- 4. Animation -------------------------------------------------
        ctx = gsap.context(() => {
          // Zähler-Objekte: GSAP zählt hoch, wir schneiden den Text ab.
          const nPre = { n: 0 };
          const nWrong = { n: 0 };
          const nSwap = { n: 0 };
          const nPost = { n: 0 };
          const nBody = { n: 0 };

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: el, start: "top 80%", once: true },
          });

          // Der Cursor taucht erst zusammen mit dem ersten Buchstaben auf –
          // vorher stünde er nur untätig herum.
          tl.call(
            () => caretHead.classList.add("type-caret"),
            undefined,
            START_DELAY,
          )
            // 1. "Wir bauen in "
            .to(nPre, {
              n: typedPre.length,
              duration: (typedPre.length * CHAR_MS) / 1000,
              onUpdate: () => {
                pre.textContent = typedPre.slice(0, Math.round(nPre.n));
              },
            });

          if (hasSwap) {
            // 2. das "falsche" Wort: "Tagen"
            tl.to(nWrong, {
              n: WRONG_WORD.length,
              duration: (WRONG_WORD.length * CHAR_MS) / 1000,
              onUpdate: () => {
                swap.textContent = WRONG_WORD.slice(0, Math.round(nWrong.n));
              },
            })
              // 3. kurz stehen lassen (damit man es liest), dann löschen
              .to(
                nWrong,
                {
                  n: 0,
                  duration: (WRONG_WORD.length * DELETE_MS) / 1000,
                  onUpdate: () => {
                    swap.textContent = WRONG_WORD.slice(0, Math.round(nWrong.n));
                  },
                },
                "+=0.45",
              )
              // 4. "Stunden" hinschreiben
              .to(
                nSwap,
                {
                  n: typedSwap.length,
                  duration: (typedSwap.length * CHAR_MS) / 1000,
                  onUpdate: () => {
                    swap.textContent = typedSwap.slice(0, Math.round(nSwap.n));
                  },
                },
                "+=0.14",
              );
          }

          // 5. Rest der Überschrift
          tl.to(nPost, {
            n: typedPost.length,
            duration: (typedPost.length * CHAR_MS) / 1000,
            onUpdate: () => {
              post.textContent = typedPost.slice(0, Math.round(nPost.n));
            },
          });

          // 6. "Stunden" leuchtet gold auf
          if (hasSwap) {
            tl.to(swap, { color: "#b8842b", duration: 0.45, ease: "power2.out" });
          }

          // 7. Cursor wandert runter zum Untertext
          tl.call(() => {
            caretHead.classList.remove("type-caret");
            caretBody.classList.add("type-caret");
          })
            // 8. Untertext, ebenfalls Buchstabe für Buchstabe
            .to(
              nBody,
              {
                n: brokenBody.length,
                duration: (brokenBody.length * BODY_CHAR_MS) / 1000,
                onUpdate: () => {
                  body.textContent = brokenBody.slice(0, Math.round(nBody.n));
                },
              },
              "+=0.2",
            )
            // 9. Fertig. Der Cursor bleibt am Textende stehen und blinkt
            //    weiter – als hätte man den Text gerade geschrieben und stehen
            //    lassen. Nur die reservierte Höhe geben wir wieder frei, damit
            //    sich die Sektion beim Drehen des Handys normal anpasst.
            .call(() => {
              heading.style.minHeight = "";
              para.style.minHeight = "";
            });
        }, el);
      };

      // Erst messen, wenn die Schriften geladen sind – sonst würde mit den
      // Maßen der Ersatzschrift gerechnet und die Umbrüche säßen falsch.
      if (!document.fonts || document.fonts.status === "loaded") {
        setup();
      } else {
        document.fonts.ready.then(setup);
      }

      // Aufräumen: GSAP setzt eigene Styles zurück, den Textinhalt aber nicht –
      // den stellen wir selbst wieder her, damit nie ein halber Satz stehen bleibt.
      return () => {
        cancelled = true;
        ctx?.revert();
        pre.textContent = HEAD_PRE;
        swap.textContent = HEAD_SWAP;
        post.textContent = HEAD_POST;
        body.textContent = intro.text;
        caretHead.classList.remove("type-caret");
        caretBody.classList.remove("type-caret");
        heading.style.minHeight = "";
        para.style.minHeight = "";
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="relative z-10 mx-auto max-w-4xl px-6 text-center">
      <Reveal>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">
          {intro.kicker}
        </span>
      </Reveal>

      {/* aria-label sorgt dafür, dass Screenreader immer den fertigen Satz
          vorlesen – auch wenn gerade noch getippt wird. */}
      <h2
        ref={headingRef}
        aria-label={intro.headline}
        className="mt-5 whitespace-pre-line font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl"
      >
        <span ref={preRef}>{HEAD_PRE}</span>
        <span ref={swapRef}>{HEAD_SWAP}</span>
        <span ref={postRef}>{HEAD_POST}</span>
        <span ref={caretHeadRef} aria-hidden="true" className="type-caret-base" />
      </h2>

      <p
        ref={paraRef}
        className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-ink-soft sm:text-lg"
      >
        <span ref={bodyRef}>{intro.text}</span>
        <span ref={caretBodyRef} aria-hidden="true" className="type-caret-base" />
      </p>
    </div>
  );
}
