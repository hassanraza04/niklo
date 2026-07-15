"""Apply approved listing removals and membership corrections to the public seed."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

try:
    from pipeline.export_catalog import export_catalog
    from pipeline.export_live_listings import export_live_listings
    from pipeline.export_to_d1 import COLUMNS, apply_cached_photos, write_seed
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from export_catalog import export_catalog
    from export_live_listings import export_live_listings
    from export_to_d1 import COLUMNS, apply_cached_photos, write_seed
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ManualCurationSummary:
    removed_count: int
    membership_removed_count: int
    added_count: int


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


def read_category_overrides(path: Path | None) -> dict[str, str]:
    if path is None or not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as f:
        return {
            row["venue_id"].strip(): row["subcategory"].strip()
            for row in csv.DictReader(f)
            if row.get("venue_id", "").strip() and row.get("subcategory", "").strip()
        }


def taxonomy_entries(path: Path) -> dict[str, tuple[str, str, str]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    entries: dict[str, tuple[str, str]] = {}
    for category in raw["categories"]:
        for subcategory in category["subcategories"]:
            entries[subcategory["slug"]] = (subcategory["name"], category["slug"], category["name"])
    return entries


def curated_rows(path: Path) -> list[list]:
    if not path.exists():
        return []

    indexes = {column: index for index, column in enumerate(COLUMNS)}
    rows: list[list] = []
    with path.open(newline="", encoding="utf-8") as f:
        for record in csv.DictReader(f):
            venue_id = record.get("venue_id", "").strip()
            if not venue_id:
                continue
            name = record.get("name", "").strip()
            if not name:
                raise ValueError(f"curated venue {venue_id} is missing a name")
            slug = re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))
            values = [record.get(column, "") or None for column in COLUMNS]
            values[indexes["slug"]] = f"{slug}-{venue_id[3:9].lower()}"
            for column, caster in (("rating", float), ("review_count", int), ("latitude", float), ("longitude", float)):
                value = values[indexes[column]]
                if value is not None:
                    values[indexes[column]] = caster(value)
            values[indexes["is_open"]] = int(values[indexes["is_open"]] or 0)
            rows.append(values)
    return rows


def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def apply_manual_curation(
    schema_path: Path,
    seed_path: Path,
    excluded_venues_path: Path,
    membership_exclusions_path: Path,
    taxonomy_path: Path,
    curated_venues_path: Path,
    live_listings_path: Path,
    catalog_path: Path,
    client_catalog_path: Path,
    category_overrides_path: Path | None = None,
    manifest_path: Path | None = None,
    photo_root: Path | None = None,
) -> ManualCurationSummary:
    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            rows = [list(row) for row in conn.execute(f"select {', '.join(COLUMNS)} from venues").fetchall()]
        finally:
            conn.close()

    indexes = {column: index for index, column in enumerate(COLUMNS)}
    curated = curated_rows(curated_venues_path)
    curated_ids = {str(row[indexes["venue_id"]]) for row in curated}
    prior_manual_ids = {
        str(row[indexes["venue_id"]])
        for row in rows
        if str(row[indexes["venue_id"]]) in curated_ids
        and row[indexes["source_query"]] == "manual-curation"
    }
    rows = [row for row in rows if str(row[indexes["venue_id"]]) not in prior_manual_ids]
    existing_ids = {str(row[indexes["venue_id"]]) for row in rows}
    rows.extend(row for row in curated if str(row[indexes["venue_id"]]) not in existing_ids)
    excluded_ids = read_excluded_ids(excluded_venues_path)
    membership_exclusions = read_membership_exclusions(membership_exclusions_path)
    category_overrides = read_category_overrides(category_overrides_path)
    taxonomy = taxonomy_entries(taxonomy_path)
    public_rows: list[list] = []
    removed_count = 0
    membership_removed_count = 0

    for row in rows:
        venue_id = str(row[indexes["venue_id"]])
        if venue_id in excluded_ids:
            removed_count += 1
            continue

        memberships = csv_values(row[indexes["subcategories"]])
        override = category_overrides.get(venue_id)
        if override and override not in memberships:
            memberships.insert(0, override)
        excluded_memberships = membership_exclusions.get(venue_id, set())
        remaining = [membership for membership in memberships if membership not in excluded_memberships]
        membership_removed_count += len(memberships) - len(remaining)

        if not remaining:
            raise ValueError(f"manual curation removes every membership from {venue_id}")

        primary = override or str(row[indexes["subcategory_slug"]])
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
        public_rows.append(row)

    apply_cached_photos(
        public_rows,
        str(manifest_path or ROOT / "data" / "photo_manifest.csv"),
        "/",
        str(photo_root or ROOT / "web" / "public" / "venues"),
    )
    write_seed(public_rows, str(seed_path))
    export_live_listings(schema_path, seed_path, live_listings_path)
    export_catalog(schema_path, seed_path, catalog_path, client_catalog_path)
    return ManualCurationSummary(removed_count, membership_removed_count, len(rows) - len(existing_ids))


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
    parser.add_argument(
        "--curated-venues",
        default=str(ROOT / "pipeline" / "transform" / "seeds" / "curated_venues.csv"),
    )
    parser.add_argument(
        "--category-overrides",
        default=str(ROOT / "pipeline" / "transform" / "seeds" / "category_overrides.csv"),
    )
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    parser.add_argument("--catalog", default=str(ROOT / "web" / "data" / "catalog.json"))
    parser.add_argument("--client-catalog", default=str(ROOT / "web" / "public" / "catalog-client.json"))
    parser.add_argument("--manifest", default=str(ROOT / "data" / "photo_manifest.csv"))
    parser.add_argument("--photo-root", default=str(ROOT / "web" / "public" / "venues"))
    args = parser.parse_args(argv)

    summary = apply_manual_curation(
        schema_path=Path(args.schema),
        seed_path=Path(args.seed),
        excluded_venues_path=Path(args.excluded_venues),
        membership_exclusions_path=Path(args.membership_exclusions),
        taxonomy_path=Path(args.taxonomy),
        curated_venues_path=Path(args.curated_venues),
        live_listings_path=Path(args.live_listings),
        catalog_path=Path(args.catalog),
        client_catalog_path=Path(args.client_catalog),
        category_overrides_path=Path(args.category_overrides),
        manifest_path=Path(args.manifest),
        photo_root=Path(args.photo_root),
    )
    print(
        f"added={summary.added_count} removed={summary.removed_count} "
        f"memberships_removed={summary.membership_removed_count}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
