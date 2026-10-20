import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {color, font, radius, safe, shadow, type, weight} from '../design/tokens';
import {Enter, useProgress, useTween} from '../motion/motion';
import {Accent, Counter} from './ui';
import {Icon, IconName} from './Icon';
import {useWords} from '../timing/transcript';

// Overlays from the second round of primary references (27–30): focus shading, spoken captions,
// stat lines, a call-to-action glow, and the tilted perspective board.

// ---------- FocusShade: the area behind the focal element sits slightly darker than the stage ----------
// Use it under any centered hero (titles, intro statements, a single card) when there is no face video.
export const FocusShade: React.FC<{at?: number; x?: string; y?: string; w?: string; h?: string; strength?: number}> = ({
  at = 0,
  x = '50%',
  y = '50%',
  w = '62%',
  h = '58%',
  strength = 0.5,
}) => {
  const t = useTween(at, at + 18);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse ${w} ${h} at ${x} ${y}, rgba(8,8,10,${strength}) 0%, rgba(8,8,10,${strength * 0.55}) 45%, transparent 100%)`,
        opacity: t,
        pointerEvents: 'none',
      }}
    />
  );
};

// ---------- Caption: what is being said, revealed word by word as it is spoken ----------
// <Caption from="i wasn't ready" to="music" accent="sound design" />
// Reads the words from the transcript, so captions always match the audio exactly.
// Max ~10 words per caption; split longer sentences into several <Caption>s.
export const Caption: React.FC<{
  from: string;
  to: string;
  fromN?: number;
  accent?: string; // contiguous words to set in the italic serif accent
  position?: 'lower' | 'center';
  shade?: boolean; // darken the bottom of the frame behind the caption (default on for lower)
  size?: number;
}> = ({from, to, fromN, accent, position = 'lower', shade, size}) => {
  const frame = useCurrentFrame();
  const {height, width} = useVideoConfig();
  const vertical = height > width;
  const words = useWords(from, to, fromN);
  const acc = accent ? accent.toLowerCase().split(/\s+/) : [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']+/g, '');
  // find the accent span inside the caption
  let accStart = -1;
  if (acc.length) {
    for (let i = 0; i + acc.length <= words.length; i++) {
      if (acc.every((a, j) => norm(words[i + j].text) === norm(a))) {
        accStart = i;
        break;
      }
    }
  }
  const fs = size ?? (vertical ? type.heading : type.body + 4);
  const bottom = vertical ? safe.vertical.bottom + 40 : 150;
  const showShade = shade ?? position === 'lower';
  const shadeT = useTween(words[0]?.at ?? 0, (words[0]?.at ?? 0) + 12);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {showShade ? (
        <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(8,8,10,0.62) 0%, rgba(8,8,10,0.25) 28%, transparent 48%)', opacity: shadeT}} />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: vertical ? safe.vertical.x : safe.landscape.x * 2,
          right: vertical ? safe.vertical.x : safe.landscape.x * 2,
          ...(position === 'lower' ? {bottom} : {top: '50%', transform: 'translateY(-50%)'}),
          textAlign: 'center',
          fontFamily: font.sans,
          fontSize: fs,
          fontWeight: weight.regular,
          color: color.paper,
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
          textWrap: 'balance',
          textShadow: '0 2px 18px rgba(0,0,0,0.5)',
        } as React.CSSProperties}
      >
        {words.map((w, i) => {
          const o = interpolate(frame, [w.at, w.at + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = (1 - o) * 10;
          const inAcc = accStart >= 0 && i >= accStart && i < accStart + acc.length;
          const text = w.text.replace(/[.,;:!?]+$/, '');
          const style: React.CSSProperties = {display: 'inline-block', opacity: o, transform: `translateY(${y}px)`, filter: o < 1 ? `blur(${(1 - o) * 4}px)` : undefined};
          // accent words render as one serif run; spaces between words stay normal spaces
          return (
            <React.Fragment key={i}>
              <span style={style}>{inAcc ? <Accent>{text}</Accent> : text}</span>
              {i < words.length - 1 ? ' ' : null}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- StatCaption: small kicker over a big number + unit (ref 30) ----------
export const StatCaption: React.FC<{
  kicker: string;
  value: number;
  unit?: string;
  at: number;
  prefix?: string;
  decimals?: number;
  position?: 'lower' | 'center';
}> = ({kicker, value, unit, at, prefix, decimals, position = 'lower'}) => {
  const {height, width} = useVideoConfig();
  const vertical = height > width;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center', justifyContent: position === 'lower' ? 'flex-end' : 'center'}}>
      {position === 'lower' ? <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(8,8,10,0.55) 0%, transparent 45%)', opacity: useTween(at, at + 12)}} /> : null}
      <div style={{marginBottom: position === 'lower' ? (vertical ? safe.vertical.bottom + 40 : 130) : 0, textAlign: 'center', fontFamily: font.sans, position: 'relative'}}>
        <Enter at={at} preset="fade">
          <div style={{fontSize: type.label, color: color.paperSoft, letterSpacing: '-0.005em', marginBottom: 6}}>{kicker}</div>
        </Enter>
        <Enter at={at + 4} preset="rise">
          <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 14, color: color.paper}}>
            <span style={{fontSize: type.title + 8, fontWeight: weight.medium, letterSpacing: '-0.04em'}}>
              <Counter value={value} at={at + 4} dur={22} prefix={prefix} decimals={decimals} />
            </span>
            {unit ? <span style={{fontSize: type.body + 2, fontWeight: weight.regular}}>{unit}</span> : null}
          </div>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

// ---------- CTA: blue glow rising from the bottom edge + one line + a bobbing arrow (ref 27) ----------
export const CTA: React.FC<{text: string; at: number; icon?: IconName; tone?: string}> = ({text, at, icon = 'arrowRight', tone = color.blue}) => {
  const frame = useCurrentFrame();
  const {height, width} = useVideoConfig();
  const vertical = height > width;
  const p = useProgress(at, 'smooth');
  const bob = Math.sin((frame - at) / 7) * 6;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center', justifyContent: 'flex-end'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 38% at 50% 108%, ${tone}cc 0%, ${tone}55 40%, transparent 75%)`,
          opacity: p,
        }}
      />
      <div style={{marginBottom: vertical ? safe.vertical.bottom : 70, textAlign: 'center', fontFamily: font.sans, opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
        <div style={{fontSize: type.body + 2, color: color.paper, letterSpacing: '-0.01em'}}>{text}</div>
        <div style={{marginTop: 18, display: 'flex', justifyContent: 'center', transform: `translateY(${bob}px) rotate(${icon === 'arrowRight' ? 90 : 0}deg)`}}>
          <Icon name={icon} size={34} color={color.paper} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- PerspectiveBoard: a large tilted canvas the camera glides over (ref 29) ----------
// Put a grid of BoardCards (or anything) inside. scroll moves the board up through the frame.
export const PerspectiveBoard: React.FC<{
  at?: number;
  tilt?: number; // degrees of rotateX
  scroll?: {from: number; to: number; dur: number}; // px of vertical travel over dur frames, starting at `at`
  label?: {text: string; icon?: IconName};
  width?: number;
  children: React.ReactNode;
}> = ({at = 0, tilt = 24, scroll = {from: 200, to: -500, dur: 150}, label, width = 1500, children}) => {
  const frame = useCurrentFrame();
  const enter = useProgress(at, 'smooth');
  const y = interpolate(frame, [at, at + scroll.dur], [scroll.from, scroll.to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          perspective: 2400,
          perspectiveOrigin: '50% 30%',
          maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width,
            marginLeft: -width / 2,
            transform: `translateY(${y}px) rotateX(${tilt * (0.6 + 0.4 * enter)}deg) scale(${0.8 + 0.06 * enter})`,
            transformOrigin: '50% 0%',
            opacity: enter,
            padding: 48,
            borderRadius: radius.card,
            background: 'rgba(20,20,22,0.85)',
            boxShadow: '0 60px 120px rgba(0,0,0,0.6)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </AbsoluteFill>
      {label ? (
        <div style={{position: 'absolute', top: 80, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <Enter at={at + 8} preset="drop">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 30px',
                borderRadius: radius.pill,
                background: '#fff',
                boxShadow: shadow.tile,
                fontFamily: font.sans,
                fontSize: type.body - 2,
                color: color.ink,
                fontWeight: weight.medium,
                letterSpacing: '-0.015em',
              }}
            >
              <Icon name={label.icon ?? 'globe'} size={30} color={color.blue} />
              {label.text}
            </div>
          </Enter>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// One entry on a board: thumbnail, title, meta line, palette swatches, optional quote.
export const BoardCard: React.FC<{
  title: string;
  meta?: string;
  thumb: React.ReactNode;
  swatches?: string[];
  quote?: string;
  width?: number;
}> = ({title, meta, thumb, swatches = [], quote, width = 320}) => (
  <div style={{width, fontFamily: font.sans}}>
    <div style={{height: width * 0.56, borderRadius: 10, overflow: 'hidden', position: 'relative', background: color.tile}}>{thumb}</div>
    {meta ? <div style={{marginTop: 12, fontSize: 15, color: color.paperMute, fontFamily: font.mono}}>{meta}</div> : null}
    <div style={{marginTop: 6, fontSize: 19, color: color.paper, fontWeight: weight.medium}}>{title}</div>
    {swatches.length ? (
      <div style={{display: 'flex', gap: 5, marginTop: 10}}>
        {swatches.map((c, i) => (
          <div key={i} style={{width: 22, height: 10, borderRadius: 2, background: c}} />
        ))}
      </div>
    ) : null}
    {quote ? <div style={{marginTop: 10, fontSize: 15, color: color.paperMute, fontStyle: 'italic', lineHeight: 1.35}}>“{quote}”</div> : null}
  </div>
);
