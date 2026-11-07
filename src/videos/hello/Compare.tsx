import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import {HelloRecreation} from './HelloRecreation';

const Label: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', top: 18, left: 22, color: '#fff', font: '500 26px system-ui', opacity: 0.85}}>{children}</div>
);

/** Original and recreation side by side, frame-locked, for checking the match. */
export const HelloCompare: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000', flexDirection: 'row', alignItems: 'center'}}>
    <div style={{position: 'relative', width: 960, height: 540, overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile('hello/original.mp4')} muted style={{width: 960, height: 540}} />
      <Label>Original</Label>
    </div>
    <div style={{position: 'relative', width: 960, height: 540, overflow: 'hidden'}}>
      <div style={{width: 1920, height: 1080, transform: 'scale(0.5)', transformOrigin: '0 0'}}>
        <HelloRecreation />
      </div>
      <Label>Recreation</Label>
    </div>
  </AbsoluteFill>
);
