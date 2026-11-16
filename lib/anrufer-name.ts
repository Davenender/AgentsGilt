// Davids Wunsch 16.11.2026: Auf der Anruf-Karte in #anrufe den Namen des Anrufers per Knopf „✏️ Name“ korrigieren
// (der Telefon-Assistent hat ihn z. B. als „Mark“ statt „Marc“ verstanden). Gespeichert wird im Feld „Anrufer“ der Karte;
// SMS (kundenName in lib/discord-calls.ts) und Rückruf (lib/rueckruf.ts) lesen genau dieses Feld.
// Reine Logik: tests/anrufer-name.test.ts. Knöpfe: lib/anrufer-name-handler.ts.

export const NAME_KNOPF_ID = "anrname:knopf";
export const NAME_FENSTER_PREFIX = "anrname:fenster:";
const FELD = "Anrufer";

export const nameKnopf = () => ({ type: 2 as const, style: 2, label: "✏️ Name", custom_id: NAME_KNOPF_ID });

/** Bereinigter Name oder null: nur Buchstaben (auch Umlaute und Akzente), Leerzeichen, Bindestrich, Apostroph, Punkt. */
export function pruefeAnruferName(roh: string): string | null {
  const name = roh.trim().replace(/\s+/g, " ");
  if (!name || name.length > 40) return null;
  return /^[\p{L}][\p{L} .'’-]*$/u.test(name) ? name : null;
}

type Feld = { name: string; value: string; inline?: boolean };

/** Felder mit dem neuen Namen: „Anrufer“ ersetzen oder vorne anlegen. Das Original bleibt unverändert. */
export function mitAnruferName(felder: Feld[] | undefined, name: string): Feld[] {
  const liste = (felder ?? []).map((f) => ({ ...f }));
  const da = liste.find((f) => f.name === FELD);
  if (da) {
    da.value = name;
    return liste;
  }
  return [{ name: FELD, value: name, inline: true }, ...liste];
}

/** Fenster zum Korrigieren; der jetzige Name steht schon drin (außer er ist leer oder „unbekannt“). */
export function nameFenster(messageId: string, aktuell: string) {
  const vorschlag = aktuell.trim();
  const brauchbar = vorschlag && vorschlag.length <= 40 && !/^(unbekannt|keine angabe|nicht genannt|n\/a|-)/i.test(vorschlag);
  return {
    custom_id: `${NAME_FENSTER_PREFIX}${messageId}`,
    title: "Name des Anrufers",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: "name",
            label: "Name, genau so geschrieben",
            style: 1,
            required: true,
            min_length: 1,
            max_length: 40,
            placeholder: "z. B. Marc Müller",
            value: brauchbar ? vorschlag : undefined,
          },
        ],
      },
    ],
  };
}
