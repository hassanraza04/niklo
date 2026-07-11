"""Write a review queue from an isolated discovery warehouse.

This command never touches the public seed or the existing-listings allowlist.
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from pathlib import Path

import duckdb

try:
    from pipeline.verify_existing import read_live
except ModuleNotFoundError:
    from verify_existing import read_live


ROOT = Path(__file__).resolve().parents[1]
COLUMNS = [
    "venue_id",
    "name",
    "slug",
    "subcategory_slug",
    "subcategory_name",
    "category_slug",
    "category_name",
    "google_category",
    "rating",
    "review_count",
    "latitude",
    "longitude",
    "area",
    "address",
    "city",
    "website",
    "phone",
    "google_url",
    "status",
    "is_open",
    "source_query",
    "last_verified",
]


@dataclass(frozen=True)
class DiscoverySummary:
    live_count: int
    discovered_count: int
    new_candidate_count: int
    output_dir: Path


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> int:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def build_candidate_report(
    live_listings_path: Path,
    warehouse_path: Path,
    output_dir: Path,
) -> DiscoverySummary:
    live_ids = set(read_live(live_listings_path))
    output_dir.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(warehouse_path, read_only=True)
    try:
        raw_rows = con.execute(
            f"select {', '.join(COLUMNS)} from main.dim_venue order by name, venue_id"
        ).fetchall()
    finally:
        con.close()

    discovered = [dict(zip(COLUMNS, row, strict=True)) for row in raw_rows]
    candidates = [row for row in discovered if str(row["venue_id"]) not in live_ids]
    for row in candidates:
        row["review_status"] = "pending"
        row["review_notes"] = ""

    write_csv(output_dir / "new_candidates.csv", COLUMNS + ["review_status", "review_notes"], candidates)
    write_csv(
        output_dir / "known_live_matches.csv",
        COLUMNS,
        [row for row in discovered if str(row["venue_id"]) in live_ids],
    )
    summary = DiscoverySummary(
        live_count=len(live_ids),
        discovered_count=len(discovered),
        new_candidate_count=len(candidates),
        output_dir=output_dir,
    )
    (output_dir / "summary.md").write_text(
        "\n".join(
            [
                "# Discovery Candidate Review",
                "",
                f"- Current live listings: {summary.live_count}",
                f"- Listings in discovery warehouse: {summary.discovered_count}",
                f"- New candidates awaiting review: {summary.new_candidate_count}",
                "",
                "This is a review queue only. No seed, allowlist, or D1 data was changed.",
                "Add a candidate only after a manual decision and evidence review.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    parser.add_argument("--warehouse", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)
    summary = build_candidate_report(
        Path(args.live_listings), Path(args.warehouse), Path(args.output_dir)
    )
    print(
        f"live={summary.live_count} discovered={summary.discovered_count} "
        f"new_candidates={summary.new_candidate_count} -> {summary.output_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
