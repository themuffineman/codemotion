import React from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, BoardCard, CTA, Center, Enter, Eyebrow, FocusShade, Headline, Icon, Logo, PerspectiveBoard, Pill, Scene, SectionTag,
  Stage, Track, TranscriptProvider, color, ease, font, radius, shadow, stagger, type, useCue, weight,
} from '../../kit';
import transcript from './transcript.json';
import clipsJson from './clips.json';

// "Gemini 3.8 TTS review": a short intro (the models, OpenRouter, how a request looks), then the test clips
// play one after another with their text, voice and style prompt on screen, then the outro.
// Clips: projects/gemini-tts (tests.mjs → run.mjs → out/*.mp3). assemble.mjs lays the voice and clips into
// public/gemini-tts/master.mp3 and writes a marker word "clip-<name>" into the transcript where each clip starts,
// so scenes cue clips the same way they cue spoken words. clips.json holds each clip's loudness per frame (env).

export const geminiTtsTranscript = transcript;

type Turn = {voice: string; text: string; instructions?: string};
type Clip = {
  name: string; test: string; title: string; model: string; voice: string; instructions: string | null; input: string | Turn[];
  ms: number; start: number; end: number; segments: number[] | null; env: number[];
};
const clips = clipsJson as Clip[];
const clipOf = (name: string) => {
  const c = clips.find((x) => x.name === name);
  if (!c) throw new Error('no clip ' + name);
  return c;
};

// Subsets of Noto (only the glyphs in the four non-Latin test texts), so CJK and Hindi render without the network.
const SCRIPT_FONTS: [string, string][] = [
  ['Noto Sans JP', 'fonts/NotoSansJP-subset.woff2'],
  ['Noto Sans KR', 'fonts/NotoSansKR-subset.woff2'],
  ['Noto Sans SC', 'fonts/NotoSansSC-subset.woff2'],
  ['Noto Sans Devanagari', 'fonts/NotoSansDevanagari-subset.woff2'],
];
if (typeof document !== 'undefined') {
  const handle = delayRender('script fonts');
  Promise.all(
    SCRIPT_FONTS.map(async ([family, file]) => {
      const f = new FontFace(family, `url(${staticFile(file)}) format('woff2')`);
      await f.load();
      document.fonts.add(f);
    }),
  ).finally(() => continueRender(handle));
}

// ---------- Helpers ----------

const Row: React.FC<{children: React.ReactNode; gap?: number; align?: React.CSSProperties['alignItems']}> = ({children, gap = 24, align = 'center'}) => (
  <div style={{display: 'flex', alignItems: align, gap}}>{children}</div>
);
const Stack: React.FC<{children: React.ReactNode; gap?: number; align?: React.CSSProperties['alignItems']}> = ({children, gap = 24, align = 'center'}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: align, gap}}>{children}</div>
);
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paper, size = type.label}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);
const tw = (frame: number, a: number, b: number) => interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const modelId = (m: string) => m.replace('google/', '');

// Local start / end frames of a clip inside the current scene.
const useClip = (name: string) => {
  const cue = useCue();
  return {clip: clipOf(name), at: cue('clip-' + name, {lead: 0}), end: cue('clip-' + name, {lead: 0, edge: 'end'})};
};

// The clip's real loudness, one bar per frame, scrolling right to left while it plays.
const Wave: React.FC<{clip: Clip; at: number; width: number; height: number; bars?: number}> = ({clip, at, width, height, bars = 72}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const playing = t >= 0 && t < clip.env.length;
  const gap = 4;
  const w = (width - gap * (bars - 1)) / bars;
  return (
    <div style={{width, height, display: 'flex', alignItems: 'center', gap}}>
      {Array.from({length: bars}, (_, i) => {
        const idx = t - (bars - 1 - i);
        const v = idx >= 0 && idx < clip.env.length ? clip.env[idx] : 0;
        return <div key={i} style={{width: w, height: Math.max(6, v * height), borderRadius: w, background: playing ? color.blue : color.paperMute, opacity: playing ? 0.35 + 0.65 * (i / bars) : 0.5}} />;
      })}
    </div>
  );
};

