# HeyGen Voice vs Gemini TTS: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Format: an intro about HeyGen Voice, then its specs next to Gemini's on paper, then the head-to-head.
In the head-to-head each test opens with a centred title card (test number and name), then the HeyGen clip
plays, then the Gemini clip of the same text, each with its price and generation time on screen.
You don't need to talk between tests; the card says what's coming. Add a line only where you want one.
Clips: projects/heygen-tts/out/heygen/_.mp3 and projects/heygen-tts/out/gemini/_.mp3 (same file names, same texts).
Numbers: projects/heygen-tts/out/results.json, with the billed cost of every request on both models.

---

## 1. Intro: HeyGen Voice

[HeyGen logo; the OpenRouter model page for HeyGen Voice]
HeyGen, the company most people know for AI avatar videos, now has its own text to speech model called HeyGen Voice, and you can use it through OpenRouter. There's the normal version, and a Turbo version that's faster and a lot cheaper.

[Spec card, HeyGen Voice: 10 voices · 39 languages · voice cloning with your HeyGen key · $15 per 1M characters (Turbo $4)]
It comes with ten voices, it speaks thirty nine languages, and if you have a HeyGen account you can also use your own cloned voice with it. The price is fifteen dollars for a million characters of text, or four dollars on Turbo.

## 2. On paper: HeyGen vs Gemini

[Gemini logo slides in beside HeyGen; small thumbnail of the earlier Gemini video]
I already made a video on Google's Gemini 3.8 Flash TTS, which I think is one of the most realistic ones out there right now, so I'm going to put HeyGen up against it.

[Head-to-head table, rows reveal one at a time:
Price · $15 / 1M characters · $0.50 / 1M input + $9 / 1M audio tokens
Cost per minute of audio (our tests) · about 1.3 cents · about 1.4 cents
Speed (our tests) · about 2.8× faster than real time · about 1.9×
Voices · 10 · 30
Style instructions · no · yes
Emotion tags · [fill in after listening to 13-tags] · yes
Audio · 44.1 kHz · 24 kHz]
So on paper, the price ends up almost the same. In my tests both of them cost a bit over one cent for every minute of audio. HeyGen was faster though, it made the audio almost three times faster than real time, and Gemini was closer to two. Gemini has more voices, and it lets you describe how the voice should sound, which HeyGen doesn't.

[Headline: "Same text, same kind of voice"]
So for the tests, both models get exactly the same text, and I picked the closest voice I could on each side. HeyGen plays first and then Gemini, and you'll see what each clip cost and how long it took to make. I'm not going to say much, so just listen and decide for yourself.

## 3. The head-to-head

[Each test: centred title card ("Test 1 · Audiobook narration"), then HeyGen clip, then Gemini clip.
Under each clip: model, voice, cost, generation time. Order below.]

[Test 1 · 01-narration · Audiobook narration]
[Test 2 · 02-news · News anchor]
[Test 3 · 03-casual · Telling a friend a story]

[Test 4 · 04-technical · Commands, prices and versions]
This one is a developer explaining something, so there's commands, an address, prices, a version number and a date in it.

[Test 5 · 05-tongue-twister · Tongue twister]
[Test 6 · 06-sad · Grief]
[Test 7 · 07-whisper · Whisper]
[Test 8 · 08-laugh · Laughing while talking]
[Test 9 · 09-angry · Angry neighbour]
[Test 10 · 10-hype · Race commentator]

[Test 11 · 11-dialogue · Two friends talking]
HeyGen can't do two voices in one request, so for HeyGen I made each line on its own and joined them together. Gemini does the whole conversation in one go.

[Test 12 · 12-languages-* · Languages: one card, then pairs per language with a language label]
And the same message in Spanish, French, German, Italian, Japanese, Korean, Mandarin and Hindi.

[Test 13-tags goes here only if HeyGen acts the tags out; otherwise it's cut.]

## 4. Outro (re-recorded: Recording 34, then the last line of the main take)

[Totals: what every clip cost on each side, counting up]
So that's HeyGen Voice against Gemini. Making every clip in this video cost about six cents on HeyGen and about seven on Gemini, so the price is pretty much the same on both.

[Headline: "A very good first model"; pill: "Almost on par with Gemini"]
And now for my POV, I think this is a very good model. HeyGen has really done themselves proud, especially for their first model. It's very good, almost on par with Gemini.

[Both logos; "Which one would you use?"; CTA "Tell me in the comments"]
So let me know in the comments which one you'd use, and which test made it obvious which one you would pick.
