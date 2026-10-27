import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, Center, CodeWindow, Counter, Enter, Eyebrow, FocusShade, Headline, Icon, Label, Pill, Scene, SectionTag, Stage,
  Terminal, Track, TranscriptProvider, color, ease, font, radius, shadow, stagger, type, useCue, useTween, weight,
} from '../../kit';
import transcript from './transcript.json';
import out from '../../../public/code/dijkstra/terminal/output.json';

// "Dijkstra's shortest path": a town map becomes a weighted graph, the one rule (visit the closest
// unvisited node, relax its roads), a full walkthrough, why it works, prev pointers, the code, and the
// min-heap that takes a 22,500-node grid from 51 s to 63 ms.
// Demo: projects/dijkstra (graph.ts, dijkstra.ts, heap.ts, dijkstra-heap.ts, run.ts, bench.ts), copied to
// public/code/dijkstra. Terminal blocks are real output from run-demo.sh. Voice: public/audio/dijkstra.wav.

export const dijkstraTranscript = transcript;

const CODE = 'code/dijkstra';

// ---------- Helpers ----------

const Stack: React.FC<{children: React.ReactNode; gap?: number; align?: React.CSSProperties['alignItems']}> = ({children, gap = 24, align = 'center'}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: align, gap}}>{children}</div>
);
const Row: React.FC<{children: React.ReactNode; gap?: number; align?: React.CSSProperties['alignItems']}> = ({children, gap = 24, align = 'center'}) => (
  <div style={{display: 'flex', alignItems: align, gap}}>{children}</div>
);
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paper, size = type.label + 2}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);
// eased 0→1 between two frames, usable inside loops (no hook)
const tw = (frame: number, a: number, b: number) => interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fmt = (v: number) => (v === Infinity ? '∞' : v.toLocaleString('en-US'));

// Real terminal output: each captured file holds "$ command" lines followed by their output.
type Block = {cmd: string; out: string[]};
const blocks = (txt: string): Block[] => {
  const res: Block[] = [];
  for (const l of txt.split('\n')) {
    if (l.startsWith('$ ')) res.push({cmd: l.slice(2), out: []});
    else if (l.trim() !== '' && res.length) res[res.length - 1].out.push(l);
  }
  return res;
};

// ---------- The town graph ----------

