#!/usr/bin/env bash
# scrape a query file with gosom. safe defaults for running off a karachi home line.
# usage: ./run.sh queries/padel.txt out/padel.json [extra gosom flags...]
#
# runs the NATIVE arm64 gosom binary (not docker) -- the docker image is amd64-only
# and its bundled chromium segfaults under qemu emulation on apple silicon.
#
# env knobs:
#   GEO        geo center for the search   (default karachi / clifton-ish)
#   CONC       concurrency (-c)            (default 2 -- keep low, google soft-bans fast)
#   DEPTH      scroll depth (-depth)       (default 10)
#   ZOOM       zoom level (-zoom)          (default 15)
#   GOSOM_BIN  path to the binary          (default: on PATH, else ~/go/bin)
#
# note: gosom has no delay flag, so pacing between separate runs is done in
# sweep.sh, not here. one run = one query file = low -c.
set -euo pipefail

QFILE="${1:?usage: run.sh <queryfile> <out.json> [extra flags...]}"
OUT="${2:?usage: run.sh <queryfile> <out.json> [extra flags...]}"
shift 2

GEO="${GEO:-24.8607,67.0011}"
CONC="${CONC:-2}"
DEPTH="${DEPTH:-10}"
ZOOM="${ZOOM:-15}"
GOSOM_BIN="${GOSOM_BIN:-$(command -v google-maps-scraper || echo "$HOME/go/bin/google-maps-scraper")}"

mkdir -p "$(dirname "$OUT")"

echo ">> scraping $(basename "$QFILE")  geo=$GEO c=$CONC depth=$DEPTH zoom=$ZOOM"
"$GOSOM_BIN" \
  -input "$QFILE" \
  -results "$OUT" \
  -json -lang en -geo "$GEO" -depth "$DEPTH" -zoom "$ZOOM" -c "$CONC" "$@"

echo ">> done -> $OUT"
