---
name: tech-video
description: Turn a word-timed transcript of someone talking about tech (coding, tutorials, explainers) into a finished Remotion video in the house style — real code on screen, flow diagrams, system views, concept visuals — synced to speech. Use for any request to make, edit, or extend a long-form (16:9) or short-form (9:16) video in this repo.
---

# Tech video

You write a Remotion composition (real TSX) that sits on top of the recorded talk. The **style** is
fixed: colors, type, sizes, radii, shadows and motion come from `src/design/tokens.ts` and the kit's
motion helpers. The **components** are not fixed. The kit in `src/kit.ts` is a starting point, not a
limit. When no kit component shows a beat well, build a new one in the house style (see
"Custom components" below). A visual that clearly shows the idea beats a kit component that only half fits.

**The look comes from the primary references** (`reference/images/primary-*.png`): an Apple-like,
calm, premium motion-graphics style on a charcoal grid.
**The content types come from the technical references** (`reference/images/technical-*.png`): code
windows, pipelines, fan-in/fan-out hubs, layer stacks, vectors, side-by-side comparisons.
Every technical visual gets re-skinned in the primary look. `reference/style.md` explains the look.
`reference/recipes.md` shows how each technical visual is rebuilt with the kit.

## Inputs

- `transcript.json`: word-level timings `{words: [{text, start, end}]}` in seconds. This is the clock.
- A-roll video (optional): the speaker. Put it in `public/` and pass it to `<TalkingHead src>`.
- The codebase being discussed: the files you will show.

## From a raw voice recording to transcript.json

1. `ffmpeg -i <rec.m4a> -ac 1 -ar 48000 work/<name>/raw.wav` (mono: Gladia bills stereo twice and repeats utterances).
2. `python scripts/transcribe-gladia.py <mono audio> work/<name>/raw.json` (Gladia; key in `.env`). Read the printed
   utterances and pick the last clean take of every retake, including repeats the speaker didn't announce.
3. Write the keep ranges, then `python scripts/clean-audio.py raw.wav cuts.json clean.wav`.
4. `python scripts/tighten-audio.py clean.wav clean.json tight.wav` removes dead air, ums and ahs. It works from the
   transcript, not loudness, because fillers are loud and room noise sits near the silence threshold.
5. Transcribe the final audio again, check for leftover repeats (a long word duration hides a false start),
   fix misheard names, and save it as `src/videos/<name>/transcript.json`.

## Workflow

1. **Read the whole transcript first.** Write down the beats: one idea per beat. A beat is usually
   one or two sentences (3–12s long-form, 2–6s shorts). Name the phrase that starts each beat.
2. **Design each beat.** Start from "what would show this idea best?", not from "which component do
   we have?". If a recipe from the table below fits, use it. If it only half fits, build a custom
   visual for it. Change the scene type at least every ~8s on
   long-form and every ~4s on shorts. Return to the talking head between dense scenes so viewers
   can breathe. Roughly 1 graphics beat for every 1–2 talking-head beats is a good long-form rhythm.
3. **Put the real code in `public/code/`.** Copy the actual files from the repo (`cp`, never retype).
   Keep the original file names. For generated output (compiler output, logs, `--help` text),
   run the real command and save its output. Pick line ranges that match what is being said.
4. **Write the video** in `src/videos/<name>/Video.tsx`:
   `<TranscriptProvider>` → `<Stage/>` → `<Track>` → one `<Scene from="phrase">` per beat.
   Inside a scene, `const cue = useCue()` and pass `cue('word')` as `at` to every reveal.
5. **Register it** in `src/Root.tsx` with `lengthOf(transcript)` (1920×1080 or 1080×1920, 30fps).
6. **Preview:** `node scripts/preview.mjs <CompositionId> 2 4`, then open `out/<Id>-sheet.png`.
   For any frame that looks wrong, look closer with
   `npx remotion still src/index.ts <Id> out/x.png --frame=N`.
   Fix problems and preview again until it passes the checklist at the bottom.
7. **Render on Modal:** `node scripts/render-modal.mjs <Id>` (bundles, uploads, renders in parallel
   chunks on the marketing renderer, downloads to `out/<Id>.mp4`; minutes instead of ~30 min locally).
   `--frames 300` renders a quick 10 s test. Local fallback: `npx remotion render src/index.ts <Id> out/<Id>.mp4 --concurrency=2`.

Use `scripts/fake-transcript.mjs` only to block out layouts before the real audio exists.

## Recipes: what to show for what is being said

