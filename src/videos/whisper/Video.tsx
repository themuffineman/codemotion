import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, AppIcon, CTA, Caption, Card, Center, CodeWindow, Compare, DocIcon, Enter, FocusShade, Headline, Label, ListCard,
  NodeBox, NodeChip, NodeTile, Pill, PillRow, Pipeline, Scene, SectionTag, Stage, StatCaption, Track, TranscriptProvider,
  color, font, radius, stagger, type, useCue, useTween,
} from '../../kit';
import transcript from './transcript.json';

// "Run Whisper in the browser": walks through the free subtitle tool in Sycamore
// (sycamore-mono: public/whisper/worker.js, lib/tools/engines/speech/{index,windows}.ts, copied to public/code/whisper).
// Voice: public/audio/whisper-voice.wav (retakes and long pauses cut out). One <Scene> per spoken beat.

export const whisperTranscript = transcript;

// ---------- Waveform: a row of loudness bars with a cut line ----------
// Shows why cutting every 30 s breaks words, and how cutting at the quietest spot fixes it.
// `cutAt` is the bar index where the cut line sits; `tone` colors the cut (red = bad cut, green = good cut).
const LEVELS = [
  0.3, 0.7, 0.9, 0.6, 0.8, 0.5, 0.2, 0.06, 0.05, 0.4, 0.8, 1, 0.7, 0.9, 0.6, 0.3, 0.05, 0.04, 0.06, 0.5, 0.9, 0.7, 1, 0.8,
  0.6, 0.9, 0.5, 0.3, 0.05, 0.04, 0.5, 0.8, 0.6, 0.9, 0.7, 0.4,
];
const Waveform: React.FC<{at: number; cutAt?: number; cutFrom?: number; cutStart?: number; tone?: string; flat?: boolean; width?: number}> = ({
  at,
  cutAt,
  cutFrom,
  cutStart = 0,
  tone = color.red,
  flat,
  width = 1200,
}) => {
  const frame = useCurrentFrame();
  const grow = useTween(at, at + 20);
  const bar = width / LEVELS.length;
  // the cut line slides from cutFrom to cutAt (when both are set) after cutStart
  const slide = useTween(cutStart, cutStart + 24);
  const cut = cutAt === undefined ? undefined : cutFrom === undefined ? cutAt : cutFrom + (cutAt - cutFrom) * slide;
  const cutO = interpolate(frame, [cutStart, cutStart + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'relative', width, height: 260, display: 'flex', alignItems: 'center'}}>
      {LEVELS.map((l, i) => (
        <div key={i} style={{width: bar, display: 'flex', justifyContent: 'center'}}>
          <div style={{width: bar * 0.55, height: Math.max(6, (flat ? 0.03 : l) * 240 * grow), borderRadius: radius.pill, background: color.paperSoft, opacity: 0.85}} />
        </div>
      ))}
      {cut !== undefined ? (
        <div style={{position: 'absolute', left: cut * bar + bar / 2 - 3, top: -20, bottom: -20, width: 6, borderRadius: 3, background: tone, opacity: cutO, boxShadow: `0 0 30px ${tone}`}} />
      ) : null}
    </div>
  );
};

// a centered column, for content stacked inside a Compare column
const Stack: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24}}>{children}</div>
);

// ---------- Scenes ----------

const Hook: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={48}>
        <Enter at={cue('whisper')} preset="rise">
          <Headline size={type.hero - 12} sub="OpenAI's speech-to-text model">
            Whisper, running in your <Accent>browser</Accent>
          </Headline>
        </Enter>
        <Enter at={cue('never gets uploaded')} preset="pop">
          <Pill variant="white" icon="lock" size={34}>
            Audio stays on your machine
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const WhatItDoes: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Enter at={cue('free tools')} preset="fade">
        <SectionTag eyebrow="Sycamore" title="Free subtitle tool" />
      </Enter>
      <Pipeline
        gap={140}
        items={[
          {at: cue('added this'), w: 220, h: 260, el: <DocIcon tag=".mp4" tagTone={color.blue} label="Your video" width={130} />},
          {at: cue('drop in'), w: 340, h: 240, el: <NodeBox label="Whisper" sub="in the browser tab" icon="brain" tone={color.amber} width={340} />},
          {at: cue('subtitles back'), w: 220, h: 260, el: <DocIcon tag=".srt" tagTone={color.green} label="Subtitles" width={130} />},
        ]}
      />
    </AbsoluteFill>
  );
};

