// The video itself: an animated title card.
// It's a normal Remotion component. The same code plays in the Player and gets rendered to MP4.
// Only CSS the web renderer supports is used here (gradients, border-radius, transforms, opacity).
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';

const {fontFamily} = loadFont('normal', {weights: ['500', '700'], subsets: ['latin']});

export type TitleCardProps = {
  title: string;
  subtitle: string;
  color: string;
};

export const TitleCard: React.FC<TitleCardProps> = ({title, subtitle, color}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  // Each word springs up a few frames after the one before it.
  const words = title.split(' ');

  // The accent bar grows in after the title, the subtitle fades in last.
  const bar = spring({frame: frame - 18, fps, config: {damping: 200}});
  const sub = interpolate(frame, [28, 42], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Everything fades out over the last 12 frames.
  const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  // The background gradient slowly turns while the video plays.
  const angle = interpolate(frame, [0, durationInFrames], [120, 200]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, #0b0d12 0%, #151a24 60%, ${color} 160%)`,
        justifyContent: 'center',
        padding: 120,
        fontFamily,
      }}
    >
      <div style={{opacity: out}}>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0 28px'}}>
          {words.map((word, i) => {
            const s = spring({frame: frame - i * 4, fps, config: {damping: 14, mass: 0.6}});
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  fontSize: 120,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  color: 'white',
                  letterSpacing: -3,
                  opacity: s,
                  transform: `translateY(${(1 - s) * 60}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 40,
            height: 12,
            width: 240,
            borderRadius: 6,
            background: color,
            transform: `scaleX(${bar})`,
            transformOrigin: 'left',
          }}
        />
        <div style={{marginTop: 36, fontSize: 48, fontWeight: 500, color: '#9aa3b2', opacity: sub}}>
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
