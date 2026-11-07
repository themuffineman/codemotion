# Recreating the neon "hello" → Apple logo, frame by frame: script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Follow-up to the first recreate video (transcripts/recreate-motion-graphic-script.md). Same format: no code on screen,
the footage is the original and our recreation, stepped through frame by frame.
Original: public/hello/original.mp4 (1280x720, 30 fps, 9.8 s, 295 frames). The file name says it was posted by
Abraham John; label it "Original, posted by Abraham John on Twitter" (confirm the credit before publishing).
Recreation: composition HelloRecreation; side by side: HelloCompare. Per-frame sheets: scripts/compare-frames.mjs.
Measurements and the scripts behind them: projects/hello-recreation/ (README lists each one). Checked 2026-11-07.
Render at 30 fps, like the original. Show it in the Studio before any render.

---

## 1. Hook

[Full screen: the original plays once, labelled with the credit]
This is one of the most famous intros in tech. The word hello, written in one glowing glass tube, and then it turns into the Apple logo.

[Full screen: our recreation plays once]
And this is mine. Every frame of it is code, built with Claude Code and Remotion.

[Both side by side, playing together, labelled "Original" and "Recreation"]
Last time I recreated a motion graphic, it was text and photos moving around. This one is a lot harder. There's a shape that has to be drawn, light that has to look like glass, and a word that has to turn into a logo. So in this video I'll show you how we pulled all of that out of the original, one frame at a time.

[Chapter cards: The first discovery · The tube · The turn]
First, the discovery that cut the job in half. Then how you rebuild something that looks like real glass. And then the turn from hello to the logo, which took me five tries to get right. Let's go.

## 2. Half the video is free

