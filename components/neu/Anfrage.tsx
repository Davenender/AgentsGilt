"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { services } from "@/lib/content";
import { PREFILL_CONTACT, type PrefillContactDetail } from "@/lib/events";
import { kontakt } from "@/lib/inhalt-neu";
import { antwortAuswerten, NETZ_FEHLER } from "@/lib/kontakt-ablauf";
import { fehlSatz, istPflichtfeld, meldungGilt, type Pflichtfeld } from "./anfrage-fehlt";
import { Pfeil } from "./Marke";

type Status = "idle" | "sending" | "success" | "error";

const SONSTIGES = "Sonstiges";

/**
 * Zustand und Senden des Anfrage-Formulars.
 *
 * Die Logik ist unverändert aus components/Contact.tsx übernommen: dieselben
 * Felder, derselbe Aufruf von /api/contact, dieselbe Auswertung der Antwort,
 * dieselbe Übernahme aus dem Chat und dieselbe Vorauswahl über die Leistungen.
 * Neu ist nur, dass das Formular eingeklappt ist und sich öffnet, sobald eine
 * Leistung gewählt oder etwas aus dem Chat übernommen wird.
 */
function useAnfrage() {
  const [offen, setOffen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [service, setService] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  // Wurden Felder aus dem Chat übernommen? Dann bitten wir um eine kurze Sichtprüfung.
  const [prefilled, setPrefilled] = useState(false);

  // Klick auf „Anfragen“ an einer Leistung: passende Leistung vorauswählen.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") {
        setService(detail);
        setOffen(true);
      }
    };
    window.addEventListener("ag:select-service", onSelect as EventListener);
    return () => window.removeEventListener("ag:select-service", onSelect as EventListener);
  }, []);

  // Angaben aus dem Chat übernehmen. Nur leere Felder füllen.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const d = (e as CustomEvent<PrefillContactDetail>).detail;
      if (!d) return;
      if (d.name) setName((v) => v || d.name!);
      if (d.email) setEmail((v) => v || d.email!);
      if (d.company) setCompany((v) => v || d.company!);
      if (d.message) setMessage((v) => v || d.message!);
      // Nur übernehmen, wenn der Wert wirklich in der Auswahl existiert.
      if (d.service) {
        const erlaubt = [...services.map((s) => s.title), SONSTIGES];
        if (erlaubt.includes(d.service)) setService((v) => v || d.service!);
      }
      setPrefilled(true);
      setOffen(true);
    };
    window.addEventListener(PREFILL_CONTACT, onPrefill as EventListener);
    return () => window.removeEventListener(PREFILL_CONTACT, onPrefill as EventListener);
  }, []);

  async function absenden(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      company: String(fd.get("company") || ""),
      service: String(fd.get("service") || ""),
      message: String(fd.get("message") || ""),
      website: String(fd.get("website") || ""), // Honeypot
    };

    let res: Response;
    try {
      res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Nur echte Netzwerkfehler: Die Anfrage hat den Server nicht erreicht
      setError(NETZ_FEHLER);
      setStatus("error");
      return;
    }
    // Auch eine Antwort ohne JSON (z. B. eine Fehlerseite) ist kein Verbindungsfehler
    const ergebnis = antwortAuswerten(res.ok, await res.text().catch(() => ""));
    if ("error" in ergebnis) {
      setError(ergebnis.error);
      setStatus("error");
      return;
    }
    setStatus("success");
    form.reset();
    setService("");
    setName("");
    setEmail("");
    setCompany("");
    setMessage("");
    setPrefilled(false);
  }

  return {
    offen, setOffen, status, error, prefilled, absenden,
    service, setService, name, setName, email, setEmail, company, setCompany, message, setMessage,
  };
}

/**
 * Anzeige fehlender Pflichtfelder für die Glaskarte der neuen Seite. Geprüft wird wie bisher vom
 * Browser (`required`, `type="email"`, Höchstlängen): Ist beim Absenden ein Feld ungültig, sendet
 * er nichts und meldet das Feld. Nur die Anzeige ist anders: Statt der Sprechblase des Browsers
 * leuchtet hinter genau diesem Feld ein roter Schein, darunter steht ein kurzer Satz. Sobald das
 * Feld gültig ausgefüllt ist, verschwindet beides wieder.
 */
