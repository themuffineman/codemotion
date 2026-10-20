import React from 'react';
import {Composition} from 'remotion';
import './design/fonts';
import {FPS} from './design/tokens';
import {JvmVideo, jvmTranscript} from './videos/jvm/Video';
import {JvmShort, jvmShortTranscript} from './videos/jvm-short/Video';
import {Tour, tourTranscript} from './videos/tour/Video';

const lengthOf = (t: {words: {end: number}[]}, tailSec = 1.5) => Math.ceil((t.words[t.words.length - 1].end + tailSec) * FPS);

export const Root: React.FC = () => (
  <>
    <Composition id="JvmDemo" component={JvmVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(jvmTranscript)} />
    <Composition id="JvmShort" component={JvmShort} width={1080} height={1920} fps={FPS} durationInFrames={lengthOf(jvmShortTranscript)} />
    <Composition id="Tour" component={Tour} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(tourTranscript)} />
  </>
);
