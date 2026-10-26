import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, Center, CodeWindow, Enter, FocusShade, Headline, Icon, Label, Pill, Scene, SectionTag, Stage, Terminal,
  Track, TranscriptProvider, color, font, radius, shadow, stagger, type, useCue, useTween, weight,
} from '../../kit';
import transcript from './transcript.json';
import out from '../../../public/code/git-internals/terminal/output.json';

// "How Git stores your code": open .git, decompress a blob by hand, hash it ourselves, then trees,
// commits, parents, branches as files, and why amending changes every hash after it.
// Demo: projects/git-internals (read-object.js, hash-object.js, run-demo.sh), copied to public/code/git-internals.
// Every terminal block is real output from run-demo.sh (fixed author and dates, so the hashes are stable).
// Voice: public/audio/git-voice.wav.

export const gitTranscript = transcript;

const CODE = 'code/git-internals';

// The real hashes from the demo run
const H = {
  readme: 'cc22473b12078ebc933a84d75f60fe4953841ee4',
  app1: '6687898e2a0fe2da282efab6b5f7f38b7f788f56',
  app2: '371fdfb152a2c9af90c33b84016cc6dc56c89a43',
  tree1: '7e5e89a906760181d1503af2559edff3ebac9e90',
  tree2: '6bfc3566d85bb659296fb2ad58b9bdf63b0b5ccc',
  c1: '82e7074bd5bdd955e7b97ded99ef15727cee532b',
  c2: 'dcc5f27f85419bd5f4435a1344f7d8dd763dca95',
  c2b: 'b41aac5',
};
const short = (h: string) => h.slice(0, 7);

// ---------- Helpers ----------

const Stack: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 24}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap}}>{children}</div>
);
const Row: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 24}) => (
  <div style={{display: 'flex', alignItems: 'center', gap}}>{children}</div>
);
const Mono: React.FC<{children: React.ReactNode; tone?: string; size?: number}> = ({children, tone = color.paper, size = type.label + 2}) => (
  <span style={{fontFamily: font.mono, fontSize: size, color: tone}}>{children}</span>
);
const Bottom: React.FC<{children: React.ReactNode; y?: number}> = ({children, y = 130}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: y, display: 'flex', justifyContent: 'center', gap: 20}}>{children}</div>
);
// a red line that draws across whatever it sits on
const Strike: React.FC<{at: number}> = ({at}) => {
  const t = useTween(at, at + 12);
  return <div style={{position: 'absolute', left: -12, right: -12, top: '50%', height: 6, borderRadius: 3, background: color.red, transform: `scaleX(${t})`, transformOrigin: 'left'}} />;
};
// a vertical or horizontal connector line that draws in
const Line: React.FC<{at: number; w?: number; h?: number; tone?: string}> = ({at, w = 6, h = 60, tone = color.paperMute}) => {
  const t = useTween(at, at + 12);
  return <div style={{width: w, height: h, borderRadius: 3, background: tone, transform: w > h ? `scaleX(${t})` : `scaleY(${t})`, transformOrigin: w > h ? 'left' : 'top'}} />;
};

// Real terminal output: each captured file holds "$ command" lines followed by their output.
type Block = {cmd: string; out: string[]};
const blocks = (txt: string): Block[] => {
  const res: Block[] = [];
  for (const l of txt.split('\n')) {
    if (l.startsWith('$ ')) res.push({cmd: l.slice(2), out: []});
    else if (l.trim() !== '' && res.length) res[res.length - 1].out.push(l);
  }
  return res;
};
// terminal lines for one block: the command at `at`, its output after it
const term = (b: Block, at: number, outAt = at + 20, step = 3, tone?: (l: string, i: number) => string | undefined) => [
  {at, cmd: b.cmd},
  ...b.out.map((o, i) => ({at: outAt + i * step, out: o, tone: tone?.(o, i)})),
];

