"""Export the reviewed D1 seed as static public catalog files."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

try:
    from pipeline.export_to_d1 import COLUMNS
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from export_to_d1 import COLUMNS
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]
CLIENT_FIELDS = (
    "venue_id",
    "name",
    "slug",
    "subcategory_slug",
    "subcategory_name",
    "category_slug",
    "category_name",
    "subcategories",
    "category_slugs",
    "rating",
    "review_count",
    "latitude",
    "longitude",
    "area",
    "address",
    "hours",
    "photo_url",
    "is_open",
)


def load_seed_rows(schema_path: Path, seed_path: Path) -> list[dict[str, object]]:
    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            values = conn.execute(f"select {', '.join(COLUMNS)} from venues").fetchall()
        finally:
            conn.close()
    return [dict(zip(COLUMNS, row, strict=True)) for row in values]


def assert_unique(rows: list[dict[str, object]], field: str) -> None:
    seen: set[object] = set()
    for row in rows:
        value = row[field]
        if value in seen:
            raise ValueError(f"duplicate {field}: {value}")
        seen.add(value)


def write_json(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write("\n")


def export_catalog(
    schema_path: Path,
    seed_path: Path,
    server_output: Path,
    client_output: Path,
) -> int:
    rows = load_seed_rows(schema_path, seed_path)
    assert_unique(rows, "venue_id")
    assert_unique(rows, "slug")
    rows.sort(key=lambda row: str(row["slug"]))
    for row in rows:
        photo_url = row["photo_url"]
        if photo_url and not str(photo_url).startswith("/venues/"):
            row["photo_url"] = None
    client_rows = [{field: row[field] for field in CLIENT_FIELDS} for row in rows]
    write_json(server_output, rows)
    write_json(client_output, client_rows)
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument("--server-output", default=str(ROOT / "web" / "data" / "catalog.json"))
    parser.add_argument("--client-output", default=str(ROOT / "web" / "public" / "catalog-client.json"))
    args = parser.parse_args(argv)

    count = export_catalog(
        Path(args.schema),
        Path(args.seed),
        Path(args.server_output),
        Path(args.client_output),
    )
    print(f"wrote {count} catalog listings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
