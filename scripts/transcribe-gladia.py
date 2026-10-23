# Transcribes a recording with Gladia into the word-timed transcript the videos use.
# usage: python scripts/transcribe-gladia.py <audio> <out.json>
# Needs GLADIA_API_KEY in the environment or in codemotion/.env.
# Send mono audio: stereo is billed twice and every utterance comes back twice.
# Writes {words: [{text, start, end}]} and prints each utterance with its times, for spotting bad takes.
import json
import mimetypes
import os
import sys
import time
from pathlib import Path

import requests

BASE = "https://api.gladia.io/v2"
audio, out = Path(sys.argv[1]), sys.argv[2]


# Reads the API key from the environment, or from the .env file next to scripts/.
def api_key():
    if os.environ.get("GLADIA_API_KEY"):
        return os.environ["GLADIA_API_KEY"]
    env = Path(__file__).resolve().parent.parent / ".env"
    for line in env.read_text().splitlines():
        if line.startswith("GLADIA_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("GLADIA_API_KEY not set")


headers = {"x-gladia-key": api_key()}

# 1. Upload the file, 2. start the transcription, 3. poll until it's done.
mime = mimetypes.guess_type(audio.name)[0] or "audio/wav"
with open(audio, "rb") as f:
    up = requests.post(f"{BASE}/upload", headers=headers, files={"audio": (audio.name, f, mime)}, timeout=300)
if not up.ok:
    sys.exit(f"Upload failed ({up.status_code}): {up.text[:500]}")
job = requests.post(
    f"{BASE}/pre-recorded",
    headers=headers,
    json={"audio_url": up.json()["audio_url"], "language_config": {"languages": ["en"], "code_switching": False}},
    timeout=60,
)
job.raise_for_status()
result_url = job.json()["result_url"]
while True:
    res = requests.get(result_url, headers=headers, timeout=60).json()
    if res["status"] == "done":
        break
    if res["status"] == "error":
        sys.exit(f"Gladia failed: {res.get('error_code')}")
    time.sleep(3)

words = []
for u in res["result"]["transcription"]["utterances"]:
    print(f"[{u['start']:7.2f} - {u['end']:7.2f}] {u['text'].strip()}")
    for w in u["words"]:
        words.append({"text": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)})

Path(out).write_text(json.dumps({"words": words}, indent=1), encoding="utf-8")
Path(out).with_suffix(".gladia.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
print(f"{len(words)} words, {res['result']['metadata']['audio_duration']:.1f}s")
