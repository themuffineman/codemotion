import {continueRender, delayRender, staticFile} from 'remotion';

// Fonts are bundled in public/fonts (variable woff2, latin subset) so renders never depend on the network.
// Imported once from Root. Rendering waits until they are ready.
const faces: [family: string, file: string, desc: FontFaceDescriptors][] = [
  ['Inter', 'fonts/Inter.woff2', {weight: '100 900', style: 'normal'}],
  ['Instrument Serif', 'fonts/InstrumentSerif-Italic.woff2', {weight: '400', style: 'italic'}],
  ['JetBrains Mono', 'fonts/JetBrainsMono.woff2', {weight: '100 800', style: 'normal'}],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fonts');
  Promise.all(
    faces.map(async ([family, file, desc]) => {
      const f = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, desc);
      await f.load();
      document.fonts.add(f);
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}
