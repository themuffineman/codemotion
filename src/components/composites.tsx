import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {color, font, radius, shadow, type, weight} from '../design/tokens';
import {Enter, easeInOut, stagger, useProgress, useTween} from '../motion/motion';
import {Badge, Card, Eyebrow, Pill, Slot} from './ui';

// Larger building blocks lifted from the primary references.

// ---------- ListCard: the "receipt" — a titled list of rows with values and a highlighted total ----------
export type ListRow = {label: string; value?: string; at?: number; struck?: number; tag?: string};
export const ListCard: React.FC<{
  title: string;
  kicker?: string; // small caps text top-right ("RECEIPT", "BENCHMARK")
  rows: ListRow[];
  total?: {label: string; value: React.ReactNode; at: number};
  width?: number;
}> = ({title, kicker, rows, total, width = 1000}) => {
  const frame = useCurrentFrame();
  const totalP = useProgress(total?.at ?? 99999, 'settle');
  return (
    <Card width={width} pad={0} style={{overflow: 'hidden'}}>
      <div style={{padding: '44px 54px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
        <div style={{fontSize: type.heading, fontWeight: weight.semibold, letterSpacing: '-0.025em', color: color.inkSoft}}>{title}</div>
        {kicker ? <Eyebrow tone={color.inkMute}>{kicker}</Eyebrow> : null}
      </div>
      <div style={{padding: '0 54px'}}>
        {rows.map((r, i) => {
          const o = interpolate(frame, [r.at ?? 0, (r.at ?? 0) + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const struck = r.struck ?? 0;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 72,
                borderTop: `1px solid ${color.cardLine}`,
                opacity: o,
                transform: `translateY(${(1 - o) * 14}px)`,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                <div
                  style={{fontSize: type.body - 2, color: struck > 0 ? color.inkFaint : color.inkSoft, fontWeight: weight.medium, letterSpacing: '-0.015em'}}
                >
                  {r.label}
                </div>
                {r.tag ? (
                  <div style={{fontSize: type.eyebrow - 4, color: color.inkMute, background: color.cardLine, padding: '4px 12px', borderRadius: 8}}>
                    {r.tag}
                  </div>
                ) : null}
              </div>
              {r.value ? (
                <Pill variant={struck > 0 ? 'ghost' : 'neutral'} struck={struck} style={{minWidth: 230, justifyContent: 'center'}}>
                  {r.value}
                </Pill>
              ) : null}
            </div>
          );
        })}
      </div>
      {total ? (
        <div style={{padding: '0 34px 34px'}}>
          <div style={{height: 3, background: color.ink, margin: '4px 20px 0', transform: `scaleX(${totalP})`, transformOrigin: 'left'}} />
          <div
            style={{
              marginTop: 4,
              background: color.mint,
              borderRadius: 20,
              padding: '30px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: totalP,
              transform: `scale(${0.96 + totalP * 0.04})`,
            }}
          >
            <div style={{fontSize: type.heading, fontWeight: weight.bold, color: color.ink, letterSpacing: '-0.025em'}}>{total.label}</div>
            <div style={{fontSize: type.title, fontWeight: weight.bold, color: color.green, letterSpacing: '-0.035em'}}>{total.value}</div>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

// ---------- StepTimeline: numbered step cards on a progress rail with value tiles below ----------
// The camera usually pans along it (wrap in <Camera>). Steps complete when their `done` frame passes.
export type Step = {n: number; title: string; at: number; done?: number; value?: React.ReactNode; valueAt?: number; thumb?: React.ReactNode};
// focus: index of the active step; fractional values glide between steps (use useStepper).
export const StepTimeline: React.FC<{steps: Step[]; focus?: number; cardW?: number; gap?: number}> = ({steps, focus = -1, cardW = 360, gap = 26}) => {
  const frame = useCurrentFrame();
  const cardH = cardW * 0.66;
  const lastDone = steps.reduce((m, s, i) => (s.done !== undefined && frame >= s.done ? i : m), -1);
  const railP = useTween(steps[Math.max(0, lastDone)]?.done ?? 99999, (steps[Math.max(0, lastDone)]?.done ?? 99999) + 14);
  const railTo = lastDone < 0 ? 0 : lastDone + 0.5 * railP;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 40}}>
      <div style={{display: 'flex', gap}}>
        {steps.map((s, i) => (
          <Enter key={i} at={s.at} preset="slideLeft">
            <Card
              width={cardW}
              height={cardH}
              pad={30}
              radius={radius.tile}
              focus={focus < 0 ? 0 : Math.max(0, 1 - Math.abs(i - focus))}
              dim={focus < 0 ? 0 : Math.min(1, Math.abs(i - focus)) * 0.4}
              style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden'}}
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: weight.semibold,
                    color: focus >= 0 && Math.abs(i - focus) < 0.5 ? color.blue : '#c9c9ce',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {String(s.n).padStart(2, '0')}
                </div>
                {s.done !== undefined && frame >= s.done ? <Badge at={s.done} /> : null}
              </div>
              {s.thumb ? <div style={{position: 'absolute', inset: '90px 30px 80px 30px', opacity: 0.85}}>{s.thumb}</div> : null}
              <div style={{fontSize: type.body, fontWeight: weight.medium, color: color.ink, letterSpacing: '-0.02em', position: 'relative'}}>{s.title}</div>
            </Card>
          </Enter>
        ))}
      </div>
      {/* rail */}
      <Enter at={steps[0]?.at ?? 0} preset="fade">
        <div style={{position: 'relative', height: 16}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 7, height: 3, background: 'rgba(255,255,255,0.12)'}} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 6,
              height: 5,
              width: (cardW + gap) * railTo + cardW / 2,
              background: color.blue,
              boxShadow: `0 0 16px ${color.blue}`,
              opacity: lastDone < 0 ? 0 : 1,
            }}
          />
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: (cardW + gap) * i + cardW / 2 - 8,
                top: 0,
                width: 16,
                height: 16,
                borderRadius: 16,
                background: i <= lastDone ? color.blue : '#56565b',
                boxShadow: i <= lastDone ? `0 0 0 4px rgba(26,132,245,0.3)` : 'none',
              }}
            />
          ))}
        </div>
      </Enter>
      <Enter at={(steps[0]?.at ?? 0) + 6} preset="fade">
        <div style={{display: 'flex', gap}}>
          {steps.map((s, i) =>
            s.value !== undefined && s.valueAt !== undefined && frame >= s.valueAt ? (
              <Enter key={i} at={s.valueAt} preset="rise">
                <Card
                  tone="dark"
                  width={cardW}
                  height={150}
                  pad={0}
                  radius={radius.tile}
                  focus={focus < 0 ? 0 : Math.max(0, 1 - Math.abs(i - focus)) * 0.6}
                  style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                >
                  <div style={{fontSize: 64, fontWeight: weight.semibold, color: color.paper, letterSpacing: '-0.035em'}}>{s.value}</div>
                </Card>
              </Enter>
            ) : (
              <Slot key={i} width={cardW} height={150} active={focus >= 0 && Math.abs(i - focus) < 0.5} />
            ),
          )}
        </div>
      </Enter>
    </div>
  );
};

