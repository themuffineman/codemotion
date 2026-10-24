# techvid

Turns a word-timed transcript of a tech talk into a finished Remotion video, in one house style.

- **The model writes real Remotion code** (TSX), following the skill in `.claude/skills/tech-video/SKILL.md`.
- **Style is fixed, components are not.** Colors, type, sizes and motion come from the kit (`src/kit.ts`,
  `src/design/tokens.ts`). When no kit component shows a beat well, the video gets a custom one in the same style.
- **Code on screen is real**: `CodeWindow` reads files from `public/code/` by line range, and terminal output
  comes from running the real commands.
- **Apps are shown working**: real screen recordings with a visible cursor, zoomed onto what's being talked about.
- **Logos are real**: fetched from svgl.app into `public/logos/`.
- **The transcript is the clock**: every reveal is `cue('spoken word')`.

```
src/
  design/      tokens.ts (locked colors/type/sizes), fonts.ts (bundled woff2)
  motion/      enter/exit presets, springs, stepper, Camera
  timing/      TranscriptProvider, Track, Scene, useCue
  components/  Stage, Card, Pill, Badge, Headline/Accent, Logo, ListCard, StepTimeline, Window, Terminal…
  tech/        CodeWindow (Shiki), Diagram/Connector, Pipeline, Hub, LayerStack, Vector, KeyValue, Compare, nodes
  layout/      TalkingHead (A-roll + graphics side)
  videos/      one folder per video (newest full example: remotion-browser-v2)
public/code/   real source files and terminal output shown on screen
public/logos/  brand logos from svgl.app
projects/      small demo apps the videos are about
scripts/       audio cleanup, transcription, logos, screen recording, previews, Modal rendering
```

## Commands

```bash
npm i
npm run studio                                         # interactive Remotion Studio

# voice recording -> transcript (see the skill for the full steps)
python scripts/transcribe-gladia.py <mono audio> <out.json>
python scripts/clean-audio.py <raw.wav> <cuts.json> <clean.wav>      # cut retakes
python scripts/tighten-audio.py <clean.wav> <clean.json> <tight.wav> # remove dead air, ums and ahs

node scripts/logo.mjs <name>                           # real logo from svgl.app -> public/logos/
node scripts/record-browser-demo.mjs <frames-dir>      # screen-record a demo app (cursor, typing, marks)
node scripts/preview.mjs <Id> 6 6                      # contact sheet -> out/<Id>-sheet.png
node scripts/render-modal.mjs <Id>                     # render on Modal -> out/<Id>.mp4
```

`render-modal.mjs` needs `GCS_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` and `MODAL_RENDER_TOKEN` in
`../sycamore-mono/backend/.env`. Gladia needs `GLADIA_API_KEY` in `.env`. To render locally instead:
`npx remotion render src/index.ts <Id> out/<Id>.mp4 --concurrency=2`.

## Making a new video

Record the voiceover, then ask Claude Code: *"Make a video from `<recording>` about `<repo>`, using the tech-video skill."*
It cleans and transcribes the audio, copies the relevant source files into `public/code/`, writes
`src/videos/<name>/Video.tsx`, registers it in `src/Root.tsx`, previews, fixes, and renders.