| The speaker is… | Use | Technical ref |
|---|---|---|
| Opening, framing the topic, hooks | `TalkingHead` + `Headline` with one `Accent` word, optional `AppIcon`/`PillRow`. Without face video this is centered over a `FocusShade` | primary 6, 8 |
| A line worth reinforcing (face video or not) | `Caption from to accent` — words appear as spoken | primary 28 |
| A single impressive number said aloud | `StatCaption` (kicker + count-up + unit) | primary 30 |
| "Link below", subscribe, next video | `CTA` | primary 27 |
| A collection: research, examples, a library, many outputs | `PerspectiveBoard` with `BoardCard`s, scrolling | primary 29 |
| Walking through specific code | `CodeWindow` with `steps` that move focus line-by-line on cue | 14, 15 |
| Showing code being written / output | `CodeWindow typeAt` or `Terminal` | 12 |
| "X goes into Y, comes out as Z" | `Pipeline` (row; `dir="column"` for vertical or tall flows) | 15, 17 |
| Many sources feed one thing / one thing feeds many | `Hub` (horizontal; `vertical` for fan-out to platforms) | 12, 13, primary 7 |
| A hierarchy, chain of delegation, layers | `LayerStack` with `steps` to highlight the active layer | 11 |
| Data shapes: arrays, embeddings, buffers, tensors | `Vector` (+ `Label` "+" "×" between them) | 16, 17, 19 |
| Fields, config, metadata, request/response | `KeyValue` | 12 |
| Comparing options or old vs new | `Compare` (with `winner`) or two `Card`s and a `Pipeline` arrow | 18, 20 |
| Steps of a process / a roadmap / progress | `StepTimeline` inside `Camera` that pans along it | primary 2, 3, 4 |
| Numbers, costs, benchmarks, a breakdown | `ListCard` (rows + highlighted total), `Counter` | primary 1 |
| Chapters / "in this video" | `ChapterCarousel` | primary 9 |
| A tool / app / UI | A real screen recording in a browser `Window`, zoomed onto what's being talked about (see "Screen recordings") | primary 3, 4 |
| A free-form architecture | `Diagram` with `nodes` + `edges` (last resort; prefer the layouts above) | 20 |

Node types for diagrams: `NodeChip` (actions/tasks), `NodeTile` (things, artifacts),
`NodeBox` (systems/processes, the subject), `DocIcon` (files as inputs), `AppIcon` (tools).

The table covers common beats. It is not a complete list of what a video may show.

## Custom components (encouraged)

Many beats are about something specific: a mechanism, a behavior, a before/after. Generic boxes and
pills don't show those well. For those beats, build a component that shows the actual thing.

**When to build one:** the closest kit component would only label the idea ("Canvas", "Measure", an arrow)
instead of showing it happening, or you would be stacking pills to describe something visual.

**How:**
- Write it at the top of `src/videos/<name>/Video.tsx`, with a one-line comment saying what it shows.
- Paint it with tokens only (`color.*`, `type.*`, `radius.*`, `shadow.*`, `font.*`), the same surfaces
  (light card = subject, dark tile = context), and the same motion (`Enter`, `useTween`, `useProgress`,
  `stagger`). It should look like it came from the kit.
- Drive every change from `cue()`, like any other reveal.
- If a second video needs it, move it into `src/components/` or `src/tech/`, export it from `src/kit.ts`,
  and add it to `reference/api.md`.

**Examples already built** (read these before writing a new one):
- `remotion-browser-v2`: `DrawDetail` (a card redrawn piece by piece on a canvas, words boxed as they
  are measured), `ZIndex` (two overlapping cards that swap order), `BackgroundTab` (a progress bar that
  crawls when its tab goes to the background), `ScreenZoom` + `RecordingCuts` (a zoomed, cue-cut screen recording).
- `remotion-browser`: `Filmstrip` (real frames of an exported video), `Growth` (a bill growing with users).
- `whisper`: `Waveform` (where a cut lands in the audio), `StruckPill`, `ProgressBar`.

## Screen recordings of a real app

When the video is about an app or tool, show it working for real: a recording of the actual page,
not a mock-up.
- Record it with `node scripts/record-browser-demo.mjs <frames-dir>` (see that file to change the actions). It
  draws a visible cursor, glides between elements, types at a human pace, and renders at 2560×1600 so
  zooms stay sharp. It also writes `marks.json` with when each action happened and where its element is.
- In the video, cut the recording to the narration with `RecordingCuts` (each part starts on its cue and
  is sped up to fit; label any sped-up part, e.g. "5× speed"), and zoom with `ScreenZoom` onto the
  element being talked about, using the rects from `marks.json`.

## Code tutorials

When the video teaches code, build it on screen from scratch, file by file, instead of only naming
the main APIs:
- Run the real setup commands (scaffold, install, dev server) and show their real output in `Terminal`.
  Run them in a short, clean folder path, so the output doesn't show temp directories.
- Then walk each file in the order you'd write it, with `CodeWindow` steps on the lines being explained.
- If a line is too wide for `CodeWindow`, reformat it in the real source file (and re-copy it to
  `public/code/`), never just in the video.

## Logos