// Elapsed time of the clip as a filling rail with a mm:ss counter.
const Progress: React.FC<{clip: Clip; at: number; width: number}> = ({clip, at, width}) => {
  const frame = useCurrentFrame();
  const len = clip.end - clip.start;
  const el = Math.max(0, Math.min(len, (frame - at) / 30));
  return (
    <Row gap={20}>
      <div style={{width: width - 210, height: 6, borderRadius: 3, background: color.tileLine}}>
        <div style={{width: `${(el / len) * 100}%`, height: '100%', borderRadius: 3, background: color.blue}} />
      </div>
      <span style={{whiteSpace: 'nowrap'}}><Mono tone={color.paperSoft}>{`${mmss(el)} / ${mmss(len)}`}</Mono></span>
    </Row>
  );
};

// The player strip: waveform over the progress rail, on a dark tile.
const Player: React.FC<{clip: Clip; at: number; width: number; height?: number}> = ({clip, at, width, height = 90}) => (
  <div style={{width, boxSizing: 'border-box', padding: '22px 30px', borderRadius: radius.tile, background: color.code, display: 'flex', flexDirection: 'column', gap: 16}}>
    <Wave clip={clip} at={at} width={width - 60} height={height} />
    <Progress clip={clip} at={at} width={width - 60} />
  </div>
);

// 0→1 while a clip plays (eased in and out), for the focus ring.
const usePlaying = (at: number, end: number) => {
  const frame = useCurrentFrame();
  return tw(frame, at - 6, at + 4) * (1 - tw(frame, end, end + 10));
};

const Meta: React.FC<{clip: Clip; voice?: string}> = ({clip, voice}) => (
  <Row gap={14}>
    <Pill variant="neutral" icon="user" size={type.label}>{`Voice · ${voice ?? clip.voice}`}</Pill>
    <Pill variant="ghost" size={type.label} style={{color: color.inkSoft, fontFamily: font.mono}}>{modelId(clip.model)}</Pill>
  </Row>
);

const Style: React.FC<{text: string | null}> = ({text}) =>
  text ? (
    <div style={{display: 'flex', gap: 18, alignItems: 'baseline', fontFamily: font.sans, fontSize: type.label + 2, lineHeight: 1.35}}>
      <span style={{color: color.blue, fontWeight: weight.medium, letterSpacing: '0.12em', fontSize: type.eyebrow, textTransform: 'uppercase', flexShrink: 0}}>Style</span>
      <span style={{color: color.inkSoft}}>“{text}”</span>
    </div>
  ) : (
    <div style={{fontFamily: font.sans, fontSize: type.label + 2, color: color.inkMute}}>No style prompt</div>
  );

const bodyText = (size: number = type.body): React.CSSProperties => ({fontFamily: font.sans, fontSize: size, color: color.ink, lineHeight: 1.42, letterSpacing: '-0.01em'});

// The subject of every test: what was sent (text, voice, model, style) and the clip playing under it.
const ClipCard: React.FC<{clip: Clip; at: number; end: number; width?: number; text?: React.ReactNode; size?: number; voice?: string; style?: string | null}> = ({
  clip, at, end, width = 1320, text, size, voice, style,
}) => {
  const p = usePlaying(at, end);
  return (
    <div
      style={{
        width, boxSizing: 'border-box', padding: '40px 46px', borderRadius: radius.card, background: `linear-gradient(180deg, ${color.cardTop}, ${color.card})`,
        boxShadow: p > 0 ? `${shadow.card}, 0 0 0 ${4 * p}px ${color.blue}, 0 0 ${60 * p}px rgba(26,132,245,${0.55 * p})` : shadow.card,
        display: 'flex', flexDirection: 'column', gap: 26,
      }}
    >
      <Meta clip={clip} voice={voice} />
      <div style={bodyText(size)}>{text ?? (typeof clip.input === 'string' ? clip.input : '')}</div>
      <Style text={style === undefined ? clip.instructions : style} />
      <Player clip={clip} at={at} width={width - 92} />
    </div>
  );
};

