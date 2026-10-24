import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Accent, Center, CodeWindow, Compare, Enter, FocusShade, Headline, Icon, KeyValue, Label, Logo, NodeBox, Pill,
  Pipeline, Scene, SectionTag, Stage, Terminal, Track, TranscriptProvider,
  color, font, radius, shadow, stagger, type, useCue, useTween, weight,
} from '../../kit';
import transcript from './transcript.json';
import out from '../../../public/code/webhooks-polling/terminal/output.json';

// "Webhooks vs polling": polling, the naive webhook and how it breaks, then the three fixes
// (respond fast, idempotency, signatures), polling as a fallback, local testing, recap.
// Demo code: projects/webhooks-vs-polling (plain Node), copied to public/code/webhooks-polling.
// Real terminal output from running it: public/code/webhooks-polling/terminal/*.txt (bundled in output.json).
// Voice: public/audio/webhooks-voice.wav.

export const webhooksTranscript = transcript;

const CODE = 'code/webhooks-polling';

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
// pinned to the bottom of the frame, centered
const Bottom: React.FC<{children: React.ReactNode; y?: number}> = ({children, y = 130}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: y, display: 'flex', justifyContent: 'center', gap: 20}}>{children}</div>
);
// a red line that draws across whatever it sits on
const Strike: React.FC<{at: number}> = ({at}) => {
  const t = useTween(at, at + 12);
  return <div style={{position: 'absolute', left: -12, right: -12, top: '50%', height: 6, borderRadius: 3, background: color.red, transform: `scaleX(${t})`, transformOrigin: 'left'}} />;
};
// one system in a diagram: a dark tile with an icon or logo, a name and an optional status line
const System: React.FC<{label: string; icon?: React.ComponentProps<typeof Icon>['name']; logo?: string; sub?: React.ReactNode; width?: number; tone?: string; light?: boolean}> = ({
  label, icon = 'server', logo, sub, width = 380, tone = color.paperSoft, light = false,
}) => (
  <div style={{width, padding: '30px 28px', borderRadius: radius.card, background: light ? color.card : color.tile, border: light ? 'none' : `1px solid ${color.tileLine}`, boxShadow: light ? shadow.card : shadow.tile, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, boxSizing: 'border-box'}}>
    {logo ? <Logo name={logo} size={80} /> : <Icon name={icon} size={80} color={light ? color.ink : tone} />}
    <div style={{fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: light ? color.ink : color.paper}}>{label}</div>
    {sub ? <div style={{fontFamily: font.sans, fontSize: type.label, color: light ? color.inkMute : color.paperSoft, textAlign: 'center'}}>{sub}</div> : null}
  </div>
);
// a horizontal arrow that draws in, with a label above it
const Arrow: React.FC<{at: number; width?: number; label?: React.ReactNode; tone?: string; dir?: 'right' | 'left'; dashed?: boolean}> = ({at, width = 300, label, tone = color.blue, dir = 'right', dashed = false}) => {
  const t = useTween(at, at + 14);
  return (
    <div style={{position: 'relative', width, height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: t > 0 ? 1 : 0}}>
      {label ? <div style={{position: 'absolute', top: -6, left: 0, right: 0, textAlign: 'center', fontFamily: font.mono, fontSize: type.label, color: tone, opacity: t}}>{label}</div> : null}
      <div style={{position: 'relative', height: 6, marginTop: 34}}>
        <div
          style={{
            position: 'absolute', top: 0, height: 6, borderRadius: 3, width: `${t * 100}%`,
            [dir === 'right' ? 'left' : 'right']: 0,
            background: dashed ? `repeating-linear-gradient(90deg, ${tone} 0 16px, transparent 16px 28px)` : tone,
          } as React.CSSProperties}
        />
        <div
          style={{
            position: 'absolute', top: -11, width: 0, height: 0, opacity: t > 0.9 ? 1 : 0,
            borderTop: '14px solid transparent', borderBottom: '14px solid transparent',
            ...(dir === 'right' ? {right: -4, borderLeft: `22px solid ${tone}`} : {left: -4, borderRight: `22px solid ${tone}`}),
          }}
        />
      </div>
    </div>
  );
};
// a status pill that switches from pending (grey) to succeeded (green) at `at`
const Status: React.FC<{at: number}> = ({at}) => {
  const done = useTween(at, at + 10) > 0.5;
  return (
    <Pill variant={done ? 'green' : 'neutral'} icon={done ? 'check' : 'clock'} size={30}>
      {done ? 'succeeded' : 'pending'}
    </Pill>
  );
};
// Real terminal output, one line per non-empty line of the captured file
const termLines = (txt: string, at: number, step = 3, tone?: string) =>
  txt
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((o, i) => ({at: at + i * step, out: o, tone}));
// the n-th line of a captured file, revealed at `at`
const line = (txt: string, n: number, at: number, tone?: string) => ({at, out: txt.split('\n')[n], tone});

// ---------- 1. Hook ----------

