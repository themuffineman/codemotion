import React, {useId} from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {color} from '../design/tokens';
import {useEnter, useTween, EnterPreset, ease} from '../motion/motion';

// Free-form diagram on an absolute canvas. Nodes are boxes with ids, edges connect node sides.
// The opinionated layouts (Pipeline, Hub, Stack) are built on this. Reach for them first.

export type Side = 'left' | 'right' | 'top' | 'bottom';
export type DNode = {
  id: string;
  x: number; // center x
  y: number; // center y
  w: number;
  h: number;
  at?: number; // enter frame
  out?: number;
  preset?: EnterPreset;
  el: React.ReactNode;
};
export type DEdge = {
  from: string;
  to: string;
  fromSide?: Side;
  toSide?: Side;
  at?: number; // start drawing
  dur?: number; // draw duration (frames)
  dashed?: boolean;
  arrow?: boolean;
  pulse?: boolean; // glowing dot travels along the edge after it is drawn (data flowing)
  tone?: string;
  curve?: 'auto' | 'straight';
  out?: number;
};

const anchor = (n: DNode, side: Side) => {
  switch (side) {
    case 'left':
      return {x: n.x - n.w / 2, y: n.y};
    case 'right':
      return {x: n.x + n.w / 2, y: n.y};
    case 'top':
      return {x: n.x, y: n.y - n.h / 2};
    case 'bottom':
      return {x: n.x, y: n.y + n.h / 2};
  }
};

const autoSides = (a: DNode, b: DNode): [Side, Side] => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy) * 0.8) return dx > 0 ? ['right', 'left'] : ['left', 'right'];
  return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
};

export const edgePath = (a: DNode, b: DNode, e: DEdge, gap = 14) => {
  const [sa, sb] = autoSides(a, b);
  const fs = e.fromSide ?? sa;
  const ts = e.toSide ?? sb;
  const p0 = anchor(a, fs);
  const p1 = anchor(b, ts);
  const dir = (s: Side) => ({left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1]})[s];
  const [d0x, d0y] = dir(fs);
  const [d1x, d1y] = dir(ts);
  const s = {x: p0.x + d0x * gap, y: p0.y + d0y * gap};
  const t = {x: p1.x + d1x * gap, y: p1.y + d1y * gap};
  if (e.curve === 'straight' || (s.x === t.x || s.y === t.y)) return `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
  // Tangent length follows the distance along each tangent's own axis, so curves never overshoot into an S.
  const k0 = Math.max(30, (d0x !== 0 ? Math.abs(t.x - s.x) : Math.abs(t.y - s.y)) * 0.55);
  const k1 = Math.max(30, (d1x !== 0 ? Math.abs(t.x - s.x) : Math.abs(t.y - s.y)) * 0.55);
  return `M ${s.x} ${s.y} C ${s.x + d0x * k0} ${s.y + d0y * k0}, ${t.x + d1x * k1} ${t.y + d1y * k1}, ${t.x} ${t.y}`;
};

const NodeBox: React.FC<{n: DNode}> = ({n}) => {
  const enter = useEnter(n.at ?? 0, n.preset ?? 'rise');
  const frame = useCurrentFrame();
  const gone = n.out !== undefined ? interpolate(frame, [n.out, n.out + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: n.x - n.w / 2,
        top: n.y - n.h / 2,
        width: n.w,
        height: n.h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...enter,
        opacity: (enter.opacity as number) * gone,
      }}
    >
      {n.el}
    </div>
  );
};

export const Connector: React.FC<{d: string; e: DEdge}> = ({d, e}) => {
  const id = useId().replace(/:/g, '');
  const frame = useCurrentFrame();
  const at = e.at ?? 0;
  const dur = e.dur ?? 18;
  const t = useTween(at, at + dur, ease);
  const len = getLength(d);
  const tone = e.tone ?? (e.dashed ? color.blue : 'rgba(255,255,255,0.9)');
  const gone = e.out !== undefined ? interpolate(frame, [e.out, e.out + 10], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  if (t <= 0) return null;
  const pt = (l: number) => getPointAtLength(d, l) ?? {x: 0, y: 0};
  const head = pt(Math.max(0, len * t - 0.01));
  const before = pt(Math.max(0, len * t - 6));
  const ang = (Math.atan2(head.y - before.y, head.x - before.x) * 180) / Math.PI;
  // pulse: a dot loops along the edge once drawn, period 40 frames
  const pulseT = e.pulse && t >= 1 ? ((frame - at - dur) % 40) / 40 : -1;
  const pulsePt = pulseT >= 0 ? pt(len * pulseT) : null;
  const start = pt(0);
  return (
    <g opacity={gone}>
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse">
          <path d={d} stroke="#fff" strokeWidth={12} fill="none" strokeDasharray={len} strokeDashoffset={len * (1 - t)} />
        </mask>
      </defs>
      <path
        d={d}
        stroke={tone}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={e.dashed ? '10 12' : undefined}
        mask={`url(#m${id})`}
      />
      <circle cx={start.x} cy={start.y} r={6} fill={color.paper} stroke={tone} strokeWidth={2.5} />
      {e.arrow !== false ? (
        <path
          d="M -14 -9 L 0 0 L -14 9"
          transform={`translate(${head.x} ${head.y}) rotate(${ang})`}
          stroke={tone}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : t >= 1 ? (
        <circle cx={head.x} cy={head.y} r={6} fill={color.paper} stroke={tone} strokeWidth={2.5} />
      ) : null}
      {pulsePt ? (
        <>
          <circle cx={pulsePt.x} cy={pulsePt.y} r={16} fill={tone} opacity={0.25} />
          <circle cx={pulsePt.x} cy={pulsePt.y} r={6} fill={tone} />
        </>
      ) : null}
    </g>
  );
};

export const Diagram: React.FC<{
  nodes: DNode[];
  edges?: DEdge[];
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({nodes, edges = [], width: w, height: h, style}) => {
  const vc = useVideoConfig();
  const width = w ?? vc.width;
  const height = h ?? vc.height;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <div style={{position: 'relative', width, height, ...style}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) throw new Error(`Edge ${e.from} → ${e.to}: unknown node`);
          return <Connector key={i} d={edgePath(a, b, e)} e={e} />;
        })}
      </svg>
      {nodes.map((n) => (
        <NodeBox key={n.id} n={n} />
      ))}
    </div>
  );
};