function useFehlende(an: boolean) {
  // Die Karte um das Formular: Sie bleibt, auch wenn das Formular dem Dank weicht.
  const karte = useRef<HTMLDivElement>(null);
  const [fehlt, setFehlt] = useState<Partial<Record<Pflichtfeld, string>>>({});

  useEffect(() => {
    const el = karte.current;
    if (!an || !el) return;
    const t = kontakt.formular.fehlt;
    let gemeldet: Partial<Record<Pflichtfeld, string>> = {};
    let erstes: HTMLElement | null = null;
    let geplant = false;
    let uhr = 0;
    // Der Browser meldet jedes ungültige Feld einzeln, alle im selben Augenblick.
    const ungueltig = (ev: Event) => {
      const feld = ev.target as HTMLInputElement | HTMLTextAreaElement;
      const name = feld.name;
      if (!istPflichtfeld(name)) return;
      // Die eigene Anzeige ersetzt die Sprechblase des Browsers.
      ev.preventDefault();
      gemeldet[name] = fehlSatz(name, feld.validity.valueMissing, t);
      erstes ??= feld;
      if (geplant) return;
      geplant = true;
      // Erst wenn der Browser alle Felder gemeldet hat (er tut das in einem Zug), wird angezeigt.
      uhr = window.setTimeout(() => {
        setFehlt(gemeldet);
        // Wie der Browser es täte: Das erste fehlende Feld bekommt den Fokus.
        erstes?.focus();
        gemeldet = {};
        erstes = null;
        geplant = false;
      }, 0);
    };
    // „invalid“ steigt nicht auf: beim Absteigen abfangen.
    el.addEventListener("invalid", ungueltig, true);
    return () => {
      window.clearTimeout(uhr);
      el.removeEventListener("invalid", ungueltig, true);
    };
  }, [an]);

  // Sobald ein gemeldetes Feld gültig ist, ist seine Meldung weg. (Über React, im selben Zug wie
  // die Eingabe selbst: Ein eigener Horcher würde das Feld neu zeichnen lassen, bevor React den
  // getippten Buchstaben übernommen hat, und der Buchstabe ginge verloren.)
  const getippt = (ev: FormEvent<HTMLDivElement>) => {
    const feld = ev.target as HTMLInputElement | HTMLTextAreaElement;
    if (!an || !feld.validity?.valid || !(feld.name in fehlt)) return;
    setFehlt((alt) => {
      const rest = { ...alt };
      delete rest[feld.name as Pflichtfeld];
      return rest;
    });
  };

  return { karte, fehlt, getippt };
}

/**
 * Das Anfrage-Formular, klein und eingeklappt („Lieber schreiben?“).
 *
 * `glas` (neue Seite): die Glaskarte. Die eingeklappte Karte nennt die Antwortzeit; hinter dem
 * Feld, das man gerade ausfüllt, liegt ein goldener Schein, hinter ausgefüllten ein ganz leichter
 * Goldschimmer, hinter fehlenden Pflichtfeldern nach dem Absenden ein roter (Stylesheet). Zustand,
 * Felder, Prüfung und Senden sind in beiden Fassungen dieselben.
 */
