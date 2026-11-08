# Voiceover edit: keep chosen word ranges (last clean take of each line), cut at the real edges of the sound,
# shorten silences only where the audio is truly silent. usage: python edit.py
import json, wave, numpy as np
W = json.load(open('work/hello2/raw.json'))['words']
w = wave.open('work/hello2/raw.wav'); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
HOP = 0.01; h = int(sr * HOP); n = len(x) // h
db = 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
SIL = -58.0
silent = lambda t: db[min(n - 1, max(0, int(t / HOP)))] < SIL

# Each entry keeps words [first, last] (indexes into raw.json). join='tight' glues it to the previous piece
# without a sentence pause. An optional (start, end) in seconds overrides the edges where a hidden retake sits
# inside a stretched word; every override was checked by transcribing that piece on its own.
KEEP = [
    (0, 25, ''),      # "okay this is the famous Apple hello ... into the actual Apple logo"
    (26, 35, ''),     # "and this is my version, I built it with Remotion"
    (36, 68, ''),     # "now this animation is a lot harder ... to actually make it work"
    (69, 86, ''),     # "so the first thing that I did was I pulled out all the 295 frames and compared them"
    (111, 125, ''),   # last take: "I found out that frame 40 matches frame 252 and frame 120 matches frame 172"
    (126, 135, ''),   # "so the whole thing is a palindrome, the whole video"
    (143, 151, ''),   # last take: "it plays forward then the same frames play backwards"
    (185, 195, ''),   # last take: "so this meant I only had to build half of it"
    (196, 214, ''),   # "okay so the next thing I did was I colored every pixel by the frame it first lights up"
    (219, 224, ''),   # "that shows it's one continuous stroke" (after a cut-off "and that's")
    (225, 239, ''),   # "it's slow through the h and then almost thrown across the rest of the word"
    (240, 244, ''),   # "and the glow isn't constant"
    (258, 267, ''),   # last take: "I measured the light around the word on every frame"
    (287, 308, ''),   # last take: "I found out that it swells ... then settles down"
    (340, 351, ''),   # last take: "and my first version completely missed that, so it looked really flat"
    (399, 409, ''),   # last take: "but once I copied that curve, it started to look better"
    (448, 459, ''),   # last take: "so my first version was a flat 2D and you could tell"
    (464, 477, ''),   # "the tube ends were cut off and the glass didn't really catch the light"
    (487, 494, ''),   # last take: "in the original the ends were round caps"
    (512, 521, 'tight'),  # last take: "and you could see the light wrap around the tube"
    (522, 538, ''),   # "so I rebuilt it as a real 3D tube with round glass ends and a proper perspective"
    (547, 553, ''),   # last take: "that's what made it look like glass"
    (554, 567, ''),   # "but the hardest part about all this was turning that hello into the logo"
    (575, 586, ''),   # last start: "and in the original video it's there for barely half a second"
    (587, 597, ''),   # "my guess was that the whole word spins like a sign"
    (598, 601, ''),   # "so I tested it"
    (602, 614, ''),   # "I gave every point a depth and tried to fit one single rotation"
    (615, 619, ''),   # "and it didn't really fit"
    (620, 635, ''),   # "and when we tracked the letters, the l's stay still while the h is already moving"
    (636, 660, ''),   # "so each letter turns on its own ... right as the logo turns in"
    (676, 684, ''),   # last take: "so that's how I was able to do that"
    (689, 700, '', (344.80, None)),  # "this video is a bit shorter...", starting in the dip after "take"
    (701, 718, 'tight'),  # "just wanted to kind of explain the high level stuff that I did to get it to work"
    (719, 734, ''),   # "all right, that's all I have for you, I'll see you in the next one, ciao"
]

def silent_runs(a, b, min_len):
    """Silent stretches of at least min_len seconds inside [a, b]."""
    out, k, k1 = [], int(a / HOP), int(b / HOP)
    while k < k1:
        if db[k] < SIL:
            j = k
            while j < k1 and db[j] < SIL: j += 1
            if (j - k) * HOP >= min_len: out.append((k * HOP, j * HOP))
            k = j
        else: k += 1
    return out

