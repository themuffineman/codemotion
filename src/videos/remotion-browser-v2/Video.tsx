import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, CTA, Caption, Card, Center, CodeWindow, Compare, DocIcon, Enter, FocusShade, Headline, Icon, KeyValue, Label, Logo,
  NodeBox, NodeTile, Pill, Pipeline, Scene, SectionTag, Stage, StepTimeline, Terminal, Track, TranscriptProvider, Window,
  color, easeInOut, font, radius, shadow, stagger, type, useCue, useStepper, useTween, weight, FPS,
} from '../../kit';
import transcript from './transcript.json';
import marksFile from '../../../public/remotion-browser/demo2-marks.json';
import terminalOut from '../../../public/code/remotion-browser/terminal/output.json';

// "Render Remotion in the browser" v2: demo, then building the app file by file, then how it works and its limits.
// Demo app: projects/remotion-browser (a real `npm create vite` react-ts project; code copied to public/code/remotion-browser).
// Screen recording: public/remotion-browser/demo2.mp4 (2560x1600, cursor + typing), element positions in demo2-marks.json.
// Real terminal output: public/code/remotion-browser/terminal/*.txt. Voice: public/audio/remotion-browser-v2-voice.wav.

export const remotionBrowserV2Transcript = transcript;

const REC = 'remotion-browser/demo2.mp4';
const REC_W = 2560;
const REC_H = 1600;
const CARD = 'remotion-browser/title-card.mp4'; // a 1080x1080 MP4 the demo exported
const CODE = 'code/remotion-browser';

// ---------- The screen recording ----------

type Rect = {x: number; y: number; w: number; h: number};
const marks = Object.fromEntries(marksFile.marks.map((m) => [m.name, m])) as Record<string, {t: number; rect: Rect | null}>;
const rectOf = (name: string) => marks[name].rect as Rect;
const tOf = (name: string) => marks[name].t;
// a rect around several recorded elements
const around = (...rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return {x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y};
};

// Parts of the recording played back to back. Each part starts on its cue and runs at the speed that
// makes it fill the time until the next part (rate = recording seconds / screen seconds).
type RecPart = {at: number; from: number; to: number};
const rateOf = (parts: RecPart[], end: number, i: number) => ((parts[i].to - parts[i].from) * FPS) / ((parts[i + 1]?.at ?? end) - parts[i].at);
const RecordingCuts: React.FC<{parts: RecPart[]; end: number}> = ({parts, end}) => (
  <>
    {parts.map((p, i) => (
      // the last part holds on its last frame instead of going black
      <Sequence key={i} from={p.at} durationInFrames={i === parts.length - 1 ? 9999 : (parts[i + 1].at - p.at)} layout="none">
        <OffthreadVideo src={staticFile(REC)} muted trimBefore={Math.round(p.from * FPS)} playbackRate={rateOf(parts, end, i)} style={{width: '100%', height: '100%', display: 'block'}} />
      </Sequence>
    ))}
  </>
);

// Zooms the recording onto a recorded element: each key says "from this frame, frame this rect" (null = whole page).
type Focus = {at: number; rect: Rect | null; fill?: number};
const ScreenZoom: React.FC<{width: number; keys: Focus[]; children: React.ReactNode}> = ({width, keys, children}) => {
  const frame = useCurrentFrame();
  const height = (width * REC_H) / REC_W;
  const k = width / REC_W;
  const target = (f: Focus) => {
    if (!f.rect) return {s: 1, x: 0, y: 0};
    const fill = f.fill ?? 0.7;
    const s = Math.max(1, Math.min(2.6, (width * fill) / (f.rect.w * k), (height * fill) / (f.rect.h * k)));
    const cx = (f.rect.x + f.rect.w / 2) * k;
    const cy = (f.rect.y + f.rect.h / 2) * k;
    // keep the page edges inside the window
    const x = Math.min(0, Math.max(width - width * s, width / 2 - cx * s));
    const y = Math.min(0, Math.max(height - height * s, height / 2 - cy * s));
    return {s, x, y};
  };
  let cur = target(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const t = interpolate(frame, [keys[i].at, keys[i].at + 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut});
    const next = target(keys[i]);
    cur = {s: cur.s + (next.s - cur.s) * t, x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t};
  }
  return (
    <div style={{width, height, overflow: 'hidden', position: 'relative'}}>
      <div style={{width, height, transformOrigin: '0 0', transform: `translate(${cur.x}px, ${cur.y}px) scale(${cur.s})`}}>{children}</div>
    </div>
  );
};

