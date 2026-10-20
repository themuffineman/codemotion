# The primary style, measured

Source: `images/primary-1…10.png`. These are not technical videos. What we take from them is the
visual language. Values are measured at 1280×720 and scaled ×1.5 into the 1920×1080 tokens.

## Overall feel

Calm, expensive, Apple-keynote-like. Dark room, bright objects. Lots of negative space, with one
focal object at a time placed near the center. It feels "designed", not "edited": UI-like cards
instead of slides, and real interface metaphors (receipts, Finder windows, timelines, app icons).

## Canvas

- Charcoal `#252527` with a very faint square grid (about 64px cells, white at about 4.5% alpha).
- The edges fall off to `#1b1a1d` (soft vignette). The grid never competes with content.
- Sometimes there is a soft colored light behind a hero object (pink glow behind the brain in ref 7).
  Use `Stage glow`, once per video at most.

## Surfaces

- **Light cards** (`card`): white to off-white vertical gradient, radius about 32px, a large soft
  drop shadow (0 30px 80px black at 55%). These carry the main subject: receipts, step cards,
  chapter cards, tiles.
- **Dark tiles** (`tile`): `#2f2e31` with a 1px hairline border. They hold secondary info: values
  under the timeline (ref 2, 3), placeholders.
- **Dashed slots**: empty states ("not yet") use a 2px dashed white-18% outline with a clock icon.
- **Windows**: macOS chrome with traffic lights and a centered title (refs 3, 4). Any app, file, or
  recording is shown inside a window.

## Type

- A neo-grotesk sans (SF Pro in the refs; we use Inter). Semibold for titles, medium for labels.
  Tight tracking (-0.02 to -0.035em) on big sizes.
- Secondary text is gray: `#9e9ea2` on light, `#b3b3b8` on dark.
- **Eyebrows**: small, tracked-out (0.28em) uppercase in blue: "REVISIONS", "CHAPTER 2", "RECEIPT".
- **Accent**: one phrase per headline in *italic serif*, light blue (`sky`), a bit larger than the
  sans: "complete *beginner's guide*", "the *fastest-growing* AI skill". This is the style's
  signature. Use it sparingly.
- Big numbers (`≈ 12 hours`, `+329%`, `1 h 30`) are bold, tight, and often green when they are a result.

## Color

- Mostly neutral. Color means something:
  - Blue `#1a84f5`: selection rings, check badges, progress rail, eyebrows, numbered dots.
  - Green `#1aa868` on mint `#c3e6d4`: totals and results.
  - Gray pills `#7b7b7d` with white text: values.
  - Struck-through, faded rows: removed or "not needed" items (ref 1).

## Motion (inferred from frames; refs 2, 9 show motion blur)

- Cards slide in sideways with a strong motion blur, then settle with no bounce.
- The camera pans across a horizontal row of cards and pushes in on the active one (refs 2→3→4).
- Focus is shown with a blue ring and glow plus a slight scale-up. Neighbors drop back with lower
  opacity and blur (depth of field, ref 9).
- Progress shows as a blue rail filling between dots. Done steps get a check badge that pops in.
- Things that fill in: values count up, rows reveal top-down, totals land last with emphasis.
- Leaving: a quick blur-out, never a hard cut between two graphics.

## Layout

- One composition, centered. Usually a hero card at about 50–60% of the frame width.
- With a talking head, the speaker takes one half. The other half darkens, and the graphics sit
  centered in it (refs 6, 8, 10).
- Supporting objects cluster around the hero: thumbnails under a window (ref 4), a badge under a
  tile (ref 3).

## How this maps onto technical content

The technical refs (ByteByteGo, the attention explainer) are flat: bright outline boxes on gray,
saturated cyan/green fills, thin white arrows. To re-skin them:

- Outlined boxes become light cards (`NodeTile`) or dark tiles with a single accent outline (`NodeBox`).
- Saturated fills become neutral surfaces, with color reserved for meaning (active, result, error).
- Straight white arrows become `Connector`s: drawn on, with dot endpoints. Dashed blue lines with
  a moving dot are for "data flows here".
- Their top-left "How the JVM Works / Phase 2" header becomes `SectionTag` (eyebrow + gray title).
- Code windows keep the same structure (traffic lights, file title) on our dark code surface with
  the kit theme, and they get line focus instead of static display.
- Everything builds up on cue instead of appearing all at once.
