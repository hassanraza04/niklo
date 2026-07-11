#!/usr/bin/env bash
# Rare discovery run: build an isolated warehouse and write candidates for manual
# review. It intentionally has no path to export a D1 seed or modify the allowlist.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRAPE_DIR="${1:?usage: pipeline/rare_discovery.sh <scrape-output-dir> [output-dir]}"
RUN_DATE="$(date +%F)"
OUTDIR="${2:-$ROOT/data/discovery/$RUN_DATE}"
WAREHOUSE="$OUTDIR/discovery.duckdb"

mkdir -p "$OUTDIR"
echo ">> ingest discovery scrape into isolated warehouse"
NIKLO_SCRAPE_OUT="$SCRAPE_DIR" NIKLO_DUCKDB="$WAREHOUSE" \
  uv run --directory "$ROOT/pipeline" python ingest/load.py

echo ">> build isolated candidate set"
(
  cd "$ROOT/pipeline/transform"
  NIKLO_DUCKDB="$WAREHOUSE" uv run dbt build --profiles-dir .
)

echo ">> write manual candidate review queue"
NIKLO_DUCKDB="$WAREHOUSE" uv run --directory "$ROOT/pipeline" \
  python discover_candidates.py --warehouse "$WAREHOUSE" --output-dir "$OUTDIR"

echo ">> rare discovery complete: review $OUTDIR/new_candidates.csv"
