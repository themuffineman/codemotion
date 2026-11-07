// Draws the glowing glass tube onto a canvas. Geometry is in the original clip's 1280x720 space and
// scaled to the output canvas.
import {APPLE_COLORS, APPLE_POINTS, HELLO_PALETTE, HELLO_POINTS} from './measured';
import {
  appleTurn,
  colourShift,
  drawProgress,
  drawTimeAt,
  LETTER_AXES,
  LETTER_STAGGER,
  letterTurn,
  STACK_X,
  stackPull,
  SWITCH,
} from './timing';

type P = {x: number; y: number};

export const catmullRom = (ctrl: [number, number][], n = 12): P[] => {
  const p = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out: P[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (j: 0 | 1) =>
        0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push({x: f(0), y: f(1)});
    }
  }
  const last = p[p.length - 2];
  out.push({x: last[0], y: last[1]});
  return out;
};

export const resample = (pts: P[], step: number) => {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const length = d[d.length - 1];
  const out: P[] = [];
  let j = 0;
  for (let s = 0; s <= length; s += step) {
    while (d[j + 1] < s) j++;
    const t = (s - d[j]) / (d[j + 1] - d[j] || 1);
    out.push({x: pts[j].x + (pts[j + 1].x - pts[j].x) * t, y: pts[j].y + (pts[j + 1].y - pts[j].y) * t});
  }
  return {pts: out, length};
};

const STEP = 2.5;
const SEG = 12;
const HELLO_DENSE = catmullRom(HELLO_POINTS, SEG);
export const HELLO = resample(HELLO_DENSE, STEP);
export const APPLE = resample(catmullRom(APPLE_POINTS), STEP);

/**
 * Only the loops turn; the joining strokes between them (the h's hump, the arches at the baseline) are
 * stretched between their neighbours, so they stay round while the loops collapse. Each entry is a run of
 * control points: [first, last] of a loop. Points between two loops blend from one to the next.
 */
const LOOPS: [number, number][] = [
  [0, 19], // lead-in + h ascender loop
  [33, 46], // e
  [53, 67], // l
  [75, 88], // l
  [94, 114], // o + tail
];
export const letterWeights = (() => {
  const arcAt = (dense: number) => {
    let d = 0;
    for (let i = 1; i <= dense; i++) d += Math.hypot(HELLO_DENSE[i].x - HELLO_DENSE[i - 1].x, HELLO_DENSE[i].y - HELLO_DENSE[i - 1].y);
    return d;
  };
  const at = (k: number) => Math.round(arcAt(Math.min(k * SEG, HELLO_DENSE.length - 1)) / STEP);
  const spans = LOOPS.map(([f, l]) => [at(f), at(l)]);
  return HELLO.pts.map((_, i) => {
    const w = [0, 0, 0, 0, 0];
    for (let k = 0; k < 5; k++) {
      if (i <= spans[k][1]) {
        if (k === 0 || i >= spans[k][0]) w[k] = 1;
        else {
          const u = (i - spans[k - 1][1]) / (spans[k][0] - spans[k - 1][1]);
          const e = u * u * (3 - 2 * u);
          w[k - 1] = 1 - e;
          w[k] = e;
        }
        return w;
      }
    }
    w[4] = 1;
    return w;
  });
})();
/** Lean of the turning axes. The fit came out at about 0 degrees: the loops turn on upright axes. */
const SLANT = 0;
export const SLANT_X = Math.sin(SLANT);
export const SLANT_Y = -Math.cos(SLANT); // pointing up the letter
export const AXIS_Y = 340;

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
export const HELLO_RGB = HELLO_PALETTE.colors.map(hex);
export const APPLE_RGB = APPLE_COLORS.colors.map(hex);