// ---------- ChapterCard: "CHAPTER 2 / Creating the edit" with a preview area ----------
export const ChapterCard: React.FC<{n: number; title: string; preview?: React.ReactNode; width?: number; focus?: number; dim?: number}> = ({
  n,
  title,
  preview,
  width = 1000,
  focus = 0,
  dim = 0,
}) => (
  <Card width={width} pad={0} focus={focus} dim={dim} style={{overflow: 'hidden'}}>
    <div style={{height: width * 0.36, background: color.tile, position: 'relative', overflow: 'hidden'}}>{preview}</div>
    <div style={{padding: '40px 52px 46px'}}>
      <Eyebrow>Chapter {n}</Eyebrow>
      <div style={{fontSize: type.title - 6, fontWeight: weight.semibold, color: color.ink, letterSpacing: '-0.03em', marginTop: 14}}>{title}</div>
    </div>
  </Card>
);

// Horizontal carousel of chapters. activeAt[i] = frame when chapter i becomes the centered one.
// The strip glides between chapters; the centered card is sharp, neighbours blurred.
export const ChapterCarousel: React.FC<{chapters: {title: string; preview?: React.ReactNode}[]; activeAt: number[]; heading?: string}> = ({
  chapters,
  activeAt,
  heading = 'In this video',
}) => {
  const frame = useCurrentFrame();
  const p = useProgress(activeAt[0] ?? 0, 'smooth');
  let pos = 0;
  for (let i = 1; i < activeAt.length; i++) {
    pos += interpolate(frame, [activeAt[i], activeAt[i] + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut});
  }
  const w = 1000;
  const gap = 80;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          position: 'absolute',
          top: 70,
          width: '100%',
          textAlign: 'center',
          fontFamily: font.sans,
          fontSize: type.title - 4,
          fontWeight: weight.medium,
          color: color.paperSoft,
          letterSpacing: '-0.02em',
          opacity: p,
        }}
      >
        {heading}
      </div>
      <div style={{position: 'relative', width: w, height: w * 0.36 + 200, marginTop: 60}}>
        {chapters.map((c, i) => {
          const off = i - pos;
          return (
            <div key={i} style={{position: 'absolute', left: off * (w + gap) + (1 - p) * 300, top: 0, opacity: p}}>
              <ChapterCard n={i + 1} title={c.title} preview={c.preview} width={w} dim={Math.min(1, Math.abs(off))} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Window: a macOS-style app frame around screenshots, screen recordings, UIs ----------
export const Window: React.FC<{title?: string; width: number; height: number; light?: boolean; focus?: number; children?: React.ReactNode}> = ({
  title,
  width,
  height,
  light,
  focus = 0,
  children,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius.window,
      overflow: 'hidden',
      background: light ? color.card : '#1e1e21',
      boxShadow: (focus ? `0 0 0 ${4 * focus}px ${color.blue}, 0 0 ${60 * focus}px rgba(26,132,245,0.5), ` : '') + shadow.card,
      border: `1px solid ${light ? 'rgba(0,0,0,0.06)' : color.tileLine}`,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        background: light ? '#f0f0f2' : '#2a2a2d',
        borderBottom: `1px solid ${light ? '#e2e2e6' : color.tileLine}`,
      }}
    >
      <div style={{display: 'flex', gap: 10, paddingLeft: 20}}>
        {[color.red, color.amber, '#28c840'].map((c) => (
          <div key={c} style={{width: 15, height: 15, borderRadius: 99, background: c}} />
        ))}
      </div>
      {title ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: font.sans,
            fontWeight: weight.semibold,
            fontSize: 22,
            color: light ? color.inkSoft : color.paperSoft,
          }}
        >
          {title}
        </div>
      ) : null}
    </div>
    <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>{children}</div>
  </div>
);

