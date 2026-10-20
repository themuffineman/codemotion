// Code theme tuned for video: high contrast on the dark code surface, few hues, no italics.
// Based on the Xcode dark palette, which matches the Apple-like primary style.
export const codeTheme = {
  name: 'techvid-dark',
  type: 'dark' as const,
  colors: {'editor.background': '#1c1c1f', 'editor.foreground': '#e8e8ed'},
  settings: [
    {settings: {foreground: '#e8e8ed', background: '#1c1c1f'}},
    {scope: ['comment', 'punctuation.definition.comment'], settings: {foreground: '#7f8c98'}},
    {scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'constant.language'], settings: {foreground: '#ff7ab2'}},
    {scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'], settings: {foreground: '#ff8170'}},
    {scope: ['constant.numeric', 'constant.character'], settings: {foreground: '#d9c97c'}},
    {scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: {foreground: '#6bdfff'}},
    {scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: {foreground: '#67b7a4'}},
    {scope: ['variable.parameter', 'variable.other.property', 'meta.object-literal.key'], settings: {foreground: '#a3d9ff'}},
    {scope: ['entity.name.tag', 'meta.decorator', 'entity.name.function.decorator'], settings: {foreground: '#ffa14f'}},
    {scope: ['keyword.operator', 'punctuation'], settings: {foreground: '#c8c8d0'}},
  ],
};
