import React from 'react';
import {AbsoluteFill} from 'remotion';
import {color} from '../design/tokens';

// The charcoal canvas with a faint grid and darker edges. Every graphics scene sits on this.
// glow: optional soft colored light behind the focal point (e.g. pink behind a hero object).
export const Stage: React.FC<{
  children?: React.ReactNode;
  grid?: number; // grid cell size in px
  glow?: {color: string; x?: string; y?: string; size?: number; opacity?: number};
}> = ({children, grid = 64, glow}) => (
  <AbsoluteFill style={{background: color.bg, overflow: 'hidden'}}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${color.grid} 1px, transparent 1px), linear-gradient(90deg, ${color.grid} 1px, transparent 1px)`,
        backgroundSize: `${grid}px ${grid}px`,
        backgroundPosition: 'center center',
      }}
    />
    {glow ? (
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${glow.x ?? '50%'} ${glow.y ?? '50%'}, ${glow.color} 0%, transparent ${glow.size ?? 28}%)`,
          opacity: glow.opacity ?? 0.35,
        }}
      />
    ) : null}
    <AbsoluteFill
      style={{background: `radial-gradient(ellipse at center, transparent 55%, ${color.bgDeep} 130%)`}}
    />
    <AbsoluteFill>{children}</AbsoluteFill>
  </AbsoluteFill>
);

// Centers its children in the frame. Most scenes are one centered composition.
export const Center: React.FC<{children: React.ReactNode; gap?: number; dir?: 'row' | 'column'; style?: React.CSSProperties}> = ({
  children,
  gap = 0,
  dir = 'column',
  style,
}) => (
  <AbsoluteFill style={{display: 'flex', flexDirection: dir, alignItems: 'center', justifyContent: 'center', gap, ...style}}>
    {children}
  </AbsoluteFill>
);