// ---------- Terminal: commands typed out, output appears after each ----------
export const Terminal: React.FC<{
  title?: string;
  width?: number;
  lines: {at: number; cmd?: string; out?: string; tone?: string}[];
  cps?: number;
}> = ({title = 'Terminal', width = 1200, lines, cps = 28}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{width, borderRadius: radius.window, overflow: 'hidden', background: color.code, boxShadow: shadow.card, border: `1px solid ${color.tileLine}`}}
    >
      <div style={{height: 56, display: 'flex', alignItems: 'center', position: 'relative', background: 'linear-gradient(180deg, #3a393d, #323135)'}}>
        <div style={{display: 'flex', gap: 10, paddingLeft: 22}}>
          {[color.red, color.amber, '#28c840'].map((c) => (
            <div key={c} style={{width: 14, height: 14, borderRadius: 99, background: c}} />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: font.sans,
            fontWeight: weight.medium,
            fontSize: 24,
            color: color.paperSoft,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          padding: '28px 34px',
          minHeight: lines.length * type.code * 1.6,
          fontFamily: font.mono,
          fontSize: type.code,
          lineHeight: 1.6,
          color: color.paper,
          whiteSpace: 'pre-wrap',
        }}
      >
        {lines.map((l, i) => {
          if (frame < l.at) return null;
          if (l.cmd !== undefined) {
            const shown = l.cmd.slice(0, Math.floor(((frame - l.at) / 30) * cps));
            const typing = shown.length < l.cmd.length;
            return (
              <div key={i}>
                <span style={{color: color.green}}>❯ </span>
                {shown}
                {typing || (i === lines.length - 1 && Math.floor(frame / 15) % 2 === 0) ? (
                  <span style={{background: color.paper, display: 'inline-block', width: '0.55em', height: '1.1em', verticalAlign: 'text-bottom'}} />
                ) : null}
              </div>
            );
          }
          return (
            <div key={i} style={{color: l.tone ?? color.paperSoft, opacity: Math.min(1, (frame - l.at) / 6)}}>
              {l.out}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Staggered row of pills (tags, tools, features).
export const PillRow: React.FC<{items: string[]; at?: number; variant?: React.ComponentProps<typeof Pill>['variant']}> = ({
  items,
  at = 0,
  variant = 'white',
}) => (
  <div style={{display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center'}}>
    {items.map((t, i) => (
      <Enter key={t} at={stagger(at, i)} preset="pop">
        <Pill variant={variant}>{t}</Pill>
      </Enter>
    ))}
  </div>
);
