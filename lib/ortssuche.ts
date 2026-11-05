// Davids Wunsch 05.11.: Die Ortssuche soll „perfekt funktionieren“. Die Dienste liefern oft viele Treffer, der erste ist
// nicht immer der richtige (Tunnel statt Flughafen, Metz statt Obertshausen). Hier wird entschieden (rein, getestet): Jedes
// Wort aus Davids Suche muss beim Treffer vorkommen – sonst lieber „nicht gefunden“ als ein falscher Ort. Unter den passenden
// gewinnen echte Orte vor Straßen und Tunneln, Wichtiges vor Unwichtigem, Nahes vor Fernem.
const HEIMAT = { lat: 50.1186, lon: 8.8331 };

export type Kandidat = { name: string; adresse: string; klasse?: string; typ?: string; lat: number; lon: number; wichtig?: number; quelle: string; info?: string };

export function falte(t: string): string {
  return t
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/([aou])e/g, "$1");
}

/** Sagt nichts darüber aus, WO etwas ist. */
const FUELL = new Set(["der", "die", "das", "den", "dem", "des", "von", "vom", "in", "im", "am", "an", "bei", "beim", "nach", "zum", "zur", "und", "ein", "eine", "einen", "mein", "meine", "meinem", "unser", "unsere", "standort", "adresse", "gebaude", "firma", "laden", "gmbh", "kg", "ohg", "ug", "ag", "wo", "ist", "wohnt"].map(falte));

const STRASSE = /\b(\S*?)str\.?(?=\s|,|$)/gi;
export function suchWoerter(text: string): string[] {
  const t = falte(text.replace(STRASSE, (_, a: string) => `${a}strasse`));
  return t.split(/[^\p{L}\p{N}]+/u).filter((w) => w && !FUELL.has(w));
}
const kompakt = (t: string) => falte(t).replace(/[^\p{L}\p{N}]/gu, "");

/** Art des Treffers → Wörter, die David dafür sagt. */
const ART_WOERTER: Record<string, string[]> = {
  bakery: ["bäckerei", "bäcker"],
  hairdresser: ["friseur", "frisör", "salon"],
  supermarket: ["supermarkt", "markt"],
  pharmacy: ["apotheke"],
  fuel: ["tankstelle"],
  school: ["schule", "gymnasium", "gesamtschule", "grundschule"],
  hospital: ["krankenhaus", "klinik", "klinikum"],
  doctors: ["arzt", "ärztin", "praxis"],
  dentist: ["zahnarzt", "zahnärztin", "praxis"],
  fitness_centre: ["fitness", "fitnessstudio", "gym", "studio"],
  cafe: ["café", "cafe"],
  restaurant: ["restaurant", "lokal"],
  fast_food: ["imbiss", "restaurant"],
  bar: ["bar", "kneipe"],
  pub: ["kneipe", "pub"],
  bank: ["bank", "sparkasse"],
  station: ["bahnhof"],
  aerodrome: ["flughafen"],
  cinema: ["kino"],
  theatre: ["theater"],
  museum: ["museum"],
  townhall: ["rathaus"],
  police: ["polizei"],
  library: ["bibliothek", "bücherei"],
  car_repair: ["werkstatt", "autowerkstatt"],
  car: ["autohaus"],
  butcher: ["metzgerei", "metzger"],
  clothes: ["modegeschäft", "boutique"],
  hotel: ["hotel"],
  stadium: ["stadion"],
};

