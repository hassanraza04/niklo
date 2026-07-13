"""Apply approved listing removals and membership corrections to the public seed."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

try:
    from pipeline.export_catalog import export_catalog
    from pipeline.export_live_listings import export_live_listings
    from pipeline.export_to_d1 import COLUMNS, write_seed
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from export_catalog import export_catalog
    from export_live_listings import export_live_listings
    from export_to_d1 import COLUMNS, write_seed
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ManualCurationSummary:
    removed_count: int
    membership_removed_count: int


def csv_values(value: object) -> list[str]:
    return [part.strip() for part in str(value or "").split(",") if part.strip()]


def read_excluded_ids(path: Path) -> set[str]:
    with path.open(newline="", encoding="utf-8") as f:
        return {row["venue_id"].strip() for row in csv.DictReader(f) if row.get("venue_id", "").strip()}


def read_membership_exclusions(path: Path) -> dict[str, set[str]]:
    exclusions: dict[str, set[str]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            venue_id = row.get("venue_id", "").strip()
            subcategory = row.get("subcategory", "").strip()
            if venue_id and subcategory:
                exclusions.setdefault(venue_id, set()).add(subcategory)
    return exclusions


def taxonomy_entries(path: Path) -> dict[str, tuple[str, str, str]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    entries: dict[str, tuple[str, str]] = {}
    for category in raw["categories"]:
        for subcategory in category["subcategories"]:
            entries[subcategory["slug"]] = (subcategory["name"], category["slug"], category["name"])
    return entries


def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def apply_manual_curation(
    schema_path: Path,
    seed_path: Path,
    excluded_venues_path: Path,
    membership_exclusions_path: Path,
    taxonomy_path: Path,
    live_listings_path: Path,
    catalog_path: Path,
    client_catalog_path: Path,
) -> ManualCurationSummary:
    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            rows = [list(row) for row in conn.execute(f"select {', '.join(COLUMNS)} from venues").fetchall()]
        finally:
            conn.close()

    indexes = {column: index for index, column in enumerate(COLUMNS)}
    excluded_ids = read_excluded_ids(excluded_venues_path)
    membership_exclusions = read_membership_exclusions(membership_exclusions_path)
    taxonomy = taxonomy_entries(taxonomy_path)
    curated_rows: list[list] = []
    removed_count = 0
    membership_removed_count = 0

    for row in rows:
        venue_id = str(row[indexes["venue_id"]])
        if venue_id in excluded_ids:
            removed_count += 1
            continue

        excluded_memberships = membership_exclusions.get(venue_id, set())
        memberships = csv_values(row[indexes["subcategories"]])
        remaining = [membership for membership in memberships if membership not in excluded_memberships]
        membership_removed_count += len(memberships) - len(remaining)

        if not remaining:
            raise ValueError(f"manual curation removes every membership from {venue_id}")

        primary = str(row[indexes["subcategory_slug"]])
        if primary not in remaining:
            primary = remaining[0]
        memberships = [primary, *[membership for membership in remaining if membership != primary]]

        try:
            primary_name, primary_category, primary_category_name = taxonomy[primary]
            category_slugs = unique([taxonomy[membership][1] for membership in memberships])
        except KeyError as exc:
            raise ValueError(f"unknown taxonomy membership for {venue_id}: {exc.args[0]}") from exc

        row[indexes["subcategory_slug"]] = primary
        row[indexes["subcategory_name"]] = primary_name
        row[indexes["category_slug"]] = primary_category
        row[indexes["category_name"]] = primary_category_name
        row[indexes["subcategories"]] = ",".join(memberships)
        row[indexes["category_slugs"]] = ",".join(category_slugs)
        curated_rows.append(row)

    write_seed(curated_rows, str(seed_path))
    export_live_listings(schema_path, seed_path, live_listings_path)
    export_catalog(schema_path, seed_path, catalog_path, client_catalog_path)
    return ManualCurationSummary(removed_count, membership_removed_count)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument(
        "--excluded-venues",
        default=str(ROOT / "pipeline" / "transform" / "seeds" / "excluded_venues.csv"),
    )
    parser.add_argument(
        "--membership-exclusions",
        default=str(ROOT / "pipeline" / "transform" / "seeds" / "venue_category_excludes.csv"),
    )
    parser.add_argument("--taxonomy", default=str(ROOT / "web" / "lib" / "taxonomy.json"))
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    parser.add_argument("--catalog", default=str(ROOT / "web" / "data" / "catalog.json"))
    parser.add_argument("--client-catalog", default=str(ROOT / "web" / "public" / "catalog-client.json"))
    args = parser.parse_args(argv)

    summary = apply_manual_curation(
        schema_path=Path(args.schema),
        seed_path=Path(args.seed),
        excluded_venues_path=Path(args.excluded_venues),
        membership_exclusions_path=Path(args.membership_exclusions),
        taxonomy_path=Path(args.taxonomy),
        live_listings_path=Path(args.live_listings),
        catalog_path=Path(args.catalog),
        client_catalog_path=Path(args.client_catalog),
    )
    print(f"removed={summary.removed_count} memberships_removed={summary.membership_removed_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
