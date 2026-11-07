// Every curve here is measured from the original clip (30 fps, frames 0-146).
// The clip is a palindrome: frame f and frame 292 - f are the same picture, so only the first half is
// described and the second half plays it backwards.

export const ORIGINAL_FRAMES = 295;
export const MIRROR = 292;
export const PEAK = 146;

/** Forward time for an output frame: 0..146 then back down to 0 (and below, which is black). */
export const forwardTime = (frame: number) => (frame <= PEAK ? frame : MIRROR - frame);

type Key = [number, number];

/** Monotone cubic interpolation (Fritsch-Carlson): smooth, never overshoots a measured key. */
export const monotone = (keys: Key[]) => {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
    );
  };
};

/** Share of the hello stroke drawn (0-1). Slow through the h, then it accelerates hard across e-l-l-o. */
export const drawProgress = monotone([
  [4.5, 0],
  [8, 0.012],
  [12, 0.035],
  [16, 0.075],
  [20, 0.14],
  [24, 0.225],
  [29, 0.33],
  [33, 0.48],
  [35, 0.6],
  [37, 0.8],
  [38, 0.9],
  [39, 0.97],
  [40, 1],
]);

/** When the stroke reaches arc share u (inverse of drawProgress). */
const drawTimes: number[] = [];
for (let i = 0; i <= 1000; i++) {
  const u = i / 1000;
  let lo = 4.5;
  let hi = 40;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (drawProgress(mid) < u) lo = mid;
    else hi = mid;
  }
  drawTimes.push(hi);
}
export const drawTimeAt = (u: number) => drawTimes[Math.max(0, Math.min(1000, Math.round(u * 1000)))];

/**
 * The hello does not turn as one piece: each letter turns on its own vertical axis, the h first and the o
 * last (2 frames apart), so the loops collapse while the joining strokes keep their width ("hullo").
 * Then the letters slide together into one stack, edge-on at frame 129.4, where the Apple logo takes over.
 */
export const letterTurn = monotone([
  [104, 0],
  [107, 10],
  [110, 30],
  [113, 55],
  [116, 74],
  [118, 80],
  [121, 84],
  [126, 86],
  [140, 86],
]);
export const LETTER_STAGGER = 2;
/** Letter axes at rest (x, 1280 scale): h, e, l, l, o. */
export const LETTER_AXES = [380, 535, 670, 783, 905];
export const STACK_X = 665;
/** How far each letter has slid toward the stack (0-1). */
export const stackPull = monotone([
  [122, 0],
  [124, 0.1],
  [125, 0.25],
  [126, 0.4],
  [127, 0.55],
  [128, 0.72],
  [129, 0.88],
  [129.4, 1],
]);

/** The Apple logo turns in from edge-on and settles with a long tail. */
export const appleTurn = monotone([
  [129.4, -90],
  [130, -73],
  [131, -56],
  [132, -45],
  [133, -37],
  [135, -28],
  [138, -20],
  [140, -14],
  [142, -9],
  [144, -4],
  [146, 0],
]);

export const SWITCH = 129.4;

/**
 * The colour pattern slides forward along the tube: 8 px/frame from frame 44, speeding up by 0.08 px/frame
 * each frame (1280 scale). This is the distance it has travelled since frame 80, where the palette was sampled.
 */
const steadyShift = (t: number) => {
  const F = (x: number) => (x < 44 ? 8 * x : 8 * 44 + 8 * (x - 44) + 0.04 * (x - 44) * (x - 44));
  return F(t) - F(80);
};
/** While the h is written the colours hold still; they catch up fast as the stroke races across e-l-l. */
const earlyShift = monotone([
  [0, -1150],
  [14, -1100],
  [20, -960],
  [28, -950],
  [34, -900],
  [37, -560],
  [40, steadyShift(40)],
  [41, steadyShift(41)],
]);
export const colourShift = (t: number) => (t < 40 ? earlyShift(t) : steadyShift(t));
