// Wortliste gegen Beleidigungen im Chat (Prompt 17, 23.11.2026). NUR der Ersatz: Ob eine Nachricht eine
// Beleidigung ist, entscheidet immer die KI (lib/chat-beleidigung.ts). Die Liste greift erst, wenn die KI
// nicht antwortet (Störung, mehr als 5 s). Darum bewusst vorsichtig: lieber eine Beleidigung übersehen
// als einen freundlichen Kunden ermahnen („verschlampen“, „das ist echt krass gut“ zählen nie).
//
// Erkannt werden auch Schreibweisen wie „a*schloch“, „arschl0ch“, „A.r.s.c.h.l.o.c.h“, „arschloooch“.
// Neue Wörter: klein und ohne Umlaute-Sonderfälle eintragen (ä, ö, ü, ß gehen, werden mitgewandelt).

/** Immer eine Beleidigung, egal in welchem Satz. */
const HART = [
  "arschloch", "arschlöcher", "arschgeige", "arschkriecher", "wichser", "wixer", "flachwichser", "hurensohn",
  "hurensöhne", "huso", "hure", "nutte", "fotze", "schlampe", "missgeburt", "spast", "spasti", "spacko",
  "schwuchtel", "kackbratze", "drecksau", "pisser", "bastard", "evolutionsbremse",
];

/** Nur eine Beleidigung, wenn jemand angesprochen wird („du Idiot“, „ihr seid dumm“), nicht „ich Idiot“. */
const MILD = [
  "idiot", "idioten", "depp", "deppen", "trottel", "penner", "dummkopf", "blödmann", "vollpfosten", "pfosten",
  "honk", "hirni", "hohlkopf", "schwachkopf", "lappen", "lauch", "opfer", "versager", "dumm", "doof", "blöd",
  "behindert", "scheiße", "scheisse", "betrüger", "lügner", "abzocker", "inkompetent", "unfähig", "wertlos",
];
const ANREDE = ["du", "ihr", "euch", "dich", "dir", "bist", "seid", "son", "sone", "so'n"];

/** Verstärken ein Wort („Vollidiot“, „Riesendepp“). Vor einem harten Wort zählt es immer, vor einem milden nur mit Anrede („Oberlappen“ ist die Lunge). */
const VORSILBEN = ["voll", "riesen", "mega", "ober", "ur", "dreck", "drecks", "scheiß", "scheiss", "kack", "huren"];

/** Ganze Wendungen. */
const WENDUNGEN = [
  "fick dich", "fick euch", "fickt euch", "fick deine mutter", "halt die fresse", "halts maul", "halt dein maul",
  "verpiss dich", "verpisst euch", "leck mich", "geh sterben", "geht sterben", "du arsch", "ihr arsch",
  "du schwein", "ihr schweine", "du sau",
];

// ------------------------------------------------------------------ Schreibweisen angleichen

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "€": "e", "!": "i" };

/** Ein Wort in die Vergleichsform: klein, ä → ae, ß → ss, Zahlen als Buchstaben, Punkte zwischen Buchstaben weg, doppelte Buchstaben einfach. */
function form(wort: string, eins: "i" | "l" = "i"): string {
  let w = wort.normalize("NFKC").toLowerCase();
  // Zeichen am Rand („Idiot!!!“) gehören nicht zum Wort, ein Ausrufezeichen mitten drin schon („!d!ot“).
  w = w.replace(/^[^\p{L}\p{N}*@$€!]+|[^\p{L}\p{N}*]+$/gu, "");
  w = w.replace(/[013457@$€!]/g, (z) => (z === "1" ? eins : LEET[z] ?? z));
  w = w.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  w = w.replace(/(?<=\p{L})[.\-_+'’](?=\p{L})/gu, "");
  w = w.replace(/[^a-z*]/g, "");
  return w.replace(/([a-z])\1+/g, "$1");
}

const ohneStern = (w: string) => form(w).replace(/\*/g, "");
const HART_F = new Set(HART.map(ohneStern));
const MILD_F = new Set(MILD.map(ohneStern));
const VORSILBEN_F = VORSILBEN.map(ohneStern);
const WENDUNGEN_F = WENDUNGEN.map((w) => w.split(" ").map(ohneStern));
const ANREDE_F = new Set(ANREDE.map(ohneStern));

/** Mit Vorsilbe („vollidiot“): Gibt das Wort ohne Vorsilbe zurück, wenn es eins aus der Liste ist. */
function ohneVorsilbe(w: string, liste: Set<string>): string | null {
  for (const v of VORSILBEN_F) if (w.startsWith(v) && liste.has(w.slice(v.length))) return w.slice(v.length);
  return null;
}

/** Passt ein getipptes Wort (mit * als Platzhalter für 1 bis 4 Buchstaben) zu einem Listenwort? */
function passt(getippt: string, liste: Set<string>): boolean {
  if (!getippt.includes("*")) return liste.has(getippt);
  // Ein Stern allein oder „f**“ sagt nichts: mindestens drei echte Buchstaben.
  if (getippt.replace(/\*/g, "").length < 3) return false;
  const muster = new RegExp(`^${getippt.split(/\*+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".{1,4}")}$`);
  for (const w of liste) if (muster.test(w)) return true;
  return false;
}

/**
 * Findet eine Beleidigung aus der Liste. Gibt das Wort (wie getippt) zurück, sonst null.
 * Nur der Ersatz, wenn die KI nicht antwortet.
 */
export function findeSchimpfwort(text: string): string | null {
  const roh = text.split(/\s+/).filter(Boolean);
  // Eine „1“ kann ein i oder ein l sein („w1chser“, „arsch1och“): beides prüfen.
  for (const eins of ["i", "l"] as const) {
    const woerter = roh.map((w) => form(w, eins));
    for (let i = 0; i < woerter.length; i++) {
      const w = woerter[i];
      if (!w) continue;
      if (passt(w, HART_F) || ohneVorsilbe(w, HART_F)) return roh[i];
      const angesprochen = woerter.slice(Math.max(0, i - 3), i).some((x) => ANREDE_F.has(x));
      if (angesprochen && (passt(w, MILD_F) || ohneVorsilbe(w, MILD_F))) return roh[i];
    }
    for (const wendung of WENDUNGEN_F) {
      for (let i = 0; i + wendung.length <= woerter.length; i++) {
        if (wendung.every((teil, k) => passt(woerter[i + k], new Set([teil])))) return roh.slice(i, i + wendung.length).join(" ");
      }
    }
  }
  return null;
}