// A whole test scene: section tag, then the card for one clip.
const Test: React.FC<{n: number; section: string; title: string; clip: string; text?: React.ReactNode; size?: number; width?: number}> = ({n, section, title, clip, text, size, width}) => {
  const c = useClip(clip);
  return (
    <AbsoluteFill>
      <FocusShade />
      <SectionTag eyebrow={`Test ${n} · ${section}`} title={title} />
      <Center>
        <Enter at={0} preset="rise">
          <ClipCard clip={c.clip} at={c.at} end={c.end} text={text} size={size} width={width} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 1. Intro ----------

const ModelCard: React.FC<{name: string; id: string; at: number}> = ({name, id, at}) => (
  <Enter at={at} preset="rise">
    <div style={{width: 640, boxSizing: 'border-box', padding: '40px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 18}}>
      <Row gap={18}>
        <Logo name="gemini" size={52} />
        <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: color.ink, letterSpacing: '-0.02em'}}>{name}</div>
      </Row>
      <Mono tone={color.inkMute}>{id}</Mono>
    </div>
  </Enter>
);

const Release: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={56}>
        <Row gap={36}>
          <Enter at={cue('google')} preset="pop"><Logo name="google" size={100} /></Enter>
          <Enter at={cue('google') + 6} preset="pop"><Logo name="gemini" size={100} /></Enter>
        </Row>
        <Enter at={cue('two new')} preset="fade"><Eyebrow>Two new text-to-speech models</Eyebrow></Enter>
        <Row gap={44}>
          <ModelCard name="Gemini 3.8 Flash TTS" id="google/gemini-3.8-flash-tts" at={cue('gemini 3.8 flash tts')} />
          <ModelCard name="Gemini 3.8 Flash TTS Lite" id="google/gemini-3.8-flash-lite-tts" at={cue('flash tts lite')} />
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const OnOpenRouter: React.FC = () => {
  const cue = useCue();
  const at = cue('openrouter');
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Enter at={at} preset="pop">
          <Row gap={28}>
            <div style={{width: 120, height: 120, borderRadius: radius.tile, background: color.card, boxShadow: shadow.tile, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Logo name="openrouter" size={76} />
            </div>
            <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.hero, color: color.paper, letterSpacing: '-0.03em'}}>OpenRouter</div>
          </Row>
        </Enter>
        <Enter at={at + 10} preset="rise">
          <div style={{padding: '26px 40px', borderRadius: radius.tile, background: color.code, border: `1px solid ${color.tileLine}`}}>
            <Mono size={type.body}>
              <span style={{color: color.green}}>POST</span> https://openrouter.ai/api/v1/audio/speech
            </Mono>
          </div>
        </Enter>
        <Row gap={20}>
          {['google/gemini-3.8-flash-tts', 'google/gemini-3.8-flash-lite-tts'].map((m, i) => (
            <Enter key={m} at={stagger(at + 18, i, 6)} preset="pop">
              <Pill variant="white" size={type.label} style={{fontFamily: font.mono}}>{m}</Pill>
            </Enter>
          ))}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const Opinion: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={cue('honestly')} preset="fade"><Eyebrow>My take</Eyebrow></Enter>
        <Enter at={cue('i think this is probably')} preset="rise">
          <Headline size={type.hero} maxWidth={1400}>
            Probably the most <Accent>realistic</Accent> text-to-speech out there
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// What a request carries: rows light up as each part is named; the style value cycles calm → excited → whispering.
const HowItWorks: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const styleNow = frame >= cue('whispering') ? 'Soft whisper' : frame >= cue('excited') ? 'Excited' : frame >= cue('calm') ? 'Calm' : 'Warm, confident product presenter';
  const rows = [
    {k: 'model', v: 'google/gemini-3.8-flash-tts', at: 0, focus: -1},
    {k: 'input', v: '“This is the part I’m most excited about…”', at: cue('the text you want'), focus: cue('the text you want')},
    {k: 'voice', v: 'Kore', at: cue('one of the voices'), focus: cue('one of the voices'), pill: '30 voices'},
    {k: 'instructions', v: `“${styleNow}”`, at: cue('style instruction'), focus: cue('style instruction')},
  ];
  const active = rows.reduce((a, r, i) => (r.focus >= 0 && frame >= r.focus ? i : a), -1);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={0} preset="fade"><Eyebrow>One request</Eyebrow></Enter>
        <Enter at={0} preset="rise">
          <div style={{width: 1260, boxSizing: 'border-box', padding: '36px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
            {rows.map((r, i) => (
              <div key={r.k} style={{display: 'flex', alignItems: 'center', gap: 30, padding: '22px 0', borderTop: i ? `1px solid ${color.cardLine}` : 'none', opacity: tw(frame, r.at, r.at + 8)}}>
                <div style={{width: 6, alignSelf: 'stretch', borderRadius: 3, background: active === i ? color.blue : 'transparent'}} />
                <div style={{width: 230, fontFamily: font.mono, fontSize: type.label + 2, color: active === i ? color.blue : color.inkMute}}>{r.k}</div>
                <div style={{fontFamily: r.k === 'model' ? font.mono : font.sans, fontSize: type.body, color: color.ink, flex: 1}}>{r.v}</div>
                {r.pill ? <Pill variant="green" size={type.label}>{r.pill}</Pill> : null}
              </div>
            ))}
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// Text with inline <tags>: each tag is a blue chip. `active` dims the phrases that aren't playing.
const TaggedText: React.FC<{text: string; tagAt?: (i: number) => number; active?: number; size?: number}> = ({text, tagAt, active = -1, size = type.body as number}) => {
  const frame = useCurrentFrame();
  const parts = text.split(/(<[^>]+>)/).filter((s) => s.trim() !== '');
  let tag = -1;
  return (
    <div style={bodyText(size)}>
      {parts.map((p, i) => {
        if (p.startsWith('<')) {
          tag++;
          const at = tagAt ? tagAt(tag) : 0;
          const s = tw(frame, at, at + 8);
          const on = active === tag;
          return (
            <span key={i} style={{display: 'inline-block', margin: '0 8px 0 0', padding: '2px 14px', borderRadius: radius.chip, background: on ? color.blue : color.blueSoft, color: on ? '#fff' : color.blue, fontFamily: font.mono, fontSize: size * 0.78, transform: `scale(${0.6 + 0.4 * s})`, opacity: s, verticalAlign: 'middle'}}>
              {p}
            </span>
          );
        }
        const dim = active >= 0 && tag !== active;
        return <span key={i} style={{color: dim ? color.inkFaint : color.ink, marginRight: 8}}>{p.trim()}</span>;
      })}
    </div>
  );
};

const InlineTags: React.FC = () => {
  const cue = useCue();
  const c = clipOf('16-inline-angle');
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={0} preset="fade"><Eyebrow>Inline tags</Eyebrow></Enter>
        <Enter at={0} preset="rise">
          <div style={{width: 1260, boxSizing: 'border-box', padding: '44px 50px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
            <TaggedText text={c.input as string} tagAt={(i) => stagger(cue('angle brackets'), i, 6)} size={type.body + 4} />
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Plan: React.FC = () => {
  const cue = useCue();
  const parts = ['The basics', 'Emotion', 'Inline tags', 'Conversation', 'Languages & accents', 'Flash vs Lite'];
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={56}>
        <Enter at={cue('bunch of different tests')} preset="fade"><Eyebrow>In this video</Eyebrow></Enter>
        <Row gap={18}>
          {parts.map((p, i) => (
            <Enter key={p} at={stagger(cue('bunch of different tests'), i, 5)} preset="pop">
              <Pill variant="white" size={type.label + 2}>{p}</Pill>
            </Enter>
          ))}
        </Row>
        <Enter at={cue('decide for yourself')} preset="rise">
          <Headline size={type.hero}>
            Listen, and <Accent>decide</Accent> for yourself
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 2. Tests ----------

// The technical test, with the hard parts (commands, URL, prices, versions, dates) set in mono.
const HARD = ['npm install', 'localhost:3000', '404', 'NODE_ENV', '$0.50', '29/10/2026', 'v3.8.1', '1.2ms', 'API', 'SQL'];
const Technical: React.FC = () => {
  const text = clipOf('09-technical').input as string;
  const re = new RegExp(`(${HARD.map((h) => h.replace(/[.$/]/g, '\\$&')).join('|')})`);
  return (
    <Test
      n={4}
      section="The basics"
      title="Technical text"
      clip="09-technical"
      text={text.split(re).map((p, i) =>
        HARD.includes(p) ? (
          <span key={i} style={{fontFamily: font.mono, fontSize: type.body - 4, color: color.blue, background: color.blueSoft, borderRadius: 8, padding: '0 8px'}}>{p}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    />
  );
};

// Same sentence, three style prompts: one card per mood, lit while its clip plays.
const Moods: React.FC = () => {
  const cue = useCue();
  const moods = [
    {name: 'Happy', clip: '13-same-text-styles-a-happy', said: 'happy'},
    {name: 'Suspicious', clip: '13-same-text-styles-b-suspicious', said: 'suspicious'},
    {name: 'Terrified', clip: '13-same-text-styles-c-terrified', said: 'terrified'},
  ].map((m) => ({...m, ...useClip(m.clip)}));
  const MoodCard: React.FC<{m: (typeof moods)[number]}> = ({m}) => {
    const p = usePlaying(m.at, m.end);
    return (
      <div style={{width: 500, boxSizing: 'border-box', padding: '32px 34px', borderRadius: radius.card, background: color.card, boxShadow: p > 0 ? `${shadow.card}, 0 0 0 ${4 * p}px ${color.blue}, 0 0 ${60 * p}px rgba(26,132,245,${0.55 * p})` : shadow.card, display: 'flex', flexDirection: 'column', gap: 20}}>
        <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: color.ink}}>{m.name}</div>
        <div style={{fontFamily: font.sans, fontSize: type.label, color: color.inkSoft, lineHeight: 1.35, minHeight: 72}}>“{m.clip.instructions}”</div>
        <div style={{padding: '18px 22px', borderRadius: radius.tile, background: color.code}}>
          <Wave clip={m.clip} at={m.at} width={388} height={70} bars={40} />
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <FocusShade />
      <SectionTag eyebrow="Test 11 · Emotion" title="Same line, three moods" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>“{clipOf('13-same-text-styles-a-happy').input as string}”</Headline>
        </Enter>
        <Row gap={36} align="stretch">
          {moods.map((m) => (
            <Enter key={m.name} at={cue(m.said)} preset="rise"><MoodCard m={m} /></Enter>
          ))}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Which segment of a clip is playing: segments are start times (s) inside the clip.
const segmentAt = (frame: number, at: number, segs: number[]) => segs.reduce((a, s, i) => (frame >= at + s * 30 ? i : a), -1);

const TagTest: React.FC<{n: number; title: string; clip: string}> = ({n, title, clip}) => {
  const c = useClip(clip);
  const frame = useCurrentFrame();
  const seg = segmentAt(frame, c.at, c.clip.segments ?? []);
  const active = frame < c.end ? seg : -1;
  return (
    <AbsoluteFill>
      <FocusShade />
      <SectionTag eyebrow={`Test ${n} · Inline tags`} title={title} />
      <Center>
        <Enter at={0} preset="rise">
          <ClipCard clip={c.clip} at={c.at} end={c.end} text={<TaggedText text={c.clip.input as string} active={active} size={type.body + 2} />} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// Two voices: chat bubbles appear as each turn starts, the speaking one lit.
const Dialogue: React.FC = () => {
  const c = useClip('11-dialogue');
  const frame = useCurrentFrame();
  const turns = c.clip.input as Turn[];
  const segs = c.clip.segments ?? [];
  const seg = segmentAt(frame, c.at, segs);
  return (
    <AbsoluteFill>
      <FocusShade />
      <SectionTag eyebrow="Test 14 · Conversation" title="Two voices, one request" />
      <div style={{position: 'absolute', top: 190, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        {turns.map((t, i) => {
          const left = t.voice === turns[0].voice;
          const at = c.at + Math.round(segs[i] * 30) - 4;
          const on = seg === i && frame < c.end;
          return (
            <div key={i} style={{width: 1300, display: 'flex', justifyContent: left ? 'flex-start' : 'flex-end'}}>
              <Enter at={i === 0 ? Math.min(at, 0) : at} preset={left ? 'slideRight' : 'slideLeft'}>
                <div style={{maxWidth: 1100, padding: '16px 30px', borderRadius: radius.tile, background: left ? color.card : color.tileHi, boxShadow: on ? shadow.focus : shadow.tile, display: 'flex', flexDirection: 'column', gap: 6}}>
                  <div style={{fontFamily: font.sans, fontSize: type.eyebrow, letterSpacing: '0.12em', textTransform: 'uppercase', color: color.blue}}>
                    {t.voice}{t.instructions ? ` · ${t.instructions}` : ''}
                  </div>
                  <div style={{fontFamily: font.sans, fontSize: type.body, color: left ? color.ink : color.paper}}>{t.text}</div>
                </div>
              </Enter>
            </div>
          );
        })}
        <Enter at={0} preset="fade">
          <div style={{marginTop: 10}}><Player clip={c.clip} at={c.at} width={1300} height={50} /></div>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

// A list of variants on the left (lit while playing), and the card for the current one on the right.
type Variant = {label: string; clip: string; said?: string; fontFamily?: string};
const VariantList: React.FC<{n: number; section: string; title: string; variants: Variant[]; size?: number; showStyle?: boolean}> = ({n, section, title, variants, size, showStyle}) => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const vs = variants.map((v) => ({...v, ...useClip(v.clip)}));
  const cur = vs.reduce((a, v, i) => (frame >= v.at - 6 ? i : a), 0);
  const v = vs[cur];
  return (
    <AbsoluteFill>
      <FocusShade />
      <SectionTag eyebrow={`Test ${n} · ${section}`} title={title} />
      <Center>
        <Row gap={56}>
          <Stack gap={14} align="stretch">
            {vs.map((x, i) => {
              const on = i === cur && frame >= x.at - 6 && frame < x.end + 10;
              return (
                <Enter key={x.label} at={x.said ? cue(x.said) : stagger(0, i, 3)} preset="slideRight">
                  <div style={{width: 300, boxSizing: 'border-box', padding: '14px 24px', borderRadius: radius.chip, background: on ? color.blue : color.tile, border: `1px solid ${color.tileLine}`, fontFamily: font.sans, fontSize: type.label + 2, color: on ? '#fff' : i < cur ? color.paperSoft : color.paperMute, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    {x.label}
                    {i < cur ? <Icon name="check" size={24} color={color.paperSoft} /> : null}
                  </div>
                </Enter>
              );
            })}
          </Stack>
          <Enter key={cur} at={cur === 0 ? 0 : v.at - 6} preset="fade">
            <ClipCard
              clip={v.clip}
              at={v.at}
              end={v.end}
              width={1180}
              size={size}
              style={showStyle ? v.clip.instructions : undefined}
              text={<span style={{fontFamily: v.fontFamily ? `${font.sans}, '${v.fontFamily}'` : font.sans}}>{v.clip.input as string}</span>}
            />
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const LANGS: Variant[] = [
  {label: 'Spanish', clip: '12-languages-spanish', said: 'spanish'},
  {label: 'French', clip: '12-languages-french', said: 'french'},
  {label: 'German', clip: '12-languages-german', said: 'german'},
  {label: 'Portuguese', clip: '12-languages-portuguese', said: 'portuguese'},
  {label: 'Japanese', clip: '12-languages-japanese', said: 'japanese', fontFamily: 'Noto Sans JP'},
  {label: 'Korean', clip: '12-languages-korean', said: 'korean', fontFamily: 'Noto Sans KR'},
  {label: 'Mandarin', clip: '12-languages-mandarin', said: 'mandarin', fontFamily: 'Noto Sans SC'},
  {label: 'Hindi', clip: '12-languages-hindi', said: 'hindi', fontFamily: 'Noto Sans Devanagari'},
];
const ACCENTS: Variant[] = [
  {label: 'London', clip: '17-accents-british'},
  {label: 'Glasgow', clip: '17-accents-scottish'},
  {label: 'Dublin', clip: '17-accents-irish'},
  {label: 'Australian', clip: '17-accents-australian'},
  {label: 'Indian', clip: '17-accents-indian'},
  {label: 'Texan', clip: '17-accents-southern-us'},
  {label: 'Nigerian', clip: '17-accents-nigerian'},
];

// Flash and Lite side by side: price and generation time, each with its own player.
const FlashVsLite: React.FC = () => {
  const models = [
    {name: 'Flash', price: '$9', ...useClip('14-flash-vs-lite-gemini-3.8-flash-tts')},
    {name: 'Flash Lite', price: '$6', ...useClip('14-flash-vs-lite-gemini-3.8-flash-lite-tts')},
  ];
  const Side: React.FC<{m: (typeof models)[number]}> = ({m}) => {
    const p = usePlaying(m.at, m.end);
    return (
      <div style={{width: 700, boxSizing: 'border-box', padding: '36px 40px', borderRadius: radius.card, background: color.card, boxShadow: p > 0 ? `${shadow.card}, 0 0 0 ${4 * p}px ${color.blue}, 0 0 ${60 * p}px rgba(26,132,245,${0.55 * p})` : shadow.card, display: 'flex', flexDirection: 'column', gap: 22}}>
        <Row gap={16}>
          <Logo name="gemini" size={48} />
          <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: color.ink}}>{m.name}</div>
        </Row>
        <Mono tone={color.inkMute}>{modelId(m.clip.model)}</Mono>
        <Row gap={14}>
          <Pill variant="neutral" size={type.label}>{`${m.price} / 1M output tokens`}</Pill>
          <Pill variant="ghost" size={type.label} style={{color: color.inkSoft}}>{`generated in ${(m.clip.ms / 1000).toFixed(1)}s`}</Pill>
        </Row>
        <Player clip={m.clip} at={m.at} width={620} height={70} />
      </div>
    );
  };
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <SectionTag eyebrow="Test 17 · Flash vs Lite" title="Same text, same voice" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <div style={{...bodyText(type.body), color: color.paper, maxWidth: 1440, textAlign: 'center'}}>“{models[0].clip.input as string}”</div>
        </Enter>
        <Row gap={40} align="stretch">
          <Enter at={cue('flash model')} preset="rise"><Side m={models[0]} /></Enter>
          <Enter at={cue('lite model')} preset="rise"><Side m={models[1]} /></Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 3. Outro ----------

// Every test on one board, each with a still of its waveform.
const BOARD = [
  ['01-narration', 'Audiobook narrator'], ['03-news', 'News anchor'], ['02-casual', 'Casual story'], ['09-technical', 'Technical text'],
  ['10-tongue-twister', 'Tongue twister'], ['04-sad', 'Grief'], ['07-whisper', 'Bedtime whisper'], ['08-laugh', 'Laughing'],
  ['06-angry', 'Angry customer'], ['05-hype', 'Football commentary'], ['13-same-text-styles-b-suspicious', 'Three moods'], ['16-inline-angle', 'Inline tags'],
  ['18-angle-mismatch', 'Tags that clash'], ['11-dialogue', 'Podcast'], ['12-languages-japanese', '8 languages'], ['17-accents-scottish', '7 accents'],
] as const;
const Thumb: React.FC<{clip: Clip}> = ({clip}) => {
  const n = 40;
  const step = Math.max(1, Math.floor(clip.env.length / n));
  return (
    <AbsoluteFill style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3}}>
      {Array.from({length: n}, (_, i) => (
        <div key={i} style={{width: 4, height: Math.max(4, (clip.env[i * step] ?? 0) * 110), borderRadius: 2, background: color.blue, opacity: 0.85}} />
      ))}
    </AbsoluteFill>
  );
};
const AllTests: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <PerspectiveBoard at={0} label={{text: 'Which one surprised you the most?', icon: 'question'}} scroll={{from: 260, to: -420, dur: 300}}>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 36}}>
          {BOARD.map(([name, title]) => {
            const c = clipOf(name);
            return <BoardCard key={name} title={title} meta={`${c.voice} · ${(c.end - c.start).toFixed(0)}s`} thumb={<Thumb clip={c} />} width={315} />;
          })}
        </div>
      </PerspectiveBoard>
      <Enter at={cue('gives it away')} preset="rise">
        <div style={{position: 'absolute', bottom: 110, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
          <Pill variant="white" icon="question" size={type.body - 2}>Which one gives it away as AI?</Pill>
        </div>
      </Enter>
    </AbsoluteFill>
  );
};

const Verdict: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={cue('for me personally')} preset="fade"><Eyebrow>For me</Eyebrow></Enter>
        <Enter at={cue('by far the best')} preset="rise">
          <Headline size={type.hero} maxWidth={1400}>
            By far the <Accent>best</Accent> text-to-speech right now
          </Headline>
        </Enter>
        <Enter at={cue('for this price')} preset="pop">
          <Pill variant="green" size={type.body - 2}>at least for this price</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const AskViewers: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={cue('any other models')} preset="pop"><Logo name="gemini" size={110} /></Enter>
        <Enter at={cue('any other models')} preset="rise">
          <Headline size={type.title + 8} maxWidth={1300}>
            Know a model that could <Accent>overthrow</Accent> Gemini?
          </Headline>
        </Enter>
      </Center>
      <CTA text="Tell me in the comments" at={cue('comments below')} icon="arrowRight" />
    </AbsoluteFill>
  );
};

export const GeminiTtsVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('gemini-tts/master.mp3')} />
    <Track>
      <Scene from="google just released"><Release /></Scene>
      <Scene from="and you can use both"><OnOpenRouter /></Scene>
      <Scene from="now i've been playing"><Opinion /></Scene>
      <Scene from="now the way it works"><HowItWorks /></Scene>
      <Scene from="and you can also put"><InlineTags /></Scene>
      <Scene from="so in this video"><Plan /></Scene>
      <Scene from="okay now let's start"><Test n={1} section="The basics" title="Audiobook narrator" clip="01-narration" /></Scene>
      <Scene from="okay next a news"><Test n={2} section="The basics" title="News anchor" clip="03-news" /></Scene>
      <Scene from="now something more casual"><Test n={3} section="The basics" title="Casual story, with ums and pauses" clip="02-casual" /></Scene>
      <Scene from="this one is a bit harder"><Technical /></Scene>
      <Scene from="now this is a fun one"><Test n={5} section="The basics" title="Tongue twister" clip="10-tongue-twister" size={type.heading} /></Scene>
      <Scene from="now let's try emotion"><Test n={6} section="Emotion" title="Grief" clip="04-sad" /></Scene>
      <Scene from="let's see how it sounds like"><Test n={7} section="Emotion" title="Bedtime whisper" clip="07-whisper" /></Scene>
      <Scene from="okay now in this one"><Test n={8} section="Emotion" title="Laughing while talking" clip="08-laugh" /></Scene>
      <Scene from="okay now this one is an angry"><Test n={9} section="Emotion" title="Angry customer" clip="06-angry" /></Scene>
      <Scene from="and this one is a football"><Test n={10} section="Emotion" title="Football commentator" clip="05-hype" /></Scene>
      <Scene from="now this next one"><Moods /></Scene>
      <Scene from="now let's try the angle"><TagTest n={12} title="Emotion from tags only" clip="16-inline-angle" /></Scene>
      <Scene from="and in this one i put"><TagTest n={13} title="Tags that clash with the words" clip="18-angle-mismatch" /></Scene>
      <Scene from="you can also give it"><Dialogue /></Scene>
      <Scene from="this model also speaks"><VariantList n={15} section="Languages" title="Same message, eight languages" variants={LANGS} /></Scene>
      <Scene from="and here's the same english"><VariantList n={16} section="Accents" title="Same voice, only the instruction changes" variants={ACCENTS} showStyle /></Scene>
      <Scene from="now the last one"><FlashVsLite /></Scene>
      <Scene from="yeah so that's"><AllTests /></Scene>
      <Scene from="but for me personally"><Verdict /></Scene>
      <Scene from="but let me know if"><AskViewers /></Scene>
    </Track>
  </TranscriptProvider>
);
