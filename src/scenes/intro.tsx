import {Circle, Grid, Node, Rect, Txt, blur, makeScene2D} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInCubic,
  easeOutBack,
  easeOutCubic,
  loop,
  sequence,
  waitFor,
} from '@motion-canvas/core';
import {C, MONO, SANS} from '../theme';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  const grid = createRef<Grid>();
  const atom = createRef<Node>();
  const orbits: Circle[] = [];
  const nucleus = createRef<Circle>();
  const title = createRef<Txt>();
  const subtitle = createRef<Txt>();
  const pill = createRef<Rect>();
  const ring = createRef<Circle>();
  const glowA = createRef<Circle>();
  const glowB = createRef<Circle>();
  const content = createRef<Node>();

  const secs = createSignal(0);
  const fmt = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(Math.floor(n) % 60).padStart(2, '0')}`;

  view.add(
    <>
      <Circle ref={glowA} size={900} x={-600} y={-300} fill={C.react} opacity={0.08} filters={[blur(160)]} />
      <Circle ref={glowB} size={800} x={650} y={350} fill={C.purple} opacity={0.08} filters={[blur(160)]} />
      <Grid ref={grid} width={2400} height={1600} spacing={80} stroke={'#ffffff08'} lineWidth={1} start={0.5} end={0.5} />
      <Node ref={content}>
        <Node ref={atom} y={-190} scale={0}>
          {[0, 60, 120].map(rot => (
            <Circle
              ref={(c: Circle) => orbits.push(c)}
              width={300}
              height={110}
              rotation={rot}
              stroke={C.react}
              lineWidth={8}
              end={0}
            />
          ))}
          <Circle ref={nucleus} size={44} fill={C.react} scale={0} shadowColor={C.react} shadowBlur={40} />
          <Circle ref={ring} size={420} stroke={C.react} lineWidth={4} opacity={0.35} end={0} startAngle={-90} endAngle={270} />
        </Node>
        <Txt
          ref={title}
          y={40}
          fontFamily={SANS}
          fontWeight={800}
          fontSize={112}
          fill={'#ffffff'}
          text={''}
          letterSpacing={-2}
        />
        <Txt
          ref={subtitle}
          y={145}
          fontFamily={SANS}
          fontWeight={500}
          fontSize={40}
          fill={C.dim}
          opacity={0}
          text={'useState  ·  useEffect  ·  cleanup'}
        />
        <Rect
          ref={pill}
          y={265}
          width={260}
          height={84}
          radius={42}
          fill={'#ffffff0c'}
          stroke={'#ffffff22'}
          lineWidth={2}
          scale={0}
        >
          <Txt fontFamily={MONO} fontSize={44} fill={C.react} text={() => fmt(secs())} />
        </Rect>
      </Node>
    </>,
  );

  // Background drift.
  yield loop(Infinity, () =>
    all(glowA().position([-500, -200], 4).to([-650, -320], 4), glowB().position([550, 280], 4).to([650, 350], 4)),
  );
  yield* all(grid().start(0, 1.2, easeOutCubic), grid().end(1, 1.2, easeOutCubic), atom().scale(1, 0.9, easeOutBack));

  // Draw the React atom.
  yield* all(
    sequence(0.12, ...orbits.map(o => o.end(1, 0.8, easeOutCubic))),
    nucleus().scale(1, 0.6, easeOutBack),
  );
  yield loop(Infinity, () => atom().rotation(0).rotation(360, 12, t => t));

  // Title types itself.
  yield* title().text('Build a Timer in React', 1.1);
  yield* all(subtitle().opacity(1, 0.6), subtitle().y(130, 0.6, easeOutCubic));

  // Stopwatch ring + ticking pill.
  yield* all(pill().scale(1, 0.6, easeOutBack), ring().end(1, 3, t => t), secs(3, 3, t => t));
  yield* waitFor(0.4);

  // Fly through the atom into the next scene.
  yield* all(
    content().scale(6, 0.9, easeInCubic),
    content().opacity(0, 0.9, easeInCubic),
    grid().scale(1.6, 0.9, easeInCubic),
  );
});
