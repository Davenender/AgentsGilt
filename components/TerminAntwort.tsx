"use client";

import { useState } from "react";

// Die beiden Antworten des Kunden auf einen Terminvorschlag.

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

  const knopf =
    "rounded-full px-6 py-3 text-sm font-semibold transition disabled:opacity-60";

  if (modus === "fertig") {
    return (
      <p className="mt-8 rounded-2xl bg-cream-dark p-5 text-ink">{ergebnis}</p>
    );
  }

  return (
    <div className="mt-8">
      {modus === "start" && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              senden(
                { action: "accept" },
                (t) => `Vielen Dank! Ihr Termin am ${t} ist bestätigt. Wir freuen uns auf das Gespräch.`,
              )
            }
            className={`${knopf} bg-gold text-ink hover:bg-gold-light`}
          >
            Passt
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setModus("wunsch")}
            className={`${knopf} border border-line text-ink hover:bg-cream-dark`}
          >
            Anderer Termin
          </button>
        </div>
      )}

      {modus === "wunsch" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void senden(
              { action: "wish", datum, uhrzeit },
              (t) => `Vielen Dank! Wir haben Ihren Wunsch (${t}) notiert und melden uns per SMS.`,
            );
          }}
        >
          <p className="text-sm text-ink-soft">
            Wann passt es Ihnen? Termine gibt es werktags zwischen 9 und 17 Uhr.
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-ink-soft">
              Datum
              <input
                type="date"
                required
                min={fruehestens}
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="mt-1 block rounded-xl border border-line bg-white px-3 py-2 text-ink"
              />
            </label>
            <label className="text-sm text-ink-soft">
              Uhrzeit
              <input
                type="time"
                required
                min="09:00"
                max="17:00"
                step={1800}
                value={uhrzeit}
                onChange={(e) => setUhrzeit(e.target.value)}
                className="mt-1 block rounded-xl border border-line bg-white px-3 py-2 text-ink"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className={`${knopf} bg-gold text-ink hover:bg-gold-light`}
            >
              Wunsch senden
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setModus("start")}
              className={`${knopf} border border-line text-ink hover:bg-cream-dark`}
            >
              Zurück
            </button>
          </div>
        </form>
      )}

      {fehler && <p className="mt-4 text-sm text-red-700">{fehler}</p>}
      <p className="mt-6 text-sm text-ink-soft">
        Lieber telefonisch? Rufen Sie uns an: +49 6108 9694027
      </p>
      <span className="sr-only">{termin}</span>
    </div>
  );
}
