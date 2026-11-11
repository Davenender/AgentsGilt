// Die vier Kopfbild-Varianten (Schritt 4) für den gewählten Aufbau
// „Riesen-Schriftzug“. Reihenfolge = Reihenfolge auf der Übersicht
// /varianten/kopf. Gewählt ist „kern“; seit dem Zwischenauftrag vor Schritt 5
// zeigt es das Logo aus Licht und den Namen aus Zeichen. Die drei anderen
// zeigen noch den verworfenen Stand mit 3D-Zeichen (three.js).
export const KOPFBILDER = [
  {
    slug: "kern",
    name: "Kern im Schriftzug",
    satz: "Gewählt, inzwischen ohne 3D-Zeichen: hinten unser Logo aus Licht, vorn der Name aus tausenden Schriftzeichen. Ein Klick schickt eine Welle hindurch.",
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