const Hook: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={70}>
        <Enter at={0} preset="rise">
          <Headline size={type.hero - 16}>
            Webhooks vs <Accent>polling</Accent>
          </Headline>
        </Enter>
        <Row gap={60}>
          <Enter at={0} preset="pop">
            <System label="Your app" icon="code" light width={360} />
          </Enter>
          <Enter at={cue('another service')} preset="fade">
            <Arrow at={cue('another service')} width={220} tone={color.paperMute} dashed />
          </Enter>
          <Enter at={cue('another service')} preset="pop">
            <System label="Payment provider" logo="stripe" width={420} sub={<Status at={cue('something changes')} />} />
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Two lanes: the app asking over and over (poll), and the server calling once (webhook).
const TwoWays: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const pollAt = cue('either poll');
  const hookAt = cue('call you');
  const lane = (title: string, at: number, children: React.ReactNode, tone: string) => (
    <Enter at={at} preset="rise">
      <div style={{width: 1640, padding: '28px 44px', borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`, display: 'flex', alignItems: 'center', gap: 40, boxSizing: 'border-box'}}>
        <div style={{width: 260, fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.heading, color: tone}}>{title}</div>
        {children}
      </div>
    </Enter>
  );
  // the polling requests keep coming, one every 20 frames
  const asks = Math.max(0, Math.min(7, Math.floor((frame - pollAt) / 20) + 1));
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Two ways" title="Ask, or get told" />
      <Center gap={50}>
        {lane(
          'Polling',
          pollAt,
          <Row gap={30}>
            <Mono>app</Mono>
            <div style={{display: 'flex', gap: 10, width: 900}}>
              {Array.from({length: asks}).map((_, i) => (
                <div key={i} style={{padding: '10px 12px', borderRadius: radius.pill, background: i === 6 ? color.green : color.tileHi, fontFamily: font.mono, fontSize: type.label - 2, color: color.paper}}>
                  {i === 6 ? 'done' : 'status?'}
                </div>
              ))}
            </div>
            <Mono>API</Mono>
          </Row>,
          color.paper,
        )}
        {lane(
          'Webhook',
          hookAt,
          <Row gap={30}>
            <Mono>app</Mono>
            <Arrow at={cue('sends an http request')} width={760} dir="left" label="POST  payment.succeeded" />
            <Mono>server</Mono>
          </Row>,
          color.blue,
        )}
      </Center>
      <Bottom>
        <Enter at={cue("that's a webhook")} preset="pop">
          <Pill variant="blue" icon="bolt" size={32}>
            The moment it happens
          </Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

const Plan: React.FC = () => {
  const cue = useCue();
  const steps = [
    {t: 'Build both', icon: 'code' as const, at: cue('build both')},
    {t: 'Break the webhook', icon: 'x' as const, at: cue('break the webhook')},
    {t: 'Fix it properly', icon: 'check' as const, at: cue('fix it properly')},
  ];
  return (
    <AbsoluteFill>
      <Center gap={70}>
        <Compare
          gap={140}
          columns={[
            {
              title: 'Polling',
              at: 0,
              el: (
                <Stack gap={16}>
                  <Pill variant="white" icon="check" size={30}>Simple</Pill>
                  <Pill variant="outline" icon="x" size={30}>Wasteful</Pill>
                </Stack>
              ),
            },
            {
              title: 'Webhooks',
              at: cue('webhooks are way'),
              tone: color.blue,
              el: (
                <Stack gap={16}>
                  <Pill variant="blue" icon="bolt" size={30}>Efficient</Pill>
                  <Enter at={cue('a few bugs')} preset="pop">
                    <Pill variant="outline" icon="x" size={30}>First version has bugs</Pill>
                  </Enter>
                </Stack>
              ),
            },
          ]}
        />
        <Row gap={20}>
          {steps.map((s) => (
            <Enter key={s.t} at={s.at} preset="pop">
              <Pill variant="neutral" icon={s.icon} size={32}>{s.t}</Pill>
            </Enter>
          ))}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 2. The setup ----------

// The fake provider's payment: pending for 6 seconds (a filling bar), then succeeded; then the app reacts.
const Setup: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const pend = cue('stays pending');
  const done = cue('changes to succeed');
  const fill = interpolate(frame, [pend, done], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The setup" title="A tiny fake Stripe" />
      <Center>
        <Row gap={50}>
          <Enter at={0} preset="rise">
            <Stack gap={20}>
              <System label="Payly" icon="server" sub="fake payment provider" width={400} />
              <Enter at={cue('tiny stripe')} preset="pop">
                <Row gap={14}>
                  <Label size={type.label} tone={color.paperSoft}>works like</Label>
                  <Logo name="stripe" size={60} />
                </Row>
              </Enter>
            </Stack>
          </Enter>
          <Enter at={cue('create a payment')} preset="rise">
            <div style={{width: 520, padding: 36, borderRadius: radius.card, background: color.card, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Mono tone={color.ink} size={type.body}>pay_24474a2d</Mono>
                <Status at={done} />
              </div>
              <div style={{height: 14, borderRadius: radius.pill, background: color.cardLine, overflow: 'hidden'}}>
                <div style={{width: `${fill * 100}%`, height: '100%', background: fill >= 1 ? color.green : color.blue}} />
              </div>
              <Label size={type.label} tone={color.inkMute}>~6 seconds at the "bank"</Label>
            </div>
          </Enter>
          <Enter at={cue('our app needs')} preset="fade">
            <Arrow at={cue('our app needs')} width={120} />
          </Enter>
          <Enter at={cue('our app needs')} preset="rise">
            <Stack gap={16}>
              <System label="Your app" icon="code" light width={340} />
              <Enter at={cue('send the receipt')} preset="pop">
                <Pill variant="white" icon="check" size={28}>Send the receipt</Pill>
              </Enter>
              <Enter at={cue('fulfill the order')} preset="pop">
                <Pill variant="white" icon="box" size={28}>Fulfil the order</Pill>
              </Enter>
            </Stack>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const Endpoints: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The setup" title="provider.js" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/provider.js`}
            lines={[58, 73]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('a post'), lines: [60, 66]},
              {at: cue('a get'), lines: [68, 72]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 3. Polling ----------

const PollCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Polling" title="poll.js" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/poll.js`}
            lines={[1, 16]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('just a loop'), lines: [8, 14]},
              {at: cue('create the payment'), lines: [4, 5]},
              {at: cue('every second'), lines: [10, 13]},
              {at: cue('until the status'), lines: [12, 12]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const PollRun: React.FC = () => {
  const cue = useCue();
  const at = 6;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Polling" title="Run it" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1100}
            cps={30}
            lines={[
              {at, cmd: 'node poll.js'},
              ...termLines(out.poll, at + 18, 4).slice(0, 8),
              {at: cue('wasted'), out: out.poll.split('\n')[8], tone: color.amber},
            ]}
          />
        </Enter>
        <Row gap={20}>
          <Enter at={cue('seven requests')} preset="pop">
            <Pill variant="white" size={32}>7 requests</Pill>
          </Enter>
          <Enter at={cue('first six')} preset="pop">
            <Pill variant="outline" icon="x" size={32}>6 said "pending"</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// The interval trade-off: poll fast and waste requests (and get rate limited), poll slow and the user waits.
const Interval: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const fastAt = cue('poll every second');
  const slowAt = cue('poll every minute');
  const blocks = Math.max(0, Math.min(40, Math.floor((frame - fastAt) / 3)));
  const wait = interpolate(frame, [slowAt + 10, slowAt + 100], [0, 60], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const side = (title: string, at: number, body: React.ReactNode, foot: React.ReactNode) => (
    <Enter at={at} preset="rise">
      <div style={{width: 700, height: 470, padding: 40, borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`, boxShadow: shadow.tile, display: 'flex', flexDirection: 'column', gap: 28, boxSizing: 'border-box'}}>
        <Mono size={type.heading - 4}>{title}</Mono>
        <div style={{flex: 1}}>{body}</div>
        {foot}
      </div>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Polling" title="Pick an interval" />
      <Center gap={50}>
        <Row gap={60}>
          {side(
            'every 1s',
            fastAt,
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 10}}>
              {Array.from({length: blocks}).map((_, i) => (
                <div key={i} style={{width: 52, height: 40, borderRadius: 8, background: i === 39 ? color.green : color.tileHi}} />
              ))}
            </div>,
            <Row gap={16}>
              <Enter at={cue('nothing new')} preset="pop">
                <Pill variant="neutral" size={28}>Mostly "nothing new"</Pill>
              </Enter>
              <Enter at={cue('rate limit')} preset="pop">
                <Pill variant="outline" icon="x" size={28}>429 rate limited</Pill>
              </Enter>
            </Row>,
          )}
          {side(
            'every 60s',
            slowAt,
            <Stack gap={10}>
              <Icon name="clock" size={110} color={color.paperSoft} />
              <div style={{fontFamily: font.sans, fontSize: type.hero, color: color.paper}}>{Math.round(wait)}s</div>
            </Stack>,
            <Enter at={cue('whole minute')} preset="pop">
              <Pill variant="outline" icon="user" size={28}>User waits for the receipt</Pill>
            </Enter>,
          )}
        </Row>
        <Enter at={cue('trading speed for load')} preset="pop">
          <Headline size={type.title}>
            Always trading speed for <Accent>load</Accent>
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// The webhook direction: you give the provider a URL, and it POSTs one event to it.
const Flip: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Webhooks" title="They call you" />
      <Center gap={50}>
        <Row gap={40}>
          <Enter at={0} preset="rise">
            <System label="Your app" icon="code" light width={360} sub={<Mono tone={color.inkSoft}>POST /webhooks</Mono>} />
          </Enter>
          <Stack gap={0}>
            <Arrow at={cue('give the provider a url')} width={380} label="here's my URL" tone={color.paperMute} dashed />
            <Arrow at={cue('send a post request')} width={380} dir="left" label="POST /webhooks" />
          </Stack>
          <Enter at={0} preset="rise">
            <System label="Payly" icon="server" width={340} sub={<Status at={cue('when the status changes')} />} />
          </Enter>
        </Row>
        <Enter at={cue('with an event')} preset="rise">
          <KeyValue
            title="the event (JSON body)"
            width={760}
            rows={[
              {k: 'id', v: 'evt_23d1bd72', at: cue('with an event')},
              {k: 'type', v: 'payment.succeeded', at: cue('specific thing')},
              {k: 'data.paymentId', v: 'pay_24474a2d', at: cue('specific thing') + 6},
            ]}
          />
        </Enter>
      </Center>
      <Bottom y={100}>
        <Enter at={cue('one request')} preset="pop">
          <Pill variant="blue" icon="bolt" size={30}>One request, right when it happens</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// ---------- 4. The naive webhook ----------

const NaiveCode: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The first webhook" title="webhook-naive.js" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/webhook-naive.js`}
            lines={[2, 17]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('simple http server'), lines: [5, 6]},
              {at: cue('reads the request body'), lines: [7, 8]},
              {at: cue('parses the json'), lines: [9, 9]},
              {at: cue('if the event type'), lines: [11, 11]},
              {at: cue('sends the receipt'), lines: [12, 12]},
              {at: cue('then it responds'), lines: [15, 15]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Work: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The first webhook" title="work.js" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <CodeWindow file={`${CODE}/work.js`} lines={[1, 5]} size={28} maxWidth={1680} steps={[{at: cue('take 5 seconds'), lines: [3, 3]}]} />
        </Enter>
        <Row gap={20}>
          <Enter at={cue('email api')} preset="pop">
            <Pill variant="neutral" icon="globe" size={30}>Email API</Pill>
          </Enter>
          <Enter at={cue('the database')} preset="pop">
            <Pill variant="neutral" icon="database" size={30}>Database write</Pill>
          </Enter>
          <Enter at={cue('take 5 seconds')} preset="pop">
            <Pill variant="white" icon="clock" size={30}>5 seconds</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Two real terminals: the provider's log on top, the app's log under it.
// The "listening on" lines are left out of both.
const NaiveRun: React.FC = () => {
  const cue = useCue();
  const p = out.naive_provider;
  const a = out.naive_app;
  const emails = cue('receipt email was sent');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The first webhook" title="Run it" />
      <Center gap={30}>
        <Enter at={0} preset="rise">
          <Terminal
            title="provider (node provider.js)"
            width={1660}
            cps={40}
            lines={[
              {at: 4, cmd: 'curl -X POST localhost:4000/payments'},
              line(p, 1, cue('it succeeds')),
              line(p, 2, cue('attempt 1 failed'), color.red),
              line(p, 3, cue('then attempt 2'), color.red),
              line(p, 4, cue('then 3'), color.red),
              line(p, 5, cue('then 3') + 14, color.red),
            ]}
          />
        </Enter>
        <Enter at={cue('on our app side')} preset="rise">
          <Terminal title="app (node webhook-naive.js)" width={1660} lines={[1, 2, 3, 4].map((n, i) => line(a, n, stagger(emails, i, 8), color.amber))} />
        </Enter>
      </Center>
      <div style={{position: 'absolute', right: 150, bottom: 120}}>
        <Enter at={cue('4 times')} preset="pop">
          <Pill variant="outline" icon="x" size={32}>4 emails, 1 payment</Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

// A timeline of what really happened: the provider gives up after 3s and retries with backoff,
// while the app's handler keeps running 5s every time and sends an email each time.
// Attempts start at 0, 5, 12, 21s (3s timeout + 2s, 4s, 6s backoff); emails land at 5, 10, 17, 26s.
const RetryTimeline: React.FC = () => {
  const cue = useCue();
  const W = 1500;
  const SEC = W / 28;
  const starts = [0, 5, 12, 21];
  const firstAt = cue('only waits a few seconds');
  const slowAt = cue('slow work');
  const failAt = cue('marked the delivery as failed');
  const retryAt = cue('so it retried');
  const backoffAt = cue('back off');
  const theirSide = cue('only happened on their side');
  const everyAt = cue('every single time');
  const attemptAt = (i: number) => (i === 0 ? firstAt : retryAt + (i - 1) * 12);
  const bar = (x: number, w: number, tone: string, label: string, at: number) => (
    <div key={`${label}${x}`} style={{position: 'absolute', left: x * SEC, top: 0}}>
      <Enter at={at} preset="fade">
        <div style={{width: w * SEC, height: 64, borderRadius: 12, background: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.mono, fontSize: type.label - 2, color: color.ink}}>{label}</div>
      </Enter>
    </div>
  );
  const row = (title: string, children: React.ReactNode) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
      <div style={{width: 160, textAlign: 'right'}}>
        <Label size={type.body} tone={color.paperSoft}>{title}</Label>
      </div>
      <div style={{position: 'relative', width: W, height: 64}}>{children}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="The first webhook" title="What happened" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            The provider only waits <Accent>3 seconds</Accent>
          </Headline>
        </Enter>
        <Stack gap={40}>
          {row(
            'Provider',
            <>
              {starts.map((s, i) => bar(s, 3, color.blueSoft, `try ${i + 1}`, attemptAt(i)))}
              {starts.map((s, i) => (
                <div key={`x${i}`} style={{position: 'absolute', left: (s + 3) * SEC - 22, top: 10}}>
                  <Enter at={i === 0 ? failAt : attemptAt(i) + 8} preset="pop">
                    <div style={{width: 44, height: 44, borderRadius: 99, background: color.red, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <Icon name="x" size={26} color={color.paper} />
                    </div>
                  </Enter>
                </div>
              ))}
              {[2, 4, 6].map((g, i) => (
                <div key={`g${i}`} style={{position: 'absolute', left: (starts[i] + 3) * SEC, top: -44, width: g * SEC, textAlign: 'center'}}>
                  <Enter at={stagger(backoffAt, i, 6)} preset="fade">
                    <Mono tone={color.amber} size={type.label - 2}>wait {g}s</Mono>
                  </Enter>
                </div>
              ))}
            </>,
          )}
          {row(
            'Your app',
            <>
              {starts.map((s, i) => bar(s, 5, i === 0 ? color.amber : color.amber, 'sending email…', i === 0 ? slowAt : attemptAt(i)))}
              {starts.map((s, i) => (
                <div key={`m${i}`} style={{position: 'absolute', left: (s + 5) * SEC - 60, top: 74, width: 120, display: 'flex', justifyContent: 'center', gap: 6}}>
                  <Enter at={i === 0 ? slowAt + 20 : stagger(everyAt, i - 1, 6)} preset="pop">
                    <Row gap={6}>
                      <Icon name="check" size={30} color={color.green} />
                      <Mono tone={color.green} size={type.label - 2}>sent</Mono>
                    </Row>
                  </Enter>
                </div>
              ))}
            </>,
          )}
          {row(
            '',
            <div style={{position: 'relative', width: W, marginTop: 40}}>
              {[0, 5, 10, 15, 20, 25].map((s) => (
                <div key={s} style={{position: 'absolute', left: s * SEC - 30, width: 60, textAlign: 'center'}}>
                  <Mono tone={color.paperMute} size={type.label - 2}>{s}s</Mono>
                </div>
              ))}
            </div>,
          )}
        </Stack>
      </Center>
      <Bottom y={110}>
        <Enter at={theirSide} preset="pop">
          <Pill variant="white" icon="clock" size={30}>The timeout only exists on their side</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

const AtLeastOnce: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={60}>
        <Enter at={cue('webhook providers promise')} preset="rise">
          <Headline size={type.hero - 10}>
            At-least-once <Accent>delivery</Accent>
          </Headline>
        </Enter>
        <Row gap={40}>
          <Enter at={cue('get every event')} preset="pop">
            <Pill variant="green" icon="check" size={32}>You get every event</Pill>
          </Enter>
          <Enter at={cue('not sure you got it')} preset="pop">
            <Pill variant="white" icon="arrowRight" size={32}>Not sure? They send it again</Pill>
          </Enter>
        </Row>
        <Enter at={cue('exactly once')} preset="pop">
          <div style={{position: 'relative'}}>
            <Pill variant="neutral" size={32}>Exactly once</Pill>
            <Strike at={cue('exactly once') + 8} />
          </div>
        </Enter>
      </Center>
      <Bottom y={120}>
        <Enter at={cue('your code has to handle')} preset="pop">
          <Pill variant="blue" icon="code" size={32}>Your code has to handle duplicates</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// ---------- 5. Fix one: respond first ----------

const FixOne: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 1 · webhook.js" title="Respond first, work after" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/webhook.js`}
            lines={[22, 36]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('separate responding'), lines: [32, 34]},
              {at: cue('put the event on a queue'), lines: [33, 33]},
              {at: cue('send back a 200'), lines: [34, 34]},
            ]}
          />
        </Enter>
      </Center>
      <div style={{position: 'absolute', right: 150, bottom: 110}}>
        <Enter at={cue('few milliseconds')} preset="pop">
          <Pill variant="green" icon="bolt" size={30}>200 in a few ms</Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

const Worker: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 1 · webhook.js" title="A background worker" />
      <Center>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/webhook.js`}
            lines={[38, 53]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('background worker'), lines: [38, 41]},
              {at: cue('takes events off'), lines: [41, 41]},
              {at: cue('the slow part'), lines: [53, 53]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const QueueCaveat: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 1 · webhook.js" title="The queue" />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <CodeWindow file={`${CODE}/webhook.js`} lines={[7, 9]} size={28} maxWidth={1680} steps={[{at: cue('just an array'), lines: [9, 9]}]} />
        </Enter>
        <Compare
          gap={120}
          winner={{index: 1, at: cue('proper job queue')}}
          columns={[
            {
              title: 'In-memory array',
              at: cue('just an array'),
              el: (
                <Enter at={cue('server crashes')} preset="pop">
                  <Pill variant="outline" icon="x" size={30}>Crash = events gone</Pill>
                </Enter>
              ),
            },
            {
              title: 'Real app',
              at: cue('in a real app'),
              tone: color.green,
              el: (
                <Stack gap={14}>
                  <Pill variant="green" icon="layers" size={30}>A proper job queue</Pill>
                  <Enter at={cue('save the event')} preset="pop">
                    <Pill variant="green" icon="database" size={30}>Or save it before you respond</Pill>
                  </Enter>
                </Stack>
              ),
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 6. Fix two: idempotency ----------

const Duplicates: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 2" title="Duplicates still happen" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <Row gap={20}>
            <Pill variant="neutral" icon="globe" size={30}>Network issues</Pill>
            <Enter at={cue("provider's own retries")} preset="pop">
              <Pill variant="neutral" icon="arrowRight" size={30}>The provider's own retries</Pill>
            </Enter>
          </Row>
        </Enter>
        <Enter at={cue("stripe's docs")} preset="rise">
          <div style={{display: 'flex', alignItems: 'center', gap: 28, padding: '26px 40px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card}}>
            <Logo name="stripe" size={70} />
            <div style={{fontFamily: font.sans, fontSize: type.body, color: color.ink, maxWidth: 900}}>
              Your endpoint might receive the same event more than once
            </div>
          </div>
        </Enter>
        <Enter at={cue('my fake provider')} preset="rise">
          <CodeWindow file={`${CODE}/provider.js`} lines={[49, 55]} size={28} maxWidth={1680} steps={[{at: cue('on purpose'), lines: [55, 55]}]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// One event delivered twice goes into an idempotent handler and produces one result.
const Idempotent: React.FC = () => {
  const cue = useCue();
  const ev = (k: number, at: number) => (
    <Enter key={k} at={at} preset="pop">
      <div style={{padding: '18px 26px', borderRadius: radius.card, background: color.tile, border: `1px solid ${color.tileLine}`, boxShadow: shadow.tile}}>
        <Mono>evt_23d1bd72</Mono>
      </div>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 2" title="Idempotency" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Make your handler <Accent>idempotent</Accent>
          </Headline>
        </Enter>
        <Row gap={40}>
          <Stack gap={18}>
            {ev(1, cue('the same event twice'))}
            {ev(2, cue('the same event twice') + 8)}
          </Stack>
          <Arrow at={cue('the same event twice') + 12} width={160} />
          <Enter at={cue('the same event twice') + 12} preset="pop">
            <NodeBox label="Handler" icon="code" tone={color.blue} width={300} height={170} />
          </Enter>
          <Arrow at={cue('same result')} width={160} tone={color.green} />
          <Enter at={cue('handling it once')} preset="pop">
            <Pill variant="green" icon="check" size={32}>1 email</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

const Dedupe: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 2 · webhook.js" title="Skip events you've seen" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/webhook.js`}
            lines={[41, 54]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('unique id'), lines: [41, 41]},
              {at: cue('already seen'), lines: [48, 48]},
              {at: cue('we skip it'), lines: [49, 50]},
              {at: cue('using a set'), lines: [52, 52]},
            ]}
          />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// A processed_events table with a unique key: two workers insert the same id, only one wins.
const Unique: React.FC = () => {
  const cue = useCue();
  const race = cue('two workers');
  const win = cue('only one insert');
  const worker = (n: number, ok: boolean) => (
    <Enter at={stagger(race, n, 6)} preset="rise">
      <Stack gap={16}>
        <NodeBox label={`Worker ${n + 1}`} icon="cpu" tone={color.paperSoft} width={300} height={150} />
        <Mono tone={color.paperSoft}>INSERT evt_23d1bd72</Mono>
        <Enter at={win} preset="pop">
          <Pill variant={ok ? 'green' : 'outline'} icon={ok ? 'check' : 'x'} size={28}>{ok ? 'inserted, does the work' : 'unique violation, skips'}</Pill>
        </Enter>
      </Stack>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 2" title="In a real app" />
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <div style={{width: 760, borderRadius: radius.card, background: color.card, boxShadow: shadow.card, overflow: 'hidden'}}>
            <div style={{padding: '22px 30px', borderBottom: `1px solid ${color.cardLine}`, display: 'flex', alignItems: 'center', gap: 16}}>
              <Icon name="database" size={36} color={color.ink} />
              <Mono tone={color.ink} size={type.body}>processed_events</Mono>
            </div>
            <div style={{padding: '22px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <Mono tone={color.inkSoft}>event_id</Mono>
              <Enter at={cue('unique constraint')} preset="pop">
                <Pill variant="blue" icon="key" size={26}>UNIQUE</Pill>
              </Enter>
            </div>
          </div>
        </Enter>
        <Row gap={120}>
          {worker(0, true)}
          {worker(1, false)}
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Where you record the id: before the work (a failure loses the event) or after (a crash runs it twice).
const WhenToSave: React.FC = () => {
  const cue = useCue();
  const step = (t: string, at: number, tone: 'neutral' | 'outline' | 'white' = 'neutral', icon?: React.ComponentProps<typeof Icon>['name']) => (
    <Enter at={at} preset="pop">
      <Pill variant={tone} icon={icon} size={28}>{t}</Pill>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 2" title="When do you save the id?" />
      <Center gap={50}>
        <Compare
          gap={120}
          winner={{index: 0, at: cue('losing one is better')}}
          columns={[
            {
              title: 'Save before the work',
              at: cue('save it before'),
              el: (
                <Stack gap={14}>
                  {step('Email fails', cue('sending the email fails'), 'neutral', 'x')}
                  {step('Event lost, never retried', cue('lost and never retried'), 'outline', 'x')}
                  {step('At most once', cue('lost and never retried') + 14, 'white')}
                </Stack>
              ),
            },
            {
              title: 'Save after the work',
              at: cue('if you save it after'),
              el: (
                <Stack gap={14}>
                  {step('Crash in the middle', cue('crash in the middle'), 'neutral', 'x')}
                  {step('The work runs twice', cue('runs twice'), 'outline', 'x')}
                  {step('At least once', cue('runs twice') + 14, 'white')}
                </Stack>
              ),
            },
          ]}
        />
        <Row gap={20}>
          <Enter at={cue('receipt email')} preset="pop">
            <Pill variant="green" icon="check" size={30}>Receipt email: lose one, not send two</Pill>
          </Enter>
          <Enter at={cue('anything with money')} preset="pop">
            <Pill variant="blue" icon="key" size={30}>Money: make the work safe to run twice</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// Real output with the fixed handler: the provider delivers the same event twice, one email goes out.
const FixedRun: React.FC = () => {
  const cue = useCue();
  const p = out.fixed_provider;
  const a = out.fixed_app;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 2" title="Run it again" />
      <Center gap={30}>
        <Enter at={0} preset="rise">
          <Terminal
            title="provider (DUPLICATE=1 node provider.js)"
            width={1500}
            lines={[line(p, 1, 6), line(p, 2, cue('same event twice'), color.green), line(p, 3, cue('same event twice') + 12, color.green)]}
          />
        </Enter>
        <Enter at={cue('one email goes out')} preset="rise">
          <Terminal
            title="app (node webhook.js)"
            width={1500}
            lines={[line(a, 1, cue('one email goes out'), color.green), line(a, 2, cue('second one gets skipped'), color.amber)]}
          />
        </Enter>
      </Center>
      <div style={{position: 'absolute', right: 200, bottom: 120}}>
        <Enter at={cue('respond to both')} preset="pop">
          <Pill variant="white" icon="bolt" size={30}>Both answered right away</Pill>
        </Enter>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 7. Fix three: signatures ----------

// A public URL with no login: the provider and an attacker can both POST to it.
const Attack: React.FC = () => {
  const cue = useCue();
  const fake = cue('send a fake');
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3" title="Anyone can call it" />
      <Center gap={50}>
        <Row gap={30}>
          <Stack gap={50}>
            <Enter at={cue('webhook url')} preset="rise">
              <System label="Payly" icon="server" width={320} />
            </Enter>
            <Enter at={cue('anyone who finds it')} preset="rise">
              <System label="Anyone" icon="user" width={320} tone={color.red} />
            </Enter>
          </Stack>
          <Stack gap={150}>
            <Arrow at={cue('webhook url')} width={300} />
            <Arrow at={fake} width={300} tone={color.red} label="payment.succeeded" />
          </Stack>
          <Enter at={cue('webhook url')} preset="rise">
            <Stack gap={18}>
              <System label="Your app" icon="code" light width={380} sub={<Mono tone={color.inkSoft}>POST /webhooks</Mono>} />
              <Enter at={cue('is public')} preset="pop">
                <Pill variant="neutral" icon="globe" size={28}>Public URL</Pill>
              </Enter>
              <Enter at={cue('no login')} preset="pop">
                <Pill variant="neutral" icon="lock" size={28}>No login</Pill>
              </Enter>
            </Stack>
          </Enter>
        </Row>
      </Center>
      <Bottom y={110}>
        <Enter at={cue('send a receipt')} preset="pop">
          <Pill variant="outline" icon="x" size={30}>Receipt sent, order fulfilled</Pill>
        </Enter>
        <Enter at={cue('nobody paid for')} preset="pop">
          <Pill variant="outline" icon="x" size={30}>Nobody paid</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// How the provider signs: timestamp + body, HMAC-SHA256 with the shared secret, result in a header.
const Sign: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3" title="Providers sign every request" />
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center'}}>
        <Enter at={cue('secret key')} preset="rise">
          <Row gap={20}>
            <Icon name="key" size={56} color={color.amber} />
            <Mono size={type.body}>whsec_demo_secret</Mono>
            <Label size={type.label} tone={color.paperSoft}>only you and the provider know it</Label>
          </Row>
        </Enter>
      </div>
      <Center>
        <Pipeline
          gap={70}
          items={[
            {
              at: cue('for every request'),
              w: 360,
              h: 220,
              el: (
                <Stack gap={14}>
                  <Pill variant="white" icon="clock" size={28}>timestamp</Pill>
                  <Enter at={cue('the body')} preset="pop">
                    <Pill variant="white" icon="file" size={28}>body</Pill>
                  </Enter>
                </Stack>
              ),
            },
            {at: cue('run them through'), w: 400, h: 220, el: <NodeBox label="HMAC SHA-256" sub="with the secret" icon="key" tone={color.amber} width={400} height={200} />},
            {
              at: cue('in the header'),
              w: 520,
              h: 220,
              el: (
                <div style={{padding: '24px 28px', borderRadius: radius.card, background: color.code, border: `1px solid ${color.tileLine}`}}>
                  <Mono tone={color.paperSoft} size={type.label}>payly-signature:</Mono>
                  <br />
                  <Mono tone={color.green} size={type.label}>t=1761300000,v1=9f2c…</Mono>
                </div>
              ),
            },
          ]}
        />
      </Center>
      <Bottom y={110}>
        <Enter at={cue('hmac is basically')} preset="pop">
          <Pill variant="neutral" icon="lock" size={30}>A hash you can only make if you know the secret</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

const Verify: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3 · webhook.js" title="Check it on our side" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow
            file={`${CODE}/webhook.js`}
            lines={[11, 20]}
            size={28}
            maxWidth={1680}
            steps={[
              {at: cue('exact same calculation'), lines: [17, 17]},
              {at: cue('compare the two'), lines: [18, 19]},
            ]}
          />
        </Enter>
        <Row gap={20}>
          <Enter at={cue('came from the provider')} preset="pop">
            <Pill variant="green" icon="check" size={30}>Really from the provider</Pill>
          </Enter>
          <Enter at={cue('nobody changed the body')} preset="pop">
            <Pill variant="green" icon="check" size={30}>Body not changed on the way</Pill>
          </Enter>
        </Row>
      </Center>
    </AbsoluteFill>
  );
};

// A captured real request, replayed later: the signed timestamp is too old, so it's rejected.
const Replay: React.FC = () => {
  const cue = useCue();
  const req = (label: string, time: string, at: number, bad: boolean) => (
    <Enter at={at} preset="rise">
      <Stack gap={14}>
        <Label size={type.label} tone={color.paperSoft}>{label}</Label>
        <div style={{width: 460, padding: '24px 28px', borderRadius: radius.card, background: color.code, border: `2px solid ${bad ? color.red : color.tileLine}`, boxSizing: 'border-box'}}>
          <Mono tone={color.paperSoft} size={type.label}>t={time}</Mono>
          <br />
          <Mono size={type.label}>payment.succeeded</Mono>
        </div>
      </Stack>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3" title="Replay attacks" />
      <Center gap={50}>
        <Row gap={50}>
          {req('The real request', '10:00', cue('one real request'), false)}
          <Arrow at={cue('sends it again')} width={200} tone={color.red} label="copy" />
          {req('Sent again, hours later', '10:00', cue('sends it again'), true)}
        </Row>
        <Enter at={cue('part of the signature')} preset="rise">
          <CodeWindow file={`${CODE}/webhook.js`} lines={[13, 15]} size={28} maxWidth={1680} steps={[{at: cue('older than five minutes'), lines: [15, 15]}]} />
        </Enter>
      </Center>
      <Bottom y={110}>
        <Enter at={cue("can't change it")} preset="pop">
          <Pill variant="white" icon="lock" size={30}>The timestamp is signed, so it can't be changed</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// A normal compare stops at the first wrong character (so "almost right" takes longer);
// timingSafeEqual always checks every character.
const TimingCompare: React.FC = () => {
  const cue = useCue();
  const frame = useCurrentFrame();
  const real = '9f2c41ab';
  const guesses = [
    {g: '0d77e1c3', label: 'wrong guess', at: cue('stops at the first')},
    {g: '9f2c40e5', label: 'almost right', at: cue('almost right')},
  ];
  const safeAt = cue('always takes the same');
  const row = (g: string, label: string, at: number, safe: boolean) => {
    const stop = safe ? real.length : [...g].findIndex((c, i) => c !== real[i]) + 1;
    const n = Math.max(0, Math.min(stop, Math.floor((frame - at) / 5)));
    return (
      <Enter key={label + safe} at={at} preset="rise">
        <Row gap={30}>
          <div style={{width: 230, textAlign: 'right'}}>
            <Label size={type.label} tone={color.paperSoft}>{label}</Label>
          </div>
          <div style={{display: 'flex', gap: 6}}>
            {[...g].map((c, i) => (
              <div key={i} style={{width: 52, height: 64, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.mono, fontSize: type.body, background: i < n ? (c === real[i] ? color.green : color.red) : color.tile, color: color.paper}}>{c}</div>
            ))}
          </div>
          <div style={{width: 300, height: 18, borderRadius: radius.pill, background: color.tile, overflow: 'hidden'}}>
            <div style={{width: `${(n / real.length) * 100}%`, height: '100%', background: safe ? color.blue : color.amber}} />
          </div>
        </Row>
      </Enter>
    );
  };
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3 · webhook.js" title="timingSafeEqual" />
      <Center gap={40}>
        <Enter at={0} preset="rise">
          <CodeWindow file={`${CODE}/webhook.js`} lines={[18, 19]} size={28} maxWidth={1680} steps={[{at: cue('timingsafeequal'), lines: [19, 19]}]} />
        </Enter>
        <Row gap={30}>
          <div style={{width: 230, textAlign: 'right'}}>
            <Label size={type.label} tone={color.paperSoft}>real signature</Label>
          </div>
          <Mono size={type.body}>{real.split('').join('  ')}</Mono>
          <div style={{width: 300}} />
        </Row>
        {guesses.map((x) => row(x.g, x.label, x.at, false))}
        {frame >= safeAt ? row(guesses[1].g, 'timingSafeEqual', safeAt, true) : <div style={{height: 64}} />}
      </Center>
      <Bottom y={100}>
        <Enter at={cue('attacker can measure')} preset="pop">
          <Pill variant="outline" icon="clock" size={30}>The time difference leaks the signature</Pill>
        </Enter>
      </Bottom>
    </AbsoluteFill>
  );
};

// The raw body vs the same JSON parsed and re-serialized: different bytes, so a different HMAC.
const RawBody: React.FC = () => {
  const cue = useCue();
  const body = (title: string, text: string, hash: string, at: number, bad: boolean) => (
    <Enter at={at} preset="rise">
      <Stack gap={14}>
        <Label size={type.label} tone={color.paperSoft}>{title}</Label>
        <div style={{width: 1100, padding: '24px 28px', borderRadius: radius.card, background: color.code, border: `1px solid ${color.tileLine}`, boxSizing: 'border-box', whiteSpace: 'pre'}}>
          <Mono size={type.label}>{text}</Mono>
        </div>
        <Row gap={12}>
          <Mono tone={color.paperSoft} size={type.label}>HMAC →</Mono>
          <Mono tone={bad ? color.red : color.green} size={type.label}>{hash}</Mono>
          <Icon name={bad ? 'x' : 'check'} size={32} color={bad ? color.red : color.green} />
        </Row>
      </Stack>
    </Enter>
  );
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3" title="Check the raw body" />
      <Center gap={40}>
        {body('Raw body, as it arrived', '{"id":"evt_23d1bd72","type":"payment.succeeded"}', '9f2c41ab…', 0, false)}
        {body('Parsed, then stringified again', '{ "type": "payment.succeeded", "id": "evt_23d1bd72" }', '51e07d9c…', cue('turn it back'), true)}
        <Enter at={cue('in express')} preset="rise">
          <Row gap={24}>
            <Logo name="express" size={70} />
            <Pill variant="white" icon="code" size={30}>Use the raw body parser on the webhook route</Pill>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

const Forged: React.FC = () => {
  const cue = useCue();
  const at = 4;
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Fix 3" title="A forged request" />
      <Center gap={30}>
        <Enter at={0} preset="rise">
          <Terminal
            width={1660}
            cps={70}
            lines={[
              {at, cmd: `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/webhooks -H 'payly-signature: t=1,v1=abc' -d '{"id":"evt_fake",...}'`},
              {at: cue('400'), out: out.forged_curl, tone: color.red},
            ]}
          />
        </Enter>
        <Enter at={cue('nothing runs')} preset="rise">
          <Terminal title="app (node webhook.js)" width={1660} lines={[line(out.fixed_app, 3, cue('nothing runs'), color.red)]} />
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 8. Polling still has a job ----------

const StillUseful: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={60}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Polling isn't <Accent>useless</Accent>
          </Headline>
        </Enter>
        <Row gap={30}>
          <Enter at={cue("don't offer webhooks")} preset="pop">
            <System label="No webhooks" icon="x" sub="some APIs don't offer them" width={420} />
          </Enter>
          <Enter at={cue('behind a firewall')} preset="pop">
            <System label="Behind a firewall" icon="lock" sub="no requests from outside" width={420} />
          </Enter>
        </Row>
        <Enter at={cue('your only choice')} preset="pop">
          <Pill variant="white" icon="arrowRight" size={32}>Polling is your only choice</Pill>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// Webhooks as the real-time path, plus a scheduled job that polls and catches what got lost.
const Reconcile: React.FC = () => {
  const cue = useCue();
  const lostAt = cue('can still get lost');
  const lost = useTween(lostAt, lostAt + 16);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Use both" title="Reconciliation" />
      <Center gap={40}>
        <Row gap={30}>
          <Enter at={0} preset="rise">
            <System label="Provider" icon="server" width={320} />
          </Enter>
          <Stack gap={60}>
            <div style={{position: 'relative'}}>
              <Arrow at={0} width={420} label="webhooks (real time)" />
              <div style={{position: 'absolute', left: 170, top: 40, opacity: lost, transform: `translateY(${lost * 60}px)`}}>
                <div style={{width: 54, height: 54, borderRadius: 99, background: color.red, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="x" size={30} color={color.paper} />
                </div>
              </div>
            </div>
            <Arrow at={cue('scheduled job')} width={420} dir="left" label="scheduled job polls the API" tone={color.green} dashed />
          </Stack>
          <Enter at={0} preset="rise">
            <System label="Your app" icon="code" light width={320} />
          </Enter>
        </Row>
        <Row gap={20}>
          <Enter at={cue('server was down')} preset="pop">
            <Pill variant="outline" icon="x" size={30}>Down for hours, provider gave up</Pill>
          </Enter>
          <Enter at={cue('anything that was missed')} preset="pop">
            <Pill variant="green" icon="check" size={30}>Catches anything missed</Pill>
          </Enter>
        </Row>
        <Enter at={cue('reconciliation')} preset="pop">
          <Headline size={type.title}>
            That's <Accent>reconciliation</Accent>
          </Headline>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 9. Testing locally ----------

const Tunnel: React.FC = () => {
  const cue = useCue();
  const tunnelAt = cue('use a tunnel');
  const t = useTween(tunnelAt, tunnelAt + 14);
  return (
    <AbsoluteFill>
      <SectionTag eyebrow="Testing locally" title="Use a tunnel" />
      <Center gap={60}>
        <Row gap={30}>
          <Enter at={0} preset="rise">
            <System label="Provider" icon="globe" sub="on the internet" width={330} />
          </Enter>
          {t < 0.5 ? (
            <div style={{position: 'relative'}}>
              <Arrow at={0} width={460} tone={color.red} />
              <Enter at={cue("can't reach")} preset="pop">
                <div style={{position: 'absolute', left: 205, top: 18, width: 54, height: 54, borderRadius: 99, background: color.red, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="x" size={30} color={color.paper} />
                </div>
              </Enter>
            </div>
          ) : (
            <Row gap={16}>
              <Arrow at={tunnelAt} width={140} />
              <Enter at={cue('ngrok')} preset="pop">
                <Stack gap={10}>
                  <Logo name="ngrok" size={110} />
                  <Mono tone={color.paperSoft} size={type.label}>public URL</Mono>
                </Stack>
              </Enter>
              <Arrow at={cue('forwards the requests')} width={140} />
            </Row>
          )}
          <Enter at={0} preset="rise">
            <System label="Your laptop" icon="code" light width={330} sub={<Mono tone={color.inkSoft}>localhost:3000</Mono>} />
          </Enter>
        </Row>
        <Enter at={cue('their own cli')} preset="rise">
          <Row gap={20}>
            <Logo name="stripe" size={64} />
            <div style={{padding: '18px 26px', borderRadius: radius.card, background: color.code, border: `1px solid ${color.tileLine}`}}>
              <Mono size={type.body}>stripe listen</Mono>
            </div>
            <Label size={type.label} tone={color.paperSoft}>forwards events to your local server</Label>
          </Row>
        </Enter>
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 10. Recap ----------

const RecapPolling: React.FC = () => {
  const cue = useCue();
  return (
    <AbsoluteFill>
      <Center gap={60}>
        <Compare
          gap={140}
          columns={[
            {
              title: 'Polling',
              at: 0,
              el: (
                <Stack gap={14}>
                  <Pill variant="neutral" size={30}>Speed vs wasted requests</Pill>
                  <Enter at={cue('as a fallback')} preset="pop">
                    <Pill variant="white" icon="check" size={30}>Still useful as a fallback</Pill>
                  </Enter>
                </Stack>
              ),
            },
            {
              title: 'Webhooks',
              at: cue('use webhooks'),
              tone: color.blue,
              el: <Pill variant="blue" icon="bolt" size={30}>For events</Pill>,
            },
          ]}
        />
      </Center>
    </AbsoluteFill>
  );
};

const Checklist: React.FC = () => {
  const cue = useCue();
  const items = [
    {n: 1, t: 'Respond fast, work in the background', at: cue('respond fast')},
    {n: 2, t: "Skip events you've already handled", at: cue('skip events')},
    {n: 3, t: 'Verify the signature on the raw body', at: cue('verify the signature')},
  ];
  return (
    <AbsoluteFill>
      <FocusShade />
      <Center gap={50}>
        <Enter at={0} preset="rise">
          <Headline size={type.title}>
            Delivered at least <Accent>once</Accent>
          </Headline>
        </Enter>
        <Stack gap={20}>
          {items.map((x) => (
            <Enter key={x.n} at={x.at} preset="rise">
              <div style={{width: 1000, display: 'flex', alignItems: 'center', gap: 28, padding: '26px 36px', borderRadius: radius.card, background: color.card, boxShadow: shadow.card, boxSizing: 'border-box'}}>
                <div style={{width: 56, height: 56, borderRadius: 99, background: color.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font.sans, fontWeight: weight.medium, fontSize: type.body, color: color.paper}}>{x.n}</div>
                <div style={{fontFamily: font.sans, fontSize: type.body, color: color.ink}}>{x.t}</div>
              </div>
            </Enter>
          ))}
        </Stack>
      </Center>
    </AbsoluteFill>
  );
};

export const WebhooksVideo: React.FC = () => (
  <TranscriptProvider transcript={transcript}>
    <Stage />
    <Audio src={staticFile('audio/webhooks-voice.wav')} />
    <Track>
      <Scene from="when your app depends"><Hook /></Scene>
      <Scene from="your app can either poll"><TwoWays /></Scene>
      <Scene from="polling is simple but wasteful"><Plan /></Scene>
      <Scene from="for the demo"><Setup /></Scene>
      <Scene from="it has two endpoints"><Endpoints /></Scene>
      <Scene from="polling is just a loop"><PollCode /></Scene>
      <Scene from="if i run it"><PollRun /></Scene>
      <Scene from="and this is the real problem"><Interval /></Scene>
      <Scene from="a webhook flips"><Flip /></Scene>
      <Scene from="so this is the webhook handler"><NaiveCode /></Scene>
      <Scene from="the receipt part stands"><Work /></Scene>
      <Scene from="so i create a payment"><NaiveRun /></Scene>
      <Scene from="so what happened"><RetryTimeline /></Scene>
      <Scene from="and this is the important idea"><AtLeastOnce /></Scene>
      <Scene from="the first fix is"><FixOne /></Scene>
      <Scene from="then a background worker"><Worker /></Scene>
      <Scene from="to keep the demo short"><QueueCaveat /></Scene>
      <Scene from="even when you respond fast"><Duplicates /></Scene>
      <Scene from="the fix here is"><Idempotent /></Scene>
      <Scene from="every event has a unique"><Dedupe /></Scene>
      <Scene from="in a real world app"><Unique /></Scene>
      <Scene from="one thing to think about"><WhenToSave /></Scene>
      <Scene from="and if we run it again"><FixedRun /></Scene>
      <Scene from="now the last fix"><Attack /></Scene>
      <Scene from="that's why providers sign"><Sign /></Scene>
      <Scene from="now on our side"><Verify /></Scene>
      <Scene from="the timestamp is there"><Replay /></Scene>
      <Scene from="and we compare using"><TimingCompare /></Scene>
      <Scene from="one mistake a lot"><RawBody /></Scene>
      <Scene from="so if i send a fake"><Forged /></Scene>
      <Scene from="now that doesn't mean polling"><StillUseful /></Scene>
      <Scene from="and even with webhooks"><Reconcile /></Scene>
      <Scene from="one practical tip"><Tunnel /></Scene>
      <Scene from="so polling is simple"><RecapPolling /></Scene>
      <Scene from="and remember they are delivered"><Checklist /></Scene>
    </Track>
  </TranscriptProvider>
);
