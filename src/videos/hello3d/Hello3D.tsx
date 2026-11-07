import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {APPLE_COLORS, HELLO_PALETTE} from '../hello/measured';
import {
  appleTurn,
  colourShift,
  drawProgress,
  drawTimeAt,
  forwardTime,
  LETTER_AXES,
  LETTER_STAGGER,
  letterTurn,
  monotone,
  STACK_X,
  stackPull,
  SWITCH,
} from '../hello/timing';
import {APPLE, APPLE_RGB, AXIS_Y, HELLO, HELLO_RGB, letterWeights, lookup, SLANT_X, SLANT_Y} from '../hello/tube';

// Real 3D version: a glass tube mesh with rounded ends. Each loop of the hello turns in 3D on its own axis
// (its sideways offset becomes depth), then the letters slide into a stack; the Apple logo turns in as one
// piece. Units are pixels of the original 1280x720 clip; the camera reproduces its perspective.

export const LOOK3D = {
  radius: 20,
  focal: 2000, // camera distance in 1280-scale px
  body: 0.34, // light of the glass facing the camera
  rim: 1.1, // extra light where the tube turns away (the bright edges)
  rimPow: 2.2,
  spec: 0.3,
  heatTau: 3.5,
  heatMix: 0.35,
  fadeIn: 2.5,
  // bloom at rest, tuned so the haze around the word matches the original (~50/255 within 80 px)
  glowNear: {blur: 10, alpha: 0.3},
  glowFar: {blur: 52, alpha: 1.05},
  glowSaturate: 1.5,
  shutter: 0.35,
  applePivot: 650,
  turnSide: 1, // which way the loops' far side goes into depth
  appleSide: 1,
  endTilt: 55, // how far the free ends of the tube curl toward the camera
  uTurnDepth: 45, // radius of the h's turn back through depth at the bottom of its stem
};

/**
 * The glow that sweeps through the word as it is written, measured from the haze around the word and how
 * washed-out the colours are. `bloom` multiplies the bloom; `white` mixes the whole drawn tube toward white.
 */
const writeBloom = monotone([
  [0, 1.35],
  [26, 1.35],
  [32, 1.3],
  [35, 1.4],
  [38, 1.5],
  [41, 1.55],
  [44, 1.25],
  [47, 1.08],
  [52, 1],
]);
const writeWhite = monotone([
  [0, 0],
  [20, 0.02],
  [26, 0.06],
  [32, 0.12],
  [35, 0.12],
  [38, 0.08],
  [41, 0.06],
  [44, 0.03],
  [48, 0.01],
  [52, 0],
]);

const SEGMENTS_PER_PX = 0.45;
const RADIAL = 20;

const vertexShader = /* glsl */ `
attribute vec3 tint;
varying vec3 vTint;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vTint = tint;
  gl_Position = projectionMatrix * mv;
}`;
const fragmentShader = /* glsl */ `
uniform float body;
uniform float rim;
uniform float rimPow;
uniform float spec;
varying vec3 vTint;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float edge = pow(1.0 - ndv, rimPow);
  vec3 l = normalize(vec3(-0.4, 0.8, 0.6));
  float hl = pow(max(dot(reflect(-l, n), v), 0.0), 24.0);
  vec3 c = vTint * (body + rim * edge) + vec3(spec * hl) * (0.4 + 0.6 * vTint);
  gl_FragColor = vec4(c, 1.0);
}`;

type P3 = {x: number; y: number; z: number};

/**
 * The hello at rest, in 3D. Mostly flat, except: at the bottom of the h's stem the stroke turns back through
 * depth (so from the front it shows as a round end, not a kink), and the two free ends curl a little toward
 * the camera, so their rounded caps face us.
 */
const HELLO_REST: P3[] = (() => {
  const pts = HELLO.pts.map((p) => ({x: p.x, y: p.y, z: 0}));
  const n = pts.length;
  // bottom of the h's stem: the lowest point in the first quarter of the stroke
  let b = 0;
  for (let i = 0; i < n / 4; i++) if (pts[i].y > pts[b].y) b = i;
  const R = LOOK3D.uTurnDepth;
  const yb = pts[b].y;
  let a = b;
  while (a > 0 && pts[a].y > yb - R) a--;
  let e = b;
  while (e < n - 1 && pts[e].y > yb - R) e++;
  const xa = pts[a].x;
  const xe = pts[e].x;
  for (let i = a; i <= e; i++) {
    const f = (i - a) / (e - a);
    const phi = Math.PI * f;
    pts[i] = {x: xa + (xe - xa) * f, y: yb - R + R * Math.sin(phi), z: R * (1 - Math.cos(phi))};
  }
  // after the turn, come back to the flat plane over ~100 px
  const back = Math.round(100 / 2.5);
  for (let i = e + 1; i < Math.min(n, e + back); i++) {
    const u = (i - e) / back;
    pts[i].z = 2 * R * (1 - u * u * (3 - 2 * u));
  }
  // free ends curl toward the camera (negative z)
  const curl = Math.round(60 / 2.5);
  for (let i = 0; i < curl; i++) {
    const u = 1 - i / curl;
    pts[i].z -= LOOK3D.endTilt * u * u;
    pts[n - 1 - i].z -= LOOK3D.endTilt * u * u;
  }
  return pts;
})();

