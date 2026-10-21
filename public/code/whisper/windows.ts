import type { Cue } from "../subtitle/cues";

/**
 * The pure parts of the Speech engine (no browser APIs, unit-tested): cutting the audio
 * into clips Whisper can take, and turning its output into subtitle cues.
 */

export const SAMPLE_RATE = 16_000;

/** Whisper reads 30 s at a time. */
const MAX_WINDOW_S = 30;
/** Look this far back from a window's end for a pause to cut at, so words aren't split. */
const SEARCH_S = 5;
/** Loudness frames of 100 ms. */
const FRAME = SAMPLE_RATE / 10;
/** Below this RMS a clip is silence; Whisper invents text ("Thank you.") on silence, so it's skipped. */
const SILENT_RMS = 0.004;

export interface AudioWindow {
  /** Sample offsets into the full audio. */
  start: number;
  end: number;
  silent: boolean;
}

function rms(audio: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += audio[i] * audio[i];
  return to > from ? Math.sqrt(sum / (to - from)) : 0;
}

/** Splits audio into clips of at most 30 s, each ending at the quietest moment near its end. */
export function planWindows(audio: Float32Array): AudioWindow[] {
  const windows: AudioWindow[] = [];
  const max = MAX_WINDOW_S * SAMPLE_RATE;
  let start = 0;
  while (start < audio.length) {
    let end = Math.min(audio.length, start + max);
    if (end < audio.length) {
      // The quietest 100 ms frame in the last few seconds of the clip.
      let best = end;
      let bestRms = Infinity;
      for (let f = end - FRAME; f >= end - SEARCH_S * SAMPLE_RATE; f -= FRAME / 2) {
        const r = rms(audio, f, f + FRAME);
        if (r < bestRms) {
          bestRms = r;
          best = f + FRAME / 2;
        }
      }
      end = Math.round(best);
    }
    windows.push({ start, end, silent: rms(audio, start, end) < SILENT_RMS });
    start = end;
  }
  return windows;
}

export interface SpeechChunk {
  /** Seconds from the start of the clip. */
  start: number;
  end: number;
  text: string;
}

/** Whisper's markers for non-speech, e.g. "[BLANK_AUDIO]", "(music)", "[Applause]". */
const NON_SPEECH = /^[\s[(]*(blank_audio|music|applause|laughter|silence|inaudible|no speech|sound|noise)[^\])]*[\])]?\s*$/i;

/**
 * Turns the chunks of every clip into cues: times made absolute, empty and non-speech
 * chunks dropped, and runs of the same line (Whisper looping on noise) collapsed.
 */
export function chunksToCues(clips: { offsetS: number; durationS: number; chunks: SpeechChunk[] }[]): Cue[] {
  const cues: Cue[] = [];
  for (const clip of clips) {
    for (const c of clip.chunks) {
      const text = c.text.replace(/\s+/g, " ").trim();
      if (!text || NON_SPEECH.test(text)) continue;
      const start = Math.round((clip.offsetS + Math.max(0, c.start)) * 1000);
      // A missing or broken end time runs to the end of the clip.
      const endS = Number.isFinite(c.end) && c.end > c.start ? Math.min(c.end, clip.durationS) : clip.durationS;
      const end = Math.round((clip.offsetS + endS) * 1000);
      const prev = cues[cues.length - 1];
      if (prev && prev.text === text && start - prev.end < 2000) {
        prev.end = Math.max(prev.end, end);
        continue;
      }
      if (end > start) cues.push({ start, end, text });
    }
  }
  // Never overlap the next cue.
  for (let i = 0; i < cues.length - 1; i++) cues[i].end = Math.min(cues[i].end, cues[i + 1].start);
  return cues.filter((c) => c.end > c.start);
}
