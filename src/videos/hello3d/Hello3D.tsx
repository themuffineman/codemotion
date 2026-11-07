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
  STACK_X,
  stackPull,
  SWITCH,
} from '../hello/timing';
import {APPLE, APPLE_RGB, AXIS_Y, HELLO, HELLO_RGB, letterWeights, lookup, SLANT_X, SLANT_Y} from '../hello/tube';

// Real 3D version: a glass tube mesh. Each loop of the hello turns in 3D on its own leaning axis (its
// sideways offset becomes depth), then the letters slide into a stack; the Apple logo turns in as one piece.
// Units are pixels of the original 1280x720 clip; the camera reproduces its perspective.

export const LOOK3D = {
  radius: 20,
  focal: 2000, // camera distance in 1280-scale px
  body: 0.55, // light of the glass facing the camera
  rim: 1.15, // extra light where the tube turns away (the bright edges)
  rimPow: 2.2,
  spec: 0.55,
  heatTau: 3.5,
  heatMix: 0.55,
  fadeIn: 2.5,
  glowNear: {blur: 9, alpha: 0.45},
  glowFar: {blur: 30, alpha: 0.45},
  shutter: 0.35,
  applePivot: 650,
  turnSide: 1, // which way the loops' far side goes into depth
  appleSide: 1,
};

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

/** A tube mesh along points given in 1280-scale picture space (y down) with depth z (positive = away). */
const tubeGeometry = (pts: {x: number; y: number; z: number}[]) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x - 640, 360 - p.y, -p.z)));
  curve.arcLengthDivisions = 3000;
  const length = curve.getLength();
  const rings = Math.max(2, Math.round(length * SEGMENTS_PER_PX));
  const geo = new THREE.TubeGeometry(curve, rings, LOOK3D.radius, RADIAL, false);
  return {geo, rings};
};

/** The hello's centreline at forward time t, in 3D, before perspective. */
const helloPoints = (t: number, upTo: number) => {
  const cosT = LETTER_AXES.map((_, k) => (letterTurn(t - k * LETTER_STAGGER) * Math.PI) / 180);
  const pull = stackPull(t);
  const out: {x: number; y: number; z: number}[] = [];
  for (let i = 0; i <= upTo; i++) {
    const p = HELLO.pts[i];
    const w = letterWeights[i];
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = 0; k < 5; k++) {
      if (!w[k]) continue;
      const dx = p.x - LETTER_AXES[k];
      const dy = p.y - AXIS_Y;
      const along = dx * SLANT_X + dy * SLANT_Y;
      const acrossRest = dx * SLANT_Y - dy * SLANT_X;
      const across = acrossRest * Math.cos(cosT[k]);
      const ax = LETTER_AXES[k] + (STACK_X - LETTER_AXES[k]) * pull;
      x += w[k] * (ax + along * SLANT_X + across * SLANT_Y);
      y += w[k] * (AXIS_Y + along * SLANT_Y - across * SLANT_X);
      z += w[k] * acrossRest * Math.sin(cosT[k]) * LOOK3D.turnSide;
    }
    out.push({x, y, z});
  }
  return out;
};

const applePoints = (t: number) => {
  const th = (appleTurn(t) * Math.PI) / 180;
  const px = LOOK3D.applePivot;
  return APPLE.pts.map((p) => ({x: px + (p.x - px) * Math.cos(th), y: p.y, z: (p.x - px) * Math.sin(th) * LOOK3D.appleSide}));
};

type World = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
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
  const scene = new THREE.Scene();
  scene.add(mesh);
  return {renderer, scene, camera, mesh};
};

/** Build the tube for forward time t and colour it. Returns false when nothing is visible. */
const pose = (w: World, t: number) => {
  const isApple = t >= SWITCH;
  const progress = isApple ? 1 : drawProgress(t);
  if (progress <= 0) return false;
  const total = (isApple ? APPLE : HELLO).pts.length;
  const upTo = Math.max(2, Math.floor(progress * (total - 1)));
  const pts = isApple ? applePoints(t) : helloPoints(t, upTo);
  const {geo, rings} = tubeGeometry(pts);
  const tint = new Float32Array(geo.attributes.position.count * 3);
  const shift = colourShift(t);
  const appleShift = shift - colourShift(146);
  const shownLength = (upTo / (total - 1)) * (isApple ? APPLE.length : HELLO.length);
  for (let i = 0; i <= rings; i++) {
    const arc = (i / rings) * shownLength;
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
    const m = heat * LOOK3D.heatMix;
    const r = ((c[0] + (255 - c[0]) * m) / 255) * alpha;
    const g = ((c[1] + (255 - c[1]) * m) / 255) * alpha;
    const b = ((c[2] + (255 - c[2]) * m) / 255) * alpha;
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
    // bloom
    if (!glow.current) glow.current = document.createElement('canvas');
    const g = glow.current;
    const gw = Math.round(width / 4);
    const gh = Math.round(height / 4);
    g.width = gw;
    g.height = gh;
    const gx = g.getContext('2d') as CanvasRenderingContext2D;
    const K = width / 1280;
    for (const gl of [LOOK3D.glowNear, LOOK3D.glowFar]) {
      gx.clearRect(0, 0, gw, gh);
      gx.filter = `blur(${(gl.blur * K) / 4}px)`;
      gx.drawImage(out.current!, 0, 0, gw, gh);
      gx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = gl.alpha;
      ctx.drawImage(g, 0, 0, width, height);
      ctx.restore();
    }
  }, [frame, width, height]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <canvas ref={out} width={width} height={height} style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};
