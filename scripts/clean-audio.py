# Cuts bad takes out of a recording and shortens long pauses, using ffmpeg.
# usage: python scripts/clean-audio.py <in audio> <cuts.json> <out.wav>
# cuts.json: {"start": s, "end": s, "cuts": [[from, to], ...], "maxPause": 0.6, "keepPause": 0.4}
# Silences come from ffmpeg's silencedetect; any silence longer than maxPause is shortened to keepPause.
import json
import re
import subprocess
import sys

src, cuts_file, out = sys.argv[1:4]
cfg = json.load(open(cuts_file))

# 1. Find silences.
log = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", src, "-af", "silencedetect=noise=-38dB:d=0.25", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]

# 2. Everything to remove: the bad takes, plus the middle of each long pause.
remove = [tuple(c) for c in cfg["cuts"]]
for s, e in zip(starts, ends):
    if e - s > cfg["maxPause"]:
        trim = (e - s - cfg["keepPause"]) / 2
        remove.append((s + trim, e - trim))

# 3. Merge overlapping removals, then keep what's left between start and end.
remove.sort()
merged = []
for a, b in remove:
    if merged and a <= merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], b))
    else:
        merged.append((a, b))
keep, t = [], cfg["start"]
for a, b in merged:
    if b <= t or a >= cfg["end"]:
        continue
    if a > t:
        keep.append((t, a))
    t = max(t, b)
if t < cfg["end"]:
    keep.append((t, cfg["end"]))

# 4. Stitch the kept pieces with 8 ms fades so the joins don't click.
parts = []
for i, (a, b) in enumerate(keep):
    d = b - a
    parts.append(
        f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,"
        f"afade=t=in:d=0.008,afade=t=out:st={max(0, d - 0.008):.3f}:d=0.008[p{i}]"
    )
graph = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1[out]"
subprocess.run(
    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-filter_complex", graph,
     "-map", "[out]", "-ac", "1", "-ar", "48000", out],
    check=True,
)
total = sum(b - a for a, b in keep)
print(f"{len(keep)} pieces, {total:.1f}s kept (was {cfg['end'] - cfg['start']:.1f}s)")
