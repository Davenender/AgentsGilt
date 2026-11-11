// Die vier Kopfbild-Varianten (Schritt 4) für den gewählten Aufbau
// „Riesen-Schriftzug“. Reihenfolge = Reihenfolge auf der Übersicht
// /varianten/kopf.
export const KOPFBILDER = [
  {
    slug: "kern",
    name: "Kern im Schriftzug",
    satz: "Der Name steht riesig quer über die Mitte, das glänzende Zeichen sitzt genau darin. Drei Lichtspuren und feiner Staub folgen der Maus.",
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
