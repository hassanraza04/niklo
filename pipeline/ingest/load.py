"""load raw gosom scrape json into duckdb.

reads scraper/out/<category>/<query>.json (ndjson, one venue per line), tags each
row with its category + source query (the filename = which query found it = our
provenance) + a load timestamp, and loads into the `raw.venues` table.

nested gosom fields (open_hours, complete_address, images, ...) are kept as json
blobs (max_table_nesting=0) so dbt can pull out just what we need downstream.

usage:  uv run python ingest/load.py
"""

from __future__ import annotations

import glob
import json
import os
from datetime import datetime, timezone

import dlt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.environ.get(
    "NIKLO_SCRAPE_OUT", os.path.normpath(os.path.join(HERE, "..", "..", "scraper", "out"))
)
DUCKDB_PATH = os.environ.get(
    "NIKLO_DUCKDB", os.path.normpath(os.path.join(HERE, "..", "warehouse.duckdb"))
)


@dlt.resource(name="venues", write_disposition="replace", max_table_nesting=0)
def venues():
    loaded_at = datetime.now(timezone.utc).isoformat()
    files = sorted(glob.glob(os.path.join(OUT_DIR, "*", "*.json")))
    if not files:
        raise SystemExit(f"no scrape json under {OUT_DIR}/<category>/  -- run a sweep first")
    for path in files:
        category = os.path.basename(os.path.dirname(path))
        source_query = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                row["_category"] = category
                row["_source_query"] = source_query
                row["_loaded_at"] = loaded_at
                yield row


def main() -> None:
    pipe = dlt.pipeline(
        pipeline_name="niklo",
        destination=dlt.destinations.duckdb(DUCKDB_PATH),
        dataset_name="raw",
    )
    info = pipe.run(venues())
    print(info)
    with pipe.sql_client() as c:
        n = c.execute_sql("select count(*) from venues")[0][0]
        print(f"raw.venues rows: {n}  ({DUCKDB_PATH})")


if __name__ == "__main__":
    main()
