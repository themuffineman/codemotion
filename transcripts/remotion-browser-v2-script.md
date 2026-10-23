# Render Remotion in the browser (v2): script

Read everything except the [bracket notes]; those are for the animation.
Don't worry about pauses, ums or retakes. Say "another take" and redo the line; the cleanup cuts the rest.

Demo code: codemotion/projects/remotion-browser (a real `npm create vite` react-ts project).
Screen recording: public/remotion-browser/demo2.mp4 (cursor, typing, export; zooms come from demo2-marks.json).
Facts checked 2026-10-23 against remotion.dev docs (client-side rendering, how it works, limitations,
renderMediaOnWeb, Lambda cost example). Remotion 4.0.537. Licensing is left out on purpose.

---

## 1. Hook

[Remotion logo, then a server box that gets crossed out, then a browser window playing an exported title card]
If you've ever used Remotion, you know your videos normally get rendered on a server. But what if you could render them right in the browser instead? So your users export the video with their own computer, right there on the client. In this video I'm going to show you that you can actually do that, with an API from Remotion called renderMediaOnWeb. Let me show you.

## 2. The demo

[Screen recording, full window, preview playing]
So this is a little app I built. On the right, that's a Remotion video playing live in the page, and on the left are the things you can change.

[Zoom into the Title input while it's being typed]
I'll change the title, and you can see the preview updates as I type, word by word.

[Zoom into the Subtitle input]
Same with the subtitle.

[Zoom out a bit, cursor goes to the color swatches]
And I'll pick a different color.

[Zoom onto the Export button, click, progress bar runs; speed-up label]
Now I hit export. That progress bar is the actual render happening, inside this tab, on my laptop. I sped this part up, it takes about ten to fifteen seconds.

[Full window: the exported MP4 playing, then the cursor on the download link]
And when it's done, the preview gets swapped for the real MP4 file. That's an actual video I can download. No server touched it at any point.

## 3. Building it

[Terminal: npm create vite@latest remotion-browser -- --template react-ts, real output]
Okay, so let's build it. I started with a normal Vite project, React and TypeScript. Nothing special about it, any React setup works.

[Terminal: npm i remotion @remotion/player @remotion/web-renderer @remotion/google-fonts, real output]
Then we install four packages. remotion itself, the Player, which is what shows the live preview, web-renderer, which does the rendering in the browser, and google-fonts, just so the video has a nice font.

### The video component

[New file: TitleCard.tsx, lines 9–17 typed in]
First, the video itself. I made a file called TitleCard. It takes three props, the title, the subtitle and the color. Those are the things the user can change.

[TitleCard.tsx line 16–17 focus]
The most important line in any Remotion component is useCurrentFrame. It tells you which frame you're on, and everything that moves is worked out from that number.

[TitleCard.tsx lines 45–58, focus line 46 then 57–58]
So for the title, I split it into words, and every word gets its own spring. The spring starts four frames later for each word, so they pop up one after the other. And the spring's value goes into the opacity and a little slide up.

[TitleCard.tsx lines 23–24 focus]
The colored bar under the title uses a spring too, it starts at frame eighteen. And the subtitle just fades in between frames twenty-eight and forty-two with interpolate.

[TitleCard.tsx lines 31–41 focus line 37]
And the background is a gradient that slowly turns while the video plays, with the user's color mixed in at the corner.

[TitleCard.tsx line 3 comment highlighted]
One thing I did on purpose here: I only used CSS that the browser renderer knows how to draw. Gradients, rounded corners, transforms and opacity. I'll explain why in a bit.

### The composition

[composition.ts, whole file]
Next, the composition. This is just one object that says which component to render, how big it is, the frame rate and how many frames. Here it's a square, ten eighty by ten eighty, thirty frames a second, a hundred and twenty frames, so four seconds. And the default props, which is what the page starts with.

[composition.ts lines 1–2 comment]
Both the preview and the export read this same object, so they can't drift apart.

### The page

[App.tsx lines 11–14, 22]
Now the page. It keeps the title, the subtitle and the color in state, and puts them together into one props object.

[App.tsx lines 49, 53]
The inputs just update that state.

[App.tsx lines 90–103, focus 91–92]
And here's the Player. You give it the component and the props, and the frame rate and size from the composition. Because the props come straight from state, every time you type, the preview re-renders with the new text. That's why it updates live.

### The export

[New file: exportVideo.ts, lines 6–16]
Okay, now the part this video is about. I put the export in its own file. The first thing it does is ask the browser if it can even do this, with canRenderMediaOnWeb. That checks for WebCodecs and an H.264 encoder. If something's missing, it gives you back a list of the problems, and I just throw them as an error.

[exportVideo.ts lines 18–25, focus 19, then 20–21]
Then the actual render is one call, renderMediaOnWeb. You pass the composition, and the props, the same props the Player is showing.

[exportVideo.ts lines 22–23]
Container is mp4, and I set muted to true, because this video has no sound, so there's no point adding an empty audio track.

[exportVideo.ts line 24]
And onProgress gets called as it goes, with a number from zero to one.

[exportVideo.ts lines 27–28]
When it finishes, you call getBlob, and you get the video as a Blob. That's basically a file in memory.

[App.tsx lines 26–38, focus 32 then 34]
Back on the page, the export button calls this. I pass setProgress straight in as the progress callback, so the progress bar just follows along. And when the Blob comes back, I turn it into a URL with createObjectURL.

[App.tsx lines 86–89, then 75–81]
And that URL goes into a normal video tag in place of the Player, and into a download link. That's the whole app.

[Terminal: npm run dev; then a few seconds of the screen recording]
Run npm run dev, open it, and that's what you saw at the start.

## 4. How it works

[Pipeline: component → headless Chrome → screenshot every frame → FFmpeg → MP4, inside a server box; Remotion + AWS logos]
So how does this actually work? Normally, when Remotion renders a video, it opens a headless Chrome on a server, takes a screenshot of every single frame, and then FFmpeg stitches the screenshots into a video. That works really well, but it needs a machine, so you're running a server or AWS Lambda, and you're paying for every render your users make.

[Compare: server screenshots the page | a web page can't screenshot itself]
In the browser you can't do that, because a web page can't take a screenshot of itself. There's just no API for it.

[Steps: mount hidden → walk every element → measure → redraw on a canvas; then the card being redrawn piece by piece]
So instead, the web renderer rebuilds the picture by hand. It mounts your component somewhere hidden on the page, and for every frame it goes through all the elements, measures where each one is, and draws it onto a canvas. Backgrounds, borders and rounded corners get drawn with the normal canvas API. Text gets split into words and each word is drawn on its own. Images, SVGs and canvases just get copied over.

[Pipeline: canvas frame → WebCodecs → Mediabunny → MP4]
Then every finished frame goes to WebCodecs, which is the video encoder built into the browser, and a library called Mediabunny packs it into an MP4. So there's no FFmpeg anywhere.

## 5. The limitations

[Works / Doesn't: gradients, borders, rounded corners, transforms, opacity | backdrop-filter, blend modes, inset shadows]
And that's also where the limits come from. Because it's redrawing everything itself, it only supports the CSS it knows how to draw. The common stuff works, like gradients, borders, transforms and opacity. But things like backdrop-filter, blend modes and inset shadows don't. That's why I kept the title card simple.

[Two overlapping cards; the one later in the DOM ends up on top]
z-index is ignored too. Things get drawn in the order they are in the DOM, so if you want something on top, it has to come later in your code.

[OffthreadVideo crossed out → Video from @remotion/media]
If you use video inside your composition, OffthreadVideo doesn't work here. You use the Video component from @remotion/media instead.

[Chrome, Firefox and Safari logos with versions]
It needs WebCodecs, so that's Chrome 94, Firefox 130 or Safari 26 and newer. And CSS filters don't work in Safari.

[Browser tab with progress bar; switching tabs slows it]
It runs on one thread, so a big server will still be faster on long videos. And if the user switches to another tab, the browser slows the page down, and the render slows down with it, so they need to keep the tab open while it's exporting.

## 6. When to use it

[Browser: title cards, social graphics, templates, editors | Server: long videos, lots of footage, slow phones]
So I'd use this for short stuff, like title cards, social graphics, templates, or an editor where people export their own thing. If you're rendering long videos with lots of footage, or your users are on slow phones, a server is still the safer choice, because now the speed depends on their device.

## 7. Outro

[Title card playing; CTA: code link below]
And that's how you render Remotion in the browser. The code for this app is linked down below, so you can grab it and try it yourself.

[CTA: freelance]
And if you want something like this built into your own product, I do freelance work, so feel free to reach out. That link's down there too.
