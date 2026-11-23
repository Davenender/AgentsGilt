/**
 * Reine Rechenregeln des Kopfbereichs, ohne Browser: So lassen sie sich prüfen
 * (tests/kopf-start.test.ts). Gebraucht von LichtName.tsx und lichtszene.ts.
 */

/** Bis zu so vielen Pixeln unter dem Seitenanfang gilt die Seite als „oben“. */
export const OBEN_PX = 24;

/**
 * Scroll-Fortschritt im Kopfbereich: 0 = oben, 1 = nach 90 % der Bildhöhe. Danach tritt das Licht
 * zurück (bis auf 14 %); zurück am Seitenanfang leuchtet es kurz etwas heller auf.
 *
 * Solange die Seite „oben“ ist (bis 24 px), bleibt er genau 0. (Bis zur Startanimation-Runde 2 vom
 * 16.11.2026 flogen am Computer auch die Zeichen mit diesem Fortschritt auseinander; seitdem steht
 * der Name nach dem Einflug überall fest und wandert mit der Seite.)
 */
export function rollStand(scrollY: number, bildHoehe: number): number {
  const weg = Math.max(OBEN_PX + 1, 0.9 * bildHoehe);
  const s = (scrollY - OBEN_PX) / (weg - OBEN_PX);
  return s <= 0 || !Number.isFinite(s) ? 0 : s >= 1 ? 1 : s;
}

/** Dauer der drei Stufen des Lichts in Sekunden: Stern heller, Balken, Strahlen. */
export type Stufen = readonly [stern: number, balken: number, strahlen: number];

/**
 * Aufbau des Lichts von innen nach außen, jede Stufe weich in die nächste: erst wird der Stern
 * heller, dann kommen die vier Balken, dann wachsen die Strahlen. „p“ läuft gleichmäßig von 0 bis
 * 1 über die ganze Dauer; jede Stufe beginnt 0,15 s, bevor die vorige endet. Die Werte liegen
 * zwischen 0 und 1.
 */
export function stufenWerte(p: number, zeiten: Stufen) {
  const t = Math.min(1, Math.max(0, p)) * (zeiten[0] + zeiten[1] + zeiten[2]);
  const weich = (von: number, dauer: number) => {
    const x = Math.min(1, Math.max(0, (t - von) / dauer));
    return x * x * (3 - 2 * x);
  };
  const ueber = 0.15;
  return { stern: weich(0, zeiten[0]), balken: weich(zeiten[0] - ueber, zeiten[1] + ueber), strahlen: weich(zeiten[0] + zeiten[1] - ueber, zeiten[2] + ueber) };
}

/** Lichtstärke 0 bis 1: Stern und Balken machen je ein Viertel aus, die Strahlen die Hälfte. */
export function lichtStaerke(p: number, zeiten: Stufen): number {
  const w = stufenWerte(p, zeiten);
  return 0.25 * w.stern + 0.25 * w.balken + 0.5 * w.strahlen;
}

/**
 * Wie lange die Probe den Start noch aufhalten darf (Sekunden ab jetzt): bis 6 s nach dem ersten
 * Bild, mindestens aber 1 s (wenn das Laden selbst länger gedauert hat), und nie über die
 * Sicherheitsgrenze hinaus.
 */
export function probeFrist(seitErstemBild: number, probeBis = 6, grenze = 15): number {
  return Math.max(0, Math.min(Math.max(1, probeBis - seitErstemBild), grenze - seitErstemBild));
}

/**
 * Eine Uhr, die nur läuft, solange die Seite zu sehen ist. Ist der Tab verdeckt, steht sie: So
 * zählt für das Sicherheitsnetz der Startanimation nur Zeit, in der die Abfolge auch wirklich lief
 * (verdeckt hält der Browser die Bilder an, die Abfolge wartet dann).
 * `wechsel()` gehört an jede Änderung der Sichtbarkeit; `ms()` gibt die sichtbare Zeit seit dem Anlegen.
 */
export function erzeugeSichtUhr(jetzt: () => number, verdeckt: () => boolean): { wechsel: () => void; ms: () => number } {
  let summe = 0;
  // Seit wann die Seite am Stück zu sehen ist (null: gerade verdeckt).
  let ab: number | null = verdeckt() ? null : jetzt();
  return {
    wechsel: () => {
      if (verdeckt()) {
        if (ab !== null) summe += jetzt() - ab;
        ab = null;
      } else if (ab === null) ab = jetzt();
    },
    ms: () => summe + (ab === null ? 0 : jetzt() - ab),
  };
}

/**
 * Womit die Abfolge läuft, wenn das Licht angeht: mit der Licht-Szene, sonst mit dem ruhigen Bild.
 * Ist beides (noch) nicht da, was nur an der Sicherheitsgrenze bei sehr langsamer Leitung vorkommt,
 * nimmt sie das Not-Licht: dasselbe Bild in klein, fest im Skript. Es gibt also immer ein Licht,
 * mit dem sich Stern, Balken und Strahlen in Stufen aufbauen, bevor die Zeichen fliegen.
 */
