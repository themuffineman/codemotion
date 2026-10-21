import { ToolError, toToolError } from "@/lib/tools/errors";
import type { MediaPreset, OptionValues, SpeechPreset } from "@/lib/tools/presets";
import { FORMAT_FILES, serialize, type SubtitleDoc } from "../subtitle/formats";
import { breakLines, toTranscript } from "../subtitle/ops";
import type { SubtitleOutput } from "../subtitle";
import { SAMPLE_RATE, chunksToCues, planWindows, type SpeechChunk } from "./windows";

/**
 * The Speech engine: turns the speech in a video or audio file into subtitles, entirely
 * in the browser. The audio is decoded to 16 kHz mono, cut into clips of up to 30 s at
 * pauses, and each clip is transcribed by Whisper in a worker (public/whisper/worker.js).
 * Loaded with import() on first use, like the other engines.
 */

export type SpeechStage = "decoding" | "loading" | "transcribing";

export interface SpeechCallbacks {
  onStage?: (stage: SpeechStage) => void;
  /** 0..1 within the current stage. */
  onProgress?: (fraction: number) => void;
  /** Where the model runs: the GPU (fast) or the CPU. */
  onDevice?: (device: "webgpu" | "wasm") => void;
}

export interface SpeechResult {
  output: SubtitleOutput;
  summary: string;
  /** The same subtitles as WebVTT, for previewing them on the video with a <track>. */
  vtt: string;
}

/** Longest file we transcribe: decoded audio lives in memory, and the CPU path is slow. */
export const MAX_MINUTES = 30;

let worker: Worker | null = null;
let nextId = 0;

function getWorker(): Worker {
  if (!worker) worker = new Worker("/whisper/worker.js", { type: "module" });
  return worker;
}

/** Stops a running transcription: kills the worker (the model reloads from cache next time). */
export function cancelSpeech() {
  worker?.terminate();
  worker = null;
}

/** Decodes any audio or video the browser can play into 16 kHz mono samples. */
async function decodeWithBrowser(file: File): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  // Average the channels into mono.
  const out = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

/** For files the browser can't decode (e.g. AVI, some MKVs): extract the audio with ffmpeg first. */
async function decodeWithFfmpeg(file: File, onProgress?: (f: number) => void): Promise<Float32Array> {
  const { runMedia, mediaExt } = await import("../media");
  const ext = mediaExt(file.name) as MediaPreset["accept"][number];
  const extract: MediaPreset = {
    engine: "media",
    id: "speech:extract",
    label: "Extract audio",
    slug: "",
    category: "audio",
    output: "audio",
    op: "extract",
    accept: [ext],
    out: () => "wav",
    options: {},
    build: () => ({ output: ["-vn", "-ac", "1", "-ar", String(SAMPLE_RATE), "-c:a", "pcm_s16le"] }),
  };
  const { blob } = await runMedia(file, extract, {}, { onProgress });
  return decodeWithBrowser(new File([blob], "audio.wav", { type: "audio/wav" }));
}

/** Sends one clip to the worker and waits for its chunks. */
function transcribeClip(audio: Float32Array, model: string, language: string, cb: SpeechCallbacks): Promise<SpeechChunk[]> {
  const w = getWorker();
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "load") cb.onProgress?.(m.progress);
      else if (m.type === "device") cb.onDevice?.(m.device);
      else if (m.id !== id) return;
      else {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        if (m.type === "result") resolve(m.chunks);
        else reject(new Error(m.message));
      }
    };
    const onError = () => {
      w.removeEventListener("message", onMessage);
      cancelSpeech();
      reject(new ToolError("network", "The speech model couldn't be loaded. Check your connection and try again."));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ type: "transcribe", id, audio, model, language });
  });
}

export async function runSpeech(file: File, preset: SpeechPreset, o: OptionValues, cb: SpeechCallbacks = {}): Promise<SpeechResult> {
  if (typeof Worker === "undefined" || typeof OfflineAudioContext === "undefined") throw new ToolError("browser");

  cb.onStage?.("decoding");
  let audio: Float32Array;
  try {
    audio = await decodeWithBrowser(file);
  } catch {
    try {
      audio = await decodeWithFfmpeg(file, cb.onProgress);
    } catch (err) {
      throw toToolError(err, "unreadable");
    }
  }
  const seconds = audio.length / SAMPLE_RATE;
  if (seconds > MAX_MINUTES * 60) {
    throw new ToolError("too-large", `This file is ${Math.round(seconds / 60)} minutes long. Files up to ${MAX_MINUTES} minutes work here.`);
  }

  const windows = planWindows(audio);
  const speech = windows.filter((w) => !w.silent);
  if (!speech.length) throw new ToolError("no-audio", "No speech was found in this file: the audio is silent.");

  const model = `onnx-community/whisper-${String(o.model ?? "base")}`;
  const language = String(o.language ?? "auto");
  const clips: { offsetS: number; durationS: number; chunks: SpeechChunk[] }[] = [];
  const spoken = speech.reduce((n, w) => n + (w.end - w.start), 0);
  let done = 0;

  try {
    cb.onStage?.("loading");
    for (const [i, w] of speech.entries()) {
      // The first clip also loads the model: its progress is the download.
      const chunks = await transcribeClip(audio.slice(w.start, w.end), model, language, i === 0 ? cb : { onDevice: cb.onDevice });
      if (i === 0) cb.onStage?.("transcribing");
      clips.push({ offsetS: w.start / SAMPLE_RATE, durationS: (w.end - w.start) / SAMPLE_RATE, chunks });
      done += w.end - w.start;
      cb.onProgress?.(done / spoken);
    }
  } catch (err) {
    if (err instanceof ToolError) throw err;
    cancelSpeech();
    throw toToolError(err);
  }

  const cues = chunksToCues(clips);
  if (!cues.length) throw new ToolError("no-audio", "No speech was recognised in this file.");
  const doc: SubtitleDoc = { cues };
  const base = file.name.replace(/\.[^.]+$/, "") || "subtitles";
  const format = preset.target;
  // Whisper's segments can be long sentences: break them into readable subtitles.
  const broken = breakLines(doc, { maxChars: Number(o.maxChars ?? 42), maxLines: 2 });
  const vtt = serialize(broken, "vtt");

  if (format === "txt") {
    const text = toTranscript(doc);
    const words = text.split(/\s+/).filter(Boolean).length;
    return {
      output: { name: base, text, format: "txt", ...FORMAT_FILES.txt },
      summary: `Transcribed ${Math.round(seconds / 60) || "<1"} min of audio: ${words} words.`,
      vtt,
    };
  }

  return {
    vtt,
    output: { name: base, text: serialize(broken, format), format, ...FORMAT_FILES[format] },
    summary: `Created ${broken.cues.length} subtitles from ${Math.round(seconds / 60) || "<1"} min of audio.`,
  };
}
