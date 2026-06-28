#!/usr/bin/env bash
# run a whole category's query sweep -- one gosom invocation per query line, with
# a random pause between runs so we stay polite to google (gosom has no delay flag,
# so the pause + low -c is our rate limiting). one json per query = built-in
# provenance (the filename is the query that found those rows).
#
# usage: ./sweep.sh queries/padel.txt padel
# env: CONC (default 2), DEPTH (default 10), PAUSE_MIN/PAUSE_MAX seconds between runs
set -euo pipefail

QFILE="${1:?usage: sweep.sh <queryfile> <category-slug>}"
CAT="${2:?usage: sweep.sh <queryfile> <category-slug>}"
OUTDIR="out/$CAT"
PMIN="${PAUSE_MIN:-25}"
PMAX="${PAUSE_MAX:-50}"
mkdir -p "$OUTDIR"

i=0
total_rows=0
while IFS= read -r q || [ -n "$q" ]; do
  q="$(echo "$q" | xargs)"            # trim
  [ -z "$q" ] && continue
  i=$((i + 1))
  slug="$(echo "$q" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_')"
  out="$OUTDIR/${slug}.json"
  printf '%s\n' "$q" > "$OUTDIR/.q.txt"

  echo "[$i] \"$q\" -> $out"
  CONC="${CONC:-2}" DEPTH="${DEPTH:-10}" ./run.sh "$OUTDIR/.q.txt" "$out" >/dev/null 2>"$OUTDIR/.err" || {
    echo "    !! run failed:"; tail -3 "$OUTDIR/.err" | sed 's/^/    /'; }
  n=$(wc -l < "$out" 2>/dev/null | tr -d ' ' || echo 0)
  total_rows=$((total_rows + n))
  echo "    $n rows"
  [ "$n" -eq 0 ] && echo "    !! zero rows -- possible soft-ban or dead query, check $OUTDIR/.err"

  # pause before the next query (skip after the last)
  pause=$((PMIN + RANDOM % (PMAX - PMIN + 1)))
  echo "    pausing ${pause}s..."
  sleep "$pause"
done < "$QFILE"

rm -f "$OUTDIR/.q.txt" "$OUTDIR/.err"
echo ">> sweep done: $i queries, $total_rows raw rows (pre-dedupe) in $OUTDIR/"
