#!/usr/bin/env bash
# Safe daily refresh: scrape a small rotating set of existing listings, then
# write a review report. It deliberately never calls dbt, seed export, or D1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DATE="${1:-$(date +%F)}"
OUTDIR="${DAILY_OUTPUT_DIR:-$ROOT/data/verification/$RUN_DATE}"
BATCH_SIZE="${DAILY_BATCH_SIZE:-20}"
LABEL="daily-${RUN_DATE//-/}"

mkdir -p "$OUTDIR"
python3 "$ROOT/pipeline/plan_daily_refresh.py" \
  --date "$RUN_DATE" \
  --batch-size "$BATCH_SIZE" \
  --output-dir "$OUTDIR"

echo ">> scrape existing batch only"
(
  cd "$ROOT/scraper"
  OUT_ROOT="$OUTDIR/scrape" ./sweep.sh "$OUTDIR/queries.txt" "$LABEL"
)

echo ">> compare with the live allowlist"
python3 "$ROOT/pipeline/verify_existing.py" \
  --scrape-dir "$OUTDIR/scrape/$LABEL" \
  --output-dir "$OUTDIR/report"

echo ">> safe daily refresh complete: $OUTDIR/report"
