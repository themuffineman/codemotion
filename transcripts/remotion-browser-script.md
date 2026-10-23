# Render Remotion videos in the browser — script

Read everything except the [bracket notes]; those are for the animation.
Demo code: codemotion/projects/remotion-browser (src/TitleCard.tsx, src/exportVideo.ts, src/App.tsx)
Facts checked 2026-10-23 against remotion.dev/docs/client-side-rendering (+ how-it-works, limitations),
/docs/web-renderer/render-media-on-web, /docs/telemetry, /docs/lambda/cost-example. Remotion 4.0.537.

---

[Hook: headline, accent on "browser"; behind it the demo's exported title card playing]
Remotion videos are normally rendered on a server. In this video I'm going to show you how to render them right inside the user's browser instead, so the user's own computer makes the MP4, and you don't need a render server at all.

[Screen recording: demo app, type title → pick color → Export → progress bar → MP4 plays]
This is a little app I built for it. You type a title, pick a color, and hit export. And the file that comes out is a real MP4, made entirely inside this tab. Nothing got uploaded, and no server touched it.

[Code: TitleCard.tsx, the spring + useCurrentFrame lines]
So, quick background first. If you haven't used Remotion, it lets you make videos with React. A video is just a component, and Remotion tells it which frame it's on. You use that frame number to animate things, and every frame is basically a picture of your component at that moment.

[Pipeline: React component → headless Chrome → screenshot every frame → FFmpeg → MP4, all inside a "server" box]
Now, the normal way to turn that into a video is server-side rendering. Remotion opens a headless Chrome, takes a screenshot of every single frame, and then stitches the screenshots together with FFmpeg. That works really well, but it means you need a machine to run it on. Usually that's AWS Lambda, or your own server.

[ListCard from the Lambda cost docs: 1-min video ≈ $0.017 · 10-min HD ≈ $0.10 · + S3 storage, bandwidth, logs]
And to be fair, one render on Lambda isn't expensive. Remotion's own numbers say about two cents for a one-minute video. The thing is, you pay that for every render, forever, plus the storage and bandwidth, plus you have to set up and maintain the whole AWS side. If you're building something like an editor, where people export over and over, or a free tool, that cost just keeps growing with your users.

[Headline: @remotion/web-renderer · stable since 4.0.491]
So Remotion now has a package for rendering on the client, called web-renderer. It's been stable since version 4.0.491. It runs in the user's browser, so the rendering happens on their machine and you're not paying for it.

[Compare: server = screenshot of the page | browser = rebuild the page on a canvas]
But here's where it gets interesting. A web page can't take a screenshot of itself. There's just no browser API for that. So the browser version can't work the way the server version does.

[Diagram, stepped: mount offscreen → walk the DOM → measure each element → redraw on canvas]
What it does instead is rebuild the picture by hand. It mounts your component somewhere hidden on the page, and for every frame it walks through all the elements. It measures where each one sits on the page, works out the transforms, and then redraws it onto a canvas. Backgrounds, borders, rounded corners, all of that gets drawn with the regular canvas API. Text even gets split into words, and each word is measured and drawn separately. Images, SVGs and canvases are the easy ones, because those can just be copied over.

[Pipeline: canvas frame → WebCodecs → Mediabunny → MP4 Blob]
Then each finished frame goes to WebCodecs, which is the browser's built-in video encoder, and a library called Mediabunny packs it all into an MP4. So there's no FFmpeg anywhere.

[Code: exportVideo.ts, focus canRenderMediaOnWeb block]
Okay, so here's what the code actually looks like in my app. First, I ask the browser if it can even do this, with canRenderMediaOnWeb. It checks for WebCodecs and an H.264 encoder, and if something's missing, it tells you what.

[Code: exportVideo.ts, focus renderMediaOnWeb call → composition, inputProps, onProgress]
Then the render itself is one function call, renderMediaOnWeb. You give it the composition, which is the component plus the size, frame rate and length, and you give it the props, which here are the title and the color from the form. And onProgress gives you a number from zero to one, which is what drives the progress bar.

[Code: getBlob line; then screen recording: download link + video playing]
When it's done, you get back a Blob. That's just a file in memory, so you can let the user download it, play it on the page, or upload it somewhere. On my laptop, which isn't a fast machine, this four-second video takes somewhere between ten and twenty seconds.

[Code: App.tsx Player block next to exportVideo.ts render call, same props highlighted]
And the nice part is that the preview and the export use the exact same component. The Remotion Player shows it live while you type, and the renderer turns that same thing into a file. So what you see is what you get.

[Section title: The catches]
Now, there are a few catches you should know about before you go all in on this.

[ListCard: supported ✓ gradients, borders, radius, transforms, opacity, text, filters · not ✓ z-index, backdrop-filter, blend modes, inset shadows]
The big one is CSS. Since it's redrawing everything by hand, it only supports the CSS it knows how to draw. Things like gradients, borders, rounded corners, transforms and opacity all work. But stuff like backdrop-filter, blend modes and inset shadows doesn't. And z-index is ignored completely, so things are just drawn in the order they appear in the DOM. If you want something on top, it has to come later in your code.

[Compare: OffthreadVideo ✗ → Video from @remotion/media ✓]
Some Remotion components don't work either. OffthreadVideo, which is the one you'd normally use for video on the server, isn't supported. You use the Video component from @remotion/media instead.

[KeyValue: Chrome 94+ · Firefox 130+ · Safari 26+ · filters not in Safari]
Then there's browser support. It needs WebCodecs, so that's Chrome 94, Firefox 130, or Safari 26 and up. And CSS filters don't work in Safari.

[Window: two browser tabs, background tab dimmed with a slow clock icon]
It's also single-threaded, so it's not going to beat a big server on a long video. And if the user switches to another tab, the browser slows the page down, so the render slows down too. So keep the tab open while it's rendering.

[KeyValue: telemetry event per render → domain + IP · licenseKey: 'free-license']
And this one's easy to miss. Every client-side render sends a telemetry event to Remotion, with your domain and the user's IP address, so you'll want to mention that in your privacy policy. Also, the Remotion license still applies. It's free for individuals and small companies, and if that's you, you pass "free-license" as the license key. Bigger companies need a paid license, which is priced by renders.

[Compare: browser for short graphics, templates, editors | server for long videos, heavy footage, weak devices]
So when should you use this? I'd say it's great for short stuff, like title cards, social graphics, templates, or an editor where people export their own thing. If you're rendering long videos with a lot of footage, or your users are on slow phones, a server is still the safer bet, because the speed now depends on the user's device.

[CTA]
So that's how you render Remotion in the browser. The demo app is linked below if you want to try it or copy the code. And if you want something like this built into your own product, I do freelance work, so reach out. That link's down there too.
