"""Export the current public seed as the routine-update allowlist."""

from __future__ import annotations

import argparse
import csv
import sys
import tempfile
from pathlib import Path

try:
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]
FIELDS = [
    "venue_id",
    "slug",
    "name",
    "primary_subcategory",
    "subcategories",
    "google_url",
    "last_verified",
    "rating",
    "review_count",
    "phone",
    "website",
    "address",
    "latitude",
    "longitude",
]


def export_live_listings(schema_path: Path, seed_path: Path, output_path: Path) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            rows = conn.execute(
                """
                select
                  venue_id,
                  slug,
                  name,
                  subcategory_slug as primary_subcategory,
                  subcategories,
                  google_url,
                  last_verified,
                  rating,
                  review_count,
                  phone,
                  website,
                  address,
                  latitude,
                  longitude
                from venues
                order by name, venue_id
                """
            ).fetchall()
        finally:
            conn.close()

    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(FIELDS)
        writer.writerows(rows)
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument("--output", default=str(ROOT / "data" / "live_listings.csv"))
    args = parser.parse_args(argv)

    count = export_live_listings(Path(args.schema), Path(args.seed), Path(args.output))
    print(f"wrote {count} live listings -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