export const lookup = (table: [number, number, number][], step: number, period: number, u: number): [number, number, number] => {
  const x = (((u % period) + period) % period) / step;
  const i = Math.floor(x) % table.length;
  const j = (i + 1) % table.length;
  const f = x - Math.floor(x);
  const a = table[i];
  const b = table[j];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

export const LOOK = {
  radius: 20, // tube radius, 1280 scale
  rim: 2.2, // bright rim width, 1280 scale
  bodyGain: 0.68,
  rimMix: 0.35, // how far the rim goes toward white
  heatTau: 3.5, // frames for a freshly drawn stretch to cool from white-hot
  heatMix: 0.55,
  headGlow: {radius: 70, alpha: 0.55},
  fadeIn: 2.5, // frames for a freshly drawn stretch to reach full strength
  glowNear: {blur: 9, alpha: 0.45}, // blur in 1280-scale px
  glowFar: {blur: 30, alpha: 0.45},
  focal: 2000,
  applePivot: 650,
  side: 1, // +1: the right side of the shape swings away from the camera
  shutter: 0.35, // fraction of a frame the virtual shutter stays open
};

type Sample = {x: number; y: number; r: number; c: [number, number, number]; heat: number; alpha: number};

/** The visible tube at forward time t, projected to 1280x720 space. */
export const tubeAt = (t: number): Sample[] => {
  const apple = t >= SWITCH;
  const shape = apple ? APPLE : HELLO;
  const theta = ((apple ? appleTurn(t) : 0) * Math.PI) / 180;
  const letterCos = LETTER_AXES.map((_, k) => Math.cos((letterTurn(t - k * LETTER_STAGGER) * Math.PI) / 180));
  const pull = stackPull(t);
  const px = LOOK.applePivot;
  const progress = apple ? 1 : drawProgress(t);
  const shift = colourShift(t);
  const appleShift = shift - colourShift(146);
  const n = shape.pts.length;
  const visible = Math.floor(progress * (n - 1));
  const out: Sample[] = [];
  if (progress <= 0) return out;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  for (let i = 0; i <= visible; i++) {
    const p = shape.pts[i];
    let x: number;
    let y = p.y;
    let s = 1;
    if (apple) {
      const dx = p.x - px;
      const z = LOOK.side * dx * sin;
      s = LOOK.focal / (LOOK.focal + z);
      x = 640 + (px + dx * cos - 640) * s;
      y = 360 + (p.y - 360) * s;
    } else {
      // each letter turns on its own axis, which leans with the italic slant, then slides toward the stack
      const w = letterWeights[i];
      x = 0;
      y = 0;
      for (let k = 0; k < 5; k++) {
        if (!w[k]) continue;
        const dx = p.x - LETTER_AXES[k];
        const dy = p.y - AXIS_Y;
        const along = dx * SLANT_X + dy * SLANT_Y; // component along the leaning axis
        const across = (dx * SLANT_Y - dy * SLANT_X) * letterCos[k]; // squeezed as the letter turns
        const ax = LETTER_AXES[k] + (STACK_X - LETTER_AXES[k]) * pull;
        x += w[k] * (ax + along * SLANT_X + across * SLANT_Y);
        y += w[k] * (AXIS_Y + along * SLANT_Y - across * SLANT_X);
      }
    }
    const arc = i * STEP;
    const c = apple
      ? lookup(APPLE_RGB, APPLE_COLORS.step, APPLE_COLORS.length, arc - appleShift)
      : lookup(HELLO_RGB, HELLO_PALETTE.step, HELLO_PALETTE.period, arc - shift);
    let heat = 0;
    let alpha = 1;
    if (!apple) {
      const age = t - drawTimeAt(i / (n - 1));
      heat = age < 0 ? 1 : Math.exp(-age / LOOK.heatTau);
      // freshly drawn tube fades in over a couple of frames rather than appearing at full strength
      const a = Math.max(0, Math.min(1, age / LOOK.fadeIn));
      alpha = 0.25 + 0.75 * a * a * (3 - 2 * a);
    }
    out.push({x, y, r: LOOK.radius * s, c, heat, alpha});
  }
  return out;
};

/**
 * Split the tube into runs that never overlap themselves, so each run can be drawn opaque and the runs
 * added together: where the tube crosses itself the light adds up, as in the original.
 */
const splitRuns = (pts: Sample[]) => {
  const runs: [number, number][] = [];
  const cell = 24;
  let grid = new Map<number, number[]>();
  let start = 0;
  const key = (x: number, y: number) => Math.floor(x / cell) * 10007 + Math.floor(y / cell);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    let hit = false;
    const minGap = Math.ceil((3.3 * p.r) / STEP);
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    for (let gx = cx - 2; gx <= cx + 2 && !hit; gx++) {
      for (let gy = cy - 2; gy <= cy + 2 && !hit; gy++) {
        const list = grid.get(gx * 10007 + gy);
        if (!list) continue;
        for (const j of list) {
          if (i - j < minGap) continue;
          const q = pts[j];
          if (Math.hypot(p.x - q.x, p.y - q.y) < 1.7 * Math.max(p.r, q.r)) {
            hit = true;
            break;
          }
        }
      }
    }
    if (hit && i - start > 2) {
      runs.push([start, i]);
      start = i;
      grid = new Map();
    }
    const k = key(p.x, p.y);
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  if (pts.length - 1 > start) runs.push([start, pts.length - 1]);
  return runs;
};

const rgb = (c: [number, number, number], gain = 1, white = 0) => {
  const f = (v: number) => Math.round(Math.min(255, (v + (255 - v) * white) * gain));
  return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
};

let scratch: OffscreenCanvas | HTMLCanvasElement | null = null;
const getScratch = (w: number, h: number) => {
  if (!scratch || scratch.width !== w || scratch.height !== h) {
    scratch = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
  }
  return scratch;
};

/** Half-disc beyond a run's cut end, so neighbouring runs meet edge to edge instead of overlapping. */
const cutAway = (ctx: CanvasRenderingContext2D, a: Sample, b: Sample, K: number) => {
  // a = the cut point, b = a point inside the run; remove the half-plane on the far side of a
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const R = a.r * 1.6;
  const ax = a.x * K;
  const ay = a.y * K;
  ctx.moveTo(ax - uy * R * K, ay + ux * R * K);
  ctx.lineTo(ax - uy * R * K + ux * R * K, ay + ux * R * K + uy * R * K);
  ctx.lineTo(ax + uy * R * K + ux * R * K, ay - ux * R * K + uy * R * K);
  ctx.lineTo(ax + uy * R * K, ay - ux * R * K);
  ctx.closePath();
};

/** Draw one instant of the tube, added onto ctx with the given weight. */
export const drawTube = (ctx: CanvasRenderingContext2D, t: number, K: number, weight: number) => {
  const pts = tubeAt(t);
  if (pts.length < 2) return;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const sc = getScratch(W, H);
  const s = sc.getContext('2d') as CanvasRenderingContext2D;
  const runs = splitRuns(pts);
  for (let ri = 0; ri < runs.length; ri++) {
    const [a, b] = runs[ri];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = a; i <= b; i++) {
      const p = pts[i];
      minX = Math.min(minX, p.x - p.r);
      minY = Math.min(minY, p.y - p.r);
      maxX = Math.max(maxX, p.x + p.r);
      maxY = Math.max(maxY, p.y + p.r);
    }
    const bx = Math.max(0, Math.floor(minX * K) - 4);
    const by = Math.max(0, Math.floor(minY * K) - 4);
    const bw = Math.min(W, Math.ceil(maxX * K) + 4) - bx;
    const bh = Math.min(H, Math.ceil(maxY * K) + 4) - by;
    if (bw <= 0 || bh <= 0) continue;
    s.save();
    s.clearRect(bx, by, bw, bh);
    // clip off the overhang at cut ends
    s.beginPath();
    s.rect(bx, by, bw, bh);
    if (ri > 0) cutAway(s, pts[a], pts[Math.min(b, a + 3)], K);
    if (ri < runs.length - 1) cutAway(s, pts[b], pts[Math.max(a, b - 3)], K);
    s.clip('evenodd');
    s.lineCap = 'round';
    s.lineJoin = 'round';
    // pass 1: bright rim, full width
    for (let i = a; i < b; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      s.strokeStyle = rgb(p.c, p.alpha, LOOK.rimMix + (1 - LOOK.rimMix) * p.heat * LOOK.heatMix);
      s.lineWidth = 2 * p.r * K;
      s.beginPath();
      s.moveTo(p.x * K, p.y * K);
      s.lineTo(q.x * K, q.y * K);
      s.stroke();
    }
    // pass 2: the glass body, inset by the rim
    for (let i = a; i < b; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      s.strokeStyle = rgb(p.c, p.alpha * (LOOK.bodyGain + (1 - LOOK.bodyGain) * p.heat), p.heat * LOOK.heatMix);
      s.lineWidth = Math.max(1, 2 * (p.r - LOOK.rim) * K);
      s.beginPath();
      s.moveTo(p.x * K, p.y * K);
      s.lineTo(q.x * K, q.y * K);
      s.stroke();
    }
    s.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = weight;
    ctx.drawImage(sc, bx, by, bw, bh, bx, by, bw, bh);
    ctx.restore();
  }
};

