# Run Whisper in the browser — script

Read everything except the [bracket notes]; those are for the animation.
Source: sycamore-mono/frontend/public/whisper/worker.js, lib/tools/engines/speech/index.ts, lib/tools/engines/speech/windows.ts
Sizes checked 2026-10-21 (Hugging Face onnx-community/whisper-*, jsdelivr transformers.js 4.3.1 / onnxruntime-web 1.31).

---

[Headline, accent on "browser"]
So this is Whisper, OpenAI's speech-to-text model, and it's running right inside a browser tab. The audio never gets uploaded anywhere. It all happens on your machine.

[Pipeline: video → Whisper → subtitles]
I added this to the free tools in my captioning app. You drop in a video, and you get subtitles back. Now, normally, to do speech-to-text you'd send the audio to an API, and you pay for every minute of audio. That's fine for a paid product, but on a free tool it adds up fast. So I thought, okay, what if the user's own computer does the work?

[worker.js line 15]
Turns out you can do that with a library called transformers.js, from Hugging Face. It basically lets you run AI models in JavaScript. And the library itself is tiny, about half a megabyte.

[ListCard: transformers.js 0.6 MB · runtime ~15–28 MB · Whisper base ~77 MB · total ≈ 100 MB, once]
The model is the heavy part, though, and I want to be upfront about it. The first time someone uses the tool, they download about a hundred megabytes. That's the model plus the engine that runs it. But it only happens once. After that, the browser keeps it cached, and it loads instantly.

[Pipeline: page ⇄ worker]
Now, the first thing you run into is that Whisper is heavy to run, too. If you run it on the main thread, the whole page just freezes. So it lives in a web worker, which is basically its own separate thread. The page hands it the audio, and the worker hands back text. The page stays smooth the whole time.

[worker.js lines 20–26]
When the model loads, the worker checks if the browser has WebGPU. If it does, Whisper runs on your graphics card, and that's way faster.

[worker.js lines 44–61, focus webgpu block → wasm line]
And if it doesn't, or the GPU fails for whatever reason, it falls back to WebAssembly, which runs on the CPU. It's slower, but it works pretty much everywhere.

[worker.js lines 64–84, focus return_timestamps]
Once it's loaded, the actual transcription is one function call. You give it the audio, and you ask for timestamps, because for subtitles you need to know when each line starts and ends.

[index.ts lines 49–61]
Okay, so that's the worker. Back on the page, Whisper is picky about its input. It wants sixteen kilohertz, mono audio. Luckily the browser can do that conversion for you with something called an OfflineAudioContext. And if the audio's in stereo, we just average the two channels into one.

[StatCaption: 30 s]
But here's where it gets tricky. Whisper only listens to thirty seconds at a time. So your first thought is, fine, just chop the audio every thirty seconds. Except when you do that, you end up cutting people off in the middle of a word, and the subtitles come out broken.

[windows.ts lines 32–56, focus search loop]
So what we do instead is, right before each cut, we look back over the last five seconds and check how loud every tenth of a second is. Then we cut at the quietest spot. And that's almost always a little pause between words.

[windows.ts line 17; Compare: silence → "Thank you." in red]
Then there's this weird one. If you give Whisper silence, it doesn't give you back nothing. It makes stuff up. Usually it just says "Thank you." So any clip that's basically silent gets skipped before it ever reaches the model.

[windows.ts lines 65–80]
Whisper also likes to tag things that aren't speech, like blank audio, or music, or applause. So we strip those out with one regex, and we shift every timestamp so it lines up with the full video instead of the little clip it came from.

[index.ts lines 141–150]
And then the main loop just goes through the clips one by one, sends each one to the worker, and collects what comes back. One small detail: the first clip is also what triggers the model download, so that first progress bar is really just the download.

[Pipeline recap: decode → cut at pauses → skip silence → Whisper → clean → subtitles]
Finally, Whisper's sentences can get pretty long, so we break them up into lines you can actually read on screen. And then you can download them as SRT, VTT, or plain text.

[CTA]
So that's how you run Whisper in the browser. A hundred megabytes once, and after that, it's free. The tool's on my site if you want to try it, and the link's down below. And if you want something like this built into your own product, I do freelance work, so reach out. That link's down there too.
