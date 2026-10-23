# Remotion in the browser

A small demo of client-side rendering with `@remotion/web-renderer`: edit a title card, preview it live
in the Remotion Player, then export it as an MP4 without any server. The video is encoded in the tab with WebCodecs.

```bash
npm i
npm run dev   # open the printed localhost URL in Chrome, Firefox 130+ or Safari 26+
```

- `src/TitleCard.tsx`: the video (a normal Remotion component) and its size/length
- `src/exportVideo.ts`: `canRenderMediaOnWeb()` check, then `renderMediaOnWeb()`, which returns a Blob
- `src/App.tsx`: the form, the `<Player>` preview, and the progress bar and download link

The web renderer only draws a subset of CSS (no `z-index`, `backdrop-filter`, blend modes or inset shadows).
See https://www.remotion.dev/docs/client-side-rendering/limitations.
`licenseKey: 'free-license'` is for individuals and small companies; bigger companies need a Remotion license.
