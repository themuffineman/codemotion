// Sends every test in tests.mjs to OpenRouter's /audio/speech endpoint on both models and saves an mp3
// per result in out/heygen/ and out/gemini/, plus out/results.json (timings and the billed cost of each
// request) and out/review.html, which plays the two clips of each test one above the other.
// Usage: node run.mjs [heygen|gemini] [testId ...]   (no model = both, no ids = all tests)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tests } from "./tests.mjs";

const MODELS = { heygen: "heygen/heygen-voice-1", gemini: "google/gemini-3.8-flash-tts" };
const OUT = new URL("./out/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

function apiKey() {
  if (process.env.OPEN_ROUTER_KEY) return process.env.OPEN_ROUTER_KEY;
  const env = readFileSync(new URL("../../../Amsterdam/.env", import.meta.url), "utf8");
  return env.match(/^OPEN_ROUTER_KEY="?([^"\r\n]+)/m)[1];
}

// One request per (test, variant) combination.
function jobs(test) {
  const variants = test.variants ?? [{ suffix: "" }];
  return variants.map((v) => ({
    name: [test.id, v.suffix].filter(Boolean).join("-"),
    input: v.input ?? test.input,
    instructions: v.instructions ?? test.instructions,
    test,
  }));
}

async function speak(body) {
  const t0 = performance.now();
  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const pcm = Buffer.from(await res.arrayBuffer());
  const rate = Number(res.headers.get("content-type").match(/rate=(\d+)/)?.[1] ?? 24000);
  return { pcm, rate, ms: Math.round(performance.now() - t0), ids: [res.headers.get("x-generation-id")] };
}

// Gemini does a dialogue in one request. HeyGen has no multi-speaker mode, so there it's one request
// per turn joined with a short pause.
async function speakJob(key, { input, instructions, test }) {
  const model = MODELS[key];
  if (key === "gemini") {
    const turns = Array.isArray(input) ? input.map((t) => ({ voice: t.gemini, text: t.text, instructions: t.instructions })) : input;
    return speak({ model, input: turns, voice: test.gemini, instructions });
  }
  if (!Array.isArray(input)) return speak({ model, input, voice: test.heygen });
  const turns = [];
  for (const t of input) turns.push(await speak({ model, input: t.text, voice: t.heygen }));
  const rate = turns[0].rate;
  const gap = Buffer.alloc(Math.round(rate * 0.35) * 2);
  return {
    pcm: Buffer.concat(turns.flatMap((t, i) => (i ? [gap, t.pcm] : [t.pcm]))),
    rate,
    ms: turns.reduce((s, t) => s + t.ms, 0),
    ids: turns.flatMap((t) => t.ids),
  };
}

// Both models return raw 16-bit PCM; the rate comes from the content-type header.
function toMp3(pcm, rate, file) {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", "pipe:0", "-b:a", "192k", file], { input: pcm });
  return pcm.length / 2 / rate;
}

// OpenRouter fills in a generation's billed cost a little after the request; retry until it's there.
async function billed(id) {
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`https://openrouter.ai/api/v1/generation?id=${id}`, { headers: { Authorization: `Bearer ${apiKey()}` } });
    if (res.ok) return (await res.json()).data.total_cost;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

const args = process.argv.slice(2);
const keys = Object.keys(MODELS).filter((k) => !args.some((a) => a in MODELS) || args.includes(k));
const only = args.filter((a) => !(a in MODELS));

for (const k of Object.keys(MODELS)) mkdirSync(OUT + k, { recursive: true });
const resultsFile = OUT + "results.json";
const results = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, "utf8")) : {};
const known = new Set(tests.flatMap(jobs).map((j) => j.name));
for (const name of Object.keys(results)) if (!known.has(name)) delete results[name];

for (const test of tests.filter((t) => !only.length || only.includes(t.id))) {
  for (const job of jobs(test)) {
    for (const key of keys) {
      process.stdout.write(`${key} ${job.name} ... `);
      try {
        const { pcm, rate, ms, ids } = await speakJob(key, job);
        const seconds = toMp3(pcm, rate, `${OUT}${key}/${job.name}.mp3`);
        results[job.name] ??= { test: test.id, title: test.title, input: job.input };
        results[job.name][key] = {
          model: MODELS[key],
          voice: test[key],
          ...(key === "gemini" && { instructions: job.instructions }),
          ms,
          seconds: +seconds.toFixed(2),
          ids,
        };
        console.log(`${seconds.toFixed(1)}s of audio in ${(ms / 1000).toFixed(1)}s`);
      } catch (e) {
        console.log("FAILED: " + e.message);
      }
    }
  }
}

for (const [name, r] of Object.entries(results)) {
  for (const key of Object.keys(MODELS)) {
    const run = r[key];
    if (!run || run.cost != null) continue;
    const costs = await Promise.all(run.ids.map(billed));
    if (costs.every((c) => c != null)) run.cost = +costs.reduce((a, b) => a + b, 0).toFixed(6);
    console.log(`${key} ${name}: $${run.cost ?? "?"}`);
  }
}

writeFileSync(resultsFile, JSON.stringify(results, null, 1));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (input) => (Array.isArray(input) ? input.map((t) => `<b>${t.gemini} / ${t.heygen}:</b> ${esc(t.text)}`).join("<br>") : esc(input));
const label = { heygen: "HeyGen Voice 1", gemini: "Gemini 3.8 Flash TTS" };
const rows = Object.entries(results)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, r]) => `<section><h2>${esc(name)} · ${esc(r.title)}</h2><p>${text(r.input)}</p>
${Object.keys(MODELS).filter((k) => r[k]).map((k) => `<p class="meta">${label[k]} · ${esc(r[k].voice)}${r[k].instructions ? ` · style: “${esc(r[k].instructions)}”` : ""} · ${r[k].seconds}s audio in ${(r[k].ms / 1000).toFixed(1)}s · $${r[k].cost ?? "?"}</p>
<audio controls preload="none" src="${k}/${esc(name)}.mp3"></audio>`).join("\n")}</section>`)
  .join("\n");
writeFileSync(OUT + "review.html", `<!doctype html><meta charset="utf-8"><title>HeyGen vs Gemini TTS</title>
<style>body{font:16px/1.5 system-ui;max-width:820px;margin:32px auto;padding:0 16px;background:#16171a;color:#e8e8ea}
section{border-top:1px solid #333;padding:12px 0}h2{font-size:18px;margin:0}.meta{color:#999;font-size:13px;margin:8px 0 2px}audio{width:100%}</style>
<h1>HeyGen Voice 1 vs Gemini 3.8 Flash TTS</h1>${rows}`);
console.log("\nOpen " + OUT + "review.html");
