import {HighlightStyle} from '@codemirror/language';
import {tags as t} from '@lezer/highlight';
import {parser} from '@lezer/javascript';
import {LezerHighlighter} from '@motion-canvas/2d';
import fontUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2?url';

// Load the monospace font up-front so the canvas can use it.
const mono = new FontFace('JetBrains Mono', `url(${fontUrl})`, {weight: '500'});
document.fonts.add(mono);
export const fontsReady = mono.load();

export const MONO = 'JetBrains Mono';
export const SANS = 'Inter';

export const C = {
  bg: '#0b0d14',
  bg2: '#11131c',
  panel: '#1a1b26',
  panelEdge: '#2a2d3e',
  titleBar: '#151621',
  text: '#c0caf5',
  dim: '#565f89',
  react: '#61dafb',
  purple: '#bb9af7',
  green: '#9ece6a',
  blue: '#7aa2f7',
  orange: '#ff9e64',
  red: '#f7768e',
  yellow: '#e0af68',
  cyan: '#7dcfff',
};

const style = HighlightStyle.define([
  {tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword], color: C.purple},
  {tag: [t.string, t.special(t.string)], color: C.green},
  {tag: [t.number, t.bool, t.null], color: C.orange},
  {tag: [t.comment, t.lineComment, t.blockComment], color: C.dim},
  {tag: [t.function(t.variableName), t.function(t.propertyName)], color: C.blue},
  {tag: t.definition(t.variableName), color: C.text},
  {tag: [t.variableName, t.propertyName], color: C.text},
  {tag: [t.tagName, t.standard(t.tagName)], color: C.red},
  {tag: t.attributeName, color: C.yellow},
  {tag: [t.operator, t.punctuation, t.bracket, t.angleBracket, t.separator, t.derefOperator], color: C.cyan},
  {tag: t.className, color: C.yellow},
]);

export const jsxHighlighter = new LezerHighlighter(
  parser.configure({dialect: 'jsx'}),
  style,
);
