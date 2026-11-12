// Das Licht-Logo: three.js mit dem fertigen God-Rays-Effekt der Bibliothek
// „postprocessing“ (GodRaysEffect), dazu deren Filmkorn (NoiseEffect).
//
// Aufbau:
//   1. In der Szene steht nur eine dunkle Wand. In ihrem Shader werden die
//      Stellen unseres Logos (vier Balken und Stern) verworfen (discard): Dort
//      hat die Wand Löcher und schreibt keine Tiefe.
//   2. Die Lichtscheibe ist NICHT Teil der Szene. Sie wird nur dem
//      GodRaysEffect als Lichtquelle übergeben (durchsichtig, schreibt keine
//      Tiefe). Der Effekt vergleicht sie mit der Tiefe der Wand: Licht kommt
//      nur durch die Löcher.
//   3. Aus diesem Licht zieht der Effekt die Strahlen. Kippt die Wand zur
//      Maus, wandert die Lichtscheibe dahinter zur Gegenseite: Die Strahlen
//      fächern sich als Lichtkegel zur Maus hin auf.
//
// Zu sehen ist deshalb kein Gegenstand, keine Kante und keine Fläche: nur
// weiches, körniges Licht in der Form unseres Logos. Im Kern fast weiß, an den
// vier Balken warmes Gold.
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
  /** Farbe der Wand = Farbe des Grundes (fast schwarz). */
  wand: number;
  /** Folgt die Wand der Maus? (Am Handy wiegt sie sich nur leicht von selbst.) */
  maus: boolean;
  /** Wird nach jedem Bild gerufen, in dem sich das Licht bewegt hat. */
  beiBild?: (lage: LichtLage) => void;
  /** Wird einmal gerufen, wenn das Gerät nicht flüssig mitkommt oder die Grafik ausfällt: Dann gehört das ruhige Bild hin. */
  beiAusfall?: () => void;
};

const SICHTFELD = 30;
const ABSTAND = 12;
// Wie weit die Lichtscheibe hinter der Wand sitzt (in Logo-Höhen) und wie stark die Wand kippt.
const TIEFE = 1.0;
const KIPP = 0.62;

