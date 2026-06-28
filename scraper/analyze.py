#!/usr/bin/env python3
"""quick QA on a category's scrape: count, dedupe, geo-accuracy, recall.

usage:
  python3 analyze.py out/padel                      # just stats
  python3 analyze.py out/padel ../data/padel_ground_truth.json   # + recall
"""

import json
import re
import sys
from glob import glob
from pathlib import Path

BBOX_LAT = (24.78, 25.10)
BBOX_LON = (66.95, 67.35)


def load(folder: str) -> list[dict]:
    rows = []
    for path in sorted(glob(str(Path(folder) / "*.json"))):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    return rows


def in_bbox(r: dict) -> bool:
    try:
        return (
            BBOX_LAT[0] <= r["latitude"] <= BBOX_LAT[1]
            and BBOX_LON[0] <= r["longitude"] <= BBOX_LON[1]
        )
    except (KeyError, TypeError):
        return False


def norm(s: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
    s = re.sub(r"\b(karachi|padel|club|court|courts|the|at|by|arena|sports|pk|khi)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def main() -> None:
    folder = sys.argv[1] if len(sys.argv) > 1 else "out/padel"
    rows = load(folder)
    by_pid = {r.get("place_id"): r for r in rows if r.get("place_id")}

    print(f"folder           {folder}")
    print(f"raw rows         {len(rows)}")
    print(f"unique place_id  {len(by_pid)}")
    geo = sum(1 for r in by_pid.values() if in_bbox(r))
    print(f"geo-accuracy     {geo}/{len(by_pid)} = {100 * geo / max(len(by_pid), 1):.0f}% inside Karachi bbox")
    rated = sum(1 for r in by_pid.values() if r.get("review_rating") is not None)
    print(f"with rating      {rated}/{len(by_pid)}")

    if len(sys.argv) > 2:
        gt = json.load(open(sys.argv[2], encoding="utf-8"))["canonical"]
        names = [norm(r["title"]) for r in by_pid.values()]
        hits, misses = 0, []
        for v in gt:
            keys = [norm(v["name"]), *[norm(a) for a in v.get("aliases", [])]]
            keys = [k for k in keys if len(k) > 2]
            if any(k in n or n in k for k in keys for n in names if n):
                hits += 1
            else:
                misses.append(f"{v['name']} ({v['confidence']})")
        print(f"recall vs truth  {hits}/{len(gt)} = {100 * hits / len(gt):.0f}%")
        if misses:
            print("misses:", ", ".join(misses))


if __name__ == "__main__":
    main()
