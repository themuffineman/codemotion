import React from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, CTA, Center, Enter, Eyebrow, FocusShade, Headline, Icon, Logo, Pill, Scene, SectionTag,
  Stage, Track, TranscriptProvider, color, ease, font, radius, shadow, stagger, type, useCue, weight,
} from '../../kit';
import transcript from './transcript.json';
import clipsJson from './clips.json';

// "HeyGen Voice vs Gemini TTS": an intro about HeyGen Voice and its specs next to Gemini's, then a head-to-head
// where each test opens with a centred title card and plays the HeyGen clip, then the Gemini clip of the same
// text, each with its billed cost and generation time; then the totals and the outro.
// Clips: projects/heygen-tts (tests.mjs → run.mjs → out/{heygen,gemini}/*.mp3). assemble.mjs lays the voice and
// clips into public/heygen-tts/master.mp3 and writes marker words into the transcript: "test-<id>" where a test's
// card appears and "clip-<model>-<name>" where a clip starts, so scenes cue them like spoken words.

export const heygenTtsTranscript = transcript;

type Model = 'heygen' | 'gemini';
type Turn = {gemini: string; heygen: string; text: string; instructions?: string};
type Clip = {
  name: string; model: Model; test: string; title: string; modelId: string; voice: string; instructions: string | null;
  input: string | Turn[]; cost: number; ms: number; start: number; end: number; segments: number[] | null; env: number[];
};
const clips = clipsJson as Clip[];
const clipOf = (model: Model, name: string) => {
  const c = clips.find((x) => x.model === model && x.name === name);
  if (!c) throw new Error(`no clip ${model} ${name}`);
  return c;
};

// Totals over every clip in the video, for the specs table and the outro.
const totals = (model: Model) => {
  const cs = clips.filter((c) => c.model === model);
  const cost = cs.reduce((s, c) => s + c.cost, 0);
  const secs = cs.reduce((s, c) => s + (c.end - c.start), 0);
  const ms = cs.reduce((s, c) => s + c.ms, 0);
  return {cost, perMin: (cost / secs) * 60, speed: secs / (ms / 1000), count: cs.length};
};
const TOTAL = {heygen: totals('heygen'), gemini: totals('gemini')};

const MODEL = {
  heygen: {name: 'HeyGen Voice 1', short: 'HeyGen Voice 1', logo: 'heygen'},
  gemini: {name: 'Gemini 3.8 Flash TTS', short: 'Gemini 3.8 Flash', logo: 'gemini'},
} as const;

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

const Row: React.FC<{children: React.ReactNode; gap?: number; align?: React.CSSProperties['alignItems']; style?: React.CSSProperties}> = ({children, gap = 24, align = 'center', style}) => (
  <div style={{display: 'flex', alignItems: align, gap, ...style}}>{children}</div>
);
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paper, size = type.label}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);
const tw = (frame: number, a: number, b: number) => interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const usd = (n: number) => `$${n.toFixed(4)}`;
const bodyText = (size: number = type.body): React.CSSProperties => ({fontFamily: font.sans, fontSize: size, color: color.ink, lineHeight: 1.42, letterSpacing: '-0.01em'});
const glow = (p: number) => (p > 0 ? `${shadow.card}, 0 0 0 ${4 * p}px ${color.blue}, 0 0 ${60 * p}px rgba(26,132,245,${0.55 * p})` : shadow.card);

// Local start / end frames of a clip inside the current scene.
const useClip = (model: Model, name: string) => {
  const cue = useCue();
  const id = `clip-${model}-${name}`;
  return {clip: clipOf(model, name), at: cue(id, {lead: 0}), end: cue(id, {lead: 0, edge: 'end'})};
};
type Playing = ReturnType<typeof useClip>;

// 0→1 while a clip plays (eased in and out), for the focus ring.
const usePlaying = (at: number, end: number) => {
  const frame = useCurrentFrame();
  return tw(frame, at - 6, at + 4) * (1 - tw(frame, end, end + 10));
};