/** Soft bloom around the head of the stroke while it is being written. */
export const drawHead = (ctx: CanvasRenderingContext2D, t: number, K: number, weight: number) => {
  if (t >= SWITCH) return;
  const p = drawProgress(t);
  if (p <= 0 || p >= 1) return;
  const pts = tubeAt(t);
  const h = pts[pts.length - 1];
  if (!h) return;
  const strength = Math.min(1, p / 0.05) * weight * LOOK.headGlow.alpha;
  const R = LOOK.headGlow.radius * K;
  const g = ctx.createRadialGradient(h.x * K, h.y * K, 0, h.x * K, h.y * K, R);
  const [r, gg, b] = h.c.map((v) => Math.round(v + (255 - v) * 0.6));
  g.addColorStop(0, `rgba(${r},${gg},${b},${strength})`);
  g.addColorStop(0.35, `rgba(${r},${gg},${b},${strength * 0.35})`);
  g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(h.x * K - R, h.y * K - R, 2 * R, 2 * R);
  ctx.restore();
};

/** How far the picture moves around t, in 1280-scale px; drives how many motion-blur samples to take. */
export const motionAround = (t: number) => {
  const a = tubeAt(t - 0.5);
  const b = tubeAt(t + 0.5);
  let m = Math.abs(a.length - b.length) * STEP; // the growing head
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 20) m = Math.max(m, Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y));
  return m;
};
