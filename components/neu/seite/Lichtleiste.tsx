/**
 * Lichtleiste: ein durchgehender, leuchtender Streifen über die ganze Breite, am unteren Rand am
 * hellsten und weich nach oben auslaufend, dazu ein feiner, hellerer Goldstreifen genau an der
 * Kante. Wie Sonnenlicht, das von unten in den Raum fällt. Sie bewegt sich nie seitlich.
 * Im Kopfbereich ist sie der Scroll-Hinweis (dort atmet sie), im Fuß steht sie ruhig.
 */
export function Lichtleiste({ className }: { className?: string }) {
  return (
    <span className={`ag-leiste ${className ?? ""}`} aria-hidden="true">
      <span className="ag-leiste__schein" />
      <span className="ag-leiste__kante" />
    </span>
  );
}
