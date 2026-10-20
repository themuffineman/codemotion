import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {color, safe} from '../design/tokens';
import {useTween} from '../motion/motion';

// A-roll with graphics in the empty side of the frame (primary refs 6, 8, 10).
// The speaker stays sharp. The graphics side gets a dark falloff so white cards read cleanly.
//
// side = where the SPEAKER is. Graphics go in the opposite half.
// In vertical (9:16) the speaker is the bottom half and graphics sit on top.

export const ARoll: React.FC<{src?: string; startFrom?: number}> = ({src, startFrom = 0}) =>
  src ? (
    <OffthreadVideo src={src.startsWith('http') ? src : staticFile(src)} startFrom={startFrom} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  ) : (
    // Placeholder when no footage is wired yet: a dim "speaker" silhouette so layouts can be judged.
    <AbsoluteFill style={{background: 'linear-gradient(90deg, #141416 0%, #1d1c1f 50%, #141416 100%)'}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 14px, transparent 14px 44px)'}} />
    </AbsoluteFill>
  );

export const TalkingHead: React.FC<{
  src?: string;
  startFrom?: number;
  side?: 'left' | 'right';
  graphicsAt?: number; // when the falloff + panel come in
  graphicsOut?: number;
  children?: React.ReactNode; // the panel content (centered in the free half)
}> = ({src, startFrom, side = 'left', graphicsAt = 0, graphicsOut, children}) => {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const vertical = height > width;
  const inT = useTween(graphicsAt, graphicsAt + 12);
  const outT = graphicsOut === undefined ? 0 : interpolate(frame, [graphicsOut, graphicsOut + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shade = inT * (1 - outT);
  const dirGrad = vertical ? '0deg' : side === 'left' ? '90deg' : '270deg';
  const panel: React.CSSProperties = vertical
    ? {left: 0, right: 0, top: 0, height: '52%'}
    : side === 'left'
      ? {right: 0, top: 0, bottom: 0, width: '52%'}
      : {left: 0, top: 0, bottom: 0, width: '52%'};
  return (
    <AbsoluteFill style={{background: color.bgDeep}}>
      <ARoll src={src} startFrom={startFrom} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(${dirGrad}, transparent 30%, rgba(10,10,12,0.78) 58%, rgba(10,10,12,0.92) 100%)`,
          opacity: shade,
        }}
      />
      <div
        style={{
          position: 'absolute',
          ...panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: vertical ? `${safe.vertical.top}px ${safe.vertical.x}px 40px` : `0 ${safe.landscape.x}px`,
          boxSizing: 'border-box',
          opacity: 1 - outT,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
