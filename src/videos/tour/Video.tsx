import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  Accent, Camera, Center, ChapterCarousel, Compare, Counter, Enter, Headline, Label, NodeBox, NodeChip, Pill,
  Pipeline, Scene, StepTimeline, Terminal, Track, TranscriptProvider, Vector, color, series, stagger, type,
  useCue, useStepper, Stage, Card,
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
          <div style={{fontSize: 180, fontWeight: 700, color: color.green, letterSpacing: '-0.05em', lineHeight: 1.05, marginTop: 10}}>
            <Counter value={329} at={cue('three hundred')} dur={30} prefix="+" suffix="%" />
          </div>
        </Card>
      </Enter>
    </Center>
  );
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
    </Track>
  </TranscriptProvider>
);
