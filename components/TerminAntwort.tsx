"use client";

import { useState } from "react";
import { GoldMarke } from "@/components/neu/Marke";

// Die beiden Antworten des Kunden auf einen Terminvorschlag. Was gesendet wird und wohin
// (POST /api/termin, accept bzw. wish mit Datum und Uhrzeit) ist unverändert; seit der
// Feinschliff-Runde 1 (16.11.2026) im Design der neuen Startseite (components/neu/termin/termin.css).

function Haken() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

function Kalender() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export default function TerminAntwort({
  code,
  termin,
  fruehestens,
}: {
  code: string;
  termin: string;
  fruehestens: string;
}) {
  const [modus, setModus] = useState<"start" | "wunsch" | "fertig">("start");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("");

  async function senden(payload: Record<string, string>, text: (t: string) => string) {
    setBusy(true);
    setFehler("");
    try {
      const res = await fetch("/api/termin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...payload }),
      });
      const data = (await res.json()) as { error?: string; termin?: string };
      if (!res.ok) {
        setFehler(data.error ?? "Das hat leider nicht geklappt. Bitte rufen Sie uns an.");
        return;
      }
      setErgebnis(text(data.termin ?? ""));
      setModus("fertig");
    } catch {
      setFehler("Keine Verbindung. Bitte versuchen Sie es nochmal oder rufen Sie uns an.");
    } finally {
      setBusy(false);
    }
  }

  const drehen = <i className="ag-ts__dreht" />;

  if (modus === "fertig") {
    return (
      <div className="ag-ts__ergebnis" role="status">
        <span className="ag-ts__zeichen" aria-hidden="true">
          <GoldMarke />
        </span>
        <p>{ergebnis}</p>
      </div>
    );
  }

  return (
    <div>
      {modus === "start" && (
        <div className="ag-ts__knoepfe">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              senden(
                { action: "accept" },
                (t) => `Vielen Dank! Ihr Termin am ${t} ist bestätigt. Wir freuen uns auf das Gespräch.`,
              )
            }
            className="ag-knopf ag-knopf--gold ag-ts__knopf"
          >
            <span>Passt</span>
            <span className="ag-kreis" aria-hidden="true">
              {busy ? drehen : <Haken />}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setModus("wunsch")}
            className="ag-knopf ag-knopf--linie ag-ts__knopf ag-ts__knopf--leise"
          >
            <span>Anderer Termin</span>
            <span className="ag-kreis" aria-hidden="true">
              <Kalender />
            </span>
          </button>
        </div>
      )}

      {modus === "wunsch" && (
        <form
          className="ag-ts__wunsch"
          onSubmit={(e) => {
            e.preventDefault();
            void senden(
              { action: "wish", datum, uhrzeit },
              (t) => `Vielen Dank! Wir haben Ihren Wunsch (${t}) notiert und melden uns per SMS oder Rückruf.`,
            );
          }}
        >
          <p className="ag-ts__frage">Wann passt es Ihnen?</p>
          <div className="ag-ts__felder">
            <label>
              <span>Datum</span>
              <input type="date" required min={fruehestens} value={datum} onChange={(e) => setDatum(e.target.value)} />
            </label>
            <label>
              <span>Uhrzeit</span>
              <input type="time" required step={300} value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} />
            </label>
          </div>
          <div className="ag-ts__knoepfe">
            <button type="submit" disabled={busy} className="ag-knopf ag-knopf--gold ag-ts__knopf">
              <span>Wunsch senden</span>
              <span className="ag-kreis" aria-hidden="true">
                {busy ? drehen : <Haken />}
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setModus("start")}
              className="ag-knopf ag-knopf--linie ag-ts__knopf ag-ts__knopf--leise"
            >
              Zurück
            </button>
          </div>
        </form>
      )}

      {fehler && (
        <p className="ag-ts__fehler" role="alert">
          {fehler}
        </p>
      )}
      <span className="ag-ts__vorlesen">{termin}</span>
    </div>
  );
}
