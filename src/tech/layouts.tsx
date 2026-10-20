import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {color, font, radius, safe, series, shadow, type, weight} from '../design/tokens';
import {Enter, stagger, useEnter, useTween} from '../motion/motion';
import {Eyebrow, Label} from '../components/ui';
import {Icon, IconName} from '../components/Icon';
import {DEdge, DNode, Diagram} from './Diagram';

// Opinionated diagram layouts. They compute positions so scenes never hand-place boxes.
// Every item takes `at` (local frame from cue()) so the diagram builds in sync with speech.

export type Item = {id?: string; el: React.ReactNode; w: number; h: number; at?: number};

// ---------- Pipeline: A → B → C (horizontal or vertical) ----------
export const Pipeline: React.FC<{
  items: Item[];
  dir?: 'row' | 'column';
  gap?: number; // space between items (arrow length)
  width?: number;
  height?: number;
  dashed?: boolean;
  pulse?: boolean;
}> = ({items, dir = 'row', gap = 110, width: w, height: h, dashed, pulse}) => {
  const vc = useVideoConfig();
  const width = w ?? vc.width;
  const height = h ?? vc.height;
  const total = items.reduce((n, it) => n + (dir === 'row' ? it.w : it.h), 0) + gap * (items.length - 1);
  let cursor = ((dir === 'row' ? width : height) - total) / 2;
  const nodes: DNode[] = items.map((it, i) => {
    const size = dir === 'row' ? it.w : it.h;
    const c = cursor + size / 2;
    cursor += size + gap;
    return {
      id: it.id ?? `p${i}`,
      x: dir === 'row' ? c : width / 2,
      y: dir === 'row' ? height / 2 : c,
      w: it.w,
      h: it.h,
      at: it.at,
      el: it.el,
    };
  });
  const edges: DEdge[] = nodes.slice(1).map((n, i) => ({
    from: nodes[i].id,
    to: n.id,
    at: (n.at ?? 0) - 12,
    dur: 12,
    dashed,
    pulse,
  }));
  return <Diagram nodes={nodes} edges={edges} width={width} height={height} />;
};

// ---------- Hub: many → one → many ----------
// inputs on the left feed the center, center feeds outputs on the right (either side optional).
// vertical: inputs on top, outputs below (the "same bytecode → every OS" fan-out).
export const Hub: React.FC<{
  inputs?: Item[];
  center: Item;
  outputs?: Item[];
  vertical?: boolean;
  spread?: number; // distance from center to the side columns
  pitch?: number; // spacing between items in a column
  width?: number;
  height?: number;
  dashed?: boolean;
  pulse?: boolean;
  inLabel?: string;
  outLabel?: string;
}> = ({inputs = [], center, outputs = [], vertical, spread = 560, pitch, width: w, height: h, dashed = true, pulse = true, inLabel, outLabel}) => {
  const vc = useVideoConfig();
  const width = w ?? vc.width;
  const height = h ?? vc.height;
  const cx = width / 2;
  const cy = height / 2;
  const place = (list: Item[], side: -1 | 1, prefix: string): DNode[] => {
    const p = pitch ?? (vertical ? Math.max(...list.map((l) => l.w)) + 60 : Math.max(...list.map((l) => l.h)) + 50);
    return list.map((it, i) => {
      const off = (i - (list.length - 1) / 2) * p;
      return {
        id: `${prefix}${i}`,
        x: vertical ? cx + off : cx + side * spread,
        y: vertical ? cy + side * spread * 0.62 : cy + off,
        w: it.w,
        h: it.h,
        at: it.at,
        el: it.el,
      };
    });
  };
  const ins = place(inputs, -1, 'in');
  const outs = place(outputs, 1, 'out');
  const mid: DNode = {id: 'hub', x: cx, y: cy, w: center.w, h: center.h, at: center.at, el: center.el, preset: 'pop'};
  const edges: DEdge[] = [
    ...ins.map((n): DEdge => ({from: n.id, to: 'hub', at: (n.at ?? 0) + 6, dashed, pulse, arrow: false, ...(vertical ? {fromSide: 'bottom', toSide: 'top'} : {})})),
    ...outs.map((n): DEdge => ({from: 'hub', to: n.id, at: (n.at ?? 0) - 10, dashed, pulse, arrow: false, ...(vertical ? {fromSide: 'bottom', toSide: 'top'} : {})})),
  ];
  const labelY = (list: DNode[]) => Math.min(...list.map((n) => n.y - n.h / 2)) - 70;
  return (
    <div style={{position: 'relative', width, height}}>
      <Diagram nodes={[...ins, mid, ...outs]} edges={edges} width={width} height={height} />
      {inLabel && ins.length ? (
        <SideLabel x={ins[0].x} y={labelY(ins)} at={ins[0].at}>
          {inLabel}
        </SideLabel>
      ) : null}
      {outLabel && outs.length ? (
        <SideLabel x={outs[0].x} y={labelY(outs)} at={outs[0].at}>
          {outLabel}
        </SideLabel>
      ) : null}
    </div>
  );
};

