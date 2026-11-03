# Recreating a motion graphic from Twitter, frame by frame: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Look for this video: LIGHT MODE, NO GRID BACKGROUND. This overrides the skill's charcoal grid.
Scene changes: speed ramps from src/motion/ramps.tsx (RampTrack), with the clip's measured curves. Test reel: composition RampDemo.
No code on screen. The footage is the original clip and our recreation, side by side, stepped through frame by frame.
Original: Downloads/bulk_KKkcY9/002-39207fa8c1d8ec41b084fce2a4507dad.mp4 (1280x720, 60 fps, 12.3 s, 738 frames).
Recreation: amsterdam-agents/motion, composition FullVideo. Needs a full 1920x1080 render before this video is built.
Comparison sheets and frames: amsterdam-agents/motion/research/need-better-style/, one folder per section.
Facts come from the process log and the frame measurements, checked 2026-11-03.
Voice: Gemini TTS through OpenRouter, voice Schedar (no recording). The creator isn't credited by name: the user doesn't remember it. The original is labelled "Original, found on Twitter".
Render at 60 fps. Show it in the Studio before any render.

---

## 1. Hook

[Full screen: the original clip plays once, labelled "Original, found on Twitter"]
I was just scrolling on Twitter when I found this motion graphic, and I wanted to know exactly how it was made.

[Full screen: our recreation plays once]
And this is my version of it. I rebuilt the whole thing from scratch, using Claude Code and Remotion.

[Both side by side, playing together, labelled "Original" and "Recreation"]
So in this video, I'm gonna show you exactly how you can take any motion graphic you find online and recreate it. And we're not gonna go through the code. This is all about the technique.

[Chapter cards: The principles · The workflow · Frame by frame]
First, I'm gonna break down what makes this graphic feel so good, and the seven principles it's built on. Then I'll show you the workflow I used to recreate it, including the mistake that wasted my first two attempts. And finally, we'll go through the whole thing section by section, frame by frame. So let's dive right in.

## 2. Why it feels so good

[The original at quarter speed, then at full speed]
Before we recreate anything, you need to understand what you're actually looking at. You see, there's nothing complicated on screen here. It's some text, a few photos and a text box. What makes it feel expensive is how everything moves. And when you go through it frame by frame, it really comes down to seven principles.

## 3. The seven principles

[Principle 1 title. Graph: speed over time, a tall spike falling into a long tail, beside the word rising]
The first principle is the speed ramp. Nothing here moves at a steady speed. When this word comes in, it travels about fifty five pixels on its first frames, and just a few pixels per frame by the time it settles. So it arrives with a lot of energy, then it brakes. That one curve is most of the look.

[Principle 2 title. Frame 3 up close, with an arrow along the smear]
The second principle is motion blur that follows speed. The faster something moves, the more it smears, and only in the direction it's moving. As it slows down, it sharpens. So the blur isn't a filter you add on top. It comes from the movement.

[Principle 3 title. The cut at frame 135: the last frame before, the first frame after]
The third principle is cutting at full speed. Look at how these sections change. They don't fade into each other. Everything speeds up and then, right at its fastest, hard cut. Your eye is still moving, so the cut just feels like more momentum.

[Principle 4 title. The line of text and the tiles, with a very slow pan marked by arrows]
The fourth principle is that things barely ever stop. Even once the headline looks settled, it's still drifting slowly to the left, and the photos are still moving with it. It keeps the frame feeling alive, even when you can't quite tell why.

[Principle 5 title. The three words arriving; then a row of letters with uneven gaps]
The fifth principle is uneven timing. These words don't arrive together. Each one comes in two frames after the one before. And the typing later on comes in little bursts with pauses, so it feels like a person typing and not a machine.

[Principle 6 title. Three moments in a row: the cyan flood, the blue tint, the white flash]
The sixth principle is colour as a transition. Before a big change, the whole background floods with colour. Here it goes cyan, here it tints blue, and here it flashes completely white. So the colour tells you something's about to change, before anything actually moves.

