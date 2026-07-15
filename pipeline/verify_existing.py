"""Build a verification report that never imports new listings.

Run this after a local gosom refresh. It compares scrape JSON against
`data/live_listings.csv`, writes known rows to a review artifact, and parks new
place ids in an ignored report. It does not mutate the D1 seed itself.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class VerificationSummary:
    live_count: int
    refreshed_count: int
    ignored_new_count: int
    missing_count: int
    invalid_popularity_count: int
    output_dir: Path


def read_live(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return {row["venue_id"]: row for row in csv.DictReader(f)}


def iter_scrape_rows(scrape_dir: Path) -> Iterable[dict]:
    for path in sorted(scrape_dir.rglob("*.json")):
        with path.open(encoding="utf-8") as f:
            for line_number, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"{path}:{line_number}: invalid json") from exc
                row["_source_file"] = str(path)
                yield row


def row_place_id(row: dict) -> str | None:
    place_id = row.get("place_id")
    return str(place_id).strip() if place_id else None


def has_valid_popularity(row: dict) -> bool:
    try:
        rating = float(row.get("review_rating"))
        review_count = int(row.get("review_count"))
    except (TypeError, ValueError):
        return False
    return 0 < rating <= 5 and review_count >= 5


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict]) -> int:
    count = 0
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def run_verification(
    live_listings_path: Path,
    scrape_dir: Path,
    output_dir: Path,
) -> VerificationSummary:
    live = read_live(live_listings_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    known_rows: dict[str, dict] = {}
    ignored_new: dict[str, dict] = {}
    for row in iter_scrape_rows(scrape_dir):
        place_id = row_place_id(row)
        if not place_id:
            continue
        if place_id in live:
            current = known_rows.get(place_id)
            if current is None or int(row.get("review_count") or 0) >= int(
                current.get("review_count") or 0
            ):
                known_rows[place_id] = row
        else:
            ignored_new.setdefault(
                place_id,
                {
                    "place_id": place_id,
                    "name": row.get("title") or row.get("name") or "",
                    "google_category": row.get("category") or "",
                    "review_count": row.get("review_count") or "",
                    "source_file": row.get("_source_file") or "",
                },
            )

    with (output_dir / "refreshed_known_rows.ndjson").open("w", encoding="utf-8") as f:
        for row in sorted(known_rows.values(), key=lambda r: row_place_id(r) or ""):
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")

    ignored_count = write_csv(
        output_dir / "ignored_new_place_ids.csv",
        ["place_id", "name", "google_category", "review_count", "source_file"],
        sorted(ignored_new.values(), key=lambda r: r["place_id"]),
    )

    missing = [
        live_row
        for venue_id, live_row in sorted(live.items())
        if venue_id not in known_rows
    ]
    missing_count = write_csv(
        output_dir / "missing_in_refresh.csv",
        ["venue_id", "slug", "name", "primary_subcategory", "subcategories", "google_url"],
        missing,
    )

    invalid_popularity = [
        {
            "venue_id": venue_id,
            "name": live[venue_id].get("name", ""),
            "review_rating": row.get("review_rating", ""),
            "review_count": row.get("review_count", ""),
            "google_url": live[venue_id].get("google_url", ""),
            "scraped_url": row.get("link", ""),
            "source_file": row.get("_source_file", ""),
        }
        for venue_id, row in sorted(known_rows.items())
        if not has_valid_popularity(row)
    ]
    invalid_popularity_count = write_csv(
        output_dir / "invalid_popularity_records.csv",
        [
            "venue_id",
            "name",
            "review_rating",
            "review_count",
            "google_url",
            "scraped_url",
            "source_file",
        ],
        invalid_popularity,
    )

    changed_popularity = []
    changed_core = []
    possible_closed = []
    for venue_id, row in known_rows.items():
        old = live[venue_id]
        if str(row.get("review_rating") or "") != str(old.get("rating") or "") or str(
            row.get("review_count") or ""
        ) != str(old.get("review_count") or ""):
            changed_popularity.append(
                {
                    "venue_id": venue_id,
                    "name": old.get("name", ""),
                    "old_rating": old.get("rating", ""),
                    "new_rating": row.get("review_rating") or "",
                    "old_review_count": old.get("review_count", ""),
                    "new_review_count": row.get("review_count") or "",
                }
            )
        core_pairs = {
            "name": row.get("title") or row.get("name") or "",
            "phone": row.get("phone") or "",
            "website": row.get("web_site") or "",
            "address": row.get("address") or "",
        }
        for field, new_value in core_pairs.items():
            old_field = "name" if field == "name" else field
            if new_value and str(old.get(old_field, "")) != str(new_value):
                changed_core.append(
                    {
                        "venue_id": venue_id,
                        "field": field,
                        "old_value": old.get(old_field, ""),
                        "new_value": new_value,
                    }
                )
        status = str(row.get("status") or "").lower()
        if "closed" in status:
            possible_closed.append(
                {
                    "venue_id": venue_id,
                    "name": old.get("name", ""),
                    "status": row.get("status") or "",
                }
            )

    write_csv(
        output_dir / "changed_popularity.csv",
        ["venue_id", "name", "old_rating", "new_rating", "old_review_count", "new_review_count"],
        changed_popularity,
    )
    write_csv(
        output_dir / "changed_core_fields.csv",
        ["venue_id", "field", "old_value", "new_value"],
        changed_core,
    )
    write_csv(
        output_dir / "possible_closed.csv",
        ["venue_id", "name", "status"],
        possible_closed,
    )

    summary = VerificationSummary(
        live_count=len(live),
        refreshed_count=len(known_rows),
        ignored_new_count=ignored_count,
        missing_count=missing_count,
        invalid_popularity_count=invalid_popularity_count,
        output_dir=output_dir,
    )
    (output_dir / "summary.md").write_text(
        "\n".join(
            [
                "# Existing Listings Verification",
                "",
                f"- Live listings: {summary.live_count}",
                f"- Refreshed known listings: {summary.refreshed_count}",
                f"- Ignored new place ids: {summary.ignored_new_count}",
                f"- Missing from refresh: {summary.missing_count}",
                f"- Invalid rating or review-count records: {summary.invalid_popularity_count}",
                "",
                "The verifier itself does not change public data. The daily updater may apply safe facts from this report.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    parser.add_argument("--scrape-dir", default=str(ROOT / "scraper" / "out"))
    parser.add_argument(
        "--output-dir",
        default=str(ROOT / "data" / "verification" / datetime.now().strftime("%Y-%m-%d")),
    )
    args = parser.parse_args(argv)

    live_listings = Path(args.live_listings)
    scrape_dir = Path(args.scrape_dir)
    output_dir = Path(args.output_dir)
    if not live_listings.exists():
        print(f"missing live listings file: {live_listings}", file=sys.stderr)
        return 2
    if not scrape_dir.exists():
        print(f"missing scrape dir: {scrape_dir}", file=sys.stderr)
        return 2

    summary = run_verification(live_listings, scrape_dir, output_dir)
    print(f"wrote verification report -> {summary.output_dir}")
    print(f"live={summary.live_count} refreshed={summary.refreshed_count} "
          f"ignored_new={summary.ignored_new_count} missing={summary.missing_count} "
          f"invalid_popularity={summary.invalid_popularity_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
