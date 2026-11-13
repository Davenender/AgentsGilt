// Das Licht-Logo: three.js mit dem fertigen God-Rays-Effekt der Bibliothek
// „postprocessing“ (GodRaysEffect), dazu deren Filmkorn (NoiseEffect).
//
// Aufbau:
//   1. In der Szene steht nur eine schwarze Wand. In ihrem Shader werden die
//      Stellen unseres Logos verworfen (discard): die vier Balken in der Form
//      des echten Logos (85 % der Balkenbreite, Enden leicht angespitzt) und
//      der Stern. Dort hat die Wand Löcher und schreibt keine Tiefe.
//   2. Die Lichtscheibe ist NICHT Teil der Szene. Sie wird nur dem
//      GodRaysEffect als Lichtquelle übergeben (durchsichtig, schreibt keine
//      Tiefe). Der Effekt vergleicht sie mit der Tiefe der Wand: Licht kommt
//      nur durch die Löcher.
//   3. Die Lichtscheibe sitzt weit hinter der Wand (100 Einheiten, die Kamera
//      steht 14 davor). Aus diesem Licht zieht der Effekt die Strahlen. Kippt
//      die Wand nur wenig zur Maus, wandert die ferne Scheibe weit zur
//      Gegenseite: Es entsteht ein langer, schmaler Lichtkegel zur Maus hin.
//   4. Derselbe Effekt läuft ein zweites Mal mit ganz kurzer Reichweite (aus
//      einer zweiten, gleichmäßigen Lichtscheibe an derselben Stelle): Er
//      zeigt das Licht direkt in den Öffnungen, damit Balken und Stern als
//      Form lesbar bleiben.
//
// Zu sehen ist deshalb kein Gegenstand, keine Kante und keine Fläche: nur
// feines, körniges, gedimmtes goldenes Licht in der Form unseres Logos. Kein
// Weiß, der Grund bleibt schwarz.
import * as THREE from "three";
import { BlendFunction, EffectComposer, EffectPass, GodRaysEffect, KernelSize, NoiseEffect, RenderPass } from "postprocessing";
import { gsap } from "@/lib/gsap";

/** Was die Zeichen vom Licht wissen müssen, um richtig zu schimmern (alles in CSS-Pixeln der Bühne). */
export type LichtLage = {
  mitteX: number;
  mitteY: number;
  /** Halbe Höhe des Logos. */
  radius: number;
  /** Wohin der Lichtkegel gerade kippt (−1 bis 1 je Achse, y nach unten; 0/0 = gerade). */
  kippX: number;
  kippY: number;
  /** Helligkeit 0 bis 1 (Auftritt). */
  hell: number;
};

export type LichtSzene = {
  lage: LichtLage;
  /**
   * Auftritt: Das Licht blendet auf (sofort, wenn das ruhige Bild schon steht). Ohne weitere
   * Angaben in 1,8 s. Die Startanimation gibt die Dauer vor (Aufbau in Stufen) und erfährt über
   * „beiPegel“ in jedem Schritt, wie hell es gerade ist (0 bis 1).
   */
  zeigen: (sofort: boolean, dauer?: number, kurve?: (x: number) => number, beiPegel?: (pegel: number) => void) => void;
  /**
   * Aufwärmen: Shader übersetzen und die echte Szene in voller Größe mit allen Teilen (Balken,
   * Strahlen, Schein, Nachbearbeitung) einige Bilder lang unsichtbar zeichnen, dann warten, bis die
   * Grafikkarte damit fertig ist. Danach ruckelt der Auftritt nicht mehr.
   */
  aufwaermen: () => Promise<void>;
  /**
   * Probe vor dem Auftritt: Solange sie an ist, steht die Fläche wie später im Bild (voll deckend),
   * die Probebilder sind aber so schwach belichtet, dass nichts zu sehen ist. So bringt der Browser
   * sie wirklich auf den Bildschirm, und die Abstände der Bilder zeigen, was das Gerät unter voller
   * Last schafft.
   */
  probe: (an: boolean) => void;
  /**
   * Probebild: zeichnet einmal das volle Licht mit allen Teilen. Gibt false zurück (und zeichnet
   * nicht), wenn die Grafikkarte mit den vorigen Probebildern nicht nachkommt.
   */
  probeBild: () => boolean;
  /**
   * Folgt das Licht der Maus? Mit `langsam` (Sekunden) dreht es sich zuerst in dieser Zeit weich
   * dorthin, wo die Maus ist (weich anfahren, weich ankommen); danach folgt es ihr wie immer.
   */
  mausFolgen: (ja: boolean, langsam?: number) => void;
  /** Kurz etwas heller aufleuchten (zurück am Seitenanfang). Die Zeichen nahe am Licht leuchten mit. */
  aufleuchten: () => void;
  /** Pegel fest einstellen, ohne Übergang (Testseite: so wird das Stern-Bild der Startanimation aufgenommen). */
  pegel: (wert: number) => void;
  /**
   * Nur mit `nurStern`: Größe des Sterns (0 = Lichtpunkt, 1 = volle Größe), wie weit die Strahlen
   * ausgefahren sind (0 bis 1) und seine Drehung (Bogenmaß).
   */
  sternForm: (mass: number, strahlen: number, dreh: number) => void;
  /**
   * Schonen: Solange die Zeichen des Namens als Ganzes unterwegs sind (Startflug, Welle, Scrollen),
   * tritt das Licht kürzer, aber nur, wenn das Gerät sonst nicht im Takt des Bildschirms bliebe:
   * Dann wird es in jedem zweiten Bild neu gezeichnet statt in jedem. Das Bild selbst ändert sich
   * dadurch nicht. Danach (false) läuft alles wie immer.
   */
  schonen: (ja: boolean) => void;
  ende: () => void;
};

