// Das Logo aus Licht (hintere Ebene des Kopfbereichs).
//
// Kein Modell, kein three.js: ein einziger Shader auf einer Leinwand. Die vier
// Balken sind goldene Lichtbalken, der Stern ein fast weißes Licht mit goldenem
// Hof. Wie Licht durch Nebel: Vom Stern aus gesehen wirft jeder Balken einen
// Lichtschacht ins Dunkle. Wandert der Stern, neigen sich die Schächte mit.
// Die Körnung entsteht dadurch, dass jeder Bildpunkt den Nebel an leicht
// versetzten Stellen abtastet.

/** Der Balken im rechten oberen Viertel in Logo-Einheiten (Außenkante = 1, y nach oben). Die drei anderen sind gespiegelt. */
export const BALKEN_ECKEN = [0.1299, 0.9957, 1.0, 0.1342, 0.7078, 0.1342, 0.1299, 0.71] as const;
/** Mitte eines Balkens (in beiden Achsen gleich weit von der Logo-Mitte). */
export const BALKEN_MITTE = 0.49;

export type LichtWerte = {
  /** Mitte des Logos in Leinwand-Pixeln, y von unten. */
  mitteX: number;
  mitteY: number;
  /** Halbe Breite des Logos in Leinwand-Pixeln. */
  radius: number;
  /** Lage des Sterns in Logo-Einheiten (0/0 = Mitte). */
  sternX: number;
  sternY: number;
  /** Helligkeit der Balken: oben links, oben rechts, unten links, unten rechts. */
  balken: readonly [number, number, number, number];
  sternHell: number;
  zeit: number;
  /** Kurzes Aufleuchten nach einem Klick (1 → 0). */
  blitz: number;
  /** Gesamthelligkeit (1 = Computer; am Handy etwas weniger, damit der kleine Name lesbar bleibt). */
  hell: number;
};

export type Licht = {
  groesse: (breite: number, hoehe: number) => void;
  zeichnen: (w: LichtWerte) => void;
  ende: () => void;
};

const ECKEN = `
attribute vec2 aLage;
void main() {
  gl_Position = vec4(aLage, 0.0, 1.0);
}`;

