"""Rewrite only public media fields from the downloaded photo manifest.

Useful after caching a curated venue image when no full scrape warehouse is present.
"""

from __future__ import annotations

import argparse
import csv
import os
import tempfile
from pathlib import Path

try:
    from pipeline.export_to_d1 import COLUMNS, apply_cached_photos, write_seed
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from export_to_d1 import COLUMNS, apply_cached_photos, write_seed
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]


def excluded_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    with path.open(newline="", encoding="utf-8") as f:
        return {row["venue_id"] for row in csv.DictReader(f) if row.get("venue_id")}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument("--manifest", default=str(ROOT / "data" / "photo_manifest.csv"))
    parser.add_argument("--photo-root", default=str(ROOT / "web" / "public" / "venues"))
    parser.add_argument(
        "--excluded",
        default=str(ROOT / "pipeline" / "transform" / "seeds" / "excluded_venues.csv"),
    )
    parser.add_argument("--photo-base", default=os.environ.get("R2_PUBLIC_BASE", "/"))
    args = parser.parse_args(argv)
    schema_path, seed_path = Path(args.schema), Path(args.seed)

    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            rows = [list(row) for row in conn.execute(
                f"select {', '.join(COLUMNS)} from venues order by venue_id"
            ).fetchall()]
        finally:
            conn.close()
    excluded = excluded_ids(Path(args.excluded))
    venue_index = COLUMNS.index("venue_id")
    rows = [row for row in rows if row[venue_index] not in excluded]
    cached, missing = apply_cached_photos(
        rows, str(Path(args.manifest)), args.photo_base, args.photo_root
    )
    write_seed(rows, str(seed_path))
    print(
        f"wrote {len(rows)} listings with {cached} downloaded photos, "
        f"{missing} fallbacks, and excluded listings removed"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
