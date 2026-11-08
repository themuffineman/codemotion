import React from 'react';
import {AbsoluteFill, Audio, Img, Loop, OffthreadVideo, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, Center, Enter, FocusShade, Headline, Label, Logo, Pill, Scene, Stage, StepTimeline, Track, TranscriptProvider, Window,
  color, font, radius, shadow, stagger, type, useCue, useTween,
} from '../../kit';
import {drawProgress} from '../hello/timing';
import transcript from './transcript.json';
import measured from '../../../public/hello/analysis/measurements.json';

// "Recreating the Apple hello, frame by frame": the four ideas that made the recreation work.
// Footage: the original clip (public/hello/original.mp4, 1280x720 30 fps) and our renders of the HelloRecreation
// (flat 2D) and Hello3D compositions (public/hello/recreation2d.mp4, recreation3d.mp4, 1920x1080 30 fps).
// Measurements (public/hello/analysis): which frame each pixel first lights up, the haze around the word per frame,
// the ascender tops tracked through the turn, and the failed single-rotation depth fit.
// Voice: public/audio/hello-voice.wav (edited from the raw take with work/hello/edit.py).

export const helloVideoTranscript = transcript;

const ORIG = 'hello/original.mp4';
const REC3D = 'hello/recreation3d.mp4';
const REC2D = 'hello/recreation2d.mp4';
const still = (name: string) => staticFile(`hello/stills/${name}.jpg`);

// ---------- Helpers ----------

const Row: React.FC<{children: React.ReactNode; gap?: number; align?: React.CSSProperties['alignItems']}> = ({children, gap = 40, align = 'center'}) => (
  <div style={{display: 'flex', alignItems: align, gap}}>{children}</div>
);
const Stack: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 28}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap}}>{children}</div>
);
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paperSoft, size = type.label}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);

/** A clip of a 30 fps video playing from `fromFrame`, slowed or sped by `rate`, in a window. */
const Clip: React.FC<{src: string; title: string; width: number; fromFrame?: number; rate?: number; focus?: number; loop?: boolean}> = ({
  src, title, width, fromFrame = 0, rate = 1, focus = 0, loop,
}) => {
  const video = <OffthreadVideo src={staticFile(src)} muted trimBefore={fromFrame} playbackRate={rate} style={{width, height: (width * 9) / 16, display: 'block'}} />;
  return (
    <Window title={title} width={width} height={(width * 9) / 16 + 52} focus={focus}>
      {/* the clips are 295 frames; loop them so a long scene never runs into black */}
      {loop ? <Loop durationInFrames={Math.floor((295 - fromFrame) / rate)} layout="none">{video}</Loop> : video}
    </Window>
  );
};

/** A still frame, optionally zoomed onto a point (x, y as 0..1 of the frame) by `zoom`. */
const Frame: React.FC<{src: string; width: number; zoom?: number; x?: number; y?: number; title?: string; focus?: number}> = ({
  src, width, zoom = 1, x = 0.5, y = 0.5, title, focus = 0,
}) => {
  const h = (width * 9) / 16;
  const img = (
    <div style={{width, height: h, overflow: 'hidden', position: 'relative', background: '#000'}}>
      <Img
        src={src}
        style={{position: 'absolute', width: width * zoom, height: h * zoom, left: width / 2 - x * width * zoom, top: h / 2 - y * h * zoom}}
      />
    </div>
  );
  return title ? (
    <Window title={title} width={width} height={h + 52} focus={focus}>
      {img}
    </Window>
  ) : (
    img
  );
};

/** A small number tag under a frame. */
const Tag: React.FC<{children: React.ReactNode; tone?: 'blue' | 'neutral' | 'green'}> = ({children, tone = 'neutral'}) => (
  <Pill variant={tone} size={type.label}>
    {children}
  </Pill>
);

// ---------- 1. Hook ----------