/** The hello's centreline at forward time t, in 3D, before perspective. */
const helloPoints = (t: number, upTo: number) => {
  const angles = LETTER_AXES.map((_, k) => (letterTurn(t - k * LETTER_STAGGER) * Math.PI) / 180);
  const pull = stackPull(t);
  const out: P3[] = [];
  for (let i = 0; i <= upTo; i++) {
    const p = HELLO_REST[i];
    const w = letterWeights[i];
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = 0; k < 5; k++) {
      if (!w[k]) continue;
      const dx = p.x - LETTER_AXES[k];
      const dy = p.y - AXIS_Y;
      const along = dx * SLANT_X + dy * SLANT_Y;
      const across = dx * SLANT_Y - dy * SLANT_X;
      const c = Math.cos(angles[k]);
      const s = Math.sin(angles[k]) * LOOK3D.turnSide;
      const across2 = across * c - p.z * s;
      const depth = across * s + p.z * c;
      const ax = LETTER_AXES[k] + (STACK_X - LETTER_AXES[k]) * pull;
      x += w[k] * (ax + along * SLANT_X + across2 * SLANT_Y);
      y += w[k] * (AXIS_Y + along * SLANT_Y - across2 * SLANT_X);
      z += w[k] * depth;
    }
    out.push({x, y, z});
  }
  return out;
};

const applePoints = (t: number): P3[] => {
  const th = (appleTurn(t) * Math.PI) / 180;
  const px = LOOK3D.applePivot;
  return APPLE.pts.map((p) => ({x: px + (p.x - px) * Math.cos(th), y: p.y, z: (p.x - px) * Math.sin(th) * LOOK3D.appleSide}));
};

const toScene = (p: P3) => new THREE.Vector3(p.x - 640, 360 - p.y, -p.z);

/** A tube mesh along points in 1280-scale picture space (y down) with depth z (positive = away). */
const tubeGeometry = (pts: P3[]) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(toScene));
  curve.arcLengthDivisions = 3000;
  const length = curve.getLength();
  const rings = Math.max(2, Math.round(length * SEGMENTS_PER_PX));
  const geo = new THREE.TubeGeometry(curve, rings, LOOK3D.radius, RADIAL, false);
  return {geo, rings, curve};
};

/** Half a sphere closing one end of the tube, facing outward along the tube. */
const capGeometry = new THREE.SphereGeometry(LOOK3D.radius, RADIAL, 10, 0, Math.PI * 2, 0, Math.PI / 2);

type World = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  caps: THREE.Mesh[];
};

const build = (canvas: HTMLCanvasElement, width: number, height: number): World => {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, alpha: false});
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  const camera = new THREE.PerspectiveCamera((2 * Math.atan(360 / LOOK3D.focal) * 180) / Math.PI, 16 / 9, 10, 20000);
  camera.position.set(0, 0, LOOK3D.focal);
  camera.lookAt(0, 0, 0);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      body: {value: LOOK3D.body},
      rim: {value: LOOK3D.rim},
      rimPow: {value: LOOK3D.rimPow},
      spec: {value: LOOK3D.spec},
    },
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    side: THREE.FrontSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.frustumCulled = false;
  const caps = [0, 1].map(() => {
    const geo = capGeometry.clone();
    geo.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
    const m = new THREE.Mesh(geo, material);
    m.frustumCulled = false;
    return m;
  });
  const scene = new THREE.Scene();
  scene.add(mesh, ...caps);
  return {renderer, scene, camera, mesh, caps};
};

const UP = new THREE.Vector3(0, 1, 0);

