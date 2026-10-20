import React from 'react';
import {color, font, radius, shadow, type, weight} from '../design/tokens';
import {Icon, IconName} from '../components/Icon';

// Node visuals for diagrams. Pick by role:
//   NodeChip  — white pill with colored icon tile. Actions, tasks, endpoints. ("Edit a video")
//   NodeTile  — light card, big icon over label. Things / artifacts. ("Class files", "JARs")
//   NodeBox   — dark tile with accent outline. Systems, processes, the thing being explained. ("JVM")
//   DocIcon   — paper document with a colored type tag. Files as inputs. ("PDF", "DOC", ".java")
//   AppIcon   — glowing white app-icon square with title + subtitle under it. Tools / products.

export const NodeChip: React.FC<{label: string; icon?: IconName; tone?: string; size?: number}> = ({
  label,
  icon = 'bolt',
  tone = color.blue,
  size = type.body,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.5,
      padding: `${size * 0.3}px ${size * 0.85}px ${size * 0.3}px ${size * 0.3}px`,
      background: '#fff',
      borderRadius: radius.pill,
      boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
      fontFamily: font.sans,
      fontSize: size,
      fontWeight: weight.medium,
      color: color.ink,
      letterSpacing: '-0.015em',
      whiteSpace: 'nowrap',
    }}
  >
    <div
      style={{
        width: size * 1.45,
        height: size * 1.45,
        borderRadius: size * 0.38,
        background: tone,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size * 0.85} color="#fff" />
    </div>
    {label}
  </div>
);

export const NodeTile: React.FC<{label: string; icon: IconName; tone?: string; width?: number; sub?: string}> = ({
  label,
  icon,
  tone = color.blue,
  width = 240,
  sub,
}) => (
  <div
    style={{
      width,
      padding: '30px 20px 26px',
      borderRadius: radius.tile,
      background: `linear-gradient(180deg, ${color.cardTop}, ${color.card})`,
      boxShadow: shadow.card,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      fontFamily: font.sans,
      boxSizing: 'border-box',
    }}
  >
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: 20,
        background: `${tone}1a`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={44} color={tone} />
    </div>
    <div style={{fontSize: type.body - 4, fontWeight: weight.semibold, color: color.ink, letterSpacing: '-0.015em', textAlign: 'center'}}>
      {label}
    </div>
    {sub ? <div style={{fontSize: type.label - 4, color: color.inkMute, marginTop: -8, textAlign: 'center'}}>{sub}</div> : null}
  </div>
);

export const NodeBox: React.FC<{
  label: string;
  icon?: IconName;
  tone?: string;
  width?: number;
  height?: number;
  sub?: string;
  active?: number; // 0..1 glow
  mono?: boolean;
}> = ({label, icon, tone = color.blue, width = 320, height, sub, active = 0, mono}) => (
  <div
    style={{
      width,
      height,
      padding: '24px 28px',
      borderRadius: radius.tile,
      background: `linear-gradient(180deg, ${color.tileHi}, ${color.tile})`,
      border: `2px solid ${tone}`,
      boxShadow: `${shadow.tile}${active > 0 ? `, 0 0 ${80 * active}px ${tone}88` : ''}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: mono ? font.mono : font.sans,
      boxSizing: 'border-box',
    }}
  >
    {icon ? <Icon name={icon} size={52} color={tone} /> : null}
    <div style={{fontSize: type.body, fontWeight: weight.semibold, color: color.paper, letterSpacing: mono ? 0 : '-0.015em', textAlign: 'center'}}>
      {label}
    </div>
    {sub ? <div style={{fontSize: type.label - 2, color: color.paperSoft, textAlign: 'center', fontFamily: font.sans}}>{sub}</div> : null}
  </div>
);

export const DocIcon: React.FC<{tag?: string; tagTone?: string; label?: string; width?: number}> = ({
  tag,
  tagTone = color.red,
  label,
  width = 120,
}) => {
  const h = width * 1.24;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
      <div
        style={{
          width,
          height: h,
          background: `linear-gradient(180deg, #fff, ${color.card})`,
          borderRadius: 10,
          clipPath: `polygon(0 0, 72% 0, 100% 22%, 100% 100%, 0 100%)`,
          boxShadow: shadow.tile,
          position: 'relative',
          padding: width * 0.14,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: width * 0.07,
          paddingTop: width * 0.3,
        }}
      >
        {[0.7, 0.85, 0.6, 0.8].map((w, i) => (
          <div key={i} style={{height: width * 0.035, width: `${w * 100}%`, background: '#d9d9de', borderRadius: 4}} />
        ))}
        {tag ? (
          <div
            style={{
              position: 'absolute',
              left: width * 0.1,
              bottom: width * 0.1,
              padding: `${width * 0.03}px ${width * 0.07}px`,
              background: tagTone,
              color: '#fff',
              borderRadius: 6,
              fontFamily: font.sans,
              fontWeight: weight.bold,
              fontSize: width * 0.15,
            }}
          >
            {tag}
          </div>
        ) : null}
      </div>
      {label ? (
        <div style={{fontFamily: font.sans, fontSize: type.label, fontWeight: weight.medium, color: color.paper}}>{label}</div>
      ) : null}
    </div>
  );
};

export const AppIcon: React.FC<{icon: IconName; title?: string; sub?: string; size?: number; tone?: string}> = ({
  icon,
  title,
  sub,
  size = 150,
  tone = color.blue,
}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, fontFamily: font.sans}}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: 'linear-gradient(180deg, #ffffff, #eef0f4)',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.6), 0 0 ${size * 0.6}px ${tone}66, 0 20px 50px rgba(0,0,0,0.5)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size * 0.5} color={tone} stroke={2.4} />
    </div>
    {title ? (
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: type.heading, fontWeight: weight.semibold, color: color.paper, letterSpacing: '-0.02em'}}>{title}</div>
        {sub ? <div style={{fontSize: type.body - 2, color: color.paperSoft, marginTop: 4}}>{sub}</div> : null}
      </div>
    ) : null}
  </div>
);
