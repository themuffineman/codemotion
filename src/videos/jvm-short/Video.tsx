import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  Accent, Center, CodeWindow, DocIcon, Enter, Headline, Hub, NodeBox, Pill, PillRow, Scene, Stage, TalkingHead,
  Track, TranscriptProvider, color, safe, useCue,
} from '../../kit';
import transcript from './transcript.json';

// 9:16 short. Same kit, vertical rules: one idea per screen, content inside safe.vertical,
// diagrams flow top → bottom, code at 26–28px with short ranges.

export const jvmShortTranscript = transcript;

const Hook: React.FC = () => {
  const cue = useCue();
  return (
    <TalkingHead graphicsAt={cue('why')}>
      <Enter at={cue('why')} preset="rise">
        <Headline size={76}>
          Why does Java run <Accent>everywhere?</Accent>
        </Headline>
      </Enter>
    </TalkingHead>
  );
};

const NotMachineCode: React.FC = () => {
  const cue = useCue();
  return (
    <Center gap={56} style={{padding: `${safe.vertical.top}px ${safe.vertical.x}px ${safe.vertical.bottom}px`}}>
      <Enter at={cue('javac')} preset="rise">
        <Headline size={64}>
          javac doesn't make <Accent tone={color.red}>machine code</Accent>
        </Headline>
      </Enter>
      <Enter at={cue('compiles')} preset="rise">
        <CodeWindow file="code/App.java" lines={[1, 6]} size={26} maxWidth={936} steps={[{at: cue('bytecode'), lines: [3, 4]}]} />
      </Enter>
      <Enter at={cue('bytecode')} preset="pop">
        <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
          <DocIcon tag=".class" tagTone={color.green} width={90} />
          <Pill variant="blue" size={34}>
            bytecode
          </Pill>
        </div>
      </Enter>
    </Center>
  );
};

const Everywhere: React.FC = () => {
  const cue = useCue();
  const os = (label: string, at: number) => ({at, w: 290, h: 190, el: <NodeBox label={label} icon="cpu" width={290} height={190} />});
  return (
    <AbsoluteFill style={{transform: 'translateY(-200px)'}}>
      <Hub
        vertical
        spread={700}
        pitch={315}
        center={{at: cue('same bytecode'), w: 362, h: 66, el: <Pill variant="blue" icon="file" size={34}>Same bytecode</Pill>}}
        outputs={[os('macOS', cue('macos')), os('Linux', cue('linux')), os('Windows', cue('windows'))]}
      />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1520, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('own jvm')} preset="rise">
          <Pill variant="white" icon="gear" size={34}>
            each ships its own JVM
          </Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const cue = useCue();
  return (
    <Center gap={48}>
      <Enter at={cue('write once')} preset="rise">
        <Headline size={84}>
          Write once, <Accent>run anywhere</Accent>
        </Headline>
      </Enter>
      <PillRow at={cue('run anywhere')} items={['javac', 'bytecode', 'JVM']} />
    </Center>
  );
};

export const JvmShort: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Track>
      <Scene from="why does">
        <Hook />
      </Scene>
      <Scene from="because javac">
        <NotMachineCode />
      </Scene>
      <Scene from="and that same">
        <Everywhere />
      </Scene>
      <Scene from="write once">
        <Outro />
      </Scene>
    </Track>
  </TranscriptProvider>
);
