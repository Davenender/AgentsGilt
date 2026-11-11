// 3D-Szene des Kopfbereichs (Schritt 4): das Logo als glänzendes Zeichen,
// Lichtspuren und feine Teilchen, die der Maus folgen, und ein dunkler Grund,
// der sich langsam bewegt.
//
// Gezeichnet mit three.js über WebGPU (fällt im Browser von selbst auf WebGL 2
// zurück). Die Farben und Lichter entstehen in TSL, der Shader-Sprache von
// three.js: kein Foto, keine Umgebungs-Textur, nichts zum Nachladen außer dem
// Programmcode. Diese Datei wird nur am Computer geladen (siehe KopfBuehne.tsx);
// am Handy und bei „weniger Bewegung“ zeigt die Seite ein ruhiges Ersatzbild.
import * as THREE from "three/webgpu";
import {
  abs,
  color,
  cos,
  dot,
  exp,
  float,
  instancedBufferAttribute,
  max,
  mix,
  mx_noise_float,
  normalView,
  positionLocal,
  positionView,
  pow,
  reflect,
  sin,
  smoothstep,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
} from "three/tsl";
import { gsap } from "@/lib/gsap";
import { BALKEN } from "../Marke";

export type SzenenArt = "kern" | "baender" | "wolke" | "tiefe";

export type Szene = {
  /** Auftritt des Zeichens nach dem Ladebildschirm. */
  zeigen: () => void;
  /** Fortschritt des Hinausscrollens aus dem Kopfbereich (0 bis 1). */
  scroll: (p: number) => void;
  ende: () => void;
};

type Einstellung = {
  spuren: number;
  baender: number;
  staub: number;
  wolke: number;
  ringe: number;
};

// Was jede Variante zeigt. Stärke 4 von 5: deutlich, aber nie hektisch.
const EINSTELLUNG: Record<SzenenArt, Einstellung> = {
  kern: { spuren: 3, baender: 0, staub: 900, wolke: 0, ringe: 0 },
  baender: { spuren: 0, baender: 5, staub: 520, wolke: 0, ringe: 0 },
  wolke: { spuren: 2, baender: 0, staub: 0, wolke: 2600, ringe: 0 },
  tiefe: { spuren: 2, baender: 0, staub: 260, wolke: 0, ringe: 30 },
};

const GOLD = 0xd4a23c;
const GOLD_HELL = 0xf3d27a;
const ELFENBEIN = 0xf1eee6;
const NEBEL_BLAU = 0xbcc3e2;

const SICHTFELD = 30;
const ABSTAND = 12;

// ───────────── Das Zeichen ─────────────

/** Die Logo-Formen aus Marke.tsx, auf die Breite 2 (−1 bis 1) gebracht, y nach oben. */
function logoFormen() {
  const s = 1 / 46;
  const balken = BALKEN.map((zeile) => {
    const form = new THREE.Shape();
    zeile.split(" ").forEach((paar, i) => {
      const [x, y] = paar.split(",").map(Number);
      if (i === 0) form.moveTo(x * s, -y * s);
      else form.lineTo(x * s, -y * s);
    });
    form.closePath();
    return form;
  });
  const r = 20.5 * s;
  const k = s;
  const stern = new THREE.Shape();
  stern.moveTo(0, r);
  stern.quadraticCurveTo(k, k, r, 0);
  stern.quadraticCurveTo(k, -k, 0, -r);
  stern.quadraticCurveTo(-k, -k, -r, 0);
  stern.quadraticCurveTo(-k, k, 0, r);
  return { balken, stern };
}

function ausziehen(formen: THREE.Shape | THREE.Shape[], tiefe: number, kante: number, vorn: number) {
  const geo = new THREE.ExtrudeGeometry(formen, {
    depth: tiefe,
    bevelEnabled: true,
    bevelThickness: kante * 1.4,
    bevelSize: kante,
    bevelSegments: 4,
    curveSegments: 28,
  });
  geo.translate(0, 0, -tiefe / 2 + vorn);
  return geo;
}

