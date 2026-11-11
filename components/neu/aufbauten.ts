// Die drei Aufbau-Varianten der Welt „Chromzeichen in der Punktwolke“
// (Schritt 3). Gleiche Welt, anderer Aufbau. Reihenfolge = Reihenfolge auf der
// Übersichtsseite /varianten. „hoehe“ ist die Höhe der Aufnahme der ganzen
// Seite (public/varianten/<slug>-ganz.jpg, 720 px breit).
export const AUFBAUTEN = [
  {
    slug: "riesen-schriftzug",
    name: "Riesen-Schriftzug",
    hoehe: 4379,
    satz: "Der Name steht riesig über die ganze Breite, das Zeichen mitten darin. Beim Scrollen taucht er weg, danach folgen linksbündige Kapitel mit sehr großer Schrift.",
  },
  {
    slug: "kartenstapel",
    name: "Kartenstapel",
    hoehe: 4173,
    satz: "Der Kopfbereich wie in Ihrer gewählten Skizze. Danach ist jeder Bereich ein Bogen, der sich beim Scrollen über den vorigen schiebt.",
  },
  {
    slug: "umlaufbahn",
    name: "Umlaufbahn",
    hoehe: 4754,
    satz: "In der Mitte nur die Überschrift, die sechs Leistungen kreisen auf einem Punktring darum. Weiter unten wählt eine Drehscheibe die Leistung aus.",
  },
] as const;

export type AufbauSlug = (typeof AUFBAUTEN)[number]["slug"];