export type LichtWahl = {
  /** Proben je Bildpunkt für die Strahlen (Computer 80, Handy 60). */
  proben: number;
  /** Farbe der Wand = Farbe des Grundes (schwarz). */
  wand: number;
  /** Folgt die Wand der Maus? (Am Handy wiegt sie sich nur leicht.) */
  maus: boolean;
  /**
   * Auftritt in Stufen (Startanimation): Zuerst leuchtet nur der Stern, so schwach wie das Bild,
   * das bis dahin an seiner Stelle stand („stern“ = seine Helligkeit zu Beginn, 0 bis 1). Dann
   * öffnen sich die vier Balken und werden heller, zuletzt wachsen die langen Strahlen nach außen.
   * Die Maus bleibt aus, bis mausFolgen(true) gerufen wird. Ohne diese Angabe geht alles
   * zusammen an, und die Maus wirkt sofort.
   */
  stufen?: {
    stern: number;
    /** Dauer der drei Stufen in Sekunden: Stern wird heller, Balken kommen, Strahlen wachsen. */
    zeiten: [stern: number, balken: number, strahlen: number];
  };
  /**
   * Wörter-Feld: Die Wand hat nur den Stern als Öffnung (keine Balken). Er lässt sich aus einem
   * Lichtpunkt wachsen lassen und drehen (sternForm()), leuchtet satter und im Kern heller und
   * atmet deutlicher.
   */
  nurStern?: boolean;
  /** Wird nach jedem Bild gerufen, in dem sich das Licht bewegt hat. */
  beiBild?: (lage: LichtLage) => void;
  /** Wird einmal gerufen, wenn das Gerät nicht flüssig mitkommt oder die Grafik ausfällt: Dann gehört das ruhige Bild hin. */
  beiAusfall?: () => void;
};

// Maße der Szene (wie beim Vorbild): Die Kamera steht 14 vor der Wand; bei einem Logo von rund
// einem Viertel der Bildhöhe ergibt das ein Sichtfeld von 35°. Die Lichtscheibe sitzt 100 hinter der Wand.
const ABSTAND = 14;
const TIEFE = 100;
// Halbe Höhe des Logos und Radius der Lichtscheibe, beides in Einheiten der Szene. Die Scheibe ist
// so groß, dass sie das Logo auch dann noch beleuchtet, wenn sie beim Kippen weit zur Seite wandert.
const LOGO = 1.2;
const SCHEIBE = 44;
// Der Stern ist in der Szene etwas größer als im Logo (Faktor 1/0,854): Er behält die Größe, die er
// seit der dritten Runde hat, während die Balken wieder die echten Maße des Logos haben.
const STERN = 0.4437 / 0.854;
// Wie stark die Wand kippt (Bogenmaß bei voller Auslenkung der Maus). Wegen der fernen Scheibe genügt wenig.
// Nach oben und unten kippt sie etwas stärker als zur Seite: So zeigt der Lichtkegel in den Bildecken
// wie beim Vorbild leicht steiler als die Diagonale.
const KIPP = 0.16;
const KIPP_HOCH = 1.25;
// Im Umkreis des halben Logos um ihre Mitte leuchtet die Scheibe schwächer (Anteil ihres Radius).
const KERN = (0.5855 * LOGO * (ABSTAND + TIEFE)) / ABSTAND / SCHEIBE;
// Die langen Strahlen (mit dem Vorbild abgeglichen, siehe unten beim Effekt).
const STRAHL_DICHTE = 0.77;
const STRAHL_BELICHTUNG = 0.21;
// Die langen Strahlen sind von sich aus weich. Ihr Zwischenbild hat deshalb höchstens so viele
// Bildpunkte wie bei einem Fenster von 1440 × 900 in halber Auflösung: In großen Fenstern und bei
// doppelter Pixeldichte kostet das Licht dann nicht mehr als dort.
const STRAHL_PUNKTE = 330000;

