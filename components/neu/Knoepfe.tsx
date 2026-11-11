import type { ReactNode } from "react";
import { hero, marke } from "@/lib/inhalt-neu";
import { Pfeil } from "./Marke";

/** Runder Knopf mit Pfeil im eigenen Kreis. „gold“ ist die Hauptaktion. */
export function Knopf({
  href,
  art = "gold",
  children,
  className,
  neu = false,
}: {
  href: string;
  art?: "gold" | "linie" | "rand";
  children: ReactNode;
  className?: string;
  /** In neuem Tab öffnen (für WhatsApp). */
  neu?: boolean;
}) {
  return (
    <a
      href={href}
      className={`ag-knopf ag-knopf--${art} ${className ?? ""}`}
      {...(neu ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      <span className="ag-kreis">
        <Pfeil />
      </span>
    </a>
  );
}

/**
 * Die Anruf-Leiste: Status, die echte Nummer und der Hauptknopf. Wer hier
 * anruft, landet beim eigenen KI-Telefonassistenten. Keine neue Logik, nur
 * ein tel:-Link.
 */
export function AnrufLeiste({ className }: { className?: string }) {
  return (
    <div className={`ag-anruf ${className ?? ""}`}>
      <span className="ag-mono ag-anruf__status">
        <i />
        {hero.anrufStatus}
      </span>
      <a className="ag-anruf__nummer" href={`tel:${marke.telefon}`}>
        {marke.telefonAnzeige}
      </a>
      <Knopf href={`tel:${marke.telefon}`}>{hero.anrufen}</Knopf>
    </div>
  );
}