[The original's frames as a filmstrip; frame 40 and frame 252 lift out and sit side by side]
Before building anything, we pulled out all two hundred and ninety five frames and compared them. And frame forty looked exactly like frame two hundred and fifty two.

[Pairs keep lifting out: 80 and 212, 120 and 172, 146 alone in the middle]
So we checked every pair. Frame one twenty matches one seventy two. Frame eighty matches two twelve. The whole video is a palindrome. It plays forward to the Apple logo, and then the exact same frames play backwards.

[The second half of the filmstrip fades, leaving frames 0 to 146]
So I only had to build the first half. The other half is the same thing in reverse. And that's my first tip: before you build anything, look for repeats. They're everywhere in motion graphics, and every one you find is work you don't have to do.

## 3. One stroke, in one order

[The appearance map: the word coloured from dark blue to orange by the frame each pixel first lights up]
Next question: how does the word get drawn? Is it one stroke or several? So we gave every pixel a colour based on the frame it first lights up. Dark blue is early, orange is late.

[The map's colours trace along the word, from the lead-in through the h, e, l, l, o and out the tail]
And it's one continuous stroke. It starts down on the left, swoops up into the loop of the h, comes down the stem, and then runs straight through e, l, l, o and out the tail.

[Graph: share of the word drawn against frames 5 to 40, flat at first, then shooting up]
And the speed isn't steady. The h alone takes almost a second. Then the rest of the word, all four letters, goes by in about a third of a second. So it starts slowly, then it's almost thrown across the screen.

[Frames 33 to 37 big on screen, the l's appearing as faint "u" shapes]
Look closely and the new part of the stroke doesn't appear at full strength either. It fades in over a couple of frames. So for a moment the l's are just these faint little "u" shapes, and then they fill in.

## 4. Tracing the shape

[A frame zoomed in with a fine grid over the h, and points being placed along the middle of the tube]
To rebuild the shape, I needed the line down the middle of the tube. My first try was automatic, and it failed, because the glow merges the letters into one blob. So we traced it on a ten pixel grid, letter by letter.

[The traced line and the tube's edges drawn over the real frame, hello and then the logo]
Then we drew the tube's edges over the real frame to check it. Where the green lines sit on the tube's edges, the shape is right. We did the Apple logo the same way, leaf and all.

## 5. Making it look like glass

[Close-up of a crossing in the original: where two parts of the tube overlap, it gets brighter]
Now, the hard part about this look. Look at where the tube crosses over itself. It doesn't hide the part behind it. The light adds up, so the overlap gets brighter. And when lots of it piles up, it goes white.

[Our tube with the overlaps lighting up; then a version with dark seams, crossed out]
So that's how we draw it. Light gets added together, never painted on top. But there's a catch. If you add up a tube with itself, every joint along it doubles up and you get bright beads all down the line. So we cut the tube into pieces that never overlap themselves. Inside a piece, the light doesn't stack. Between pieces, it does.

[The layers building up: a bright rim, the darker glass body, a tight glow, a wide glow]
On top of that it's just a few layers. A thin bright rim on the edges, a darker body inside, so it reads as glass, and two blurred copies of the whole thing for the glow.

## 6. The colours move

[A strip of the colour along the tube over sixty frames, the bands slanting]
And the colour isn't painted on. Take the colour along the tube in one frame, then a few frames later, and the whole pattern has slid forward. About eight pixels a frame at first, speeding up to about thirteen by the time the word turns.

[The palette as one bar, looping]
So we put together all the frames, and the pattern repeats about every fourteen hundred and fifty pixels along the tube. That gives you one looping gradient. Blue, violet, red, orange, pink, and back to blue. That's the whole colour scheme. One loop, sliding along the tube.

## 7. The turn: five attempts

[Frames 113 to 130 of the original, one at a time, big on screen]
Now the hardest part: hello turning into the Apple logo. In real time it's barely half a second, and I got it wrong four times.

[Attempt one: our word squashing as one flat piece, next to the original]
Attempt one. I thought the whole word was turning on one vertical axis, like a sign spinning. We fitted that to the frames, and it got about seventy percent overlap with the original, and then it stopped improving. Because the original doesn't do that.

[Tracked dots on the tops of the h and the two l's; the l dots stay still, the h dot slides left]
So we tracked the tops of the tall letters instead. And the two l's barely move until the very end. But the h is already sliding. So the letters aren't turning together. Each one turns on its own axis, the h first and the o last.

[A fit result reporting a 30 degree turn on a frame where nothing has moved, circled]
Attempt two was fitting that, and it lied to me. It said the letters were already turned thirty degrees on frames where nothing had moved. The test tube we were measuring with was fatter than the real one, so narrower letters always scored better. We had to calibrate the measuring tool on a still frame first.

[Ours with the letters as upright bars, next to the original's slanted strokes]
Attempt three: the letters collapsed into upright bars. But in the original they stay slanted, like italic strokes. So the axis each letter turns on leans with the handwriting, about fourteen degrees.

[Ours with the hump of the h squashed flat, next to the original's round arches]
Attempt four: closer, but the h lost its hump. In the original, only the loops collapse. The strokes joining the letters stay round, and that's why it reads as "hullo" for a moment.

[Attempt five, side by side with the original: loops turning one after another, then sliding into a stack, then the logo opening out]
So the final version: each loop turns on its own slanted axis, two frames after the one before. The joining strokes stretch between them. Then all the letters slide into one stack, and at the exact frame they're edge on, the Apple logo takes over and turns in, fast at first, and then it settles slowly for half a second.

[Headline: "Measure before you guess"]
And here's the lesson. Every one of those wrong turns was a guess about how it moved. Every fix came from measuring something in the frames.

## 8. How close did we get?

[Side by side, with labels pointing at each difference]
So how close is it? The shapes, the timing, the draw-on and the glow are very close. On the frames where the word is just sitting there, the average brightness is within one percent of the original. The in-between shapes during the turn are close but not exact. A few colours drift during the draw-on. And the original has some faint lens flares while the word is being written, and a soundtrack, and I left both out.

## 9. Your turn

[StepTimeline: Real clip, Repeats, Order, Trace, Measure, Compare]
So if you want to try this, here's the method. Start with the real clip. Look for repeats first. Figure out the order things appear in. Trace the shapes over the real frames. Measure every movement instead of guessing it. And compare your frames directly against the original, again and again.

[Both versions side by side, one last time]
And if you recreate something with this, send it to me, I'd love to see it. See you in the next one.
