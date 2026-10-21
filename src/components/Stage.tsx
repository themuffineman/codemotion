import React from 'react';
import {AbsoluteFill} from 'remotion';
import {color, stageLook, StageLook} from '../design/tokens';

// The canvas every graphics scene sits on. Two looks:
//   'classic'    charcoal, faint 64px grid, soft vignette (from the primary references)
//   'aceternity' the landing-page look: near-black, crisp 20px grid in #262626
// The default look is set once in tokens (stageLook) so a whole video stays consistent.
// glow: optional soft colored light behind the focal point (e.g. pink behind a hero object).
export const Stage: React.FC<{
  children?: React.ReactNode;
  look?: StageLook;
  grid?: number; // grid cell size in px
  glow?: {color: string; x?: string; y?: string; size?: number; opacity?: number};
}> = ({children, look = stageLook, grid, glow}) => {
  const ace = look === 'aceternity';
  const cell = grid ?? (ace ? 20 : 64);
  const line = ace ? color.gridAce : color.grid;
  return (
    <AbsoluteFill style={{background: ace ? color.bgAce : color.bg, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
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
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 55%, ${ace ? '#000' : color.bgDeep} 130%)`}} />
      <AbsoluteFill>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

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
