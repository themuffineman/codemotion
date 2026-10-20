import {continueRender, delayRender, staticFile} from 'remotion';

// Fonts are bundled in public/fonts so renders never depend on the network.
// Creato Display ships two weights. Regular covers 100–449 and Medium covers 450–900, so a request for
// 600/700 uses the real Medium cut instead of a faux bold.
// Imported once from Root. Rendering waits until they are ready.
const faces: [family: string, file: string, desc: FontFaceDescriptors][] = [
  ['Creato Display', 'fonts/CreatoDisplay-Regular.otf', {weight: '100 449', style: 'normal'}],
  ['Creato Display', 'fonts/CreatoDisplay-Medium.otf', {weight: '450 900', style: 'normal'}],
  ['Instrument Serif', 'fonts/InstrumentSerif-Italic.woff2', {weight: '400', style: 'italic'}],
  ['JetBrains Mono', 'fonts/JetBrainsMono.woff2', {weight: '100 800', style: 'normal'}],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fonts');
  Promise.all(
    faces.map(async ([family, file, desc]) => {
      const f = new FontFace(family, `url(${staticFile(file)}) format('${file.endsWith('.otf') ? 'opentype' : 'woff2'}')`, desc);
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
