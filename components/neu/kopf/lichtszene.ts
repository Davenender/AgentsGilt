// Das Licht-Logo: three.js mit dem fertigen God-Rays-Effekt der Bibliothek
// „postprocessing“ (GodRaysEffect), dazu deren Filmkorn (NoiseEffect).
//
// Aufbau:
//   1. In der Szene steht nur eine schwarze Wand. In ihrem Shader werden die
//      Stellen unseres Logos verworfen (discard): vier schmale, an den Enden
//      spitz auslaufende Öffnungen und der Stern. Dort hat die Wand Löcher und
//      schreibt keine Tiefe.
//   2. Die Lichtscheibe ist NICHT Teil der Szene. Sie wird nur dem
//      GodRaysEffect als Lichtquelle übergeben (durchsichtig, schreibt keine
//      Tiefe). Der Effekt vergleicht sie mit der Tiefe der Wand: Licht kommt
//      nur durch die Löcher.
//   3. Die Lichtscheibe sitzt weit hinter der Wand (100 Einheiten, die Kamera
//      steht 14 davor). Aus diesem Licht zieht der Effekt die Strahlen. Kippt
//      die Wand nur wenig zur Maus, wandert die ferne Scheibe weit zur
//      Gegenseite: Es entsteht ein langer, schmaler Lichtkegel zur Maus hin.
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
  /** Auftritt: Das Licht blendet auf (sofort, wenn das ruhige Bild schon steht). */
  zeigen: (sofort: boolean) => void;
  ende: () => void;
};

