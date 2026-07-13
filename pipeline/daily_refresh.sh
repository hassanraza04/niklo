#!/usr/bin/env bash
# Safe daily refresh: scrape a bounded rotating set of existing listings,
# apply safe source facts, and record everything riskier for review.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DATE="${1:-$(date +%F)}"
OUTDIR="${DAILY_OUTPUT_DIR:-$ROOT/data/verification/$RUN_DATE}"
BATCH_SIZE="${DAILY_BATCH_SIZE:-50}"
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

echo ">> apply safe updates to matched live listings"
python3 "$ROOT/pipeline/apply_daily_updates.py" \
  --refreshed "$OUTDIR/report/refreshed_known_rows.ndjson" \
  --output-dir "$OUTDIR/report"

echo ">> reload local preview database"
(
  cd "$ROOT/web"
  npm run db:reset
)

echo ">> safe daily refresh complete: $OUTDIR/report"