[Principle 7 title. Frames 482 to 489, one at a time, big on screen]
And the seventh principle is strange single frames. Watch this text change. It disappears for one frame. It comes back. It changes. It disappears again. Then for three frames it's stretched out wide and flat, and it snaps back. At full speed you don't see any of that. It just feels snappy.

[Headline: "You can't direct what you can't see"]
Now, this might make you wonder, if Claude is doing the building, why would you need to learn any of this? Because Claude can only fix what you can point at. If all you can say is "it doesn't feel right", you won't get very far. But if you can say "the blur should follow the speed", now you can actually direct it.

## 4. The tools

[Row of real logos and pages: Claude Code, Remotion, Unsplash]
So let's get into how I made it. I used three things. Remotion, which lets you build videos with code. Claude Code, which did the analysis and wrote that code while I directed it. And Unsplash for the stock photos, because the people and products in the original aren't mine to reuse, so those are all placeholder images.

## 5. The mistake that cost me two attempts

[Three stills from the original: blurry blue, cyan and white "Need"]
Now, here's where I went wrong. I started with just three screenshots of the opening. You can see the word goes from this blurry, swollen blue to sharp white. So I figured it was a blur that slowly comes into focus, with some glow on top.

[Our first attempt: the word sits still and focuses in place]
And that's what we built. The end looked right, but the start was way too clean. Those fat, melted letters just weren't there.

[Close-up of the slotted "e"s, then our flipped-copy version]
Then I noticed the letter e looks mirrored, top to bottom. So we tried laying a flipped copy of the word over itself. It got closer, but it looked like a ghost sitting on top of the text. It was just wrong.

[Pull the frames into a contact sheet: the word rising from the bottom edge]
So I finally gave it the actual clip, and we pulled out every single frame. And that's when it clicked. The word isn't sitting still at all. It flies up from below the screen.

[Side by side: the word moving, with a vertical arrow along the blur]
That mirrored look is just motion blur. It's principle number two. The word moves so fast that the horizontal strokes smear away, and that turns the e's into slots. It was never a mirror.

[Headline: "Stills hide motion"]
And that's the biggest lesson in this whole video. A screenshot can't show you movement. So start with the real clip, not with a theory.

## 6. The workflow

[Contact sheet of the whole video, with seven coloured brackets appearing over it]
So here's the workflow that actually gets you good results. First, you split the video into sections. We measured how much each frame changes from the one before, and that shows you where the cuts are. This one has seven sections in just over twelve seconds.

[StepTimeline: Frames, Events, Measure, Build, Compare, Fix]
Then every section goes through the same steps. Pull out the frames. Write down what happens, event by event, before you build anything. Measure it. Build it. Compare it with the original. And fix what's wrong.

[A frame with tracking boxes on the word and tiles, numbers ticking per frame]
The measuring is what makes this work. For every moving thing, you get its position, its size and its colour on each frame. So you're not picking an animation curve and hoping it feels right. The motion gets copied from the original, number by number.

[Comparison sheet: original on top, ours below, with a problem circled]
And this next part is the most important step of all. You render the same frames and put them directly under the original. Almost every mistake we found, we only saw like this.

## 7. Section one: the glow

[Frame by frame: frames 2 to 12, original above ours]
So let's go through it, starting with section one. This whole section is less than half a second. You've got the speed ramp, and you've got the blur following it. And the colour goes from blue to cyan to white in about ten frames.

[Frame 3, then 13, with the curve of the word traced]
Now, see how the word curves near the bottom of the screen, and straightens out near the middle? My best guess is a lens effect over the whole frame, and the word just travels through it. So you never animate the curve. It happens on its own.

[Step through frames 2 to 11 with only the blue block highlighted]
And watch this little blue block. I assumed it was moving smoothly, but it isn't. It flickers through three shapes, two frames each, and by frame eleven it's gone.