// One Git object drawn as a card: its type as a colored tag, a short hash, and what it holds.
const TONE = {blob: color.green, tree: color.amber, commit: color.blue} as const;
const ObjectCard: React.FC<{kind: keyof typeof TONE; hash: string; children?: React.ReactNode; width?: number; dim?: number; focus?: boolean}> = ({kind, hash, children, width = 360, dim = 0, focus = false}) => (
  <div
    style={{
      width, padding: '22px 26px', borderRadius: radius.card, background: color.tile, boxSizing: 'border-box',
      border: `2px solid ${focus ? TONE[kind] : color.tileLine}`, boxShadow: shadow.tile, opacity: 1 - dim * 0.6,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}
  >
    <Row gap={14}>
      <div style={{padding: '4px 14px', borderRadius: radius.pill, background: TONE[kind], fontFamily: font.mono, fontSize: type.label, color: color.ink}}>{kind}</div>
      <Mono tone={color.paperSoft}>{short(hash)}</Mono>
    </Row>
    {children}
  </div>
);

// A file as it sits in the working folder: name on top, content below.
const FileCard: React.FC<{name: string; content: string; width?: number}> = ({name, content, width = 440}) => (
  <div style={{width, borderRadius: radius.card, background: color.card, boxShadow: shadow.card, overflow: 'hidden'}}>
    <div style={{padding: '16px 24px', borderBottom: `1px solid ${color.cardLine}`, display: 'flex', alignItems: 'center', gap: 12}}>
      <Icon name="file" size={30} color={color.ink} />
      <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>{name}</span>
    </div>
    <div style={{padding: '22px 24px'}}>
      <Mono tone={color.inkSoft} size={type.body - 4}>{content}</Mono>
    </div>
  </div>
);

// ---------- 1. Hook ----------

// A commit drawn as a diff gets crossed out; a full snapshot of the folder replaces it.
const Hook: React.FC = () => {
  const cue = useCue();
  const snap = cue('full snapshot');
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title + 8}>
            What's actually in a <Accent>commit?</Accent>
          </Headline>
        </Enter>
        <Row gap={80}>
          <Enter at={cue('a diff')} preset="pop">
            <div style={{position: 'relative'}}>
              <div style={{width: 460, padding: 28, borderRadius: radius.card, background: color.code, border: `1px solid ${color.tileLine}`, display: 'flex', flexDirection: 'column', gap: 10}}>
                <Mono tone={color.paperSoft}>app.js</Mono>
                <Mono tone={color.red}>- console.log('hi')</Mono>
                <Mono tone={color.green}>+ console.log('hello')</Mono>
              </div>
              <Strike at={cue("it doesn't")} />
            </div>
          </Enter>
          <Enter at={snap} preset="rise">
            <div style={{width: 460, padding: 28, borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 14}}>
              <Row gap={12}>
                <Icon name="folder" size={36} color={color.ink} />
                <span style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.ink}}>The whole project</span>
              </Row>
              {['README.md', 'app.js'].map((f, i) => (
                <Enter key={f} at={stagger(snap + 8, i, 6)} preset="fade">
                  <Row gap={10}>
                    <Icon name="file" size={28} color={color.inkMute} />
                    <Mono tone={color.inkSoft}>{f}</Mono>
                  </Row>
                </Enter>
              ))}
            </div>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Git as a key-value store: key = hash of the content, value = the content.
