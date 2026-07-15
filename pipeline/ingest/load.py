"""Load raw gosom scrape JSON into DuckDB.

reads scraper/out/<category>/<query>.json (ndjson, one venue per line), tags each
row with its category + source query (the filename = which query found it = our
provenance) + a load timestamp, and loads into the `raw.venues` table.

nested gosom fields (open_hours, complete_address, images, ...) remain JSON
so dbt can pull out just what it needs downstream.

usage:  uv run python ingest/load.py
"""

from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get(
    "NIKLO_SCRAPE_OUT", os.path.normpath(os.path.join(HERE, "..", "..", "scraper", "out"))
)
DUCKDB_PATH = os.environ.get(
    "NIKLO_DUCKDB", os.path.normpath(os.path.join(HERE, "..", "warehouse.duckdb"))
)


def enriched_rows(out_dir: Path):
    loaded_at = datetime.now(timezone.utc).isoformat()
    files = sorted(out_dir.glob("*/*.json"))
    if not files:
        raise ValueError(f"no scrape json under {out_dir}/<category>/  -- run a sweep first")
    for path in files:
        category = path.parent.name
        source_query = path.stem
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                row["_category"] = category
                row["_source_query"] = source_query
                row["_loaded_at"] = loaded_at
                yield row


def load_raw_venues(out_dir: Path, warehouse_path: Path) -> int:
    """Replace ``raw.venues`` with enriched NDJSON from a scraper sweep."""
    import duckdb

    with tempfile.NamedTemporaryFile(mode="w", suffix=".ndjson", encoding="utf-8") as staged:
        for row in enriched_rows(out_dir):
            staged.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
        staged.flush()
        con = duckdb.connect(warehouse_path)
        try:
            con.execute("create schema if not exists raw")
            con.execute(
                """
                create or replace table raw.venues as
                select * from read_json_auto(?, format = 'newline_delimited', union_by_name = true)
                """,
                [staged.name],
            )
            return con.execute("select count(*) from raw.venues").fetchone()[0]
        finally:
            con.close()


def main() -> None:
    count = load_raw_venues(Path(OUT_DIR), Path(DUCKDB_PATH))
    print(f"raw.venues rows: {count}  ({DUCKDB_PATH})")


if __name__ == "__main__":
    main()
