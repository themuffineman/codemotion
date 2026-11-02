# Removes dead air, "um"s and "ah"s by using the transcript instead of loudness.
# usage: python scripts/tighten-audio.py <in audio> <transcript.json> <out.wav> [maxGap=0.45] [keepGap=0.3]
# Anything between two transcribed words is a pause, a filler or a breath (Gladia and Whisper leave fillers out),
# so every gap longer than maxGap is shortened to keepGap, however loud it is.
# Run it after clean-audio.py (retakes cut), then re-transcribe the result.
import json
import re
import subprocess
import sys

src, words_file, out = sys.argv[1:4]
max_gap = float(sys.argv[4]) if len(sys.argv) > 4 else 0.45
keep_gap = float(sys.argv[5]) if len(sys.argv) > 5 else 0.3
PAD = 0.14  # transcript word times run tight, so keep enough around each word that its start and tail aren't clipped
FADE = 0.03  # long enough that a join is heard as a pause, not a click

words = json.load(open(words_file, encoding="utf-8"))["words"]

# Transcribers often stamp a spoken number late (they align the digits, not the words "four point one"),
# which makes the start of the number look like a pause. Start it where the previous word ended.
for prev, w in zip(words, words[1:]):
    if re.match(r"^\$?\d", w["text"]) and w["start"] - prev["end"] > 0.2:
        w["start"] = prev["end"]

# 1. Spans of speech: each word plus padding, merged when they touch.
spans = []
for w in words:
    a, b = max(0, w["start"] - PAD), w["end"] + PAD
    if spans and a <= spans[-1][1] + max_gap:
        spans[-1][1] = max(spans[-1][1], b)
    else:
        spans.append([a, b])

# 2. Between spans, play the room's own quiet instead of digital silence, which is heard as the audio dropping out.
log = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", src, "-af", f"silencedetect=noise=-38dB:d={keep_gap + 0.1:.2f}", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
quiet = list(zip([float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)], [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]))
room = max(quiet, key=lambda s: s[1] - s[0])[0] + 0.05 if quiet else None

parts = []
for i, (a, b) in enumerate(spans):
    d = b - a
    parts.append(
        f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:d={FADE},afade=t=out:st={max(0, d - FADE):.3f}:d={FADE}[p{i}]"
    )
    if i < len(spans) - 1:
        gap = (
            f"[0:a]atrim={room:.3f}:{room + keep_gap:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:d={FADE},afade=t=out:st={keep_gap - FADE:.3f}:d={FADE}"
            if room is not None
            else f"anullsrc=r=48000:cl=mono,atrim=0:{keep_gap:.3f}"
        )
        parts.append(f"{gap}[g{i}]")
labels = "".join(f"[p{i}]" + (f"[g{i}]" if i < len(spans) - 1 else "") for i in range(len(spans)))
n = len(spans) * 2 - 1
graph = ";".join(parts) + ";" + labels + f"concat=n={n}:v=0:a=1[out]"
# The filter graph is long, so pass it through a file.
with open(out + ".filter.txt", "w") as f:
    f.write(graph)
subprocess.run(
    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-filter_complex_script", out + ".filter.txt",
     "-map", "[out]", "-ac", "1", "-ar", "48000", out],
    check=True,
)
before = words[-1]["end"] - words[0]["start"]
after = sum(b - a for a, b in spans) + keep_gap * (len(spans) - 1)
print(f"{len(spans)} speech spans, {after:.1f}s (was {before:.1f}s)")