const Hook: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={36}>
        <Enter at={0} preset="pop">
          <Clip src={ORIG} title="Original · posted by Abraham John on Twitter" width={1180} loop />
        </Enter>
        <Enter at={cue('recreate')} preset="rise">
          <Row gap={18}>
            <Label size={type.body} tone={color.paperSoft}>
              Rebuilt from scratch in
            </Label>
            <Logo name="remotion" size={52} />
            <Label size={type.body}>Remotion</Label>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 2. Original vs ours ----------

const SideBySide: React.FC<{fromFrame?: number; rate?: number; titleB?: string}> = ({fromFrame = 0, rate = 1, titleB = 'Recreation'}) => {
  return (
    <AbsoluteFill>
      <Center>
        <Row gap={48}>
          <Enter at={0} preset="slideRight">
            <Clip src={ORIG} title="Original" width={840} fromFrame={fromFrame} rate={rate} />
          </Enter>
          <Enter at={4} preset="slideLeft">
            <Clip src={REC3D} title={titleB} width={840} fromFrame={fromFrame} rate={rate} />
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const Harder: React.FC = () => <SideBySide />;

// ---------- 3. The four things ----------

const FourThings: React.FC = () => {
  const cue = useCue();
  const at = cue('four things');
  const steps = ['Look for repeats', 'Measure the glow', 'Go 3D', 'The turn'].map((title, i) => ({n: i + 1, title, at: stagger(at, i, 6)}));
  return (
    <AbsoluteFill>
      <Center gap={60}>
        <Enter at={at - 6}>
          <Headline size={type.title}>
            Four things that made it <Accent>work</Accent>
          </Headline>
        </Enter>
        <StepTimeline steps={steps} cardW={360} />
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 4. All 295 frames ----------

/** Real frames of the original, every 8th one, scrolling past with their frame numbers. */
const Filmstrip: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const frames = Array.from({length: 37}, (_, i) => i * 8);
  const w = 300;
  const scroll = interpolate(frame, [cue('pull'), cue('compare') + 40], [0, -(frames.length * (w + 18) - 1680)], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Center gap={54}>
        <Enter at={cue('295')} preset="pop">
          <Headline size={type.hero}>
            295 <Accent>frames</Accent>
          </Headline>
        </Enter>
        <div style={{width: 1680, overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)'}}>
          <div style={{display: 'flex', gap: 18, transform: `translateX(${scroll}px)`}}>
            {frames.map((f, i) => (
              <Enter key={f} at={stagger(cue('pull'), i, 1)} preset="rise">
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
                  <div style={{borderRadius: radius.chip, overflow: 'hidden', boxShadow: shadow.tile, border: `1px solid ${color.tileLine}`}}>
                    <Frame src={still(`strip-${f}`)} width={w} />
                  </div>
                  <Mono>{f}</Mono>
                </div>
              </Enter>
            ))}
          </div>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 5. Matching pairs ----------

const Pair: React.FC<{a: number; b: number; at: number; matchAt: number}> = ({a, b, at, matchAt}) => {
  const m = useTween(matchAt, matchAt + 12);
  return (
    <Enter at={at} preset="rise">
      <Row gap={22}>
        {[a, b].map((f, i) => (
          <Stack key={f} gap={16}>
            <div style={{borderRadius: radius.chip, overflow: 'hidden', boxShadow: i === 1 ? `0 0 0 ${4 * m}px ${color.green}, ${shadow.tile}` : shadow.tile}}>
              <Frame src={still(`orig-${f}`)} width={400} />
            </div>
            <Tag tone={i === 1 && m > 0.5 ? 'green' : 'neutral'}>frame {f}</Tag>
          </Stack>
        ))}
        <div style={{position: 'absolute'}} />
      </Row>
    </Enter>
  );
};

const Matches: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={70}>
        <Row gap={90}>
          <Pair a={40} b={252} at={0} matchAt={cue('252')} />
          <Pair a={120} b={172} at={cue('frame 120')} matchAt={cue('172')} />
        </Row>
        <Enter at={cue('252')} preset="fade">
          <Label size={type.body} tone={color.paperSoft}>
            Same picture, pixel for pixel
          </Label>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 6. Palindrome ----------

/** The clip as a bar: frames 0-146 play forward, 146-292 are the same frames backwards. */
const Palindrome: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const W = 1400;
  const fwd = useTween(cue('forward'), cue('forward') + 24);
  const back = useTween(cue('backwards'), cue('backwards') + 24);
  const half = useTween(cue('half'), cue('half') + 14);
  const marker = (x: number, label: string) => (
    <div style={{position: 'absolute', left: x, top: 78, transform: 'translateX(-50%)'}}>
      <Mono size={type.label}>{label}</Mono>
    </div>
  );
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={90}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            The whole video is a <Accent>palindrome</Accent>
          </Headline>
        </Enter>
        <div style={{position: 'relative', width: W, height: 130}}>
          <div style={{position: 'absolute', top: 30, width: W, height: 26, borderRadius: radius.pill, background: color.tile, border: `1px solid ${color.tileLine}`}} />
          {/* forward half */}
          <div style={{position: 'absolute', top: 30, width: (W / 2) * fwd, height: 26, borderRadius: radius.pill, background: color.blue}} />
          {/* backward half, filling from the middle outward */}
          <div
            style={{
              position: 'absolute', top: 30, left: W / 2, width: (W / 2) * back, height: 26, borderRadius: radius.pill,
              background: color.blue, opacity: 0.55 * (1 - half * 0.75),
            }}
          />
          {marker(0, '0')}
          {marker(W / 2, '146')}
          {marker(W, '292')}
          <Enter at={cue('forward')} preset="fade">
            <div style={{position: 'absolute', left: W / 4, top: -30, transform: 'translateX(-50%)'}}>
              <Label size={type.label}>plays forward →</Label>
            </div>
          </Enter>
          <Enter at={cue('backwards')} preset="fade">
            <div style={{position: 'absolute', left: (3 * W) / 4, top: -30, transform: 'translateX(-50%)', opacity: 1 - half * 0.6}}>
              <Label size={type.label} tone={color.paperSoft}>
                ← same frames, backwards
              </Label>
            </div>
          </Enter>
          {half > 0 ? (
            <div style={{position: 'absolute', left: W / 2 - 4, top: 14, width: 8, height: 58, borderRadius: 4, background: color.paper, opacity: 0.4 + 0.4 * pulse}} />
          ) : null}
        </div>
        <Enter at={cue('half')} preset="pop">
          <Row gap={20}>
            <Pill variant="blue">Built: frames 0–146</Pill>
            <Pill variant="ghost">Free: the same, reversed</Pill>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 7. Lesson 1 ----------

const LessonRepeats: React.FC = () => (
  <AbsoluteFill>
    <FocusShade />
    <Center>
      <Enter at={0} preset="rise">
        <Headline size={type.hero - 6} sub="before you build anything">
          Look for <Accent>repeats</Accent>
        </Headline>
      </Enter>
    </Center>
  </AbsoluteFill>
);

// ---------- 8. Every pixel, coloured by when it lights up ----------

const Appearance: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={40}>
        <Enter at={0} preset="pop">
          <Window title="Each pixel coloured by the frame it first lights up" width={1300} height={1300 * (350 / 950) + 52}>
            <Img src={staticFile('hello/analysis/appear.png')} style={{width: 1300, height: 1300 * (350 / 950), display: 'block', background: '#000'}} />
          </Window>
        </Enter>
        <Enter at={cue('colored') + 10} preset="fade">
          <Row gap={22}>
            <Mono>early</Mono>
            <div style={{width: 420, height: 18, borderRadius: radius.pill, background: 'linear-gradient(90deg, #30123b, #4686fb, #1ae4b6, #a2fc3c, #fabb39, #e4460a)'}} />
            <Mono>late</Mono>
          </Row>
        </Enter>
        <Enter at={cue('one continuous stroke')} preset="pop">
          <Pill variant="blue" size={type.body}>
            One continuous stroke
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 9. Draw speed ----------

/** A measured curve drawn as it is spoken, on a dark tile, with labelled marks. */
const Curve: React.FC<{
  values: (x: number) => number; x0: number; x1: number; y1: number; at: number; dur: number; xLabel: string; yLabel: string;
  marks?: {x: number; label: string; at: number; tone?: string}[]; width?: number; height?: number; playhead?: boolean;
}> = ({values, x0, x1, y1, at, dur, xLabel, yLabel, marks = [], width = 1300, height = 560, playhead}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pad = {l: 90, r: 40, t: 40, b: 80};
  const X = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const Y = (y: number) => height - pad.b - (y / y1) * (height - pad.t - pad.b);
  const xEnd = x0 + (x1 - x0) * p;
  const pts: string[] = [];
  for (let x = x0; x <= xEnd; x += (x1 - x0) / 300) pts.push(`${X(x).toFixed(1)},${Y(values(x)).toFixed(1)}`);
  return (
    <div style={{width, height, position: 'relative', background: color.tile, borderRadius: radius.card, border: `1px solid ${color.tileLine}`, boxShadow: shadow.tile}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad.l} x2={width - pad.r} y1={Y(g * y1)} y2={Y(g * y1)} stroke={color.tileLine} strokeWidth={2} />
        ))}
        <line x1={pad.l} x2={width - pad.r} y1={Y(0)} y2={Y(0)} stroke={color.paperMute} strokeWidth={2} />
        <polyline points={pts.join(' ')} fill="none" stroke={color.blue} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
        {playhead && pts.length ? <circle cx={X(xEnd)} cy={Y(values(xEnd))} r={10} fill={color.paper} /> : null}
        {marks.map((m) => {
          const t = interpolate(frame, [m.at, m.at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return t > 0 ? (
            <g key={m.label} opacity={t}>
              <line x1={X(m.x)} x2={X(m.x)} y1={pad.t} y2={Y(0)} stroke={m.tone ?? color.paperSoft} strokeWidth={3} strokeDasharray="8 10" />
            </g>
          ) : null;
        })}
      </svg>
      {marks.map((m) => (
        <Enter key={m.label} at={m.at} preset="fade">
          <div style={{position: 'absolute', left: X(m.x) + 14, top: pad.t + 6}}>
            <Label size={type.label} tone={m.tone ? color.paper : color.paperSoft}>
              {m.label}
            </Label>
          </div>
        </Enter>
      ))}
      <div style={{position: 'absolute', left: pad.l, bottom: 22}}>
        <Mono>{xLabel}</Mono>
      </div>
      <div style={{position: 'absolute', left: 24, top: 14}}>
        <Mono>{yLabel}</Mono>
      </div>
    </div>
  );
};

const DrawSpeed: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={44}>
        <Enter at={0} preset="rise">
          <Headline size={type.title - 6}>
            Slow through the h, then <Accent>thrown</Accent>
          </Headline>
        </Enter>
        <Enter at={0} preset="rise">
          <Curve
            values={(x) => drawProgress(x)}
            x0={0}
            x1={46}
            y1={1}
            at={4}
            dur={cue('rest of the word', {edge: 'end'}) - 4}
            xLabel="frame"
            yLabel="share of the word drawn"
            marks={[{x: 29, label: 'h done', at: cue('h')}, {x: 40, label: 'hello done', at: cue('thrown')}]}
            height={520}
            playhead
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 10. The glow curve ----------

const haze = measured.haze as number[];
const hazeAt = (x: number) => {
  const i = Math.max(0, Math.min(haze.length - 2, Math.floor(x)));
  return haze[i] + (haze[i + 1] - haze[i]) * (x - i);
};

const GlowCurve: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={44}>
        <Enter at={0} preset="rise">
          <Headline size={type.title - 6}>
            The glow isn't <Accent>constant</Accent>
          </Headline>
        </Enter>
        <Row gap={36} align="flex-start">
          <Enter at={cue('measured')} preset="rise">
            <Curve
              values={hazeAt}
              x0={0}
              x1={100}
              y1={90}
              at={cue('measured')}
              dur={cue('settles down', {edge: 'end'}) - cue('measured')}
              xLabel="frame"
              yLabel="light around the word"
              marks={[
                {x: 40, label: 'peak, frame 40', at: cue('peaks'), tone: color.green},
                {x: 55, label: 'settled', at: cue('settles')},
              ]}
              width={1100}
              height={520}
              playhead
            />
          </Enter>
          <Enter at={cue('measured') + 6} preset="slideLeft">
            <Stack gap={18}>
              <Clip src={ORIG} title="Original" width={560} fromFrame={0} rate={0.34} />
              <Label size={type.label} tone={color.paperSoft}>
                slowed down
              </Label>
            </Stack>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 11. Missed the glow ----------

const MissedGlow: React.FC = () => {
  const cue = useCue();
  const after = useTween(cue('copied'), cue('copied') + 14);
  return (
    <AbsoluteFill>
      <Center gap={50}>
        <Row gap={48}>
          <Enter at={0} preset="slideRight">
            <Stack gap={20}>
              <Frame src={still('flat-40')} width={820} title="First version, frame 40" focus={0} />
              <Pill variant="ghost">looked flat</Pill>
            </Stack>
          </Enter>
          <Enter at={cue('copied')} preset="slideLeft">
            <Stack gap={20}>
              <Frame src={still('glass-40')} width={820} title="With the measured glow, frame 40" focus={after} />
              <Pill variant="green">coming to life</Pill>
            </Stack>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 12. Flat 2D vs the original's ends ----------

const Ends: React.FC = () => {
  const cue = useCue();
  const orig = useTween(cue('in the original'), cue('in the original') + 14);
  return (
    <AbsoluteFill>
      <Center gap={50}>
        <Row gap={48}>
          <Enter at={0} preset="slideRight">
            <Stack gap={20}>
              <Frame src={still('flat-80')} width={820} zoom={4.2} x={0.235} y={0.6} title="Flat 2D: the left end, close up" />
              <Row gap={16}>
                <Enter at={cue('cut off')} preset="pop">
                  <Pill variant="ghost">no round cap</Pill>
                </Enter>
                <Enter at={cue('catch the light')} preset="pop">
                  <Pill variant="ghost">no light on the glass</Pill>
                </Enter>
              </Row>
            </Stack>
          </Enter>
          <Enter at={cue('in the original')} preset="slideLeft">
            <Stack gap={20}>
              <Frame src={still('orig-80')} width={820} zoom={4.2} x={0.235} y={0.6} title="Original: the same end" focus={orig} />
              <Row gap={16}>
                <Enter at={cue('round caps')} preset="pop">
                  <Pill variant="blue">round cap</Pill>
                </Enter>
                <Enter at={cue('warp')} preset="pop">
                  <Pill variant="blue">light wraps the tube</Pill>
                </Enter>
              </Row>
            </Stack>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 13. Rebuilt in 3D ----------

const Rebuilt: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  // push in from the whole word to the round end
  const z = interpolate(frame, [cue('round glass ends'), cue('round glass ends') + 30], [1, 3.2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const back = interpolate(frame, [cue('actual glass'), cue('actual glass') + 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const zoom = z + (1 - z) * back;
  return (
    <AbsoluteFill>
      <Center gap={40}>
        <Enter at={0} preset="pop">
          <Frame src={still('glass-80')} width={1300} zoom={zoom} x={0.24 + (0.5 - 0.24) * (1 - (zoom - 1) / 2.2)} y={0.6} title="Rebuilt as a real 3D tube" />
        </Enter>
        <Row gap={18}>
          <Enter at={cue('round glass ends')} preset="pop">
            <Pill variant="blue">round glass ends</Pill>
          </Enter>
          <Enter at={cue('perspective')} preset="pop">
            <Pill variant="blue">real perspective</Pill>
          </Enter>
          <Enter at={cue('actual glass')} preset="pop">
            <Pill variant="green">reads as glass</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 14. The turn, frame by frame ----------

/** The original's turn, frames 108-146, stepped one frame at a time with the frame number. */
const TurnSteps: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const start = 8;
  const f = Math.min(146, 108 + Math.floor(Math.max(0, frame - start) / 3));
  return (
    <AbsoluteFill>
      <Center gap={36}>
        <Enter at={0} preset="pop">
          <div style={{position: 'relative'}}>
            <Window title="Original, one frame at a time" width={1180} height={(1180 * 9) / 16 + 52}>
              <OffthreadVideo src={staticFile(ORIG)} muted trimBefore={108} playbackRate={1 / 3} style={{width: 1180, height: (1180 * 9) / 16, display: 'block'}} />
            </Window>
            <div style={{position: 'absolute', right: 24, bottom: 22}}>
              <Pill variant="neutral">
                <span style={{fontFamily: font.mono}}>frame {f}</span>
              </Pill>
            </div>
          </div>
        </Enter>
        <Enter at={cue('half a second')} preset="pop">
          <Pill variant="blue" size={type.body}>
            hello → logo in about half a second
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 15. One rigid spin? ----------

const SpinGuess: React.FC = () => {
  const cue = useCue();
  const test = useTween(cue('tested'), cue('tested') + 14);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <div style={{opacity: 1 - test * 0.35, transform: `translateY(${-test * 10}px)`}}>
          <Enter at={0} preset="rise">
            <Headline size={type.title}>
              Does the whole word spin like a <Accent>sign?</Accent>
            </Headline>
          </Enter>
        </div>
        <Enter at={cue('tested')} preset="pop">
          <Stack gap={22}>
            <Window title="Best single rotation, with a depth for every point (white line)" width={1150} height={1150 * (720 / 1350) + 52}>
              <Img src={staticFile('hello/analysis/depth-fit.png')} style={{width: 1150, display: 'block'}} />
            </Window>
            <Enter at={cue("didn't fit")} preset="pop">
              <Pill variant="outline" icon="x" size={type.body}>
                It didn't fit
              </Pill>
            </Enter>
          </Stack>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 16. Tracking the letters ----------

const tops = measured.tops as Record<string, number[][]>;

/** The original's frames 104-121, slowed, with the tracked tops of h, l, l drawn on them. */
const Tracking: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const W = 1280;
  const k = W / 1280;
  const rate = 0.2;
  const src = Math.min(121, 104 + Math.max(0, frame) * rate);
  const pts = tops[String(Math.floor(src))] ?? [];
  const show = useTween(cue("l's"), cue("l's") + 10);
  const hShow = useTween(cue('h'), cue('h') + 10);
  const start = tops['104'];
  return (
    <AbsoluteFill>
      <Center gap={34}>
        <Enter at={0} preset="pop">
          <div style={{position: 'relative'}}>
            <Window title="Original, frames 104-121, slowed down" width={W} height={(W * 9) / 16 + 52}>
              <div style={{position: 'relative', width: W, height: (W * 9) / 16}}>
                <OffthreadVideo src={staticFile(ORIG)} muted trimBefore={104} playbackRate={rate} style={{width: W, height: (W * 9) / 16, display: 'block'}} />
                <svg width={W} height={(W * 9) / 16} style={{position: 'absolute', inset: 0}}>
                  {pts.map((p, i) => {
                    const isH = i === 0 && pts.length === 3;
                    const o = isH ? hShow : show;
                    const s = start[i];
                    return (
                      <g key={i} opacity={o}>
                        {isH && s ? <line x1={s[0] * k} y1={s[1] * k - 30} x2={p[0] * k} y2={p[1] * k - 30} stroke={color.red} strokeWidth={4} strokeDasharray="6 8" /> : null}
                        <circle cx={p[0] * k} cy={p[1] * k - 30} r={14} fill={isH ? color.red : color.blue} stroke={color.paper} strokeWidth={3} />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </Window>
          </div>
        </Enter>
        <Row gap={18}>
          <Enter at={cue("l's")} preset="pop">
            <Pill variant="blue">the l's stay still</Pill>
          </Enter>
          <Enter at={cue('h')} preset="pop">
            <Pill variant="outline">the h is already moving</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 17. Each letter on its own ----------

const OwnTurn: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={40}>
        <Row gap={48}>
          <Enter at={0} preset="slideRight">
            <Clip src={ORIG} title="Original, slowed down" width={840} fromFrame={108} rate={0.3} />
          </Enter>
          <Enter at={4} preset="slideLeft">
            <Clip src={REC3D} title="Recreation, slowed down" width={840} fromFrame={108} rate={0.3} />
          </Enter>
        </Row>
        <Row gap={18}>
          <Enter at={cue('on its own')} preset="pop">
            <Pill variant="blue">each letter turns on its own</Pill>
          </Enter>
          <Enter at={cue('stack')} preset="pop">
            <Pill variant="blue">then they stack</Pill>
          </Enter>
          <Enter at={cue('logo turns in')} preset="pop">
            <Pill variant="green">the logo turns in</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 18. The lessons ----------

const Lessons: React.FC = () => {
  const cue = useCue();
  // all four cards come in with "main lessons"; the focus moves to each one as it is spoken
  const said = [cue('number one'), cue('measure'), cue('obvious'), cue('last lesson')];
  const titles = ['Look for repeats', "Measure, don't guess", '3D if the original is 3D', 'Test against real frames'];
  const steps = titles.map((title, i) => ({n: i + 1, title, at: stagger(cue('main lessons'), i, 5)}));
  const frame = useCurrentFrame();
  const focus = said.reduce((f, at, i) => (frame >= at ? i : f), -1);
  return (
    <AbsoluteFill>
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            The main <Accent>lessons</Accent>
          </Headline>
        </Enter>
        <StepTimeline steps={steps} focus={focus} cardW={360} />
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 19. Outro ----------

const Outro: React.FC = () => (
  <AbsoluteFill>
    <Center>
      <Row gap={48}>
        <Enter at={0} preset="slideRight">
          <Clip src={ORIG} title="Original" width={840} fromFrame={60} />
        </Enter>
        <Enter at={4} preset="slideLeft">
          <Clip src={REC3D} title="Recreation" width={840} fromFrame={60} />
        </Enter>
      </Row>
    </Center>
  </AbsoluteFill>
);

export const HelloVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/hello-voice.wav')} />
    <Track>
      <Scene from="okay so this is the famous"><Hook /></Scene>
      <Scene from="so this animation is a lot harder"><Harder /></Scene>
      <Scene from="so here are four things"><FourThings /></Scene>
      <Scene from="first we pull out"><Filmstrip /></Scene>
      <Scene from="and we found out that frame"><Matches /></Scene>
      <Scene from="so the whole video is a palindrome"><Palindrome /></Scene>
      <Scene from="so the lesson here is"><LessonRepeats /></Scene>
      <Scene from="okay the next thing i did"><Appearance /></Scene>
      <Scene from="it's slow through the h"><DrawSpeed /></Scene>
      <Scene from="and the glow isn't constant"><GlowCurve /></Scene>
      <Scene from="my first version missed"><MissedGlow /></Scene>
      <Scene from="now my first version was flat"><Ends /></Scene>
      <Scene from="so i rebuilt it"><Rebuilt /></Scene>
      <Scene from="now the hardest part"><TurnSteps /></Scene>
      <Scene from="my guess was that"><SpinGuess /></Scene>
      <Scene from="and when we tracked the letters"><Tracking /></Scene>
      <Scene from="now each letter turns"><OwnTurn /></Scene>
      <Scene from="yeah and that's it"><Lessons /></Scene>
      <Scene from="thanks for watching" to="ciao"><Outro /></Scene>
    </Track>
  </TranscriptProvider>
);