/**
 * Chrom ohne Umgebungsbild: Die Spiegelung wird aus der Richtung berechnet, in
 * die eine Fläche reflektiert. Unten warmer Boden, dann ein heller Horizont,
 * darüber ein dunkles Band und ein kühler Himmel. Kippt das Zeichen, wandern
 * die Bänder über die Flächen. Dazu ein Glanzlicht in Richtung der Maus, ein
 * Glanzstreifen, der beim Auftritt einmal darüberläuft, und ein heller Rand.
 */
function chrom(
  stufen: [number, number, number, number, number],
  licht: number,
  uLicht: THREE.Node<"vec3">,
  uGlanz: THREE.Node<"float">,
) {
  const [bodenFern, bodenNah, horizont, himmelNah, himmelFern] = stufen.map((f) => color(f));
  const material = new THREE.MeshBasicNodeMaterial();
  const n = normalView.normalize();
  // Leichte Wölbung: Die Lage auf dem Zeichen biegt die Spiegelung, damit auch
  // die flache Vorderseite einen Verlauf trägt.
  const r = reflect(positionView.normalize(), n)
    .add(vec3(positionLocal.x.mul(0.1), positionLocal.y.mul(0.22), 0))
    .normalize();
  const y = r.y;
  const unten = mix(bodenFern, bodenNah, smoothstep(-1.0, -0.06, y));
  const mitte = mix(unten, horizont, smoothstep(-0.06, 0.03, y));
  const oben = mix(mitte, himmelNah, smoothstep(0.03, 0.17, y));
  const grund = mix(oben, himmelFern, smoothstep(0.17, 1.0, y));
  const spitze = pow(max(dot(r, uLicht), 0), 42).mul(1.8);
  const rand = pow(float(1).sub(abs(n.z)), 3).mul(0.55);
  const lauf = exp(pow(positionLocal.x.add(positionLocal.y).mul(0.75).sub(uGlanz), 2).mul(-14)).mul(0.85);
  material.colorNode = grund.add(color(licht).mul(spitze.add(rand).add(lauf)));
  return material;
}

// ───────────── Lichtspuren ─────────────

/**
 * Ein Lichtband, das einem Ziel nachläuft: Der Kopf folgt dem Ziel, jeder
 * weitere Punkt dem vorigen. Das Band ist zur Kamera hin ausgerichtet, vorn
 * breit und hell, hinten schmal und durchsichtig.
 */
class Spur {
  readonly netz: THREE.Mesh;
  private readonly punkte: THREE.Vector3[];
  private readonly lage: Float32Array;
  private readonly attr: THREE.BufferAttribute;
  private readonly quer = new THREE.Vector2(0, 1);

