// Runs Whisper in its own thread so the page never freezes.
// The page sends { audio, model }; this sends back progress, the device used, and the text.
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js";

let asr = null; // the loaded model, reused for every clip

// True when the browser can run the model on the graphics card.
async function hasWebGPU() {
  try {
    return Boolean(navigator.gpu && (await navigator.gpu.requestAdapter()));
  } catch {
    return false;
  }
}

// Downloads the model the first time (the browser caches it after that).
async function load(model) {
  const progress_callback = (p) => {
    if (p.status === "progress") self.postMessage({ type: "progress", file: p.file, percent: p.progress });
  };
  if (await hasWebGPU()) {
    try {
      asr = await pipeline("automatic-speech-recognition", model, {
        device: "webgpu",
        dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
        progress_callback,
      });
      return "webgpu";
    } catch {}
  }
  // No GPU (or it failed): run on the CPU with WebAssembly.
  asr = await pipeline("automatic-speech-recognition", model, { device: "wasm", dtype: "q8", progress_callback });
  return "wasm";
}

self.onmessage = async (e) => {
  const { id, audio, model } = e.data;
  try {
    if (!asr) self.postMessage({ type: "device", device: await load(model) });
    const out = await asr(audio, { return_timestamps: true });
    self.postMessage({ type: "result", id, chunks: out.chunks });
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err?.message ?? err) });
  }
};