const SideLabel: React.FC<{x: number; y: number; at?: number; children: React.ReactNode}> = ({x, y, at = 0, children}) => (
  <div style={{position: 'absolute', left: x - 300, width: 600, top: y, textAlign: 'center'}}>
    <Enter at={at - 6} preset="fade">
      <Label tone={color.paperSoft} size={type.label + 4} weight={weight.regular}>
        {children}
      </Label>
    </Enter>
  </div>
);

// ---------- LayerStack: ordered layers with arrows (call chain, delegation, OSI-style) ----------
export const LayerStack: React.FC<{
  layers: {label: string; icon?: IconName; at?: number}[];
  flow?: 'up' | 'down' | 'none';
  steps?: {at: number; index: number}[]; // highlight a layer at a moment
  width?: number;
  title?: string;
  container?: boolean; // dashed boundary around the stack (subsystem)
}> = ({layers, flow = 'up', steps = [], width = 760, title, container = true}) => {
  const frame = useCurrentFrame();
  let active = -1;
  for (const s of steps) if (frame >= s.at) active = s.index;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24}}>
      {title ? <Eyebrow tone={color.paperSoft}>{title}</Eyebrow> : null}
      <div
        style={{
          padding: container ? 36 : 0,
          border: container ? '2px dashed rgba(255,255,255,0.22)' : 'none',
          borderRadius: radius.card + 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {layers.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 && flow !== 'none' ? <StackArrow up={flow === 'up'} at={(l.at ?? 0) - 4} /> : i > 0 ? <div style={{height: 20}} /> : null}
            <LayerBar label={l.label} icon={l.icon} at={l.at} width={width} tone={series[i % series.length]} active={active === i} dim={active >= 0 && active !== i} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const LayerBar: React.FC<{label: string; icon?: IconName; at?: number; width: number; tone: string; active: boolean; dim: boolean}> = ({
  label,
  icon,
  at = 0,
  width,
  tone,
  active,
  dim,
}) => {
  const enter = useEnter(at, 'rise');
  return (
    <div
      style={{
        ...enter,
        width,
        height: 104,
        borderRadius: radius.pill,
        background: active ? `linear-gradient(180deg, #fff, ${color.card})` : `linear-gradient(180deg, ${color.tileHi}, ${color.tile})`,
        border: `2px solid ${active ? color.blue : color.tileLine}`,
        boxShadow: active ? `${shadow.tile}, 0 0 60px rgba(26,132,245,0.5)` : shadow.tile,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '0 34px',
        boxSizing: 'border-box',
        opacity: (enter.opacity as number) * (dim ? 0.5 : 1),
      }}
    >
      <div style={{width: 18, height: 18, borderRadius: 99, background: tone, boxShadow: `0 0 18px ${tone}`}} />
      {icon ? <Icon name={icon} size={36} color={active ? color.ink : color.paperSoft} /> : null}
      <div style={{fontFamily: font.sans, fontSize: type.body, fontWeight: weight.semibold, color: active ? color.ink : color.paper, letterSpacing: '-0.015em'}}>
        {label}
      </div>
    </div>
  );
};

const StackArrow: React.FC<{up: boolean; at: number}> = ({up, at}) => {
  const t = useTween(at, at + 10);
  return (
    <svg width={40} height={56} style={{opacity: t}}>
      <path d={up ? 'M20 50 L20 10 M10 20 L20 8 L30 20' : 'M20 6 L20 46 M10 36 L20 48 L30 36'} stroke={color.paper} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Vector: a column (or row) of cells — embeddings, arrays, buffers, tensors ----------
export const Vector: React.FC<{
  cells?: number;
  tone?: string; // outline color; default neutral gray
  label?: string;
  values?: (string | number)[]; // optional cell contents
  horizontal?: boolean;
  cell?: number;
  at?: number;
  fill?: number; // 0..1 — cells fill in with tone (data arriving)
}> = ({cells = 5, tone = 'rgba(255,255,255,0.55)', label, values, horizontal, cell = 52, at = 0, fill = 0}) => {
  const frame = useCurrentFrame();
  const n = values?.length ?? cells;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
      <div style={{display: 'flex', flexDirection: horizontal ? 'row' : 'column'}}>
        {Array.from({length: n}).map((_, i) => {
          const o = interpolate(frame, [stagger(at, i, 2), stagger(at, i, 2) + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const filled = fill * n > i;
          return (
            <div
              key={i}
              style={{
                width: horizontal ? cell * 1.3 : cell * 1.3,
                height: cell,
                border: `2.5px solid ${tone}`,
                marginTop: horizontal || i === 0 ? 0 : -2.5,
                marginLeft: !horizontal || i === 0 ? 0 : -2.5,
                background: filled ? `${tone}40` : 'rgba(255,255,255,0.03)',
                opacity: o,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: font.mono,
                fontSize: cell * 0.36,
                color: color.paper,
                boxSizing: 'border-box',
              }}
            >
              {values?.[i] ?? ''}
            </div>
          );
        })}
      </div>
      {label ? (
        <div style={{opacity: interpolate(frame, [at, at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          <Label size={type.label + 2}>{label}</Label>
        </div>
      ) : null}
    </div>
  );
};

// ---------- KeyValue panel: metadata, config, request/response fields ----------
export const KeyValue: React.FC<{
  title: string;
  rows: {k: string; v: string; at?: number}[];
  width?: number;
  tone?: string;
}> = ({title, rows, width = 760, tone = color.blue}) => (
  <div style={{width, borderRadius: radius.window, overflow: 'hidden', boxShadow: shadow.card, background: color.tile, border: `1px solid ${color.tileLine}`}}>
    <div style={{background: tone, color: '#fff', textAlign: 'center', fontFamily: font.sans, fontWeight: weight.semibold, fontSize: type.label + 2, padding: '14px 0'}}>{title}</div>
    <div style={{padding: '10px 32px 18px'}}>
      {rows.map((r, i) => (
        <Enter key={i} at={r.at ?? 0} preset="fade">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < rows.length - 1 ? `1px solid ${color.tileLine}` : 'none', gap: 32}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: font.sans, fontSize: type.label + 2, color: color.paper, fontWeight: weight.medium}}>
              <div style={{width: 9, height: 9, borderRadius: 9, background: tone}} />
              {r.k}
            </div>
            <div style={{fontFamily: font.mono, fontSize: type.label, color: color.paperSoft}}>{r.v}</div>
          </div>
        </Enter>
      ))}
    </div>
  </div>
);

// ---------- SectionTag: persistent top-left "where are we" marker ----------
export const SectionTag: React.FC<{eyebrow: string; title: string; at?: number; vertical?: boolean}> = ({eyebrow, title, at = 0, vertical}) => {
  const s = vertical ? safe.vertical : safe.landscape;
  return (
    <div style={{position: 'absolute', left: s.x, top: vertical ? s.top - 120 : s.top - 30}}>
      <Enter at={at} preset="fade">
        <Eyebrow>{eyebrow}</Eyebrow>
        <div style={{fontFamily: font.sans, fontSize: type.label + 4, fontWeight: weight.semibold, color: color.paperSoft, marginTop: 8, letterSpacing: '-0.01em'}}>{title}</div>
      </Enter>
    </div>
  );
};

// ---------- Compare: side-by-side columns with titles (X vs Y vs Z) ----------
export const Compare: React.FC<{
  columns: {title: string; at?: number; el: React.ReactNode; tone?: string}[];
  gap?: number;
  winner?: {index: number; at: number}; // highlight the recommended option
}> = ({columns, gap = 64, winner}) => {
  const frame = useCurrentFrame();
  const won = winner && frame >= winner.at ? winner.index : -1;
  return (
    <div style={{display: 'flex', gap, alignItems: 'flex-start', justifyContent: 'center'}}>
      {columns.map((c, i) => (
        <Enter key={i} at={c.at ?? 0} preset="rise">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, opacity: won >= 0 && won !== i ? 0.4 : 1}}>
            <div style={{fontFamily: font.sans, fontSize: type.title - 8, fontWeight: weight.semibold, color: won === i ? color.blue : c.tone ?? color.paper, letterSpacing: '-0.025em'}}>
              {c.title}
            </div>
            {c.el}
          </div>
        </Enter>
      ))}
    </div>
  );
};