  constructor(
    private readonly anzahl: number,
    private readonly breite: number,
    private readonly zug: number,
    material: THREE.Material,
    start: THREE.Vector3,
  ) {
    this.punkte = Array.from({ length: anzahl }, () => start.clone());
    this.lage = new Float32Array(anzahl * 2 * 3);
    const flaeche = new Float32Array(anzahl * 2 * 2);
    const folge: number[] = [];
    for (let i = 0; i < anzahl; i++) {
      const u = i / (anzahl - 1);
      flaeche.set([u, 0, u, 1], i * 4);
      if (i < anzahl - 1) {
        const a = i * 2;
        folge.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.lage, 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", this.attr);
    geo.setAttribute("uv", new THREE.BufferAttribute(flaeche, 2));
    geo.setIndex(folge);
    this.netz = new THREE.Mesh(geo, material);
    this.netz.frustumCulled = false;
    this.netz.renderOrder = 2;
  }

  folgen(ziel: THREE.Vector3, dt: number) {
    const kopf = 1 - Math.exp(-dt * this.zug);
    const schweif = 1 - Math.exp(-dt * 34);
    this.punkte[0].lerp(ziel, kopf);
    for (let i = 1; i < this.anzahl; i++) this.punkte[i].lerp(this.punkte[i - 1], schweif);
    this.bauen();
  }

  private bauen() {
    const p = this.punkte;
    for (let i = 0; i < this.anzahl; i++) {
      const vor = p[Math.max(0, i - 1)];
      const nach = p[Math.min(this.anzahl - 1, i + 1)];
      const dx = vor.x - nach.x;
      const dy = vor.y - nach.y;
      const l = Math.hypot(dx, dy);
      if (l > 1e-5) this.quer.set(-dy / l, dx / l);
      const u = i / (this.anzahl - 1);
      const w = this.breite * Math.pow(1 - u, 0.75) * Math.min(1, u * 14 + 0.25);
      const o = i * 6;
      this.lage[o] = p[i].x + this.quer.x * w;
      this.lage[o + 1] = p[i].y + this.quer.y * w;
      this.lage[o + 2] = p[i].z;
      this.lage[o + 3] = p[i].x - this.quer.x * w;
      this.lage[o + 4] = p[i].y - this.quer.y * w;
      this.lage[o + 5] = p[i].z;
    }
    this.attr.needsUpdate = true;
  }

  entsorgen() {
    this.netz.geometry.dispose();
  }
}

function bandMaterial(uSichtbar: THREE.Node<"float">, staerke: number) {
  const material = alsLicht(new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide }));
  const u = uv().x;
  const quer = abs(uv().y.mul(2).sub(1));
  const kern = pow(float(1).sub(quer), 6);
  const hof = pow(float(1).sub(quer), 1.6).mul(0.42);
  const laenge = pow(float(1).sub(u), 1.5);
  material.colorNode = mix(color(GOLD), color(ELFENBEIN), kern.mul(float(1).sub(u)));
  material.opacityNode = kern.add(hof).mul(laenge).mul(uSichtbar).mul(staerke);
  return material;
}

// ───────────── Hilfen ─────────────

/** Gleichbleibende Zufallszahlen (wie zufall() in umgebung.ts). */
function zufall(saat: number) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Licht wird aufaddiert. Die Leinwand ist durchsichtig: Wo nur wenig Licht
 * liegt, scheinen die Teile der Seite darunter (Verlauf, Schriftzug) durch.
 * Farbe und Deckkraft wachsen gemeinsam, damit der Browser die Leinwand
 * sauber über die Seite legt.
 */
function alsLicht<T extends THREE.Material>(material: T): T {
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneFactor;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneFactor;
  return material;
}

function teilchenMaterial() {
  return alsLicht(new THREE.SpriteNodeMaterial());
}

/** Runder, weicher Punkt aus der Fläche eines Teilchens. */
function punktForm() {
  const d = uv().sub(0.5).length();
  return smoothstep(0.5, 0.12, d);
}

// ───────────── Die Szene ─────────────

