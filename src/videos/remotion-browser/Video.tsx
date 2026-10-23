import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, AppIcon, CTA, Caption, Card, Center, CodeWindow, Compare, DocIcon, Enter, FocusShade, Headline, Icon, KeyValue, Label,
  ListCard, NodeBox, NodeChip, NodeTile, Pill, PillRow, Pipeline, Scene, SectionTag, Stage, StepTimeline, Track, TranscriptProvider,
  Window, color, font, radius, shadow, stagger, type, useCue, useStepper, useTween, weight, FPS,
} from '../../kit';
import transcript from './transcript.json';

// "Render Remotion in the browser": client-side rendering with @remotion/web-renderer.
// Demo app: projects/remotion-browser (code copied to public/code/remotion-browser).
// Screen recording + an exported MP4: public/remotion-browser. Voice: public/audio/remotion-browser-voice.wav.
// One <Scene> per spoken beat.

export const remotionBrowserTranscript = transcript;

const REC = 'remotion-browser/demo.mp4'; // 1920×1200 screen recording of the demo app
const CARD = 'remotion-browser/title-card.mp4'; // a 1080×1080 MP4 the demo exported

// ---------- Helpers ----------

// a centered column, for content stacked inside a Compare column
const Stack: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 24}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap}}>{children}</div>
);

// Plays parts of the screen recording back to back. Each part starts on its cue and is sped up
// so it fits the time until the next part starts (rate = recording seconds / screen seconds).
type RecPart = {at: number; from: number; to: number};
const rateOf = (parts: RecPart[], end: number, i: number) => {
  const dur = (parts[i + 1]?.at ?? end) - parts[i].at;
  return ((parts[i].to - parts[i].from) * FPS) / dur;
};
const RecordingCuts: React.FC<{parts: RecPart[]; end: number}> = ({parts, end}) => (
  <>
    {parts.map((p, i) => {
      const dur = (parts[i + 1]?.at ?? end) - p.at;
      // the last part holds on its final frame after it runs out, instead of going black
      const hold = i === parts.length - 1 ? 9999 : dur;
      return (
        <Sequence key={i} from={p.at} durationInFrames={hold} layout="none">
          <OffthreadVideo
            src={staticFile(REC)}
            muted
            trimBefore={Math.round(p.from * FPS)}
            playbackRate={rateOf(parts, end, i)}
            style={{width: '100%', height: '100%', display: 'block'}}
          />
        </Sequence>
      );
    })}
  </>
);

// a mono code-ish pill, for API names
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paper, size = type.label + 2}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);

// a red line that draws across whatever it sits on
const Strike: React.FC<{at: number}> = ({at}) => {
  const t = useTween(at, at + 12);
  return (
    <div style={{position: 'absolute', left: -12, right: -12, top: '50%', height: 6, borderRadius: 3, background: color.red, transform: `scaleX(${t})`, transformOrigin: 'left'}} />
  );
};

// ---------- Scenes ----------

