"""Generate Listening clips with a local MeloTTS install.

Called by scripts/generate-listening-audio.mjs with a JSON file of
[{id, audioText, accent, audio}] items. Existing clips are skipped unless --force.
"""
import argparse
import json
import os
import sys

# Bank accent code -> MeloTTS English speaker
SPEAKERS = {
    "en-GB": "EN-BR",
    "en-US": "EN-US",
    "en-AU": "EN-AU",
    "en-IN": "EN-INDIA",
}

parser = argparse.ArgumentParser()
parser.add_argument("items")
parser.add_argument("--out-root", required=True, help="project root that audio paths are relative to")
parser.add_argument("--only", nargs="*", default=[])
parser.add_argument("--force", action="store_true")
parser.add_argument("--speed", type=float, default=0.9)
args = parser.parse_args()

with open(args.items, encoding="utf-8") as handle:
    items = json.load(handle)
if args.only:
    items = [item for item in items if item["id"] in args.only]

todo = [item for item in items if args.force or not os.path.exists(os.path.join(args.out_root, item["audio"]))]
print(f"{len(items) - len(todo)} clip(s) already exist, {len(todo)} to generate", flush=True)
if not todo:
    sys.exit(0)

from melo.api import TTS  # imported late: slow, and unnecessary when nothing is generated

model = TTS(language="EN_V2", device="cpu")
speaker_ids = model.hps.data.spk2id

for item in todo:
    speaker = SPEAKERS[item["accent"]]
    target = os.path.join(args.out_root, item["audio"])
    os.makedirs(os.path.dirname(target), exist_ok=True)
    print(f"{item['id']} -> {speaker}", flush=True)
    model.tts_to_file(item["audioText"], speaker_ids[speaker], target, speed=args.speed)
print("done", flush=True)
