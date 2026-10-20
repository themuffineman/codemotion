# Recipes: technical refs rebuilt in the primary style

Each recipe gives the source reference, what it communicates, and the kit code. All snippets
run inside a `<Scene>` component with `const cue = useCue();`. Worked versions live in
`src/videos/jvm`, `src/videos/jvm-short`, and `src/videos/tour`.

---

## 1. Code walkthrough (technical-14, 15)
*"Here's the function… this line does X… then Y."*
```tsx
<Center>
  <Enter at={cue('open')} preset="rise">
    <CodeWindow file="code/App.java" lines={[1, 6]} size={34}
      steps={[{at: cue('main method'), lines: [2, 2]}, {at: cue('twenty one'), lines: [3, 3]}]} />
  </Enter>
</Center>
```
- Focus moves on cue. Unfocused lines dim but stay readable.
- For long files, use several scenes or several windows, each with a tight range. Never shrink below 26px.
- Add `SectionTag` when the video has phases.

## 2. Code typing in / generated output (technical-12)
```tsx
<CodeWindow file="code/App.bytecode.txt" lines={[1, 7]} title="Bytecode · javap -c" lang="java"
  lineNumbers={false} typeAt={cue('turns')} typeCps={90} />
```
`Terminal` is for commands with output:
`lines={[{at: cue('install'), cmd: 'npm install'}, {at: cue('then'), out: 'added 312 packages'}]}`.

## 3. Pipeline: A → B → C (technical-15, 17)
```tsx
<Pipeline gap={140} items={[
  {at: cue('dot java'), w: 220, h: 260, el: <DocIcon tag=".java" tagTone={color.blue} label="App.java" width={130} />},
  {at: cue('behind'), w: 360, h: 260, el: <NodeBox label="Behind the scenes" icon="question" tone={color.amber} width={340} />},
  {at: cue('cpu'), w: 280, h: 260, el: <NodeTile label="Machine code" icon="cpu" width={280} />},
]} />
```
- `w`/`h` is the slot. Make it match the element's real size, or arrows will float.
- Each arrow draws just before the next node arrives. `dashed` + `pulse` means "data is flowing".
- `dir="column"` for vertical flows (tokenizer stack, request lifecycles, any 9:16 flow).

## 4. Hub: fan-in / fan-out (technical-12, 13; primary-7)
```tsx
<Hub inputs={[...three NodeTiles...]} pitch={230}
  center={{at: cue('jvm loads'), w: 260, h: 220, el: <NodeBox label="JVM" icon="gear" tone={color.amber} active={1} />}}
  outputs={[{at: cue('carries'), w: 600, h: 330, el: <KeyValue title="Metadata" rows={...} />}]} />
```
- Horizontal: inputs on the left, outputs on the right. Use `inLabel`/`outLabel` for "information → tasks" style captions.
- `vertical`: one thing fans out to platforms or replicas below. Shift it up with a wrapper `translateY` if there are no inputs.
- Outputs as `NodeChip`s means "what it can do" (primary-7: "Edit a video", "Plan the animations").

## 5. Layer stack / delegation chain (technical-11)
```tsx
<LayerStack title="Class loader subsystem" flow="up"
  layers={[{label: 'Bootstrap class loader', icon: 'download', at: a}, {...}, {...}]}
  steps={[{at: cue('application'), index: 2}, {at: cue('platform loader'), index: 1}, {at: cue('bootstrap'), index: 0}]} />
```
The active layer becomes a light card with a blue ring. The others dim. Put the trigger (the request) under it as an outline `Pill`.

## 6. Vectors / tensors (technical-16, 17, 19)
```tsx
<Vector at={cue('vector')} label="Jake" />
<Label size={type.heading} tone={color.paperSoft}>+</Label>
<Vector at={cue('position')} tone={series[2]} label="position 1" fill={1} />
```
- Gray outline = raw data. Colored and filled = the thing being added or learned. Take colors from `series` in order.
- `values` shows numbers in the cells. `horizontal` for rows (input/output vectors around a layer).
- For "Linear layer, Y = WX + B": two horizontal `Vector`s with a `NodeBox` between them in a column `Pipeline`, and the formula as a mono `Label` to the right.

## 7. Comparison / evolution (technical-18, 20)
```tsx
<Compare winner={{index: 2, at: cue('won')}} columns={[
  {title: 'RNN', at: cue('rnns'), el: <NodeBox label="one step at a time" tone={color.paperMute} />},
  {title: 'LSTM', at: cue('lstms'), el: <NodeBox label="gated memory" tone={color.paperMute} />},
  {title: 'Transformer', at: cue('transformers'), el: <NodeBox label="attention, in parallel" tone={color.blue} />},
]} />
```
For "old stuff → new thing" (technical-20), use a 2-item `Pipeline`: a `Card tone="dark"` grid of the old things, an arrow, then a light `Card` with the new thing and `focus={1}`.
Do not copy their dense internal diagrams (LSTM gates). Abstract them to one label. If the internals
*are* the topic, build them up in steps with `Diagram`.

## 8. Metadata / config / API fields (technical-12)
`<KeyValue title="Metadata" rows={[{k: 'Classes', v: 'App', at}, ...]} />`. The keys are prose, the values are mono.

## 9. Section header (all ByteByteGo refs)
`<SectionTag eyebrow="Phase 2" title="Class loading" />`, top-left and persistent within a phase. Keep every
other element clear of it (it occupies roughly x 120–520, y 60–130).

## 10. Process / roadmap / progress (primary-2, 3, 4)
```tsx
const focus = useStepper([cue('planning took'), cue('design references', {n: 2})]);
<Camera keys={[{at: 0, x: 0}, {at: cue('planning took'), x: 420, scale: 1.12}, {at: cue('design references', {n: 2}), x: 20, scale: 1.12}]}>
  <Center><StepTimeline focus={focus} steps={[{n: 1, title: 'Planning', at, done, value: '≈ 90 min', valueAt}, ...]} /></Center>
</Camera>
```
The camera pans to the active card. Values fill the dashed slots. Done steps get a check.

## 11. Numbers and breakdowns (primary-1)
`ListCard` for itemized costs, benchmarks, or time saved: rows arrive on cue and the total lands last in mint/green.
Use `struck` on a row to show "not needed anymore". For one big number, use a light `Card` + `Counter`.

## 12. Chapters (primary-9)
`<ChapterCarousel activeAt={[cue('three chapters'), cue('second'), cue('third')]} chapters={[...]} />`.
Previews can be screenshots, a `Window`, or abstract `Thumb` tiles.

## 13. Talking head + graphic (primary-6, 8, 10)
```tsx
<TalkingHead src="aroll.mp4" side="left" graphicsAt={cue('jvm')}>
  <Headline sub="from source file to machine code">How the JVM <Accent>actually</Accent> runs your code</Headline>
</TalkingHead>
```
Use this for hooks, opinions, transitions between chapters, and anything personal. `side` is where the speaker is.

## 14. Tool / app / UI (primary-3, 4)
`<Window title="Claude Code" width={1100} height={640}><Img src={staticFile('shots/x.png')} /></Window>`, or
`<OffthreadVideo>` inside it for a screen recording. Pair it with a `StepTimeline` card or `NodeChip`s
around it to say what it is doing.

---

## Choosing between similar recipes
- **Sequence** → Pipeline. **Convergence/divergence** → Hub. **Hierarchy** → LayerStack. **Alternatives** → Compare.
- If you cannot say which of these the sentence is, it is probably a talking-head beat with a `Headline`.
