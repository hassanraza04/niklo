#!/usr/bin/env bash
# full local pipeline: scrape json -> duckdb -> dbt -> mirror photos -> d1 seed.
# run after a scrape (or any seed/override edit). from the pipeline/ dir: ./run.sh
#
# r2: set R2_PUBLIC_BASE to your r2 domain (and R2_* creds for photos.py) to serve
# photos from r2 instead of the local web/public/venues folder.
set -euo pipefail
cd "$(dirname "$0")"

PHOTO_BASE="${R2_PUBLIC_BASE:-/}"          # default: local /venues static files
PHOTO_DIR="${PHOTOS_DIR:-../web/public/venues}"

echo ">> dlt load (scrape json -> duckdb)"
uv run python ingest/load.py >/dev/null

echo ">> dbt build (dedupe, bbox, >=3 filter, excludes, overrides, tests)"
(cd transform && uv run dbt build --profiles-dir . | tail -1)

echo ">> flag venues (review queue)"
uv run python flag_venues.py

echo ">> mirror photos -> $PHOTO_DIR"
PHOTOS_DIR="$PHOTO_DIR" uv run python photos.py | tail -1

echo ">> export dim_venue -> d1 seed"
R2_PUBLIC_BASE="$PHOTO_BASE" uv run python export_to_d1.py | tail -1

echo ">> prune orphaned photos"
uv run python -c "import duckdb,os,glob; ids={r[0] for r in duckdb.connect('warehouse.duckdb',read_only=True).execute('select venue_id from main.dim_venue').fetchall()}; n=[os.remove(f) for f in glob.glob('$PHOTO_DIR/*.jpg') if os.path.basename(f)[:-4] not in ids]; print(f'  pruned {len(n)}')"

echo ">> load local d1 (schema assumed to exist) + apply review flags"
(cd ../web && npm run db:seed >/dev/null 2>&1 && npx wrangler d1 execute niklo --local --file=../infra/d1/flags.sql >/dev/null 2>&1)

echo ">> done"
uv run python -c "import duckdb; print('   venues:', duckdb.connect('warehouse.duckdb',read_only=True).execute('select count(*) from main.dim_venue').fetchone()[0])"
