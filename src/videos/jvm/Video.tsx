import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  Accent, AppIcon, Center, CodeWindow, DocIcon, Enter, Headline, Hub, LayerStack, ListCard, NodeBox, NodeTile,
  Pill, Pipeline, Scene, SectionTag, Stage, TalkingHead, Track, TranscriptProvider, KeyValue, color, stagger, useCue,
} from '../../kit';
import transcript from './transcript.json';

// Demo: "How the JVM runs your code". Re-skins the ByteByteGo-style diagrams in the primary look.
// One <Scene> per spoken beat; every animation is cued to a word.

export const jvmTranscript = transcript;

const Intro: React.FC = () => {
  const cue = useCue();
  return (
    <TalkingHead side="left" graphicsAt={cue('JVM')}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56}}>
        <Enter at={cue('JVM')} preset="rise">
          <Headline size={68} sub="from source file to machine code">
            How the JVM <Accent>actually</Accent> runs your code
          </Headline>
        </Enter>
        <Enter at={cue('runs')} preset="pop">
          <AppIcon icon="cpu" title="JVM" sub="Java Virtual Machine" size={140} />
        </Enter>
        </div>
    </TalkingHead>
  );
};

const BigPicture: React.FC = () => {
  const cue = useCue();
  return (
    <Pipeline
      gap={140}
      items={[
        {at: cue('dot java'), w: 220, h: 260, el: <DocIcon tag=".java" tagTone={color.blue} label="App.java" width={130} />},
        {at: cue('behind'), w: 360, h: 260, el: <NodeBox label="Behind the scenes" icon="question" tone={color.amber} width={340} />},
        {at: cue('cpu'), w: 280, h: 260, el: <NodeTile label="Machine code" icon="cpu" sub="1011 0100 1110" width={280} />},
      ]}
    />
  );
};

const SourceWalkthrough: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
        <SectionTag eyebrow="Phase 1" title="The build step" at={0} />
        <Center>
        <Enter at={cue('open')} preset="rise">
          <CodeWindow
            file="code/App.java"
            lines={[1, 6]}
            size={34}
            steps={[
              {at: cue('main method'), lines: [2, 2]},
              {at: cue('twenty one'), lines: [3, 3]},
              {at: cue('prints'), lines: [4, 4]},
            ]}
          />
        </Enter>
        </Center>
    </AbsoluteFill>
  );
};

const Compile: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
        <SectionTag eyebrow="Phase 1" title="The build step" />
        <Pipeline
        gap={120}
        items={[
          {at: cue('compile'), w: 220, h: 300, el: <DocIcon tag=".class" tagTone={color.green} label="App.class" width={130} />},
          {
            at: cue('javac'),
            w: 900,
            h: 420,
            el: <CodeWindow file="code/App.bytecode.txt" lines={[1, 7]} title="Bytecode · javap -c" lang="java" lineNumbers={false} typeAt={cue('turns')} typeCps={90} />,
          },
        ]}
      />
    </AbsoluteFill>
  );
};

const Loading: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
        <SectionTag eyebrow="Phase 1" title="The build step" />
        <Hub
        spread={540}
        outLabel="every file carries"
        inputs={[
          {at: cue('class file'), w: 250, h: 210, el: <NodeTile label="Class files" icon="file" width={250} />},
          {at: cue('jars'), w: 250, h: 210, el: <NodeTile label="JARs" icon="box" width={250} />},
          {at: cue('modules'), w: 250, h: 210, el: <NodeTile label="Modules" icon="layers" width={250} />},
        ]}
        pitch={230}
        center={{at: cue('jvm loads'), w: 260, h: 220, el: <NodeBox label="JVM" icon="gear" tone={color.amber} width={240} height={200} active={1} />}}
        outputs={[
          {
            at: cue('carries'),
            w: 600,
            h: 330,
            el: (
              <KeyValue
                title="Metadata"
                width={580}
                rows={[
                  {k: 'Classes', v: 'App', at: cue('carries') + 10},
                  {k: 'Methods', v: 'main(String[])', at: cue('carries') + 16},
                  {k: 'Modifiers', v: 'public static', at: cue('metadata')},
                ]}
              />
            ),
          },
        ]}
      />
    </AbsoluteFill>
  );
};

const Portable: React.FC = () => {
  const cue = useCue();
  const os = (label: string, at: number) => ({at, w: 340, h: 210, el: <NodeBox label={label} sub="its own JVM" icon="cpu" tone={color.blue} width={340} height={210} />});
  return (
    <AbsoluteFill>
        <SectionTag eyebrow="Phase 1" title="The build step" />
        <div style={{position: 'absolute', inset: 0, transform: 'translateY(-110px)'}}>
        <Hub
          vertical
          spread={520}
          pitch={420}
          dashed
          center={{at: cue('same bytecode'), w: 362, h: 66, el: <Pill variant="blue" icon="file" size={34}>Same bytecode</Pill>}}
          outputs={[os('macOS', cue('macos')), os('Linux', cue('linux')), os('Windows', cue('windows'))]}
        />
        </div>
    </AbsoluteFill>
  );
};

const ClassLoaders: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
        <SectionTag eyebrow="Phase 2" title="Class loading" />
        <Center gap={36}>
        <LayerStack
          title="Class loader subsystem"
          flow="up"
          width={720}
          layers={[
            {label: 'Bootstrap class loader', icon: 'download', at: cue('class has')},
            {label: 'Platform class loader', icon: 'download', at: stagger(cue('class has'), 1, 5)},
            {label: 'Application class loader', icon: 'download', at: stagger(cue('class has'), 2, 5)},
          ]}
          steps={[
            {at: cue('application'), index: 2},
            {at: cue('platform loader'), index: 1},
            {at: cue('bootstrap'), index: 0},
          ]}
        />
        <Enter at={cue('found')} preset="rise">
          <Pill variant="outline" icon="search" size={30}>
            App asks for Order.class
          </Pill>
        </Enter>
        </Center>
    </AbsoluteFill>
  );
};

const Cost: React.FC = () => {
  const cue = useCue();
  return (
    <Center>
        <Enter at={cue('cost')} preset="rise">
        <ListCard
          title="Startup cost"
          kicker="JVM"
          width={980}
          rows={[
            {label: 'Class loading', value: '≈ 90 ms', at: cue('class loading')},
            {label: 'Verification', value: '≈ 40 ms', at: cue('verification')},
            {label: 'JIT warm-up', value: '≈ 70 ms', at: cue('jit')},
          ]}
          total={{label: 'Total', value: '≈ 200 ms', at: cue('two hundred')}}
        />
        </Enter>
    </Center>
  );
};

export const JvmVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Track>
      <Scene from="here's how">
        <Intro />
      </Scene>
      <Scene from="you write">
        <BigPicture />
      </Scene>
      <Scene from="let's open">
        <SourceWalkthrough />
      </Scene>
      <Scene from="when you compile">
        <Compile />
      </Scene>
      <Scene from="every class file">
        <Loading />
      </Scene>
      <Scene from="and that same">
        <Portable />
      </Scene>
      <Scene from="but first">
        <ClassLoaders />
      </Scene>
      <Scene from="so what">
        <Cost />
      </Scene>
    </Track>
  </TranscriptProvider>
);
