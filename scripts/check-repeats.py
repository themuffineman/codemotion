# Finds retakes left in edited audio. Transcribing a whole file hides them: Gladia merges a repeated phrase into one
# long "word". So this splits the audio at pauses, transcribes each short piece separately, and flags repeated phrases.
# usage: python scripts/check-repeats.py <audio> [chunkSeconds=8]
# Read every printed line as well as the flags: a stray "do that" (from "let me redo that") repeats nothing.
import json
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

audio = sys.argv[1]
every = float(sys.argv[2]) if len(sys.argv) > 2 else 8

log = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", audio, "-af", "volumedetect,silencedetect=noise=-38dB:d=0.15", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
# The silence threshold follows the recording's level, so boosted audio still splits at its pauses.
peak = float(re.search(r"max_volume: (-?[\d.]+)", log).group(1))
log = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", audio, "-af", f"silencedetect=noise={peak - 25:.1f}dB:d=0.15", "-f", "null", "-"],
    capture_output=True, text=True,
).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
length = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]))
points = [0.0]
for mid in [(a + b) / 2 for a, b in zip(starts, ends)]:
    if mid - points[-1] >= every:
        points.append(mid)
points.append(length)

tmp = Path(tempfile.mkdtemp())
script = str(Path(__file__).with_name("transcribe-gladia.py"))


def transcribe(i):
    clip, out = tmp / f"{i:03d}.wav", tmp / f"{i:03d}.json"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{points[i]:.3f}", "-to", f"{points[i + 1]:.3f}", "-i", audio, "-ac", "1", str(clip)], check=True)
    subprocess.run([sys.executable, script, str(clip), str(out)], capture_output=True, check=True)
    return json.load(open(out, encoding="utf-8"))["words"]


with ThreadPoolExecutor(10) as pool:
    pieces = list(pool.map(transcribe, range(len(points) - 1)))

words = []
for at, piece in zip(points, pieces):
    print(f"[{at:7.2f}] " + " ".join(w["text"] for w in piece))
    words += [(re.sub(r"[^a-z0-9']", "", w["text"].lower()), at + w["start"]) for w in piece]

# Flag any 3 words said again within 25 s.
print("\nPossible repeats:")
seen, found = {}, False
for i in range(len(words) - 2):
    key = " ".join(w for w, _ in words[i:i + 3])
    t = words[i][1]
    if key in seen and t - seen[key] < 25:
        print(f"  {seen[key]:7.2f} and {t:7.2f}: {key}")
        found = True
    seen[key] = t
if not found:
    print("  none")