export function lichtQuelle(szeneDa: boolean, bildDa: boolean): "szene" | "bild" | "notlicht" {
  return szeneDa ? "szene" : bildDa ? "bild" : "notlicht";
}

/** Was vom Start schon gelaufen ist, wenn mittendrin ein Licht (wieder) kommt. */
export type StartStand = {
  /** Der Name steht (die Zeichen sind gelandet). */
  fertig: boolean;
  /** Die Zeichen sind losgeflogen. */
  fliegt: boolean;
  /** Was gerade als Licht zu sehen ist (oder war, bevor die Grafik ausfiel). */
  zeigt: "live" | "bild" | "nichts";
};

/**
 * Die Licht-Szene ist da, während der Start schon läuft oder vorbei ist (sie kam spät, oder die
 * Grafik war ausgefallen und ist neu aufgebaut).
 * - „sofort“: Alles stand schon mit lebendem Licht, es ist einfach wieder da.
 * - „aufbauen“: Der Lichtaufbau wurde unterbrochen, bevor die Zeichen losflogen. Er beginnt neu,
 *   in Stufen: Nur so fliegen die Zeichen bei 60 % auch wirklich los.
 * - „ueberblenden“: Das ruhige Bild steht (oder baut sich gerade auf) oder die Zeichen fliegen
 *   schon: Die Szene blendet weich ein.
 */
export function wennSzeneKommt(stand: StartStand): "sofort" | "aufbauen" | "ueberblenden" {
  if (stand.fertig && stand.zeigt === "live") return "sofort";
  if (!stand.fertig && !stand.fliegt && stand.zeigt !== "bild") return "aufbauen";
  return "ueberblenden";
}

/**
 * Die Szene kommt nicht (mehr), das ruhige Bild übernimmt, während der Start schon läuft oder
 * vorbei ist.
 * - „einblenden“: Es stand schon lebendes Licht, und die Zeichen fliegen oder stehen: Das Bild
 *   blendet weich ein.
 * - „aufbauen“: Es war noch kein Licht zu sehen, oder der Lichtaufbau wurde unterbrochen, bevor
 *   die Zeichen losflogen: Das Bild baut sich in Stufen auf und löst den Flug der Zeichen aus.
 */
export function wennBildKommt(stand: StartStand): "einblenden" | "aufbauen" {
  return stand.zeigt === "live" && (stand.fliegt || stand.fertig) ? "einblenden" : "aufbauen";
}

/**
 * Sichtbare Millisekunden zwischen `von` und `bis`, aus dem Sichtbarkeits-Protokoll des Browsers
 * (`performance.getEntriesByType("visibility-state")`: der Zustand beim Laden und jeder Wechsel,
 * mit Zeit). Damit lässt sich sagen, wie lange der Stern schon zu sehen war, bevor das Skript
 * eingerichtet wurde, auch wenn die Seite dazwischen verdeckt war. Kennt der Browser das Protokoll
 * nicht (`null`), gilt vorsichtig: nichts gesehen. Dann pulsiert der Stern eher etwas länger, nie
 * zu kurz.
 */
export function sichtbarZwischen(von: number, bis: number, protokoll: readonly { name: string; startTime: number }[] | null): number {
  if (!protokoll || !protokoll.length || bis <= von) return 0;
  const wechsel = [...protokoll].sort((a, b) => a.startTime - b.startTime);
  let summe = 0;
  for (let i = 0; i < wechsel.length; i++) {
    if (wechsel[i].name !== "visible") continue;
    // Dieser sichtbare Abschnitt reicht bis zum nächsten Wechsel (oder bis jetzt).
    const ab = Math.max(von, wechsel[i].startTime);
    const ende = Math.min(bis, i + 1 < wechsel.length ? wechsel[i + 1].startTime : bis);
    if (ende > ab) summe += ende - ab;
  }
  return summe;
}

/**
 * Rechnet der Browser die Grafik in Software (ohne Grafikkarte)? Erkannt am Namen des
 * Grafik-Treibers, den WebGL meldet (SwiftShader, llvmpipe, „Microsoft Basic Render Driver“ …).
 * Dann ist jedes Bild teuer: Das Licht beginnt gleich in der sparsamsten Stufe, und die Seite
 * verzichtet auf das Weichzeichnen hinter Glas (Klasse `ag-sparsam`).
 */
export function softwareGrafik(treiber: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(treiber);
}

/**
 * Wann schließt die Wache des Lichts ein Messfenster? Nach 60 Messungen, oder (auf sehr langsamen
 * Geräten kämen die erst nach einer halben Minute zusammen) nach 2 s, wenn dann mindestens 8
 * Messungen da sind. So greifen die Sparstufen auch bei wenigen Bildern je Sekunde binnen Sekunden.
 */
export function wachFensterVoll(messungen: number, seitBeginnMs: number): boolean {
  return messungen >= 60 || (messungen >= 8 && seitBeginnMs >= 2000);
}

