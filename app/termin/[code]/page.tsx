import type { Metadata } from "next";
import Link from "next/link";
import TerminAntwort from "@/components/TerminAntwort";
import { GoldMarke, GoldVerlauf } from "@/components/neu/Marke";
import { Entschluesselt } from "@/components/neu/seite/Entschluesselt";
import { Leuchtstern } from "@/components/neu/seite/Leuchtstern";
import { TerminKarte } from "@/components/neu/termin/TerminKarte";
import { Welt } from "@/components/neu/Welt";
import { kundenName } from "@/lib/discord-calls";
import { site } from "@/lib/content";
import { berlinNow } from "@/lib/termin";
import { ladeVorschlag } from "@/lib/termin-kunde";
import "@/components/neu/seite/seite.css";
import "@/components/neu/termin/termin.css";

export const metadata: Metadata = {
  title: "Ihr Terminvorschlag – Agents Gilt",
  robots: { index: false, follow: false },
};

// Jeder Aufruf liest den aktuellen Stand aus Discord.
// Aussehen seit der Feinschliff-Runde 1 (16.11.2026, Davids Wahl 5 A): die neue Welt der Startseite,
// eine Glaskarte ruhig in der Mitte, dahinter der kleine Stern (components/neu/termin/termin.css).
// Texte, Zustände und was gesendet wird sind unverändert.
export const dynamic = "force-dynamic";

const feld = (embed: { fields?: { name: string; value: string }[] }, name: string) =>
  embed.fields?.find((f) => f.name === name)?.value?.trim() ?? "";

export default async function TerminSeite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const v = await ladeVorschlag(code);

  // Frühester wählbarer Tag im Datumsfeld: morgen (Berliner Zeit).
  const h = berlinNow();
  const fruehestens = new Date(Date.UTC(h.year, h.month - 1, h.day + 1)).toISOString().slice(0, 10);

  const name = v.ok ? kundenName(v.embed) : "";
  const zeit = v.ok ? feld(v.embed, "Zeitpunkt") : "";
  const anlass = zeit
    ? `Sie haben am ${/\d{2}:\d{2}$/.test(zeit) ? `${zeit} Uhr` : zeit} bei uns angerufen.`
    : "Sie haben bei uns angerufen.";

  const hinweis = (text: string) => <p className="ag-ts__text">{text}</p>;

  let inhalt: React.ReactNode;
  if (!v.ok) {
    inhalt = hinweis(`Dieser Link ist leider ungültig oder abgelaufen. Rufen Sie uns gern an: ${site.phoneDisplay}`);
  } else if (v.state === "confirmed") {
    inhalt = hinweis("Ihr Termin ist bestätigt. Vielen Dank, wir freuen uns auf das Gespräch.");
  } else if (v.state === "customer_alt") {
    inhalt = hinweis("Vielen Dank, wir haben Ihren Wunsch erhalten und melden uns per SMS oder Rückruf.");
  } else if (v.state !== "proposed" || !v.termin) {
    inhalt = hinweis(`Dieser Vorschlag ist nicht mehr aktuell. Rufen Sie uns gern an: ${site.phoneDisplay}`);
  } else {
    inhalt = (
      <>
        <p className="ag-ts__text ag-ts__anlass">
          {anlass} Dazu haben wir einen Terminvorschlag für Sie:
        </p>
        <div className="ag-ts__vorschlag">
          <p className="ag-ts__marke">Unser Vorschlag</p>
          <p className="ag-versal ag-ts__termin">{v.termin}</p>
          <p className="ag-ts__klein">Erstgespräch mit Agents Gilt</p>
        </div>
        <TerminAntwort code={code} termin={v.termin} fruehestens={fruehestens} />
      </>
    );
  }

  const vertrauen = ["Persönlicher Link, nur für Sie.", "Keine Anmeldung, keine Zahlungsdaten."];

  return (
    <Welt>
      <main className="ag-ts">
        <GoldVerlauf />
        <div className="ag-ts__grund" aria-hidden="true" />
        <div className="ag-ts__spalte">
          <header className="ag-ts__kopf">
            <span className="ag-ts__logo">
              <GoldMarke />
            </span>
            <span className="ag-ts__wer">
              <span className="ag-ts__name">Agents Gilt</span>
              <span className="ag-ts__zeile">KI-Lösungen für lokale Unternehmen</span>
            </span>
            <span className="ag-ts__art">Terminvorschlag</span>
          </header>

          <div className="ag-ts__buehne">
            <span className="ag-ts__stern" aria-hidden="true">
              <Leuchtstern />
            </span>
            <TerminKarte>
              <Entschluesselt als="h1" className="ag-versal ag-ts__titel">
                {name ? `Guten Tag, ${name}` : "Guten Tag"}
              </Entschluesselt>
              {inhalt}
            </TerminKarte>
          </div>

          <ul className="ag-ts__vertrauen">
            {vertrauen.map((t) => (
              <li key={t}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <p className="ag-ts__fragen">
            Fragen? <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
            {" · "}
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>

          <footer className="ag-ts__fuss">
            <p>
              Sie sind auf <span>agentsgilt.com</span>, der Website von Agents Gilt.
            </p>
            <p className="ag-ts__links">
              <Link href="/impressum">Impressum</Link>
              <Link href="/datenschutz">Datenschutz</Link>
            </p>
          </footer>
        </div>
      </main>
    </Welt>
  );
}