def quietest(a, b):
    i0, i1 = int(a / HOP), max(int(a / HOP) + 1, int(b / HOP))
    return (i0 + int(np.argmin(db[i0:i1]))) * HOP

def onset(i):
    """Where word i's sound starts. Whisper often stretches a word back over the pause before it, so use the
    last real silence before the end of the word, not its timestamp."""
    lo = W[i - 1]['end'] - 0.15 if i > 0 else 0
    runs = [r for r in silent_runs(lo, W[i]['end'] - 0.06, 0.05) if r[1] > lo + 0.01]
    if runs: return max(lo, runs[-1][1] - 0.03)
    return quietest(max(0, W[i]['start'] - 0.12), W[i]['start'] + 0.06)

def offset(i):
    """Where word i's sound ends: the first real silence after it starts (a stretched word hides a pause)."""
    hi = W[i + 1]['end'] if i + 1 < len(W) else n * HOP
    runs = silent_runs(W[i]['start'] + 0.12, hi, 0.08)
    if runs: return min(runs[0][0] + 0.05, runs[0][1])
    return quietest(W[i]['end'] - 0.06, W[i]['end'] + 0.12)

def shorten_pauses(a, b, maxp=0.42, keep=0.3):
    """Split [a, b] into pieces, shortening silent runs longer than maxp to keep."""
    i0, i1 = int(a / HOP), int(b / HOP)
    pieces, s, k = [], a, i0
    while k < i1:
        if db[k] < SIL:
            j = k
            while j < i1 and db[j] < SIL: j += 1
            if (j - k) * HOP > maxp:
                mid1 = k * HOP + keep / 2; mid2 = j * HOP - keep / 2
                pieces.append((s, mid1)); s = mid2
            k = j
        else: k += 1
    pieces.append((s, b)); return pieces

SENT_GAP, TIGHT_GAP, FADE = 0.3, 0.03, int(sr * 0.006)
out, log, tmap, RANGES = [], [], [], []
pos = 0.0
for item in KEEP:
    first, last, join = item[:3]
    over = item[3] if len(item) > 3 else (None, None)
    a = over[0] if over[0] is not None else onset(first)
    b = over[1] if over[1] is not None else offset(last)
    gap = TIGHT_GAP if join == 'tight' else SENT_GAP
    if out:
        out.append(np.zeros(int(sr * gap), np.float32)); pos += gap
    if b - a < 0.1: print('EMPTY RANGE', first, last, a, b)
    RANGES.append((a, b))
    for (p, q) in shorten_pauses(a, b):
        if q - p < 0.03: continue
        seg = x[int(p * sr):int(q * sr)].copy()
        seg[:FADE] *= np.linspace(0, 1, FADE); seg[-FADE:] *= np.linspace(1, 0, FADE)
        tmap.append((round(pos, 3), round(p, 3), round(q, 3))); out.append(seg); pos += len(seg) / sr
    bad = [t for t in (a, b) if not silent(t)]
    if bad: print('BOUNDARY IN SOUND', first, last, bad)
    log.append(f"{a:7.2f}-{b:7.2f}  {' '.join(t['text'] for t in W[first:last + 1])}")
y = np.concatenate(out)
peak = np.abs(y).max(); y = y / peak * 0.89 if peak > 0 else y  # normalise to about -1 dBFS
o = wave.open('work/hello2/clean.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr)
o.writeframes((y * 32767).astype(np.int16).tobytes()); o.close()
json.dump([[a, b] for a, b in RANGES], open('work/hello2/ranges.json', 'w'))
json.dump(tmap, open('work/hello2/timemap.json', 'w'))
print('\n'.join(log)); print(f'raw 421.3s -> {len(y) / sr:.1f}s')
