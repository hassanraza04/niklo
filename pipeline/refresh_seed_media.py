"""Refresh public media and approved listing curation without a scrape warehouse.

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


def excluded_categories(path: Path) -> dict[str, set[str]]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as f:
        result: dict[str, set[str]] = {}
        for row in csv.DictReader(f):
            venue_id, subcategory = row.get("venue_id"), row.get("subcategory")
            if venue_id and subcategory:
                result.setdefault(venue_id, set()).add(subcategory)
        return result


def taxonomy(path: Path) -> dict[str, tuple[str, str, str]]:
    import json

    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    return {
        subcategory["slug"]: (subcategory["name"], category["slug"], category["name"])
        for category in data["categories"]
        for subcategory in category["subcategories"]
    }


def apply_category_excludes(
    rows: list[list], exclusions: dict[str, set[str]], taxonomy_by_slug: dict[str, tuple[str, str, str]]
) -> int:
    """Remove rejected memberships and keep the first remaining tag as primary."""
    indexes = {column: COLUMNS.index(column) for column in COLUMNS}
    changed = 0
    for row in rows:
        blocked = exclusions.get(row[indexes["venue_id"]])
        if not blocked:
            continue
        memberships = [slug for slug in str(row[indexes["subcategories"]]).split(",") if slug]
        remaining = [slug for slug in memberships if slug not in blocked]
        if not remaining or remaining == memberships:
            continue
        primary = remaining[0]
        subcategory_name, category_slug, category_name = taxonomy_by_slug[primary]
        category_slugs = list(dict.fromkeys(taxonomy_by_slug[slug][1] for slug in remaining))
        row[indexes["subcategory_slug"]] = primary
        row[indexes["subcategory_name"]] = subcategory_name
        row[indexes["category_slug"]] = category_slug
        row[indexes["category_name"]] = category_name
        row[indexes["subcategories"]] = ",".join(remaining)
        row[indexes["category_slugs"]] = ",".join(category_slugs)
        changed += 1
    return changed


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
    parser.add_argument(
        "--category-excludes",
        default=str(ROOT / "pipeline" / "transform" / "seeds" / "venue_category_excludes.csv"),
    )
    parser.add_argument("--taxonomy", default=str(ROOT / "web" / "lib" / "taxonomy.json"))
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
    memberships_removed = apply_category_excludes(
        rows, excluded_categories(Path(args.category_excludes)), taxonomy(Path(args.taxonomy))
    )
    cached, missing = apply_cached_photos(
        rows, str(Path(args.manifest)), args.photo_base, args.photo_root
    )
    write_seed(rows, str(seed_path))
    print(
        f"wrote {len(rows)} listings with {cached} downloaded photos, "
        f"{missing} fallbacks, {memberships_removed} membership cleanups, "
        "and excluded listings removed"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