export type LichtWahl = {
  /** Proben je Bildpunkt für die Strahlen (Computer 80, Handy 60). */
  proben: number;
  /** Farbe der Wand = Farbe des Grundes (schwarz). */
  wand: number;
  /** Folgt die Wand der Maus? (Am Handy wiegt sie sich nur leicht.) */
  maus: boolean;
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
// Die Öffnungen des Logos reichen in Logo-Einheiten bis 0,854 (Spitzen der vier Splitter). Sie werden
// so vergrößert, dass genau diese Spitzen auf dem Rand des Platzes liegen: Das sichtbare Logo-Loch ist
// dann so breit wie der Platz im Kopfbereich (am Computer rund 245 px).
const AUSSEN = 0.854;
// Wie stark die Wand kippt (Bogenmaß bei voller Auslenkung der Maus). Wegen der fernen Scheibe genügt wenig.
// Nach oben und unten kippt sie etwas stärker als zur Seite: So zeigt der Lichtkegel in den Bildecken
// wie beim Vorbild leicht steiler als die Diagonale.
const KIPP = 0.16;
const KIPP_HOCH = 1.25;
// Im Umkreis des halben Logos um ihre Mitte leuchtet die Scheibe schwächer (Anteil ihres Radius).
const KERN = ((0.5 / AUSSEN) * LOGO * (ABSTAND + TIEFE)) / ABSTAND / SCHEIBE;

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
  // Höchstens 2-fache Pixeldichte.
  let dichte = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dichte);

  const szene = new THREE.Scene();
  // Der Grund hinter den Löchern hat genau die Farbe der Wand. Als Hintergrund der Szene
  // rechnet three.js die Farbe richtig in den Arbeitsfarbraum um.
  szene.background = new THREE.Color(wahl.wand);
  const kamera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  kamera.position.set(0, 0, ABSTAND);

  const uHell = { value: 0 };
  const uZeit = { value: 0 };
  const wegwerfen: { dispose: () => void }[] = [];
  const merken = <T extends { dispose: () => void }>(ding: T) => {
    wegwerfen.push(ding);
    return ding;
  };

  // ── Die Wand mit dem Logo-Loch. Sie hat die Farbe des Grundes, man sieht sie nicht.
  const WEIT = 80;
  const wandStoff = merken(
    new THREE.ShaderMaterial({
      uniforms: { uFarbe: { value: new THREE.Color(wahl.wand) }, uWeite: { value: (WEIT / LOGO) * AUSSEN } },
      vertexShader: FLAECHE,
      fragmentShader: `
        uniform vec3 uFarbe;
        uniform float uWeite;
        varying vec2 vLage;
        // Eine der vier Öffnungen des Logos (es ist an beiden Achsen gespiegelt): ein schmaler
        // Splitter entlang der Mittellinie des Balkens, in der Mitte am breitesten (halb so breit
        // wie der Balken des Logos), an beiden Enden spitz auslaufend.
        bool imBalken(vec2 p) {
          p = abs(p);
          vec2 a = vec2(0.1299, 0.853);
          vec2 e = vec2(0.854, 0.1342) - a;
          float l = length(e);
          vec2 n = e / l;
          vec2 w = p - a;
          float s = dot(w, n) / l;
          if (s <= 0.0 || s >= 1.0) return false;
          float quer = abs(w.x * n.y - w.y * n.x);
          return quer < 0.05 * (1.0 - abs(2.0 * s - 1.0));
        }
        // Der Stern in der Mitte: vier lange, feine Spitzen.
        bool imStern(vec2 p) {
          float q = 0.536;
          return pow(pow(abs(p.x), q) + pow(abs(p.y), q), 1.0 / q) < 0.4437;
        }
        void main() {
          // Position auf der Wand in Logo-Einheiten (die Spitzen der Öffnungen liegen bei 0,854).
          vec2 p = vLage * uWeite;
          // An den Stellen des Logos hat die Wand Löcher: keine Farbe, keine Tiefe.
          if (imBalken(p) || imStern(p)) discard;
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
        uniforms: { uHell, uZeit, uKern: { value: KERN } },
        vertexShader: FLAECHE,
        fragmentShader: `
          uniform float uHell;
          uniform float uZeit;
          uniform float uKern;
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
            vec3 gold = vec3(0.871, 0.392, 0.042);
            vec3 hell = vec3(1.0, 0.644, 0.195);
            vec3 farbe = mix(mix(gold, hell, 0.6), gold, smoothstep(0.0, uKern, r));
            // Genau in der Mitte (hinter dem Stern, solange die Wand gerade steht) leuchtet die Scheibe
            // schwächer: Sonst überstrahlt der Stern, durch den das meiste Licht fällt, alles andere.
            float kraft = (1.0 - smoothstep(0.45, 1.0, r)) * speichen * mix(0.7, 1.0, smoothstep(uKern * 0.7, uKern * 1.25, r));
            gl_FragColor = vec4(farbe * kraft * uHell, 1.0);
          }`,
      }),
    ),
  );
  scheibe.frustumCulled = false;
  scheibe.scale.setScalar(SCHEIBE);

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
    density: 0.77,
    decay: Math.pow(0.94, 80 / wahl.proben),
    weight: (0.2 * 80) / wahl.proben,
    exposure: 0.42,
    clampMax: 1,
    resolutionScale: 0.5,
    kernelSize: KernelSize.MEDIUM,
    blur: true,
  });
  // Korn wie beim Vorbild: nur im Licht sichtbar, das Schwarz bleibt schwarz und sauber.
  const korn = new NoiseEffect({ blendFunction: BlendFunction.COLOR_DODGE });
  korn.blendMode.opacity.value = 0.2;
  composer.addPass(new EffectPass(kamera, strahlen, korn));

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
    renderer.setPixelRatio(dichte);
    renderer.setSize(breite, hoehe, false);
    composer.setSize(breite, hoehe);
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
  const zeiger = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    const r = halter.getBoundingClientRect();
    // Lage der Maus relativ zur Logo-Mitte, auf die halbe Bildbreite bezogen.
    ziel.x = THREE.MathUtils.clamp((ev.clientX - r.left - lage.mitteX) / (breite * 0.5), -1, 1);
    ziel.y = THREE.MathUtils.clamp((ev.clientY - r.top - lage.mitteY) / (hoehe * 0.5), -1, 1);
    wecken();
  };
  const zeigerWeg = () => {
    ziel.x = 0;
    ziel.y = 0;
  };
  if (wahl.maus) {
    window.addEventListener("pointermove", zeiger, { passive: true });
    document.documentElement.addEventListener("pointerleave", zeigerWeg);
  }

  // ── Bild für Bild.
  const zustand = { auftritt: 0 };
  let zeit = 0;
  let letzte = 0;
  let rahmen = 0;
  let sichtbar = true;
  let vorbei = false;
  let gezeigt = false;
  let bildNr = 0;
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
    if (warGezeichnet && lage.hell >= 1) {
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
          dichte = 1.25;
          vermessen();
        } else if (dichte > 1) {
          dichte = 1;
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

    // Vor dem Auftritt ist vom Licht nichts zu sehen: einmal den dunklen Grund zeichnen, dann
    // warten (zeigen() weckt wieder).
    if (!gezeigt && !neu) return;

    const zug = 1 - Math.exp(-dt * 3.2);
    const vorX = ist.x;
    const vorY = ist.y;
    ist.x += (ziel.x - ist.x) * zug;
    ist.y += (ziel.y - ist.y) * zug;
    // „Bewegt“ heißt: Die Zeichen müssen davon erfahren (Maus, Auftritt bis zum letzten Wert, neue Maße).
    const bewegt = Math.abs(ist.x - vorX) + Math.abs(ist.y - vorY) > 0.0005 || lage.hell !== zustand.auftritt || neu;

    // In Ruhe genügt jedes zweite Bild (Atmen, Filmkorn und das langsame Wiegen am Handy).
    // Solange nicht feststeht, dass das Gerät flüssig mitkommt, wird jedes Bild gezeichnet.
    if (bewegt || !geprueft || schlecht > 0 || bildNr % 2 === 0) {
      uZeit.value = zeit;
      // Das Licht pulsiert nur ganz leicht.
      uHell.value = zustand.auftritt * (1 + 0.02 * Math.sin(zeit * 0.7));
      // Ohne Maus wiegt sich die Wand ganz leicht von selbst.
      const kx = ist.x + Math.sin(zeit * 0.31) * (wahl.maus ? 0.03 : 0.05);
      const ky = ist.y + Math.sin(zeit * 0.23 + 1.3) * (wahl.maus ? 0.02 : 0.035);
      // Die Wand dreht sich zur Maus hin …
      logo.rotation.set(ky * KIPP * KIPP_HOCH, kx * KIPP, 0);
      logo.updateMatrixWorld();
      // … und die Lichtscheibe sitzt weit hinter ihr auf ihrer Achse: Sie wandert zur Gegenseite.
      scheibe.position.set(0, 0, -TIEFE).applyQuaternion(logo.quaternion);
      scheibe.quaternion.copy(logo.quaternion);
      scheibe.updateMatrix();
      scheibe.updateMatrixWorld();
      composer.render(dt);
      gezeichnet = true;

      lage.kippX = kx;
      lage.kippY = ky * KIPP_HOCH;
      lage.hell = zustand.auftritt;
      if (bewegt) wahl.beiBild?.(lage);
      neu = false;
    }
    wecken();
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
    zeigen: (sofort) => {
      gezeigt = true;
      gsap.to(zustand, { auftritt: 1, duration: sofort ? 0.01 : 1.8, ease: "power2.out" });
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
