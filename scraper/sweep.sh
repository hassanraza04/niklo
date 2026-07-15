#!/usr/bin/env bash
# run a whole category's query sweep -- one gosom invocation per query line, with
# a random pause between runs so we stay polite to google (gosom has no delay flag,
# so the pause + low -c is our rate limiting). one json per query = built-in
# provenance (the filename is the query that found those rows).
#
# usage: ./sweep.sh queries/<category>.txt <category>
# env: CONC (default 2), DEPTH (default 10), PAUSE_MIN/PAUSE_MAX seconds between runs,
# QUERY_TIMEOUT_SECONDS (default 120)
set -euo pipefail

QFILE="${1:?usage: sweep.sh <queryfile> <category-slug>}"
CAT="${2:?usage: sweep.sh <queryfile> <category-slug>}"
OUTDIR="${OUT_ROOT:-out}/$CAT"
PMIN="${PAUSE_MIN:-25}"
PMAX="${PAUSE_MAX:-50}"
QUERY_TIMEOUT_SECONDS="${QUERY_TIMEOUT_SECONDS:-120}"
mkdir -p "$OUTDIR"

i=0
total_rows=0
query_count="$(awk 'NF { count += 1 } END { print count + 0 }' "$QFILE")"
while IFS= read -r q || [ -n "$q" ]; do
  q="$(printf '%s\n' "$q" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  [ -z "$q" ] && continue
  i=$((i + 1))
  slug="$(echo "$q" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_')"
  out="$OUTDIR/${slug}.json"
  printf '%s\n' "$q" > "$OUTDIR/.q.txt"

  echo "[$i] \"$q\" -> $out"
  if command -v timeout >/dev/null 2>&1; then
    timeout "$QUERY_TIMEOUT_SECONDS" env CONC="${CONC:-2}" DEPTH="${DEPTH:-10}" ./run.sh "$OUTDIR/.q.txt" "$out" >/dev/null 2>"$OUTDIR/.err" || {
      echo "    !! run failed:"; tail -3 "$OUTDIR/.err" | sed 's/^/    /'; }
  else
    CONC="${CONC:-2}" DEPTH="${DEPTH:-10}" ./run.sh "$OUTDIR/.q.txt" "$out" >/dev/null 2>"$OUTDIR/.err" || {
    echo "    !! run failed:"; tail -3 "$OUTDIR/.err" | sed 's/^/    /'; }
  fi
  n=$(wc -l < "$out" 2>/dev/null | tr -d ' ' || echo 0)
  total_rows=$((total_rows + n))
  echo "    $n rows"
  [ "$n" -eq 0 ] && echo "    !! zero rows -- possible soft-ban or dead query, check $OUTDIR/.err"

  if [ "$i" -lt "$query_count" ]; then
    pause=$((PMIN + RANDOM % (PMAX - PMIN + 1)))
    echo "    pausing ${pause}s..."
    sleep "$pause"
  fi
done < "$QFILE"

rm -f "$OUTDIR/.q.txt" "$OUTDIR/.err"
echo ">> sweep done: $i queries, $total_rows raw rows (pre-dedupe) in $OUTDIR/"