// The clip's real loudness, one bar per frame, scrolling right to left while it plays.
const Wave: React.FC<{clip: Clip; at: number; width: number; height: number; bars?: number}> = ({clip, at, width, height, bars = 48}) => {
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

// Waveform over a filling rail with a mm:ss counter, on the dark code surface.
const Player: React.FC<{clip: Clip; at: number; width: number; height?: number}> = ({clip, at, width, height = 56}) => {
  const frame = useCurrentFrame();
  const len = clip.end - clip.start;
  const el = Math.max(0, Math.min(len, (frame - at) / 30));
  const inner = width - 56;
  return (
    <div style={{width, boxSizing: 'border-box', padding: '20px 28px', borderRadius: radius.tile, background: color.code, display: 'flex', flexDirection: 'column', gap: 14}}>
      <Wave clip={clip} at={at} width={inner} height={height} />
      <Row gap={18}>
        <div style={{width: inner - 190, height: 6, borderRadius: 3, background: color.tileLine}}>
          <div style={{width: `${(el / len) * 100}%`, height: '100%', borderRadius: 3, background: color.blue}} />
        </div>
        <span style={{whiteSpace: 'nowrap'}}><Mono tone={color.paperSoft}>{`${mmss(el)} / ${mmss(len)}`}</Mono></span>
      </Row>
    </div>
  );
};

// One side of a test: the model, its voice and style prompt, the player, and what the clip cost to make.
// Lit while its clip plays, dimmed while the other side plays.
const ModelPanel: React.FC<{p: Playing; other: Playing; width: number}> = ({p, other, width}) => {
  const lit = usePlaying(p.at, p.end);
  const otherLit = usePlaying(other.at, other.end);
  const c = p.clip;
  const m = MODEL[c.model];
  return (
    <div style={{width, boxSizing: 'border-box', padding: '30px 34px', borderRadius: radius.card, background: `linear-gradient(180deg, ${color.cardTop}, ${color.card})`, boxShadow: glow(lit), display: 'flex', flexDirection: 'column', gap: 18, opacity: 1 - 0.45 * otherLit}}>
      <Row gap={16}>
        <Logo name={m.logo} size={48} />
        <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: width < 700 ? type.body : type.heading - 6, color: color.ink, letterSpacing: '-0.02em', flex: 1, whiteSpace: 'nowrap'}}>{width < 700 ? m.short : m.name}</div>
        <Pill variant="neutral" icon="user" size={type.label}>{c.voice}</Pill>
      </Row>
      <div style={{fontFamily: font.sans, fontSize: type.label, lineHeight: 1.3, minHeight: 68, color: c.instructions ? color.inkSoft : color.inkMute}}>
        {c.instructions ? `Style: “${c.instructions}”` : 'No style prompt'}
      </div>
      <Player clip={c} at={p.at} width={width - 68} />
      <Row gap={14}>
        <Pill variant="green" size={type.label}>{`${usd(c.cost)} billed`}</Pill>
        <Pill variant="ghost" icon="clock" size={type.label} style={{color: color.inkSoft}}>{`made in ${(c.ms / 1000).toFixed(1)}s`}</Pill>
      </Row>
    </div>
  );
};

