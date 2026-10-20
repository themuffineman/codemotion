import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  Accent, Camera, Center, ChapterCarousel, Compare, Counter, Enter, Headline, Label, NodeBox, NodeChip, Pill,
  Pipeline, Scene, StepTimeline, Terminal, Track, TranscriptProvider, Vector, color, series, stagger, type,
  useCue, useStepper, Stage, font, Card, weight, StatCaption, Caption, CTA, PerspectiveBoard, BoardCard, FocusShade,
} from '../../kit';
import transcript from './transcript.json';

// Component tour: the pieces the JVM demo doesn't use (chapters, vectors, compare, terminal,
// timeline + camera, counters). Same rules: every reveal is cued to a word.

export const tourTranscript = transcript;

const Thumb: React.FC<{tone: string}> = ({tone}) => (
  <AbsoluteFill style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, padding: 28}}>
    {Array.from({length: 8}).map((_, i) => (
      <div key={i} style={{borderRadius: 12, background: i % 3 === 0 ? `${tone}55` : 'rgba(255,255,255,0.07)'}} />
    ))}
  </AbsoluteFill>
);

const Chapters: React.FC = () => {
  const cue = useCue();
  return (
    <ChapterCarousel
      activeAt={[cue('three chapters'), cue('second'), cue('third')]}
      chapters={[
        {title: 'How tokens become vectors', preview: <Thumb tone={series[0]} />},
        {title: 'Comparing architectures', preview: <Thumb tone={series[1]} />},
        {title: 'Shipping it', preview: <Thumb tone={series[2]} />},
      ]}
    />
  );
};

