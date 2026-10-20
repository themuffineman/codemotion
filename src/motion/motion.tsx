import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Motion vocabulary from the primary style: things arrive soft and settle, with a short blur
// that reads like motion blur. Nothing bounces hard. Nothing spins.

export const springs = {
  smooth: {damping: 200, stiffness: 120, mass: 1}, // default: no overshoot
  settle: {damping: 22, stiffness: 140, mass: 1}, // tiny overshoot for cards and pills
  pop: {damping: 14, stiffness: 180, mass: 0.8}, // badges, checks, single icons only
} as const;

export const ease = Easing.bezier(0.22, 1, 0.36, 1); // ease-out-quint, for interpolate()
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export type EnterPreset = 'rise' | 'fade' | 'pop' | 'slideLeft' | 'slideRight' | 'drop' | 'blur';

export const useProgress = (at: number, config: keyof typeof springs = 'smooth', durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: springs[config], durationInFrames});
};

// Returns a CSS style for an element entering at frame `at` (local frame).
export const useEnter = (at: number, preset: EnterPreset = 'rise'): React.CSSProperties => {
  const cfg = preset === 'pop' ? 'pop' : preset === 'fade' || preset === 'blur' ? 'smooth' : 'settle';
  const p = useProgress(at, cfg);
  const blur = interpolate(p, [0, 1], [preset === 'fade' ? 0 : 14, 0], {extrapolateRight: 'clamp'});
  const o = interpolate(p, [0, 0.6], [0, 1], {extrapolateRight: 'clamp'});
  let transform = '';
  switch (preset) {
    case 'rise':
      transform = `translateY(${interpolate(p, [0, 1], [48, 0])}px)`;
      break;
    case 'drop':
      transform = `translateY(${interpolate(p, [0, 1], [-48, 0])}px)`;
      break;
    case 'pop':
      transform = `scale(${interpolate(p, [0, 1], [0.6, 1])})`;
      break;
    case 'slideLeft': // comes in from the right, moving left
      transform = `translateX(${interpolate(p, [0, 1], [160, 0])}px)`;
      break;
    case 'slideRight':
      transform = `translateX(${interpolate(p, [0, 1], [-160, 0])}px)`;
      break;
    case 'blur':
      transform = `scale(${interpolate(p, [0, 1], [1.06, 1])})`;
      break;
  }
  return {opacity: o, transform, filter: blur > 0.2 ? `blur(${blur}px)` : undefined};
};

// Exit is a quick blur-out. Use it when an element leaves while the scene continues.
export const useExit = (at: number | undefined, durationInFrames = 10): React.CSSProperties => {
  const frame = useCurrentFrame();
  if (at === undefined) return {};
  const t = interpolate(frame, [at, at + durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeInOut,
  });
  if (t === 0) return {};
  return {opacity: 1 - t, filter: `blur(${t * 12}px)`, transform: `scale(${1 - t * 0.04})`};
};

type EnterProps = {
  at?: number;
  out?: number;
  preset?: EnterPreset;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

// <Enter at={cue('cache')} preset="rise">...</Enter>
export const Enter: React.FC<EnterProps> = ({at = 0, out, preset = 'rise', style, children}) => {
  const enter = useEnter(at, preset);
  const exit = useExit(out);
  const opacity = (enter.opacity as number) * ((exit.opacity as number | undefined) ?? 1);
  const filter = [enter.filter, exit.filter].filter(Boolean).join(' ') || undefined;
  const transform = [enter.transform, exit.transform].filter(Boolean).join(' ') || undefined;
  return <div style={{...style, opacity, filter, transform}}>{children}</div>;
};

// Stagger helper: delay for item i. Keep total stagger under ~20 frames.
export const stagger = (at: number, i: number, step = 4) => at + i * step;

// Smooth index for "the active item moves through a list on cue": -1 before ats[0], then glides
// 0 → 1 → 2 ... as each cue passes. Feed it to focus/dim props that accept fractions.
export const useStepper = (ats: number[], dur = 14) => {
  const frame = useCurrentFrame();
  if (!ats.length || frame < ats[0]) return -1;
  let pos = 0;
  for (let i = 1; i < ats.length; i++) {
    pos += interpolate(frame, [ats[i], ats[i] + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut});
  }
  return pos;
};

// 0→1 linear-ish progress between two frames, eased. Good for draws, counters, progress bars.
export const useTween = (from: number, to: number, easing = ease) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });
};