const Hook: React.FC = () => {
  const cue = useCue();
  const gone = useTween(cue('render server at all'), cue('render server at all') + 14);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={70}>
        <Enter at={cue('remotion videos')} preset="rise">
          <Headline size={type.hero - 16}>
            Render Remotion in the <Accent>browser</Accent>
          </Headline>
        </Enter>
        <div style={{display: 'flex', alignItems: 'center', gap: 110}}>
          <Enter at={cue('on the server')} preset="pop">
            <div style={{position: 'relative', opacity: 1 - gone * 0.6}}>
              <NodeBox label="Render server" sub="the usual way" icon="server" tone={color.paperMute} width={400} height={230} />
              <Strike at={cue('render server at all')} />
            </div>
          </Enter>
          <Enter at={cue("user's browser")} preset="rise">
            <Window title="localhost" width={560} height={612}>
              <OffthreadVideo src={staticFile(CARD)} muted style={{width: 560, height: 560}} />
            </Window>
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const Demo: React.FC = () => {
  const cue = useCue();
  const end = cue('no server is touched', {edge: 'end'}) + 30;
  const parts: RecPart[] = [
    {at: 0, from: 0, to: 2.4}, // preview playing
    {at: cue('you type'), from: 2.4, to: 8.0}, // typing the new title
    {at: cue('pick a color'), from: 8.0, to: 10.7}, // color, then the Export click
    {at: cue('export'), from: 10.7, to: 23.8}, // rendering (sped up)
    {at: cue('real mp4'), from: 23.8, to: 28.8}, // the exported MP4 playing
  ];
  const fast = Math.round(rateOf(parts, end, 3));
  const frame = useCurrentFrame();
  const showFast = frame >= parts[3].at && frame < parts[4].at;
  return (
    <AbsoluteFill>
      <Center>
        <Enter at={0} preset="rise">
          <div style={{position: 'relative'}}>
            <Window title="Remotion, rendered in your browser" width={1340} height={890}>
              <div style={{width: 1340, height: 838, overflow: 'hidden'}}>
                <RecordingCuts parts={parts} end={end} />
              </div>
            </Window>
            {showFast ? (
              <div style={{position: 'absolute', right: 28, top: 76}}>
                <Pill variant="white" icon="bolt" size={28}>
                  {fast}× speed
                </Pill>
              </div>
            ) : null}
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const ReactVideos: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={cue('quick background')} preset="pop">
          <AppIcon icon="sparkle" title="Remotion" size={150} tone={color.blue} />
        </Enter>
        <Enter at={cue('make videos')} preset="rise">
          <Headline size={type.title}>
            Make videos with <Accent>React</Accent>
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const FrameCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Background" title="How Remotion works" />
      <Center>
        <Enter at={cue('a video is')} preset="rise">
          <CodeWindow
            file="code/remotion-browser/TitleCard.tsx"
            lines={[15, 23]}
            size={28}
            steps={[
              {at: cue('just a component'), lines: [15, 15]},
              {at: cue('which frame'), lines: [16, 16]},
              {at: cue('animate things'), lines: [23, 23]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// real frames of the exported title card, as a filmstrip
const Filmstrip: React.FC = () => {
  const cue = useCue();
  const frames = [4, 12, 22, 40, 80];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Background" title="How Remotion works" />
      <Center gap={56}>
        <div style={{display: 'flex', gap: 28}}>
          {frames.map((f, i) => (
            <Enter key={f} at={stagger(cue('every frame'), i, 6)} preset="pop">
              <Stack gap={18}>
                <div style={{width: 280, height: 280, borderRadius: radius.card, overflow: 'hidden', boxShadow: shadow.tile, border: `1px solid ${color.tileLine}`}}>
                  <Img src={staticFile(`remotion-browser/frames/f${f}.jpg`)} style={{width: 280, height: 280}} />
                </div>
                <Mono tone={color.paperSoft}>frame {f}</Mono>
              </Stack>
            </Enter>
          ))}
        </div>
        <Enter at={cue('picture of your component')} preset="rise">
          <Label size={type.heading} tone={color.paper}>
            Each frame is a picture of the component at that moment
          </Label>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const ServerSide: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The usual way" title="Server-side rendering" />
      <Pipeline
        gap={90}
        items={[
          {at: cue('turn that into'), w: 300, h: 220, el: <NodeTile label="Your component" icon="code" sub="React" width={300} />},
          {at: cue('headless'), w: 340, h: 220, el: <NodeBox label="Headless Chrome" sub="screenshots every frame" icon="globe" tone={color.amber} width={340} />},
          {at: cue('stitches'), w: 280, h: 220, el: <NodeBox label="FFmpeg" sub="stitches them" icon="layers" tone={color.amber} width={280} />},
          {at: cue('ffmpeg', {edge: 'end'}), w: 200, h: 240, el: <DocIcon tag=".mp4" tagTone={color.green} label="Video" width={120} />},
        ]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 170, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('server-side rendering')} preset="fade">
          <Pill variant="outline" icon="server" size={30}>
            All of this runs on a server
          </Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const Machine: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The usual way" title="Server-side rendering" />
      <Center gap={50}>
        <Enter at={cue('you need a machine')} preset="pop">
          <NodeBox label="A machine to run it on" icon="server" tone={color.amber} width={560} height={220} />
        </Enter>
        <PillRow items={['AWS Lambda', 'Your own server']} at={cue('usually')} variant="white" />
      </Center>
    </AbsoluteFill>
  );
};

const Cost: React.FC = () => {
  const cue = useCue();
  return (
    <Center>
      <Enter at={cue('to be fair')} preset="rise">
        <ListCard
          title="Remotion Lambda"
          kicker="Cost per render"
          width={1060}
          rows={[
            {label: 'One render of a 1-minute video', value: '≈ $0.017', at: cue('two cents')},
            {label: 'Storage and bandwidth (S3)', value: 'extra', at: cue('storage')},
            {label: 'Setting up and maintaining AWS', value: 'your time', at: cue('set up and maintain')},
          ]}
          total={{label: 'You pay it', value: 'every render', at: cue('every render')}}
        />
      </Enter>
    </Center>
  );
};

// bars that grow left to right: more users, bigger render bill
const Growth: React.FC = () => {
  const cue = useCue();
  const bars = [0.18, 0.3, 0.46, 0.68, 1];
  const grow = useTween(cue('keeps growing'), cue('keeps growing') + 40);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={60}>
        <PillRow items={['Editors: people export over and over', 'Free tools']} at={cue('building')} variant="neutral" />
        <Enter at={cue('that cost')} preset="rise">
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 36, height: 380, borderBottom: `2px solid ${color.tileLine}`, padding: '0 20px'}}>
              {bars.map((b, i) => (
                <div key={i} style={{width: 120, height: Math.max(8, 380 * b * Math.min(1, grow * 1.6 - i * 0.15)), borderRadius: '14px 14px 0 0', background: i === bars.length - 1 ? color.red : color.tileHi}} />
              ))}
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: font.sans, fontSize: type.label, color: color.paperSoft}}>
              <span>Render bill</span>
              <span>More users →</span>
            </div>
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const WebRenderer: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={44}>
        <Enter at={cue('package')} preset="pop">
          <AppIcon icon="globe" title="@remotion/web-renderer" sub="rendering on the client" size={150} tone={color.blue} />
        </Enter>
        <div style={{display: 'flex', gap: 22}}>
          <Enter at={cue('stable since')} preset="pop">
            <Pill variant="neutral" icon="check" size={32}>
              Stable since v4.0.491
            </Pill>
          </Enter>
          <Enter at={cue("user's own browser")} preset="pop">
            <Pill variant="white" icon="user" size={32}>
              Runs on the user's machine
            </Pill>
          </Enter>
          <Enter at={cue('not paying')} preset="pop">
            <Pill variant="green" icon="check" size={32}>
              No render bill for you
            </Pill>
          </Enter>
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const NoScreenshot: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="How it works" title="In the browser" />
      <Center gap={60}>
        <Enter at={cue("here's where")} preset="rise">
          <Headline size={type.title}>
            A web page can't <Accent>screenshot</Accent> itself
          </Headline>
        </Enter>
        <Compare
          gap={120}
          columns={[
            {
              title: 'Server',
              at: cue('server version'),
              el: (
                <Stack>
                  <NodeBox label="Headless Chrome" sub="screenshots the page" icon="globe" tone={color.paperMute} width={420} height={200} />
                  <Pill variant="green" icon="check" size={30}>
                    Has a screenshot API
                  </Pill>
                </Stack>
              ),
            },
            {
              title: 'Browser tab',
              at: cue('no browser api'),
              el: (
                <Stack>
                  <NodeBox label="Your web page" sub="can't capture itself" icon="globe" tone={color.red} width={420} height={200} />
                  <Pill variant="outline" icon="x" size={30}>
                    No API for that
                  </Pill>
                </Stack>
              ),
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const Rebuild: React.FC = () => {
  const cue = useCue();
  const ats = [cue('mounts'), cue('walks through'), cue('measures'), cue('redraws')];
  const focus = useStepper(ats);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="How it works" title="Rebuild the picture by hand" />
      <Center>
        <StepTimeline
          focus={focus}
          cardW={360}
          steps={[
            {n: 1, title: 'Mount it, hidden', at: 0, done: ats[1], value: <Mono>offscreen</Mono>, valueAt: ats[0]},
            {n: 2, title: 'Walk every element', at: ats[1], done: ats[2], value: <Mono>each frame</Mono>, valueAt: ats[1]},
            {n: 3, title: 'Measure position', at: ats[2], done: ats[3], value: <Mono>+ transforms</Mono>, valueAt: cue('transforms')},
            {n: 4, title: 'Redraw on a canvas', at: ats[3], value: <Mono>{'<canvas>'}</Mono>, valueAt: cue('canvas')},
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

// A card on the page on the left, and the same card being redrawn piece by piece on a canvas on the right.
const DrawDetail: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const bg = useTween(cue('background'), cue('background') + 12);
  const border = useTween(cue('borders'), cue('borders') + 12);
  const round = useTween(cue('rounded corners'), cue('rounded corners') + 16);
  const words = ['Rendered', 'in', 'the', 'browser'];
  const wordAt = (i: number) => cue('split into words') + 12 + i * 10;
  const measureAt = cue('each word is measured');
  const img = useTween(cue('images'), cue('images') + 12);
  const W = 560;
  const H = 400;
  const cardStyle = (r: number): React.CSSProperties => ({
    position: 'absolute', left: 60, top: 70, width: 440, height: 260, borderRadius: r, padding: 36, boxSizing: 'border-box',
  });
  const text = (show: (i: number) => number, box: boolean) => (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px 14px', width: 300}}>
      {words.map((w, i) => (
        <span key={w} style={{position: 'relative', fontFamily: font.sans, fontSize: 46, fontWeight: weight.medium, color: color.ink, lineHeight: 1.1, opacity: show(i)}}>
          {w}
          {box && frame >= wordAt(i) && frame < measureAt + 120 ? (
            <span style={{position: 'absolute', inset: -4, border: `2px solid ${color.blue}`, borderRadius: 4}} />
          ) : null}
        </span>
      ))}
    </div>
  );
  const thumb = (o: number) => (
    <div style={{position: 'absolute', right: 32, bottom: 32, width: 110, height: 110, borderRadius: 12, overflow: 'hidden', opacity: o}}>
      <Img src={staticFile('remotion-browser/frames/f40.jpg')} style={{width: 110, height: 110}} />
    </div>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="How it works" title="Rebuild the picture by hand" />
      <Center>
        <div style={{display: 'flex', gap: 100, alignItems: 'center'}}>
          <Enter at={0} preset="rise">
            <Stack gap={22}>
              <Label size={type.label + 2} tone={color.paperSoft}>The page (hidden)</Label>
              <div style={{position: 'relative', width: W, height: H, borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`}}>
                <div style={{...cardStyle(28), background: color.card, border: `4px solid ${color.blue}`}}>
                  {text(() => 1, false)}
                  {thumb(1)}
                </div>
              </div>
            </Stack>
          </Enter>
          <Enter at={0} preset="rise">
            <Stack gap={22}>
              <Mono tone={color.paperSoft}>{'<canvas>'}</Mono>
              <div style={{position: 'relative', width: W, height: H, borderRadius: radius.card, background: color.code, border: `2px dashed ${color.paperMute}`}}>
                <div
                  style={{
                    ...cardStyle(28 * round),
                    background: `rgba(251,251,249,${bg})`,
                    border: `4px solid rgba(26,132,245,${border})`,
                  }}
                >
                  {text((i) => (frame >= wordAt(i) ? 1 : 0), true)}
                  {thumb(img)}
                </div>
              </div>
            </Stack>
          </Enter>
        </div>
      </Center>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 130, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('copied over')} preset="pop">
          <Pill variant="white" icon="check" size={30}>
            Images, SVGs and canvases are copied as they are
          </Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const Encode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="How it works" title="Encoding" />
      <Pipeline
        gap={110}
        items={[
          {at: cue('finished frame'), w: 300, h: 220, el: <NodeTile label="Canvas frame" icon="grid" sub="one per frame" width={300} />},
          {at: cue('web codecs'), w: 360, h: 220, el: <NodeBox label="WebCodecs" sub="the browser's video encoder" icon="cpu" tone={color.blue} width={360} />},
          {at: cue('mediabunny'), w: 320, h: 220, el: <NodeBox label="Mediabunny" sub="packs the MP4" icon="box" tone={color.blue} width={320} />},
          {at: cue('into an mp4'), w: 200, h: 240, el: <DocIcon tag=".mp4" tagTone={color.green} label="Video" width={120} />},
        ]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 170, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('no need for')} preset="pop">
          <div style={{position: 'relative'}}>
            <Pill variant="neutral" size={32}>
              FFmpeg
            </Pill>
            <Strike at={cue('ffmpeg') + 6} />
          </div>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const CanRender: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="exportVideo.ts" />
      <Center>
        <Enter at={cue('the code actually')} preset="rise">
          <CodeWindow
            file="code/remotion-browser/exportVideo.ts"
            lines={[6, 15]}
            size={28}
            steps={[
              {at: cue('first i asked'), lines: [7, 12]},
              {at: cue('it checks'), lines: [6, 6]},
              {at: cue("if something's missing"), lines: [13, 15]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const RenderCall: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="exportVideo.ts" />
      <Center>
        <Enter at={cue('the render itself')} preset="rise">
          <CodeWindow
            file="code/remotion-browser/exportVideo.ts"
            lines={[17, 28]}
            size={28}
            steps={[
              {at: cue('one function'), lines: [18, 18]},
              {at: cue('the composition'), lines: [19, 19]},
              {at: cue('the props'), lines: [20, 20]},
              {at: cue('onprogress'), lines: [24, 24]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Blob: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The code" title="exportVideo.ts" />
      <Center gap={70}>
        <Enter at={cue('get back')} preset="rise">
          <CodeWindow file="code/remotion-browser/exportVideo.ts" lines={[27, 28]} size={32} />
        </Enter>
        <div style={{display: 'flex', gap: 28}}>
          {[
            {label: 'Download it', icon: 'download' as const, at: cue('download it')},
            {label: 'Play it on the page', icon: 'globe' as const, at: cue('play it')},
            {label: 'Upload it', icon: 'arrowRight' as const, at: cue('upload it')},
          ].map((x) => (
            <Enter key={x.label} at={x.at} preset="pop">
              <NodeChip label={x.label} icon={x.icon} />
            </Enter>
          ))}
        </div>
      </Center>
    </AbsoluteFill>
  );
};

const Speed: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Enter at={cue('my laptop')} preset="pop">
          <NodeChip label="My laptop, not a fast machine" icon="cpu" />
        </Enter>
        <div style={{display: 'flex', alignItems: 'center', gap: 70}}>
          <Enter at={cue('four second video')} preset="pop">
            <Stack gap={10}>
              <Label size={type.label + 2} tone={color.paperSoft}>Video</Label>
              <div style={{fontFamily: font.sans, fontSize: type.hero + 20, fontWeight: weight.medium, color: color.paper}}>4 s</div>
            </Stack>
          </Enter>
          <Enter at={cue('takes somewhere')} preset="fade">
            <Icon name="arrowRight" size={70} color={color.paperMute} />
          </Enter>
          <Enter at={cue('takes somewhere')} preset="pop">
            <Stack gap={10}>
              <Label size={type.label + 2} tone={color.paperSoft}>Render time on my laptop</Label>
              <div style={{fontFamily: font.sans, fontSize: type.hero + 20, fontWeight: weight.medium, color: color.amber}}>10–20 s</div>
            </Stack>
          </Enter>
        </div>
        <Enter at={cue('faster or slower')} preset="pop">
          <Pill variant="white" icon="cpu" size={32}>
            Depends on the user's machine
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const SameComponent: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={60}>
        <Enter at={cue('nice part')} preset="rise">
          <NodeBox label="<TitleCard />" sub="one component" icon="code" tone={color.amber} width={420} height={190} mono />
        </Enter>
        <div style={{display: 'flex', gap: 80}}>
          <Enter at={cue('the preview')} preset="rise">
            <NodeTile label="Player" icon="globe" sub="live preview while you type" width={440} />
          </Enter>
          <Enter at={cue('the export')} preset="rise">
            <NodeTile label="renderMediaOnWeb" icon="download" sub="the MP4 file" width={440} />
          </Enter>
        </div>
      </Center>
      <Caption from="so what you see" to="what you get" accent="what you get" />
    </AbsoluteFill>
  );
};

const Catches: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center>
        <Enter at={cue('few catches')} preset="rise">
          <Headline size={type.hero - 12}>
            The <Accent>catches</Accent>
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Css: React.FC = () => {
  const cue = useCue();
  const works = [
    {t: 'Gradients', at: cue('gradients')},
    {t: 'Borders', at: cue('borders')},
    {t: 'Rounded corners', at: cue('rounded corners')},
    {t: 'Transforms', at: cue('transforms')},
    {t: 'Opacity', at: cue('opacity')},
  ];
  const fails = [
    {t: 'backdrop-filter', at: cue('backdrop')},
    {t: 'Blend modes', at: cue('blend modes')},
    {t: 'Inset shadows', at: cue('shadows')},
  ];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 1" title="Only some CSS" />
      <Center gap={50}>
        <Enter at={cue('the big one')} preset="rise">
          <Headline size={type.title}>
            It only draws the CSS it <Accent>knows</Accent>
          </Headline>
        </Enter>
        <Compare
          gap={140}
          columns={[
            {
              title: 'Works',
              at: cue('gradients'),
              tone: color.green,
              el: (
                <Stack gap={16}>
                  {works.map((w) => (
                    <Enter key={w.t} at={w.at} preset="pop">
                      <Pill variant="green" icon="check" size={30}>
                        {w.t}
                      </Pill>
                    </Enter>
                  ))}
                </Stack>
              ),
            },
            {
              title: "Doesn't",
              at: cue('backdrop'),
              tone: color.red,
              el: (
                <Stack gap={16}>
                  {fails.map((w) => (
                    <Enter key={w.t} at={w.at} preset="pop">
                      <Pill variant="outline" icon="x" size={30}>
                        {w.t}
                      </Pill>
                    </Enter>
                  ))}
                </Stack>
              ),
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

// Two overlapping cards: with z-index ignored, the one later in the DOM ends up on top.
const ZIndex: React.FC = () => {
  const cue = useCue();
  const swap = useTween(cue('come later'), cue('come later') + 18);
  const card = (label: string, code: string, tone: string, x: number, y: number) => (
    <div style={{position: 'absolute', left: x, top: y, width: 360, height: 220, borderRadius: radius.card, background: tone, boxShadow: shadow.card, padding: 28, boxSizing: 'border-box'}}>
      <div style={{fontFamily: font.sans, fontSize: type.heading, fontWeight: weight.medium, color: color.ink}}>{label}</div>
      <div style={{fontFamily: font.mono, fontSize: type.label, color: color.inkSoft, marginTop: 10}}>{code}</div>
    </div>
  );
  // the badge card is first in the DOM, so it gets drawn first (underneath) until it's moved later
  const badge = card('Badge', 'z-index: 10', color.amber, 80, 40);
  const photo = card('Photo', 'second in the DOM', color.card, 260, 150);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 1" title="Only some CSS" />
      <Center gap={50}>
        <Enter at={cue('z-index is ignored')} preset="rise">
          <Headline size={type.title}>
            <Accent>z-index</Accent> is ignored
          </Headline>
        </Enter>
        <Enter at={cue('drawn in the order')} preset="rise">
          <div style={{position: 'relative', width: 700, height: 410}}>
            {swap < 0.5 ? (
              <>
                {badge}
                {photo}
              </>
            ) : (
              <>
                {photo}
                {badge}
              </>
            )}
          </div>
        </Enter>
        <Enter at={cue('on top')} preset="pop">
          <Pill variant="white" icon="layers" size={30}>
            To put it on top, put it later in the DOM
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Components: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 2" title="Some components" />
      <Center>
        <Compare
          gap={140}
          winner={{index: 1, at: cue('the video component')}}
          columns={[
            {
              title: 'On the server',
              at: 0,
              el: (
                <Stack>
                  <NodeBox label="<OffthreadVideo>" icon="x" tone={color.red} width={460} height={190} mono />
                  <Enter at={cue("isn't supported")} preset="pop">
                    <Pill variant="outline" icon="x" size={30}>
                      Not supported in the browser
                    </Pill>
                  </Enter>
                </Stack>
              ),
            },
            {
              title: 'In the browser',
              at: cue('the video component'),
              el: (
                <Stack>
                  <NodeBox label="<Video>" sub="@remotion/media" icon="check" tone={color.green} width={460} height={190} mono />
                  <Pill variant="green" icon="check" size={30}>
                    Use this instead
                  </Pill>
                </Stack>
              ),
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const Browsers: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 3" title="Browser support" />
      <Center gap={44}>
        <Enter at={cue('browser support')} preset="rise">
          <KeyValue
            title="Needs WebCodecs"
            width={760}
            rows={[
              {k: 'Chrome', v: '94+', at: cue('chrome')},
              {k: 'Firefox', v: '130+', at: cue('firefox')},
              {k: 'Safari', v: '26+', at: cue('safari')},
            ]}
          />
        </Enter>
        <Enter at={cue('css filters')} preset="pop">
          <Pill variant="outline" icon="x" size={30}>
            CSS filters don't work in Safari
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const SingleThread: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 4" title="Speed" />
      <Center>
        <Compare
          gap={140}
          columns={[
            {
              title: 'Browser tab',
              at: cue('single-threaded'),
              el: <NodeBox label="One thread" icon="cpu" tone={color.amber} width={420} height={200} />,
            },
            {
              title: 'Big server',
              at: cue('big server'),
              el: <NodeBox label="Many cores" sub="faster on long videos" icon="server" tone={color.blue} width={420} height={200} />,
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

// two browser tabs: the rendering tab in the background slows to a crawl
const BackgroundTab: React.FC = () => {
  const cue = useCue();
  const away = useTween(cue('another tab'), cue('another tab') + 12);
  const frame = useCurrentFrame();
  // the progress bar moves fast, then crawls once the tab is in the background
  const t0 = cue('switches');
  const slowAt = cue('slows the page');
  const fill = interpolate(frame, [t0, slowAt, slowAt + 200], [0.15, 0.4, 0.48], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tab = (label: string, active: boolean) => (
    <div style={{padding: '12px 26px', borderRadius: '14px 14px 0 0', background: active ? color.tileHi : 'transparent', fontFamily: font.sans, fontSize: type.label, color: active ? color.paper : color.paperMute}}>
      {label}
    </div>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 4" title="Speed" />
      <Center gap={50}>
        <Enter at={cue('switches')} preset="rise">
          <div style={{width: 1000, borderRadius: radius.window, background: color.tile, boxShadow: shadow.card, overflow: 'hidden', border: `1px solid ${color.tileLine}`}}>
            <div style={{display: 'flex', gap: 6, padding: '14px 18px 0', background: '#2a2a2d'}}>
              {tab('Exporting your video…', away < 0.5)}
              {tab('Another tab', away >= 0.5)}
            </div>
            <div style={{padding: 50, display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 - away * 0.5}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: font.sans, fontSize: type.label + 2, color: color.paperSoft}}>
                <span>Rendering…</span>
                <span>{Math.round(fill * 100)}%</span>
              </div>
              <div style={{height: 18, borderRadius: radius.pill, background: color.code, overflow: 'hidden'}}>
                <div style={{width: `${fill * 100}%`, height: '100%', background: color.blue}} />
              </div>
            </div>
          </div>
        </Enter>
        <Enter at={cue('render slows')} preset="pop">
          <Pill variant="outline" icon="clock" size={30}>
            Background tabs get slowed down
          </Pill>
        </Enter>
        <Enter at={cue('keep the tab')} preset="pop">
          <Pill variant="white" icon="check" size={30}>
            Keep the tab open while it renders
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Telemetry: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 5" title="Telemetry" />
      <Center gap={44}>
        <Enter at={cue('every client-side render')} preset="rise">
          <KeyValue
            title="Sent to Remotion on every render"
            width={820}
            tone={color.amber}
            rows={[
              {k: 'Your domain', v: 'window.location.origin', at: cue('your domain')},
              {k: "The user's IP address", v: 'with the request', at: cue('ip address')},
            ]}
          />
        </Enter>
        <Enter at={cue('privacy policy')} preset="pop">
          <Pill variant="white" icon="file" size={30}>
            Mention it in your privacy policy
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const License: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Catch 6" title="The license" />
      <Center gap={50}>
        <Enter at={cue('license still applies')} preset="rise">
          <Headline size={type.title}>
            The Remotion <Accent>license</Accent> still applies
          </Headline>
        </Enter>
        <Compare
          gap={120}
          columns={[
            {
              title: 'Individuals, small companies',
              at: cue('free for'),
              tone: color.green,
              el: (
                <Stack>
                  <Card tone="dark" pad={32}>
                    <Mono>licenseKey: 'free-license'</Mono>
                  </Card>
                  <Enter at={cue('you pass')} preset="pop">
                    <Pill variant="green" icon="check" size={30}>
                      Free
                    </Pill>
                  </Enter>
                </Stack>
              ),
            },
            {
              title: 'Bigger companies',
              at: cue('bigger companies'),
              el: (
                <Stack>
                  <Card tone="dark" pad={32}>
                    <Mono>paid license key</Mono>
                  </Card>
                  <Enter at={cue('priced by')} preset="pop">
                    <Pill variant="neutral" icon="clock" size={30}>
                      Priced by renders
                    </Pill>
                  </Enter>
                </Stack>
              ),
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const WhenToUse: React.FC = () => {
  const cue = useCue();
  const list = (items: {t: string; at: number}[], variant: 'green' | 'neutral') => (
    <Stack gap={16}>
      {items.map((x) => (
        <Enter key={x.t} at={x.at} preset="pop">
          <Pill variant={variant} size={30}>
            {x.t}
          </Pill>
        </Enter>
      ))}
    </Stack>
  );
  return (
    <AbsoluteFill>
      <Center gap={50}>
        <Enter at={cue('when should you use')} preset="rise">
          <Headline size={type.title}>
            When to use <Accent>which</Accent>
          </Headline>
        </Enter>
        <Compare
          gap={140}
          columns={[
            {
              title: 'Browser',
              at: cue('great for'),
              tone: color.green,
              el: list(
                [
                  {t: 'Title cards', at: cue('title cards')},
                  {t: 'Social graphics, templates', at: cue('social graphics')},
                  {t: 'Editors where people export', at: cue('an editor')},
                ],
                'green',
              ),
            },
            {
              title: 'Server',
              at: cue('long videos'),
              el: list(
                [
                  {t: 'Long videos', at: cue('long videos')},
                  {t: 'Lots of footage', at: cue('footage')},
                  {t: 'Users on slow phones', at: cue('slow phones')},
                ],
                'neutral',
              ),
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Enter at={cue("that's how")} preset="rise">
          <Headline size={type.hero - 16}>
            Remotion, rendered in the <Accent>browser</Accent>
          </Headline>
        </Enter>
        <Enter at={cue('app demo')} preset="pop">
          <Window title="localhost" width={440} height={492}>
            <OffthreadVideo src={staticFile(CARD)} muted style={{width: 440, height: 440}} />
          </Window>
        </Enter>
      </Center>
      <CTA text="Demo code: link below" at={cue('linked below')} />
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

export const RemotionBrowserVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/remotion-browser-voice.wav')} />
    <Track>
      <Scene from="remotion videos are normally"><Hook /></Scene>
      <Scene from="so this is the little app"><Demo /></Scene>
      <Scene from="so quick background first"><ReactVideos /></Scene>
      <Scene from="a video is just"><FrameCode /></Scene>
      <Scene from="and every frame is basically"><Filmstrip /></Scene>
      <Scene from="now the normal way"><ServerSide /></Scene>
      <Scene from="that works pretty well"><Machine /></Scene>
      <Scene from="and to be fair"><Cost /></Scene>
      <Scene from="if you're building something"><Growth /></Scene>
      <Scene from="so remotion now has"><WebRenderer /></Scene>
      <Scene from="but here's where it gets"><NoScreenshot /></Scene>
      <Scene from="what it does instead"><Rebuild /></Scene>
      <Scene from="so background borders"><DrawDetail /></Scene>
      <Scene from="then each finished frame"><Encode /></Scene>
      <Scene from="okay so here's what"><CanRender /></Scene>
      <Scene from="then the render itself"><RenderCall /></Scene>
      <Scene from="when it's done you"><Blob /></Scene>
      <Scene from="on my laptop"><Speed /></Scene>
      <Scene from="and the nice part"><SameComponent /></Scene>
      <Scene from="now here are a few"><Catches /></Scene>
      <Scene from="the big one is"><Css /></Scene>
      <Scene from="and z-index is ignored"><ZIndex /></Scene>
      <Scene from="some remotion components"><Components /></Scene>
      <Scene from="then there's browser support"><Browsers /></Scene>
      <Scene from="it's also single-threaded"><SingleThread /></Scene>
      <Scene from="and if the user switches"><BackgroundTab /></Scene>
      <Scene from="and this one's easy"><Telemetry /></Scene>
      <Scene from="also the remotion license"><License /></Scene>
      <Scene from="so when should you use"><WhenToUse /></Scene>
      <Scene from="and yeah so that's how"><Outro /></Scene>
      <Scene from="if you want something like"><Freelance /></Scene>
    </Track>
  </TranscriptProvider>
);
