# Recreating the neon "hello" → Apple logo, frame by frame: script (~3 min)

Read everything except the [bracket notes]; those are for the animation.
Say "another take" and redo a line if needed; the cleanup cuts the rest.

Follow-up to the first recreate video. No code on screen: the original and our recreation, stepped through frame by frame.
Original: public/hello/original.mp4 (1280x720, 30 fps, 295 frames). Label: "Original, posted by Abraham John on Twitter"
(confirm the credit before publishing). Recreation: composition Hello3D; side by side: Hello3DCompare.
Facts and measurements: projects/hello-recreation/README.md. Checked 2026-11-07. Render at 30 fps.

---

## 1. Hook

[Original plays once, with the credit]
This is the famous Apple hello. One glowing glass tube writes the word, and then it turns into the logo.

[Our recreation plays once]
And this is mine, rebuilt from scratch with Claude Code and Remotion.

[Both side by side, labelled "Original" and "Recreation"]
This one's a lot harder than the last graphic I recreated. So here are the four things that actually made it work.

## 2. Half the video is free

[Filmstrip; frame 40 and frame 252 lift out side by side, then 120 and 172]
First, we pulled out all two hundred and ninety five frames and compared them. Frame forty matches frame two fifty two. Frame one twenty matches one seventy two. The whole video is a palindrome. It plays forward, then the same frames play backwards.

[Second half of the filmstrip fades out]
So I only had to build half of it. Before you build anything, look for repeats.

## 3. Measure the glow, don't guess it

[The appearance map: the word coloured from blue to orange by the frame each pixel first lights up]
Next, we coloured every pixel by the frame it first lights up. That shows it's one continuous stroke, slow through the h, then almost thrown across the rest of the word.

[Graph: the haze around the word rising to a peak at frame 41, then settling]
And the glow isn't constant. We measured the light around the word on every frame. It swells while the word is being written, peaks right as it finishes, then settles down. My first version missed that completely, and it looked flat. Once we copied that curve, it came alive.

## 4. Going 3D

[Close-up: our flat 2D tube end next to the original's round glass end]
My first version was flat 2D, and you could tell. The tube ends were cut off, and the glass didn't catch the light. In the original, the ends are round caps, and you can see the light wrap around the tube.

[Our 3D tube: highlights moving along the curve, round caps, the h turning back through depth]
So we rebuilt it as a real 3D tube, with round glass ends and proper perspective. That's what made it read as glass.

## 5. The turn

[Frames 113 to 130 of the original, one at a time]
The hardest part was hello turning into the logo. It's barely half a second.

[A tracked dot on the h moving while the dots on the l's stay still]
My guess was that the whole word spins like a sign. So we tested it. We gave every point a depth and tried to fit one single rotation. It didn't fit. And when we tracked the letters, the l's stay still while the h is already moving. Each letter turns on its own, one after another, and then they slide together into a stack, right as the logo turns in.

## 6. Your turn

[Side by side, with the four steps appearing: Repeats, Measure, 3D, Test your guesses]
So, look for repeats. Measure the effects instead of guessing them. Go 3D when the original is 3D. And test every guess against the real frames.

[Both versions, one last time]
If you recreate something with this, send it to me. See you in the next one.
