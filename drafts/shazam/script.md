# The Algorithm Behind Shazam

**Format:** long-form 16:9, about 6 minutes spoken (~950 words)
**Alt titles:** "How Shazam Hears a Song in a Noisy Bar" · "Your Phone Listens for 5 Seconds and Knows the Song. Here's How."

Lines in plain text are spoken. `[VISUAL]` notes are cues for the edit (kit components in brackets).

---

## 1. Hook (0:00–0:30)

You're in a loud bar. People are talking, glasses are clinking, and somewhere under all that is a song you can't place.
You hold up your phone. Five seconds later, it tells you the name of the song, the artist, and the album.

`[VISUAL] Phone mockup, a waveform full of noise, then a result card pops in.`

Out of tens of millions of songs, it found the one you heard, through all that noise, in about the time it takes to blink a few times.
And it doesn't use AI to do it. It uses a trick from 2003 that's so simple you'll be able to explain it to a friend by the end of this video.

`[VISUAL] Headline: "No AI. One clever trick. 2003."`

---

## 2. Why this is hard (0:30–1:15)

First, let's see why the obvious approach fails.
The obvious idea is to compare the sound you recorded against every song, wave against wave.

`[VISUAL] Two waveforms sliding over each other [Compare].`

But a sound wave is incredibly fragile. Turn the volume down and every number changes. Add someone talking and the wave becomes a completely different shape.
You recorded in a bar, through a phone mic, starting at some random point in the song. Your wave and the original wave barely look related.

`[VISUAL] The clean wave turns jagged as "noise", "volume" and "random start" pills stack on top [Pill].`

On top of that, comparing raw audio against millions of songs would take forever.
So Shazam needed a fingerprint: something small, fast to search, and that survives noise.

`[VISUAL] ListCard: Small · Fast · Survives noise.`

---

## 3. Step one: turn sound into a picture (1:15–2:15)

Step one is to stop looking at the wave and look at its notes instead.
Any sound is made of many frequencies playing at once, low bass and high hats layered together. Math can pull them apart. The tool for that is called the Fourier transform.

`[VISUAL] One wave splits into three stacked sine waves: low, mid, high [LayerStack].`

Do that every fraction of a second and you get a picture called a spectrogram.
Time runs left to right. Pitch runs bottom to top. The brightness shows how loud each pitch is at each moment.

`[VISUAL] Spectrogram builds column by column. Axis labels: time →, pitch ↑.`

Now the song is an image instead of a wiggly line. That's step one.

---

## 4. Step two: keep only the stars (2:15–3:15)

Here's the first clever part.
Shazam throws away almost everything in the image. It keeps only the peaks: the loudest points in each small neighborhood, the moments where a note really stands out.

`[VISUAL] The spectrogram fades to black, leaving bright dots.`

What's left looks like a night sky. The original paper even calls it a "constellation map."

`[VISUAL] Dots twinkle; label "constellation map".`

Why do this? Because peaks are tough.
Background chatter is spread out and quiet. It fills in the dark parts of the picture, but it rarely beats the song's loudest notes. Turn the volume down and the peaks get dimmer, but they stay in the same places.
So even in that bar, most of the stars in your recording are the same stars as in the original song.

`[VISUAL] Noise speckles appear, but the main stars stay locked in place.`

---

## 5. Step three: connect the stars (3:15–4:15)

Single stars still aren't enough. Each one is just a pitch and a time, and millions of songs have a star at, say, 440 hertz.
So Shazam does what people have always done with the night sky: it draws lines between the stars.

`[VISUAL] Pick one star (the "anchor") and draw lines to a few stars just ahead of it [Connector].`

For each anchor star, it pairs it with a few stars that come right after it. Each pair becomes three numbers: the first pitch, the second pitch, and the time gap between them.

`[VISUAL] KeyValue card: pitch 1 = 523 Hz · pitch 2 = 784 Hz · gap = 0.21 s → hash.`

That little triplet is a hash, a fingerprint fragment. It's far more unique than a single star.
Shazam ran this on its entire song library ahead of time, storing every hash along with which song it came from and when it happens.

`[VISUAL] Hashes flow into a big database cylinder, each tagged "Song #, time" [Pipeline].`

When you hold up your phone, it does the same thing to your recording: build a spectrogram, find the stars, connect them into hashes, and send those tiny hashes to the server instead of the audio.

---

## 6. Step four: the moment of truth (4:15–5:15)

Now the server looks up your hashes. Each lookup is nearly instant, like looking up a word in a dictionary.
But there's a catch. A lot of your hashes will match songs at random, and the noise creates a few fake ones.
So how does it pick the real song?

`[VISUAL] Hits pop up scattered across dozens of songs. Looks like chaos.`

Here's the second clever part, and it's my favorite.
For every match, Shazam asks: when does this hash happen in the song, compared to when it happened in your recording?
If you started recording 62 seconds into the song, every real match has the same gap. The hash at second 1 of your clip is at second 63 of the song. Second 2 is at second 64. Every single one is off by exactly 62.

`[VISUAL] Two timelines (clip and song) with lines between matching hashes, all parallel.`

Random matches don't line up like that. Their gaps are all over the place.
So for each song, Shazam makes a chart of those gaps. Wrong songs give you a flat, messy spread. The right song gives you one huge spike.

`[VISUAL] Histogram per candidate song: flat, flat, flat, then one with a towering spike at "62 s". Accent glow on the spike.`

That spike is the answer. Even if noise ruined most of your hashes, the ones that survived all point to the same spot, and that's enough.

---

## 7. Payoff (5:15–6:00)

So, one more time:
Turn sound into a picture. Keep only the stars. Connect the stars into fingerprints. Find the song where all the fingerprints line up.

`[VISUAL] StepTimeline recap: Spectrogram → Stars → Hashes → Spike.`

No neural network, no giant AI model. It's just a clever way of looking at sound, published by Avery Wang in 2003. It's still the core idea behind Shazam today, more than twenty years and an Apple acquisition later.

`[VISUAL] Paper title card: "An Industrial-Strength Audio Search Algorithm", Avery Wang, 2003.`

So next time your phone names a song in a loud room, you'll know what it's really doing: looking at the stars.

`[VISUAL] Constellation zooms out into a real night sky. Title card.`

If you liked this, check out my video on the algorithm behind Google Maps. It's the same kind of magic.

---

## Short cut (9:16, ~50 s)

> Your phone hears five seconds of a song in a loud bar and knows exactly what it is. Here's how.
> First, it turns the sound into a picture, with pitch going up and time going across.
> Then it throws almost all of it away and keeps only the loudest points. They look like stars, and noise can't easily hide them.
> It connects nearby stars into pairs. Each pair, meaning two pitches and the time between them, is a fingerprint.
> It looks those fingerprints up in a database of every song.
> Here's the genius part. In the right song, every match is offset by the exact same amount of time. Plot it, and the real song is one giant spike.
> No AI. Just stars. Full video on my channel.

---

## Fact-check notes

- Source: Avery Li-Chun Wang, *An Industrial-Strength Audio Search Algorithm*, ISMIR 2003. Covers the spectrogram peaks ("constellation map"), anchor + target-zone pairs hashed as (f1, f2, Δt), and matching by histogramming time offsets.
- Apple acquired Shazam in 2018.
- The numbers in the KeyValue card (523 Hz, 784 Hz, 0.21 s) are illustrative.
- The production app has evolved since 2003. Saying "the core idea behind it" (not "the exact code it runs today") keeps the claim safe.
