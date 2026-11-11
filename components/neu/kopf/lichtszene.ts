// Das Licht-Logo des Kopfbereichs, gebaut mit three.js und der Bibliothek
// „postprocessing“ (wird nur am Computer nachgeladen, siehe LichtName.tsx).
//
// Aufbau wie bei Gegenlicht im Nebel:
//   1. Hinter der Logo-Mitte sitzt eine weiche Lichtkugel: warmes Gold, im
//      Kern fast weiß, mit langsamem Flackern.
//   2. Davor steht unser Logo als flacher, dunkler Scherenschnitt (die vier
//      Balken). Er verdeckt das Licht. Die Kanten glimmen golden, der Stern
//      in der Mitte leuchtet weiß.
//   3. Ein God-Rays-Effekt (80 Proben je Bildpunkt, Licht nimmt nach außen ab)
//      zieht Strahlen nur dort, wo Licht am Scherenschnitt vorbeischeint:
//      durch die Lücken zwischen den Balken. So bekommt der Lichtstern von
//      selbst unsere Form. Dreht sich das Logo, wandern und fächern sich die
//      Strahlen. Der Effekt ist selbst geschrieben (als Effekt für
//      „postprocessing“): Anders als der mitgelieferte lässt er das Licht
//      nicht durch die Balken hindurch, sie werfen echte Schatten.
//   4. Darüber liegen ein weicher Glanz (Bloom) und feines Filmkorn.
import * as THREE from "three";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { gsap } from "@/lib/gsap";
import { BALKEN } from "../Marke";

/** Was die Zeichen vom Licht wissen müssen, um richtig zu schimmern (alles in CSS-Pixeln der Bühne). */
export type LichtLage = {
  mitteX: number;
  mitteY: number;
  /** Halbe Höhe des Logos. */
  radius: number;
  /** Richtungen der vier Lichtstrahlen (Winkel im Bildschirm, y nach unten). */
  winkel: [number, number, number, number];
  /** Helligkeit 0 bis 1 (Auftritt und Atmen). */
  hell: number;
};

export type LichtSzene = {
  lage: LichtLage;
  /** Auftritt: Das Licht blendet auf (sofort, wenn das ruhige Bild schon steht). */
  zeigen: (sofort: boolean) => void;
  ende: () => void;
};

const SICHTFELD = 30;
const ABSTAND = 12;
const EINHEIT = 1 / 46.2; // Logo-Maße aus Marke.tsx auf Außenkante = 1

// Gemeinsame Shader-Teile: Rauschen und der Abstand zu den Balken.
const RAUSCHEN = `
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
}`;

