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

/** Flaches Logo-Zeichen für Kopfleiste, Fußleiste und kleine Stellen. */
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
