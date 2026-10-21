/**
 * Speech-to-text worker for the free subtitle tools (lib/tools/engines/speech).
 *
 * Runs OpenAI's Whisper in the browser with transformers.js, so audio never leaves the
 * device. Served as a plain file (not bundled) and loaded as a module worker; the
 * library and the model are downloaded from jsdelivr / Hugging Face on first use and
 * cached by the browser after that.
 *
 * Messages in:  { type: "transcribe", id, audio: Float32Array (16 kHz mono), model, language }
 * Messages out: { type: "load", progress: 0..1 }            while the model downloads
 *               { type: "device", device: "webgpu" | "wasm" } once loaded
 *               { type: "result", id, chunks: [{ start, end, text }] }
 *               { type: "error", id, message }
 */
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js";

/** The loaded pipeline and the model it was loaded for. */
let current = null;

async function hasWebGPU() {
  try {
    return Boolean(self.navigator.gpu && (await self.navigator.gpu.requestAdapter()));
  } catch {
    return false;
  }
}

/** Loads a model once; switching model loads the new one. Reports download progress. */
async function load(model) {
  if (current && current.model === model) return current.asr;
  const files = new Map();
  const progress_callback = (p) => {
    if (p.status !== "progress" || !p.total) return;
    files.set(p.file, { loaded: p.loaded, total: p.total });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    self.postMessage({ type: "load", progress: total ? loaded / total : 0 });
  };

  let asr;
  let device = "wasm";
  if (await hasWebGPU()) {
    try {
      asr = await pipeline("automatic-speech-recognition", model, {
        device: "webgpu",
        dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
        progress_callback,
      });
      device = "webgpu";
    } catch {
      asr = null;
    }
  }
  if (!asr) asr = await pipeline("automatic-speech-recognition", model, { device: "wasm", dtype: "q8", progress_callback });
  self.postMessage({ type: "device", device });
  current = { model, asr };
  return asr;
}

self.onmessage = async (e) => {
  const { type, id, audio, model, language } = e.data;
  if (type !== "transcribe") return;
  try {
    const asr = await load(model);
    const out = await asr(audio, {
      return_timestamps: true,
      // Clips are at most 30 s (the main thread cuts them at pauses), so no chunking here.
      task: "transcribe",
      ...(language && language !== "auto" ? { language } : {}),
    });
    const chunks = (out.chunks ?? [{ timestamp: [0, audio.length / 16000], text: out.text }]).map((c) => ({
      start: c.timestamp[0] ?? 0,
      end: c.timestamp[1] ?? audio.length / 16000,
      text: c.text,
    }));
    self.postMessage({ type: "result", id, chunks });
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err?.message ?? err) });
  }
};