function abstand(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function wortPasst(w: string, woerter: string[], zusammen: string, art: Set<string>): boolean {
  if (woerter.includes(w) || art.has(w)) return true;
  if (w.length >= 4 && zusammen.includes(w)) return true;
  // „Frankfurter“ gehört zu „Frankfurt“
  const stamm = w.replace(/(er|es|en|s|e)$/, "");
  if (stamm.length >= 4 && woerter.some((t) => t === stamm || (t.startsWith(stamm) && t.length <= stamm.length + 3))) return true;
  // kleine Verhörer der Spracherkennung
  return w.length >= 6 && woerter.some((t) => Math.abs(t.length - w.length) <= 1 && abstand(t, w) <= 1);
}

function klassenWert(k: Kandidat): number {
  const klasse = k.klasse ?? "";
  const typ = k.typ ?? "";
  if (/parking|board|bench|bicycle_rental|waste|toilets|post_box|vending|charging/.test(typ) || klasse === "information") return -20;
  if (/highway|tunnel|bridge|junction/.test(klasse) || /tunnel|motorway/.test(typ)) return -40;
  if (klasse === "aeroway" || klasse === "railway") return 15;
  if (klasse === "place" || klasse === "boundary") return 12;
  if (["amenity", "shop", "tourism", "leisure", "office", "craft", "healthcare"].includes(klasse)) return 10;
  if (klasse === "building") return 6;
  return 0;
}

const IN_DEUTSCHLAND = (k: Kandidat) => k.lat > 47.2 && k.lat < 55.1 && k.lon > 5.8 && k.lon < 15.1;
function km(k: Kandidat): number {
  const lat = HEIMAT.lat;
  const dLat = (k.lat - lat) * 111;
  const dLon = (k.lon - HEIMAT.lon) * 111 * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Punkte für diesen Treffer – null, wenn er nicht zur Suche passt. */
export function bewerte(suche: string, k: Kandidat): number | null {
  const worte = suchWoerter(suche);
  if (!worte.length) return null;
  const voll = `${k.name} ${k.adresse}`;
  const woerter = suchWoerter(voll);
  const zusammen = kompakt(voll);
  const art = new Set((ART_WOERTER[k.typ ?? ""] ?? []).map(falte));
  // Straßen und Tunnel nur, wenn David auch danach sucht – nie „Frankfurter-Kreuz-Tunnel“ für den Flughafen
  if (klassenWert(k) <= -40 && !worte.some((w) => /\d|strasse|weg$|allee|platz|ring$|gasse|tunnel|kreuz|autobahn|brucke/.test(w))) return null;
  const zahlen = worte.filter((w) => /^\d/.test(w));
  const namen = worte.filter((w) => !/^\d/.test(w));
  const treffer = namen.filter((w) => wortPasst(w, woerter, zusammen, art));
  // Reine Zahlen (Hausnummer, Postleitzahl) dürfen fehlen; alle Wörter müssen stimmen. Ganz lange Beschreibungen: 3 von 4.
  const genug = namen.length ? treffer.length === namen.length || (namen.length >= 4 && treffer.length / namen.length >= 0.75) : zahlen.length > 0;
  if (!genug) return null;
  const zahlTreffer = zahlen.filter((z) => woerter.includes(z)).length;
  const imNamen = namen.filter((w) => wortPasst(w, suchWoerter(k.name), kompakt(k.name), art)).length;
  const e = km(k);
  return (
    (treffer.length / Math.max(1, namen.length)) * 100 +
    zahlTreffer * 15 +
    (imNamen / Math.max(1, namen.length)) * 20 +
    klassenWert(k) +
    (k.wichtig ?? 0) * 30 +
    (e <= 40 ? 12 : e <= 150 ? 5 : 0) +
    (IN_DEUTSCHLAND(k) ? 8 : 0)
  );
}

export function besterKandidat(suche: string, kandidaten: Kandidat[]): Kandidat | null {
  let best: Kandidat | null = null;
  let punkte = -Infinity;
  for (const k of kandidaten) {
    const p = bewerte(suche, k);
    if (p !== null && p > punkte) {
      best = k;
      punkte = p;
    }
  }
  return best;
}

const MERKMAL = "(Flughafen|Hauptbahnhof|Bahnhof|Rathaus|Dom|Zoo|Messe|Innenstadt|Altstadt|Hafen|Stadion|Museum|Klinikum|Krankenhaus|Schloss|Theater|Kino|Palmengarten|Römer|Marktplatz)";
/** So sagt man's – so steht's in der Karte: „Frankfurter Flughafen“ → „Flughafen Frankfurt“. */
export function varianten(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim().replace(/\bHbf\b\.?/gi, "Hauptbahnhof");
  const m = t.match(new RegExp(`^(\\p{Lu}[\\p{L}-]+?)er ${MERKMAL}$`, "u"));
  return m ? [`${m[2]} ${m[1]}`, t] : [t];
}

export type AdressEintrag = { name: string; aliase: string[]; adresse: string };

/** Zeilen wie „- Relax Fit | Relaxfit, Relax-Fit Studio | Bürgermeister-Mahr-Str. 44, 63179 Obertshausen“. */
export function adressbuchAus(md: string): AdressEintrag[] {
  const r: AdressEintrag[] = [];
  for (const z of md.split("\n")) {
    const m = z.match(/^\s*[-*]\s*([^|]+)\|([^|]*)\|\s*(.+?)\s*$/);
    if (!m) continue;
    const name = m[1].trim();
    const adresse = m[3].trim();
    if (name && adresse) r.push({ name, aliase: m[2].split(",").map((a) => a.trim()).filter(Boolean), adresse });
  }
  return r;
}

/** Steht der gesuchte Ort im Adressbuch? Neben dem Namen darf nur stehen, was auch zur Adresse gehört. */
export function imAdressbuch(text: string, buch: AdressEintrag[]): AdressEintrag | null {
  const suche = suchWoerter(text);
  if (!suche.length) return null;
  const roh = kompakt(suche.join(""));
  for (const e of buch) {
    const adresse = suchWoerter(e.adresse);
    for (const n of [e.name, ...e.aliase]) {
      const nameWorte = suchWoerter(n);
      const nameKompakt = kompakt(nameWorte.join(""));
      if (!nameKompakt) continue;
      if (roh === nameKompakt) return e;
      // Wörter, die nicht zum Namen gehören, müssen in der Adresse stehen
      const rest = suche.filter((w) => !nameWorte.includes(w) && !nameKompakt.includes(w));
      const hatNamen = roh.includes(nameKompakt);
      if (hatNamen && rest.every((w) => adresse.includes(w) || adresse.some((a) => a.includes(w)))) return e;
    }
  }
  return null;
}

const KEINE_PERSON = new RegExp(
  `(?<![\\p{L}])(${[...Object.values(ART_WOERTER).flat(), "gmbh", "ag", "kg", "ug", "ohg", "autohaus", "kanzlei", "firma", "agentur", "verein", "kirche", "park", "platz", "strasse", "straße", "weg", "allee"].join("|")})(?![\\p{L}])`,
  "iu",
);
/** Sieht es nach einer Privatperson aus? Personen werden nie gesucht – dann auch keine automatische Recherche. */
export function wirktWiePerson(text: string): boolean {
  if (/\b(wohnt|wohnen|zuhause von|haus von|adresse von)\b/i.test(text)) return true;
  if (KEINE_PERSON.test(text) || /\d/.test(text)) return false;
  const w = text.trim().split(/\s+/);
  return w.length === 2 && w.every((x) => /^\p{Lu}\p{Ll}+$/u.test(x));
}