const FLAECHE = `
varying vec2 vLage;
void main() {
  vLage = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export function starteLichtSzene(halter: HTMLElement, anker: HTMLElement, wahl: LichtWahl): LichtSzene {
  const leinwand = document.createElement("canvas");
  leinwand.className = "ag-ln__licht";
  halter.prepend(leinwand);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
    // Die Zwischenbilder haben 16 Bit je Farbe (sonst zeigt das dunkle Licht Stufen). Kann das Gerät
    // nicht in solche Bilder zeichnen, bliebe alles schwarz: Dann lieber gleich das ruhige Bild.
    if (!renderer.extensions.has("EXT_color_buffer_float") && !renderer.extensions.has("EXT_color_buffer_half_float")) {
      renderer.dispose();
      renderer.forceContextLoss();
      throw new Error("Licht: Das Gerät kann nicht in 16-Bit-Zwischenbilder zeichnen.");
    }
  } catch (fehler) {
    // Kein WebGL oder zu wenig: nichts zurücklassen, die Seite zeigt dann das ruhige Bild.
    leinwand.remove();
    throw fehler;
  }
  // Pixeldichte der Zeichenfläche: höchstens 2-fach (ruckelt das Gerät, sinkt diese Grenze).
  let grenze = 2;
  let dichte = Math.min(window.devicePixelRatio || 1, grenze);
  renderer.setPixelRatio(dichte);

  const szene = new THREE.Scene();
  // Der Grund hinter den Löchern hat genau die Farbe der Wand. Als Hintergrund der Szene
  // rechnet three.js die Farbe richtig in den Arbeitsfarbraum um.
  szene.background = new THREE.Color(wahl.wand);
  const kamera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  kamera.position.set(0, 0, ABSTAND);

  const uHell = { value: 0 };
  const uZeit = { value: 0 };
  const uBalken = { value: 1 };
  // Linear gerechnete Farben des Lichts: Gold #f0a83a, in der Mitte ein Hauch heller (#ffd27a).
  // Im Wörter-Feld satter und wärmer, mit hellem Kern (dort wird die Mitte nicht abgedunkelt).
  const uGold = { value: wahl.nurStern ? new THREE.Vector3(0.96, 0.37, 0.022) : new THREE.Vector3(0.871, 0.392, 0.042) };
  const uGoldHell = { value: wahl.nurStern ? new THREE.Vector3(1.0, 0.74, 0.3) : new THREE.Vector3(1.0, 0.644, 0.195) };
  const uKernKraft = { value: wahl.nurStern ? 1.25 : 0.7 };
  // Wörter-Feld: Größe (0 bis 1) und Drehung des Sterns.
  const uMass = { value: 1 };
  const uDreh = { value: 0 };
  const wegwerfen: { dispose: () => void }[] = [];
  const merken = <T extends { dispose: () => void }>(ding: T) => {
    wegwerfen.push(ding);
    return ding;
  };

  // ── Die Wand mit dem Logo-Loch. Sie hat die Farbe des Grundes, man sieht sie nicht.
  const WEIT = 80;
  const wandStoff = merken(
    new THREE.ShaderMaterial({
      uniforms: { uFarbe: { value: new THREE.Color(wahl.wand) }, uWeite: { value: WEIT / LOGO }, uStern: { value: STERN }, uBalken, uNurStern: { value: wahl.nurStern ? 1 : 0 }, uMass, uDreh },
      vertexShader: FLAECHE,
      fragmentShader: `
        uniform vec3 uFarbe;
        uniform float uWeite;
        uniform float uStern;
        // Wie weit die Balken geöffnet sind: 0 = zu (nur der Stern ist offen), 1 = volle Breite.
        uniform float uBalken;
        // Wörter-Feld: uNurStern = 1 lässt nur den Stern offen; uMass ist seine Größe (0 = Punkt,
        // 1 = volle Größe), uDreh seine Drehung.
        uniform float uNurStern;
        uniform float uMass;
        uniform float uDreh;
        varying vec2 vLage;
        // Auf welcher Seite der Kante a→b liegt p? (Kleiner oder gleich 0: rechts davon.)
        float seite(vec2 p, vec2 a, vec2 b) {
          return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        }
        // Eine der vier Balken-Öffnungen (das Logo ist an beiden Achsen gespiegelt). Form und Winkel
        // sind die des Balkens aus dem Logo (components/neu/Marke.tsx, auf das Außenmaß 1 gebracht):
        // Die Außenkante A→B ist unverändert, die Innenkante liegt etwas weiter außen (Breite 85 %
        // des Balkens), und die beiden stumpfen Enden sind nur leicht angespitzt (Spitzen T1 und T2).
        bool imBalken(vec2 p) {
          p = abs(p);
          vec2 a = vec2(0.1299, 0.9957);
          vec2 b = vec2(1.0, 0.1342);
          vec2 t2 = vec2(0.8758, 0.0942);
          vec2 c = vec2(0.7516, 0.1342);
          vec2 d = vec2(0.1299, 0.7529);
          vec2 t1 = vec2(0.0899, 0.8743);
          // Beim Auftritt öffnen sich die Balken von ihrer Mittellinie aus (wie eine Blende): erst
          // feine Schlitze, dann die volle Breite. Die beiden Spitzen bleiben stehen.
          vec2 mLinks = (a + d) * 0.5;
          vec2 mRechts = (b + c) * 0.5;
          a = mix(mLinks, a, uBalken);
          d = mix(mLinks, d, uBalken);
          b = mix(mRechts, b, uBalken);
          c = mix(mRechts, c, uBalken);
          // Die Ecken laufen im Uhrzeigersinn: innen liegt, was rechts jeder Kante liegt.
          return seite(p, a, b) <= 0.0 && seite(p, b, t2) <= 0.0 && seite(p, t2, c) <= 0.0 && seite(p, c, d) <= 0.0 && seite(p, d, t1) <= 0.0 && seite(p, t1, a) <= 0.0;
        }
        // Der Stern in der Mitte: vier lange, feine Spitzen.
        bool imStern(vec2 p) {
          float q = 0.536;
          return pow(pow(abs(p.x), q) + pow(abs(p.y), q), 1.0 / q) < uStern;
        }
        void main() {
          // Position auf der Wand in Logo-Einheiten (Außenmaß des Logos = 1 = Rand des Platzes).
          vec2 p = vLage * uWeite;
          // Außerhalb des Logos ist die Wand geschlossen: gleich fertig (spart die Rechnung für fast alle Bildpunkte).
          if (max(abs(p.x), abs(p.y)) > 1.02) {
            gl_FragColor = vec4(uFarbe, 1.0);
            return;
          }
          if (uNurStern > 0.5) {
            float c = cos(uDreh);
            float s = sin(uDreh);
            vec2 r = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
            float q = 0.536;
            if (pow(pow(abs(r.x), q) + pow(abs(r.y), q), 1.0 / q) < uStern * uMass) discard;
            gl_FragColor = vec4(uFarbe, 1.0);
            return;
          }
          // An den Stellen des Logos hat die Wand Löcher: keine Farbe, keine Tiefe.
          if ((uBalken > 0.004 && imBalken(p)) || imStern(p)) discard;
          gl_FragColor = vec4(uFarbe, 1.0);
        }`,
    }),
  );
  const wand = new THREE.Mesh(merken(new THREE.PlaneGeometry(2, 2)), wandStoff);
  // Die Wand ist viel größer als das Bild, damit auch gekippt kein Rand zu sehen ist.
  wand.scale.setScalar(WEIT);
  const logo = new THREE.Group();
  logo.add(wand);
  szene.add(logo);

  // ── Die Lichtscheibe: nicht in der Szene, nur Lichtquelle des God-Rays-Effekts.
  // Gold, in der Mitte nur einen Hauch heller, am Rand weich aus (keine sichtbare Scheibe).
  // Ihre Störung läuft langsam: feine Speichen um die Mitte, aus denen die Strahlen werden.
  const scheibe = new THREE.Mesh(
    merken(new THREE.PlaneGeometry(2, 2)),
    merken(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uHell, uZeit, uKern: { value: KERN }, uGold, uGoldHell, uKernKraft },
        vertexShader: FLAECHE,
        fragmentShader: `
          uniform float uHell;
          uniform float uZeit;
          uniform float uKern;
          uniform vec3 uGold;
          uniform vec3 uGoldHell;
          uniform float uKernKraft;
          varying vec2 vLage;
          float hash(vec2 p) {
            vec3 q = fract(vec3(p.xyx) * 0.1031);
            q += dot(q, q.yzx + 33.33);
            return fract((q.x + q.y) * q.z);
          }
          float rausch(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          void main() {
            float r = length(vLage);
            // Die Störung hängt nur an der Richtung um die Mitte (auf einem Kreis abgetastet, damit
            // sie nahtlos umläuft) und verändert sich langsam: So zerfällt das Licht in feine Speichen.
            vec2 richtung = vLage / max(r, 0.0001);
            float zeit = uZeit * 0.5;
            float grob = rausch(richtung * 8.0 + vec2(zeit * 0.11, 7.3 - zeit * 0.07));
            float fein = rausch(richtung * 18.0 + vec2(31.7 - zeit * 0.09, zeit * 0.13));
            float speichen = mix(0.18, 1.0, smoothstep(0.3, 0.72, grob * 0.62 + fein * 0.38));
            // Linear gerechnete Farben: Gold #f0a83a, in der Mitte ein Hauch heller (#ffd27a). Kein Weiß.
            vec3 gold = uGold;
            vec3 hell = uGoldHell;
            vec3 farbe = mix(mix(gold, hell, 0.6), gold, smoothstep(0.0, uKern, r));
            // Genau in der Mitte (hinter dem Stern, solange die Wand gerade steht) leuchtet die Scheibe
            // schwächer: Sonst überstrahlt der Stern, durch den das meiste Licht fällt, alles andere.
            float kraft = (1.0 - smoothstep(0.45, 1.0, r)) * speichen * mix(uKernKraft, 1.0, smoothstep(uKern * 0.7, uKern * 1.25, r));
            gl_FragColor = vec4(farbe * kraft * uHell, 1.0);
          }`,
      }),
    ),
  );
  scheibe.frustumCulled = false;
  scheibe.scale.setScalar(SCHEIBE);

  // ── Eine zweite, gleichmäßige Lichtscheibe an derselben Stelle (auch sie nicht in der Szene, nur
  // Lichtquelle): Aus ihr kommt das Licht, das man direkt in den Öffnungen sieht. Ohne Speichen,
  // damit Balken und Stern ruhig und gleichmäßig leuchten.
  const direktScheibe = new THREE.Mesh(
    scheibe.geometry,
    merken(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uHell, uKern: { value: KERN }, uGold, uGoldHell },
        vertexShader: FLAECHE,
        fragmentShader: `
          uniform float uHell;
          uniform float uKern;
          uniform vec3 uGold;
          uniform vec3 uGoldHell;
          varying vec2 vLage;
          void main() {
            float r = length(vLage);
            vec3 gold = uGold;
            vec3 hell = uGoldHell;
            vec3 farbe = mix(mix(gold, hell, 0.6), gold, smoothstep(0.0, uKern, r));
            gl_FragColor = vec4(farbe * (1.0 - smoothstep(0.45, 1.0, r)) * uHell, 1.0);
          }`,
      }),
    ),
  );
  direktScheibe.frustumCulled = false;
  direktScheibe.scale.setScalar(SCHEIBE);

  // ── Nachbearbeitung: der fertige God-Rays-Effekt und das Filmkorn der Bibliothek.
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(szene, kamera));
  const strahlen = new GodRaysEffect(kamera, scheibe, {
    samples: wahl.proben,
    // Mit dem Vorbild abgeglichen (bei 80 Proben): feine Strahlen, gedimmt, nichts überstrahlt.
    // Dichte 0,77 heißt: Jeder Bildpunkt sucht nur auf gut drei Vierteln des Wegs zur Lichtquelle
    // nach Licht. Dadurch laufen die Strahlen in einigem Abstand aus und werden dann wirklich schwarz.
    // Bei weniger Proben ist jeder Schritt länger; Abklingen und Gewicht werden umgerechnet,
    // damit das Licht am Handy gleich aussieht.
    density: STRAHL_DICHTE,
    decay: Math.pow(0.94, 80 / wahl.proben),
    weight: (0.2 * 80) / wahl.proben,
    // Die Öffnungen haben die Breite der echten Balken, es fällt also mehr Licht hindurch als durch
    // die früheren schmalen Splitter (damals Belichtung 0,42). Mit 0,21 sind die langen Strahlen
    // wieder so stark und so lang wie im Stand 8c455bd: Mittelwert der Helligkeit in Ringen
    // oberhalb des Logos (130–200 / 200–300 / 300–400 px) rund 46 / 16 / 6, Reichweite rund 430 px.
    exposure: STRAHL_BELICHTUNG,
    clampMax: 1,
    resolutionScale: 0.5,
    kernelSize: KernelSize.MEDIUM,
    blur: true,
  });
  // Derselbe Effekt ein zweites Mal, mit ganz kurzer Reichweite: Er zeigt das Licht direkt in den
  // Öffnungen. Die langen Strahlen allein lassen die Außenkanten der Balken verschwinden (ein
  // Balken liegt quer zu den Strahlen); so bleiben die vier Balken und der Stern als Form lesbar.
  const direkt = new GodRaysEffect(kamera, direktScheibe, {
    samples: 30,
    // Kurze Reichweite: Jeder Bildpunkt sucht nur auf den ersten 15 % des Wegs zur Lichtquelle, und
    // das Licht klingt nach wenigen Schritten ab. Gedimmt, nichts überstrahlt.
    density: 0.15,
    decay: 0.82,
    weight: 0.3,
    // So eingestellt, dass Balken und Stern zusammen mit den langen Strahlen bei rund 205 von 255
    // bleiben: klar erkennbar, nichts überstrahlt.
    exposure: 0.24,
    clampMax: 1,
    resolutionScale: 0.5,
    kernelSize: KernelSize.SMALL,
    blur: true,
  });
  // Korn wie beim Vorbild: nur im Licht sichtbar, das Schwarz bleibt schwarz und sauber.
  const korn = new NoiseEffect({ blendFunction: BlendFunction.COLOR_DODGE });
  korn.blendMode.opacity.value = 0.2;
  composer.addPass(new EffectPass(kamera, strahlen, direkt, korn));

  // ── Größe und Lage: Das Logo sitzt genau auf seinem Platz im Kopfbereich.
  const lage: LichtLage = { mitteX: 0, mitteY: 0, radius: 1, kippX: 0, kippY: 0, hell: 0 };
  let breite = 1;
  let hoehe = 1;
  let neu = true;
  const vermessen = () => {
    const r = halter.getBoundingClientRect();
    const a = anker.getBoundingClientRect();
    breite = Math.max(1, r.width);
    hoehe = Math.max(1, r.height);
    dichte = Math.min(window.devicePixelRatio || 1, grenze);
    renderer.setPixelRatio(dichte);
    renderer.setSize(breite, hoehe, false);
    // Zwischenbild der langen Strahlen: halbe Auflösung, in großen Fenstern weniger (siehe STRAHL_PUNKTE).
    const anteil = Math.min(0.5, Math.sqrt(STRAHL_PUNKTE / (breite * hoehe * dichte * dichte)));
    if (Math.abs(strahlen.resolution.scale - anteil) > 0.001) strahlen.resolution.scale = anteil;
    composer.setSize(breite, hoehe);
    // Die Lichtquelle jedes Effekts wird nur so fein gezeichnet wie sein Zwischenbild: Sie wird ohnehin
    // gleich weichgezeichnet und verkleinert (die Bibliothek nähme dafür die volle Auflösung).
    for (const effekt of [strahlen, direkt]) {
      (effekt as unknown as { renderTargetLight: THREE.WebGLRenderTarget }).renderTargetLight.setSize(effekt.resolution.width, effekt.resolution.height);
    }
    // Das Bild der Szene selbst ist nur schwarz. Gebraucht wird ihre Tiefe (wo die Wand Löcher hat),
    // und die nur so fein wie das Zwischenbild der Öffnungen: Die Vorstufe wird deshalb klein
    // gerechnet. Das fertige Bild (Strahlen, Licht in den Öffnungen, Korn) entsteht weiter in voller Auflösung.
    const vb = direkt.resolution.width;
    const vh = direkt.resolution.height;
    composer.inputBuffer.setSize(vb, vh);
    composer.outputBuffer.setSize(vb, vh);
    // Auch die Kopie der Tiefe, aus der die Effekte lesen (in der Bibliothek ein internes Zwischenbild).
    (composer as unknown as { depthRenderTarget: THREE.WebGLRenderTarget | null }).depthRenderTarget?.setSize(vb, vh);
    lage.mitteX = a.left + a.width / 2 - r.left;
    lage.mitteY = a.top + a.height / 2 - r.top;
    lage.radius = Math.max(1, a.height / 2);
    // Das Logo ist in der Szene immer gleich groß und steht immer in der Blickachse: Das Sichtfeld
    // richtet sich nach der Bildhöhe, der Bildausschnitt wird auf die Logo-Mitte verschoben. So sieht
    // das Licht bei jeder Bildgröße und an jeder Stelle gleich aus (am Handy sitzt es im oberen Drittel).
    const sichtHoehe = (hoehe * LOGO) / lage.radius;
    kamera.fov = Math.min(120, THREE.MathUtils.radToDeg(2 * Math.atan(sichtHoehe / 2 / ABSTAND)));
    kamera.aspect = breite / hoehe;
    kamera.setViewOffset(breite, hoehe, breite / 2 - lage.mitteX, hoehe / 2 - lage.mitteY, breite, hoehe);
    neu = true;
  };

  // ── Maus: Die Wand kippt zur Maus; am Handy wiegt sie sich nur leicht.
  const ziel = { x: 0, y: 0 };
  const ist = { x: 0, y: 0 };
  // Wo die Maus zuletzt war. Solange das Licht ihr nicht folgt (Startanimation), wird das nur gemerkt.
  const mausOrt = { x: 0, y: 0 };
  let folgt = !wahl.stufen;
  // Erstes Hindrehen zur Maus (nach der Startanimation): von wo, wie lange schon, wie lange insgesamt.
  let dreh: { vonX: number; vonY: number; zeit: number; dauer: number } | null = null;
  const zeiger = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    const r = halter.getBoundingClientRect();
    // Lage der Maus relativ zur Logo-Mitte, auf die halbe Bildbreite bezogen.
    mausOrt.x = THREE.MathUtils.clamp((ev.clientX - r.left - lage.mitteX) / (breite * 0.5), -1, 1);
    mausOrt.y = THREE.MathUtils.clamp((ev.clientY - r.top - lage.mitteY) / (hoehe * 0.5), -1, 1);
    // Solange sich das Licht zum ersten Mal zur Maus dreht, führt die Bildschleife es dorthin.
    if (!folgt || dreh) return;
    ziel.x = mausOrt.x;
    ziel.y = mausOrt.y;
    wecken();
  };
  const zeigerWeg = () => {
    mausOrt.x = 0;
    mausOrt.y = 0;
    ziel.x = 0;
    ziel.y = 0;
  };
  if (wahl.maus) {
    window.addEventListener("pointermove", zeiger, { passive: true });
    document.documentElement.addEventListener("pointerleave", zeigerWeg);
  }

  // ── Bild für Bild.
  const zustand = { auftritt: 0, blitz: 0 };
  let beiPegel: ((pegel: number) => void) | undefined;
  let zeit = 0;
  let letzte = 0;
  let rahmen = 0;
  let sichtbar = true;
  let vorbei = false;
  let gezeigt = false;
  let bildNr = 0;
  // Schonen: Solange die Zeichen des Namens fliegen oder eine Welle läuft, tritt das Licht kürzer,
  // aber nur, wenn das Gerät sonst nicht mitkäme: Schafft es jedes Bild im Takt des Bildschirms,
  // wird auch das Licht in jedem Bild gezeichnet, sonst in jedem zweiten.
  let schonend = false;
  let lichtImVorigenBild = false;
  // Kürzester Abstand zweier Bilder in letzter Zeit: der Takt des Bildschirms.
  let takt = 1 / 60;
  // Wie schnell das Licht der Maus nachgeführt wird (je Sekunde).
  const FOLGE_TEMPO = 3.2;
  // Wörter-Feld: wie weit die Strahlen des Sterns ausgefahren sind (0 bis 1).
  let sternStrahlen = wahl.nurStern ? 0 : 1;
  // Messung, ob das Gerät flüssig mitkommt.
  let gezeichnet = false; // Hat das vorige Bild gezeichnet?
  let warm = 0;
  let dauerSumme = 0;
  let dauerZahl = 0;
  let geprueft = false; // Gab es schon ein flüssiges Messfenster?
  let schlecht = 0; // ruckelnde Messfenster in Folge
  let gemeldet = false;

  // Das Gerät kommt nicht mit oder die Grafik ist weg: einmal melden (die Seite zeigt dann das ruhige Bild).
  const ausfall = () => {
    if (vorbei || gemeldet) return;
    gemeldet = true;
    wahl.beiAusfall?.();
  };
  leinwand.addEventListener("webglcontextlost", ausfall);

  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei) return;
    const echt = letzte ? (jetzt - letzte) / 1000 : 0.016;
    const dt = Math.min(0.05, echt);
    const warGezeichnet = gezeichnet && letzte > 0;
    letzte = jetzt;
    gezeichnet = false;
    zeit += dt;
    bildNr += 1;

    // Kommt das Gerät mit? Gemessen wird nur, wie lange es nach einem gezeichneten Bild bis zum
    // nächsten dauert (absichtlich ausgelassene Bilder schönen die Messung nicht), und erst nach
    // dem Auftritt (das Laden der Seite zählt nicht als Ruckeln). Je Fenster 30 Bilder.
    if (warGezeichnet && zustand.auftritt >= 1) {
      warm += 1;
      if (warm > 10) {
        dauerSumme += echt;
        dauerZahl += 1;
      }
    }
    if (dauerZahl >= 30) {
      if (dauerSumme / dauerZahl > 0.03) {
        // Im Schnitt über 30 ms je Bild: erst gröber rechnen; ruckelt es auch dann noch
        // (und mindestens zwei Fenster in Folge), wird es gemeldet.
        schlecht += 1;
        warm = 0;
        if (dichte > 1.25) {
          grenze = 1.25;
          vermessen();
        } else if (dichte > 1) {
          grenze = 1;
          vermessen();
        } else if (schlecht >= 2) {
          ausfall();
          if (vorbei) return;
        }
      } else {
        schlecht = 0;
        geprueft = true;
      }
      dauerSumme = 0;
      dauerZahl = 0;
    }

    // Takt des Bildschirms: der kürzeste Abstand der letzten Bilder (lässt langsam wieder nach).
    if (echt > 0.003) takt = Math.min(echt, takt * 1.02);
    // Kommt das Gerät gerade im Takt mit? (Das vorige Bild kam ohne Verzug.)
    const imTakt = echt <= takt * 1.3;

    // Vor dem Auftritt ist vom Licht nichts zu sehen: einmal den dunklen Grund zeichnen, dann
    // warten (zeigen() weckt wieder).
    if (!gezeigt && !neu) return;

    const vorX = ist.x;
    const vorY = ist.y;
    if (dreh) {
      // Erstes Hindrehen: weich anfahren und weich ankommen, dorthin, wo die Maus gerade ist.
      dreh.zeit += dt;
      const x = Math.min(1, dreh.zeit / dreh.dauer);
      const a = x * x * (3 - 2 * x);
      ist.x = ziel.x = dreh.vonX + (mausOrt.x - dreh.vonX) * a;
      ist.y = ziel.y = dreh.vonY + (mausOrt.y - dreh.vonY) * a;
      if (x >= 1) dreh = null;
    } else {
      const zug = 1 - Math.exp(-dt * FOLGE_TEMPO);
      ist.x += (ziel.x - ist.x) * zug;
      ist.y += (ziel.y - ist.y) * zug;
    }
    // „Bewegt“ heißt: Die Zeichen müssen davon erfahren (Maus, Auftritt bis zum letzten Wert, neue Maße).
    // Helligkeit, die die Zeichen erfahren: die Lichtstärke, beim Aufleuchten kurz etwas mehr.
    const hell = staerke(zustand.auftritt) * (1 + zustand.blitz);
    const bewegt = Math.abs(ist.x - vorX) + Math.abs(ist.y - vorY) > 0.0005 || lage.hell !== hell || neu;

    // In Ruhe genügt jedes zweite Bild (Atmen, Filmkorn und das langsame Wiegen am Handy).
    // Solange nicht feststeht, dass das Gerät flüssig mitkommt, wird jedes Bild gezeichnet.
    // Beim Schonen (die Zeichen fliegen): jedes Bild, wenn das Gerät im Takt bleibt, sonst jedes zweite.
    const jetztZeichnen = schonend && !neu ? imTakt || !lichtImVorigenBild : bewegt || !geprueft || schlecht > 0 || bildNr % 2 === 0;
    lichtImVorigenBild = jetztZeichnen;
    if (jetztZeichnen) {
      zeichne(dt);
      gezeichnet = true;

      lage.hell = hell;
      if (bewegt) wahl.beiBild?.(lage);
      neu = false;
    }
    wecken();
  };

  // ── Auftritt in Stufen (Startanimation), von innen nach außen, jede weich in die nächste:
  // erst wird der Stern heller, dann kommen die vier Balken, dann wachsen die Strahlen.
  // „p“ läuft gleichmäßig von 0 bis 1 über die ganze Dauer; jede Stufe beginnt kurz bevor die vorige endet.
  const stufenWerte = (p: number) => {
    const z = wahl.stufen?.zeiten ?? [1, 1, 1];
    const ganz = z[0] + z[1] + z[2];
    const t = p * ganz;
    const weich = (von: number, dauer: number) => {
      const x = Math.min(1, Math.max(0, (t - von) / dauer));
      return x * x * (3 - 2 * x);
    };
    const ueber = 0.15;
    return { stern: weich(0, z[0]), balken: weich(z[0] - ueber, z[1] + ueber), strahlen: weich(z[0] + z[1] - ueber, z[2] + ueber) };
  };
  /** Lichtstärke 0 bis 1: Stern und Balken machen je ein Viertel aus, die Strahlen die Hälfte. */
  const staerke = (p: number) => {
    if (!wahl.stufen) return p;
    const w = stufenWerte(p);
    return 0.25 * w.stern + 0.25 * w.balken + 0.5 * w.strahlen;
  };

  // ── Sparen: Die Strahlen werden nur dort gerechnet, wo überhaupt Licht hinkommen kann.
  // Der Effekt sucht von jedem Bildpunkt aus nur ein Stück weit (Anteil „Dichte“) in Richtung der
  // Lichtquelle nach Licht. Licht fällt nur durch die Öffnungen (höchstens das Außenmaß des Logos).
  // Beleuchtet sein können also nur Punkte zwischen den Öffnungen und deren von der Lichtquelle aus
  // um 1/(1 − Dichte) gestrecktem Bild. Außerhalb dieses Kastens liefert der Effekt genau Schwarz:
  // Das Zwischenbild wird dort einfach nicht gerechnet. Am Bild ändert das nichts.
  const blick = new THREE.Vector3();
  const kaesten = new Map<GodRaysEffect, string>();
  const begrenze = (effekt: GodRaysEffect, quelle: THREE.Mesh) => {
    const zielBild = (effekt as unknown as { renderTargetB: THREE.WebGLRenderTarget }).renderTargetB;
    if (!zielBild) return;
    const b = zielBild.width;
    const h = zielBild.height;
    blick.copy(quelle.position).project(kamera);
    const lx = (blick.x * 0.5 + 0.5) * breite;
    const ly = (1 - (blick.y * 0.5 + 0.5)) * hoehe;
    const d = Math.min(0.97, effekt.godRaysMaterial.density);
    const streck = d / (1 - d);
    // Öffnungen: Außenmaß des Logos, dazu der Rand, um den der Weichzeichner das Licht verbreitert
    // (er arbeitet im Zwischenbild: je gröber das ist, desto breiter der Rand).
    const rho = lage.radius * 1.03 + 11 / Math.max(0.1, effekt.resolution.scale);
    const fx = lage.mitteX + streck * (lage.mitteX - lx);
    const fy = lage.mitteY + streck * (lage.mitteY - ly);
    const fr = (1 + streck) * rho;
    const x0 = Math.max(0, Math.min(lage.mitteX - rho, fx - fr));
    const x1 = Math.min(breite, Math.max(lage.mitteX + rho, fx + fr));
    const y0 = Math.max(0, Math.min(lage.mitteY - rho, fy - fr));
    const y1 = Math.min(hoehe, Math.max(lage.mitteY + rho, fy + fr));
    // In Bildpunkte des Zwischenbilds (Ursprung unten links), auf Vielfache von 8 gerundet.
    const sx = b / breite;
    const sy = h / hoehe;
    const px0 = Math.max(0, Math.floor((x0 * sx) / 8) * 8);
    const px1 = Math.min(b, Math.ceil((x1 * sx) / 8) * 8);
    const py0 = Math.max(0, Math.floor(((hoehe - y1) * sy) / 8) * 8);
    const py1 = Math.min(h, Math.ceil(((hoehe - y0) * sy) / 8) * 8);
    const schluessel = `${px0},${py0},${px1},${py1},${b},${h}`;
    if (kaesten.get(effekt) !== schluessel) {
      // Der Kasten hat sich geändert: einmal das ganze Zwischenbild leeren (was draußen lag, bleibt schwarz).
      kaesten.set(effekt, schluessel);
      const vorher = renderer.getRenderTarget();
      zielBild.scissorTest = false;
      renderer.setRenderTarget(zielBild);
      renderer.clear(true, false, false);
      renderer.setRenderTarget(vorher);
    }
    zielBild.scissor.set(px0, py0, Math.max(1, px1 - px0), Math.max(1, py1 - py0));
    zielBild.scissorTest = true;
  };

  /** Wand und Lichtscheiben in ihre Lage bringen (kx, ky: Kippen zur Maus). */
  const stelleEin = (kx: number, ky: number) => {
    // Die Wand dreht sich zur Maus hin …
    logo.rotation.set(ky * KIPP * KIPP_HOCH, kx * KIPP, 0);
    logo.updateMatrixWorld();
    // … und die Lichtscheibe sitzt weit hinter ihr auf ihrer Achse: Sie wandert zur Gegenseite.
    scheibe.position.set(0, 0, -TIEFE).applyQuaternion(logo.quaternion);
    scheibe.quaternion.copy(logo.quaternion);
    scheibe.updateMatrix();
    scheibe.updateMatrixWorld();
    direktScheibe.position.copy(scheibe.position);
    direktScheibe.quaternion.copy(scheibe.quaternion);
    direktScheibe.updateMatrix();
    direktScheibe.updateMatrixWorld();
  };

  /** Ein Bild des Lichts im jetzigen Zustand zeichnen. */
  const zeichne = (dt: number) => {
    uZeit.value = zeit;
    // Das Licht pulsiert nur ganz leicht (im Wörter-Feld atmet der Stern deutlicher).
    const atem = 1 + (wahl.nurStern ? 0.07 : 0.02) * Math.sin(zeit * 0.7);
    if (wahl.stufen) {
      // Der Stern beginnt so schwach wie das Bild, das vorher an seiner Stelle stand.
      const w = stufenWerte(zustand.auftritt);
      uHell.value = (wahl.stufen.stern + (1 - wahl.stufen.stern) * w.stern) * atem * (1 + zustand.blitz);
      uBalken.value = w.balken;
      strahlen.godRaysMaterial.exposure = STRAHL_BELICHTUNG * w.strahlen;
      strahlen.godRaysMaterial.density = 0.3 + (STRAHL_DICHTE - 0.3) * w.strahlen;
    } else if (wahl.nurStern) {
      uHell.value = zustand.auftritt * atem;
      strahlen.godRaysMaterial.exposure = STRAHL_BELICHTUNG * 1.5 * sternStrahlen;
      strahlen.godRaysMaterial.density = 0.3 + (STRAHL_DICHTE - 0.3) * sternStrahlen;
    } else {
      uHell.value = zustand.auftritt * atem * (1 + zustand.blitz);
    }
    // Ohne Maus wiegt sich die Wand ganz leicht von selbst.
    const kx = ist.x + Math.sin(zeit * 0.31) * (wahl.maus ? 0.03 : 0.05);
    const ky = ist.y + Math.sin(zeit * 0.23 + 1.3) * (wahl.maus ? 0.02 : 0.035);
    stelleEin(kx, ky);
    begrenze(strahlen, scheibe);
    begrenze(direkt, direktScheibe);
    composer.render(dt);
    lage.kippX = kx;
    lage.kippY = ky * KIPP_HOCH;
  };

  const DIREKT_BELICHTUNG = direkt.godRaysMaterial.exposure;
  /**
   * Die echte Szene in voller Größe mit allen Teilen zeichnen (Aufwärmen und Probe). „dunkel“ lässt
   * dieselbe Rechnung laufen, belichtet das Ergebnis aber so schwach, dass nichts zu sehen ist: So
   * kann die Fläche bei der Probe ganz normal im Bild stehen.
   */
  const vollZeichnen = (dt: number, dunkel = false) => {
    const vorher = { hell: uHell.value, balken: uBalken.value, mass: uMass.value };
    // 0,00015: Das hellste Licht bleibt damit unter einer halben Stufe von 255, also wirklich schwarz.
    const schwach = dunkel ? 0.00015 : 1;
    uZeit.value = zeit;
    uHell.value = 1;
    uBalken.value = 1;
    uMass.value = 1;
    strahlen.godRaysMaterial.exposure = STRAHL_BELICHTUNG * (wahl.nurStern ? 1.5 : 1) * schwach;
    strahlen.godRaysMaterial.density = STRAHL_DICHTE;
    direkt.godRaysMaterial.exposure = DIREKT_BELICHTUNG * schwach;
    stelleEin(0, 0);
    begrenze(strahlen, scheibe);
    begrenze(direkt, direktScheibe);
    composer.render(dt);
    direkt.godRaysMaterial.exposure = DIREKT_BELICHTUNG;
    strahlen.godRaysMaterial.exposure = STRAHL_BELICHTUNG * (wahl.nurStern ? 1.5 : 1);
    uHell.value = vorher.hell;
    uBalken.value = vorher.balken;
    uMass.value = vorher.mass;
    // Was jetzt auf der (unsichtbaren) Fläche steht, ist nicht der echte Zustand: beim Auftritt neu zeichnen.
    neu = true;
  };

  // Warten, bis die Grafikkarte alles Bisherige wirklich gezeichnet hat: einen Bildpunkt zurücklesen.
  // (gl.finish() wartet in Chrome nicht; das Zurücklesen schon.)
  const einPunkt = new Uint8Array(4);
  // Marken im Befehlsstrom der Grafikkarte, eine je Probebild: Sie zeigen, wie weit sie zurückliegt.
  const marken: WebGLSync[] = [];
  const markenWeg = () => {
    try {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      for (const m of marken) gl.deleteSync(m);
    } catch {
      /* dann räumt der Browser sie mit der Fläche ab */
    }
    marken.length = 0;
  };
  const warteAufGrafik = () => {
    try {
      const gl = renderer.getContext();
      renderer.setRenderTarget(null);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, einPunkt);
    } catch {
      /* ohne Warten weiter */
    }
  };

  // Nur rechnen, solange das Licht zu sehen ist.
  const wecken = () => {
    if (rahmen || vorbei || !sichtbar || document.hidden) return;
    rahmen = requestAnimationFrame(bild);
  };
  const beobachter = new ResizeObserver(() => {
    vermessen();
    wecken();
  });
  beobachter.observe(halter);
  beobachter.observe(anker);
  const pause = () => {
    // Nach einer Pause die Messung neu beginnen: Sie soll nicht als Ruckeln zählen.
    letzte = 0;
    gezeichnet = false;
    warm = 0;
    dauerSumme = 0;
    dauerZahl = 0;
    wecken();
  };
  const waechter = new IntersectionObserver((eintraege) => {
    // Kommen mehrere Meldungen auf einmal, zählt die letzte (der jetzige Stand).
    sichtbar = eintraege[eintraege.length - 1].isIntersecting;
    pause();
  });
  waechter.observe(halter);
  document.addEventListener("visibilitychange", pause);
  vermessen();
  wecken();

  return {
    lage,
    zeigen: (sofort, dauer = 1.8, kurve, melden) => {
      gezeigt = true;
      // Eine laufende Probe endet hier: Die Fläche gehört wieder dem Stylesheet.
      leinwand.style.opacity = "";
      leinwand.style.transition = "";
      markenWeg();
      beiPegel = melden;
      gsap.killTweensOf(zustand, "auftritt");
      // In Stufen läuft der Pegel gleichmäßig; die Stufen selbst sind weich (stufenWerte).
      gsap.to(zustand, {
        auftritt: 1,
        duration: sofort ? 0.01 : dauer,
        ease: kurve ?? (wahl.stufen ? "none" : "power2.out"),
        onUpdate: () => beiPegel?.(staerke(zustand.auftritt)),
      });
      // Gleich jetzt den echten Zustand zeichnen: Die Fläche wird in diesem Moment sichtbar.
      neu = true;
      if (!vorbei && wahl.stufen) zeichne(0.016);
      wecken();
    },
    aufwaermen: async () => {
      // Alle Shader der Szene übersetzen (die der Nachbearbeitung übersetzt das erste Bild) …
      try {
        renderer.compile(szene, kamera);
      } catch {
        /* dann übersetzt sie das erste Bild */
      }
      // … dann die echte Szene mit allen Teilen fünf Bilder lang unsichtbar zeichnen …
      await new Promise<void>((fertig) => {
        let uebrig = 5;
        const vor = () => {
          if (vorbei) return fertig();
          vollZeichnen(0.016);
          uebrig -= 1;
          if (uebrig > 0) requestAnimationFrame(vor);
          else fertig();
        };
        requestAnimationFrame(vor);
      });
      if (vorbei) return;
      // … und warten, bis die Grafikkarte damit wirklich fertig ist.
      warteAufGrafik();
    },
    probe: (an) => {
      if (vorbei || (an && gezeigt)) return;
      if (an) {
        // Erst ein dunkles Bild, dann die Fläche zeigen: So blitzt nichts auf.
        vollZeichnen(0.016, true);
        leinwand.style.transition = "none";
        leinwand.style.opacity = "1";
      } else {
        leinwand.style.opacity = "";
        leinwand.style.transition = "";
        markenWeg();
      }
    },
    probeBild: () => {
      if (gezeigt || vorbei) return true;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      try {
        // Marken abräumen, bei denen die Grafikkarte schon angekommen ist.
        while (marken.length && gl.getSyncParameter(marken[0], gl.SYNC_STATUS) === gl.SIGNALED) gl.deleteSync(marken.shift()!);
        // Liegt sie mehr als vier Bilder zurück, kommt sie nicht mit: nichts weiter auftürmen.
        if (marken.length > 4) return false;
        vollZeichnen(0.016, true);
        const marke = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (marke) marken.push(marke);
        gl.flush();
      } catch {
        // Ohne solche Marken (sehr alte Browser) wird einfach in jedem Bild gezeichnet.
        vollZeichnen(0.016, true);
      }
      return true;
    },
    sternForm: (mass, strahlenWeit, dreh) => {
      const m = THREE.MathUtils.clamp(mass, 0, 1.2);
      const st = THREE.MathUtils.clamp(strahlenWeit, 0, 1);
      if (m === uMass.value && st === sternStrahlen && dreh === uDreh.value) return;
      uMass.value = m;
      sternStrahlen = st;
      uDreh.value = dreh;
      neu = true;
      wecken();
    },
    pegel: (wert) => {
      gezeigt = true;
      leinwand.style.opacity = "";
      leinwand.style.transition = "";
      gsap.killTweensOf(zustand, "auftritt");
      zustand.auftritt = wert;
      neu = true;
      wecken();
    },
    mausFolgen: (ja, langsam) => {
      folgt = ja;
      if (ja && langsam) {
        // Erstes Hindrehen: in „langsam“ Sekunden weich zur Maus, danach folgt das Licht wie immer.
        dreh = { vonX: ist.x, vonY: ist.y, zeit: 0, dauer: langsam };
      } else {
        dreh = null;
        ziel.x = ja ? mausOrt.x : 0;
        ziel.y = ja ? mausOrt.y : 0;
      }
      wecken();
    },
    aufleuchten: () => {
      if (!gezeigt || zustand.auftritt < 1) return;
      gsap.killTweensOf(zustand, "blitz");
      gsap
        .timeline()
        .to(zustand, { blitz: 0.28, duration: 0.22, ease: "power2.out", onUpdate: wecken })
        .to(zustand, { blitz: 0, duration: 0.9, ease: "power2.inOut", onUpdate: wecken });
    },
    schonen: (ja) => {
      schonend = ja;
      lichtImVorigenBild = false;
      wecken();
    },
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      gsap.killTweensOf(zustand);
      beobachter.disconnect();
      waechter.disconnect();
      document.removeEventListener("visibilitychange", pause);
      leinwand.removeEventListener("webglcontextlost", ausfall);
      window.removeEventListener("pointermove", zeiger);
      document.documentElement.removeEventListener("pointerleave", zeigerWeg);
      strahlen.dispose();
      direkt.dispose();
      korn.dispose();
      wegwerfen.forEach((d) => d.dispose());
      composer.dispose();
      renderer.dispose();
      // Die Zeichenfläche gehört nur dieser Szene: Grafikspeicher sofort freigeben.
      renderer.forceContextLoss();
      leinwand.remove();
    },
  };
}
