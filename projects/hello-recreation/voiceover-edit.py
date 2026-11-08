# Voiceover edit: keep chosen word ranges (last clean take of each line), cut at the real edges of the sound,
# shorten silences only where the audio is truly silent. usage: python edit.py
import json, wave, numpy as np
W = json.load(open('work/hello/raw.json'))['words']
w = wave.open('work/hello/raw.wav'); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
HOP = 0.01; h = int(sr * HOP); n = len(x) // h
db = 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
SIL = -58.0
silent = lambda t: db[min(n - 1, max(0, int(t / HOP)))] < SIL

# Each entry keeps words [first, last] (indexes into raw.json). join='tight' glues it to the previous piece
# without a sentence pause. An optional (start, end) in seconds overrides the edges where a hidden retake sits
# inside a stretched word; every override was checked by transcribing that piece on its own.
KEEP = [
    (0, 19, ''),
    (20, 35, ''),
    (36, 52, ''),
    (53, 63, '', (30.61, None)),     # skip "so here are four things that actually..."
    (123, 132, ''),
    (146, 155, ''),
    (156, 160, ''),
    (168, 174, ''),                  # second "So the whole video is a palindrome"
    (175, 183, ''),
    (193, 201, ''),                  # second "so I only had to build half of it"
    (214, 231, ''),
    (273, 312, ''),
    (326, 331, ''),
    (341, 350, ''),
    (351, 358, ''),
    (368, 376, ''),                  # "peaks right as it finishes", not the wrong "peaks while..."
    (377, 387, ''),
    (388, 400, ''),
    (401, 424, ''),
    (425, 442, ''),
    (443, 469, ''),
    (472, 484, '', (232.35, None)),  # last of three "Now the hardest part about..." takes
    (485, 492, '', (None, 239.44)),  # "It's barely half a second, so"
    (492, 492, "tight", (240.63, None)),  # "pretty intense": the burst holds "pretty | pretty intense", keep the second
    (500, 510, ''),
    (511, 514, ''),
    (544, 556, ''),
    (557, 560, ''),
    (577, 592, ''),
    (622, 646, ''),
    (696, 715, ''),                  # "...when recreating this effect" (712 is "re-", keep it)
    (716, 733, ''),
    (734, 744, ''),
    (745, 763, ''),
    # "FYI, I used the 3D package from Remotion" (776-783) is left out at the user's request
    (784, 789, '', (None, 399.90)),  # "and the last lesson here was", before "um"
    (800, 812, 'tight'),
    (815, 825, ''),
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
o = wave.open('work/hello/clean.wav', 'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr)
o.writeframes((y * 32767).astype(np.int16).tobytes()); o.close()
json.dump([[a, b] for a, b in RANGES], open('work/hello/ranges.json', 'w'))
json.dump(tmap, open('work/hello/timemap.json', 'w'))
print('\n'.join(log)); print(f'raw 421.3s -> {len(y) / sr:.1f}s')