const LICHT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uMitte;
uniform float uRadius;
uniform vec2 uStern;
uniform vec4 uBalken;
uniform float uSternHell;
uniform float uZeit;
uniform float uBlitz;
uniform float uHell;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float rausch(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

// Abstand zu einer Kante des Balkens; merkt sich, ob der Punkt innen liegt.
float kante(vec2 p, vec2 a, vec2 b, inout float s) {
  vec2 e = b - a;
  vec2 w = p - a;
  vec2 q = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
  bvec3 c = bvec3(p.y >= a.y, p.y < b.y, e.x * w.y > e.y * w.x);
  if (all(c) || all(not(c))) s = -s;
  return dot(q, q);
}

// Abstand zum nächsten der vier Balken (innen negativ). Das Logo ist an
// beiden Achsen gespiegelt, deshalb genügt ein Balken.
float balken(vec2 p) {
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
  return s * sqrt(m);
}

// Helligkeit des Balkens, in dessen Viertel der Punkt liegt.
float viertel(vec2 p) {
  float wx = smoothstep(-0.12, 0.12, p.x);
  float wy = smoothstep(-0.12, 0.12, p.y);
  return mix(mix(uBalken.z, uBalken.w, wx), mix(uBalken.x, uBalken.y, wx), wy);
}

// Wie stark ein Punkt selbst leuchtet: 1 im Balken, weicher Rand.
float glut(vec2 p) {
  return smoothstep(0.035, -0.03, balken(p)) * viertel(p);
}

void main() {
  vec2 p = (gl_FragCoord.xy - uMitte) / uRadius;
  float atem = 1.0 + 0.05 * sin(uZeit * 1.05) + 0.02 * sin(uZeit * 2.3 + 1.0);
  float schub = 1.0 + uBlitz * 1.3;
  float korn = hash(gl_FragCoord.xy + floor(uZeit * 14.0) * vec2(17.0, 59.0));

  vec3 farbe = vec3(0.0);

  if (dot(p, p) < 16.0) {
    // ── Balken: der leuchtende Kern, weich wie durch Nebel.
    float d = balken(p);
    float nebel = rausch(p * 2.6 + vec2(uZeit * 0.03, -uZeit * 0.021));
    float kern = smoothstep(0.035, -0.03, d) * (0.74 + 0.26 * nebel) * viertel(p);
    float hof = exp(-max(d, 0.0) * 11.0) * 0.2 * viertel(p);

    // ── Lichtschächte: vom Stern aus durch die Balken ins Dunkle.
    vec2 zumStern = uStern - p;
    float weg = length(zumStern);
    vec2 richtung = zumStern / max(weg, 0.0001);
    float lang = min(weg, 1.7);
    float aussen = 0.0;
    for (int i = 0; i < 22; i++) {
      float s = (float(i) + korn) / 22.0 * lang;
      aussen += glut(p + richtung * s) * exp(-s * 3.7 / schub);
    }
    aussen *= lang / 22.0;
    // Schwächer auch nach innen, auf den Stern zu.
    float innen = 0.0;
    for (int j = 0; j < 8; j++) {
      float s = (float(j) + korn) / 8.0 * 0.95;
      innen += glut(p - richtung * s) * exp(-s * 3.6);
    }
    innen *= 0.95 / 8.0;

    // Feine Strahlen: Der Nebel ist nicht überall gleich dicht.
    vec2 blick = -richtung;
    float breit = rausch(blick * 2.3 + vec2(11.3, 4.1) + uZeit * 0.014);
    float fein = rausch(blick * 13.0 + 3.7) * rausch(blick * 37.0 - 9.1);
    float strahl = (0.5 + 1.0 * breit) * (0.5 + 2.4 * fein);
    float schacht = (aussen * 2.5 + innen * 0.8) * strahl * schub;

    vec3 goldKern = vec3(1.0, 0.7, 0.27);
    vec3 goldHof = vec3(0.95, 0.6, 0.18);
    vec3 goldFern = vec3(0.7, 0.38, 0.1);
    farbe += atem * (goldKern * kern * 0.5 + goldHof * hof + mix(goldFern, goldHof, clamp(schacht * 1.6, 0.0, 1.0)) * schacht);

    // ── Stern: fast weißes Licht, goldener Hof, weiche Strahlen nach außen.
    vec2 s = p - uStern;
    float sl = length(s);
    float q = 0.536;
    float form = pow(pow(abs(s.x), q) + pow(abs(s.y), q), 1.0 / q) - 0.4437;
    float sKern = smoothstep(0.04, -0.035, form);
    float sHof = exp(-max(form, 0.0) * 7.0) * 0.36 + exp(-sl * 3.2) * 0.2;
    float arme = exp(-abs(s.x) * 26.0) * exp(-abs(s.y) * 2.8) + exp(-abs(s.y) * 26.0) * exp(-abs(s.x) * 2.8);
    vec2 sd = s / max(sl, 0.0001);
    float keil = rausch(sd * 1.9 + vec2(7.0, 2.0) + uZeit * 0.02);
    float sFein = rausch(sd * 6.0 + 7.0) * rausch(sd * 21.0 + 1.3);
    float sStrahl = (keil * keil * 1.3 + sFein * 1.7) * exp(-sl * 2.7) * (0.75 + 0.5 * korn);
    farbe += uSternHell * atem * (
      vec3(1.0, 0.97, 0.9) * (sKern * 1.0 + arme * 0.3) +
      vec3(1.0, 0.74, 0.34) * (sHof + sStrahl * 0.5) * schub
    );
  }

  // Leichte Körnung, dann weich begrenzen.
  farbe *= (0.86 + 0.28 * korn) * uHell;
  farbe = 1.0 - exp(-farbe * 1.35);
  float deckung = max(farbe.r, max(farbe.g, farbe.b));
  gl_FragColor = vec4(farbe, deckung);
}`;

/**
 * Richtet den Licht-Shader auf der Leinwand ein. Gibt null zurück, wenn der
 * Browser kein WebGL hat; dann bleibt das Logo als Bild stehen.
 */
export function erzeugeLicht(leinwand: HTMLCanvasElement): Licht | null {
  const gl = leinwand.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  type Orte = Record<"mitte" | "radius" | "stern" | "balken" | "sternHell" | "zeit" | "blitz" | "hell", WebGLUniformLocation | null>;
  let orte: Orte | null = null;

  const schatten = (art: number, quelle: string) => {
    const s = gl.createShader(art);
    if (!s) return null;
    gl.shaderSource(s, quelle);
    gl.compileShader(s);
    if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
    console.warn("Licht-Shader lässt sich nicht übersetzen:", gl.getShaderInfoLog(s));
    return null;
  };

  const bauen = () => {
    const a = schatten(gl.VERTEX_SHADER, ECKEN);
    const b = schatten(gl.FRAGMENT_SHADER, LICHT);
    const programm = gl.createProgram();
    if (!a || !b || !programm) return false;
    gl.attachShader(programm, a);
    gl.attachShader(programm, b);
    gl.linkProgram(programm);
    if (!gl.getProgramParameter(programm, gl.LINK_STATUS)) return false;
    gl.useProgram(programm);
    // Ein einziges Dreieck, das die ganze Leinwand bedeckt.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const lage = gl.getAttribLocation(programm, "aLage");
    gl.enableVertexAttribArray(lage);
    gl.vertexAttribPointer(lage, 2, gl.FLOAT, false, 0, 0);
    const ort = (name: string) => gl.getUniformLocation(programm, name);
    orte = {
      mitte: ort("uMitte"),
      radius: ort("uRadius"),
      stern: ort("uStern"),
      balken: ort("uBalken"),
      sternHell: ort("uSternHell"),
      zeit: ort("uZeit"),
      blitz: ort("uBlitz"),
      hell: ort("uHell"),
    };
    gl.clearColor(0, 0, 0, 0);
    return true;
  };
  if (!bauen()) return null;

  // Nimmt der Browser die Grafikkarte kurz weg, wird danach neu eingerichtet.
  const verloren = (ev: Event) => {
    ev.preventDefault();
    orte = null;
  };
  const zurueck = () => {
    bauen();
    gl.viewport(0, 0, leinwand.width, leinwand.height);
  };
  leinwand.addEventListener("webglcontextlost", verloren);
  leinwand.addEventListener("webglcontextrestored", zurueck);

  return {
    groesse: (breite, hoehe) => {
      leinwand.width = Math.max(1, breite);
      leinwand.height = Math.max(1, hoehe);
      gl.viewport(0, 0, leinwand.width, leinwand.height);
    },
    zeichnen: (w) => {
      if (!orte) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(orte.mitte, w.mitteX, w.mitteY);
      gl.uniform1f(orte.radius, w.radius);
      gl.uniform2f(orte.stern, w.sternX, w.sternY);
      gl.uniform4f(orte.balken, w.balken[0], w.balken[1], w.balken[2], w.balken[3]);
      gl.uniform1f(orte.sternHell, w.sternHell);
      gl.uniform1f(orte.zeit, w.zeit);
      gl.uniform1f(orte.blitz, w.blitz);
      gl.uniform1f(orte.hell, w.hell);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    ende: () => {
      leinwand.removeEventListener("webglcontextlost", verloren);
      leinwand.removeEventListener("webglcontextrestored", zurueck);
      // Die Verbindung zur Grafikkarte bleibt bestehen: Dieselbe Leinwand kann
      // noch einmal eingerichtet werden (React richtet beim Entwickeln doppelt ein).
      orte = null;
    },
  };
}

/** Abstand eines Punktes (Logo-Einheiten) zum nächsten Balken; im Balken 0. Für die Zeichen, die das Licht anstrahlt. */
export function abstandZumBalken(x: number, y: number): number {
  const px = Math.abs(x);
  const py = Math.abs(y);
  const e = BALKEN_ECKEN;
  let innen = true;
  let kleinste = Infinity;
  for (let i = 0; i < 4; i++) {
    const ax = e[i * 2];
    const ay = e[i * 2 + 1];
    const bx = e[((i + 1) % 4) * 2];
    const by = e[((i + 1) % 4) * 2 + 1];
    const ex = bx - ax;
    const ey = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    // Die Ecken laufen im Uhrzeigersinn: innen liegt, was rechts jeder Kante liegt.
    if (ex * wy - ey * wx > 0) innen = false;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    const dx = wx - ex * t;
    const dy = wy - ey * t;
    kleinste = Math.min(kleinste, dx * dx + dy * dy);
  }
  return innen ? 0 : Math.sqrt(kleinste);
}
