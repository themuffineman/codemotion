import React, {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {createHighlighter, type Highlighter, type ThemedToken} from 'shiki';
import {color, font, radius, shadow, type} from '../design/tokens';
import {useTween} from '../motion/motion';
import {codeTheme} from './codeTheme';

// Real code on screen. The window always shows an actual file from public/code/ and an actual
// line range. Line numbers are the file's real numbers. Never paste code into a scene.
//
// <CodeWindow file="code/App.java" lines={[3, 9]} steps={[{at: cue('total'), lines: [5, 5]}]} />

const LANGS = ['ts', 'tsx', 'js', 'jsx', 'python', 'java', 'go', 'rust', 'bash', 'json', 'yaml', 'sql', 'c', 'cpp', 'css', 'html', 'kotlin', 'swift', 'txt'];
const EXT: Record<string, string> = {
  ts: 'ts', tsx: 'tsx', js: 'js', mjs: 'js', jsx: 'jsx', py: 'python', java: 'java', go: 'go', rs: 'rust',
  sh: 'bash', json: 'json', yml: 'yaml', yaml: 'yaml', sql: 'sql', c: 'c', h: 'c', cpp: 'cpp', css: 'css',
  html: 'html', kt: 'kotlin', swift: 'swift', txt: 'txt',
};

let hl: Promise<Highlighter> | null = null;
const getHighlighter = () => (hl ??= createHighlighter({themes: [codeTheme], langs: LANGS}));

type Loaded = {tokens: ThemedToken[][]; first: number};

const useCode = (file: string, lines: [number, number], lang?: string) => {
  const [data, setData] = useState<Loaded | null>(null);
  const [handle] = useState(() => delayRender(`code ${file}`));
  useEffect(() => {
    (async () => {
      const res = await fetch(staticFile(file));
      if (!res.ok) throw new Error(`CodeWindow: ${file} not found in public/`);
      const all = (await res.text()).replace(/\r\n/g, '\n').split('\n');
      const [a, b] = lines;
      if (a < 1 || b > all.length || a > b) throw new Error(`CodeWindow: ${file} has ${all.length} lines, asked for ${a}-${b}`);
      const slice = all.slice(a - 1, b).join('\n');
      const l = lang ?? EXT[file.split('.').pop() ?? 'txt'] ?? 'txt';
      const h = await getHighlighter();
      const {tokens} = h.codeToTokens(slice, {lang: l as never, theme: codeTheme.name});
      setData({tokens, first: a});
      continueRender(handle);
    })().catch((err) => cancelRender(err));
  }, [file, lines[0], lines[1], lang]);
  return data;
};

export type CodeStep = {at: number; lines: [number, number]}; // file line numbers

export const MAX_CODE_LINES = 16;

export const CodeWindow: React.FC<{
  file: string; // path under public/, e.g. "code/App.java"
  lines: [number, number]; // inclusive, 1-based, real line numbers
  title?: string; // defaults to the file name
  lang?: string;
  size?: number; // font size; never below 26
  steps?: CodeStep[]; // focus moves through these ranges; other lines dim
  typeAt?: number; // if set, code types in starting at this frame
  typeCps?: number; // characters per second while typing (default 60)
  lineNumbers?: boolean;
  maxWidth?: number;
  style?: React.CSSProperties;
}> = ({file, lines, title, lang, size = type.code, steps = [], typeAt, typeCps = 60, lineNumbers = true, maxWidth = 1600, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const data = useCode(file, lines, lang);
  const count = lines[1] - lines[0] + 1;
  if (count > MAX_CODE_LINES) throw new Error(`CodeWindow: ${count} lines is too many for one window (max ${MAX_CODE_LINES}). Split into steps or scenes.`);
  if (size < 26) throw new Error('CodeWindow: font size below 26px is not legible on phones.');

  // Which step is active (latest step whose `at` has passed), with a smooth crossfade.
  let active: CodeStep | null = null;
  for (const s of steps) if (frame >= s.at) active = s;
  const focusIn = useTween(active?.at ?? 0, (active?.at ?? 0) + 10);

  if (!data) return null;
  const longest = Math.max(...data.tokens.map((l) => l.reduce((n, t) => n + t.content.length, 0)));
  const gutter = lineNumbers ? String(lines[1]).length + 2 : 0;
  const pad = size * 1.2;
  const width = Math.min(maxWidth, (longest + gutter) * size * 0.6 + pad * 2 + 8);
  if ((longest + gutter) * size * 0.6 + pad * 2 > maxWidth + 2) {
    throw new Error(`CodeWindow: longest line (${longest} chars) overflows ${maxWidth}px at ${size}px. Use a smaller range, a narrower file, or size>=26.`);
  }

  // Typewriter: number of characters revealed so far.
  const revealed = typeAt === undefined ? Infinity : Math.max(0, ((frame - typeAt) / fps) * typeCps);
  let budget = revealed;
  // The blinking cursor sits on the line where typing currently is.
  let cursorLine = -1;
  if (typeAt !== undefined) {
    let acc = 0;
    cursorLine = data.tokens.length - 1;
    for (let i = 0; i < data.tokens.length; i++) {
      acc += data.tokens[i].reduce((n, t) => n + t.content.length, 0);
      if (acc > revealed) {
        cursorLine = i;
        break;
      }
    }
  }

  return (
    <div
      style={{
        width,
        borderRadius: radius.window,
        background: color.code,
        boxShadow: shadow.card,
        border: `1px solid ${color.tileLine}`,
        overflow: 'hidden',
        fontFamily: font.mono,
        ...style,
      }}
    >
      <div
        style={{
          height: size * 1.9,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          background: 'linear-gradient(180deg, #3a393d 0%, #323135 100%)',
          borderBottom: `1px solid ${color.tileLine}`,
        }}
      >
        <div style={{display: 'flex', gap: size * 0.32, paddingLeft: size * 0.7}}>
          {[color.red, color.amber, '#28c840'].map((c) => (
            <div key={c} style={{width: size * 0.46, height: size * 0.46, borderRadius: 99, background: c}} />
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
            fontWeight: 600,
            fontSize: size * 0.8,
            color: color.paperSoft,
            letterSpacing: '-0.01em',
          }}
        >
          {title ?? file.split('/').pop()}
        </div>
      </div>
      <div style={{padding: `${pad * 0.8}px ${pad}px`, fontSize: size, lineHeight: 1.55, whiteSpace: 'pre'}}>
        {data.tokens.map((line, i) => {
          const n = data.first + i;
          const inFocus = active ? n >= active.lines[0] && n <= active.lines[1] : true;
          const o = active ? interpolate(focusIn, [0, 1], [1, inFocus ? 1 : 0.42]) : 1;
          return (
            <div key={i} style={{display: 'flex', position: 'relative', opacity: o}}>
              {active && inFocus ? (
                <div
                  style={{
                    position: 'absolute',
                    left: -pad,
                    right: -pad,
                    top: 0,
                    bottom: 0,
                    background: `rgba(26,132,245,${0.14 * focusIn})`,
                    borderLeft: `${5 * focusIn}px solid ${color.blue}`,
                  }}
                />
              ) : null}
              {lineNumbers ? (
                <span style={{width: `${gutter}ch`, color: color.paperMute, position: 'relative', flexShrink: 0}}>{n}</span>
              ) : null}
              <span style={{position: 'relative'}}>
                {line.map((t, j) => {
                  if (budget <= 0) return null;
                  const text = budget >= t.content.length ? t.content : t.content.slice(0, Math.floor(budget));
                  budget -= t.content.length;
                  return (
                    <span key={j} style={{color: t.color}}>
                      {text}
                    </span>
                  );
                })}
                {i === cursorLine && Math.floor(frame / 15) % 2 === 0 ? (
                  <span style={{background: color.paper, display: 'inline-block', width: '0.55em', height: '1.1em', verticalAlign: 'text-bottom'}} />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
