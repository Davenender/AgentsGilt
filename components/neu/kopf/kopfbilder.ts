// Die vier Kopfbild-Varianten (Schritt 4) für den gewählten Aufbau
// „Riesen-Schriftzug“. Reihenfolge = Reihenfolge auf der Übersicht
// /varianten/kopf. Gewählt ist „kern“; es zeigt seit der Korrektur vom
// 12.11.2026 den Kopfbereich ohne Text mit Licht-Logo und Name aus Zeichen.
// Die drei anderen zeigen noch den verworfenen Stand mit 3D-Zeichen.
export const KOPFBILDER = [
  {
    slug: "kern",
    name: "Kern im Schriftzug",
    satz: "Gewählt und neu gebaut, ohne Text: hinten unser Logo als Licht mit Strahlen, vorn der Name aus tausenden Schriftzeichen. Ein Klick schickt eine Welle hindurch.",
  },
  {
    slug: "baender",
    name: "Lichtbänder",
    satz: "Oben die Überschrift, darunter das Zeichen groß. Fünf Lichtbänder kreisen darum und beugen sich zur Maus, dahinter der Name als feine Linie.",
  },
  {
    slug: "wolke",
    name: "Punktwolke",
    satz: "Das Zeichen schwebt in einer Kugel aus Punkten, die sich langsam dreht. Die Maus drückt die Punkte zur Seite, wo sie berührt, leuchten sie golden.",
  },
  {
    slug: "tiefe",
    name: "Tiefenflug",
    satz: "Das Zeichen am Ende eines Tunnels aus Lichtpunkten, die Maus lenkt ihn. Die Überschrift fliegt Wort für Wort herein, beim Scrollen fliegt man hindurch.",
  },
] as const;

export type KopfSlug = (typeof KOPFBILDER)[number]["slug"];