// The centred title card that opens each test, gone just before the first clip starts.
const TestCard: React.FC<{n: number; title: string; out: number}> = ({n, title, out}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: 1 - tw(frame, out, out + 10)}}>
      <FocusShade />
      <Center>
        <Enter at={0} preset="rise" out={out}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
            <Eyebrow>{`Test ${n} of 12`}</Eyebrow>
            <Headline size={type.hero}>{title}</Headline>
            <Row gap={22}>
              <Logo name="heygen" size={60} />
              <span style={{fontFamily: font.sans, fontSize: type.body, color: color.paperMute}}>vs</span>
              <Logo name="gemini" size={60} />
            </Row>
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// A whole test: title card, then the text that was sent, and the two models side by side.
const Pair: React.FC<{n: number; title: string; name: string; text?: (active: Model | null) => React.ReactNode; size?: number}> = ({n, title, name, text, size}) => {
  const frame = useCurrentFrame();
  const h = useClip('heygen', name);
  const g = useClip('gemini', name);
  const active: Model | null = frame >= g.at - 6 ? 'gemini' : frame >= h.at - 6 ? 'heygen' : null;
  return (
    <AbsoluteFill>
      <TestCard n={n} title={title} out={h.at - 10} />
      <Enter at={h.at - 8} preset="rise">
        <AbsoluteFill>
          <SectionTag eyebrow={`Test ${n} of 12`} title={title} />
          <div style={{position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36}}>
            <div style={{width: 1600, boxSizing: 'border-box', padding: '34px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
              <div style={bodyText(size)}>{text ? text(active) : (h.clip.input as string)}</div>
            </div>
            <Row gap={40} align="stretch">
              <ModelPanel p={h} other={g} width={780} />
              <ModelPanel p={g} other={h} width={780} />
            </Row>
          </div>
        </AbsoluteFill>
      </Enter>
    </AbsoluteFill>
  );
};

// ---------- 1. Intro ----------

const Intro: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={0} preset="pop"><Logo name="heygen" size={150} /></Enter>
        <Enter at={cue('text-to-speech')} preset="fade"><Eyebrow>New text-to-speech model</Eyebrow></Enter>
        <Enter at={cue('heygen voice')} preset="rise">
          <Headline size={type.hero + 24}>
            HeyGen <Accent>Voice</Accent>
          </Headline>
        </Enter>
        <Enter at={cue('openrouter')} preset="rise">
          <Row gap={22} style={{padding: '18px 32px', borderRadius: radius.tile, background: color.code, border: `1px solid ${color.tileLine}`}}>
            <Logo name="openrouter" size={44} />
            <Mono size={type.body}>
              <span style={{color: color.green}}>POST</span> openrouter.ai/api/v1/audio/speech
            </Mono>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const VersionCard: React.FC<{name: string; id: string; at: number; children?: React.ReactNode}> = ({name, id, at, children}) => (
  <Enter at={at} preset="rise">
    <div style={{width: 680, boxSizing: 'border-box', padding: '40px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 20}}>
      <Row gap={18}>
        <Logo name="heygen" size={56} />
        <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: color.ink, letterSpacing: '-0.02em'}}>{name}</div>
      </Row>
      <Mono tone={color.inkMute}>{id}</Mono>
      <Row gap={14} style={{minHeight: 52}}>{children}</Row>
    </div>
  </Enter>
);

const Versions: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Enter at={0} preset="fade"><Eyebrow>Two versions</Eyebrow></Enter>
        <Row gap={44} align="stretch">
          <VersionCard name="HeyGen Voice" id="heygen/heygen-voice-1" at={cue('normal version')} />
          <VersionCard name="HeyGen Voice Turbo" id="heygen/heygen-voice-1-turbo" at={cue('turbo version')}>
            <Enter at={cue('way faster')} preset="pop"><Pill variant="blue" icon="bolt" size={type.label}>Faster</Pill></Enter>
            <Enter at={cue('cheaper')} preset="pop"><Pill variant="green" size={type.label}>Cheaper</Pill></Enter>
          </VersionCard>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// The spec sheet: each row appears as it's said, the newest one lit.
const Specs: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const rows = [
    {k: 'Voices', v: '10 built in', at: cue('10 voices')},
    {k: 'Languages', v: '39', at: cue('39 languages')},
    {k: 'Voice cloning', v: 'Your own clones, with a HeyGen key', at: cue('clone voice')},
    {k: 'Price', v: '$15 per 1M characters', at: cue('15')},
    {k: 'Turbo price', v: '$4 per 1M characters', at: cue('4 on the turbo')},
  ];
  const active = rows.reduce((a, r, i) => (frame >= r.at ? i : a), -1);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Row gap={18}>
            <Logo name="heygen" size={60} />
            <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.title, color: color.paper, letterSpacing: '-0.02em'}}>HeyGen Voice</div>
          </Row>
        </Enter>
        <Enter at={0} preset="rise">
          <div style={{width: 1180, boxSizing: 'border-box', padding: '20px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
            {rows.map((r, i) => (
              <div key={r.k} style={{display: 'flex', alignItems: 'center', gap: 30, padding: '24px 0', borderTop: i ? `1px solid ${color.cardLine}` : 'none', opacity: tw(frame, r.at, r.at + 8)}}>
                <div style={{width: 6, alignSelf: 'stretch', borderRadius: 3, background: active === i ? color.blue : 'transparent'}} />
                <div style={{width: 300, fontFamily: font.sans, fontSize: type.body, color: active === i ? color.blue : color.inkMute}}>{r.k}</div>
                <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>{r.v}</div>
              </div>
            ))}
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Matchup: React.FC = () => {
  const cue = useCue();
  const Side: React.FC<{logo: string; name: string; id: string}> = ({logo, name, id}) => (
    <div style={{width: 620, boxSizing: 'border-box', padding: '44px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
      <Logo name={logo} size={110} />
      <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: color.ink, letterSpacing: '-0.02em'}}>{name}</div>
      <Mono tone={color.inkMute}>{id}</Mono>
    </div>
  );
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Row gap={50}>
          <Enter at={0} preset="rise"><Side logo="heygen" name="HeyGen Voice 1" id="heygen/heygen-voice-1" /></Enter>
          <Enter at={cue('against it')} preset="pop">
            <span style={{fontFamily: font.serif, fontStyle: 'italic', fontSize: type.hero, color: color.sky}}>vs</span>
          </Enter>
          <Enter at={cue("gemini's")} preset="rise"><Side logo="gemini" name="Gemini 3.8 Flash TTS" id="google/gemini-3.8-flash-tts" /></Enter>
        </Row>
        <Enter at={cue('pretty good')} preset="pop"><Pill variant="white" icon="check" size={type.label + 2}>Reviewed in my last video</Pill></Enter>
      </Center>
    </AbsoluteFill>
  );
};

// HeyGen and Gemini on paper. Each row appears as it's talked about; the better side of a row turns green.
const OnPaper: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const H = TOTAL.heygen, G = TOTAL.gemini;
  const rows: {k: string; h: string; g: string; win?: Model; at: number}[] = [
    {k: 'Price', h: '$15 / 1M characters', g: '$0.50 in + $9 out / 1M tokens', at: cue('the price ends')},
    {k: 'Cost per minute of audio', h: `${(H.perMin * 100).toFixed(2)}¢`, g: `${(G.perMin * 100).toFixed(2)}¢`, at: cue('1 cent')},
    {k: 'Speed vs real time', h: `${H.speed.toFixed(1)}×`, g: `${G.speed.toFixed(1)}×`, win: 'heygen', at: cue('faster though')},
    {k: 'Voices', h: '10', g: '30', win: 'gemini', at: cue('more voices')},
    {k: 'Style prompt', h: 'No', g: 'Yes', win: 'gemini', at: cue('describe how')},
    {k: 'Emotion tags', h: 'Reads them aloud', g: 'Yes', win: 'gemini', at: cue("doesn't")},
  ];
  const active = rows.reduce((a, r, i) => (frame >= r.at ? i : a), -1);
  const cell = (win: boolean): React.CSSProperties => ({
    width: 500, fontFamily: font.sans, fontSize: type.body, fontWeight: weight.medium, color: win ? color.green : color.ink,
  });
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={30}>
        <Enter at={0} preset="fade"><Eyebrow>On paper</Eyebrow></Enter>
        <Enter at={0} preset="rise">
          <div style={{width: 1560, boxSizing: 'border-box', padding: '20px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 30, padding: '18px 0 18px 36px'}}>
              <div style={{width: 420}} />
              {(['heygen', 'gemini'] as const).map((m) => (
                <Row key={m} gap={14} style={{width: 500}}>
                  <Logo name={MODEL[m].logo} size={40} />
                  <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>{MODEL[m].name}</span>
                </Row>
              ))}
            </div>
            {rows.map((r, i) => (
              <div key={r.k} style={{display: 'flex', alignItems: 'center', gap: 30, padding: '20px 0', borderTop: `1px solid ${color.cardLine}`, opacity: tw(frame, r.at, r.at + 8)}}>
                <div style={{width: 6, alignSelf: 'stretch', borderRadius: 3, background: active === i ? color.blue : 'transparent'}} />
                <div style={{width: 420, fontFamily: font.sans, fontSize: type.body, color: active === i ? color.blue : color.inkMute}}>{r.k}</div>
                <div style={cell(r.win === 'heygen')}>{r.h}</div>
                <div style={cell(r.win === 'gemini')}>{r.g}</div>
              </div>
            ))}
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// How the tests work: same text into both, HeyGen first, then Gemini, each showing cost and time.
const HowTests: React.FC = () => {
  const cue = useCue();
  const Step: React.FC<{n: number; m: Model; at: number}> = ({n, m, at}) => (
    <Enter at={at} preset="rise">
      <div style={{width: 560, boxSizing: 'border-box', padding: '34px 38px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 22}}>
        <Row gap={16}>
          <div style={{width: 48, height: 48, borderRadius: 24, background: color.blue, color: color.cardTop, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.label}}>{n}</div>
          <Logo name={MODEL[m].logo} size={44} />
          <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>{MODEL[m].name}</span>
        </Row>
        <Row gap={12}>
          <Enter at={cue('each clip costs')} preset="pop"><Pill variant="green" size={type.label}>Cost</Pill></Enter>
          <Enter at={cue('how long')} preset="pop"><Pill variant="ghost" icon="clock" size={type.label} style={{color: color.inkSoft}}>Time to make</Pill></Enter>
        </Row>
      </div>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={56}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Same <Accent>text</Accent>, closest voice on each side
          </Headline>
        </Enter>
        <Row gap={36}>
          <Step n={1} m="heygen" at={cue('heygen plays first')} />
          <Enter at={cue('then gemini')} preset="fade"><Icon name="arrowRight" size={56} color={color.paperSoft} /></Enter>
          <Step n={2} m="gemini" at={cue('then gemini')} />
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const Decide: React.FC = () => (
  <AbsoluteFill>
    <FocusShade />
    <Center>
      <Enter at={0} preset="rise">
        <Headline size={type.hero}>
          Listen, and <Accent>decide</Accent> for yourself
        </Headline>
      </Enter>
    </Center>
  </AbsoluteFill>
);

// ---------- 2. Tests ----------

// The technical test, with the hard parts (addresses, versions, dates, prices) set in mono.
const HARD = ['docker compose up', '127.0.0.1:8080/admin', 'Postgres 17.2', '14/11/2026', '$19.99', '0.7 cents', '10k'];
const technicalText = () => {
  const text = clipOf('heygen', '04-technical').input as string;
  const re = new RegExp(`(${HARD.map((h) => h.replace(/[.$/]/g, '\\$&')).join('|')})`);
  return text.split(re).map((p, i) =>
    HARD.includes(p) ? (
      <span key={i} style={{fontFamily: font.mono, fontSize: type.body - 4, color: color.blue, background: color.blueSoft, borderRadius: 8, padding: '0 8px'}}>{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
};

// Which turn of a dialogue clip is playing: segments are turn start times (s) inside the clip.
const segmentAt = (frame: number, p: Playing) =>
  frame < p.at || frame >= p.end ? -1 : (p.clip.segments ?? []).reduce((a, s, i) => (frame >= p.at + s * 30 ? i : a), -1);

const Dialogue: React.FC = () => {
  const frame = useCurrentFrame();
  const h = useClip('heygen', '11-dialogue');
  const g = useClip('gemini', '11-dialogue');
  const turn = Math.max(segmentAt(frame, h), segmentAt(frame, g));
  const turns = h.clip.input as Turn[];
  return (
    <Pair
      n={11}
      title="Two friends talking"
      name="11-dialogue"
      text={(active) => (
        <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          {turns.map((t, i) => {
            const first = t.heygen === turns[0].heygen;
            const voice = active === 'gemini' ? t.gemini : t.heygen;
            return (
              <div key={i} style={{display: 'flex', gap: 24, alignItems: 'baseline', ...bodyText(type.body - 4), color: turn === -1 || turn === i ? color.ink : color.inkFaint}}>
                <span style={{width: 170, flexShrink: 0, fontSize: type.label, color: first ? color.blue : color.green}}>{voice}</span>
                <span>{t.text}</span>
              </div>
            );
          })}
        </div>
      )}
    />
  );
};

// Eight languages: one card, then each language's pair with a list showing where we are.
const LANGS = [
  {label: 'Spanish', key: 'spanish'},
  {label: 'French', key: 'french'},
  {label: 'German', key: 'german'},
  {label: 'Italian', key: 'italian'},
  {label: 'Japanese', key: 'japanese', fontFamily: 'Noto Sans JP'},
  {label: 'Korean', key: 'korean', fontFamily: 'Noto Sans KR'},
  {label: 'Mandarin', key: 'mandarin', fontFamily: 'Noto Sans SC'},
  {label: 'Hindi', key: 'hindi', fontFamily: 'Noto Sans Devanagari'},
];
const Languages: React.FC = () => {
  const frame = useCurrentFrame();
  const ls = LANGS.map((l) => ({...l, h: useClip('heygen', '12-languages-' + l.key), g: useClip('gemini', '12-languages-' + l.key)}));
  const cur = ls.reduce((a, l, i) => (frame >= l.h.at - 10 ? i : a), 0);
  const l = ls[cur];
  return (
    <AbsoluteFill>
      <TestCard n={12} title="Eight languages" out={ls[0].h.at - 10} />
      <Enter at={ls[0].h.at - 8} preset="rise">
        <AbsoluteFill>
          <SectionTag eyebrow="Test 12 of 12" title="Same message, eight languages" />
          <div style={{position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 36}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {ls.map((x, i) => {
                const on = i === cur;
                return (
                  <div key={x.key} style={{width: 230, boxSizing: 'border-box', padding: '12px 22px', borderRadius: radius.chip, background: on ? color.blue : color.tile, border: `1px solid ${color.tileLine}`, fontFamily: font.sans, fontSize: type.label + 2, color: on ? color.cardTop : i < cur ? color.paperSoft : color.paperMute, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    {x.label}
                    {i < cur ? <Icon name="check" size={24} color={color.paperSoft} /> : null}
                  </div>
                );
              })}
            </div>
            <Enter key={cur} at={cur === 0 ? 0 : l.h.at - 10} preset="fade">
              <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                <div style={{width: 1300, boxSizing: 'border-box', padding: '30px 40px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
                  <div style={{...bodyText(type.body - 2), fontFamily: l.fontFamily ? `${font.sans}, '${l.fontFamily}'` : font.sans}}>{l.h.clip.input as string}</div>
                </div>
                <Row gap={30} align="stretch">
                  <ModelPanel p={l.h} other={l.g} width={635} />
                  <ModelPanel p={l.g} other={l.h} width={635} />
                </Row>
              </div>
            </Enter>
          </div>
        </AbsoluteFill>
      </Enter>
    </AbsoluteFill>
  );
};

// ---------- 3. Outro ----------

// What every clip in the video cost on each side, counting up as it's said.
const Totals: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const Side: React.FC<{m: Model; at: number}> = ({m, at}) => {
    const t = TOTAL[m];
    const v = t.cost * tw(frame, at, at + 30);
    return (
      <Enter at={at} preset="rise">
        <div style={{width: 600, boxSizing: 'border-box', padding: '40px 44px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 18}}>
          <Row gap={16}>
            <Logo name={MODEL[m].logo} size={48} />
            <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>{MODEL[m].name}</span>
          </Row>
          <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.hero + 20, color: color.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums'}}>{`$${v.toFixed(3)}`}</div>
          <div style={{fontFamily: font.sans, fontSize: type.label, color: color.inkMute}}>{`for all ${t.count} clips · ${(t.perMin * 100).toFixed(2)}¢ per minute`}</div>
        </div>
      </Enter>
    );
  };
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Enter at={cue('making every clip')} preset="fade"><Eyebrow>Every clip in this video</Eyebrow></Enter>
        <Row gap={44}>
          <Side m="heygen" at={cue('six cents')} />
          <Side m="gemini" at={cue('seven on gemini')} />
        </Row>
        <Enter at={cue('pretty much the same')} preset="pop"><Pill variant="white" size={type.body - 2}>Pretty much the same price</Pill></Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Verdict: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={0} preset="fade"><Eyebrow>My take</Eyebrow></Enter>
        <Enter at={cue('i think this')} preset="rise">
          <Headline size={type.hero} maxWidth={1400}>
            A very <Accent>good</Accent> first model
          </Headline>
        </Enter>
        <Enter at={cue('first model')} preset="pop">
          <Row gap={16}>
            <Logo name="heygen" size={52} />
            <span style={{fontFamily: font.sans, fontSize: type.body, color: color.paperSoft}}>HeyGen’s first text-to-speech model</span>
          </Row>
        </Enter>
        <Enter at={cue('almost on par')} preset="pop">
          <Pill variant="white" size={type.body - 2}>Almost on par with Gemini</Pill>
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
        <Enter at={0} preset="pop">
          <Row gap={30}>
            <Logo name="heygen" size={100} />
            <Logo name="gemini" size={100} />
          </Row>
        </Enter>
        <Enter at={0} preset="rise">
          <Headline size={type.title + 8} maxWidth={1300}>
            Which one would <Accent>you</Accent> use?
          </Headline>
        </Enter>
        <Enter at={cue('which test')} preset="rise">
          <Pill variant="white" icon="question" size={type.body - 2}>Which test gave it away?</Pill>
        </Enter>
      </Center>
      <CTA text="Tell me in the comments" at={cue('comments')} icon="arrowRight" />
    </AbsoluteFill>
  );
};

const TESTS: [string, string][] = [
  ['01-narration', 'Audiobook narration'],
  ['02-news', 'News anchor'],
  ['03-casual', 'Telling a friend a story'],
  ['04-technical', 'Commands, prices and versions'],
  ['05-tongue-twister', 'Tongue twister'],
  ['06-sad', 'Grief'],
  ['07-whisper', 'Whisper'],
  ['08-laugh', 'Laughing while talking'],
  ['09-angry', 'Angry neighbour'],
  ['10-hype', 'Race commentator'],
];

export const HeygenTtsVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('heygen-tts/master.mp3')} />
    <Track>
      <Scene from="this is heygen"><Intro /></Scene>
      <Scene from="there's the normal version"><Versions /></Scene>
      <Scene from="it comes with"><Specs /></Scene>
      <Scene from="i already made a video"><Matchup /></Scene>
      <Scene from="so on paper"><OnPaper /></Scene>
      <Scene from="so for the tests"><HowTests /></Scene>
      <Scene from="i'm not going to say much"><Decide /></Scene>
      {TESTS.map(([name, title], i) => (
        <Scene key={name} from={'test-' + name}>
          <Pair
            n={i + 1}
            title={title}
            name={name}
            size={name === '05-tongue-twister' ? type.heading : undefined}
            text={name === '04-technical' ? technicalText : undefined}
          />
        </Scene>
      ))}
      <Scene from="test-11-dialogue"><Dialogue /></Scene>
      <Scene from="test-12-languages"><Languages /></Scene>
      <Scene from="so that's heygen voice"><Totals /></Scene>
      <Scene from="and now for my pov"><Verdict /></Scene>
      <Scene from="so let me know"><AskViewers /></Scene>
    </Track>
  </TranscriptProvider>
);
