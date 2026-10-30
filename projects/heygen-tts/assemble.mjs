// Builds the video's single audio track: the intro voiceover, then every test (a short pause for its title
// card, the HeyGen clip, then the Gemini clip of the same text), then the re-recorded outro with the verdict
// and the last line of the main take. Writes:
//   public/heygen-tts/master.mp3            the full mix
//   src/videos/heygen-tts/transcript.json   voice words, plus marker words: "test-<id>" where each test's
//                                           card appears and "clip-<model>-<name>" where each clip starts
//   src/videos/heygen-tts/clips.json        each clip's text, voice, style, billed cost, timings and loudness
// Usage (from the repo root): node projects/heygen-tts/assemble.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const RATE = 48000;
const WORK = "work/heygen-tts/";
const CLIPS = "projects/heygen-tts/out/";
const sec = (s) => Math.round(s * RATE) * 2; // seconds -> byte offset in s16le mono

const decode = (file, filter) =>
  execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, ...(filter ? ["-af", filter] : []), "-f", "s16le", "-ar", String(RATE), "-ac", "1", "pipe:1"], { maxBuffer: 1 << 30 });

// Two recordings: the main take (intro, and the old outro's last line) and the re-recorded outro with the verdict.
// The voice is recorded quieter than the clips; bring it up to the same loudness.
const load = (name) => ({
  pcm: decode(WORK + name + ".wav", "loudnorm=I=-19:TP=-1.5:LRA=11"),
  words: JSON.parse(readFileSync(WORK + name + ".json", "utf8")).words.map((w) => ({ text: w.text ?? w.word, start: w.start, end: w.end })),
});
const main = load("tight");
const outro = load("outro-tight");

// Misheard words in the final transcripts.
for (const words of [main.words, outro.words]) {
  words.forEach((w, i) => {
    const k = w.text.toLowerCase().replace(/[.,]/g, "");
    if (k === "heijen" || k === "heijan") w.text = w.text.replace(/heij[ae]n/i, "HeyGen");
    if (k === "heijen's") w.text = "HeyGen's";
    if (k === "too" && words[i - 1]?.text === "closer") w.text = "two.";
    if (k === "pull" && words[i + 1]?.text === "out") [w.text, words[i + 1].text] = ["put", "up"];
    if (k === "adorned") w.text = "done";
  });
}
// A doubled "it's it's" inside one long word in the outro: keep the second.
outro.drop = [[15.74, 16.06]];
outro.words.find((w) => Math.abs(w.start - 15.78) < 0.01).start = 16.06;

// The tests in the order they play; 13-tags is left out (HeyGen reads the tags aloud as words).
const LANGS = ["spanish", "french", "german", "italian", "japanese", "korean", "mandarin", "hindi"];
const plan = [
  ["01-narration"], ["02-news"], ["03-casual"], ["04-technical"], ["05-tongue-twister"], ["06-sad"], ["07-whisper"],
  ["08-laugh"], ["09-angry"], ["10-hype"], ["11-dialogue"], LANGS.map((l) => "12-languages-" + l),
];
const MODELS = ["heygen", "gemini"];

// Where each dialogue turn starts inside its clip (seconds), from Gladia word timings of the clip.
const TURN_WORDS = [9, 10, 5, 5, 8];
const turnStarts = (model) => {
  const w = JSON.parse(readFileSync(`${WORK}clips/${model}-11-dialogue.json`, "utf8")).words;
  let i = 0;
  return TURN_WORDS.map((n, t) => { const s = t ? w[i].start : 0; i += n; return +s.toFixed(2); });
};

const CARD = 1.8, PAD_BETWEEN = 0.9, PAD_PAIR = 1.0, PAD_AFTER = 0.8;

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
const find = (words, phrase) => {
  const t = phrase.split(" ").map(norm);
  const i = words.findIndex((_, i) => t.every((p, j) => norm(words[i + j]?.text ?? "") === p));
  if (i < 0) throw new Error("phrase not found: " + phrase);
  return [i, i + t.length - 1];
};
// The cut point just after a phrase / just before it, halfway into the pause around it.
const endOf = ({ words }, phrase) => {
  const last = words[find(words, phrase)[1]], next = words[find(words, phrase)[1] + 1];
  return next ? Math.min(last.end + 0.15, (last.end + next.start) / 2) : last.end;
};
const startOf = ({ words }, phrase) => {
  const [i] = find(words, phrase);
  return i ? Math.max(words[i].start - 0.15, (words[i - 1].end + words[i].start) / 2) : 0;
};

const results = JSON.parse(readFileSync(CLIPS + "results.json", "utf8"));
const silence = (s) => Buffer.alloc(sec(s));
const parts = [];
let t = 0; // output time, seconds
const outWords = [], clips = [];
const push = (buf) => { parts.push(buf); t += buf.length / 2 / RATE; };
const mark = (text, start) => outWords.push({ text, start: +start.toFixed(3), end: +(start + 0.1).toFixed(3) });

// Copy voice [a, b) of a recording to the output, minus its dropped ranges, carrying its words along.
function voiceRange({ pcm, words, drop = [] }, a, b) {
  let cur = a;
  for (const [da, db] of [...drop, [b, b]].filter(([da]) => da >= a && da <= b)) {
    const shift = t - cur;
    words.filter((w) => w.start >= cur && w.start < da).forEach((w) => outWords.push({ text: w.text, start: +(w.start + shift).toFixed(3), end: +(w.end + shift).toFixed(3) }));
    push(pcm.subarray(sec(cur), sec(da)));
    cur = Math.max(cur, db);
  }
}

voiceRange(main, 0, endOf(main, "decide for yourself"));
push(silence(PAD_AFTER));
for (const names of plan) {
  mark("test-" + names[0].replace(/-(spanish)$/, ""), t);
  push(silence(CARD));
  names.forEach((name, i) => {
    if (i) push(silence(PAD_PAIR));
    MODELS.forEach((model, j) => {
      if (j) push(silence(PAD_BETWEEN));
      const audio = decode(`${CLIPS}${model}/${name}.mp3`);
      const r = results[name], m = r[model];
      const start = t;
      push(audio);
      outWords.push({ text: `clip-${model}-${name}`, start: +start.toFixed(3), end: +t.toFixed(3) });
      clips.push({
        name, model, test: r.test, title: r.title, modelId: m.model, voice: m.voice, instructions: m.instructions ?? null, input: r.input,
        cost: m.cost, ms: m.ms, start: +start.toFixed(3), end: +t.toFixed(3),
        segments: name === "11-dialogue" ? turnStarts(model) : null, env: envelope(audio),
      });
    });
  });
  push(silence(PAD_AFTER));
}
// The re-recorded outro (totals and verdict), then the main take's last line asking for comments.
voiceRange(outro, 0, outro.pcm.length / 2 / RATE);
push(silence(0.3));
voiceRange(main, startOf(main, "so let me know"), main.pcm.length / 2 / RATE);

mkdirSync("public/heygen-tts", { recursive: true });
mkdirSync("src/videos/heygen-tts", { recursive: true });
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", String(RATE), "-ac", "1", "-i", "pipe:0", "-b:a", "128k", "public/heygen-tts/master.mp3"], { input: Buffer.concat(parts), maxBuffer: 1 << 30 });
writeFileSync("src/videos/heygen-tts/transcript.json", JSON.stringify({ words: outWords }, null, 1));
writeFileSync("src/videos/heygen-tts/clips.json", JSON.stringify(clips, null, 1));
console.log(`${clips.length} clips, ${outWords.length} words, ${t.toFixed(1)}s total`);
