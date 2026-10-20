import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {easeInOut} from './motion';

// A virtual camera over a large canvas. The primary style pans sideways across a row of cards
// and pushes in on the active one, with motion blur while moving.
//
// <Camera keys={[{at: 0, x: 0}, {at: cue('planning'), x: -600, scale: 1.1}]}>...</Camera>
// x / y are the canvas offset in px (negative x moves content left = camera moves right).

export type CameraKey = {at: number; x?: number; y?: number; scale?: number; dur?: number};

export const Camera: React.FC<{keys: CameraKey[]; blur?: boolean; children: React.ReactNode}> = ({
  keys,
  blur = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const sample = (f: number) => {
    let x = keys[0].x ?? 0;
    let y = keys[0].y ?? 0;
    let s = keys[0].scale ?? 1;
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      const dur = k.dur ?? 24;
      const t = interpolate(f, [k.at, k.at + dur], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: easeInOut,
      });
      x = x + ((k.x ?? x) - x) * t;
      y = y + ((k.y ?? y) - y) * t;
      s = s + ((k.scale ?? s) - s) * t;
    }
    return {x, y, s};
  };
  const now = sample(frame);
  const prev = sample(frame - 1);
  const speed = Math.hypot(now.x - prev.x, now.y - prev.y);
  const b = blur ? Math.min(speed * 0.18, 10) : 0;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${now.x}px, ${now.y}px) scale(${now.s})`,
        transformOrigin: '50% 50%',
        filter: b > 0.4 ? `blur(${b}px)` : undefined,
      }}
    >
      {children}
    </div>
  );
};
