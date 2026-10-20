# techvid

Turns a word-timed transcript of a tech talk into a finished Remotion video, in one house style.

- **The model writes real Remotion code** (TSX) from a fixed kit (`src/kit.ts`), following the skill in
  `.claude/skills/tech-video/SKILL.md`.
- **Style** comes from the primary references (`.claude/skills/tech-video/reference/images/primary-*`).
  **Content types** come from the technical references (`technical-*`), re-skinned in that style.
- **Code on screen is real**: `CodeWindow` reads files from `public/code/` by line range.
- **The transcript is the clock**: every reveal is `cue('spoken word')`.

```
src/
  design/      tokens.ts (locked colors/type/sizes), fonts.ts (bundled woff2)
  motion/      enter/exit presets, springs, stepper, Camera
  timing/      TranscriptProvider, Track, Scene, useCue
  components/  Stage, Card, Pill, Badge, Headline/Accent, ListCard, StepTimeline, ChapterCarousel, Window, Terminal…
  tech/        CodeWindow (Shiki), Diagram/Connector, Pipeline, Hub, LayerStack, Vector, KeyValue, Compare, nodes
  layout/      TalkingHead (A-roll + graphics side)
  videos/      jvm (16:9 demo), jvm-short (9:16 demo), tour (remaining components)
public/code/   real source files shown on screen
scripts/       preview.mjs (contact sheet), fake-transcript.mjs (layout before audio)
```

## Commands

```bash
npm i
npm run studio                                  # interactive Remotion Studio
node scripts/preview.mjs JvmDemo 2 4            # contact sheet -> out/JvmDemo-sheet.png
npx remotion render src/index.ts JvmDemo out/JvmDemo.mp4
```

`remotion.config.ts` points at the Chromium pre-installed in this environment. Remove that line on a normal machine.

## Making a new video

Ask Claude Code: *"Make a video from `transcripts/my-talk.json` about `<repo>`, using the tech-video skill."*
It copies the relevant source files into `public/code/`, writes `src/videos/<name>/Video.tsx`,
registers it in `src/Root.tsx`, previews, fixes, and renders.