## 8. Section two: the text and the tiles

[Frames 30 to 42, cropped on the text, one frame at a time]
Section two is where the text comes in. Each word blurs in on its own, and while they sharpen, the gaps between them close up.

[Six tiles with their paths drawn as trails]
The six photo tiles whip in from the edges, then swing round and settle, all slowing down together. Every one has its own path, measured from the frames.

[The card with the first photo, then the swap, then the Unsplash pages]
And by the way, the photo choice really mattered here. My first shot for this card had dark arms and a busy background, and it completely fought the clean look. So I swapped it for this one.

[Frames 96 to 134: the cyan flood, then the hard cut to the card; the blue ring opening]
Then everything speeds up, the text grows and turns blue, the background floods with cyan, and it hard cuts to the card. And this soft blue ring opens across it and fades out.

## 9. Section three: typing

[The pill sliding in, frames 196 to 207, cursor rotating as it arrives]
Next, this prompt box slides in, and it's already typing as it arrives.

[Frames 234 to 284, with a bar chart of the gaps between letters]
Here's a tip if you ever recreate typing: don't use a steady speed. We recorded the exact frame where each of the thirty five characters appears, and it comes in little bursts. And when the text wraps to a second line, the box grows to fit it.

[Back to frames 195 and 196: the small dark sliver circled]
And here's another thing I got wrong. This tiny sliver looked like the card collapsing at the end of the last section, so we built that. Then going through this section, it turned out to be the cursor flying in. So your later work can correct your earlier work, and you have to be willing to go back.

## 10. Section four: the click

[Hard cut at frame 323, then frames 323 to 345: the button rounding out]
Then it cuts to a close-up, and the send button starts as a flat black streak and rounds out.

[Close-ups of the button, frames 357 to 375: the light sweeps across, the cursor turns into a hand]
For small details like this, a contact sheet isn't enough, so you crop in. That's how we saw this soft light sweep across the button, right as the cursor turns into a hand. That's the hover.

[Frames 376 to 391: blue rim, button shrinking, white flash]
And then the click. The button shrinks, it gets a blue rim, and the whole frame flashes white.

## 11. Section five: the glitch

[Five product cards with one curved path drawn through them]
Section five is where you get that glitchy text from earlier, and the products move along one curved path, like items on a wheel, forward and then backward. Now, this was the hardest thing to track, because the cards move so fast they smear into each other. So I'll be honest, on the fastest frames those paths were worked out by eye.

## 12. Sections six and seven: the ending

[BAIXO rising, holding, then pulling away]
The last two sections are the simplest. One word rises in, holds, then pulls away quickly.

[Hard cut to the end card; then the opening and the end card side by side]
Then it hard cuts to black, with the last text too big for the frame, shrinking inside a soft white glow. And that's such a nice touch, because it echoes the blue glow from the very beginning.

## 13. Put it all together

[Sections playing in order, with the joins circled in red]
Once every section looks right, you render the whole thing as one video, and you check the joins. Because each section looked fine on its own, but together we found product cards peeking in from off screen, and the cursor missing for two frames.

## 14. How close did we get?

[Side by side, with labels pointing at each difference]
So how close did we get? The timing and the movement are very close. The biggest difference is the photos, because mine are a lot more colourful than the original's. The prompt box in the original also bends slightly at the edges, and I didn't build that. The first frames of the opening aren't quite as melted. And the original has sound, which I left out.

## 15. Your turn

[StepTimeline again, condensed: Real clip, Sections, Events, Measure, Build, Compare]
So if you wanna try this yourself, here's all you need to do. Start with the real clip. Split it into sections. Describe what happens before you build anything. Then measure it, build it, and compare it right next to the original.

[Both versions side by side, one last time]
And if you recreate something with this, send it to me, I'd love to see it. See you in the next one.