// Same roads as projects/dijkstra/graph.ts. Positions are px inside a 1000 × 560 box.
const ROADS: [string, string, number][] = [
  ['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'D', 8], ['C', 'E', 10], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3],
];
const NODES = ['A', 'B', 'C', 'D', 'E', 'F'];
const POS: Record<string, [number, number]> = {A: [70, 280], B: [340, 70], C: [340, 490], D: [660, 70], E: [660, 490], F: [930, 280]};
const GW = 1000;
const GH = 560;
const R = 44;
const cost = (a: string, b: string) => ROADS.find(([x, y]) => (x === a && y === b) || (x === b && y === a))![2];
const same = (a: string, b: string, x: string, y: string) => (a === x && b === y) || (a === y && b === x);
// distance badges sit above the top-row nodes and below the others
const badgeY = (n: string) => (n === 'B' || n === 'D' ? -R - 40 : R + 40);

// The algorithm as a list of events cued to the narration.
// visit: the node becomes final. relax: a dot runs down the road at `pulse`, the new distance lands at `at`.
type Ev = {at: number; visit: string} | {at: number; pulse: number; from: string; to: string; d: number};
type Sim = {
  dist: Record<string, {v: number; at: number; old?: number}>;
  visited: Record<string, number>;
  current?: string;
  prev: Record<string, {from: string; at: number}>;
  relax?: {from: string; to: string; d: number; pulse: number; at: number; old: number};
};
const simulate = (evs: Ev[], frame: number): Sim => {
  const s: Sim = {dist: {}, visited: {}, prev: {}};
  for (const n of NODES) s.dist[n] = {v: n === 'A' ? 0 : Infinity, at: -999};
  for (const e of evs) {
    if ('visit' in e) {
      if (frame >= e.at) {
        s.visited[e.visit] = e.at;
        s.current = e.visit;
      }
      continue;
    }
    if (frame >= e.pulse) s.relax = {from: e.from, to: e.to, d: e.d, pulse: e.pulse, at: e.at, old: s.dist[e.to].v};
    if (frame >= e.at) {
      s.dist[e.to] = {v: e.d, at: e.at, old: s.dist[e.to].v};
      s.prev[e.to] = {from: e.from, at: e.at};
    }
  }
  return s;
};
// The whole run at once (for scenes that start from the finished table).
const FINAL: [string, string, number][] = [['A', 'B', 4], ['A', 'C', 2], ['C', 'B', 3], ['C', 'D', 10], ['C', 'E', 12], ['B', 'D', 8], ['D', 'E', 10], ['D', 'F', 14], ['E', 'F', 13]];
const finished = (): Ev[] => [
  ...FINAL.map(([from, to, d]) => ({at: -999, pulse: -999, from, to, d})),
  ...NODES.map((n) => ({at: -999, visit: n})),
];

// A distance value. When it changes, the old one is struck and fades while the new one pops in green.
const DistValue: React.FC<{v: number; at: number; old?: number; size?: number; tone?: string}> = ({v, at, old, size = type.body - 2, tone = color.paper}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const fresh = old !== undefined && t >= 0 && t < 40;
  const pop = interpolate(t, [0, 10], [1.4, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: 10}}>
      {fresh ? (
        <span style={{position: 'relative', fontFamily: font.mono, fontSize: size * 0.8, color: color.paperMute, opacity: interpolate(t, [20, 40], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
          {fmt(old!)}
          <span style={{position: 'absolute', left: -3, right: -3, top: '52%', height: 3, background: color.red, transform: `scaleX(${tw(frame, at, at + 8)})`, transformOrigin: 'left'}} />
        </span>
      ) : null}
      <span style={{fontFamily: font.mono, fontSize: size, color: fresh ? color.green : tone, display: 'inline-block', transform: `scale(${fresh ? pop : 1})`}}>{fmt(v)}</span>
    </span>
  );
};

type EdgeMark = {a: string; b: string; at: number; tone?: string; until?: number};

// The town as a graph. `morph` 0 draws it as a street map (thick roads, small intersections), 1 as a graph.
// Everything else (visits, relaxed roads, distances, highlighted edges, the final path) comes from props.
const GraphView: React.FC<{
  evs?: Ev[];
  morph?: number;
  weightsAt?: number;
  distAt?: Record<string, number>; // when each distance badge appears (omit = no badges)
  dim?: string[]; // nodes pushed into the background
  marks?: EdgeMark[];
  tree?: number; // 0..1: show the prev edges (where each node came from) in blue
  labels?: {node: string; text: string; at: number; tone?: string}[];
  locks?: {node: string; at: number}[];
}> = ({evs = [], morph = 1, weightsAt = -999, distAt, dim = [], marks = [], tree = 0, labels = [], locks = []}) => {
  const frame = useCurrentFrame();
  const s = simulate(evs, frame);
  const m = morph;
  const nodeVis = (n: string) => (dim.includes(n) ? 0.22 : 1);
  const edgeMark = (a: string, b: string) => {
    let hit: EdgeMark | undefined;
    for (const k of marks) if (same(a, b, k.a, k.b) && frame >= k.at && (k.until === undefined || frame < k.until)) hit = k;
    return hit;
  };
  const relaxing = s.relax && frame < s.relax.at + 24 ? s.relax : undefined;
  return (
    <div style={{position: 'relative', width: GW, height: GH}}>
      <svg width={GW} height={GH} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {ROADS.map(([a, b]) => {
          const [x1, y1] = POS[a];
          const [x2, y2] = POS[b];
          const mk = edgeMark(a, b);
          const isTree = (s.prev[b]?.from === a || s.prev[a]?.from === b) && tree > 0;
          const active = relaxing && same(a, b, relaxing.from, relaxing.to);
          const dimmed = dim.includes(a) || dim.includes(b);
          const tone = mk ? mk.tone ?? color.blue : active ? color.blue : isTree ? color.blue : color.paperMute;
          const w = mk ? 8 : active ? 7 : isTree ? 6 : 4;
          const op = dimmed && !mk ? 0.2 : isTree && !mk && !active ? lerp(1, 0.7, tree) : 1;
          return (
            <g key={a + b}>
              {/* street-map look: a wide road with a dashed centre line */}
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color.tileHi} strokeWidth={36} strokeLinecap="round" opacity={1 - m} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color.paperMute} strokeWidth={3} strokeDasharray="14 14" opacity={(1 - m) * 0.8} />
              {/* graph look */}
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tone} strokeWidth={w} strokeLinecap="round" opacity={m * op} />
            </g>
          );
        })}
        {relaxing && frame >= relaxing.pulse
          ? (() => {
              const t = tw(frame, relaxing.pulse, relaxing.pulse + 18);
              const [x1, y1] = POS[relaxing.from];
              const [x2, y2] = POS[relaxing.to];
              return <circle cx={lerp(x1, x2, t)} cy={lerp(y1, y2, t)} r={11} fill={color.blue} opacity={frame < relaxing.at + 10 ? 1 : 0} style={{filter: `drop-shadow(0 0 12px ${color.blue})`}} />;
            })()
          : null}
      </svg>
      {/* weights */}
      {ROADS.map(([a, b, w]) => {
        const x = (POS[a][0] + POS[b][0]) / 2;
        const y = (POS[a][1] + POS[b][1]) / 2;
        const t = tw(frame, weightsAt, weightsAt + 12);
        const mk = edgeMark(a, b);
        const active = relaxing && same(a, b, relaxing.from, relaxing.to);
        const hot = mk ? mk.tone ?? color.blue : active ? color.blue : undefined;
        const dimmed = (dim.includes(a) || dim.includes(b)) && !mk;
        return (
          <div
            key={a + b}
            style={{
              position: 'absolute', left: x - 28, top: y - 28, width: 56, height: 56, borderRadius: 28, background: color.code,
              border: `2px solid ${hot ?? color.tileLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: t * (dimmed ? 0.25 : 1), transform: `scale(${lerp(0.6, 1, t)})`,
            }}
          >
            <Mono size={type.label + 2} tone={hot ?? color.paperSoft}>{w}</Mono>
          </div>
        );
      })}
      {/* nodes */}
      {NODES.map((n) => {
        const [x, y] = POS[n];
        const vis = s.visited[n] !== undefined;
        const fill = vis ? tw(frame, s.visited[n], s.visited[n] + 10) : 0;
        const cur = s.current === n;
        return (
          <div
            key={n}
            style={{
              position: 'absolute', left: x - R, top: y - R, width: 2 * R, height: 2 * R, borderRadius: R,
              background: fill > 0.5 ? color.blue : color.card, boxShadow: cur ? shadow.focus : shadow.tile,
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: nodeVis(n), transform: `scale(${lerp(0.34, 1, m)})`,
            }}
          >
            <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: fill > 0.5 ? color.paper : color.ink, opacity: m}}>{n}</span>
          </div>
        );
      })}
      {/* distance badges */}
      {distAt
        ? NODES.map((n) => {
            const at = distAt[n];
            if (at === undefined || frame < at) return null;
            const [x, y] = POS[n];
            const d = s.dist[n];
            const t = tw(frame, at, at + 10);
            return (
              <div key={n} style={{position: 'absolute', left: x - 120, width: 240, top: y + badgeY(n) - 26, display: 'flex', justifyContent: 'center', opacity: t * nodeVis(n)}}>
                <div style={{padding: '4px 18px', borderRadius: radius.pill, background: color.code, border: `1px solid ${color.tileLine}`}}>
                  <DistValue v={d.v} at={d.at} old={d.old} size={type.label + 4} />
                </div>
              </div>
            );
          })
        : null}
      {labels.map((l) => {
        if (frame < l.at) return null;
        const [x, y] = POS[l.node];
        // above the node; top-row nodes have their distance badge above, so go higher
        const up = l.node === 'B' || l.node === 'D' ? -R - 96 : -R - 50;
        return (
          <div key={l.node + l.text} style={{position: 'absolute', left: x - 150, width: 300, top: y + up, display: 'flex', justifyContent: 'center'}}>
            <Enter at={l.at} preset="pop">
              <Eyebrow tone={l.tone ?? color.blue}>{l.text}</Eyebrow>
            </Enter>
          </div>
        );
      })}
      {locks.map((l) => {
        if (frame < l.at) return null;
        const [x, y] = POS[l.node];
        return (
          <div key={l.node} style={{position: 'absolute', left: x + R - 18, top: y - R - 14}}>
            <Enter at={l.at} preset="pop">
              <div style={{width: 46, height: 46, borderRadius: 23, background: color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.tile}}>
                <Icon name="lock" size={26} color={color.ink} />
              </div>
            </Enter>
          </div>
        );
      })}
    </div>
  );
};
// The distance table: one row per node with its best known distance, an optional "via" (prev) column,
// a check once the node is visited, and a blue ring on the node being visited right now.
const DistTable: React.FC<{evs?: Ev[]; distAt?: Record<string, number>; via?: number; viaAt?: number; allFinal?: number}> = ({evs = [], distAt = {}, via = 0, viaAt = 0, allFinal = 0}) => {
  const frame = useCurrentFrame();
  const s = simulate(evs, frame);
  return (
    <div style={{width: via > 0 ? 470 : 360, padding: '22px 26px', borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`, boxShadow: shadow.tile, display: 'flex', flexDirection: 'column', gap: 8}}>
      <Row gap={0}>
        <div style={{width: 90}}><Eyebrow tone={color.paperMute}>node</Eyebrow></div>
        <div style={{width: 150}}><Eyebrow tone={color.paperMute}>dist</Eyebrow></div>
        {via > 0 ? (
          <div style={{width: 110, opacity: via}}><Eyebrow tone={color.amber}>prev</Eyebrow></div>
        ) : null}
      </Row>
      {NODES.map((n, i) => {
        const at = distAt[n];
        const shown = at === undefined || frame >= at;
        const vis = s.visited[n] !== undefined;
        const cur = s.current === n;
        const d = s.dist[n];
        const p = s.prev[n];
        const glow = allFinal > 0;
        return (
          <div
            key={n}
            style={{
              display: 'flex', alignItems: 'center', height: 62, borderRadius: radius.chip, padding: '0 0 0 4px',
              background: cur ? 'rgba(26,132,245,0.16)' : 'transparent', boxShadow: cur ? `inset 0 0 0 2px ${color.blue}` : undefined,
            }}
          >
            <div style={{width: 86, fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.paper}}>{n}</div>
            <div style={{width: 150, opacity: shown ? tw(frame, at ?? -999, (at ?? -999) + 10) : 0}}>
              <DistValue v={d.v} at={d.at} old={d.old} tone={glow ? color.green : color.paper} />
            </div>
            {via > 0 ? (
              <div style={{width: 100, opacity: tw(frame, stagger(viaAt, i, 5), stagger(viaAt, i, 5) + 10)}}>
                <Mono size={type.body - 4} tone={color.amber}>{p ? p.from : n === 'A' ? '–' : ''}</Mono>
              </div>
            ) : null}
            <div style={{marginLeft: 'auto', width: 36, opacity: vis ? tw(frame, s.visited[n], s.visited[n] + 8) : 0}}>
              <Icon name="check" size={30} color={glow ? color.green : color.blue} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// The latest relaxation written out: "C → B   2 + 1 = 3  < 4".
const RelaxMath: React.FC<{evs: Ev[]}> = ({evs}) => {
  const frame = useCurrentFrame();
  const r = simulate(evs, frame).relax;
  if (!r) return <div style={{height: 64}} />;
  const w = cost(r.from, r.to);
  const done = frame >= r.at;
  return (
    <div key={r.pulse} style={{height: 64, display: 'flex', alignItems: 'center'}}>
      <Enter at={r.pulse} preset="fade">
        <div style={{padding: '12px 28px', borderRadius: radius.pill, background: color.code, border: `1px solid ${color.tileLine}`, display: 'flex', gap: 22, alignItems: 'center'}}>
          <Mono size={type.body - 2} tone={color.paperSoft}>{r.from} → {r.to}</Mono>
          <Mono size={type.body - 2}>
            {r.d - w} + {w} = <span style={{color: color.blue}}>{r.d}</span>
          </Mono>
          <span style={{opacity: done ? 1 : 0}}>
            <Mono size={type.body - 2} tone={color.green}>&lt; {fmt(r.old)} ✓</Mono>
          </span>
        </div>
      </Enter>
    </div>
  );
};

// ---------- 1. Hook ----------

// A street grid with a route drawing itself from home to work, then zooming out to a whole city.
const CityRoute: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const zoom = tw(frame, cue('millions of intersections'), cue('millions of intersections') + 40);
  const draw = tw(frame, cue('for a route'), cue('for a route') + 50);
  const step = 100;
  const xs = Array.from({length: 49}, (_, i) => -1600 + i * step);
  const ys = Array.from({length: 31}, (_, i) => -1000 + i * step);
  const route: [number, number][] = [[300, 600], [600, 600], [600, 400], [1000, 400], [1000, 200], [1300, 200]];
  const segs = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  const pts = route.map((p) => p.join(',')).join(' ');
  const dotsAt = cue('millions of intersections');
  const pin = (x: number, y: number, label: string, at: number, tone: string) => (
    <div style={{position: 'absolute', left: x - 100, top: y - 92, width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: tw(frame, at, at + 8) * (1 - zoom * 0.4)}}>
      <Pill variant="white" size={26}>{label}</Pill>
      <div style={{width: 26, height: 26, borderRadius: 13, background: tone, boxShadow: `0 0 0 6px rgba(255,255,255,0.12)`}} />
    </div>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${lerp(1, 0.42, zoom)})`, transformOrigin: '50% 50%'}}>
        <div style={{position: 'absolute', left: 160, top: 140, width: 1600, height: 800}}>
          <svg width={1600} height={800} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            {xs.map((x) => <line key={'x' + x} x1={x} y1={-1000} x2={x} y2={2000} stroke={color.tileHi} strokeWidth={18} />)}
            {ys.map((y) => <line key={'y' + y} x1={-1600} y1={y} x2={3200} y2={y} stroke={color.tileHi} strokeWidth={18} />)}
            {xs.flatMap((x, i) =>
              ys.map((y, j) => {
                const at = dotsAt + ((i * 7 + j * 13) % 30);
                return <circle key={`${x}-${y}`} cx={x} cy={y} r={6} fill={color.paperMute} opacity={tw(frame, at, at + 8)} />;
              }),
            )}
            <polyline points={pts} fill="none" stroke={color.blue} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={total} strokeDashoffset={total * (1 - draw)} style={{filter: `drop-shadow(0 0 14px ${color.blue})`}} />
          </svg>
          {pin(300, 600, 'Home', cue('for a route'), color.paper)}
          {pin(1300, 200, 'Work', cue('for a route') + 10, color.green)}
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 110, display: 'flex', justifyContent: 'center', gap: 20}}>
        <Enter at={dotsAt} preset="pop">
          <Pill variant="white" icon="grid" size={30}>millions of intersections</Pill>
        </Enter>
        <Enter at={cue('fraction of a second')} preset="pop">
          <Pill variant="blue" icon="clock" size={30}>in a fraction of a second</Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const Title: React.FC = () => {
  const cue = useCue();
  const scary = cue('sounds scary');
  const simple = cue('really simple');
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={cue('1956')} preset="fade">
          <Eyebrow>1956 · Edsger Dijkstra</Eyebrow>
        </Enter>
        <Enter at={cue("dijkstra's algorithm")} preset="rise">
          <Headline size={type.hero}>
            Dijkstra's <Accent>algorithm</Accent>
          </Headline>
        </Enter>
        <Row gap={24}>
          <Enter at={scary} preset="pop">
            <Pill variant="neutral" size={32} struck={useTween(simple, simple + 12)}>sounds scary</Pill>
          </Enter>
          <Enter at={simple} preset="pop">
            <Pill variant="green" icon="check" size={32}>really simple</Pill>
          </Enter>
        </Row>
        <Enter at={cue('from scratch')} preset="fade">
          <Label size={type.body} tone={color.paperSoft}>built from scratch, step by step</Label>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 2. The map is a graph ----------

const MapToGraph: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const nodeAt = cue('every intersection');
  const edgeAt = cue('every road becomes');
  const morph = tw(frame, nodeAt, edgeAt + 20);
  const weightsAt = cue('gets a number');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The idea" title="A map is a graph" />
      <Center gap={50}>
        <Enter at={0} preset="fade">
          <GraphView
            morph={morph}
            weightsAt={weightsAt}
            labels={[
              {node: 'A', text: 'start', at: cue('we start with a')},
              {node: 'F', text: 'target', at: cue('get to f'), tone: color.green},
            ]}
          />
        </Enter>
        <Row gap={20}>
          <Enter at={nodeAt} preset="pop">
            <Pill variant="white" size={28}>intersection → node</Pill>
          </Enter>
          <Enter at={edgeAt} preset="pop">
            <Pill variant="white" size={28}>road → edge</Pill>
          </Enter>
          <Enter at={weightsAt} preset="pop">
            <Pill variant="blue" icon="clock" size={28}>weight = minutes</Pill>
          </Enter>
          <Enter at={cue('weighted graph')} preset="pop">
            <Pill variant="green" size={28}>a weighted graph</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// An adjacency list, drawn: each node with its neighbours and the cost to reach them.
const AdjacencyCard: React.FC<{at: number; twiceAt: number}> = ({at, twiceAt}) => {
  const frame = useCurrentFrame();
  const rows = NODES.map((n) => ({n, out: ROADS.filter(([a, b]) => a === n || b === n).map(([a, b, w]) => ({to: a === n ? b : a, w}))}));
  return (
    <div style={{width: 420, padding: "22px 22px", borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 12}}>
      <Eyebrow tone={color.inkMute}>adjacency list</Eyebrow>
      {rows.map((r, i) => (
        <div key={r.n} style={{display: 'flex', alignItems: 'center', gap: 14, opacity: tw(frame, stagger(at, i, 5), stagger(at, i, 5) + 10)}}>
          <span style={{width: 40, fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>{r.n}</span>
          <Icon name="arrowRight" size={24} color={color.inkMute} />
          {r.out.map((o) => {
            // the A–B road is shown from both ends once "added twice" is said
            const twin = same(r.n, o.to, 'A', 'B') && frame >= twiceAt;
            return (
              <span key={o.to} style={{padding: '2px 12px', borderRadius: radius.chip, background: twin ? color.blue : color.cardLine, fontFamily: font.mono, fontSize: type.label, color: twin ? color.paper : color.inkSoft}}>
                {o.to}·{o.w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const GraphCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The idea" title="graph.ts" />
      <Center>
        <Row gap={30} align="center">
          <Enter at={0} preset="rise">
            <CodeWindow
              file={`${CODE}/graph.ts`}
              lines={[2, 13]}
              size={26}
              maxWidth={1220}
              steps={[
                {at: cue('adjacency list'), lines: [2, 2]},
                {at: cue('both ways'), lines: [9, 10]},
              ]}
            />
          </Enter>
          <Enter at={cue("it's a map from")} preset="rise">
            <AdjacencyCard at={cue("it's a map from")} twiceAt={cue('added twice')} />
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 3. Why it's not obvious ----------

const Detour: React.FC = () => {
  const cue = useCue();
  const direct = cue('direct road');
  const detour = cue('c first');
  const evs: Ev[] = [
    {at: cue('4 minutes'), pulse: direct, from: 'A', to: 'B', d: 4},
    {at: cue('change your mind'), pulse: cue('change your mind') - 1, from: 'C', to: 'B', d: 3},
  ];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The idea" title="Why it's not obvious" />
      <Center gap={40}>
        <Enter at={0} preset="fade">
          <GraphView
            evs={evs}
            dim={['D', 'E', 'F']}
            distAt={{B: cue('4 minutes')}}
            marks={[
              {a: 'A', b: 'B', at: direct, tone: color.red, until: detour},
              {a: 'A', b: 'C', at: detour, tone: color.green},
              {a: 'C', b: 'B', at: cue('then to b'), tone: color.green},
            ]}
          />
        </Enter>
        <Row gap={24}>
          <Enter at={direct} preset="pop">
            <Pill variant="neutral" size={30} struck={useTween(cue('detour is faster'), cue('detour is faster') + 12)}>A → B: 4 min</Pill>
          </Enter>
          <Enter at={cue("that's 2 plus 1")} preset="pop">
            <Pill variant="green" size={30}>A → C → B: 2 + 1 = 3 min</Pill>
          </Enter>
          <Enter at={cue('best time')} preset="pop">
            <Pill variant="white" icon="pencil" size={30}>keep the best so far, update it</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Trying every route: the number of corner-to-corner routes explodes as the grid grows.
const LATTICE = [
  {n: 3, routes: 20},
  {n: 6, routes: 924},
  {n: 12, routes: 2704156},
  {n: 20, routes: 137846528820},
];
const RouteExplosion: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const ats = [cue('every possible route'), cue('every possible route') + 30, cue('way too many'), cue('actual real map')];
  let k = 0;
  for (let i = 0; i < ats.length; i++) if (frame >= ats[i]) k = i;
  const {n, routes} = LATTICE[k];
  const size = 520;
  const cell = size / n;
  // three sample routes: right/down moves picked by a fixed pseudo-random pattern
  const sample = (seed: number) => {
    const pts: [number, number][] = [[0, 0]];
    let x = 0, y = 0, s = seed;
    while (x < n || y < n) {
      s = (s * 9301 + 49297) % 233280;
      if (y === n || (x < n && s / 233280 < 0.5)) x++;
      else y++;
      pts.push([x * cell, y * cell]);
    }
    return pts.map((p) => p.join(',')).join(' ');
  };
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The idea" title="Why not try every route?" />
      <Center>
        <Row gap={110}>
          <div key={n} style={{position: 'relative', width: size, height: size}}>
            <Enter at={ats[k]} preset="blur">
              <svg width={size} height={size} style={{overflow: 'visible'}}>
                {Array.from({length: n + 1}, (_, i) => (
                  <g key={i}>
                    <line x1={i * cell} y1={0} x2={i * cell} y2={size} stroke={color.tileHi} strokeWidth={n > 12 ? 2 : 4} />
                    <line x1={0} y1={i * cell} x2={size} y2={i * cell} stroke={color.tileHi} strokeWidth={n > 12 ? 2 : 4} />
                  </g>
                ))}
                {[11, 47, 93].map((sd, i) => (
                  <polyline key={sd} points={sample(sd + n)} fill="none" stroke={[color.blue, color.green, color.amber][i]} strokeWidth={6} strokeLinejoin="round" opacity={0.85} />
                ))}
                <circle cx={0} cy={0} r={14} fill={color.paper} />
                <circle cx={size} cy={size} r={14} fill={color.green} />
              </svg>
            </Enter>
          </div>
          <Stack gap={18} align="flex-start">
            <Label size={type.body} tone={color.paperSoft}>{n} × {n} blocks</Label>
            <div key={routes} style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.hero, color: k === 3 ? color.red : color.paper, letterSpacing: '-0.04em'}}>
              <Enter at={ats[k]} preset="pop">{routes.toLocaleString('en-US')}</Enter>
            </div>
            <Label size={type.body} tone={color.paperSoft}>routes corner to corner, never backtracking</Label>
            <div style={{height: 20}} />
            <Enter at={cue('without ever doing that')} preset="pop">
              <Pill variant="green" icon="check" size={30}>Dijkstra never lists the routes</Pill>
            </Enter>
          </Stack>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 4. The one rule ----------

const Setup: React.FC = () => {
  const cue = useCue();
  const zero = cue('a is 0');
  const inf = cue('everything else is infinity');
  const others = {B: inf, C: inf + 3, D: inf + 6, E: inf + 9, F: inf + 12};
  const distAt = {A: zero, ...others};
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The algorithm" title="The setup" />
      <Center>
        <Row gap={80}>
          <GraphView weightsAt={-999} distAt={distAt} />
          <Enter at={cue('we keep a table')} preset="rise">
            <DistTable distAt={distAt} />
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// The two steps as cards, and a tiny picture of "relaxing an edge" under them.
const RuleCard: React.FC<{n: number; title: string; sub: string; at: number; focus: boolean}> = ({n, title, sub, at, focus}) => (
  <Enter at={at} preset="rise">
    <div style={{width: 660, padding: '30px 34px', borderRadius: radius.card, background: color.card, boxShadow: focus ? `${shadow.card}, ${shadow.focus}` : shadow.card, display: 'flex', gap: 26, alignItems: 'flex-start', boxSizing: 'border-box'}}>
      <div style={{width: 56, height: 56, flexShrink: 0, borderRadius: 28, background: color.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.paper}}>{n}</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading - 4, color: color.ink, letterSpacing: '-0.02em'}}>{title}</div>
        <div style={{fontFamily: font.sans, fontSize: type.label + 2, color: color.inkMute}}>{sub}</div>
      </div>
    </div>
  </Enter>
);

// u (2) --1--> v (4): 2 + 1 = 3 beats 4, so v becomes 3.
const RelaxMini: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const dot = tw(frame, at + 10, at + 28);
  const node = (letter: string, children: React.ReactNode) => (
    <Stack gap={12}>
      <div style={{width: 80, height: 80, borderRadius: 40, background: color.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading - 4, color: color.ink}}>{letter}</div>
      <div style={{padding: '4px 16px', borderRadius: radius.pill, background: color.code, border: `1px solid ${color.tileLine}`}}>{children}</div>
    </Stack>
  );
  return (
    <Row gap={0} align="flex-start">
      {node('C', <Mono>2</Mono>)}
      <div style={{position: 'relative', width: 300, height: 80}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 38, height: 5, borderRadius: 3, background: color.blue}} />
        <div style={{position: 'absolute', left: `${dot * 100}%`, top: 30, width: 20, height: 20, marginLeft: -10, borderRadius: 10, background: color.blue, boxShadow: `0 0 16px ${color.blue}`, opacity: dot < 1 ? 1 : 0}} />
        <div style={{position: 'absolute', left: 125, top: 12, width: 50, height: 50, borderRadius: 25, background: color.code, border: `2px solid ${color.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Mono tone={color.blue}>1</Mono>
        </div>
      </div>
      {node('B', <DistValue v={frame >= at + 30 ? 3 : 4} at={at + 30} old={frame >= at + 30 ? 4 : undefined} size={type.label + 2} />)}
      <div style={{width: 60}} />
      <div style={{paddingTop: 16}}>
        <Mono size={type.body} tone={color.paperSoft}>
          2 + 1 = 3 <span style={{color: color.green}}>&lt; 4</span>
        </Mono>
      </div>
    </Row>
  );
};

const Rule: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const relaxAt = cue('relaxing an edge');
  const whole = frame >= cue("that's the whole algorithm");
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The algorithm" title="Repeat two steps" />
      <Center gap={34}>
        <RuleCard n={1} title="Visit the closest unvisited node" sub="smallest distance in the table" at={cue('one')} focus={whole || (frame < cue('now look at') && frame >= cue('one'))} />
        <RuleCard n={2} title="Update its neighbours" sub="is going through this node faster?" at={cue('now look at')} focus={whole || (frame >= cue('now look at') && frame < relaxAt)} />
        <div style={{height: 10}} />
        <Enter at={cue('has a name')} preset="rise">
          <Stack gap={22}>
            <Headline size={type.title - 8}>
              Relaxing an <Accent>edge</Accent>
            </Headline>
            <RelaxMini at={relaxAt} />
          </Stack>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 5. Walkthrough ----------

const Walkthrough: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const evs: Ev[] = [
    {at: cue('so we visit a'), visit: 'A'},
    {at: cue('b becomes 4'), pulse: cue('b at 4'), from: 'A', to: 'B', d: 4},
    {at: cue('c becomes 2'), pulse: cue('c at 2'), from: 'A', to: 'C', d: 2},
    {at: cue('closest unvisited node is c'), visit: 'C'},
    {at: cue('b drops to 3'), pulse: cue('b is 2 plus 1'), from: 'C', to: 'B', d: 3},
    {at: cue('so 10'), pulse: cue('d is 2 plus 8'), from: 'C', to: 'D', d: 10},
    {at: cue('so 12'), pulse: cue('e is 2 plus 10'), from: 'C', to: 'E', d: 12},
    {at: cue('next closest is b'), visit: 'B'},
    {at: cue('d becomes 8'), pulse: cue('d is 3 plus 5'), from: 'B', to: 'D', d: 8},
    {at: cue('then d at 8'), visit: 'D'},
    {at: cue('better than 12'), pulse: cue('e through d'), from: 'D', to: 'E', d: 10},
    {at: cue('so 14'), pulse: cue('f finally gets'), from: 'D', to: 'F', d: 14},
    {at: cue('then e'), visit: 'E'},
    {at: cue('that beats 14'), pulse: cue('f through e'), from: 'E', to: 'F', d: 13},
    {at: cue('and lastly'), visit: 'F'},
  ];
  const doneAt = cue('every node is visited');
  const bonus = cue('all of them');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Walkthrough" title={frame >= doneAt ? 'Shortest time to every node' : 'Running it by hand'} />
      <Center gap={30}>
        <Row gap={80}>
          <GraphView evs={evs} distAt={{A: -999, B: -999, C: -999, D: -999, E: -999, F: -999}} />
          <DistTable evs={evs} allFinal={frame >= bonus ? 1 : 0} />
        </Row>
        {frame < doneAt ? (
          <RelaxMath evs={evs} />
        ) : (
          <div style={{height: 64, display: 'flex', alignItems: 'center'}}>
            <Enter at={bonus} preset="pop">
              <Pill variant="green" icon="check" size={30}>A to every node, all at once</Pill>
            </Enter>
          </div>
        )}
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 6. Why it works ----------

// The visited area around the start; X is the closest unvisited node; any other way to X has to leave
// through another unvisited node (Y), which is already further away, so the detour can only add time.
const TrustProof: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const closest = cue("because it's the closest");
  const other = cue('any other way');
  const never = cue('never make the trip');
  const final = cue('number is final');
  const S: [number, number] = [170, 280];
  const X: [number, number] = [640, 110];
  const Y: [number, number] = [640, 450];
  const detour = tw(frame, other, other + 30);
  const node = (p: [number, number], letter: string, dist: string, focus: boolean, tone: string = color.card) => (
    <div style={{position: 'absolute', left: p[0] - R, top: p[1] - R, width: 2 * R, height: 2 * R, borderRadius: R, background: tone, boxShadow: focus ? shadow.focus : shadow.tile, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading - 4, color: tone === color.card ? color.ink : color.paper}}>{letter}</span>
      <div style={{position: 'absolute', left: 2 * R + 16, top: R - 22, whiteSpace: 'nowrap'}}>
        <div style={{padding: '4px 16px', borderRadius: radius.pill, background: color.code, border: `1px solid ${color.tileLine}`}}>
          <Mono size={type.label + 4}>{dist}</Mono>
        </div>
      </div>
    </div>
  );
  // path of the detour: S → Y → X, drawn as a dashed curve
  const d = `M ${Y[0]} ${Y[1]} C ${Y[0] + 260} ${Y[1] - 60}, ${X[0] + 260} ${X[1] + 60}, ${X[0]} ${X[1]}`;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Why it works" title="The closest node is final" />
      <Center gap={40}>
        <div style={{position: 'relative', width: 1100, height: 560}}>
          {/* visited region */}
          <div style={{position: 'absolute', left: 20, top: 120, width: 300, height: 320, borderRadius: 160, background: 'rgba(26,132,245,0.10)', border: `2px dashed ${color.blue}`}} />
          <div style={{position: 'absolute', left: 20, top: 456, width: 300, textAlign: 'center'}}>
            <Eyebrow>visited</Eyebrow>
          </div>
          <svg width={1100} height={560} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <line x1={S[0]} y1={S[1]} x2={X[0]} y2={X[1]} stroke={frame >= closest ? color.blue : color.paperMute} strokeWidth={6} />
            <line x1={S[0]} y1={S[1]} x2={Y[0]} y2={Y[1]} stroke={color.paperMute} strokeWidth={4} />
            <path d={d} fill="none" stroke={color.amber} strokeWidth={5} pathLength={1} style={{strokeDasharray: `${detour} 1`}} opacity={detour > 0 ? 1 : 0} />
          </svg>
          {node(S, 'A', '0', false, color.blue)}
          {node(X, 'X', '2', frame >= closest)}
          {node(Y, 'Y', '3', false)}
          <div style={{position: 'absolute', left: X[0] - 190, top: X[1] - 112, width: 380, textAlign: 'center', opacity: tw(frame, closest, closest + 10)}}>
            <Eyebrow>closest unvisited</Eyebrow>
          </div>
          <div style={{position: 'absolute', left: 860, top: 250, opacity: tw(frame, other + 20, other + 30)}}>
            <div style={{padding: '12px 22px', borderRadius: radius.chip, background: color.code, border: `2px solid ${color.amber}`}}>
              <Mono size={type.body - 4} tone={color.amber}>3 + more ≥ 3</Mono>
              <div style={{opacity: tw(frame, never, never + 10)}}>
                <Mono size={type.body - 4} tone={color.green}>never below 2</Mono>
              </div>
            </div>
          </div>
          {frame >= final ? (
            <div style={{position: 'absolute', left: X[0] - 23, top: X[1] - R - 60}}>
              <Enter at={final} preset="pop">
                <div style={{width: 46, height: 46, borderRadius: 23, background: color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="lock" size={26} color={color.ink} />
                </div>
              </Enter>
            </div>
          ) : null}
        </div>
        <Row gap={20}>
          <Enter at={cue('negative time')} preset="pop">
            <Pill variant="white" icon="clock" size={28}>no road takes negative time</Pill>
          </Enter>
          <Enter at={final} preset="pop">
            <Pill variant="blue" icon="lock" size={28}>so X's distance is final</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// One negative road breaks it: B is locked at 2, but A → C → B really costs 5 − 4 = 1.
const NegativeTrap: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const neg = cue('negative weights');
  const wrong = cue('wrong answer');
  const A: [number, number] = [120, 260];
  const B: [number, number] = [620, 80];
  const C: [number, number] = [620, 440];
  const arrow = (p: [number, number], q: [number, number], tone: string, w: string, at: number) => {
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const ex = q[0] - Math.cos(ang) * (R + 10);
    const ey = q[1] - Math.sin(ang) * (R + 10);
    const sx = p[0] + Math.cos(ang) * R;
    const sy = p[1] + Math.sin(ang) * R;
    const t = tw(frame, at, at + 14);
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    return (
      <g opacity={t}>
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={tone} strokeWidth={5} />
        <polygon points={`${ex},${ey} ${ex - 22 * Math.cos(ang - 0.4)},${ey - 22 * Math.sin(ang - 0.4)} ${ex - 22 * Math.cos(ang + 0.4)},${ey - 22 * Math.sin(ang + 0.4)}`} fill={tone} />
        <circle cx={mx} cy={my} r={32} fill={color.code} stroke={tone} strokeWidth={2} />
        <text x={mx} y={my + 10} textAnchor="middle" fontFamily={font.mono} fontSize={28} fill={tone}>{w}</text>
      </g>
    );
  };
  const node = (p: [number, number], l: string, vis: boolean) => (
    <div style={{position: 'absolute', left: p[0] - R, top: p[1] - R, width: 2 * R, height: 2 * R, borderRadius: R, background: vis ? color.blue : color.card, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.tile}}>
      <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading - 4, color: vis ? color.paper : color.ink}}>{l}</span>
    </div>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Why it works" title="The one catch" />
      <Center>
        <Row gap={100}>
          <div style={{position: 'relative', width: 760, height: 520}}>
            <svg width={760} height={520} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              {arrow(A, B, color.paperMute, '2', 0)}
              {arrow(A, C, color.paperMute, '5', 0)}
              {arrow(C, B, color.red, '−4', neg)}
            </svg>
            {node(A, 'A', true)}
            {node(B, 'B', frame >= wrong)}
            {node(C, 'C', false)}
            <div style={{position: 'absolute', left: B[0] + R + 20, top: B[1] - 26}}>
              <div style={{padding: '4px 16px', borderRadius: radius.pill, background: color.code, border: `1px solid ${color.tileLine}`, display: 'flex', gap: 12, alignItems: 'center'}}>
                <Mono size={type.label + 4}>2</Mono>
                {frame >= wrong ? <Icon name="lock" size={24} color={color.paper} /> : null}
              </div>
            </div>
            <div style={{position: 'absolute', left: C[0] + R + 20, top: C[1] - 26}}>
              <div style={{padding: '4px 16px', borderRadius: radius.pill, background: color.code, border: `1px solid ${color.tileLine}`}}>
                <Mono size={type.label + 4}>5</Mono>
              </div>
            </div>
          </div>
          <Stack gap={22} align="flex-start">
            <Enter at={cue('gives you time back')} preset="pop">
              <Pill variant="outline" size={30}>a road that gives time back</Pill>
            </Enter>
            <Enter at={wrong} preset="pop">
              <div style={{padding: '18px 24px', borderRadius: radius.chip, background: color.code, border: `2px solid ${color.red}`, display: 'flex', flexDirection: 'column', gap: 8}}>
                <Mono size={type.body - 4} tone={color.paperSoft}>Dijkstra locks B at 2</Mono>
                <Mono size={type.body - 4} tone={color.red}>A → C → B = 5 − 4 = 1</Mono>
              </div>
            </Enter>
            <Enter at={cue('bellman-ford')} preset="pop">
              <Pill variant="white" size={30}>negative weights → Bellman-Ford</Pill>
            </Enter>
            <Enter at={cue('never negative')} preset="pop">
              <Pill variant="green" icon="check" size={30}>maps: travel time is never negative</Pill>
            </Enter>
          </Stack>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 7. The route ----------

const Prev: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const viaAt = cue('which node we came from');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The route" title="Where we came from" />
      <Center gap={30}>
        <Row gap={70}>
          <GraphView evs={finished()} distAt={{A: -999, B: -999, C: -999, D: -999, E: -999, F: -999}} tree={tw(frame, viaAt, viaAt + 30)} />
          <DistTable evs={finished()} via={1} viaAt={viaAt} />
        </Row>
        <div style={{height: 64}}>
          <Enter at={cue('called prev')} preset="pop">
            <Pill variant="white" size={30}>
              second table: <span style={{fontFamily: font.mono, color: color.amber}}>prev</span>
            </Pill>
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// Follow prev back from F, one hop per phrase; then flip the list into the route.
const Backtrack: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const hops = [cue('f came from e'), cue('e from d'), cue('d from b'), cue('b from c'), cue('c from a')];
  const back = ['F', 'E', 'D', 'B', 'C', 'A'];
  const flip = cue('flip that around');
  const ft = tw(frame, flip, flip + 24);
  const marks: EdgeMark[] = hops.map((at, i) => ({a: back[i], b: back[i + 1], at, tone: frame >= flip ? color.green : color.amber}));
  const chipW = 110;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The route" title="Follow prev backwards" />
      <Center gap={50}>
        <GraphView evs={finished()} marks={marks} labels={[{node: 'F', text: 'target', at: 0, tone: color.green}]} />
        <div style={{position: 'relative', width: back.length * chipW, height: 80}}>
          {back.map((n, i) => {
            const at = i === 0 ? cue('start at the target') : hops[i - 1];
            const x = lerp(i, back.length - 1 - i, ft) * chipW;
            return (
              <div key={n} style={{position: 'absolute', left: x, top: 0, width: chipW, display: 'flex', justifyContent: 'center', opacity: tw(frame, at, at + 8)}}>
                <div style={{width: 76, height: 76, borderRadius: 38, background: ft > 0.5 ? color.green : color.tile, border: `2px solid ${ft > 0.5 ? color.green : color.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading - 6, color: color.paper}}>{n}</div>
              </div>
            );
          })}
        </div>
        <div style={{height: 50}}>
          <Enter at={flip + 20} preset="pop">
            <Pill variant="green" icon="check" size={30}>A → C → B → D → E → F · 13 min</Pill>
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 8. The code ----------

const CodeSetup: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const initAt = cue('every distance starts');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="dijkstra.ts" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/dijkstra.ts`}
            lines={[1, 10]}
            steps={[
              {at: cue('dist is the table'), lines: [5, 5]},
              {at: cue('prev is where'), lines: [6, 6]},
              {at: cue('and visited is'), lines: [7, 7]},
              {at: initAt, lines: [9, 10]},
            ]}
          />
        </Enter>
        <Row gap={14}>
          {NODES.map((n, i) => (
            <Enter key={n} at={stagger(initAt, i, 4)} preset="pop">
              <div style={{width: 120, padding: '12px 0', borderRadius: radius.chip, background: color.tile, border: `1px solid ${color.tileLine}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.label + 2, color: color.paperSoft}}>{n}</span>
                <Mono size={type.body} tone={n === 'A' && frame >= cue('which is zero') ? color.green : color.paper}>{n === 'A' && frame >= cue('which is zero') ? '0' : '∞'}</Mono>
              </div>
            </Enter>
          ))}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const CodeLoop: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="The main loop" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/dijkstra.ts`}
            lines={[12, 23]}
            steps={[
              {at: cue('step one'), lines: [13, 18]},
              {at: cue('if the best we can find'), lines: [19, 19]},
              {at: cue('step two'), lines: [21, 22]},
            ]}
          />
        </Enter>
        <Row gap={20}>
          <Enter at={cue('step one')} preset="pop">
            <Pill variant="white" size={28}>1 · find the closest unvisited node</Pill>
          </Enter>
          <Enter at={cue("isn't reachable")} preset="pop">
            <Pill variant="neutral" size={28}>∞ = unreachable, stop</Pill>
          </Enter>
          <Enter at={cue('step two')} preset="pop">
            <Pill variant="blue" icon="lock" size={28}>2 · now it's final</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const CodeRelax: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="Relax every road" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/dijkstra.ts`}
            lines={[25, 35]}
            size={26}
            steps={[
              {at: cue('relax every road'), lines: [26, 27]},
              {at: cue('the new distance'), lines: [28, 28]},
              {at: cue("if that's smaller"), lines: [29, 29]},
              {at: cue('we update dist'), lines: [31, 31]},
              {at: cue('update prev'), lines: [32, 32]},
            ]}
          />
        </Enter>
        <Enter at={cue('the new distance')} preset="pop">
          <Mono size={type.body} tone={color.paperSoft}>
            newDist = dist[current] + cost <span style={{color: color.green}}>&lt; dist[to] ?</span>
          </Mono>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const CodePath: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const stepAt = cue('keep stepping back');
  const path = ['A', 'C', 'B', 'D', 'E', 'F'];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="pathTo" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/dijkstra.ts`}
            lines={[40, 45]}
            steps={[
              {at: cue('start at the target'), lines: [42, 42]},
              {at: stepAt, lines: [43, 43]},
            ]}
          />
        </Enter>
        <Row gap={14}>
          {path.map((n, i) => {
            // unshift: F first, then each earlier node lands at the front
            const at = stagger(stepAt, path.length - 1 - i, 10);
            return (
              <div key={n} style={{opacity: tw(frame, at, at + 8), transform: `translateX(${lerp(-40, 0, tw(frame, at, at + 10))}px)`}}>
                <div style={{width: 76, height: 76, borderRadius: 38, background: color.tile, border: `2px solid ${i === path.length - 1 ? color.green : color.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading - 6, color: color.paper}}>{n}</div>
              </div>
            );
          })}
        </Row>
        <Enter at={cue('at the front')} preset="pop">
          <Pill variant="white" size={28}>path.unshift(): each step goes to the front</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// The real run log (public/code/dijkstra/terminal/01-run.txt), at 26px so all 18 lines fit.
const RunLog: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const [run] = blocks(out.s01);
  const visitA = cue('it visits a');
  const thenC = cue('then c');
  const drop = cue('b drops from');
  const rest = cue('and so on');
  const result = cue('and the path is');
  // when each output line appears: A's lines, then C's, then the rest fast, then the summary
  const lineAt = (i: number) => {
    if (i <= 2) return visitA + i * 4;
    if (i === 3) return thenC;
    if (i === 4) return drop;
    if (i <= 14) return rest + (i - 5) * 4;
    return result + (i - 15) * 6;
  };
  const tone = (l: string, i: number) => {
    if (l.startsWith('path') && frame >= result) return color.green;
    if (i === 4 && frame >= drop) return color.blue;
    if (l.startsWith('visit')) return color.paper;
    return color.paperSoft;
  };
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="node run.ts" />
      <Center>
        <Enter at={0} preset="rise">
          <div style={{width: 1080, borderRadius: radius.window, overflow: 'hidden', background: color.code, boxShadow: shadow.card, border: `1px solid ${color.tileLine}`}}>
            <div style={{height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: color.tileHi}}>
              <div style={{position: 'absolute', left: 22, display: 'flex', gap: 10}}>
                {[color.red, color.amber, color.green].map((c) => (
                  <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />
                ))}
              </div>
              <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: 24, color: color.paperSoft}}>Terminal</span>
            </div>
            <div style={{padding: '22px 34px', fontFamily: font.mono, fontSize: 26, lineHeight: 1.42, whiteSpace: 'pre'}}>
              <div style={{color: color.paper}}>
                <span style={{color: color.green}}>❯ </span>
                {run.cmd}
              </div>
              {run.out.map((l, i) => (
                <div key={i} style={{color: tone(l, i), opacity: tw(frame, lineAt(i), lineAt(i) + 6), height: 37}}>{l}</div>
              ))}
            </div>
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 9. Making it fast ----------

const [bench] = blocks(out.s02);
// "simple scan: 50871 ms  ->  769 min" -> 50871
const msOf = (prefix: string) => Number(bench.out.find((l) => l.startsWith(prefix))!.split(':')[1].trim().split(' ')[0]);
const SIMPLE_MS = msOf('simple scan');
const HEAP_MS = msOf('min-heap');

// A 150 × 150 grid, zooming out from a few blocks to the whole thing.
const BigGrid: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const zoomAt = cue('150 by 150');
  const z = tw(frame, zoomAt, zoomAt + 50);
  const size = 760;
  const cell = size / 150;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="node bench.ts" />
      <Center>
        <Row gap={100}>
          <div style={{width: size, height: size, overflow: 'hidden', borderRadius: radius.tile, border: `1px solid ${color.tileLine}`, background: color.code}}>
            <svg width={size} height={size} style={{transform: `scale(${lerp(14, 1, z)})`, transformOrigin: '0 0'}}>
              <defs>
                <pattern id="city" width={cell} height={cell} patternUnits="userSpaceOnUse">
                  <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke={color.paperMute} strokeWidth={0.5} />
                  <circle cx={0} cy={0} r={0.9} fill={color.paperSoft} />
                </pattern>
              </defs>
              <rect width={size} height={size} fill="url(#city)" />
            </svg>
          </div>
          <Stack gap={34} align="flex-start">
            <Enter at={zoomAt} preset="rise">
              <Stack gap={4} align="flex-start">
                <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.hero, color: color.paper, letterSpacing: '-0.04em'}}>
                  <Counter value={22500} at={zoomAt} dur={40} />
                </div>
                <Label size={type.body} tone={color.paperSoft}>intersections</Label>
              </Stack>
            </Enter>
            <Enter at={cue('intersections')} preset="rise">
              <Stack gap={4} align="flex-start">
                <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.title, color: color.paper, letterSpacing: '-0.03em'}}>
                  <Counter value={44700} at={cue('intersections')} dur={30} />
                </div>
                <Label size={type.body} tone={color.paperSoft}>roads</Label>
              </Stack>
            </Enter>
            <Enter at={cue('random travel times')} preset="pop">
              <Pill variant="white" icon="clock" size={28}>random 1–9 min per road</Pill>
            </Enter>
          </Stack>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// One benchmark row: a bar that grows over `dur` frames while its timer counts up to the real ms.
const BenchBar: React.FC<{label: string; ms: number; at: number; dur: number; tone: string; max?: number; answer?: number}> = ({label, ms, at, dur, tone, max = SIMPLE_MS, answer}) => {
  const frame = useCurrentFrame();
  const t = tw(frame, at, at + dur);
  const w = Math.max(10, (ms / max) * 900) * t;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
      <div style={{width: 230}}>
        <Label size={type.body} tone={color.paper}>{label}</Label>
      </div>
      <div style={{width: 900, height: 44, borderRadius: radius.chip, background: color.tile, position: 'relative'}}>
        <div style={{width: w, height: 44, borderRadius: radius.chip, background: tone}} />
      </div>
      <div style={{width: 230, opacity: frame >= at ? 1 : 0}}>
        <Mono size={type.body} tone={tone}>
          <Counter value={ms} at={at} dur={dur} /> ms
        </Mono>
      </div>
      {answer !== undefined ? (
        <div style={{opacity: tw(frame, answer, answer + 8)}}>
          <Pill variant="green" icon="check" size={26}>769 min</Pill>
        </div>
      ) : null}
    </div>
  );
};

const SlowRun: React.FC = () => {
  const cue = useCue();
  const at = cue('takes about 50 seconds');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="The simple version" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Terminal width={1200} cps={40} lines={[{at: 0, cmd: bench.cmd}, {at: 14, out: bench.out[0]}, {at, out: bench.out[1], tone: color.red}]} />
        </Enter>
        <Enter at={at} preset="rise">
          <BenchBar label="simple scan" ms={SIMPLE_MS} at={at} dur={60} tone={color.red} />
        </Enter>
        <Enter at={cue('problem is step one')} preset="pop">
          <Pill variant="outline" size={30}>the problem: step 1, finding the closest node</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// Finding the closest node = scanning the whole table, every round. A highlight sweeps the table
// again and again while the round counter climbs; then the multiplication.
const ScanCost: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const start = cue('to find the closest');
  const sweep = 16;
  const rows = 9;
  const t = Math.max(0, frame - start);
  const pos = (t % sweep) / sweep;
  const round = Math.min(22500, Math.floor(Math.pow(t / sweep, 3.1)) + (t > 0 ? 1 : 0));
  const mulAt = cue("that's 22,000 nodes");
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="Why it's slow" />
      <Center>
        <Row gap={120}>
          <Stack gap={18}>
            <div style={{position: 'relative', width: 380, padding: 16, borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`, display: 'flex', flexDirection: 'column', gap: 8}}>
              {Array.from({length: rows}, (_, i) => (
                <div key={i} style={{height: 50, borderRadius: radius.chip, background: color.code, display: 'flex', alignItems: 'center', padding: '0 18px'}}>
                  <Mono size={type.label} tone={color.paperSoft}>{i === rows - 2 ? '…' : `node ${i === rows - 1 ? '22,500' : (i + 1).toLocaleString('en-US')}`}</Mono>
                </div>
              ))}
              {frame >= start ? <div style={{position: 'absolute', left: 8, right: 8, top: 10 + pos * (rows * 58 - 50), height: 62, borderRadius: radius.chip, border: `3px solid ${color.blue}`, boxShadow: `0 0 30px rgba(26,132,245,0.5)`}} /> : null}
            </div>
            <Label size={type.body} tone={color.paperSoft}>
              round <span style={{fontFamily: font.mono, color: color.paper}}>{round.toLocaleString('en-US')}</span> of 22,500
            </Label>
          </Stack>
          <Stack gap={26} align="flex-start">
            <Enter at={mulAt} preset="rise">
              <Mono size={type.title} tone={color.paper}>22,500 nodes</Mono>
            </Enter>
            <Enter at={mulAt + 20} preset="rise">
              <Mono size={type.title} tone={color.paper}>× 22,500 rounds</Mono>
            </Enter>
            <Enter at={cue('half a billion')} preset="rise">
              <div style={{fontFamily: font.mono, fontSize: type.title, color: color.red}}>≈ 506,000,000 checks</div>
            </Enter>
            <Enter at={cue('o of n squared')} preset="pop">
              <div style={{padding: '14px 30px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
                <span style={{fontFamily: font.mono, fontSize: type.hero - 20, color: color.ink}}>O(n²)</span>
              </div>
            </Enter>
          </Stack>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// A binary min-heap drawn as a tree. Keyframes list which item sits in each slot; items glide between
// slots on each keyframe, new items pop in at the bottom, removed items lift out and fade.
type HeapKey = {at: number; slots: (string | null)[]};
const heapSlot = (i: number, w: number) => {
  const lvl = Math.floor(Math.log2(i + 1));
  const pos = i - (2 ** lvl - 1);
  return [((pos + 0.5) * w) / 2 ** lvl, 50 + lvl * 120] as [number, number];
};
const HeapTree: React.FC<{items: Record<string, number>; keys: HeapKey[]; w?: number; hot?: string; path?: {slots: number[]; at: number}; rootGlow?: number}> = ({items, keys, w = 600, hot, path, rootGlow}) => {
  const frame = useCurrentFrame();
  let k = 0;
  for (let i = 0; i < keys.length; i++) if (frame >= keys[i].at) k = i;
  const cur = keys[k];
  const prev = keys[Math.max(0, k - 1)];
  const t = tw(frame, cur.at, cur.at + 14);
  const levels = Math.ceil(Math.log2(Math.max(...keys.map((x) => x.slots.length)) + 1));
  const h = 50 + (levels - 1) * 120 + 50;
  const r = 38;
  const ids = Array.from(new Set(keys.flatMap((x) => x.slots))).filter((x): x is string => x !== null);
  const occupied = cur.slots.length;
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: Math.max(occupied, prev.slots.length)}, (_, i) => {
          if (i === 0) return null;
          const p = heapSlot(Math.floor((i - 1) / 2), w);
          const c = heapSlot(i, w);
          const onPath = path && frame >= path.at && path.slots.includes(i) && path.slots.includes(Math.floor((i - 1) / 2));
          return <line key={i} x1={p[0]} y1={p[1]} x2={c[0]} y2={c[1]} stroke={onPath ? color.blue : color.paperMute} strokeWidth={onPath ? 6 : 3} opacity={i < occupied ? 1 : 1 - t} />;
        })}
      </svg>
      {ids.map((id) => {
        const a = prev.slots.indexOf(id);
        const b = cur.slots.indexOf(id);
        if (a < 0 && b < 0) return null;
        let x: number, y: number, op = 1, sc = 1;
        if (a >= 0 && b >= 0) {
          const pa = heapSlot(a, w);
          const pb = heapSlot(b, w);
          x = lerp(pa[0], pb[0], t);
          y = lerp(pa[1], pb[1], t);
        } else if (b >= 0) {
          [x, y] = heapSlot(b, w);
          op = t;
          sc = lerp(0.5, 1, t);
        } else {
          [x, y] = heapSlot(a, w);
          y -= t * 90;
          op = 1 - t;
        }
        const isHot = id === hot;
        const root = b === 0 && rootGlow !== undefined && frame >= rootGlow;
        return (
          <div
            key={id}
            style={{
              position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: r, opacity: op, transform: `scale(${sc})`,
              background: isHot ? color.blue : color.card, boxShadow: root ? shadow.focus : shadow.tile,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{fontFamily: font.mono, fontSize: type.body - 2, color: isHot ? color.paper : color.ink}}>{items[id]}</span>
          </div>
        );
      })}
    </div>
  );
};

const HEAP_ITEMS: Record<string, number> = {a: 1, b: 3, c: 2, d: 7, e: 4, f: 9, g: 5, n: 0};
const HEAP_BASE = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

const HeapIdea: React.FC = () => {
  const cue = useCue();
  const logAt = cue('log n steps');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="A min-heap" />
      <Center>
        <Row gap={110}>
          <Enter at={cue('data structure')} preset="rise">
            <HeapTree items={HEAP_ITEMS} keys={[{at: 0, slots: HEAP_BASE}]} rootGlow={cue('smallest item')} path={{slots: [0, 1, 3], at: logAt}} />
          </Enter>
          <Stack gap={26} align="flex-start">
            <Enter at={cue('data structure')} preset="rise">
              <Headline size={type.title} align="left">
                Min-heap, a <Accent>priority queue</Accent>
              </Headline>
            </Enter>
            <Enter at={cue('smallest item')} preset="pop">
              <Pill variant="blue" size={30}>smallest always on top</Pill>
            </Enter>
            <Enter at={logAt} preset="pop">
              <Pill variant="white" size={30}>push / pop: one trip down a branch, about log n steps</Pill>
            </Enter>
            <Enter at={cue('instead of scanning')} preset="pop">
              <Mono size={type.body} tone={color.paperSoft}>
                22,500 items → <span style={{color: color.green}}>15 levels</span>, not 22,500 checks
              </Mono>
            </Enter>
          </Stack>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// push(0): lands at the bottom, swaps up past 7, 3 and 1. pop(): 0 leaves, the last item (7) moves to
// the top and sinks back down past 1 and 3. Code on the left follows along.
const HeapCode: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const push = cue('adds the item');
  const up = cue('swaps it upwards');
  const pop = cue('pop takes the top');
  const last = cue('moves the last item');
  const sink = cue('sinks it down');
  // slot index = position in the heap array; null = the empty top while pop() is mid-way
  const keys: HeapKey[] = [
    {at: -999, slots: HEAP_BASE},
    {at: push, slots: [...HEAP_BASE, 'n']},
    {at: up, slots: ['a', 'b', 'c', 'n', 'e', 'f', 'g', 'd']},
    {at: up + 16, slots: ['a', 'n', 'c', 'b', 'e', 'f', 'g', 'd']},
    {at: up + 32, slots: ['n', 'a', 'c', 'b', 'e', 'f', 'g', 'd']},
    {at: pop, slots: [null, 'a', 'c', 'b', 'e', 'f', 'g', 'd']},
    {at: last, slots: ['d', 'a', 'c', 'b', 'e', 'f', 'g']},
    {at: sink, slots: ['a', 'd', 'c', 'b', 'e', 'f', 'g']},
    {at: sink + 16, slots: ['a', 'b', 'c', 'd', 'e', 'f', 'g']},
  ];
  const hot = frame >= last ? 'd' : 'n';
  const popping = frame >= pop;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="heap.ts" />
      <Center>
        <Row gap={40}>
          <Enter at={0} preset="rise">
            {popping ? (
              <CodeWindow
                key="pop"
                file={`${CODE}/heap.ts`}
                lines={[22, 37]}
                size={26}
                maxWidth={1100}
                steps={[
                  {at: pop, lines: [24, 25]},
                  {at: last, lines: [26, 27]},
                  {at: sink, lines: [30, 37]},
                ]}
              />
            ) : (
              <CodeWindow
                key="push"
                file={`${CODE}/heap.ts`}
                lines={[9, 20]}
                size={26}
                maxWidth={1100}
                steps={[
                  {at: push, lines: [11, 12]},
                  {at: up, lines: [14, 18]},
                ]}
              />
            )}
          </Enter>
          <Enter at={cue('small one from scratch')} preset="rise">
            <Stack gap={10}>
              <HeapTree items={HEAP_ITEMS} keys={keys} w={540} hot={hot} />
              <Pill variant={popping ? 'white' : 'blue'} size={28}>{popping ? 'pop(): take 0, sink 7' : 'push(0): bubble up'}</Pill>
            </Stack>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// The old scan loop, then the heap version where the scan is replaced by heap.pop().
const HeapSwap: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const popAt = cue('pop it off the heap');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title={frame < popAt ? 'dijkstra.ts: the scan' : 'dijkstra-heap.ts'} />
      <Center gap={30}>
        {frame < popAt ? (
          <Enter at={0} preset="rise">
            <CodeWindow file={`${CODE}/dijkstra.ts`} lines={[13, 18]} steps={[{at: cue('instead of scanning'), lines: [14, 18]}]} />
          </Enter>
        ) : (
          <Enter at={popAt} preset="rise">
            <CodeWindow
              file={`${CODE}/dijkstra-heap.ts`}
              lines={[13, 28]}
              size={26}
              steps={[
                {at: popAt, lines: [17, 17]},
                {at: cue('better distance'), lines: [23, 26]},
                {at: cue('push the node'), lines: [26, 26]},
              ]}
            />
          </Enter>
        )}
        <Row gap={20}>
          <Enter at={cue('instead of scanning')} preset="pop">
            <Pill variant="neutral" size={28} struck={useTween(popAt, popAt + 12)}>scan every node</Pill>
          </Enter>
          <Enter at={popAt} preset="pop">
            <Pill variant="blue" size={28}>heap.pop()</Pill>
          </Enter>
          <Enter at={cue('push the node')} preset="pop">
            <Pill variant="white" size={28}>heap.push([newDist, to])</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// The same node in the heap twice: [12, E] (old) and [10, E] (new). 10 comes out first and E is visited;
// when 12 comes out later, E is already visited, so it is skipped.
const StaleEntries: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const oldAt = cue('an old entry');
  const newAt = cue('a new one');
  const firstOut = cue('better one comes out');
  const laterOut = cue('old one comes out');
  const skip = cue('just skip it');
  // an entry in the heap box; it slides right and fades when it is popped
  const entry = (d: number, label: string, tone: string, at: number, outAt: number, row: number, struck: boolean) => {
    const o = tw(frame, outAt, outAt + 18);
    return (
      <div style={{position: 'absolute', left: lerp(30, 230, o), top: 30 + row * 100, opacity: tw(frame, at, at + 8) * (1 - o)}}>
        <Row gap={18}>
          <div style={{position: 'relative', padding: '14px 26px', borderRadius: radius.chip, background: color.code, border: `2px solid ${tone}`}}>
            <Mono size={type.body}>[{d}, E]</Mono>
            {struck ? <div style={{position: 'absolute', left: 10, right: 10, top: '50%', height: 4, background: color.red, transform: `scaleX(${tw(frame, skip, skip + 10)})`, transformOrigin: 'left'}} /> : null}
          </div>
          <span style={{opacity: o < 0.5 ? 1 : 0}}>
            <Eyebrow tone={tone}>{label}</Eyebrow>
          </span>
        </Row>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="Stale entries" />
      <Center gap={50}>
        <Row gap={60} align="flex-start">
          <div style={{position: 'relative', width: 500, height: 230, borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`}}>
            <div style={{position: 'absolute', top: -40, left: 0}}>
              <Eyebrow tone={color.paperMute}>heap</Eyebrow>
            </div>
            {entry(10, 'new · better', color.green, newAt, firstOut, 0, false)}
            {entry(12, 'old · worse', color.paperMute, oldAt, laterOut, 1, true)}
          </div>
          <Icon name="arrowRight" size={50} color={color.paperMute} />
          <div style={{width: 520, height: 230, display: 'flex', flexDirection: 'column', gap: 30, paddingTop: 30}}>
            <Enter at={firstOut + 14} preset="pop">
              <Pill variant="blue" icon="check" size={30}>[10, E] → visit E</Pill>
            </Enter>
            <Enter at={cue('already visited')} preset="pop">
              <Pill variant="outline" icon="x" size={30}>[12, E] → E already visited</Pill>
            </Enter>
          </div>
        </Row>
        <Enter at={cue('more than once')} preset="rise">
          <CodeWindow file={`${CODE}/dijkstra-heap.ts`} lines={[17, 19]} steps={[{at: skip, lines: [18, 18]}]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const FastRun: React.FC = () => {
  const cue = useCue();
  const at = cue('under a tenth');
  const answer = cue('same answer');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Making it fast" title="Same grid, with the heap" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1200}
            lines={[{at: 0, cmd: bench.cmd}, ...bench.out.map((o, i) => ({at: i === 2 ? at : 6 + i * 3, out: o, tone: i === 1 ? color.red : i === 2 ? color.green : undefined}))]}
          />
        </Enter>
        <Stack gap={22} align="flex-start">
          <BenchBar label="simple scan" ms={SIMPLE_MS} at={-999} dur={1} tone={color.red} answer={answer} />
          <BenchBar label="min-heap" ms={HEAP_MS} at={at} dur={14} tone={color.green} answer={answer} />
        </Stack>
        <Enter at={cue('only thing that changed')} preset="pop">
          <Pill variant="white" size={30}>~{Math.round(SIMPLE_MS / HEAP_MS)}× faster, only the "find the closest" step changed</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 10. Recap ----------

const Recap: React.FC = () => {
  const cue = useCue();
  const items = [
    {icon: 'grid' as const, t: 'Turn the map into a weighted graph', at: cue('turn the map')},
    {icon: 'layers' as const, t: 'Table of best distances, all ∞ except the start', at: cue('you keep a table')},
    {icon: 'search' as const, t: 'Visit the closest unvisited node, relax its roads', at: cue('keep visiting')},
    {icon: 'arrowRight' as const, t: 'Track prev, follow it back for the path', at: cue('track where you came from')},
    {icon: 'bolt' as const, t: 'A min-heap finds the closest node fast', at: cue('then use a')},
  ];
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={36}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            That's <Accent>Dijkstra</Accent>
          </Headline>
        </Enter>
        <Stack gap={16}>
          {items.map((x, i) => (
            <Enter key={x.t} at={x.at} preset="rise">
              <div style={{width: 1000, display: 'flex', alignItems: 'center', gap: 26, padding: '20px 30px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, boxSizing: 'border-box'}}>
                <div style={{width: 56, height: 56, borderRadius: 28, background: i === 4 ? color.green : color.blue, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name={x.icon} size={30} color={color.paper} />
                </div>
                <div style={{fontFamily: font.sans, fontSize: type.body, color: color.ink}}>{x.t}</div>
              </div>
            </Enter>
          ))}
        </Stack>
      </Center>
    </AbsoluteFill>
  );
};

export const DijkstraVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/dijkstra.wav')} />
    <Track>
      <Scene from="whenever you ask"><CityRoute /></Scene>
      <Scene from="the idea behind that"><Title /></Scene>
      <Scene from="first we need to turn"><MapToGraph /></Scene>
      <Scene from="in code"><GraphCode /></Scene>
      <Scene from="but here's why"><Detour /></Scene>
      <Scene from="and you can't just try"><RouteExplosion /></Scene>
      <Scene from="so here's the setup"><Setup /></Scene>
      <Scene from="and then we repeat"><Rule /></Scene>
      <Scene from="so let's try running it"><Walkthrough /></Scene>
      <Scene from="so why can we trust"><TrustProof /></Scene>
      <Scene from="and there's also one catch"><NegativeTrap /></Scene>
      <Scene from="right now we know"><Prev /></Scene>
      <Scene from="now to get the route"><Backtrack /></Scene>
      <Scene from="now let's write it"><CodeSetup /></Scene>
      <Scene from="now the main loop"><CodeLoop /></Scene>
      <Scene from="now step three"><CodeRelax /></Scene>
      <Scene from="and this little function"><CodePath /></Scene>
      <Scene from="and if i run it"><RunLog /></Scene>
      <Scene from="now that works"><BigGrid /></Scene>
      <Scene from="the simplest version"><SlowRun /></Scene>
      <Scene from="to find the closest node we scan"><ScanCost /></Scene>
      <Scene from="now the way we fix this"><HeapIdea /></Scene>
      <Scene from="here's a small one"><HeapCode /></Scene>
      <Scene from="and the algorithm barely changes"><HeapSwap /></Scene>
      <Scene from="but there's one small thing"><StaleEntries /></Scene>
      <Scene from="and now the same grid"><FastRun /></Scene>
      <Scene from="so yeah"><Recap /></Scene>
    </Track>
  </TranscriptProvider>
);
