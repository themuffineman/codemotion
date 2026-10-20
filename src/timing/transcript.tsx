import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {useExit} from '../motion/motion';

// The word-level transcript is the clock. Every animation is anchored to a spoken word,
// never to a hand-typed frame number.
//
// Transcript JSON (seconds, as produced by WhisperX / Deepgram / AssemblyAI after normalising):
// { "words": [ { "text": "So", "start": 0.12, "end": 0.31 }, ... ] }

export type Word = {text: string; start: number; end: number};
export type Transcript = {words: Word[]};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']+/g, '');

// Find the n-th occurrence (1-based) of a phrase, searching from `after` seconds.
export const findPhrase = (t: Transcript, phrase: string, n = 1, after = 0): {start: number; end: number} => {
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  let seen = 0;
  for (let i = 0; i < t.words.length; i++) {
    if (t.words[i].start < after) continue;
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (norm(t.words[i + j]?.text ?? '') !== target[j]) {
        ok = false;
        break;
      }
    }
    if (ok && ++seen === n) return {start: t.words[i].start, end: t.words[i + target.length - 1].end};
  }
  throw new Error(`Cue not found in transcript: "${phrase}" (occurrence ${n}, after ${after}s)`);
};

type Ctx = {transcript: Transcript; offset: number; sceneStart: number};
const TranscriptCtx = createContext<Ctx | null>(null);

export const TranscriptProvider: React.FC<{transcript: Transcript; children: React.ReactNode}> = ({
  transcript,
  children,
}) => <TranscriptCtx.Provider value={{transcript, offset: 0, sceneStart: 0}}>{children}</TranscriptCtx.Provider>;

// Returns cue(phrase) -> LOCAL frame inside the current <Scene>.
// lead: frames to start before the word (visuals land as the word is heard; 3 is a good default).
export const useCue = () => {
  const ctx = useContext(TranscriptCtx);
  const {fps} = useVideoConfig();
  if (!ctx) throw new Error('useCue must be used inside <TranscriptProvider>');
  const cue = (phrase: string, opts: {n?: number; lead?: number; edge?: 'start' | 'end'} = {}) => {
    const hit = findPhrase(ctx.transcript, phrase, opts.n ?? 1, ctx.sceneStart);
    const sec = opts.edge === 'end' ? hit.end : hit.start;
    return Math.round(sec * fps) - ctx.offset - (opts.lead ?? 3);
  };
  return cue;
};

// The spoken words from phrase `from` through phrase `to`, each with its LOCAL frame (`at`).
// Used by <Caption>; also handy for word-by-word reveals.
export const useWords = (from: string, to: string, fromN = 1, lead = 2) => {
  const ctx = useContext(TranscriptCtx);
  const {fps} = useVideoConfig();
  if (!ctx) throw new Error('useWords must be used inside <TranscriptProvider>');
  const a = findPhrase(ctx.transcript, from, fromN, ctx.sceneStart);
  const b = findPhrase(ctx.transcript, to, 1, a.start);
  return ctx.transcript.words
    .filter((w) => w.start >= a.start && w.end <= b.end + 1e-6)
    .map((w) => ({...w, at: Math.round(w.start * fps) - ctx.offset - lead}));
};

// A scene starts on a spoken phrase. Inside it, frames are local (0 = scene start).
// Put scenes inside <Track>: each scene then holds until the next one starts, so a visual cued
// on the last word of a sentence still gets screen time. The last scene runs to the video end
// (or to its `to` phrase).
//
// <Track>
//   <Scene from="so the jvm">...</Scene>
//   <Scene from="let's open">...</Scene>
// </Track>
export type SceneProps = {
  from: string;
  fromN?: number; // which occurrence of `from` (counted after the previous scene's start)
  to?: string; // optional explicit end phrase (standalone scenes, or the last scene)
  pad?: number; // frames of hold after `to` ends
  exit?: boolean; // blur out over the last 8 frames (default true)
  name?: string;
  children: React.ReactNode;
  _start?: number; // set by <Track>
  _dur?: number; // set by <Track>
  _after?: number; // set by <Track>
};

const LEAD = 6; // scene starts this many frames before its first word
const OVERLAP = 8; // outgoing scene blurs out while the next one comes in

export const Scene: React.FC<SceneProps> = ({from, fromN = 1, to, pad = 20, exit = true, name, children, _start, _dur, _after = 0}) => {
  const ctx = useContext(TranscriptCtx);
  const {fps, durationInFrames} = useVideoConfig();
  if (!ctx) throw new Error('<Scene> must be inside <TranscriptProvider>');
  const a = findPhrase(ctx.transcript, from, fromN, _after);
  const start = _start ?? Math.max(0, Math.round(a.start * fps) - LEAD);
  const dur = _dur ?? (to ? Math.round(findPhrase(ctx.transcript, to, 1, a.start).end * fps) + pad - start : durationInFrames - start);
  return (
    <Sequence from={start} durationInFrames={dur} name={name ?? from}>
      <TranscriptCtx.Provider value={{transcript: ctx.transcript, offset: start, sceneStart: a.start}}>
        <SceneExit at={exit ? dur - OVERLAP : undefined}>{children}</SceneExit>
      </TranscriptCtx.Provider>
    </Sequence>
  );
};

export const Track: React.FC<{children: React.ReactNode}> = ({children}) => {
  const ctx = useContext(TranscriptCtx);
  const {fps, durationInFrames} = useVideoConfig();
  if (!ctx) throw new Error('<Track> must be inside <TranscriptProvider>');
  const scenes = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<SceneProps>[];
  let after = 0;
  const starts = scenes.map((el) => {
    const hit = findPhrase(ctx.transcript, el.props.from, el.props.fromN ?? 1, after);
    const st = {frame: Math.max(0, Math.round(hit.start * fps) - LEAD), after};
    after = hit.start;
    return st;
  });
  return (
    <>
      {scenes.map((el, i) => {
        const last = i === scenes.length - 1;
        const start = starts[i].frame;
        let end: number;
        if (!last) end = starts[i + 1].frame + OVERLAP;
        else if (el.props.to) end = Math.round(findPhrase(ctx.transcript, el.props.to, 1, starts[i].after).end * fps) + (el.props.pad ?? 20);
        else end = durationInFrames;
        if (end - start < fps) console.warn(`Scene "${el.props.from}" is shorter than 1s`);
        return React.cloneElement(el, {key: i, _start: start, _dur: Math.max(1, end - start), _after: starts[i].after, exit: last ? el.props.exit ?? false : el.props.exit});
      })}
    </>
  );
};

const SceneExit: React.FC<{at?: number; children: React.ReactNode}> = ({at, children}) => (
  <AbsoluteFill style={useExit(at, OVERLAP)}>{children}</AbsoluteFill>
);