export async function starteSzene(
  leinwand: HTMLCanvasElement,
  anker: HTMLElement,
  art: SzenenArt,
): Promise<Szene> {
  const e = EINSTELLUNG[art];
  const renderer = new THREE.WebGPURenderer({ canvas: leinwand, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  await renderer.init();

  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(SICHTFELD, 1, 0.1, 120);
  kamera.position.set(0, 0, ABSTAND);
  szene.add(kamera);
  const halbeHoehe = Math.tan(THREE.MathUtils.degToRad(SICHTFELD / 2)) * ABSTAND;

  // Gemeinsame Werte für alle Shader.
  const uZeit = uniform(0);
  const uMaus = uniform(new THREE.Vector3(0, 0, 0));
  const uMausKraft = uniform(0);
  const uLogo = uniform(new THREE.Vector3());
  const uGroesse = uniform(1);
  const uSichtbar = uniform(0);
  const uLicht = uniform(new THREE.Vector3(0.35, 0.45, 1).normalize());
  const uGlanz = uniform(-4);
  const uLeinwand = uniform(new THREE.Vector2(1, 1));

  const entsorgen: { dispose: () => void }[] = [];
  const merken = <T extends { dispose: () => void }>(ding: T) => {
    entsorgen.push(ding);
    return ding;
  };

  // ── Grund: Der dunkle Verlauf kommt aus dem Stylesheet (fast schwarzes Blau,
  // Glut am unteren Rand). Darüber zieht hier langsam ein Nebel, die Glut
  // flackert leicht, und ein kühler Schein folgt der Maus.
  const grundFlaeche = (() => {
    const b = uv();
    const nebel = mx_noise_float(vec3(b.x.mul(2.2), b.y.mul(1.3), uZeit.mul(0.035))).mul(0.5).add(0.5);
    const fein = mx_noise_float(vec3(b.x.mul(6.5), b.y.mul(4.2), uZeit.mul(0.06).add(7))).mul(0.5).add(0.5);
    const schleier = color(0x1c2c62).mul(pow(nebel.mul(fein.mul(0.55).add(0.45)), 2).mul(0.75)).mul(smoothstep(0.0, 0.6, b.y).mul(0.6).add(0.4));
    const flackern = mx_noise_float(vec3(b.x.mul(2.6), uZeit.mul(0.12), 3)).mul(0.3).add(0.85);
    const glut = mix(color(0x6d3319), color(0x23120d), smoothstep(0.0, 0.07, b.y))
      .mul(float(1).sub(smoothstep(0.0, 0.17, b.y)))
      .mul(flackern)
      .mul(0.45);
    // Ein kühler Lichtschein folgt der Maus durch den Nebel.
    const zurMaus = b.sub(uMaus.xy.div(uLeinwand).mul(0.5).add(0.5)).mul(vec2(uLeinwand.x.div(uLeinwand.y), 1));
    const schein = exp(dot(zurMaus, zurMaus).mul(-9)).mul(uMausKraft.mul(0.5).add(0.25)).mul(nebel).mul(0.3);
    const material = merken(alsLicht(new THREE.MeshBasicNodeMaterial()));
    // Als Licht mit eigener Deckkraft: so hell wie sein hellster Farbanteil.
    const licht = schleier.add(glut).add(color(0x30447e).mul(schein));
    const staerke = max(licht.r, max(licht.g, licht.b)).clamp(0.0001, 1);
    material.colorNode = licht.div(staerke);
    material.opacityNode = staerke;
    const grund = new THREE.Mesh(merken(new THREE.PlaneGeometry(1, 1)), material);
    grund.position.z = -60;
    grund.renderOrder = -1;
    grund.frustumCulled = false;
    kamera.add(grund);
    return grund;
  })();

  // ── Das Zeichen.
  const zeichen = new THREE.Group();
  const kipper = new THREE.Group();
  zeichen.add(kipper);
  {
    const { balken, stern } = logoFormen();
    const goldChrom = merken(chrom([0x3b2408, 0xd9ad4e, 0xfff1c2, 0x2a1d10, 0xa98448], 0xfff3cf, uLicht, uGlanz));
    const hellChrom = merken(chrom([0x252a40, 0xc9ced9, 0xffffff, 0x141b36, 0x9aa6c8], 0xffffff, uLicht, uGlanz));
    kipper.add(new THREE.Mesh(merken(ausziehen(balken, 0.15, 0.022, 0)), goldChrom));
    kipper.add(new THREE.Mesh(merken(ausziehen(stern, 0.2, 0.006, 0.05)), hellChrom));
  }
  szene.add(zeichen);

  // ── Lichtspuren, die der Maus folgen.
  const spuren: Spur[] = [];
  const bandStoff = merken(bandMaterial(uSichtbar, e.baender ? 1.25 : 0.95));
  for (let i = 0; i < e.spuren + e.baender; i++) {
    const spur = new Spur(e.baender ? 84 : 52, e.baender ? 0.13 : 0.1, e.baender ? 9 : 7 - i * 1.4, bandStoff, new THREE.Vector3());
    spuren.push(spur);
    szene.add(spur.netz);
  }

  // ── Feine Teilchen.
  const rnd = zufall(art.length * 977 + 13);
  const teilchenGruppe: THREE.Sprite[] = [];

  if (e.staub) {
    // Staub schwebt langsam nach oben; um die Maus herum wird er mitgerissen.
    const daten = new Float32Array(e.staub * 4);
    for (let i = 0; i < e.staub; i++) {
      daten.set([(rnd() - 0.5) * 16, (rnd() - 0.5) * 8, (rnd() - 0.5) * 5 - 0.5, rnd()], i * 4);
    }
    const basis = instancedBufferAttribute<"vec4">(new THREE.InstancedBufferAttribute(daten, 4), "vec4");
    const saat = basis.w;
    const x = basis.x.add(sin(uZeit.mul(0.21).add(saat.mul(40))).mul(0.2));
    const y = basis.y.add(uZeit.mul(saat.mul(0.06).add(0.025))).add(4).mod(8).sub(4);
    const d = vec2(x, y).sub(uMaus.xy);
    const naehe = exp(dot(d, d).mul(-1.3)).mul(uMausKraft);
    const wirbel = vec2(d.y.negate(), d.x).mul(1.1).add(d.mul(0.35)).mul(naehe);
    const material = merken(teilchenMaterial());
    material.positionNode = vec3(x.add(wirbel.x), y.add(wirbel.y), basis.z);
    material.scaleNode = saat.mul(0.03).add(0.012);
    const hell = varying(naehe);
    material.colorNode = mix(color(NEBEL_BLAU), color(GOLD_HELL), hell.min(1));
    material.opacityNode = punktForm()
      .mul(sin(uZeit.mul(1.3).add(saat.mul(60))).mul(0.3).add(0.55).add(hell.mul(0.6)))
      .mul(uSichtbar)
      .mul(0.75);
    const staub = new THREE.Sprite(material);
    staub.count = e.staub;
    staub.frustumCulled = false;
    teilchenGruppe.push(staub);
  }

  if (e.wolke) {
    // Punktwolke als Kugelschale um das Zeichen. Sie dreht sich langsam; die
    // Maus drückt die Punkte zur Seite, wo sie berührt werden, leuchten sie golden.
    const daten = new Float32Array(e.wolke * 4);
    const goldenerWinkel = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < e.wolke; i++) {
      const yy = 1 - (i / (e.wolke - 1)) * 2;
      const rr = Math.sqrt(1 - yy * yy);
      const w = goldenerWinkel * i;
      const tiefe = 1 + (rnd() - 0.5) * 0.12;
      daten.set([Math.cos(w) * rr * tiefe, yy * tiefe, Math.sin(w) * rr * tiefe, rnd()], i * 4);
    }
    const basis = instancedBufferAttribute<"vec4">(new THREE.InstancedBufferAttribute(daten, 4), "vec4");
    const saat = basis.w;
    const winkel = uZeit.mul(0.09);
    const c = cos(winkel);
    const s = sin(winkel);
    const radius = uGroesse.mul(2.35);
    const atmen = sin(uZeit.mul(0.6).add(saat.mul(12))).mul(0.025).add(1);
    const px = basis.x.mul(c).sub(basis.z.mul(s)).mul(radius).mul(atmen);
    const pz = basis.x.mul(s).add(basis.z.mul(c)).mul(radius).mul(atmen);
    const py = basis.y.mul(radius).mul(atmen);
    const lage = vec3(px, py, pz).add(uLogo);
    const d = lage.xy.sub(uMaus.xy);
    const naehe = exp(dot(d, d).mul(-2.2)).mul(uMausKraft);
    const weg = d.normalize().mul(naehe).mul(0.7);
    const material = merken(teilchenMaterial());
    material.positionNode = vec3(lage.x.add(weg.x), lage.y.add(weg.y), lage.z);
    material.scaleNode = saat.mul(0.02).add(0.022);
    const hell = varying(naehe);
    const vorn = varying(smoothstep(radius.negate(), radius, pz));
    material.colorNode = mix(color(NEBEL_BLAU), color(GOLD_HELL), hell.min(1).max(saat.greaterThan(0.94).select(float(0.85), float(0))));
    material.opacityNode = punktForm().mul(vorn.mul(0.75).add(0.18)).mul(hell.mul(0.8).add(0.7)).mul(uSichtbar);
    const wolke = new THREE.Sprite(material);
    wolke.count = e.wolke;
    wolke.frustumCulled = false;
    teilchenGruppe.push(wolke);
  }

  if (e.ringe) {
    // Ein Tunnel aus Punktringen, der sich langsam auf den Betrachter zubewegt.
    // Die Maus lenkt sein hinteres Ende, beim Scrollen fliegt die Kamera hinein.
    const proRing = 72;
    const anzahl = e.ringe * proRing;
    const daten = new Float32Array(anzahl * 4);
    for (let k = 0; k < e.ringe; k++) {
      for (let j = 0; j < proRing; j++) {
        daten.set([(j / proRing) * Math.PI * 2, k, rnd(), rnd()], (k * proRing + j) * 4);
      }
    }
    const basis = instancedBufferAttribute<"vec4">(new THREE.InstancedBufferAttribute(daten, 4), "vec4");
    const laenge = e.ringe * 1.5;
    const z = basis.y.mul(-1.5).add(uZeit.mul(0.8)).mod(laenge).sub(laenge - 4);
    const tiefe = z.negate().max(0).div(laenge);
    const radius = float(3.1).mul(sin(basis.x.mul(3).add(uZeit.mul(0.4)).add(basis.y)).mul(0.035).add(1));
    const lenkung = uMaus.xy.sub(uLogo.xy).mul(pow(tiefe, 1.4)).mul(-1.6);
    const lage = vec3(cos(basis.x).mul(radius), sin(basis.x).mul(radius), z).add(vec3(uLogo.xy.add(lenkung), 0));
    const material = merken(teilchenMaterial());
    material.positionNode = lage;
    material.scaleNode = basis.z.mul(0.02).add(0.03);
    const golden = varying(basis.y.mod(6).lessThan(1).select(float(1), float(0)));
    material.colorNode = mix(color(NEBEL_BLAU), color(GOLD_HELL), golden);
    material.opacityNode = punktForm()
      .mul(smoothstep(-laenge + 4, -laenge + 16, z))
      .mul(float(1).sub(smoothstep(1.5, 4, z)))
      .mul(float(0.5).add(golden.mul(0.4)))
      .mul(uSichtbar);
    const tunnel = new THREE.Sprite(material);
    tunnel.count = anzahl;
    tunnel.frustumCulled = false;
    teilchenGruppe.push(tunnel);
  }
  teilchenGruppe.forEach((t) => szene.add(t));

  // ── Größe und Lage: Das Zeichen sitzt genau auf dem Platzhalter im Text.
  let breite = 1;
  let hoehe = 1;
  let proPixel = 1;
  const logoLage = new THREE.Vector3();
  let groesse = 1;
  const vermessen = () => {
    const r = leinwand.getBoundingClientRect();
    breite = Math.max(1, r.width);
    hoehe = Math.max(1, r.height);
    renderer.setSize(breite, hoehe, false);
    kamera.aspect = breite / hoehe;
    kamera.updateProjectionMatrix();
    proPixel = (2 * halbeHoehe) / hoehe;
    const a = anker.getBoundingClientRect();
    logoLage.set((a.left + a.width / 2 - r.left - breite / 2) * proPixel, -(a.top + a.height / 2 - r.top - hoehe / 2) * proPixel, 0);
    groesse = (a.width * proPixel) / 2;
    uLogo.value.copy(logoLage);
    uGroesse.value = groesse;
    uLeinwand.value.set(halbeHoehe * kamera.aspect, halbeHoehe);
    const grundHoehe = 2 * Math.tan(THREE.MathUtils.degToRad(SICHTFELD / 2)) * 60;
    grundFlaeche.scale.set(grundHoehe * kamera.aspect * 1.02, grundHoehe * 1.02, 1);
  };
  vermessen();
  const beobachter = new ResizeObserver(vermessen);
  beobachter.observe(leinwand);

  // ── Maus und Tippen.
  const mausZiel = new THREE.Vector3();
  let mausAktiv = 0;
  let mausGesehen = false;
  const zeiger = (ev: PointerEvent) => {
    const r = leinwand.getBoundingClientRect();
    mausZiel.set((ev.clientX - r.left - breite / 2) * proPixel, -(ev.clientY - r.top - hoehe / 2) * proPixel, 0);
    if (!mausGesehen) uMaus.value.copy(mausZiel);
    mausGesehen = true;
    mausAktiv = 1;
  };
  window.addEventListener("pointermove", zeiger, { passive: true });
  window.addEventListener("pointerdown", zeiger, { passive: true });

  // ── Bewegung.
  const zustand = { auftritt: 0, glanz: -4, scroll: 0 };
  const kippIst = new THREE.Vector2();
  const ziel = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const umMaus = new THREE.Vector3();
  const zAchse = new THREE.Vector3(0, 0, 1);
  let zeit = 0;
  let letzte = performance.now();

  const bild = () => {
    const jetzt = performance.now();
    const dt = Math.min(0.05, (jetzt - letzte) / 1000);
    letzte = jetzt;
    zeit += dt;
    uZeit.value = zeit;

    mausAktiv = Math.max(0, mausAktiv - dt / 3.2);
    uMaus.value.lerp(mausZiel, 1 - Math.exp(-dt * 6));
    uMausKraft.value += (Math.min(1, mausAktiv * 1.6) * (mausGesehen ? 1 : 0) - uMausKraft.value) * (1 - Math.exp(-dt * 4));
    uSichtbar.value = zustand.auftritt;
    uGlanz.value = zustand.glanz;

    // Zeichen: schwebt leicht, neigt sich zur Maus, das Glanzlicht folgt ihr.
    const relX = mausGesehen ? (uMaus.value.x - logoLage.x) / (halbeHoehe * kamera.aspect) : 0;
    const relY = mausGesehen ? (uMaus.value.y - logoLage.y) / halbeHoehe : 0;
    const zielY = Math.sin(zeit * 0.35) * 0.2 + relX * 0.55;
    const zielX = -0.1 + Math.sin(zeit * 0.27) * 0.07 - relY * 0.4;
    kippIst.x += (zielX - kippIst.x) * (1 - Math.exp(-dt * 3));
    kippIst.y += (zielY - kippIst.y) * (1 - Math.exp(-dt * 3));
    kipper.rotation.set(kippIst.x, kippIst.y + (1 - zustand.auftritt) * -1.7, 0);
    uLicht.value.set(0.35 + relX * 1.4, 0.45 + relY * 1.2, 1).normalize();
    const schweben = Math.sin(zeit * 0.8) * 0.04 * groesse;
    zeichen.position.set(logoLage.x, logoLage.y + schweben, 0);
    zeichen.scale.setScalar(groesse * (0.55 + 0.45 * zustand.auftritt));
    // Bis zum Auftritt steht das Zeichen als Bild im Platzhalter, nicht doppelt.
    zeichen.visible = zustand.auftritt > 0.001;

    // Tiefenflug: Beim Scrollen fliegt die Kamera durch den Tunnel am Zeichen vorbei.
    if (e.ringe) {
      const p = zustand.scroll;
      kamera.position.set(logoLage.x * p, logoLage.y * p, ABSTAND - p * 15);
      kamera.lookAt(logoLage.x * p * 1.2, logoLage.y * p * 1.2, kamera.position.z - 10);
      zeichen.rotation.z = p * 1.2;
    }

    // Lichtspuren.
    const t = zeit;
    spuren.forEach((spur, i) => {
      if (e.baender) {
        // Bänder kreisen auf geneigten Bahnen um das Zeichen und beugen sich zur Maus.
        const w = t * (0.62 + i * 0.08) + i * 1.25;
        const rx = groesse * (2.1 + (i % 3) * 0.45);
        const ry = groesse * (0.7 + (i % 2) * 0.4);
        const neig = -0.5 + i * 0.27;
        tmp.set(Math.cos(w) * rx, Math.sin(w) * ry, Math.sin(w) * groesse * 1.4);
        tmp.applyAxisAngle(zAchse, neig);
        ziel.copy(logoLage).add(tmp);
        if (mausGesehen) {
          const zug = uMausKraft.value * 0.45 * Math.exp(-ziel.distanceToSquared(uMaus.value) / (groesse * groesse * 6));
          ziel.lerp(uMaus.value, zug);
        }
      } else {
        // Spuren: ohne Maus ziehen sie in weiten Bögen um das Zeichen, mit Maus
        // umflechten sie den Zeiger.
        const w = t * (0.7 + i * 0.23) + i * 2.1;
        const rund = groesse * (2.2 + i * 0.45);
        tmp.set(Math.cos(w) * rund * 1.35, Math.sin(w * 1.3) * rund * 0.6, Math.sin(w * 0.8) * groesse);
        ziel.copy(logoLage).add(tmp);
        umMaus.set(Math.cos(t * 2.4 + i * 2.1), Math.sin(t * 2.4 + i * 2.1), Math.sin(t * 1.7 + i)).multiplyScalar(0.28 + i * 0.08);
        ziel.lerp(tmp.copy(uMaus.value).add(umMaus), Math.min(1, uMausKraft.value * 1.15));
      }
      spur.folgen(ziel, dt);
    });

    renderer.render(szene, kamera);
  };

  let laeuft = false;
  const laufen = (an: boolean) => {
    if (an === laeuft) return;
    laeuft = an;
    letzte = performance.now();
    renderer.setAnimationLoop(an ? bild : null);
  };
  // Nur rechnen, solange der Kopfbereich zu sehen ist.
  const waechter = new IntersectionObserver(([eintrag]) => laufen(eintrag.isIntersecting));
  waechter.observe(leinwand);
  laufen(true);

  let gezeigt = false;
  return {
    zeigen: () => {
      if (gezeigt) return;
      gezeigt = true;
      gsap.to(zustand, { auftritt: 1, duration: 1.9, ease: "expo.out" });
      gsap.fromTo(zustand, { glanz: -3.2 }, { glanz: 3.2, duration: 2.4, ease: "power2.inOut", delay: 0.35 });
      // Später läuft der Glanz ab und zu noch einmal über das Zeichen.
      gsap.to(zustand, { glanz: 3.2, startAt: { glanz: -3.2 }, duration: 2.4, ease: "power2.inOut", repeat: -1, repeatDelay: 6.5, delay: 7 });
    },
    scroll: (p) => {
      zustand.scroll = p;
    },
    ende: () => {
      gsap.killTweensOf(zustand);
      laufen(false);
      waechter.disconnect();
      beobachter.disconnect();
      window.removeEventListener("pointermove", zeiger);
      window.removeEventListener("pointerdown", zeiger);
      spuren.forEach((s) => s.entsorgen());
      entsorgen.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
