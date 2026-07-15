#!/usr/bin/env bash
# full local pipeline: scrape json -> duckdb -> dbt -> mirror photos -> d1 seed.
# run after a scrape (or any seed/override edit). from the pipeline/ dir: ./run.sh
set -euo pipefail
cd "$(dirname "$0")"

PHOTO_DIR="${PHOTOS_DIR:-../web/public/venues}"

echo ">> load scrape json -> duckdb"
uv run python ingest/load.py >/dev/null

echo ">> dbt build (dedupe, bbox, >=5 filter, excludes, overrides, tests)"
(cd transform && uv run dbt build --profiles-dir . | tail -1)

echo ">> mirror photos -> $PHOTO_DIR"
PHOTOS_DIR="$PHOTO_DIR" uv run python photos.py | tail -1

echo ">> export dim_venue -> d1 seed"
uv run python export_to_d1.py | tail -1

echo ">> export static web catalog"
uv run python export_catalog.py | tail -1

echo ">> prune orphaned photos"
uv run python -c "import duckdb,os,glob; ids={r[0] for r in duckdb.connect('warehouse.duckdb',read_only=True).execute('select venue_id from main.dim_venue').fetchall()}; n=[os.remove(f) for f in glob.glob('$PHOTO_DIR/*') if os.path.isfile(f) and os.path.splitext(os.path.basename(f))[0] not in ids]; print(f'  pruned {len(n)}')"

echo ">> done"
uv run python -c "import duckdb; print('   venues:', duckdb.connect('warehouse.duckdb',read_only=True).execute('select count(*) from main.dim_venue').fetchone()[0])"
