import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, AppIcon, Card, Caption, Center, Compare, CTA, Enter, Eyebrow, FocusShade, Headline, Hub, Icon, KeyValue, Label,
  ListCard, NodeBox, NodeChip, NodeTile, Pill, Pipeline, Scene, SectionTag, Stage, StepTimeline, Track, TranscriptProvider,
  Vector, color, series, stagger, type, useCue, useStepper, useTween, weight,
} from '../../kit';
import {Axes, COLS, Histogram, ROWS, Sine, Spectrogram, Timelines, Waveform} from './viz';
import transcript from './transcript.json';

// "The algorithm behind Shazam". Voiceover only (no face video), so every composition is centered.
// Audio: public/audio/shazam.m4a (best takes cut from the raw recording; transcript remapped to it).

export const shazamTranscript = transcript;

const useLoop = (speed = 0.8) => useCurrentFrame() * speed;

// ---------- Hook ----------
const Loud: React.FC = () => {
  const cue = useCue();
  const shift = useLoop();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={48}>
        <Enter at={cue('you know')} preset="rise">
          <Card tone="dark" pad={56}>
            <Waveform width={1000} height={220} noise={0.75} seed={3} shift={shift} at={cue('you know')} />
          </Card>
        </Enter>
        <div style={{display: 'flex', gap: 24}}>
          <Enter at={cue('loud')} preset="pop">
            <Pill variant="outline" size={30}>Somewhere loud</Pill>
          </Enter>
          <Enter at={cue('recognize')} preset="pop">
            <Pill variant="white" size={30}>A song you recognize</Pill>
          </Enter>
          <Enter at={cue("can't remember")} preset="pop">
            <Pill variant="neutral" icon="question" size={30}>The name</Pill>
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const HoldUp: React.FC = () => {
  const cue = useCue();
  const shift = useLoop();
  return (
    <Pipeline
      gap={120}
      items={[
        {
          at: cue('hold up'),
          w: 380,
          h: 250,
          el: (
            <Card tone="dark" width={380} height={250} pad={36}>
              <Waveform width={308} height={110} noise={0.6} seed={5} shift={shift} at={cue('hold up')} />
              <Label size={type.label + 2} tone={color.paperSoft} style={{marginTop: 26}}>A few seconds</Label>
            </Card>
          ),
        },
        {at: cue('shazam'), w: 260, h: 260, el: <AppIcon icon="search" title="Shazam" size={140} />},
        {
          at: cue('name of'),
          w: 440,
          h: 250,
          el: (
            <Card width={440} height={250} pad={44} focus={1}>
              <Eyebrow>Found it</Eyebrow>
              <Label size={type.heading} tone={color.ink} style={{marginTop: 22}}>Song title</Label>
              <Label size={type.body - 4} tone={color.inkMute} weight={weight.regular} style={{marginTop: 10}}>Artist</Label>
            </Card>
          ),
        },
      ]}
    />
  );
};

const Curious: React.FC = () => (
  <AbsoluteFill>
    <FocusShade />
    <Caption from="never really" to="works" position="center" size={type.title} accent="how it works" />
  </AbsoluteFill>
);

const Paper: React.FC<{small?: boolean}> = ({small}) => (
  <Card width={small ? 820 : 960} pad={small ? 48 : 60}>
    <Eyebrow tone={color.inkMute}>ISMIR · 2003</Eyebrow>
    <Label size={small ? type.heading - 4 : type.heading + 4} tone={color.ink} style={{marginTop: 20, lineHeight: 1.15}}>
      An Industrial-Strength Audio Search Algorithm
    </Label>
    <Label size={type.body - 2} tone={color.inkMute} weight={weight.regular} style={{marginTop: 18}}>Avery Li-Chun Wang</Label>
  </Card>
);

const TheIdea: React.FC = () => {
  const cue = useCue();
  const struck = useTween(cue('use ai') + 8, cue('use ai') + 22);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={56}>
        <Enter at={cue('paper')} preset="rise">
          <Paper />
        </Enter>
        <Enter at={cue('use ai')} preset="pop">
          <Pill variant="neutral" size={34} struck={struck}>AI</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const STEPS = ['Sound to picture', 'Keep the peaks', 'Pair them up', 'Check the timing'];

const Roadmap: React.FC = () => {
  const cue = useCue();
  const at = cue('walk you');
  return (
    <Center>
      <StepTimeline cardW={330} steps={STEPS.map((title, i) => ({n: i + 1, title, at: stagger(at, i, 7)}))} />
    </Center>
  );
};

// ---------- Why comparing waves fails ----------
const Slide: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const start = cue('comparing');
  const x = Math.max(0, frame - start) * 4.2;
  const pos = 60 + (x % 760);
  return (
    <Center>
      <Enter at={cue('first thing')} preset="rise">
        <Card tone="dark" pad={56} width={1300}>
          <div style={{position: 'relative', height: 360}}>
            <Enter at={cue('your recording')} preset="fade" style={{position: 'absolute', left: pos, top: 0}}>
              <Label size={type.label} tone={color.blue}>Your recording</Label>
              <div style={{marginTop: 14}}>
                <Waveform width={360} height={110} seed={9} noise={0.5} tone={color.blue} at={cue('your recording')} />
              </div>
            </Enter>
            <div style={{position: 'absolute', left: 0, top: 200}}>
              <Waveform width={1188} height={110} seed={4} at={cue('every song')} points={480} />
              <Enter at={cue('every song')} preset="fade">
                <Label size={type.label} tone={color.paperSoft} style={{marginTop: 14}}>Every song</Label>
              </Enter>
            </div>
          </div>
        </Card>
      </Enter>
    </Center>
  );
};

const A = ['0.12', '-0.41', '0.83', '0.37', '-0.66', '0.05', '0.71', '-0.29', '0.48', '-0.90'];
const B = ['0.07', '-0.18', '0.52', '0.61', '-0.34', '0.22', '0.39', '-0.57', '0.15', '-0.48'];

const Numbers: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const changed = frame >= cue('change');
  return (
    <Center gap={64}>
      <Waveform width={1100} height={170} seed={4} amp={changed ? 0.6 : 1} at={cue('the problem')} />
      <Vector horizontal cell={80} values={changed ? B : A} at={cue('list of numbers')} tone={changed ? color.red : 'rgba(255,255,255,0.55)'} />
    </Center>
  );
};

