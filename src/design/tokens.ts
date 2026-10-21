// Locked design tokens. Sampled from the primary references.
// Everything visual in a video should come from here. Do not invent new colors or sizes in scenes.

export const color = {
  // Canvas
  bg: '#252527', // charcoal stage
  bgDeep: '#1b1a1d', // vignette edge / under-card shadow tone
  grid: 'rgba(255,255,255,0.045)', // faint grid lines
  bgAce: '#111827', // 'aceternity' stage: base (Tailwind gray-900)
  gridAce: '#1f2937', // 'aceternity' stage: grid lines (Tailwind gray-800)
  // Light surfaces (primary cards)
  card: '#fbfbf9',
  cardTop: '#ffffff',
  cardLine: '#ecebf0', // row separators inside light cards
  // Dark surfaces (tiles, code, glass)
  tile: '#2f2e31',
  tileHi: '#3a393d',
  tileLine: 'rgba(255,255,255,0.08)',
  code: '#1c1c1f',
  // Text
  ink: '#111113', // on light
  inkSoft: '#3d3d42',
  inkMute: '#9e9ea2', // secondary on light
  inkFaint: '#c4c4c8', // disabled / struck on light
  paper: '#f5f5f7', // primary on dark
  paperSoft: '#b3b3b8', // secondary on dark
  paperMute: '#6e6e73', // tertiary on dark
  // Accents (use sparingly: one accent per idea)
  blue: '#1a84f5', // selection, progress, checks, eyebrows
  blueSoft: '#c2e2ff',
  sky: '#40a8e8', // italic serif accent word
  green: '#1aa868', // results, totals, "good"
  mint: '#c3e6d4',
  red: '#ff5f57',
  amber: '#febc2e',
  pink: '#fd83eb', // hero glow only
  pill: '#7b7b7d', // neutral value pill
} as const;

// Categorical palette for diagrams that need several distinct things (vectors, layers, services).
// Order matters: take them in order, never more than 4 at once.
export const series = [color.blue, color.green, '#f5a524', '#e5489d'] as const;

export const font = {
  sans: 'Creato Display', // two cuts: Regular (400) and Medium (500+)
  serif: 'Instrument Serif', // ONLY italic, ONLY for the one accent phrase in a headline
  mono: 'JetBrains Mono',
} as const;

// Type scale in px at 1920x1080. Vertical (1080x1920) uses the same numbers: the frame is as wide in px as 1080p is tall.
export const type = {
  hero: 96, // one big statement / number
  title: 64, // headline
  heading: 44, // card titles
  body: 34, // row labels, node labels
  label: 26, // pills, captions
  eyebrow: 22, // tracked caps
  code: 30, // minimum code size. Never below 26.
} as const;

// Creato Display has Regular and Medium only. semibold/bold resolve to Medium; hierarchy comes from size.
export const weight = {regular: 400, medium: 500, semibold: 500, bold: 500} as const;

export const radius = {card: 32, tile: 26, window: 22, pill: 999, chip: 14} as const;

export const space = {xs: 8, sm: 16, md: 24, lg: 40, xl: 64, xxl: 96} as const;

export const shadow = {
  card: '0 30px 80px rgba(0,0,0,0.55), 0 8px 20px rgba(0,0,0,0.35)',
  tile: '0 20px 50px rgba(0,0,0,0.45)',
  focus: `0 0 0 4px ${color.blue}, 0 0 60px rgba(26,132,245,0.55)`,
} as const;

// Safe areas. Short-form leaves room for platform UI (captions, buttons).
export const safe = {
  landscape: {x: 120, top: 90, bottom: 90},
  vertical: {x: 72, top: 220, bottom: 380},
} as const;

// Which Stage look videos use by default. 'classic' = primary references, 'aceternity' = landing page grid.
export type StageLook = 'classic' | 'aceternity';
export const stageLook: StageLook = 'aceternity';

export const FPS = 30;