const FLAECHE = `
varying vec2 vUv;
varying vec2 vLage;
void main() {
  vUv = uv;
  vLage = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** Die vier Balken des Logos als Flächen (Außenkante = 1, y nach oben). */
function balkenFormen() {
  return BALKEN.map((zeile) => {
    const form = new THREE.Shape();
    zeile.split(" ").forEach((paar, i) => {
      const [x, y] = paar.split(",").map(Number);
      if (i === 0) form.moveTo(x * EINHEIT, -y * EINHEIT);
      else form.lineTo(x * EINHEIT, -y * EINHEIT);
    });
    form.closePath();
    return form;
  });
}

export function starteLichtSzene(halter: HTMLElement, anker: HTMLElement, beiBild: (lage: LichtLage) => void): LichtSzene {
  const leinwand = document.createElement("canvas");
  leinwand.className = "ag-ln__licht";
  halter.prepend(leinwand);

  const renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  // Höchstens 2-fache Pixeldichte.
  let dichte = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dichte);
  renderer.setClearColor(0x070b16, 1);

  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(SICHTFELD, 1, 0.1, 120);
  kamera.position.set(0, 0, ABSTAND);
  szene.add(kamera);
  const halbeHoehe = Math.tan(THREE.MathUtils.degToRad(SICHTFELD / 2)) * ABSTAND;

  const uHell = { value: 0 };
  const uZeit = { value: 0 };
  const wegwerfen: { dispose: () => void }[] = [];
  const merken = <T extends { dispose: () => void }>(ding: T) => {
    wegwerfen.push(ding);
    return ding;
  };

  // ── Grund: fast schwarz, oben ein Hauch Dunkelblau.
  const grund = new THREE.Mesh(
    merken(new THREE.PlaneGeometry(1, 1)),
    merken(
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: { uOben: { value: new THREE.Color(0x090f26) }, uUnten: { value: new THREE.Color(0x070b16) } },
        vertexShader: FLAECHE,
        fragmentShader: `
          uniform vec3 uOben;
          uniform vec3 uUnten;
          varying vec2 vUv;
          void main() {
            gl_FragColor = vec4(mix(uUnten, uOben, smoothstep(0.3, 1.0, vUv.y)), 1.0);
          }`,
      }),
    ),
  );
  grund.position.z = -60;
  grund.renderOrder = -10;
  grund.frustumCulled = false;
  kamera.add(grund);

  // ── Lichtkugel hinter der Logo-Mitte: weich, ohne sichtbaren Rand.
  const sonne = new THREE.Mesh(
    merken(new THREE.PlaneGeometry(1, 1)),
    merken(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        // Licht wird nur aufaddiert; die Deckung (Alpha) bleibt unberührt, sie gehört den Balken.
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
        uniforms: { uHell, uZeit },
        vertexShader: FLAECHE,
        fragmentShader: `
          uniform float uHell;
          uniform float uZeit;
          varying vec2 vUv;
          ${RAUSCHEN}
          void main() {
            vec2 q = (vUv - 0.5) * 2.0;
            float r = length(q);
            // Langsames Flackern im Leuchten.
            float flackern = 0.86 + 0.28 * rausch(q * 1.7 + vec2(uZeit * 0.11, -uZeit * 0.07));
            // r = 1 ist der Rand der Fläche (1,7-fache Logo-Größe): Kern klein und fast weiß,
            // darum warmes Gold, dann ein langer, schwacher Ausläufer ohne sichtbaren Rand.
            float kern = exp(-r * r * 290.0);
            float glut = exp(-r * r * 30.0);
            float hof = exp(-r * 4.4);
            float aus = smoothstep(1.0, 0.45, r);
            vec3 farbe = vec3(1.0, 0.95, 0.86) * kern * 0.9 + vec3(1.0, 0.6, 0.18) * glut * 0.27 + vec3(0.7, 0.36, 0.09) * hof * 0.06;
            gl_FragColor = vec4(farbe * aus * flackern * uHell, 1.0);
          }`,
      }),
    ),
  );
  sonne.frustumCulled = false;
  szene.add(sonne);

  // ── Das Logo als dunkler Scherenschnitt: vier Balken, deren Kanten golden glimmen.
  const logo = new THREE.Group();
  const balkenStoff = merken(
    new THREE.ShaderMaterial({
      uniforms: { uHell },
      vertexShader: FLAECHE,
      fragmentShader: `
        uniform float uHell;
        varying vec2 vLage;
        // Abstand zur nächsten Kante des Balkens (das Logo ist an beiden Achsen gespiegelt).
        float kante(vec2 p, vec2 a, vec2 b, inout float s) {
          vec2 e = b - a;
          vec2 w = p - a;
          vec2 q = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
          bvec3 c = bvec3(p.y >= a.y, p.y < b.y, e.x * w.y > e.y * w.x);
          if (all(c) || all(not(c))) s = -s;
          return dot(q, q);
        }
        float tiefe(vec2 p) {
          p = abs(p);
          vec2 a = vec2(0.1299, 0.9957);
          vec2 b = vec2(1.0, 0.1342);
          vec2 c = vec2(0.7078, 0.1342);
          vec2 d = vec2(0.1299, 0.71);
          float s = 1.0;
          float m = kante(p, a, d, s);
          m = min(m, kante(p, b, a, s));
          m = min(m, kante(p, c, b, s));
          m = min(m, kante(p, d, c, s));
          return sqrt(m);
        }
        void main() {
          float rand = exp(-tiefe(vLage) * 62.0);
          // Die Kanten zur Mitte hin bekommen mehr Licht ab.
          float innen = 1.0 - smoothstep(0.8, 1.12, abs(vLage.x) + abs(vLage.y));
          vec3 dunkel = vec3(0.008, 0.011, 0.026);
          gl_FragColor = vec4(dunkel + vec3(1.0, 0.7, 0.28) * rand * (0.12 + 0.75 * innen) * uHell, 1.0);
        }`,
    }),
  );
  const balkenForm = merken(new THREE.ExtrudeGeometry(balkenFormen(), { depth: 0.07, bevelEnabled: false, curveSegments: 2 }));
  balkenForm.translate(0, 0, -0.035);
  const balkenNetz = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(balkenForm, balkenStoff);
  logo.add(balkenNetz);

  // Der Stern in der Mitte leuchtet weiß (weicher Rand, verdeckt das Licht nicht).
  const stern = new THREE.Mesh(
    merken(new THREE.PlaneGeometry(1.2, 1.2)),
    merken(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uHell },
        vertexShader: FLAECHE,
        fragmentShader: `
          uniform float uHell;
          varying vec2 vLage;
          void main() {
            float q = 0.536;
            float form = pow(pow(abs(vLage.x), q) + pow(abs(vLage.y), q), 1.0 / q) - 0.4437;
            float a = smoothstep(0.028, -0.028, form);
            gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * 1.7 * uHell, a);
          }`,
      }),
    ),
  );
  stern.position.z = 0.04;
  logo.add(stern);
  szene.add(logo);

  // ── Lichtbild für die Strahlen: nur die Lichtkugel, davor die Balken als
  // schwarze Sperre (Farbe = Licht, das zu sehen ist; Deckung = hier steht ein Balken).
  const sperre = merken(new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const lichtBild = merken(new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true }));

  // ── Nachbearbeitung: God Rays, weicher Glanz, Filmkorn.
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(szene, kamera));
  const strahlen = new Effect(
    "LichtStrahlen",
    `
    uniform sampler2D lichtBild;
    uniform vec2 mitte;
    uniform float staerke;
    uniform float abklang;
    uniform float reichweite;
    uniform float weite;
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      // Jeder Bildpunkt tastet leicht versetzt ab: Das verhindert Streifen und gibt feines Korn.
      float versatz = fract(sin(dot(uv * resolution + time * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
      float seitlich = fract(sin(dot(uv * resolution - time * 37.0, vec2(39.3468, 11.135))) * 24634.6345) - 0.5;
      // Das Licht ist keine Nadelspitze, sondern eine kleine Fläche: Jeder Bildpunkt
      // zielt auf eine etwas andere Stelle davon. So bekommen die Strahlen weiche Ränder.
      vec2 zurMitte = mitte - uv;
      vec2 quer = normalize(vec2(-zurMitte.y, zurMitte.x * aspect * aspect) + 0.00001);
      vec2 zielPunkt = mitte + quer * seitlich * weite;
      // Von diesem Bildpunkt in PROBEN Schritten auf das Licht zu.
      vec2 schritt = (zielPunkt - uv) * (0.97 / float(PROBEN));
      vec2 p = uv + schritt * versatz;
      vec3 summe = vec3(0.0);
      float durch = 1.0;
      float gewicht = 1.0;
      for (int i = 0; i < PROBEN; i++) {
        vec4 probe = texture2D(lichtBild, p);
        summe += probe.rgb * durch * gewicht;
        // Steht ein Balken im Weg, kommt dahinter kein Licht mehr an.
        durch *= 1.0 - clamp(probe.a * 1.6, 0.0, 1.0);
        gewicht *= abklang;
        p += schritt;
      }
      // Das Licht nimmt nach außen ab.
      vec2 weg = (uv - mitte) * vec2(aspect, 1.0);
      float fern = exp(-length(weg) * reichweite);
      outputColor = vec4(summe * vec3(1.0, 0.74, 0.36) * staerke * fern, 1.0);
    }`,
    {
      blendFunction: BlendFunction.SCREEN,
      defines: new Map([["PROBEN", "80"]]),
      uniforms: new Map<string, THREE.Uniform>([
        ["lichtBild", new THREE.Uniform(lichtBild.texture)],
        ["mitte", new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ["staerke", new THREE.Uniform(0.46)],
        ["abklang", new THREE.Uniform(0.972)],
        ["reichweite", new THREE.Uniform(6.2)],
        ["weite", new THREE.Uniform(0.03)],
      ]),
    },
  );
  const glanz = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.5, luminanceSmoothing: 0.4, intensity: 0.42, radius: 0.7 });
  // Filmkorn über das ganze Bild. Es folgt der Helligkeit (im Licht deutlich, im
  // Dunkeln nur ein Hauch), damit der fast schwarze Grund fast schwarz bleibt.
  const korn = new Effect(
    "Filmkorn",
    `
    uniform float staerke;
    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
      float n = fract(sin(dot(uv * resolution + fract(time) * 173.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      vec3 farbe = inputColor.rgb * (1.0 + n * staerke) + n * 0.0014;
      outputColor = vec4(max(farbe, 0.0), inputColor.a);
    }`,
    { blendFunction: BlendFunction.SET, uniforms: new Map<string, THREE.Uniform>([["staerke", new THREE.Uniform(0.3)]]) },
  );
  composer.addPass(new EffectPass(kamera, strahlen, glanz, korn));

  // ── Größe und Lage: Das Logo sitzt genau auf dem Platz im Kopfbereich.
  const lage: LichtLage = { mitteX: 0, mitteY: 0, radius: 1, winkel: [-Math.PI / 2, Math.PI / 2, Math.PI, 0], hell: 0 };
  let breite = 1;
  let hoehe = 1;
  let proPixel = 1;
  let groesse = 1;
  let bildMass = 0.5;
  const mitte = new THREE.Vector3();
  const punkt = new THREE.Vector3();
  const vermessen = () => {
    const r = halter.getBoundingClientRect();
    const a = anker.getBoundingClientRect();
    breite = Math.max(1, r.width);
    hoehe = Math.max(1, r.height);
    renderer.setPixelRatio(dichte);
    renderer.setSize(breite, hoehe, false);
    composer.setSize(breite, hoehe);
    // Das Lichtbild für die Strahlen genügt in halber Auflösung: Sie sind weich.
    lichtBild.setSize(Math.max(2, Math.round(breite * dichte * bildMass)), Math.max(2, Math.round(hoehe * dichte * bildMass)));
    kamera.aspect = breite / hoehe;
    kamera.updateProjectionMatrix();
    proPixel = (2 * halbeHoehe) / hoehe;
    lage.mitteX = a.left + a.width / 2 - r.left;
    lage.mitteY = a.top + a.height / 2 - r.top;
    lage.radius = a.height / 2;
    mitte.set((lage.mitteX - breite / 2) * proPixel, -(lage.mitteY - hoehe / 2) * proPixel, 0);
    groesse = lage.radius * proPixel;
    logo.position.copy(mitte);
    logo.scale.setScalar(groesse);
    // Die Lichtkugel sitzt ein Stück hinter dem Logo und ist deutlich größer als es.
    sonne.position.set(mitte.x, mitte.y, -groesse * 0.9);
    sonne.scale.setScalar(groesse * 3.4);
    // Wo sitzt das Licht im Bild? (0 bis 1, y nach oben)
    punkt.copy(sonne.position).project(kamera);
    strahlen.uniforms.get("mitte")?.value.set(punkt.x * 0.5 + 0.5, punkt.y * 0.5 + 0.5);
    const grundHoehe = 2 * Math.tan(THREE.MathUtils.degToRad(SICHTFELD / 2)) * 60;
    grund.scale.set(grundHoehe * kamera.aspect * 1.02, grundHoehe * 1.02, 1);
    neu = true;
  };

  // ── Maus: Das Logo dreht und neigt sich leicht.
  const ziel = { x: 0, y: 0 };
  const ist = { x: 0, y: 0 };
  const zeiger = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    const r = halter.getBoundingClientRect();
    ziel.x = THREE.MathUtils.clamp(((ev.clientX - r.left) / breite) * 2 - 1, -1, 1);
    ziel.y = THREE.MathUtils.clamp(((ev.clientY - r.top) / hoehe) * 2 - 1, -1.2, 1.2);
    wecken();
  };
  const zeigerWeg = () => {
    ziel.x = 0;
    ziel.y = 0;
  };
  window.addEventListener("pointermove", zeiger, { passive: true });
  document.documentElement.addEventListener("pointerleave", zeigerWeg);

  // ── Bild für Bild.
  const zustand = { auftritt: 0 };
  // Die vier Lücken zwischen den Balken: oben, unten, links, rechts.
  const LUECKEN = [new THREE.Vector3(0, 0.86, 0), new THREE.Vector3(0, -0.86, 0), new THREE.Vector3(-0.86, 0, 0), new THREE.Vector3(0.86, 0, 0)];
  let zeit = 0;
  let letzte = 0;
  let rahmen = 0;
  let sichtbar = true;
  let vorbei = false;
  let neu = true;
  let bildNr = 0;
  let dauerSumme = 0;
  let dauerZahl = 0;
  let stufe = 0;

  const bild = (jetzt: number) => {
    rahmen = 0;
    if (vorbei) return;
    const dt = letzte ? Math.min(0.05, (jetzt - letzte) / 1000) : 0.016;
    letzte = jetzt;
    zeit += dt;
    bildNr += 1;

    const zug = 1 - Math.exp(-dt * 2.6);
    const vorX = ist.x;
    const vorY = ist.y;
    ist.x += (ziel.x - ist.x) * zug;
    ist.y += (ziel.y - ist.y) * zug;
    const bewegt = Math.abs(ist.x - vorX) + Math.abs(ist.y - vorY) > 0.0006 || zustand.auftritt < 1 || neu;

    // In Ruhe genügt jedes zweite Bild (Atmen und Filmkorn).
    if (bewegt || bildNr % 2 === 0) {
      uZeit.value = zeit;
      // Das Licht atmet langsam.
      const atem = 1 + 0.07 * Math.sin(zeit * 0.9) + 0.03 * Math.sin(zeit * 2.1 + 1);
      uHell.value = zustand.auftritt * atem;
      logo.rotation.set(ist.y * 0.42 + Math.sin(zeit * 0.19) * 0.03, ist.x * 0.6 + Math.sin(zeit * 0.23) * 0.06, -ist.x * 0.16 + Math.sin(zeit * 0.13) * 0.035);
      logo.updateMatrixWorld();
      // Erst das Lichtbild: nur Lichtkugel und Balken (als Sperre) …
      grund.visible = false;
      stern.visible = false;
      balkenNetz.material = sperre;
      renderer.setRenderTarget(lichtBild);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(szene, kamera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x070b16, 1);
      grund.visible = true;
      stern.visible = true;
      balkenNetz.material = balkenStoff;
      // … dann das Bild mit Strahlen, Glanz und Korn.
      composer.render(dt);

      // Für die Zeichen: Wohin zeigen die vier Strahlen gerade?
      for (let i = 0; i < 4; i++) {
        punkt.copy(LUECKEN[i]).applyMatrix4(logo.matrixWorld).project(kamera);
        const px = (punkt.x * 0.5 + 0.5) * breite;
        const py = (-punkt.y * 0.5 + 0.5) * hoehe;
        lage.winkel[i] = Math.atan2(py - lage.mitteY, px - lage.mitteX);
      }
      lage.hell = zustand.auftritt;
      if (bewegt) beiBild(lage);
      neu = false;
    }

    // Kommt der Rechner nicht mit, wird gröber gerechnet: erst weniger Pixel, dann weniger Proben.
    dauerSumme += dt;
    dauerZahl += 1;
    if (dauerZahl >= 50) {
      if (dauerSumme / dauerZahl > 0.027 && stufe < 3) {
        stufe += 1;
        if (stufe === 1) dichte = Math.min(dichte, 1.25);
        if (stufe === 2) dichte = 1;
        if (stufe === 3) bildMass = 0.34;
        vermessen();
      }
      dauerSumme = 0;
      dauerZahl = 0;
    }
    wecken();
  };

  // Nur rechnen, solange der Kopfbereich zu sehen ist.
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
  const waechter = new IntersectionObserver(([eintrag]) => {
    sichtbar = eintrag.isIntersecting;
    letzte = 0;
    wecken();
  });
  waechter.observe(halter);
  const wiederDa = () => {
    letzte = 0;
    wecken();
  };
  document.addEventListener("visibilitychange", wiederDa);
  vermessen();
  wecken();

  return {
    lage,
    zeigen: (sofort) => {
      gsap.to(zustand, { auftritt: 1, duration: sofort ? 0.01 : 1.8, ease: "power2.out" });
      wecken();
    },
    ende: () => {
      vorbei = true;
      cancelAnimationFrame(rahmen);
      gsap.killTweensOf(zustand);
      beobachter.disconnect();
      waechter.disconnect();
      document.removeEventListener("visibilitychange", wiederDa);
      window.removeEventListener("pointermove", zeiger);
      document.documentElement.removeEventListener("pointerleave", zeigerWeg);
      wegwerfen.forEach((d) => d.dispose());
      composer.dispose();
      renderer.dispose();
      leinwand.remove();
    },
  };
}
