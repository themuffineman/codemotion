// The page: edit the text, watch it live in the Player, then export it as an MP4.
import {useState} from 'react';
import {Player} from '@remotion/player';
import {TitleCard, titleCardComposition} from './TitleCard';
import {exportVideo} from './exportVideo';

const COLORS = ['#6d5efc', '#f43f5e', '#10b981', '#f59e0b'];
const start = titleCardComposition.defaultProps;

export function App() {
  const [title, setTitle] = useState(start.title);
  const [subtitle, setSubtitle] = useState(start.subtitle);
  const [color, setColor] = useState(start.color);

  // Render state: progress from 0 to 1, the finished video's URL, how long it took.
  const [progress, setProgress] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const props = {title, subtitle, color};
  const rendering = progress !== null && videoUrl === null && error === null;

  // Runs the client-side render and keeps the result as an object URL.
  async function onExport() {
    setVideoUrl(null);
    setError(null);
    setProgress(0);
    const started = performance.now();
    try {
      const blob = await exportVideo(props, setProgress);
      setSeconds((performance.now() - started) / 1000);
      setVideoUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main>
      <h1>Remotion, rendered in your browser</h1>

      <section className="editor">
        {/* Left: the controls */}
        <div className="controls">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Subtitle
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                className={c === color ? 'swatch active' : 'swatch'}
                style={{background: c}}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>

          <button className="export" onClick={onExport} disabled={rendering}>
            {rendering ? `Rendering… ${Math.round(progress! * 100)}%` : 'Export MP4'}
          </button>
          <div className="bar">
            <div style={{width: `${(progress ?? 0) * 100}%`}} />
          </div>

          {error && <p className="error">{error}</p>}
          {videoUrl && (
            <p className="done">
              Done in {seconds!.toFixed(1)}s ·{' '}
              <a href={videoUrl} download="title-card.mp4">
                Download title-card.mp4
              </a>
            </p>
          )}
        </div>

        {/* Right: the live preview, or the exported file once it exists */}
        <div className="preview">
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay loop />
          ) : (
            <Player
              component={TitleCard}
              inputProps={props}
              durationInFrames={titleCardComposition.durationInFrames}
              fps={titleCardComposition.fps}
              compositionWidth={titleCardComposition.width}
              compositionHeight={titleCardComposition.height}
              style={{width: '100%'}}
              autoPlay
              muted
              loop
              controls
              acknowledgeRemotionLicense
            />
          )}
          <span className="tag">{videoUrl ? 'Exported MP4' : 'Live preview'}</span>
        </div>
      </section>
    </main>
  );
}
