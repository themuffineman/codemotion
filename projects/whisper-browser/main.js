// The page side: decode the file, cut it into clips Whisper can take,
// send each clip to the worker, and turn the results into subtitles.

const SAMPLE_RATE = 16000; // Whisper only takes 16 kHz mono audio
const MAX_CLIP = 30; // Whisper reads 30 seconds at a time
const LOOK_BACK = 5; // seconds to search for a pause before each cut
const FRAME = SAMPLE_RATE / 10; // loudness is measured every 100 ms
const SILENCE = 0.004; // below this loudness a clip counts as silence

const worker = new Worker("worker.js", { type: "module" });

// Decodes any audio or video the browser can play into 16 kHz mono samples.
async function decode(file) {
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
  const mono = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}

// How loud a stretch of audio is (root mean square).
function loudness(audio, from, to) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += audio[i] * audio[i];
  return Math.sqrt(sum / Math.max(1, to - from));
}

// Cuts the audio into clips of up to 30 s, each ending at the quietest moment near its end.
function cutAtPauses(audio) {
  const clips = [];
  let start = 0;
  while (start < audio.length) {
    let end = Math.min(audio.length, start + MAX_CLIP * SAMPLE_RATE);
    if (end < audio.length) {
      let quietest = Infinity;
      for (let f = end - FRAME; f >= end - LOOK_BACK * SAMPLE_RATE; f -= FRAME / 2) {
        const level = loudness(audio, f, f + FRAME);
        if (level < quietest) [quietest, end] = [level, f + FRAME / 2];
      }
    }
    clips.push({ start, end, silent: loudness(audio, start, end) < SILENCE });
    start = end;
  }
  return clips;
}

// Sends one clip to the worker and waits for its text chunks.
let nextId = 0;
function transcribe(audio, model, onMessage) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.id !== id) return onMessage(m); // progress or device updates
      if (m.type === "result") resolve(m.chunks);
      else reject(new Error(m.message));
    };
    worker.postMessage({ id, audio, model });
  });
}

// Whisper's tags for sounds that aren't speech, like "[BLANK_AUDIO]" or "(music)".
const NOT_SPEECH = /^[\s[(]*(blank_audio|music|applause|laughter|silence|inaudible|no speech|sound|noise)[^\])]*[\])]?\s*$/i;

// Turns each clip's chunks into subtitles with times in the full file.
function toSubtitles(results) {
  const subs = [];
  for (const { offset, length, chunks } of results) {
    for (const c of chunks) {
      const text = c.text.trim();
      if (!text || NOT_SPEECH.test(text)) continue;
      const end = c.timestamp[1] ?? length; // the last chunk can come back without an end
      subs.push({ start: offset + c.timestamp[0], end: offset + Math.min(end, length), text });
    }
  }
  return subs;
}

// Formats seconds as an SRT timestamp: 00:01:02,500
function srtTime(s) {
  const ms = Math.round(s * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

function toSrt(subs) {
  return subs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join("\n");
}

// The whole thing: file in, SRT text out.
export async function run(file, model, onStatus) {
  const audio = await decode(file);
  const clips = cutAtPauses(audio);
  const results = [];
  for (const [i, clip] of clips.entries()) {
    if (clip.silent) continue; // Whisper invents text on silence, so skip it
    onStatus(`Transcribing clip ${i + 1} of ${clips.length}`);
    const chunks = await transcribe(audio.slice(clip.start, clip.end), model, (m) => {
      if (m.type === "progress") onStatus(`Downloading ${m.file}: ${Math.round(m.percent)}%`);
      if (m.type === "device") onStatus(`Running on ${m.device}`);
    });
    results.push({ offset: clip.start / SAMPLE_RATE, length: (clip.end - clip.start) / SAMPLE_RATE, chunks });
  }
  return toSrt(toSubtitles(results));
}
