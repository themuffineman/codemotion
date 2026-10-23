# Removes dead air, "um"s and "ah"s by using the transcript instead of loudness.
# usage: python scripts/tighten-audio.py <in audio> <transcript.json> <out.wav> [maxGap=0.3] [keepGap=0.22]
# Anything between two transcribed words is a pause, a filler or a breath (Gladia and Whisper leave fillers out),
# so every gap longer than maxGap is shortened to keepGap, however loud it is.
# Run it after clean-audio.py (retakes cut), then re-transcribe the result.
import json
import subprocess
import sys

src, words_file, out = sys.argv[1:4]
max_gap = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3
keep_gap = float(sys.argv[5]) if len(sys.argv) > 5 else 0.22
PAD = 0.06  # keep a little audio around each word so word endings aren't clipped

words = json.load(open(words_file, encoding="utf-8"))["words"]

# 1. Spans of speech: each word plus padding, merged when they touch.
spans = []
for w in words:
    a, b = max(0, w["start"] - PAD), w["end"] + PAD
    if spans and a <= spans[-1][1] + max_gap:
        spans[-1][1] = max(spans[-1][1], b)
    else:
        spans.append([a, b])

# 2. Keep each span, and between spans keep only keepGap of the gap (taken from its middle, as silence).
parts = []
for i, (a, b) in enumerate(spans):
    d = b - a
    parts.append(
        f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:d=0.01,afade=t=out:st={max(0, d - 0.01):.3f}:d=0.01[p{i}]"
    )
    if i < len(spans) - 1:
        parts.append(f"anullsrc=r=48000:cl=mono,atrim=0:{keep_gap:.3f}[g{i}]")
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
