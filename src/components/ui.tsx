import React from 'react';
import {interpolate} from 'remotion';
import {color, font, radius, shadow, type, weight} from '../design/tokens';
import {useProgress, useTween} from '../motion/motion';
import {Icon, IconName} from './Icon';

// ---------- Surfaces ----------

type CardProps = {
  tone?: 'light' | 'dark' | 'glass';
  focus?: number; // 0..1 — blue ring + glow (the "selected" state from the primary style)
  dim?: number; // 0..1 — fade + blur for out-of-focus cards (depth of field)
  width?: number | string;
  height?: number | string;
  pad?: number;
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({
  tone = 'light',
  focus = 0,
  dim = 0,
  width,
  height,
  pad = 40,
  radius: r = radius.card,
  style,
  children,
}) => {
  const bg =
    tone === 'light'
      ? `linear-gradient(180deg, ${color.cardTop} 0%, ${color.card} 100%)`
      : tone === 'dark'
        ? `linear-gradient(180deg, ${color.tileHi} 0%, ${color.tile} 100%)`
        : 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)';
  const ring =
    focus > 0
      ? `0 0 0 ${4 * focus}px ${color.blue}, 0 0 ${70 * focus}px rgba(26,132,245,${0.55 * focus}), `
      : '';
  return (
    <div
      style={{
        width,
        height,
        padding: pad,
        borderRadius: r,
        background: bg,
        color: tone === 'light' ? color.ink : color.paper,
        boxShadow: ring + (tone === 'light' ? shadow.card : shadow.tile),
        border: tone === 'light' ? 'none' : `1px solid ${color.tileLine}`,
        backdropFilter: tone === 'glass' ? 'blur(20px)' : undefined,
        opacity: 1 - dim * 0.55,
        filter: dim > 0.02 ? `blur(${dim * 6}px)` : undefined,
        transform: `scale(${1 + focus * 0.03 - dim * 0.03})`,
        position: 'relative',
        boxSizing: 'border-box',
        fontFamily: font.sans,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Dashed empty slot (the "not yet" placeholder in timelines).
export const Slot: React.FC<{width: number; height: number; icon?: IconName; active?: boolean}> = ({
  width,
  height,
  icon = 'clock',
  active,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: radius.tile,
      border: `2px dashed ${active ? color.blue : 'rgba(255,255,255,0.18)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}
  >
    <Icon name={icon} size={36} color={active ? color.blue : 'rgba(255,255,255,0.25)'} />
  </div>
);

// ---------- Text ----------

// Tracked uppercase label above a title: "CHAPTER 2", "REVISIONS", "PHASE 1".
export const Eyebrow: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({
  children,
  tone = color.blue,
  size = type.eyebrow,
}) => (
  <div
    style={{
      fontFamily: font.sans,
      fontSize: size,
      fontWeight: weight.medium,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: tone,
    }}
  >
    {children}
  </div>
);

// The one italic-serif accent phrase inside a headline. Max one per headline.
export const Accent: React.FC<{children: React.ReactNode; tone?: string}> = ({children, tone = color.sky}) => (
  <span
    style={{
      fontFamily: font.serif,
      fontStyle: 'italic',
      fontWeight: 400,
      color: tone,
      fontSize: '1.12em',
      letterSpacing: '0',
      padding: '0 0.04em',
    }}
  >
    {children}
  </span>
);

export const Headline: React.FC<{
  children: React.ReactNode;
  size?: number;
  tone?: 'dark' | 'light'; // dark = on charcoal (white text)
  align?: 'left' | 'center' | 'right';
  sub?: React.ReactNode;
  maxWidth?: number;
}> = ({children, size = type.title, tone = 'dark', align = 'center', sub, maxWidth = 1400}) => (
  <div style={{textAlign: align, maxWidth: `min(${maxWidth}px, 100%)`, fontFamily: font.sans, textWrap: 'balance'} as React.CSSProperties}>
    <div
      style={{
        fontSize: size,
        fontWeight: weight.semibold,
        letterSpacing: '-0.025em',
        lineHeight: 1.1,
        color: tone === 'dark' ? color.paper : color.ink,
      }}
    >
      {children}
    </div>
    {sub ? (
      <div
        style={{
          marginTop: size * 0.22,
          fontSize: size * 0.5,
          fontWeight: weight.regular,
          color: tone === 'dark' ? color.paperSoft : color.inkMute,
          letterSpacing: '-0.01em',
        }}
      >
        {sub}
      </div>
    ) : null}
  </div>
);

// Plain label text in the system type scale.
export const Label: React.FC<{
  children: React.ReactNode;
  size?: number;
  tone?: string;
  weight?: number;
  mono?: boolean;
  style?: React.CSSProperties;
}> = ({children, size = type.body, tone = color.paper, weight: w = weight.medium, mono, style}) => (
  <div
    style={{
      fontFamily: mono ? font.mono : font.sans,
      fontSize: size,
      fontWeight: w,
      color: tone,
      letterSpacing: mono ? 0 : '-0.015em',
      lineHeight: 1.2,
      ...style,
    }}
  >
    {children}
  </div>
);

// ---------- Chips ----------

// Rounded value pill. "neutral" = gray pill with white text (receipt values). "white" = tag pill on dark.
export const Pill: React.FC<{
  children: React.ReactNode;
  variant?: 'neutral' | 'white' | 'blue' | 'green' | 'ghost' | 'outline';
  icon?: IconName;
  iconBg?: string; // colored rounded-square behind the icon (task pills in the hub diagram)
  size?: number;
  struck?: number; // 0..1 strikethrough draw progress
  style?: React.CSSProperties;
}> = ({children, variant = 'neutral', icon, iconBg, size = type.label, struck = 0, style}) => {
  const v = {
    neutral: {bg: color.pill, fg: '#fff', bd: 'none'},
    white: {bg: '#fff', fg: color.ink, bd: 'none'},
    blue: {bg: color.blue, fg: '#fff', bd: 'none'},
    green: {bg: color.mint, fg: color.green, bd: 'none'},
    ghost: {bg: color.cardLine, fg: color.inkFaint, bd: 'none'},
    outline: {bg: 'transparent', fg: color.paper, bd: `2px solid rgba(255,255,255,0.7)`},
  }[variant];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.45,
        padding: iconBg ? `${size * 0.32}px ${size * 0.9}px ${size * 0.32}px ${size * 0.32}px` : `${size * 0.36}px ${size * 0.9}px`,
        borderRadius: radius.pill,
        background: v.bg,
        color: v.fg,
        border: v.bd,
        fontFamily: font.sans,
        fontSize: size,
        fontWeight: weight.semibold,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        boxShadow: variant === 'white' ? '0 10px 30px rgba(0,0,0,0.35)' : undefined,
        position: 'relative',
        ...style,
      }}
    >
      {icon ? (
        iconBg ? (
          <div
            style={{
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size * 0.35,
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={size * 0.9} color="#fff" />
          </div>
        ) : (
          <Icon name={icon} size={size} color={variant === 'white' ? color.blue : v.fg} />
        )
      ) : null}
      <span style={{position: 'relative'}}>
        {children}
        {struck > 0 ? (
          <span
            style={{
              position: 'absolute',
              left: '-6%',
              top: '52%',
              height: 2,
              width: `${112 * struck}%`,
              background: 'currentColor',
            }}
          />
        ) : null}
      </span>
    </div>
  );
};

// Round badge: blue check (done) or numbered step.
export const Badge: React.FC<{at?: number; kind?: 'check' | 'number'; n?: number; size?: number}> = ({
  at = 0,
  kind = 'check',
  n,
  size = 48,
}) => {
  const p = useProgress(at, 'pop');
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: color.blue,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: font.sans,
        fontWeight: weight.semibold,
        fontSize: size * 0.5,
        boxShadow: '0 0 0 3px rgba(255,255,255,0.9), 0 6px 18px rgba(26,132,245,0.5)',
        transform: `scale(${p})`,
        opacity: Math.min(1, p * 2),
        flexShrink: 0,
      }}
    >
      {kind === 'check' ? <Icon name="check" size={size * 0.55} color="#fff" stroke={3} /> : n}
    </div>
  );
};

// ---------- Numbers ----------

// Counts up to `value` between frames [at, at+dur]. Use for stats, totals, timings.
export const Counter: React.FC<{
  value: number;
  at?: number;
  dur?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}> = ({value, at = 0, dur = 24, decimals = 0, prefix = '', suffix = ''}) => {
  const t = useTween(at, at + dur);
  const v = interpolate(t, [0, 1], [0, value]);
  return (
    <span style={{fontVariantNumeric: 'tabular-nums'}}>
      {prefix}
      {v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}
      {suffix}
    </span>
  );
};
