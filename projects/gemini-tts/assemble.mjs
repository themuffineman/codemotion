// Builds the video's single audio track: the voiceover, with each test clip played right after
// the line that introduces it. Writes:
//   public/gemini-tts/master.mp3            the full mix
//   src/videos/gemini-tts/transcript.json   voice words, plus a marker word "clip-<name>" at each clip
//   src/videos/gemini-tts/clips.json        each clip's text, voice, style, start/end and turn timings
// Usage (from the repo root): node projects/gemini-tts/assemble.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const RATE = 48000;
const WORK = "work/gemini-tts/";
const CLIPS = "projects/gemini-tts/out/";
const sec = (s) => Math.round(s * RATE) * 2; // seconds -> byte offset in s16le mono

const decode = (file, filter) =>
  execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, ...(filter ? ["-af", filter] : []), "-f", "s16le", "-ar", String(RATE), "-ac", "1", "pipe:1"], { maxBuffer: 1 << 30 });

// The voice is recorded quieter than the clips; bring it up to the same loudness.
const voice = decode(WORK + "tight.wav", "loudnorm=I=-19:TP=-1.5:LRA=11");
const words = JSON.parse(readFileSync(WORK + "tight.json", "utf8")).words.map((w) => ({ text: w.text ?? w.word, start: w.start, end: w.end }));

// Misheard words in the final transcript.
const fixes = { time: "tongue" };
words.forEach((w, i) => { if (fixes[w.text.toLowerCase()] && words[i + 1]?.text.startsWith("twister")) w.text = fixes[w.text.toLowerCase()]; });

// A stumble ("It's quite easy.") between two good lines.
const drop = [[77.1, 77.92]];

// Each entry: the line that introduces the clips, then the clips that play after it.
const plan = [
  ["audiobook narrator", ["01-narration"]],
  ["how that sounds", ["03-news"]],
  ["everything else", ["02-casual"]],
  ["all in there", ["09-technical"]],
  ["tongue twister", ["10-tongue-twister"]],
  ["person they love", ["04-sad"]],
  ["bedtime story", ["07-whisper"]],
  ["if you hear it", ["08-laugh"]],
  ["on the phone", ["06-angry"]],
  ["goal goes in", ["05-hype"]],
  ["then terrified", ["13-same-text-styles-a-happy", "13-same-text-styles-b-suspicious", "13-same-text-styles-c-terrified"]],
  ["tags in the text", ["16-inline-angle"]],
  ["follows them anyway", ["18-angle-mismatch"]],
  ["you can see", ["11-dialogue"]],
  ["mandarin and hindi", ["spanish", "french", "german", "portuguese", "japanese", "korean", "mandarin", "hindi"].map((l) => "12-languages-" + l)],
  ["is the instruction", ["british", "scottish", "irish", "australian", "indian", "southern-us", "nigerian"].map((a) => "17-accents-" + a)],
  ["cheaper lite model", ["14-flash-vs-lite-gemini-3.8-flash-tts", "14-flash-vs-lite-gemini-3.8-flash-lite-tts"]],
];

// Where each turn / tagged phrase starts inside a clip (seconds), from Gladia word timings of the clip.
const segments = {
  "11-dialogue": [0, 3.9, 11.2, 13.4, 15.7],
  "16-inline-angle": [0, 3.8, 7.2, 8.9, 11.8],
  "18-angle-mismatch": [0, 4.9, 8.8, 12.2],
};

const PAD_BEFORE = 0.6, PAD_BETWEEN = 0.8, PAD_AFTER = 0.6;

// Loudness of a clip per video frame (30 fps), 0..1, for the on-screen waveform.
function envelope(pcm) {
  const per = RATE / 30, out = [];
  for (let f = 0; f * per * 2 < pcm.length; f++) {
    let sum = 0, n = 0;
    for (let i = f * per; i < (f + 1) * per && i * 2 < pcm.length; i++, n++) sum += pcm.readInt16LE(i * 2) ** 2;
    const db = 20 * Math.log10(Math.sqrt(sum / Math.max(1, n)) / 32768 + 1e-9);
    out.push(+Math.max(0, Math.min(1, (db + 50) / 44)).toFixed(2)); // -50 dB -> 0, -6 dB -> 1
  }
  return out;
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']+/g, "");
const endOf = (phrase) => {
  const t = phrase.split(" ").map(norm);
  const i = words.findIndex((_, i) => t.every((p, j) => norm(words[i + j]?.text ?? "") === p));
  if (i < 0) throw new Error("phrase not found: " + phrase);
  const last = words[i + t.length - 1], next = words[i + t.length];
  return next ? Math.min(last.end + 0.15, (last.end + next.start) / 2) : last.end;
};

const results = JSON.parse(readFileSync(CLIPS + "results.json", "utf8"));
const silence = (s) => Buffer.alloc(sec(s));
const parts = [];
let t = 0; // output time, seconds
const outWords = [], clips = [];
const push = (buf) => { parts.push(buf); t += buf.length / 2 / RATE; };

// Copy voice [a, b) to the output, minus the dropped ranges, carrying its words along.
function voiceRange(a, b) {
  let cur = a;
  for (const [da, db] of [...drop, [b, b]].filter(([da]) => da >= a && da <= b)) {
    const shift = t - cur;
    words.filter((w) => w.start >= cur && w.start < da).forEach((w) => outWords.push({ text: w.text, start: +(w.start + shift).toFixed(3), end: +(w.end + shift).toFixed(3) }));
    push(voice.subarray(sec(cur), sec(da)));
    cur = Math.max(cur, db);
  }
}

let cursor = 0;
for (const [phrase, names] of plan) {
  const cut = endOf(phrase);
  voiceRange(cursor, cut);
  cursor = cut;
  push(silence(PAD_BEFORE));
  names.forEach((name, i) => {
    if (i) push(silence(PAD_BETWEEN));
    const audio = decode(CLIPS + name + ".mp3");
    const r = results[name];
    const start = t;
    push(audio);
    outWords.push({ text: "clip-" + name, start: +start.toFixed(3), end: +t.toFixed(3) });
    clips.push({ name, test: r.test, title: r.title, model: r.model, voice: r.voice, instructions: r.instructions ?? null, input: r.input, ms: r.ms, start: +start.toFixed(3), end: +t.toFixed(3), segments: segments[name] ?? null, env: envelope(audio) });
  });
  push(silence(PAD_AFTER));
}
voiceRange(cursor, voice.length / 2 / RATE);

mkdirSync("public/gemini-tts", { recursive: true });
mkdirSync("src/videos/gemini-tts", { recursive: true });
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", String(RATE), "-ac", "1", "-i", "pipe:0", "-b:a", "128k", "public/gemini-tts/master.mp3"], { input: Buffer.concat(parts), maxBuffer: 1 << 30 });
writeFileSync("src/videos/gemini-tts/transcript.json", JSON.stringify({ words: outWords }, null, 1));
writeFileSync("src/videos/gemini-tts/clips.json", JSON.stringify(clips, null, 1));
console.log(`${clips.length} clips, ${outWords.length - clips.length} voice words, ${t.toFixed(1)}s total`);
