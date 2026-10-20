// Builds a word-timed transcript from plain text, for layout work before real audio exists.
// Real videos use a real word-level transcript (WhisperX, Deepgram, AssemblyAI) in the same shape.
// usage: node scripts/fake-transcript.mjs script.txt public/transcripts/out.json [wordsPerSecond]
import fs from 'node:fs';

const [, , inFile, outFile, wpsArg] = process.argv;
const wps = Number(wpsArg ?? 2.7);
const text = fs.readFileSync(inFile, 'utf8');
let t = 0.4;
const words = [];
for (const raw of text.split(/\s+/).filter(Boolean)) {
  const dur = Math.max(0.16, (raw.replace(/[^\w]/g, '').length / 5.5) / wps);
  words.push({text: raw, start: +t.toFixed(3), end: +(t + dur).toFixed(3)});
  t += dur + 0.06;
  if (/[.!?]$/.test(raw)) t += 0.45; // sentence pause
  else if (/[,;:]$/.test(raw)) t += 0.18;
}
fs.writeFileSync(outFile, JSON.stringify({words}, null, 1));
console.log(`${words.length} words, ${t.toFixed(1)}s`);
