import {
  Circle,
  Code,
  CodeRange,
  Grid,
  Node,
  Path,
  Rect,
  Txt,
  blur,
  makeScene2D,
} from '@motion-canvas/2d';
import {
  Color,
  DEFAULT,
  Vector2,
  all,
  chain,
  createRef,
  createSignal,
  delay,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  loop,
  range,
  sequence,
  useThread,
  waitFor,
} from '@motion-canvas/core';
import {C, MONO, SANS, jsxHighlighter} from '../theme';

// ---------------------------------------------------------------------------
// Layout constants (editor-local coordinates, editor is 1140 x 900).
// ---------------------------------------------------------------------------
const EDITOR_W = 1140;
const EDITOR_H = 900;
const FONT = 26;
const LH = 38;
const CODE_X = -480;
const CODE_Y = -372;
const VIEW_BOTTOM = 420; // lowest visible y inside the editor (local)

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  // Width of one monospace character.
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `500 ${FONT}px "${MONO}"`;
  const CW = ctx.measureText('M').width;

  const world = createRef<Node>();
  const editor = createRef<Rect>();
  const inner = createRef<Node>();
  const scroller = createRef<Node>();
  const code = createRef<Code>();
  const caret = createRef<Rect>();
  const lineBar = createRef<Rect>();
  const stepLabel = createRef<Txt>();
  const preview = createRef<Rect>();
  const previewLabel = createRef<Node>();
  const timeTxt = createRef<Txt>();
  const button = createRef<Rect>();
  const buttonTxt = createRef<Txt>();
  const mouse = createRef<Path>();
  const captionBox = createRef<Rect>();
  const captionTxt = createRef<Txt>();
  const overlay = createRef<Node>();
  const ffBadge = createRef<Rect>();

  // Caret state.
  const caretPos = createSignal<[number, number]>([0, 0]);
  const typing = createSignal(false);
  const blink = createSignal(1);

  // Live preview state.
  const secs = createSignal(0);
  const running = createSignal(false);
  const tickEvery = createSignal(1);
  const formatted = createSignal(false);
  // Each tick gives the number a little bump that decays over 0.25s.
  const clock = useThread();
  const lastTick = createSignal(-10);
  const pulse = () => 1 + 0.07 * easeOutCubic(Math.max(0, 1 - (clock.time() - lastTick()) / 0.25));
  const display = () => {
    const s = Math.floor(secs());
    if (!formatted()) return `${s}`;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  // Editor-local position of a code point (top-left of the character cell).
  const pt = (line: number, col: number) => new Vector2(CODE_X + col * CW, CODE_Y + line * LH);
  const lineCount = () => code().parsed().split('\n').length;

  view.add(
    <>
      <Grid width={2400} height={1600} spacing={80} stroke={'#ffffff07'} lineWidth={1} />
      <Circle size={900} x={-700} y={-420} fill={C.react} opacity={0.06} filters={[blur(180)]} />
      <Circle size={900} x={760} y={420} fill={C.purple} opacity={0.07} filters={[blur(180)]} />

      <Node ref={world}>
        {/* ----------------------------- Editor ----------------------------- */}
        <Rect
          ref={editor}
          x={-430}
          y={-40}
          width={EDITOR_W}
          height={EDITOR_H}
          radius={20}
          fill={C.panel}
          stroke={C.panelEdge}
          lineWidth={2}
          clip
          shadowColor={'#00000099'}
          shadowBlur={80}
          shadowOffsetY={30}
          opacity={0}
        >
          <Node ref={inner} y={() => -editor().height() / 2 + EDITOR_H / 2}>
            <Node ref={scroller}>
              <Rect
                ref={lineBar}
                x={0}
                y={() => CODE_Y + caretPos()[0] * LH + LH / 2}
                width={EDITOR_W}
                height={LH}
                fill={'#ffffff07'}
              />
              <Code
                x={CODE_X - 26}
                y={CODE_Y}
                offset={[1, -1]}
                fontFamily={MONO}
                fontWeight={500}
                fontSize={FONT}
                lineHeight={LH}
                highlighter={null}
                fill={'#3b3f5c'}
                code={() =>
                  range(lineCount())
                    .map(i => String(i + 1).padStart(2, ' '))
                    .join('\n')
                }
              />
              <Code
                ref={code}
                x={CODE_X}
                y={CODE_Y}
                offset={[-1, -1]}
                fontFamily={MONO}
                fontWeight={500}
                fontSize={FONT}
                lineHeight={LH}
                highlighter={jsxHighlighter}
                code={''}
              />
              <Rect
                ref={caret}
                width={3}
                height={LH - 6}
                radius={2}
                fill={C.react}
                shadowColor={C.react}
                shadowBlur={12}
                position={() => pt(caretPos()[0], caretPos()[1]).add([1, LH / 2])}
                opacity={() => (typing() ? 1 : blink())}
              />
              <Node ref={overlay} />
            </Node>
          </Node>
          {/* Title bar sits on top of the scrolling code. */}
          <Rect
            y={() => -editor().height() / 2 + 28}
            width={EDITOR_W}
            height={56}
            fill={C.titleBar}
          >
            {[C.red, C.yellow, C.green].map((c, i) => (
              <Circle x={-535 + i * 30} size={16} fill={c} />
            ))}
            <Rect x={-330} width={190} height={56} fill={C.panel}>
              <Circle x={-62} size={12} fill={C.react} />
              <Txt x={14} fontFamily={MONO} fontSize={22} fill={C.text} text={'Timer.jsx'} />
            </Rect>
            <Txt
              ref={stepLabel}
              x={540}
              offset={[1, 0]}
              fontFamily={SANS}
              fontWeight={600}
              fontSize={22}
              fill={C.react}
              text={''}
            />
          </Rect>
        </Rect>

        {/* ----------------------------- Preview ---------------------------- */}
        <Node ref={previewLabel} x={610} y={-395} opacity={0}>
          <Circle x={-262} size={14} fill={C.green} shadowColor={C.green} shadowBlur={14} />
          <Txt x={-245} offset={[-1, 0]} fontFamily={SANS} fontWeight={600} fontSize={24} fill={C.text} text={'Live preview'} />
        </Node>
        <Rect
          ref={preview}
          x={690}
          y={-40}
          width={560}
          height={620}
          radius={20}
          fill={'#f7f8fc'}
          clip
          shadowColor={'#00000099'}
          shadowBlur={80}
          shadowOffsetY={30}
          opacity={0}
        >
          <Rect y={-285} width={560} height={50} fill={'#e4e7ef'}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
              <Circle x={-250 + i * 22} size={12} fill={c} />
            ))}
            <Rect x={50} width={330} height={30} radius={15} fill={'#ffffff'}>
              <Txt fontFamily={SANS} fontSize={17} fill={'#6b7080'} text={'localhost:5173'} />
            </Rect>
          </Rect>
          <Txt
            ref={timeTxt}
            y={-10}
            fontFamily={SANS}
            fontWeight={800}
            fontSize={140}
            fill={'#14161f'}
            text={display}
            scale={pulse}
            opacity={0}
          />
          <Rect
            ref={button}
            y={150}
            width={220}
            height={76}
            radius={38}
            fill={() => (running() ? '#14161f' : '#2563eb')}
            scale={0}
          >
            <Txt ref={buttonTxt} fontFamily={SANS} fontWeight={700} fontSize={30} fill={'#ffffff'} text={() => (running() ? 'Pause' : 'Start')} />
          </Rect>
          <Rect
            ref={ffBadge}
            y={250}
            width={140}
            height={44}
            radius={22}
            fill={'#14161f'}
            opacity={0}
          >
            <Txt fontFamily={SANS} fontWeight={700} fontSize={22} fill={C.yellow} text={'▶▶ 20x'} />
          </Rect>
          <Path
            ref={mouse}
            x={330}
            y={330}
            data={'M0 0 L0 34 L9 26 L15 40 L21 37 L15 24 L27 24 Z'}
            fill={'#ffffff'}
            stroke={'#14161f'}
            lineWidth={2.5}
            lineJoin={'round'}
          />
        </Rect>
      </Node>

      {/* ----------------------------- Caption ----------------------------- */}
      <Rect
        ref={captionBox}
        y={475}
        height={72}
        paddingLeft={36}
        paddingRight={36}
        radius={36}
        fill={'#0b0d14cc'}
        stroke={'#ffffff1a'}
        lineWidth={2}
        layout
        alignItems={'center'}
        opacity={0}
      >
        <Txt ref={captionTxt} fontFamily={SANS} fontWeight={500} fontSize={30} fill={'#e6e9f5'} text={''} />
      </Rect>
    </>,
  );

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  // Caret blink while idle.
  yield loop(Infinity, () => chain(blink(1, 0.05), waitFor(0.45), blink(0, 0.05), waitFor(0.45)));

  // The live preview's interval.
  yield loop(Infinity, function* () {
    yield* waitFor(tickEvery());
    if (running()) {
      secs(secs() + 1);
      if (tickEvery() >= 0.5) lastTick(clock.time());
    }
  });

  function* say(text: string) {
    if (captionTxt().text() !== '') {
      yield* all(captionBox().opacity(0, 0.2), captionBox().y(490, 0.2, easeInCubic));
    }
    captionTxt().text(text);
    captionBox().y(460);
    yield* all(captionBox().opacity(1, 0.35), captionBox().y(475, 0.35, easeOutCubic));
  }

  function* step(label: string) {
    yield* stepLabel().opacity(0, 0.15);
    stepLabel().text(label);
    yield* stepLabel().opacity(1, 0.3);
  }

  // Types `text` (single line, no newline) starting at a point.
  function* typeAt(line: number, col: number, text: string, cps = 38) {
    typing(true);
    // Leading indentation appears at once — nobody wants to watch spaces.
    const indent = text.match(/^\s*/)![0];
    if (indent) {
      code().code.insert([line, col], indent);
      col += indent.length;
      caretPos([line, col]);
    }
    for (const ch of text.slice(indent.length)) {
      code().code.insert([line, col], ch);
      col++;
      caretPos([line, col]);
      yield* waitFor(1 / cps);
    }
    typing(false);
  }

  // Opens fresh lines at `line` and types each of them.
  function* typeLines(line: number, lines: string[], cps = 38) {
    for (const l of lines) {
      if (line === 0) {
        code().code.insert([0, 0], '\n');
      } else {
        const prev = code().parsed().split('\n')[line - 1];
        code().code.insert([line - 1, prev.length], '\n');
      }
      caretPos([line, 0]);
      yield* waitFor(0.05);
      if (l.length) yield* typeAt(line, 0, l, cps);
      line++;
    }
  }

  const center = (r: CodeRange) => {
    const [[l1, c1], [l2, c2]] = r;
    return pt(l1, c1).add(pt(l2, c2).add([0, LH])).scale(0.5);
  };

  // Position in `world` coordinates for an editor-local point.
  const toWorld = (p: Vector2) => p.add(editor().position()).add(inner().position()).add(scroller().position());

  function* zoomTo(p: Vector2, scale: number, duration = 1) {
    const w = toWorld(p);
    yield* all(
      world().scale(scale, duration, easeInOutCubic),
      world().position(w.scale(-scale).add([0, -40]), duration, easeInOutCubic),
    );
  }

  function* zoomOut(duration = 1) {
    yield* all(world().scale(1, duration, easeInOutCubic), world().position(0, duration, easeInOutCubic));
  }

  // Draws a glowing box around a single-line range, optionally with a label.
  function box(r: CodeRange, color: string, label?: string, above = true) {
    const [[l, c1], [, c2]] = r;
    const a = pt(l, c1);
    const width = (c2 - c1) * CW + 16;
    const node = (
      <Node opacity={0}>
        <Rect
          x={a.x + width / 2 - 8}
          y={a.y + LH / 2}
          width={width}
          height={LH + 4}
          radius={8}
          stroke={color}
          lineWidth={3}
          fill={new Color(color).alpha(0.12)}
          shadowColor={color}
          shadowBlur={18}
          end={0}
        />
        {label ? (
          <Rect
            x={a.x + width / 2 - 8}
            y={above ? a.y - 34 : a.y + LH + 34}
            height={40}
            paddingLeft={14}
            paddingRight={14}
            radius={10}
            fill={color}
            layout
            alignItems={'center'}
            scale={0}
          >
            <Txt fontFamily={SANS} fontWeight={700} fontSize={20} fill={'#0b0d14'} text={label} />
          </Rect>
        ) : null}
      </Node>
    ) as Node;
    overlay().add(node);
    return node;
  }

  function* showBox(node: Node) {
    const [frame, tag] = node.children() as Rect[];
    node.opacity(1);
    yield* all(frame.end(1, 0.5, easeOutCubic), tag ? delay(0.2, tag.scale(1, 0.4, easeOutBack)) : waitFor(0));
  }

  function* hideBoxes(...nodes: Node[]) {
    yield* all(...nodes.map(n => n.opacity(0, 0.3)));
    nodes.forEach(n => n.remove());
  }

  function* scrollTo(y: number, duration = 0.8) {
    yield* scroller().y(y, duration, easeInOutCubic);
  }

  function* click() {
    const ripple = (<Circle size={10} x={mouse().x()} y={mouse().y()} stroke={'#2563eb'} lineWidth={4} />) as Circle;
    preview().add(ripple);
    mouse().moveToTop();
    yield* all(
      mouse().scale(0.8, 0.1).to(1, 0.15),
      button().scale(0.92, 0.1).to(1, 0.2, easeOutBack),
      ripple.size(90, 0.4, easeOutCubic),
      ripple.opacity(0, 0.4),
    );
    ripple.remove();
  }

  // findFirstRange treats strings as regex sources, so escape them first.
  const literal = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const find = (s: string) => code().findFirstRange(literal(s));

  // -------------------------------------------------------------------------
  // Script
  // -------------------------------------------------------------------------

  world().scale(0.9);
  yield* all(
    world().scale(1, 1.2, easeOutCubic),
    editor().opacity(1, 0.8),
    editor().x(-350, 0.9, easeOutCubic),
    delay(0.3, all(preview().opacity(1, 0.8), preview().x(610, 0.9, easeOutCubic), previewLabel().opacity(1, 0.8))),
    say("Let's build a timer in React — one line at a time."),
  );
  yield* waitFor(1);

  // -- Step 1 ---------------------------------------------------------------
  yield* step('1 / 5 · The component');
  yield* say('A React component is just a function that returns UI.');
  yield* typeAt(0, 0, 'export default function Timer() {');
  yield* typeLines(1, ['  return <h1>0</h1>;', '}']);
  caretPos([2, 1]);
  yield* timeTxt().opacity(1, 0.5);
  yield* waitFor(1.2);

  // -- Step 2 ---------------------------------------------------------------
  yield* step('2 / 5 · State');
  yield* say('We need a value that changes over time. That is state.');
  yield* typeLines(0, ["import { useState } from 'react';", '']);
  yield* typeLines(3, ['  const [seconds, setSeconds] = useState(0);', '']);
  yield* waitFor(0.3);

  // Zoom in and annotate the useState line.
  yield* all(code().selection(find('const [seconds, setSeconds] = useState(0);'), 0.6), zoomTo(center(find('const [seconds, setSeconds] = useState(0);')), 1.7));
  const bValue = box(find('seconds'), C.react, 'current value');
  const bSetter = box(find('setSeconds'), C.purple, 'updater fn', false);
  const bInit = box(find('useState(0)'), C.orange, 'starts at 0');
  yield* sequence(0.35, showBox(bValue), showBox(bSetter), showBox(bInit));
  yield* say('useState gives us the current value and a function to update it.');
  yield* waitFor(2);
  yield* hideBoxes(bValue, bSetter, bInit);

  // Swap the hard-coded 0 for state.
  yield* all(code().selection(DEFAULT, 0.6), zoomOut());
  yield* say('Now render the state instead of a hard-coded 0.');
  const h1Zero = code().findFirstRange(/(?<=<h1>)0(?=<\/h1>)/g);
  yield* code().selection(h1Zero, 0.4);
  yield* code().code.replace(h1Zero, '{seconds}', 0.7);
  yield* code().selection(DEFAULT, 0.5);
  caretPos([5, 28]);
  yield* waitFor(1);

  // -- Step 3 ---------------------------------------------------------------
  yield* step('3 / 5 · Side effect');
  yield* say('To tick every second, we reach for a side effect: useEffect.');
  yield* code().code.replace(find('{ useState }'), '{ useState, useEffect }', 0.7);
  yield* typeLines(5, [
    '  useEffect(() => {',
    '    const id = setInterval(() => {',
    '      setSeconds((s) => s + 1);',
    '    }, 1000);',
    '    return () => clearInterval(id);',
    '  }, []);',
    '',
  ]);
  running(true);
  yield* waitFor(1);

  // Functional updater.
  const updater = find('setSeconds((s) => s + 1);');
  yield* all(code().selection(updater, 0.6), zoomTo(center(updater), 1.9));
  const bUpd = box(find('(s) => s + 1'), C.green, 'always the latest value');
  yield* showBox(bUpd);
  yield* say('The functional updater always receives the latest value.');
  yield* waitFor(2);
  yield* hideBoxes(bUpd);

  // Cleanup.
  const cleanup = find('return () => clearInterval(id);');
  yield* all(code().selection(cleanup, 0.6), zoomTo(center(cleanup), 1.9, 0.9));
  const bClean = box(cleanup, C.red, 'cleanup', false);
  yield* showBox(bClean);
  yield* say('Returning a cleanup clears the interval when the component unmounts.');
  yield* waitFor(2.2);
  const deps = find('[]');
  yield* all(hideBoxes(bClean), code().selection(deps, 0.6), zoomTo(center(deps), 1.9, 0.6));
  const bDeps = box(deps, C.yellow, 'run once', false);
  yield* showBox(bDeps);
  yield* say('An empty dependency array means: set this up once.');
  yield* waitFor(1.8);
  yield* hideBoxes(bDeps);
  yield* all(code().selection(DEFAULT, 0.6), zoomOut());
  yield* waitFor(0.6);

  // -- Step 4 ---------------------------------------------------------------
  yield* step('4 / 5 · Start & Pause');
  yield* say("It ticks! But let's give the user control.");
  yield* typeLines(4, ['  const [running, setRunning] = useState(false);']);
  running(false);
  yield* secs(0, 0.4);
  yield* typeLines(7, ['    if (!running) return;']);
  yield* waitFor(0.3);
  const deps2 = find('[]');
  yield* code().selection(deps2, 0.4);
  yield* code().code.replace(deps2, '[running]', 0.7);
  yield* say('Adding running to the dependencies re-runs the effect when it changes.');
  yield* code().selection(find('[running]'), 0.4);
  yield* waitFor(1.6);
  yield* code().selection(DEFAULT, 0.5);

  yield* say('Then swap the heading for a heading and a button.');
  const ret = find('  return <h1>{seconds}</h1>;');
  yield* code().selection(ret, 0.4);
  yield* code().code.replace(
    ret,
    `  return (
    <>
      <h1>{seconds}</h1>
      <button onClick={() => setRunning(!running)}>
        {running ? 'Pause' : 'Start'}
      </button>
    </>
  );`,
    1,
  );
  yield* code().selection(DEFAULT, 0.4);
  caretPos([22, 1]);
  yield* all(timeTxt().y(-60, 0.6, easeOutCubic), button().scale(1, 0.6, easeOutBack));

  // Click start, watch it run, click pause.
  yield* say("Let's take it for a spin.");
  yield* mouse().position([60, 170], 0.9, easeInOutCubic);
  yield* click();
  running(true);
  yield* waitFor(3.2);
  yield* click();
  running(false);
  yield* mouse().position([200, 260], 0.6, easeInOutCubic);
  yield* waitFor(0.6);

  // -- Step 5 ---------------------------------------------------------------
  yield* step('5 / 5 · Format mm:ss');
  yield* say('Finally, format the seconds as minutes and seconds.');
  yield* typeLines(14, [
    "  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');",
    "  const ss = String(seconds % 60).padStart(2, '0');",
    '',
  ]);
  yield* scrollTo(-5 * LH);
  const h1 = find('{seconds}</h1>');
  const h1Inner: CodeRange = [h1[0], [h1[0][0], h1[0][1] + '{seconds}'.length]];
  yield* all(code().selection(h1Inner, 0.4), zoomTo(center(h1Inner), 1.6));
  yield* code().code.replace(h1Inner, '{mm}:{ss}', 0.8);
  formatted(true);
  yield* waitFor(0.4);
  yield* all(code().selection(DEFAULT, 0.5), zoomOut());

  // Fast-forward demo.
  yield* mouse().position([60, 170], 0.7, easeInOutCubic);
  yield* click();
  running(true);
  yield* waitFor(1.5);
  tickEvery(0.05);
  yield* all(ffBadge().opacity(1, 0.3), say('Fast-forward... it rolls over into minutes.'));
  yield* waitFor(3.6);
  tickEvery(1);
  yield* ffBadge().opacity(0, 0.3);
  yield* waitFor(1.2);
  yield* click();
  running(false);
  yield* mouse().position([330, 330], 0.6, easeInOutCubic);

  // -- Outro ----------------------------------------------------------------
  yield* step('Done ✓');
  caretPos([0, 0]);
  yield* say("That's it: a working React timer in 26 lines.");
  // Grow the editor so the whole file fits, and shrink the world to frame it.
  yield* all(
    scrollTo(0, 1.2),
    editor().height(26 * LH + 140, 1.2, easeInOutCubic),
    editor().y(-540 + (26 * LH + 140) / 2, 1.2, easeInOutCubic),
    world().scale(0.8, 1.2, easeInOutCubic),
    world().position([0, -68], 1.2, easeInOutCubic),
  );

  // Sweep a highlight through the key ideas.
  const recap: [string, string][] = [
    ['useState(0)', C.react],
    ['useEffect', C.purple],
    ['return () => clearInterval(id);', C.red],
    ['{mm}:{ss}', C.green],
  ];
  for (const [s, color] of recap) {
    const r = s === 'useEffect' ? code().findAllRanges(literal('useEffect'))[1] : find(s);
    const b = box(r, color);
    yield* all(code().selection(r, 0.4), showBox(b));
    yield* waitFor(0.6);
    yield* hideBoxes(b);
  }
  yield* code().selection(DEFAULT, 0.5);
  yield* say('Happy coding!');
  yield* waitFor(1.5);

  yield* all(
    world().scale(0.7, 1, easeInCubic),
    world().opacity(0, 1, easeInCubic),
    captionBox().opacity(0, 0.8),
  );
});

