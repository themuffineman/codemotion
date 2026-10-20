# Kit API (import everything from `src/kit.ts`)

`at`, `out`, `done`, and `valueAt` are **local frames**, always derived from `cue()`.

## Timing — `timing/transcript.tsx`
| | |
|---|---|
| `<TranscriptProvider transcript>` | root of every video |
| `<Track>` | holds `<Scene>`s; each scene lasts until the next starts (8-frame blur overlap) |
| `<Scene from fromN? to? pad? exit?>` | starts 6 frames before the phrase `from`; `to` only matters for the last scene |
| `useCue()` → `cue(phrase, {n?, lead=3, edge='start'\|'end'})` | local frame of the n-th occurrence of `phrase` after the scene start. Throws if not found |

## Motion — `motion/`
| | |
|---|---|
| `<Enter at out? preset>` | presets: `rise` (default), `fade`, `pop`, `slideLeft`, `slideRight`, `drop`, `blur` |
| `useEnter(at, preset)` / `useExit(at)` | style objects, for custom elements |
| `useProgress(at, 'smooth'\|'settle'\|'pop')` | spring 0→1 |
| `useTween(from, to)` | eased 0→1 |
| `useStepper(ats[])` | smooth active index for focus that moves through items |
| `stagger(at, i, step=4)` | |
| `<Camera keys={[{at, x?, y?, scale?, dur?}]}>` | pan/zoom with motion blur while moving |

## Surfaces & text — `components/`
| | |
|---|---|
| `<Stage glow?>` | the charcoal grid canvas (once, at the video root) |
| `<Center gap dir style>` | full-frame flex centering |
| `<Card tone='light'\|'dark'\|'glass' focus dim width height pad radius>` | `focus`/`dim` take 0..1 |
| `<Slot width height icon active>` | dashed placeholder |
| `<Headline size tone align sub maxWidth>` + `<Accent>` | balanced wrapping |
| `<Eyebrow>` `<Label size tone weight mono>` | |
| `<Pill variant='neutral'\|'white'\|'blue'\|'green'\|'ghost'\|'outline' icon iconBg size struck>` | |
| `<Badge at kind='check'\|'number' n>` | |
| `<Counter value at dur decimals prefix suffix>` | |
| `<Icon name size color>` | names: file folder code terminal gear cpu database server globe user check x clock bolt lock key layers box scissors pencil grid search arrowRight download sparkle brain question |
| `<ListCard title kicker rows=[{label,value,at,struck,tag}] total={label,value,at}>` | |
| `<StepTimeline steps=[{n,title,at,done,value,valueAt,thumb}] focus cardW gap>` | |
| `<ChapterCard n title preview>` / `<ChapterCarousel chapters activeAt heading>` | |
| `<Window title width height light focus>` | macOS frame for screenshots/recordings |
| `<Terminal title width lines=[{at,cmd}\|{at,out,tone}] cps>` | |
| `<PillRow items at variant>` | |

## Technical — `tech/`
| | |
|---|---|
| `<CodeWindow file lines=[a,b] title lang size=30 steps=[{at,lines}] typeAt typeCps lineNumbers maxWidth>` | real file from `public/code/`; throws on >16 lines, <26px, or overflow |
| `<Pipeline items=[{el,w,h,at}] dir gap dashed pulse>` | |
| `<Hub inputs center outputs vertical spread pitch dashed pulse inLabel outLabel>` | |
| `<LayerStack layers=[{label,icon,at}] flow steps=[{at,index}] title container width>` | |
| `<Vector cells values tone label horizontal cell at fill>` | |
| `<KeyValue title rows=[{k,v,at}] width tone>` | |
| `<Compare columns=[{title,at,el,tone}] winner={index,at}>` | |
| `<SectionTag eyebrow title vertical>` | |
| `<Diagram nodes=[{id,x,y,w,h,at,el}] edges=[{from,to,fromSide,toSide,at,dur,dashed,arrow,pulse,tone}]>` | free-form; x/y are centers |
| `NodeChip` `NodeTile` `NodeBox` `DocIcon` `AppIcon` | node visuals |

## Layout — `layout/`
| | |
|---|---|
| `<TalkingHead src side graphicsAt graphicsOut>` | A-roll plus graphics in the free half (the top half in 9:16) |
| `<ARoll src startFrom>` | full-frame speaker |

## Tokens — `design/tokens.ts`
`color.*`, `series[]`, `font.*`, `type.*` (hero 96, title 64, heading 44, body 34, label 26, eyebrow 22, code 30),
`weight.*`, `radius.*`, `space.*`, `shadow.*`, `safe.landscape|vertical`, `FPS`.