/**
 * Nach einem Stufenwechsel zählen die nächsten Messungen nicht (die Grafikkarte richtet sich neu
 * ein): 30 Messungen lang, höchstens aber 1,2 s.
 */
export function schonfristVorbei(messungen: number, seitWechselMs: number): boolean {
  return messungen >= 30 || seitWechselMs >= 1200;
}

// ───────────── Ablauf der Startanimation (Startanimation-Runde 2, 16.11.2026) ─────────────

/** Ab diesem Pegel (0 bis 1) hat das Licht seine volle Helligkeit: Ende der Licht-Stufen. */
export const LICHT_VOLL = 0.999;
export const lichtVoll = (pegel: number) => pegel >= LICHT_VOLL;

/**
 * Sobald das Licht voll ist (kurz bevor der Name einfliegt), dreht es sich in so vielen Sekunden
 * weich zur Maus und folgt ihr danach wie immer. (Bis zur Runde 2: erst 1 s nach der Welle, 1,5 s lang.)
 */
export const MAUS_DREHEN = 0.8;

/**
 * Wie lange nach der Landung des Namens die Startanimation ganz vorbei ist (Sekunden). Bis Prompt 18 lief in dieser
 * Zeit am Computer einmal von selbst eine Welle durch die Schrift (0,25 s Pause, 1,3 s Welle); bei David hing die
 * Seite dabei kurz, darum gibt es sie seit dem 23.11.2026 nirgends mehr (am Handy war sie seit dem 15.11. aus). Die
 * Welle kommt nur noch beim Klick auf den Namen. Der Zeitpunkt „vorbei“ bleibt derselbe: Danach richtet sich der
 * Scroll-Hinweis (die Lichtleiste erscheint 3 s später).
 */
export const WELLE_PAUSE = 0.25;
export const WELLE_DAUER = 1.3;
export const VORBEI_NACH_LANDUNG = WELLE_PAUSE + WELLE_DAUER;

/**
 * Was nach der Landung des Namens geschieht, in Sekunden ab der Landung:
 * - `frei`: Scrollen ist frei (auch Scroll-Tasten und Wischen; ein gemerktes Ziel in der Adresse
 *   wird jetzt angesteuert). Seit der Runde 2 sofort bei der Landung.
 * - `vorbei`: Die Startanimation ist ganz vorbei. Danach richtet sich der Scroll-Hinweis; das ist
 *   derselbe Zeitpunkt wie bisher. Eine Welle von selbst gibt es seit Prompt 18 nicht mehr.
 */
export function nachLandung(): { frei: number; vorbei: number } {
  return { frei: 0, vorbei: VORBEI_NACH_LANDUNG };
}

/**
 * Die erste Drehung des Lichts zur Maus, ohne Ruck. Ein Folger läuft der Maus so nach, wie das
 * Licht ihr sonst folgt; das Licht geht in `dauer` Sekunden weich (langsam anfahren, langsam
 * ankommen) von seinem Platz auf den Folger über. Bewegt sich die Maus währenddessen, folgt das
 * Licht ihr stetig, und am Ende ist es genau dort, wo es auch beim gewöhnlichen Folgen wäre: Der
 * Übergang ins gewöhnliche Folgen hat keinen Sprung und keinen Knick.
 * Gibt den Anteil des Folgers zurück (0 am Anfang, 1 am Ende).
 */
export function drehAnteil(zeit: number, dauer: number): number {
  if (!(dauer > 0)) return 1;
  const x = zeit <= 0 ? 0 : zeit >= dauer ? 1 : zeit / dauer;
  // Die glattere S-Kurve: Am Anfang und am Ende sind Tempo und Beschleunigung null. So knickt der
  // Übergang ins gewöhnliche Folgen auch dann nicht, wenn die Maus sich gerade bewegt.
  return x * x * x * (x * (6 * x - 15) + 10);
}

/**
 * Steht ein Abschnitt in der Adresse (#kontakt), steuert die Seite ihn nach dem Start nur bei einem
 * neuen Aufruf an (Link von außen, aus einer Mail oder SMS, aus der Navigation einer anderen Seite):
 * Dann ist sie dort, sobald das Scrollen frei ist. Wird die Seite dagegen neu geladen oder über
 * Zurück/Vor wieder aufgerufen (auch aus dem Zwischenspeicher des Browsers), beginnt sie immer ganz
 * oben, und der Abschnitt kommt aus der Adresse (Startanimation-Runde 2, Punkt 4).
 * `art`: die Navigationsart des Dokuments (performance.getEntriesByType("navigation")[0].type); sie
 * gilt nur für den ersten Start nach dem Laden, nicht für Wechsel innerhalb der Website.
 */
export function zielAnsteuern(art: string | undefined, ausZwischenspeicher: boolean): boolean {
  if (ausZwischenspeicher) return false;
  return art !== "reload" && art !== "back_forward";
}