const Cost: React.FC = () => {
  const cue = useCue();
  return (
    <Center>
      <Compare
        gap={120}
        winner={{index: 1, at: cue('own computer')}}
        columns={[
          {
            title: 'Speech-to-text API',
            at: cue('normally'),
            el: (
              <Stack>
                <NodeBox label="Their server" icon="server" tone={color.paperMute} width={420} height={210} />
                <Enter at={cue('every minute')} preset="pop">
                  <Pill variant="outline" icon="clock" size={30}>
                    Billed per minute of audio
                  </Pill>
                </Enter>
              </Stack>
            ),
          },
          {
            title: 'In the browser',
            at: cue('what if'),
            el: (
              <Stack>
                <NodeBox label="The user's computer" icon="user" tone={color.green} width={420} height={210} />
                <Enter at={cue('does the work')} preset="pop">
                  <Pill variant="green" icon="check" size={30}>
                    Costs you nothing
                  </Pill>
                </Enter>
              </Stack>
            ),
          },
        ]}
      />
    </Center>
  );
};

const Library: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={cue('library called')} preset="pop">
          <AppIcon icon="code" title="transformers.js" sub="by Hugging Face" size={150} tone={color.amber} />
        </Enter>
        <Enter at={cue('javascript')} preset="rise">
          <Label size={type.heading} tone={color.paperSoft}>
            Runs AI models in JavaScript
          </Label>
        </Enter>
        <Enter at={cue('tiny')} preset="pop">
          <Pill variant="blue" icon="download" size={34}>
            ≈ 0.6 MB
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Download: React.FC = () => {
  const cue = useCue();
  return (
    <Center gap={36}>
      <Enter at={cue('heavy part')} preset="rise">
        <ListCard
          title="First visit download"
          kicker="Whisper base"
          width={1000}
          rows={[
            {label: 'transformers.js', value: '0.6 MB', at: cue('heavy part')},
            {label: 'Whisper model (8-bit)', value: '≈ 77 MB', at: cue('hundred megabytes')},
            {label: 'Engine that runs it (ONNX Runtime)', value: '15–28 MB', at: cue('engine')},
          ]}
          total={{label: 'Total, once', value: '≈ 100 MB', at: cue('only happens once')}}
        />
      </Enter>
      <Enter at={cue('cached')} preset="pop">
        <Pill variant="white" icon="bolt" size={30}>
          Cached after that: loads instantly
        </Pill>
      </Enter>
    </Center>
  );
};

const MainThread: React.FC = () => {
  const cue = useCue();
  return (
    <Center>
      <Compare
        gap={140}
        winner={{index: 1, at: cue('separate thread')}}
        columns={[
          {
            title: 'Main thread',
            at: cue('now'),
            el: (
              <Stack>
                <NodeBox label="Page + Whisper" icon="globe" tone={color.red} width={400} height={200} active={0.4} />
                <Enter at={cue('freeze')} preset="pop">
                  <Pill variant="outline" icon="x" size={30}>
                    The page freezes
                  </Pill>
                </Enter>
              </Stack>
            ),
          },
          {
            title: 'Web worker',
            at: cue('web worker'),
            el: (
              <Stack>
                <NodeBox label="Whisper" sub="its own thread" icon="cpu" tone={color.blue} width={400} height={200} />
                <Enter at={cue('separate thread')} preset="pop">
                  <Pill variant="green" icon="check" size={30}>
                    The page keeps running
                  </Pill>
                </Enter>
              </Stack>
            ),
          },
        ]}
      />
    </Center>
  );
};