// a browser-looking window around the recording
const BrowserWindow: React.FC<{width: number; children: React.ReactNode}> = ({width, children}) => (
  <Window title="localhost:5173" width={width} height={(width * REC_H) / REC_W + 52}>
    {children}
  </Window>
);

// ---------- Helpers ----------

const Stack: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 24}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap}}>{children}</div>
);
const Row: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 24}) => (
  <div style={{display: 'flex', alignItems: 'center', gap}}>{children}</div>
);
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paper, size = type.label + 2}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);
// a red line that draws across whatever it sits on
const Strike: React.FC<{at: number}> = ({at}) => {
  const t = useTween(at, at + 12);
  return <div style={{position: 'absolute', left: -12, right: -12, top: '50%', height: 6, borderRadius: 3, background: color.red, transform: `scaleX(${t})`, transformOrigin: 'left'}} />;
};
// a dark tile with a logo and a label, for products and packages
const LogoTile: React.FC<{logo?: string; icon?: React.ComponentProps<typeof Icon>['name']; label: string; sub?: string; dim?: number; width?: number}> = ({logo, icon, label, sub, dim = 0, width = 300}) => (
  <div style={{width, padding: '30px 24px', borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`, boxShadow: shadow.tile, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: 1 - dim * 0.6}}>
    {logo ? <Logo name={logo} size={84} /> : <Icon name={icon ?? 'box'} size={84} color={color.paperSoft} />}
    <div style={{fontFamily: font.mono, fontSize: type.label, color: color.paper, textAlign: 'center'}}>{label}</div>
    {sub ? <div style={{fontFamily: font.sans, fontSize: type.label - 2, color: color.paperSoft, textAlign: 'center'}}>{sub}</div> : null}
  </div>
);
// Real terminal output (captured from the actual commands), from public/code/remotion-browser/terminal/output.json.
const termLines = (txt: string, at: number, step = 3) =>
  txt
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((out, i) => ({at: at + i * step, out}));

// ---------- 1. Hook ----------

const Hook: React.FC = () => {
  const cue = useCue();
  const gone = useTween(cue('right in the browser'), cue('right in the browser') + 14);
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={60}>
        <Enter at={0} preset="pop">
          <Row gap={28}>
            <Logo name="remotion" size={110} />
            <Headline size={type.hero - 10}>
              Remotion, in the <Accent>browser</Accent>
            </Headline>
          </Row>
        </Enter>
        <Row gap={110}>
          <Enter at={cue('on a server')} preset="pop">
            <div style={{position: 'relative', opacity: 1 - gone * 0.6}}>
              <NodeBox label="Render server" sub="the usual way" icon="server" tone={color.paperMute} width={400} height={230} />
              <Strike at={cue('right in the browser')} />
            </div>
          </Enter>
          <Enter at={cue('right in the browser')} preset="rise">
            <Window title="localhost:5173" width={520} height={572}>
              <OffthreadVideo src={staticFile(CARD)} muted style={{width: 520, height: 520}} />
            </Window>
          </Enter>
        </Row>
        <Row gap={20}>
          <Enter at={cue('their own computer')} preset="pop">
            <Pill variant="white" icon="user" size={32}>
              The user's own computer
            </Pill>
          </Enter>
          <Enter at={cue('rendermediaonweb')} preset="pop">
            <Pill variant="blue" icon="code" size={32}>
              renderMediaOnWeb()
            </Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 2. The demo (screen recording) ----------

const Demo: React.FC = () => {
  const cue = useCue();
  const end = cue('any point', {edge: 'end'}) + 20;
  const parts: RecPart[] = [
    {at: 0, from: 0, to: tOf('title') - 0.3}, // preview playing, cursor idle
    {at: cue("i'll change the title"), from: tOf('title') - 0.3, to: tOf('subtitle') - 0.3}, // typing the title
    {at: cue('same with the subtitle'), from: tOf('subtitle') - 0.3, to: tOf('color') - 0.4}, // typing the subtitle
    {at: cue('pick a different color'), from: tOf('color') - 0.4, to: tOf('export') - 0.3}, // color
    {at: cue('now i hit export'), from: tOf('export') - 0.3, to: tOf('done')}, // the render (sped up)
    {at: cue("and when it's done"), from: tOf('done'), to: tOf('download') - 0.5}, // the exported MP4 playing
    {at: cue('i can download'), from: tOf('download') - 0.5, to: tOf('end')},
  ];
  const frame = useCurrentFrame();
  const fast = rateOf(parts, end, 4);
  const showFast = frame >= parts[4].at + 20 && frame < parts[5].at;
  const W = 1500;
  return (
    <AbsoluteFill>
      <Center>
        <Enter at={0} preset="rise">
          <div style={{position: 'relative'}}>
            <BrowserWindow width={W}>
              <ScreenZoom
                width={W}
                keys={[
                  {at: 0, rect: null},
                  {at: cue('on the right'), rect: rectOf('player'), fill: 0.85},
                  {at: cue('on the left'), rect: around(rectOf('title'), rectOf('export')), fill: 0.8},
                  {at: cue("i'll change the title"), rect: around(rectOf('title'), rectOf('player')), fill: 0.95},
                  {at: cue('same with the subtitle'), rect: around(rectOf('subtitle'), rectOf('player')), fill: 0.95},
                  {at: cue('pick a different color'), rect: around(rectOf('color'), rectOf('export')), fill: 0.6},
                  {at: cue('now i hit export') + 10, rect: around(rectOf('export'), rectOf('done')), fill: 0.6},
                  {at: cue("and when it's done"), rect: null},
                  {at: cue('i can download'), rect: around(rectOf('download'), rectOf('export')), fill: 0.6},
                  {at: cue('in this whole process'), rect: null},
                ]}
              >
                <RecordingCuts parts={parts} end={end} />
              </ScreenZoom>
            </BrowserWindow>
            {showFast ? (
              <div style={{position: 'absolute', right: 28, top: 76}}>
                <Pill variant="white" icon="bolt" size={30}>
                  {Math.round(fast)}× speed
                </Pill>
              </div>
            ) : null}
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 3. Building it ----------

const Scaffold: React.FC = () => {
  const cue = useCue();
  const at = 8;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Building it" title="1. A normal Vite project" />
      <Center gap={50}>
        <Row gap={36}>
          {['vite', 'react', 'typescript'].map((l, i) => (
            <Enter key={l} at={stagger(at, i, 8)} preset="pop">
              <Logo name={l} size={90} />
            </Enter>
          ))}
        </Row>
        <Enter at={at} preset="rise">
          <Terminal
            width={1300}
            cps={40}
            lines={[{at, cmd: 'npm create vite@latest remotion-browser -- --template react-ts'}, ...termLines(terminalOut.create, at + 50, 2)]}
          />
        </Enter>
        <Enter at={cue('any react setup')} preset="pop">
          <Pill variant="white" icon="check" size={30}>
            Any React setup works
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Packages: React.FC = () => {
  const cue = useCue();
  const at = cue('install four packages');
  const pkgs = [
    {logo: 'remotion', label: 'remotion', sub: 'Remotion itself', at: cue('remotion itself')},
    {logo: 'remotion', label: '@remotion/player', sub: 'the live preview', at: cue('the player')},
    {logo: 'remotion', label: '@remotion/web-renderer', sub: 'renders in the browser', at: cue('web renderer')},
    {icon: 'file' as const, label: '@remotion/google-fonts', sub: 'a nice font (optional)', at: cue('google fonts')},
  ];
  const optional = cue('last step is optional');
  const optionalT = useTween(optional, optional + 12);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Building it" title="2. Install Remotion" />
      <Center gap={50}>
        <Enter at={at} preset="rise">
          <Terminal width={1500} cps={45} lines={[{at, cmd: 'npm i remotion @remotion/player @remotion/web-renderer @remotion/google-fonts'}, ...termLines(terminalOut.add, at + 60, 3)]} />
        </Enter>
        <Row gap={28}>
          {pkgs.map((p, i) => (
            <Enter key={p.label} at={p.at} preset="pop">
              <LogoTile logo={p.logo} icon={p.icon} label={p.label} sub={p.sub} width={340} dim={i === 3 ? optionalT * 0.6 : 0} />
            </Enter>
          ))}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const FileTag: React.FC<{step: string; title: string}> = ({step, title}) => <SectionTag eyebrow={`Building it · ${step}`} title={title} />;

const TitleProps: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="3" title="src/TitleCard.tsx" />
      <Center>
        <Enter at={cue('the video itself')} preset="rise">
          <CodeWindow
            file={`${CODE}/TitleCard.tsx`}
            lines={[4, 17]}
            size={28}
            maxWidth={1680}
            typeAt={cue('file called title card')}
            typeCps={140}
            steps={[
              {at: cue('three props'), lines: [9, 13]},
              {at: cue('most important line'), lines: [15, 17]},
              {at: cue('usecurrentframe'), lines: [16, 16]},
              {at: cue('everything that moves'), lines: [16, 17]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Springs: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="3" title="src/TitleCard.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/TitleCard.tsx`}
            lines={[47, 62]}
            size={26}
            maxWidth={1680}
            steps={[
              {at: cue('split it into words'), lines: [48, 48]},
              {at: cue('its own spring'), lines: [49, 49]},
              {at: cue('four frames later'), lines: [49, 49]},
              {at: cue('opacity'), lines: [60, 61]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const BarAndSubtitle: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="3" title="src/TitleCard.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/TitleCard.tsx`}
            lines={[22, 35]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('color bar'), lines: [23, 23]},
              {at: cue('subtitle just fades'), lines: [24, 27]},
              {at: cue('the background'), lines: [34, 35]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Gradient: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="3" title="src/TitleCard.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow file={`${CODE}/TitleCard.tsx`} lines={[37, 45]} size={28} maxWidth={1680} steps={[{at: cue("user's color"), lines: [40, 40]}]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const CssOnPurpose: React.FC = () => {
  const cue = useCue();
  const items = [
    {t: 'Gradients', at: cue('gradients')},
    {t: 'Rounded corners', at: cue('rounded corners')},
    {t: 'Transforms', at: cue('transforms')},
    {t: 'Opacity', at: cue('opacity')},
  ];
  return (
    <AbsoluteFill>
      <FileTag step="3" title="src/TitleCard.tsx" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <CodeWindow file={`${CODE}/TitleCard.tsx`} lines={[1, 3]} size={26} maxWidth={1680} steps={[{at: cue('only used css'), lines: [3, 3]}]} />
        </Enter>
        <Row gap={18}>
          {items.map((x) => (
            <Enter key={x.t} at={x.at} preset="pop">
              <Pill variant="green" icon="check" size={30}>
                {x.t}
              </Pill>
            </Enter>
          ))}
        </Row>
        <Enter at={cue('explain why')} preset="fade">
          <Label size={type.label + 2} tone={color.paperSoft}>
            Why: in a bit
          </Label>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const CompositionCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="4" title="src/composition.ts" />
      <Center>
        <Enter at={cue('the composition')} preset="rise">
          <CodeWindow
            file={`${CODE}/composition.ts`}
            lines={[3, 17]}
            size={30}
            maxWidth={1680}
            steps={[
              {at: cue('which component'), lines: [7, 7]},
              {at: cue('how big'), lines: [8, 9]},
              {at: cue('the frame rate'), lines: [10, 10]},
              {at: cue('how many frames'), lines: [11, 11]},
              {at: cue("it's a square"), lines: [8, 9]},
              {at: cue('30 frames'), lines: [10, 10]},
              {at: cue('120 frames'), lines: [11, 11]},
              {at: cue('default props'), lines: [12, 16]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const SameObject: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="4" title="src/composition.ts" />
      <Center gap={70}>
        <Enter at={0} preset="pop">
          <NodeBox label="titleCardComposition" sub="composition.ts" icon="code" tone={color.amber} width={520} height={190} mono />
        </Enter>
        <Row gap={90}>
          <Enter at={cue('the preview')} preset="rise">
            <NodeTile label="<Player />" icon="globe" sub="the live preview" width={420} />
          </Enter>
          <Enter at={cue('the export')} preset="rise">
            <NodeTile label="renderMediaOnWeb()" icon="download" sub="the MP4 export" width={420} />
          </Enter>
        </Row>
        <Enter at={cue("can't drift apart")} preset="pop">
          <Pill variant="green" icon="check" size={30}>
            Same object, so they always match
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const AppState: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="5" title="src/App.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/App.tsx`}
            lines={[8, 22]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('keeps the title'), lines: [12, 14]},
              {at: cue('one props object'), lines: [22, 22]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const AppInputs: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="5" title="src/App.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow file={`${CODE}/App.tsx`} lines={[46, 54]} size={30} maxWidth={1680} steps={[{at: cue('update that state'), lines: [49, 49]}, {at: cue('update that state') + 20, lines: [53, 53]}]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const PlayerCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="5" title="src/App.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/App.tsx`}
            lines={[89, 103]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('the component and the props'), lines: [91, 92]},
              {at: cue('the frame rate and the size'), lines: [93, 96]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// the recording again, zoomed on the title input and the preview while typing
const LiveTyping: React.FC = () => {
  const cue = useCue();
  const end = cue('updates live', {edge: 'end'}) + 15;
  return (
    <AbsoluteFill>
      <FileTag step="5" title="src/App.tsx" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <BrowserWindow width={1300}>
            <ScreenZoom width={1300} keys={[{at: 0, rect: around(rectOf('title'), rectOf('player')), fill: 0.95}]}>
              <RecordingCuts parts={[{at: 0, from: tOf('title'), to: tOf('title-done')}]} end={end} />
            </ScreenZoom>
          </BrowserWindow>
        </Enter>
        <Enter at={cue('every time you type')} preset="pop">
          <Pill variant="white" icon="pencil" size={30}>
            Type → state → props → the Player re-renders
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const CanRender: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="6" title="src/exportVideo.ts" />
      <Center>
        <Enter at={cue('the part this video')} preset="rise">
          <CodeWindow
            file={`${CODE}/exportVideo.ts`}
            lines={[1, 16]}
            size={26}
            maxWidth={1680}
            steps={[
              {at: cue('its own file'), lines: [6, 6]},
              {at: cue('can even do this'), lines: [8, 13]},
              {at: cue('checks for'), lines: [7, 7]},
              {at: cue("something's missing"), lines: [14, 16]},
              {at: cue('throw an error'), lines: [15, 15]},
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
      <FileTag step="6" title="src/exportVideo.ts" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/exportVideo.ts`}
            lines={[18, 29]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('one call'), lines: [19, 19]},
              {at: cue('the composition'), lines: [20, 20]},
              {at: cue('the same props'), lines: [21, 21]},
              {at: cue('container'), lines: [22, 22]},
              {at: cue('muted true'), lines: [23, 23]},
              {at: cue('onprogress'), lines: [24, 24]},
              {at: cue('getblob'), lines: [28, 28]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Wire: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="7" title="src/App.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/App.tsx`}
            lines={[25, 38]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('export button calls'), lines: [26, 29]},
              {at: cue('i pass the progress'), lines: [32, 32]},
              {at: cue('when the blob'), lines: [34, 34]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Swap: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FileTag step="7" title="src/App.tsx" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/App.tsx`}
            lines={[74, 89]}
            size={26}
            maxWidth={1680}
            steps={[
              {at: cue('video tag'), lines: [87, 88]},
              {at: cue('download link'), lines: [75, 81]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const RunDev: React.FC = () => {
  const cue = useCue();
  const at = cue('npm run dev');
  const rec = cue("what you saw");
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Building it" title="Run it" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal width={1100} cps={30} lines={[{at, cmd: 'npm run dev'}, ...termLines(terminalOut.dev, at + 25, 4)]} />
        </Enter>
        <Enter at={rec} preset="rise">
          <BrowserWindow width={760}>
            <ScreenZoom width={760} keys={[{at: 0, rect: null}]}>
              <RecordingCuts parts={[{at: rec, from: tOf('done') - 1, to: tOf('done') + 4}]} end={rec + 150} />
            </ScreenZoom>
          </BrowserWindow>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 4. How it works ----------

const ServerSide: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="How it works" title="The usual way: on a server" />
      <Pipeline
        gap={80}
        items={[
          {at: 0, w: 260, h: 240, el: <LogoTile logo="remotion" label="Your video" width={260} />},
          {at: cue('headless chrome'), w: 300, h: 240, el: <LogoTile logo="chrome" label="Headless Chrome" sub="a screenshot per frame" width={300} />},
          {at: cue('ffmpeg stitches'), w: 280, h: 240, el: <LogoTile icon="layers" label="FFmpeg" sub="stitches them" width={280} />},
          {at: cue('into a video'), w: 200, h: 240, el: <DocIcon tag=".mp4" tagTone={color.green} label="Video" width={120} />},
        ]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 150, display: 'flex', justifyContent: 'center', gap: 24}}>
        <Enter at={cue('aws lambda')} preset="pop">
          <Row gap={16}>
            <Logo name="aws" size={70} />
            <Pill variant="outline" icon="server" size={30}>
              A server or AWS Lambda
            </Pill>
          </Row>
        </Enter>
        <Enter at={cue('paying for')} preset="pop">
          <Pill variant="neutral" icon="clock" size={30}>
            You pay for every render
          </Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const NoScreenshot: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="How it works" title="In the browser" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            A web page can't <Accent>screenshot</Accent> itself
          </Headline>
        </Enter>
        <Compare
          gap={120}
          columns={[
            {
              title: 'Server',
              at: 0,
              el: (
                <Stack>
                  <LogoTile logo="chrome" label="Headless Chrome" sub="screenshots the page" width={380} dim={0.3} />
                  <Pill variant="green" icon="check" size={30}>
                    Can screenshot
                  </Pill>
                </Stack>
              ),
            },
            {
              title: 'Browser tab',
              at: cue('take screenshots'),
              el: (
                <Stack>
                  <NodeBox label="Your web page" sub="can't capture itself" icon="globe" tone={color.red} width={380} height={236} />
                  <Enter at={cue('no api')} preset="pop">
                    <Pill variant="outline" icon="x" size={30}>
                      No API for that
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

const Rebuild: React.FC = () => {
  const cue = useCue();
  const ats = [cue('mounts'), cue('goes through'), cue('measures'), cue('draws it onto')];
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
            {n: 3, title: 'Measure where it is', at: ats[2], done: ats[3], value: <Mono>position</Mono>, valueAt: ats[2]},
            {n: 4, title: 'Draw it on a canvas', at: ats[3], value: <Mono>{'<canvas>'}</Mono>, valueAt: ats[3]},
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
  const bg = useTween(cue('backgrounds'), cue('backgrounds') + 12);
  const border = useTween(cue('borders'), cue('borders') + 12);
  const round = useTween(cue('rounded corners'), cue('rounded corners') + 16);
  const words = ['Rendered', 'in', 'the', 'browser'];
  const wordAt = (i: number) => cue('split into words') + 10 + i * 10;
  const img = useTween(cue('images'), cue('images') + 12);
  const W = 560;
  const H = 400;
  const cardStyle = (r: number): React.CSSProperties => ({position: 'absolute', left: 60, top: 70, width: 440, height: 260, borderRadius: r, padding: 36, boxSizing: 'border-box'});
  const text = (show: (i: number) => number, box: boolean) => (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px 14px', width: 300}}>
      {words.map((w, i) => (
        <span key={w} style={{position: 'relative', fontFamily: font.sans, fontSize: 46, fontWeight: weight.medium, color: color.ink, lineHeight: 1.1, opacity: show(i)}}>
          {w}
          {box && frame >= wordAt(i) && frame < wordAt(i) + 90 ? <span style={{position: 'absolute', inset: -4, border: `2px solid ${color.blue}`, borderRadius: 4}} /> : null}
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
        <Row gap={100}>
          <Enter at={0} preset="rise">
            <Stack gap={22}>
              <Label size={type.label + 2} tone={color.paperSoft}>
                The page (hidden)
              </Label>
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
                <div style={{...cardStyle(28 * round), background: `rgba(251,251,249,${bg})`, border: `4px solid rgba(26,132,245,${border})`}}>
                  {text((i) => (frame >= wordAt(i) ? 1 : 0), true)}
                  {thumb(img)}
                </div>
              </div>
            </Stack>
          </Enter>
        </Row>
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
        gap={100}
        items={[
          {at: 0, w: 300, h: 220, el: <NodeTile label="Canvas frame" icon="grid" sub="one per frame" width={300} />},
          {at: cue('webcodecs'), w: 360, h: 220, el: <NodeBox label="WebCodecs" sub="the browser's encoder" icon="cpu" tone={color.blue} width={360} />},
          {at: cue('mediabunny'), w: 320, h: 220, el: <NodeBox label="Mediabunny" sub="packs the MP4" icon="box" tone={color.blue} width={320} />},
          {at: cue('into an mp4'), w: 200, h: 240, el: <DocIcon tag=".mp4" tagTone={color.green} label="Video" width={120} />},
        ]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 170, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('no ffmpeg')} preset="pop">
          <div style={{position: 'relative'}}>
            <Pill variant="neutral" size={32}>
              FFmpeg
            </Pill>
            <Strike at={cue('no ffmpeg') + 8} />
          </div>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 5. Limits ----------

const Css: React.FC = () => {
  const cue = useCue();
  const works = [
    {t: 'Gradients', at: cue('gradients')},
    {t: 'Borders', at: cue('borders')},
    {t: 'Transforms', at: cue('transforms')},
    {t: 'Opacity', at: cue('opacity')},
  ];
  const fails = [
    {t: 'backdrop-filter', at: cue('backdrop')},
    {t: 'Blend modes', at: cue('blend modes')},
    {t: 'Inset shadows', at: cue('shadows')},
  ];
  const col = (items: {t: string; at: number}[], ok: boolean) => (
    <Stack gap={16}>
      {items.map((w) => (
        <Enter key={w.t} at={w.at} preset="pop">
          <Pill variant={ok ? 'green' : 'outline'} icon={ok ? 'check' : 'x'} size={30}>
            {w.t}
          </Pill>
        </Enter>
      ))}
    </Stack>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Limits" title="Only some CSS" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            It only draws the CSS it <Accent>knows</Accent>
          </Headline>
        </Enter>
        <Compare
          gap={140}
          columns={[
            {title: 'Works', at: cue('common stuff'), tone: color.green, el: col(works, true)},
            {title: "Doesn't", at: cue('backdrop'), tone: color.red, el: col(fails, false)},
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

// Two overlapping cards: z-index is ignored, so the one later in the DOM ends up on top.
const ZIndex: React.FC = () => {
  const cue = useCue();
  const swap = useTween(cue('come later'), cue('come later') + 18);
  const card = (label: string, code: string, tone: string, x: number, y: number) => (
    <div style={{position: 'absolute', left: x, top: y, width: 360, height: 220, borderRadius: radius.card, background: tone, boxShadow: shadow.card, padding: 28, boxSizing: 'border-box'}}>
      <div style={{fontFamily: font.sans, fontSize: type.heading, fontWeight: weight.medium, color: color.ink}}>{label}</div>
      <div style={{fontFamily: font.mono, fontSize: type.label, color: color.inkSoft, marginTop: 10}}>{code}</div>
    </div>
  );
  const badge = card('Badge', 'z-index: 10', color.amber, 80, 40);
  const photo = card('Photo', 'later in the DOM', color.card, 260, 150);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Limits" title="Only some CSS" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
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
      <SectionTag eyebrow="Limits" title="Video inside your video" />
      <Center>
        <Compare
          gap={140}
          winner={{index: 1, at: cue('the video component')}}
          columns={[
            {
              title: "Doesn't work",
              at: 0,
              el: (
                <div style={{position: 'relative'}}>
                  <NodeBox label="<OffthreadVideo>" icon="x" tone={color.red} width={460} height={190} mono />
                  <Strike at={cue("doesn't work")} />
                </div>
              ),
            },
            {
              title: 'Use this',
              at: cue('the video component'),
              el: <NodeBox label="<Video>" sub="@remotion/media" icon="check" tone={color.green} width={460} height={190} mono />,
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const Browsers: React.FC = () => {
  const cue = useCue();
  const list = [
    {logo: 'chrome', name: 'Chrome', v: '94+', at: cue('chrome')},
    {logo: 'firefox', name: 'Firefox', v: '130+', at: cue('firefox')},
    {logo: 'safari', name: 'Safari', v: '26+', at: cue('safari')},
  ];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Limits" title="Browser support" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Needs <Accent>WebCodecs</Accent>
          </Headline>
        </Enter>
        <Row gap={60}>
          {list.map((b) => (
            <Enter key={b.name} at={b.at} preset="pop">
              <Stack gap={18}>
                <Logo name={b.logo} size={140} />
                <div style={{fontFamily: font.sans, fontSize: type.heading, color: color.paper}}>{b.name}</div>
                <Mono tone={color.paperSoft}>{b.v}</Mono>
              </Stack>
            </Enter>
          ))}
        </Row>
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
      <SectionTag eyebrow="Limits" title="Speed" />
      <Center>
        <Compare
          gap={140}
          columns={[
            {title: 'Browser tab', at: 0, el: <NodeBox label="One thread" icon="cpu" tone={color.amber} width={420} height={200} />},
            {title: 'Big server', at: cue('big server'), el: <NodeBox label="Many cores" sub="faster on long videos" icon="server" tone={color.blue} width={420} height={200} />},
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
  const slowAt = cue('slows the page');
  const fill = interpolate(frame, [0, slowAt, slowAt + 200], [0.15, 0.4, 0.46], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tab = (label: string, active: boolean) => (
    <div style={{padding: '12px 26px', borderRadius: '14px 14px 0 0', background: active ? color.tileHi : 'transparent', fontFamily: font.sans, fontSize: type.label, color: active ? color.paper : color.paperMute}}>{label}</div>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Limits" title="Speed" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
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
        <Enter at={cue('renderer slows')} preset="pop">
          <Pill variant="outline" icon="clock" size={30}>
            Background tabs get slowed down
          </Pill>
        </Enter>
        <Enter at={cue('keep the tab')} preset="pop">
          <Pill variant="white" icon="check" size={30}>
            Keep the tab open while it exports
          </Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 6. When to use it + outro ----------

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
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            When to use <Accent>which</Accent>
          </Headline>
        </Enter>
        <Compare
          gap={140}
          columns={[
            {
              title: 'Browser',
              at: 0,
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
                  {t: 'Users on slow phones', at: cue('slow')},
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
        <Enter at={0} preset="rise">
          <Row gap={28}>
            <Logo name="remotion" size={100} />
            <Headline size={type.hero - 16}>
              Remotion, in the <Accent>browser</Accent>
            </Headline>
          </Row>
        </Enter>
        <Enter at={cue('the code for this app')} preset="pop">
          <Window title="localhost:5173" width={440} height={492}>
            <OffthreadVideo src={staticFile(CARD)} muted style={{width: 440, height: 440}} />
          </Window>
        </Enter>
      </Center>
      <CTA text="The code: link below" at={cue('linked down below')} />
    </AbsoluteFill>
  );
};

const Freelance: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Want this in your <Accent>product?</Accent>
          </Headline>
        </Enter>
      </Center>
      <CTA text="I do freelance work: link below" at={cue('freelance')} />
    </AbsoluteFill>
  );
};

export const RemotionBrowserV2Video: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/remotion-browser-v2-voice.wav')} />
    <Track>
      <Scene from="if you've ever used"><Hook /></Scene>
      <Scene from="let me show you"><Demo /></Scene>
      <Scene from="okay so let's build"><Scaffold /></Scene>
      <Scene from="then we install four"><Packages /></Scene>
      <Scene from="first the video itself"><TitleProps /></Scene>
      <Scene from="so for the title i split"><Springs /></Scene>
      <Scene from="the color bar under"><BarAndSubtitle /></Scene>
      <Scene from="and the background is"><Gradient /></Scene>
      <Scene from="one thing though i did"><CssOnPurpose /></Scene>
      <Scene from="next the composition"><CompositionCode /></Scene>
      <Scene from="both the preview and"><SameObject /></Scene>
      <Scene from="now for the page"><AppState /></Scene>
      <Scene from="the inputs here"><AppInputs /></Scene>
      <Scene from="and here's the player"><PlayerCode /></Scene>
      <Scene from="because the props come"><LiveTyping /></Scene>
      <Scene from="okay now the part"><CanRender /></Scene>
      <Scene from="then the actual render"><RenderCall /></Scene>
      <Scene from="back on the page"><Wire /></Scene>
      <Scene from="and that url goes"><Swap /></Scene>
      <Scene from="that's the whole app"><RunDev /></Scene>
      <Scene from="so how does this actually"><ServerSide /></Scene>
      <Scene from="in the browser you can't"><NoScreenshot /></Scene>
      <Scene from="so instead the web"><Rebuild /></Scene>
      <Scene from="so backgrounds borders"><DrawDetail /></Scene>
      <Scene from="then every finished frame"><Encode /></Scene>
      <Scene from="and that's also where"><Css /></Scene>
      <Scene from="z-index is ignored"><ZIndex /></Scene>
      <Scene from="if you use video"><Components /></Scene>
      <Scene from="it needs web codecs"><Browsers /></Scene>
      <Scene from="another thing is it runs"><SingleThread /></Scene>
      <Scene from="and if the user switches"><BackgroundTab /></Scene>
      <Scene from="so really i would only"><WhenToUse /></Scene>
      <Scene from="and that's how you render"><Outro /></Scene>
      <Scene from="if you want something like this built"><Freelance /></Scene>
    </Track>
  </TranscriptProvider>
);