export function Anfrage({ glas = false }: { glas?: boolean }) {
  const a = useAnfrage();
  const id = useId();
  const t = kontakt.formular;
  const sonstiges = a.service === SONSTIGES;
  const { karte, fehlt: gemeldet, getippt } = useFehlende(glas);
  // Eine Meldung „fehlt“ gilt nur, solange das Feld leer ist: Füllt der Chat es aus, ist sie weg.
  const fehlt: Partial<Record<Pflichtfeld, string>> = {};
  for (const [feld, wert] of [["name", a.name], ["email", a.email], ["message", a.message]] as const) {
    if (meldungGilt(feld, gemeldet[feld], wert, t.fehlt)) fehlt[feld] = gemeldet[feld];
  }
  // Ausgefüllt? Dann bleibt hinter dem Feld ein leichter Goldschimmer.
  const voll = (wert: string) => (glas && wert.trim() ? "" : undefined);
  const meldung = (feld: Pflichtfeld) =>
    glas && (
      <span id={`${id}-${feld}-fehlt`} className="ag-feld__fehlt" aria-live="polite">
        {fehlt[feld] ?? ""}
      </span>
    );
  const zuFeld = (feld: Pflichtfeld) => (glas ? { "aria-invalid": fehlt[feld] ? (true as const) : undefined, "aria-describedby": `${id}-${feld}-fehlt` } : {});

  return (
    <div ref={karte} className={glas ? "ag-anfrage ag-anfrage--glas" : "ag-anfrage"} data-offen={a.offen} onInput={glas ? getippt : undefined}>
      {glas && <span className="ag-anfrage__glas" aria-hidden="true" />}
      <button
        type="button"
        className="ag-anfrage__schalter"
        aria-expanded={a.offen}
        aria-controls={`${id}-klappe`}
        onClick={() => a.setOffen(!a.offen)}
      >
        {glas ? (
          <span className="ag-anfrage__zeilen">
            <span>{t.frage}</span>
            <small>{t.antwortzeit}</small>
          </span>
        ) : (
          <span>{t.frage}</span>
        )}
        <span>{a.offen ? t.schliessen : t.oeffnen}</span>
        <span className="ag-kreis">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>

      <div id={`${id}-klappe`} className="ag-anfrage__klappe" inert={!a.offen}>
        <div className="ag-anfrage__innen">
          {a.status === "success" ? (
            <div className="ag-anfrage__danke" role="status">
              <h3 className="ag-versal">{t.dankeTitel}</h3>
              <p className="ag-text">{t.dankeText}</p>
            </div>
          ) : (
            <form onSubmit={a.absenden}>
              {/* Honeypot – für Menschen unsichtbar */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

              <div className="ag-anfrage__zwei">
                <label className="ag-feld" data-voll={voll(a.name)} data-fehlt={fehlt.name ? "" : undefined}>
                  {t.name} *
                  <input name="name" required maxLength={120} autoComplete="name" value={a.name} onChange={(e) => a.setName(e.target.value)} placeholder={t.namePlatz} {...zuFeld("name")} />
                  {meldung("name")}
                </label>
                <label className="ag-feld" data-voll={voll(a.email)} data-fehlt={fehlt.email ? "" : undefined}>
                  {t.email} *
                  <input name="email" type="email" required maxLength={160} autoComplete="email" value={a.email} onChange={(e) => a.setEmail(e.target.value)} placeholder={t.emailPlatz} {...zuFeld("email")} />
                  {meldung("email")}
                </label>
              </div>

              <label className="ag-feld" data-voll={voll(a.company)}>
                {t.firma}
                <input name="company" maxLength={160} autoComplete="organization" value={a.company} onChange={(e) => a.setCompany(e.target.value)} placeholder={t.firmaPlatz} />
              </label>

              <label className="ag-feld" data-voll={voll(a.service)}>
                {t.leistung}
                <select name="service" value={a.service} onChange={(e) => a.setService(e.target.value)}>
                  <option value="">{t.allgemein}</option>
                  {services.map((s) => (
                    <option key={s.title} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                  <option value={SONSTIGES}>{t.sonstiges}</option>
                </select>
              </label>

              <label className="ag-feld" data-voll={voll(a.message)} data-fehlt={fehlt.message ? "" : undefined}>
                {sonstiges ? t.nachrichtSonstiges : t.nachricht} *
                <textarea
                  name="message"
                  required
                  maxLength={3000}
                  rows={5}
                  value={a.message}
                  onChange={(e) => a.setMessage(e.target.value)}
                  placeholder={sonstiges ? t.nachrichtSonstigesPlatz : t.nachrichtPlatz}
                  {...zuFeld("message")}
                />
                {meldung("message")}
              </label>

              {a.prefilled && <p className="ag-anfrage__hinweis">{t.ausChat}</p>}
              {a.status === "error" && (
                <p className="ag-anfrage__fehler" role="alert">
                  {a.error}
                </p>
              )}

              <button type="submit" className="ag-knopf ag-knopf--gold" disabled={a.status === "sending"}>
                {a.status === "sending" ? t.sendet : t.senden}
                <span className="ag-kreis">
                  <Pfeil />
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
