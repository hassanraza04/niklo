"""Release checks that keep the public listing lock aligned with the generated seed."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import tempfile
from pathlib import Path

try:
    from pipeline import export_catalog, export_live_listings, seed_checks
except ModuleNotFoundError:
    import export_catalog
    import export_live_listings
    import seed_checks


ROOT = Path(__file__).resolve().parents[1]


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def json_rows(path: Path) -> list[dict[str, object]]:
    return json.loads(path.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    args = parser.parse_args(argv)

    schema_path, seed_path, live_path = map(Path, (args.schema, args.seed, args.live_listings))
    with tempfile.TemporaryDirectory() as tmp:
        temporary = Path(tmp)
        generated = temporary / "live_listings.csv"
        generated_catalog = temporary / "catalog.json"
        generated_client_catalog = temporary / "catalog-client.json"
        export_live_listings.export_live_listings(schema_path, seed_path, generated)
        catalog_count = export_catalog.export_catalog(
            schema_path,
            seed_path,
            generated_catalog,
            generated_client_catalog,
        )
        expected = rows(generated)
        expected_catalog = json_rows(generated_catalog)
        expected_client_catalog = json_rows(generated_client_catalog)
    actual = rows(live_path)
    if actual != expected:
        print("FAIL live_listing_lock: data/live_listings.csv does not match infra/d1/seed.sql")
        return 1

    catalog_path = ROOT / "web" / "data" / "catalog.json"
    if json_rows(catalog_path) != expected_catalog:
        print("FAIL catalog_lock: web/data/catalog.json does not match infra/d1/seed.sql")
        return 1

    client_catalog_path = ROOT / "web" / "public" / "catalog-client.json"
    if json_rows(client_catalog_path) != expected_client_catalog:
        print("FAIL client_catalog: web/public/catalog-client.json does not match infra/d1/seed.sql")
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        conn = seed_checks.load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            missing_evidence = conn.execute(
                "select count(*) from venues where review_count < 5 or last_verified is null"
            ).fetchone()[0]
        finally:
            conn.close()
    if missing_evidence:
        print(f"FAIL release_quality: {missing_evidence} listings violate the public quality floor")
        return 1

    print(f"PASS live_listing_lock: {len(actual)} listings match the generated seed")
    print(f"PASS catalog_lock: {catalog_count} listings match the generated catalog")
    print("PASS client_catalog: compact browser catalog matches the generated seed")
    print("PASS release_quality: every public listing meets the five-review floor")
    return 0


if __name__ == "__main__":
    sys.exit(main())