When a real product or company is named (Remotion, React, Vite, Chrome, AWS…), show its real logo, not a
generic icon. Logos come from **svgl.app** (free SVGs for most tech brands):
`node scripts/logo.mjs <search> [slug]` saves `public/logos/<slug>.svg` (dark variant when there are two),
then `<Logo name="<slug>" size={96} />`. Search by company name ("amazon" finds AWS, "aws" doesn't);
browse https://svgl.app when unsure. If svgl has no logo, fall back to `AppIcon`.

## Hard rules

**Style**
- Use colors, sizes, radii, and shadows from `src/design/tokens.ts` only. Never write a hex value in a scene.
- Graphics sit on the persistent `<Stage/>` (charcoal + grid). Do not add other backgrounds.
- A centered hero (title, statement, single number) gets a `FocusShade` under it: the focal area sits slightly darker than the rest of the stage.
- The side-panel layout (graphics in one half) is ONLY for when there is face video (`TalkingHead src`). Without footage, keep compositions centered.
- Type: Creato Display (Regular + Medium only) for everything, Instrument Serif italic for `Accent`, JetBrains Mono for code. Hierarchy comes from size and color, not weight.
- Light cards are for the subject. Dark tiles are for context, values, and code.
- Blue means "this one / active / done". Green means "result / good". Red means "problem". Amber
  is for "the box we're explaining" (for example the JVM). Never more than 4 hues on screen.
- At most one `Accent` (italic serif) per headline, and only on the word that carries the meaning.
- Motion: things `rise`/`pop` in with a short blur and settle. No spins, bounces, wipes, or 3D flips.
  Leave a scene by its blur-out. Use `Camera` for pans and push-ins, never CSS transitions.
- Focus by contrast: the active item gets `focus` (blue ring + glow); the rest get `dim`.

**Legibility (overrides style)**
- Code is ≥ 26px (the default is 30), ≤ 16 lines per window, and fits the frame. `CodeWindow` throws
  if any of these is broken. Do not work around the throw. Pick a smaller range or split into steps.
- Code is always on the dark code surface with the kit theme. Never blur, rotate, or skew code that
  is meant to be read. Camera blur only happens while the camera is moving.
- Text on screen is at least `type.label` (26px). Body text in diagrams uses `type.body`.
- Keep everything inside the safe area (`safe.landscape` / `safe.vertical`). In 9:16, keep the
  bottom 380px and the top 220px clear for platform UI.
- Nothing overlaps unless it is meant to (a badge on a card). Labels never collide with the `SectionTag`.
- No more than ~7 items in a diagram at once. If there are more, build it up in steps or split the scene.

**Real code**
- `CodeWindow` only takes `file` + `lines` from `public/code/`. Line numbers shown are the real ones.
- Never paste code into a scene, and never "simplify" code you show. To show less, show fewer lines.
- When you abbreviate generated output (for example, long `javap` comments), say so in the window
  `title` or in the scene comment.

**Captions**
- Captions come from the transcript (`Caption from/to`), never typed text, so they always match the audio.
- ≤ 10 words per caption (≤ 6 in 9:16). At most one `accent` phrase, and only when the words carry the point.
- Over face video, use them on key lines only, not as full subtitles. Lower position with the bottom shade.

**Timing**
- Every reveal is cued to a spoken word with `cue('word')`. Never hard-code frame numbers.
  Arithmetic on cues is fine (`cue('x') + 10`, `stagger(cue('x'), i)`).
- A visual lands on or just before the word (the default lead is 3 frames). Never after.
- Cue reveals on the *earliest* word that introduces the idea, not the last word of the sentence.
  A visual should get ≥ 1s on screen before the scene changes.
- Scenes live inside `<Track>`. Each one holds until the next scene starts. Give `from` the first
  words of the beat. If a phrase repeats, use `fromN` (counted after the previous scene).
- Long-form: at most ~12s on one static composition. Add a step, a focus change, or a camera move.
- Shorts: something changes at least every 2s.

## Vertical (9:16)

- The same kit and the same px sizes. Layouts read the composition size automatically.
- One idea per screen. Headlines go at the top of the safe area, and the visual goes under them.
- Diagrams flow top to bottom (`Pipeline dir="column"`, `Hub vertical`). At most 3 columns.
- Code: `size={26}`, `maxWidth={936}`, ≤ 10 lines. Split long functions across scenes.
- `TalkingHead` puts the speaker in the bottom half and graphics on top.
- Captions sit above `safe.vertical.bottom`, at `type.heading` size, ≤ 6 words per caption.

## Before rendering: checklist (look at the contact sheet)

- [ ] Every beat has a visual that matches what is being said at that moment.
- [ ] No blank or near-empty frames, except intentional breathing room on the talking head.
- [ ] No text is cut off, overflowing, or overlapping. Everything is inside the safe area.
- [ ] Code is readable at phone size (look at the 0.4× sheet: you can still read it).
- [ ] One focal point per frame, and it is obvious.
- [ ] Colors and type all come from tokens. Accent is used once at most per headline.
- [ ] Scene types vary. There is no run of the same layout three times.
- [ ] No beat is forced into a kit component that only half fits. Those beats got a custom visual.
- [ ] Every real product named on screen shows its real logo.

## Files

- `src/kit.ts`: everything you import.
- `reference/style.md`: the primary style, measured.
- `reference/recipes.md`: how each technical reference is rebuilt, with code.
- `reference/api.md`: component props.
- `src/videos/jvm/Video.tsx` and `src/videos/jvm-short/Video.tsx`: complete worked examples. Read one before writing a new video.
- `src/videos/remotion-browser-v2/Video.tsx`: the newest example. It has a recorded demo with zooms, a from-scratch code
  walkthrough with real terminal output, real logos, and several custom components.
