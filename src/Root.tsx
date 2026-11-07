import React from 'react';
import {Composition} from 'remotion';
import './design/fonts';
import {FPS} from './design/tokens';
import {JvmVideo, jvmTranscript} from './videos/jvm/Video';
import {JvmShort, jvmShortTranscript} from './videos/jvm-short/Video';
import {Tour, tourTranscript} from './videos/tour/Video';
import {WhisperVideo, whisperTranscript} from './videos/whisper/Video';
import {RemotionBrowserVideo, remotionBrowserTranscript} from './videos/remotion-browser/Video';
import {RemotionBrowserV2Video, remotionBrowserV2Transcript} from './videos/remotion-browser-v2/Video';
import {WebhooksVideo, webhooksTranscript} from './videos/webhooks/Video';
import {GitVideo, gitTranscript} from './videos/git/Video';
import {DijkstraVideo, dijkstraTranscript} from './videos/dijkstra/Video';
import {HelloRecreation} from './videos/hello/HelloRecreation';
import {HelloCompare} from './videos/hello/Compare';
import {ORIGINAL_FRAMES} from './videos/hello/timing';
import {Hello3D} from './videos/hello3d/Hello3D';
import {HelloVideo, helloVideoTranscript} from './videos/hello-video/Video';

const lengthOf = (t: {words: {end: number}[]}, tailSec = 1.5) => Math.ceil((t.words[t.words.length - 1].end + tailSec) * FPS);

export const Root: React.FC = () => (
  <>
    <Composition id="JvmDemo" component={JvmVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(jvmTranscript)} />
    <Composition id="JvmShort" component={JvmShort} width={1080} height={1920} fps={FPS} durationInFrames={lengthOf(jvmShortTranscript)} />
    <Composition id="WhisperBrowser" component={WhisperVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(whisperTranscript)} />
    <Composition id="RemotionBrowser" component={RemotionBrowserVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(remotionBrowserTranscript)} />
    <Composition id="RemotionBrowserV2" component={RemotionBrowserV2Video} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(remotionBrowserV2Transcript)} />
    <Composition id="Webhooks" component={WebhooksVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(webhooksTranscript)} />
    <Composition id="GitInternals" component={GitVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(gitTranscript)} />
    <Composition id="Dijkstra" component={DijkstraVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(dijkstraTranscript)} />
    <Composition id="HelloRecreation" component={HelloRecreation} width={1920} height={1080} fps={30} durationInFrames={ORIGINAL_FRAMES} />
    <Composition id="HelloCompare" component={HelloCompare} width={1920} height={1080} fps={30} durationInFrames={ORIGINAL_FRAMES} />
    <Composition id="Hello3D" component={Hello3D} width={1920} height={1080} fps={30} durationInFrames={ORIGINAL_FRAMES} />
    <Composition id="Hello3DCompare" component={() => <HelloCompare Recreation={Hello3D} />} width={1920} height={1080} fps={30} durationInFrames={ORIGINAL_FRAMES} />
    <Composition id="HelloVideo" component={HelloVideo} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(helloVideoTranscript)} />
    <Composition id="Tour" component={Tour} width={1920} height={1080} fps={FPS} durationInFrames={lengthOf(tourTranscript)} />
  </>
);
