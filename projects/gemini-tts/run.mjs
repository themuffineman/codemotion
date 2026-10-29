// Sends every test in tests.mjs to OpenRouter's /audio/speech endpoint and saves an mp3 per result
// in out/, plus out/results.json (timings) and out/review.html (a page to listen through them).
// Usage: node run.mjs [testId ...]   (no ids = run all)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tests } from "./tests.mjs";

const DEFAULT_MODEL = "google/gemini-3.8-flash-tts";
const OUT = new URL("./out/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

function apiKey() {
  if (process.env.OPEN_ROUTER_KEY) return process.env.OPEN_ROUTER_KEY;
  const env = readFileSync(new URL("../../../Amsterdam/.env", import.meta.url), "utf8");
  return env.match(/^OPEN_ROUTER_KEY="?([^"\r\n]+)/m)[1];
}

// One request per (test, model, variant) combination.
function jobs(test) {
  const models = test.models ?? [DEFAULT_MODEL];
  const variants = test.variants ?? [{ suffix: "", instructions: test.instructions }];
  return models.flatMap((model) =>
    variants.map((v) => {
      const modelTag = models.length > 1 ? "-" + model.split("/")[1] : "";
      const name = [test.id, v.suffix].filter(Boolean).join("-") + modelTag;
      return { name, model, instructions: v.instructions, input: v.input ?? test.input, voice: v.voice ?? test.voice, test };
    }),
  );
}

async function speak({ model, instructions, input, voice }) {
  const body = { model, input, voice, instructions };
  const t0 = performance.now();
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const pcm = Buffer.from(await res.arrayBuffer());
  return { pcm, ms: Math.round(performance.now() - t0), type: res.headers.get("content-type") };
}

// Gemini returns raw 16-bit PCM; the rate comes from the content-type header.
function toMp3(pcm, type, file) {
  const rate = type.match(/rate=(\d+)/)?.[1] ?? "24000";
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", rate, "-ac", "1", "-i", "pipe:0", "-b:a", "192k", file], { input: pcm });
  return pcm.length / 2 / Number(rate);
}

mkdirSync(OUT, { recursive: true });
const resultsFile = OUT + "results.json";
const results = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, "utf8")) : {};
// drop results for tests that no longer exist in tests.mjs
const known = new Set(tests.flatMap(jobs).map((j) => j.name));
for (const name of Object.keys(results)) if (!known.has(name)) delete results[name];
const only = process.argv.slice(2);

for (const test of tests.filter((t) => !only.length || only.includes(t.id))) {
  for (const job of jobs(test)) {
    process.stdout.write(`${job.name} ... `);
    try {
      const { pcm, ms, type } = await speak(job);
      const seconds = toMp3(pcm, type, OUT + job.name + ".mp3");
      results[job.name] = { test: test.id, title: test.title, model: job.model, voice: job.voice, instructions: job.instructions, input: job.input, ms, seconds: +seconds.toFixed(2) };
      console.log(`${seconds.toFixed(1)}s of audio in ${(ms / 1000).toFixed(1)}s`);
    } catch (e) {
      console.log("FAILED: " + e.message);
    }
  }
}

writeFileSync(resultsFile, JSON.stringify(results, null, 1));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (input) => (Array.isArray(input) ? input.map((t) => `<b>${t.voice}${t.instructions ? ` (${esc(t.instructions)})` : ""}:</b> ${esc(t.text)}`).join("<br>") : esc(input));
const rows = Object.entries(results)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, r]) => `<section><h2>${esc(name)} · ${esc(r.title)}</h2>
<p class="meta">${esc(r.model)} · voice ${esc(r.voice)} · style: “${esc(r.instructions ?? "")}” · ${r.seconds}s audio, generated in ${(r.ms / 1000).toFixed(1)}s</p>
<p>${text(r.input)}</p><audio controls preload="none" src="${esc(name)}.mp3"></audio></section>`)
  .join("\n");
writeFileSync(OUT + "review.html", `<!doctype html><meta charset="utf-8"><title>Gemini TTS tests</title>
<style>body{font:16px/1.5 system-ui;max-width:820px;margin:32px auto;padding:0 16px;background:#16171a;color:#e8e8ea}
section{border-top:1px solid #333;padding:12px 0}h2{font-size:18px;margin:0}.meta{color:#999;font-size:13px}audio{width:100%}</style>
<h1>Gemini TTS tests</h1>${rows}`);
console.log("\nOpen " + OUT + "review.html");
