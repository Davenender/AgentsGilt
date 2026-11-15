// Formen des Agents-Gilt-Logos (aus public/logo-mark.png abgenommen):
// vier schräge Balken und ein vierzackiger Stern, Mittelpunkt bei 0/0.
export const BALKEN = [
  "-6,-46 -6,-32.8 -32.7,-6.2 -46.2,-6.2",
  "6,-46 46.2,-6.2 32.7,-6.2 6,-32.8",
  "-46.2,6.2 -32.7,6.2 -6,32.8 -6,46",
  "6,32.8 32.7,6.2 46.2,6.2 6,46",
] as const;

export const STERN = "M0,-20.5Q1,-1 20.5,0Q1,1 0,20.5Q-1,1 -20.5,0Q-1,-1 0,-20.5Z";

export function LogoFormen() {
  return (
    <>
      {BALKEN.map((punkte) => (
        <polygon key={punkte} points={punkte} />
      ))}
      <path d={STERN} />
    </>
  );
}

/** Kennung des goldenen Verlaufs, den alle kleinen Logos nutzen (einmal je Seite: GoldVerlauf). */
const GOLD = "ag-gold-verlauf";

/**
 * Der goldene Verlauf für die kleinen Logos, einmal je Seite angelegt (im Rahmen). Er läuft schräg
 * über das ganze Logo: oben links hell, unten rechts sattes Gold.
 */
export function GoldVerlauf() {
  return (
    <svg className="ag-goldverlauf" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={GOLD} gradientUnits="userSpaceOnUse" x1="-46" y1="-46" x2="46" y2="46">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.45" stopColor="#f3d27a" />
          <stop offset="1" stopColor="#d4a23c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Das Logo für alle kleinen Stellen der neuen Seite: der vierzackige Stern mit den vier schrägen
 * Balken, flach und golden, mit einem leichten Schein (Stylesheet). Es ist überall dasselbe:
 * Kopfleiste, Chat-Kugel, Kopf des Chat-Fensters, Chat-Zeile im Kontakt. Leuchten darf nur das
 * große Logo in der Mitte der Seite.
 */
export function GoldMarke({ className }: { className?: string }) {
  return (
    // Fehlt der Verlauf einmal, bleibt das Logo einfarbig golden.
    <svg className={`ag-goldmarke${className ? ` ${className}` : ""}`} viewBox="-50 -50 100 100" fill={`url(#${GOLD}) #f3d27a`} aria-hidden="true">
      <LogoFormen />
    </svg>
  );
}

/** Flaches Logo-Zeichen in der Farbe der Schrift (Fußleiste). */
export function Marke({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true">
      <LogoFormen />
    </svg>
  );
}

export function Pfeil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