const Messages: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 1" title="The worker" />
      <Pipeline
        gap={150}
        dashed
        pulse
        items={[
          {at: cue('page hands'), w: 300, h: 220, el: <NodeTile label="Page" icon="globe" sub="sends the audio" width={300} />},
          {at: cue('worker hands'), w: 340, h: 220, el: <NodeBox label="Worker" sub="runs Whisper" icon="cpu" tone={color.amber} width={340} />},
          {at: cue('back the text'), w: 300, h: 220, el: <NodeTile label="Text" icon="file" sub="with timestamps" width={300} />},
        ]}
      />
      <Caption from="the page remains" to="whole time" accent="smooth" />
    </AbsoluteFill>
  );
};

const WebGpuCheck: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 1" title="The worker" />
      <Center>
        <Enter at={cue('model loads')} preset="rise">
          <CodeWindow
            file="code/whisper/worker.js"
            lines={[44, 57]}
            size={28}
            steps={[
              {at: cue('checks if'), lines: [46, 46]},
              {at: cue('graphics card'), lines: [48, 53]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Fallback: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 1" title="The worker" />
      <Center>
        <Compare
          gap={120}
          winner={{index: 1, at: cue('everywhere')}}
          columns={[
            {title: 'WebGPU', at: 0, el: <NodeBox label="Graphics card" sub="fast" icon="bolt" tone={color.paperMute} width={400} height={210} />},
            {title: 'WebAssembly', at: cue('webassembly'), el: <NodeBox label="CPU" sub="slower, works almost everywhere" icon="cpu" tone={color.blue} width={400} height={210} />},
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const Transcribe: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 1" title="The worker" />
      <Center>
        <Enter at={cue('once')} preset="rise">
          <CodeWindow
            file="code/whisper/worker.js"
            lines={[64, 74]}
            size={26}
            steps={[
              {at: cue('function call'), lines: [69, 69]},
              {at: cue('timestamps'), lines: [70, 70]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Decode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center>
        <Enter at={cue('worker')} preset="rise">
          <CodeWindow
            file="code/whisper/index.ts"
            lines={[49, 61]}
            size={28}
            steps={[
              {at: cue('16khz'), lines: [51, 51]},
              {at: cue('offline audio'), lines: [52, 52]},
              {at: cue('stereo'), lines: [54, 59]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const ThirtySeconds: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center gap={70}>
        <Enter at={cue("here's where")} preset="rise">
          <Headline size={type.title}>
            Whisper hears <Accent>30 seconds</Accent> at a time
          </Headline>
        </Enter>
        <Enter at={cue('chop the audio')} preset="fade">
          <Waveform at={cue('chop the audio')} cutAt={13} cutStart={cue('cutting off')} tone={color.red} />
        </Enter>
        <Enter at={cue('cutting off')} preset="pop">
          <Pill variant="outline" icon="scissors" size={30}>
            Cut lands in the middle of a word
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const QuietSpot: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center>
        <Enter at={cue('what we do')} preset="rise">
          <CodeWindow
            file="code/whisper/windows.ts"
            lines={[36, 51]}
            size={28}
            steps={[
              {at: cue('look back'), lines: [40, 43]},
              {at: cue('how loud'), lines: [44, 44]},
              {at: cue('quietest spot'), lines: [45, 50]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const GoodCut: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center gap={56}>
        <Waveform at={-20} cutFrom={13} cutAt={16.5} cutStart={0} tone={color.green} />
        <Enter at={cue('little pause')} preset="pop">
          <Pill variant="green" icon="check" size={30}>
            Cut at the pause between words
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Silence: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Pipeline
        gap={110}
        items={[
          {at: cue('weird one'), w: 520, h: 260, el: <Waveform at={cue('weird one')} flat width={520} />},
          {at: cue('back nothing'), w: 300, h: 220, el: <NodeBox label="Whisper" icon="brain" tone={color.amber} width={300} />},
          {
            at: cue('makes stuff up'),
            w: 380,
            h: 160,
            el: (
              <Card tone="dark" width={380} pad={36}>
                <div style={{fontFamily: font.sans, fontSize: type.heading, color: color.red, textAlign: 'center'}}>“Thank you.”</div>
              </Card>
            ),
          },
        ]}
      />
    </AbsoluteFill>
  );
};

const SkipSilent: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center>
        <Enter at={cue('any clip')} preset="rise">
          <CodeWindow file="code/whisper/windows.ts" lines={[50, 55]} size={30} steps={[{at: cue('basically silent'), lines: [52, 52]}]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const NonSpeech: React.FC = () => {
  const cue = useCue();
  const tags = ['[BLANK_AUDIO]', '(music)', '[Applause]'];
  const strike = cue('strip those');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center gap={50}>
        <Enter at={cue('tag things')} preset="rise">
          <Headline size={type.title}>Whisper tags sounds that aren't speech</Headline>
        </Enter>
        <div style={{display: 'flex', gap: 28}}>
          {tags.map((t, i) => (
            <Enter key={t} at={stagger(cue('blank audio'), i, 10)} preset="pop">
              <StruckPill text={t} at={strike + i * 4} />
            </Enter>
          ))}
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// a mono pill that gets struck through and dims at `at`
const StruckPill: React.FC<{text: string; at: number}> = ({text, at}) => {
  const t = useTween(at, at + 12);
  return (
    <div style={{position: 'relative', opacity: 1 - t * 0.55}}>
      <Pill variant="neutral" size={32}>
        <span style={{fontFamily: font.mono}}>{text}</span>
      </Pill>
      <div style={{position: 'absolute', left: 16, right: 16, top: '50%', height: 4, background: color.red, transform: `scaleX(${t})`, transformOrigin: 'left'}} />
    </div>
  );
};

const Shift: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Center>
        <Enter at={cue('shift')} preset="rise">
          <CodeWindow file="code/whisper/windows.ts" lines={[74, 79]} size={28} steps={[{at: cue('lines up'), lines: [78, 78]}]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Loop: React.FC = () => {
  const cue = useCue();
  const clip = (n: number, i: number) => (
    <Enter key={n} at={stagger(cue('main loop'), i, 6)} preset="pop">
      <NodeChip label={`Clip ${n}`} icon="scissors" />
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Part 2" title="The page" />
      <Pipeline
        gap={130}
        items={[
          {at: cue('main loop'), w: 260, h: 300, el: <div style={{display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center'}}>{[1, 2, 3].map(clip)}</div>},
          {at: cue('one by one'), w: 320, h: 220, el: <NodeBox label="Worker" icon="cpu" tone={color.amber} width={320} />},
          {at: cue('each worker'), w: 300, h: 220, el: <NodeTile label="Text" icon="file" sub="per clip" width={300} />},
        ]}
      />
    </AbsoluteFill>
  );
};

const FirstClip: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={cue('small detail')} preset="rise">
          <Headline size={type.title}>
            The first clip also loads the <Accent>model</Accent>
          </Headline>
        </Enter>
        <Enter at={cue('progress bar')} preset="rise">
          <ProgressBar at={cue('progress bar')} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// a simple download bar that fills over ~1.5 s
const ProgressBar: React.FC<{at: number}> = ({at}) => {
  const t = useTween(at, at + 45);
  return (
    <div style={{width: 900, display: 'flex', flexDirection: 'column', gap: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: font.sans, fontSize: type.label, color: color.paperSoft}}>
        <span>Downloading model…</span>
        <span>{Math.round(t * 100)}%</span>
      </div>
      <div style={{height: 18, borderRadius: radius.pill, background: color.tile, overflow: 'hidden'}}>
        <div style={{width: `${t * 100}%`, height: '100%', background: color.blue, borderRadius: radius.pill}} />
      </div>
    </div>
  );
};

const Output: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Pipeline
        gap={140}
        items={[
          {
            at: cue('pretty long'),
            w: 520,
            h: 200,
            el: (
              <Card tone="dark" width={520} pad={32}>
                <div style={{fontFamily: font.sans, fontSize: type.body - 4, color: color.paperSoft, lineHeight: 1.35}}>
                  Whisper's sentences can get pretty long, so we break them up into lines
                </div>
              </Card>
            ),
          },
          {
            at: cue('break them up'),
            w: 420,
            h: 200,
            el: (
              <Card tone="light" width={420} pad={32}>
                <div style={{fontFamily: font.sans, fontSize: type.body - 4, color: color.ink, lineHeight: 1.35, textAlign: 'center'}}>
                  Whisper's sentences can
                  <br />
                  get pretty long
                </div>
              </Card>
            ),
          },
        ]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 200, display: 'flex', justifyContent: 'center'}}>
        <PillRow items={['SRT', 'VTT', 'Plain text']} at={cue('srt')} variant="blue" />
      </div>
    </AbsoluteFill>
  );
};

const Recap: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={cue('run whisper')} preset="rise">
          <Headline size={type.hero - 12}>
            Whisper in the <Accent>browser</Accent>
          </Headline>
        </Enter>
        <Enter at={cue('100 mb')} preset="pop">
          <Pill variant="white" icon="download" size={34}>
            100 MB once, then free
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const TryIt: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center>
        <Enter at={cue('tools on my site')} preset="rise">
          <AppIcon icon="sparkle" title="Sycamore" sub="free subtitle tools" size={150} />
        </Enter>
      </Center>
      <CTA text="Try it free: link below" at={cue('links down below')} />
    </AbsoluteFill>
  );
};

const Freelance: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center>
        <Enter at={cue('something like this')} preset="rise">
          <Headline size={type.title}>
            Want this in your <Accent>product?</Accent>
          </Headline>
        </Enter>
      </Center>
      <CTA text="I do freelance work: link below" at={cue('freelance')} />
    </AbsoluteFill>
  );
};

export const WhisperVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/whisper-voice.wav')} />
    <Track>
      <Scene from="so this is whisper"><Hook /></Scene>
      <Scene from="so i added this"><WhatItDoes /></Scene>
      <Scene from="now normally to"><Cost /></Scene>
      <Scene from="it turns out"><Library /></Scene>
      <Scene from="the model is the heavy"><Download /></Scene>
      <Scene from="now the first thing"><MainThread /></Scene>
      <Scene from="the page hands it"><Messages /></Scene>
      <Scene from="when the model loads"><WebGpuCheck /></Scene>
      <Scene from="but if it doesn't"><Fallback /></Scene>
      <Scene from="once it's loaded"><Transcribe /></Scene>
      <Scene from="ok so that's the worker"><Decode /></Scene>
      <Scene from="but here's where"><ThirtySeconds /></Scene>
      <Scene from="so what we do"><QuietSpot /></Scene>
      <Scene from="and that's almost always"><GoodCut /></Scene>
      <Scene from="then there's this weird"><Silence /></Scene>
      <Scene from="so any clip"><SkipSilent /></Scene>
      <Scene from="now whisper also"><NonSpeech /></Scene>
      <Scene from="and we shift"><Shift /></Scene>
      <Scene from="and the main loop"><Loop /></Scene>
      <Scene from="one small detail"><FirstClip /></Scene>
      <Scene from="finally whisper"><Output /></Scene>
      <Scene from="so yeah that's how"><Recap /></Scene>
      <Scene from="the tools on my site"><TryIt /></Scene>
      <Scene from="and if you want something"><Freelance /></Scene>
    </Track>
  </TranscriptProvider>
);