const KeyValueStore: React.FC = () => {
  const cue = useCue();
  const terms = [
    {t: 'branches', at: cue('branches')},
    {t: 'rebase', at: cue('rebase')},
    {t: 'detached HEAD', at: cue('detached head')},
  ];
  return (
    <AbsoluteFill>
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Git is a <Accent>key-value</Accent> store
          </Headline>
        </Enter>
        <Enter at={cue('key value store')} preset="rise">
          <Row gap={30}>
            <Stack gap={12}>
              <Label size={type.label} tone={color.paperSoft}>key</Label>
              <Enter at={cue('hash of the content')} preset="pop">
                <div style={{padding: '22px 28px', borderRadius: radius.card, background: color.code, border: `2px solid ${color.blue}`}}>
                  <Mono size={type.body}>{short(H.readme)}…</Mono>
                </div>
              </Enter>
            </Stack>
            <Icon name="arrowRight" size={50} color={color.paperMute} />
            <Stack gap={12}>
              <Label size={type.label} tone={color.paperSoft}>value</Label>
              <div style={{padding: '22px 28px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
                <Mono tone={color.ink} size={type.body}># My app</Mono>
              </div>
            </Stack>
          </Row>
        </Enter>
        <Row gap={20}>
          {terms.map((x) => (
            <Enter key={x.t} at={x.at} preset="pop">
              <Pill variant="neutral" size={32}>{x.t}</Pill>
            </Enter>
          ))}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 2. Inside .git ----------

const Init: React.FC = () => {
  const cue = useCue();
  const [init, ls, find] = blocks(out.s01);
  const at = cue('git init');
  const lsAt = cue('hidden folder');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Inside .git" title="An empty repo" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1200}
            cps={30}
            lines={[
              ...term(init, at, at + 14),
              ...term(ls, lsAt, lsAt + 14, 2, (l) => (l === 'objects' ? color.blue : undefined)),
              {at: cue("right now it's empty"), cmd: find.cmd},
            ]}
          />
        </Enter>
      </Center>
      <div style={{position: 'absolute', right: 200, bottom: 160}}>
        <Enter at={cue('objects')} preset="pop">
          <Pill variant="blue" icon="database" size={30}>objects = the database</Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const Files: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Inside .git" title="Two tiny files" />
      <Center>
        <Row gap={60}>
          <Enter at={cue('a readme')} preset="rise">
            <FileCard name="README.md" content="# My app" />
          </Enter>
          <Enter at={cue('app.js')} preset="rise">
            <FileCard name="app.js" content="console.log('hi')" />
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const Add: React.FC = () => {
  const cue = useCue();
  const [add, find] = blocks(out.s02);
  const at = cue('git add');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Inside .git" title="git add" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal width={1300} cps={30} lines={[...term(add, at), ...term(find, cue('look in the objects'), cue('two new files'), 8, () => color.green)]} />
        </Enter>
        <Enter at={cue('already saved')} preset="pop">
          <Pill variant="white" icon="database" size={32}>Saved before you commit anything</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// The object path split apart: the first 2 characters of the hash are the folder, the other 38 the file name.
const ObjectPath: React.FC = () => {
  const cue = useCue();
  const split = useTween(cue('first two characters'), cue('first two characters') + 16);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Inside .git" title="Named after a hash" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Row gap={0}>
            <Mono tone={color.paperSoft} size={type.heading}>.git/objects/</Mono>
            <div style={{display: 'flex', gap: split * 40}}>
              <div style={{padding: '6px 10px', borderRadius: 10, border: `3px solid ${split > 0.1 ? color.blue : 'transparent'}`}}>
                <Mono size={type.heading} tone={color.blue}>{H.readme.slice(0, 2)}</Mono>
              </div>
              <Mono size={type.heading} tone={color.paperMute}>/</Mono>
              <div style={{padding: '6px 10px', borderRadius: 10, border: `3px solid ${split > 0.1 ? color.green : 'transparent'}`}}>
                <Mono size={type.heading} tone={color.green}>{H.readme.slice(2)}</Mono>
              </div>
            </div>
          </Row>
        </Enter>
        <Row gap={30}>
          <Enter at={cue('folder name')} preset="pop">
            <Pill variant="blue" icon="folder" size={30}>folder: first 2 characters</Pill>
          </Enter>
          <Enter at={cue('the rest')} preset="pop">
            <Pill variant="green" icon="file" size={30}>file: the other 38</Pill>
          </Enter>
        </Row>
        <Enter at={cue('millions of files')} preset="pop">
          <Label size={type.body} tone={color.paperSoft}>so no single folder ends up with millions of files</Label>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// Raw object bytes look like garbage until you inflate them; then the reader script.
const Compressed: React.FC = () => {
  const cue = useCue();
  const script = cue('little script');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Inside .git" title="read-object.js" />
      <Center gap={40}>
        {useCurrentFrame() < script ? (
          <Enter at={0} preset="rise">
            <Stack gap={26}>
              <div style={{width: 900, padding: 30, borderRadius: radius.card, background: color.code, border: `1px solid ${color.tileLine}`, wordBreak: 'break-all'}}>
                <Mono tone={color.paperMute}>x☺K╩╔OR0┤`P╓═╗ëÖ¥õ$ûæ±Ô¶╬ÅÄ▓ñ╣ƒ┤░╗£</Mono>
              </div>
              <Enter at={cue('zlib')} preset="pop">
                <Pill variant="white" icon="box" size={30}>Just zlib-compressed</Pill>
              </Enter>
            </Stack>
          </Enter>
        ) : (
          <Enter at={script} preset="rise">
            <CodeWindow
              file={`${CODE}/read-object.js`}
              lines={[1, 10]}
              size={26}
              maxWidth={1680}
              steps={[
                {at: cue('takes a hash'), lines: [6, 6]},
                {at: cue('finds the file'), lines: [7, 7]},
                {at: cue('decompresses it'), lines: [9, 9]},
                {at: cue('prints it'), lines: [10, 10]},
              ]}
            />
          </Enter>
        )}
      </Center>
    </AbsoluteFill>
  );
};

// The decompressed blob, piece by piece: type, size, null byte, content. And no filename.
const BlobInside: React.FC = () => {
  const cue = useCue();
  const [read] = blocks(out.s03);
  const parts = [
    {t: 'blob', label: 'type', at: cue('word blob'), tone: color.green},
    {t: '9', label: 'size in bytes', at: cue('then 9'), tone: color.amber},
    {t: '\\0', label: 'null byte', at: cue('null byte'), tone: color.paperSoft},
    {t: '# My app', label: 'the content', at: cue('actual content'), tone: color.blue},
  ];
  const nameAt = cue("what's not in there");
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Inside .git" title="What's in a blob" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <Terminal width={1300} lines={term(read, 4, 16)} />
        </Enter>
        <Row gap={16}>
          {parts.map((p) => (
            <Enter key={p.label} at={p.at} preset="pop">
              <Stack gap={12}>
                <div style={{padding: '16px 24px', borderRadius: radius.card, background: color.code, border: `3px solid ${p.tone}`}}>
                  <Mono size={type.heading} tone={p.tone}>{p.t}</Mono>
                </div>
                <Label size={type.label} tone={color.paperSoft}>{p.label}</Label>
              </Stack>
            </Enter>
          ))}
        </Row>
        <Enter at={nameAt} preset="pop">
          <div style={{position: 'relative'}}>
            <Pill variant="outline" icon="x" size={30}>No file name in here</Pill>
          </div>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const HashCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The hash" title="hash-object.js" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/hash-object.js`}
            lines={[1, 9]}
            size={26}
            maxWidth={1680}
            steps={[
              {at: cue('sha-1'), lines: [1, 1]},
              {at: cue('the word blob'), lines: [7, 7]},
              {at: cue('builds that'), lines: [6, 7]},
              {at: cue('hashes it'), lines: [9, 9]},
            ]}
          />
        </Enter>
        <Enter at={cue('sha-1')} preset="pop">
          <Mono size={type.body} tone={color.paperSoft}>
            SHA-1( <span style={{color: color.green}}>blob</span> <span style={{color: color.amber}}>9</span> \0 <span style={{color: color.blue}}># My app</span> )
          </Mono>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const HashRun: React.FC = () => {
  const cue = useCue();
  const [mine, git] = blocks(out.s04);
  const same = cue('exact same hash');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The hash" title="Same as Git's" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1200}
            cps={30}
            lines={[...term(mine, 4, cue('cc22473'), 3, () => color.green), ...term(git, cue('git hash object'), same, 3, () => color.green)]}
          />
        </Enter>
        <Enter at={same} preset="pop">
          <Pill variant="green" icon="check" size={32}>Identical</Pill>
        </Enter>
        <Enter at={cue('without using git')} preset="pop">
          <Label size={type.body} tone={color.paperSoft}>Git's ID for a file, worked out without Git</Label>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// Content-addressable storage: same content -> one object; one changed byte -> a different object.
const ContentAddressed: React.FC = () => {
  const cue = useCue();
  const onceAt = cue('shows up twice');
  const byteAt = cue('one byte');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The hash" title="Content-addressable storage" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            The name comes from the <Accent>content</Accent>
          </Headline>
        </Enter>
        <Row gap={140}>
          <Enter at={onceAt} preset="rise">
            <Row gap={30}>
              <Stack gap={16}>
                <FileCard name="README.md" content="# My app" width={330} />
                <FileCard name="docs/intro.md" content="# My app" width={330} />
              </Stack>
              <Icon name="arrowRight" size={46} color={color.paperMute} />
              <Enter at={cue('stored once')} preset="pop">
                <ObjectCard kind="blob" hash={H.readme} width={260}>
                  <Label size={type.label} tone={color.paperSoft}>stored once</Label>
                </ObjectCard>
              </Enter>
            </Row>
          </Enter>
          <Enter at={byteAt} preset="rise">
            <Stack gap={18}>
              <Row gap={16}>
                <Mono size={type.body}># My app</Mono>
                <Icon name="arrowRight" size={34} color={color.paperMute} />
                <Mono size={type.body} tone={color.green}>{short(H.readme)}</Mono>
              </Row>
              <Enter at={cue('different hash')} preset="fade">
                <Row gap={16}>
                  <Mono size={type.body}># My app<span style={{color: color.amber}}>!</span></Mono>
                  <Icon name="arrowRight" size={34} color={color.paperMute} />
                  <Mono size={type.body} tone={color.red}>a new hash</Mono>
                </Row>
              </Enter>
            </Stack>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 3. Commits ----------

const FirstCommit: React.FC = () => {
  const cue = useCue();
  const [commit, find] = blocks(out.s05);
  const isNew = (l: string) => l.includes(H.tree1.slice(2, 12)) || l.includes(H.c1.slice(2, 12));
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="The first commit" />
      <Center gap={30}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1300}
            cps={30}
            lines={[...term(commit, 4, 20, 3), ...term(find, cue('in the objects'), cue('two more files'), 4, (l) => (isNew(l) ? color.amber : undefined))]}
          />
        </Enter>
        <Row gap={20}>
          <Enter at={cue('the commit')} preset="pop">
            <Pill variant="blue" size={30}>commit {short(H.c1)}</Pill>
          </Enter>
          <Enter at={cue('called a tree')} preset="pop">
            <Pill variant="neutral" size={30}>tree {short(H.tree1)}</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const TreeObject: React.FC = () => {
  const cue = useCue();
  const [, tree] = blocks(out.s06);
  const cols = [
    {t: 'mode', at: cue('file mode')},
    {t: 'type', at: cue('the type')},
    {t: 'hash', at: cue('the hash')},
    {t: 'name', at: cue('the file name')},
  ];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="A tree" />
      <Center gap={40}>
        <Enter at={cue('cat-file')} preset="rise">
          <Terminal width={1400} cps={30} lines={term(tree, cue('cat-file'), cue('the tree first'), 4)} />
        </Enter>
        <Row gap={16}>
          {cols.map((c) => (
            <Enter key={c.t} at={c.at} preset="pop">
              <Pill variant={c.t === 'name' ? 'blue' : 'neutral'} size={30}>{c.t}</Pill>
            </Enter>
          ))}
        </Row>
        <Enter at={cue('basically a directory')} preset="pop">
          <Headline size={type.title - 8}>
            A tree is a <Accent>directory</Accent>
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// The commit object's text, then the graph: commit -> tree -> two blobs.
const CommitObject: React.FC = () => {
  const cue = useCue();
  const [commit] = blocks(out.s06);
  const graphAt = cue('points to a tree');
  const frame = useCurrentFrame();
  const hl = (l: string) => {
    if (l.startsWith('tree') && frame >= cue('one tree')) return color.amber;
    if ((l.startsWith('author') || l.startsWith('committer')) && frame >= cue('who wrote it')) return color.paper;
    if (l === 'first commit' && frame >= cue('the message')) return color.blue;
    return color.paperSoft;
  };
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="A commit" />
      <Center gap={40}>
        {frame < graphAt ? (
          <Enter at={0} preset="rise">
            <Terminal width={1300} lines={[{at: 0, cmd: commit.cmd}, ...commit.out.map((o, i) => ({at: 10 + i * 3, out: o, tone: hl(o)}))]} />
          </Enter>
        ) : (
          <Enter at={graphAt} preset="rise">
            <Stack gap={0}>
              <ObjectCard kind="commit" hash={H.c1} width={420}>
                <Mono size={type.label}>"first commit"</Mono>
              </ObjectCard>
              <Line at={graphAt + 6} />
              <ObjectCard kind="tree" hash={H.tree1} width={420} />
              <Enter at={cue('points to the blobs')} preset="fade">
                <Stack gap={0}>
                  <Line at={cue('points to the blobs')} />
                  <Row gap={40}>
                    <ObjectCard kind="blob" hash={H.readme} width={300}>
                      <Mono size={type.label}># My app</Mono>
                    </ObjectCard>
                    <ObjectCard kind="blob" hash={H.app1} width={300}>
                      <Mono size={type.label}>console.log('hi')</Mono>
                    </ObjectCard>
                  </Row>
                </Stack>
              </Enter>
            </Stack>
          </Enter>
        )}
      </Center>
    </AbsoluteFill>
  );
};

const SecondCommit: React.FC = () => {
  const cue = useCue();
  const [commit, count] = blocks(out.s07);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="A second commit" />
      <Center gap={40}>
        <Row gap={40}>
          <Enter at={0} preset="rise">
            <FileCard name="app.js" content="console.log('hi')" width={420} />
          </Enter>
          <Icon name="arrowRight" size={44} color={color.paperMute} />
          <Enter at={cue('hello instead')} preset="rise">
            <FileCard name="app.js" content="console.log('hello')" width={420} />
          </Enter>
        </Row>
        <Enter at={cue('commit again')} preset="rise">
          <Terminal width={1100} cps={30} lines={[...term(commit, cue('commit again'), cue('commit again') + 16), ...term(count, cue('four objects'), cue('to seven'), 3, () => color.amber)]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// The three new objects, and the new tree pointing at the README blob that was already there.
const Reuse: React.FC = () => {
  const cue = useCue();
  const [, , , tree] = blocks(out.s07);
  const sameAt = cue('same hash');
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="Unchanged files are reused" />
      <Center gap={40}>
        <Row gap={24}>
          <Enter at={cue('new blob')} preset="pop">
            <ObjectCard kind="blob" hash={H.app2} width={320} focus>
              <Mono size={type.label}>new app.js</Mono>
            </ObjectCard>
          </Enter>
          <Enter at={cue('new tree')} preset="pop">
            <ObjectCard kind="tree" hash={H.tree2} width={320} focus />
          </Enter>
          <Enter at={cue('new commit')} preset="pop">
            <ObjectCard kind="commit" hash={H.c2} width={320} focus />
          </Enter>
        </Row>
        <Enter at={cue('look at the readme')} preset="rise">
          <Terminal
            width={1400}
            lines={[{at: cue('look at the readme'), cmd: tree.cmd}, ...tree.out.map((o, i) => ({at: cue('look at the readme') + 12 + i * 3, out: o, tone: o.endsWith('README.md') && frame >= sameAt ? color.green : undefined}))]}
          />
        </Enter>
        <Enter at={sameAt} preset="pop">
          <Pill variant="green" icon="check" size={30}>README.md: same blob as the first commit</Pill>
        </Enter>
      </Center>
      <Bottom y={90}>
        <Enter at={cue('insane amount')} preset="pop">
          <Pill variant="white" icon="database" size={30}>Snapshots stay cheap</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// The second commit's text with its parent line, then the chain of commits.
const Parent: React.FC = () => {
  const cue = useCue();
  const [, , commit] = blocks(out.s07);
  const chainAt = cue('chain of commits');
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="Parents" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <Terminal width={1300} lines={[{at: 0, cmd: commit.cmd}, ...commit.out.map((o, i) => ({at: 8 + i * 3, out: o, tone: o.startsWith('parent') && frame >= cue('parent') ? color.blue : undefined}))]} />
        </Enter>
        <Enter at={chainAt} preset="rise">
          <Row gap={0}>
            <ObjectCard kind="commit" hash={H.c1} width={330}>
              <Mono size={type.label}>"first commit"</Mono>
            </ObjectCard>
            <Stack gap={4}>
              <Mono tone={color.blue} size={type.label - 2}>parent</Mono>
              <Row gap={0}>
                <Icon name="arrowRight" size={40} color={color.blue} />
              </Row>
            </Stack>
            <ObjectCard kind="commit" hash={H.c2} width={330} focus>
              <Mono size={type.label}>"say hello"</Mono>
            </ObjectCard>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// No diff is stored: Git compares two trees on demand.
const NoDiff: React.FC = () => {
  const cue = useCue();
  const cmpAt = cue('two trees');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Commits" title="No diffs stored" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <Row gap={20}>
            <Pill variant="white" icon="terminal" size={30}>git diff</Pill>
            <Pill variant="white" icon="terminal" size={30}>git log -p</Pill>
          </Row>
        </Enter>
        <Enter at={cmpAt} preset="rise">
          <Row gap={40}>
            <ObjectCard kind="tree" hash={H.tree1} width={340}>
              <Mono size={type.label} tone={color.paperSoft}>app.js → {short(H.app1)}</Mono>
            </ObjectCard>
            <Pill variant="blue" icon="search" size={30}>compare now</Pill>
            <ObjectCard kind="tree" hash={H.tree2} width={340}>
              <Mono size={type.label} tone={color.paperSoft}>app.js → {short(H.app2)}</Mono>
            </ObjectCard>
          </Row>
        </Enter>
        <Enter at={cmpAt + 20} preset="pop">
          <div style={{padding: 26, borderRadius: radius.card, background: color.code, border: `1px solid ${color.tileLine}`, display: 'flex', flexDirection: 'column', gap: 8}}>
            <Mono tone={color.red}>- console.log('hi')</Mono>
            <Mono tone={color.green}>+ console.log('hello')</Mono>
          </div>
        </Enter>
      </Center>
      <Bottom y={110}>
        <Enter at={cue('packs objects')} preset="pop">
          <Pill variant="neutral" icon="box" size={28}>Packing compresses storage later</Pill>
        </Enter>
        <Enter at={cue('is snapshots')} preset="pop">
          <Pill variant="white" icon="check" size={28}>The model is snapshots</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// ---------- 4. Branches ----------

const Refs: React.FC = () => {
  const cue = useCue();
  const [head, main] = blocks(out.s08);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Branches" title="Just files" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal width={1200} cps={30} lines={[...term(head, cue('head file'), cue('head file') + 18, 3, () => color.blue), ...term(main, cue('main file'), cue('latest commit'), 3, () => color.green)]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const NewBranch: React.FC = () => {
  const cue = useCue();
  const [, , branch, feature] = blocks(out.s08);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Branches" title="Making a branch" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal width={1200} cps={30} lines={[...term(branch, 4), ...term(feature, cue('one more file'), cue('same hash'), 3, () => color.green)]} />
        </Enter>
        <Enter at={cue('41')} preset="rise">
          <Row gap={24}>
            <div style={{padding: '18px 26px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
              <Mono tone={color.ink}>refs/heads/feature</Mono>
            </div>
            <Pill variant="white" size={32}>40 hex characters + a newline = 41 bytes</Pill>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// HEAD -> main -> commit; then HEAD pointing straight at a commit: detached HEAD.
const Head: React.FC = () => {
  const cue = useCue();
  const detAt = cue('straight to a commit');
  const det = useTween(detAt, detAt + 16) > 0.5;
  const node = (label: string, tone: string, on = true) => (
    <div style={{padding: '18px 28px', borderRadius: radius.card, background: on ? color.tile : 'transparent', border: `2px ${on ? 'solid' : 'dashed'} ${on ? tone : color.paperMute}`, opacity: on ? 1 : 0.4}}>
      <Mono size={type.body} tone={tone}>{label}</Mono>
    </div>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Branches" title="HEAD" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Row gap={24}>
            {node('HEAD', color.amber)}
            <Icon name="arrowRight" size={40} color={color.paperMute} />
            {det ? null : (
              <>
                {node('main', color.blue)}
                <Icon name="arrowRight" size={40} color={color.paperMute} />
              </>
            )}
            {node(short(H.c2), color.green)}
          </Row>
        </Enter>
        <Enter at={cue('which branch')} preset="pop">
          <Label size={type.body} tone={color.paperSoft}>{det ? 'HEAD points straight at a commit' : 'HEAD says which branch you\'re on'}</Label>
        </Enter>
        <Enter at={cue('detached head')} preset="pop">
          <Headline size={type.title}>
            Detached <Accent>HEAD</Accent>
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 5. Rewriting history ----------

const Amend: React.FC = () => {
  const cue = useCue();
  const [log1, amend, log2] = blocks(out.s09);
  const amendAt = cue('amend');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Rewriting history" title="git commit --amend" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1300}
            cps={34}
            lines={[
              ...term(log1, cue("here's our log"), cue("here's our log") + 14, 3),
              ...term(amend, amendAt, cue('exclamation') + 10, 3),
              ...term(log2, cue('hash changes'), cue('hash changes') + 12, 3, (_, i) => (i === 0 ? color.amber : undefined)),
            ]}
          />
        </Enter>
        <Row gap={20}>
          <Enter at={cue('new object')} preset="pop">
            <Pill variant="white" size={30}>{short(H.c2)} → {H.c2b}</Pill>
          </Enter>
          <Enter at={cue("didn't edit")} preset="pop">
            <Pill variant="neutral" icon="x" size={30}>Not edited, replaced</Pill>
          </Enter>
          <Enter at={cue('moved the branch')} preset="pop">
            <Pill variant="blue" icon="arrowRight" size={30}>main moves to the new one</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Change the first commit and every later commit gets a new hash, because each one names its parent.
const Ripple: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const start = cue('old commit');
  const changed = (i: number) => frame >= start + 10 + i * 14;
  const names = ['A', 'B', 'C', 'D'];
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Rewriting history" title="It ripples" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Row gap={14}>
            {names.map((n, i) => (
              <React.Fragment key={n}>
                {i > 0 ? <Icon name="arrowRight" size={36} color={changed(i) ? color.amber : color.paperMute} /> : null}
                <div style={{width: 230, padding: '20px 22px', borderRadius: radius.card, background: color.tile, border: `2px solid ${changed(i) ? color.amber : color.tileLine}`, boxSizing: 'border-box'}}>
                  <Mono size={type.body}>commit {n}{changed(i) ? "'" : ''}</Mono>
                  <br />
                  <Mono size={type.label} tone={changed(i) ? color.amber : color.paperSoft}>{changed(i) ? 'new hash' : 'old hash'}</Mono>
                </div>
              </React.Fragment>
            ))}
          </Row>
        </Enter>
        <Enter at={cue('parent line')} preset="pop">
          <Label size={type.body} tone={color.paperSoft}>each commit names its parent's hash, so a new parent means a new hash</Label>
        </Enter>
        <Row gap={20}>
          <Enter at={cue('rebase')} preset="pop">
            <Pill variant="white" icon="layers" size={30}>rebase = brand new commits</Pill>
          </Enter>
          <Enter at={cue('already pushed')} preset="pop">
            <Pill variant="outline" icon="x" size={30}>Don't rewrite pushed history</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 6. Recap ----------

const Recap: React.FC = () => {
  const cue = useCue();
  const items = [
    {kind: 'blob' as const, t: 'holds the content of a file', at: cue('blobs')},
    {kind: 'tree' as const, t: 'holds names, points to blobs', at: cue('trees')},
    {kind: 'commit' as const, t: 'one tree (a snapshot) + its parent', at: cue('commits')},
  ];
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            That's <Accent>Git</Accent>
          </Headline>
        </Enter>
        <Stack gap={18}>
          {items.map((x) => (
            <Enter key={x.kind} at={x.at} preset="rise">
              <div style={{width: 900, display: 'flex', alignItems: 'center', gap: 26, padding: '22px 30px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, boxSizing: 'border-box'}}>
                <div style={{width: 130, padding: '6px 0', textAlign: 'center', borderRadius: radius.pill, background: TONE[x.kind], fontFamily: font.mono, fontSize: type.label, color: color.ink}}>{x.kind}</div>
                <div style={{fontFamily: font.sans, fontSize: type.body, color: color.ink}}>{x.t}</div>
              </div>
            </Enter>
          ))}
          <Enter at={cue('branches')} preset="rise">
            <div style={{width: 900, display: 'flex', alignItems: 'center', gap: 26, padding: '22px 30px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, boxSizing: 'border-box'}}>
              <div style={{width: 130, padding: '6px 0', textAlign: 'center', borderRadius: radius.pill, background: color.paperSoft, fontFamily: font.mono, fontSize: type.label, color: color.ink}}>branch</div>
              <div style={{fontFamily: font.sans, fontSize: type.body, color: color.ink}}>a file with a commit hash in it</div>
            </div>
          </Enter>
        </Stack>
      </Center>
    </AbsoluteFill>
  );
};

export const GitVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/git-voice.wav')} />
    <Track>
      <Scene from="most people think"><Hook /></Scene>
      <Scene from="and git itself is basically"><KeyValueStore /></Scene>
      <Scene from="so let's open up"><Init /></Scene>
      <Scene from="so i'll make two tiny files"><Files /></Scene>
      <Scene from="now i'll run git add"><Add /></Scene>
      <Scene from="so each file is named"><ObjectPath /></Scene>
      <Scene from="if you open one of these"><Compressed /></Scene>
      <Scene from="and here's our readme"><BlobInside /></Scene>
      <Scene from="but first"><HashCode /></Scene>
      <Scene from="if i run it on the readme"><HashRun /></Scene>
      <Scene from="this is called content"><ContentAddressed /></Scene>
      <Scene from="now let's commit"><FirstCommit /></Scene>
      <Scene from="git has a command"><TreeObject /></Scene>
      <Scene from="here's the commit"><CommitObject /></Scene>
      <Scene from="now i'll change"><SecondCommit /></Scene>
      <Scene from="a new blob for"><Reuse /></Scene>
      <Scene from="and the new commit has"><Parent /></Scene>
      <Scene from="and there's no diff"><NoDiff /></Scene>
      <Scene from="so what's a branch"><Refs /></Scene>
      <Scene from="if i create a new branch"><NewBranch /></Scene>
      <Scene from="and head is how"><Head /></Scene>
      <Scene from="last thing"><Amend /></Scene>
      <Scene from="and it ripples"><Ripple /></Scene>
      <Scene from="so yeah"><Recap /></Scene>
    </Track>
  </TranscriptProvider>
);
