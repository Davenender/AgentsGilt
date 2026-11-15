// Wohin ein eingehender Anruf auf der Agents-Gilt-Nummer geht (app/api/rufgruppe, Aktion „eingang“).
// Davids Wunsch 16.11.: Wartet für die Nummer ein Rückruf, kommt zuerst die Ansage („bitte auflegen, wir rufen zurück“) –
// auch bei Davids eigener Nummer, damit er den Ablauf als Kunde testen kann. Ohne Pfad-Kürzel, damit es testbar bleibt.

export type EingangsWeg = "rueckruf-ansage" | "davids-menue" | "assistent";

export function eingangsWeg(o: { rueckrufWartet: boolean; david: boolean }): EingangsWeg {
  if (o.rueckrufWartet) return "rueckruf-ansage";
  return o.david ? "davids-menue" : "assistent";
}
