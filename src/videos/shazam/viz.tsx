import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {color, font, radius, shadow, type, weight, useTween, ease} from '../../kit';

// Visuals specific to the Shazam video: waveforms, a spectrogram that reduces to a constellation
// of peaks, peak pairing, match timelines, and offset histograms. Colors and type come from tokens.

// ---------- deterministic randomness ----------
const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------- Waveform ----------
export const Waveform: React.FC<{
  width: number;
  height: number;
  noise?: number; // 0..1 extra jaggedness (talking, room noise)
  seed?: number;
  tone?: string;
  at?: number; // draw-on start
  shift?: number; // phase offset in samples (slide the wave sideways)
  amp?: number; // 0..1 loudness
  points?: number;
}> = ({width, height, noise = 0, seed = 1, tone = color.paper, at = 0, shift = 0, amp = 1, points = 240}) => {
  const t = useTween(at, at + 22);
  const r = rng(seed);
  const jitter = Array.from({length: points + 400}, () => r() * 2 - 1);
  const d = Array.from({length: points}, (_, i) => {
    const k = i + shift;
    const env = 0.55 + 0.45 * Math.sin(k / 23 + seed);
    const sig = (Math.sin(k / 3.1) * 0.6 + Math.sin(k / 1.7 + seed) * 0.3 + Math.sin(k / 7.3) * 0.25) * env;
    const n = jitter[Math.abs(Math.round(k)) % jitter.length] * noise;
    const y = height / 2 - (sig * (1 - noise * 0.35) + n * 0.9) * amp * (height / 2.4);
    return `${i === 0 ? 'M' : 'L'}${((i / (points - 1)) * width).toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{overflow: 'visible', display: 'block'}}>
      <path d={d} stroke={tone} strokeWidth={2.5} fill="none" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
    </svg>
  );
};

// ---------- Sine stack (one sound = several pitches) ----------
export const Sine: React.FC<{width: number; height: number; cycles: number; tone: string; at: number}> = ({width, height, cycles, tone, at}) => {
  const t = useTween(at, at + 20);
  const n = 200;
  const d = Array.from({length: n}, (_, i) => {
    const x = (i / (n - 1)) * width;
    const y = height / 2 - Math.sin((i / (n - 1)) * Math.PI * 2 * cycles) * (height / 2.3);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{overflow: 'visible', display: 'block'}}>
      <path d={d} stroke={tone} strokeWidth={3} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />
    </svg>
  );
};

// ---------- Spectrogram data ----------
export const COLS = 44;
export const ROWS = 20;

type Grid = {v: number[][]; noise: number[][]; peaks: {c: number; r: number; v: number}[]};

const makeGrid = (seed = 7): Grid => {
  const r = rng(seed);
  const v = Array.from({length: COLS}, () => Array.from({length: ROWS}, () => 0.04 + r() * 0.1));
  // notes: short horizontal-ish blobs at a few pitches per segment
  let c = 0;
  while (c < COLS) {
    const len = 2 + Math.floor(r() * 3);
    const notes = 2 + Math.floor(r() * 2);
    for (let k = 0; k < notes; k++) {
      const row = Math.floor(r() * ROWS);
      const s = 0.55 + r() * 0.45;
      const peakAt = c + Math.floor(r() * len);
      for (let i = c; i < Math.min(COLS, c + len); i++) {
        const fall = i === peakAt ? 1 : 0.62;
        v[i][row] = Math.max(v[i][row], s * fall);
        if (row > 0) v[i][row - 1] = Math.max(v[i][row - 1], s * fall * 0.45);
        if (row < ROWS - 1) v[i][row + 1] = Math.max(v[i][row + 1], s * fall * 0.45);
      }
    }
    c += len;
  }
  // bass band is always a little warm
  for (let i = 0; i < COLS; i++) for (let j = 0; j < 3; j++) v[i][j] = Math.max(v[i][j], 0.2 + r() * 0.15);
  const noise = Array.from({length: COLS}, () => Array.from({length: ROWS}, () => r() * 0.38));
  const peaks: Grid['peaks'] = [];
  for (let i = 0; i < COLS; i++)
    for (let j = 0; j < ROWS; j++) {
      const x = v[i][j];
      if (x < 0.6) continue;
      let best = true;
      for (let di = -2; di <= 2 && best; di++)
        for (let dj = -2; dj <= 2; dj++) {
          if (!di && !dj) continue;
          const y = v[i + di]?.[j + dj];
          if (y !== undefined && y >= x) {
            best = false;
            break;
          }
        }
      if (best) peaks.push({c: i, r: j, v: x});
    }
  return {v, noise, peaks};
};

export const GRID = makeGrid();

// Pair anchor: a peak in the left third, and the next few peaks ahead of it within a target zone.
export const ANCHOR = (() => {
  const cands = GRID.peaks.filter((p) => p.c >= 8 && p.c <= 14 && p.r >= 6 && p.r <= 14);
  return cands[0] ?? GRID.peaks[Math.floor(GRID.peaks.length / 3)];
})();
export const TARGETS = GRID.peaks
  .filter((p) => p.c > ANCHOR.c + 1 && p.c <= ANCHOR.c + 12 && Math.abs(p.r - ANCHOR.r) <= 8)
  .slice(0, 3);

// ---------- Spectrogram / constellation ----------
export const Spectrogram: React.FC<{
  cell?: number;
  reveal?: number; // 0..1 columns drawn left to right
  peaksOnly?: number; // 0..1 fade everything except the peaks
  dots?: number; // 0..1 peaks become round dots
  noise?: number; // 0..1 background noise fills the dark areas
  dim?: number; // 0..1 the dots get dimmer (lower volume)
  recording?: number; // 0..1 overlay of the dots your recording found (most coincide)
  anchor?: number; // 0..1 highlight the anchor dot
  pairs?: number; // 0..1 lines from the anchor to its targets
  focusOthers?: number; // 0..1 dim every dot that is not anchor/target
}> = ({cell = 26, reveal = 1, peaksOnly = 0, dots = 0, noise = 0, dim = 0, recording = 0, anchor = 0, pairs = 0, focusOthers = 0}) => {
  const w = COLS * cell;
  const h = ROWS * cell;
  const shown = reveal * COLS;
  const isPeak = (c: number, r: number) => GRID.peaks.some((p) => p.c === c && p.r === r);
  const X = (c: number) => c * cell + cell / 2;
  const Y = (r: number) => h - (r * cell + cell / 2);
  const rec = rng(99);
  const recMiss = GRID.peaks.map(() => rec() < 0.22);
  const extra = Array.from({length: 7}, () => ({c: Math.floor(rec() * COLS), r: Math.floor(rec() * ROWS)}));
  const inPair = (p: {c: number; r: number}) => (p.c === ANCHOR.c && p.r === ANCHOR.r) || TARGETS.some((t) => t.c === p.c && t.r === p.r);
  return (
    <svg width={w} height={h} style={{display: 'block', overflow: 'visible'}}>
      <rect x={0} y={0} width={w} height={h} fill={color.code} rx={8} />
      {GRID.v.map((col, c) =>
        col.map((v, r) => {
          const vis = clamp01(shown - c);
          if (vis <= 0) return null;
          const peak = isPeak(c, r);
          const base = v * (peak ? 1 : 1 - peaksOnly) * (1 - dots * (peak ? 1 : 0));
          const nz = GRID.noise[c][r] * noise * (peak ? 0 : 1);
          const o = clamp01(base + nz) * vis;
          if (o < 0.02) return null;
          return <rect key={`${c}-${r}`} x={c * cell + 1} y={h - (r + 1) * cell + 1} width={cell - 2} height={cell - 2} rx={3} fill={nz > base ? color.paperMute : color.blue} fillOpacity={o} />;
        }),
      )}
      {dots > 0
        ? GRID.peaks.map((p, i) => {
            const o = dots * (1 - dim * 0.55) * (1 - focusOthers * (inPair(p) ? 0 : 0.75));
            return (
              <g key={i} opacity={o}>
                <circle cx={X(p.c)} cy={Y(p.r)} r={cell * 0.62} fill={color.paper} opacity={0.12 * (1 - dim)} />
                <circle cx={X(p.c)} cy={Y(p.r)} r={cell * 0.26} fill={color.paper} />
              </g>
            );
          })
        : null}
      {recording > 0
        ? [
            ...GRID.peaks.filter((_, i) => !recMiss[i]),
            ...extra,
          ].map((p, i) => <circle key={`r${i}`} cx={X(p.c)} cy={Y(p.r)} r={cell * 0.48} fill="none" stroke={color.blue} strokeWidth={3} opacity={clamp01(recording * 1.4 - i * 0.015)} />)
        : null}
      {pairs > 0
        ? TARGETS.map((t, i) => {
            const p = clamp01(pairs * TARGETS.length - i);
            const x2 = X(ANCHOR.c) + (X(t.c) - X(ANCHOR.c)) * p;
            const y2 = Y(ANCHOR.r) + (Y(t.r) - Y(ANCHOR.r)) * p;
            return (
              <g key={`p${i}`}>
                <line x1={X(ANCHOR.c)} y1={Y(ANCHOR.r)} x2={x2} y2={y2} stroke={color.blue} strokeWidth={3} strokeLinecap="round" />
                {p >= 1 ? <circle cx={X(t.c)} cy={Y(t.r)} r={cell * 0.48} fill="none" stroke={color.blue} strokeWidth={3} /> : null}
              </g>
            );
          })
        : null}
      {anchor > 0 ? (
        <g opacity={anchor}>
          <rect
            x={X(ANCHOR.c + 2) - cell / 2}
            y={Y(Math.min(ROWS - 1, ANCHOR.r + 8)) - cell / 2}
            width={cell * 11}
            height={cell * (Math.min(ROWS - 1, ANCHOR.r + 8) - Math.max(0, ANCHOR.r - 8) + 1)}
            fill={color.blue}
            fillOpacity={0.06 * pairs}
            stroke={color.blue}
            strokeOpacity={0.5 * pairs}
            strokeDasharray="8 8"
            strokeWidth={2}
            rx={10}
          />
          <circle cx={X(ANCHOR.c)} cy={Y(ANCHOR.r)} r={cell * 0.75} fill={color.blue} opacity={0.35} />
          <circle cx={X(ANCHOR.c)} cy={Y(ANCHOR.r)} r={cell * 0.32} fill={color.blue} stroke={color.paper} strokeWidth={3} />
        </g>
      ) : null}
    </svg>
  );
};

// Axis labels around a spectrogram (time across, pitch up).
export const Axes: React.FC<{width: number; height: number; timeAt: number; pitchAt: number}> = ({width, height, timeAt, pitchAt}) => {
  const ta = useTween(timeAt, timeAt + 14);
  const pa = useTween(pitchAt, pitchAt + 14);
  const lab: React.CSSProperties = {fontFamily: font.sans, fontSize: type.label, color: color.paperSoft, fontWeight: weight.medium, whiteSpace: 'nowrap'};
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: height + 22, width, display: 'flex', alignItems: 'center', gap: 16, opacity: ta}}>
        <span style={lab}>Time</span>
        <div style={{flex: 1, height: 2, background: color.paperMute, transformOrigin: 'left', transform: `scaleX(${ta})`}} />
        <span style={{...lab, color: color.paperMute}}>→</span>
      </div>
      <div style={{position: 'absolute', left: -70, top: 0, height, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: pa}}>
        <span style={{...lab, color: color.paperMute}}>↑</span>
        <div style={{flex: 1, width: 2, background: color.paperMute, transformOrigin: 'bottom', transform: `scaleY(${pa})`}} />
        <span style={{...lab, writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>Pitch</span>
      </div>
    </>
  );
};

// ---------- Match timelines: your clip vs a 20 s window of the song ----------
// Both bars share one time scale, so matches that are all off by the same amount drop as parallel lines.
export type Match = {clip: number; song: number; at: number; tone?: string};
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export const Timelines: React.FC<{
  width?: number;
  clipLen?: number; // seconds
  songFrom?: number; // visible window of the song, seconds
  songTo?: number;
  start?: number; // where the clip starts in the song
  clipAt: number;
  songAt: number;
  matches: Match[];
  offset?: {at: number}; // marker + label for where the clip starts
}> = ({width = 1400, clipLen = 6, songFrom = 54, songTo = 76, start = 62, clipAt, songAt, matches, offset}) => {
  const frame = useCurrentFrame();
  const songY = 300;
  const barH = 56;
  const ct = useTween(clipAt, clipAt + 16);
  const st = useTween(songAt, songAt + 16);
  const ot = useTween(offset?.at ?? 1e6, (offset?.at ?? 1e6) + 18);
  const sx = (s: number) => ((s - songFrom) / (songTo - songFrom)) * width;
  const clipX = sx(start);
  const clipW = sx(start + clipLen) - clipX;
  const cx = (s: number) => clipX + (s / clipLen) * clipW;
  const lab: React.CSSProperties = {fontFamily: font.sans, fontSize: type.label, color: color.paperSoft, fontWeight: weight.medium, whiteSpace: 'nowrap'};
  const bar = (w: number, tone: string): React.CSSProperties => ({width: w, height: barH, borderRadius: radius.chip, background: color.tile, border: `2px solid ${tone}`, boxShadow: shadow.tile, boxSizing: 'border-box'});
  return (
    <div style={{position: 'relative', width, height: songY + barH + 70}}>
      <div style={{position: 'absolute', left: clipX, top: 0, opacity: ct, transform: `translateY(${(1 - ct) * 30}px)`}}>
        <div style={{...lab, position: 'absolute', top: -42}}>Your recording</div>
        <div style={bar(clipW, color.blue)} />
      </div>
      <div style={{position: 'absolute', left: 0, top: songY, opacity: st, transform: `translateY(${(1 - st) * 30}px)`}}>
        <div style={bar(width, color.paperMute)} />
        <div style={{...lab, position: 'absolute', top: barH + 16, left: 0}}>The song</div>
        <div style={{...lab, position: 'absolute', top: barH + 16, left: 140, color: color.paperMute, fontFamily: font.mono}}>{fmt(songFrom)}</div>
        <div style={{...lab, position: 'absolute', top: barH + 16, right: 0, color: color.paperMute, fontFamily: font.mono}}>{fmt(songTo)}</div>
      </div>
      {offset ? (
        <div style={{position: 'absolute', left: clipX - 1, top: barH + 20, height: songY - barH - 20, opacity: ot}}>
          <div style={{width: 3, height: `${ot * 100}%`, background: color.amber, borderRadius: 2}} />
          <div style={{...lab, color: color.amber, position: 'absolute', right: 18, top: (songY - barH - 20) / 2 - 18}}>starts 62 s in</div>
        </div>
      ) : null}
      <svg width={width} height={songY + barH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {matches.map((m, i) => {
          const p = interpolate(frame, [m.at, m.at + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
          if (p <= 0) return null;
          const x1 = cx(m.clip);
          const y1 = barH;
          const x2 = sx(m.song);
          const y2 = songY;
          const tone = m.tone ?? color.blue;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={tone} strokeWidth={3} strokeLinecap="round" />
              <circle cx={x1} cy={y1 - barH / 2} r={9} fill={tone} />
              {p >= 1 ? <circle cx={x2} cy={y2 + barH / 2} r={9} fill={tone} /> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---------- Offset histogram (one per candidate song) ----------
export const Histogram: React.FC<{
  title: string;
  seed: number;
  at: number;
  spike?: {at: number; index: number}; // grows one tall bar
  shrink?: {at: number}; // noise removes some matches: every bar drops, the spike stays on top
  focus?: number;
  dim?: number;
  width?: number;
  height?: number;
  label?: {text: string; at: number};
  bars?: number;
}> = ({title, seed, at, spike, shrink, focus = 0, dim = 0, width = 360, height = 220, label, bars = 18}) => {
  const frame = useCurrentFrame();
  const r = rng(seed);
  const base = Array.from({length: bars}, () => 0.08 + r() * 0.2);
  const sp = useTween(spike?.at ?? 1e6, (spike?.at ?? 1e6) + 22);
  const sh = useTween(shrink?.at ?? 1e6, (shrink?.at ?? 1e6) + 24);
  const lt = useTween(label?.at ?? 1e6, (label?.at ?? 1e6) + 12);
  const bw = width / bars;
  return (
    <div
      style={{
        width: width + 64,
        padding: 32,
        borderRadius: radius.tile,
        background: `linear-gradient(180deg, ${color.tileHi}, ${color.tile})`,
        border: `1px solid ${color.tileLine}`,
        boxShadow: focus > 0 ? `0 0 0 ${4 * focus}px ${color.blue}, 0 0 ${60 * focus}px rgba(26,132,245,${0.5 * focus}), ${shadow.tile}` : shadow.tile,
        opacity: 1 - dim * 0.6,
        filter: dim > 0.02 ? `blur(${dim * 3}px)` : undefined,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div style={{fontFamily: font.sans, fontSize: type.label + 2, color: color.paper, fontWeight: weight.medium, marginBottom: 20}}>{title}</div>
      <svg width={width} height={height} style={{display: 'block', overflow: 'visible'}}>
        <line x1={0} y1={height} x2={width} y2={height} stroke={color.paperMute} strokeWidth={2} />
        {base.map((b, i) => {
          const grow = interpolate(frame, [at + i, at + i + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
          const isSpike = spike && i === spike.index;
          let v = b * grow;
          if (isSpike) v = b * grow + sp * (0.92 - b) - sh * 0.3;
          else v = v * (1 - sh * 0.45);
          const hh = Math.max(0, v) * height;
          return <rect key={i} x={i * bw + 3} y={height - hh} width={bw - 6} height={hh} rx={3} fill={isSpike && sp > 0 ? color.green : color.paperMute} />;
        })}
      </svg>
      {label && spike ? (
        <div style={{position: 'absolute', left: 32 + spike.index * bw + bw / 2 - 80, width: 160, top: 70, textAlign: 'center', opacity: lt, fontFamily: font.mono, fontSize: type.label, color: color.green}}>
          {label.text}
        </div>
      ) : null}
      <div style={{fontFamily: font.sans, fontSize: type.label, color: color.paperMute, marginTop: 14}}>time difference</div>
    </div>
  );
};