const FLAECHE = `
varying vec2 vUv;
varying vec2 vLage;
void main() {
  vUv = uv;
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
  // rechnet three.js die Farbe richtig in den Arbeitsfarbraum um (eine bloße Löschfarbe
  // käme in den Löchern zu hell an: Man sähe die Balken als blasse Flächen).
  szene.background = new THREE.Color(wahl.wand);
  const kamera = new THREE.PerspectiveCamera(SICHTFELD, 1, 0.1, 200);
  kamera.position.set(0, 0, ABSTAND);
  const halbeHoehe = Math.tan(THREE.MathUtils.degToRad(SICHTFELD / 2)) * ABSTAND;

  const uHell = { value: 0 };
  const uZeit = { value: 0 };
  // Für die Lichtscheibe: Wo steht die Wand gerade? (Die Farbe des Lichts hängt am Loch.)
  const uKamera = { value: kamera.position };
  const uWandMitte = { value: new THREE.Vector3() };
  const uWandNormal = { value: new THREE.Vector3(0, 0, 1) };
  const uWandInnen = { value: new THREE.Matrix4() };
  const uGroesse = { value: 1 };
  const wegwerfen: { dispose: () => void }[] = [];
  const merken = <T extends { dispose: () => void }>(ding: T) => {
    wegwerfen.push(ding);
    return ding;
  };

  // ── Die Wand mit dem Logo-Loch. Sie hat die Farbe des Grundes, man sieht sie nicht.
  const wandStoff = merken(
    new THREE.ShaderMaterial({
      uniforms: { uFarbe: { value: new THREE.Color(wahl.wand) }, uWeite: { value: 1 } },
      vertexShader: FLAECHE,
      fragmentShader: `
        uniform vec3 uFarbe;
        uniform float uWeite;
        varying vec2 vLage;
        // Liegt der Punkt in einem der vier Balken? (Das Logo ist an beiden Achsen gespiegelt.)
        void kante(vec2 p, vec2 a, vec2 b, inout float s) {
          vec2 e = b - a;
          vec2 w = p - a;
          bvec3 c = bvec3(p.y >= a.y, p.y < b.y, e.x * w.y > e.y * w.x);
          if (all(c) || all(not(c))) s = -s;
        }
        bool imBalken(vec2 p) {
          p = abs(p);
          vec2 a = vec2(0.1299, 0.9957);
          vec2 b = vec2(1.0, 0.1342);
          vec2 c = vec2(0.7078, 0.1342);
          vec2 d = vec2(0.1299, 0.71);
          float s = 1.0;
          kante(p, a, d, s);
          kante(p, b, a, s);
          kante(p, c, b, s);
          kante(p, d, c, s);
          return s < 0.0;
        }
        bool imStern(vec2 p) {
          float q = 0.536;
          return pow(pow(abs(p.x), q) + pow(abs(p.y), q), 1.0 / q) < 0.4437;
        }
        void main() {
          // Position auf der Wand in Logo-Einheiten (Außenkante des Logos = 1).
          vec2 p = vLage * uWeite;
          // An den Stellen des Logos hat die Wand Löcher: keine Farbe, keine Tiefe.
          if (imBalken(p) || imStern(p)) discard;
          gl_FragColor = vec4(uFarbe, 1.0);
        }`,
    }),
  );
  const wand = new THREE.Mesh(merken(new THREE.PlaneGeometry(2, 2)), wandStoff);
  const logo = new THREE.Group();
  logo.add(wand);
  szene.add(logo);

  // ── Die Lichtscheibe: nicht in der Szene, nur Lichtquelle des God-Rays-Effekts.
  // Im Kern fast weiß, nach außen warmes Gold, am Rand weich aus (keine sichtbare Scheibe).
  const scheibe = new THREE.Mesh(
    merken(new THREE.PlaneGeometry(2, 2)),
    merken(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uHell, uZeit, uKamera, uWandMitte, uWandNormal, uWandInnen, uGroesse },
        vertexShader: `
          varying vec2 vLage;
          varying vec3 vWelt;
          void main() {
            vLage = position.xy;
            vec4 welt = modelMatrix * vec4(position, 1.0);
            vWelt = welt.xyz;
            gl_Position = projectionMatrix * viewMatrix * welt;
          }`,
        fragmentShader: `
          uniform float uHell;
          uniform float uZeit;
          uniform vec3 uKamera;
          uniform vec3 uWandMitte;
          uniform vec3 uWandNormal;
          uniform mat4 uWandInnen;
          uniform float uGroesse;
          varying vec2 vLage;
          varying vec3 vWelt;
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
            // Langsames Flackern im Leuchten.
            float flackern = 0.9 + 0.2 * rausch(vLage * 2.2 + vec2(uZeit * 0.13, -uZeit * 0.09));
            // Durch welche Stelle der Wand sieht man diesen Punkt der Scheibe? Die Farbe
            // hängt am Loch: durch den Stern fast weiß, durch die Balken warmes Gold –
            // auch wenn die Wand kippt und die Scheibe dahinter wandert.
            vec3 blick = vWelt - uKamera;
            float t = dot(uWandMitte - uKamera, uWandNormal) / dot(blick, uWandNormal);
            vec2 p = (uWandInnen * vec4(uKamera + blick * t, 1.0)).xy / uGroesse;
            float rw = length(p);
            vec3 gold = vec3(1.0, 0.55, 0.12);
            vec3 weiss = vec3(1.0, 0.93, 0.8);
            vec3 farbe = mix(weiss, gold, smoothstep(0.36, 0.6, rw));
            float kraft = mix(0.9, 0.7, smoothstep(0.3, 0.7, rw)) * (1.0 - smoothstep(0.5, 1.0, r));
            gl_FragColor = vec4(farbe * kraft * flackern * uHell, 1.0);
          }`,
      }),
    ),
  );
  scheibe.frustumCulled = false;

  // ── Nachbearbeitung: der fertige God-Rays-Effekt und das Filmkorn der Bibliothek.
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(szene, kamera));
  const strahlen = new GodRaysEffect(kamera, scheibe, {
    samples: wahl.proben,
    // Mit dem Vorbild abgeglichen (bei 80 Proben): lange, schwache Strahlen bis an den Bildrand,
    // in der Nähe gedimmt. Bei weniger Proben ist jeder Schritt länger; Abklingen und Gewicht
    // werden umgerechnet, damit das Licht am Handy gleich aussieht.
    density: 0.96,
    decay: Math.pow(0.92, 80 / wahl.proben),
    weight: (0.25 * 80) / wahl.proben,
    exposure: 0.29,
    clampMax: 1,
    resolutionScale: 0.5,
    kernelSize: KernelSize.LARGE,
    blur: true,
  });
  // Korn nach Art eines Films: Es folgt der Helligkeit, der dunkle Grund bleibt dunkel.
  const korn = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
  korn.blendMode.opacity.value = 0.85;
  composer.addPass(new EffectPass(kamera, strahlen, korn));

  // ── Größe und Lage: Das Logo sitzt genau auf dem Platz im Kopfbereich.
  const lage: LichtLage = { mitteX: 0, mitteY: 0, radius: 1, kippX: 0, kippY: 0, hell: 0 };
  let breite = 1;
  let hoehe = 1;
  let proPixel = 1;
  let groesse = 1;
  let neu = true;
  const mitte = new THREE.Vector3();
  const hinten = new THREE.Vector3();
  const vermessen = () => {
    const r = halter.getBoundingClientRect();
    const a = anker.getBoundingClientRect();
    breite = Math.max(1, r.width);
    hoehe = Math.max(1, r.height);
    renderer.setPixelRatio(dichte);
    renderer.setSize(breite, hoehe, false);
    composer.setSize(breite, hoehe);
    kamera.aspect = breite / hoehe;
    kamera.updateProjectionMatrix();
    proPixel = (2 * halbeHoehe) / hoehe;
    lage.mitteX = a.left + a.width / 2 - r.left;
    lage.mitteY = a.top + a.height / 2 - r.top;
    lage.radius = a.height / 2;
    mitte.set((lage.mitteX - breite / 2) * proPixel, -(lage.mitteY - hoehe / 2) * proPixel, 0);
    groesse = lage.radius * proPixel;
    logo.position.copy(mitte);
    // Die Wand ist viel größer als das Bild, damit auch gekippt kein Rand zu sehen ist.
    const weit = 60;
    wand.scale.setScalar(weit);
    wandStoff.uniforms.uWeite.value = weit / groesse;
    scheibe.scale.setScalar(groesse * 3.2);
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
      // Das Licht atmet langsam.
      const atem = 1 + 0.06 * Math.sin(zeit * 0.9) + 0.025 * Math.sin(zeit * 2.1 + 1);
      uHell.value = zustand.auftritt * atem;
      // Ohne Maus wiegt sich die Wand ganz leicht von selbst.
      const kx = ist.x + Math.sin(zeit * 0.31) * (wahl.maus ? 0.03 : 0.16);
      const ky = ist.y + Math.sin(zeit * 0.23 + 1.3) * (wahl.maus ? 0.02 : 0.1);
      // Die Wand dreht sich zur Maus hin …
      logo.rotation.set(ky * KIPP, kx * KIPP, 0);
      logo.updateMatrixWorld();
      // … und die Lichtscheibe sitzt hinter ihr auf ihrer Achse: Sie wandert zur Gegenseite.
      hinten.set(0, 0, -groesse * 2 * TIEFE).applyQuaternion(logo.quaternion).add(mitte);
      scheibe.position.copy(hinten);
      scheibe.quaternion.copy(logo.quaternion);
      scheibe.updateMatrix();
      scheibe.updateMatrixWorld();
      uWandMitte.value.copy(mitte);
      uWandNormal.value.set(0, 0, 1).applyQuaternion(logo.quaternion);
      uWandInnen.value.copy(logo.matrixWorld).invert();
      uGroesse.value = groesse;
      composer.render(dt);
      gezeichnet = true;

      lage.kippX = kx;
      lage.kippY = ky;
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
