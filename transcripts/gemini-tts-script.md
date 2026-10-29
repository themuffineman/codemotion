# Gemini TTS review: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Format: a short intro, then the clips do the talking. Between clips you only say what's coming next, no opinions,
so viewers make up their own minds. The one opinion is in the intro.
Clips: codemotion/projects/gemini-tts/out/*.mp3 (texts and style prompts in tests.mjs).
Each clip plays in full after your line, with its text and style prompt on screen.

---

## 1. Intro

[Google and Gemini logos; the OpenRouter model page for Gemini 3.8 Flash TTS]
Google just released two new text to speech models, Gemini 3.8 Flash TTS and Gemini 3.8 Flash TTS Lite, and you can use both of them on OpenRouter. I've been playing with them for a bit, and honestly, I think this is probably the most realistic text to speech out there right now.

[OpenRouter logo; a small request card: model, voice, input text, instructions]
The way it works is pretty simple. You send it the text you want it to say, you pick one of the voices, and then you can add a style instruction, which is just a sentence describing how it should sound, like calm, or excited, or whispering.

[The same text with <laughs> and <whispering> tags highlighted inside it]
And you can also put little tags with angle brackets right inside the text, to change the emotion halfway through a sentence.

[Headline: "You decide"]
So in this video I'm going to run it through a bunch of different tests, and I'm not going to say much. I'll just tell you what each test is, and you can listen and decide for yourself how good it is.

## 2. The basics

[Clip 01-narration]
Let's start with something simple, a calm audiobook narrator.

[Clip 03-news]
Next, a news anchor.

[Clip 02-casual]
Now something more casual, like someone telling a friend a story, with the ums and the pauses.

[Clip 09-technical]
This one is a bit harder. It's a developer explaining something, so there's commands, a URL, prices, a version number and a date in there.

[Clip 10-tongue-twister]
And a quick tongue twister.

## 3. Emotion

[Clip 04-sad]
Now let's try emotion. First, someone talking about losing a person they love.

[Clip 07-whisper]
Then a whispered bedtime story.

[Clip 08-laugh]
Here it has to laugh while it's telling a story.

[Clip 06-angry]
Here's an angry customer on the phone.

[Clip 05-hype]
And a football commentator when the winning goal goes in.

[Clips 13a, 13b, 13c, one after the other, the same line on screen]
This next one is the same sentence three times, and the only thing I change is the style instruction. Happy, then suspicious, then terrified.

## 4. Inline tags

[Clip 16-inline-angle, the tags highlighted as they're reached]
Now the angle bracket tags. There's no style instruction here, the emotions only come from the tags in the text.

[Clip 18-angle-mismatch]
And in this one, I put tags that don't really fit the words, to see if it follows them anyway.

## 5. Conversations

[Clip 11-dialogue, two voice cards that light up as they speak]
You can also give it a conversation with two different voices, and it does it in one go. Here's a short podcast style chat.

## 6. Languages and accents

[Clips 12 in order, each with its language name and flag-free label]
It also speaks a lot of languages, so here's the same message in Spanish, French, German, Portuguese, Japanese, Korean, Mandarin and Hindi.

[Clips 17 in order, each with its accent label]
And here's the same English sentence in different accents. It's the same voice every time, the only thing that changes is the instruction.

## 7. Flash vs Lite

[Two cards: Flash and Flash Lite, with their prices; play one, then the other]
Last one. Here's the same text on Flash, and then on the cheaper Lite model.

## 8. Outro

[Both model names; the review page]
So that's Gemini's new text to speech. Let me know in the comments which one surprised you the most, and which one you think gives it away as AI.