const Tokenize: React.FC = () => {
  const cue = useCue();
  const tokens = ['Jake', 'learned', 'AI'];
  return (
    <Pipeline
      dir="column"
      gap={90}
      items={[
        {at: cue('sentence'), w: 1000, h: 70, el: <Label size={type.heading} weight={500}>“Jake learned AI”</Label>},
        {at: cue('split'), w: 420, h: 90, el: <NodeChip label="Text tokenizer" icon="scissors" tone={color.amber} />},
        {
          at: cue('jake'),
          w: 640,
          h: 80,
          el: (
            <div style={{display: 'flex', gap: 22}}>
              {tokens.map((t, i) => (
                <Enter key={t} at={cue(t)} preset="pop">
                  <Pill variant="white" size={34}>
                    {t}
                  </Pill>
                </Enter>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
};

const Embed: React.FC = () => {
  const cue = useCue();
  const tokens = ['Jake', 'learned', 'AI'];
  return (
    <Center gap={90}>
      <Enter at={cue('embedding')} preset="fade">
        <Headline size={type.heading} sub="token embedding + positional encoding">
          Injecting <Accent>position</Accent> into each token
        </Headline>
      </Enter>
      <div style={{display: 'flex', gap: 80, alignItems: 'flex-start'}}>
        {tokens.map((t, i) => (
          <div key={t} style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <Vector at={stagger(cue('vector'), i, 5)} label={t} />
            <Enter at={stagger(cue('add'), i, 5)} preset="pop">
              <Label size={type.heading} tone={color.paperSoft} style={{marginTop: -50}}>
                +
              </Label>
            </Enter>
            <Vector at={stagger(cue('position vector'), i, 6)} tone={series[[2, 3, 0][i]]} label={`position ${i + 1}`} fill={1} />
          </div>
        ))}
      </div>
    </Center>
  );
};

const Architectures: React.FC = () => {
  const cue = useCue();
  return (
    <Center>
      <Compare
        winner={{index: 2, at: cue('won')}}
        columns={[
          {title: 'RNN', at: cue('rnns'), el: <NodeBox label="one step at a time" icon="arrowRight" tone={color.paperMute} width={420} height={220} />},
          {title: 'LSTM', at: cue('lstms'), el: <NodeBox label="gated memory" icon="layers" tone={color.paperMute} width={420} height={220} />},
          {title: 'Transformer', at: cue('transformers'), el: <NodeBox label="attention, in parallel" icon="grid" tone={color.blue} width={420} height={220} />},
        ]}
      />
    </Center>
  );
};

const Ship: React.FC = () => {
  const cue = useCue();
  return (
    <Center>
      <Enter at={cue('ship')} preset="rise">
        <Terminal
          title="~/app"
          width={1100}
          lines={[
            {at: cue('npm install'), cmd: 'npm install'},
            {at: cue('then'), out: 'added 312 packages in 4s'},
            {at: cue('npm run build'), cmd: 'npm run build'},
            {at: cue('npm run build') + 26, out: '✓ built in 1.82s', tone: color.green},
          ]}
        />
      </Enter>
    </Center>
  );
};

const Process: React.FC = () => {
  const cue = useCue();
  const focus = useStepper([cue('planning took'), cue('design references', {n: 2})]);
  return (
    <Camera
      keys={[
        {at: 0, x: 0, scale: 1},
        {at: cue('planning took'), x: 420, scale: 1.12, dur: 26},
        {at: cue('design references', {n: 2}), x: 20, scale: 1.12, dur: 26},
      ]}
    >
      <Center>
        <StepTimeline
          focus={focus}
          steps={[
            {n: 1, title: 'Planning', at: cue('planning'), done: cue('ninety'), value: '≈ 90 min', valueAt: cue('ninety')},
            {n: 2, title: 'Design references', at: cue('design'), done: cue('twenty five'), value: '25 min', valueAt: cue('twenty five')},
            {n: 3, title: 'Animating', at: cue('animating')},
            {n: 4, title: 'Sound', at: cue('sound')},
          ]}
        />
      </Center>
    </Camera>
  );
};

const Result: React.FC = () => {
  const cue = useCue();
  return (
    <Center gap={30}>
      <Enter at={cue('output')} preset="rise">
        <Card width={900} pad={60} style={{textAlign: 'center'}}>
          <Label size={type.body} tone={color.inkMute}>
            Output, year over year
          </Label>
          <div style={{fontSize: 180, fontWeight: weight.bold, color: color.green, letterSpacing: '-0.05em', lineHeight: 1.05, marginTop: 10}}>
            <Counter value={329} at={cue('three hundred')} dur={30} prefix="+" suffix="%" />
          </div>
        </Card>
      </Enter>
    </Center>
  );
};

const Studied: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade at={cue('extracted')} />
      <StatCaption position="center" kicker="extracted and studied" value={458} unit="animations" at={cue('extracted')} />
    </AbsoluteFill>
  );
};

const SoundDesign: React.FC = () => (
  <AbsoluteFill>
    <FocusShade />
    <Caption position="center" from="i wasn't ready" to="mattered" accent="sound design" />
  </AbsoluteFill>
);

// Abstract stand-ins for screenshot thumbnails; real videos put <Img> frames here.
const BOARD = [
  {title: 'Navy card wall (hook)', meta: 'V2 · s1 · 7.0s', bg: 'linear-gradient(135deg, #0b1a3a, #1a4a8a)', sw: ['#0b1a3a', '#1a4a8a', '#ffffff', '#5aa0e8']},
  {title: 'Electric-blue world', meta: 'V3 · s2 · 5.0s', bg: 'linear-gradient(135deg, #0a5cff, #3fa0ff)', sw: ['#0a5cff', '#3fa0ff', '#d8ecff']},
  {title: 'Tinted void (red) + glow frames', meta: 'V7 · s14 · 23.7s', bg: 'radial-gradient(circle at 50% 50%, #5a0d10, #160406)', sw: ['#160406', '#5a0d10', '#ff3b3b']},
  {title: 'Tinted void (gold)', meta: 'V7 · s24 · 19.8s', bg: 'radial-gradient(circle at 50% 50%, #4a3a10, #120e04)', sw: ['#120e04', '#4a3a10', '#e8c35a']},
  {title: 'Teal chapter wall', meta: 'V7 · s11 · 8.0s', bg: 'linear-gradient(135deg, #04181c, #0d4a52)', sw: ['#04181c', '#0d4a52', '#5ad0d8']},
  {title: 'Warm mesh gradient triptych', meta: 'V8 · s1 · 4.8s', bg: 'linear-gradient(135deg, #f5a524, #ff6a2b)', sw: ['#f5a524', '#ff6a2b', '#fff3e0']},
  {title: 'Pool-caustic photo prints', meta: 'V6 · s1 · 3.3s', bg: 'linear-gradient(135deg, #2a8fd8, #7fd0ff)', sw: ['#2a8fd8', '#7fd0ff', '#e83a3a']},
  {title: 'Neon-rim showreel card', meta: 'V5 · s6 · 2.6s', bg: 'linear-gradient(135deg, #f4f4f6, #d8d8de)', sw: ['#ffffff', '#1c1c1f', '#1a84f5']},
];

const StyleBoard: React.FC = () => {
  const cue = useCue();
  const rows = [BOARD, [...BOARD].reverse()];
  return (
    <PerspectiveBoard at={cue('every single')} label={{text: 'Long-Form Style Board', icon: 'globe'}} scroll={{from: 160, to: -420, dur: 140}}>
      {rows.map((row, r) => (
        <div key={r}>
          <div style={{fontFamily: font.sans, fontSize: 22, color: color.paper, margin: r ? '40px 0 20px' : '0 0 20px'}}>{r ? 'W5 · Product / ad kit' : 'W4 · Output / theme worlds'}</div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28}}>
            {row.map((b) => (
              <BoardCard key={b.title} title={b.title} meta={b.meta} swatches={b.sw} thumb={<AbsoluteFill style={{background: b.bg}} />} width={325} />
            ))}
          </div>
        </div>
      ))}
    </PerspectiveBoard>
  );
};

const LinkBelow: React.FC = () => {
  const cue = useCue();
  return <CTA text="The link is down below" at={cue('the link')} />;
};

export const Tour: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Track>
      <Scene from="this video">
        <Chapters />
      </Scene>
      <Scene from="a sentence">
        <Tokenize />
      </Scene>
      <Scene from="the embedding">
        <Embed />
      </Scene>
      <Scene from="rnns">
        <Architectures />
      </Scene>
      <Scene from="to ship">
        <Ship />
      </Scene>
      <Scene from="here is">
        <Process />
      </Scene>
      <Scene from="and overall">
        <Result />
      </Scene>
      <Scene from="to get there">
        <Studied />
      </Scene>
      <Scene from="i wasn't">
        <SoundDesign />
      </Scene>
      <Scene from="every single">
        <StyleBoard />
      </Scene>
      <Scene from="the link">
        <LinkBelow />
      </Scene>
    </Track>
  </TranscriptProvider>
);
