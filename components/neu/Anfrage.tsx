"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { services } from "@/lib/content";
import { PREFILL_CONTACT, type PrefillContactDetail } from "@/lib/events";
import { kontakt } from "@/lib/inhalt-neu";
import { antwortAuswerten, NETZ_FEHLER } from "@/lib/kontakt-ablauf";
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

/** Das Anfrage-Formular, klein und eingeklappt („Lieber schreiben?“). */
export function Anfrage() {
  const a = useAnfrage();
  const id = useId();
  const t = kontakt.formular;
  const sonstiges = a.service === SONSTIGES;

  return (
    <div className="ag-anfrage" data-offen={a.offen}>
      <button
        type="button"
        className="ag-anfrage__schalter"
        aria-expanded={a.offen}
        aria-controls={`${id}-klappe`}
        onClick={() => a.setOffen(!a.offen)}
      >
        <span>{t.frage}</span>
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
                <label className="ag-feld">
                  {t.name} *
                  <input name="name" required maxLength={120} autoComplete="name" value={a.name} onChange={(e) => a.setName(e.target.value)} placeholder={t.namePlatz} />
                </label>
                <label className="ag-feld">
                  {t.email} *
                  <input name="email" type="email" required maxLength={160} autoComplete="email" value={a.email} onChange={(e) => a.setEmail(e.target.value)} placeholder={t.emailPlatz} />
                </label>
              </div>

              <label className="ag-feld">
                {t.firma}
                <input name="company" maxLength={160} autoComplete="organization" value={a.company} onChange={(e) => a.setCompany(e.target.value)} placeholder={t.firmaPlatz} />
              </label>

              <label className="ag-feld">
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

              <label className="ag-feld">
                {sonstiges ? t.nachrichtSonstiges : t.nachricht} *
                <textarea
                  name="message"
                  required
                  maxLength={3000}
                  rows={5}
                  value={a.message}
                  onChange={(e) => a.setMessage(e.target.value)}
                  placeholder={sonstiges ? t.nachrichtSonstigesPlatz : t.nachrichtPlatz}
                />
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