/** Build the tube for forward time t and colour it. Returns false when nothing is visible. */
const pose = (w: World, t: number) => {
  const isApple = t >= SWITCH;
  const progress = isApple ? 1 : drawProgress(t);
  if (progress <= 0) return false;
  const total = (isApple ? APPLE : HELLO).pts.length;
  const upTo = Math.max(2, Math.floor(progress * (total - 1)));
  const pts = isApple ? applePoints(t) : helloPoints(t, upTo);
  const {geo, rings, curve} = tubeGeometry(pts);
  const tint = new Float32Array(geo.attributes.position.count * 3);
  const shift = colourShift(t);
  const appleShift = shift - colourShift(146);
  const shownLength = (upTo / (total - 1)) * (isApple ? APPLE.length : HELLO.length);
  const white = isApple ? 0 : writeWhite(t);
  const colourAt = (arc: number): [number, number, number] => {
    const c = isApple
      ? lookup(APPLE_RGB, APPLE_COLORS.step, APPLE_COLORS.length, arc - appleShift)
      : lookup(HELLO_RGB, HELLO_PALETTE.step, HELLO_PALETTE.period, arc - shift);
    let heat = 0;
    let alpha = 1;
    if (!isApple) {
      const age = t - drawTimeAt(arc / HELLO.length);
      heat = age < 0 ? 1 : Math.exp(-age / LOOK3D.heatTau);
      const a = Math.max(0, Math.min(1, age / LOOK3D.fadeIn));
      alpha = 0.25 + 0.75 * a * a * (3 - 2 * a);
    }
    const m = Math.min(1, heat * LOOK3D.heatMix + white);
    return [
      ((c[0] + (255 - c[0]) * m) / 255) * alpha,
      ((c[1] + (255 - c[1]) * m) / 255) * alpha,
      ((c[2] + (255 - c[2]) * m) / 255) * alpha,
    ];
  };
  for (let i = 0; i <= rings; i++) {
    const [r, g, b] = colourAt((i / rings) * shownLength);
    for (let j = 0; j <= RADIAL; j++) {
      const k = (i * (RADIAL + 1) + j) * 3;
      tint[k] = r;
      tint[k + 1] = g;
      tint[k + 2] = b;
    }
  }
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  w.mesh.geometry.dispose();
  w.mesh.geometry = geo;
  // rounded caps on both ends (the end moves with the writing)
  [0, 1].forEach((end) => {
    const cap = w.caps[end];
    const u = end === 0 ? 0 : 1;
    const pos = curve.getPointAt(u);
    const dir = curve.getTangentAt(u).normalize();
    if (end === 0) dir.negate();
    cap.position.copy(pos);
    cap.quaternion.setFromUnitVectors(UP, dir);
    const [r, g, b] = colourAt(end === 0 ? 0 : shownLength);
    const arr = (cap.geometry.attributes.tint as THREE.BufferAttribute).array as Float32Array;
    for (let k = 0; k < arr.length; k += 3) {
      arr[k] = r;
      arr[k + 1] = g;
      arr[k + 2] = b;
    }
    cap.geometry.attributes.tint.needsUpdate = true;
  });
  return true;
};

/** How far things move around t, to pick the number of motion-blur samples. */
const motion = (t: number) => {
  if (t < SWITCH) {
    const head = Math.abs(drawProgress(t + 0.5) - drawProgress(t - 0.5)) * 2900;
    const turn = Math.abs(letterTurn(t + 0.5) - letterTurn(t - 0.5)) * 6 + Math.abs(stackPull(t + 0.5) - stackPull(t - 0.5)) * 300;
    return Math.max(head, turn);
  }
  return Math.abs(appleTurn(t + 0.5) - appleTurn(t - 0.5)) * 3;
};

export const Hello3D: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const out = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const glCanvas = useRef<HTMLCanvasElement | null>(null);
  const glow = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    if (!glCanvas.current) {
      glCanvas.current = document.createElement('canvas');
      glCanvas.current.width = width;
      glCanvas.current.height = height;
    }
    if (!world.current) world.current = build(glCanvas.current, width, height);
    const w = world.current;
    const ctx = out.current!.getContext('2d') as CanvasRenderingContext2D;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const t = forwardTime(frame);
    if (t < 0) return;
    const n = Math.max(1, Math.min(10, Math.ceil((motion(t) * LOOK3D.shutter) / 5)));
    for (let k = 0; k < n; k++) {
      let st = n === 1 ? t : t + ((k + 0.5) / n - 0.5) * LOOK3D.shutter;
      if (t < SWITCH) st = Math.min(st, SWITCH - 0.001);
      else st = Math.max(st, SWITCH);
      if (!pose(w, st)) continue;
      w.renderer.render(w.scene, w.camera);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 / n;
      ctx.drawImage(glCanvas.current!, 0, 0, width, height);
      ctx.restore();
    }
    // bloom, stronger while the word is being written
    if (!glow.current) glow.current = document.createElement('canvas');
    const g = glow.current;
    const gw = Math.round(width / 4);
    const gh = Math.round(height / 4);
    g.width = gw;
    g.height = gh;
    const gx = g.getContext('2d') as CanvasRenderingContext2D;
    const K = width / 1280;
    const boost = t < SWITCH ? writeBloom(t) : 1;
    for (const gl of [LOOK3D.glowNear, LOOK3D.glowFar]) {
      gx.clearRect(0, 0, gw, gh);
      // the original's haze keeps its colour, so the bloom is boosted in saturation, not just blurred
      gx.filter = `blur(${(gl.blur * K) / 4}px) saturate(${LOOK3D.glowSaturate})`;
      gx.drawImage(out.current!, 0, 0, gw, gh);
      gx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      let a = gl.alpha * boost;
      while (a > 0) {
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(g, 0, 0, width, height);
        a -= 1;
      }
      ctx.restore();
    }
  }, [frame, width, height]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <canvas ref={out} width={width} height={height} style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};