const Messy: React.FC = () => {
  const cue = useCue();
  const shift = useLoop();
  return (
    <Center>
      <Compare
        columns={[
          {title: 'The original', at: cue('so if'), el: <Card tone="dark" pad={40}><Waveform width={560} height={170} seed={4} at={cue('so if')} /></Card>},
          {
            title: 'Your recording',
            at: cue('talking'),
            el: (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32}}>
                <Card tone="dark" pad={40}>
                  <Waveform width={560} height={170} seed={4} noise={0.85} shift={shift * 0.4 + 40} tone={color.blue} at={cue('talking')} />
                </Card>
                <div style={{display: 'flex', gap: 18}}>
                  <Enter at={cue('talking')} preset="pop"><Pill variant="outline">Someone talking</Pill></Enter>
                  <Enter at={cue('halfway')} preset="pop"><Pill variant="outline">Started halfway</Pill></Enter>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Center>
  );
};

const Slow: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={56}>
        <Enter at={cue('comparing')} preset="rise">
          <Headline sub="would be really slow">
            Comparing raw audio against <Accent>millions</Accent> of songs
          </Headline>
        </Enter>
        <Enter at={cue('slow')} preset="pop">
          <AppIcon icon="clock" size={130} tone={color.red} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Fingerprint: React.FC = () => {
  const cue = useCue();
  return (
    <Center gap={48}>
      <Enter at={cue('needed')} preset="pop">
        <NodeBox label="A fingerprint for each song" icon="key" tone={color.blue} width={620} active={0.6} />
      </Enter>
      <Enter at={cue('small')} preset="rise">
        <ListCard
          title="It needs to be"
          width={820}
          rows={[
            {label: 'Small', at: cue('small')},
            {label: 'Quick to look up', at: cue('quick')},
            {label: 'Fine with background noise', at: cue('noise')},
          ]}
        />
      </Enter>
    </Center>
  );
};

// ---------- Step 1: sound to picture ----------
const Pitches: React.FC = () => {
  const cue = useCue();
  const rows = [
    {label: 'High cymbals', cycles: 16, tone: series[0], at: cue('cymbals')},
    {label: 'Mid', cycles: 7, tone: series[1], at: cue('pitches')},
    {label: 'Low bass', cycles: 2.5, tone: series[2], at: cue('low bass')},
  ];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 1" title="Sound to picture" />
      <Center dir="row" gap={56}>
        <Enter at={cue('first step')} preset="rise">
          <Card tone="dark" pad={40}>
            <Waveform width={460} height={220} seed={4} at={cue('first step')} />
            <Label size={type.label} tone={color.paperSoft} style={{marginTop: 18}}>One sound</Label>
          </Card>
        </Enter>
        <Enter at={cue('fourier')} preset="pop">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
            <Pill variant="blue" size={30}>Fourier transform</Pill>
            <Icon name="arrowRight" size={44} color={color.paper} />
          </div>
        </Enter>
        <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
          {rows.map((r) => (
            <Enter key={r.label} at={r.at} preset="rise">
              <Card tone="dark" pad={26}>
                <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
                  <Sine width={380} height={74} cycles={r.cycles} tone={r.tone} at={r.at} />
                  <Label size={type.label} tone={color.paperSoft} style={{width: 180}}>{r.label}</Label>
                </div>
              </Card>
            </Enter>
          ))}
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const CELL = 26;
const SW = COLS * CELL;
const SH = ROWS * CELL;

const BuildSpectrogram: React.FC = () => {
  const cue = useCue();
  const reveal = useTween(cue('every small'), cue('spectrogram') + 30);
  const legend = cue('brighter');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 1" title="Sound to picture" />
      <Center>
        <div style={{position: 'relative', width: SW, height: SH, marginTop: 20}}>
          <Spectrogram cell={CELL} reveal={reveal} />
          <Axes width={SW} height={SH} timeAt={cue('time runs')} pitchAt={cue('pitch runs')} />
          <div style={{position: 'absolute', right: 0, top: -76}}>
            <Enter at={legend} preset="pop">
              <Pill variant="white" size={28}>Brighter means louder</Pill>
            </Enter>
          </div>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- Step 2: keep the peaks ----------
const Peaks: React.FC = () => {
  const cue = useCue();
  const peaksOnly = useTween(cue('throws away'), cue('throws away') + 30);
  const dots = useTween(cue('only keeps'), cue('only keeps') + 24);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 2" title="Keep the peaks" />
      <Center gap={48}>
        <Spectrogram cell={CELL} peaksOnly={peaksOnly} dots={dots} />
        <Enter at={cue('constellation')} preset="pop">
          <Pill variant="white" size={30} icon="sparkle">Constellation map</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Noise: React.FC = () => {
  const cue = useCue();
  const noise = useTween(cue('background noise'), cue('background noise') + 30);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 2" title="Keep the peaks" />
      <Center style={{paddingBottom: 90}}>
        <Spectrogram cell={CELL} peaksOnly={1} dots={1} noise={noise} />
      </Center>
      <Caption from="it usually" to="peaks" accent="peaks" />
    </AbsoluteFill>
  );
};

const Volume: React.FC = () => {
  const cue = useCue();
  const dim = useTween(cue('dimmer'), cue('dimmer') + 20);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 2" title="Keep the peaks" />
      <Center>
        <Compare
          columns={[
            {title: 'Louder', at: cue('volume'), el: <Spectrogram cell={14} peaksOnly={1} dots={1} />},
            {title: 'Quieter', at: cue('volume') + 8, el: <Spectrogram cell={14} peaksOnly={1} dots={1} dim={dim} />},
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const StillMatch: React.FC = () => {
  const cue = useCue();
  const rec = useTween(cue('your recording'), cue('your recording') + 30);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 2" title="Keep the peaks" />
      <Center gap={44}>
        <Spectrogram cell={CELL} peaksOnly={1} dots={1} noise={1} recording={rec} />
        <div style={{display: 'flex', gap: 24}}>
          <Enter at={cue('your recording')} preset="pop"><Pill variant="blue" size={28}>Your recording</Pill></Enter>
          <Enter at={cue('original song')} preset="pop"><Pill variant="white" size={28}>The original song</Pill></Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- Step 3: pair them up ----------
const OneDot: React.FC = () => {
  const cue = useCue();
  const songs = ['Song A', 'Song B', 'Song C', 'Song D', 'Song E'];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 3" title="Pair them up" />
      <div style={{position: 'absolute', inset: 0, transform: 'translateY(-90px)'}}>
        <Hub
          vertical
          spread={430}
          pitch={300}
          center={{at: cue('single dot'), w: 420, h: 200, el: <NodeBox label="One dot" sub="one pitch at one moment" icon="sparkle" tone={color.amber} width={420} height={200} />}}
          outputs={songs.map((s, i) => ({at: stagger(cue('lot of songs'), i, 5), w: 250, h: 70, el: <NodeChip label={s} icon="search" size={30} />}))}
        />
      </div>
    </AbsoluteFill>
  );
};

const Pairs: React.FC = () => {
  const cue = useCue();
  const anchor = useTween(cue('pairs each'), cue('pairs each') + 14);
  const pairs = useTween(cue('few of the dots'), cue('few of the dots') + 36);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 3" title="Pair them up" />
      <Center dir="row" gap={64}>
        <Spectrogram cell={20} peaksOnly={1} dots={1} anchor={anchor} pairs={pairs} focusOthers={anchor} />
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36}}>
          <Enter at={cue('writes down')} preset="rise">
            <KeyValue
              title="One pair"
              width={520}
              rows={[
                {k: 'First pitch', v: '523 Hz', at: cue('two pitches')},
                {k: 'Second pitch', v: '784 Hz', at: cue('two pitches') + 8},
                {k: 'Time between', v: '0.21 s', at: cue('time between')},
              ]}
            />
          </Enter>
          <Enter at={cue('fingerprint')} preset="pop">
            <Pill variant="blue" icon="key" size={32}>Fingerprint</Pill>
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const Library: React.FC = () => {
  const cue = useCue();
  const kvAt = cue('stores');
  return (
    <Pipeline
      gap={110}
      items={[
        {at: cue('already'), w: 260, h: 230, el: <NodeTile label="Every song" icon="layers" width={260} />},
        {at: kvAt - 14, w: 320, h: 200, el: <NodeBox label="Fingerprints" icon="key" tone={color.blue} width={320} height={200} />},
        {
          at: kvAt,
          w: 640,
          h: 330,
          el: (
            <KeyValue
              title="Saved with each fingerprint"
              width={640}
              rows={[
                {k: 'Fingerprint', v: '523 · 784 · 0.21', at: kvAt + 6},
                {k: 'Song', v: 'which song', at: cue('which song')},
                {k: 'Position', v: 'where it appears', at: cue('where in')},
              ]}
            />
          ),
        },
      ]}
    />
  );
};

const Upload: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Pipeline
        gap={130}
        dashed
        pulse
        items={[
          {at: cue('record something'), w: 280, h: 240, el: <NodeTile label="Your recording" sub="a few seconds" icon="search" width={280} />},
          {at: cue('same process'), w: 340, h: 200, el: <NodeBox label="Same process" sub="picture, peaks, pairs" icon="gear" tone={color.blue} width={340} height={200} />},
          {at: cue('servers'), w: 280, h: 240, el: <NodeTile label="Shazam's servers" icon="server" width={280} />},
        ]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('quicker')} preset="pop">
          <Pill variant="green" icon="bolt" size={30}>Sends fingerprints, which is quicker than audio</Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const SongCard: React.FC<{n: number; matches: number; at: number}> = ({n, matches, at}) => (
  <Enter at={at} preset="rise">
    <Card tone="dark" width={420} pad={32}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <Label size={type.body}>Song {n}</Label>
        <Pill variant="blue" size={28}>{matches} matches</Pill>
      </div>
    </Card>
  </Enter>
);

const Scattered: React.FC = () => {
  const cue = useCue();
  const counts = [4, 2, 5, 3, 6, 2];
  return (
    <Center gap={48}>
      <Enter at={cue('look up')} preset="fade">
        <Label size={type.heading} tone={color.paperSoft} weight={weight.regular}>Matches for your fingerprints</Label>
      </Enter>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 420px)', gap: 32}}>
        {counts.map((m, i) => (
          <SongCard key={i} n={i + 1} matches={m} at={i === 0 ? cue('right song') : stagger(cue('look up') + 12, i, 5)} />
        ))}
      </div>
    </Center>
  );
};

// ---------- Step 4: timing ----------
const Timing: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 4" title="Check the timing" />
      <FocusShade />
      <Center>
        <Enter at={cue('figure out')} out={cue('for each match') - 6} preset="rise">
          <Headline size={type.hero}>
            Shazam looks at <Accent>timing</Accent>
          </Headline>
        </Enter>
      </Center>
      <Center>
        <Timelines
          clipAt={cue('for each match')}
          songAt={cue('for each match') + 6}
          matches={[{clip: 2, song: 64, at: cue('your recording') + 12}]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const offsetMatches = (at0: number, at1: number, more: number) => [
  {clip: 1, song: 63, at: at0},
  {clip: 2, song: 64, at: at1},
  ...[3, 4, 5].map((s, i) => ({clip: s, song: 62 + s, at: stagger(more, i, 6)})),
];

const Offset: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 4" title="Check the timing" />
      <Center gap={60}>
        <Timelines clipAt={cue('started recording')} songAt={cue('started recording')} offset={{at: cue('62')}} matches={offsetMatches(cue('one second'), cue('two seconds'), cue('so on'))} />
        <Enter at={cue('right song')} preset="pop">
          <Pill variant="green" size={32}>Every match is off by the same 62 s</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Coincidence: React.FC = () => {
  const cue = useCue();
  const at = cue("don't line up");
  const random = [
    {clip: 0.6, song: 72},
    {clip: 2.4, song: 57},
    {clip: 3.6, song: 75},
    {clip: 4.8, song: 59},
    {clip: 1.5, song: 70},
  ].map((m, i) => ({...m, at: stagger(at, i, 6), tone: color.red}));
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 4" title="Check the timing" />
      <Center gap={60}>
        <Timelines clipAt={-30} songAt={-30} offset={{at: -30}} matches={[...offsetMatches(-30, -30, -30), ...random]} />
        <div style={{display: 'flex', gap: 24}}>
          <Enter at={-20} preset="fade"><Pill variant="blue" size={28}>Lined up</Pill></Enter>
          <Enter at={at} preset="pop"><Pill variant="outline" size={28}>Coincidences</Pill></Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const Charts: React.FC = () => {
  const cue = useCue();
  const wrong = cue('wrong songs');
  const right = cue('right song');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 4" title="Check the timing" />
      <Center gap={48}>
        <Enter at={cue('chart')} preset="fade">
          <Label size={type.heading} tone={color.paperSoft} weight={weight.regular}>Time differences, one chart per song</Label>
        </Enter>
        <div style={{display: 'flex', gap: 32}}>
          {[11, 23, 37].map((seed, i) => (
            <Enter key={seed} at={stagger(cue('chart') + 10, i, 6)} preset="rise">
              <Histogram title={`Song ${i + 2}`} seed={seed} at={stagger(wrong, i, 6)} width={300} height={200} dim={0} />
            </Enter>
          ))}
          <Enter at={right} preset="rise">
            <Histogram title="Song 1" seed={51} at={right} width={300} height={200} spike={{at: cue('tall spike'), index: 11}} label={{text: '62 s', at: cue('62')}} />
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const Spike: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Step 4" title="Check the timing" />
      <Center gap={44}>
        <Histogram title="Song 1" seed={51} at={-40} width={980} height={360} spike={{at: -20, index: 11}} label={{text: '62 s', at: -20}} shrink={{at: cue('get lost')}} focus={1} />
        <div style={{display: 'flex', gap: 24}}>
          <Enter at={cue('found your song')} preset="pop"><Pill variant="green" icon="check" size={30}>Your song</Pill></Enter>
          <Enter at={cue('same spot')} preset="pop"><Pill variant="white" size={30}>Still points to the same spot</Pill></Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- Wrap-up ----------
const Recap: React.FC = () => {
  const cue = useCue();
  const ats = [cue('picture'), cue('loudest'), cue('fingerprints'), cue('timing')];
  const focus = useStepper(ats);
  return (
    <Center>
      <StepTimeline
        cardW={330}
        focus={focus}
        steps={STEPS.map((title, i) => ({n: i + 1, title, at: stagger(cue('yeah'), i, 4), done: ats[i + 1] ?? ats[3] + 40}))}
      />
    </Center>
  );
};

const Today: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={48}>
        <Enter at={cue('basic idea')} preset="rise">
          <Headline size={type.title}>
            Still the basic idea behind <Accent>Shazam</Accent>
          </Headline>
        </Enter>
        <Enter at={cue('paper came')} preset="rise">
          <Paper small />
        </Enter>
        <Enter at={cue('apple')} preset="pop">
          <Pill variant="white" size={30}>Apple bought Shazam in 2018</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Next: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40} style={{paddingBottom: 120}}>
        <Enter at={cue('also made')} preset="pop">
          <AppIcon icon="globe" title="The algorithm behind Google Maps" sub="Dijkstra's algorithm" size={150} />
        </Enter>
      </Center>
      <CTA text="Watch it next" at={cue('enjoy')} />
    </AbsoluteFill>
  );
};

export const ShazamVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/shazam.m4a')} />
    <Track>
      <Scene from="you know when"><Loud /></Scene>
      <Scene from="so you hold"><HoldUp /></Scene>
      <Scene from="now i've used"><Curious /></Scene>
      <Scene from="the main idea"><TheIdea /></Scene>
      <Scene from="it's a fairly"><Roadmap /></Scene>
      <Scene from="now the first thing"><Slide /></Scene>
      <Scene from="now the problem"><Numbers /></Scene>
      <Scene from="so if someone's"><Messy /></Scene>
      <Scene from="and on top"><Slow /></Scene>
      <Scene from="so shazam needed"><Fingerprint /></Scene>
      <Scene from="so the first step"><Pitches /></Scene>
      <Scene from="if you do that"><BuildSpectrogram /></Scene>
      <Scene from="next shazam throws"><Peaks /></Scene>
      <Scene from="now the reason"><Noise /></Scene>
      <Scene from="and if the volume"><Volume /></Scene>
      <Scene from="so even in"><StillMatch /></Scene>
      <Scene from="now a single dot"><OneDot /></Scene>
      <Scene from="so shazam pairs"><Pairs /></Scene>
      <Scene from="and shazam has"><Library /></Scene>
      <Scene from="when you record"><Upload /></Scene>
      <Scene from="now the servers"><Scattered /></Scene>
      <Scene from="now to figure"><Timing /></Scene>
      <Scene from="say you started"><Offset /></Scene>
      <Scene from="so the coincidental"><Coincidence /></Scene>
      <Scene from="if you chart"><Charts /></Scene>
      <Scene from="that spike is"><Spike /></Scene>
      <Scene from="yeah so that's"><Recap /></Scene>
      <Scene from="that's still the"><Today /></Scene>
      <Scene from="so if you like"><Next /></Scene>
    </Track>
  </TranscriptProvider>
);
